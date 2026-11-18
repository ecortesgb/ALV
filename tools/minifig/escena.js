/* ============ Escena ALV: varias figuras en una escena 3D, con sus momentos ============ */
// ALV (la ventana de arriba) manda mensajes; esta página solo dibuja. Mismo origen siempre.
//   {origen:"alv", tipo:"figuras", lista:[{id, figura | semilla, foco?}]}  → arma o actualiza las figuras (en ese orden, de izq. a der.)
//      Sin figura, `semilla` (número) da una figura al azar que siempre sale igual (para quien aún no arma la suya).
//   {origen:"alv", tipo:"momento", id, cual:"punto"|"victoria"|"derrota"|"espera"}  → la figura hace ese momento
//   {origen:"alv", tipo:"foto", pid, figura | semilla, ancho, alto}  → responde {tipo:"foto", pid, url} (imagen de la figura)
//   {origen:"alv", tipo:"miniatura", pid, figura, zona, ancho, alto}  → igual que foto, encuadrada en una zona (miniaturas de piezas)
// Modo editor (escena.html?modo=editor, el personalizador): una sola figura sobre su base, que se gira arrastrando,
// se acerca con la rueda o pellizcando, parpadea y sonríe sola. Mensajes extra:
//   {tipo:"enfocar", zona}   → la cámara va a esa zona (ver ZONAS) y la figura voltea hacia donde se ve mejor
//   {tipo:"girar", cuanto}   → gira la figura (radianes)        {tipo:"acercar", cuanto} → >1 acerca, <1 aleja
//   {tipo:"soltar", pid, figura} → {tipo:"soltar", pid, figura} sin traje de personaje · {tipo:"azar", pid, semilla?} → figura al azar
//   {tipo:"gesto", cual:"parpadeo"|"sonrisa"}                   {tipo:"probar", cual}  → hace ese momento (nombre de nucleo/momentos.js)
// Responde {origen:"minifig", tipo:"listo"} cuando la biblioteca y la geometría cargaron.
(function () {
  "use strict";
  const lienzo = document.getElementById("lienzo");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.3, 60);
  const reloj = new THREE.Clock();
  const enviar = m => { try { if (window.parent !== window) window.parent.postMessage(Object.assign({ origen: "minifig" }, m), location.origin); } catch (e) { /* nada */ } };

  // Piezas extra sobre la figura (cuello, cinturón, color del objeto). Copia de js/15-creador-comic.js, que la escena
  // no carga: sin esto el HUB, la sala y la TV no dibujaban mochilas, chalecos, barbas largas ni cinturones.
  const build0 = build;
  build = function (c) {
    const fig = build0(c), J = fig.userData.j;
    if (c.cuello && c.cuello !== "ninguno") {
      const m = mallaLD(c.cuello.slice(3), plast(c.cuelloColor || "#6c6e68", { roughness: 0.4 }), "cuello");
      if (m) {
        const g = grupoLD(J.torso, ldM(0, 0, 0)); g.add(m);
        // Piezas que se montan entre cabeza y torso (barba larga): giran con la cabeza. attach() conserva la posición.
        const pz = (BIB.piezas || []).find(p => p.clave === c.cuello);
        if (pz && pz.conexion && pz.conexion.monta_en === "entre_cabeza_y_torso" && J.head) { fig.updateMatrixWorld(true); J.head.attach(g); }
      }
    }
    if (c.cinturon && c.piernasTipo !== "cortas") { const m = mallaLD("27145", plast(c.cinturon), "piernas"); if (m) grupoLD(J.legsG, ldM(0, 32, 0)).add(m); }
    if (c.accColor && J.handR) J.handR.traverse(o => { if (o.isMesh && !o.userData.decal && o.userData.part === "mano") { const ms = Array.isArray(o.material) ? o.material : [o.material]; o.material = ms.length === 1 ? plast(c.accColor) : ms.map((m, i) => (i === 0 ? plast(c.accColor) : m)); } });
    return fig;
  };

  // Luz de estudio parecida a la del taller (03-escena.js), sin sombras ni efectos pesados para el celular.
  (function () {
    const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x0a0d18, side: THREE.BackSide })));
    const panel = (w, h, x, y, z, ry, rx, k, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col || 0xffffff).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); env.add(m); };
    panel(7, 1.4, 0, 5.9, 1, 0, Math.PI / 2, 5); panel(1.2, 6, -9.9, 2.5, 3, Math.PI / 2, 0, 4.2);
    panel(1.0, 6, 9.9, 2.5, -4, -Math.PI / 2, 0, 3.0, 0x9fc4ff); panel(4, 2.4, 1.5, 2.2, 9.9, Math.PI, 0, 1.3, 0xfff0dc);
    scene.environment = pm.fromScene(env, 0.02).texture; pm.dispose();
  })();
  // Luz de caricatura: una principal cálida que marca el corte de sombra, cielo azul de relleno y un contraluz frío.
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a2c48, 0.75));
  const luz = new THREE.DirectionalLight(0xfff4e2, 1.25); luz.position.set(-3.5, 6, 5); scene.add(luz);
  const contra = new THREE.DirectionalLight(0x9cc4ff, 0.9); contra.position.set(4.5, 4, -5); scene.add(contra);
  const relleno = new THREE.DirectionalLight(0xffd6a8, 0.25); relleno.position.set(4, 1.5, 4); scene.add(relleno);

  // ---------- Estilo toon: tres tonos de luz y contorno oscuro ----------
  // El modelo de Minifig Studio no se toca: después de armar la figura se cambian sus materiales y se le agrega
  // una «cáscara» negra por pieza (casco invertido). Una sola pasada de dibujo; sirve igual en celular.
  const MODO = new URLSearchParams(location.search).get("modo") || "";
  const tonos = (function () { const d = new Uint8Array([70, 70, 70, 150, 150, 150, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RGBFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
  const contorno = new THREE.ShaderMaterial({
    uniforms: { grosor: { value: 2.2 }, res: { value: new THREE.Vector2(800, 600) }, color: { value: new THREE.Color(0x0b0f24) } },
    vertexShader: "uniform float grosor;uniform vec2 res;void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);vec3 n=normalize(normalMatrix*normal);vec4 c=projectionMatrix*vec4(n,0.0);vec2 d=c.xy;float l=length(d);if(l>1e-5)p.xy+=d/l*grosor*2.0/res*p.w;gl_Position=p;}",
    fragmentShader: "uniform vec3 color;void main(){gl_FragColor=vec4(color,1.0);}",
    side: THREE.BackSide
  });
  contorno.userData.compartido = true;
  function aToon(m) {
    if (!m || !(m.isMeshPhysicalMaterial || m.isMeshStandardMaterial)) return m;
    const t = new THREE.MeshToonMaterial({ color: m.color.clone(), gradientMap: tonos, map: m.map || null, transparent: m.transparent, opacity: m.opacity, side: m.side,
      depthWrite: m.depthWrite, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits });
    if (m.emissiveMap) { t.emissive = m.emissive.clone(); t.emissiveMap = m.emissiveMap; t.emissiveIntensity = m.emissiveIntensity; }
    else if (m.emissive && m.emissive.getHex()) { t.emissive = m.emissive.clone(); t.emissiveIntensity = m.emissiveIntensity; }
    m.map = null; m.emissiveMap = null; m.dispose(); // las texturas pasan al material nuevo
    return t;
  }
  function caricatura(obj) {
    const cascaras = [];
    obj.traverse(o => {
      if (!o.isMesh || o.userData.cascara) return;
      o.material = Array.isArray(o.material) ? o.material.map(aToon) : aToon(o.material);
      const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
      // Sin contorno: calcomanías (encima de otra pieza), piezas transparentes, efectos y la sombra.
      if (!m0 || !m0.isMeshToonMaterial || m0.transparent || m0.map || !o.geometry || !o.geometry.attributes.normal) return;
      cascaras.push(o);
    });
    cascaras.forEach(o => { const c = new THREE.Mesh(normalesSuaves(o.geometry), contorno); c.userData.cascara = true; c.renderOrder = -1; o.add(c); });
    return obj;
  }
  // Las piezas tienen caras planas: en las esquinas cada cara trae su normal y el contorno se abre. La cáscara usa
  // la normal promedio de los vértices que caen en el mismo punto (la geometría de posiciones se comparte, no se copia).
  function normalesSuaves(g) {
    const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count, suma = new Map(), clave = new Array(n);
    for (let i = 0; i < n; i++) {
      const k = Math.round(pos.getX(i) * 1e3) + "," + Math.round(pos.getY(i) * 1e3) + "," + Math.round(pos.getZ(i) * 1e3); clave[i] = k;
      const v = suma.get(k) || [0, 0, 0]; v[0] += nor.getX(i); v[1] += nor.getY(i); v[2] += nor.getZ(i); suma.set(k, v);
    }
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = suma.get(clave[i]), l = Math.hypot(v[0], v[1], v[2]) || 1; out[i * 3] = v[0] / l; out[i * 3 + 1] = v[1] / l; out[i * 3 + 2] = v[2] / l; }
    const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", pos); g2.setAttribute("normal", new THREE.BufferAttribute(out, 3)); if (g.index) g2.setIndex(g.index);
    return g2;
  }
  function medirContorno(r) { const v = new THREE.Vector2(); r.getDrawingBufferSize(v); contorno.uniforms.res.value.copy(v); contorno.uniforms.grosor.value = Math.max(2, Math.min(4.5, v.y / 210)); }

  // Pedestal del HUB: base con luz y aro dorado; la figura se para encima (y = 0).
  let pedestal = null;
  const EDITOR = MODO === "editor";
  if (MODO === "hub" || EDITOR) {
    pedestal = new THREE.Group();
    const tm = c => new THREE.MeshToonMaterial({ color: new THREE.Color(c).convertSRGBToLinear(), gradientMap: tonos });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.18, 0.34, 48), tm(0x24306b)); base.position.y = -0.17; pedestal.add(base);
    const tapa = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.02, 48), new THREE.MeshBasicMaterial({ color: 0x5aa6f0 })); tapa.position.y = 0.0; pedestal.add(tapa);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.035, 10, 64), new THREE.MeshBasicMaterial({ color: 0xffd23f })); aro.rotation.x = Math.PI / 2; aro.position.y = 0.0; pedestal.add(aro);
    const brillo = (function () { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"), r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, "rgba(200,235,255,1)"); r.addColorStop(0.45, "rgba(120,190,255,.45)"); r.addColorStop(1, "rgba(80,140,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: brillo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.015; pedestal.add(halo);
    caricatura(base);
    scene.add(pedestal);
  }
  const sombraGeo = new THREE.CircleGeometry(0.62, 40), sombraMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });

  let listo = false;
  const figuras = new Map(); // id → {obj, huella, mom, t0, espera, momentos, foco, x}
  let orden = [];
  const pendientes = [];

  // Copia de integrarPiezasEnMenus (js/99-arranque.js): las piezas importadas a la biblioteca entran a los menús del dibujo.
  function integrarPiezas() {
    BIB.piezas.forEach(p => {
      const k = p.clave;
      if (p.categoria === "cabello" || p.categoria === "casco") { if (!(k in CABELLO)) { CABELLO[k] = p.nombre; LD_PELO[k] = p.nombre; if (typeof CASCOS !== "undefined" && typeof PELOS !== "undefined") (p.categoria === "casco" ? CASCOS : PELOS)[k] = p.nombre; } }
      else if (p.categoria === "cuello") { if (typeof CUELLO !== "undefined" && !(k in CUELLO)) CUELLO[k] = p.nombre; }
      else if (p.categoria === "objeto") { if (!(k in ACCES)) { ACCES[k] = p.nombre; LD_ACC[k] = p.ldraw; COLOR_ACC[k] = p.color_defecto || "#a0a5a9"; } }
    });
  }

  const huellaDe = f => { const s = JSON.stringify(f); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0; return h.toString(16); };
  const valida = f => !!f && typeof f === "object" && f.version === 2;
  const deSemilla = n => (Number.isFinite(n) ? MinifigCore.aleatorio(BIB, { semilla: Math.abs(Math.floor(n)) % 2147483647 }) : null);
  const figuraDe = x => (valida(x.figura) ? x.figura : deSemilla(x.semilla));

  function armar(f) {
    const plano = desdeFigura(f);
    const obj = caricatura(build(plano));
    const sombra = new THREE.Mesh(sombraGeo, sombraMat); sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.003; obj.add(sombra);
    return { obj, momentos: plano._momentos || {}, plano };
  }
  function quitar(id) {
    const x = figuras.get(id); if (!x) return;
    if (x.cara) { x.cara.malla.material.map = x.cara.base; [x.cara.parpadeo, x.cara.sonrisa].forEach(t => t && t.dispose()); }
    scene.remove(x.obj); dispose(x.obj); figuras.delete(id);
  }
  function dispose(o) { o.traverse(m => { if (m.geometry && !m.userData.compartida && m.geometry !== sombraGeo) m.geometry.dispose(); const ms = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []; ms.forEach(x => { if (x === sombraMat || x === contorno) return; ["map", "emissiveMap"].forEach(k => x[k] && x[k].dispose()); x.dispose(); }); }); }

  function ponerFiguras(lista) {
    const ids = new Set(lista.map(x => String(x.id)));
    [...figuras.keys()].forEach(id => { if (!ids.has(id)) quitar(id); });
    orden = [];
    lista.forEach(x => {
      const id = String(x.id);
      const fx = figuraDe(x);
      if (!fx) { quitar(id); return; }
      const h = huellaDe(fx);
      let e = figuras.get(id);
      if (!e || e.huella !== h) {
        if (e) quitar(id);
        const t = reloj.getElapsedTime(), habia = !!e;
        try { const a = armar(fx); e = { id, obj: a.obj, momentos: a.momentos, plano: a.plano, huella: h, mom: a.momentos.espera || "respirar", t0: t - Math.random() * 3,
          pop: EDITOR && habia ? t : -9, parpadeo: t + 2 + Math.random() * 2, sonrisa: t + 7 + Math.random() * 4 }; }
        catch (err) { console.error("escena: no se pudo armar", id, err); return; }
        scene.add(e.obj); figuras.set(id, e);
      }
      e.foco = !!x.foco; orden.push(id);
    });
    acomodar();
  }

  // Figuras en fila: cada una al centro de su columna (ALV pone encima una columna tocable por jugador, con su nombre).
  // La del turno da un paso al frente.
  let paso = 1.55;
  function acomodar() {
    if (EDITOR) { tamano(); orden.forEach(id => figuras.get(id).obj.position.set(0, 0, 0)); return; }
    encuadrar();
    const n = orden.length;
    orden.forEach((id, i) => {
      const e = figuras.get(id), x = (i - (n - 1) / 2) * paso;
      e.obj.position.set(x, 0, e.foco ? 0.6 : 0); e.obj.rotation.y = MODO === "hub" ? -0.32 : -x * 0.04; e.obj.scale.setScalar(e.foco ? 1.12 : 1);
    });
  }
  function tamano() {
    const r = lienzo.getBoundingClientRect(), w = Math.max(2, r.width), h = Math.max(2, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function encuadrar() {
    tamano();
    // Medidas reales de una figura armada: 2.6–2.75 de alto con pelo o casco, 1.6–1.9 de ancho con brazos y objeto.
    // HUB: cabe también el pedestal (de y = -0.34 a 0) y queda aire arriba para que la figura no se vea gigante.
    const n = Math.max(1, orden.length), alto = MODO === "hub" ? 4.5 : 3.3, minimo = n * 1.9 + 0.3;
    const tv = Math.tan(camera.fov * Math.PI / 360), th = tv * camera.aspect;
    // Primero que quepa de alto; si así no caben a lo ancho, se aleja hasta que quepan.
    let d = (alto / 2) / tv;
    if (2 * d * th < minimo) d = (minimo / 2) / th;
    paso = (2 * d * th) / n;
    // Pantalla alta (celular vertical): sobra cielo; se mira más arriba para que los pies queden abajo, sobre el piso.
    const centro = MODO === "hub" ? Math.max(1.55, d * tv * 0.92 - 0.4) : Math.max(1.4, d * tv * 0.88);
    camera.position.set(0, centro + 0.15, d); camera.lookAt(0, centro, 0); camera.updateProjectionMatrix();
  }

  function momento(id, cual) {
    const e = figuras.get(String(id)); if (!e) return;
    const m = e.momentos[cual] || (cual === "espera" ? "respirar" : null); if (!m || !Momentos.info(m)) return;
    e.mom = m; e.t0 = reloj.getElapsedTime();
  }

  // HUB: cada 7 s la figura saluda (sube suave, saluda 1.6 s y baja) y voltea un poco a la cámara.
  // Saluda con la mano libre: con un objeto en la mano (escudo, escoba…) el brazo arriba lo metía en la cabeza.
  // armL lleva el objeto de la izquierda (accesorioIzq) y armR el de la derecha (accesorio); con las dos ocupadas solo voltea.
  const libre = v => !v || v === "ninguno";
  function saludo(e, t) {
    const obj = e.obj, J = obj.userData.j, p = e.plano || {}; if (!J) return;
    const c = t % 7, sube = c < 0.35 ? c / 0.35 : c < 1.95 ? 1 : c < 2.3 ? 1 - (c - 1.95) / 0.35 : 0;
    const k = sube * sube * (3 - 2 * sube);
    if (k <= 0) return;
    const lado = libre(p.accesorioIzq) ? "L" : libre(p.accesorio) ? "R" : null;
    if (lado) {
      const brazo = J["arm" + lado], muneca = J["wrist" + lado];
      brazo.rotation.x += (-2.6 + Math.sin(t * 9) * 0.25 - brazo.rotation.x) * k;
      muneca.rotation.y += (Math.sin(t * 9) * 0.6 - muneca.rotation.y) * k;
    }
    J.head.rotation.y += ((lado === "R" ? -0.25 : 0.25) - J.head.rotation.y) * k;
  }

  // ---------- Modo editor ----------
  // Zonas de la figura (unidades de la escena; pies en y = 0, lo más alto de un casco ≈ 2.75).
  // y: centro de la vista · alto: cuánto cabe de alto · giro: hacia dónde voltea la figura (0 = de frente).
  // La pierna/brazo «derecho» es el de la figura (a la izquierda de la imagen).
  const ZONAS = {
    completa: { y: 1.3, alto: 3.3, giro: -0.35 },
    pelo: { y: 2.22, alto: 1.65, giro: -0.5 },
    casco: { y: 2.25, alto: 1.7, giro: -0.5 },
    cabeza: { y: 2.08, alto: 1.25, giro: -0.15 },
    cuello: { y: 1.62, alto: 1.75, giro: 2.45 },
    torso: { y: 1.55, alto: 1.4, giro: -0.15 },
    brazos: { y: 1.5, alto: 1.6, giro: -0.55 },
    manos: { y: 1.2, alto: 1.1, giro: -0.45 },
    capa: { y: 1.35, alto: 2.8, giro: Math.PI - 0.5 },
    cadera: { y: 1.0, alto: 1.1, giro: -0.25 },
    piernas: { y: 0.65, alto: 1.55, giro: -0.25 },
    pierna_der: { y: 0.6, alto: 1.4, giro: -0.75 },
    pierna_izq: { y: 0.6, alto: 1.4, giro: 0.75 },
    botas: { y: 0.28, alto: 0.85, giro: -0.3 },
    objeto: { y: 1.25, alto: 2.1, giro: -0.45 },
  };
  const cam = { zona: "completa", x: 0, y: ZONAS.completa.y, d: 8, giro: ZONAS.completa.giro, meta: ZONAS.completa.giro, vel: 0, zoom: 1 };
  const ZOOM_MIN = 0.45, ZOOM_MAX = 1.9;
  function distancia(z, zoom, camara) {
    const tv = Math.tan(camara.fov * Math.PI / 360), th = tv * camara.aspect;
    // Que quepa de alto, y que el ancho (≈ 0.75 del alto) también quepa en pantallas angostas.
    return Math.max((z.alto / 2) / tv, (z.alto * 0.75 / 2) / th) * zoom;
  }
  // El giro más corto hacia el ángulo pedido (sin dar vueltas completas).
  const cercano = (desde, a) => a + Math.round((desde - a) / (2 * Math.PI)) * 2 * Math.PI;
  function enfocar(zona) {
    const z = ZONAS[zona]; if (!z) return;
    cam.zona = zona; cam.meta = cercano(cam.giro, z.giro); cam.vel = 0; cam.zoom = 1;
  }
  function moverCamara(dt) {
    const z = ZONAS[cam.zona], k = 1 - Math.exp(-dt * 5.5);
    if (!arrastre.activo) { cam.meta += cam.vel * dt; cam.vel *= Math.exp(-dt * 3.5); }
    cam.giro += (cam.meta - cam.giro) * (arrastre.activo ? 1 - Math.exp(-dt * 18) : k);
    cam.y += (z.y - cam.y) * k; cam.x += ((z.x || 0) - cam.x) * k;
    cam.d += (distancia(z, cam.zoom, camera) - cam.d) * k;
    camera.position.set(cam.x, cam.y + cam.d * 0.07, cam.d); camera.lookAt(cam.x, cam.y, 0);
  }
  // Arrastrar gira; dos dedos o la rueda acercan.
  const arrastre = { activo: false, x: 0, t: 0, dedos: new Map(), dist: 0 };
  if (EDITOR) {
    const dedos = arrastre.dedos;
    const separacion = () => { const [a, b] = [...dedos.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    lienzo.addEventListener("pointerdown", e => {
      lienzo.setPointerCapture(e.pointerId); dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (dedos.size === 1) { arrastre.activo = true; arrastre.x = e.clientX; arrastre.t = performance.now(); cam.vel = 0; }
      else if (dedos.size === 2) { arrastre.activo = false; arrastre.dist = separacion(); }
    });
    lienzo.addEventListener("pointermove", e => {
      if (!dedos.has(e.pointerId)) return;
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (dedos.size === 2) { const s = separacion(); if (arrastre.dist > 0) cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom * arrastre.dist / s)); arrastre.dist = s; return; }
      if (!arrastre.activo) return;
      const ahora = performance.now(), dx = e.clientX - arrastre.x, dt = Math.max(1, ahora - arrastre.t) / 1000;
      const giro = dx * 0.012; cam.meta += giro; cam.vel = cam.vel * 0.5 + (giro / dt) * 0.5;
      arrastre.x = e.clientX; arrastre.t = ahora;
    });
    const soltar = e => {
      dedos.delete(e.pointerId);
      if (performance.now() - arrastre.t > 90) cam.vel = 0; // se detuvo antes de soltar: sin inercia
      arrastre.activo = false; if (dedos.size < 2) arrastre.dist = 0;
    };
    lienzo.addEventListener("pointerup", soltar); lienzo.addEventListener("pointercancel", soltar);
    lienzo.addEventListener("wheel", e => { e.preventDefault(); cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
  }

  // Gestos de la cara: se cambia solo la imagen del rostro unos instantes (no se rearma la figura).
  function caraDe(e) {
    if (e.cara !== undefined) return e.cara;
    let malla = null; e.obj.traverse(o => { if (!malla && o.isMesh && o.userData.part === "rostro") malla = o; });
    e.cara = malla && malla.material.map ? { malla, base: malla.material.map, parpadeo: null, sonrisa: null, hasta: 0 } : null;
    return e.cara;
  }
  function conImagen(base, lienzoCara) { const t = base.clone(); t.image = lienzoCara; t.needsUpdate = true; return t; }
  function gesto(e, cual, t) {
    const c = caraDe(e), id = String((e.plano && e.plano.rostro) || "");
    if (!c || !id || id === "ninguno" || id.startsWith("mascara")) return;
    if (cual === "parpadeo") {
      if (id === "carcajada" || id === "guino") return; // ya tienen los ojos cerrados
      if (!c.parpadeo) {
        const img = c.base.image, cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
        const g = cv.getContext("2d"), k = img.width / 512; g.drawImage(img, 0, 0); g.setTransform(k, 0, 0, k, 0, 0);
        // Ojos en (208, 104) y (304, 104) del dibujo de 512×256 (drawFace en js/05-estampados.js)
        [208, 304].forEach(x => {
          g.clearRect(x - 23, 82, 46, 46);
          g.strokeStyle = "#141414"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.arc(x, 98, 14, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
        });
        c.parpadeo = conImagen(c.base, cv);
      }
      c.malla.material.map = c.parpadeo; c.hasta = t + 0.13;
    } else if (cual === "sonrisa") {
      if (!c.sonrisa) c.sonrisa = conImagen(c.base, drawFace(id.endsWith("mujer") ? "sonrisa-mujer" : "sonrisa-grande", e.plano));
      c.malla.material.map = c.sonrisa; c.hasta = t + 1.5;
    }
  }
  function gestosSolos(e, t) {
    const c = caraDe(e);
    if (c && c.hasta && t > c.hasta) { c.malla.material.map = c.base; c.hasta = 0; }
    if (t > e.parpadeo) { if (!(c && c.hasta)) gesto(e, "parpadeo", t); e.parpadeo = t + 2.4 + Math.random() * 3.2; }
    if (t > e.sonrisa) { gesto(e, "sonrisa", t); e.sonrisa = t + 9 + Math.random() * 7; e.parpadeo = Math.max(e.parpadeo, t + 1.8); }
  }

  let antes = 0;
  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!listo || document.hidden) return;
    const t = reloj.getElapsedTime(), dt = Math.min(0.1, t - antes); antes = t;
    if (EDITOR) moverCamara(dt);
    figuras.forEach(e => {
      const i = Momentos.info(e.mom);
      if (i && !i.bucle && t - e.t0 > i.dur + 0.4) { e.mom = e.momentos.espera || "respirar"; e.t0 = t; }
      window.MOM_T0 = e.t0; animar(e.obj, "mom:" + e.mom, t);
      if (MODO === "hub" && !(i && !i.bucle)) saludo(e, t);
      if (EDITOR) {
        e.obj.rotation.y = cam.giro;
        // Al cambiar una pieza, la figura da un saltito.
        const p = t - e.pop; e.obj.scale.setScalar(p < 0.45 ? 1 + Math.sin(p / 0.45 * Math.PI) * 0.07 * (1 - p / 0.45) : 1);
        gestosSolos(e, t);
      }
    });
    medirContorno(renderer);
    renderer.render(scene, camera);
  }

  // Fotos: un dibujante aparte, con fondo transparente, sin tocar la escena viva.
  let fotografo = null;
  function foto(f, ancho, alto, zona) {
    ancho = Math.min(512, Math.max(64, ancho | 0 || 256)); alto = Math.min(640, Math.max(64, alto | 0 || 320));
    if (!fotografo) {
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.NoToneMapping; r.setClearColor(0, 0);
      const s = new THREE.Scene(); s.environment = scene.environment;
      scene.children.filter(o => o.isLight).forEach(l => s.add(l.clone()));
      fotografo = { r, s, cam: new THREE.PerspectiveCamera(24, 1, 0.3, 40) };
    }
    const { r, s, cam } = fotografo;
    r.setSize(ancho, alto, false); cam.aspect = ancho / alto;
    const a = armar(f), z = zona && ZONAS[zona]; window.MOM_T0 = 0; animar(a.obj, "quieto", 0); a.obj.rotation.y = z ? z.giro : -0.35; s.add(a.obj);
    if (z) { cam.updateProjectionMatrix(); const d = distancia(z, 1, cam); cam.position.set(z.x || 0, z.y + d * 0.07, d); cam.lookAt(z.x || 0, z.y, 0); }
    // Cuadro de 3.2 de alto centrado en 1.38: de los pies (y=0) a lo más alto de un casco o peinado (≈2.75).
    else cam.position.set(0, 1.5, 7.55), cam.lookAt(0, 1.38, 0);
    cam.updateProjectionMatrix();
    medirContorno(r); r.render(s, cam); let url = r.domElement.toDataURL("image/webp", 0.85);
    if (!url.startsWith("data:image/webp")) url = r.domElement.toDataURL("image/png");
    s.remove(a.obj); dispose(a.obj);
    return url;
  }

  function atender(d) {
    if (d.tipo === "figuras" && Array.isArray(d.lista)) ponerFiguras(d.lista.slice(0, 12));
    else if (d.tipo === "momento") momento(d.id, d.cual);
    else if (d.tipo === "foto" || d.tipo === "miniatura") {
      let url = null;
      try { const fx = figuraDe(d); if (fx) url = foto(fx, d.ancho, d.alto, d.tipo === "miniatura" ? String(d.zona || "") : ""); } catch (e) { console.error("escena: foto", e); }
      enviar({ tipo: d.tipo, pid: d.pid, url });
    }
    else if (d.tipo === "soltar" || d.tipo === "azar") {
      // soltar: el traje de personaje que traiga la figura pasa a ser su ropa (se ve igual y ya se puede editar).
      // azar: una figura nueva al azar (con `semilla` sale siempre la misma).
      let figura = null;
      try {
        if (d.tipo === "azar") figura = MinifigCore.aleatorio(BIB, { semilla: Number.isFinite(d.semilla) ? Math.abs(Math.floor(d.semilla)) % 2147483647 : Date.now() % 2147483647 });
        else if (valida(d.figura)) { const f = MinifigCore.migrar(d.figura, BIB); figura = f.traje && f.traje.id ? MinifigCore.soltarTraje(f, BIB).figura : f; }
      } catch (e) { console.error("escena: " + d.tipo, e); }
      enviar({ tipo: d.tipo, pid: d.pid, figura });
    }
    else if (!EDITOR) return;
    else if (d.tipo === "enfocar") enfocar(String(d.zona));
    else if (d.tipo === "girar" && Number.isFinite(d.cuanto)) { cam.meta += Math.max(-7, Math.min(7, d.cuanto)); cam.vel = 0; }
    else if (d.tipo === "acercar" && Number.isFinite(d.cuanto) && d.cuanto > 0) cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom / d.cuanto));
    else if (d.tipo === "gesto") figuras.forEach(e => gesto(e, d.cual, reloj.getElapsedTime()));
    else if (d.tipo === "probar" && Momentos.info(String(d.cual))) figuras.forEach(e => { e.mom = String(d.cual); e.t0 = reloj.getElapsedTime(); });
  }
  window.addEventListener("message", e => {
    if (e.origin !== location.origin || !e.data || e.data.origen !== "alv") return;
    if (!listo) pendientes.push(e.data); else atender(e.data);
  });
  window.addEventListener("resize", () => listo && acomodar());

  (async function arrancar() {
    try {
      await cargarBiblioteca("biblioteca/");
      await new Promise((ok, mal) => { const s = document.createElement("script"); s.src = "biblioteca/geometria/ldraw_piezas.js"; s.onload = ok; s.onerror = () => mal(new Error("geometría")); document.head.appendChild(s); });
      if (window.LDRAW_COLORES) Object.assign(LDCOL, window.LDRAW_COLORES);
      integrarPiezas();
    } catch (e) { console.error("escena: no cargó la biblioteca", e); enviar({ tipo: "error" }); return; }
    listo = true; acomodar(); pendientes.splice(0).forEach(atender); enviar({ tipo: "listo" }); cuadro();
  })();
})();
