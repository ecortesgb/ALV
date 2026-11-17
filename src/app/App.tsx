// ALV 2.0: una sola app. La entrada decide por la sesión; después manda la ruta.
// El papel del aparato lo da la ruta: #/tv/código es la Pantalla, #/sala/código un celular.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Acceso, Carga, CompletarRegistro, Inicio, SoloMayores } from "../pantallas/Acceso";
import { Ajustes, Admin } from "../pantallas/Ajustes";
import { Catalogo, FichaJuego } from "../pantallas/Catalogo";
import { Hub, Jugar } from "../pantallas/Hub";
import { Editor, Personalizar, SincroCapsulas } from "../pantallas/Personalizar";
import { Sala } from "../pantallas/Sala";
import { Logros, Perfil, Ranking } from "../pantallas/Social";
import { Avisos } from "../pantallas/comun";
import { PantallaTv } from "../roles/pantalla/Pantalla";
import { refrescarSesion, useSesion } from "./sesion";
import { instalarClics } from "./sonido";
import { useRuta } from "./rutas";

/** Página interna del Design System (sin enlace en la app): se carga aparte. */
const PaginaDS = lazy(() => import("../pantallas/ds"));

export function App() {
  const { ruta, arg } = useRuta();
  const { fase, invitado } = useSesion();
  useEffect(() => { void refrescarSesion(); }, []);
  useEffect(instalarClics, []);
  // Pantalla de inicio en cada carga o recarga, salvo al entrar por el QR de una sala o de la Pantalla.
  const [inicio, setInicio] = useState(() => ruta !== "sala" && ruta !== "tv");
  const terminarInicio = useCallback(() => setInicio(false), []);

  if (ruta === "ds") return <Suspense fallback={null}><PaginaDS /></Suspense>;
  // Sin sesión se entra o se crea cuenta aquí mismo: la dirección (por ejemplo la del QR) no cambia y al entrar se sigue a la sala.
  const pantalla = inicio ? <Inicio fase={fase} alTerminar={terminarInicio} />
    : fase === "cargando" ? <Carga />
    : fase === "fuera" ? <Acceso />
    : fase === "registro" ? <CompletarRegistro />
    : fase === "menor" ? <SoloMayores />
    : ruta === "jugar" ? <Jugar />
    : ruta === "catalogo" ? <Catalogo />
    : ruta === "juego" && arg ? <FichaJuego id={arg} />
    : ruta === "sala" && arg ? <Sala key={arg} codigo={arg} />
    : ruta === "tv" && arg ? <PantallaTv key={arg} codigo={arg} />
    : ruta === "personalizar" ? <Personalizar />
    : ruta === "editor" ? <Editor />
    : ruta === "ranking" ? <Ranking />
    : ruta === "logros" ? <Logros />
    : ruta === "perfil" ? <Perfil />
    : ruta === "ajustes" ? <Ajustes />
    : ruta === "admin" ? <Admin />
    : <Hub />;
  return <>{pantalla}{fase === "dentro" && <SincroCapsulas />}{!inicio && fase === "dentro" && invitado && ruta !== "tv" && ruta !== "editor" && <span className="a-prueba" aria-label="Estás en una entrada de prueba">Prueba</span>}<Avisos /></>;
}
