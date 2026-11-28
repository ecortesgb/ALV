// Efectos de poderes (Elías, 27 nov 2026): rayos, fuego, telaraña, escudo, invisibilidad, encoger, golpes y vuelo.
// Los GLB del juego traen el movimiento del poder pero no sus luces ni elementos: esto los dibuja con THREE (r128 global).
// Lo usan la escena de la app (public/minifig/escena.js) y la de los minijuegos (escena-mj.js). Sin estado del juego: solo
// dibujo. Cada efecto corre con su propio reloj (requestAnimationFrame) y se limpia solo al terminar.
//
//   EfectosALV.lanzar(scene, fig, efecto, op) → { fin() }   op: { escala?, sonar?(tipo), camara? (tope de vuelo) }
//   efecto.fijo: dura hasta fin() (poder puesto de una forma: Johnny en llamas, Sue invisible, Reed estirado).
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
    "volar", "estirar", "hielo", "hormigas", "velocidad", "disparo", "puf"];
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
  // Llama: gota con borde irregular (se ve como lengua de fuego al crecer y girar). Humo: bocanada suave con grumos.
  // Chispa: raya alargada (se estira en la dirección en que vuela).
  function llama() {
    return tex.llama || (tex.llama = canvas(64, (g, n) => {
      for (let i = 0; i < 7; i++) {
        const x = n / 2 + (Math.random() - 0.5) * n * 0.22, y = n * (0.42 + Math.random() * 0.2), r = n * (0.2 + Math.random() * 0.16);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(0.6, "rgba(255,255,255,0.22)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, n, n);
      }
    }));
  }
  function humoTex() {
    return tex.humo || (tex.humo = canvas(64, (g, n) => {
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * n * 0.18, x = n / 2 + Math.cos(a) * d, y = n / 2 + Math.sin(a) * d, r = n * (0.18 + Math.random() * 0.14);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, n, n);
      }
    }));
  }
  function chispaTex() {
    return tex.chispa || (tex.chispa = canvas(64, (g, n) => {
      const gr = g.createLinearGradient(0, 0, n, 0);
      gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, n * 0.44, n, n * 0.12);
      const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n * 0.16);
      r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, n, n);
    }));
  }
  /** Destello de estrella (fogonazo de disparo, impacto): núcleo y 4 puntas. */
  function estrella() {
    return tex.estrella || (tex.estrella = canvas(128, (g, n) => {
      const c = n / 2, r = g.createRadialGradient(c, c, 0, c, c, c * 0.5);
      r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,255,255,0.7)"); r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r; g.fillRect(0, 0, n, n);
      g.translate(c, c);
      for (let i = 0; i < 4; i++) {
        g.rotate(Math.PI / 4 * (i ? 2 : 1));
        const l = g.createLinearGradient(-c, 0, c, 0);
        l.addColorStop(0, "rgba(255,255,255,0)"); l.addColorStop(0.5, "rgba(255,255,255,0.9)"); l.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = l; g.fillRect(-c, -n * 0.018, n, n * 0.036);
      }
    }));
  }
  const TEX = { brillo, llama, humo: humoTex, chispa: chispaTex, estrella };
  // Rampas de color de la vida de cada partícula (como las curvas de un sistema de partículas): fuego del blanco al humo.
  const RAMPA = {
    fuego: [0xffe27a, 0xffa424, 0xff6a1a, 0xd8320c, 0x9a2208, 0x3a2a24].map(x => new T.Color(x)),
    humo: [0x9a948c, 0x6d6862, 0x4a4744].map(x => new T.Color(x)),
    polvo: [0xd8c7a8, 0xb9a58a, 0x8c7c68].map(x => new T.Color(x)),
    nube: [0xffffff, 0xeef0f4, 0xc9ccd4, 0x9a9ea8].map(x => new T.Color(x)),
  };
  // Colores de ladrillo LEGO para los escombros.
  const LEGO = [0xc91a09, 0xf2cd37, 0x0055bf, 0x9ba19d, 0x6c6e68, 0xffffff, 0x237841, 0xa0a5a9].map(x => new T.Color(x));
  const ROJO_FUEGO = new T.Color(0xd8320c), BLANCO = new T.Color(0xffffff);
  const aditivo = (col, op = 1, map) => new T.MeshBasicMaterial({ color: col, map: map || null, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });

  // Barra gruesa entre dos puntos (las líneas de WebGL miden 1 px: no se ven).
  const GEO_PALO = (() => { const g = new T.CylinderGeometry(1, 1, 1, 8, 1, true); g.translate(0, 0.5, 0); g.rotateX(Math.PI / 2); return g; })();
  function palo(scene, mat) {
    const m = new T.Mesh(GEO_PALO, mat); scene.add(m);
    const d = new T.Vector3();
    return { m, poner(a, b, w) { d.subVectors(b, a); const L = d.length(); m.position.copy(a); if (L > 1e-6) m.lookAt(b); m.scale.set(w, w, Math.max(L, 1e-4)); } };
  }

  // ---------- Partículas ----------
  // Cada una: emisor → posición y velocidad; textura (brillo, llama, humo, chispa, estrella); rampa de color a lo largo de su
  // vida; tamaño que crece o se encoge; gravedad (sube/baja) y freno; giro. `ladrillo` echa una pieza 1x1 de LEGO (caja con
  // botón) que cae, rebota en el piso y se desvanece: los escombros de los juegos de LEGO.
  const GEO_LADRILLO = (() => {
    const caja = new T.BoxGeometry(1, 0.6, 1), b = new T.CylinderGeometry(0.3, 0.3, 0.2, 10); b.translate(0, 0.4, 0);
    return [caja, b];
  })();
  function particulas(scene) {
    const lista = [], col = new T.Color();
    const rampa = (r, k) => { const x = Math.min(0.999, k) * (r.length - 1), i = Math.floor(x); return col.copy(r[i]).lerp(r[i + 1], x - i); };
    return {
      echar(pos, vel, color, tam, vida, op = {}) {
        if (op.ladrillo) {
          const m = new T.MeshLambertMaterial({ color: color || LEGO[(Math.random() * LEGO.length) | 0], transparent: true });
          const g = new T.Group(); GEO_LADRILLO.forEach(x => g.add(new T.Mesh(x, m)));
          g.position.copy(pos); g.scale.setScalar(tam); g.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); scene.add(g);
          lista.push({ g, m, vel: vel.clone(), vida, t: 0, tam, piso: op.piso == null ? -Infinity : op.piso, giro: V().set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(14), grav: op.grav == null ? -9 : op.grav });
          return;
        }
        const solido = op.solido || op.normal;
        const m = new T.SpriteMaterial({ map: (TEX[op.tex] || brillo)(), color: color || 0xffffff, transparent: true, blending: solido ? T.NormalBlending : T.AdditiveBlending, depthWrite: false });
        m.rotation = op.rot != null ? op.rot : Math.random() * Math.PI * 2;
        const s = new T.Sprite(m); s.position.copy(pos); s.scale.setScalar(tam); scene.add(s);
        lista.push({ s, vel: vel.clone(), vida, t: 0, tam, crece: op.crece == null ? 1.5 : op.crece, sube: op.sube || 0, freno: op.freno || 0,
          rampa: op.rampa ? RAMPA[op.rampa] || null : null, gira: op.gira || 0, alfa: op.alfa == null ? 1 : op.alfa, estira: op.estira || 0, entra: op.entra || 0 });
      },
      paso(dt) {
        for (let i = lista.length - 1; i >= 0; i--) {
          const p = lista[i]; p.t += dt;
          const k = p.t / p.vida;
          if (p.g) {
            if (k >= 1) { scene.remove(p.g); p.m.dispose(); lista.splice(i, 1); continue; }
            p.vel.y += p.grav * dt * p.tam * 12; p.g.position.addScaledVector(p.vel, dt);
            p.g.rotation.x += p.giro.x * dt; p.g.rotation.y += p.giro.y * dt; p.g.rotation.z += p.giro.z * dt;
            if (p.g.position.y < p.piso + p.tam * 0.3) { p.g.position.y = p.piso + p.tam * 0.3; p.vel.y = Math.abs(p.vel.y) * 0.35; p.vel.x *= 0.6; p.vel.z *= 0.6; p.giro.multiplyScalar(0.5); }
            p.m.opacity = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
            continue;
          }
          if (k >= 1) { scene.remove(p.s); p.s.material.dispose(); lista.splice(i, 1); continue; }
          p.vel.y += p.sube * dt; if (p.freno) p.vel.multiplyScalar(Math.max(0, 1 - p.freno * dt));
          p.s.position.addScaledVector(p.vel, dt);
          const t = p.tam * (1 + (p.crece - 1) * k);
          if (p.estira) { const v = p.vel.length(); p.s.scale.set(t * (1 + p.estira * v / (p.tam * 10 + 1e-6)), t * 0.5, 1); } else p.s.scale.setScalar(t);
          if (p.gira) p.s.material.rotation += p.gira * dt;
          if (p.rampa) p.s.material.color.copy(rampa(p.rampa, k));
          p.s.material.opacity = p.alfa * (p.entra && p.t < p.entra ? p.t / p.entra : 1) * (1 - k) * (p.rampa && p.s.material.blending === T.NormalBlending ? 0.85 : 1);
        }
      },
      vivas: () => lista.length,
      limpiar() { lista.forEach(p => { if (p.g) { scene.remove(p.g); p.m.dispose(); } else { scene.remove(p.s); p.s.material.dispose(); } }); lista.length = 0; },
    };
  }

  // ---------- Golpes de efecto reutilizables ----------
  const azar = (a = 1) => (Math.random() - 0.5) * 2 * a;
  /** Fogonazo / impacto: estrella grande que se apaga rápido y un halo. */
  function destello(c, pos, color, tam = 0.6, vida = 0.18) {
    c.P.echar(pos, V(), color, tam * c.u, vida, { tex: "estrella", crece: 1.3 });
    c.P.echar(pos, V(), new T.Color(0xffffff), tam * 0.45 * c.u, vida * 0.8, { tex: "brillo", crece: 1.2 });
  }
  /** Chispas que salen disparadas en cono alrededor de `dir` (o en todas direcciones) y caen. */
  function chispas(c, pos, dir, n, color, fuerza = 2.5) {
    for (let i = 0; i < n; i++) {
      const v = dir ? V().copy(dir).multiplyScalar(-0.4).add(V().set(azar(), Math.random() * 0.9, azar())) : V().set(azar(), Math.random(), azar());
      v.normalize().multiplyScalar(fuerza * c.u * (0.5 + Math.random()));
      c.P.echar(pos, v, color, 0.09 * c.u, 0.35 + Math.random() * 0.3, { tex: "chispa", estira: 2.2, crece: 0.4, sube: -6 * c.u, freno: 1.5 });
    }
  }
  /** Escombros de ladrillos LEGO desde `pos` (rebotan en el piso de la figura). */
  function ladrillos(c, pos, n, fuerza = 1.6, color) {
    const piso = c.fig.obj.getWorldPosition(V()).y;
    for (let i = 0; i < n; i++) {
      const v = V().set(azar(), 0.6 + Math.random() * 0.9, azar()).multiplyScalar(fuerza * c.u);
      c.P.echar(pos, v, color || null, (0.045 + Math.random() * 0.03) * c.u, 1.1 + Math.random() * 0.5, { ladrillo: true, piso, grav: -0.75 * c.u });
    }
  }
  /** Bocanadas de humo que suben y se abren. */
  function humo(c, pos, n, tam = 0.35, rampa = "humo") {
    for (let i = 0; i < n; i++) c.P.echar(V().copy(pos).add(V().set(azar(0.15), azar(0.1), azar(0.15)).multiplyScalar(c.u)), V().set(azar(0.25), 0.45 + Math.random() * 0.3, azar(0.25)).multiplyScalar(c.u),
      null, tam * c.u * (0.7 + Math.random() * 0.6), 0.9 + Math.random() * 0.6, { tex: "humo", rampa, normal: true, crece: 2.2, freno: 1.2, alfa: 0.55, entra: 0.08, gira: azar(0.8) });
  }
  /** Explosión de los juegos de LEGO: fogonazo, bola de fuego, humo, chispas y ladrillos. */
  function explosion(c, pos, tam = 1) {
    destello(c, pos, new T.Color(0xffb040), 0.9 * tam, 0.2);
    for (let i = 0; i < 12; i++) c.P.echar(pos, V().set(azar(), Math.random() * 0.8, azar()).normalize().multiplyScalar(1.3 * tam * c.u * Math.random()), null, (0.22 + Math.random() * 0.16) * tam * c.u, 0.5 + Math.random() * 0.3,
      { tex: "llama", rampa: "fuego", normal: true, alfa: 0.95, crece: 1.8, freno: 3, sube: 0.6 * c.u, gira: azar(2) });
    humo(c, pos, 6, 0.4 * tam);
    chispas(c, pos, null, 12, new T.Color(0xffc24a), 3 * tam);
    ladrillos(c, pos, Math.round(8 * tam), 1.8 * tam);
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
  function apunta(c, out, desde) {
    const d = desde || c.ef.desde;
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
  const OJOS = 0.09; // altos de figura del cuello a los ojos
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
      // Haz con alma blanca y halo ancho; fogonazo en la mano al salir y chispas donde pega.
      const mat = new T.MeshBasicMaterial({ color: c.col, transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide }), nucleo = aditivo(0xffffff, 0.9), halo = aditivo(c.col, 0.25);
      const geo = new T.CylinderGeometry(1, 1, 1, 10, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(Math.PI / 2);
      const haz = new T.Mesh(geo, mat), alma = new T.Mesh(geo, nucleo), aura = new T.Mesh(geo, halo);
      const luz = new T.Sprite(new T.SpriteMaterial({ map: brillo(), color: c.col, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      const pega = new T.Sprite(new T.SpriteMaterial({ map: estrella(), color: c.col, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      c.scene.add(haz, alma, aura, luz, pega);
      const o = V(), f = V(), fin = V(), largo = 5 * c.u, grueso = (c.ef.modo === "fino" ? 0.035 : 0.07) * c.u, blanco = new T.Color(0xffffff);
      let salio = false, chis = 0;
      return {
        paso(t, dt) {
          const k = sobre(t, c.d, 0.15, 0.25);
          origen(c.fig, c.ef.desde, o); apunta(c, f);
          // El hueso de la cabeza nace en el cuello: el rayo de los ojos sube a la altura de los ojos.
          if (c.ef.desde === "cabeza") { o.y += OJOS * c.u; o.addScaledVector(f, 0.1 * c.u); }
          if (!salio && t >= 0) { salio = true; destello(c, o, c.col, 0.7, 0.2); }
          const L = largo * Math.min(1, t / 0.15);
          haz.position.copy(o); alma.position.copy(o); aura.position.copy(o);
          fin.copy(o).addScaledVector(f, L); haz.lookAt(fin); alma.lookAt(fin); aura.lookAt(fin);
          const w = grueso * (0.85 + 0.3 * Math.sin(t * 60)) * k;
          haz.scale.set(w, w, L); alma.scale.set(w * 0.35, w * 0.35, L); aura.scale.set(w * 1.8, w * 1.8, L);
          mat.opacity = 0.8 * k; nucleo.opacity = 0.9 * k; halo.opacity = 0.22 * k;
          luz.position.copy(o); luz.scale.setScalar((0.55 + 0.1 * Math.sin(t * 40)) * c.u * k + 1e-4);
          pega.position.copy(fin); pega.material.rotation = t * 3; pega.scale.setScalar(t > 0.12 ? (0.5 + 0.15 * Math.random()) * c.u * k + 1e-4 : 1e-4);
          if (k > 0.5 && t < c.d && (chis -= dt) <= 0) { chis = 0.04; chispas(c, fin, f, 2, Math.random() < 0.5 ? c.col : blanco, 2); if (Math.random() < 0.15) humo(c, fin, 1, 0.25); }
          return t < c.d || c.P.vivas() > 0;
        },
        quitar() { c.scene.remove(haz, alma, aura, luz, pega); geo.dispose(); mat.dispose(); nucleo.dispose(); halo.dispose(); luz.material.dispose(); pega.material.dispose(); },
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
            if (k > 0.3 && t < c.d) chispas(c, b, null, 2, Math.random() < 0.5 ? c.col : BLANCO, 2.2);
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
      // modo "cuerpo": la figura se enciende entera (Antorcha); si no, bola de fuego desde `desde` hacia el frente que
      // revienta en explosión LEGO (fuego, humo, chispas y ladrillos). Llamas con rampa: blanco → amarillo → rojo → humo.
      const o = V(), f = V(), caja = new T.Box3(), bola = { p: V(), v: V(), viva: false, hecho: 0 };
      const col2 = c.col2 || new T.Color(0xffd23a), propio = !!c.ef.color && c.ef.color.toLowerCase() !== "#ff6a1a";
      const llamita = (p, v, tam, vida, extra) => c.P.echar(p, v, propio ? c.col : null, tam, vida, Object.assign({ tex: "llama", rampa: propio ? null : "fuego", normal: true, alfa: 0.95, crece: 0.45, gira: azar(3) }, extra));
      let echar = 0, humea = 0;
      // Encendido fijo (forma de Johnny, 28 nov): además de las llamas, el cuerpo brilla naranja y parpadea como brasa.
      // Materiales propios mientras dura (los del GLB se comparten entre clones), como en «invisible».
      const brasa = [], BRASA = new T.Color(0xff6a10);
      if (c.ef.modo === "cuerpo" && c.ef.fijo) c.fig.obj.traverse(m => {
        if (!m.isMesh || !m.material) return;
        const orig = m.material, nuevo = Array.isArray(orig) ? orig.map(x => x.clone()) : orig.clone();
        (Array.isArray(nuevo) ? nuevo : [nuevo]).forEach(x => { if (x.emissive) x.emissive.set(0xff5a00); if (x.color) x.userData.c0 = x.color.clone(); });
        m.material = nuevo; brasa.push([m, orig, nuevo]);
      });
      return {
        paso(t, dt) {
          const activo = t < c.d;
          if (brasa.length) {
            const k = Math.min(1, Math.max(0, t / 0.6)), i = k * (0.55 + 0.12 * Math.sin(t * 9) + 0.06 * Math.sin(t * 23));
            brasa.forEach(([, , n]) => (Array.isArray(n) ? n : [n]).forEach(x => {
              if (x.emissive) x.emissiveIntensity = i * 0.6;
              if (x.userData.c0) x.color.copy(x.userData.c0).lerp(BRASA, 0.85 * k);
            }));
          }
          if (c.ef.modo === "cuerpo") {
            if (activo && t >= 0 && (echar -= dt) <= 0) {
              echar = 0.014;
              caja.setFromObject(c.fig.obj);
              for (let i = 0; i < 3; i++) {
                o.set(caja.min.x + Math.random() * (caja.max.x - caja.min.x), caja.min.y + Math.random() * (caja.max.y - caja.min.y), caja.min.z + Math.random() * (caja.max.z - caja.min.z));
                llamita(o, V().set(azar(0.15), 0.8 + Math.random() * 0.6, azar(0.15)).multiplyScalar(c.u), (0.26 + Math.random() * 0.14) * c.u, 0.5 + Math.random() * 0.2, { sube: 0.4 * c.u });
              }
              if (Math.random() < 0.18) { o.y = caja.max.y; chispas(c, o, null, 1, col2, 1.2); }
              if ((humea -= 0.014) <= 0) { humea = 0.25; o.y = caja.max.y + 0.05 * c.u; humo(c, o, 1, 0.3); }
            }
          } else {
            if (!bola.viva && t >= 0 && !bola.hecho) { origen(c.fig, c.ef.desde, bola.p); bola.v.copy(apunta(c, f)).multiplyScalar(5.5 * c.u); bola.viva = true; destello(c, bola.p, col2, 0.6, 0.2); }
            if (bola.viva) {
              bola.p.addScaledVector(bola.v, dt); bola.hecho += bola.v.length() * dt;
              c.P.echar(bola.p, V(), col2, 0.2 * c.u, 0.08, { tex: "brillo", crece: 1, alfa: 0.6 });
              for (let i = 0; i < 2; i++) llamita(V().copy(bola.p).add(V().set(azar(0.06), azar(0.06), azar(0.06)).multiplyScalar(c.u)), V().set(azar(0.4), azar(0.3) + 0.2, azar(0.4)).multiplyScalar(c.u).addScaledVector(bola.v, -0.08), (0.22 + Math.random() * 0.12) * c.u, 0.3 + Math.random() * 0.12);
              if (Math.random() < 0.35) chispas(c, bola.p, bola.v.clone().normalize(), 1, col2, 1.4);
              if (Math.random() < 0.25) humo(c, bola.p, 1, 0.22);
              if (!activo || bola.hecho > 1.8 * c.u) { bola.viva = false; explosion(c, bola.p, 0.75); }
            }
          }
          return activo || bola.viva || c.P.vivas() > 0;
        },
        quitar() { brasa.forEach(([m, orig, n]) => { m.material = orig; (Array.isArray(n) ? n : [n]).forEach(x => x.dispose()); }); },
      };
    },
    telarana(c) {
      const mat = new T.MeshBasicMaterial({ color: c.ef.color ? c.col : 0xffffff, transparent: true }), hilo = palo(c.scene, mat);
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
          const k = sobre(t, c.d, 0.5, 0.5), op = 1 - (1 - num(c.ef.a, 0, 1, 0.1)) * k;
          cambios.forEach(([, , n]) => (Array.isArray(n) ? n : [n]).forEach(x => { x.opacity = x.userData.op0 * op; }));
          if (k > 0 && k < 1 && Math.random() < (c.ef.fijo ? 0.06 : 0.3)) { origen(c.fig, "torso", o); o.x += (Math.random() - 0.5) * 0.5 * c.u; o.y += (Math.random() - 0.5) * c.u; c.P.echar(o, V().set(0, 0.4 * c.u, 0), c.col, 0.18 * c.u, 0.6); }
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
      // Golpe al suelo enfrente: destello, onda, polvo que se abre y escombros de ladrillos LEGO que saltan y rebotan.
      const aro = new T.Mesh(new T.RingGeometry(0.8, 1, 48), aditivo(c.col, 0.9)); aro.rotation.x = -Math.PI / 2; aro.visible = false;
      c.scene.add(aro);
      const o = V(), f = V();
      let salio = false;
      return {
        paso(t, dt) {
          if (t < 0) return true;
          if (!salio) {
            salio = true; c.fig.obj.getWorldPosition(o); frente(c.fig, f); o.addScaledVector(f, 0.6 * c.u); o.y += 0.02 * c.u; aro.position.copy(o); aro.visible = true;
            destello(c, V().copy(o).add(V().set(0, 0.1 * c.u, 0)), c.col, 0.8, 0.18);
            for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2; c.P.echar(V().copy(o).add(V().set(0, 0.05 * c.u, 0)), V().set(Math.cos(a), 0.2 + Math.random() * 0.35, Math.sin(a)).multiplyScalar(1.5 * c.u), null, 0.2 * c.u, 0.8 + Math.random() * 0.4, { tex: "humo", rampa: "polvo", normal: true, crece: 2.6, freno: 2.8, alfa: 0.7, gira: azar(1) }); }
            ladrillos(c, V().copy(o).add(V().set(0, 0.05 * c.u, 0)), 10, 1.4);
            chispas(c, o, null, 6, new T.Color(0xfff2c0), 2);
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
          const k = sobre(t, c.d, 0.3, 0.4);
          if (c.ef.modo === "alto") { // forma de Reed: alto y delgado, ondulando despacio como liga
            const w = Math.sin(t * 2.4) * 0.035 * k;
            c.fig.obj.scale.set(s0.x * (1 - 0.14 * k - w * 0.5), s0.y * (1 + 0.2 * k + w), s0.z * (1 - 0.1 * k));
            return t < c.d;
          }
          const w = Math.sin(t * 7) * 0.12 * k;
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
    velocidad(c) {
      // Supervelocidad (Flash): da vueltas rapidísimo alrededor de su lugar dejando estela y chispas, y vuelve a donde estaba.
      const obj = c.fig.obj, p0 = obj.position.clone(), r0 = obj.rotation.y, o = V(), s = obj.parent ? obj.parent.getWorldScale(V()).y || 1 : 1;
      const rx = 0.32 * c.u / s, rz = 0.2 * c.u / s;
      let ang = 0;
      return {
        paso(t, dt) {
          const k = sobre(t, c.d, 0.25, 0.25);
          if (t < c.d) {
            ang += dt * (6 + 10 * k);
            obj.position.set(p0.x + Math.sin(ang) * rx * k, p0.y, p0.z + (Math.cos(ang) - 1) * rz * k);
            obj.rotation.y = r0 + ang + Math.PI / 2;
            obj.getWorldPosition(o); o.y += 0.45 * c.u;
            for (let i = 0; i < 2; i++) c.P.echar(V().copy(o).add(V().set(0, (Math.random() - 0.5) * 0.7 * c.u, 0)), V(), i ? c.col : (c.col2 || c.col), 0.22 * c.u, 0.35);
            if (Math.random() < 0.45) c.P.echar(o, V().set(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).multiplyScalar(2.2 * c.u), c.col2 || c.col, 0.08 * c.u, 0.25);
          } else { obj.position.copy(p0); obj.rotation.y = r0; }
          return t < c.d || c.P.vivas() > 0;
        },
        quitar() { obj.position.copy(p0); obj.rotation.y = r0; },
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
    disparo(c) {
      // Armas de los sets (pistola, dos pistolas, rifle, arco). Cada tiro: fogonazo en la mano, bala trazadora que vuela al
      // frente y chispas con humito donde se acaba. modo "doble": alterna mano derecha e izquierda; "rafaga": 3 tiros
      // seguidos; "flecha": una flecha (sin fogonazo) que se clava y suelta astillas. `tiros` = segundos de cada tiro.
      const modo = c.ef.modo, flecha = modo === "flecha";
      const tiros = (Array.isArray(c.ef.tiros) ? c.ef.tiros : modo === "rafaga" ? [0, 0.12, 0.24] : modo === "doble" ? [0, 0.25] : [0]).slice(0, 6).map(x => num(x, 0, 5, 0));
      const balas = [], mat = aditivo(c.col, 1), alma = aditivo(0xffffff, 1), o = V(), f = V(), q = V();
      const madera = new T.MeshLambertMaterial({ color: 0x8a5a2b }), punta = new T.MeshLambertMaterial({ color: 0x9ba19d });
      let n = 0;
      const mano = i => (modo === "doble" ? (i % 2 ? "mano_izq" : "mano_der") : c.ef.desde || "mano_der");
      return {
        paso(t, dt) {
          while (n < tiros.length && t >= tiros[n]) {
            const d = mano(n); origen(c.fig, d, o); apunta(c, f, d); f.y = 0; if (f.lengthSq() < 1e-6) frente(c.fig, f); f.normalize();
            o.addScaledVector(f, 0.12 * c.u);
            let b;
            if (flecha) {
              const g = new T.Group(), asta = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.5, 6), madera), cab = new T.Mesh(new T.ConeGeometry(0.035, 0.09, 6), punta);
              asta.rotation.x = Math.PI / 2; cab.rotation.x = Math.PI / 2; cab.position.z = 0.28; g.add(asta, cab); g.scale.setScalar(c.u);
              g.position.copy(o); g.lookAt(V().copy(o).add(f)); c.scene.add(g);
              b = { g, p: o.clone(), v: f.clone().multiplyScalar(7 * c.u), hecho: 0, max: 3.5 * c.u, fin: 0 };
            } else {
              destello(c, o, c.col2 || new T.Color(0xffd27a), modo === "rafaga" ? 0.45 : 0.55, 0.1);
              humo(c, o, 1, 0.16);
              b = { h: palo(c.scene, mat), a: palo(c.scene, alma), p: o.clone(), v: f.clone().multiplyScalar(18 * c.u), hecho: 0, max: 4.5 * c.u, fin: 0 };
            }
            balas.push(b); n++;
          }
          balas.forEach(b => {
            if (b.fin) { b.fin += dt; if (b.g) b.g.visible = b.fin < 0.6; return; }
            b.p.addScaledVector(b.v, dt); b.hecho += b.v.length() * dt;
            if (b.g) { b.g.position.copy(b.p); c.P.echar(b.p, V(), c.col, 0.12 * c.u, 0.25, { tex: "brillo", crece: 0.3 }); }
            else { q.copy(b.p).addScaledVector(b.v, -0.035); b.h.poner(q, b.p, 0.022 * c.u); b.a.poner(q, b.p, 0.008 * c.u); }
            if (b.hecho >= b.max) {
              b.fin = 1e-3;
              const dir = b.v.clone().normalize();
              if (b.g) { for (let i = 0; i < 5; i++) c.P.echar(b.p, V().set(azar(), Math.random(), azar()).multiplyScalar(0.8 * c.u), new T.Color(0xc9a56b), 0.05 * c.u, 0.4, { solido: true, crece: 0.5, sube: -3 * c.u }); }
              else { b.h.m.visible = b.a.m.visible = false; destello(c, b.p, c.col, 0.35, 0.1); chispas(c, b.p, dir, 6, Math.random() < 0.5 ? c.col : new T.Color(0xfff2c0), 2.4); humo(c, b.p, 1, 0.2); }
            }
          });
          return n < tiros.length || balas.some(b => !b.fin || b.fin < 0.6) || c.P.vivas() > 0;
        },
        quitar() {
          balas.forEach(b => { if (b.g) { c.scene.remove(b.g); b.g.children.forEach(m => m.geometry.dispose()); } else c.scene.remove(b.h.m, b.a.m); });
          [mat, alma, madera, punta].forEach(m => m.dispose());
        },
      };
    },
    puf(c) {
      // Nube de transformación (Elías, 28 nov: «debemos poner humo o algo»): la figura queda tapada por una nube espesa
      // con chispas y ladrillos mientras la escena la cambia por la nueva. Sale de la figura entera, no de un hueso.
      const o = V(), caja = new T.Box3();
      let salio = false;
      return {
        paso(t, dt) {
          if (t < 0) return true;
          if (!salio) {
            salio = true; caja.setFromObject(c.fig.obj); caja.getCenter(o);
            const alto = Math.max(c.u, caja.max.y - caja.min.y), ancho = Math.max(0.5 * c.u, caja.max.x - caja.min.x);
            destello(c, o, c.col, 1.2 * alto / c.u, 0.25);
            for (let i = 0; i < 22; i++) {
              const p = V().set(o.x + azar(ancho * 0.45), caja.min.y + Math.random() * alto, o.z + azar(ancho * 0.3));
              c.P.echar(p, V().set(azar(0.6), 0.15 + Math.random() * 0.45, azar(0.6)).multiplyScalar(c.u), null, (0.45 + Math.random() * 0.35) * alto, 0.9 + Math.random() * 0.5,
                { tex: "humo", rampa: "nube", normal: true, alfa: 0.92, crece: 1.7, freno: 2.2, entra: 0.06, gira: azar(1) });
            }
            chispas(c, o, null, 14, c.col, 2.6);
            ladrillos(c, o, 10, 1.6);
          }
          return c.P.vivas() > 0;
        },
        quitar() {},
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
      d: efecto.fijo === true ? 1e9 : num(efecto.dura, 0.2, 12, 1.2), P: particulas(scene), cam: o.camara && o.camara.isCamera ? o.camara : null,
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
        if (!sono && t >= 0) { sono = true; if (typeof o.sonar === "function" && !efecto.mudo) try { o.sonar(efecto.tipo); } catch (_) { /* nada */ } }
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
