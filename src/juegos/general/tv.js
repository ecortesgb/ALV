import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// Lo que dibuja la Pantalla (TV o laptop) durante la ronda. Recibe SOLO la vista pública:
// nunca palabras, papeles ni votos antes de la revelación (la prueba de la frontera lo revisa).
import { Cartel, Onomatopeya, RuedaSospechosos } from "../../ds";
import { Burbuja, FilaBurbujas } from "../../pantallas/Identidad";
import { colorDe } from "../../app/colorJugador";
import { desenlace, instruccion, nombreDe, nombreJuego } from "./texto";
import { TvImpostor } from "../impostor/tv";
import { TvVerdadReto } from "../verdadReto/tv";
import { TvFisico } from "../fisico/tv";
import { ComoJugar, tocaExplicar } from "./ComoJugar";
import { CeremoniaCopas, PodioJuego, esFinalDeJuego } from "./Copas";
const figuraDe = (ms, id) => ms.find(m => m.id === id)?.figura;
/** Quién ya contestó, sin decir qué. */
function Esperando({ v, miembros }) {
    if (v.esperados.length < 2)
        return null;
    return (_jsx("div", { className: "a-tv-esp", "aria-label": "Qui\u00E9n ya contest\u00F3", children: _jsx(FilaBurbujas, { tamano: "2.6em", conNombre: true, gente: v.esperados.map(id => ({ id, nombre: nombreDe(v, id), figura: figuraDe(miembros, id), color: colorDe(id, v.jugadores.map(j => j.id)),
                apagada: !v.contestaron.includes(id), insignia: v.contestaron.includes(id) ? "✓" : undefined })) }) }));
}
export function EscenaTv({ v, miembros }) {
    // «Cómo jugar» encima de la escena hasta que la partida arranca.
    // Copas de la noche: la ceremonia ocupa toda la escena.
    if (v.juegoId === "copas")
        return _jsx(CeremoniaCopas, { v: v, miembros: miembros, modo: "tv" });
    return _jsxs(_Fragment, { children: [tocaExplicar(v) && _jsx(ComoJugar, { v: v, modo: "tv" }), _jsx(Escena, { v: v, miembros: miembros }), esFinalDeJuego(v) && _jsx(PodioJuego, { v: v, miembros: miembros, modo: "tv" })] });
}
function Escena({ v, miembros }) {
    const revelada = v.fase === "revelada";
    const d = revelada ? desenlace(v) : null;
    const r = (v.revelado ?? {});
    if (v.motor === "rol-secreto" && v.impostor)
        return _jsx(TvImpostor, { v: v, miembros: miembros });
    if (v.motor === "turnos-cartas" && v.verdadReto)
        return _jsx(TvVerdadReto, { v: v, miembros: miembros });
    if (v.motor === "fisico")
        return _jsx(TvFisico, { v: v, miembros: miembros });
    if (v.motor === "rol-secreto") {
        const personas = v.jugadores.map(j => ({
            id: j.id, nombre: j.nombre, figura: _jsx(Burbuja, { p: { id: j.id, nombre: j.nombre, figura: figuraDe(miembros, j.id), color: colorDe(j.id, v.jugadores.map(x => x.id)) }, tamano: 96 }),
            evidencia: v.pistas[j.id], votos: revelada && r.votos ? r.votos[j.id] ?? 0 : undefined,
        }));
        const habla = revelada ? r.impostor : v.jugadores.find(j => !v.pistas[j.id])?.id;
        return (_jsxs("div", { className: "a-tv-escena", children: [_jsx(Cartel, { titulo: nombreJuego(v.juegoId), sub: d ? d.titular : `Tema: ${v.carta?.texto ?? ""}` }), _jsx(RuedaSospechosos, { personas: personas, habla: habla, alto: 300, style: { width: "100%" } }), d?.detalle ? _jsx("p", { className: "dsp ol a-tv-detalle", children: d.detalle }) : _jsx(Esperando, { v: v, miembros: miembros }), revelada && v.votosDe && _jsx("p", { className: "a-tv-votos", children: Object.entries(v.votosDe).map(([de, a]) => `${nombreDe(v, de)} → ${nombreDe(v, a)}`).join("   ·   ") })] }));
    }
    const turno = v.turnoDe && ["turnos-cartas", "botella", "ruleta", "dados", "conteo"].includes(v.motor) ? v.turnoDe : undefined;
    return (_jsxs("div", { className: "a-tv-escena", children: [_jsx(Cartel, { titulo: nombreJuego(v.juegoId), sub: instruccion(v) }), _jsxs("div", { className: "a-tv-centro", children: [turno && _jsx("div", { className: "a-tv-turno", children: _jsx(Burbuja, { p: { id: turno, nombre: nombreDe(v, turno), figura: figuraDe(miembros, turno), color: colorDe(turno, v.jugadores.map(x => x.id)) }, tamano: "5.5em", seleccionada: true, conNombre: true }) }), _jsx("div", { className: "d-pnl a-tv-carta" + (revelada ? " es-res" : ""), children: d ? _jsxs(_Fragment, { children: [_jsx(Onomatopeya, { texto: d.titular.startsWith("¡") ? "¡BOOM!" : "¡ZAS!", color: "var(--rosa-sfx)", tamano: "2.4em", giro: -10, style: { position: "absolute", top: "-.5em", left: "-.3em" } }), _jsx("span", { className: "dsp ol a-tv-t1", children: d.titular }), d.detalle && _jsx("span", { className: "a-tv-sub", children: d.detalle })] }) : v.motor === "votacion" ? (_jsxs("div", { className: "a-tv-ab", children: [_jsx("span", { className: "dsp ol a-tv-t2", children: v.carta?.texto }), _jsx("span", { className: "d-lbl", children: "o" }), _jsx("span", { className: "dsp ol a-tv-t2", children: v.carta?.opcionB })] })) : _jsx("span", { className: "dsp ol a-tv-t1", children: v.motor === "pareja" ? "¿Cuánto conoces a tu pareja?" : v.carta?.texto ?? "Sin carta para este nivel" }) }, revelada ? "r" : v.carta?.id)] }), revelada && v.votosDe ? _jsx("p", { className: "a-tv-votos", children: Object.entries(v.votosDe).map(([de, a]) => `${nombreDe(v, de)} → ${nombreDe(v, a)}`).join("   ·   ") }) : _jsx(Esperando, { v: v, miembros: miembros })] }));
}
