/** Los cuatro primeros son los de la referencia; los demás se inventaron para salas de hasta 8 (y siguen en ciclo). */
export const COLORES_JUGADOR = [
    { nombre: "Rojo", base: "#e8343a", claro: "#ff7a6e", oscuro: "#8f1420", texto: "#ffffff" },
    { nombre: "Azul", base: "#2f7cf0", claro: "#7cc0ff", oscuro: "#123f99", texto: "#ffffff" },
    { nombre: "Amarillo", base: "#ffcf2e", claro: "#fff09a", oscuro: "#b37a00", texto: "#0a1030" },
    { nombre: "Verde", base: "#2fbf4f", claro: "#8cf09a", oscuro: "#11702a", texto: "#ffffff" },
    { nombre: "Naranja", base: "#ff8a1f", claro: "#ffc078", oscuro: "#a44a00", texto: "#0a1030" },
    { nombre: "Morado", base: "#9a4cf0", claro: "#cfa0ff", oscuro: "#53198f", texto: "#ffffff" },
    { nombre: "Rosa", base: "#ff4fa8", claro: "#ff9fd0", oscuro: "#a01860", texto: "#ffffff" },
    { nombre: "Turquesa", base: "#1fc7c1", claro: "#8af2ec", oscuro: "#0b6f6c", texto: "#0a1030" },
];
/** Color del lugar `i` (0 = P1). */
export function colorJugador(i) {
    const k = Math.max(0, Math.floor(i));
    return { ...COLORES_JUGADOR[k % COLORES_JUGADOR.length], n: k + 1, etiqueta: `P${k + 1}` };
}
// ---------- Colores del lobby (Elías, 2026-11-22) ----------
// El administrador (anfitrión) siempre es el primer lugar y siempre rojo. Los demás, por orden de entrada, toman color
// según su género: mujer rosa, amarillo, morado y naranja; hombre azul, verde y café (blanco y negro cambiaron a morado
// y café el 22 nov, con las cabinas de Elías). Si su grupo se acaba, o no dijo
// su género, toma el siguiente libre: primarios primero y después secundarios. Son 8 colores para 8 lugares.
const T = (nombre, base, claro, oscuro, texto) => ({ nombre, base, claro, oscuro, texto });
export const PALETA_SALA = {
    rojo: T("Rojo", "#e8343a", "#ff7a6e", "#8f1420", "#ffffff"),
    azul: T("Azul", "#2f7cf0", "#7cc0ff", "#123f99", "#ffffff"),
    amarillo: T("Amarillo", "#ffcf2e", "#fff09a", "#b37a00", "#0a1030"),
    verde: T("Verde", "#2fbf4f", "#8cf09a", "#11702a", "#ffffff"),
    rosa: T("Rosa", "#ff4fa8", "#ff9fd0", "#a01860", "#ffffff"),
    naranja: T("Naranja", "#ff8a1f", "#ffc078", "#a44a00", "#0a1030"),
    morado: T("Morado", "#8b45d6", "#c79bff", "#4a1d82", "#ffffff"),
    cafe: T("Café", "#8a5634", "#c48a5e", "#4a2a14", "#ffffff"),
};
const PREFERIDOS = {
    mujer: ["rosa", "amarillo", "morado", "naranja"],
    hombre: ["azul", "verde", "cafe"],
    otro: [],
};
/** Orden de respaldo: primarios y después secundarios. */
const RESPALDO = ["azul", "amarillo", "verde", "naranja", "rosa", "morado", "cafe"];
/** Colores de los lugares libres del lobby: los que nadie tiene, en el orden en que se reparten (rojo primero si
 *  falta, luego primarios y secundarios). `desde` = cuántos lugares ya están ocupados (para la etiqueta). */
export function coloresLibres(usados, desde) {
    const tomados = new Set(usados.map(u => u.nombre));
    return ["rojo", ...RESPALDO].map(k => PALETA_SALA[k]).filter(t => !tomados.has(t.nombre))
        .map((t, j) => ({ ...t, n: desde + j + 1, etiqueta: `P${desde + j + 1}` }));
}
/** Ids en el orden de los lugares: el anfitrión primero y los demás por orden de entrada. */
export function ordenSala(ids, anfitrion) {
    return anfitrion && ids.includes(anfitrion) ? [anfitrion, ...ids.filter(i => i !== anfitrion)] : [...ids];
}
/**
 * Color y lugar de cada quien en la sala. `ids` en orden de entrada; `generos` puede faltar (sin servidor o sin dato).
 * Puro y determinista: todos los aparatos llegan al mismo resultado con los mismos datos.
 */
export function asignarColores(ids, anfitrion, generos = {}) {
    const orden = ordenSala(ids, anfitrion);
    const libres = new Set(Object.keys(PALETA_SALA));
    const mapa = new Map();
    orden.forEach((id, k) => {
        let clave;
        if (k === 0 && id === anfitrion)
            clave = "rojo";
        else {
            clave = PREFERIDOS[generos[id] ?? "otro"].find(c => libres.has(c)) ?? RESPALDO.find(c => libres.has(c)) ?? (libres.has("rojo") && !anfitrion ? "rojo" : undefined);
        }
        // Más de 8 (no debería pasar: el cupo es 8): se repite en ciclo.
        const tono = clave ? PALETA_SALA[clave] : COLORES_JUGADOR[k % COLORES_JUGADOR.length];
        if (clave)
            libres.delete(clave);
        mapa.set(id, { ...tono, n: k + 1, etiqueta: `P${k + 1}` });
    });
    return mapa;
}
// Colores de la sala abierta en este aparato. Los fija `useColoresSala` (Sala y Pantalla) y los usan el marcador,
// el podio y cada juego por medio de `colorDe`, así el color del lobby es el mismo en toda la partida.
let coloresSala = null;
export function fijarColoresSala(m) { coloresSala = m; }
/** Color de `id`: el de la sala si ya se calculó; si no, según el orden de `ids`. null si no está. */
export function colorDe(id, ids) {
    const c = coloresSala?.get(id);
    if (c)
        return c;
    const i = ids.indexOf(id);
    return i < 0 ? null : colorJugador(i);
}
/** Variables de CSS para pintar algo con el color del jugador: --pj, --pj-claro, --pj-oscuro, --pj-texto. */
export const varsColor = (c) => (c ? { "--pj": c.base, "--pj-claro": c.claro, "--pj-oscuro": c.oscuro, "--pj-texto": c.texto } : {});
/** Nombre de archivo del color (sin acentos): «Café» → «cafe». */
export const claveArchivo = (c) => c.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
