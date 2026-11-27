import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// La herramienta de Verdad o reto, dibujada con lo público de la ronda: dados, cartas de póker, reloj, ruleta o en orden.
// Decide quién pregunta y quién responde; no cambia el juego (Maestro 6A.3). La usan el celular y la TV.
import { useEffect, useState } from "react";
import { colorDe, varsColor } from "../../app/colorJugador";
import { nombreDe } from "../general/texto";
const CARA = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const VALOR = (v) => (v <= 10 ? String(v) : ["J", "Q", "K", "A"][v - 11]);
const PALO = ["♣", "♦", "♥", "♠"]; // de menor a mayor
export const NOMBRE_HERRAMIENTA = { orden: "En orden", ruleta: "Ruleta", reloj: "Reloj", dados: "Dados", poker: "Cartas de póker" };
const ACCION = { dados: "🎲 ¡Lanzar dados!", poker: "🃏 Voltear cartas", reloj: "🕐 ¡Girar el reloj!", ruleta: "🎡 ¡Girar la ruleta!" };
const RUEDA_MS = 1300;
/**
 * La herramienta se usa (Elías, 24 nov): en el celular hay que tocar para lanzar los dados, voltear las cartas o girar;
 * en la TV pasa sola. El resultado ya lo decidió el motor: aquí solo se anima hasta mostrarlo. Si la ronda ya avanzó,
 * se muestra directo.
 */
export function Herramienta({ v, chica, interactiva }) {
    const s = v.seleccion;
    const clave = `${v.ronda}-${s?.herramienta ?? ""}`;
    const [hecho, setHecho] = useState(null);
    const [rodando, setRodando] = useState(false);
    const [cara, setCara] = useState(1);
    const yaAvanzo = !!v.verdadReto && v.verdadReto.etapa !== "elegir";
    const usa = !!s && s.herramienta !== "orden";
    const listo = !usa || yaAvanzo || hecho === clave;
    const usar = () => {
        if (!s || listo || rodando)
            return;
        if (s.herramienta === "reloj" || s.herramienta === "ruleta") {
            setHecho(clave);
            return;
        } // el giro ya es la animación
        setRodando(true);
        setTimeout(() => { setRodando(false); setHecho(clave); }, RUEDA_MS);
    };
    // TV (o sin toque): pasa sola un momento después de empezar la ronda.
    useEffect(() => { if (!interactiva && usa && !listo) {
        const t = setTimeout(usar, 700);
        return () => clearTimeout(t);
    } }, [clave, interactiva]); // eslint-disable-line react-hooks/exhaustive-deps
    // Mientras ruedan los dados, las caras cambian rápido.
    useEffect(() => { if (!rodando)
        return; const t = setInterval(() => setCara(1 + Math.floor(Math.random() * 6)), 80); return () => clearInterval(t); }, [rodando]);
    if (!s?.herramienta)
        return null;
    if (!listo) {
        const n = v.jugadores.length;
        return (_jsxs("div", { className: "vr-herr vr-usar" + (chica ? " chica" : "") + (rodando ? " rodando" : ""), children: [_jsx("span", { className: "vr-herr-t dsp", children: NOMBRE_HERRAMIENTA[s.herramienta] ?? s.herramienta }), _jsx("div", { className: "vr-tapados", "aria-hidden": "true", children: s.herramienta === "dados" ? Array.from({ length: Math.min(n, 8) }, (_, i) => _jsx("span", { className: "vr-dado", style: { "--i": i }, children: CARA[rodando ? ((cara + i) % 6) + 1 : 6] }, i))
                        : s.herramienta === "poker" ? Array.from({ length: Math.min(n, 8) }, (_, i) => _jsx("span", { className: "vr-naipe dorso", style: { "--i": i } }, i))
                            : _jsx("span", { className: "vr-giro-ico", children: s.herramienta === "reloj" ? "🕐" : "🎡" }) }), interactiva ? _jsx("button", { type: "button", className: "vr-usar-btn", onClick: usar, disabled: rodando, children: rodando ? "…" : ACCION[s.herramienta] })
                    : _jsx("small", { className: "vr-usar-nota", children: rodando ? "…" : "" })] }));
    }
    const ids = v.jugadores.map(j => j.id);
    const marca = (id) => (id === s.pregunta ? "pregunta" : id === s.responde ? "responde" : "");
    const etiqueta = (id) => (id === s.pregunta ? "Pregunta" : id === s.responde ? "Responde" : "");
    const clase = "vr-herr" + (chica ? " chica" : "");
    const titulo = _jsx("span", { className: "vr-herr-t dsp", children: NOMBRE_HERRAMIENTA[s.herramienta] ?? s.herramienta });
    if (s.herramienta === "dados" && s.dados) {
        return (_jsxs("div", { className: clase, children: [titulo, _jsx("ul", { className: "vr-tiros", children: ids.map((id, i) => (_jsxs("li", { className: marca(id), style: { ...varsColor(colorDe(id, ids)), "--i": i }, children: [_jsx("span", { className: "vr-dado", "aria-label": `${nombreDe(v, id)} sacó ${s.dados[id]}`, children: CARA[s.dados[id] ?? 1] }), _jsx("small", { children: nombreDe(v, id) }), etiqueta(id) && _jsx("b", { className: "dsp", children: etiqueta(id) })] }, id))) })] }, `d${v.ronda}`));
    }
    if (s.herramienta === "poker" && s.cartas) {
        return (_jsxs("div", { className: clase, children: [titulo, _jsx("ul", { className: "vr-tiros", children: ids.map((id, i) => {
                        const c = s.cartas[id], rojo = c.p === 1 || c.p === 2;
                        return (_jsxs("li", { className: marca(id), style: { ...varsColor(colorDe(id, ids)), "--i": i }, children: [_jsxs("span", { className: "vr-naipe" + (rojo ? " rojo" : ""), "aria-label": `${nombreDe(v, id)}: ${VALOR(c.v)} de ${PALO[c.p]}`, children: [_jsx("b", { children: VALOR(c.v) }), _jsx("span", { children: PALO[c.p] })] }), _jsx("small", { children: nombreDe(v, id) }), etiqueta(id) && _jsx("b", { className: "dsp", children: etiqueta(id) })] }, id));
                    }) })] }, `p${v.ronda}`));
    }
    if (s.herramienta === "reloj" || s.herramienta === "ruleta") {
        // Los jugadores alrededor de un círculo. Reloj: manecilla chica a quien pregunta y grande a quien responde.
        // Ruleta: la rueda gira y la flecha queda en quien responde.
        const n = ids.length, ang = (id) => (ids.indexOf(id) / n) * 360;
        const punto = (a, r) => [50 + r * Math.sin((a * Math.PI) / 180), 50 - r * Math.cos((a * Math.PI) / 180)];
        const esReloj = s.herramienta === "reloj";
        return (_jsxs("div", { className: clase, children: [titulo, _jsxs("svg", { className: "vr-circulo" + (esReloj ? " reloj" : " ruleta"), viewBox: "0 0 100 100", role: "img", "aria-label": `${NOMBRE_HERRAMIENTA[s.herramienta]}: pregunta ${nombreDe(v, s.pregunta)}, responde ${nombreDe(v, s.responde)}`, children: [_jsx("circle", { cx: "50", cy: "50", r: "46", className: "vr-esfera" }), !esReloj && ids.map((id, i) => {
                            const a1 = (i / n) * 360 - 180 / n, a2 = a1 + 360 / n, [x1, y1] = punto(a1, 44), [x2, y2] = punto(a2, 44);
                            return _jsx("path", { d: `M50 50 L${x1} ${y1} A44 44 0 0 1 ${x2} ${y2} Z`, fill: colorDe(id, ids)?.base, opacity: id === s.responde ? 1 : 0.55 }, id);
                        }), ids.map(id => {
                            const [x, y] = punto(ang(id), 36);
                            return _jsxs("g", { className: marca(id), children: [_jsx("circle", { cx: x, cy: y, r: "7.5", fill: colorDe(id, ids)?.base, className: "vr-silla" }), _jsx("text", { x: x, y: y + 2.6, textAnchor: "middle", className: "vr-silla-t", children: colorDe(id, ids)?.etiqueta })] }, id);
                        }), esReloj ? _jsxs(_Fragment, { children: [_jsx("line", { x1: "50", y1: "50", x2: "50", y2: "30", className: "vr-mano chica", style: { "--a": `${ang(s.pregunta) + 720}deg` } }), _jsx("line", { x1: "50", y1: "50", x2: "50", y2: "20", className: "vr-mano grande", style: { "--a": `${ang(s.responde) + 1080}deg` } })] }) : _jsx("line", { x1: "50", y1: "50", x2: "50", y2: "18", className: "vr-mano grande", style: { "--a": `${ang(s.responde) + 1440}deg` } }), _jsx("circle", { cx: "50", cy: "50", r: "4", className: "vr-centro" })] }), esReloj && _jsxs("p", { className: "vr-leyenda", children: [_jsxs("span", { children: ["Chica: ", _jsx("b", { children: nombreDe(v, s.pregunta) }), " pregunta"] }), _jsxs("span", { children: ["Grande: ", _jsx("b", { children: nombreDe(v, s.responde) }), " responde"] })] })] }, `c${v.ronda}`));
    }
    return _jsxs("div", { className: clase, children: [titulo, _jsx("p", { className: "vr-leyenda", children: _jsxs("span", { children: ["Le toca a ", _jsx("b", { children: nombreDe(v, s.responde) }), "; pregunta ", _jsx("b", { children: nombreDe(v, s.pregunta) })] }) })] });
}
