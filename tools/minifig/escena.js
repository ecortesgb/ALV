/* ============ Escena ALV: varias figuras en una escena 3D, con sus momentos ============ */
// ALV (la ventana de arriba) manda mensajes; esta página solo dibuja. Mismo origen siempre.
//   {origen:"alv", tipo:"figuras", lista:[{id, figura | semilla, foco?}]}  → arma o actualiza las figuras (en ese orden, de izq. a der.)
//      Sin figura, `semilla` (número) da una figura al azar que siempre sale igual (para quien aún no arma la suya).
//   {origen:"alv", tipo:"momento", id, cual:"punto"|"victoria"|"derrota"|"espera"|"saludar"|"bailar"}  → la figura hace ese momento
//   {origen:"alv", tipo:"foto", pid, figura | semilla, ancho, alto}  → responde {tipo:"foto", pid, url} (imagen de la figura)
//   {origen:"alv", tipo:"miniatura", pid, figura, zona, ancho, alto}  → igual que foto, encuadrada en una zona (miniaturas de piezas)
// Modo editor (escena.html?modo=editor, el personalizador): una sola figura sobre su base, que se gira arrastrando,
// se acerca con la rueda o pellizcando, parpadea y sonríe sola. Mensajes extra:
//   {tipo:"enfocar", zona}   → la cámara va a esa zona (ver ZONAS) y la figura voltea hacia donde se ve mejor
//   {tipo:"girar", cuanto}   → gira la figura (radianes)        {tipo:"acercar", cuanto} → >1 acerca, <1 aleja
//   {tipo:"soltar", pid, figura} → {tipo:"soltar", pid, figura} sin traje de personaje · {tipo:"azar", pid, semilla?} → figura al azar
//   {tipo:"gesto", cual:"parpadeo"|"sonrisa"}                   {tipo:"probar", cual}  → hace ese momento (nombre de nucleo/momentos.js)
// Modo sala (escena.html?modo=sala, la sala de espera): una columna por lugar, cada una con su pedestal del color del jugador.
//   En «figuras» cada figura trae `color` ("#rrggbb") y `columna` (0…), y el mensaje trae `columnas` (lugares, con vacíos).
//   Los lugares sin figura muestran un pedestal apagado; ALV dibuja encima el «+» y el nombre.
// Modo nave (escena.html?modo=nave, El impostor): figuras sentadas alrededor de una mesa con el botón para votar al centro.
//   Igual que la sala (`columna`, `columnas`, `color`) más `asientos` (colores) y los mensajes «nave» y «expulsar» (ver su bloque).
// Modo azotea (escena.html?modo=azotea, prototipo del HUB nuevo «La Azotea»): una figura sobre la Plataforma ALV,
//   en el piso de la azotea. &llegada=1 → la figura llega con la animación de energía (ALV decide si es la primera de la sesión).
//   {tipo:"mirar", x, y, activa}  → la figura voltea hacia un punto (x: -1 izquierda … 1 derecha; y: -1 arriba … 1 abajo)
//   {tipo:"accion", cual:"listo"|"mirarse"|"frotar"|"flexionar"|"orgullo"|"saludar"|null}  → pose breve mientras dura (null la suelta)
//   {tipo:"ambiente", brillo, clave, contra, relleno}  → luz del momento del día (colores "#rrggbb", brillo de la ranura 0…1)
//   {tipo:"plataforma", colores:{placa, base, panelA, panelB, stud, ranura, estrella}} → colores del paquete del escenario
//   {tipo:"llegada"} → repite la llegada · {tipo:"pausa", si} → deja de dibujar (un panel tapa el escenario)
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
  const ESPALDA_FUERA = { "ld-3838": -2, "ld-2524": -2, "ld-4498": -2, "ld-95348": -1.5, "ld-30091": -2 };
  const build0 = build;
  build = function (c) {
    const fig = build0(c), J = fig.userData.j;
    // Mano izquierda: los escudos miran hacia afuera del otro lado (giro al revés).
    if (J.handL) J.handL.children.forEach(g => { const a = g.userData.agarre; if (a && a.espejo) g.rotation.y = -g.rotation.y; });
    if (c.cuello && c.cuello !== "ninguno") {
      const m = mallaLD(c.cuello.slice(3), plast(c.cuelloColor || "#6c6e68", { roughness: 0.4 }), "cuello");
      if (m) {
        const g = grupoLD(J.torso, ldM(0, 0, 0)); g.add(m);
        // Mochilas y tanques: un poco separados de la espalda (se veían hundidos en el torso).
        if (ESPALDA_FUERA[c.cuello]) g.position.z += ESPALDA_FUERA[c.cuello] / LD;
        // Piezas que se montan entre cabeza y torso (barba larga): giran con la cabeza. attach() conserva la posición.
        const pz = (BIB.piezas || []).find(p => p.clave === c.cuello);
        if (pz && pz.conexion && pz.conexion.monta_en === "entre_cabeza_y_torso" && J.head) { fig.updateMatrixWorld(true); J.head.attach(g); }
      }
    }
    if (c.cinturon && c.piernasTipo !== "cortas") { const m = mallaLD("27145", plast(c.cinturon), "piernas"); if (m) grupoLD(J.legsG, ldM(0, 32, 0)).add(m); }
    if (c.accColor && J.handR) J.handR.traverse(o => { if (o.isMesh && !o.userData.decal && o.userData.part === "mano") { const ms = Array.isArray(o.material) ? o.material : [o.material]; o.material = ms.length === 1 ? plast(c.accColor) : ms.map((m, i) => (i === 0 ? plast(c.accColor) : m)); } });
    return fig;
  };

  // Cómo se toma cada objeto (reemplaza COMO_SE_TOMA de js/07-construccion.js, que no se edita). Cada pieza LDraw trae su
  // centro en otro lugar: la espada en la guarda, la taza en el vaso, la sartén en el sartén. Aquí se lleva la parte que se
  // agarra (empuñadura, asa, mango) al centro del puño. Medidas en LDU sobre la malla de mallaLD (y hacia la punta):
  //   giro: grados sobre la barra · voltear: media vuelta · rx: grados para acostar la pieza sobre la barra
  //   y / z: cuánto se corre la pieza (+y hacia la punta) · espejo: en la mano izquierda el giro va al revés
  const AGARRE = {
    espada: { y: 11 },                                  // empuñadura de -22 a 0: su centro (-11) al puño
    varita: { y: -8 },
    lanza: {},
    escoba: { y: 60 },
    mazo: { voltear: true, y: 20 },
    taza: { y: 12, z: 19 },                             // el asa (z≈-19, y≈-12) al puño
    sarten: { rx: 90, y: -22, z: 2 },                   // el mango (z de -15 a -30) se acuesta sobre la barra
    radio: { y: -30 },                                 // se toma del mango largo, no de la caja
    "ld-alv-sable": { y: 16 },                          // empuñadura de -36 a 4: su centro al puño; la hoja sube
    "escudo-redondo": { giro: 90, espejo: true }, "escudo-capitan": { giro: 90, espejo: true },
    "escudo-triangular": { giro: 90, espejo: true }, "escudo-ovalado": { giro: 90, espejo: true },
  };
  window.ponerObjetoEnMano = function (clave, color, mano) {
    const id = LD_ACC[clave] || ((clave || "").startsWith("ld-") ? clave.slice(3) : null); if (!id || !mano) return;
    const m = mallaLD(id, plast(color || COLOR_ACC[clave] || "#a0a5a9"), "mano"); if (!m) return;
    const cfg = AGARRE[clave] || {};
    const g = new THREE.Group(); g.rotation.order = "YXZ";
    g.rotation.y = (cfg.giro || 0) * Math.PI / 180; g.userData.agarre = cfg; if (cfg.voltear) g.rotation.x = Math.PI;
    const inner = new THREE.Group(); inner.position.set(0, (cfg.y || 0) / LD, (cfg.z || 0) / LD); g.add(inner);
    if (cfg.rx) m.rotation.x = cfg.rx * Math.PI / 180;
    inner.add(m);
    if (clave === "escudo-capitan") inner.add(decalEscudo(dibujoEscudo()));
    mano.add(g);
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
  // Luz: una principal cálida (en plástico, la única que proyecta sombra), cielo azul de relleno y un contraluz frío
  // que dibuja el borde de la figura contra el fondo, como en los juegos.
  const TOON = !!window.ESTILO_TOON;
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a2c48, TOON ? 0.75 : 0.55));
  const luz = new THREE.DirectionalLight(0xfff4e2, TOON ? 1.25 : 1.7); luz.position.set(-3.5, 6, 5); scene.add(luz); scene.add(luz.target);
  const contra = new THREE.DirectionalLight(0x9cc4ff, TOON ? 0.9 : 1.5); contra.position.set(4.5, 4, -5); scene.add(contra);
  const relleno = new THREE.DirectionalLight(0xffd6a8, TOON ? 0.25 : 0.4); relleno.position.set(4, 1.5, 4); scene.add(relleno);
  if (!TOON) {
    luz.castShadow = true; luz.shadow.mapSize.set(1024, 1024); luz.shadow.bias = -0.0006; luz.shadow.normalBias = 0.02; luz.shadow.radius = 3;
    const sc = luz.shadow.camera; sc.near = 1; sc.far = 20; sc.left = -2; sc.right = 2; sc.top = 3; sc.bottom = -1;
  }
  // ---------- Cine (prototipo, ALV_PLAN_LEGO_CINE.md) ----------
  // Tres puntos: clave cálida y suave arriba a la izquierda, contraluz frío fuerte atrás a la derecha, relleno bajo.
  // Ambiente bajo para que la luz haga el volumen. Calidad: alta (sombra 2048 + oclusión), media (1024, sin oclusión),
  // baja (además densidad de píxeles 1). Empieza en alta (1024 en pantallas táctiles) y baja sola si no alcanza 45 cuadros.
  const MODO = new URLSearchParams(location.search).get("modo") || "";
  const CINE = !!window.ESTILO_CINE, Q = new URLSearchParams(location.search), BRILLO = CINE && Q.get("acabado") === "brillo";
  const TACTIL = matchMedia("(pointer: coarse)").matches;
  const calidad = { nivel: /^(alta|media|baja)$/.test(Q.get("calidad") || "") ? Q.get("calidad") : "alta", fija: !!Q.get("calidad"), muestras: [], desde: 0 };
  if (CINE) {
    scene.children.filter(o => o.isHemisphereLight).forEach(h => { h.color.set(0xcfdcff); h.groundColor.set(0x2a2232); h.intensity = 0.34; });
    luz.color.set(0xffe6c8); luz.intensity = 2.1; luz.shadow.radius = 3.5; luz.shadow.bias = -0.0004; luz.shadow.normalBias = 0.015;
    contra.color.set(0xa8ccff); contra.intensity = 2.3; contra.position.set(4.5, 4.8, -5.5);
    relleno.color.set(0xffd2a8); relleno.intensity = 0.38; relleno.position.set(5, 1.2, 4);
  }
  function aplicarCalidad() {
    if (!CINE) return;
    const n = calidad.nivel, mapa = n === "alta" && !TACTIL ? 2048 : 1024;
    if (luz.shadow.mapSize.x !== mapa) { luz.shadow.mapSize.set(mapa, mapa); if (luz.shadow.map) { luz.shadow.map.dispose(); luz.shadow.map = null; } }
    // Celular: 1.25 (a 3x de densidad la tarjeta dibujaría 6 veces más puntos y el teléfono se calienta).
    renderer.setPixelRatio(n === "baja" ? 1 : Math.min(window.devicePixelRatio || 1, TACTIL ? 1.25 : BRILLO ? 2 : 1.5));
    AO.activo = n === "alta" && !!AO.pase;
    if (n === "alta" && !AO.pase && !AO.cargando) prepararAO();
    tamano();
  }
  // Satinado: brillo amplio y suave en vez del barniz de juguete nuevo. Los estampados llevan el mismo acabado.
  function satinar(obj) {
    obj.traverse(o => {
      if (!o.isMesh) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (!m || !m.isMeshPhysicalMaterial || m.emissiveMap) return;
        // ?acabado=brillo (prueba de material, tools/lookdev): plástico LEGO nuevo, barniz duro y reflejos nítidos.
        if (BRILLO) { m.roughness = 0.24; m.clearcoat = 1; m.clearcoatRoughness = 0.04; m.envMapIntensity = 1.35; m.needsUpdate = true; return; }
        m.roughness = 0.5; m.clearcoat = 0.18; m.clearcoatRoughness = 0.45; m.envMapIntensity = 0.7; m.needsUpdate = true;
      });
    });
  }
  // Oclusión ambiental (SSAO) a media resolución: oscurece uniones (cuello, axilas, cadera, entre piernas, pelo sobre la
  // cara, pies sobre el pedestal). Se calcula aparte y se multiplica encima del cuadro ya dibujado, así el fondo
  // transparente del HUB no se toca. Lo transparente (calcomanías, halo, discos de sombra, efectos) no entra al cálculo.
  const AO = { pase: null, cargando: false, activo: false, escena: null, cam: null };
  const CDN = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/";
  const cargarJS = src => new Promise((ok, mal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => mal(new Error(src)); document.head.appendChild(s); });
  async function prepararAO() {
    AO.cargando = true;
    try {
      for (const f of ["shaders/CopyShader.js", "postprocessing/EffectComposer.js", "math/SimplexNoise.js", "shaders/SSAOShader.js", "postprocessing/SSAOPass.js"]) await cargarJS(CDN + f);
      const p = new THREE.SSAOPass(scene, camera, 16, 16);
      AO.pase = p;
      AO.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); AO.escena = new THREE.Scene();
      AO.escena.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        uniforms: { tAO: { value: p.blurRenderTarget.texture }, fuerza: { value: 0.9 } },
        vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}",
        fragmentShader: "uniform sampler2D tAO;uniform float fuerza;varying vec2 vUv;void main(){float a=pow(texture2D(tAO,vUv).r,2.2);gl_FragColor=vec4(vec3(mix(1.0,a,fuerza)),1.0);}",
        blending: THREE.MultiplyBlending, depthTest: false, depthWrite: false })));
    } catch (e) { console.warn("escena: sin oclusión ambiental", e); AO.pase = null; }
    AO.cargando = false; aplicarCalidad();
  }
  // Escala de la escena: figura de 2.7 de alto. Uniones de 1 mm a 25 cm cuentan como contacto; la curva (2.2) marca más las uniones.
  function ajustarAO(p) {
    const sm = p.ssaoMaterial, dm = p.depthRenderMaterial, k = camera.far - camera.near;
    sm.uniforms.cameraNear.value = dm.uniforms.cameraNear.value = camera.near; sm.uniforms.cameraFar.value = dm.uniforms.cameraFar.value = camera.far;
    sm.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);
    if (sm.uniforms.cameraInverseProjectionMatrix) sm.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
    sm.uniforms.kernelRadius.value = 0.16; sm.uniforms.minDistance.value = 0.0012 / k; sm.uniforms.maxDistance.value = 0.25 / k;
  }
  // Tampoco entran las mallas con piel (figura nueva) ni las que no pintan color (máscara de la boca): el pase de normales
  // usa un material sin piel que las dibuja en su pose de origen, y su contorno salía como sombra encima de la figura
  // (Elías, 2026-11-26: «sombra de contornos» en el HUB).
  const transparente = o => { const m = Array.isArray(o.material) ? o.material[0] : o.material; return !m || m.transparent || m.isShadowMaterial || o.isSkinnedMesh || m.colorWrite === false; };
  function dibujarAO() {
    const p = AO.pase, ocultos = [];
    ajustarAO(p);
    scene.traverse(o => { if (o.visible && (o.isPoints || o.isLine || o.isSprite || (o.isMesh && transparente(o)))) { o.visible = false; ocultos.push(o); } });
    const su = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
    p.renderOverride(renderer, p.normalMaterial, p.normalRenderTarget, 0x7777ff, 1.0);
    ocultos.forEach(o => { o.visible = true; });
    p.renderPass(renderer, p.ssaoMaterial, p.ssaoRenderTarget);
    p.renderPass(renderer, p.blurMaterial, p.blurRenderTarget);
    renderer.shadowMap.autoUpdate = su;
    renderer.setRenderTarget(null);
    const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(AO.escena, AO.cam); renderer.autoClear = ac;
  }
  // Mide los cuadros por segundo 3 s (solo con la página visible) y baja un nivel si no llega a 45.
  function medirCalidad(t, dt) {
    if (!CINE || calidad.fija || calidad.nivel === "baja" || !figuras.size) return;
    if (!calidad.desde) { calidad.desde = t + 1; return; } // el primer segundo carga cosas: no cuenta
    if (t < calidad.desde) return;
    // Pausas de más de 0.2 s no cuentan: el navegador frena las páginas en segundo plano (pestaña o panel oculto).
    if (dt > 0.2) { calidad.muestras = []; calidad.desde = t + 1; return; }
    calidad.muestras.push(dt);
    if (t - calidad.desde < 3 || calidad.muestras.length < 60) return;
    const prom = calidad.muestras.reduce((a, b) => a + b, 0) / calidad.muestras.length, fps = 1 / Math.max(1e-3, prom);
    calidad.muestras = []; calidad.desde = t;
    // En la azotea táctil y en reposo se dibuja a propósito a 30 cuadros: ahí el mínimo es 26.
    if (fps < (AZOTEA && TACTIL && AZ.quieto ? 26 : 45)) { calidad.nivel = calidad.nivel === "alta" ? "media" : "baja"; console.info("escena: calidad", calidad.nivel, Math.round(fps) + " cps"); aplicarCalidad(); }
  }
  // Fase B: en cine, las piezas base (cabeza, torso, brazos, mano, cadera, piernas) usan su versión con biseles
  // (tools/biseles/ → piezas-biseladas.js). Mismo origen y ejes que LDraw: estampados, objetos, pelo y articulaciones
  // encajan igual. Las normales vienen de Blender (caras planas planas, luz curva solo en el bisel). Pieza sin versión
  // biselada = la de siempre.
  async function cargarBiseles() {
    try { await cargarJS("piezas-biseladas.js"); } catch (e) { console.warn("escena: sin biseles", e); return; }
    const B = window.LDRAW_BISELADO || {}, geo0 = geoLD, hechas = {};
    const bin = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
    // Pelo y cascos: LDraw los trae con pocas caras y la luz marcaba cada faceta. Se recalculan las normales con
    // un ángulo de 88° (en vez de 35°): la superficie se ve curva y los bordes de verdad (visera, orillas) siguen vivos.
    const PELO = new Set((BIB.piezas || []).filter(p => (p.categoria === "cabello" || p.categoria === "casco") && p.ldraw).map(p => String(p.ldraw)));
    geoLD = function (id) {
      if (!B[id] && PELO.has(String(id))) { const g0 = geo0(id); return g0 && (hechas[id] || (hechas[id] = suavizar(g0, 88))); }
      if (id === "3626c") return hechas[id] || (hechas[id] = cabezaTorno());
      const d = B[id]; if (!d) return geo0(id);
      if (hechas[id]) return hechas[id];
      const P = new Int16Array(bin(d.p)), M = new Int8Array(bin(d.n)), I = d.i32 ? new Uint32Array(bin(d.i)) : new Uint16Array(bin(d.i));
      const n = P.length / 3, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) {
        pos[k * 3] = P[k * 3] / 64 / LD; pos[k * 3 + 1] = -P[k * 3 + 1] / 64 / LD; pos[k * 3 + 2] = -P[k * 3 + 2] / 64 / LD;
        const x = M[k * 3], y = -M[k * 3 + 1], z = -M[k * 3 + 2], l = Math.hypot(x, y, z) || 1;
        nor[k * 3] = x / l; nor[k * 3 + 1] = y / l; nor[k * 3 + 2] = z / l;
      }
      const gi = new THREE.BufferGeometry(); gi.setAttribute("position", new THREE.BufferAttribute(pos, 3)); gi.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      gi.setIndex(new THREE.BufferAttribute(I, 1));
      // Sin índice, como las de LDraw: geoLDcorte (botas) recorre los triángulos de 9 en 9.
      const g = gi.toNonIndexed(); gi.dispose();
      d.g.forEach(([st, cnt], k) => g.addGroup(st, cnt, k)); g.userData.colores = d.g.map(x => x[2]); g.computeBoundingBox();
      return (hechas[id] = g);
    };
    // La cara y el estampado del torso se ajustan midiendo los vértices de la pieza. La versión biselada tiene caras
    // largas sin vértices a media altura (la cara quedaba metida en la cabeza): esas medidas usan la original,
    // que tiene el mismo contorno exterior.
    ["perfilLD", "caraTorso"].forEach(n => {
      const f0 = window[n]; if (typeof f0 !== "function") return;
      window[n] = function () { const g = geoLD; geoLD = geo0; try { return f0.apply(this, arguments); } finally { geoLD = g; } };
    });
  }
  // Cabeza 3626c rehecha girando su perfil: en LDraw el cilindro tiene 48 lados y las curvas de arriba y de la barbilla
  // solo 16, no encajan (quedaba una línea y otro tono de piel bajo la cara). Mismas medidas de LDraw (LDU, Y hacia
  // abajo): perno hueco de r 4–6 y alto 4, tapa en y 0, curva de radio 4 hasta el cilindro de r 13 (y 4 a 17), curva
  // de radio 4 hasta el cuello de r 8 (y 21 a 24) y hueco del cuello de r 6. Las esquinas vivas llevan un bisel de 0.6.
  function cabezaTorno() {
    const pts = [], arco = (cx, cy, r, a0, a1, n) => { for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    const esquina = (x, y, dx0, dy0, dx1, dy1, r) => { // redondea la esquina (x, y) que llega con dirección 0 y sale con dirección 1
      pts.push([x - dx0 * r, y - dy0 * r]); pts.push([x - dx0 * r * 0.3 + dx1 * r * 0.3, y - dy0 * r * 0.3 + dy1 * r * 0.3]); pts.push([x + dx1 * r, y + dy1 * r]);
    };
    const B6 = 0.6, H = Math.PI / 2;
    pts.push([0, 0]);                                  // fondo del hueco del perno
    esquina(4, 0, 1, 0, 0, -1, B6);                    // pared interior del perno
    esquina(4, -4, 0, -1, 1, 0, B6);
    esquina(6, -4, 1, 0, 0, 1, B6);                    // orilla del perno
    esquina(6, 0, 0, 1, 1, 0, B6);                     // base del perno sobre la tapa
    arco(9, 4, 4, -H, 0, 14);                          // curva de la tapa al cilindro (centro 9,4)
    arco(9, 17, 4, 0, H, 14);                          // cilindro y curva de la barbilla (centro 9,17)
    esquina(8, 21, -1, 0, 0, 1, B6);                   // cuello
    esquina(8, 24, 0, 1, -1, 0, B6);
    esquina(6, 24, -1, 0, 0, -1, B6);                  // hueco del cuello
    esquina(6, 4, 0, -1, -1, 0, B6);
    pts.push([0, 4]);
    // Escena: 1 unidad = 40 LDU, Y hacia arriba. LatheGeometry gira alrededor de Y; el perfil va de adentro hacia afuera.
    const perfil = pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r) / LD, -y / LD)).reverse();
    const gi = new THREE.LatheGeometry(perfil, 64);
    gi.computeVertexNormals();
    const g = gi.toNonIndexed(); gi.dispose();
    g.addGroup(0, g.attributes.position.count, 0); g.userData.colores = ["16"]; g.computeBoundingBox();
    return g;
  }
  // Normales suaves por ángulo: cada esquina promedia las caras vecinas (por área) que no doblen más de `grados`.
  // Las vecinas se buscan por posición, porque la geometría de LDraw no comparte vértices entre caras.
  function suavizar(g0, grados) {
    const g = g0.clone(); g.userData = Object.assign({}, g0.userData);
    const P = g.attributes.position.array, n = P.length / 9, fn = new Float32Array(n * 3), cs = Math.cos(grados * Math.PI / 180);
    const cerca = new Map(), clave = i => Math.round(P[i] * 4000) + "," + Math.round(P[i + 1] * 4000) + "," + Math.round(P[i + 2] * 4000);
    for (let t = 0; t < n; t++) {
      const o = t * 9, ux = P[o + 3] - P[o], uy = P[o + 4] - P[o + 1], uz = P[o + 5] - P[o + 2], vx = P[o + 6] - P[o], vy = P[o + 7] - P[o + 1], vz = P[o + 8] - P[o + 2];
      fn[t * 3] = uy * vz - uz * vy; fn[t * 3 + 1] = uz * vx - ux * vz; fn[t * 3 + 2] = ux * vy - uy * vx; // largo = 2 × área
      for (let k = 0; k < 3; k++) { const c = clave(o + k * 3); let L = cerca.get(c); if (!L) cerca.set(c, (L = [])); L.push(t); }
    }
    const N = g.attributes.normal.array;
    for (let t = 0; t < n; t++) {
      const ax = fn[t * 3], ay = fn[t * 3 + 1], az = fn[t * 3 + 2], la = Math.hypot(ax, ay, az) || 1;
      for (let k = 0; k < 3; k++) {
        let x = 0, y = 0, z = 0;
        for (const u of cerca.get(clave(t * 9 + k * 3))) {
          const bx = fn[u * 3], by = fn[u * 3 + 1], bz = fn[u * 3 + 2], lb = Math.hypot(bx, by, bz) || 1;
          if ((ax * bx + ay * by + az * bz) / (la * lb) > cs) { x += bx; y += by; z += bz; }
        }
        const l = Math.hypot(x, y, z) || 1, i = t * 9 + k * 3; N[i] = x / l; N[i + 1] = y / l; N[i + 2] = z / l;
      }
    }
    g.attributes.normal.needsUpdate = true;
    return g;
  }
  // Figura de prueba del prototipo (?prueba=cine): pelo café, rostro clásico, torso azul con estrella blanca,
  // pantalón azul, manos color piel. Se arma con el núcleo como cualquier figura de jugador.
  let figPrueba = null;
  const figuraPrueba = () => figPrueba || (figPrueba = MinifigCore.nueva({ nombre: "Prueba cine",
    identidad: { piel: "#e9bf98", rostro: "FACE_001", cabello: { id: "HAIR_001", color: "#4f2c14" } },
    ropa: { torso: { id: null, color: "#1f3b6e", estampado: "PRINT_010", colores: ["#f4f4f4", "#1b2a34", "#6b4a2b"], texto: "★" },
      cadera: { id: null, color: "#1f3b6e" }, piernas: { tipo: "normal", id: null, color: "#1f3b6e" } } }));
  const PRUEBA = (CINE && MODO === "hub" || MODO === "azotea") && Q.get("prueba") === "cine";
  if (CINE || PRUEBA) window.__cine = { AO, calidad, scene }; // para revisar el prototipo desde la consola

  // La caja de la sombra sigue a las figuras (en la sala son varias a lo ancho).
  function cajaSombra(ancho) {
    if (TOON) return;
    const sc = luz.shadow.camera, a = Math.max(2, ancho / 2 + 1);
    sc.left = -a; sc.right = a; sc.top = 3.2; sc.bottom = -1.2; sc.updateProjectionMatrix();
    luz.position.set(-3.5, 6, 5); luz.target.position.set(0, 1, 0);
  }

  // ---------- Estilo toon: tres tonos de luz y contorno oscuro ----------
  // El modelo de Minifig Studio no se toca: después de armar la figura se cambian sus materiales y se le agrega
  // una «cáscara» negra por pieza (casco invertido). Una sola pasada de dibujo; sirve igual en celular.
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
    // Plástico: se quedan los materiales de Minifig Studio (barniz brillante); solo se activan las sombras.
    if (!TOON) {
      obj.traverse(o => {
        if (!o.isMesh || o.userData.sinSombra) return;
        const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
        o.castShadow = !(m0 && m0.transparent); o.receiveShadow = true; // calcomanías y efectos no proyectan
      });
      if (CINE) satinar(obj);
      return obj;
    }
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

  // Disco invisible que solo muestra la sombra que le cae (encima del pedestal o, sin pedestal, como piso).
  function pisoSombra(r) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.ShadowMaterial({ opacity: 0.38, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.014; m.receiveShadow = true; m.renderOrder = 1; m.userData.sinSombra = true; return m;
  }
  // Pedestal del HUB: base con luz y aro dorado; la figura se para encima (y = 0).
  let pedestal = null;
  const EDITOR = MODO === "editor";
  const AZOTEA = MODO === "azotea";
  // &plataforma=no: el pedestal viene pintado en el fondo de Elías; aquí solo va la figura con su sombra.
  const SIN_PLAT = AZOTEA && new URLSearchParams(location.search).get("plataforma") === "no";
  if (MODO === "hub" || EDITOR) {
    pedestal = new THREE.Group();
    const tm = c => TOON ? new THREE.MeshToonMaterial({ color: new THREE.Color(c).convertSRGBToLinear(), gradientMap: tonos })
      : new THREE.MeshStandardMaterial({ color: new THREE.Color(c).convertSRGBToLinear(), roughness: 0.3, metalness: 0.15 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.18, 0.34, 48), tm(0x24306b)); base.position.y = -0.17; pedestal.add(base);
    const tapa = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.02, 48), new THREE.MeshBasicMaterial({ color: 0x5aa6f0 })); tapa.position.y = 0.0; pedestal.add(tapa);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.035, 10, 64), new THREE.MeshBasicMaterial({ color: 0xffd23f })); aro.rotation.x = Math.PI / 2; aro.position.y = 0.0; pedestal.add(aro);
    const brillo = (function () { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"), r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, "rgba(200,235,255,1)"); r.addColorStop(0.45, "rgba(120,190,255,.45)"); r.addColorStop(1, "rgba(80,140,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: brillo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.015; pedestal.add(halo);
    caricatura(base); tapa.userData.sinSombra = halo.userData.sinSombra = true; tapa.castShadow = false;
    if (!TOON) pedestal.add(pisoSombra(1.0));
    scene.add(pedestal);
  }
  // Sala: un pedestal por columna, con la tapa y la luz del color del jugador (se crean y se pintan en acomodar).
  const SALA = MODO === "sala";
  // &pedestal=no (sala): el pedestal viene pintado en la cápsula de Elías; aquí solo va la figura.
  const SALA_SIN_PED = SALA && new URLSearchParams(location.search).get("pedestal") === "no";
  let columnas = 0;
  const pedestales = [];
  const brilloSala = SALA ? (function () { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"), r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.45, "rgba(255,255,255,.4)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })() : null;
  function pedestalSala() {
    const p = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.74, 0.3, 40), TOON ? new THREE.MeshToonMaterial({ color: 0x24306b, gradientMap: tonos })
      : new THREE.MeshStandardMaterial({ color: 0x24306b, roughness: 0.3, metalness: 0.15 })); base.position.y = -0.15; p.add(base);
    if (!TOON) p.add(pisoSombra(0.62));
    const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.02, 40), new THREE.MeshBasicMaterial({ color: 0x5aa6f0 })); p.add(tapa);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.645, 0.03, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffd23f })); aro.rotation.x = Math.PI / 2; p.add(aro);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: brilloSala, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x88bbff }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.015; p.add(halo);
    caricatura(base);
    p.userData = { base, tapa, aro, halo };
    scene.add(p); return p;
  }
  const colorValido = c => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : null);
  function pintarPedestal(p, color) {
    const u = p.userData, c = colorValido(color);
    const tono = new THREE.Color(c || "#4a5687").convertSRGBToLinear();
    u.tapa.material.color.copy(tono);
    u.halo.material.color.copy(tono); u.halo.material.opacity = c ? 1 : 0.25;
    u.base.material.color.copy(new THREE.Color(c || "#24306b").convertSRGBToLinear().multiplyScalar(c ? 0.35 : 1));
    u.aro.material.color.set(c ? 0xffd23f : 0x6d7398);
  }
  // Sombra de contacto bajo los pies: mancha difusa (en plástico, además de la sombra de la luz).
  const sombraGeo = new THREE.CircleGeometry(0.62, 40), sombraMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: TOON ? 0.32 : 0.5, depthWrite: false,
    map: TOON ? null : (function () { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const g = cv.getContext("2d"), r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.55, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })() });
  // Sin pedestal (marcador de la TV, listas): un piso invisible recibe la sombra.
  // Vuelo (expulsión de El impostor): una sola figura girando en el espacio, sin piso.
  const VUELO = MODO === "vuelo";
  if (!TOON && !pedestal && !SALA && !AZOTEA && !VUELO) scene.add(pisoSombra(14));

  // ---------- Nave (El impostor, Elías 24 nov): mesa redonda con el botón para votar al centro y una silla por lugar ----------
  // Las figuras se sientan alrededor de la mesa mirando al centro. En «figuras» cada una trae `columna` (su asiento 0…) y
  // `color`; el mensaje trae `columnas` (asientos, también los vacíos de quien ya salió) y `asientos` (color de cada uno).
  //   {tipo:"nave", boton:"votar"|"quieto"|"golpe"}  → el botón late (se vota), se apaga o lo aprietan
  //   {tipo:"expulsar", id}                          → esa figura se levanta, gira y sale volando hacia arriba
  const NAVE = MODO === "nave";
  const NV = { n: 0, R: 1.5, S: 1.9, mesa: null, sillas: [], colores: [], boton: "quieto", golpe: -9, sueltos: [] };
  const QUIETO = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MESA_Y = 1.02, SILLA_Y = 0.52;
  const linN = c => new THREE.Color(c).convertSRGBToLinear();
  const matN = (c, r, m) => TOON ? new THREE.MeshToonMaterial({ color: linN(c), gradientMap: tonos }) : new THREE.MeshStandardMaterial({ color: linN(c), roughness: r == null ? 0.35 : r, metalness: m == null ? 0.2 : m });
  const brilloN = NAVE ? (function () { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"), r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.45, "rgba(255,255,255,.4)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })() : null;
  const haloN = (tam, color) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), new THREE.MeshBasicMaterial({ map: brilloN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color })); m.rotation.x = -Math.PI / 2; m.userData.sinSombra = true; return m; };
  function quitarN(o) { if (!o) return; scene.remove(o); o.traverse(m => { if (m.geometry) m.geometry.dispose(); const ms = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []; ms.forEach(x => x.dispose()); }); }
  function armarMesa(R) {
    const g = new THREE.Group();
    const pz = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
    // Cubierta gris con canto dorado, anillo turquesa de luz y studs dorados en la orilla.
    pz(new THREE.CylinderGeometry(R, R * 0.98, 0.14, 72), matN(0xc3c9d3, 0.3, 0.1), 0, MESA_Y - 0.07, 0);
    pz(new THREE.CylinderGeometry(R * 0.66, R * 0.66, 0.012, 64), new THREE.MeshBasicMaterial({ color: linN(0x1d6f86) }), 0, MESA_Y + 0.002, 0);
    const aro = pz(new THREE.TorusGeometry(R * 0.66, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: linN(0x2ee6d6) }), 0, MESA_Y + 0.01, 0); aro.rotation.x = Math.PI / 2;
    const canto = pz(new THREE.TorusGeometry(R, 0.045, 10, 96), matN(0xffc21a, 0.25, 0.7), 0, MESA_Y - 0.02, 0); canto.rotation.x = Math.PI / 2;
    const nS = Math.max(12, Math.floor(2 * Math.PI * (R - 0.2) / 0.36));
    const studs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 16), matN(0xffc21a, 0.25, 0.7), nS);
    const mx = new THREE.Matrix4();
    for (let i = 0; i < nS; i++) { const a = i / nS * Math.PI * 2; mx.makeTranslation(Math.sin(a) * (R - 0.2), MESA_Y + 0.03, Math.cos(a) * (R - 0.2)); studs.setMatrixAt(i, mx); }
    g.add(studs);
    // Pata central y base en el piso.
    pz(new THREE.CylinderGeometry(0.42, 0.55, MESA_Y - 0.14, 32), matN(0x2a3140, 0.3, 0.6), 0, (MESA_Y - 0.14) / 2, 0);
    pz(new THREE.CylinderGeometry(0.95, 1.05, 0.08, 48), matN(0x232833, 0.3, 0.6), 0, 0.04, 0);
    // Botón: base oscura, domo dorado y anillo turquesa que late cuando se vota.
    pz(new THREE.CylinderGeometry(0.4, 0.46, 0.16, 40), matN(0x232833, 0.25, 0.7), 0, MESA_Y + 0.08, 0);
    const domo = pz(new THREE.SphereGeometry(0.3, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), TOON ? matN(0xffc21a) : new THREE.MeshStandardMaterial({ color: linN(0xffc21a), roughness: 0.18, metalness: 0.55, emissive: linN(0x7a4a00), emissiveIntensity: 0.25 }), 0, MESA_Y + 0.16, 0);
    domo.scale.y = 0.75;
    const anillo = pz(new THREE.TorusGeometry(0.44, 0.035, 10, 64), new THREE.MeshBasicMaterial({ color: linN(0x2ee6d6) }), 0, MESA_Y + 0.17, 0); anillo.rotation.x = Math.PI / 2;
    const halo = haloN(1.9, linN(0x2ee6d6)); halo.position.y = MESA_Y + 0.02; g.add(halo);
    g.traverse(o => { if (o.isMesh && !o.userData.sinSombra && !(o.material && o.material.isMeshBasicMaterial)) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    return { g, domo, anillo, halo };
  }
  function armarSilla() {
    const g = new THREE.Group();
    const pz = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const cuerpo = matN(0x2b3a5c, 0.35, 0.25), tira = new THREE.MeshBasicMaterial({ color: 0x5aa6f0 });
    pz(new THREE.BoxGeometry(0.92, 0.12, 0.78), cuerpo, 0, SILLA_Y - 0.06, -0.04);
    const respaldo = pz(new THREE.BoxGeometry(0.92, 0.6, 0.12), cuerpo, 0, SILLA_Y + 0.28, -0.46);
    const t = pz(new THREE.BoxGeometry(0.94, 0.09, 0.14), tira, 0, SILLA_Y + 0.6, -0.46); t.castShadow = false;
    // Cojín: sube la cara del asiento hasta la cadera de un Big Fig que queda en el aire (alto 1; se escala en acomodarNave).
    const cojin = pz(new THREE.BoxGeometry(0.92, 1, 0.78), cuerpo, 0, SILLA_Y, -0.04); cojin.visible = false;
    pz(new THREE.CylinderGeometry(0.07, 0.07, SILLA_Y - 0.12, 12), matN(0x8d96a8, 0.2, 0.8), 0, (SILLA_Y - 0.12) / 2, -0.04);
    pz(new THREE.CylinderGeometry(0.34, 0.38, 0.05, 24), matN(0x232833, 0.3, 0.6), 0, 0.025, -0.04);
    const halo = haloN(1.5, 0x5aa6f0); halo.position.set(0, 0.02, -0.04); g.add(halo);
    scene.add(g);
    return { g, tira, tiraMalla: t, halo, respaldo, cojin };
  }
  // Plaza de Big Fig (Codex, sentado-bigfig13-verif, b): silla SIN respaldo (el cuerpo lo envolvía), la tira de color pasa al
  // frente del asiento y, si la cadera queda en el aire, el asiento sube hasta ella (cojín). Minifiguras: la silla de siempre.
  const ASIENTO_TOL = 0.02, COJIN_MAX = 0.25;
  function vestirSilla(s, e) {
    const grande = esBigFig(e), cojin = grande && e.apoyo != null && e.apoyo > ASIENTO_TOL ? Math.min(COJIN_MAX, e.apoyo) : 0;
    s.respaldo.visible = !grande;
    s.tiraMalla.position.set(0, grande ? SILLA_Y - 0.06 : SILLA_Y + 0.6, grande ? 0.3 : -0.46);
    s.cojin.visible = cojin > 0;
    if (cojin > 0) { s.cojin.scale.y = cojin; s.cojin.position.y = SILLA_Y + cojin / 2; }
  }
  // Figuras nuevas sentadas: si sus pies llegan al tablero, la silla y la figura se alejan juntas, en línea recta desde el
  // centro y sin girar, lo mínimo para dejar PIES_HOLGURA libre entre los pies y el canto (Codex, sentado-r2). Solo cuentan
  // los pies que quedan a la altura del tablero (PIES_HOLGURA_Y por debajo de su cara inferior o más arriba).
  const PIES_HOLGURA = 0.12, PIES_HOLGURA_Y = 0.03, CANTO = 0.045;
  // Solo Big Fig: las minifiguras con «sentado» ya están aprobadas en su lugar de siempre (Codex, sentado-r2).
  const esBigFig = e => !!(e && e.v3 && e.v3.obj.userData.plano && e.v3.obj.userData.plano.familia === "bigfig");
  const alejarN = e => (esBigFig(e) && e.pies != null ? Math.max(0, NV.R + CANTO + PIES_HOLGURA - (NV.S - e.pies)) : 0);
  // Ángulo del asiento i de n: el 0 queda al fondo, de frente a la cámara, y siguen alrededor.
  const anguloN = (i, n) => Math.PI + (i - (n - 1) / 2) * (Math.PI * 2 / n);
  function acomodarNave() {
    const n = Math.max(3, lugares());
    const R = 1.05 + n * 0.13;
    if (!NV.mesa || NV.n !== n) { quitarN(NV.mesa && NV.mesa.g); NV.mesa = armarMesa(R); NV.n = n; NV.R = R; NV.S = R + 0.42; }
    while (NV.sillas.length < n) NV.sillas.push(armarSilla());
    const colorDe = new Map(), lejos = new Map(), deColumna = new Map();
    orden.forEach(id => { const e = figuras.get(id); colorDe.set(e.columna, e.color); deColumna.set(e.columna, e); e.alejar = alejarN(e); if (e.alejar) lejos.set(e.columna, e.alejar); });
    NV.lejos = Math.max(0, ...lejos.values());
    NV.sillas.forEach((s, i) => {
      s.g.visible = i < n; if (i >= n) return;
      const a = anguloN(i, n);
      const S = NV.S + (lejos.get(i) || 0);
      s.g.position.set(Math.sin(a) * S, 0, Math.cos(a) * S); s.g.rotation.y = a + Math.PI;
      const c = colorValido(colorDe.get(i) || NV.colores[i]);
      s.tira.color.copy(linN(c || "#4a5687"));
      s.halo.material.color.copy(linN(c || "#4a5687"));
      const e = deColumna.get(i);
      vestirSilla(s, e && e.vuela == null ? e : null);
    });
    orden.forEach(id => {
      const e = figuras.get(id), a = anguloN(e.columna, n);
      if (e.vuela != null) return;
      const S = NV.S + (e.alejar || 0);
      e.obj.position.set(Math.sin(a) * S, SILLA_Y, Math.cos(a) * S); e.obj.rotation.set(0, a + Math.PI, 0); e.obj.scale.setScalar(1);
    });
  }
  // Sentada: las piernas al frente (90°) y la cadera baja hasta el asiento. Encima va lo que haga el momento.
  function sentar(e) {
    const J = e.obj.userData.j; if (!J) return;
    if (J.piernasArt) { J.legR.rotation.x = -Math.PI / 2; J.legL.rotation.x = -Math.PI / 2; }
    if (J.pivotY) J.root.position.y = Math.max(-(J.pivotY - 8 / LD), J.root.position.y * 0.35 - (J.pivotY - 8 / LD));
  }
  // Dónde queda la cabeza de cada figura sentada (fracción del lienzo, y desde arriba): ALV pone ahí la palabra que dijo.
  // Se mide sobre la pose real (sentada) dos veces por segundo y solo se manda si cambió.
  const cajaCab = new THREE.Box3(), vCab = new THREE.Vector3();
  let ultCab = "", tCab = -9;
  function cabezasNave(t) {
    if (t - tCab < 0.5) return; tCab = t;
    const pos = {};
    orden.forEach(id => {
      const e = figuras.get(id); if (!e || e.vuela != null) return;
      cajaCab.setFromObject(e.obj);
      vCab.set((cajaCab.min.x + cajaCab.max.x) / 2, cajaCab.max.y + 0.08, (cajaCab.min.z + cajaCab.max.z) / 2).project(camera);
      pos[id] = [Math.round((vCab.x + 1) * 500) / 1000, Math.round((1 - vCab.y) * 500) / 1000];
    });
    const firma = JSON.stringify(pos);
    if (firma !== ultCab) { ultCab = firma; enviar({ tipo: "cabezas", pos }); }
  }
  function animarNave(t) {
    if (!NV.mesa) return;
    const m = NV.mesa, b = NV.boton;
    const late = b === "votar" ? 0.55 + 0.45 * Math.sin(t * 4.2) : b === "golpe" ? 1 : 0.18;
    m.halo.material.opacity = late; m.anillo.material.color.setRGB(0.18 * (0.4 + late), 0.9 * (0.4 + late), 0.84 * (0.4 + late));
    const g = t - NV.golpe; m.domo.scale.y = g < 0.35 ? 0.75 - Math.sin(g / 0.35 * Math.PI) * 0.35 : 0.75;
    const foco = new Set(orden.filter(id => figuras.get(id).foco).map(id => figuras.get(id).columna));
    NV.sillas.forEach((s, i) => { s.halo.material.opacity = foco.has(i) ? 0.75 + 0.25 * Math.sin(t * 5) : 0.22; });
    // Expulsión: se levanta de la silla, gira y sale volando hacia arriba en 2.4 s; luego desaparece.
    figuras.forEach(e => {
      if (e.vuela == null) return;
      const d = (t - e.vuela) / 2.4;
      if (d >= 1) { e.obj.visible = false; return; }
      const k = d * d, a = anguloN(e.columna, Math.max(3, lugares()));
      const S = NV.S + (e.alejar || 0);
      e.obj.position.set(Math.sin(a) * S * (1 + d * 0.6), SILLA_Y + 0.6 * Math.min(1, d * 4) + k * 9, Math.cos(a) * S * (1 + d * 0.6));
      e.obj.rotation.set(d * 3, a + Math.PI + d * 14, d * 2);
      e.obj.scale.setScalar(Math.max(0.05, 1 - k * 0.8));
    });
  }
  // Vuelo (expulsión de El impostor, Elías 24 nov): la nave la avienta desde la izquierda; cruza la pantalla por en medio
  // girando sobre su centro y sale por la derecha. Empuje: arranca rápido y va perdiendo velocidad (sin detenerse); los
  // giros también se van frenando. La misma curva `uVuelo` la usa ALV para escribir las letras al paso (nave.tsx).
  const DUR_VUELO = 5, MEDIO_FIG = 0.72, DIST_VUELO = 15, vGiro = new THREE.Vector3();
  const uVuelo = d => -0.18 + 1.36 * (0.55 * d + 0.45 * (1 - Math.pow(1 - d, 2)));
  function volar(e, t) {
    const d = Math.min(1, Math.max(0, (t - (e.t0v ?? t)) / DUR_VUELO));
    // Avisa a ALV dónde va (para escribir las letras justo al paso de la figura).
    if (e.dEnviado !== 1 && (e.dEnviado == null || d >= 1 || t - (e.tEnvio ?? 0) > 0.03)) { enviar({ tipo: "vuelo", d }); e.dEnviado = d >= 1 ? 1 : d; e.tEnvio = t; }
    const hw = Math.tan(camera.fov * Math.PI / 360) * DIST_VUELO * camera.aspect;
    const frena = 1 - Math.pow(1 - d, 2);
    if (!QUIETO) e.obj.rotation.set(Math.sin(d * 5) * 0.5, frena * 5.5, -(0.35 * d + 0.65 * frena) * 11);
    else e.obj.rotation.set(0, 0, 0);
    // Gira sobre su centro: se corrige la posición del origen (los pies) según la rotación.
    vGiro.set(0, MEDIO_FIG, 0).applyEuler(e.obj.rotation);
    const cx = (uVuelo(d) * 2 - 1) * hw, cy = 1.35 + Math.sin(d * Math.PI) * 0.22 - d * 0.1;
    e.obj.position.set(cx - vGiro.x, cy - vGiro.y, -vGiro.z);
    e.obj.scale.setScalar(1);
  }
  function encuadrarNave() {
    const tv = Math.tan(camera.fov * Math.PI / 360), th = tv * camera.aspect;
    const vertical = camera.aspect < 0.9, ang = vertical ? 1.05 : 0.74;
    const ext = NV.S + (NV.lejos || 0) + 0.75, ancho = 2 * ext; // con las sillas alejadas de los Big Fig, si las hay
    const prof = 2 * ext * Math.sin(ang) + 3.1 * Math.cos(ang);
    const d = Math.max((ancho / 2) / th, (prof / 2) / tv) * 0.98;
    const y0 = 1.05;
    camera.position.set(0, y0 + d * Math.sin(ang), d * Math.cos(ang)); camera.lookAt(0, y0, 0); camera.updateProjectionMatrix();
    // Con Big Fig (Codex, sentado-bigfig13-verif): se aleja la cámara hasta que quepan el piso de las sillas y lo más alto de
    // cada figura sentada (la cola de Lagarto), con margen abajo. Sin Big Fig, el encuadre de siempre.
    const grandes = orden.map(id => figuras.get(id)).filter(e => esBigFig(e) && e.vuela == null);
    if (grandes.length) {
      const pts = [], n = Math.max(3, lugares());
      for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a) * ext, 0, Math.cos(a) * ext)); }
      orden.forEach(id => {
        const e = figuras.get(id), a = anguloN(e.columna, n), S = NV.S + (e.alejar || 0), top = SILLA_Y + (esBigFig(e) && e.techo != null ? e.techo : 1.7);
        for (const r of [S - 0.5, S + 0.5]) pts.push(new THREE.Vector3(Math.sin(a) * r, top, Math.cos(a) * r));
      });
      const v = new THREE.Vector3(), cabe = () => {
        camera.updateMatrixWorld(true);
        return pts.every(p => { v.copy(p).project(camera); return Math.abs(v.x) <= 0.96 && v.y >= -0.88 && v.y <= 0.94; });
      };
      for (let k = 0; k < 60 && !cabe(); k++) { const dd = d * Math.pow(1.02, k + 1); camera.position.set(0, y0 + dd * Math.sin(ang), dd * Math.cos(ang)); camera.lookAt(0, y0, 0); }
    }
    if (!TOON) { const sc = luz.shadow.camera, a = ext + 1.2; sc.left = -a; sc.right = a; sc.top = a; sc.bottom = -a; sc.updateProjectionMatrix(); luz.position.set(-3.5, 8, 5); luz.target.position.set(0, 0.6, 0); }
  }
  if (SIN_PLAT && !TOON) scene.add(pisoSombra(1.6));
  // Celular sin plataforma: tampoco mapa de sombras (queda la sombra de contacto bajo los pies).
  if (SIN_PLAT && TACTIL && new URLSearchParams(location.search).get("sombras") !== "1") { luz.castShadow = false; renderer.shadowMap.enabled = false; }

  // ---------- Azotea: Plataforma ALV ----------
  // Placa blanca con 24 studs dorados en el borde y una estrella donde pisa la figura (y = 0); anillo de 12 paneles con
  // una ranura de energía en los huecos; tres patas hidráulicas sobre el piso de la azotea (y = PISO). Todo barato:
  // los studs son una sola malla instanciada, los brillos son planos aditivos y no hay luces extra.
  const PISO = -0.72, AZ_GIRO = 0.3, QUIETO_AZ = Q.get("quieto") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AZ = { brillo: 0.6, ranura: new THREE.Color(0x2ee6d6), pausa: false, llegada: null, polvo: false, pendiente: AZOTEA && Q.get("llegada") === "1" && !QUIETO_AZ,
    mira: { x: 0, y: 0, ax: 0, ay: 0, w: 0, activa: false }, acc: { cual: null, k: 0, sale: null }, saludo: 0, quieto: true, salto: false,
    usuario: 0, vel: 0 }; // giro que le da el jugador arrastrando (radianes) y su inercia
  let plat = null;
  // Plataforma futurista (pedido de Elías, 2026-11-21): metal oscuro en capas con tiras de luz (turquesa arriba y
  // abajo, ámbar en el collar), 24 luces pequeñas en el borde que se encienden en cadena en la llegada, un plato de luz
  // donde pisa la figura y una columna holográfica tenue. Colores del paquete: placa, base, panelA (collar),
  // panelB (anillo bajo), stud (luces del borde), ranura (tiras turquesa), estrella (tira ámbar).
  if (AZOTEA && !SIN_PLAT) {
    const lin = c => new THREE.Color(c).convertSRGBToLinear();
    const metal = (c, r) => BRILLO
      ? new THREE.MeshPhysicalMaterial({ color: lin(c), roughness: r == null ? 0.28 : r, metalness: 0.75, clearcoat: 0.8, clearcoatRoughness: 0.08, envMapIntensity: 1.4 })
      : new THREE.MeshStandardMaterial({ color: lin(c), roughness: r == null ? 0.35 : r, metalness: 0.6 });
    const M = { placa: metal(0x3a4150, 0.24), base: metal(0x232833), panelA: metal(0x2c3240), panelB: metal(0x303746), estrella: new THREE.MeshBasicMaterial({ color: lin(0xffc21a) }),
      stud: new THREE.MeshBasicMaterial({ color: 0xffffff }), piston: metal(0x8d96a8, 0.2) };
    const g = new THREE.Group();
    const pieza = (geo, m, x, y, z, sombra) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = sombra !== false; o.receiveShadow = true; g.add(o); return o; };
    const ranura = new THREE.MeshBasicMaterial({ color: AZ.ranura.clone() });
    const tira = (r, y, m, arco) => { const o = pieza(new THREE.TorusGeometry(r, 0.028, 10, 96, arco || Math.PI * 2), m, 0, y, 0, false); o.rotation.x = Math.PI / 2; return o; };
    // Placa de arriba con borde de luz
    pieza(new THREE.CylinderGeometry(1.0, 1.02, 0.1, 72), M.placa, 0, -0.05, 0);
    tira(1.012, -0.012, ranura);
    // Collar con tres arcos ámbar
    pieza(new THREE.CylinderGeometry(0.94, 0.86, 0.2, 64), M.panelA, 0, -0.2, 0);
    for (let i = 0; i < 3; i++) { const o = tira(0.905, -0.2, M.estrella, Math.PI * 2 / 3 - 0.35); o.rotation.z = i * Math.PI * 2 / 3; }
    // Anillo bajo ancho con su tira turquesa y aletas
    pieza(new THREE.CylinderGeometry(1.2, 1.3, 0.14, 72), M.panelB, 0, -0.37, 0);
    tira(1.21, -0.3, ranura);
    const aleta = new THREE.BoxGeometry(0.1, 0.12, 0.34);
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2, o = pieza(aleta, M.base, Math.sin(a) * 1.24, -0.46, Math.cos(a) * 1.24); o.rotation.y = a; }
    // Pie hasta el piso
    pieza(new THREE.CylinderGeometry(0.9, 1.05, 0.2, 64), M.base, 0, -0.54, 0);
    pieza(new THREE.CylinderGeometry(1.1, 1.16, 0.08, 64), M.base, 0, PISO + 0.04, 0);
    // 24 luces pequeñas en el borde de la placa (una sola malla instanciada; se encienden en cadena)
    const nS = 24, ORO = new THREE.Color(0x7ff7ee).convertSRGBToLinear().multiplyScalar(0.55);
    const studs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.03, 0.06), M.stud, nS), d0 = new THREE.Object3D();
    for (let i = 0; i < nS; i++) { const a = i / nS * Math.PI * 2; d0.position.set(Math.sin(a) * 0.93, 0.004, Math.cos(a) * 0.93); d0.rotation.y = a; d0.updateMatrix(); studs.setMatrixAt(i, d0.matrix); studs.setColorAt(i, ORO); }
    g.add(studs);
    caricatura(g);
    const degr = (fn) => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; fn(cv.getContext("2d")); return new THREE.CanvasTexture(cv); };
    const texHalo = degr(c => { const r = c.createRadialGradient(64, 64, 6, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.4, "rgba(255,255,255,.45)"); r.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = r; c.fillRect(0, 0, 128, 128); });
    const texHaz = degr(c => { const r = c.createLinearGradient(0, 0, 0, 128); r.addColorStop(0, "rgba(255,255,255,0)"); r.addColorStop(0.7, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,1)"); c.fillStyle = r; c.fillRect(0, 0, 128, 128); });
    const aditivo = (map, color, op) => new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: op || 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    // Plato de luz donde pisa la figura
    const plato = new THREE.Mesh(new THREE.CircleGeometry(0.82, 64), aditivo(texHalo, AZ.ranura.clone(), 0.5)); plato.rotation.x = -Math.PI / 2; plato.position.y = 0.003;
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), aditivo(texHalo, AZ.ranura.clone())); halo.rotation.x = -Math.PI / 2; halo.position.y = PISO + 0.012;
    // Columna holográfica tenue (siempre) y haz fuerte de la llegada
    const cono = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.86, 3.0, 48, 1, true), aditivo(texHaz, AZ.ranura.clone(), 0.12)); cono.position.y = 1.5;
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 3.4, 40, 1, true), aditivo(texHaz, AZ.ranura.clone())); haz.position.y = 1.7;
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.022, 8, 64), aditivo(null, new THREE.Color(0xc8fff8))); aro.rotation.x = Math.PI / 2;
    [plato, halo, cono, haz, aro].forEach(o => { o.userData.sinSombra = true; o.renderOrder = 2; g.add(o); });
    haz.visible = aro.visible = false;
    const piso = pisoSombra(2.6); piso.position.y = PISO + 0.004; piso.material.opacity = 0.34; g.add(piso);
    const contacto = new THREE.Mesh(new THREE.CircleGeometry(1.45, 40), new THREE.MeshBasicMaterial({ color: 0x000000, map: texHalo, transparent: true, opacity: 0.5, depthWrite: false }));
    contacto.rotation.x = -Math.PI / 2; contacto.position.y = PISO + 0.006; contacto.userData.sinSombra = true; g.add(contacto);
    scene.add(g);
    plat = { g, M, ranura, studs, nS, ORO, halo, haz, aro, plato, cono, luz: new THREE.Color() };
    if (TACTIL && Q.get("sombras") !== "1") { luz.castShadow = false; renderer.shadowMap.enabled = false; piso.visible = false; contacto.material.opacity = 0.6; }
  }
  // Estudios de la llegada y de cada cambio de figura (escaneo: sin caída).
  function iniciarLlegada(t, completa) { if (QUIETO_AZ || (!plat && !completa)) return; AZ.llegada = { t0: completa ? t : t - 0.6, completa }; AZ.polvo = !completa; }
  function animarAzotea(t) {
    if (!plat) { if (AZ.llegada && t - AZ.llegada.t0 > 1.4) AZ.llegada = null; return; }
    const L = AZ.llegada, d = L ? t - L.t0 : 99;
    const pulso = QUIETO_AZ ? 1 : 0.82 + 0.18 * Math.sin(t * Math.PI / 2);
    const flare = d < 0.3 ? d / 0.3 : d < 0.95 ? 1 - (d - 0.3) / 0.65 : 0;
    const e = Math.min(2.4, AZ.brillo * pulso + flare * 1.4);
    plat.ranura.color.copy(AZ.ranura).multiplyScalar(0.55 + e * 0.75);
    plat.halo.material.opacity = Math.min(0.85, 0.08 + AZ.brillo * 0.32 * pulso + flare * 0.5);
    plat.plato.material.opacity = Math.min(0.9, 0.3 + AZ.brillo * 0.35 * pulso + flare * 0.4);
    plat.cono.material.opacity = QUIETO_AZ ? 0.08 : (0.05 + AZ.brillo * 0.1) * pulso + flare * 0.15;
    // Mientras la figura nueva carga, la columna late más fuerte (la plataforma «está trayendo» a la figura).
    let espera = false; figuras.forEach(x => { if (x.esperaV3 != null) espera = true; });
    if (espera) { const w = 0.5 + 0.5 * Math.sin(t * 5); plat.cono.material.opacity += 0.1 + 0.12 * w; plat.plato.material.opacity = Math.min(0.95, plat.plato.material.opacity + 0.25 * w); }
    plat.haz.visible = d > 0.15 && d < 0.85;
    if (plat.haz.visible) plat.haz.material.opacity = Math.sin((d - 0.15) / 0.7 * Math.PI) * 0.55;
    plat.aro.visible = d > 0.6 && d < 1.2;
    if (plat.aro.visible) { const k = (d - 0.6) / 0.6; plat.aro.position.y = k * 2.8; plat.aro.material.opacity = Math.sin(k * Math.PI) * 0.9; }
    // Studs que se encienden en cadena alrededor del borde
    if (d > 0.6 && d < 1.35) {
      const frente = (d - 0.6) / 0.5 * plat.nS;
      for (let i = 0; i < plat.nS; i++) { const a = Math.max(0, 1 - Math.abs(frente - i) / 4); plat.luz.copy(plat.ORO).lerp(new THREE.Color(2.2, 2.0, 1.3), a * (d < 1.1 ? 1 : 1 - (d - 1.1) / 0.25)); plat.studs.setColorAt(i, plat.luz); }
      plat.studs.instanceColor.needsUpdate = true; AZ.studsSucios = true;
    } else if (AZ.studsSucios) { for (let i = 0; i < plat.nS; i++) plat.studs.setColorAt(i, plat.ORO); plat.studs.instanceColor.needsUpdate = true; AZ.studsSucios = false; }
    if (L && d > 1.4) AZ.llegada = null;
  }
  // Figura nueva lista (o se acabó la espera): sale con la llegada que le tocaba al armarse.
  const ESPERA_V3 = 8;
  function revelarAzotea(e, t) {
    if (e.esperaV3 == null) return;
    e.esperaV3 = null;
    if (e.llega === "completa") iniciarLlegada(t, true); else if (e.llega) iniciarLlegada(t, false);
    e.llega = null; AZ.saludo = t + 6;
  }
  // Caída de la figura en la llegada: invisible, cae desde arriba y se aplasta un poco al tocar la placa.
  function caidaAzotea(e, t) {
    if (e.esperaV3 != null) { if (t < e.esperaV3) { e.obj.visible = false; return; } revelarAzotea(e, t); }
    const L = AZ.llegada; if (!L || !L.completa) { e.obj.visible = true; return; }
    const d = t - L.t0, o = e.obj;
    o.visible = d >= 0.35;
    const p = Math.min(1, Math.max(0, (d - 0.35) / 0.25));
    o.position.y = 1.1 * (1 - p * p);
    const s = d > 0.6 && d < 0.8 ? Math.sin((d - 0.6) / 0.2 * Math.PI) : 0;
    o.scale.set(1 + 0.06 * s, 1 - 0.1 * s, 1 + 0.06 * s);
    if (d >= 0.6 && !AZ.polvo) { AZ.polvo = true; polvo(t); }
    if (d > 0.8) { o.position.y = 0; o.scale.setScalar(1); }
  }
  // Mirada dirigida y poses breves (encima de la pose del momento, como la «vida»).
  function reaccionAzotea(e, t, dt) {
    const J = e.obj.userData.j, V = J && J.vida; if (!V) return;
    const m = AZ.mira, a = AZ.acc, r = Math.min(1, dt * 7);
    m.w += ((m.activa ? 1 : 0) - m.w) * Math.min(1, dt * 5); m.ax += (m.x - m.ax) * r; m.ay += (m.y - m.ay) * r;
    a.k = Math.max(0, Math.min(1, a.k + (a.cual ? dt : -dt) / 0.22));
    if (!a.cual && a.k === 0 && a.sale) { if (a.sale === "flexionar") { cambio(e, t); e.mom = esperaDe(e); e.t0 = t; } a.sale = null; }
    const w = m.w, k = a.k * a.k * (3 - 2 * a.k), cual = a.cual || a.sale;
    // Giro del jugador con inercia; al señalar un botón o hacer un gesto, la figura vuelve a quedar de frente para reaccionar.
    if (Math.abs(AZ.vel) > 0.001) { AZ.usuario += AZ.vel * dt; AZ.vel *= Math.exp(-4 * dt); } else AZ.vel = 0;
    AZ.usuario = Math.atan2(Math.sin(AZ.usuario), Math.cos(AZ.usuario));
    const frente = Math.max(w, k);
    let giro = AZ_GIRO + AZ.usuario * (1 - frente) + m.ax * 0.5 * w;
    J.head.rotation.y += (m.ax * 0.55 - J.head.rotation.y) * w;
    e.lx += m.ay * 0.05 * w; // mirar arriba o abajo: se inclina el torso (la cabeza solo gira a los lados)
    if (k > 0 && !QUIETO_AZ) {
      if (cual === "listo") {
        e.lx += 0.13 * k; J.armR.rotation.x += -0.8 * k; J.armL.rotation.x += -0.8 * k;
        J.armR.rotation.z -= V.ladoR * 0.1 * k; J.armL.rotation.z -= V.ladoL * 0.1 * k;
        J.root.position.y += Math.abs(Math.sin(t * 8)) * 0.035 * k; J.head.rotation.x += 0.1 * k;
      } else if (cual === "mirarse") {
        giro += -AZ_GIRO * k; e.lx += 0.16 * k; J.head.rotation.x += -0.1 * k; J.head.rotation.y *= 1 - k;
        J.armR.rotation.x += -0.55 * k; J.armR.rotation.z -= V.ladoR * 0.25 * k;
      } else if (cual === "frotar") {
        const o = Math.sin(t * 15);
        J.armR.rotation.x += (-1.0 + o * 0.08) * k; J.armL.rotation.x += (-1.0 - o * 0.08) * k;
        J.armR.rotation.z -= V.ladoR * 0.28 * k; J.armL.rotation.z -= V.ladoL * 0.28 * k;
        if (J.wristR) J.wristR.rotation.y += o * 0.5 * k; if (J.wristL) J.wristL.rotation.y -= o * 0.5 * k;
        J.head.rotation.x += -0.08 * k;
      } else if (cual === "orgullo") {
        e.lx += -0.08 * k; J.head.rotation.x += 0.16 * k;
        J.armR.rotation.x += -1.05 * k; J.armR.rotation.z -= V.ladoR * 0.38 * k;
        J.armL.rotation.z += V.ladoL * 0.12 * k;
      }
    }
    e.obj.rotation.y = giro;
    AZ.quieto = !L_activa() && a.k === 0 && w < 0.01 && AZ.vel === 0;
  }
  const L_activa = () => !!AZ.llegada;
  function accionAzotea(cual, e, t) {
    const a = AZ.acc, ok = ["listo", "mirarse", "frotar", "flexionar", "orgullo", "saludar"];
    if (cual === "saludar") { if (e) e.saluda = t; AZ.saludo = t + 12; return; }
    if (cual && !ok.includes(cual)) return;
    if (a.cual === "flexionar" && cual !== "flexionar") a.sale = "flexionar";
    if (cual === "flexionar" && e && a.cual !== "flexionar" && Momentos.info("flexionar")) { cambio(e, t); e.mom = "flexionar"; e.t0 = t; }
    a.cual = cual || null;
  }
  const colorHex = c => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : null);

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

  // Cascos que son máscaras con huecos (Batman, el del Capitán): debajo va un rostro cuyos ojos caen en los huecos,
  // sin lentes ni barba (otros rostros o detalles se asomaban desalineados).
  const CASCO_MASCARA = new Set(["ld-55704", "ld-49556p02", "ld-10113", "ld-17018p01"]);
  function armar(f) {
    const plano = desdeFigura(f);
    if (CASCO_MASCARA.has(plano.cabello)) { plano.rostro = "sonrisa"; plano.facial = []; }
    const obj = caricatura(build(plano));
    prepararVida(obj);
    const sombra = new THREE.Mesh(sombraGeo, sombraMat); sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.003; obj.add(sombra);
    return { obj, momentos: plano._momentos || {}, plano };
  }
  function quitar(id) {
    const x = figuras.get(id); if (!x) return;
    if (x.v3) { scene.remove(x.obj); x.v3.quitar(); figuras.delete(id); return; } // libera solo lo suyo (no el dispose viejo)
    if (x.cara) { x.cara.malla.material.map = x.cara.base; [x.cara.parpadeo, x.cara.sonrisa, x.cara.especial].forEach(t => t && t.dispose()); }
    scene.remove(x.obj); dispose(x.obj); figuras.delete(id);
  }
  function dispose(o) { o.traverse(m => { if (m.geometry && !m.userData.compartida && m.geometry !== sombraGeo) m.geometry.dispose(); const ms = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []; ms.forEach(x => { if (x === sombraMat || x === contorno) return; ["map", "emissiveMap"].forEach(k => x[k] && x[k].dispose()); x.dispose(); }); }); }

  function ponerFiguras(lista, cols, asientos) {
    if (SALA || NAVE) columnas = Math.max(0, Math.min(12, cols | 0));
    if (NAVE && Array.isArray(asientos)) NV.colores = asientos.slice(0, 12).map(colorValido);
    if (PRUEBA) lista = lista.slice(0, 1).map(x => ({ id: x.id, foco: x.foco, figura: figuraPrueba() }));
    const ids = new Set(lista.map(x => String(x.id)));
    [...figuras.keys()].forEach(id => { if (!ids.has(id)) quitar(id); });
    orden = [];
    lista.forEach(x => {
      const id = String(x.id);
      const fx = figuraDe(x);
      if (!fx) { quitar(id); return; }
      // Fase 5: con `plano3` (figura del sistema nuevo, ya resuelta por ALV) la huella incluye el plano: si cambia, se
      // arma de nuevo la v2 de respaldo y se vuelve a cargar la nueva.
      const p3 = planoV3(x.plano3);
      let h = huellaDe(fx) + (p3 ? "|" + huellaDe(p3) : "");
      let e = figuras.get(id);
      // Transformación (formas.ts de ALV: Banner ↔ Hulk, Tony / Iron Man, Peter ↔ Spider-Man): la figura de ahora se queda
      // mientras baja la otra; luego nube de humo y cambio. Si la de antes tiene que hacer su especial (Banner), primero esa.
      const tr = Number.isFinite(x.transforma) ? x.transforma : null;
      if (e && e.huella !== h && e.trHuella === h) h = e.huella; // ya está en camino: nada que hacer
      else if (e && e.huella !== h && tr != null && tr !== e.transforma && e.v3 && p3 && !NAVE && transformarV3(e, p3, h, !!x.conEspecial)) { e.transforma = tr; h = e.huella; }
      if (e && tr != null) e.transforma = tr;
      if (!e || e.huella !== h) {
        if (e) quitar(id);
        const t = reloj.getElapsedTime(), habia = !!e;
        try { const a = armar(fx); e = { id, obj: a.obj, momentos: a.momentos, plano: a.plano, huella: h, mom: a.momentos.espera || "respirar", t0: t - Math.random() * 3,
          pop: EDITOR && habia ? t : -9, parpadeo: t + 2 + Math.random() * 2, sonrisa: t + 7 + Math.random() * 4,
          fase: Math.random() * Math.PI * 2, mira: { y: 0, v: 0, meta: 0, inc: 0, prox: t + 1 + Math.random() * 2 }, lx: 0, lz: 0, saludoK: 0 }; }
        catch (err) { console.error("escena: no se pudo armar", id, err); return; }
        scene.add(e.obj); figuras.set(id, e);
        // Nave: la figura nueva solo si trae clip «sentado» (Codex, ajuste 5); sin él se queda la v2 de respaldo, sentada.
        if (p3 && !(NAVE && !p3.sentado)) iniciarV3(e, p3);
        // Sala: la figura llega «teletransportada»: crece desde los pies sobre su pedestal.
        if (SALA) { e.tele = t; e.obj.visible = false; }
        // Azotea con figura nueva: el respaldo no se enseña; espera escondida (columna de luz encendida) a que cargue la
        // nueva y entonces llega. Si tarda más de ESPERA_V3 o falla, llega el respaldo (Elías, 2026-11-26: «sale un random»).
        const llega = AZ.pendiente ? "completa" : habia ? "escaneo" : null;
        if (AZOTEA && p3 && !QUIETO_AZ) { AZ.pendiente = false; e.esperaV3 = t + ESPERA_V3; e.llega = llega; e.obj.visible = false; }
        else if (AZOTEA) { if (llega === "completa") { AZ.pendiente = false; iniciarLlegada(t, true); } else if (llega) iniciarLlegada(t, false); AZ.saludo = t + 6; }
        if (EDITOR && habia) polvo(reloj.getElapsedTime());
      }
      // Talla y especial que manda ALV (`anim`, aparte de la figura): cambian sin volver a armarla.
      const an = x.anim && typeof x.anim === "object" ? x.anim : {};
      const tb = EDITOR || !GestosALV.TALLAS[an.talla] ? "normal" : String(an.talla);
      if (e.tallaBase !== tb) { e.tallaBase = tb; if (!e.espEst) e.tallaMeta = tb; if (!e.esc) e.esc = GestosALV.talla(tb).escala.slice(); }
      e.esp = GestosALV.especial(an.especial, fx.momentos && fx.momentos.paquete);
      // Perillas base que manda ALV (p. ej. de un perfil): espera, velocidad e intensidad. Sin ellas, como siempre.
      e.velBase = acotar(an.vel, 0.6, 1.5, 1); e.intBase = acotar(an.int, 0.4, 1.4, 1);
      const esp = typeof an.espera === "string" && Momentos.info(an.espera) ? an.espera : null;
      if (e.esperaPerfil !== esp) {
        const enEspera = !(e.prio > 0) && !e.durMom && e.mom === esperaDe(e);
        e.esperaPerfil = esp;
        if (enEspera) { cambio(e, reloj.getElapsedTime()); e.mom = esperaDe(e); e.t0 = reloj.getElapsedTime(); }
      }
      // Piel de la persona bajo la máscara (la cara del especial se pinta con ella, no con el color de la careta).
      e.pielReal = fx.identidad && /^#[0-9a-f]{6}$/i.test(fx.identidad.piel || "") ? fx.identidad.piel : null;
      // Careta levantada (Iron Man, formas.ts de ALV): gira esas mallas sobre su bisagra; la figura no se vuelve a armar.
      e.caretaDef = caretaValida(x.careta); aplicarCareta(e);
      e.foco = !!x.foco; orden.push(id);
      if (SALA || NAVE) { e.columna = Number.isInteger(x.columna) && x.columna >= 0 ? x.columna : orden.length - 1; e.color = colorValido(x.color); }
    });
    acomodar();
  }

  // Figuras en fila: cada una al centro de su columna (ALV pone encima una columna tocable por jugador, con su nombre).
  // La del turno da un paso al frente.
  let paso = 1.55;
  function acomodar() {
    if (EDITOR) { tamano(); orden.forEach(id => figuras.get(id).obj.position.set(0, 0, 0)); return; }
    if (NAVE) { tamano(); acomodarNave(); encuadrarNave(); return; }
    if (VUELO) { tamano(); camera.position.set(0, 1.35, DIST_VUELO); camera.lookAt(0, 1.35, 0); camera.updateProjectionMatrix(); orden.forEach(id => { const e = figuras.get(id); if (e.t0v == null) e.t0v = reloj.getElapsedTime(); }); return; }
    encuadrar();
    cajaSombra((SALA ? lugares() : Math.max(1, orden.length)) * paso);
    if (SALA) { acomodarSala(); return; }
    const n = orden.length;
    orden.forEach((id, i) => {
      const e = figuras.get(id), x = (i - (n - 1) / 2) * paso;
      e.obj.position.set(x, 0, e.foco ? 0.6 : 0); e.obj.rotation.y = MODO === "hub" ? -0.32 : AZOTEA ? AZ_GIRO : -x * 0.04; e.obj.scale.setScalar(e.foco ? 1.12 : 1);
    });
  }
  function acomodarSala() {
    const n = lugares(), x0 = i => (i - (n - 1) / 2) * paso;
    while (pedestales.length < n) pedestales.push(pedestalSala());
    pedestales.forEach((p, i) => { p.visible = i < n && !SALA_SIN_PED; if (i < n) p.position.set(x0(i), 0, 0); });
    const color = new Map();
    orden.forEach(id => { const e = figuras.get(id); e.obj.position.set(x0(e.columna), 0, 0); e.obj.rotation.y = -x0(e.columna) * 0.05; e.obj.scale.setScalar(1); color.set(e.columna, e.color); });
    pedestales.forEach((p, i) => { if (i < n) pintarPedestal(p, color.get(i)); });
  }
  const lugares = () => Math.max(1, orden.length, columnas, ...orden.map(id => (figuras.get(id).columna | 0) + 1));
  function tamano() {
    const r = lienzo.getBoundingClientRect(), w = Math.max(2, r.width), h = Math.max(2, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (AO.pase) { const v = new THREE.Vector2(); renderer.getDrawingBufferSize(v); AO.pase.setSize(Math.max(2, v.x >> 1), Math.max(2, v.y >> 1)); }
  }
  function encuadrar() {
    tamano();
    // Medidas reales de una figura armada: 2.6–2.75 de alto con pelo o casco, 1.6–1.9 de ancho con brazos y objeto.
    // HUB: cabe también el pedestal (de y = -0.34 a 0) y queda aire arriba para que la figura no se vea gigante.
    // Azotea: de la base de las patas (y ≈ -0.94 con aire) a lo más alto de un casco, con la figura a ~57 % del alto.
    const n = SALA ? lugares() : Math.max(1, orden.length), alto = (SALA ? 5.3 : SIN_PLAT ? 3.3 : AZOTEA ? 4.9 : MODO === "hub" ? 4.5 : 3.3) * (SALA ? 1 : crecer()), minimo = SIN_PLAT ? 2.0 : AZOTEA ? 2.8 : n * 1.9 + 0.3;
    // Sala: el lienzo es muy ancho (hasta 8 columnas); con 30° las figuras de las orillas se estiraban y se veían más
    // grandes que las del centro (Elías, 25 nov). Con 6° y la cámara más lejos casi no hay perspectiva: todas iguales.
    if (SALA && camera.fov !== 6) camera.fov = 6;
    const tv = Math.tan(camera.fov * Math.PI / 360), th = tv * camera.aspect;
    // Primero que quepa de alto; si así no caben a lo ancho, se aleja hasta que quepan.
    let d = (alto / 2) / tv;
    if (2 * d * th < minimo) d = (minimo / 2) / th;
    if (SALA) { camera.near = Math.max(0.3, d - 12); camera.far = d + 12; }
    paso = (2 * d * th) / n;
    // Pantalla alta (celular vertical): sobra cielo; se mira más arriba para que los pies queden abajo, sobre el piso.
    // Sala: queda aire abajo para el nombre y arriba para el «¡LISTO!».
    const centro = SALA ? d * tv * 0.85 - 0.75 : SIN_PLAT ? -0.15 + d * tv : AZOTEA ? Math.max(1.26, PISO - 0.22 + d * tv) : MODO === "hub" ? Math.max(1.55, d * tv * 0.92 - 0.4) : Math.max(1.4, d * tv * 0.88);
    // Azotea: cámara un poco más baja que el centro (vista heroica).
    camera.position.set(0, centro + (SIN_PLAT ? 0.55 : AZOTEA ? -0.12 : 0.15), d); camera.lookAt(0, centro, 0); camera.updateProjectionMatrix();
    // Sin plataforma, ALV coloca el lienzo para que los pies caigan en el pedestal pintado: le decimos dónde quedan
    // los pies y cuánto mide la figura (fracciones del lienzo).
    if (SIN_PLAT) {
      camera.updateMatrixWorld(true);
      const pies = new THREE.Vector3(0, 0, 0).project(camera), cabeza = new THREE.Vector3(0, 2.7, 0).project(camera);
      enviar({ tipo: "pies", x: (pies.x + 1) / 2, y: (1 - pies.y) / 2, alto: (cabeza.y - pies.y) / 2 });
    }
  }

  // ---------- Gestos con prioridad (ALV_PLAN_ANIMACIONES.md) ----------
  // Cada figura lleva su propio estado: dos figuras iguales en la sala animan cada una a su ritmo.
  // Entra si su prioridad es mayor o igual a la que suena y no es la misma; enfriamiento de 0.6 s contra toques repetidos.
  // ALV manda la prioridad (src/app/animaciones.ts); sin ella se usa esta tabla. Al terminar avisa {tipo:"termino"}.
  const PRIO = { espera: 0, saludar: 1, punto: 1, victoria: 1, derrota: 1, bailar: 1, especial: 2 };
  const ENFRIAR = 0.6, DUR_SALUDO = 2.5;
  const tallaDe = e => GestosALV.talla(EDITOR ? "normal" : e.tallaMeta || e.tallaBase);
  // Perillas genéricas (las usa ALV para la vida automática de un perfil; el motor no sabe de perfiles):
  //   vel: velocidad de esta animación · int: intensidad (escala la pose hacia la postura neutral)
  //   dur: segundos para una animación en bucle: la hace ese tiempo y vuelve al reposo.
  const acotar = (v, a, b, d) => (Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d);
  function momento(id, cual, prio, op) {
    const e = figuras.get(String(id)); if (!e) return;
    op = op || {};
    const t = reloj.getElapsedTime(), p = Number.isFinite(prio) ? prio : PRIO[cual] != null ? PRIO[cual] : 1;
    const sonando = (e.prio || 0) > 0 && t < e.hasta;
    if ((sonando && (p < e.prio || e.cual === cual)) || t - (e.ultG == null ? -9 : e.ultG) < ENFRIAR) { enviar({ tipo: "gesto", id: e.id, cual, ok: false }); return; }
    if (e.espEst) terminarEspecial(e, t);
    const fin = (dur, m) => { e.prio = p; e.cual = cual; e.ultG = t; e.hasta = t + dur; enviar({ tipo: "gesto", id: e.id, cual, ok: true, mom: m, dur }); };
    // Fase 5: la figura nueva traduce el momento a una de sus seis lógicas (logicas.js; Codex D4). Mismo contrato:
    // prioridad, enfriamiento, «gesto» y, al terminar, «termino». Lo que no tiene lógica propia no suena.
    if (e.v3) {
      e.accion = null;
      const Lg = window.LogicasALV, l = cual === "espera" ? "reposo" : Lg ? Lg.logicaDe(cual) : "reposo";
      if (l === "reposo") {
        if (cual === "espera") { e.v3.tocar("reposo"); e.prio = 0; e.cual = null; e.hasta = 0; }
        else enviar({ tipo: "gesto", id: e.id, cual, ok: false });
        return;
      }
      const vel = Lg && Lg.velocidadClip ? Lg.velocidadClip(op.vel) : 1; // clips del juego: siempre a velocidad 1
      // Vida automática (personalidad): a veces usa un clip propio del personaje de esa misma lógica (CHEER, CLAP, Shrug…)
      // para que no repita siempre el mismo.
      const propios = p <= 0.5 && Lg ? ((e.v3.obj.userData.plano && e.v3.obj.userData.plano.vida) || []).filter(c => Lg.logicaDe(c) === l) : [];
      const clip = propios.length && Math.random() < 0.5 ? propios[Math.floor(Math.random() * propios.length)] : l;
      if (!(clip !== l && e.v3.tocar(clip, { vel })) && !e.v3.tocar(l, { vel })) { enviar({ tipo: "gesto", id: e.id, cual, ok: false }); return; }
      fin(Math.max(0.5, e.v3.duracion(e.v3.estado().clip) / vel), l);
      return;
    }
    // Saludar: la mano libre, una vez, encima de la espera.
    if (cual === "saludar") { e.saluda = t; fin(DUR_SALUDO, "saludar"); return; }
    let m;
    if (cual === "especial") m = e.esp ? e.esp.anim : "baile";
    else m = e.momentos[cual === "bailar" ? "" : cual] || (cual === "bailar" ? "vuelta-rapida" : Momentos.info(cual) ? cual : null) || (cual === "espera" ? "respirar" : null);
    if (!m || !Momentos.info(m)) { enviar({ tipo: "gesto", id: e.id, cual, ok: false }); return; }
    cambio(e, t);
    e.mom = m; e.t0 = t;
    const i = Momentos.info(m);
    e.velMom = acotar(op.vel, 0.5, 1.6, 1); e.intMom = acotar(op.int, 0.4, 1.4, 1); e.durMom = 0;
    if (cual === "especial" && e.esp) e.espEst = { en: false, vuelve: false };
    if (i.bucle && op.dur > 0) { e.durMom = acotar(op.dur, 0.5, 20, 3); fin(e.durMom, m); return; }
    if (i.bucle) { e.prio = 0; e.cual = null; e.hasta = 0; return; }
    fin(i.dur / (tallaDe(e).vel * e.velMom * (e.velBase || 1)), m);
  }
  // Especial: a su tiempo cambia una pieza (cara, pelo, capa) o la talla, y al final todo vuelve como estaba.
  // Solo cambia la figura dibujada, nunca la guardada del jugador.
  function avanzarEspecial(e, t, el) {
    const s = e.espEst, x = e.esp; if (!s || !x) return;
    if (!s.en && el >= x.en && (x.cambia || x.pieza)) {
      s.en = true;
      const pos = e.obj.position; polvo(t, pos.x, pos.z);
      if (x.cambia && x.cambia.talla) e.tallaMeta = x.cambia.talla;
      if (x.pieza) ponerPieza(e, x.pieza, true);
    }
    if (s.en && !s.vuelve && x.vuelve > x.en && el >= x.vuelve) { s.vuelve = true; const pos = e.obj.position; polvo(t, pos.x, pos.z); quitarCambios(e); }
  }
  function ponerPieza(e, pz, si) {
    const J = e.obj.userData.j;
    if (pz.ocultar === "cabello" && J.hairG) J.hairG.visible = !si;
    if (pz.ocultar === "capa" && J.cape) J.cape.visible = !si;
    if (pz.rostro) {
      const c = caraDe(e); if (!c) return;
      if (si) { try { if (!c.especial) c.especial = conImagen(c.base, caraConPiel(pz.rostro, e)); c.malla.material.map = c.especial; e.caraFija = true; } catch (err) { console.error("escena: cara del especial", err); } }
      else { c.malla.material.map = c.base; c.hasta = 0; e.caraFija = false; }
    }
  }
  // La cara es una calcomanía transparente sobre la cabeza. Con careta la cabeza es del color de la careta: se pinta
  // primero la piel de la persona (la forma de la careta abierta) y encima la cara nueva, en el lienzo de 512×256 de drawFace.
  function caraConPiel(rostro, e) {
    const cara = drawFace(rostro, Object.assign({}, e.plano, e.pielReal ? { piel: e.pielReal } : {}));
    if (!e.pielReal) return cara;
    const cv = document.createElement("canvas"); cv.width = cara.width; cv.height = cara.height;
    const g = cv.getContext("2d"), k = cara.width / 512;
    g.setTransform(k, 0, 0, k * cara.height / 256 / (cara.width / 512), 0, 0);
    g.fillStyle = e.pielReal; g.beginPath(); g.moveTo(170, 20); g.lineTo(342, 20); g.lineTo(336, 170);
    g.quadraticCurveTo(300, 250, 256, 252); g.quadraticCurveTo(212, 250, 176, 170); g.closePath(); g.fill();
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(cara, 0, 0);
    return cv;
  }
  function quitarCambios(e) { if (e.esp && e.esp.pieza) ponerPieza(e, e.esp.pieza, false); e.tallaMeta = e.tallaBase; }
  function terminarEspecial(e, t) { if (e.espEst && e.espEst.en && !e.espEst.vuelve) { const pos = e.obj.position; polvo(t, pos.x, pos.z); } quitarCambios(e); e.espEst = null; }
  // Personalidad de la talla encima de la pose: brincos, giros de brazos y tamaño (el tamaño se acerca suave).
  function aplicarTalla(e, tl, dt) {
    const J = e.obj.userData.j, R = J.root;
    if (R.position.y > 0) R.position.y *= tl.salto;
    if (tl.brazos !== 1) { J.armR.rotation.x *= tl.brazos; J.armL.rotation.x *= tl.brazos; }
    const meta = tl.escala, k = Math.min(1, dt * 5);
    if (!e.esc) e.esc = meta.slice();
    e.esc[0] += (meta[0] - e.esc[0]) * k; e.esc[1] += (meta[1] - e.esc[1]) * k;
    R.scale.set(e.esc[0], e.esc[1], e.esc[0]);
  }
  // Cuánto puede crecer alguna figura (su talla o la de su especial): la cámara deja ese aire arriba.
  const crecer = () => { let m = 1; figuras.forEach(e => { m = Math.max(m, GestosALV.talla(e.tallaBase).escala[1], e.esp && e.esp.cambia ? GestosALV.talla(e.esp.cambia.talla).escala[1] : 1); }); return EDITOR ? 1 : m; };

  // Objetos en la mano: ese brazo no sube más allá del hombro en ningún momento (festejos, derrotas, esperas),
  // así la espada, el escudo o la escoba no atraviesan la cabeza. Festeja con el otro brazo y con el cuerpo.
  // armR lleva el objeto de la derecha (accesorio) y armL el de la izquierda (accesorioIzq). Varita y taza son chicas.
  // Todos los objetos: también los chicos (taza, varita) se metían en la cabeza al subir el brazo.
  const grande = v => !!v && v !== "ninguno";
  const TOPE_BRAZO = -0.85; // ≈ 50° hacia el frente: la hoja de la espada no llega a la cara
  function cuidarObjetos(obj, plano) {
    const J = obj.userData.j, p = plano || {}; if (!J) return;
    if (grande(p.accesorio) && J.armR && J.armR.rotation.x < TOPE_BRAZO) J.armR.rotation.x = TOPE_BRAZO;
    if (grande(p.accesorioIzq) && J.armL && J.armL.rotation.x < TOPE_BRAZO) J.armL.rotation.x = TOPE_BRAZO;
  }

  // HUB: cada 7 s la figura saluda (sube suave, saluda 1.6 s y baja) y voltea un poco a la cámara.
  // Saluda con la mano libre: con un objeto en la mano (escudo, escoba…) el brazo arriba lo metía en la cabeza.
  // armL lleva el objeto de la izquierda (accesorioIzq) y armR el de la derecha (accesorio); con las dos ocupadas solo voltea.
  const libre = v => !v || v === "ninguno";
  // El saludo de los juegos: el brazo sube de lado (no al frente) y se mece de un lado a otro, la cabeza se ladea hacia
  // la mano, el cuerpo se carga al otro lado y da un rebotito al empezar.
  function saludo(e, t) {
    const obj = e.obj, J = obj.userData.j, p = e.plano || {}; if (!J) return;
    const c = t % 7, sube = c < 0.4 ? c / 0.4 : c < 2.1 ? 1 : c < 2.5 ? 1 - (c - 2.1) / 0.4 : 0;
    const k = sube * sube * (3 - 2 * sube);
    e.saludoK = k;
    if (k <= 0) return;
    const lado = libre(p.accesorioIzq) ? "L" : libre(p.accesorio) ? "R" : null;
    const V = J.vida, sg = lado && V ? V["lado" + lado] : 1, mece = Math.sin(t * 10) * (c > 0.3 && c < 2.2 ? 1 : 0.3);
    if (lado) {
      const brazo = J["arm" + lado], muneca = J["wrist" + lado];
      brazo.rotation.x += (-2.35 - brazo.rotation.x) * k;
      brazo.rotation.z += (sg * (0.42 + mece * 0.3) - brazo.rotation.z) * k;
      muneca.rotation.y += (mece * 0.35 - muneca.rotation.y) * k;
    }
    J.head.rotation.y += ((sg > 0 ? 0.28 : -0.28) - J.head.rotation.y) * k;
    J.head.rotation.z += (-sg * 0.14 - J.head.rotation.z) * k;
    e.lz += -sg * 0.07 * k; e.lx += -0.03 * k;
    J.root.position.y += Math.max(0, Math.sin(Math.min(1, c / 0.45) * Math.PI)) * 0.05;
  }

  // ---------- Vida: postura de juego, peso, mirada y transiciones ----------
  // Una minifigura real solo gira en 7 ejes y por eso se ve tiesa. Los juegos de bloques hacen trampa para darle vida:
  // el torso se inclina en la cintura, los brazos se abren hacia los lados y las piernas se separan. Todo se suma
  // encima de la pose del momento (08-poses.js la recalcula en cada cuadro); nucleo/momentos.js no cambia.
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _eu = new THREE.Euler();
  function prepararVida(obj) {
    const J = obj.userData.j; if (!J || !J.torso || J.vida) return;
    obj.updateMatrixWorld(true); // recién armada: la figura está en el origen, sin giro
    const xMundo = o => o.getWorldPosition(_v).x;
    const centro = o => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    const malla = J.torso.children.find(o => o.isMesh);
    const cintura = new THREE.Vector3(0, malla ? new THREE.Box3().setFromObject(malla).min.y : 1.2, 0);
    J.torso.parent.worldToLocal(cintura);
    const V = { cintura, p0: J.torso.position.clone(), q0: J.torso.quaternion.clone(),
      ladoR: J.mountR ? (xMundo(J.mountR) >= 0 ? 1 : -1) : 1, ladoL: J.mountL ? (xMundo(J.mountL) >= 0 ? 1 : -1) : -1,
      piernaR: 1, piernaL: -1, largo: 0.7, pie: 0.25 };
    if (J.piernasArt && J.legR && J.legL) {
      V.piernaR = centro(J.legR).x >= 0 ? 1 : -1; V.piernaL = -V.piernaR;
      const cj = new THREE.Box3().setFromObject(J.legR), s = cj.getSize(new THREE.Vector3());
      V.largo = Math.max(0.3, J.legR.getWorldPosition(_v).y - cj.min.y); V.pie = s.x / 2;
    }
    // Medio ancho de la cabeza: cuánto se hunde su borde de abajo en el cuello al ladearla (ver cuidarCuello).
    const mc = J.head && J.head.children.find(o => o.isMesh);
    V.radioCabeza = mc ? new THREE.Box3().setFromObject(mc).getSize(new THREE.Vector3()).x / 2 : 0.3;
    J.vida = V;
  }
  // Como en una minifigura real, la cabeza SOLO gira a los lados sobre el cuello (pedido de Elías): sin ladearse,
  // sin asentir y sin subir. Cualquier inclinación que pidan el saludo, la mirada o un gesto se anula aquí, al final
  // del cuadro; mirar arriba o abajo lo hace el torso (reaccionAzotea).
  function cuidarCuello(J) {
    if (!J || !J.head || J.headY == null) return;
    J.head.rotation.x = 0; J.head.rotation.z = 0;
    J.head.position.y = J.headY;
  }
  // Inclina el torso (con brazos, cabeza y capa) alrededor de la cintura. lx > 0 = hacia el frente.
  function inclinar(J, lx, lz) {
    const V = J.vida; if (!V) return;
    _eu.set(lx, 0, lz); _q.setFromEuler(_eu);
    J.torso.quaternion.copy(V.q0).premultiply(_q);
    J.torso.position.copy(V.p0).sub(V.cintura).applyQuaternion(_q).add(V.cintura);
  }
  // Postura de juego: piernas un poco abiertas y brazos separados del cuerpo (también en las fotos).
  const POSTURA = { pierna: 0.075, brazo: 0.13 };
  function postura(J, extraPierna, extraBrazoR, extraBrazoL) {
    const V = J.vida; if (!V) return;
    if (J.armR) J.armR.rotation.z += V.ladoR * (POSTURA.brazo + (extraBrazoR || 0));
    if (J.armL) J.armL.rotation.z += V.ladoL * (POSTURA.brazo + (extraBrazoL || 0));
    if (J.piernasArt) {
      const a = POSTURA.pierna + (extraPierna || 0);
      J.legR.rotation.z += V.piernaR * a; J.legL.rotation.z += V.piernaL * a;
      // Al abrirlas, el borde de adentro del pie baja: la figura sube un poco para no hundirse en el piso.
      J.root.position.y += Math.max(0, V.pie * Math.sin(a) - V.largo * (1 - Math.cos(a)));
    }
  }
  // Movimiento de reposo: cambio de peso de un pie al otro, respiración y la mirada que busca cosas.
  function reposo(e, t, dt, tl) {
    const J = e.obj.userData.j, V = J.vida; if (!V || MENOS_MOVIMIENTO) return;
    const f = e.fase, amp = (EDITOR ? 0.5 : 1) * (tl ? tl.reposo : 1);
    // Pequeños: de vez en cuando un saltito en su lugar.
    if (tl && tl.saltitos) { const ph = (t + f) % 4.2; if (ph < 0.34) { const k = ph / 0.34; J.root.position.y += 4 * k * (1 - k) * 0.09; } }
    const w = Math.sin(t * 0.75 + f), d = w * 0.035 * amp;
    J.root.position.x += d;
    if (J.piernasArt) { const a = -d / V.largo; J.legR.rotation.z += a; J.legL.rotation.z += a; }
    e.lz += -w * 0.045 * amp;
    const b = Math.sin(t * 1.7 + f * 2);
    e.lx += b * 0.018 * amp;
    J.armR.rotation.x += b * 0.035; J.armL.rotation.x += b * 0.035;
    J.armR.rotation.z += V.ladoR * (b * 0.5 + 0.5) * 0.03; J.armL.rotation.z += V.ladoL * (b * 0.5 + 0.5) * 0.03;
    // Mirada: cada 1.5–4.5 s elige a dónde ver (a veces a la cámara) y gira rápido, con un resorte que frena solo.
    if (e.mom !== "respirar" || EDITOR) return;
    const m = e.mira;
    if (t > m.prox) { m.meta = Math.random() < 0.4 ? 0 : (Math.random() * 2 - 1) * 0.6; m.inc = (Math.random() * 2 - 1) * 0.08; m.prox = t + 1.5 + Math.random() * 3; }
    // Resorte en pasos cortos: con cuadros lentos (dt de 0.1 s, celular a 30 cuadros, pestaña que vuelve) un solo paso
    // se volvía inestable y la cabeza giraba sin fin (la figura terminaba volteada).
    const w0 = 13, pasos = Math.max(1, Math.ceil(dt / 0.016)), h = dt / pasos;
    for (let i = 0; i < pasos; i++) { m.v += (w0 * w0 * (m.meta - m.y) - 2 * w0 * m.v) * h; m.y += m.v * h; }
    if (!Number.isFinite(m.y) || Math.abs(m.y) > 1.2) { m.y = m.meta; m.v = 0; }
    J.head.rotation.y = m.y; J.head.rotation.z = m.inc * 0.6 - m.y * 0.12;
    e.lz += m.y * 0.03; // el cuerpo acompaña un poco la mirada
  }
  // Reacciones a la pose: en el aire las piernas se abren; con los brazos arriba, abren en «V» como en los festejos.
  function reacciones(e) {
    const J = e.obj.userData.j, V = J.vida; if (!V) return;
    const aire = Math.min(1, Math.max(0, J.root.position.y - 0.04) / 0.3);
    const arriba = x => Math.min(1, Math.max(0, (-x - 1.6) / 1.1));
    const sal = e.saludoK > 0.05;
    postura(J, aire * 0.14, sal ? 0 : arriba(J.armR.rotation.x) * 0.32, sal ? 0 : arriba(J.armL.rotation.x) * 0.32);
    e.lx += aire * -0.05;
  }
  // Transiciones: al cambiar de momento la figura no salta de pose, se mezcla 0.35 s desde donde estaba.
  const MEZCLA = 0.35;
  function leer(J, e) {
    const r = J.root;
    return [J.head.rotation.y, J.head.rotation.z, J.armR.rotation.x, J.armR.rotation.z, J.armL.rotation.x, J.armL.rotation.z,
      J.wristR.rotation.y, J.wristL.rotation.y, J.legR ? J.legR.rotation.x : 0, J.legR ? J.legR.rotation.z : 0, J.legL ? J.legL.rotation.x : 0, J.legL ? J.legL.rotation.z : 0,
      r.position.x, r.position.y, r.position.z, r.rotation.x, r.rotation.y, r.rotation.z, e.lx, e.lz];
  }
  function escribir(J, e, a) {
    const r = J.root;
    J.head.rotation.y = a[0]; J.head.rotation.z = a[1]; J.armR.rotation.x = a[2]; J.armR.rotation.z = a[3]; J.armL.rotation.x = a[4]; J.armL.rotation.z = a[5];
    J.wristR.rotation.y = a[6]; J.wristL.rotation.y = a[7];
    if (J.piernasArt) { J.legR.rotation.x = a[8]; J.legR.rotation.z = a[9]; J.legL.rotation.x = a[10]; J.legL.rotation.z = a[11]; }
    r.position.set(a[12], a[13], a[14]); r.rotation.set(a[15], a[16], a[17]); e.lx = a[18]; e.lz = a[19];
  }
  const ANGULO = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17]);
  function mezclar(e, t) {
    const J = e.obj.userData.j, cur = leer(J, e);
    const k = e.snap ? Math.min(1, (t - e.tCambio) / MEZCLA) : 1;
    if (k < 1) {
      const s = k * k * (3 - 2 * k);
      for (let i = 0; i < cur.length; i++) {
        let d = cur[i] - e.snap[i];
        if (ANGULO.has(i)) d = Math.atan2(Math.sin(d), Math.cos(d)); // el camino corto (tras una vuelta completa no regresa girando)
        cur[i] = e.snap[i] + d * s;
      }
      escribir(J, e, cur);
    } else e.snap = null;
    e.ult = cur;
  }
  function cambio(e, t) { if (e.ult) { e.snap = e.ult.slice(); e.tCambio = t; } }
  // Intensidad: escala la pose recién aplicada hacia la postura neutral (1 = sin cambio). Genérica: vale para
  // cualquier animación, no sabe de perfiles.
  function intensidad(J, k) {
    if (k === 1 || !J) return;
    J.head.rotation.y *= k; J.armR.rotation.x *= k; J.armL.rotation.x *= k; J.wristR.rotation.y *= k; J.wristL.rotation.y *= k;
    if (J.piernasArt) { J.legR.rotation.x *= k; J.legL.rotation.x *= k; }
    J.root.position.y *= k; J.root.position.z *= k; J.root.rotation.x *= k; J.root.rotation.y *= k;
  }
  // Reposo de la figura: el que manda ALV (perfil) si existe; si no, el de su paquete de momentos; si no, respirar.
  function esperaDe(e) { return e.esperaPerfil || e.momentos.espera || "respirar"; }

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
    cuello_frente: { y: 1.7, alto: 1.6, giro: -0.45 },
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
    // Retratos de ALV (tarjeta de esquina y burbujas): pecho, hombros y cabeza con lo más alto de un casco.
    busto: { y: 2.16, alto: 1.85, giro: -0.22 },
  };
  // Altura de la articulación de la cabeza en una figura de piernas normales (para centrar el busto).
  const CABEZA_Y = 2.4;
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
    if (e.caraFija) return; // un especial tiene puesta otra cara
    const c = caraDe(e);
    if (c && c.hasta && t > c.hasta) { c.malla.material.map = c.base; c.hasta = 0; }
    if (t > e.parpadeo) { if (!(c && c.hasta)) gesto(e, "parpadeo", t); e.parpadeo = t + 2.4 + Math.random() * 3.2; }
    if (t > e.sonrisa) { gesto(e, "sonrisa", t); e.sonrisa = t + 9 + Math.random() * 7; e.parpadeo = Math.max(e.parpadeo, t + 1.8); }
  }

  // Polvo de cómic al cambiar una pieza (solo en el personalizador): puntitos blancos y amarillos que salen y se apagan.
  const MENOS_MOVIMIENTO = Q.get("quieto") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const texPolvo = (function () { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const g = cv.getContext("2d");
    g.fillStyle = "#0b0f24"; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(32, 32, 22, 0, 7); g.fill();
    return new THREE.CanvasTexture(cv); })();
  const polvos = [];
  function polvo(t, ox, oz) {
    if (MENOS_MOVIMIENTO) return;
    ox = ox || 0; oz = oz || 0;
    const n = 16, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, y = 0.3 + Math.random() * 2.2;
      pos.set([ox + Math.cos(a) * 0.45, y, oz + Math.sin(a) * 0.45 + 0.3], i * 3);
      vel.push([Math.cos(a) * (0.9 + Math.random()), (Math.random() - 0.3) * 0.8, Math.sin(a) * 0.6]);
      const c = Math.random() < 0.5 ? [1, 1, 1] : [1, 0.82, 0.25]; col.set(c, i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.16, map: texPolvo, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.05 });
    const p = new THREE.Points(geo, mat); scene.add(p); polvos.push({ p, vel, t0: t });
  }
  function moverPolvo(t, dt) {
    for (let i = polvos.length - 1; i >= 0; i--) {
      const x = polvos[i], e = t - x.t0, pos = x.p.geometry.attributes.position;
      const vida = x.vida || 0.55;
      if (e > vida) { scene.remove(x.p); x.p.geometry.dispose(); x.p.material.dispose(); polvos.splice(i, 1); continue; }
      for (let k = 0; k < x.vel.length; k++) { pos.array[k * 3] += x.vel[k][0] * dt; pos.array[k * 3 + 1] += x.vel[k][1] * dt; pos.array[k * 3 + 2] += x.vel[k][2] * dt; }
      pos.needsUpdate = true; x.p.material.opacity = (x.opacidad || 1) * (1 - e / vida); x.p.material.size = (x.tam || 0.16) + e * (x.crece || 0.25);
    }
  }

  /** Nube de humo de la transformación: más grande y lenta que el polvo, gris claro con chispas verdes o doradas. */
  function nube(t, ox, oz, alto, chispa) {
    if (MENOS_MOVIMIENTO) return;
    const n = 46, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.2 + Math.random() * 0.5, y = Math.random() * alto;
      pos.set([ox + Math.cos(a) * r, y, oz + Math.sin(a) * r * 0.7 + 0.25], i * 3);
      vel.push([Math.cos(a) * (0.5 + Math.random() * 0.7), 0.25 + Math.random() * 0.6, Math.sin(a) * 0.4]);
      const g = 0.82 + Math.random() * 0.18, c = Math.random() < 0.18 ? chispa : [g, g, g * 1.02];
      col.set(c, i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.5, map: texPolvo, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.02 });
    const p = new THREE.Points(geo, mat); scene.add(p); polvos.push({ p, vel, t0: t, vida: 0.95, tam: 0.5, crece: 0.9, opacidad: 0.95 });
  }
  /**
   * Cambia la figura nueva de `e` por la de `p3` sin pasar por la de respaldo: la otra se arma aparte y, cuando está lista
   * (y terminó la especial si `conEspecial`), nube de humo y cambio. false si no hay motor nuevo (se arma como siempre).
   */
  function transformarV3(e, p3, h, conEspecial) {
    const gen = (e.gen3 = ++V3.gen);
    // Antes del cambio la figura tiembla y crece un poco (Banner más largo: se está transformando). La animación del juego
    // TRANSFORM_TO_BIGFIG de Banner no sirve aquí: esconde sus piezas esperando las de Hulk y se ve rota (prueba 27 nov).
    const t0 = reloj.getElapsedTime(), dur = conEspecial ? 1.3 : 0.6, hasta = t0 + dur;
    const cuerpo = e.v3.obj, esc0 = cuerpo.scale.x, x0 = cuerpo.position.x;
    e.prio = 9; e.cual = "transformar"; e.hasta = hasta + 0.5; // nadie la interrumpe
    if (conEspecial) e.v3.tocar("victoria");
    { const pos = e.obj.position; nube(t0, pos.x, pos.z, 1.2, conEspecial ? [0.55, 0.95, 0.35] : [1, 0.85, 0.3]); }
    e.trHuella = h;
    const temblar = () => {
      if (figuras.get(e.id) !== e || e.gen3 !== gen || e.v3.obj !== cuerpo) return;
      const k = Math.min(1, (reloj.getElapsedTime() - t0) / dur);
      cuerpo.scale.setScalar(esc0 * (1 + 0.14 * k));
      cuerpo.position.x = x0 + Math.sin(reloj.getElapsedTime() * 55) * 0.035 * k;
      if (k < 1) setTimeout(temblar, 30);
    };
    temblar();
    motorV3().then(M => M.crear(p3)).then(inst => new Promise(ok => {
      const espera = () => (reloj.getElapsedTime() >= hasta ? ok(inst) : setTimeout(espera, 50));
      espera();
    })).then(inst => {
      if (figuras.get(e.id) !== e || e.gen3 !== gen) { inst.quitar(); return; } // llegó otra cosa mientras
      cuerpo.scale.setScalar(esc0); cuerpo.position.x = x0;
      const t = reloj.getElapsedTime(), viejo = e.obj, alto0 = e.v3.alto();
      const grupo = new THREE.Group();
      grupo.add(inst.obj);
      const alto = inst.alto(), TOPE = 3.4;
      if ((SALA || NAVE || AZOTEA) && !/[?&]bigfig=real/.test(location.search) && alto > TOPE) inst.obj.scale.multiplyScalar(TOPE / alto);
      inst.obj.traverse(o => { if (o.isMesh) o.receiveShadow = false; });
      const sombra = new THREE.Mesh(sombraGeo, sombraMat); sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.003; grupo.add(sombra);
      grupo.position.copy(viejo.position); grupo.rotation.copy(viejo.rotation); grupo.scale.copy(viejo.scale); grupo.visible = viejo.visible;
      scene.remove(viejo); e.v3.quitar();
      e.obj = grupo; e.v3 = inst; e.huella = h; e.trHuella = null;
      scene.add(grupo);
      inst.tocar("reposo", { mezcla: 0 });
      e.prio = 0; e.cual = null; e.hasta = 0; e.accion = null;
      aplicarCareta(e);
      const esGrande = p3.familia === "bigfig";
      nube(t, grupo.position.x, grupo.position.z, Math.max(alto0, Math.min(TOPE, alto)) * grupo.scale.y, esGrande ? [0.55, 0.95, 0.35] : [1, 0.85, 0.3]);
      acomodar();
      enviar({ tipo: "transformo", id: e.id, ok: true });
    }).catch(err => {
      console.warn("escena: no se pudo transformar", e.id, err);
      cuerpo.scale.setScalar(esc0); cuerpo.position.x = x0;
      if (figuras.get(e.id) === e) { e.trHuella = null; e.huella = "x"; } // la próxima lista la arma como siempre
      enviar({ tipo: "transformo", id: e.id, ok: false });
    });
    return true;
  }

  let antes = 0;
  // ---------- Fase 5: figuras del sistema de personajes nuevo (ALV_PLAN_FASE5.md; arquitectura de Codex, fase5-r1) ----------
  // Llegan en «figuras» como {id, figura (v2 de respaldo), plano3}. Primero se arma la v2 como siempre; cuando el GLB
  // carga, se cambia por la nueva dentro de un GRUPO EXTERIOR (las transformaciones de la escena —posición, llegada,
  // teletransporte— van al grupo y no rompen la escala propia del GLB). El motor nuevo (GLTFLoader, SkeletonUtils,
  // logicas.js y motor-personajes.js) se carga solo la primera vez que llega una figura nueva: con la bandera apagada,
  // ninguna escena pide esos archivos. Una carga que llega tarde (la figura cambió, el jugador salió) se descarta.
  const V3 = { cargando: null, gen: 0 };
  const URL_OK = /^(https?:)?\/\/|^\//;
  function planoV3(p) {
    if (!p || typeof p !== "object" || typeof p.id !== "string" || typeof p.glb !== "string" || !URL_OK.test(p.glb)) return null;
    if (!(Number(p.escala) > 0) || !p.clips || typeof p.clips !== "object") return null;
    if (p.poderes != null) p.poderes = Array.isArray(p.poderes) ? p.poderes.slice(0, 8).filter(x => x && typeof x.id === "string" && /^[a-z][a-z0-9-]{0,23}$/.test(x.id)
      && typeof x.glb === "string" && URL_OK.test(x.glb) && typeof x.clip === "string" && x.clip.length <= 80)
      .map(x => ({ id: x.id, glb: x.glb, clip: x.clip, hasta: Number(x.hasta) > 0 ? Math.min(20, Number(x.hasta)) : 0, bucle: Number(x.bucle) > 0 ? Math.min(20, Number(x.bucle)) : 0, efectos: Array.isArray(x.efectos) ? x.efectos.slice(0, 3).filter(f => f && typeof f === "object" && typeof f.tipo === "string") : [] })) : [];
    // Sets de movimientos (27 nov): mismos campos que un poder, sin efectos.
    if (p.movs != null) p.movs = Array.isArray(p.movs) ? p.movs.slice(0, 64).filter(x => x && typeof x.id === "string" && /^[a-z][a-z0-9-]{0,23}$/.test(x.id)
      && typeof x.glb === "string" && URL_OK.test(x.glb) && typeof x.clip === "string" && x.clip.length <= 80)
      .map(x => ({ id: x.id, glb: x.glb, clip: x.clip, hasta: 0, bucle: 0, efectos: [],
        sonidos: Array.isArray(x.sonidos) ? x.sonidos.slice(0, 8).filter(z => z && typeof z.cual === "string" && /^[a-z][a-z0-9-]{0,23}$/.test(z.cual)
          && Number(z.t) >= 0 && Number(z.t) <= 10).map(z => ({ cual: z.cual, t: Number(z.t) })) : [] })) : [];
    return p;
  }
  // Poderes (Elías, 27 nov 2026): el clip del GLB «poderes» del personaje y sus efectos (efectos.js). Prioridad de especial:
  // no lo corta la vida automática ni un gesto menor. Avisa {tipo:"poder", id, poder, ok, dur}.
  function poder(id, cual) {
    const e = figuras.get(String(id)), t = reloj.getElapsedTime();
    const no = () => enviar({ tipo: "poder", id: String(id), poder: String(cual), ok: false });
    if (!e || !e.v3 || NAVE) return no();
    const pl = e.v3.obj.userData.plano, pd = pl && ((pl.poderes || []).find(x => x.id === cual) || (pl.movs || []).find(x => x.id === cual));
    // Lo que pide el jugador corta la vida automática y los gestos menores (prioridad 1); un especial, otro poder o una
    // transformación no se cortan.
    if (!pd || ((e.prio || 0) >= 2 && t < e.hasta) || t < (e.poderHasta || 0)) return no();
    const inst = e.v3;
    e.poderHasta = t + 1; e.prio = 2; e.cual = "poder"; e.hasta = t + 1; e.accion = null;
    inst.tocarExt(pd.glb, pd.clip, { hasta: pd.hasta, bucle: pd.bucle }).then(dur => {
      if (e.v3 !== inst) return;
      const t1 = reloj.getElapsedTime(), largo = Math.max(dur || 0, ...pd.efectos.map(f => (Number(f.retraso) || 0) + (Number(f.dura) || 1)));
      e.prio = 2; e.cual = "poder"; e.hasta = t1 + largo; e.poderHasta = t1 + largo + 0.3; e.ultG = t1;
      const fx = window.EfectosALV;
      if (fx) pd.efectos.forEach(f => fx.lanzar(scene, { obj: inst.obj, hueso: inst.hueso }, f, { camara: camera, sonar: cual => enviar({ tipo: "sonido", id: e.id, cual }) }));
      // Movimientos: cada sonido en su segundo del clip (disparo, espadazo, golpe…), si el movimiento sigue.
      if (dur) (pd.sonidos || []).forEach(z => setTimeout(() => { if (e.v3 === inst && e.cual === "poder") enviar({ tipo: "sonido", id: e.id, cual: z.cual }); }, z.t * 1000));
      enviar({ tipo: "poder", id: e.id, poder: pd.id, ok: true, dur: largo });
    });
  }
  function motorV3() {
    if (window.MotorPersonajes) return Promise.resolve(window.MotorPersonajes);
    if (!V3.cargando) {
      const base = new URL("../personajes/", location.href).href;
      const js = src => new Promise((ok, mal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => mal(new Error("no cargó " + src)); document.head.appendChild(s); });
      V3.cargando = js("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js")
        .then(() => js("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js"))
        .then(() => js(base + "logicas.js")).then(() => js(base + "motor-personajes.js"))
        .then(() => js(base + "efectos.js").catch(() => {})) // poderes: sin efectos, el movimiento igual se ve
        .then(() => { if (!window.MotorPersonajes) throw new Error("falta MotorPersonajes"); return window.MotorPersonajes; });
      V3.cargando.catch(() => { V3.cargando = null; });
    }
    return V3.cargando;
  }
  // Azotea con el corte (&v3=1): el motor nuevo se pide desde el arranque, en paralelo, sin esperar a la figura.
  if (AZOTEA && Q.get("v3") === "1") motorV3().catch(() => {});
  function iniciarV3(e, p3) {
    const gen = (e.gen3 = ++V3.gen);
    motorV3().then(M => M.crear(p3)).then(inst => {
      if (figuras.get(e.id) !== e || e.gen3 !== gen || e.v3) { inst.quitar(); return; } // llegó tarde
      // Nave: el clip «sentado» declarado tiene que existir en el GLB ANTES de retirar la v2; si no, se queda el respaldo.
      if (NAVE && !inst.reposoEn(p3.sentado)) { inst.quitar(); enviar({ tipo: "v3", id: e.id, ok: false }); return; }
      const grupo = new THREE.Group();
      grupo.add(inst.obj);
      // Figuras grandes (Big Fig): en escenas con lugares (sala, nave, azotea) se topa su altura para que no invadan el
      // lugar de al lado ni se salgan del encuadre (?bigfig=real las deja a tamaño real; decisión de diseño pendiente).
      const alto = inst.alto(), TOPE = 3.4;
      // Decidió Codex (fase5-paso2-verif, b): tope 3.4 con escala uniforme, solo en sala, nave y azotea.
      if ((SALA || NAVE || AZOTEA) && !/[?&]bigfig=real/.test(location.search) && alto > TOPE) inst.obj.scale.multiplyScalar(TOPE / alto);
      // La figura nueva proyecta sombra pero no la recibe: a la escala de ALV, piezas escondidas dentro del GLB (la
      // entrepierna) dejaban rayas oscuras encima del torso (Elías, 2026-11-26).
      inst.obj.traverse(o => { if (o.isMesh) o.receiveShadow = false; });
      const sombra = new THREE.Mesh(sombraGeo, sombraMat); sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.003; grupo.add(sombra);
      grupo.position.copy(e.obj.position); grupo.rotation.copy(e.obj.rotation); grupo.scale.copy(e.obj.scale); grupo.visible = e.obj.visible;
      if (e.cara) { e.cara.malla.material.map = e.cara.base; [e.cara.parpadeo, e.cara.sonrisa, e.cara.especial].forEach(x => x && x.dispose()); e.cara = null; }
      scene.remove(e.obj); dispose(e.obj);
      e.obj = grupo; e.v3 = inst;
      scene.add(grupo);
      inst.tocar("reposo", { mezcla: 0 });
      aplicarCareta(e);
      // Nave: hasta dónde llegan los pies sentados a la altura del tablero (todo el bucle); acomodarNave() aleja la silla y la
      // figura lo justo para que no toquen la mesa (decidió Codex, sentado-r2: Big Fig, opción 2).
      // Además, el punto más bajo del cuerpo sobre la huella del asiento (cojín si queda en el aire) y el más alto (encuadre).
      if (NAVE && p3.familia === "bigfig") {
        const ms = inst.medirSentado(p3.sentado, grupo, { yMinPies: MESA_Y - 0.14 - PIES_HOLGURA_Y - SILLA_Y, huella: { x: 0.46, z0: -0.43, z1: 0.35 } });
        e.pies = ms && ms.pies; e.apoyo = ms && ms.apoyo; e.techo = ms && ms.techo;
      }
      // Si el respaldo estaba a media animación de un gesto, la nueva la sigue con su lógica y el tiempo que le quedaba
      // (mismo contrato: al vencer, «termino»; Codex, fase5-paso2-verif).
      const ahora = reloj.getElapsedTime();
      if (e.prio > 0 && e.cual && ahora < e.hasta) { const Lg = window.LogicasALV, l = Lg ? Lg.logicaDe(e.cual) : "reposo"; if (l !== "reposo") inst.tocar(l, { mezcla: 0 }); }
      else { e.prio = 0; e.cual = null; e.hasta = 0; }
      acomodar();
      window.__figurasV3 = figuras; // para revisar desde la consola (solo existe si llegó una figura nueva)
      if (AZOTEA) revelarAzotea(e, reloj.getElapsedTime());
      enviar({ tipo: "v3", id: e.id, ok: true });
    }).catch(err => {
      console.warn("escena: figura nueva sin cargar, se queda la de respaldo", e.id, err);
      if (AZOTEA && figuras.get(e.id) === e) revelarAzotea(e, reloj.getElapsedTime());
      enviar({ tipo: "v3", id: e.id, ok: false });
    });
  }
  /** La careta que manda ALV, revisada: nombres de malla, bisagra cerca del hueso y ángulo. null = cerrada. */
  function caretaValida(c) {
    if (!c || typeof c !== "object" || !Array.isArray(c.mallas) || !Array.isArray(c.bisagra) || c.bisagra.length !== 3) return null;
    const mallas = c.mallas.filter(n => typeof n === "string" && /^[\w.-]{1,64}$/.test(n)).slice(0, 8);
    const b = c.bisagra.map(Number);
    if (!mallas.length || !b.every(v => Number.isFinite(v) && Math.abs(v) < 1) || !Number.isFinite(c.angulo) || Math.abs(c.angulo) > 180) return null;
    return { mallas, bisagra: b, angulo: c.angulo };
  }
  /** Prepara (una vez por figura nueva) la bisagra de la careta y fija hacia dónde va: abierta si hay definición. */
  function aplicarCareta(e) {
    if (!e.v3) return;
    const def = e.caretaDef, inst = e.v3;
    if (!inst._careta && def) {
      const mallas = def.mallas.map(n => inst.obj.getObjectByName(n)).filter(Boolean), padre = mallas[0] && mallas[0].parent;
      if (!padre) return;
      const piv = new THREE.Object3D(); piv.position.set(def.bisagra[0], def.bisagra[1], def.bisagra[2]); padre.add(piv);
      mallas.forEach(m => { if (m.parent !== padre) return; m.position.sub(piv.position); piv.add(m); });
      inst._careta = { piv, ang: (def.angulo * Math.PI) / 180, k: 0, meta: 0 };
    }
    if (inst._careta) inst._careta.meta = def ? 1 : 0;
  }
  function animarV3(e, t, dt) {
    const ct = e.v3._careta;
    if (ct && ct.k !== ct.meta) {
      ct.k = ct.meta > ct.k ? Math.min(ct.meta, ct.k + dt / 0.5) : Math.max(ct.meta, ct.k - dt / 0.5);
      const u = ct.k * ct.k * (3 - 2 * ct.k); // suave al salir y al llegar
      ct.piv.rotation.x = ct.ang * u;
    }
    // La mirada se SUMA a la cabeza: antes de avanzar la animación se quita lo sumado en el cuadro anterior (si el clip
    // no mueve la cabeza, sumar cada cuadro la haría girar sin parar).
    const cab = e.v3.hueso("cabeza");
    if (cab && e.mirada) { cab.rotation.y -= e.mirada; e.mirada = 0; }
    e.v3.update(dt);
    // Termina el gesto: el motor vuelve solo a reposo; aquí se avisa como siempre.
    if (e.prio > 0 && t >= e.hasta) { enviar({ tipo: "termino", id: e.id, cual: e.cual }); e.prio = 0; e.cual = null; }
    if (AZOTEA) { giroAzoteaV3(e, dt); caidaAzotea(e, t); } // giro con inercia y caída de la llegada, en el grupo exterior
    // Azotea: voltea solo la cabeza de lado hacia donde mira ALV, con límite (Codex D4).
    // Misma mirada suavizada que la figura vieja (AZ.mira.ax con su peso w), con límite ±0.6 rad.
    if (AZOTEA && cab) { const m = AZ.mira, y = Math.max(-0.6, Math.min(0.6, m.ax * 0.55 * m.w)); if (Math.abs(y) > 1e-4) { cab.rotation.y += y; e.mirada = y; } }
    if (SALA && e.tele != null) {
      const d = (t - e.tele) / 0.9;
      if (d >= 1) { e.tele = null; e.obj.visible = true; e.obj.scale.setScalar(1); }
      else { const k = 1 - Math.pow(1 - Math.max(0, d), 3); e.obj.visible = d > 0.03; e.obj.scale.set(0.3 + 0.7 * k, Math.max(0.001, k), 0.3 + 0.7 * k); }
    }
  }
  // Giro del jugador con inercia y mirada de la azotea, sobre el grupo exterior (lo mismo que reaccionAzotea hace con la
  // figura vieja, sin sus poses de articulaciones).
  function giroAzoteaV3(e, dt) {
    const m = AZ.mira, a = AZ.acc, r = Math.min(1, dt * 7);
    m.w += ((m.activa ? 1 : 0) - m.w) * Math.min(1, dt * 5); m.ax += (m.x - m.ax) * r; m.ay += (m.y - m.ay) * r;
    if (Math.abs(AZ.vel) > 0.001) { AZ.usuario += AZ.vel * dt; AZ.vel *= Math.exp(-4 * dt); } else AZ.vel = 0;
    AZ.usuario = Math.atan2(Math.sin(AZ.usuario), Math.cos(AZ.usuario));
    const frente = Math.max(m.w, e.accion ? 1 : 0);
    e.obj.rotation.y = AZ_GIRO + AZ.usuario * (1 - frente) + m.ax * 0.5 * m.w;
    AZ.quieto = !L_activa() && !e.accion && m.w < 0.01 && AZ.vel === 0 && !(window.EfectosALV && window.EfectosALV.activos()) && !(e.cual === "poder" && reloj.getElapsedTime() < e.hasta);
    void a;
  }
  // Acciones breves de la azotea (al señalar botones): prioridad baja. No interrumpen un gesto que suena (ni su
  // enfriamiento) y `accion(null)` solo suelta la acción propia, nunca un gesto superior (Codex, fase5-paso2-verif).
  function accionV3(e, c) {
    const t = reloj.getElapsedTime();
    if ((e.prio || 0) > 0 && t < e.hasta) return;
    if (c == null) { if (e.accion) { e.accion = null; e.v3.tocar("reposo"); } return; }
    const a = { listo: "victoria", orgullo: "victoria", flexionar: "victoria", saludar: "saludo" }[c];
    const vida = (e.v3.obj.userData.plano && e.v3.obj.userData.plano.vida) || [];
    const clip = a || ((c === "mirarse" || c === "frotar") && vida[0]) || null;
    if (clip && e.accion !== c && e.v3.tocar(clip)) e.accion = c;
  }

  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!listo || document.hidden || AZ.pausa) return;
    // Azotea en pantalla táctil y en reposo: un cuadro sí y uno no (30 por segundo) para cuidar la batería.
    if (AZOTEA && TACTIL && AZ.quieto && (AZ.salto = !AZ.salto)) return;
    const t = reloj.getElapsedTime(), bruto = t - antes, dt = Math.min(0.1, bruto); antes = t;
    if (EDITOR) moverCamara(dt);
    moverPolvo(t, dt);
    figuras.forEach(e => {
      if (e.v3) { animarV3(e, t, dt); return; }
      const J = e.obj.userData.j; if (!J) return;
      const i = Momentos.info(e.mom), tl = tallaDe(e);
      // La talla cambia la velocidad (el reloj de la pose) y, en androide, la pose avanza a saltos como un robot.
      // El avance se suma cuadro a cuadro: si la talla cambia a media animación (Hulk crece), no brinca hacia atrás.
      const vel = tl.vel * (e.velMom || 1) * (e.velBase || 1);
      if (e.t0v !== e.t0) { e.t0v = e.t0; e.el = (t - e.t0) * vel; } else e.el += dt * vel;
      let el = e.el;
      if ((i && !i.bucle && el > i.dur + 0.4) || (e.durMom && t >= e.hasta)) {
        cambio(e, t); e.mom = esperaDe(e); e.t0 = t; e.t0v = t; e.el = 0; el = 0; e.velMom = 1; e.intMom = 1; e.durMom = 0;
        if (e.espEst) terminarEspecial(e, t);
        if (e.prio > 0 && e.cual !== "saludar") { enviar({ tipo: "termino", id: e.id, cual: e.cual }); e.prio = 0; e.cual = null; }
      }
      if (e.cual === "saludar" && t >= e.hasta) { enviar({ tipo: "termino", id: e.id, cual: "saludar" }); e.prio = 0; e.cual = null; }
      if (e.espEst) avanzarEspecial(e, t, el);
      e.lx = 0; e.lz = 0; e.saludoK = 0;
      window.MOM_T0 = 0; animar(e.obj, "mom:" + e.mom, tl.pasos ? Math.floor(el * tl.pasos) / tl.pasos : el);
      intensidad(J, (e.intBase || 1) * (e.intMom || 1));
      const enBucle = !(i && !i.bucle);
      if (enBucle && tl.reposo > 0) reposo(e, t, dt, tl);
      aplicarTalla(e, tl, dt);
      if (AZOTEA && enBucle && !AZ.acc.cual && !AZ.mira.activa && !AZ.llegada && t > AZ.saludo && e.saluda == null) { e.saluda = t; AZ.saludo = t + 11 + Math.random() * 5; }
      if (MODO === "hub" && enBucle) saludo(e, t);
      else if (e.saluda != null) { const d = t - e.saluda; if (d < 2.5) saludo(e, d); else e.saluda = null; }
      if (AZOTEA) { reaccionAzotea(e, t, dt); caidaAzotea(e, t); }
      reacciones(e);
      cuidarObjetos(e.obj, e.plano);
      mezclar(e, t);
      inclinar(J, e.lx, e.lz);
      cuidarCuello(J);
      if (NAVE) sentar(e);
      if (VUELO) volar(e, t);
      if (EDITOR) {
        e.obj.rotation.y = cam.giro;
        // Al cambiar una pieza, la figura da un saltito.
        const p = t - e.pop; e.obj.scale.setScalar(p < 0.45 ? 1 + Math.sin(p / 0.45 * Math.PI) * 0.07 * (1 - p / 0.45) : 1);
      }
      gestosSolos(e, t); // parpadea y sonríe sola en todas las escenas (HUB, sala, TV)
      if (SALA && e.tele != null) {
        const d = (t - e.tele) / 0.9;
        if (d >= 1) { e.tele = null; e.obj.visible = true; e.obj.scale.setScalar(1); }
        else { const k = 1 - Math.pow(1 - Math.max(0, d), 3); e.obj.visible = d > 0.03; e.obj.scale.set(0.3 + 0.7 * k, Math.max(0.001, k), 0.3 + 0.7 * k); }
      }
    });
    if (AZOTEA) animarAzotea(t);
    if (NAVE) { animarNave(t); cabezasNave(t); }
    medirContorno(renderer);
    renderer.render(scene, camera);
    if (AO.activo) dibujarAO();
    medirCalidad(t, bruto);
  }

  // Fotos: un dibujante aparte, con fondo transparente, sin tocar la escena viva.
  let fotografo = null;
  function fotografoDe() {
    if (!fotografo) {
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = renderer.toneMapping; r.toneMappingExposure = renderer.toneMappingExposure; r.setClearColor(0, 0);
      const s = new THREE.Scene(); s.environment = scene.environment;
      scene.children.filter(o => o.isLight).forEach(l => s.add(l.clone()));
      fotografo = { r, s, cam: new THREE.PerspectiveCamera(24, 1, 0.3, 40) };
    }
    return fotografo;
  }
  // Fase 5 (Codex, ajuste 7): foto de una figura nueva. Asíncrona (el GLB se baja la primera vez), con tiempo límite; si
  // falla, null y quien la pidió usa la v2 de respaldo. Pose de reposo al inicio del clip; mismo encuadre que las viejas:
  // «cuerpo» = la figura completa por su altura, «busto» = siguiendo la cabeza.
  // ?fotoms= acorta el plazo (pruebas de carga tardía); nunca más de 15 s.
  const FOTO_V3_MS = Math.min(15000, Math.max(1, Number(new URLSearchParams(location.search).get("fotoms")) || 15000));
  function fotoV3(p3, ancho, alto, zona) {
    ancho = Math.min(512, Math.max(64, ancho | 0 || 256)); alto = Math.min(640, Math.max(64, alto | 0 || 320));
    // Si vence el plazo y la figura llega después, se libera al llegar (Codex, paso3-r1).
    let vencida = false, reloj0 = 0;
    const creada = motorV3().then(M => M.crear(p3)).then(inst => { if (vencida) { inst.quitar(); throw new Error("llegó tarde"); } return inst; });
    const limite = new Promise((_, mal) => { reloj0 = setTimeout(() => { vencida = true; mal(new Error("tiempo límite")); }, FOTO_V3_MS); });
    return Promise.race([creada, limite]).then(inst => {
      clearTimeout(reloj0);
      try {
        const { r, s, cam } = fotografoDe();
        r.setSize(ancho, alto, false); cam.aspect = ancho / alto; cam.updateProjectionMatrix();
        inst.tocar("reposo", { mezcla: 0 }); inst.update(0);
        const o = inst.obj; o.rotation.y = zona === "busto" ? ZONAS.busto.giro : -0.35; s.add(o); o.updateMatrixWorld(true);
        // Encuadre por la caja real de la figura posada: que quepa de alto y de ancho (un Big Fig es más ancho que alto).
        const caja = new THREE.Box3().setFromObject(o), h = caja.max.y - caja.min.y, w = caja.max.x - caja.min.x;
        const tv = Math.tan(cam.fov * Math.PI / 360), th = tv * cam.aspect;
        // Busto: desde la punta de la cabeza hacia abajo (el 62 % de arriba en minifigura, como el «busto» de las viejas;
        // 50 % en Big Fig, que tiene la cabeza más chica y los hombros más altos).
        const fr = zona === "busto" ? (p3.familia === "bigfig" ? 0.5 : 0.62) : 1.16;
        const altoZ = h * fr, cy = zona === "busto" ? caja.max.y - altoZ * 0.44 : caja.min.y + h * 0.48;
        const anchoZ = zona === "busto" ? Math.min(w, altoZ) : w * 1.08;
        const dd = Math.max((altoZ / 2) / tv, (anchoZ / 2) / th);
        cam.position.set((caja.min.x + caja.max.x) / 2, cy + dd * 0.07, dd); cam.lookAt((caja.min.x + caja.max.x) / 2, cy, 0);
        medirContorno(r); r.render(s, cam);
        let url = r.domElement.toDataURL("image/webp", 0.85);
        if (!url.startsWith("data:image/webp")) url = r.domElement.toDataURL("image/png");
        return url;
      } finally { inst.quitar(); } // quitar() también la saca de la escena del fotógrafo
    }, err => { clearTimeout(reloj0); throw err; });
  }
  function foto(f, ancho, alto, zona, pose) {
    ancho = Math.min(512, Math.max(64, ancho | 0 || 256)); alto = Math.min(640, Math.max(64, alto | 0 || 320));
    const { r, s, cam } = fotografoDe();
    r.setSize(ancho, alto, false); cam.aspect = ancho / alto;
    const a = armar(f), z = zona && (typeof zona === "object" ? zona : ZONAS[zona]); window.MOM_T0 = 0; animar(a.obj, pose && Momentos.info(pose.mom) ? "mom:" + pose.mom : "quieto", pose ? +pose.t || 0 : 0); postura(a.obj.userData.j); cuidarObjetos(a.obj, a.plano); cuidarCuello(a.obj.userData.j); a.obj.rotation.y = z ? z.giro : -0.35; s.add(a.obj);
    if (z && z.mano) { // vista de revisión: la cámara mira a esa mano
      a.obj.updateMatrixWorld(true); const h = new THREE.Vector3(); a.obj.userData.j[z.mano === "izq" ? "handL" : "handR"].getWorldPosition(h);
      cam.updateProjectionMatrix(); const d = distancia(z, 1, cam); cam.position.set(h.x, h.y + d * 0.07, h.z + d); cam.lookAt(h.x, h.y, h.z);
    } else if (z && zona === "busto") {
      // Busto: el encuadre sigue a la cabeza (piernas cortas, figuras altas), no una altura fija.
      a.obj.updateMatrixWorld(true); const h = new THREE.Vector3(); a.obj.userData.j.head.getWorldPosition(h);
      const y = z.y + (h.y - CABEZA_Y); cam.updateProjectionMatrix(); const d = distancia(z, 1, cam); cam.position.set(0, y + d * 0.07, d); cam.lookAt(0, y, 0);
    } else if (z) { cam.updateProjectionMatrix(); const d = distancia(z, 1, cam); cam.position.set(z.x || 0, z.y + d * 0.07, d); cam.lookAt(z.x || 0, z.y, 0); }
    // Cuadro de 3.2 de alto centrado en 1.38: de los pies (y=0) a lo más alto de un casco o peinado (≈2.75).
    else cam.position.set(0, 1.5, 7.55), cam.lookAt(0, 1.38, 0);
    cam.updateProjectionMatrix();
    medirContorno(r); r.render(s, cam); let url = r.domElement.toDataURL("image/webp", 0.85);
    if (!url.startsWith("data:image/webp")) url = r.domElement.toDataURL("image/png");
    s.remove(a.obj); dispose(a.obj);
    return url;
  }

  function atender(d) {
    if (d.tipo === "figuras" && Array.isArray(d.lista)) ponerFiguras(d.lista.slice(0, 12), d.columnas, d.asientos);
    else if (NAVE && d.tipo === "nave") {
      if ("boton" in d) { const b = String(d.boton || "quieto"); NV.boton = b === "votar" || b === "golpe" ? b : "quieto"; if (b === "golpe") NV.golpe = reloj.getElapsedTime(); }
    }
    else if (NAVE && d.tipo === "expulsar") { const e = figuras.get(String(d.id)); if (e && e.vuela == null) e.vuela = reloj.getElapsedTime(); }
    else if (d.tipo === "momento") momento(d.id, String(d.cual), Number(d.prio), d);
    else if (d.tipo === "poder") poder(d.id, String(d.poder));
    else if (d.tipo === "foto" || d.tipo === "miniatura") {
      let url = null;
      // `vista` {y, alto, giro, x}: encuadre a la medida (herramientas de revisión, p. ej. tools/miniaturas/agarre.html).
      const v = d.vista && typeof d.vista === "object" ? { y: +d.vista.y || 1.3, alto: +d.vista.alto || 3.3, giro: +d.vista.giro || 0, x: +d.vista.x || 0, mano: d.vista.mano === "izq" ? "izq" : d.vista.mano === "der" ? "der" : null } : null;
      // En «foto» solo se acepta el encuadre «busto» (retratos); «miniatura» acepta cualquier zona o `vista`.
      const zf = d.tipo === "miniatura" ? (v || String(d.zona || "")) : d.zona === "busto" ? "busto" : "";
      // Fase 5: con `plano3` la foto es de la figura nueva (asíncrona). Si falla, llega url null y `v3: false`: ALV no la
      // guarda y pide la de respaldo.
      const p3 = d.tipo === "foto" ? planoV3(d.plano3) : null;
      if (p3) {
        fotoV3(p3, d.ancho, d.alto, zf).then(u => enviar({ tipo: d.tipo, pid: d.pid, url: u, zona: zf || undefined, v3: true }),
          err => { console.warn("escena: foto nueva", err); enviar({ tipo: d.tipo, pid: d.pid, url: null, zona: zf || undefined, v3: false }); });
        return;
      }
      try { const fx = figuraDe(d); if (fx) url = foto(fx, d.ancho, d.alto, zf, d.pose && typeof d.pose === "object" ? d.pose : null); } catch (e) { console.error("escena: foto", e); }
      enviar({ tipo: d.tipo, pid: d.pid, url, zona: zf || undefined });
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
    else if (AZOTEA && d.tipo === "mirar") { const m = AZ.mira, n = v => Math.max(-1, Math.min(1, Number(v) || 0)); m.x = n(d.x); m.y = n(d.y); m.activa = !!d.activa; }
    else if (AZOTEA && d.tipo === "accion") {
      const t = reloj.getElapsedTime(), e0 = figuras.get(orden[0]);
      // Figura nueva: listo/orgullo/flexionar → victoria; mirarse/frotar → vida (su primer clip); saludar → saludo (Codex D4).
      if (e0 && e0.v3) accionV3(e0, d.cual == null ? null : String(d.cual));
      else accionAzotea(d.cual == null ? null : String(d.cual), e0, t);
    }
    else if (AZOTEA && d.tipo === "llegada") { const e = figuras.get(orden[0]); iniciarLlegada(reloj.getElapsedTime(), true); if (e) e.obj.visible = false; AZ.polvo = false; }
    else if (AZOTEA && d.tipo === "pausa") AZ.pausa = !!d.si;
    else if (AZOTEA && d.tipo === "girar" && Number.isFinite(d.cuanto)) { AZ.usuario += Math.max(-1, Math.min(1, d.cuanto)); AZ.vel = 0; AZ.quieto = false; }
    else if (AZOTEA && d.tipo === "impulso" && Number.isFinite(d.vel)) { AZ.vel = Math.max(-9, Math.min(9, d.vel)); AZ.quieto = false; }
    else if (AZOTEA && d.tipo === "ambiente") {
      if (Number.isFinite(d.brillo)) AZ.brillo = Math.max(0, Math.min(1, d.brillo));
      const c = colorHex(d.clave), k = colorHex(d.contra), r = colorHex(d.relleno), ra = colorHex(d.ranura);
      if (c) luz.color.set(c); if (k) contra.color.set(k); if (r) relleno.color.set(r); if (ra) AZ.ranura.set(ra).convertSRGBToLinear();
      if (plat && ra) { plat.halo.material.color.copy(AZ.ranura); plat.haz.material.color.copy(AZ.ranura); }
    }
    else if (AZOTEA && d.tipo === "plataforma" && plat && d.colores && typeof d.colores === "object") {
      const C = d.colores, pon = (m, v) => { const h = colorHex(v); if (h) m.color.set(h).convertSRGBToLinear(); };
      pon(plat.M.placa, C.placa); pon(plat.M.base, C.base); pon(plat.M.panelA, C.panelA); pon(plat.M.panelB, C.panelB); pon(plat.M.estrella, C.estrella);
      const s = colorHex(C.stud); if (s) { plat.ORO.set(s).convertSRGBToLinear().multiplyScalar(0.55); for (let i = 0; i < plat.nS; i++) plat.studs.setColorAt(i, plat.ORO); plat.studs.instanceColor.needsUpdate = true; }
      const ra = colorHex(C.ranura); if (ra) { AZ.ranura.set(ra).convertSRGBToLinear(); [plat.halo, plat.haz, plat.plato, plat.cono].forEach(o => o.material.color.copy(AZ.ranura)); }
    }
    else if (!EDITOR) return;
    else if (d.tipo === "enfocar") enfocar(String(d.zona));
    else if (d.tipo === "girar" && Number.isFinite(d.cuanto)) { cam.meta += Math.max(-7, Math.min(7, d.cuanto)); cam.vel = 0; }
    else if (d.tipo === "acercar" && Number.isFinite(d.cuanto) && d.cuanto > 0) cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom / d.cuanto));
    else if (d.tipo === "gesto") figuras.forEach(e => gesto(e, d.cual, reloj.getElapsedTime()));
    else if (d.tipo === "probar" && Momentos.info(String(d.cual))) figuras.forEach(e => { cambio(e, reloj.getElapsedTime()); e.mom = String(d.cual); e.t0 = reloj.getElapsedTime(); e.velMom = 1; e.intMom = 1; e.durMom = 0; e.prio = 0; e.cual = null; });
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
      if (CINE && Q.get("bisel") !== "no") await cargarBiseles();
    } catch (e) { console.error("escena: no cargó la biblioteca", e); enviar({ tipo: "error" }); return; }
    listo = true; aplicarCalidad(); acomodar(); pendientes.splice(0).forEach(atender); enviar({ tipo: "listo" }); cuadro();
  })();
})();
