// Efectos de poderes (Elías, 27 nov 2026): rayos, fuego, telaraña, escudo, invisibilidad, encoger, golpes y vuelo.
// Los GLB del juego traen el movimiento del poder pero no sus luces ni elementos: esto los dibuja con THREE (r128 global).
// Lo usan la escena de la app (public/minifig/escena.js) y la de los minijuegos (escena-mj.js). Sin estado del juego: solo
// dibujo. Cada efecto corre con su propio reloj (requestAnimationFrame) y se limpia solo al terminar.
//
//   EfectosALV.lanzar(scene, fig, efecto, op) → { fin() }   op: { escala?, sonar?(tipo), camara? (tope de vuelo) }
//     scene  : THREE.Scene donde se dibuja.
//     fig    : { obj: Object3D del personaje (mira a +Z), hueso(logico) → Object3D|null }. Los efectos que tocan la figura
//              (invisible, encoger, volar, estirar) dejan obj como estaba al terminar.
//     efecto : { tipo, desde?, color?, color2?, retraso?, dura?, cielo?, modo? } (src/personajes/poderes.ts los define).
//     op     : { escala? } unidades de la escena por alto de figura (si no, se mide).
(function (raiz) {
  "use strict";
  const T = raiz.THREE;
  if (!T) return;
  const V = () => new T.Vector3();
  const TIPOS = ["rayo", "electrico", "fuego", "telarana", "escudo", "invisible", "encoger", "golpe", "onda", "campo", "hechizo",
    "volar", "estirar", "hielo", "hormigas"];
  const color = (c, d) => new T.Color(typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : d);
  const num = (x, a, b, d) => (typeof x === "number" && isFinite(x) ? Math.max(a, Math.min(b, x)) : d);

  // ---------- Texturas hechas en un canvas (una vez) ----------
  const tex = {};
  function canvas(n, dibujar) {
    const c = document.createElement("canvas"); c.width = c.height = n;
    dibujar(c.getContext("2d"), n);
    const t = new T.CanvasTexture(c); t.needsUpdate = true; return t;
  }
  function brillo() {
    return tex.brillo || (tex.brillo = canvas(64, (g, n) => {
      const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,0.6)"); r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r; g.fillRect(0, 0, n, n);
    }));
  }
  function telarana() {
    return tex.tela || (tex.tela = canvas(128, (g, n) => {
      g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 2; const c = n / 2;
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke(); }
      for (let r = 10; r < c; r += 11) {
        g.beginPath();
        for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI * 2, rr = r * (i % 2 ? 0.93 : 1); g[i ? "lineTo" : "moveTo"](c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
        g.stroke();
      }
    }));
  }
  function escudoTex() {
    return tex.escudo || (tex.escudo = canvas(128, (g, n) => {
      const c = n / 2;
      [["#b3121f", 1], ["#e8e8ec", 0.8], ["#b3121f", 0.6], ["#1d3f8f", 0.42]].forEach(([col, r]) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, c * r, 0, Math.PI * 2); g.fill(); });
      g.fillStyle = "#f4f4f6"; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = (i % 2 ? 0.16 : 0.38) * c; g[i ? "lineTo" : "moveTo"](c + Math.cos(a) * r, c + Math.sin(a) * r); }
      g.closePath(); g.fill();
    }));
  }
  function mandala() {
    return tex.mandala || (tex.mandala = canvas(128, (g, n) => {
      const c = n / 2; g.strokeStyle = "rgba(255,190,80,1)"; g.lineWidth = 3;
      [0.95, 0.75, 0.5].forEach(r => { g.beginPath(); g.arc(c, c, c * r, 0, Math.PI * 2); g.stroke(); });
      g.lineWidth = 2;
      for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + k * Math.PI / 4; g[i ? "lineTo" : "moveTo"](c + Math.cos(a) * c * 0.75, c + Math.sin(a) * c * 0.75); } g.closePath(); g.stroke(); }
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.fillStyle = "rgba(255,210,120,1)"; g.fillRect(c + Math.cos(a) * c * 0.85 - 2, c + Math.sin(a) * c * 0.85 - 2, 4, 4); }
    }));
  }
  const ROJO_FUEGO = new T.Color(0xd8320c);
  const aditivo = (col, op = 1, map) => new T.MeshBasicMaterial({ color: col, map: map || null, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });

  // Barra gruesa entre dos puntos (las líneas de WebGL miden 1 px: no se ven).
  const GEO_PALO = (() => { const g = new T.CylinderGeometry(1, 1, 1, 8, 1, true); g.translate(0, 0.5, 0); g.rotateX(Math.PI / 2); return g; })();
  function palo(scene, mat) {
    const m = new T.Mesh(GEO_PALO, mat); scene.add(m);
    const d = new T.Vector3();
    return { m, poner(a, b, w) { d.subVectors(b, a); const L = d.length(); m.position.copy(a); if (L > 1e-6) m.lookAt(b); m.scale.set(w, w, Math.max(L, 1e-4)); } };
  }

  // ---------- Partículas (sprites aditivos) ----------
  function particulas(scene) {
    const lista = [];
    return {
      echar(pos, vel, col, tam, vida, op = {}) {
        const m = new T.SpriteMaterial({ map: brillo(), color: col, transparent: true, blending: op.solido || op.normal ? T.NormalBlending : T.AdditiveBlending, depthWrite: false });
        const s = new T.Sprite(m); s.position.copy(pos); s.scale.setScalar(tam); scene.add(s);
        lista.push({ s, vel: vel.clone(), vida, t: 0, tam, crece: op.crece == null ? 1.5 : op.crece, sube: op.sube || 0, freno: op.freno || 0 });
      },
      paso(dt) {
        for (let i = lista.length - 1; i >= 0; i--) {
          const p = lista[i]; p.t += dt;
          const k = p.t / p.vida;
          if (k >= 1) { scene.remove(p.s); p.s.material.dispose(); lista.splice(i, 1); continue; }
          p.vel.y += p.sube * dt; if (p.freno) p.vel.multiplyScalar(Math.max(0, 1 - p.freno * dt));
          p.s.position.addScaledVector(p.vel, dt);
          p.s.scale.setScalar(p.tam * (1 + (p.crece - 1) * k));
          p.s.material.opacity = 1 - k;
        }
      },
      vivas: () => lista.length,
      limpiar() { lista.forEach(p => { scene.remove(p.s); p.s.material.dispose(); }); lista.length = 0; },
    };
  }

  // ---------- Ayudas de posición ----------
  function origen(fig, desde, out) {
    const h = (desde && fig.hueso && fig.hueso(desde)) || null;
    if (h) return h.getWorldPosition(out);
    fig.obj.getWorldPosition(out);
    return out;
  }
  function frente(fig, out, giro) { fig.obj.getWorldDirection(out); out.y = 0; if (out.lengthSq() < 1e-6) out.set(0, 0, 1); out.normalize(); if (giro) out.applyAxisAngle(new T.Vector3(0, 1, 0), giro); return out; }
  /** Hacia dónde sale lo que se lanza con la mano: del pecho a la mano (sigue al brazo del clip); si no, el frente. */
  function apunta(c, out) {
    const d = c.ef.desde;
    if (d === "mano_der" || d === "mano_izq") {
      const m = c.fig.hueso && c.fig.hueso(d), p = c.fig.hueso && c.fig.hueso("torso");
      if (m && p) {
        m.getWorldPosition(out); out.sub(p.getWorldPosition(new T.Vector3())); out.y *= 0.35;
        if (out.lengthSq() > 1e-8) { out.normalize(); const f = frente(c.fig, new T.Vector3()); if (out.dot(f) > 0.2) return out; }
      }
    }
    return frente(c.fig, out);
  }
  /** Qué tan estirado al frente está el brazo de `desde` (en altos de figura). null si no hay huesos. */
  function estirado(c) {
    const m = c.fig.hueso && c.fig.hueso(c.ef.desde), p = c.fig.hueso && c.fig.hueso("torso");
    if (!m || !p) return null;
    const v = m.getWorldPosition(new T.Vector3()).sub(p.getWorldPosition(new T.Vector3()));
    return v.dot(frente(c.fig, new T.Vector3())) / c.u;
  }
  const LADO = -0.5; // ~30° hacia un lado de la figura
  function altoDe(fig) {
    fig.obj.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(fig.obj); const a = b.max.y - b.min.y;
    return isFinite(a) && a > 0 ? a : 1;
  }
  const suave = k => k * k * (3 - 2 * k);
  // Sube en `ent`, se queda y baja en `sal` (0..1).
  const sobre = (t, d, ent, sal) => (t < 0 ? 0 : t < ent ? t / ent : t < d - sal ? 1 : t < d ? (d - t) / sal : 0);

  // ---------- Cada efecto: arma(c) devuelve paso(t, dt) → false cuando terminó ----------
  // c = { scene, fig, ef, u (alto de la figura), P (partículas), col, col2, d (duración) }
  const EFECTOS = {
    rayo(c) {
      const mat = new T.MeshBasicMaterial({ color: c.col, transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide }), nucleo = aditivo(0xffffff, 0.9);
      const geo = new T.CylinderGeometry(1, 1, 1, 10, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(Math.PI / 2);
      const haz = new T.Mesh(geo, mat), alma = new T.Mesh(geo, nucleo);
      const luz = new T.Sprite(new T.SpriteMaterial({ map: brillo(), color: c.col, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      c.scene.add(haz, alma, luz);
      const o = V(), f = V(), fin = V(), largo = 5 * c.u, grueso = (c.ef.modo === "fino" ? 0.035 : 0.07) * c.u;
      return {
        paso(t, dt) {
          const k = sobre(t, c.d, 0.15, 0.25);
          origen(c.fig, c.ef.desde, o); apunta(c, f);
          if (c.ef.desde === "cabeza") o.addScaledVector(f, 0.12 * c.u);
          const L = largo * Math.min(1, t / 0.15);
          haz.position.copy(o); alma.position.copy(o);
          fin.copy(o).addScaledVector(f, L); haz.lookAt(fin); alma.lookAt(fin);
          const w = grueso * (0.85 + 0.3 * Math.sin(t * 60)) * k;
          haz.scale.set(w, w, L); alma.scale.set(w * 0.35, w * 0.35, L); mat.opacity = 0.8 * k;
          luz.position.copy(o); luz.scale.setScalar(0.5 * c.u * k + 1e-4);
          if (k > 0.5 && Math.random() < 0.6) c.P.echar(fin, V().set(Math.random() - 0.5, Math.random(), Math.random() - 0.5).multiplyScalar(c.u), c.col, 0.15 * c.u, 0.4);
          return t < c.d;
        },
        quitar() { c.scene.remove(haz, alma, luz); geo.dispose(); mat.dispose(); nucleo.dispose(); luz.material.dispose(); },
      };
    },
    electrico(c) {
      const N = 12, pts = Array.from({ length: N }, () => V());
      const mats = [aditivo(c.col, 1), aditivo(0xffffff, 1)];
      const ext = [], alma = [];
      for (let i = 0; i < N - 1; i++) { ext.push(palo(c.scene, mats[0])); alma.push(palo(c.scene, mats[1])); }
      const luz = new T.Sprite(new T.SpriteMaterial({ map: brillo(), color: c.col, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      c.scene.add(luz);
      const a = V(), b = V(), f = V(), p = V();
      let cambio = 0;
      return {
        paso(t, dt) {
          const k = sobre(t, c.d, 0.05, 0.2);
          origen(c.fig, c.ef.desde, a); frente(c.fig, f);
          if (c.ef.cielo) { b.copy(a).addScaledVector(f, 1.6 * c.u); b.y = c.fig.obj.getWorldPosition(p).y; a.copy(b); a.y += 6 * c.u; }
          else b.copy(a).addScaledVector(apunta(c, f), 4 * c.u);
          if ((cambio -= dt) <= 0) {
            cambio = 0.05;
            for (let i = 0; i < N; i++) {
              const j = (i && i < N - 1 ? 0.45 : 0) * c.u;
              pts[i].copy(a).lerp(b, i / (N - 1)).add(V().set((Math.random() - 0.5) * j, (Math.random() - 0.5) * j * 0.3, (Math.random() - 0.5) * j));
            }
            if (Math.random() < 0.6) c.P.echar(b, V().set(Math.random() - 0.5, Math.random() * 1.5, Math.random() - 0.5).multiplyScalar(c.u), c.col, 0.35 * c.u, 0.35);
          }
          const parpadeo = Math.random() < 0.85 ? 1 : 0.25, w = 0.022 * c.u * k * parpadeo + 1e-5;
          for (let i = 0; i < N - 1; i++) { ext[i].poner(pts[i], pts[i + 1], w); alma[i].poner(pts[i], pts[i + 1], w * 0.4); }
          mats[0].opacity = 0.9 * k; mats[1].opacity = k;
          luz.position.copy(c.ef.cielo ? b : a); luz.scale.setScalar(1.4 * c.u * k * parpadeo + 1e-4);
          return t < c.d;
        },
        quitar() { ext.concat(alma).forEach(x => c.scene.remove(x.m)); mats.forEach(m => m.dispose()); c.scene.remove(luz); luz.material.dispose(); },
      };
    },
    fuego(c) {
      // modo "cuerpo": la figura se enciende entera (Antorcha); si no, bola de fuego desde `desde` hacia el frente.
      const o = V(), f = V(), caja = new T.Box3(), bola = { p: V(), v: V(), viva: false };
      const col2 = c.col2 || new T.Color(0xffd23a);
      let echar = 0;
      return {
        paso(t, dt) {
          const activo = t < c.d;
          if (c.ef.modo === "cuerpo") {
            if (activo && (echar -= dt) <= 0) {
              echar = 0.012;
              caja.setFromObject(c.fig.obj);
              for (let i = 0; i < 3; i++) {
                o.set(caja.min.x + Math.random() * (caja.max.x - caja.min.x), caja.min.y + Math.random() * (caja.max.y - caja.min.y), caja.min.z + Math.random() * (caja.max.z - caja.min.z));
                const nucleo = Math.random() < 0.35;
                c.P.echar(o, V().set((Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.3).multiplyScalar(c.u), nucleo ? col2 : (Math.random() < 0.6 ? c.col : ROJO_FUEGO), (nucleo ? 0.22 : 0.34) * c.u, 0.55, { crece: 0.35, normal: !nucleo });
              }
            }
          } else {
            if (!bola.viva && t >= 0 && t < 0.1) { origen(c.fig, c.ef.desde, bola.p); bola.v.copy(apunta(c, f)).multiplyScalar(6 * c.u); bola.viva = true; }
            if (bola.viva && activo) {
              bola.p.addScaledVector(bola.v, dt);
              for (let i = 0; i < 4; i++) c.P.echar(bola.p, V().set(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).multiplyScalar(0.6 * c.u), i ? (i > 2 ? ROJO_FUEGO : c.col) : col2, (i ? 0.38 : 0.5) * c.u, 0.4, { crece: 0.3, normal: i > 0 });
            }
          }
          return activo || c.P.vivas() > 0;
        },
        quitar() {},
      };
    },
    telarana(c) {
      const mat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true }), hilo = palo(c.scene, mat);
      const red = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: telarana(), transparent: true, depthWrite: false, side: T.DoubleSide }));
      c.scene.add(red);
      const o = V(), f = V(), meta = V(), punta = V();
      let fija = false;
      return {
        paso(t, dt) {
          origen(c.fig, c.ef.desde, o); if (c.ef.modo === "arriba") frente(c.fig, f); else apunta(c, f);
          if (!fija) { meta.copy(o).addScaledVector(f, c.ef.modo === "arriba" ? 1.2 * c.u : 3.5 * c.u); meta.y += c.ef.modo === "arriba" ? 4 * c.u : 0.3 * c.u; fija = true; }
          const k = Math.min(1, Math.max(0, t) / 0.18), op = sobre(t, c.d, 0.01, 0.3);
          punta.copy(o).lerp(meta, k);
          hilo.poner(o, punta, 0.018 * c.u * (t >= 0 ? 1 : 0) + 1e-5); mat.opacity = op;
          red.position.copy(punta); red.lookAt(o); red.scale.setScalar(k >= 1 ? 1.1 * c.u * Math.min(1, (t - 0.18) / 0.12 + 0.2) : 1e-4);
          red.material.opacity = op;
          return t < c.d;
        },
        quitar() { c.scene.remove(hilo.m, red); mat.dispose(); red.geometry.dispose(); red.material.dispose(); },
      };
    },
    escudo(c) {
      // Sale de la mano, vuela hacia el frente girando y regresa a la mano (como búmeran). Sprite: siempre se ve de frente.
      const disco = new T.Sprite(new T.SpriteMaterial({ map: escudoTex(), transparent: true }));
      disco.visible = false; c.scene.add(disco);
      const o = V(), f = V(), lejos = V();
      let fija = false;
      return {
        paso(t, dt) {
          origen(c.fig, c.ef.desde, o); frente(c.fig, f, LADO);
          if (!fija && t >= 0) { lejos.copy(o).addScaledVector(f, 3 * c.u); fija = true; }
          if (t < 0) return true;
          const k = Math.min(1, t / c.d), ida = Math.sin(k * Math.PI); // 0 → 1 → 0
          disco.visible = k < 1;
          disco.position.copy(o).lerp(lejos, ida);
          disco.position.y += Math.sin(k * Math.PI) * 0.3 * c.u;
          disco.scale.setScalar(0.3 * c.u);
          disco.material.rotation = t * 20;
          if (Math.random() < 0.5) c.P.echar(disco.position, V(), new T.Color(0xffffff), 0.35 * c.u, 0.25);
          return k < 1;
        },
        quitar() { c.scene.remove(disco); disco.material.dispose(); },
      };
    },
    invisible(c) {
      // Materiales propios mientras dura (los del GLB se comparten entre clones).
      const cambios = [];
      c.fig.obj.traverse(m => {
        if (!m.isMesh || !m.material) return;
        const orig = m.material, nuevo = Array.isArray(orig) ? orig.map(x => x.clone()) : orig.clone();
        (Array.isArray(nuevo) ? nuevo : [nuevo]).forEach(x => { x.transparent = true; x.depthWrite = false; x.userData.op0 = x.opacity; });
        m.material = nuevo; cambios.push([m, orig, nuevo]);
      });
      const o = V();
      return {
        paso(t, dt) {
          const k = sobre(t, c.d, 0.5, 0.5), op = 1 - 0.9 * k;
          cambios.forEach(([, , n]) => (Array.isArray(n) ? n : [n]).forEach(x => { x.opacity = x.userData.op0 * op; }));
          if (k > 0 && k < 1 && Math.random() < 0.3) { origen(c.fig, "torso", o); o.x += (Math.random() - 0.5) * 0.5 * c.u; o.y += (Math.random() - 0.5) * c.u; c.P.echar(o, V().set(0, 0.4 * c.u, 0), c.col, 0.18 * c.u, 0.6); }
          return t < c.d;
        },
        quitar() { cambios.forEach(([m, orig, n]) => { m.material = orig; (Array.isArray(n) ? n : [n]).forEach(x => x.dispose()); }); },
      };
    },
    encoger(c) {
      const s0 = c.fig.obj.scale.clone(), o = V();
      const chica = num(c.ef.a, 0.1, 1, 0.25);
      return {
        paso(t, dt) {
          const k = suave(sobre(t, c.d, 0.4, 0.4));
          c.fig.obj.scale.copy(s0).multiplyScalar(1 - (1 - chica) * k);
          if ((t < 0.45 || (t > c.d - 0.45 && t < c.d)) && Math.random() < 0.7) { c.fig.obj.getWorldPosition(o); o.y += Math.random() * 0.6 * c.u; o.x += (Math.random() - 0.5) * 0.5 * c.u; c.P.echar(o, V().set(0, 0.5 * c.u, 0), c.col, 0.14 * c.u, 0.5); }
          return t < c.d;
        },
        quitar() { c.fig.obj.scale.copy(s0); },
      };
    },
    golpe(c) {
      // Onda en el piso enfrente (golpe al suelo) y polvo.
      const aro = new T.Mesh(new T.RingGeometry(0.8, 1, 48), aditivo(c.col, 0.9)); aro.rotation.x = -Math.PI / 2; aro.visible = false;
      c.scene.add(aro);
      const o = V(), f = V();
      let salio = false;
      return {
        paso(t, dt) {
          if (t < 0) return true;
          if (!salio) {
            salio = true; c.fig.obj.getWorldPosition(o); frente(c.fig, f); o.addScaledVector(f, 0.6 * c.u); o.y += 0.02 * c.u; aro.position.copy(o); aro.visible = true;
            for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2; c.P.echar(o, V().set(Math.cos(a), 0.3 + Math.random() * 0.4, Math.sin(a)).multiplyScalar(1.4 * c.u), c.col2 || new T.Color(0xb9a58a), 0.16 * c.u, 0.6, { solido: true, crece: 1.8, freno: 2.5 }); }
          }
          const k = Math.min(1, t / c.d);
          aro.scale.setScalar((0.2 + 3 * k) * c.u); aro.material.opacity = 0.9 * (1 - k);
          return k < 1 || c.P.vivas() > 0;
        },
        quitar() { c.scene.remove(aro); aro.geometry.dispose(); aro.material.dispose(); },
      };
    },
    onda(c) {
      // Aplauso: onda de aire hacia el frente a la altura de las manos.
      const aros = [0, 1, 2].map(() => { const m = new T.Mesh(new T.RingGeometry(0.85, 1, 40), aditivo(c.col, 0.7)); m.visible = false; c.scene.add(m); return m; });
      const o = V(), f = V(); let fija = false;
      return {
        paso(t, dt) {
          if (t < 0) return true;
          if (!fija) { origen(c.fig, c.ef.desde || "mano_der", o); frente(c.fig, f); fija = true; }
          aros.forEach((m, i) => {
            const k = (t - i * 0.12) / c.d;
            m.visible = k > 0 && k < 1; if (!m.visible) return;
            m.position.copy(o).addScaledVector(f, k * 3 * c.u); m.lookAt(V().copy(m.position).add(f));
            m.scale.setScalar((0.2 + 1.2 * k) * c.u); m.material.opacity = 0.7 * (1 - k);
          });
          return t < c.d + 0.3;
        },
        quitar() { aros.forEach(m => { c.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }); },
      };
    },
    campo(c) {
      const bola = new T.Mesh(new T.SphereGeometry(1, 32, 20), new T.MeshBasicMaterial({ color: c.col, transparent: true, opacity: 0.25, blending: T.AdditiveBlending, depthWrite: false }));
      c.scene.add(bola); const o = V();
      return {
        paso(t, dt) {
          const k = sobre(t, c.d, 0.25, 0.35);
          origen(c.fig, "torso", o); bola.position.copy(o);
          bola.scale.setScalar((0.75 + 0.03 * Math.sin(t * 9)) * c.u * suave(k) + 1e-4);
          bola.material.opacity = 0.22 * k + 0.08 * k * Math.sin(t * 14);
          return t < c.d;
        },
        quitar() { c.scene.remove(bola); bola.geometry.dispose(); bola.material.dispose(); },
      };
    },
    hechizo(c) {
      const disco = new T.Mesh(new T.PlaneGeometry(1, 1), aditivo(c.col, 1, mandala()));
      c.scene.add(disco); const o = V(), f = V();
      return {
        paso(t, dt) {
          const k = sobre(t, c.d, 0.3, 0.3);
          origen(c.fig, c.ef.desde || "mano_der", o); frente(c.fig, f); o.addScaledVector(f, 0.35 * c.u);
          disco.position.copy(o); disco.lookAt(V().copy(o).add(f)); disco.rotateZ(t * 2.5);
          disco.scale.setScalar(0.9 * c.u * suave(k) + 1e-4); disco.material.opacity = k;
          if (k > 0.5 && Math.random() < 0.5) { const a = Math.random() * Math.PI * 2; c.P.echar(V().copy(o).add(V().set(Math.cos(a) * 0.45 * c.u, Math.sin(a) * 0.45 * c.u, 0)), V().set(0, 0.3 * c.u, 0), c.col, 0.1 * c.u, 0.5); }
          return t < c.d;
        },
        quitar() { c.scene.remove(disco); disco.geometry.dispose(); disco.material.dispose(); },
      };
    },
    volar(c) {
      // Sube, se queda en el aire y baja; estela desde los pies (fuego, propulsores o viento).
      const y0 = c.fig.obj.position.y, o = V(), s = c.fig.obj.parent ? c.fig.obj.parent.getWorldScale(V()).y || 1 : 1;
      let alto = num(c.ef.a, 0.1, 3, 0.35) * c.u / s;
      // Tope: con cámara, la cabeza no sale del cuadro (deja 12 % de margen arriba para el HUD).
      if (c.cam) try {
        c.fig.obj.updateWorldMatrix(true, true);
        const caja = new T.Box3().setFromObject(c.fig.obj), p = V(), arriba = caja.max.y, cx = (caja.min.x + caja.max.x) / 2, cz = (caja.min.z + caja.max.z) / 2;
        const cabe = h => { p.set(cx, arriba + h * s, cz).project(c.cam); return p.y < 0.76; };
        if (!cabe(0)) alto = 0.06 * c.u / s;
        else if (!cabe(alto)) { let a = 0, b = alto; for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if (cabe(m)) a = m; else b = m; } alto = Math.max(0.06 * c.u / s, a); }
      } catch (_) { /* sin tope */ }
      return {
        paso(t, dt) {
          const k = suave(sobre(t, c.d, 0.6, 0.6));
          c.fig.obj.position.y = y0 + alto * k + (k > 0.99 ? Math.sin(t * 3) * 0.04 * c.u / s : 0);
          if (k > 0.05 && t < c.d && Math.random() < 0.8) { c.fig.obj.getWorldPosition(o); o.y += 0.05 * c.u; c.P.echar(o, V().set((Math.random() - 0.5) * 0.2, -1.2, (Math.random() - 0.5) * 0.2).multiplyScalar(c.u), Math.random() < 0.5 ? c.col : (c.col2 || c.col), 0.2 * c.u, 0.35, { crece: 0.5 }); }
          return t < c.d || c.P.vivas() > 0;
        },
        quitar() { c.fig.obj.position.y = y0; },
      };
    },
    estirar(c) {
      const s0 = c.fig.obj.scale.clone();
      return {
        paso(t, dt) {
          const k = sobre(t, c.d, 0.3, 0.4), w = Math.sin(t * 7) * 0.12 * k;
          c.fig.obj.scale.set(s0.x * (1 + 0.45 * k + w), s0.y * (1 - 0.18 * k - w * 0.5), s0.z * (1 + 0.2 * k));
          return t < c.d;
        },
        quitar() { c.fig.obj.scale.copy(s0); },
      };
    },
    hielo(c) {
      // Rayo de hielo y cristales que quedan en el piso al frente.
      const r = EFECTOS.rayo(c), cristales = [], f = V(), o = V();
      const mat = new T.MeshStandardMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.1, emissive: 0x4fb8ff, emissiveIntensity: 0.4 });
      return {
        paso(t, dt) {
          const sigue = r.paso(t, dt);
          if (t > 0.25 && cristales.length < 7 && Math.random() < 0.3) {
            c.fig.obj.getWorldPosition(o); frente(c.fig, f); o.addScaledVector(f, (1.5 + cristales.length * 0.5) * c.u); o.x += (Math.random() - 0.5) * 0.6 * c.u;
            const m = new T.Mesh(new T.ConeGeometry(0.12 * c.u, 0.5 * c.u, 5), mat); m.position.copy(o); m.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * 3, (Math.random() - 0.5) * 0.6);
            m.scale.setScalar(1e-3); c.scene.add(m); cristales.push({ m, t });
          }
          cristales.forEach(x => { const k = Math.min(1, (t - x.t) / 0.25), sal = t > c.d ? Math.max(0, 1 - (t - c.d) / 0.5) : 1; x.m.scale.setScalar(Math.max(1e-3, k * sal)); });
          return sigue || t < c.d + 0.5;
        },
        quitar() { r.quitar(); cristales.forEach(x => { c.scene.remove(x.m); x.m.geometry.dispose(); }); mat.dispose(); },
      };
    },
    hormigas(c) {
      const o = V(), n = 40, ant = [];
      const geo = new T.SphereGeometry(0.035, 6, 4), mat = new T.MeshBasicMaterial({ color: 0x1b1410 });
      for (let i = 0; i < n; i++) { const m = new T.Mesh(geo, mat); m.visible = false; c.scene.add(m); ant.push({ m, a: Math.random() * Math.PI * 2, r: 0.4 + Math.random() * 0.9, v: 1 + Math.random() * 2 }); }
      return {
        paso(t, dt) {
          c.fig.obj.getWorldPosition(o);
          const k = sobre(t, c.d, 0.6, 0.6);
          ant.forEach((x, i) => {
            x.a += x.v * dt; const r = x.r * c.u * (0.3 + 0.7 * k);
            x.m.visible = k > i / n; x.m.scale.setScalar(c.u);
            x.m.position.set(o.x + Math.cos(x.a) * r, o.y + 0.03 * c.u, o.z + Math.sin(x.a) * r);
          });
          return t < c.d;
        },
        quitar() { ant.forEach(x => c.scene.remove(x.m)); geo.dispose(); mat.dispose(); },
      };
    },
  };

  // ---------- Reloj compartido ----------
  const vivos = new Set();
  let ultimo = 0, corriendo = false;
  function bucle(ahora) {
    const dt = Math.min(0.05, ultimo ? (ahora - ultimo) / 1000 : 0.016); ultimo = ahora;
    vivos.forEach(v => v.paso(dt));
    if (vivos.size) requestAnimationFrame(bucle); else { corriendo = false; ultimo = 0; }
  }

  /** Lanza un efecto. Nunca truena: lo que no se reconoce no dibuja nada. */
  function lanzar(scene, fig, efecto, op) {
    const nada = { fin() {} };
    if (!scene || !fig || !fig.obj || !efecto || !TIPOS.includes(efecto.tipo)) return nada;
    const o = op || {};
    const c = {
      scene, fig, ef: efecto, u: num(o.escala, 0.01, 1000, 0) || altoDe(fig),
      col: color(efecto.color, "#7fd8ff"), col2: efecto.color2 ? color(efecto.color2, "#ffffff") : null,
      d: num(efecto.dura, 0.2, 12, 1.2), P: particulas(scene), cam: o.camara && o.camara.isCamera ? o.camara : null,
    };
    let e;
    try { e = EFECTOS[efecto.tipo](c); } catch (_) { c.P.limpiar(); return nada; }
    let t = -num(efecto.retraso, 0, 10, 0), listo = false, sono = false;
    // Lo que sale de la mano espera a que el brazo del clip llegue al frente (si no, el rayo salía con el brazo abajo).
    const conMano = (efecto.desde === "mano_der" || efecto.desde === "mano_izq") && !efecto.cielo && efecto.modo !== "arriba" && efecto.modo !== "cuerpo"
      && ["rayo", "fuego", "telarana", "hielo", "electrico", "escudo"].includes(efecto.tipo);
    let espera = conMano ? 0 : -1, maximo = -9;
    const v = {
      paso(dt) {
        c.P.paso(dt);
        if (t >= 0 && espera >= 0) {
          const x = estirado(c);
          espera += dt;
          if (x != null && espera < 1.2 && !(x > 0.3) && !(x > 0.1 && x < maximo - 0.008)) { maximo = Math.max(maximo, x); return; }
          espera = -1;
        }
        t += dt;
        if (!sono && t >= 0) { sono = true; if (typeof o.sonar === "function") try { o.sonar(efecto.tipo); } catch (_) { /* nada */ } }
        let sigue = true;
        try { sigue = e.paso(t, dt) !== false; } catch (_) { sigue = false; }
        if (!sigue || t > c.d + 6) v.fin();
      },
      fin() { if (listo) return; listo = true; vivos.delete(v); try { e.quitar(); } catch (_) { /* nada */ } c.P.limpiar(); },
    };
    vivos.add(v);
    if (!corriendo) { corriendo = true; requestAnimationFrame(bucle); }
    return { fin: v.fin };
  }

  raiz.EfectosALV = { lanzar, TIPOS, activos: () => vivos.size };
})(typeof self !== "undefined" ? self : this);
