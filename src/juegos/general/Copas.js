import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Podio de fin de juego y ceremonia de copas de la noche (Maestro 6A.11 C2). Solo usan la vista pública.
// - PodioJuego: al terminar cada juego, 1.º, 2.º y 3.º por puntos y, si se jugó por grupos, el grupo ganador.
// - CeremoniaCopas: al cerrar el lobby, copa individual (oro, plata y bronce), copa parejas, copa equipos y copa ALVersus.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { colorDe, varsColor } from "../../app/colorJugador";
import { FichaJugador } from "../../pantallas/lobby/Ficha";
import { marcador, nombreDe, nombreJuego } from "./texto";
import "./copas.css";
/** Trofeo: la copa 3D de Elías (ui/configurar/copas.webp) con el tono de cada copa y su placa. */
export function Copa({ tono, texto, size = 90 }) {
    return (_jsxs("span", { className: `cp-copa cp-${tono}`, style: { "--cp-t": `${size}px` }, role: "img", "aria-label": `Copa ${texto ?? tono}`, children: [_jsx("img", { src: `${import.meta.env.BASE_URL}arte/ui/configurar/copas.webp`, alt: "", draggable: false }), texto && _jsx("b", { className: "cp-copa-t", children: texto })] }));
}
/** ¿Es la revelación final del juego (para mostrar su podio)? */
export function esFinalDeJuego(v) {
    if (v.fase !== "revelada" || v.juegoId === "copas")
        return false;
    if (v.impostor)
        return !!v.revelado?.fin;
    return v.ronda >= v.totalRondas;
}
/** Dibuja la capa sobre toda la pantalla (raíz .D), encima del marcador. */
function useRaiz() {
    const ancla = useRef(null);
    const [raiz, setRaiz] = useState(null);
    useEffect(() => { setRaiz(ancla.current?.closest(".D") ?? null); }, []);
    return { ancla, raiz };
}
const ORDINAL = (n) => `${n}.º`;
/** Tabla de posiciones: lugar en un bloque del color del jugador, retrato, P# y nombre, y puntos. */
export function Posiciones({ v, miembros, puntos, grande }) {
    const ids = v.jugadores.map(j => j.id);
    const figura = (id) => miembros.find(m => m.id === id)?.figura;
    const m = marcador(puntos ? { ...v, puntos } : v);
    return (_jsx("ol", { className: "pos" + (grande ? " grande" : ""), "aria-label": "Posiciones", children: m.map((j, i) => {
            const c = colorDe(j.id, ids);
            return (_jsxs("li", { style: { ...varsColor(c), "--i": i }, children: [_jsx("span", { className: "pos-lugar dsp ol", children: ORDINAL(j.lugar) }), _jsx("span", { className: "pos-nom", children: _jsx(FichaJugador, { id: j.id, figura: figura(j.id), nombre: j.nombre, color: c, tamano: grande ? 56 : 40 }) }), _jsxs("b", { className: "pos-pts dsp ol", children: [j.puntos, _jsx("small", { children: " pts" })] })] }, j.id));
        }) }));
}
/**
 * Podio de fin de juego. TV: a la izquierda los puntos y a la derecha un bloque del color de cada jugador, más alto
 * cuanto mejor quedó, con su figura encima; aparece sobre la escena unos segundos después del resultado.
 * Celular: tabla de posiciones abajo del resultado.
 */
export function PodioJuego({ v, miembros, modo }) {
    const ids = v.jugadores.map(j => j.id);
    const figura = (id) => miembros.find(m => m.id === id)?.figura;
    const m = marcador(v);
    const lugarDe = (id) => m.find(x => x.id === id)?.lugar ?? m.length;
    const grupo = v.grupos?.[0];
    const empateGrupo = !!v.grupos && v.grupos.length > 1 && v.grupos[1].puntos === grupo?.puntos;
    const [ver, setVer] = useState(modo === "celular");
    // El impostor en la nave: antes del podio van la expulsión y el final con castigos.
    const retraso = v.impostor?.nave ? 17000 : 3500;
    useEffect(() => { if (modo !== "tv")
        return; const t = setTimeout(() => setVer(true), retraso); return () => clearTimeout(t); }, [modo, retraso]);
    const { ancla, raiz } = useRaiz();
    const banda = grupo && _jsxs("p", { className: "pj-grupo dsp ol", children: [empateGrupo ? "¡Empate entre grupos!" : `¡Gana ${grupo.nombre}!`, " ", _jsxs("small", { children: [grupo.puntos, " pts"] })] });
    if (modo === "celular") {
        return _jsxs("section", { className: "pj pj-celular", "aria-label": `Podio de ${nombreJuego(v.juegoId)}`, children: [_jsx("span", { className: "pj-t dsp ol", children: "Posiciones" }), banda, _jsx(Posiciones, { v: v, miembros: miembros })] });
    }
    if (!raiz)
        return _jsx("span", { ref: ancla, hidden: true });
    const alto = (id) => { const l = lugarDe(id), n = Math.max(2, m.length); return 30 + Math.round(((n - l) / (n - 1)) * 55); };
    return ver ? createPortal(_jsx("div", { className: "pj-capa", onClick: () => setVer(false), children: _jsxs("section", { className: "pj pj-tv", "aria-label": `Podio de ${nombreJuego(v.juegoId)}`, children: [_jsx("span", { className: "pj-cartel dsp ol", children: nombreJuego(v.juegoId) }), banda, _jsxs("div", { className: "pj-cuerpo", children: [_jsx(Posiciones, { v: v, miembros: miembros, grande: true }), _jsx("div", { className: "pj-bloques", style: { "--n": ids.length }, children: ids.map((id, i) => {
                                const c = colorDe(id, ids), l = lugarDe(id);
                                return (_jsxs("div", { className: "pj-col" + (l === 1 ? " gana" : ""), style: { ...varsColor(c), "--alto": `${alto(id)}%`, "--i": i }, children: [l === 1 && _jsx("img", { className: "pj-corona", src: `${import.meta.env.BASE_URL}arte/lobby/ico-corona.webp`, alt: "", "aria-hidden": "true" }), _jsx(FichaJugador, { id: id, figura: figura(id), nombre: nombreDe(v, id), color: c, tamano: l === 1 ? 104 : 84, soloCara: true }), _jsx("span", { className: "pj-bloque", children: _jsx("b", { className: "dsp ol", children: ORDINAL(l) }) }), _jsx("span", { className: "pj-pn dsp", children: c?.etiqueta })] }, id));
                            }) })] }), _jsx("p", { className: "pj-nota", children: "Los puntos se suman para las copas de la noche \u00B7 toca para cerrar" })] }) }), raiz) : null;
}
/** En el resumen final, el oro primero. */
const ORDEN_COPA = ["oro", "plata", "bronce", "parejas", "equipos", "alversus"];
/** Los momentos de la ceremonia, en orden: bronce, plata, oro y luego las copas de grupo que se jugaron. */
export function momentosCeremonia(c) {
    const lugar = (n) => c.individual.filter(x => x.lugar === n).map(x => ({ nombre: x.nombre, jugadores: [x.id], puntos: x.puntos }));
    const grupo = (g, titulo, copa, texto) => (g ? [{ titulo, copa, texto, gente: g }] : []);
    return [
        ...(lugar(3).length ? [{ titulo: "Tercer lugar", copa: "bronce", texto: "3.º", gente: lugar(3) }] : []),
        ...(lugar(2).length ? [{ titulo: "Segundo lugar", copa: "plata", texto: "2.º", gente: lugar(2) }] : []),
        ...(lugar(1).length ? [{ titulo: "Copa individual", copa: "oro", texto: "1.º", gente: lugar(1) }] : []),
        ...grupo(c.parejas, "Copa parejas", "parejas", "PAREJAS"),
        ...grupo(c.equipos, "Copa equipos", "equipos", "EQUIPOS"),
        ...grupo(c.alversus, "Copa ALVersus", "alversus", "ALVERSUS"),
    ];
}
/** Ceremonia de copas. TV: un momento a la vez con su copa y al final todas juntas. Celular: todas en lista. */
export function CeremoniaCopas({ v, miembros, modo }) {
    const c = v.copas;
    const ids = v.jugadores.map(j => j.id);
    const figura = (id) => miembros.find(m => m.id === id)?.figura;
    const momentos = c ? momentosCeremonia(c) : [];
    const [k, setK] = useState(modo === "tv" ? 0 : momentos.length);
    useEffect(() => {
        if (modo !== "tv" || k >= momentos.length)
            return;
        const t = setTimeout(() => setK(x => x + 1), 5000);
        return () => clearTimeout(t);
    }, [modo, k, momentos.length]);
    if (!c || c.juegos === 0)
        return _jsxs("div", { className: "cc cc-vacia", children: [_jsx(Copa, { tono: "oro", size: 120 }), _jsx("span", { className: "dsp ol cc-t", children: "Copas de la noche" }), _jsx("p", { children: "Todav\u00EDa no se termin\u00F3 ning\u00FAn juego." })] });
    const Gente = ({ g }) => (_jsx("span", { className: "cc-gente", children: g.jugadores.map(id => (_jsx("span", { className: "cc-persona", style: varsColor(colorDe(id, ids)), children: _jsx(FichaJugador, { id: id, figura: figura(id), nombre: nombreDe(v, id), color: colorDe(id, ids), tamano: modo === "tv" ? 110 : 44 }) }, id))) }));
    if (modo === "tv" && k < momentos.length) {
        const m = momentos[k];
        return (_jsxs("div", { className: "cc cc-tv", children: [_jsxs("span", { className: "cc-sub dsp ol", children: ["Copas de la noche \u00B7 ", c.juegos, " ", c.juegos === 1 ? "juego" : "juegos"] }), _jsx("span", { className: "cc-t dsp ol", children: m.titulo }), _jsx("div", { className: "cc-copa-grande", children: _jsx(Copa, { tono: m.copa, texto: m.texto, size: 200 }) }), m.gente.map(g => _jsxs("div", { className: "cc-ganador", children: [_jsx(Gente, { g: g }), g.jugadores.length > 1 && _jsx("b", { className: "dsp ol", children: g.nombre }), _jsxs("small", { children: [g.puntos, " puntos"] })] }, g.nombre)), m.gente.length > 1 && _jsx("p", { className: "cc-empate dsp ol", children: "\u00A1Empate!" })] }, k));
    }
    return (_jsxs("div", { className: "cc cc-todas cc-" + modo, children: [_jsx("span", { className: "cc-t dsp ol", children: "Copas de la noche" }), _jsx("ul", { className: "cc-lista", children: [...momentos].sort((x, y) => ORDEN_COPA.indexOf(x.copa) - ORDEN_COPA.indexOf(y.copa)).map(m => (_jsxs("li", { children: [_jsx(Copa, { tono: m.copa, texto: m.texto, size: modo === "tv" ? 110 : 64 }), _jsxs("div", { children: [_jsx("b", { className: "dsp", children: m.titulo }), m.gente.map(g => _jsxs("span", { className: "cc-linea", children: [g.jugadores.length > 1 ? g.nombre : nombreDe(v, g.jugadores[0]), " \u00B7 ", g.puntos, " pts"] }, g.nombre))] })] }, m.titulo))) }), _jsx("span", { className: "cc-sub dsp ol", children: "Puntos de la noche" }), _jsx(Posiciones, { v: v, miembros: miembros, puntos: c.totales, grande: modo === "tv" }), _jsx("p", { className: "cc-gracias dsp ol", children: "\u00A1Gracias por jugar!" })] }));
}
