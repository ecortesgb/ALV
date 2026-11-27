import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Boton } from "./Boton";
import { Etiqueta } from "./Etiqueta";
const sd = (s) => ({ "--sd": s });
/** Controles de quien tiene el control, al pie de su celular. Nunca en la TV ni en los demás celulares. */
export function BarraAnfitrion({ pausada, momento, onPausar, onSaltar, onRuleta, onXpReto }) {
    return (_jsxs("div", { className: "d-host", children: [momento && _jsx(Boton, { color: "amarillo", texto: momento.texto, icono: momento.icono ?? "skip", onClick: momento.onClick }), _jsx(Etiqueta, { texto: "Anfitri\u00F3n", icono: "star" }), _jsxs("div", { className: "d-hostrow", children: [_jsx(Boton, { compacto: true, color: "azul", icono: pausada ? "play" : "pause", texto: pausada ? "Seguir" : "Pausar", onClick: onPausar }), _jsx(Boton, { compacto: true, color: "amarillo", icono: "skip", texto: "Saltar", onClick: onSaltar, style: sd(".6s") }), _jsx(Boton, { compacto: true, color: "morado", icono: "wheel", texto: "Ruleta", onClick: onRuleta, style: sd("1.2s") }), _jsx(Boton, { compacto: true, color: "verde", icono: "plus", texto: "XP reto", onClick: onXpReto, style: sd("1.8s") })] })] }));
}
