import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// El impostor con eliminación en el celular (Maestro v1.44).
// Arriba: tu figura en su pedestal de color, junto al lector de huella para ver tu palabra.
// En tu turno: un pizarrón para escribir tu palabra (la dices en voz alta). Al final de la vuelta: votar.
import { useEffect, useRef, useState } from "react";
import { MAX_PISTA, SALTAR_VOTO } from "../../engine/partida";
import { Boton, Escaner, Panel } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Escena3D, enEscena } from "../../app/figura3d";
import { NombreJugador } from "../../pantallas/comun";
import { AnilloBurbujas, Burbuja, ElegirEnAnillo } from "../../pantallas/Identidad";
import { desenlaceImpostor, nombreDe } from "../general/texto";
import { RelojTurno } from "../general/RelojTurno";
import { CastigosNave, ExpulsionNave, FinNave, TableroVotos, VictoriaNave, arteNave, esNave, revNave, usePasoExpulsion } from "./nave";
import { Posiciones } from "../general/Copas";
import { AnuncioDiscusion, useAnuncioDiscusion } from "./papelNave";
import { HistorialPalabras, MesaPalabras, PizarraVotos } from "./mesaNave";
import "./impostor.css";
export function CelularImpostor({ v, mi, miembros, mandar }) {
    const yo = mi.yo, im = v.impostor;
    const ids = v.jugadores.map(j => j.id);
    const figura = (id) => miembros.find(m => m.id === id)?.figura;
    const color = (id) => colorDe(id, ids);
    const m = (mi.mio ?? {});
    // Papeles en la mesa (Elías, 24 nov): tablero con la palabra de cada quien y el aviso «¡A discutir!».
    const sala = !!im.palabras;
    const anuncio = useAnuncioDiscusion(v);
    const soyImpostor = m.rol === "impostor";
    const fuera = im.eliminados.includes(yo);
    const vivos = ids.filter(id => !im.eliminados.includes(id));
    const clave = `${v.ronda}-${im.etapa}`;
    const [texto, setTexto] = useState(""), [enviado, setEnviado] = useState(null), [voto, setVoto] = useState(null);
    const [sel, setSel] = useState(null);
    const [verVueltas, setVerVueltas] = useState(false);
    useEffect(() => { setTexto(""); setEnviado(null); setVoto(null); setSel(null); }, [clave]);
    const meToca = v.fase === "contestando" && im.etapa === "pistas" && v.turnoDe === yo && !v.pausada;
    const nave = esNave(v);
    const [paso, saltarVictoria] = usePasoExpulsion(v);
    const yaVote = v.contestaron.includes(yo) || enviado === clave;
    const decir = async () => {
        const t = texto.trim();
        if (!t)
            return;
        setEnviado(clave);
        if (!(await mandar("pista", { texto: t })))
            setEnviado(null);
    };
    const votar = async (id) => {
        setVoto(id);
        setEnviado(clave);
        if (!(await mandar("contestar", { valor: id }))) {
            setEnviado(null);
            setVoto(null);
        }
    };
    // Papeles en la mesa, durante la vuelta y la votación (Elías, 24 nov): una sola pantalla. Al centro el tablero con la
    // palabra de cada quien (también es donde se vota); arriba tu palabra con la huella; abajo lo que te toca hacer.
    // Al revelar, con papeles (Elías, 24 nov): primero la expulsión a pantalla completa; luego, si la partida sigue, quién
    // salió y el tablero con los votos; si acabó, el final en páginas que se deslizan (resultado, castigo, posiciones).
    if (sala && v.fase === "revelada") {
        const rv = revNave(v);
        const capa = paso === "vuela" ? _jsx(ExpulsionNave, { v: v, miembros: miembros, modo: "celular" })
            : paso === "victoria" ? _jsx(VictoriaNave, { v: v, miembros: miembros, modo: "celular", alSaltar: saltarVictoria }) : null;
        const puntos = v.puntos[yo] ?? 0;
        if (rv.fin) {
            const gano = (rv.fin === "impostores") === soyImpostor;
            const paginas = [
                { id: "res", titulo: "Resultado", cuerpo: _jsxs(_Fragment, { children: [_jsx(FinNave, { v: v, miembros: miembros, modo: "celular", yo: yo, sinCastigos: true }), _jsxs("p", { className: "nv-gane dsp" + (gano ? " si" : ""), children: [gano ? "¡Ganaste!" : "Perdiste esta", " ", _jsxs("small", { children: ["\u00B7 ", puntos, " ", puntos === 1 ? "punto" : "puntos"] })] })] }) },
            ];
            if (Object.keys(rv.castigos ?? {}).length)
                paginas.push({ id: "cas", titulo: "Castigo", cuerpo: _jsx(CastigosNave, { v: v, miembros: miembros, modo: "celular", yo: yo }) });
            paginas.push({ id: "pos", titulo: "Posiciones", cuerpo: _jsx(Posiciones, { v: v, miembros: miembros }) });
            return (_jsxs("section", { className: "im-cel nv-cel nv-cel-fin", "aria-label": "Final de El impostor", style: { "--espacio": arteNave("espacio") }, children: [_jsx(PaginasFin, { paginas: paginas }), capa] }));
        }
        const sale = rv.eliminado ? { id: rv.eliminado, nombre: nombreDe(v, rv.eliminado), figura: figura(rv.eliminado), color: color(rv.eliminado) } : null;
        const d = desenlaceImpostor(v);
        // El titular ya dice si era impostor; la etiqueta solo cuando es secreto.
        const marca = sale && rv.secreto ? "¿Quién sabe?" : null;
        return (_jsxs("section", { className: "im-cel nv-cel", "aria-label": "El impostor", style: { "--espacio": arteNave("espacio") }, children: [_jsxs("div", { className: "nv-salio" + (rv.eraImpostor && !rv.secreto ? " imp" : ""), children: [sale ? _jsx(Burbuja, { p: { ...sale, apagada: true }, tamano: "2.8em" }) : _jsx("span", { className: "nv-nadie grande", "aria-hidden": "true", style: { "--arte": arteNave("boton-saltar") } }), _jsxs("span", { className: "nv-salio-txt", children: [_jsx("b", { className: "dsp", children: d.titular }), marca ? _jsx("span", { className: "nv-marca dsp" + (rv.eraImpostor && !rv.secreto ? " imp" : ""), children: marca }) : d.detalle && _jsx("small", { children: d.detalle })] })] }), _jsx(TableroVotos, { v: v, miembros: miembros, compacto: true, yo: yo }), _jsxs("p", { className: "nv-accion nv-ac-t dsp", children: ["Llevas ", puntos, " ", puntos === 1 ? "punto" : "puntos", _jsxs("small", { children: [rv.quedan != null && !rv.secreto ? (rv.quedan === 1 ? "Queda 1 impostor. " : `Quedan ${rv.quedan} impostores. `) : "", "El anfitri\u00F3n pasa a la siguiente vuelta."] })] }), capa] }));
    }
    if (sala && v.fase !== "revelada") {
        const enVoto = im.etapa === "votar" && !fuera && !yaVote && !v.pausada;
        const nombreSel = sel === SALTAR_VOTO ? "Nadie" : sel ? nombreDe(v, sel) : null;
        const quien = v.turnoDe ?? "";
        let accion;
        if (v.pausada)
            accion = _jsxs("p", { className: "nv-ac-t dsp", children: ["En pausa ", _jsx("small", { children: "El anfitri\u00F3n detuvo la partida un momento." })] });
        else if (fuera)
            accion = _jsxs("p", { className: "nv-ac-t dsp", children: ["Saliste de la nave ", _jsx("small", { children: "Ya no hablas ni votas. No digas nada hasta el final." })] });
        else if (im.etapa === "pistas" && meToca)
            accion = (_jsxs("form", { className: "nv-ac-turno", onSubmit: e => { e.preventDefault(); void decir(); }, children: [_jsx("span", { className: "nv-ac-k", children: "\u00A1Te toca! Dila en voz alta y escr\u00EDbela" }), _jsxs("span", { className: "nv-ac-fila", children: [_jsx("input", { className: "nv-ac-input", value: texto, maxLength: MAX_PISTA, onChange: e => setTexto(e.target.value), placeholder: "Tu palabra", "aria-label": "Tu palabra", autoComplete: "off", enterKeyHint: "send", disabled: enviado === clave }), _jsx("button", { type: "submit", className: "lb-listo nv-ac-btn", disabled: !texto.trim() || enviado === clave, children: enviado === clave ? "…" : "¡Ya la dije!" })] })] }));
        else if (im.etapa === "pistas")
            accion = (_jsxs("div", { className: "nv-ac-espera", children: [_jsx(Burbuja, { p: { id: quien, nombre: nombreDe(v, quien), figura: figura(quien), color: color(quien) }, tamano: "2.6em", seleccionada: true }), _jsxs("span", { children: [_jsx("span", { className: "nv-ac-k", children: "Le toca a" }), _jsx("b", { className: "dsp", children: nombreDe(v, quien) })] }), _jsx("small", { children: v.pistas[yo] ? `Tú dijiste «${v.pistas[yo]}»` : "Escucha y piensa la tuya" })] }));
        else if (enVoto)
            accion = (_jsxs("div", { className: "nv-ac-voto", children: [_jsx("span", { className: "nv-ac-k", children: sel ? "¿Seguro?" : "Toca en el tablero quién se baja (o «Nadie»)" }), _jsx("button", { type: "button", className: "nv-ac-votar dsp" + (sel ? " listo" : ""), disabled: !sel, onClick: () => { if (sel)
                            void votar(sel); }, children: nombreSel ? _jsxs(_Fragment, { children: ["Votar: ", _jsx("b", { children: nombreSel })] }) : "Votar" })] }));
        else
            accion = _jsxs("p", { className: "nv-ac-t dsp", children: ["Tu voto: ", voto === SALTAR_VOTO ? "Nadie" : voto ? nombreDe(v, voto) : "enviado", _jsxs("small", { children: ["Faltan ", vivos.filter(j => !v.contestaron.includes(j)).length, " por votar. Si hay empate, nadie sale."] })] });
        // Mesa con las figuras y sus palabras; al votar, encima se abre la pizarra (Elías, 24 nov).
        const votando = im.etapa === "votar" && !v.pausada;
        const hayVueltas = v.ronda > 1 && Object.values(im.palabras ?? {}).some(p => p.length > 0);
        return (_jsxs("section", { className: "im-cel nv-cel nm-cel" + (votando ? " votando" : ""), "aria-label": "El impostor", style: { "--espacio": arteNave("espacio"), "--cuarto": arteNave("nave-cuarto") }, children: [_jsx(MesaPalabras, { v: v, miembros: miembros, yo: yo }), _jsxs("div", { className: "nv-cel-cab", children: [_jsxs("span", { className: "nv-cel-k", children: [votando ? "¡A votar!" : `Vuelta ${v.ronda}`, " \u00B7 ", im.total, " ", im.total === 1 ? "impostor" : "impostores"] }), _jsx(RelojTurno, { v: v, size: "2.4em" }), _jsx(MiPalabra, { imp: soyImpostor, palabra: m.palabra, tema: m.tema ?? v.carta?.texto ?? "", pista: m.pista, comp: (m.companeros ?? []).map(c => nombreDe(v, c)) }), hayVueltas && _jsx("button", { type: "button", className: "nm-ver-vueltas", onClick: () => setVerVueltas(true), children: "\uD83D\uDCDC Vueltas" })] }), votando ? _jsx(PizarraVotos, { v: v, miembros: miembros, yo: yo, sel: sel, alElegir: setSel, puedo: enVoto, miVoto: voto, alVotar: () => { if (sel)
                        void votar(sel); } })
                    : _jsx("div", { className: "nv-accion", style: varsColor(color(meToca ? yo : quien)), children: accion }), verVueltas && _jsx(HistorialPalabras, { v: v, miembros: miembros, alCerrar: () => setVerVueltas(false) }), anuncio && _jsx(AnuncioDiscusion, { modo: "celular" })] }));
    }
    // La figura festeja o se lamenta al revelar; sale de escena si la eliminaron.
    const r = (v.revelado ?? {});
    const gane = !!r.fin && (r.fin === "impostores") === soyImpostor;
    const momento = v.fase !== "revelada" ? null : r.fin ? (gane ? "victoria" : "derrota") : r.eliminado === yo ? "derrota" : null;
    const cuadro = (_jsxs("div", { className: "im-yo", style: varsColor(color(yo)), children: [_jsxs("div", { className: "im-yo-fig" + (fuera ? " fuera" : ""), children: [_jsx("span", { className: "im-pn dsp", children: color(yo)?.etiqueta }), _jsx(Escena3D, { modo: "sala", figuras: [{ ...enEscena(yo, figura(yo)), color: color(yo)?.base, columna: 0 }], columnas: 1, momentos: momento ? [{ id: yo, cual: momento, n: v.ronda }] : [], className: "im-3d" }), fuera && _jsx("span", { className: "im-sello dsp ol", children: "Fuera" })] }), _jsx(Escaner, { secreto: soyImpostor ? "Eres el impostor" : m.palabra ?? "…", encabezado: soyImpostor ? "TU PAPEL" : "PALABRA CLASIFICADA", detalle: `Tema: ${m.tema ?? v.carta?.texto ?? ""}${soyImpostor && m.pista ? ` · Pista: ${m.pista}` : ""}${soyImpostor && m.companeros?.length ? ` · Cómplice: ${m.companeros.map(c => nombreDe(v, c)).join(", ")}` : ""}`, style: { minHeight: "100%" } })] }));
    // Fila de quién habla y qué dijo, con su color.
    const ronda = (_jsx("ol", { className: "im-orden", "aria-label": "Orden de la vuelta", children: im.orden.map(id => {
            const dijo = v.pistas[id];
            return (_jsxs("li", { className: (v.turnoDe === id && im.etapa === "pistas" ? "turno" : "") + (id === yo ? " yo" : ""), style: varsColor(color(id)), children: [_jsx("span", { className: "im-pn dsp", children: color(id)?.etiqueta }), _jsx(NombreJugador, { nombre: nombreDe(v, id), figura: figura(id), clase: "im-nom" }), _jsx("b", { className: "im-dijo", children: dijo ?? (v.turnoDe === id && im.etapa === "pistas" ? "hablando…" : "") })] }, id));
        }) }));
    let cuerpo;
    if (v.fase === "revelada" && nave && r.fin && paso !== "vuela") {
        cuerpo = _jsxs(_Fragment, { children: [_jsx(FinNave, { v: v, miembros: miembros, modo: "celular", yo: yo }), _jsx("p", { className: "dsp ol im-gane", style: { textAlign: "center" }, children: gane ? "¡Ganaste!" : "Perdiste esta" })] });
    }
    else if (v.fase === "revelada") {
        const d = desenlaceImpostor(v);
        cuerpo = (_jsxs(Panel, { className: "im-res a-entra", como: "section", children: [_jsx("span", { className: "a-kick", children: r.fin ? "Fin de la partida" : `Vuelta ${v.ronda}` }), _jsx("span", { className: "dsp ol a-t1", children: d.titular }), d.detalle && _jsx("p", { className: "a-suave", children: d.detalle }), r.fin && _jsx("p", { className: "dsp ol im-gane", children: gane ? "¡Ganaste!" : "Perdiste esta" }), _jsxs("p", { className: "a-nota", children: ["Llevas ", v.puntos[yo] ?? 0, " ", (v.puntos[yo] ?? 0) === 1 ? "punto" : "puntos"] }), nave && _jsx(TableroVotos, { v: v, miembros: miembros, compacto: true, yo: yo }), nave && paso === "vuela" && _jsx(ExpulsionNave, { v: v, miembros: miembros, modo: "celular" })] }));
    }
    else if (v.pausada) {
        cuerpo = _jsxs(Panel, { className: "im-res", children: [_jsx("span", { className: "dsp ol a-t1", children: "En pausa" }), _jsx("p", { className: "a-suave", children: "El anfitri\u00F3n detuvo la partida un momento." })] });
    }
    else if (fuera) {
        cuerpo = nave
            ? _jsxs(Panel, { className: "im-res", children: [_jsx("span", { className: "dsp ol a-t2", children: "Saliste de la nave" }), _jsx("p", { className: "a-suave", children: "Ya no hablas ni votas. Sabr\u00E1s qui\u00E9n era el impostor cuando acabe la partida; mientras, no digas nada." }), im.etapa === "votar" && _jsx(TableroVotos, { v: v, miembros: miembros, compacto: true, yo: yo })] })
            : _jsxs(Panel, { className: "im-res", children: [_jsx("span", { className: "dsp ol a-t2", children: "Saliste de escena" }), _jsx("p", { className: "a-suave", children: "Ya no hablas ni votas. Mira c\u00F3mo termina y no digas nada." })] });
    }
    else if (im.etapa === "pistas") {
        cuerpo = meToca ? (_jsxs("form", { className: "im-pizarron a-entra", onSubmit: e => { e.preventDefault(); void decir(); }, style: varsColor(color(yo)), children: [_jsx("span", { className: "im-piz-t dsp", children: "\u00A1Te toca! Dila en voz alta y escr\u00EDbela" }), _jsx("input", { className: "im-tiza", value: texto, maxLength: MAX_PISTA, onChange: e => setTexto(e.target.value), placeholder: "Tu palabra", "aria-label": "Tu palabra", autoComplete: "off", enterKeyHint: "send", disabled: enviado === clave }), _jsx(Boton, { color: "amarillo", texto: enviado === clave ? "Enviando…" : "¡Ya la dije!", icono: "play", desactivado: !texto.trim(), cargando: enviado === clave, onClick: () => void decir() })] })) : (_jsxs("div", { className: "im-pizarron espera", style: varsColor(color(v.turnoDe ?? "")), children: [_jsx("span", { className: "im-piz-t dsp", children: "Le toca a" }), _jsxs("span", { className: "im-turno", children: [_jsx(Burbuja, { p: { id: v.turnoDe ?? "", nombre: nombreDe(v, v.turnoDe), figura: figura(v.turnoDe ?? ""), color: color(v.turnoDe ?? "") }, tamano: 48, seleccionada: true }), _jsx(NombreJugador, { nombre: nombreDe(v, v.turnoDe), figura: figura(v.turnoDe ?? "") })] }), _jsx("small", { children: v.pistas[yo] ? `Tú dijiste «${v.pistas[yo]}»` : "Escucha bien y piensa la tuya." })] }));
    }
    else {
        cuerpo = yaVote ? (_jsxs(Panel, { className: "im-res", children: [_jsx("span", { className: "a-kick", children: "Tu voto" }), _jsx("span", { className: "dsp ol a-t2", children: voto === SALTAR_VOTO ? "Nadie, todavía" : voto ? nombreDe(v, voto) : "Enviado" }), _jsx("p", { className: "a-estado", role: "status", children: v.contestaron.includes(yo) ? (nave ? "Tu voto ya está en la nave" : "La TV ya lo recibió") : "Enviado…" }), _jsxs("p", { className: "a-nota", children: ["Faltan ", vivos.filter(j => !v.contestaron.includes(j)).length, " por votar."] }), nave && _jsx(TableroVotos, { v: v, miembros: miembros, compacto: true, yo: yo })] })) : nave ? (_jsx(VotarNave, { clave: clave, gente: vivos.filter(id => id !== yo).map(id => ({ id, nombre: nombreDe(v, id), figura: figura(id), color: color(id), nota: v.pistas[id] })), alVotar: id => void votar(id) })) : (_jsx("section", { className: "im-votar a-entra", "aria-label": "Votar", children: _jsx(ElegirEnAnillo, { clave: clave, titulo: "\u00BFQui\u00E9n es el impostor?", confirmar: "Votar", alElegir: id => void votar(id), gente: vivos.filter(id => id !== yo).map(id => ({ id, nombre: nombreDe(v, id), figura: figura(id), color: color(id), nota: v.pistas[id] })) }) }));
    }
    return (_jsxs("section", { className: "im-cel a-pila", "aria-label": "El impostor", children: [_jsxs("div", { className: "a-entre", children: [_jsxs("span", { className: "a-kick", children: ["Vuelta ", v.ronda, " \u00B7 ", im.total, " ", im.total === 1 ? "impostor" : "impostores"] }), im.eliminados.length > 0 && _jsxs("span", { className: "a-nota", children: ["Fuera: ", im.eliminados.map(j => nombreDe(v, j)).join(", ")] }), _jsx(RelojTurno, { v: v, size: "3em" })] }), cuadro, cuerpo, v.fase !== "revelada" && (sala ? im.etapa === "pistas" && _jsx(TableroVotos, { v: v, miembros: miembros, compacto: true, yo: yo }) : ronda), anuncio && _jsx(AnuncioDiscusion, { modo: "celular" })] }));
}
/** Final en páginas que se deslizan a los lados (sin bajar): pestañas arriba, deslizar o tocarlas. */
function PaginasFin({ paginas }) {
    const [i, setI] = useState(0);
    const caja = useRef(null);
    const ir = (n) => { const c = caja.current; if (c)
        c.scrollTo({ left: n * c.clientWidth, behavior: "smooth" }); };
    return (_jsxs("div", { className: "nv-pags", children: [_jsx("div", { className: "nv-pags-tabs", role: "tablist", children: paginas.map((p, n) => _jsx("button", { type: "button", role: "tab", "aria-selected": i === n, className: i === n ? "on" : "", onClick: () => ir(n), children: p.titulo }, p.id)) }), _jsx("div", { ref: caja, className: "nv-pags-caja", onScroll: e => { const c = e.currentTarget; setI(Math.round(c.scrollLeft / Math.max(1, c.clientWidth))); }, children: paginas.map(p => _jsx("div", { className: "nv-pag", role: "tabpanel", "aria-label": p.titulo, children: p.cuerpo }, p.id)) }), paginas.length > 1 && _jsx("span", { className: "nv-pags-pista", "aria-hidden": "true", children: i < paginas.length - 1 ? `Desliza → ${paginas[i + 1].titulo}` : "← Desliza para volver" })] }));
}
/** Tu palabra en chico: mantén el dedo para verla (al soltar se tapa). El impostor ve su papel, la pista o la categoría. */
function MiPalabra({ imp, palabra, tema, pista, comp }) {
    const [ver, setVer] = useState(false);
    const tecla = (e, x) => { if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setVer(x);
    } };
    return (_jsx("button", { type: "button", className: "nv-mia" + (ver ? " on" : "") + (imp ? " imp" : ""), "aria-pressed": ver, "aria-label": "Mant\u00E9n presionado para ver tu palabra", onPointerDown: () => setVer(true), onPointerUp: () => setVer(false), onPointerLeave: () => setVer(false), onPointerCancel: () => setVer(false), onContextMenu: e => e.preventDefault(), onBlur: () => setVer(false), onKeyDown: e => tecla(e, true), onKeyUp: e => tecla(e, false), children: ver ? (_jsxs("span", { className: "nv-mia-txt", "aria-live": "polite", children: [_jsx("b", { className: "dsp", children: imp ? "Impostor" : palabra ?? "…" }), _jsx("small", { children: imp ? (pista ? `Pista: ${pista}` : `Categoría: ${tema}`) + (comp.length ? ` · Con ${comp.join(", ")}` : "") : `Categoría: ${tema}` })] })) : _jsxs("span", { className: "nv-mia-tapa", children: [_jsx("span", { "aria-hidden": "true", children: "\uD83D\uDC46" }), " Mant\u00E9n para ver tu palabra"] }) }));
}
/** Votar en la nave (Elías, 24 nov): los de la mesa alrededor y el botón dorado al centro; «Nadie, todavía» salta el voto. */
function VotarNave({ gente, alVotar, clave }) {
    const [sel, setSel] = useState(null);
    useEffect(() => setSel(null), [clave]);
    const nombre = sel === SALTAR_VOTO ? "Nadie" : gente.find(p => p.id === sel)?.nombre;
    return (_jsxs("section", { className: "nv-votar a-entra", "aria-label": "Votar", children: [_jsx("span", { className: "nv-votar-t dsp ol", children: "\u00BFQui\u00E9n se baja de la nave?" }), _jsx(AnilloBurbujas, { gente: gente, seleccionada: sel === SALTAR_VOTO ? null : sel, alElegir: setSel, ancho: 400, etiqueta: "\u00BFQui\u00E9n se baja de la nave?", centro: _jsx("span", { className: "nv-centro", style: { "--arte": arteNave("nave-mesa") }, children: _jsxs("button", { type: "button", className: "nv-boton" + (sel ? " listo" : ""), disabled: !sel, onClick: () => { if (sel)
                            alVotar(sel); }, children: ["Votar", nombre && _jsx("small", { children: nombre })] }) }) }), _jsx("button", { type: "button", className: "nv-saltar", "aria-pressed": sel === SALTAR_VOTO, onClick: () => setSel(SALTAR_VOTO), children: "Nadie, todav\u00EDa" }), _jsx("p", { className: "a-nota", children: "Toca a alguien (o \u00ABNadie\u00BB) y luego el bot\u00F3n. Si hay empate, nadie sale." })] }));
}
