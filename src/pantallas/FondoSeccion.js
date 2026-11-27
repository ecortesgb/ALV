import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "./fondo-seccion.css";
const url = (nombre) => `url("${new URL(`${import.meta.env.BASE_URL}arte/fondos/${nombre}`, document.baseURI).href}")`;
/** La opción pedida con `?fondo=` o la primera de la lista. */
export function elegirFondo(opciones) {
    let pedida = null;
    try {
        pedida = new URLSearchParams(location.search).get("fondo");
    }
    catch { /* sin dirección */ }
    return opciones.find(o => o.clave === pedida) ?? opciones[0];
}
export function FondoSeccion({ opciones, velo = .5 }) {
    const o = elegirFondo(opciones);
    const estilo = { "--sf-g": url(`${o.archivo}-1920.webp`), "--sf-c": url(`${o.archivo}-1100.webp`), "--sf-foco": o.foco ?? "50% 50%", "--sf-velo": velo };
    return (_jsxs("div", { className: `sf sf-${o.clave}`, style: estilo, "aria-hidden": "true", children: [_jsx("div", { className: "sf-img" }), _jsx("div", { className: "sf-velo" })] }));
}
