import { jsx as _jsx } from "react/jsx-runtime";
import { ICONOS } from "./iconos";
/** Icono de trazo del Design System. Hereda el color del texto. */
export function Icono({ id, className = "" }) {
    return (_jsx("svg", { className: `ic ${className}`.trim(), viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: ICONOS[id] }) }));
}
