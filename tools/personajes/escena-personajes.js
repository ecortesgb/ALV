/* ============ Escena de prueba de personajes con esqueleto ============ */
// Mensajes (mismo origen, {origen:"alv"}):
//   {tipo:"planos", lista:[plano…]}  → arma las figuras de izquierda a derecha (las que ya están y no cambiaron se quedan)
//   {tipo:"momento", id, cual, vel?} → esa figura toca una lógica, un momento o gesto de siempre, o un clip de vida
//   {tipo:"todos", cual}             → todas a la vez
// Responde {origen:"minifig", tipo:"listo"} al cargar, {tipo:"armadas", ids, errores} y {tipo:"medida", …}.
(function () {
  "use strict";
  const enviar = m => { try { if (window.parent !== window) window.parent.postMessage(Object.assign({ origen: "minifig" }, m), location.origin); } catch (e) { /* sin ventana */ } };
  if (!window.MotorPersonajes) { enviar({ tipo: "error", texto: "Faltan THREE, GLTFLoader, SkeletonUtils o logicas.js" }); return; }
  const lienzo = document.getElementById("lienzo");
  // ?fondo=no → fondo transparente (la página de arriba pone el suyo) y sin piso grande.
  const SIN_FONDO = new URLSearchParams(location.search).get("fondo") === "no";
  // ?cerca=1 → encuadre más cerrado para una sola figura en un cuadro bajo (el constructor en celular).
  const CERCA = new URLSearchParams(location.search).get("cerca") === "1";
  if (SIN_FONDO) document.documentElement.style.background = document.body.style.background = "transparent";
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: SIN_FONDO });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene();
  if (!SIN_FONDO) scene.background = new THREE.Color(0x1c2030);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3020, 0.75));
  const clave = new THREE.DirectionalLight(0xffffff, 1.1); clave.castShadow = true; clave.shadow.mapSize.set(2048, 2048); scene.add(clave, clave.target);
  const contra = new THREE.DirectionalLight(0x9fb8ff, 0.5); contra.position.set(-4, 5, -6); scene.add(contra);
  // Sin fondo: el piso solo recibe la sombra (transparente).
  const piso = new THREE.Mesh(new THREE.CircleGeometry(1, 48), SIN_FONDO
    ? new THREE.ShadowMaterial({ opacity: 0.35 }) : new THREE.MeshStandardMaterial({ color: 0x2b3146, roughness: 0.95 }));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; scene.add(piso);

  const figuras = new Map(); // id → { p, firma }
  let orden = [];
  const HUECO = 0.45; // espacio entre figuras, en unidades de la escena (las de ALV miden ~2.6)

  function acomodar() {
    // De izquierda a derecha, cada una con su propio ancho (Hulk ocupa más que una minifigura).
    const lista = orden.map(id => figuras.get(id)).filter(Boolean);
    const anchos = lista.map(f => Math.max(0.8, f.p.ancho()));
    const total = anchos.reduce((a, b) => a + b, 0) + HUECO * Math.max(0, lista.length - 1);
    let x = -total / 2;
    lista.forEach((f, i) => { f.p.obj.position.x = x + anchos[i] / 2; x += anchos[i] + HUECO; });
    let alto = 0;
    figuras.forEach(f => { alto = Math.max(alto, f.p.alto()); });
    alto = alto || 2.6;
    const cerca = CERCA && camera.aspect > 1; // solo en cuadros anchos y bajos; en uno alto cortaría la cabeza
    const ancho = cerca ? Math.max(alto * 0.8, total + 0.3) : Math.max(alto, total + 0.6);
    // Que quepan a lo alto y a lo ancho según la forma de la ventana (con 10 % de margen).
    const tanV = Math.tan((camera.fov * Math.PI) / 360), tanH = tanV * camera.aspect;
    const dist = cerca ? 1.02 * Math.max((alto * 0.53) / tanV, (ancho * 0.5) / tanH) + 0.15
      : 1.1 * Math.max((alto * 0.62) / tanV, (ancho * 0.5) / tanH) + 1;
    camera.position.set(0, alto * 0.62, dist); camera.lookAt(0, alto * (cerca ? 0.465 : 0.5), 0);
    piso.scale.setScalar(Math.max(ancho, alto) * 1.2);
    clave.position.set(alto * 2, alto * 4, alto * 3);
    Object.assign(clave.shadow.camera, { left: -ancho, right: ancho, top: alto * 2, bottom: -alto, near: 0.1, far: alto * 12 });
    clave.shadow.camera.updateProjectionMatrix();
  }

  // Cada mensaje «planos» es un turno; si llega otro mientras se arman las figuras (cambios rápidos en el constructor),
  // lo armado por el turno viejo se tira para que no queden figuras duplicadas en la escena.
  let turno = 0;
  async function ponerPlanos(lista, rev) {
    const mio = ++turno;
    const errores = [];
    const nuevos = Array.isArray(lista) ? lista.filter(p => p && typeof p.id === "string" && typeof p.glb === "string") : [];
    const ids = new Set(nuevos.map(p => p.id));
    figuras.forEach((f, id) => { if (!ids.has(id)) { f.p.quitar(); figuras.delete(id); } });
    await Promise.all(nuevos.map(async plano => {
      const firma = JSON.stringify(plano), ya = figuras.get(plano.id);
      if (ya && ya.firma === firma) return;
      try {
        const p = await MotorPersonajes.crear(plano);
        if (mio !== turno) { p.quitar(); return; }
        const viejo = figuras.get(plano.id);
        if (viejo) viejo.p.quitar();
        p.obj.rotation.y = giro; // conserva el giro que el jugador le dio (al cambiar una pieza no regresa al frente)
        scene.add(p.obj); figuras.set(plano.id, { p, firma });
      } catch (e) { errores.push(plano.id + ": " + (e && e.message ? e.message : e)); }
    }));
    if (mio !== turno) return;
    orden = nuevos.map(p => p.id).filter(id => figuras.has(id));
    acomodar();
    // rev: número del pedido que se armó (Codex O2: quien pidió descarta respuestas viejas).
    enviar({ tipo: "armadas", ids: orden, errores, rev: typeof rev === "number" ? rev : null });
  }

  addEventListener("message", e => {
    if (e.origin !== location.origin || !e.data || e.data.origen !== "alv") return;
    const d = e.data;
    if (d.tipo === "planos") ponerPlanos(d.lista, d.rev);
    if (d.tipo === "momento" && figuras.has(d.id)) figuras.get(d.id).p.tocar(d.cual, { vel: d.vel });
    if (d.tipo === "todos") figuras.forEach(f => f.p.tocar(d.cual));
    if (d.tipo === "medir") {
      const m = {}; figuras.forEach((f, id) => { m[id] = { alto: f.p.alto(), escala: f.p.obj.scale.x }; });
      enviar({ tipo: "medida", figuras: m });
    }
  });

  // Girar arrastrando (con una sola figura, como la ficha de la galería) o con {tipo:"girar", cuanto} en radianes.
  let giro = 0, arrastre = null;
  const aplicarGiro = () => figuras.forEach(f => { f.p.obj.rotation.y = giro; });
  lienzo.addEventListener("pointerdown", e => { arrastre = { x: e.clientX, g: giro }; lienzo.setPointerCapture(e.pointerId); });
  lienzo.addEventListener("pointermove", e => { if (!arrastre) return; giro = arrastre.g + (e.clientX - arrastre.x) * 0.012; aplicarGiro(); });
  const soltar = () => { arrastre = null; };
  lienzo.addEventListener("pointerup", soltar); lienzo.addEventListener("pointercancel", soltar);
  addEventListener("message", e => {
    if (e.origin !== location.origin || !e.data || e.data.origen !== "alv") return;
    if (e.data.tipo === "girar" && typeof e.data.cuanto === "number") { giro += e.data.cuanto; aplicarGiro(); }
  });

  // Medición: tiempo de mover huesos y de dibujar, promedio de los últimos 60 cuadros.
  const M = { cuadros: 0, mover: 0, dibujar: 0, llamadas: 0, triangulos: 0 };
  window.__escena = { figuras, M, renderer, scene, camera };
  const reloj = new THREE.Clock();
  function cuadro() {
    requestAnimationFrame(cuadro);
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    if (lienzo.width !== Math.floor(w * renderer.getPixelRatio()) || lienzo.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); acomodar();
    }
    const dt = Math.min(reloj.getDelta(), 0.1);
    const t0 = performance.now();
    figuras.forEach(f => f.p.update(dt));
    const t1 = performance.now();
    renderer.render(scene, camera);
    const t2 = performance.now();
    const k = 1 / Math.min(60, ++M.cuadros);
    M.mover += (t1 - t0 - M.mover) * k; M.dibujar += (t2 - t1 - M.dibujar) * k;
    M.llamadas = renderer.info.render.calls; M.triangulos = renderer.info.render.triangles;
  }
  cuadro();
  enviar({ tipo: "listo" });
})();
