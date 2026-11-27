import { jsx as _jsx } from "react/jsx-runtime";
/** Superficie base de toda caja: degradado azul, borde de tinta, borde interior claro y sombra dura. */
export function Panel({ children, className = "", style, como: Etiq = "div" }) {
    return _jsx(Etiq, { className: `d-pnl ${className}`.trim(), style: style, children: children });
}
