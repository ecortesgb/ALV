/* ============ Escena de prueba de personajes con esqueleto ============ */
// Mensajes (mismo origen, {origen:"alv"}):
//   {tipo:"planos", lista:[plano…]}  → arma las figuras de izquierda a derecha (las que ya están y no cambiaron se quedan)
//   {tipo:"momento", id, cual, vel?} → esa figura toca una lógica, un momento o gesto de siempre, o un clip de vida
//   {tipo:"todos", cual}             → todas a la vez
// Responde {origen:"minifig", tipo:"listo"} al cargar, {tipo:"armadas", ids, errores, rev}, {tipo:"medida", …} y
// {tipo:"toque", id, x, y} cuando se toca una figura sin arrastrar y {tipo:"presion"} al empezar cualquier toque en la
// escena (la página de arriba no ve los toques dentro del iframe: así cierra lo que tenga abierto).
// {tipo:"error", texto} si falta algo para dibujar.
(function () {
  "use strict";
  const enviar = m => { try { if (window.parent !== window) window.parent.postMessage(Object.assign({ origen: "minifig" }, m), location.origin); } catch (e) { /* sin ventana */ } };
  if (!window.MotorPersonajes) { enviar({ tipo: "error", texto: "Faltan THREE, GLTFLoader, SkeletonUtils o logicas.js" }); return; }
  const lienzo = document.getElementById("lienzo");
  // ?fondo=no → fondo transparente (la página de arriba pone el suyo) y sin piso grande.
  const SIN_FONDO = new URLSearchParams(location.search).get("fondo") === "no";
  // ?cerca=1 → encuadre más cerrado para una sola figura en un cuadro bajo (el constructor en celular).
  const CERCA = new URLSearchParams(location.search).get("cerca") === "1";
  // ?frente=<grados> → en reposo y en vida, el cuerpo no se aparta del frente más de esos grados (el clip de reposo de
  // algunos personajes gira la cadera hasta ±65°: en el personalizador hay que ver lo que se cambia). 0 = sin límite.
  const QUIETO = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FRENTE = Math.max(0, Math.min(90, parseFloat(new URLSearchParams(location.search).get("frente")) || 0)) * Math.PI / 180;
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

  // {tipo:"correr", x, ms} recorre la cámara de lado (x en fracción del ancho visible; + = la figura se ve más a la
  // izquierda) en ms milisegundos con desaceleración, sin rebote; lo usa el constructor para que la rueda de gestos no
  // tape a la figura en celular (Codex, encargo 2026-11-26-rueda-gestos-r2).
  let vista = null, corre = 0, tramo = null;
  // {tipo:"enfocar", zona:"cabeza"|"cuerpo"}: la cámara se acerca de frente a la cabeza de la primera figura (con margen
  // para casco, pelo u orejas) y la figura pasa a reposo; «cuerpo» regresa. {tipo:"cara", n}: deja ver solo la expresión
  // n de la cara (las mallas de la ranura «face», sin la máscara) y congela la figura para revisarla; n = null la suelta.
  // {tipo:"restablecer"}: giro 0, cuerpo completo, sin expresión fija. Lo usa el modo revisión (Codex, modo-revision-r1).
  let foco = "cuerpo";
  const vc = new THREE.Vector3(), cajaC = new THREE.Box3();
  function enfocarCabeza() {
    const f = figuras.get(orden[0]);
    const cab = f && f.p.hueso("cabeza");
    if (!cab) return;
    f.p.obj.updateMatrixWorld(true);
    cajaC.makeEmpty();
    f.p.obj.traverse(o => {
      if (!o.isMesh || !o.visible || o.userData.alvOclusor || !/^(head|face|hair|headgear)$/.test(o.userData.slot || "")) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 3) { vc.fromBufferAttribute(pos, i); if (o.isSkinnedMesh) o.boneTransform(i, vc); vc.applyMatrix4(o.matrixWorld); cajaC.expandByPoint(vc); }
    });
    if (cajaC.isEmpty()) cab.getWorldPosition(vc), cajaC.setFromCenterAndSize(vc, new THREE.Vector3(0.6, 0.6, 0.6));
    const c = cajaC.getCenter(new THREE.Vector3()), t = cajaC.getSize(new THREE.Vector3());
    // Al menos un 14 % de la altura de la figura: en las grandes (Big Fig) la cabeza es chica y quedaba encima.
    const r = Math.max(Math.max(t.x, t.y) * 0.5 * 1.7, f.p.alto() * 0.14), tanV = Math.tan((camera.fov * Math.PI) / 360);
    const d = r / Math.min(tanV, tanV * camera.aspect);
    camera.position.set(c.x, c.y, c.z + d); camera.lookAt(c);
  }
  function caraFija(n) {
    const f = figuras.get(orden[0]);
    if (!f) return 0;
    const caras = [];
    f.p.obj.traverse(o => { if (o.isMesh && o.userData.slot === "face" && !o.userData.alvOclusor) caras.push(o); });
    if (n == null) { f.caraFija = null; return caras.length; }
    f.caraFija = Math.max(0, Math.min(caras.length - 1, n));
    caras.forEach((o, i) => { o.visible = i === f.caraFija; });
    return caras.length;
  }
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
    vista = { dist, mira: alto * (cerca ? 0.465 : 0.5), ancho: 2 * dist * tanH };
    if (foco === "cabeza") enfocarCabeza();
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
        // Al cambiar una pieza la figura late (1 → 1.025 → 1 en 180 ms, desde los pies) para confirmar el cambio.
        const pulso = viejo && !QUIETO ? { t: 0, base: p.obj.scale.x } : null;
        // Con ?frente (constructor y galería) la figura nueva regresa al frente aunque el jugador la haya girado (Codex,
        // encargo 2026-11-25-constructor-diseno-r5); sin él conserva el giro.
        if (FRENTE) { giro = 0; aplicarGiro(); }
        p.obj.rotation.y = giro;
        scene.add(p.obj); figuras.set(plano.id, { p, firma, pulso, ultimaL: "reposo" });
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
    if (d.tipo === "enfocar") {
      foco = d.zona === "cabeza" ? "cabeza" : "cuerpo";
      if (foco === "cuerpo") caraFija(null); // al salir de la cara se suelta la expresión fija (Codex, modo-revision-verif)
      const f = figuras.get(orden[0]);
      if (f && foco === "cabeza") f.p.tocar("reposo", { mezcla: 0.2 });
      acomodar();
    }
    if (d.tipo === "cara") enviar({ tipo: "caras", n: caraFija(typeof d.n === "number" ? d.n : null) });
    if (d.tipo === "restablecer") { foco = "cuerpo"; giro = 0; aplicarGiro(); caraFija(null); acomodar(); }
    if (d.tipo === "correr" && typeof d.x === "number") {
      const meta = Math.max(-0.5, Math.min(0.5, d.x)), ms = typeof d.ms === "number" ? Math.max(0, Math.min(1000, d.ms)) : 200;
      tramo = QUIETO || !ms ? { de: meta, a: meta, t0: 0, dur: 1 } : { de: corre, a: meta, t0: performance.now(), dur: ms };
    }
    // Clips del juego: siempre a velocidad 1 (logicas.js velocidadClip), aunque el mensaje traiga la de un perfil.
    // {tipo:"poder", id, poder}: un poder o un movimiento de set del plano (círculo fijo del personalizador, Elías 27 nov),
    // con sus efectos (efectos.js) si cargaron. Los movimientos van en su lugar (fijo).
    if (d.tipo === "poder" && figuras.has(d.id) && typeof d.poder === "string") {
      const f = figuras.get(d.id); let pl = null; try { pl = JSON.parse(f.firma); } catch (_) { /* nada */ }
      const ok = x => x && x.id === d.poder && typeof x.glb === "string" && typeof x.clip === "string";
      const pd = pl && ((Array.isArray(pl.poderes) && pl.poderes.find(ok)) || (Array.isArray(pl.movs) && pl.movs.find(ok)));
      const mov = !!(pl && Array.isArray(pl.movs) && pl.movs.includes(pd));
      if (pd && f.p.tocarExt) f.p.tocarExt(pd.glb, pd.clip, { hasta: Number(pd.hasta) || 0, bucle: Number(pd.bucle) || 0, fijo: mov }).then(dur => {
        if (dur && window.EfectosALV && Array.isArray(pd.efectos) && figuras.get(d.id) === f)
          pd.efectos.slice(0, 3).forEach(x => { if (x && typeof x.tipo === "string") window.EfectosALV.lanzar(scene, { obj: f.p.obj, hueso: f.p.hueso }, x, { camara: camera }); });
      });
    }
    if (d.tipo === "momento" && figuras.has(d.id)) figuras.get(d.id).p.tocar(d.cual, { vel: window.LogicasALV && window.LogicasALV.velocidadClip ? window.LogicasALV.velocidadClip(d.vel) : 1 });
    if (d.tipo === "todos") figuras.forEach(f => f.p.tocar(d.cual));
    if (d.tipo === "medir") {
      const m = {}; figuras.forEach((f, id) => { m[id] = { alto: f.p.alto(), escala: f.p.obj.scale.x }; });
      enviar({ tipo: "medida", figuras: m });
    }
  });

  // Girar arrastrando (con una sola figura, como la ficha de la galería) o con {tipo:"girar", cuanto} en radianes.
  let giro = 0, arrastre = null;
  const aplicarGiro = () => figuras.forEach(f => { f.p.obj.rotation.y = giro; });
  lienzo.addEventListener("pointerdown", e => {
    arrastre = { x: e.clientX, y: e.clientY, g: giro, t: performance.now() };
    enviar({ tipo: "presion" });
    try { lienzo.setPointerCapture(e.pointerId); } catch (err) { /* puntero que ya no existe */ }
  });
  lienzo.addEventListener("pointermove", e => { if (!arrastre) return; giro = arrastre.g + (e.clientX - arrastre.x) * 0.012; aplicarGiro(); });
  // Un toque (sin arrastrar) sobre una figura se avisa arriba: {tipo:"toque", id, x, y} con x/y de 0 a 1 en el lienzo.
  // La figura se mide por sus huesos proyectados en pantalla, con un poco de margen (las mallas con huesos no se
  // pueden «tocar» bien con rayos en r128).
  const pv = new THREE.Vector3();
  function figuraEn(nx, ny) {
    let mejor = null;
    figuras.forEach((f, id) => {
      let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
      f.p.obj.traverse(o => { if (!o.isBone) return; o.getWorldPosition(pv); pv.project(camera); x0 = Math.min(x0, pv.x); x1 = Math.max(x1, pv.x); y0 = Math.min(y0, pv.y); y1 = Math.max(y1, pv.y); });
      const mx = (x1 - x0) * 0.25 + 0.04, my = (y1 - y0) * 0.12 + 0.04;
      if (nx >= x0 - mx && nx <= x1 + mx && ny >= y0 - my && ny <= y1 + my) mejor = id;
    });
    return mejor;
  }
  const soltar = e => {
    const a = arrastre; arrastre = null;
    if (!a || !e || e.type !== "pointerup") return;
    if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > 8 || performance.now() - a.t > 500) return;
    const r = lienzo.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const id = figuraEn(x * 2 - 1, 1 - y * 2);
    if (id) enviar({ tipo: "toque", id, x, y });
  };
  lienzo.addEventListener("pointerup", soltar); lienzo.addEventListener("pointercancel", soltar);
  addEventListener("message", e => {
    if (e.origin !== location.origin || !e.data || e.data.origen !== "alv") return;
    if (e.data.tipo === "girar" && typeof e.data.cuanto === "number") { giro += e.data.cuanto; aplicarGiro(); }
  });

  // Medición: tiempo de mover huesos y de dibujar, promedio de los últimos 60 cuadros.
  const M = { cuadros: 0, mover: 0, dibujar: 0, llamadas: 0, triangulos: 0 };
  window.__escena = { figuras, M, renderer, scene, camera, giro: () => giro };
  const reloj = new THREE.Clock();
  // Gira la figura entera en sentido contrario a lo que la cadera se aparta del frente de más; suave, para no saltar al
  // pasar de reposo a un gesto (los gestos se ven completos, sin compensar).
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), adelante = new THREE.Vector3();
  function alFrente(f, dt) {
    const cad = f.p.hueso("cadera"), l = f.p.estado().logica;
    let meta = 0;
    if (cad && (l === "reposo" || l === "vida")) {
      f.p.obj.rotation.y = giro + (f.compensa || 0); f.p.obj.updateMatrixWorld(true);
      cad.getWorldQuaternion(qa); f.p.obj.getWorldQuaternion(qb); qa.premultiply(qb.invert());
      adelante.set(0, 0, 1).applyQuaternion(qa);
      const yaw = Math.atan2(adelante.x, adelante.z);
      meta = Math.max(-FRENTE, Math.min(FRENTE, yaw)) - yaw;
    }
    f.cruceFrente = window.LogicasALV.pasoCompensacion(f.cruceFrente, meta, l, dt, MotorPersonajes.MEZCLA);
    f.compensa = f.cruceFrente.valor;
    f.p.obj.rotation.y = giro + f.compensa;
  }
  function cuadro() {
    requestAnimationFrame(cuadro);
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    if (lienzo.width !== Math.floor(w * renderer.getPixelRatio()) || lienzo.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); acomodar();
    }
    const dt = Math.min(reloj.getDelta(), 0.1);
    const t0 = performance.now();
    // «Reducir movimiento»: en reposo y vida la figura se queda en una pose estable (deja de animarse 0.4 s después de
    // volver a reposo, para terminar la mezcla); los gestos que se piden sí se ven (Codex, cierre-r1).
    const ahora = performance.now();
    figuras.forEach(f => {
      if (f.caraFija != null) return; // expresión fija para revisarla: la figura se queda quieta
      if (QUIETO) {
        const l = f.p.estado().logica;
        if (l !== f.ultimaL) { f.ultimaL = l; f.desde = ahora; }
        if ((l === "reposo" || l === "vida") && (f.desde === undefined || ahora - f.desde > 400)) return;
      }
      f.p.update(dt);
    });
    if (vista && (tramo || corre)) {
      if (tramo) {
        const k = Math.min(1, (performance.now() - tramo.t0) / tramo.dur);
        corre = tramo.de + (tramo.a - tramo.de) * (1 - Math.pow(1 - k, 3));
        if (k >= 1) { corre = tramo.a; tramo = null; }
      }
      const cx = corre * vista.ancho;
      camera.position.x = cx; camera.lookAt(cx, vista.mira, 0);
    }
    if (FRENTE) figuras.forEach(f => alFrente(f, dt));
    figuras.forEach(f => {
      if (!f.pulso) return;
      f.pulso.t += dt;
      const k = Math.min(1, f.pulso.t / 0.18);
      f.p.obj.scale.setScalar(f.pulso.base * (1 + 0.025 * Math.sin(Math.PI * k)));
      if (k >= 1) f.pulso = null;
    });
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
