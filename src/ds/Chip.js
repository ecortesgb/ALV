import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Icono } from "./Icono";
/**
 * Píldora chica para datos de contexto (jugadores, tiempo, intensidad). Con `onClick` sirve de filtro
 * y `seleccionado` lo marca en amarillo. Máximo 3 palabras.
 */
export function Chip({ texto, icono, seleccionado, onClick }) {
    const cls = "d-chip" + (seleccionado ? " on" : "");
    const dentro = _jsxs(_Fragment, { children: [icono && _jsx(Icono, { id: icono }), texto] });
    return onClick
        ? _jsx("button", { type: "button", className: cls, "aria-pressed": !!seleccionado, onClick: onClick, children: dentro })
        : _jsx("span", { className: cls, children: dentro });
}
