import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Icono } from "./Icono";
import { Onomatopeya } from "./Onomatopeya";
/**
 * Tarjeta del secreto: se ve solo mientras el jugador mantiene el dedo (o la barra espaciadora / Enter).
 * Solo en el celular de su dueño; nunca en la Pantalla de TV.
 */
export function Escaner({ secreto, encabezado = "PALABRA CLASIFICADA", detalle, sello = "ULTRA SECRETO", muestra, style }) {
    const [presionado, setPresionado] = useState(false);
    const on = muestra ?? presionado;
    const tecla = (e, valor) => {
        if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setPresionado(valor);
        }
    };
    return (_jsxs("div", { className: "d-pnl hold" + (on ? " on" : ""), style: { position: "relative", minHeight: "17em", ...style }, role: "button", tabIndex: 0, "aria-pressed": on, "aria-label": "Mant\u00E9n presionado para ver tu secreto", onPointerDown: () => setPresionado(true), onPointerUp: () => setPresionado(false), onPointerLeave: () => setPresionado(false), onPointerCancel: () => setPresionado(false), onContextMenu: e => e.preventDefault(), onBlur: () => setPresionado(false), onKeyDown: e => tecla(e, true), onKeyUp: e => tecla(e, false), children: [_jsxs("div", { className: "d-cover", "aria-hidden": on, children: [_jsx("div", { className: "d-scan", children: _jsx(Icono, { id: "finger" }) }), _jsx("b", { children: "MANT\u00C9N EL DEDO PARA VER" })] }), _jsxs("div", { className: "d-word", "aria-hidden": !on, "aria-live": "polite", children: [_jsx(Onomatopeya, { texto: "\u00A1SHHH!", color: "var(--rosa-sfx)", tamano: "2em", giro: -10, style: { position: "absolute", top: ".6em", left: ".6em" } }), _jsx("span", { className: "kick", children: encabezado }), _jsx("span", { className: "dsp ol", children: secreto }), detalle && _jsx("small", { children: detalle }), sello && _jsx("span", { className: "d-stamp", children: sello })] })] }));
}
