import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Tarjetas del configurador de partida (Maestro v1.44): juego, tipo de partida y escenario.
// Se inclinan siguiendo el dedo o el ratón, brillan al elegirse y llevan su ilustración.
// Si un juego todavía no tiene ilustración en `public/arte/juegos/`, va una placa de vidrio con el icono de jugar.
import { useState, useRef } from "react";
import { ARTE_ESCENARIOS, ARTE_JUEGOS, ARTE_TIPOS } from "../content/arteJuegos";
import { Icono } from "../ds";
/** Iconos del configurador: primero el arte de Elías (`public/arte/ui/configurar/<nombre>.webp`); si no existe, `alterno`; si tampoco, nada. */
const faltanCfg = new Set();
export function ArteCfg({ nombre, alterno, className = "" }) {
    const [falta, setFalta] = useState(() => faltanCfg.has(nombre));
    if (falta && !alterno)
        return null;
    const src = falta ? alterno : `${import.meta.env.BASE_URL}arte/ui/configurar/${nombre}.webp`;
    return _jsx("img", { className: className, src: src, alt: "", draggable: false, onError: () => { if (!falta) {
            faltanCfg.add(nombre);
            setFalta(true);
        } } });
}
/** Juego o escenario sin ilustración: placa de vidrio tintada con el icono de jugar del HUB (sin dibujos en CSS). */
export function SinArte({ className = "" }) {
    return _jsx("span", { className: "cfg-sinarte " + className, "aria-hidden": "true", children: _jsx("img", { src: `${import.meta.env.BASE_URL}arte/ui/hub/icono-jugar.webp`, alt: "", draggable: false }) });
}
/** Dirección de una imagen de `public/arte/` para `<img src>`. */
export const srcArte = (nombre) => new URL(`${import.meta.env.BASE_URL}arte/${nombre}`, document.baseURI).href;
/** Inclina la tarjeta hacia donde está el dedo (variables --rx y --ry). Sin efecto con movimiento reducido (lo apaga el CSS). */
export function useInclina() {
    const ref = useRef(null);
    const mover = (e) => {
        const el = ref.current;
        if (!el)
            return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
        el.style.setProperty("--bx", `${((x + 0.5) * 100).toFixed(0)}%`);
    };
    const salir = () => { const el = ref.current; if (!el)
        return; el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
    return { ref, onPointerMove: mover, onPointerLeave: salir };
}
/** Rayos de cómic (los usan Modos.tsx y Originales.tsx del personalizador; el configurador ya no). */
export function Rayos({ color }) {
    const puntas = [];
    for (let i = 0; i < 24; i += 2) {
        const a1 = Math.PI * 2 * i / 24, a2 = Math.PI * 2 * (i + 1) / 24;
        puntas.push(`50,55 ${(50 + 160 * Math.cos(a1)).toFixed(1)},${(55 + 160 * Math.sin(a1)).toFixed(1)} ${(50 + 160 * Math.cos(a2)).toFixed(1)},${(55 + 160 * Math.sin(a2)).toFixed(1)}`);
    }
    return (_jsxs("svg", { className: "tc-rayos", viewBox: "0 0 100 130", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true", children: [_jsx("rect", { width: "100", height: "130", fill: color }), puntas.map((p, i) => _jsx("polygon", { points: p, fill: "#fff", opacity: ".18" }, i)), _jsx("circle", { cx: "50", cy: "55", r: "30", fill: "#fff", opacity: ".22" })] }));
}
/** Tarjeta de un juego: ilustración, nombre, jugadores y tiempo; candado con su razón. */
export function CartaJuego({ id, nombre, sigla, color, jugadores, duracion, elegida, bloqueada, indice = 0, onClick }) {
    const inc = useInclina();
    const arte = ARTE_JUEGOS[id];
    return (_jsxs("button", { type: "button", ...inc, className: "tc tc-juego" + (elegida ? " on" : "") + (bloqueada ? " bloq" : ""), style: { "--tc": color, "--i": indice }, "aria-pressed": !!elegida, "aria-label": `${nombre}${bloqueada ? ` (${bloqueada})` : ""}`, onClick: onClick, children: [_jsxs("span", { className: "tc-arte", children: [arte ? _jsx("img", { src: srcArte(arte), alt: "", loading: "lazy", draggable: false }) : _jsx(SinArte, {}), _jsx("span", { className: "tc-sigla dsp", children: sigla }), bloqueada && _jsxs("span", { className: "tc-candado", children: [_jsx(Icono, { id: "lock" }), bloqueada] })] }), _jsxs("span", { className: "tc-pie", children: [_jsx("span", { className: "dsp ol tc-nombre", children: nombre }), _jsxs("span", { className: "tc-datos", children: [_jsxs("span", { children: [_jsx(Icono, { id: "users" }), jugadores] }), _jsxs("span", { children: [_jsx(Icono, { id: "clock" }), duracion] })] })] }), _jsx("span", { className: "tc-brillo", "aria-hidden": "true" })] }));
}
/** Tarjeta de tipo de partida: la ilustración completa (trae su nombre dibujado) con marco de neón al elegirla. */
export function CartaTipo({ id, nombre, texto, elegida, bloqueada, indice = 0, onClick }) {
    const inc = useInclina();
    return (_jsxs("button", { type: "button", ...inc, className: "tc tc-tipo" + (elegida ? " on" : "") + (bloqueada ? " bloq" : ""), style: { "--i": indice }, "aria-pressed": !!elegida, "aria-label": `${nombre}: ${bloqueada ?? texto}`, disabled: !!bloqueada, onClick: onClick, children: [_jsx("img", { src: srcArte(ARTE_TIPOS[id]), alt: "", draggable: false }), bloqueada && _jsxs("span", { className: "tc-tipo-candado", children: [_jsx(Icono, { id: "lock" }), " ", bloqueada] }), elegida && _jsx("span", { className: "tc-check", "aria-hidden": "true", children: _jsx("img", { src: `${import.meta.env.BASE_URL}arte/lobby/ico-listo.webp`, alt: "", draggable: false }) }), _jsx("span", { className: "tc-brillo", "aria-hidden": "true" })] }));
}
/** Tarjeta de escenario con su ilustración (o la placa de vidrio). */
export function CartaEscenario({ id, nombre, texto, color, elegida, bloqueada, onClick }) {
    const inc = useInclina();
    const arte = ARTE_ESCENARIOS[id];
    return (_jsxs("button", { type: "button", ...inc, className: "tc tc-esc" + (elegida ? " on" : "") + (bloqueada ? " bloq" : ""), style: { "--tc": color }, "aria-pressed": !!elegida, disabled: !!bloqueada, onClick: onClick, children: [_jsx("span", { className: "tc-arte", children: arte ? _jsx("img", { src: srcArte(arte), alt: "", loading: "lazy", draggable: false }) : _jsx(SinArte, {}) }), _jsxs("span", { className: "tc-pie", children: [_jsx("span", { className: "dsp ol tc-nombre", children: nombre }), _jsx("span", { className: "tc-texto", children: bloqueada ?? texto })] }), _jsx("span", { className: "tc-brillo", "aria-hidden": "true" })] }));
}
