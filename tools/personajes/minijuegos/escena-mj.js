/* ============ Mini-Juegos y cuarto de Físico: escena 3D común de la TV (prototipo, zona aparte) ============ */
// Renderer, luces, cielo de noche, cuadro por cuadro y escenarios: la pista de la bala y el cuarto (caja o plataforma).
// Solo dibuja; las reglas viven en src/personajes/minijuegos/*.ts.
(function (raiz) {
  "use strict";
  const T = raiz.THREE;
  if (!T) { raiz.EscenaMJ = null; return; }
  /** Color en sRGB (como se escribe en CSS) pasado a lineal: r128 no lo convierte solo y sin esto todo sale deslavado. */
  const col = h => new T.Color(h).convertSRGBToLinear();

  function crear(lienzo, op) {
    const o = op || {};
    // o.transparente: sin cielo ni niebla; la página pone su fondo (la sala de Físico usa la imagen del escenario).
    const renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: !!o.transparente });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(raiz.devicePixelRatio || 1, 1.5));
    const scene = new T.Scene();
    if (!o.transparente) {
      scene.background = col(o.cielo || 0x141a3a);
      scene.fog = new T.Fog(col(o.cielo || 0x141a3a), 40, 120);
    }
    const camera = new T.PerspectiveCamera(o.fov || 32, 1, 0.1, 300);
    scene.add(new T.HemisphereLight(0xcfe0ff, 0x30253a, 0.85));
    const clave = new T.DirectionalLight(0xfff2dd, 1.15);
    clave.position.set(8, 18, 14); clave.castShadow = true; clave.shadow.mapSize.set(2048, 2048);
    Object.assign(clave.shadow.camera, { left: -16, right: 16, top: 14, bottom: -10, near: 1, far: 60 });
    scene.add(clave, clave.target);
    const contra = new T.DirectionalLight(0x8fb0ff, 0.55); contra.position.set(-10, 8, -12); scene.add(contra);

    function medir() {
      const w = lienzo.clientWidth || raiz.innerWidth, h = lienzo.clientHeight || raiz.innerHeight;
      renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
    }
    raiz.addEventListener("resize", medir); medir();
    const cuadros = [];
    let previo = performance.now();
    function bucle(t) {
      const dt = Math.min(0.1, (t - previo) / 1000); previo = t;
      cuadros.forEach(f => f(dt, t));
      renderer.render(scene, camera);
      raiz.requestAnimationFrame(bucle);
    }
    raiz.requestAnimationFrame(bucle);
    return { renderer, scene, camera, clave, medir, alCuadro: f => cuadros.push(f) };
  }

  /** Edificios de fondo (bloques con ventanas encendidas) para que se sienta azotea de noche. */
  function ciudad(scene, z) {
    const g = new T.Group();
    const mat = new T.MeshStandardMaterial({ color: col(0x1b2150), roughness: 0.9 });
    const luz = new T.MeshBasicMaterial({ color: col(0xffd36b) });
    let x = -60;
    let semilla = 7;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    while (x < 60) {
      const w = 4 + azar() * 6, h = 8 + azar() * 22;
      const b = new T.Mesh(new T.BoxGeometry(w, h, 4), mat);
      b.position.set(x + w / 2, h / 2 - 6, z - azar() * 8); g.add(b);
      for (let i = 0; i < 6; i++) {
        if (azar() < 0.45) continue;
        const v = new T.Mesh(new T.PlaneGeometry(0.7, 0.9), luz);
        v.position.set(b.position.x - w / 2 + 1 + azar() * (w - 2), -6 + 2 + azar() * (h - 3), b.position.z + 2.01); g.add(v);
      }
      x += w + 0.6;
    }
    scene.add(g);
    return g;
  }

  /** Piso de bloques: losas con borde, como la base de la azotea. */
  function losas(ancho, fondo, color1, color2) {
    const g = new T.Group();
    const m1 = new T.MeshStandardMaterial({ color: col(color1), roughness: 0.85 });
    const m2 = new T.MeshStandardMaterial({ color: col(color2), roughness: 0.85 });
    const t = 2;
    for (let i = 0; i < ancho / t; i++) for (let j = 0; j < fondo / t; j++) {
      const l = new T.Mesh(new T.BoxGeometry(t - 0.06, 0.3, t - 0.06), (i + j) % 2 ? m1 : m2);
      l.position.set(-ancho / 2 + t / 2 + i * t, -0.15, -fondo / 2 + t / 2 + j * t); l.receiveShadow = true; g.add(l);
    }
    return g;
  }

  /** Pista de la bala: tarima larga con franja por donde pasa la bala y luces de aviso a los lados. */
  function pista(scene, largo) {
    ciudad(scene, -30);
    const g = new T.Group();
    g.add(losas(Math.ceil((largo + 14) / 2) * 2, 10, 0x3b4170, 0x343a66));
    const franja = new T.Mesh(new T.BoxGeometry(largo + 14, 0.02, 1.1), new T.MeshStandardMaterial({ color: col(0xff4d3a), emissive: col(0x5a0d05), roughness: 0.6 }));
    franja.position.set(0, 0.011, 1.2); franja.receiveShadow = true; g.add(franja);
    const avisos = [-1, 1].map(lado => {
      const a = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.25, 24), new T.MeshStandardMaterial({ color: col(0x552222), emissive: col(0x000000) }));
      a.position.set(lado * (largo / 2 + 5.5), 0.13, 1.2); g.add(a);
      return a;
    });
    scene.add(g);
    return { g, avisos, zBala: 1.2 };
  }

  /** La bala: proyectil redondo con punta, aleta y estela. */
  function bala() {
    const g = new T.Group();
    const cuerpo = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.9, 24), new T.MeshStandardMaterial({ color: col(0x22252e), metalness: 0.6, roughness: 0.35 }));
    cuerpo.rotation.z = Math.PI / 2; cuerpo.castShadow = true; g.add(cuerpo);
    const punta = new T.Mesh(new T.SphereGeometry(0.34, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), cuerpo.material);
    punta.rotation.z = -Math.PI / 2; punta.position.x = 0.45; punta.castShadow = true; g.add(punta);
    const banda = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 0.14, 24), new T.MeshStandardMaterial({ color: col(0xe8343a), roughness: 0.5 }));
    banda.rotation.z = Math.PI / 2; banda.position.x = 0.1; g.add(banda);
    const ojo = new T.Mesh(new T.SphereGeometry(0.09, 12, 8), new T.MeshBasicMaterial({ color: col(0xffffff) }));
    ojo.position.set(0.5, 0.13, 0.22); g.add(ojo);
    const estela = new T.Mesh(new T.ConeGeometry(0.3, 1.6, 16, 1, true), new T.MeshBasicMaterial({ color: col(0xffa64d), transparent: true, opacity: 0.55, depthWrite: false }));
    estela.rotation.z = Math.PI / 2; estela.position.x = -1.2; g.add(estela);
    g.userData.estela = estela;
    return g;
  }

  /** Cuarto de Físico: caja con tres paredes bajas (se ve todo desde la cámara) o plataforma redonda flotante. */
  function cuarto(scene, forma, ancho, fondo, radio) {
    ciudad(scene, -34);
    const g = new T.Group();
    if (forma === "plataforma") {
      const base = new T.Mesh(new T.CylinderGeometry(radio, radio * 0.92, 1.2, 64), new T.MeshStandardMaterial({ color: col(0x3b4170), roughness: 0.85 }));
      base.position.y = -0.6; base.receiveShadow = true; g.add(base);
      const aro = new T.Mesh(new T.TorusGeometry(radio - 0.15, 0.15, 10, 64), new T.MeshStandardMaterial({ color: col(0xffcf2e), emissive: col(0x332200) }));
      aro.rotation.x = Math.PI / 2; aro.position.y = 0.02; g.add(aro);
      const centro = new T.Mesh(new T.CircleGeometry(2, 40), new T.MeshStandardMaterial({ color: col(0x2f7cf0), roughness: 0.7 }));
      centro.rotation.x = -Math.PI / 2; centro.position.y = 0.01; centro.receiveShadow = true; g.add(centro);
    } else {
      g.add(losas(ancho, fondo, 0x3b4170, 0x343a66));
      const pared = new T.MeshStandardMaterial({ color: col(0x5a3fa8), roughness: 0.8 });
      const zoclo = new T.MeshStandardMaterial({ color: col(0xffcf2e), roughness: 0.6 });
      const atras = new T.Mesh(new T.BoxGeometry(ancho + 1, 3.2, 0.5), pared); atras.position.set(0, 1.6, -fondo / 2 - 0.25); atras.receiveShadow = true; g.add(atras);
      [-1, 1].forEach(l => { const p = new T.Mesh(new T.BoxGeometry(0.5, 1.6, fondo + 1), pared); p.position.set(l * (ancho / 2 + 0.25), 0.8, 0); p.receiveShadow = true; p.castShadow = true; g.add(p); });
      const z1 = new T.Mesh(new T.BoxGeometry(ancho + 1.1, 0.35, 0.6), zoclo); z1.position.set(0, 3.25, -fondo / 2 - 0.25); g.add(z1);
      // Cajas para tener algo con qué jugar alrededor (no estorban: van en las esquinas de atrás).
      const caja = new T.MeshStandardMaterial({ color: col(0xff8a1f), roughness: 0.7 });
      [[-ancho / 2 + 1.4, -fondo / 2 + 1.4], [ancho / 2 - 1.4, -fondo / 2 + 1.4]].forEach(([x, z]) => {
        const c = new T.Mesh(new T.BoxGeometry(1.6, 1.6, 1.6), caja); c.position.set(x, 0.8, z); c.castShadow = true; c.receiveShadow = true; g.add(c);
      });
    }
    scene.add(g);
    return g;
  }

  /**
   * ALVacío (Elías, 27 nov): plataforma redonda en la azotea de un edificio, sin paredes. El grupo de arriba (piso y aro)
   * se encoge con setRadio(r); el edificio se queda. → { grupo, setRadio(r), quitar() }.
   */
  function azotea(scene, radio) {
    const g = new T.Group(), arriba = new T.Group();
    const piso = new T.Mesh(new T.CylinderGeometry(1, 0.94, 1.2, 64), new T.MeshStandardMaterial({ color: col(0x3b4170), roughness: 0.85 }));
    piso.position.y = -0.6; piso.receiveShadow = true; arriba.add(piso);
    const aro = new T.Mesh(new T.TorusGeometry(0.98, 0.02, 8, 64), new T.MeshStandardMaterial({ color: col(0xffcf2e), emissive: col(0x553300) }));
    aro.rotation.x = Math.PI / 2; aro.position.y = 0.02; arriba.add(aro);
    const centro = new T.Mesh(new T.CircleGeometry(0.27, 40), new T.MeshStandardMaterial({ color: col(0x2f7cf0), roughness: 0.7 }));
    centro.rotation.x = -Math.PI / 2; centro.position.y = 0.01; arriba.add(centro);
    g.add(arriba);
    // Edificio debajo: torre angosta con ventanas encendidas, para que se vea la altura.
    const torre = new T.Mesh(new T.BoxGeometry(radio * 1.1, 60, radio * 1.1), new T.MeshStandardMaterial({ color: col(0x1d2350), roughness: 0.9 }));
    torre.position.y = -31.2; g.add(torre);
    const luz = new T.MeshBasicMaterial({ color: col(0xffd77a) });
    for (let y = -4; y > -58; y -= 3.2) for (let x = -2; x <= 2; x++) {
      if ((x * 7 + y * 3) % 5 === 0) continue;
      const v = new T.Mesh(new T.PlaneGeometry(radio * 0.12, 1.3), luz); v.position.set(x * radio * 0.2, y, radio * 0.551); g.add(v);
    }
    const setRadio = r => { arriba.scale.set(r, 1, r); };
    setRadio(radio);
    scene.add(g);
    return { grupo: g, setRadio, quitar: () => scene.remove(g) };
  }

  /** Piso invisible que solo recibe sombras (para dibujar sobre una imagen de fondo). */
  function pisoSombra(scene, ancho) {
    const p = new T.Mesh(new T.PlaneGeometry(ancho, 12), new T.ShadowMaterial({ opacity: 0.35 }));
    p.rotation.x = -Math.PI / 2; p.receiveShadow = true; scene.add(p);
    return p;
  }

  /** Aro de color bajo los pies (el color del jugador, como en el lobby). */
  function aro(color, r) {
    const m = new T.Mesh(new T.RingGeometry(r * 0.78, r, 40), new T.MeshBasicMaterial({ color: col(color), transparent: true, opacity: 0.85, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.03;
    return m;
  }

  raiz.EscenaMJ = { crear, pista, bala, cuarto, azotea, aro, pisoSombra };
})(typeof self !== "undefined" ? self : this);
