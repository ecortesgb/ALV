/* ============ Personajes nuevos: cargador de GLB y controlador de animación (esqueleto) ============ */
// Recibe un PLANO ya resuelto por ALV (src/personajes/plano.ts) y nunca lee la figura ni el catálogo.
// Necesita THREE r128 con GLTFLoader y SkeletonUtils, y logicas.js (LogicasALV).
//   const p = await MotorPersonajes.crear(plano)   → { obj, tocar(cual, {mezcla, vel}), update(dt), quitar(), estado() }
// Un GLB se baja y se lee una sola vez por URL; cada figura es un clon con su propio mezclador.
(function (raiz) {
  "use strict";
  const T = raiz.THREE, L = raiz.LogicasALV;
  if (!T || !T.GLTFLoader || !T.SkeletonUtils || !L) { raiz.MotorPersonajes = null; return; }
  const MEZCLA = 0.35;
  const cache = new Map(); // url → Promise<gltf>

  const lineal = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  /** Ajustes de un GLB del juego que no pasó por Blender (CONTRATO-ENTREGA.md §4). Una vez por GLB, no por clon. */
  function acabado(scene, carga) {
    const hechos = new Set(), metal = new Set((carga && carga.metal) || []);
    // Máscara de la boca (extras.alvOclusor de producción): solo escribe profundidad, un poco hacia la cámara, y se
    // dibuja antes que las piezas de su misma cara; sin ella se ven todas las bocas encimadas. Igual que el visor de
    // Figure Forge (laboratorio-iron-man/fotos-personaje.html).
    const caras = new Set();
    scene.traverse(o => {
      if (!o.isMesh || !o.userData.alvOclusor) return;
      o.material = o.material.clone();
      // -2/-8 (lo del visor) deja rayas de las bocas a la escala de ALV (×6.75, cámara a ~2 m); -8/-40 queda limpio (visto el 2026-11-25).
      Object.assign(o.material, { colorWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -40 });
      o.renderOrder = 1; o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false;
      hechos.add(o.material); caras.add(o.userData.part);
    });
    scene.traverse(o => { if (o.isMesh && !o.userData.alvOclusor && caras.has(o.userData.part)) o.renderOrder = 2; });
    scene.traverse(o => {
      if (!o.isMesh || o.userData.alvOclusor) return;
      o.castShadow = true; o.receiveShadow = true;
      o.frustumCulled = false; // con huesos la caja de la malla no sigue a la animación
      const c = o.geometry.attributes.color;
      if (carga && carga.colores_srgb && c && !hechos.has(c)) {
        hechos.add(c);
        for (let i = 0; i < c.count; i++) c.setXYZ(i, lineal(c.getX(i)), lineal(c.getY(i)), lineal(c.getZ(i)));
        c.needsUpdate = true;
      }
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (!m || hechos.has(m)) return;
        hechos.add(m);
        if (carga && typeof carga.rugosidad === "number" && "roughness" in m) m.roughness = carga.rugosidad;
        if (metal.has(m.name) && "metalness" in m) { m.metalness = 0.75; m.roughness = Math.min(m.roughness, 0.35); }
      });
    });
  }

  function bajar(url, carga) {
    if (!cache.has(url)) {
      const p = new Promise((ok, mal) => new T.GLTFLoader().load(url, g => { acabado(g.scene, carga); ok(g); }, undefined, mal));
      p.catch(() => cache.delete(url));
      cache.set(url, p);
    }
    return cache.get(url);
  }

  /** Tiñe una malla con su propio material (no toca el compartido). Reemplaza el color: para piezas lisas (piel, pelo). */
  function teñir(malla, tintes) {
    if (!tintes || !tintes.length) return;
    const uno = m => {
      const t = tintes.find(x => x.material === "*" || x.material === m.name);
      if (!t) return m;
      const c = m.clone();
      // r128: los colores del material son lineales; el hex de la paleta es sRGB (sin convertir sale deslavado).
      c.color.set(t.hex).convertSRGBToLinear(); c.map = null; c.vertexColors = false; c.needsUpdate = true;
      return c;
    };
    malla.material = Array.isArray(malla.material) ? malla.material.map(uno) : uno(malla.material);
  }

  /**
   * Piezas del constructor (CONTRATO-ENTREGA.md §6): por cada pieza se esconden las mallas del cuerpo base de esas
   * ranuras (extras.slot) y se pegan las del GLB de la pieza, unidas a los huesos del base por nombre. Si la pieza trae
   * un esqueleto distinto (falta un hueso), no se pega y se avisa en la consola.
   */
  async function ponerPiezas(obj, plano) {
    const piezas = plano.piezas || [];
    if (!piezas.length) return;
    const huesos = new Map();
    obj.traverse(o => { if (o.isBone) huesos.set(o.name, o); });
    const mallasBase = [];
    obj.traverse(o => { if (o.isMesh) mallasBase.push(o); });
    for (const pz of piezas) {
      const ran = new Set(pz.ranuras || []);
      mallasBase.forEach(m => { if (ran.has(m.userData.slot)) m.visible = false; });
      if (!pz.glb) continue; // «Sin pelo», «Sin casco»: solo se esconde
      const g = await bajar(pz.glb, plano.carga);
      const donantes = [];
      g.scene.traverse(o => { if (o.isMesh && ran.has(o.userData.slot)) donantes.push(o); });
      for (const m of donantes) {
        const c = m.clone();
        if (m.isSkinnedMesh) {
          const propios = m.skeleton.bones.map(b => huesos.get(b.name));
          if (propios.some(h => !h)) { console.warn("pieza con otro esqueleto:", pz.glb, m.name); continue; }
          c.bind(new T.Skeleton(propios, m.skeleton.boneInverses.map(x => x.clone())), m.bindMatrix.clone());
        }
        const padre = (m.parent && m.parent.name && obj.getObjectByName(m.parent.name)) || obj;
        padre.add(c);
        c.visible = true; c.userData.pieza = true;
        teñir(c, pz.tintes);
      }
    }
  }

  async function crear(plano) {
    const g = await bajar(plano.glb, plano.carga);
    const obj = T.SkeletonUtils.clone(g.scene);
    obj.name = "personaje:" + plano.id;
    obj.scale.setScalar(plano.escala || 1);
    obj.userData.plano = plano;
    await ponerPiezas(obj, plano);
    const mixer = new T.AnimationMixer(obj);
    const porNombre = new Map(g.animations.map(c => [c.name, c]));
    const acciones = new Map();
    const accion = nombre => {
      if (!nombre || !porNombre.has(nombre)) return null;
      if (!acciones.has(nombre)) acciones.set(nombre, mixer.clipAction(porNombre.get(nombre)));
      return acciones.get(nombre);
    };
    const clips = plano.clips || {};
    const vida = new Set(plano.vida || []);
    let actual = null, logica = null, clipActual = null;

    function iniciar(a, bucle, mezcla, vel) {
      a.reset(); a.enabled = true;
      a.setEffectiveTimeScale(vel || 1); a.setEffectiveWeight(1);
      a.setLoop(bucle ? T.LoopRepeat : T.LoopOnce, Infinity);
      a.clampWhenFinished = !bucle;
      a.play();
      if (actual && actual !== a) { if (mezcla > 0) actual.crossFadeTo(a, mezcla, false); else actual.stop(); }
      actual = a;
    }
    /** Toca una lógica, un momento o gesto de siempre (se traduce) o un clip de «vida» por su nombre. */
    function tocar(cual, op) {
      const o = op || {}, mezcla = o.mezcla == null ? MEZCLA : o.mezcla;
      let nombre, l;
      if (typeof cual === "string" && vida.has(cual)) { nombre = cual; l = "vida"; }
      else { l = L.logicaDe(cual); nombre = clips[l] || clips.reposo; }
      const a = accion(nombre);
      if (!a) return false;
      if (a === actual && l === logica && L.EN_BUCLE[l]) return true; // ya está en ese reposo
      iniciar(a, !!L.EN_BUCLE[l], mezcla, o.vel);
      logica = l; clipActual = nombre;
      return true;
    }
    // Al terminar algo que no es bucle, vuelve solo a reposo.
    mixer.addEventListener("finished", e => { if (e.action === actual && !L.EN_BUCLE[logica]) tocar("reposo"); });
    tocar("reposo", { mezcla: 0 });
    mixer.update(0);
    // Pies en el piso aunque el GLB no lo cumpla del todo.
    obj.updateMatrixWorld(true);
    const caja = new T.Box3().setFromObject(obj);
    if (isFinite(caja.min.y) && Math.abs(caja.min.y) > 1e-3) obj.position.y -= caja.min.y;
    const ancho0 = isFinite(caja.max.x) ? caja.max.x - caja.min.x : 1;

    return {
      obj, mixer, tocar,
      update: dt => mixer.update(dt),
      estado: () => ({ logica, clip: clipActual, tiempo: actual ? actual.time : 0, clips: [...porNombre.keys()].length }),
      /** Nombres de todos los clips del GLB (para verificar fichas). */
      nombresClips: () => [...porNombre.keys()],
      duracion: nombre => (porNombre.has(nombre) ? porNombre.get(nombre).duration : 0),
      alto: () => { obj.updateMatrixWorld(true); const b = new T.Box3().setFromObject(obj); return b.max.y - b.min.y; },
      /** Ancho en reposo (para acomodar varias figuras sin que se encimen). */
      ancho: () => ancho0,
      hueso: logico => { const n = plano.huesos && plano.huesos[logico]; return n ? obj.getObjectByName(n) : null; },
      quitar: () => { mixer.stopAllAction(); mixer.uncacheRoot(obj); if (obj.parent) obj.parent.remove(obj); },
    };
  }

  raiz.MotorPersonajes = { crear, bajar, cache };
})(typeof self !== "undefined" ? self : this);
