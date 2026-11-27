import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Verdad o reto en la Pantalla (TV o laptop). Recibe SOLO la vista pública: la herramienta de la ronda,
// quién pregunta y quién responde con su color, qué se eligió, la carta (si la dio la app) y el resultado.
import { Cartel, Onomatopeya } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { NombreJugador } from "../../pantallas/comun";
import { Burbuja } from "../../pantallas/Identidad";
import { desenlace, instruccion, nombreDe, nombreJuego } from "../general/texto";
import { Herramienta } from "./herramienta";
import { RelojTurno } from "../general/RelojTurno";
import "./verdadReto.css";
export function TvVerdadReto({ v, miembros }) {
    const vr = v.verdadReto;
    const ids = v.jugadores.map(j => j.id);
    const figura = (id) => miembros.find(m => m.id === id)?.figura;
    const revelada = v.fase === "revelada";
    const d = revelada ? desenlace(v) : null;
    const esReto = vr.eleccion === "reto";
    const Lado = ({ id, rol }) => (_jsxs("div", { className: "vr-tv-lado" + (id === vr.responde ? " responde" : ""), style: varsColor(colorDe(id, ids)), children: [_jsx("span", { className: "vr-tv-rol dsp ol", children: rol }), _jsx(Burbuja, { p: { id, nombre: nombreDe(v, id), figura: figura(id), color: colorDe(id, ids) }, tamano: "6.5em", seleccionada: id === vr.responde }), _jsx("span", { className: "vr-tv-nom", children: _jsx(NombreJugador, { nombre: nombreDe(v, id), figura: figura(id) }) })] }));
    return (_jsxs("div", { className: "vr-tv", children: [_jsx(Cartel, { titulo: nombreJuego(v.juegoId), sub: d ? d.titular : instruccion(v) }), _jsxs("div", { className: "vr-tv-centro", children: [_jsx(Lado, { id: vr.pregunta, rol: "Pregunta" }), _jsxs("div", { className: "vr-tv-medio", children: [_jsxs("div", { className: "vr-arriba", children: [_jsx(Herramienta, { v: v }), _jsx(RelojTurno, { v: v, size: "5em" })] }), vr.eleccion ? (_jsxs("div", { className: "vr-tv-carta" + (esReto ? " reto" : " verdad"), children: [_jsx("span", { className: "vr-sello dsp ol", children: esReto ? "Reto" : "Verdad" }), vr.etapa === "calificar" || revelada
                                        ? _jsx("p", { children: vr.fuente === "voz" ? `🎤 ${nombreDe(v, vr.pregunta)} lo dice en voz alta` : v.carta?.texto ?? "" })
                                        : _jsxs("p", { className: "vr-tv-espera", children: [nombreDe(v, vr.pregunta), " prepara ", esReto ? "el reto" : "la pregunta", "\u2026"] })] }, `${v.ronda}-${vr.etapa}`)) : !revelada && _jsxs("div", { className: "vr-tv-carta", children: [_jsx("span", { className: "vr-sello dsp ol", children: "\u00BFVerdad o reto?" }), _jsxs("p", { className: "vr-tv-espera", children: [nombreDe(v, vr.responde), " est\u00E1 eligiendo\u2026"] })] })] }), _jsx(Lado, { id: vr.responde, rol: "Responde" })] }), revelada && d && _jsx("p", { className: "dsp ol vr-tv-res", children: d.detalle }), revelada && d?.titular.startsWith("¡") && _jsx(Onomatopeya, { texto: "\u00A1BIEN!", color: "var(--amarillo)", tamano: "4em", giro: -8, style: { position: "absolute", top: "40%", left: "50%", translate: "-50% 0", zIndex: 5, pointerEvents: "none" } })] }));
}
