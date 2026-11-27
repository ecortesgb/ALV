// «Elige cómo jugar» (decisión de Elías, 27 nov 2026; Maestro v1.67). «¡Jugar!» entra directo al lobby; ahí se juntan
// todos (registrados o creados en el momento) y, al «Continuar», el administrador elige el modo aquí, sin salir del lobby:
// ALV FÍSICO (herramientas para jugar en persona), ALV PARTY (Competitivo: Mini-Juegos) y ALV DESMADRE (En línea: cada quien
// en su celular, con o sin Pantalla). El modo queda en sessionStorage «alv-modo» = fisico | party | desmadre y lo lee el
// configurador. Modo libre (sala de pruebas de los personajes) va aparte, en el botón chico de abajo.
// Las ilustraciones de Elías van tal cual (628×936, marco y título dibujados; no se les pone texto encima).
// Sin código de sala (#/modos): entra al lobby como antes hacía «En línea».
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ir } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { useLobby, useLobbyAbierto } from "../../app/lobby";
import { hayNube } from "../../servicios/cliente";
import { soyAdmin } from "../../servicios/admin";
import { enlace, type SalaV } from "../../servicios/enlace";
import { Marco, aviso, useAncho } from "../comun";
import { useRecursos } from "../Recursos";
import { RecursosAzotea } from "../azotea/Cabecera";
import { EscenarioFondo } from "../azotea/Escenario";
import { useMomentoAzotea } from "../azotea/HubAzotea";
import { escenarioActual } from "../azotea/paquetes";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "./modos.css";

const BASE = import.meta.env.BASE_URL;
const MENOS_MOV = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export type IdModo = "fisico" | "party" | "desmadre";
interface Modo { id: IdModo; nombre: string; lema: string; arte: string }
export const MODOS: Modo[] = [
  { id: "fisico", nombre: "ALV Físico", lema: "En persona: cartas, dados, palabras y preguntas", arte: "modo-alv-fisico" },
  { id: "party", nombre: "ALV Party", lema: "Competitivo: Mini-Juegos de reflejos", arte: "modo-alv-party" },
  { id: "desmadre", nombre: "ALV Desmadre", lema: "En línea: cada quien en su celular", arte: "modo-alv-desmadre" },
];

/** Modo elegido para esta sala (lo deja la pantalla de modos). Por omisión, En línea. */
export function modoElegido(): IdModo {
  try { const m = sessionStorage.getItem("alv-modo"); return m === "fisico" || m === "party" ? m : "desmadre"; } catch { return "desmadre"; }
}

export function ModosJuego({ codigo }: { codigo?: string }) {
  return codigo ? <ElegirModo codigo={codigo} /> : <EntrarLobby />;
}

/** Sin sala: «¡Jugar!» lleva directo al lobby. Si hay uno abierto o ya estás en uno, adentro; si no, el administrador lo abre. */
function EntrarLobby() {
  const s = useSesion();
  const momento = useMomentoAzotea();
  const esc = escenarioActual();
  const lobby = useLobby();
  const info = useLobbyAbierto();
  const [sala, setSala] = useState<SalaV | null | undefined>(undefined);
  const [espero, setEspero] = useState(true);
  const hecho = useRef(false);
  useEffect(() => { let v = true; void enlace.miSala().then(x => { if (v) setSala(x); }); return () => { v = false; }; }, [s.uid]);
  // El aviso del lobby abierto llega por la red: se le da un momento antes de concluir que no hay ninguno.
  useEffect(() => { const t = setTimeout(() => setEspero(false), 1500); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (hecho.current || sala === undefined) return;
    const destino = sala?.codigo ?? info?.codigo ?? lobby;
    if (destino) { hecho.current = true; ir("sala", destino); return; }
    if (espero) return;
    hecho.current = true;
    void (async () => {
      const puede = hayNube ? await soyAdmin() : true;
      if (!puede) { ir("jugar"); return; }
      const r = await enlace.abrir("mesa");
      if (typeof r === "string") { aviso(r); ir("inicio"); return; }
      ir("sala", r.codigo);
    })();
  }, [sala, info, lobby, espero]);
  return (
    <Marco clase={`az mj m-${momento}`} fondo={<EscenarioFondo ambiente={esc.ambientes[momento]} momento={momento} velo={esc.velo} />}>
      <p className="a-suave a-pulso mj-entrando" role="status">Entrando al lobby…</p>
    </Marco>
  );
}

/** Con sala: el administrador elige el modo y sigue a la configuración; «Atrás» regresa al lobby. */
function ElegirModo({ codigo }: { codigo: string }) {
  const r = useRecursos();
  const ancho = useAncho();
  const momento = useMomentoAzotea();
  const esc = escenarioActual();
  const [elegido, setElegido] = useState<IdModo | null>(null);
  const [actual, setActual] = useState(() => MODOS.findIndex(m => m.id === modoElegido()));
  const pista = useRef<HTMLDivElement>(null);

  // Celular: el carrusel arranca centrado en el modo que ya tenía la sala (o En línea).
  useEffect(() => {
    if (ancho) return;
    const el = pista.current?.children[actual] as HTMLElement | undefined;
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" as ScrollBehavior });
  }, [ancho]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cuál tarjeta está al centro del carrusel (para los puntos).
  useEffect(() => {
    const el = pista.current; if (!el || ancho) return;
    let pend = 0;
    const f = () => { if (pend) return; pend = requestAnimationFrame(() => {
      pend = 0;
      const centro = el.scrollLeft + el.clientWidth / 2;
      let mejor = 0, dist = Infinity;
      Array.from(el.children).forEach((c, i) => { const h = c as HTMLElement, d = Math.abs(h.offsetLeft + h.offsetWidth / 2 - centro); if (d < dist) { dist = d; mejor = i; } });
      setActual(mejor);
    }); };
    el.addEventListener("scroll", f, { passive: true });
    return () => { el.removeEventListener("scroll", f); cancelAnimationFrame(pend); };
  }, [ancho]);

  const entrar = (m: Modo) => {
    if (elegido) return;
    setElegido(m.id);
    try { sessionStorage.setItem("alv-modo", m.id); } catch { /* sin almacenamiento */ }
    const seguir = () => {
      // ALV Party tiene su propio configurador de Mini-Juegos en #/party/código.
      ir(m.id === "party" ? "party" : "configurar", codigo);
    };
    if (MENOS_MOV) seguir(); else setTimeout(seguir, 420);
  };
  const irA = (i: number) => (pista.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({ inline: "center", block: "nearest", behavior: MENOS_MOV ? "instant" as ScrollBehavior : "smooth" });

  return (
    <Marco clase={`az mj m-${momento}`} fondo={<EscenarioFondo ambiente={esc.ambientes[momento]} momento={momento} velo={esc.velo} />}>
      <div className={"mj-caja" + (elegido ? " eligiendo" : "")}>
        <header className="mj-top">
          <button type="button" className="pf-atras" onClick={() => ir("sala", codigo)}><span aria-hidden="true">◀</span>Lobby</button>
          <RecursosAzotea monedas={r.monedas} puntos={r.puntos} />
        </header>

        <h1 className="mj-titulo"><span>Elige cómo jugar</span></h1>

        <div ref={pista} className="mj-pista" role="list">
          {MODOS.map((m, i) => (
            <div key={m.id} role="listitem" className="mj-hueco" style={{ "--i": i } as CSSProperties}>
              <button type="button" className={"mj-carta" + (elegido === m.id ? " elegida" : "")}
                onClick={() => (ancho || actual === i ? entrar(m) : irA(i))} aria-label={`${m.nombre}. ${m.lema}.`}>
                <span className="mj-brillo" aria-hidden="true" />
                <img src={`${BASE}arte/modos/${m.arte}.webp`} alt="" draggable={false} width={628} height={936} />
              </button>
              <p className="mj-lema">{m.lema}</p>
            </div>
          ))}
        </div>

        {!ancho && <div className="mj-puntos" aria-hidden="true">{MODOS.map((m, i) => <button key={m.id} type="button" tabIndex={-1} className={i === actual ? "si" : ""} onClick={() => irA(i)} />)}</div>}

        <button type="button" className="mj-libre" onClick={() => location.assign(`${BASE}tools/personajes/minijuegos/tv-cuarto.html`)}>
          Modo libre: prueba a los personajes, sin puntos
        </button>
      </div>
    </Marco>
  );
}

/** #/party/código provisional: hasta que llegue el configurador de ALV Party, abre el menú actual de Mini-Juegos. */
export function PartyProvisional({ codigo: _codigo }: { codigo: string }) {
  useEffect(() => { location.assign(`${BASE}tools/personajes/minijuegos/`); }, []);
  return null;
}
