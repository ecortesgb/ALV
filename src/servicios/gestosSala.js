// Gestos entre los aparatos de una sala (ALV_PLAN_ANIMACIONES.md): canal `gestos-<sala>` de difusión, sin tablas.
// Este aparato manda solo los gestos de su jugador; los de los demás llegan, se revisan y van a la tienda global.
// La figura nunca viaja: cada aparato la toma de su lista de miembros. Solo es aviso visual: nunca decide nada del juego.
import { useEffect, useRef } from "react";
import { ENFRIAR_MS, alGestoPropio, aplicarGestoRemoto, esGesto } from "../app/animaciones";
import { abrirDifusion } from "./difusion";
import { alVidaPropia, aplicarVidaRemota } from "../app/vidaPerfil";
import { alFormaPropia, aplicarFormaRemota, estadoForma } from "../app/formas";
import { alPoderPropio, aplicarPoderRemoto, esPoder } from "../app/poderes";
/**
 * Revisa un aviso de gesto: que sea de un miembro de la sala (y no de este aparato), un gesto conocido, en orden
 * (`n` mayor al último de ese jugador) y no más seguido que el enfriamiento. Devuelve el mensaje limpio o null.
 */
export function revisarGesto(d, miembros, yo, ultimo, ahora) {
    const j = d.j, g = d.g, n = d.n, p = d.p;
    if (typeof j !== "string" || j.length > 64 || !miembros.has(j) || j === yo)
        return null;
    if (!esGesto(g) || typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 1e13)
        return null;
    const u = ultimo.get(j);
    if (u && (n <= u.n || ahora - u.t < ENFRIAR_MS - 150))
        return null;
    ultimo.set(j, { n, t: ahora });
    return { g, j, n, p: typeof p === "string" && /^[a-z0-9-]{1,64}$/.test(p) ? p : null };
}
const NOMBRE_VIDA = /^(lib:[a-z0-9_]{1,60}|[a-z0-9-]{1,40})$/;
const numeroEn = (v, a, b) => (typeof v === "number" && Number.isFinite(v) && v >= a && v <= b ? v : null);
/**
 * Revisa un aviso de vida automática (etapa 3): de un miembro (no de este aparato), con nombres válidos y números en
 * rango. El orden y los repetidos los descarta aplicarVidaRemota. Devuelve el evento limpio o null.
 */
export function revisarVida(d, miembros, yo) {
    const j = d.j, n = d.n, a = d.a, r = d.r;
    if (typeof j !== "string" || j.length > 64 || !miembros.has(j) || j === yo)
        return null;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 1e13)
        return null;
    if (typeof a !== "string" || typeof r !== "string" || !NOMBRE_VIDA.test(a) || !NOMBRE_VIDA.test(r) || r.startsWith("lib:"))
        return null;
    const vel = numeroEn(d.vel, 0.5, 1.6), int = numeroEn(d.int, 0.4, 1.4), dur = d.dur == null ? undefined : numeroEn(d.dur, 0.5, 20);
    if (vel == null || int == null || dur === null)
        return null;
    return { jugador: j, n, a, r, vel, int, ...(dur ? { dur } : {}) };
}
/** Revisa un aviso de forma (transformaciones): de un miembro (no de este aparato), paso 0 a 9 y orden válido. El orden y los
 *  repetidos los descarta aplicarFormaRemota. */
export function revisarForma(d, miembros, yo) {
    const j = d.j, k = d.k, n = d.n;
    if (typeof j !== "string" || j.length > 64 || !miembros.has(j) || j === yo)
        return null;
    if (typeof k !== "number" || !Number.isInteger(k) || k < 0 || k > 9)
        return null;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 1e13)
        return null;
    return { j, k, n, e: d.e === true };
}
/** Revisa un aviso de poder: de un miembro (no de este aparato), nombre válido y orden válido. */
export function revisarPoder(d, miembros, yo) {
    const j = d.j, k = d.k, n = d.n;
    if (typeof j !== "string" || j.length > 64 || !miembros.has(j) || j === yo || !esPoder(k))
        return null;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 1e13)
        return null;
    return { j, k, n };
}
/** Abre el canal de gestos de la sala mientras la pantalla está montada. `yo` vacío (la TV): solo escucha. */
export function useGestosSala(salaId, yo, miembros) {
    const ids = useRef(new Set());
    const reenviar = useRef(() => { });
    ids.current = new Set(miembros.map(m => m.id));
    useEffect(() => {
        if (!salaId)
            return;
        const ultimo = new Map();
        const canal = abrirDifusion(`gestos-${salaId}`, (evento, d) => {
            if (evento === "v") {
                const v = revisarVida(d, ids.current, yo);
                if (v)
                    aplicarVidaRemota(v);
                return;
            }
            if (evento === "f") {
                const f = revisarForma(d, ids.current, yo);
                if (f)
                    aplicarFormaRemota(f.j, f.k, f.n, f.e);
                return;
            }
            if (evento === "p") {
                const p = revisarPoder(d, ids.current, yo);
                if (p)
                    aplicarPoderRemoto(p.j, p.k, p.n);
                return;
            }
            if (evento !== "g")
                return;
            const m = revisarGesto(d, ids.current, yo, ultimo, Date.now());
            if (m)
                aplicarGestoRemoto(m.j, m.g, m.n, m.p);
        });
        const fuera = yo ? alGestoPropio(e => { if (e.jugador === yo && ids.current.has(yo))
            canal.enviar("g", { g: e.gesto, j: e.jugador, p: e.personaje, n: e.n }); }) : () => { };
        // Vida automática que decidió ESTE aparato para su jugador (la TV no decide: yo vacío).
        const fueraVida = yo ? alVidaPropia(e => { if (e.jugador === yo && ids.current.has(yo))
            canal.enviar("v", { j: e.jugador, n: e.n, a: e.a, r: e.r, vel: e.vel, int: e.int, ...(e.dur ? { dur: e.dur } : {}) }); }) : () => { };
        // Forma propia (transformaciones): al cambiarla, y otra vez cuando entra alguien a la sala (no la vio cambiar).
        const mandarForma = () => { const f = estadoForma(yo); if (yo && f.n && ids.current.has(yo))
            canal.enviar("f", { j: yo, k: f.paso, n: f.n, e: false }); };
        const fueraForma = yo ? alFormaPropia(e => { if (e.jugador === yo && ids.current.has(yo))
            canal.enviar("f", { j: yo, k: e.paso, n: e.n, e: e.conEspecial }); }) : () => { };
        const fueraPoder = yo ? alPoderPropio(e => { if (e.jugador === yo && ids.current.has(yo))
            canal.enviar("p", { j: yo, k: e.poder, n: e.n }); }) : () => { };
        mandarForma();
        reenviar.current = mandarForma;
        return () => { fuera(); fueraVida(); fueraForma(); fueraPoder(); reenviar.current = () => { }; canal.cerrar(); };
    }, [salaId, yo]);
    // Alguien nuevo en la sala: se le vuelve a decir la forma propia (sin animación: e = false).
    const firma = miembros.map(m => m.id).sort().join(",");
    useEffect(() => { const t = setTimeout(() => reenviar.current(), 800); return () => clearTimeout(t); }, [firma]);
}
