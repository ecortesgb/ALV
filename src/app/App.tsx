// ALV 2.0: una sola app. La entrada decide por la sesión; después manda la ruta.
// El papel del aparato lo da la ruta: #/tv/código es la Pantalla, #/sala/código un celular.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Acceso, Carga, CompletarRegistro, Inicio, SoloMayores } from "../pantallas/Acceso";
import { Recompensas } from "../pantallas/Recompensas";
import { AvisoLogro } from "../pantallas/AvisoLogro";
import { HubAzotea } from "../pantallas/azotea/HubAzotea";
import { Editor, Personalizar, SincroCapsulas, useDebeCrearFigura } from "../pantallas/Personalizar";
import { Avisos } from "../pantallas/comun";
import { refrescarSesion, useSesion } from "./sesion";
import { instalarClics } from "./sonido";
import { useRuta } from "./rutas";
import { TemaMusical } from "./TemaMusical";
import { precargarHub } from "./precarga";

/** Página interna del Design System (sin enlace en la app): se carga aparte. */
const PaginaDS = lazy(() => import("../pantallas/ds"));
// Velocidad (28 nov): cada pantalla baja su código al abrirla. El arranque solo trae entrada, HUB y personalizador.
const Ajustes = lazy(() => import("../pantallas/Ajustes").then(m => ({ default: m.Ajustes })));
const Admin = lazy(() => import("../pantallas/Ajustes").then(m => ({ default: m.Admin })));
const Catalogo = lazy(() => import("../pantallas/Catalogo").then(m => ({ default: m.Catalogo })));
const FichaJuego = lazy(() => import("../pantallas/Catalogo").then(m => ({ default: m.FichaJuego })));
const PaginaConfigurar = lazy(() => import("../pantallas/ConfigurarPartida").then(m => ({ default: m.PaginaConfigurar })));
const PaginaParty = lazy(() => import("../pantallas/party/ConfigurarParty").then(m => ({ default: m.PaginaParty })));
const EsperaLobby = lazy(() => import("../pantallas/lobby/EsperaLobby").then(m => ({ default: m.EsperaLobby })));
const ModosJuego = lazy(() => import("../pantallas/modos/ModosJuego").then(m => ({ default: m.ModosJuego })));
const Sala = lazy(() => import("../pantallas/Sala").then(m => ({ default: m.Sala })));
const Logros = lazy(() => import("../pantallas/logros/Logros").then(m => ({ default: m.Logros })));
const Ranking = lazy(() => import("../pantallas/ranking/Ranking").then(m => ({ default: m.Ranking })));
const Perfil = lazy(() => import("../pantallas/perfil/Perfil").then(m => ({ default: m.Perfil })));
const Tienda = lazy(() => import("../pantallas/Tienda").then(m => ({ default: m.Tienda })));
const PantallaTv = lazy(() => import("../roles/pantalla/Pantalla").then(m => ({ default: m.PantallaTv })));

/** Pantallas del menú detrás de las cuales el HUB se queda montado (escondido y en pausa): al volver no se arma de nuevo
 *  la escena 3D (velocidad, 28 nov). Salas, Pantalla y partidas no: ahí se libera para dejar memoria al juego. */
const MENU_CON_HUB = new Set(["personalizar", "editor", "ranking", "logros", "tienda", "perfil", "ajustes", "modos", "jugar", "catalogo", "juego"]);

export function App() {
  const { ruta, arg } = useRuta();
  const { fase, invitado, uid } = useSesion();
  // Con sesión, la figura del HUB empieza a bajar desde la pantalla de inicio (no en la TV: ahí no hay HUB).
  useEffect(() => { if (fase === "dentro" && ruta !== "tv") precargarHub(uid); }, [fase, uid, ruta]);
  useEffect(() => { void refrescarSesion(); }, []);
  useEffect(instalarClics, []);
  // Pantalla de inicio en cada carga o recarga, salvo al entrar por el QR de una sala o de la Pantalla.
  const [inicio, setInicio] = useState(() => ruta !== "sala" && ruta !== "tv" && ruta !== "configurar" && ruta !== "party");
  const terminarInicio = useCallback(() => setInicio(false), []);
  // Cuenta sin figura: primero su personaje. Se deja pasar a una sala o Pantalla por QR (la jornada) y a Ajustes (salir).
  const sinFigura = useDebeCrearFigura() && !["personalizar", "editor", "sala", "tv", "configurar", "party", "ajustes"].includes(ruta);

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
    : ruta === "party" && arg ? <PaginaParty key={arg} codigo={arg} />
    : ruta === "personalizar" ? <Personalizar />
    : ruta === "editor" ? <Editor />
    : ruta === "ranking" ? <Ranking />
    : ruta === "logros" ? <Logros />
    : ruta === "tienda" ? <Tienda />
    : ruta === "perfil" ? <Perfil />
    : ruta === "ajustes" ? <Ajustes />
    : ruta === "admin" ? <Admin />
    // HUB «La Azotea» (antes Hub.tsx; de ahí solo queda Jugar).
    : null;
  const enHub = pantalla === null;
  // El HUB se monta la primera vez que se ve y se queda (escondido) mientras se navega por el menú.
  const [hubVivo, setHubVivo] = useState(false);
  const conservarHub = enHub || (hubVivo && fase === "dentro" && !inicio && !sinFigura && MENU_CON_HUB.has(ruta));
  useEffect(() => { if (enHub) setHubVivo(true); else if (!conservarHub) setHubVivo(false); }, [enHub, conservarHub]);
  // Mismo árbol visible o escondido (si cambiara de forma, React lo volvería a montar).
  const hub = conservarHub ? (
    <div style={enHub ? { display: "contents" } : { position: "fixed", inset: 0, visibility: "hidden", pointerEvents: "none", zIndex: -1, overflow: "hidden" }} aria-hidden={enHub ? undefined : true}>
      <HubAzotea oculto={!enHub} />
    </div>
  ) : null;
  return <>{hub}<Suspense fallback={null}>{pantalla}</Suspense>{fase === "dentro" && <SincroCapsulas />}{fase === "dentro" && ruta !== "tv" && <TemaMusical />}{fase === "dentro" && <Recompensas />}{fase === "dentro" && ruta !== "tv" && <AvisoLogro />}{!inicio && fase === "dentro" && invitado && ruta !== "tv" && ruta !== "editor" && <span className="a-prueba" aria-label="Estás en una entrada de prueba">Prueba</span>}<Avisos /></>;
}
