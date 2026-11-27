import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Icono } from "./Icono";
/** Etiqueta amarilla recortada en diagonal que nombra la sección («Jugar», «Ronda 2 de 5»). No es botón. */
export function Etiqueta({ texto, icono, grande, style }) {
    return _jsxs("span", { className: "d-lbl", style: { ...(grande ? { fontSize: "1.7em" } : {}), ...style }, children: [icono && _jsx(Icono, { id: icono }), texto] });
}
/** Cartel rojo con el nombre del juego. Solo en la Pantalla de TV. */
export function Cartel({ titulo, sub }) {
    return (_jsxs("div", { className: "d-ban", children: [_jsx("span", { className: "dsp ol", children: titulo }), sub && _jsx("span", { className: "dsp sub ol", children: sub })] }));
}
