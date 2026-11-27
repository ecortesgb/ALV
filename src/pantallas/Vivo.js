import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Quién está en línea y el chat (app/hubVivo.ts). La franja va abajo en el HUB; el chat se abre como panel.
import { useEffect, useRef, useState } from "react";
import { Icono } from "../ds";
import { abrirChat, enviarChat, useFigurasDe, useHubVivo } from "../app/hubVivo";
import { useSesion } from "../app/sesion";
import { MAX_TEXTO } from "../servicios/hubVivo";
import { Retrato } from "./comun";
import "./vivo.css";
const MAX_CARAS = 5;
const hora = (t) => new Date(t).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
/** Cara de quien está en línea: su figura si se puede leer; si no, su inicial. Siempre con punto verde. */
function Cara({ p, figura, size }) {
    return (_jsxs("span", { className: "vv-cara", title: p.nombre, children: [figura ? _jsx(Retrato, { id: p.id, figura: figura, nombre: p.nombre, size: size }) : _jsx("span", { className: "vv-inicial dsp", style: { width: size, height: size }, children: p.nombre.slice(0, 1).toUpperCase() }), _jsx("i", { className: "vv-punto", "aria-hidden": "true" })] }));
}
/** Franja «En línea»: caras, cuántos hay y el botón del chat con mensajes sin leer. */
export function FranjaEnLinea({ className = "" }) {
    const v = useHubVivo();
    const figs = useFigurasDe(v.enLinea.map(p => p.id));
    const caras = v.enLinea.slice(0, MAX_CARAS), mas = v.enLinea.length - caras.length;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "vv-franja " + className, children: [_jsxs("button", { type: "button", className: "vv-gente", onClick: () => abrirChat(true), "aria-label": `${v.enLinea.length} en línea. Abrir el chat`, children: [_jsxs("span", { className: "vv-titulo dsp", children: [_jsx("i", { className: "vv-punto vv-punto-t", "aria-hidden": "true" }), v.enLinea.length, " en l\u00EDnea"] }), _jsxs("span", { className: "vv-caras", children: [caras.map(p => _jsx(Cara, { p: p, figura: figs.get(p.id) ?? null, size: 40 }, p.id)), mas > 0 && _jsxs("span", { className: "vv-mas dsp", children: ["+", mas] })] })] }), _jsxs("button", { type: "button", className: "vv-chat-btn", onClick: () => abrirChat(true), "aria-label": v.sinLeer ? `Chat, ${v.sinLeer} sin leer` : "Chat", children: [_jsx(Icono, { id: "users" }), _jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", className: "vv-burbuja", children: _jsx("path", { d: "M4 5h16v11H9l-5 4z" }) }), v.sinLeer > 0 && _jsx("span", { className: "vv-badge dsp", children: v.sinLeer > 9 ? "9+" : v.sinLeer })] })] }), v.abierto && _jsx(PanelChat, {})] }));
}
/** Panel del chat: mensajes de quienes están conectados ahora (no se guardan). */
export function PanelChat() {
    const v = useHubVivo();
    const s = useSesion();
    const figs = useFigurasDe(v.enLinea.map(p => p.id));
    const [texto, setTexto] = useState(""), [aviso, setAviso] = useState(null);
    const lista = useRef(null), campo = useRef(null);
    useEffect(() => { lista.current?.scrollTo({ top: lista.current.scrollHeight }); }, [v.mensajes.length]);
    useEffect(() => { campo.current?.focus({ preventScroll: true }); }, []);
    useEffect(() => {
        const tecla = (e) => { if (e.key === "Escape")
            abrirChat(false); };
        addEventListener("keydown", tecla);
        return () => removeEventListener("keydown", tecla);
    }, []);
    const mandar = (e) => {
        e?.preventDefault();
        const r = enviarChat(texto);
        setAviso(r);
        if (!r)
            setTexto("");
    };
    return (_jsx("div", { className: "vv-capa", role: "presentation", onClick: e => { if (e.target === e.currentTarget)
            abrirChat(false); }, children: _jsxs("section", { className: "vv-panel", role: "dialog", "aria-modal": "true", "aria-label": "Chat de ALV", children: [_jsxs("header", { className: "vv-cab", children: [_jsx("span", { className: "dsp", children: "Chat" }), _jsxs("small", { children: [_jsx("i", { className: "vv-punto vv-punto-t", "aria-hidden": "true" }), v.enLinea.length, " en l\u00EDnea"] }), _jsx("button", { type: "button", className: "vv-cerrar", onClick: () => abrirChat(false), "aria-label": "Cerrar el chat", children: _jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: "M6 6l12 12M18 6 6 18" }) }) })] }), _jsx("div", { className: "vv-conectados", children: v.enLinea.map(p => _jsxs("span", { className: "vv-conectado", children: [_jsx(Cara, { p: p, figura: figs.get(p.id) ?? null, size: 34 }), _jsx("small", { children: p.id === s.uid ? "Tú" : p.nombre })] }, p.id)) }), _jsxs("ol", { ref: lista, className: "vv-mensajes", "aria-live": "polite", children: [v.mensajes.length === 0 && _jsx("li", { className: "vv-vacio", children: "Nadie ha escrito todav\u00EDa. Los mensajes solo los ven quienes est\u00E1n conectados y no se guardan." }), v.mensajes.map(m => (_jsxs("li", { className: m.de === s.uid ? "yo" : "", children: [_jsx("b", { children: m.de === s.uid ? "Tú" : m.nombre }), _jsx("span", { children: m.texto }), _jsx("time", { children: hora(m.t) })] }, m.id)))] }), _jsxs("form", { className: "vv-escribir", onSubmit: mandar, children: [_jsx("input", { ref: campo, value: texto, onChange: e => setTexto(e.target.value), maxLength: MAX_TEXTO, placeholder: "Escribe un mensaje\u2026", "aria-label": "Mensaje", autoComplete: "off", enterKeyHint: "send" }), _jsx("button", { type: "submit", className: "vv-enviar", "aria-label": "Enviar", disabled: !texto.trim(), children: _jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: "M3 11.5 21 3l-6.5 18-3-7.5z" }) }) })] }), aviso && _jsx("small", { className: "vv-aviso", role: "status", children: aviso })] }) }));
}
