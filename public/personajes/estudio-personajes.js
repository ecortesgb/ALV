/* ============ Estudio de miniaturas de piezas (personajes nuevos) ============ */
// Saca la foto de UNA pieza sola, con el motor real: arma al personaje que la dona, deja visibles solo las mallas de esa
// pieza (la cara, además, sobre su cabeza lisa: sin pelo ni casco), la encuadra y devuelve la imagen. Nada se guarda en
// disco: la página de arriba la tiene en memoria mientras está abierta (los modelos son privados, de un juego).
// Mensajes (mismo origen, {origen:"alv"}):
//   {tipo:"foto", clave, plano, ver:[ranuras], tam?, pose?: "union"} → responde {origen:"minifig", tipo:"foto", clave, url} o {…, error}
// Responde {tipo:"listo"} al cargar. Las fotos se sacan de una en una, en el orden en que se piden.
(function () {
  "use strict";
  const enviar = m => { try { if (window.parent !== window) window.parent.postMessage(Object.assign({ origen: "minifig" }, m), location.origin); } catch (e) { /* sin ventana */ } };
  if (!window.MotorPersonajes) { enviar({ tipo: "error", texto: "Faltan THREE, GLTFLoader, SkeletonUtils o logicas.js" }); return; }
  const T = THREE;
  const lienzo = document.getElementById("lienzo");
  const renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(26, 1, 0.01, 200);
  scene.add(new T.HemisphereLight(0xdfe8ff, 0x3a3020, 0.85));
  const clave = new T.DirectionalLight(0xffffff, 1.15); scene.add(clave, clave.target);
  const contra = new T.DirectionalLight(0x9fb8ff, 0.45); scene.add(contra);
  const GIRO = -0.26; // ~15°: el rostro se ve casi de frente (Codex D2: giro máximo ~15°, ojos a la misma altura)

  // Caja de lo visible ya posado (las mallas con esqueleto se miden vértice por vértice, con muestreo).
  const v = new T.Vector3();
  function caja(obj) {
    const b = new T.Box3();
    obj.updateMatrixWorld(true);
    obj.traverse(o => {
      if (!o.isMesh || !o.visible || o.userData.alvOclusor) return;
      for (let p = o.parent; p; p = p.parent) if (p.visible === false) return;
      const pos = o.geometry.attributes.position;
      if (!pos) return;
      const paso = Math.max(1, Math.floor(pos.count / 4000));
      for (let i = 0; i < pos.count; i += paso) {
        v.fromBufferAttribute(pos, i);
        if (o.isSkinnedMesh) o.boneTransform(i, v);
        v.applyMatrix4(o.matrixWorld);
        b.expandByPoint(v);
      }
    });
    return b;
  }

  async function foto({ plano, ver, tam, pose }) {
    const p = await MotorPersonajes.crear(plano);
    try {
      // Pose de unión del modelo (sin animación): la cabeza queda derecha y de frente en todos (en reposo algunos,
      // como Doctor Octopus, la tienen girada; Codex D2 pide el rostro visible y los ojos a la misma altura).
      // Figura completa (nichos): primer cuadro de su reposo, como en su tarjeta (Elías, 2026-11-27: la pose de unión sale
      // tiesa). Piezas sueltas: pose de unión, con la cabeza derecha y de frente.
      if (pose === "union") { p.mixer.stopAllAction(); p.obj.traverse(o => { if (o.isSkinnedMesh) o.skeleton.pose(); }); }
      else p.mixer.update(0);
      const mostrar = new Set(ver);
      p.obj.traverse(o => { if (o.isMesh && !o.userData.alvOclusor) o.visible = mostrar.has(o.userData.slot) && !o.userData.alvFuera; }); // lo que una pieza reemplazó sigue escondido
      p.obj.rotation.y = GIRO;
      scene.add(p.obj);
      const b = caja(p.obj);
      if (b.isEmpty()) throw new Error("la pieza no tiene nada visible");
      const centro = b.getCenter(new T.Vector3()), med = b.getSize(new T.Vector3());
      const radio = Math.max(med.x, med.y, med.z) / 2;
      const dist = (radio / Math.tan((camera.fov * Math.PI) / 360)) * 1.18;
      camera.position.set(centro.x, centro.y + radio * 0.25, centro.z + dist);
      camera.lookAt(centro);
      camera.near = dist / 50; camera.far = dist * 20; camera.updateProjectionMatrix();
      clave.position.set(centro.x + dist, centro.y + dist * 1.6, centro.z + dist * 1.2); clave.target.position.copy(centro);
      contra.position.set(centro.x - dist, centro.y + dist, centro.z - dist * 1.5);
      const t = Math.max(64, Math.min(512, tam || 192));
      renderer.setSize(t, t, false);
      renderer.render(scene, camera);
      return lienzo.toDataURL("image/webp", 0.86);
    } finally {
      scene.remove(p.obj); p.quitar();
    }
  }

  let cola = Promise.resolve();
  addEventListener("message", e => {
    if (e.origin !== location.origin || !e.data || e.data.origen !== "alv" || e.data.tipo !== "foto") return;
    const d = e.data;
    if (typeof d.clave !== "string" || !d.plano || typeof d.plano.glb !== "string" || !Array.isArray(d.ver)) return;
    cola = cola.then(() => foto(d).then(url => enviar({ tipo: "foto", clave: d.clave, url }),
      err => enviar({ tipo: "foto", clave: d.clave, error: String(err && err.message ? err.message : err) })));
  });
  enviar({ tipo: "listo" });
})();
