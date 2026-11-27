// Reloj compartido entre la TV y cada celular (prototipo de Mini-Juegos, zona aparte).
// El celular manda ping con su hora (t0); la TV contesta con la suya (tRemoto); el celular la recibe en t1.
// Igual que NTP: la muestra con el viaje más corto es la más confiable. Sin DOM: lo prueba minijuegos.test.ts.
/** offset = cuánto hay que sumarle a la hora del celular para tener la de la TV. */
export function muestra(t0, tRemoto, t1) {
    const rtt = t1 - t0;
    if (!Number.isFinite(rtt) || rtt < 0 || rtt > 5000 || !Number.isFinite(tRemoto))
        return null;
    return { offset: tRemoto - (t0 + t1) / 2, rtt };
}
/** La mejor estimación con las últimas muestras: la de menor viaje. La incertidumbre es medio viaje. */
export function estimar(muestras, ultimas = 12) {
    const vistas = muestras.slice(-ultimas);
    if (!vistas.length)
        return null;
    let mejor = vistas[0];
    for (const m of vistas)
        if (m.rtt < mejor.rtt)
            mejor = m;
    return { offset: mejor.offset, rtt: mejor.rtt, incertidumbre: mejor.rtt / 2, muestras: vistas.length };
}
/** Mínimo para dejar jugar (Codex O4): varias muestras y un viaje razonable. Antes de eso, «Sincronizando…». */
export const MIN_MUESTRAS = 5;
export const MAX_VIAJE = 600;
/** Más incertidumbre que esto y la TV no acepta el toque (el reloj de ese celular no sirve para juzgar). */
export const MAX_INCERTIDUMBRE = 250;
export const relojListo = (e) => !!e && e.muestras >= MIN_MUESTRAS && e.rtt <= MAX_VIAJE;
/**
 * La TV recibe una hora de toque ya traducida a su reloj (Codex O3). Se rechaza (null) si no es un número, si dice que
 * pasó en el futuro más allá de `adelante` ms (reloj mal medido) o si es más vieja que `maxAtras` ms (mensaje viejo).
 * Un poco en el futuro se acota a la llegada.
 */
export function acotarToque(tToque, llegada, maxAtras = 600, adelante = 60) {
    if (!Number.isFinite(tToque) || !Number.isFinite(llegada))
        return null;
    if (tToque > llegada + adelante || tToque < llegada - maxAtras)
        return null;
    return Math.min(llegada, tToque);
}
