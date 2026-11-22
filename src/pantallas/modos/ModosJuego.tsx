// «Modos de juego» (ALV_PLAN_MODOS_DE_JUEGO.md, aprobado 2026-11-22): lo primero que se ve al tocar «¡Jugar!».
// Tres tarjetas con las ilustraciones de Elías (marco dorado y título ya dibujados; no se les pone texto encima):
// Local, En línea y Físico. Fondo, recursos y «Atrás» son los del HUB «La Azotea» y del Perfil.
// En línea lleva al lobby (si hay uno abierto o ya estás en uno, directo). Local y Físico se construyen después.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { atras, ir } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { useLobby, useLobbyAbierto, usePuedeAbrir } from "../../app/lobby";
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

type IdModo = "local" | "en-linea" | "fisico";
interface Modo { id: IdModo; nombre: string; lema: string; listo: boolean }
const MODOS: Modo[] = [
  { id: "local", nombre: "Local", lema: "Un solo teléfono, sin cuentas", listo: false },
  { id: "en-linea", nombre: "En línea", lema: "Cada quien en su celular", listo: true },
  { id: "fisico", nombre: "Juego físico", lema: "Retos en persona, el administrador da los puntos", listo: true },
];

export function ModosJuego() {
  const s = useSesion();
  const r = useRecursos();
  const ancho = useAncho();
  const momento = useMomentoAzotea();
  const esc = escenarioActual();
  const [sala, setSala] = useState<SalaV | null>(null);
  useEffect(() => { let v = true; void enlace.miSala().then(x => { if (v) setSala(x); }); return () => { v = false; }; }, [s.uid]);
  const lobby = useLobby();
  const info = useLobbyAbierto();
  const puedeAbrir = usePuedeAbrir(s.uid);
  const [elegido, setElegido] = useState<IdModo | null>(null);
  const [actual, setActual] = useState(1);
  const pista = useRef<HTMLDivElement>(null);

  // Celular: el carrusel arranca centrado en «En línea».
  useEffect(() => {
    if (ancho) return;
    const el = pista.current?.children[1] as HTMLElement | undefined;
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" as ScrollBehavior });
  }, [ancho]);

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

  // En línea y Físico entran directo al mismo lobby (Elías, 22 nov): si hay uno, adentro; si no, el administrador lo abre
  // y los demás esperan en el lobby vacío hasta que él llegue. Nada de códigos.
  const destinoLinea = sala?.codigo ?? info?.codigo ?? lobby;
  const entrar = (m: Modo) => {
    if (elegido) return;
    if (!m.listo) { aviso(`${m.nombre}: muy pronto.`); return; }
    setElegido(m.id);
    try { sessionStorage.setItem("alv-modo", m.id); } catch { /* sin almacenamiento */ }
    const ir2 = async () => {
      if (destinoLinea) { ir("sala", destinoLinea); return; }
      if (puedeAbrir) {
        const r = await enlace.abrir("mesa");
        if (typeof r === "string") { aviso(r); setElegido(null); return; }
        ir("sala", r.codigo); return;
      }
      ir("jugar");
    };
    if (MENOS_MOV) void ir2(); else setTimeout(() => void ir2(), 420);
  };
  const irA = (i: number) => (pista.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({ inline: "center", block: "nearest", behavior: MENOS_MOV ? "instant" as ScrollBehavior : "smooth" });

  return (
    <Marco clase={`az mj m-${momento}`} fondo={<EscenarioFondo ambiente={esc.ambientes[momento]} momento={momento} velo={esc.velo} />}>
      <div className={"mj-caja" + (elegido ? " eligiendo" : "")}>
        <header className="mj-top">
          <button type="button" className="pf-atras" onClick={atras}><span aria-hidden="true">◀</span>Atrás</button>
          <RecursosAzotea monedas={r.monedas} puntos={r.puntos} />
        </header>

        <h1 className="mj-titulo"><span>Elige cómo jugar</span></h1>

        <div ref={pista} className="mj-pista" role="list">
          {MODOS.map((m, i) => {
            const n = info?.miembros;
            const marca = m.id === "local" ? null : sala ? "Estás en el lobby" : destinoLinea ? (n ? `${n} en el lobby` : "Lobby abierto") : "Lobby vacío";
            return (
              <div key={m.id} role="listitem" className="mj-hueco" style={{ "--i": i } as CSSProperties}>
                <button type="button" className={"mj-carta" + (elegido === m.id ? " elegida" : "") + (m.listo ? "" : " pronto")}
                  onClick={() => (ancho || actual === i ? entrar(m) : irA(i))}
                  aria-label={`${m.nombre}. ${m.lema}.${marca ? ` ${marca}.` : ""}${m.listo ? "" : " Próximamente."}`}>
                  <span className="mj-brillo" aria-hidden="true" />
                  <img src={`${BASE}arte/modos/modo-${m.id}.webp`} alt="" draggable={false} width={628} height={1024} />
                  {marca && <span className={"mj-marca" + (destinoLinea ? "" : " vacio")}><i />{marca}</span>}
                  {!m.listo && <span className="mj-pronto">Próximamente</span>}
                </button>
                <p className="mj-lema">{m.lema}</p>
              </div>
            );
          })}
        </div>

        {!ancho && <div className="mj-puntos" aria-hidden="true">{MODOS.map((m, i) => <button key={m.id} type="button" tabIndex={-1} className={i === actual ? "si" : ""} onClick={() => irA(i)} />)}</div>}
      </div>
    </Marco>
  );
}
