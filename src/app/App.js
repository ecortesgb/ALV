import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// ALV 2.0: una sola app. La entrada decide por la sesión; después manda la ruta.
// El papel del aparato lo da la ruta: #/tv/código es la Pantalla, #/sala/código un celular.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Acceso, Carga, CompletarRegistro, Inicio, SoloMayores } from "../pantallas/Acceso";
import { Ajustes, Admin } from "../pantallas/Ajustes";
import { Catalogo, FichaJuego } from "../pantallas/Catalogo";
import { PaginaConfigurar } from "../pantallas/ConfigurarPartida";
import { Recompensas } from "../pantallas/Recompensas";
import { AvisoLogro } from "../pantallas/AvisoLogro";
import { EsperaLobby } from "../pantallas/lobby/EsperaLobby";
import { ModosJuego } from "../pantallas/modos/ModosJuego";
import { HubAzotea } from "../pantallas/azotea/HubAzotea";
import { Editor, Personalizar, SincroCapsulas, useDebeCrearFigura } from "../pantallas/Personalizar";
import { Sala } from "../pantallas/Sala";
import { Logros } from "../pantallas/logros/Logros";
import { Ranking } from "../pantallas/ranking/Ranking";
import { Perfil } from "../pantallas/perfil/Perfil";
import { Tienda } from "../pantallas/Tienda";
import { Avisos } from "../pantallas/comun";
import { PantallaTv } from "../roles/pantalla/Pantalla";
import { refrescarSesion, useSesion } from "./sesion";
import { instalarClics } from "./sonido";
import { useRuta } from "./rutas";
import { TemaMusical } from "./TemaMusical";
/** Página interna del Design System (sin enlace en la app): se carga aparte. */
const PaginaDS = lazy(() => import("../pantallas/ds"));
export function App() {
    const { ruta, arg } = useRuta();
    const { fase, invitado } = useSesion();
    useEffect(() => { void refrescarSesion(); }, []);
    useEffect(instalarClics, []);
    // Pantalla de inicio en cada carga o recarga, salvo al entrar por el QR de una sala o de la Pantalla.
    const [inicio, setInicio] = useState(() => ruta !== "sala" && ruta !== "tv" && ruta !== "configurar");
    const terminarInicio = useCallback(() => setInicio(false), []);
    // Cuenta sin figura: primero su personaje. Se deja pasar a una sala o Pantalla por QR (la jornada) y a Ajustes (salir).
    const sinFigura = useDebeCrearFigura() && !["personalizar", "editor", "sala", "tv", "configurar", "ajustes"].includes(ruta);
    if (ruta === "ds")
        return _jsx(Suspense, { fallback: null, children: _jsx(PaginaDS, {}) });
    // Sin sesión se entra o se crea cuenta aquí mismo: la dirección (por ejemplo la del QR) no cambia y al entrar se sigue a la sala.
    const pantalla = inicio ? _jsx(Inicio, { fase: fase, alTerminar: terminarInicio })
        : fase === "cargando" ? _jsx(Carga, {})
            : fase === "fuera" ? _jsx(Acceso, {})
                : fase === "registro" ? _jsx(CompletarRegistro, {})
                    : fase === "menor" ? _jsx(SoloMayores, {})
                        : sinFigura ? _jsx(Personalizar, {})
                            : ruta === "modos" ? _jsx(ModosJuego, {})
                                : ruta === "jugar" ? _jsx(EsperaLobby, {})
                                    : ruta === "catalogo" ? _jsx(Catalogo, {})
                                        : ruta === "juego" && arg ? _jsx(FichaJuego, { id: arg })
                                            : ruta === "sala" && arg ? _jsx(Sala, { codigo: arg }, arg)
                                                : ruta === "tv" && arg ? _jsx(PantallaTv, { codigo: arg }, arg)
                                                    : ruta === "configurar" && arg ? _jsx(PaginaConfigurar, { codigo: arg }, arg)
                                                        : ruta === "personalizar" ? _jsx(Personalizar, {})
                                                            : ruta === "editor" ? _jsx(Editor, {})
                                                                : ruta === "ranking" ? _jsx(Ranking, {})
                                                                    : ruta === "logros" ? _jsx(Logros, {})
                                                                        : ruta === "tienda" ? _jsx(Tienda, {})
                                                                            : ruta === "perfil" ? _jsx(Perfil, {})
                                                                                : ruta === "ajustes" ? _jsx(Ajustes, {})
                                                                                    : ruta === "admin" ? _jsx(Admin, {})
                                                                                        // HUB «La Azotea» (antes Hub.tsx; de ahí solo queda Jugar).
                                                                                        : _jsx(HubAzotea, {});
    return _jsxs(_Fragment, { children: [pantalla, fase === "dentro" && _jsx(SincroCapsulas, {}), fase === "dentro" && ruta !== "tv" && _jsx(TemaMusical, {}), fase === "dentro" && _jsx(Recompensas, {}), fase === "dentro" && ruta !== "tv" && _jsx(AvisoLogro, {}), !inicio && fase === "dentro" && invitado && ruta !== "tv" && ruta !== "editor" && _jsx("span", { className: "a-prueba", "aria-label": "Est\u00E1s en una entrada de prueba", children: "Prueba" }), _jsx(Avisos, {})] });
}
