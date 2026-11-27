// Emotes al revelar (idea de Rea-games aprobada por Elías, 27 nov): al salir el resultado, cada celular puede mandar
// una reacción que vuela en la TV. Viajan por el canal de gestos de la sala (servicios/gestosSala.ts), sin tablas.
// Solo es aviso visual: nunca decide nada del juego ni da puntos. Se manda el número del emote, nunca texto.
export const EMOTES = ["😂", "😱", "👏", "🙄", "🔥", "💀"];
/** Lo mínimo entre dos emotes del mismo jugador (en el celular y al recibirlos). */
export const ENFRIAR_EMOTE_MS = 500;
const propios = new Set();
const escenas = new Set();
let n = 0, ultimo = 0;
const vistos = new Map();
export const esEmote = (k) => typeof k === "number" && Number.isInteger(k) && k >= 0 && k < EMOTES.length;
/** El jugador de este aparato toca un emote. Devuelve false si fue muy seguido. */
export function lanzarEmote(jugador, k, ahora = Date.now()) {
    if (!jugador || !esEmote(k) || ahora - ultimo < ENFRIAR_EMOTE_MS)
        return false;
    ultimo = ahora;
    const e = { jugador, k, n: ++n + Math.floor(ahora / 1000) * 1000 };
    propios.forEach(f => f(e));
    return true;
}
/** Llega un emote de otro aparato (ya revisado por gestosSala). Descarta repetidos, viejos y muy seguidos. */
export function aplicarEmoteRemoto(jugador, k, num, ahora = Date.now()) {
    if (!jugador || !esEmote(k))
        return false;
    const u = vistos.get(jugador);
    if (u && (num <= u.n || ahora - u.t < ENFRIAR_EMOTE_MS - 150))
        return false;
    vistos.set(jugador, { n: num, t: ahora });
    escenas.forEach(f => f({ jugador, k, n: num }));
    return true;
}
/** gestosSala escucha los propios para mandarlos. */
export function alEmotePropio(f) { propios.add(f); return () => { propios.delete(f); }; }
/** La TV escucha los que llegan para dibujarlos. */
export function alEmote(f) { escenas.add(f); return () => { escenas.delete(f); }; }
