import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Juego físico en la Pantalla (TV o laptop). Solo la vista pública: el reto sugerido, lo que salió de la
// herramienta y los puntos que va dando el administrador en la ronda.
import { Cartel } from "../../ds";
import { desenlace, instruccion, nombreJuego, resumenDeltas } from "../general/texto";
import { ResultadoHerramienta, selFisico } from "./herramientas";
import "./fisico.css";
export function TvFisico({ v, miembros }) {
    const revelada = v.fase === "revelada";
    const d = revelada ? desenlace(v) : null;
    const ronda = resumenDeltas(v, selFisico(v).deltas);
    return (_jsxs("div", { className: "fi fi-tv", children: [_jsx(Cartel, { titulo: nombreJuego(v.juegoId), sub: d ? d.titular : instruccion(v) }), _jsxs("div", { className: "fi-tv-centro", children: [_jsxs("div", { className: "fi-reto grande", children: [_jsx("span", { className: "fi-kick", children: "Reto sugerido" }), _jsx("b", { className: "fi-reto-t", children: v.carta?.texto ?? "Inventen el reto de esta ronda" }), v.carta?.tipo && _jsx("p", { children: v.carta.tipo })] }, v.carta?.id ?? "sin"), _jsx(ResultadoHerramienta, { v: v, miembros: miembros, grande: true })] }), (d?.detalle || ronda) && _jsx("p", { className: "fi-tv-ronda", children: d ? d.detalle : ronda })] }));
}
