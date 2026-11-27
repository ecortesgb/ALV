// Vida automática de una figura según su perfil (ALV_PLAN_ANIMATION_LIBRARY.md, etapa 2).
// El director (perfiles.ts) decide; este hook solo lleva el reloj y manda «momento» con prioridad 0.5 al motor.
// Reglas: nunca en partida ni en resultados; nunca mientras suena un gesto del jugador (ni en los segundos que
// el jugador está probando algo); si la pestaña está oculta, espera. El motor además rechaza la vida si algo más
// importante suena (misma regla de prioridades de siempre).
import { useEffect, useRef } from "react";
import { ESPACIADO, crearDirector, perfilDe, vidaPermitida } from "./perfiles";
import { estadoGesto } from "./animaciones";
const alEscenasVida = new Set();
const alRedVida = new Set();
const ultimoVida = new Map();
/** Las escenas oyen aquí qué vida dibujar. */
export function alVida(f) { alEscenasVida.add(f); return () => { alEscenasVida.delete(f); }; }
/** La red oye aquí la vida que decidió este aparato. */
export function alVidaPropia(f) { alRedVida.add(f); return () => { alRedVida.delete(f); }; }
/** Qué animación tocar en esta escena: la preferida si la tiene, si no el respaldo. */
export const nombreVida = (e, hay) => (e.a.startsWith("lib:") ? (hay(e.a) ? e.a : e.r) : e.a);
/** Vida que llegó por la red: se descarta si es vieja o repetida, o si ese jugador tiene un gesto sonando. */
export function aplicarVidaRemota(e, ahora = Date.now()) {
    if ((ultimoVida.get(e.jugador) ?? 0) >= e.n)
        return false;
    ultimoVida.set(e.jugador, e.n);
    if (estadoGesto(e.jugador).hasta > ahora)
        return false;
    alEscenasVida.forEach(f => f(e));
    return true;
}
/** Solo para pruebas. */
export function reiniciarVida() { ultimoVida.clear(); }
/** Lo que hace el aparato dueño: decide y lo manda a sus escenas y a la red. Devuelve el evento (o null si no actuó). */
export function emitirVidaPropia(jugador, a, ahora = Date.now()) {
    if (estadoGesto(jugador).hasta > ahora)
        return null; // un gesto del jugador manda
    const n = Math.max((ultimoVida.get(jugador) ?? 0) + 1, Math.floor(ahora / 100));
    ultimoVida.set(jugador, n);
    const e = { jugador, n, a: a.lib ?? a.cual, r: a.respaldo, vel: a.vel, int: a.int, ...(a.dur ? { dur: a.dur } : {}) };
    alEscenasVida.forEach(f => f(e));
    alRedVida.forEach(f => f(e));
    return e;
}
/** El director de la figura de ESTE aparato (dueño). Solo en contextos con vida; nunca para figuras ajenas. */
export function useVidaPropia({ activo, jugador, figura, contexto }) {
    const perfil = perfilDe(figura);
    useEffect(() => {
        if (!activo || !jugador || !perfil || !vidaPermitida(contexto) || contexto === "tv")
            return;
        const dir = crearDirector(perfil, Math.random, () => true, ESPACIADO[contexto]);
        let reloj;
        const turno = () => {
            if (typeof document === "undefined" || !document.hidden) {
                const a = dir.decidir();
                if (a)
                    emitirVidaPropia(jugador, a);
            }
            reloj = setTimeout(turno, dir.espera());
        };
        reloj = setTimeout(turno, dir.espera());
        return () => clearTimeout(reloj);
    }, [activo, jugador, perfil, contexto]);
}
export function useVidaPerfil(o) {
    const vivo = useRef(o);
    vivo.current = o;
    const { activo, perfil, contexto } = o;
    useEffect(() => {
        if (!activo || !perfil || !vidaPermitida(contexto))
            return;
        const dir = crearDirector(perfil, Math.random, n => vivo.current.hay(n));
        let reloj;
        const turno = () => {
            const v = vivo.current, ahora = Date.now();
            const ocupado = (v.ocupadoHasta?.current ?? 0) > ahora || (v.jugador ? estadoGesto(v.jugador).hasta > ahora : false);
            if (!ocupado && typeof document !== "undefined" && !document.hidden) {
                const a = dir.decidir();
                if (a) {
                    v.enviar({ tipo: "momento", id: v.id, cual: a.cual, prio: a.prio, vel: a.vel, int: a.int, ...(a.dur ? { dur: a.dur } : {}) });
                    v.alActuar?.(a);
                }
            }
            reloj = setTimeout(turno, dir.espera());
        };
        reloj = setTimeout(turno, dir.espera());
        return () => clearTimeout(reloj);
    }, [activo, perfil, contexto]);
}
