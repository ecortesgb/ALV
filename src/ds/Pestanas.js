import { jsx as _jsx } from "react/jsx-runtime";
/** Pestañas inclinadas: la elegida en amarillo. En celular se deslizan de lado. */
export function Pestanas({ pestanas, activa, onCambio, nombre }) {
    return (_jsx("div", { className: "d-tabs", role: "tablist", "aria-label": nombre, children: pestanas.map(p => (_jsx("button", { type: "button", role: "tab", "aria-selected": p.id === activa, className: "d-tab" + (p.id === activa ? " on" : ""), onClick: () => onCambio?.(p.id), children: p.texto }, p.id))) }));
}
