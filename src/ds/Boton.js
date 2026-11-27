import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Icono } from "./Icono";
const CLASE = { amarillo: "k-yel", azul: "k-blu", morado: "k-pur", verde: "k-grn", naranja: "k-org", rojo: "k-red" };
/** Botón inclinado con bisel y sombra dura: el control principal de ALV. */
export function Boton({ color, texto, icono, sub, aviso, principal, desactivado, cargando, muestra, compacto, onClick, className = "", style }) {
    const cls = ["d-btn", CLASE[color], principal && "d-play", compacto && "d-hb", aviso && !principal && "con-aviso", desactivado && "is-off", cargando && "is-carga",
        muestra === "encima" && "is-hover", muestra === "presionado" && "is-press", className].filter(Boolean).join(" ");
    const ic = desactivado ? "lock" : icono;
    return (_jsxs("button", { type: "button", className: cls, style: style, disabled: desactivado, "aria-busy": cargando || undefined, onClick: cargando || desactivado ? undefined : onClick, children: [ic && _jsx(Icono, { id: ic }), principal
                ? _jsxs("span", { children: [_jsx("span", { className: "dsp", children: texto }), sub && _jsx("small", { children: sub })] })
                : compacto ? _jsx("span", { children: texto })
                    : _jsxs(_Fragment, { children: [_jsx("span", { className: "dsp", children: texto }), sub && _jsx("small", { children: sub })] }), aviso && _jsx("span", { className: "d-badge", children: aviso })] }));
}
