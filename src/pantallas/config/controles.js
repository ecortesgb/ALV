import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Controles de Configuración con el lenguaje de La Azotea: interruptor, deslizador y selector segmentado.
// Accesibles con teclado y lector de pantalla; sin animación cuando se pide menos movimiento (lo hace el CSS).
import { useId } from "react";
/** Una fila: texto a la izquierda (con ayuda opcional) y el control a la derecha. */
export function Fila({ titulo, ayuda, control, id }) {
    return (_jsxs("div", { className: "cf-fila", children: [_jsxs("span", { className: "cf-fila-txt", children: [_jsx("span", { className: "cf-fila-tit", id: id, children: titulo }), ayuda && _jsx("small", { className: "cf-fila-ayuda", children: ayuda })] }), _jsx("span", { className: "cf-fila-ctl", children: control })] }));
}
export function Interruptor({ valor, alCambiar, etiqueta, desactivado }) {
    return (_jsxs("button", { type: "button", role: "switch", "aria-checked": valor, "aria-label": etiqueta, disabled: desactivado, className: "cf-switch" + (valor ? " on" : ""), onClick: () => alCambiar(!valor), children: [_jsx("span", { className: "cf-switch-riel", "aria-hidden": "true", children: _jsx("span", { className: "cf-switch-bola" }) }), _jsx("span", { className: "cf-switch-txt", "aria-hidden": "true", children: valor ? "Sí" : "No" })] }));
}
/** Deslizador de 0 a 100. Avisa al soltar (alSoltar) para no sonar 50 veces mientras se arrastra. */
export function Deslizador({ valor, alCambiar, alSoltar, etiqueta, desactivado }) {
    return (_jsxs("span", { className: "cf-desl" + (desactivado ? " off" : ""), style: { "--v": `${valor}%` }, children: [_jsx("input", { type: "range", min: 0, max: 100, step: 5, value: valor, disabled: desactivado, "aria-label": etiqueta, "aria-valuetext": `${valor} %`, onChange: e => alCambiar(Number(e.target.value)), onPointerUp: e => alSoltar?.(Number(e.target.value)), onKeyUp: e => alSoltar?.(Number(e.target.value)) }), _jsx("b", { "aria-hidden": "true", children: valor })] }));
}
/** Selector de opciones (una sola). */
export function Segmentado({ valor, opciones, alCambiar, etiqueta }) {
    const nombre = useId();
    return (_jsxs("span", { className: "cf-seg", role: "radiogroup", "aria-label": etiqueta, style: { "--n": opciones.length, "--i": Math.max(0, opciones.findIndex(o => o.id === valor)) }, children: [_jsx("span", { className: "cf-seg-marca", "aria-hidden": "true" }), opciones.map(o => (_jsxs("label", { className: "cf-seg-op" + (o.id === valor ? " on" : ""), children: [_jsx("input", { type: "radio", name: nombre, value: o.id, checked: o.id === valor, onChange: () => alCambiar(o.id) }), _jsx("span", { children: o.texto })] }, o.id)))] }));
}
