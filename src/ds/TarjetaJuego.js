import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Icono } from "./Icono";
/** Rayos de cómic del color de la fila: el fondo de toda ilustración de juego. */
function Rayos({ color }) {
    const cx = 80, cy = 104, puntas = [];
    for (let i = 0; i < 20; i += 2) {
        const a1 = Math.PI * 2 * i / 20, a2 = Math.PI * 2 * (i + 1) / 20;
        puntas.push(`${cx},${cy} ${(cx + 260 * Math.cos(a1)).toFixed(1)},${(cy + 260 * Math.sin(a1)).toFixed(1)} ${(cx + 260 * Math.cos(a2)).toFixed(1)},${(cy + 260 * Math.sin(a2)).toFixed(1)}`);
    }
    return (_jsxs("svg", { viewBox: "0 0 160 100", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true", children: [_jsx("rect", { width: "160", height: "100", fill: color }), puntas.map((p, i) => _jsx("polygon", { points: p, fill: "rgba(255,255,255,.2)" }, i))] }));
}
/** Tarjeta del catálogo: ilustración arriba, nombre abajo. Normal, enfocada, nueva o bloqueada. */
export function TarjetaJuego({ nombre, sigla, jugadores, duracion, color, ilustracion, enfocada, nueva, bloqueada, indice = 0, onClick }) {
    const cls = ["d-gc", "in", bloqueada && "lock", enfocada && "foco"].filter(Boolean).join(" ");
    return (_jsxs("button", { type: "button", className: cls, style: { "--d": `${(0.04 * indice).toFixed(2)}s` }, onClick: onClick, "aria-label": `${nombre}, ${jugadores}, ${duracion}${bloqueada ? `. Bloqueado: ${bloqueada}` : ""}`, children: [_jsxs("div", { className: "art", children: [ilustracion ?? _jsx(Rayos, { color: color }), _jsx("span", { className: "sg", children: sigla }), nueva && _jsx("span", { className: "nv", children: "NUEVO" }), bloqueada && _jsxs("span", { className: "lk", children: [_jsx(Icono, { id: "lock" }), bloqueada] })] }), _jsxs("div", { className: "bd", children: [_jsx("span", { className: "dsp ol", children: nombre }), _jsxs("div", { className: "meta", children: [_jsxs("span", { children: [_jsx(Icono, { id: "users" }), jugadores] }), _jsxs("span", { children: [_jsx(Icono, { id: "clock" }), duracion] })] })] })] }));
}
