export const MODALIDADES = [
    { id: "individual", nombre: "Individual", gana: "Cada quien suma para sí. Gana una persona.", minimo: 2 },
    { id: "parejas", nombre: "Parejas", gana: "Se suman los puntos de la pareja. Gana una pareja.", minimo: 4, par: true },
    { id: "equipos", nombre: "Equipos", gana: "Se suman los puntos del equipo. Gana un equipo.", minimo: 4 },
    { id: "sexos", nombre: "ALVersus", gana: "Guerra de sexos: ellas contra ellos. Gana el bando que sume más.", minimo: 2 },
];
/** Instrumentos de cada juego. El impostor no usa instrumento: pide sus opciones. */
export const INSTRUMENTOS = {
    // Deciden quién pregunta y quién responde; no cambian el juego (Maestro 6A.3 y 6A.6 B).
    "verdad-reto": [
        { id: "orden", nombre: "En orden", detalle: "Responde el que sigue; pregunta el de antes.", herramienta: "orden", emoji: "🔁" },
        { id: "reloj", nombre: "Reloj", detalle: "La manecilla chica elige quién pregunta y la grande quién responde.", herramienta: "reloj", emoji: "🕐" },
        { id: "dados", nombre: "Dados", detalle: "Cada quien tira: el más alto pregunta y el más bajo responde.", herramienta: "dados", emoji: "🎲" },
        { id: "poker", nombre: "Cartas de póker", detalle: "Una carta a cada quien: la más alta pregunta y la más baja responde.", herramienta: "poker", emoji: "🂡" },
        { id: "ruleta", nombre: "Ruleta", detalle: "La ruleta elige quién responde y quién pregunta.", herramienta: "ruleta", emoji: "🎡" },
    ],
    reloj: [{ id: "botella", nombre: "Botella", detalle: "Una manecilla elige quién pregunta y la otra quién responde." }],
    ruleta: [{ id: "ruleta", nombre: "Ruleta", detalle: "Gira y elige a quién y qué castigo." }],
    "dados-hot": [{ id: "dados", nombre: "Dados", detalle: "Acción, zona y tiempo al azar." }],
    bienvenida: [{ id: "reloj-arena", nombre: "Reloj de arena", detalle: "30 segundos por turno." }],
    lista: [{ id: "reloj-arena", nombre: "Reloj de arena", detalle: "30 segundos por persona." }],
    mimica: [{ id: "reloj-arena", nombre: "Reloj de arena", detalle: "60 segundos sin hablar." }],
    prohibida: [{ id: "reloj-arena", nombre: "Reloj de arena", detalle: "60 segundos para describir." }],
    "yo-nunca": [{ id: "cartas", nombre: "Cartas", detalle: "Sale una carta por ronda." }],
    "mas-probable": [{ id: "cartas", nombre: "Cartas", detalle: "Sale una carta por ronda." }],
    "que-prefieres": [{ id: "cartas", nombre: "Cartas", detalle: "Sale una carta por ronda." }],
    conoces: [{ id: "cartas", nombre: "Cartas", detalle: "Sale una pregunta por ronda." }],
    "reto-lugar": [{ id: "cartas", nombre: "Cartas", detalle: "Sale una competencia del lugar por ronda." }],
};
/**
 * Modalidades que admite cada juego (Maestro 6A.12). El impostor y Verdad o reto son decisión de Elías (solo individual);
 * el resto es propuesta y se cambia aquí. Un juego que no está en la lista no se puede configurar.
 * El reloj y la Ruleta de castigos ya no son juegos sino herramientas (6A.11 C9): no aparecen.
 */
const TODAS = ["individual", "parejas", "equipos", "sexos"];
export const MODALIDADES_JUEGO = {
    impostor: ["individual"],
    "verdad-reto": ["individual"],
    conoces: ["parejas"],
    "dados-hot": ["parejas"],
    "mas-probable": TODAS,
    "que-prefieres": TODAS,
    "yo-nunca": TODAS,
    mimica: TODAS,
    prohibida: TODAS,
    bienvenida: TODAS,
    lista: TODAS,
    "reto-lugar": TODAS,
    // Modo Físico (D6): puntos por jugador, pareja, equipo o bando según el modo de juego.
    fisico: TODAS,
};
/** Juegos que se sugieren primero al entrar por el modo Físico (Modos de juego). */
export const JUEGOS_FISICO = ["fisico", "reto-lugar"];
/** ¿Se puede jugar este juego con esta modalidad? */
export const admite = (juego, modalidad) => (MODALIDADES_JUEGO[juego] ?? []).includes(modalidad);
