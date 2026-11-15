/* ============ Escena ALV: varias figuras en una escena 3D, con sus momentos ============ */
// ALV (la ventana de arriba) manda mensajes; esta página solo dibuja. Mismo origen siempre.
//   {origen:"alv", tipo:"figuras", lista:[{id, figura | semilla, foco?}]}  → arma o actualiza las figuras (en ese orden, de izq. a der.)
//      Sin figura, `semilla` (número) da una figura al azar que siempre sale igual (para quien aún no arma la suya).
//   {origen:"alv", tipo:"momento", id, cual:"punto"|"victoria"|"derrota"|"espera"}  → la figura hace ese momento
//   {origen:"alv", tipo:"foto", pid, figura | semilla, ancho, alto}  → responde {tipo:"foto", pid, url} (imagen de la figura)
// Responde {origen:"minifig", tipo:"listo"} cuando la biblioteca y la geometría cargaron.
(function () {
  "use strict";
  const lienzo = document.getElementById("lienzo");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.3, 60);
  const reloj = new THREE.Clock();
  const enviar = m => { try { if (window.parent !== window) window.parent.postMessage(Object.assign({ origen: "minifig" }, m), location.origin); } catch (e) { /* nada */ } };

  // Luz de estudio parecida a la del taller (03-escena.js), sin sombras ni efectos pesados para el celular.
  (function () {
    const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x0a0d18, side: THREE.BackSide })));
    const panel = (w, h, x, y, z, ry, rx, k, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col || 0xffffff).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); env.add(m); };
    panel(7, 1.4, 0, 5.9, 1, 0, Math.PI / 2, 5); panel(1.2, 6, -9.9, 2.5, 3, Math.PI / 2, 0, 4.2);
    panel(1.0, 6, 9.9, 2.5, -4, -Math.PI / 2, 0, 3.0, 0x9fc4ff); panel(4, 2.4, 1.5, 2.2, 9.9, Math.PI, 0, 1.3, 0xfff0dc);
    scene.environment = pm.fromScene(env, 0.02).texture; pm.dispose();
  })();
  scene.add(new THREE.HemisphereLight(0xc4d6ff, 0x2a2018, 0.5));
  const luz = new THREE.DirectionalLight(0xfff0dc, 2.4); luz.position.set(-3.5, 6, 5); scene.add(luz);
  const contra = new THREE.DirectionalLight(0x8fbaff, 1.8); contra.position.set(4.5, 4, -5); scene.add(contra);
  const relleno = new THREE.DirectionalLight(0xffd6a8, 0.6); relleno.position.set(4, 1.5, 4); scene.add(relleno);
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
    const obj = build(plano);
    const sombra = new THREE.Mesh(sombraGeo, sombraMat); sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.003; obj.add(sombra);
    return { obj, momentos: plano._momentos || {} };
  }
  function quitar(id) { const x = figuras.get(id); if (!x) return; scene.remove(x.obj); dispose(x.obj); figuras.delete(id); }
  function dispose(o) { o.traverse(m => { if (m.geometry && !m.userData.compartida && m.geometry !== sombraGeo) m.geometry.dispose(); const ms = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []; ms.forEach(x => { if (x === sombraMat) return; ["map", "emissiveMap"].forEach(k => x[k] && x[k].dispose()); x.dispose(); }); }); }

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
        try { const a = armar(fx); e = { obj: a.obj, momentos: a.momentos, huella: h, mom: a.momentos.espera || "respirar", t0: reloj.getElapsedTime() - Math.random() * 3 }; }
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
    encuadrar();
    const n = orden.length;
    orden.forEach((id, i) => {
      const e = figuras.get(id), x = (i - (n - 1) / 2) * paso;
      e.obj.position.set(x, 0, e.foco ? 0.6 : 0); e.obj.rotation.y = -x * 0.04; e.obj.scale.setScalar(e.foco ? 1.12 : 1);
    });
  }
  function encuadrar() {
    const r = lienzo.getBoundingClientRect(), w = Math.max(2, r.width), h = Math.max(2, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // Medidas reales de una figura armada: 2.6–2.75 de alto con pelo o casco, 1.6–1.9 de ancho con brazos y objeto.
    const n = Math.max(1, orden.length), alto = 3.3, minimo = n * 1.9 + 0.3;
    const tv = Math.tan(camera.fov * Math.PI / 360), th = tv * camera.aspect;
    // Primero que quepa de alto; si así no caben a lo ancho, se aleja hasta que quepan.
    let d = (alto / 2) / tv;
    if (2 * d * th < minimo) d = (minimo / 2) / th;
    paso = (2 * d * th) / n;
    // Pantalla alta (celular vertical): sobra cielo; se mira más arriba para que los pies queden abajo, sobre el piso.
    const centro = Math.max(1.4, d * tv * 0.88);
    camera.position.set(0, centro + 0.15, d); camera.lookAt(0, centro, 0); camera.updateProjectionMatrix();
  }

  function momento(id, cual) {
    const e = figuras.get(String(id)); if (!e) return;
    const m = e.momentos[cual] || (cual === "espera" ? "respirar" : null); if (!m || !Momentos.info(m)) return;
    e.mom = m; e.t0 = reloj.getElapsedTime();
  }

  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!listo || document.hidden) return;
    const t = reloj.getElapsedTime();
    figuras.forEach(e => {
      const i = Momentos.info(e.mom);
      if (i && !i.bucle && t - e.t0 > i.dur + 0.4) { e.mom = e.momentos.espera || "respirar"; e.t0 = t; }
      window.MOM_T0 = e.t0; animar(e.obj, "mom:" + e.mom, t);
    });
    renderer.render(scene, camera);
  }

  // Fotos: un dibujante aparte, con fondo transparente, sin tocar la escena viva.
  let fotografo = null;
  function foto(f, ancho, alto) {
    ancho = Math.min(512, Math.max(64, ancho | 0 || 256)); alto = Math.min(640, Math.max(64, alto | 0 || 320));
    if (!fotografo) {
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.setClearColor(0, 0);
      const s = new THREE.Scene(); s.environment = scene.environment;
      scene.children.filter(o => o.isLight).forEach(l => s.add(l.clone()));
      fotografo = { r, s, cam: new THREE.PerspectiveCamera(24, 1, 0.3, 40) };
    }
    const { r, s, cam } = fotografo;
    r.setSize(ancho, alto, false); cam.aspect = ancho / alto;
    const a = armar(f); window.MOM_T0 = 0; animar(a.obj, "quieto", 0); a.obj.rotation.y = -0.35; s.add(a.obj);
    // Cuadro de 3.2 de alto centrado en 1.38: de los pies (y=0) a lo más alto de un casco o peinado (≈2.75).
    cam.position.set(0, 1.5, 7.55); cam.lookAt(0, 1.38, 0); cam.updateProjectionMatrix();
    r.render(s, cam); let url = r.domElement.toDataURL("image/webp", 0.85);
    if (!url.startsWith("data:image/webp")) url = r.domElement.toDataURL("image/png");
    s.remove(a.obj); dispose(a.obj);
    return url;
  }

  function atender(d) {
    if (d.tipo === "figuras" && Array.isArray(d.lista)) ponerFiguras(d.lista.slice(0, 12));
    else if (d.tipo === "momento") momento(d.id, d.cual);
    else if (d.tipo === "foto") { let url = null; try { const fx = figuraDe(d); if (fx) url = foto(fx, d.ancho, d.alto); } catch (e) { console.error("escena: foto", e); } enviar({ tipo: "foto", pid: d.pid, url }); }
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
