import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Piezas comunes de las pantallas de ALV 2.0: marco con ciudad, cabecera, avisos, confirmación y figuras.
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icono, RaizDS } from "../ds";
import { FondoALV } from "./Fondos";
import { BarraRecursos } from "./Recursos";
import { Escena3D, FotoFigura, apodoDe, semillaDe } from "../app/figura3d";
import { atras } from "../app/rutas";
import { varsColor } from "../app/colorJugador";
/** ¿Pantalla ancha (laptop o TV)? */
// Celular girado (horizontal, desde 600 px de ancho) usa el mismo diseño que la computadora.
const consultaAncho = (min) => `(min-width:${min}px), (orientation: landscape) and (min-width:600px)`;
export function useAncho(min = 900) {
    const [a, setA] = useState(() => matchMedia(consultaAncho(min)).matches);
    useEffect(() => {
        const m = matchMedia(consultaAncho(min)), f = () => setA(m.matches);
        m.addEventListener("change", f);
        return () => m.removeEventListener("change", f);
    }, [min]);
    return a;
}
/** Marco de toda pantalla: tokens del Design System, ciudad según la hora (o el fondo que se pase) y zona que se desliza. */
export function Marco({ children, clase = "", fijo, fondo }) {
    const ancho = useAncho();
    return (_jsxs(RaizDS, { ancho: ancho, className: `alv ${clase}`.trim(), children: [fondo ?? _jsx(FondoALV, {}), _jsx("div", { className: "a-scroll", children: children }), fijo] }));
}
/** Cabecera con regreso y el nombre de la sección en su etiqueta amarilla. */
export function Cabecera({ titulo, icono, derecha, alVolver, recursos = true }) {
    return (_jsxs("header", { className: "a-cab" + (recursos ? " a-cab-rc" : ""), children: [_jsx("button", { type: "button", className: "a-atras", onClick: alVolver ?? atras, "aria-label": "Regresar", children: _jsx(Icono, { id: "back" }) }), _jsxs("h1", { className: "d-lbl a-titulo", children: [icono && _jsx(Icono, { id: icono }), titulo] }), (derecha || recursos) && _jsxs("div", { className: "a-cab-der", children: [derecha, recursos && _jsx(BarraRecursos, { compacta: true, className: "a-cab-recursos" })] })] }));
}
// ---------- Avisos (uno a la vez, abajo) y confirmación ----------
let avisoActual = null, n = 0;
const oyentes = new Set();
const avisar = () => oyentes.forEach(f => f());
/**
 * `url("…")` absoluta para una imagen de public/arte. Absoluta a propósito: el sitio publicado usa base «./» y una url
 * relativa dentro de una variable de CSS se resuelve desde la carpeta del CSS (assets/), donde no está la imagen.
 */
export const urlArte = (nombre) => `url("${new URL(`${import.meta.env.BASE_URL}arte/${nombre}`, document.baseURI).href}")`;
export function aviso(texto) {
    const mio = ++n;
    avisoActual = { texto, n: mio };
    avisar();
    setTimeout(() => { if (avisoActual?.n === mio) {
        avisoActual = null;
        avisar();
    } }, 3200);
}
let pregunta = null;
export const confirmar = (p) => new Promise(r => { pregunta = { ...p, responder: v => { pregunta = null; avisar(); r(v); } }; avisar(); });
export function Avisos() {
    const a = useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => avisoActual);
    const p = useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => pregunta);
    useEffect(() => {
        if (!p)
            return;
        const f = (e) => { if (e.key === "Escape")
            p.responder(false); };
        addEventListener("keydown", f);
        return () => removeEventListener("keydown", f);
    }, [p]);
    return (_jsxs(RaizDS, { className: "a-capa", children: [a && _jsx("div", { className: "a-aviso", role: "status", children: a.texto }, a.n), p && (_jsx("div", { className: "a-velo", onClick: () => p.responder(false), children: _jsxs("div", { className: "d-pnl a-dialogo" + (p.lobby !== undefined ? " lbn-dlg" : ""), style: p.lobby !== undefined ? varsColor(p.lobby) : undefined, role: "alertdialog", "aria-modal": "true", "aria-label": p.titulo, onClick: e => e.stopPropagation(), children: [_jsx("span", { className: "dsp ol a-t2", children: p.titulo }), p.texto && _jsx("p", { className: "a-suave", children: p.texto }), _jsxs("div", { className: "a-fila", children: [_jsx("button", { type: "button", className: "a-plano", onClick: () => p.responder(false), children: p.no ?? "Cancelar" }), _jsx("button", { type: "button", className: "d-btn " + (p.peligro ? "k-red" : "k-yel"), autoFocus: true, onClick: () => p.responder(true), children: _jsx("span", { className: "dsp", children: p.si }) })] })] }) }))] }));
}
// ---------- Figuras ----------
/** Retrato circular de un jugador: cabeza y hombros de su figura 3D (sin figura, una fija al azar por su id). */
/** Nombre del jugador con el apodo de su figura encima (si lo tiene). */
export function NombreJugador({ nombre, figura, clase = "dsp" }) {
    const apodo = apodoDe(figura);
    if (!apodo)
        return _jsx("span", { className: clase, children: nombre });
    return _jsxs("span", { className: "a-nom", children: [_jsx("small", { className: "a-apodo", children: apodo }), _jsx("span", { className: clase, children: nombre })] });
}
export function Retrato({ id, figura, nombre, size = 44 }) {
    return _jsx(FotoFigura, { figura: figura ?? undefined, semilla: figura ? undefined : semillaDe(id), size: size, nombre: nombre, redondo: true });
}
/** Escena 3D con varios jugadores de pie. */
export function Elenco({ gente, foco, momentos, alto, modo }) {
    const figuras = gente.map(g => ({ id: g.id, figura: g.figura ?? undefined, semilla: g.figura ? undefined : semillaDe(g.id), foco: g.id === foco }));
    return _jsx(Escena3D, { figuras: figuras, momentos: momentos, alto: alto, modo: modo });
}
/** Campo de texto con su etiqueta. */
export function Campo({ etiqueta, ...props }) {
    return _jsxs("label", { className: "a-campo", children: [_jsx("span", { children: etiqueta }), _jsx("input", { ...props })] });
}
/** Estado vacío o de espera: un texto grande y uno chico, sin cajas grises. */
export function Vacio({ titulo, texto, children }) {
    return _jsxs("div", { className: "a-vacio", children: [_jsx("span", { className: "dsp ol a-t2", children: titulo }), texto && _jsx("p", { className: "a-suave", children: texto }), children] });
}
