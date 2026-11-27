import { modoCorteV3 } from "../personajes/integracion";
const PREFIJO = "alv-capsulas-pendientes-", PREFIJO_CORTE = "alv-capsulas-pendientes-c3-";
const clave = (jugador) => (modoCorteV3() ? PREFIJO_CORTE : PREFIJO) + idJugador(jugador);
/** Época de las figuras en este aparato: «corte», «v2» o «revertido:<id>» (Codex, v3-directo-r1 y -verif).
 *  Un build SIN corte que encuentra «corte» (se revirtió) borra los pendientes de antes del corte y abre una reversión con id
 *  nuevo. Desde ahí CADA cuenta de este aparato se rehace una vez desde la nube (`debeRestaurar`), aunque la nube esté vacía y
 *  aunque falle la primera lectura o se recargue la página: la marca por cuenta solo se pone al terminar bien
 *  (`marcarRestaurada`). Lo de la época del corte vive en sus propias claves y un build sin corte no lo lee. */
const MARCA = "alv-epoca-figuras", RESTAURADA = "alv-epoca-restaurada-";
export function prepararEpoca(corte = modoCorteV3()) {
    try {
        const antes = localStorage.getItem(MARCA);
        if (corte) {
            if (antes !== "corte")
                localStorage.setItem(MARCA, "corte");
            return;
        }
        if (antes === "corte") {
            const borrar = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(PREFIJO) && !k.startsWith(PREFIJO_CORTE))
                    borrar.push(k);
            }
            borrar.forEach(k => localStorage.removeItem(k));
            localStorage.setItem(MARCA, "revertido:" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
        }
        else if (antes == null)
            localStorage.setItem(MARCA, "v2");
    }
    catch { /* sin almacenamiento */ }
}
const idJugador = (jugador) => jugador.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local";
/** La reversión que esta cuenta todavía no rehace desde la nube (null = nada que rehacer). */
export function debeRestaurar(jugador, corte = modoCorteV3()) {
    if (corte)
        return null;
    prepararEpoca(corte);
    try {
        const m = localStorage.getItem(MARCA);
        if (!m || !m.startsWith("revertido:"))
            return null;
        return localStorage.getItem(RESTAURADA + idJugador(jugador)) === m ? null : m;
    }
    catch {
        return null;
    }
}
/** La cuenta ya se rehizo desde la nube tras la reversión `marca` (si mientras tanto no empezó otra época). */
export function marcarRestaurada(jugador, marca) {
    try {
        if (localStorage.getItem(MARCA) === marca)
            localStorage.setItem(RESTAURADA + idJugador(jugador), marca);
    }
    catch { /* sin almacenamiento */ }
}
const valido = (i) => Number.isInteger(i) && i >= 0 && i < 3;
export function leerSellos(jugador) {
    try {
        const x = JSON.parse(localStorage.getItem(clave(jugador)) ?? "{}");
        if (!x || typeof x !== "object" || Array.isArray(x))
            return {};
        const fuera = {};
        for (const [k, v] of Object.entries(x))
            if (valido(Number(k)) && typeof v === "string" && v.length <= 40)
                fuera[Number(k)] = v;
        return fuera;
    }
    catch {
        return {};
    }
}
export const leerPendientes = (jugador) => Object.keys(leerSellos(jugador)).map(Number).sort();
function escribir(jugador, s) {
    try {
        if (Object.keys(s).length)
            localStorage.setItem(clave(jugador), JSON.stringify(s));
        else
            localStorage.removeItem(clave(jugador));
    }
    catch { /* sin almacenamiento */ }
}
let serie = 0;
export function marcarPendiente(jugador, i) {
    if (!valido(i))
        return;
    prepararEpoca(); // si recién se revirtió, los pendientes viejos se borran ANTES de anotar este
    escribir(jugador, { ...leerSellos(jugador), [i]: Date.now().toString(36) + "-" + (++serie).toString(36) + "-" + Math.random().toString(36).slice(2, 8) });
}
/** Quita solo las marcas cuyo sello sigue siendo el que se subió. */
export function quitarPendientes(jugador, subidos) {
    const ahora = leerSellos(jugador);
    for (const [k, v] of Object.entries(subidos))
        if (ahora[Number(k)] === v)
            delete ahora[Number(k)];
    escribir(jugador, ahora);
}
/**
 * Lo que debe quedar aquí y en la nube: manda la nube (lo que se borró o cambió en otro aparato se respeta), salvo los
 * espacios pendientes de este aparato, que se quedan como están aquí. La activa: la de aquí si es un pendiente; si no,
 * la de la nube.
 */
export function combinar(nube, aqui, pendientes) {
    const slots = nube.slots.map((c, k) => (pendientes.includes(k) ? aqui.slots[k] ?? null : c ?? null));
    const activaAqui = aqui.activa != null && pendientes.includes(aqui.activa) && slots[aqui.activa] ? aqui.activa : null;
    const activa = activaAqui ?? (nube.activa != null && slots[nube.activa] ? nube.activa : slots.findIndex(Boolean) >= 0 ? slots.findIndex(Boolean) : null);
    return { version: 1, activa, slots };
}
