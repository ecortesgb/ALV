/* ============ Estudio de miniaturas de piezas (personajes nuevos) ============ */
// Saca la foto de UNA pieza sola, con el motor real: arma al personaje que la dona, deja visibles solo las mallas de esa
// pieza (la cara, además, sobre su cabeza lisa: sin pelo ni casco), la encuadra y devuelve la imagen. Nada se guarda en
// disco: la página de arriba la tiene en memoria mientras está abierta (los modelos son privados, de un juego).
// Mensajes (mismo origen, {origen:"alv"}):
//   {tipo:"foto", clave, plano, ver:[ranuras], tam?, pose?: "especial" | "reposo"} → responde {origen:"minifig", tipo:"foto", clave, url, escala} (escala: cuánto creció el cuadro de figura) o {…, error}
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
  const GIRO = -0.26;
  /** Altura del hueso Head de una minifigura en reposo (escala del catálogo): la medida fija de los nichos. */
  const ALTO_CABEZA_MINIFIG = 1.82; // ~15°: el rostro se ve casi de frente (Codex D2: giro máximo ~15°, ojos a la misma altura)

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
      // Piezas sueltas: pose de unión, con la cabeza derecha y de frente (en reposo algunos, como Doctor Octopus, la tienen
      // girada; Codex D2 pide el rostro visible y los ojos a la misma altura). Figura completa (nichos de «Mi
      // colección», Elías 2026-11-27): todas del mismo tamaño y centradas en su cuadro, en un cuadro de su movimiento
      // especial (el elegido o el propio); si no tiene, el primer cuadro del reposo.
      const figura = pose === "especial" || pose === "reposo";
      if (pose === "especial" && p.tocar("especial", { mezcla: 0 })) {
        const e = p.estado();
        p.update(0); p.update(Math.max(0, p.duracion(e.clip) * 0.45));
      } else if (figura) { p.update(0); p.update(0.05); // reposo: aplicar su primer cuadro (sin esto queda en pose de enlace)
      } else if (!figura) { p.mixer.stopAllAction(); p.obj.traverse(o => { if (o.isSkinnedMesh) o.skeleton.pose(); }); }
      const mostrar = new Set(ver);
      p.obj.traverse(o => { if (o.isMesh && !o.userData.alvOclusor) o.visible = mostrar.has(o.userData.slot) && !o.userData.alvFuera; }); // lo que una pieza reemplazó sigue escondido
      p.obj.rotation.y = GIRO;
      scene.add(p.obj);
      const b = caja(p.obj);
      if (b.isEmpty()) throw new Error("la pieza no tiene nada visible");
      let centro, radio, escala = 1;
      if (figura) {
        // Mismo encuadre para todas las minifiguras, con los pies en la misma línea. Una figura grande no cabe: el cuadro
        // crece lo justo y Mi colección la muestra más grande que su nicho (Elías, 2026-11-27: «hacer los bigfig más grandes,
        // ponerlos en su tamaño original»).
        const R = ALTO_CABEZA_MINIFIG * 0.74, Y = ALTO_CABEZA_MINIFIG * 0.68;
        const arriba = Y + R * 0.98, ancho = R * 0.95;
        const k = Math.max(1, (b.max.y + 0.05) / arriba, Math.max(Math.abs(b.min.x), Math.abs(b.max.x)) / ancho);
        radio = R * k; centro = new T.Vector3(0, Y * k, 0); escala = k; // todo a escala: los pies quedan en la misma línea
      } else {
        const med = b.getSize(new T.Vector3());
        centro = b.getCenter(new T.Vector3()); radio = Math.max(med.x, med.y, med.z) / 2;
      }
      const dist = (radio / Math.tan((camera.fov * Math.PI) / 360)) * 1.18;
      camera.position.set(centro.x, centro.y + radio * (figura ? 0.1 : 0.25), centro.z + dist);
      camera.lookAt(centro);
      camera.near = dist / 50; camera.far = dist * 20; camera.updateProjectionMatrix();
      clave.position.set(centro.x + dist, centro.y + dist * 1.6, centro.z + dist * 1.2); clave.target.position.copy(centro);
      contra.position.set(centro.x - dist, centro.y + dist, centro.z - dist * 1.5);
      const t = Math.max(64, Math.min(512, tam || 192));
      renderer.setSize(t, t, false);
      renderer.render(scene, camera);
      return { url: lienzo.toDataURL("image/webp", 0.86), escala };
    } finally {
      scene.remove(p.obj); p.quitar();
    }
  }

  let cola = Promise.resolve();
  addEventListener("message", e => {
    if (e.origin !== location.origin || !e.data || e.data.origen !== "alv" || e.data.tipo !== "foto") return;
    const d = e.data;
    if (typeof d.clave !== "string" || !d.plano || typeof d.plano.glb !== "string" || !Array.isArray(d.ver)) return;
    cola = cola.then(() => foto(d).then(r => enviar({ tipo: "foto", clave: d.clave, url: r.url, escala: r.escala }),
      err => enviar({ tipo: "foto", clave: d.clave, error: String(err && err.message ? err.message : err) })));
  });
  enviar({ tipo: "listo" });
})();
