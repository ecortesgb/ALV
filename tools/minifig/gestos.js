/* ============ Gestos de ALV: animaciones propias, tallas y especiales ============ */
// nucleo/momentos.js es de Minifig Studio y no se toca desde ALV. Aquí van las animaciones que agrega ALV, con la
// misma forma (pose(t) → giros y posición, ver ese archivo), y el motor (escena.js) las busca primero aquí:
// Momentos.pose/info/efecto/existe se envuelven para que conozcan también estas.
//
// Tallas: cada una cambia el tamaño y la forma de moverse, y se aplica en un solo lugar del motor, así cualquier
// animación nueva la hereda sin tocarla.
//   escala [ancho, alto] · vel (más = más rápido) · salto (altura de los brincos) · brazos (amplitud de los giros)
//   reposo (cuánto se mece al esperar) · pasos (cuadros por segundo de la pose: 0 = suave; 8 = movimiento de robot)
(function () {
  "use strict";
  const M = window.Momentos; if (!M) return;
  const s = Math.sin, c = Math.cos, PI = Math.PI, ARR = -2.95, FRENTE = -PI / 2;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const k01 = (t, a, b) => cl((t - a) / (b - a), 0, 1);
  const suave = x => x * x * (3 - 2 * x);
  const salto = (t, a, b, h) => { const k = k01(t, a, b); return k > 0 && k < 1 ? 4 * k * (1 - k) * h : 0; };
  const pulso = (t, a, d) => { const k = k01(t, a, a + d); return k > 0 && k < 1 ? s(k * PI) : 0; };
  const sube = (t, a, b, desde, hasta) => desde + (hasta - desde) * suave(k01(t, a, b));

  const DEF = {
    // Especial de quien no trae uno propio: baile corto con brincos y brazos alternados.
    "baile": { tipo: "especial", dur: 3.2, nombre: "Baile", pose: t => {
      const b = k01(t, 0.1, 0.4) * (1 - k01(t, 2.8, 3.2)), w = s(t * 7);
      return { rotY: s(t * 3.5) * 0.55 * b, y: Math.abs(s(t * 7)) * 0.07 * b, brazoObj: -1.4 - w * 1.1 * b, brazoLib: -1.4 + w * 1.1 * b,
        manoObj: w * 0.6 * b, manoLib: -w * 0.6 * b, piernaIzq: w * 0.35 * b, piernaDer: -w * 0.35 * b, cabeza: s(t * 7) * 0.4 * b, fx: 0.5 * b }; } },
    // Hulk: se encorva, tiembla de coraje, ruge con los brazos arriba y golpea el piso (el motor lo hace crecer).
    "furia": { tipo: "especial", dur: 4.2, nombre: "Furia", pose: t => {
      const encorva = suave(k01(t, 0, 0.5)) * (1 - suave(k01(t, 1.3, 1.6))), tiembla = k01(t, 0.4, 1.3) * (1 - k01(t, 1.3, 1.5));
      const ruge = suave(k01(t, 1.5, 1.9)) * (1 - suave(k01(t, 2.6, 2.9))), golpe = pulso(t, 2.9, 0.5);
      return { rotX: 0.3 * encorva + 0.25 * golpe, rotY: s(t * 47) * 0.05 * tiembla, y: salto(t, 2.45, 2.95, 0.35),
        brazoObj: 0.25 * encorva + ARR * 0.85 * ruge - 1.2 * golpe, brazoLib: 0.25 * encorva + ARR * 0.85 * ruge - 1.2 * golpe,
        manoObj: 0.5 * encorva, manoLib: -0.5 * encorva, piernaIzq: -0.35 * encorva, piernaDer: 0.2 * encorva, cabeza: s(t * 31) * 0.15 * tiembla,
        fx: 0.3 + 0.7 * Math.max(tiembla, golpe) }; } },
    // Iron Man: se toca la careta, la abre (el motor cambia la cara), presume y la vuelve a cerrar.
    "visor": { tipo: "especial", dur: 3.0, nombre: "Abrir la careta", pose: t => {
      const mano = pulso(t, 0, 0.9) + pulso(t, 2.0, 0.8), presume = suave(k01(t, 0.9, 1.2)) * (1 - suave(k01(t, 1.8, 2.1)));
      return { brazoLib: -2.2 * mano - 0.4 * presume, manoLib: 0.6 * mano, brazoObj: -0.3 - 0.6 * presume, cabeza: s(t * 2.4) * 0.25 * presume,
        rotY: 0.25 * presume, y: 0.03 * presume, fx: 0.3 + 0.5 * presume }; } },
    // Spider-Man: cae en cuclillas con una mano al piso, lanza telaraña y brinca girando.
    "pose-arana": { tipo: "especial", dur: 3.0, nombre: "Pose arácnida", pose: t => {
      const agacha = suave(k01(t, 0, 0.35)) * (1 - suave(k01(t, 1.9, 2.1))), lanza = pulso(t, 1.0, 0.6), giro = suave(k01(t, 2.05, 2.75));
      return { rotX: 0.45 * agacha, y: salto(t, 2.0, 2.8, 0.6), rotY: giro * 2 * PI, piernaIzq: -1.0 * agacha, piernaDer: 0.45 * agacha,
        brazoObj: 0.5 * agacha - 0.3 * giro, brazoLib: FRENTE * lanza + 0.4 * agacha * (1 - lanza), manoLib: s(t * 30) * 0.4 * lanza,
        cabeza: 0, fx: 0.3 + 0.7 * lanza }; } },
    // Yoda: se concentra, da un salto altísimo con maroma y cae listo.
    "salto-jedi": { tipo: "especial", dur: 3.0, nombre: "Salto jedi", pose: t => {
      const junta = suave(k01(t, 0, 0.5)) * (1 - k01(t, 0.7, 0.8)), aire = k01(t, 0.8, 2.0);
      return { rotX: 0.2 * junta - suave(aire) * 2 * PI + 0.15 * pulso(t, 2.0, 0.6), y: salto(t, 0.8, 2.0, 1.1),
        brazoObj: -1.3 * junta + ARR * 0.6 * pulso(t, 2.1, 0.8), brazoLib: -1.3 * junta - 0.5 * (aire > 0 && aire < 1 ? 1 : 0),
        piernaIzq: -0.6 * (aire > 0 && aire < 1 ? 1 : 0), piernaDer: -0.6 * (aire > 0 && aire < 1 ? 1 : 0), cabeza: 0, fx: 0.4 + 0.6 * (aire > 0 && aire < 1 ? 1 : 0) }; } },
  };
  const EFX = {
    "baile": { origen: "pies", forma: "estela" }, "furia": { origen: "pies", forma: "anillo", color: "#c9b28a" },
    "visor": { origen: "cabeza", forma: "estallido", color: "#ffd21a" }, "pose-arana": { origen: "manoLib", forma: "rayo", dir: "frente", color: "#f4f4f4" },
    "salto-jedi": { origen: "pies", forma: "estela", color: "#7fe08a" },
  };

  // Tallas: tamaño y personalidad. «normal» no cambia nada.
  const TALLAS = {
    normal:   { escala: [1, 1],       vel: 1,    salto: 1,    brazos: 1,    reposo: 1,   pasos: 0 },
    grande:   { escala: [1.32, 1.26], vel: 0.78, salto: 0.55, brazos: 1.08, reposo: 1.6, pasos: 0, temblor: true },
    androide: { escala: [1, 1],       vel: 1,    salto: 0.8,  brazos: 1,    reposo: 0,   pasos: 8 },
    pequeno:  { escala: [0.84, 0.8],  vel: 1.3,  salto: 1.45, brazos: 1,    reposo: 1.2, pasos: 0, saltitos: true },
  };
  const talla = n => TALLAS[n] || TALLAS.normal;

  // Especial de quien no declara uno: según su paquete de poder, y si no, el baile.
  const PAQUETE = { fuerza: "furia", arana: "pose-arana" };
  /**
   * Lee el especial que manda ALV con la figura (`anim.especial`): un nombre o {anim, cambia, pieza, en, vuelve}.
   * Devuelve siempre algo válido (nunca truena): lo que no se entiende se ignora.
   */
  function especial(dato, paquete) {
    const nombre = typeof dato === "string" ? dato : dato && typeof dato === "object" ? String(dato.anim || "") : "";
    const r = { anim: existe(nombre) ? nombre : PAQUETE[paquete] || "baile", cambia: null, pieza: null, en: 0, vuelve: 0 };
    if (dato && typeof dato === "object") {
      const ca = dato.cambia, pz = dato.pieza;
      if (ca && typeof ca === "object" && TALLAS[ca.talla]) r.cambia = { talla: String(ca.talla) };
      if (pz && typeof pz === "object" && (typeof pz.rostro === "string" || typeof pz.ocultar === "string")) r.pieza = { rostro: pz.rostro ? String(pz.rostro) : null, ocultar: pz.ocultar ? String(pz.ocultar) : null };
      r.en = Number.isFinite(dato.en) ? cl(dato.en, 0, 10) : 0;
      r.vuelve = Number.isFinite(dato.vuelve) ? cl(dato.vuelve, r.en, 10) : 0;
    }
    return r;
  }

  // Envolver Momentos: primero las de ALV, luego las de Minifig Studio.
  const CERO = { cabeza: 0, brazoObj: 0, brazoLib: 0, manoObj: 0, manoLib: 0, piernaIzq: 0, piernaDer: 0, y: 0, z: 0, rotX: 0, rotY: 0, fx: 0 };
  const orig = { pose: M.pose, info: M.info, efecto: M.efecto, existe: M.existe, lista: M.lista };
  const existe = n => !!DEF[n] || orig.existe(n);
  M.pose = (n, t) => {
    const d = DEF[n]; if (!d) return orig.pose(n, t);
    const r = Object.assign({}, CERO, d.pose(cl(t, 0, d.dur)));
    r.piernaIzq = cl(r.piernaIzq, -PI / 2, PI / 2); r.piernaDer = cl(r.piernaDer, -PI / 2, PI / 2); r.fx = cl(r.fx, 0, 1);
    return r;
  };
  M.info = n => (DEF[n] ? { id: n, nombre: DEF[n].nombre, tipo: DEF[n].tipo, dur: DEF[n].dur, bucle: false } : orig.info(n));

  M.efecto = n => (EFX[n] ? Object.assign({ dir: "frente", radio: 0.25 }, EFX[n]) : orig.efecto(n));
  M.existe = existe;
  M.lista = tipo => orig.lista(tipo).concat(Object.keys(DEF).filter(k => !tipo || DEF[k].tipo === tipo).map(M.info));

  window.GestosALV = { TALLAS, talla, especial, DEF };
})();
