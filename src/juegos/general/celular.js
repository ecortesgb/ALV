import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// La herramienta del jugador en su celular: una a la vez, según la mecánica de la ronda.
// Su secreto solo se ve mientras mantiene el dedo (Escáner). Cada toque se confirma: «Enviado» y luego «La TV ya lo recibió».
import { useEffect, useState } from "react";
import { CARTAS_PODER } from "../../content/catalogo";
import { MAX_PISTA } from "../../engine/partida";
import { Boton, Chip, Escaner, Panel } from "../../ds";
import { ElegirEnAnillo } from "../../pantallas/Identidad";
import { colorDe } from "../../app/colorJugador";
import { desenlace, instruccion, nombreDe } from "./texto";
import { CelularImpostor } from "../impostor/celular";
import { CelularVerdadReto } from "../verdadReto/celular";
import { CelularFisico } from "../fisico/celular";
import { ComoJugar, tocaExplicar } from "./ComoJugar";
import { CeremoniaCopas, PodioJuego, esFinalDeJuego } from "./Copas";
import { SelectorComodines } from "./SelectorComodines";
/** Elegir a alguien: burbujas en anillo con el color de cada quien; un toque marca y el botón confirma. */
function Elegir({ gente, miembros, sin, alElegir, titulo = "¿A quién eliges?", confirmar = "Votar", clave }) {
    const ids = gente.map(j => j.id);
    return _jsx(ElegirEnAnillo, { clave: clave, titulo: titulo, confirmar: confirmar, alElegir: alElegir, gente: gente.filter(j => j.id !== sin).map(j => ({ id: j.id, nombre: j.nombre, figura: miembros.find(m => m.id === j.id)?.figura, color: colorDe(j.id, ids) })) });
}
export function HerramientaCelular(p) {
    // Pantalla de carga antes de la primera ronda. Cada quien la cierra en su celular; la del anfitrión arranca la partida.
    const [visto, setVisto] = useState(false);
    const reglas = !visto && !p.sinCarga && tocaExplicar(p.v) && _jsx(ComoJugar, { v: p.v, modo: "celular", alCerrar: () => { setVisto(true); p.alComenzar?.(); } });
    if (p.v.juegoId === "copas")
        return _jsx(CeremoniaCopas, { v: p.v, miembros: p.miembros, modo: "celular" });
    // Al final del juego, su podio abajo del resultado.
    const podio = esFinalDeJuego(p.v) && _jsx(PodioJuego, { v: p.v, miembros: p.miembros, modo: "celular" });
    // El impostor con eliminación (Maestro v1.44) tiene su propia pantalla.
    // Con papeles en la mesa, las posiciones van en una página de su final (Elías, 24 nov).
    if (p.v.motor === "rol-secreto" && p.v.impostor)
        return _jsxs(_Fragment, { children: [reglas, _jsx(CelularImpostor, { ...p }), !p.v.impostor.palabras && podio] });
    if (p.v.motor === "turnos-cartas" && p.v.verdadReto)
        return _jsxs(_Fragment, { children: [reglas, _jsx(CelularVerdadReto, { ...p }), podio] });
    if (p.v.motor === "fisico")
        return _jsxs(_Fragment, { children: [reglas, _jsx(CelularFisico, { ...p }), podio] });
    return _jsxs(_Fragment, { children: [reglas, _jsx(HerramientaGeneral, { ...p }), podio] });
}
function HerramientaGeneral({ v, mi, miembros, mandar }) {
    const yo = mi.yo;
    const meToca = v.esperados.includes(yo);
    const recibido = v.contestaron.includes(yo);
    const clave = `${v.ronda}-${v.carta?.id ?? ""}`;
    const [enviado, setEnviado] = useState(null);
    const [texto, setTexto] = useState(""), [pista, setPista] = useState(""), [cuenta, setCuenta] = useState(0), [eleccion, setEleccion] = useState(null);
    useEffect(() => { setTexto(""); setPista(""); setCuenta(0); setEleccion(null); }, [clave]);
    const yaEnvie = enviado === clave || recibido;
    const contestar = async (valor) => { setEnviado(clave); if (!(await mandar("contestar", { valor })))
        setEnviado(null); };
    const soyTurno = v.turnoDe === yo;
    const mano = mi.miMano;
    if (v.fase === "revelada") {
        const d = desenlace(v);
        return _jsxs(Panel, { className: "a-herr a-entra", children: [_jsx("span", { className: "a-kick", children: "Resultado" }), _jsx("span", { className: "dsp ol a-t1", children: d.titular }), d.detalle && _jsx("p", { className: "a-suave", children: d.detalle }), _jsxs("p", { className: "a-nota", children: ["Llevas ", v.puntos[yo] ?? 0, " ", (v.puntos[yo] ?? 0) === 1 ? "punto" : "puntos"] })] });
    }
    if (v.pausada)
        return _jsxs(Panel, { className: "a-herr", children: [_jsx("span", { className: "dsp ol a-t1", children: "En pausa" }), _jsx("p", { className: "a-suave", children: "El anfitri\u00F3n detuvo la partida un momento." })] });
    const cartas = mano.length > 0 && v.fase === "contestando" && (_jsx(SelectorComodines, { cantidad: mano.length, children: mano.map((c, i) => {
            const def = CARTAS_PODER.find(x => x.id === c);
            const deTurno = c === "escudo" || c === "turno" || c === "cambio";
            const puede = !deTurno || (soyTurno && !recibido && ["turnos-cartas", "botella", "ruleta", "dados"].includes(v.motor));
            return _jsx("button", { type: "button", className: "d-chip a-comodin", disabled: !puede, title: def?.efecto, onClick: () => void mandar("carta", { carta: c }), children: def?.nombre ?? c }, c + i);
        }) }, clave));
    const espera = _jsx("p", { className: "a-estado", role: "status", children: recibido ? "La TV ya lo recibió" : "Enviado…" });
    let cuerpo;
    switch (v.motor) {
        case "turnos-cartas":
        case "botella":
        case "ruleta":
        case "dados":
            cuerpo = soyTurno ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: "a-kick", children: ["Te toca \u00B7 ", v.carta?.tipo ?? "carta"] }), _jsx("p", { className: "a-carta", children: v.carta?.texto ?? "Sin carta para este nivel" }), yaEnvie ? espera : _jsxs("div", { className: "a-pila", children: [_jsx(Boton, { color: "verde", texto: "Lo cumpl\u00ED", icono: "star", onClick: () => void contestar("cumplio") }), _jsx(Boton, { color: "rojo", texto: "No lo cumpl\u00ED", sub: "0 puntos", onClick: () => void contestar("paso") })] })] })) : _jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: instruccion(v) }), _jsx("p", { className: "a-carta", children: v.carta?.texto }), _jsx("p", { className: "a-suave", children: "Mira la pantalla y \u00E9chale porras." })] });
            break;
        case "votacion": {
            const dos = v.jugadores.length === 2;
            const ops = [["a", v.carta?.texto ?? "A"], ["b", v.carta?.opcionB ?? "B"]];
            cuerpo = yaEnvie ? _jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: "\u00BFQu\u00E9 prefieres?" }), espera] }) : dos && eleccion ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: "a-kick", children: ["\u00BFQu\u00E9 crees que eligi\u00F3 ", nombreDe(v, v.jugadores.find(j => j.id !== yo)?.id), "?"] }), _jsx("div", { className: "a-pila", children: ops.map(([k, t]) => _jsx(Boton, { color: k === "a" ? "azul" : "morado", texto: t, onClick: () => void contestar({ eleccion, prediccion: k }) }, k)) })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: "\u00BFQu\u00E9 prefieres?" }), _jsx("div", { className: "a-pila", children: ops.map(([k, t]) => _jsx(Boton, { color: k === "a" ? "azul" : "morado", texto: t, onClick: () => (dos ? setEleccion(k) : void contestar(k)) }, k)) })] }));
            break;
        }
        case "rol-secreto": {
            const m = (mi.mio ?? {});
            const impostor = m.rol === "impostor";
            cuerpo = (_jsxs(_Fragment, { children: [_jsx(Escaner, { secreto: impostor ? "Eres el impostor" : m.palabra ?? "…", encabezado: impostor ? "TU PAPEL" : "PALABRA CLASIFICADA", detalle: `Tema: ${m.tema ?? v.carta?.texto ?? ""}` }), v.pistas[yo] ? _jsxs("p", { className: "a-estado", children: ["Tu pista: \u00AB", v.pistas[yo], "\u00BB"] }) : (_jsxs("form", { className: "a-fila", onSubmit: e => { e.preventDefault(); if (pista.trim())
                            void mandar("pista", { texto: pista.trim() }); }, children: [_jsx("input", { className: "a-input", value: pista, maxLength: MAX_PISTA, onChange: e => setPista(e.target.value), placeholder: "Tu pista, una palabra", "aria-label": "Tu pista" }), _jsx("button", { type: "submit", className: "d-btn k-blu a-chico", disabled: !pista.trim(), children: _jsx("span", { className: "dsp", children: "Ya dije" }) })] })), yaEnvie ? espera : _jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: "\u00BFQui\u00E9n es el impostor?" }), _jsx(Elegir, { gente: v.jugadores, miembros: miembros, sin: yo, clave: clave, titulo: "\u00BFQui\u00E9n es?", alElegir: id => void contestar(id) })] })] }));
            break;
        }
        case "pareja": {
            const m = (mi.mio ?? {});
            cuerpo = !meToca ? _jsx("p", { className: "a-suave", children: "Esta ronda la juegan las parejas. Mira la pantalla." }) : yaEnvie ? _jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: "Tu respuesta" }), espera] }) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: m.papel === "adivina" ? "Adivina lo que contestó tu pareja" : "Contesta sobre ti" }), _jsx("p", { className: "a-carta", children: m.pregunta }), _jsxs("form", { className: "a-pila", onSubmit: e => { e.preventDefault(); if (texto.trim())
                            void contestar(texto.trim()); }, children: [_jsx("input", { className: "a-input", value: texto, maxLength: 120, onChange: e => setTexto(e.target.value), placeholder: "Escribe aqu\u00ED", "aria-label": "Tu respuesta" }), _jsx(Boton, { color: "amarillo", texto: "Enviar", icono: "play", desactivado: !texto.trim(), onClick: () => void contestar(texto.trim()) })] })] }));
            break;
        }
        case "conteo": {
            const palabras = (mi.mio ?? {}).palabras;
            const tope = palabras ? palabras.length : 40;
            cuerpo = !soyTurno ? _jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: instruccion(v) }), _jsx("p", { className: "a-carta", children: v.carta?.texto })] }) : yaEnvie ? _jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: "Tu cuenta" }), espera] }) : (_jsxs(_Fragment, { children: [_jsxs("span", { className: "a-kick", children: ["Te toca \u00B7 ", v.carta?.texto] }), palabras && _jsx("ol", { className: "a-palabras", children: palabras.map((p, i) => _jsxs("li", { className: i < cuenta ? "hecha" : "", children: [_jsx("b", { children: p.palabra }), p.prohibidas.length > 0 && _jsxs("small", { children: ["Sin decir: ", p.prohibidas.join(", ")] })] }, i)) }), _jsxs("div", { className: "a-contador", children: [_jsx("button", { type: "button", className: "a-atras", onClick: () => setCuenta(c => Math.max(0, c - 1)), "aria-label": "Una menos", children: "\u2212" }), _jsx("b", { className: "dsp ol a-num", "aria-live": "polite", children: cuenta }), _jsx("button", { type: "button", className: "a-atras", onClick: () => setCuenta(c => Math.min(tope, c + 1)), "aria-label": "Una m\u00E1s", children: "+" })] }), _jsx(Boton, { color: "amarillo", texto: "Termin\u00E9", sub: "Env\u00EDa cu\u00E1ntas lograste", icono: "play", onClick: () => void contestar(cuenta) })] }));
            break;
        }
        case "confesion":
            cuerpo = yaEnvie ? _jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: "Yo nunca\u2026" }), espera] }) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: "Yo nunca\u2026" }), _jsx("p", { className: "a-carta", children: v.carta?.texto }), _jsxs("div", { className: "a-pila", children: [_jsx(Boton, { color: "naranja", texto: "S\u00ED lo he hecho", onClick: () => void contestar("si") }), _jsx(Boton, { color: "azul", texto: "Nunca", onClick: () => void contestar("no") })] })] }));
            break;
        case "senalar":
            cuerpo = yaEnvie ? _jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: "Tu voto" }), espera] }) : _jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: "\u00BFQui\u00E9n es m\u00E1s probable que\u2026?" }), _jsx("p", { className: "a-carta", children: v.carta?.texto }), _jsx(Elegir, { gente: v.jugadores, miembros: miembros, clave: clave, titulo: "\u00BFQui\u00E9n?", alElegir: id => void contestar(id) })] });
            break;
        case "competencia":
            cuerpo = meToca && !yaEnvie ? _jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: v.carta?.tipo || "Reto del lugar" }), _jsx("p", { className: "a-carta", children: v.carta?.texto }), _jsx("span", { className: "a-kick", children: "Marca qui\u00E9n gan\u00F3" }), _jsx(Elegir, { gente: v.jugadores, miembros: miembros, clave: clave, titulo: "\u00BFQui\u00E9n gan\u00F3?", confirmar: "Gan\u00F3", alElegir: id => void contestar(id) })] })
                : _jsxs(_Fragment, { children: [_jsx("span", { className: "a-kick", children: v.carta?.tipo || "Reto del lugar" }), _jsx("p", { className: "a-carta", children: v.carta?.texto }), meToca ? espera : _jsx("p", { className: "a-suave", children: "El anfitri\u00F3n marca qui\u00E9n gan\u00F3." })] });
            break;
        case "fisico": // tiene su propia pantalla (CelularFisico)
            cuerpo = _jsx(_Fragment, {});
            break;
    }
    return _jsxs(Panel, { className: "a-herr a-entra", como: "section", children: [cuerpo, cartas, v.cartaUsada && v.cartaUsada.ronda === v.ronda && _jsx(Chip, { texto: `${nombreDe(v, v.cartaUsada.jugador)} usó ${CARTAS_PODER.find(c => c.id === v.cartaUsada.carta)?.nombre ?? "un comodín"}`, icono: "bolt" })] });
}
