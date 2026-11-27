import { jsx as _jsx } from "react/jsx-runtime";
/** Palabra de cómic («¡ALV!», «¡SHHH!»). Una sola por pantalla y solo para momentos, nunca para leer información. */
export function Onomatopeya({ texto, color, giro = -8, tamano = "2.6em", style }) {
    return _jsx("span", { className: "sfx", "aria-hidden": "true", style: { display: "inline-block", fontSize: tamano, transform: `rotate(${giro}deg)`, ...(color ? { color } : {}), ...style }, children: texto });
}
