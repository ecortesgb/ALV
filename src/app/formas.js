// Forma de cada jugador (transformaciones, Elías 27 nov 2026): en qué paso de su ciclo va (Banner ↔ Hulk, Tony / Iron Man /
// casco arriba, Peter ↔ Spider-Man). «Transformar» en la rueda avanza un paso y la forma se queda hasta volver a tocar.
// Igual que los gestos: este aparato decide la de su jugador y la avisa a la sala (gestosSala.ts); las de los demás llegan
// por la red. Solo es dibujo: nunca cambia la figura guardada ni decide nada del juego.
import { useSyncExternalStore } from "react";
import { caretaDe, enForma, especialAlSalir, formasDe } from "../personajes/integracion";
const QUIETA = Object.freeze({ paso: 0, n: 0, conEspecial: false });
const estados = new Map();
const oyentes = new Set();
const alPropias = new Set();
let version = 0;
// La forma propia se queda al recargar o cambiar de pantalla (misma pestaña).
const GUARDA = "alv-formas";
try {
    const g = JSON.parse(sessionStorage.getItem(GUARDA) ?? "{}");
    for (const [j, v] of Object.entries(g)) {
        const e = v;
        if (Number.isInteger(e.paso) && e.paso > 0 && e.paso < 10 && Number.isInteger(e.n))
            estados.set(j, { paso: e.paso, n: e.n, conEspecial: false });
    }
}
catch { /* sin almacenamiento */ }
const guardar = (j, e) => {
    try {
        const g = JSON.parse(sessionStorage.getItem(GUARDA) ?? "{}");
        g[j] = { paso: e.paso, n: e.n };
        sessionStorage.setItem(GUARDA, JSON.stringify(g));
    }
    catch { /* sin almacenamiento */ }
};
function poner(jugador, e) {
    estados.set(jugador, e);
    version++;
    oyentes.forEach(f => f());
}
export const estadoForma = (jugador) => estados.get(jugador) ?? QUIETA;
/** Paso de la forma de un jugador para su figura de ahora (0 si su personaje no se transforma). */
export function pasoDe(jugador, figura) {
    const n = formasDe(figura), p = estadoForma(jugador).paso;
    return n > 1 ? p % n : 0;
}
/** ¿Esta figura se puede transformar? */
export const seTransforma = (figura) => formasDe(figura) > 1;
/** «Transformar» de este aparato: avanza un paso del ciclo. false si la figura no se transforma. */
export function transformar(jugador, figura, ahora = Date.now()) {
    const total = formasDe(figura);
    if (!jugador || total < 2)
        return false;
    const e = estadoForma(jugador), paso = pasoDe(jugador, figura);
    const nuevo = { paso: (paso + 1) % total, n: Math.max(e.n + 1, Math.floor(ahora / 100)), conEspecial: especialAlSalir(figura, paso) };
    poner(jugador, nuevo);
    guardar(jugador, nuevo);
    alPropias.forEach(f => f({ jugador, ...nuevo }));
    return true;
}
/** Una forma que llegó por la red: solo se descarta si es vieja o repetida (`n` no avanza). */
export function aplicarFormaRemota(jugador, paso, n, conEspecial) {
    if (!jugador || !Number.isInteger(paso) || paso < 0 || paso > 9 || !Number.isInteger(n) || n < 1)
        return false;
    if (n <= estadoForma(jugador).n)
        return false;
    poner(jugador, { paso, n, conEspecial });
    return true;
}
/** Avisos de las formas que decidió este aparato (para mandarlos a la sala). */
export function alFormaPropia(f) { alPropias.add(f); return () => { alPropias.delete(f); }; }
/** Cambia cada vez que alguna forma cambia (las escenas vuelven a mandar sus figuras). */
export function useVersionFormas() {
    return useSyncExternalStore(f => { oyentes.add(f); return () => { oyentes.delete(f); }; }, () => version);
}
/**
 * Una figura de escena en su forma de ahora. `transforma` (el orden del último cambio) le dice a la escena que el cambio es
 * una transformación (nube de humo, y la especial antes si `conEspecial`), no una figura nueva.
 */
export function conForma(x, cat) {
    if (!x.figura || typeof x.figura !== "object" || !seTransforma(x.figura))
        return x;
    const e = estadoForma(x.id);
    if (!e.n)
        return x;
    const paso = pasoDe(x.id, x.figura);
    const careta = caretaDe(x.figura, paso);
    return { ...x, figura: paso ? enForma(x.figura, paso, cat) : x.figura, transforma: e.n, conEspecial: e.conEspecial, ...(careta ? { careta } : {}) };
}
/** Solo para pruebas. */
export function reiniciarFormas() { estados.clear(); version++; try {
    sessionStorage.removeItem(GUARDA);
}
catch { /* nada */ } }
