import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Piezas con rareza: candado en las cuadrículas y el panel para desbloquear (con XP o ganándola en un reto).
import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { sonar } from "../app/sonido";
import catalogo from "../content/catalogo-figura.json";
import { NOMBRE_RAREZA, PRECIO, RETOS, rarezaDe } from "../content/rarezas";
import { desbloquear, usePiezas } from "../servicios/piezas";
import { aviso } from "./comun";
import { miniatura } from "./Libro";
/** Nombre y miniatura de cualquier pieza del catálogo (MOM_x = paquete de momentos). */
export function infoPieza(id) {
    if (id.startsWith("MOM_")) {
        const p = catalogo.paquetes.find(x => x.id === id.slice(4));
        return { nombre: `Momentos: ${p?.nombre ?? id.slice(4)}`, mini: null };
    }
    for (const lista of Object.values(catalogo.secciones)) {
        const x = lista.find(p => p.id === id);
        if (x)
            return { nombre: x.nombre, mini: x.mini };
    }
    return { nombre: id, mini: null };
}
// ---------- Panel (uno para todo el libro) ----------
let abierta = null;
const oyentes = new Set();
export const pedirDesbloqueo = (id) => { abierta = id; sonar("clic"); oyentes.forEach(f => f()); };
const cerrar = () => { abierta = null; oyentes.forEach(f => f()); };
export function PanelDesbloqueo({ alIrARetos }) {
    const id = useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => abierta);
    const p = usePiezas();
    const [ocupado, setOcupado] = useState(false);
    if (!id)
        return null;
    const r = rarezaDe(id), precio = PRECIO[r], info = infoPieza(id), retos = RETOS.filter(x => x.premio === id);
    const alcanza = p.xp >= precio;
    const comprar = async () => {
        setOcupado(true);
        const error = await desbloquear(id);
        setOcupado(false);
        if (error) {
            aviso(error);
            sonar("error");
            return;
        }
        sonar("fanfarria");
        aviso(`¡Desbloqueaste ${info.nombre}!`);
        cerrar();
    };
    // Fuera del libro (sus hojas tienen capas propias), pero dentro de la pantalla para conservar los colores del tema.
    const destino = document.querySelector(".D.p-taller") ?? document.body;
    return createPortal(_jsx("div", { className: "p-desbloqueo-fondo", role: "dialog", "aria-modal": "true", "aria-label": `Desbloquear ${info.nombre}`, onClick: e => { if (e.target === e.currentTarget)
            cerrar(); }, children: _jsxs("div", { className: "p-desbloqueo r-" + r, children: [_jsx("span", { className: "p-desbloqueo-rareza p-sfx", children: NOMBRE_RAREZA[r] }), _jsx("div", { className: "p-desbloqueo-arte", children: info.mini ? _jsx("img", { src: miniatura(info.mini), alt: "" }) : _jsx("span", { className: "p-sfx", children: "\u00A1POW!" }) }), _jsx("strong", { className: "p-desbloqueo-nombre", children: info.nombre }), _jsxs("p", { className: "p-desbloqueo-saldo", children: ["Tienes ", _jsxs("b", { children: [p.xp.toLocaleString("es-MX"), " XP"] }), p.demo ? " (de demostración)" : ""] }), _jsxs("button", { type: "button", className: "p-sorpresa", disabled: !alcanza || ocupado, onClick: () => void comprar(), children: [_jsx("span", { className: "p-sfx", children: "Desbloquear" }), _jsxs("small", { children: [precio, " XP"] })] }), !alcanza && _jsxs("p", { className: "p-nota", children: ["Te faltan ", precio - p.xp, " XP. G\u00E1nalas jugando partidas o con los retos."] }), retos.length > 0 && (_jsxs("div", { className: "p-desbloqueo-retos", children: [_jsx("span", { children: "O g\u00E1nala gratis:" }), retos.map(x => _jsxs("button", { type: "button", className: "p-opcion", onClick: () => { cerrar(); alIrARetos(); }, children: ["Reto \u00AB", x.nombre, "\u00BB"] }, x.id))] })), _jsx("button", { type: "button", className: "p-opcion p-desbloqueo-cerrar", onClick: cerrar, children: "Cerrar" })] }) }), destino);
}
/** Esquina de rareza y candado sobre una miniatura. */
export function MarcaRareza({ r, bloqueada }) {
    if (r === "comun")
        return null;
    return _jsx("span", { className: "p-rareza r-" + r + (bloqueada ? " bloq" : ""), "aria-label": NOMBRE_RAREZA[r] + (bloqueada ? ", bloqueada" : ""), children: bloqueada ? "🔒" : "★" });
}
