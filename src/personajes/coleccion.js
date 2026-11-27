// «Mi colección» con figuras v3 (3 espacios, uno activo). Por ahora solo en este aparato y en una clave aparte
// (`alv-coleccion-v3-<jugador>`), para no tocar las cápsulas v2 que usa el juego hoy. La nube llega con la migración
// de la fase 5 (D-002).
import { leerFigura } from "./figura";
export const ESPACIOS = 3;
export const vacia = () => ({ version: 1, activa: null, espacios: Array(ESPACIOS).fill(null) });
/** Limpia lo que venga del almacenamiento: figuras inválidas fuera, activa solo si apunta a un espacio lleno. */
export function normalizar(x) {
    const c = vacia();
    const s = x;
    if (!s || !Array.isArray(s.espacios))
        return c;
    for (let i = 0; i < ESPACIOS; i++)
        c.espacios[i] = leerFigura(s.espacios[i]);
    const a = s.activa;
    const primera = c.espacios.findIndex(Boolean);
    c.activa = typeof a === "number" && c.espacios[a] ? a : primera >= 0 ? primera : null;
    return c;
}
/** Pone la figura en un espacio (el que se pida, si no el activo, si no el primero vacío, si no el primero) y lo activa. */
export function ponerEnColeccion(c, figura, espacio) {
    const i = espacio != null && espacio >= 0 && espacio < ESPACIOS ? espacio
        : c.activa ?? (c.espacios.findIndex(e => !e) >= 0 ? c.espacios.findIndex(e => !e) : 0);
    const espacios = [...c.espacios];
    espacios[i] = figura;
    return { version: 1, activa: i, espacios };
}
export const figuraActiva = (c) => (c.activa == null ? null : c.espacios[c.activa] ?? null);
const clave = (jugador) => "alv-coleccion-v3-" + (jugador.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
export function leerColeccion(jugador) {
    try {
        return normalizar(JSON.parse(localStorage.getItem(clave(jugador)) ?? "null"));
    }
    catch {
        return vacia();
    }
}
export function guardarColeccion(jugador, c) {
    try {
        localStorage.setItem(clave(jugador), JSON.stringify(normalizar(c)));
    }
    catch { /* sin almacenamiento */ }
}
