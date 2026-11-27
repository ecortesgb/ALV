import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Icono } from "./Icono";
const ORDEN = ["PJ", "PG", "RC", "MVP", "IMP", "RAC"];
const NOMBRE = { PJ: "partidas jugadas", PG: "ganadas", RC: "retos cumplidos", MVP: "MVP", IMP: "impostores atrapados", RAC: "mejor racha" };
const num = (n) => n.toLocaleString("es-MX");
/** Barra del jugador: retrato, apodo, nivel y barra de XP; a la derecha la XP para gastar y el engrane. */
export function TarjetaJugador({ retrato, apodo, alias, nivel, titulo, xp, xpParaGastar, numeros, onPerfil, onAjustes }) {
    const pct = xp.siguiente > 0 ? Math.max(0, Math.min(1, xp.actual / xp.siguiente)) : 1;
    const sig = ORDEN.filter(s => numeros?.[s] != null);
    const cuerpo = (_jsxs(_Fragment, { children: [_jsx("div", { className: "d-ret", children: retrato }), _jsxs("div", { className: "d-ji", children: [alias && _jsx("span", { className: "d-alias", children: alias }), _jsx("span", { className: "dsp ol", children: apodo }), _jsxs("span", { className: "dsp nv", children: ["Nivel ", nivel] }), titulo && _jsx("span", { className: "tit", children: titulo }), _jsx("div", { className: "d-bar", role: "progressbar", "aria-label": "XP del nivel", "aria-valuemin": 0, "aria-valuemax": xp.siguiente, "aria-valuenow": xp.actual, children: _jsx("i", { style: { width: `${Math.round(pct * 100)}%` } }) }), sig.length > 0 && _jsx("div", { className: "d-nums", children: sig.map(s => _jsxs("span", { className: "d-chip", title: NOMBRE[s], children: [_jsx("b", { children: num(numeros[s]) }), s] }, s)) })] }), _jsxs("span", { className: "d-num", children: [num(xp.actual), " / ", num(xp.siguiente)] })] }));
    return (_jsxs("div", { className: "d-top", children: [onPerfil
                ? _jsx("button", { type: "button", className: "d-pnl d-jug", onClick: onPerfil, "aria-label": `Perfil de ${apodo}`, children: cuerpo })
                : _jsx("div", { className: "d-pnl d-jug", children: cuerpo }), xpParaGastar != null && _jsxs("div", { className: "d-pnl d-coin", children: [_jsx(Icono, { id: "star" }), _jsxs("span", { children: [_jsx("b", { children: num(xpParaGastar) }), _jsx("br", {}), _jsx("small", { children: "XP para gastar" })] })] }), onAjustes && _jsx("button", { type: "button", className: "d-gear", onClick: onAjustes, "aria-label": "Ajustes", children: _jsx(Icono, { id: "gear" }) })] }));
}
