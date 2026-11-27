// Rarezas, precios y retos del personalizador (decisión de Elías, 2026-11-17: Maestro v1.42).
// Fuente única: la migración 033 se genera de aquí con `node tools/generar-piezas-sql.mjs` y una prueba compara las dos.
// Las piezas que no aparecen aquí son comunes (libres). Los momentos se identifican como "MOM_<paquete>".
export const PRECIO = { comun: 0, rara: 100, epica: 250, legendaria: 500 };
export const NOMBRE_RAREZA = { comun: "Común", rara: "Rara", epica: "Épica", legendaria: "Legendaria" };
const lista = (r, ids) => ids.trim().split(/\s+/).map(id => [id, r]);
/** Piezas bloqueadas al empezar, por rareza. */
export const RAREZA = Object.fromEntries([
    // Pelo
    ...lista("rara", "HAIR_010 HAIR_013 HAIR_016 HAIR_021"),
    ...lista("epica", "HAIR_017 HAIR_022"),
    // Cascos y máscaras
    ...lista("rara", "HELM_005 HELM_006 HELM_007 HELM_010 HELM_014"),
    ...lista("epica", "HELM_009 HELM_011 HELM_013"),
    ...lista("legendaria", "HELM_012 HELM_015 FACE_012 FACE_013 FACE_014 FACE_015"),
    // Rostros y detalles
    ...lista("rara", "FACE_007 FACE_009 DETAIL_004 DETAIL_010"),
    // Cuello y capa
    ...lista("rara", "NECK_001 NECK_003 NECK_008 NECK_010 CAPE_001"),
    ...lista("epica", "NECK_004 NECK_006 NECK_007"),
    // Torsos (los de pintar son comunes)
    ...lista("rara", "PRINT_013 PRINT_014 PRINT_015 PRINT_016 PRINT_017 PRINT_018"),
    ...lista("epica", "PRINT_003 PRINT_005 PRINT_006 PRINT_007 PRINT_008 PRINT_009 PRINT_011 PRINT_023"),
    ...lista("legendaria", "PRINT_001 PRINT_002 PRINT_004 PRINT_021 PRINT_022"),
    // Objetos
    ...lista("rara", "ACC_002 ACC_003 ACC_007 ACC_008 ACC_012"),
    ...lista("epica", "ACC_005 ACC_006"),
    ...lista("legendaria", "ACC_004"),
    // Momentos (paquetes de poses)
    ...lista("rara", "MOM_velocidad MOM_fuerza MOM_escudo"),
    ...lista("epica", "MOM_fuego MOM_hielo MOM_trueno MOM_magia MOM_vuelo"),
    ...lista("legendaria", "MOM_arana MOM_laser MOM_sigilo"),
]);
export const rarezaDe = (id) => (id && Object.hasOwn(RAREZA, id) ? RAREZA[id] : "comun");
const ROJOS = ["#c91a09", "#720e0f", "#c8102e", "#b3121b"], VERDES = ["#4b9f4a", "#237841", "#184632", "#5d9b3a"];
const NEGROS = ["#1b2a34", "#0b0f24", "#2a2a2a", "#111111"], AZULES = ["#0055bf", "#0a3463", "#5a93db", "#1d4fa8", "#1d3f8f"];
const LENTES = ["DETAIL_001", "DETAIL_002", "DETAIL_003"], BARBAS = ["DETAIL_005", "DETAIL_006", "DETAIL_007"];
const GORRAS = ["HELM_001", "HELM_002", "HELM_003", "HELM_004", "HELM_008"];
export const RETOS = [
    // Diarios: uno por día (rotan); se pueden repetir otro día que toque.
    { id: "dia-rojo-verde", tipo: "diario", nombre: "Navidad adelantada", texto: "Usa al menos una pieza roja y una verde.", condicion: { colores: [ROJOS, VERDES] }, premio: "NECK_010" },
    { id: "dia-negro", tipo: "diario", nombre: "De negro", texto: "Torso y piernas negros.", condicion: { torso: NEGROS, piernas: NEGROS }, premio: "HELM_007" },
    { id: "dia-gorra", tipo: "diario", nombre: "Gorra puesta", texto: "Lleva una gorra o casco de trabajo.", condicion: { alguna: [GORRAS] }, premio: "CAPE_001" },
    { id: "dia-barba-lentes", tipo: "diario", nombre: "Intelectual", texto: "Lentes y barba o bigote al mismo tiempo.", condicion: { alguna: [LENTES, BARBAS] }, premio: "DETAIL_004" },
    { id: "dia-dos-manos", tipo: "diario", nombre: "Manos llenas", texto: "Un objeto en cada mano.", condicion: { dosObjetos: true }, premio: "ACC_002" },
    { id: "dia-azul", tipo: "diario", nombre: "Azul total", texto: "Torso y piernas azules.", condicion: { torso: AZULES, piernas: AZULES }, premio: "HAIR_021" },
    { id: "dia-sudadera-mochila", tipo: "diario", nombre: "Día de escuela", texto: "Sudadera y mochila.", condicion: { todas: ["PRINT_020", "NECK_002"] }, premio: "MOM_velocidad" },
    // Combinación: se ganan una vez.
    { id: "combo-chef", tipo: "combinacion", nombre: "Chef completo", texto: "Filipina de chef, gorro de chef y sartén.", condicion: { todas: ["PRINT_014", "HELM_004", "ACC_011"] }, premio: "MOM_fuego" },
    { id: "combo-astronauta", tipo: "combinacion", nombre: "Astronauta", texto: "Casco espacial y tanques de aire.", condicion: { todas: ["HELM_013", "NECK_001"] }, premio: "MOM_vuelo" },
    { id: "combo-caballero", tipo: "combinacion", nombre: "Caballero", texto: "Casco de castillo, espada y un escudo.", condicion: { todas: ["HELM_009", "ACC_002"], alguna: [["ACC_003", "ACC_005", "ACC_006"]] }, premio: "NECK_004" },
    { id: "combo-pirata", tipo: "combinacion", nombre: "Al abordaje", texto: "Camisa de pirata y parche.", condicion: { todas: ["PRINT_018", "DETAIL_010"] }, premio: "ACC_007" },
    { id: "combo-mago", tipo: "combinacion", nombre: "Aprendiz de mago", texto: "Sombrero de mago y varita.", condicion: { todas: ["HELM_005", "ACC_001"] }, premio: "MOM_magia" },
    { id: "combo-policia", tipo: "combinacion", nombre: "De guardia", texto: "Uniforme de policía y gorra de policía.", condicion: { todas: ["PRINT_015", "HELM_001"] }, premio: "ACC_012" },
];
/** XP cuando el premio ya era tuyo (en vez de la pieza). */
export const XP_SI_YA_LA_TIENES = 40;
/** El reto diario de una fecha (AAAA-MM-DD, hora de Ciudad de México): igual que privado.reto_del_dia en la 033. */
export function retoDelDia(fecha) {
    const diarios = RETOS.filter(r => r.tipo === "diario");
    const [a, m, d] = fecha.split("-").map(Number);
    const dias = Math.floor(Date.UTC(a, m - 1, d) / 86400000);
    return diarios[dias % diarios.length];
}
/**
 * Retos que se muestran un día en el HUB: de 1 a 3. El primero es siempre el diario (el único que el servidor
 * reconoce como «del día», 033); los demás son retos de combinación que rotan por fecha y se pueden reclamar
 * cualquier día. PROVISIONAL hasta que Elías pase la lista final de retos y recompensas.
 */
export function retosDelDia(fecha) {
    const combos = RETOS.filter(r => r.tipo === "combinacion");
    const [a, m, d] = fecha.split("-").map(Number);
    const dias = Math.floor(Date.UTC(a, m - 1, d) / 86400000);
    const cuantos = 1 + (((dias * 7) % 3) + 3) % 3; // 1, 2 o 3 según el día
    const extra = Array.from({ length: Math.min(cuantos - 1, combos.length) }, (_, k) => combos[(dias + k * 2) % combos.length]);
    return [retoDelDia(fecha), ...extra];
}
export const hoyMexico = (ahora = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
