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

  if (ruta === "ds") return <Suspense fallback={null}><PaginaDS /></Suspense>;
  // Sin sesión se entra o se crea cuenta aquí mismo: la dirección (por ejemplo la del QR) no cambia y al entrar se sigue a la sala.
  const pantalla = inicio ? <Inicio fase={fase} alTerminar={terminarInicio} />
    : fase === "cargando" ? <Carga />
    : fase === "fuera" ? <Acceso />
    : fase === "registro" ? <CompletarRegistro />
    : fase === "menor" ? <SoloMayores />
    : sinFigura ? <Personalizar />
    : ruta === "modos" ? <ModosJuego key={arg ?? ""} codigo={arg} />
    : ruta === "jugar" ? <EsperaLobby />
    : ruta === "catalogo" ? <Catalogo />
    : ruta === "juego" && arg ? <FichaJuego id={arg} />
    : ruta === "sala" && arg ? <Sala key={arg} codigo={arg} />
    : ruta === "tv" && arg ? <PantallaTv key={arg} codigo={arg} />
    : ruta === "configurar" && arg ? <PaginaConfigurar key={arg} codigo={arg} />
    : ruta === "personalizar" ? <Personalizar />
    : ruta === "editor" ? <Editor />
    : ruta === "ranking" ? <Ranking />
    : ruta === "logros" ? <Logros />
    : ruta === "tienda" ? <Tienda />
    : ruta === "perfil" ? <Perfil />
    : ruta === "ajustes" ? <Ajustes />
    : ruta === "admin" ? <Admin />
    // HUB «La Azotea» (antes Hub.tsx; de ahí solo queda Jugar).
    : <HubAzotea />;
  return <>{pantalla}{fase === "dentro" && <SincroCapsulas />}{fase === "dentro" && ruta !== "tv" && <TemaMusical />}{fase === "dentro" && <Recompensas />}{fase === "dentro" && ruta !== "tv" && <AvisoLogro />}{!inicio && fase === "dentro" && invitado && ruta !== "tv" && ruta !== "editor" && <span className="a-prueba" aria-label="Estás en una entrada de prueba">Prueba</span>}<Avisos /></>;
}
