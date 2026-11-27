import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Botón «cast» del anfitrión (Elías, 24 nov): proyectar en este aparato o en otra pantalla, y dejar de proyectar.
// El modo se decide solo: con una Pantalla conectada se juega «en pantalla externa»; sin ella, «en celulares».
// Sale arriba en el lobby, al configurar y en la partida. Nada se guarda: la presencia es el latido de la Pantalla.
import { useEffect, useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { ir } from "../../app/rutas";
import { pedirSalirPantalla } from "../../servicios/difusion";
import { aviso } from "../comun";
import "./cast.css";
/** Enlace que abre la Pantalla de esta sala (en la TV o laptop, con la cuenta del anfitrión). */
export const enlacePantalla = (codigo) => `${location.origin}${import.meta.env.BASE_URL}#/tv/${codigo}`;
/** Código QR dibujado con elementos SVG (sin insertar HTML). */
function Qr({ texto }) {
    const celdas = useMemo(() => {
        const q = qrcode(0, "M");
        q.addData(texto);
        q.make();
        const n = q.getModuleCount(), r = [];
        for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++)
                if (q.isDark(y, x))
                    r.push([x, y]);
        return { n, r };
    }, [texto]);
    return (_jsxs("svg", { className: "cs-qr", viewBox: `-2 -2 ${celdas.n + 4} ${celdas.n + 4}`, role: "img", "aria-label": "C\u00F3digo QR para abrir la pantalla", children: [_jsx("rect", { x: "-2", y: "-2", width: celdas.n + 4, height: celdas.n + 4, fill: "#fff" }), celdas.r.map(([x, y]) => _jsx("rect", { x: x, y: y, width: "1.02", height: "1.02", fill: "#0a1030" }, `${x}-${y}`))] }));
}
/** Icono de transmitir (pantalla con ondas). */
const IconoCast = ({ activo }) => (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", className: "cs-ico", children: [_jsx("path", { d: "M3 18a3 3 0 0 1 3 3M3 14a7 7 0 0 1 7 7M3 10a11 11 0 0 1 11 11", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }), _jsx("path", { d: "M6 7V5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-5", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }), activo && _jsx("rect", { x: "9", y: "7", width: "9", height: "9", rx: "1", fill: "currentColor", opacity: ".55" })] }));
export function BotonCast({ sala, pantalla, className = "" }) {
    const [abierto, setAbierto] = useState(false);
    const proyectando = pantalla === "presente";
    const url = enlacePantalla(sala.codigo);
    const ancho = typeof matchMedia !== "undefined" && matchMedia("(min-width: 900px)").matches;
    useEffect(() => { if (!abierto)
        return; const f = (e) => { if (e.key === "Escape")
        setAbierto(false); }; addEventListener("keydown", f); return () => removeEventListener("keydown", f); }, [abierto]);
    const copiar = async () => { try {
        await navigator.clipboard.writeText(url);
        aviso("Enlace copiado.");
    }
    catch {
        aviso("No se pudo copiar; escríbelo en la TV.");
    } };
    return (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "cs-boton" + (proyectando ? " on" : "") + (className ? " " + className : ""), onClick: () => setAbierto(true), "aria-label": proyectando ? "Proyectando en la pantalla. Opciones" : "Proyectar en una pantalla", children: [_jsx(IconoCast, { activo: proyectando }), _jsx("span", { className: "cs-txt", children: proyectando ? "En pantalla" : "Proyectar" })] }), abierto && (_jsx("div", { className: "cs-velo", role: "dialog", "aria-modal": "true", "aria-label": "D\u00F3nde se juega", onClick: () => setAbierto(false), children: _jsxs("div", { className: "cs-panel", onClick: e => e.stopPropagation(), children: [_jsxs("header", { className: "cs-cab", children: [_jsx("b", { children: "\u00BFD\u00F3nde se juega?" }), _jsx("button", { type: "button", className: "cs-cerrar", onClick: () => setAbierto(false), "aria-label": "Cerrar", children: "\u2715" })] }), proyectando ? _jsxs(_Fragment, { children: [_jsxs("p", { className: "cs-estado on", children: [_jsx(IconoCast, { activo: true }), "Se est\u00E1 jugando en la ", _jsx("b", { children: "pantalla externa" }), ". Los celulares solo muestran a cada quien su personaje y lo que le toca hacer."] }), _jsxs("button", { type: "button", className: "cs-op peligro", onClick: () => { pedirSalirPantalla(sala.id); setAbierto(false); aviso("La pantalla deja de proyectar. Se juega en los celulares."); }, children: [_jsx("b", { children: "Dejar de proyectar" }), _jsx("small", { children: "La pantalla vuelve a ser un aparato normal y cada celular ve todo." })] })] }) : _jsxs(_Fragment, { children: [_jsxs("p", { className: "cs-estado", children: ["Ahora se juega ", _jsx("b", { children: "en celulares" }), ": cada quien ve todo en el suyo."] }), ancho ? _jsxs("button", { type: "button", className: "cs-op", onClick: () => ir("tv", sala.codigo), children: [_jsx("b", { children: "Proyectar en este aparato" }), _jsx("small", { children: "Esta laptop o TV se vuelve la pantalla. T\u00FA sigues jugando desde tu celular." })] }) : _jsx("p", { className: "cs-nota", children: "Desde el celular no se proyecta aqu\u00ED mismo: abre la pantalla en la TV o laptop." }), _jsxs("div", { className: "cs-op cs-otra", children: [_jsx("b", { children: "En otra pantalla" }), _jsx("small", { children: "Abre esto en la TV o laptop con tu cuenta, o escan\u00E9alo:" }), _jsxs("div", { className: "cs-otra-fila", children: [_jsx(Qr, { texto: url }), _jsxs("div", { className: "cs-url", children: [_jsx("code", { children: url }), _jsx("button", { type: "button", className: "cs-copiar", onClick: () => void copiar(), children: "Copiar enlace" })] })] })] })] })] }) }))] }));
}
