import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// La mesa de la partida (Elías, 24 nov): la tarjeta y la herramienta al centro, los personajes a los lados en sus fichas.
// Por equipos, parejas o bandos, cada grupo va de un lado con su nombre y sus puntos. Las fichas reaccionan con lo que
// pasa en la ronda (solo con la vista pública): brillan cuando es su turno, piensan mientras faltan, saltan al contestar,
// festejan si sumaron al revelar y se lamentan si no. La usan el celular (modo celulares) y la TV.
import { useRef } from "react";
import { colorDe } from "../app/colorJugador";
import { FichaJugador } from "./lobby/Ficha";
import { useGesto } from "../app/animaciones";
import { RuedaFigura } from "./gestos/RuedaFigura";
import "./mesa.css";
/** Puntos y quiénes debían contestar al empezar cada ronda (clave: jugadores, juego y ronda). */
const ANTES = new Map();
/** Quiénes tienen el turno ahora (verdad o reto: quien pregunta y quien responde; turnos: el del turno). */
export function turnoDe(v) {
    if (v.fase !== "contestando")
        return [];
    if (v.verdadReto)
        return [v.verdadReto.responde, v.verdadReto.pregunta];
    return v.turnoDe ? [v.turnoDe] : [];
}
/** Reparte a los jugadores en dos lados: por grupo (pares a la izquierda, nones a la derecha) o alternando. */
export function lados(v) {
    const ids = v.jugadores.map(j => j.id);
    if (v.grupos?.length) {
        const gs = [...v.grupos].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map(g => ({ titulo: g.nombre, puntos: g.puntos, ids: g.jugadores }));
        return { izq: gs.filter((_, i) => i % 2 === 0), der: gs.filter((_, i) => i % 2 === 1) };
    }
    return { izq: [{ ids: ids.filter((_, i) => i % 2 === 0) }], der: [{ ids: ids.filter((_, i) => i % 2 === 1) }] };
}
export function MesaJuego({ v, miembros, yo, modo, children }) {
    const rueda = useRef(null);
    const ids = v.jugadores.map(j => j.id);
    const turno = turnoDe(v);
    // Reacciones al revelar: puntos de cuando empezó la ronda contra los de después. Se guardan fuera del componente
    // (por partida y ronda) para que sobrevivan si la mesa se vuelve a montar (en Local, al pasar el teléfono).
    const clave = `${ids.join(",")}|${v.juegoId}|${v.ronda}`;
    if (v.fase === "contestando") {
        const a = ANTES.get(clave);
        if (!a) {
            ANTES.set(clave, { puntos: { ...v.puntos }, esperados: [...v.esperados] });
            if (ANTES.size > 40)
                ANTES.delete(ANTES.keys().next().value);
        }
        else
            for (const e of v.esperados)
                if (!a.esperados.includes(e))
                    a.esperados.push(e);
    }
    const a = v.fase === "revelada" ? ANTES.get(clave) : undefined;
    const reac = {};
    if (a)
        for (const id of ids) {
            const delta = (v.puntos[id] ?? 0) - (a.puntos[id] ?? 0);
            if (delta > 0)
                reac[id] = { tipo: "festeja", delta };
            // Se lamenta quien podía sumar y no sumó (en Verdad o reto, solo quien respondió: quien pregunta no juega puntos).
            else if (v.verdadReto ? id === v.verdadReto.responde : a.esperados.includes(id))
                reac[id] = { tipo: "lamenta", delta };
        }
    const eliminados = v.impostor?.eliminados ?? [];
    const anchaPantalla = typeof matchMedia !== "undefined" && matchMedia("(min-width: 900px)").matches;
    const t = modo === "tv" ? (v.jugadores.length > 6 ? 84 : 104) : anchaPantalla ? (v.jugadores.length > 6 ? 56 : 66) : v.jugadores.length > 6 ? 44 : 52;
    const ficha = (id) => {
        const nombre = v.jugadores.find(j => j.id === id)?.nombre ?? "";
        const r = reac[id];
        const estado = eliminados.includes(id) ? "fuera"
            : r ? r.tipo
                : turno.includes(id) ? "turno"
                    : v.fase === "contestando" && v.contestaron.includes(id) ? "listo"
                        : v.fase === "contestando" && v.esperados.length > 1 && v.esperados.includes(id) ? "pensando" : "";
        const insignia = { festeja: "🎉", lamenta: "😅", turno: "⭐", listo: "✓", pensando: "💭", fuera: "✖", "": "" }[estado];
        return (_jsxs("li", { className: "ms-ficha" + (estado ? " " + estado : "") + (id === yo ? " yo" : ""), style: { "--ms-t": `${t}px` }, "aria-label": `${nombre}: ${v.puntos[id] ?? 0} puntos`, children: [_jsxs("span", { className: "ms-cuerpo", children: [modo === "celular" && id === yo && _jsx("button", { type: "button", className: "ms-toca", "aria-label": "Gestos de tu figura", onClick: e => rueda.current?.abrir(e.clientX, e.clientY) }), _jsx(FichaJugador, { id: id, figura: miembros.find(m => m.id === id)?.figura, nombre: nombre, color: colorDe(id, ids), tamano: t, soloCara: true }), insignia && _jsx("span", { className: "ms-insignia", "aria-hidden": "true", children: insignia }), _jsx(GestoFicha, { id: id }), r && r.delta !== 0 && _jsxs("span", { className: "ms-delta" + (r.delta < 0 ? " menos" : ""), "aria-hidden": "true", children: [r.delta > 0 ? "+" : "−", Math.abs(r.delta)] })] }, `${id}-${estado}-${v.ronda}`), _jsx("span", { className: "ms-nom", children: nombre }), _jsxs("b", { className: "ms-pts", children: [v.puntos[id] ?? 0, (v.cartasEnMano[id] ?? 0) > 0 && _jsxs("small", { className: "ms-cartas", title: "Comodines", children: ["\u26A1", v.cartasEnMano[id]] })] })] }, id));
    };
    const lado = (gs, cual) => (_jsx("aside", { className: "ms-lado " + cual, children: gs.map((g, i) => (_jsxs("section", { className: "ms-grupo" + (g.titulo ? " titulado" : ""), children: [g.titulo && _jsxs("header", { className: "ms-grupo-cab", children: [_jsx("b", { children: g.titulo }), _jsx("span", { children: g.puntos ?? 0 })] }), _jsx("ul", { children: g.ids.map(ficha) })] }, i))) }));
    const l = lados(v);
    return (_jsxs("div", { className: `ms ms-${modo}`, children: [lado(l.izq, "izq"), _jsx("div", { className: "ms-centro", children: children }, `c${v.ronda}`), modo === "celular" && yo && miembros.some(m => m.id === yo) && _jsx(RuedaFigura, { ref: rueda, jugador: yo, figura: miembros.find(m => m.id === yo)?.figura }), lado(l.der, "der")] }));
}
const SIMBOLO = { saludar: "👋", victoria: "🏆", derrota: "💀", especial: "✨" };
/** Gesto que lanzó este jugador (rueda de gestos, aquí o en otro aparato): la ficha reacciona y sale su símbolo. */
function GestoFicha({ id }) {
    const { gesto, n } = useGesto(id);
    return gesto ? _jsx("span", { className: "ms-gesto g-" + gesto, "aria-hidden": "true", children: SIMBOLO[gesto] }, n) : null;
}
