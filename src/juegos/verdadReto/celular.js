import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Verdad o reto en el celular (Maestro 6A.6 B y 6A.11 C4, C13).
// Quien responde elige Verdad o Reto (Verdad solo una vez). Quien pregunta decide si la app da la carta o la dice en
// voz alta, y luego califica: cumplió o tomó. Con un comodín, quien responde pasa sin tomar.
import { CARTAS_PODER } from "../../content/catalogo";
import { VR_PUNTOS } from "../../engine/partida";
import { Panel } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { NombreJugador } from "../../pantallas/comun";
import { Burbuja } from "../../pantallas/Identidad";
import { SelectorComodines } from "../general/SelectorComodines";
import { desenlace, nombreDe } from "../general/texto";
import { Herramienta } from "./herramienta";
import { RelojTurno } from "../general/RelojTurno";
import "./verdadReto.css";
export function CelularVerdadReto({ v, mi, miembros, mandar }) {
    const yo = mi.yo, vr = v.verdadReto;
    const ids = v.jugadores.map(j => j.id);
    const figura = (id) => miembros.find(m => m.id === id)?.figura;
    const Persona = ({ id, size = 40 }) => (_jsxs("span", { className: "vr-persona", style: varsColor(colorDe(id, ids)), children: [_jsx(Burbuja, { p: { id, nombre: nombreDe(v, id), figura: figura(id), color: colorDe(id, ids) }, tamano: size, seleccionada: id === vr.responde && size > 40 }), _jsx(NombreJugador, { nombre: nombreDe(v, id), figura: figura(id), clase: "" })] }));
    const soyResponde = vr.responde === yo, soyPregunta = vr.pregunta === yo;
    const yaUseVerdad = vr.verdadUsada.includes(yo);
    const esReto = vr.eleccion === "reto";
    const contestar = (valor) => void mandar("contestar", { valor });
    // Comodines de quien responde: pasar (Escudo o Pasa turno) y cambiar la carta (solo si la dio la app).
    const comodines = soyResponde && !v.pausada && v.fase === "contestando" && vr.etapa !== "listo" ? mi.miMano.filter(c => c === "escudo" || c === "turno" || (c === "cambio" && vr.etapa === "calificar" && vr.fuente === "app")) : [];
    const barraComodines = comodines.length > 0 && (_jsx(SelectorComodines, { cantidad: comodines.length, children: comodines.map((c, i) => {
            const d = CARTAS_PODER.find(x => x.id === c);
            return _jsxs("button", { type: "button", className: "vr-comodin", title: d?.efecto, onClick: () => void mandar("carta", { carta: c }), children: [c === "cambio" ? "🔄" : "🛡️", " ", d?.nombre ?? c] }, c + i);
        }) }, v.ronda));
    let cuerpo;
    if (v.fase === "revelada") {
        const d = desenlace(v);
        cuerpo = _jsxs(Panel, { className: "vr-res a-entra", como: "section", children: [_jsx("span", { className: "a-kick", children: "Resultado" }), _jsx("span", { className: "dsp ol a-t1", children: d.titular }), d.detalle && _jsx("p", { className: "a-suave", children: d.detalle }), _jsxs("p", { className: "a-nota", children: ["Llevas ", v.puntos[yo] ?? 0, " ", (v.puntos[yo] ?? 0) === 1 ? "punto" : "puntos"] })] });
    }
    else if (v.pausada) {
        cuerpo = _jsxs(Panel, { className: "vr-res", children: [_jsx("span", { className: "dsp ol a-t1", children: "En pausa" }), _jsx("p", { className: "a-suave", children: "El anfitri\u00F3n detuvo la partida un momento." })] });
    }
    else if (vr.etapa === "elegir") {
        cuerpo = soyResponde ? (_jsxs("section", { className: "vr-elegir a-entra", "aria-label": "Elige verdad o reto", children: [_jsx("span", { className: "dsp ol a-t2", children: "\u00BFVerdad o reto?" }), _jsxs("div", { className: "vr-dos", children: [_jsxs("button", { type: "button", className: "vr-opcion verdad", disabled: yaUseVerdad, onClick: () => contestar({ elige: "verdad" }), children: [_jsx("span", { className: "vr-op-ico", "aria-hidden": "true", children: "\uD83D\uDDE3\uFE0F" }), _jsx("b", { className: "dsp ol", children: "Verdad" }), _jsx("small", { children: yaUseVerdad ? "Ya usaste tu verdad" : `Contesta una pregunta · +${VR_PUNTOS.verdad}` })] }), _jsxs("button", { type: "button", className: "vr-opcion reto", onClick: () => contestar({ elige: "reto" }), children: [_jsx("span", { className: "vr-op-ico", "aria-hidden": "true", children: "\uD83D\uDD25" }), _jsx("b", { className: "dsp ol", children: "Reto" }), _jsxs("small", { children: ["Haz una actividad \u00B7 +", VR_PUNTOS.reto] })] })] }), _jsx("p", { className: "a-nota", children: "Solo puedes elegir Verdad una vez en toda la partida." })] })) : _jsxs(Panel, { className: "vr-espera", children: [_jsx("span", { className: "a-kick", children: soyPregunta ? "Tú preguntas" : "Le toca a" }), _jsx(Persona, { id: vr.responde, size: 56 }), _jsx("p", { className: "a-suave", children: "Est\u00E1 eligiendo verdad o reto\u2026" })] });
    }
    else if (vr.etapa === "fuente") {
        cuerpo = soyPregunta ? (_jsxs("section", { className: "vr-fuente a-entra", "aria-label": "Qui\u00E9n pone la pregunta", children: [_jsx("span", { className: "vr-sello dsp ol " + (esReto ? "reto" : "verdad"), children: esReto ? "Reto" : "Verdad" }), _jsx("span", { className: "dsp ol a-t2", children: esReto ? "¿Quién pone el reto?" : "¿Quién pone la pregunta?" }), _jsxs("p", { className: "a-suave", children: ["Para ", _jsx("b", { children: nombreDe(v, vr.responde) }), "."] }), _jsxs("div", { className: "vr-dos", children: [_jsxs("button", { type: "button", className: "vr-opcion app", onClick: () => contestar({ fuente: "app" }), children: [_jsx("span", { className: "vr-op-ico", "aria-hidden": "true", children: "\uD83D\uDCA1" }), _jsx("b", { className: "dsp ol", children: "Que ALV me d\u00E9 una" }), _jsx("small", { children: "Sale en la pantalla" })] }), _jsxs("button", { type: "button", className: "vr-opcion voz", onClick: () => contestar({ fuente: "voz" }), children: [_jsx("span", { className: "vr-op-ico", "aria-hidden": "true", children: "\uD83C\uDFA4" }), _jsx("b", { className: "dsp ol", children: "La digo yo" }), _jsx("small", { children: "En voz alta, de mi cabeza" })] })] })] })) : _jsxs(Panel, { className: "vr-espera", children: [_jsx("span", { className: "vr-sello dsp ol " + (esReto ? "reto" : "verdad"), children: esReto ? "Reto" : "Verdad" }), _jsxs("p", { className: "a-suave", children: [_jsx("b", { children: nombreDe(v, vr.pregunta) }), " est\u00E1 preparando ", esReto ? "el reto" : "la pregunta", "\u2026"] })] });
    }
    else if (vr.etapa === "calificar") {
        const carta = vr.fuente === "app" ? _jsx("p", { className: "vr-carta", children: v.carta?.texto ?? "Sin carta para este nivel" }) : _jsxs("p", { className: "vr-carta voz", children: ["\uD83C\uDFA4 ", nombreDe(v, vr.pregunta), " lo dice en voz alta"] });
        cuerpo = (_jsxs("section", { className: "vr-calificar a-entra", "aria-label": "Calificar", children: [_jsx("span", { className: "vr-sello dsp ol " + (esReto ? "reto" : "verdad"), children: esReto ? "Reto" : "Verdad" }), carta, soyPregunta ? _jsxs(_Fragment, { children: [_jsxs("span", { className: "a-kick", children: ["\u00BFQu\u00E9 hizo ", nombreDe(v, vr.responde), "?"] }), _jsxs("div", { className: "vr-dos", children: [_jsxs("button", { type: "button", className: "vr-opcion cumplio", onClick: () => contestar("cumplio"), children: [_jsx("span", { className: "vr-op-ico", "aria-hidden": "true", children: "\u2705" }), _jsx("b", { className: "dsp ol", children: esReto ? "¡Lo cumplió!" : "¡Respondió!" }), _jsxs("small", { children: ["+", esReto ? VR_PUNTOS.reto : VR_PUNTOS.verdad] })] }), _jsxs("button", { type: "button", className: "vr-opcion tomo", onClick: () => contestar("tomo"), children: [_jsx("span", { className: "vr-op-ico", "aria-hidden": "true", children: "\uD83E\uDD64" }), _jsx("b", { className: "dsp ol", children: "Tom\u00F3" }), _jsxs("small", { children: ["+", VR_PUNTOS.tomar, " \u00B7 lo que cada quien quiera"] })] })] })] }) : soyResponde ? _jsxs("p", { className: "a-suave", children: [esReto ? "Haz el reto" : "Responde", " o toma algo (lo que t\u00FA quieras). ", _jsx("b", { children: nombreDe(v, vr.pregunta) }), " califica."] })
                    : _jsxs("p", { className: "a-suave", children: [_jsx("b", { children: nombreDe(v, vr.pregunta) }), " califica a ", _jsx("b", { children: nombreDe(v, vr.responde) }), "."] })] }));
    }
    else {
        cuerpo = _jsx(Panel, { className: "vr-espera", children: _jsxs("p", { className: "a-suave", children: [_jsx("b", { children: nombreDe(v, vr.responde) }), " pas\u00F3 con un comod\u00EDn."] }) });
    }
    return (_jsxs("section", { className: "vr-cel a-pila", "aria-label": "Verdad o reto", children: [_jsxs("div", { className: "vr-arriba", children: [_jsx(Herramienta, { v: v, chica: true, interactiva: true }), _jsx(RelojTurno, { v: v })] }), _jsxs("div", { className: "vr-duelo", children: [_jsxs("div", { children: [_jsx("span", { className: "a-kick", children: "Pregunta" }), _jsx(Persona, { id: vr.pregunta })] }), _jsx("span", { className: "vr-flecha", "aria-hidden": "true", children: "\u279C" }), _jsxs("div", { children: [_jsx("span", { className: "a-kick", children: "Responde" }), _jsx(Persona, { id: vr.responde })] })] }), cuerpo, barraComodines] }));
}
