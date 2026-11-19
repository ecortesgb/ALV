// Tarjetas del configurador de partida (Maestro v1.44): juego, tipo de partida y escenario.
// Se inclinan siguiendo el dedo o el ratón, brillan al elegirse y llevan su ilustración.
// Si un juego todavía no tiene ilustración en `public/arte/juegos/`, se dibuja un cartel con rayos de cómic.
import { useRef, type CSSProperties } from "react";
import { ARTE_ESCENARIOS, ARTE_JUEGOS, ARTE_TIPOS, EMOJI_JUEGO } from "../content/arteJuegos";
import type { Modalidad } from "../engine/types";
import { Icono } from "../ds";

/** Dirección de una imagen de `public/arte/` para `<img src>`. */
export const srcArte = (nombre: string) => new URL(`${import.meta.env.BASE_URL}arte/${nombre}`, document.baseURI).href;

/** Inclina la tarjeta hacia donde está el dedo (variables --rx y --ry). Sin efecto con movimiento reducido (lo apaga el CSS). */
function useInclina() {
  const ref = useRef<HTMLButtonElement>(null);
  const mover = (e: React.PointerEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`); el.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
    el.style.setProperty("--bx", `${((x + 0.5) * 100).toFixed(0)}%`);
  };
  const salir = () => { const el = ref.current; if (!el) return; el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
  return { ref, onPointerMove: mover, onPointerLeave: salir };
}

function Rayos({ color }: { color: string }) {
  const puntas: string[] = [];
  for (let i = 0; i < 24; i += 2) {
    const a1 = Math.PI * 2 * i / 24, a2 = Math.PI * 2 * (i + 1) / 24;
    puntas.push(`50,55 ${(50 + 160 * Math.cos(a1)).toFixed(1)},${(55 + 160 * Math.sin(a1)).toFixed(1)} ${(50 + 160 * Math.cos(a2)).toFixed(1)},${(55 + 160 * Math.sin(a2)).toFixed(1)}`);
  }
  return (
    <svg className="tc-rayos" viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="100" height="130" fill={color} />
      {puntas.map((p, i) => <polygon key={i} points={p} fill="#fff" opacity=".18" />)}
      <circle cx="50" cy="55" r="30" fill="#fff" opacity=".22" />
    </svg>
  );
}

/** Tarjeta de un juego: ilustración, nombre, jugadores y tiempo; candado con su razón. */
export function CartaJuego({ id, nombre, sigla, color, jugadores, duracion, elegida, bloqueada, indice = 0, onClick }: {
  id: string; nombre: string; sigla: string; color: string; jugadores: string; duracion: string;
  elegida?: boolean; bloqueada?: string | null; indice?: number; onClick: () => void;
}) {
  const inc = useInclina();
  const arte = ARTE_JUEGOS[id];
  return (
    <button type="button" {...inc} className={"tc tc-juego" + (elegida ? " on" : "") + (bloqueada ? " bloq" : "")} style={{ "--tc": color, "--i": indice } as CSSProperties}
      aria-pressed={!!elegida} aria-label={`${nombre}${bloqueada ? ` (${bloqueada})` : ""}`} onClick={onClick}>
      <span className="tc-arte">
        {arte ? <img src={srcArte(arte)} alt="" loading="lazy" draggable={false} /> : <><Rayos color={color} /><span className="tc-emoji" aria-hidden="true">{EMOJI_JUEGO[id] ?? "🎲"}</span></>}
        <span className="tc-sigla dsp">{sigla}</span>
        {bloqueada && <span className="tc-candado"><Icono id="lock" />{bloqueada}</span>}
      </span>
      <span className="tc-pie">
        <span className="dsp ol tc-nombre">{nombre}</span>
        <span className="tc-datos"><span><Icono id="users" />{jugadores}</span><span><Icono id="clock" />{duracion}</span></span>
      </span>
      <span className="tc-brillo" aria-hidden="true" />
    </button>
  );
}

/** Tarjeta de tipo de partida: la ilustración completa (trae su nombre dibujado) con marco de neón al elegirla. */
export function CartaTipo({ id, nombre, texto, elegida, bloqueada, indice = 0, onClick }: { id: Modalidad; nombre: string; texto: string; elegida?: boolean; bloqueada?: string | null; indice?: number; onClick: () => void }) {
  const inc = useInclina();
  return (
    <button type="button" {...inc} className={"tc tc-tipo" + (elegida ? " on" : "") + (bloqueada ? " bloq" : "")} style={{ "--i": indice } as CSSProperties}
      aria-pressed={!!elegida} aria-label={`${nombre}: ${bloqueada ?? texto}`} disabled={!!bloqueada} onClick={onClick}>
      <img src={srcArte(ARTE_TIPOS[id])} alt="" draggable={false} />
      {bloqueada && <span className="tc-tipo-candado"><Icono id="lock" /> {bloqueada}</span>}
      {elegida && <span className="tc-check" aria-hidden="true">✓</span>}
      <span className="tc-brillo" aria-hidden="true" />
    </button>
  );
}

/** Tarjeta de escenario con su ilustración (o su color y emoji). */
export function CartaEscenario({ id, nombre, texto, emoji, color, elegida, bloqueada, onClick }: { id: string; nombre: string; texto: string; emoji: string; color: string; elegida?: boolean; bloqueada?: string | null; onClick: () => void }) {
  const inc = useInclina();
  const arte = ARTE_ESCENARIOS[id];
  return (
    <button type="button" {...inc} className={"tc tc-esc" + (elegida ? " on" : "") + (bloqueada ? " bloq" : "")} style={{ "--tc": color } as CSSProperties} aria-pressed={!!elegida} disabled={!!bloqueada} onClick={onClick}>
      <span className="tc-arte">
        {arte ? <img src={srcArte(arte)} alt="" loading="lazy" draggable={false} /> : <><Rayos color={color} /><span className="tc-emoji" aria-hidden="true">{emoji}</span></>}
      </span>
      <span className="tc-pie"><span className="dsp ol tc-nombre">{nombre}</span><span className="tc-texto">{bloqueada ?? texto}</span></span>
      <span className="tc-brillo" aria-hidden="true" />
    </button>
  );
}
