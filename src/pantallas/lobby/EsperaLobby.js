import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Lobby vacío (ruta #/jugar): cuando alguien elige En línea o Físico y el administrador todavía no abre el lobby.
// Sin códigos (Elías, 22 nov): en cuanto el lobby aparece, entra solo. Sin el administrador no se puede empezar.
import { useEffect } from "react";
import { atras, ir } from "../../app/rutas";
import { useLobby, useLobbyAbierto } from "../../app/lobby";
import { Marco } from "../comun";
import { CUPO_LOBBY } from "../SalaEspera";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "./lobby.css";
import { FondoCuarto } from "./Cuarto";
export function EsperaLobby() {
    const info = useLobbyAbierto();
    const anunciado = useLobby();
    const codigo = info?.codigo ?? anunciado;
    useEffect(() => { if (codigo)
        ir("sala", codigo); }, [codigo]);
    return (_jsx(Marco, { clase: "az lb", fondo: _jsx(FondoCuarto, {}), children: _jsxs("div", { className: "lb-caja", children: [_jsxs("header", { className: "lb-top", children: [_jsxs("button", { type: "button", className: "pf-atras", onClick: atras, children: [_jsx("span", { "aria-hidden": "true", children: "\u25C0" }), "Atr\u00E1s"] }), _jsxs("div", { className: "lb-banner", role: "status", children: [_jsxs("span", { className: "lb-banner-n", children: ["0/", CUPO_LOBBY] }), _jsx("span", { className: "lb-banner-t", children: "Lobby vac\u00EDo" })] }), _jsx("span", {})] }), _jsxs("div", { className: "lb-vacio", children: [_jsx("b", { children: "Esperando al administrador" }), _jsx("p", { children: "En cuanto abra el lobby entras solo. Sin \u00E9l no se puede empezar." }), _jsxs("span", { className: "lb-puntitos", "aria-hidden": "true", children: [_jsx("i", {}), _jsx("i", {}), _jsx("i", {})] })] })] }) }));
}
