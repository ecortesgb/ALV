import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Marco, urlArte } from "../comun";
import "../azotea/azotea.css";
import "./lobby.css";
import "./partida.css";
import { LOBBY_NUEVO, VARIANTE_LOBBY } from "./version";
export function FondoCuarto({ oscuro }) {
    return (_jsx("div", { className: "lb-fondo" + (oscuro ? " oscuro" : ""), "aria-hidden": "true", children: _jsx("span", { className: "lb-cuarto", style: { "--lb-fondo-g": urlArte(VARIANTE_LOBBY === "a" ? "lobby/v3/a/fondo-1920.webp" : LOBBY_NUEVO ? "lobby/v2/fondo-1920.webp" : "lobby/fondo-cuarto-1920.webp"), "--lb-fondo-c": urlArte(VARIANTE_LOBBY === "a" ? "lobby/v3/a/fondo-1100.webp" : LOBBY_NUEVO ? "lobby/v2/fondo-1100.webp" : "lobby/fondo-cuarto-1100.webp") } }) }));
}
/** Aviso a pantalla completa con el cuarto de fondo (sala cerrada, te sacaron, no se pudo entrar…). */
export function AvisoCuarto({ titulo, texto, children }) {
    return (_jsx(Marco, { clase: "az lb pt-aviso", fondo: _jsx(FondoCuarto, { oscuro: true }), children: _jsxs("div", { className: "lb-vacio", role: "status", children: [_jsx("b", { children: titulo }), texto && _jsx("p", { children: texto }), children] }) }));
}
