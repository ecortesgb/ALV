/* ============ Personajes nuevos: de los mensajes de siempre a las seis animaciones lógicas ============ */
// El motor de ALV manda momentos (espera, punto, victoria, derrota…), gestos (Saludar, Ganar, Perder, Especial) y vida
// automática (lib:<id> o animaciones de momentos.js). Los personajes con esqueleto solo conocen seis lógicas
// (ALV_FORMATO_PERSONAJES_V3.md §12.2). Esta tabla las traduce. Sin DOM ni 3D: la prueban en Node (logicas.test.ts).
(function (raiz) {
  "use strict";
  const LOGICAS = ["reposo", "entrada", "saludo", "victoria", "derrota", "especial"];
  const DIRECTO = {
    espera: "reposo", respirar: "reposo", quieto: "reposo",
    punto: "victoria", victoria: "victoria", ganar: "victoria", celebrar: "victoria",
    derrota: "derrota", perder: "derrota",
    saludar: "saludo", saludo: "saludo", hola: "saludo",
    especial: "especial", entrada: "entrada", llegada: "entrada", bailar: "victoria",
  };
  // Pistas por nombre para la vida automática y las animaciones de momentos.js / gestos.js.
  // Regla: un id de la biblioteca cae en la misma lógica que su respaldo de ALV (perfiles-animacion.json); lo revisa
  // nucleo.test.ts con todos los pares. Orden: lo más específico primero.
  const PISTAS = [
    [/personality_|idle|respir|look_around|restless|mirar/, "reposo"],
    [/wave|salud|hola|greet/, "saludo"],
    [/confus|confund|derrot|triste|sad|cabeza-baja|caer|knock|mareo|dizzy|shrug|pisot|brazos-caidos/, "derrota"],
    [/victor|cheer|celebr|joy|alegr|arms_up|brazos-arriba|puno|salto|baile|dance|clap|aplau|presum|flex/, "victoria"],
    [/especial|furia|visor|rayo|telara|poder/, "especial"],
  ];
  /** Lógica para un nombre de momento, gesto o vida. Siempre devuelve una: lo que no se reconoce es reposo. */
  function logicaDe(cual) {
    if (typeof cual !== "string") return "reposo";
    const n = cual.toLowerCase().replace(/^lib:/, "");
    if (LOGICAS.indexOf(n) >= 0) return n;
    if (Object.prototype.hasOwnProperty.call(DIRECTO, n)) return DIRECTO[n];
    for (const [re, l] of PISTAS) if (re.test(n)) return l;
    return "reposo";
  }
  /** Las que se repiten solas (las demás se tocan una vez y vuelven a reposo). */
  const EN_BUCLE = { reposo: true };
  /** Velocidad de un clip del juego: siempre 1, como en el juego (coordinación, 2026-11-26: «lo hacen muy rápido»). La
   *  velocidad y la intensidad de los perfiles de vida y de los gestos eran para las tablas rígidas del motor viejo; en las
   *  figuras nuevas la personalidad se nota en qué clips elige y cada cuánto, no en acelerarlos. */
  const velocidadClip = () => 1;
  /** Cruce normalizado. Las claves del Map pueden ser las propias acciones; no las modifica. */
  function pasoCruce(estado, dt, mezcla) {
    const t = estado.t + Math.max(0, dt), inicial = estado.pesoEntranteInicial;
    const w = mezcla > 0 ? Math.min(1, inicial + t / mezcla) : 1;
    const pesos = new Map([[estado.entrante, w]]);
    const factor = inicial < 1 ? (1 - w) / (1 - inicial) : 0;
    for (const [a, peso] of estado.pesosSalientesIniciales) {
      pesos.set(a, peso * factor);
    }
    return { ...estado, t, pesos };
  }
  /** Al cambiar de lógica usa una rampa lineal; dentro de ella sigue la meta móvil sin superar esa velocidad. */
  function pasoCompensacion(estado, meta, logica, dt, mezcla) {
    const valor = estado ? estado.valor : 0;
    const cambio = !estado || estado.logica !== logica;
    const velocidad = cambio ? (mezcla > 0 ? Math.abs(meta - valor) / mezcla : 0) : estado.velocidad;
    const t = cambio ? 0 : estado.t;
    const delta = meta - valor, paso = Math.max(0, dt);
    if (mezcla <= 0) return { valor: meta, logica, velocidad, t: 0 };
    // Si el cambio de lógica partió de la propia meta, permite seguir los giros posteriores del clip.
    const limite = (velocidad || Math.abs(delta) / mezcla) * paso;
    const avance = t < mezcla ? Math.abs(delta) : Math.abs(delta) * Math.min(1, paso * 6);
    return { valor: valor + Math.sign(delta) * Math.min(avance, limite), logica, velocidad, t: t + paso };
  }
  const api = { LOGICAS, logicaDe, EN_BUCLE, velocidadClip, pasoCruce, pasoCompensacion };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else raiz.LogicasALV = api;
})(typeof self !== "undefined" ? self : this);
