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

  /** Tiñe una malla con su propio material (no toca el compartido). Reemplaza el color: para piezas lisas (piel, pelo).
   *  Devuelve los materiales nuevos para liberarlos al quitar la figura (Codex O7). */
  function teñir(malla, tintes) {
    const nuevos = [];
    if (!tintes || !tintes.length) return nuevos;
    const uno = m => {
      const t = tintes.find(x => x.material === "*" || x.material === m.name);
      if (!t) return m;
      const c = m.clone();
      // r128: los colores del material son lineales; el hex de la paleta es sRGB (sin convertir sale deslavado).
      c.color.set(t.hex).convertSRGBToLinear(); c.map = null; c.vertexColors = false; c.needsUpdate = true;
      nuevos.push(c);
      return c;
    };
    malla.material = Array.isArray(malla.material) ? malla.material.map(uno) : uno(malla.material);
    return nuevos;
  }

  const TOLERANCIA_ENLACE = 1e-3;
  const iguales = (a, b) => a.elements.every((v, i) => Math.abs(v - b.elements[i]) <= TOLERANCIA_ENLACE);
  /** Inversa de la pose del hueso `nombre` respecto a la raíz de su archivo (sin la escala de la escena). null si no está. */
  function poseRelativa(raiz, nombre) {
    const n = raiz.getObjectByName(nombre);
    if (!n) return null;
    raiz.updateMatrixWorld(true);
    return new T.Matrix4().copy(raiz.matrixWorld).invert().multiply(n.matrixWorld).invert();
  }

  /**
   * Piezas del constructor (CONTRATO-ENTREGA.md §6): por cada pieza se esconden las mallas del cuerpo base de esas
   * ranuras (extras.slot) y se pegan las del GLB de la pieza, unidas a los huesos del base por nombre.
   * Primero se valida TODO (Codex O2/O3): que la pieza traiga mallas en sus ranuras, que tenga todos los huesos y que su
   * enlace (inversa de cada hueso) sea igual al del base. Si algo falla, se lanza un error y no se toca nada: la escena
   * conserva la figura anterior. Cada pieza usa el acabado de su donante (Codex O7).
   */
  async function ponerPiezas(obj, plano) {
    const piezas = plano.piezas || [];
    if (!piezas.length) return [];
    const huesos = new Map(), inversaBase = new Map(), mallasBase = [];
    obj.traverse(o => {
      if (o.isBone) huesos.set(o.name, o);
      if (o.isMesh) mallasBase.push(o);
      if (o.isSkinnedMesh) o.skeleton.bones.forEach((h, i) => { if (!inversaBase.has(h.name)) inversaBase.set(h.name, o.skeleton.boneInverses[i]); });
    });
    // 1) Preparar y validar.
    const listas = [];
    for (const pz of piezas) {
      const ran = new Set(pz.ranuras || []);
      if (!pz.glb) { listas.push({ ran, mallas: [], tintes: [] }); continue; } // «Sin pelo», «Sin casco»: solo se esconde
      const g = await bajar(pz.glb, pz.carga || plano.carga);
      const donantes = [], inversaPieza = new Map();
      g.scene.traverse(o => {
        if (o.isMesh && ran.has(o.userData.slot)) donantes.push(o);
        if (o.isSkinnedMesh) o.skeleton.bones.forEach((h, i) => { if (!inversaPieza.has(h.name)) inversaPieza.set(h.name, o.skeleton.boneInverses[i]); });
      });
      if (!donantes.length) throw new Error("la pieza no trae mallas en " + [...ran].join(", ") + " (" + pz.glb + ")");
      const mallas = donantes.map(m => {
        const c = m.clone();
        if (m.isSkinnedMesh) {
          const propios = m.skeleton.bones.map(h => huesos.get(h.name));
          const falta = m.skeleton.bones.find((h, i) => !propios[i]);
          if (falta) throw new Error("la pieza usa el hueso «" + falta.name + "», que este cuerpo no tiene (" + pz.glb + ")");
          // Sin la inversa del base no se puede comprobar el enlace: se rechaza (Codex O9).
          const sinInversa = m.skeleton.bones.find(h => !inversaBase.has(h.name));
          if (sinInversa) throw new Error("no se puede comprobar el enlace del hueso «" + sinInversa.name + "» (" + pz.glb + ")");
          const distinto = m.skeleton.bones.find((h, i) => !iguales(m.skeleton.boneInverses[i], inversaBase.get(h.name)));
          if (distinto) throw new Error("la pieza está enlazada a un esqueleto distinto (hueso «" + distinto.name + "», " + pz.glb + ")");
          c.bind(new T.Skeleton(propios, m.skeleton.boneInverses.map(x => x.clone())), m.bindMatrix.clone());
        }
        // Malla rígida pegada a un hueso (las caras del juego): ese hueso tiene que existir y estar en la misma pose de
        // unión que en el base, comparando con el enlace que trae el GLB de la pieza (Codex O3: la cara de Hulk no entra).
        // Una malla rígida bajo un grupo u otra malla no se sabe dónde quedaría: se rechaza (Codex O9).
        if (!m.isSkinnedMesh && !(m.parent && m.parent.isBone)) throw new Error("la pieza trae una malla fija que no va pegada a un hueso (" + (m.name || "sin nombre") + ", " + pz.glb + ")");
        let padre = obj;
        if (!m.isSkinnedMesh) {
          padre = huesos.get(m.parent.name);
          if (!padre) throw new Error("la pieza va pegada al hueso «" + m.parent.name + "», que este cuerpo no tiene (" + pz.glb + ")");
          let inv = inversaPieza.get(m.parent.name), invBase = inversaBase.get(m.parent.name);
          // Las piezas genéricas de producción (cara, pelo, gorras) traen la malla fija sin piel: no hay enlace que leer.
          // Entonces se compara la pose de unión del hueso tal como viene en los dos archivos (la misma regla, Codex O3).
          if (!inv || !invBase) { inv = poseRelativa(g.scene, m.parent.name); invBase = poseRelativa(obj, m.parent.name); }
          if (!inv || !invBase) throw new Error("no se puede comprobar el enlace del hueso «" + m.parent.name + "» (" + pz.glb + ")");
          if (!iguales(inv, invBase)) throw new Error("la pieza está enlazada a un esqueleto distinto (hueso «" + m.parent.name + "», " + pz.glb + ")");
        } else if (m.parent && m.parent.name) padre = obj.getObjectByName(m.parent.name) || obj;
        return { c, padre };
      });
      listas.push({ ran, mallas, tintes: pz.tintes, glb: pz.glb });
    }
    // 2) Todo es válido: esconder las del base y pegar las nuevas.
    const propios = [];
    for (const { ran, mallas, tintes, glb } of listas) {
      mallasBase.forEach(m => { if (ran.has(m.userData.slot)) { m.visible = false; m.userData.alvFuera = true; } }); // alvFuera: el estudio no la vuelve a mostrar
      for (const { c, padre } of mallas) { padre.add(c); c.visible = true; c.userData.pieza = true; c.userData.alvDonante = glb; propios.push(...teñir(c, tintes)); }
    }
    propios.push(...alisarCabezas(obj, plano.glb));
    return propios;
  }

  /** Altura más baja (mundo) de los vértices que dependen sobre todo de un hueso de pie; null si no hay. */
  const PIE = /(foot|toebase|toe)$/i, vp = new T.Vector3();
  function pisoDePies(obj) {
    let min = Infinity;
    obj.traverse(o => {
      if (!o.isSkinnedMesh || !o.visible || o.userData.alvOclusor) return;
      const pies = new Set(o.skeleton.bones.map((h, i) => (PIE.test(h.name) ? i : -1)).filter(i => i >= 0));
      if (!pies.size) return;
      const pos = o.geometry.attributes.position, si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
      if (!pos || !si || !sw) return;
      for (let i = 0; i < pos.count; i++) {
        let k = 0, w = sw.getX(i);
        if (sw.getY(i) > w) { k = 1; w = sw.getY(i); } if (sw.getZ(i) > w) { k = 2; w = sw.getZ(i); } if (sw.getW(i) > w) k = 3;
        const hueso = k === 0 ? si.getX(i) : k === 1 ? si.getY(i) : k === 2 ? si.getZ(i) : si.getW(i);
        if (!pies.has(hueso)) continue;
        vp.fromBufferAttribute(pos, i); o.boneTransform(i, vp); vp.applyMatrix4(o.matrixWorld);
        if (vp.y < min) min = vp.y;
      }
    });
    return isFinite(min) ? min : null;
  }

  // Vértices que mueven los huesos de los pies (el hueso de más peso), por malla con piel: [[malla, índices], …].
  /** Vértices de cada malla con piel, separados en pies (Foot/ToeBase…) y resto. `paso` salta vértices del resto en mallas
   *  muy grandes (solo para medidas). */
  function verticesPorParte(obj, paso = 1) {
    const fuera = [];
    obj.traverse(o => {
      if (!o.isSkinnedMesh || !o.visible || o.userData.alvOclusor) return;
      const pies = new Set(o.skeleton.bones.map((h, i) => (PIE.test(h.name) ? i : -1)).filter(i => i >= 0));
      const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
      if (!si || !sw) return;
      const p = [], r = [], salto = si.count > 20000 ? paso : 1;
      for (let i = 0; i < si.count; i++) {
        let k = 0, w = sw.getX(i);
        if (sw.getY(i) > w) { k = 1; w = sw.getY(i); } if (sw.getZ(i) > w) { k = 2; w = sw.getZ(i); } if (sw.getW(i) > w) k = 3;
        if (pies.has(k === 0 ? si.getX(i) : k === 1 ? si.getY(i) : k === 2 ? si.getZ(i) : si.getW(i))) p.push(i);
        else if (i % salto === 0) r.push(i);
      }
      fuera.push([o, p, r]);
    });
    return fuera;
  }
  function verticesDePies(obj) {
    return verticesPorParte(obj).filter(([, p]) => p.length).map(([o, p]) => [o, p]);
  }

  /**
   * Cabezas con la cara impresa (Cíclope, Capitán América, Doctor Doom, Loki, Spider-Man…): si la cara que se ve es de
   * otro personaje, las dos se enciman (Elías, 2026-11-27). Entonces la cabeza pierde su impresión y queda lisa, del
   * color que más tiene su textura. Las texturas de un solo color miden 8×8; las impresas, más.
   */
  function alisarCabezas(obj, glbBase) {
    const donante = o => o.userData.alvDonante || glbBase;
    const vivas = [];
    obj.traverse(o => { if (o.isMesh && o.visible && !o.userData.alvFuera && !o.userData.alvOclusor) vivas.push(o); });
    const caras = new Set(vivas.filter(o => o.userData.slot === "face").map(donante));
    if (!caras.size) return [];
    const nuevos = [];
    for (const o of vivas) {
      if (o.userData.slot !== "head" || caras.has(donante(o))) continue;
      const lista = Array.isArray(o.material) ? o.material : [o.material];
      const cambiados = lista.map(m => {
        const img = m && m.map && m.map.image;
        if (!img || !(img.width > 8)) return m;
        const color = colorQueMas(img);
        if (!color) return m;
        const lienzo = document.createElement("canvas"); lienzo.width = lienzo.height = 1;
        const cx = lienzo.getContext("2d"); cx.fillStyle = color; cx.fillRect(0, 0, 1, 1);
        const tex = new T.CanvasTexture(lienzo);
        tex.encoding = m.map.encoding; tex.flipY = m.map.flipY;
        const n = m.clone(); n.map = tex; n.needsUpdate = true; // el material del GLB es compartido: se clona
        nuevos.push(n, tex);
        return n;
      });
      o.material = Array.isArray(o.material) ? cambiados : cambiados[0];
    }
    return nuevos;
  }
  /** Color más repetido de una imagen (en 24×24, agrupado de 16 en 16 por canal). */
  function colorQueMas(img) {
    try {
      const c = document.createElement("canvas"); c.width = c.height = 24;
      const cx = c.getContext("2d"); cx.drawImage(img, 0, 0, 24, 24);
      const d = cx.getImageData(0, 0, 24, 24).data, cuenta = new Map();
      let mejor = null, max = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        const k = (d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4);
        const e = cuenta.get(k) || { n: 0, r: 0, g: 0, b: 0 };
        e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2]; cuenta.set(k, e);
        if (e.n > max) { max = e.n; mejor = e; }
      }
      return mejor ? "rgb(" + Math.round(mejor.r / mejor.n) + "," + Math.round(mejor.g / mejor.n) + "," + Math.round(mejor.b / mejor.n) + ")" : null;
    } catch (_) { return null; }
  }

  async function crear(plano) {
    const g = await bajar(plano.glb, plano.carga);
    const obj = T.SkeletonUtils.clone(g.scene);
    obj.name = "personaje:" + plano.id;
    obj.scale.setScalar(plano.escala || 1);
    obj.userData.plano = plano;
    const materialesPropios = await ponerPiezas(obj, plano);
    const mixer = new T.AnimationMixer(obj);
    const porNombre = new Map(g.animations.map(c => [c.name, c]));
    const acciones = new Map();
    const accion = nombre => {
      if (!nombre || !porNombre.has(nombre)) return null;
      if (!acciones.has(nombre)) acciones.set(nombre, mixer.clipAction(porNombre.get(nombre)));
      return acciones.get(nombre);
    };
    const clips = { ...(plano.clips || {}) };
    // Movimientos de otro GLB (personalizador: el gesto de otro personaje o uno genérico de la base). Mismo esqueleto, mismos
    // nombres de hueso: el clip se agrega con otro nombre y la lógica apunta a él. Si no baja o no está, se queda el propio.
    for (const [l, e] of Object.entries(plano.clipsExt || {})) {
      try {
        const g2 = await bajar(e.glb, e.carga || plano.carga);
        const c0 = g2.animations.find(a => a.name === e.clip);
        // Solo las pistas de huesos o mallas que esta figura tiene (las caras de otro personaje traen las suyas).
        const c = c0 && new T.AnimationClip(c0.name, c0.duration, c0.tracks.filter(t => obj.getObjectByName(T.PropertyBinding.parseTrackName(t.name).nodeName)));
        if (c && c.tracks.length) { porNombre.set("ext:" + l, c); clips[l] = "ext:" + l; }
      } catch (_) { /* se queda el clip propio */ }
    }
    const vida = new Set(plano.vida || []);
    let actual = null, logica = null, clipActual = null;
    let pesos = new Map(), cruce = null, mezclaCruce = MEZCLA;
    // Clip de reposo: el de la ficha, o el que pida la escena con reposoEn() (la nave: «sentado», si el personaje lo trae).
    let reposoClip = clips.reposo;

    function iniciar(a, bucle, mezcla, vel) {
      const inicial = pesos.get(a) || 0;
      const terminada = !bucle && a.time >= a.getClip().duration - 1e-4;
      if (L.debeReiniciar(a === actual, inicial, terminada)) a.reset();
      a.enabled = true; a.paused = false;
      a.setEffectiveTimeScale(vel || 1);
      a.setLoop(bucle ? T.LoopRepeat : T.LoopOnce, Infinity);
      a.clampWhenFinished = !bucle;
      a.play();
      const salientes = new Map([...pesos].filter(([otra]) => otra !== a));
      cruce = { entrante: a, pesoEntranteInicial: salientes.size ? inicial : 1, pesosSalientesIniciales: salientes, t: 0 };
      mezclaCruce = mezcla;
      actual = a;
      aplicarCruce(0);
    }
    function aplicarCruce(dt) {
      if (!cruce) return;
      cruce = L.pasoCruce(cruce, dt, mezclaCruce);
      pesos = new Map();
      for (const [a, peso] of cruce.pesos) {
        a.setEffectiveWeight(peso);
        if (peso > 0 || a === actual) pesos.set(a, peso);
        else a.stop();
      }
      if (pesos.get(actual) === 1) cruce = null;
    }
    function medirClip(nombre, marco, op) {
      const clip = porNombre.get(nombre);
      if (!clip || !marco) return null;
      const muestras = op.muestras || 16, yMin = op.yMinPies == null ? -Infinity : op.yMinPies, h = op.huella;
      const partes = verticesPorParte(obj, 2), v = new T.Vector3();
      const m2 = new T.AnimationMixer(obj), a = m2.clipAction(clip);
      a.play();
      let pies = -Infinity, apoyo = Infinity, techo = -Infinity;
      for (let k = 0; k < muestras; k++) {
        m2.setTime((clip.duration * k) / muestras);
        obj.updateMatrixWorld(true); marco.updateMatrixWorld(true);
        for (const [m, lp, lr] of partes) {
          const pos = m.geometry.attributes.position;
          for (const i of lp) {
            v.fromBufferAttribute(pos, i); m.boneTransform(i, v); v.applyMatrix4(m.matrixWorld); marco.worldToLocal(v);
            if (v.y >= yMin && v.z > pies) pies = v.z;
            if (v.y > techo) techo = v.y;
          }
          if (op.soloPies) continue;
          for (const i of lr) {
            v.fromBufferAttribute(pos, i); m.boneTransform(i, v); v.applyMatrix4(m.matrixWorld); marco.worldToLocal(v);
            if (v.y > techo) techo = v.y;
            if (h && Math.abs(v.x) <= h.x && v.z >= h.z0 && v.z <= h.z1 && v.y < apoyo) apoyo = v.y;
          }
        }
      }
      a.stop(); m2.uncacheRoot(obj);
      return { pies: isFinite(pies) ? pies : null, apoyo: isFinite(apoyo) ? apoyo : null, techo: isFinite(techo) ? techo : null };
    }
    /** Toca una lógica, un momento o gesto de siempre (se traduce) o un clip de «vida» por su nombre. */
    function tocar(cual, op) {
      const o = op || {}, mezcla = o.mezcla == null ? MEZCLA : o.mezcla;
      let nombre, l;
      if (typeof cual === "string" && vida.has(cual)) { nombre = cual; l = "vida"; }
      else { l = L.logicaDe(cual); nombre = (l === "reposo" ? reposoClip : clips[l]) || reposoClip; }
      const a = accion(nombre);
      if (!a) return false;
      if (a === actual && l === logica && L.EN_BUCLE[l]) return true; // ya está en ese reposo
      if (a === actual && l === logica && !L.EN_BUCLE[l] && a.isRunning()) return true;
      iniciar(a, !!L.EN_BUCLE[l], mezcla, o.vel);
      logica = l; clipActual = nombre;
      return true;
    }
    // Al terminar algo que no es bucle, vuelve solo a reposo.
    mixer.addEventListener("finished", e => { if (e.action === actual && !L.EN_BUCLE[logica]) tocar("reposo"); });
    tocar("reposo", { mezcla: 0 });
    mixer.update(0);
    // Pies en el piso aunque el GLB no lo cumpla del todo. Se mide con los vértices que mueven los huesos de los pies
    // (Foot / ToeBase) ya posados: la caja de todo el modelo fallaba con Carnage y Venom, cuyos zarcillos bajan 27 % de
    // su altura bajo los pies (aviso de producción, 2026-11-26). Sin huesos de pies, la caja de todo.
    obj.updateMatrixWorld(true);
    const caja = new T.Box3().setFromObject(obj);
    const piso = pisoDePies(obj);
    const bajo = piso !== null ? piso : caja.min.y;
    if (isFinite(bajo) && Math.abs(bajo) > 1e-3) obj.position.y -= bajo;
    const ancho0 = isFinite(caja.max.x) ? caja.max.x - caja.min.x : 1;

    return {
      obj, mixer, tocar,
      /** Cambia el clip de reposo (al que se vuelve tras cada gesto) por otro del GLB, p. ej. «sentado» en la nave. false si
       *  el GLB no lo trae (se queda el de siempre). Si estaba en reposo, cambia ya. */
      reposoEn: nombre => {
        if (!nombre || !accion(nombre)) return false;
        reposoClip = nombre;
        if (logica === "reposo" || logica === null) { const a = accion(nombre); if (a !== actual) { iniciar(a, true, MEZCLA, 1); logica = "reposo"; clipActual = nombre; } }
        return true;
      },
      /** Toca una vez un clip de otro GLB del mismo personaje (poderes: <id>-poderes.glb, mismo esqueleto) y vuelve a reposo
       *  al terminar. Promesa con la duración en segundos (0 si no bajó o no está: no cambia lo que se toca). */
      tocarExt: async (glb, nombre, op) => {
        const k = "poder:" + nombre;
        if (!porNombre.has(k)) {
          try {
            const g2 = await bajar(glb, (op && op.carga) || plano.carga);
            const c0 = g2.animations.find(a => a.name === nombre);
            const c = c0 && new T.AnimationClip(k, c0.duration, c0.tracks.filter(t => obj.getObjectByName(T.PropertyBinding.parseTrackName(t.name).nodeName)));
            if (!c || !c.tracks.length) return 0;
            porNombre.set(k, c);
          } catch (_) { return 0; }
        }
        const a = accion(k);
        if (!a) return 0;
        iniciar(a, false, (op && op.mezcla) == null ? MEZCLA : op.mezcla, 1);
        logica = "poder"; clipActual = k;
        return porNombre.get(k).duration;
      },
      update: dt => { aplicarCruce(dt); return mixer.update(dt); },
      estado: () => ({ logica, clip: clipActual, tiempo: actual ? actual.time : 0, clips: [...porNombre.keys()].length }),
      /** Nombres de todos los clips del GLB (para verificar fichas). */
      nombresClips: () => [...porNombre.keys()],
      duracion: nombre => (porNombre.has(nombre) ? porNombre.get(nombre).duration : 0),
      alto: () => { obj.updateMatrixWorld(true); const b = new T.Box3().setFromObject(obj); return b.max.y - b.min.y; },
      /** Hasta dónde llegan los pies hacia el frente (+Z de `marco`, p. ej. el grupo de la escena) a lo largo de TODO el clip
       *  `nombre` (`muestras` poses repartidas en su duración). Solo cuentan los vértices con y ≥ `yMin` en `marco` (los que
       *  quedan a la altura de algo que puedan atravesar). Usa un mezclador aparte: no cambia lo que se está tocando (el
       *  siguiente update vuelve a poner la pose). null si el clip no está o no hay pies. La nave lo usa para alejar la silla. */
      alcancePies: (nombre, marco, yMin = -Infinity, muestras = 16) => {
        const m = medirClip(nombre, marco, { yMinPies: yMin, muestras, soloPies: true });
        return m && m.pies != null ? m.pies : null;
      },
      /** Medidas de la pose sentada a lo largo de TODO el clip `nombre`, en coordenadas de `marco`: `pies` = hasta dónde llegan
       *  los pies hacia el frente (+Z) con y ≥ `yMinPies`; `apoyo` = el punto más bajo del cuerpo (sin pies) sobre la huella del
       *  asiento (|x| ≤ huella.x, huella.z0 ≤ z ≤ huella.z1); `techo` = el punto más alto. Mezclador aparte (no cambia lo que se
       *  toca). null si el clip no está. La nave lo usa para la silla de Big Fig. */
      medirSentado: (nombre, marco, op = {}) => medirClip(nombre, marco, op),
      /** Ancho en reposo (para acomodar varias figuras sin que se encimen). */
      ancho: () => ancho0,
      hueso: logico => { const n = plano.huesos && plano.huesos[logico]; return n ? obj.getObjectByName(n) : null; },
      quitar: () => { mixer.stopAllAction(); mixer.uncacheRoot(obj); if (obj.parent) obj.parent.remove(obj); materialesPropios.forEach(m => m.dispose()); },
    };
  }

  raiz.MotorPersonajes = { crear, bajar, cache, MEZCLA };
})(typeof self !== "undefined" ? self : this);
