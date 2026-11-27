/** Entre un poder y otro del mismo jugador (la escena además espera a que termine el que suena). */
export const ENFRIAR_PODER_MS = 900;
export const esPoder = (x) => typeof x === "string" && /^[a-z][a-z0-9-]{0,23}$/.test(x);
const ultimos = new Map();
const oyentes = new Set();
const propios = new Set();
/** Poder de este aparato. false si llega muy seguido o el nombre no es válido. */
export function pedirPoder(jugador, poder, ahora = Date.now()) {
    if (!jugador || !esPoder(poder))
        return false;
    const u = ultimos.get(jugador);
    if (u && ahora - u.t < ENFRIAR_PODER_MS)
        return false;
    const e = { jugador, poder, n: Math.max((u?.n ?? 0) + 1, Math.floor(ahora / 100)) };
    ultimos.set(jugador, { n: e.n, t: ahora });
    oyentes.forEach(f => f(e));
    propios.forEach(f => f(e));
    return true;
}
/** Un poder que llegó por la red: se descarta si es viejo o repetido (`n` no avanza). */
export function aplicarPoderRemoto(jugador, poder, n, ahora = Date.now()) {
    if (!jugador || !esPoder(poder) || !Number.isInteger(n) || n < 1)
        return false;
    const u = ultimos.get(jugador);
    if (u && n <= u.n)
        return false;
    ultimos.set(jugador, { n, t: ahora });
    oyentes.forEach(f => f({ jugador, poder, n }));
    return true;
}
/** Las escenas: cada poder pedido (propio o de la sala). */
export function alPedirPoder(f) { oyentes.add(f); return () => { oyentes.delete(f); }; }
/** La red: solo los que decidió este aparato. */
export function alPoderPropio(f) { propios.add(f); return () => { propios.delete(f); }; }
/** Solo para pruebas. */
export function reiniciarPoderes() { ultimos.clear(); }
