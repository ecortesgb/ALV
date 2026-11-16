import type { CSSProperties, ReactNode } from "react";
import { Icono } from "./Icono";

export interface TarjetaJuegoProps {
  nombre: string;
  /** Sigla del sello (FBI, HDSPM…). */
  sigla: string;
  jugadores: string;
  duracion: string;
  /** Color de su fila (token fila-*). */
  color: string;
  /** Ilustración (en la app, fotos sacadas del 3D). Sin ella van solo los rayos de cómic. */
  ilustracion?: ReactNode;
  enfocada?: boolean;
  nueva?: boolean;
  /** Razón del candado («Solo con adulto»). Se puede tocar igual para leer por qué. */
  bloqueada?: string;
  /** Posición en la fila, para escalonar la entrada. */
  indice?: number;
  onClick?: () => void;
}

/** Rayos de cómic del color de la fila: el fondo de toda ilustración de juego. */
function Rayos({ color }: { color: string }) {
  const cx = 80, cy = 104, puntas: string[] = [];
  for (let i = 0; i < 20; i += 2) {
    const a1 = Math.PI * 2 * i / 20, a2 = Math.PI * 2 * (i + 1) / 20;
    puntas.push(`${cx},${cy} ${(cx + 260 * Math.cos(a1)).toFixed(1)},${(cy + 260 * Math.sin(a1)).toFixed(1)} ${(cx + 260 * Math.cos(a2)).toFixed(1)},${(cy + 260 * Math.sin(a2)).toFixed(1)}`);
  }
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="160" height="100" fill={color} />
      {puntas.map((p, i) => <polygon key={i} points={p} fill="rgba(255,255,255,.2)" />)}
    </svg>
  );
}

/** Tarjeta del catálogo: ilustración arriba, nombre abajo. Normal, enfocada, nueva o bloqueada. */
export function TarjetaJuego({ nombre, sigla, jugadores, duracion, color, ilustracion, enfocada, nueva, bloqueada, indice = 0, onClick }: TarjetaJuegoProps) {
  const cls = ["d-gc", "in", bloqueada && "lock", enfocada && "foco"].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} style={{ "--d": `${(0.04 * indice).toFixed(2)}s` } as CSSProperties} onClick={onClick}
      aria-label={`${nombre}, ${jugadores}, ${duracion}${bloqueada ? `. Bloqueado: ${bloqueada}` : ""}`}>
      <div className="art">
        {ilustracion ?? <Rayos color={color} />}
        <span className="sg">{sigla}</span>
        {nueva && <span className="nv">NUEVO</span>}
        {bloqueada && <span className="lk"><Icono id="lock" />{bloqueada}</span>}
      </div>
      <div className="bd">
        <span className="dsp ol">{nombre}</span>
        <div className="meta"><span><Icono id="users" />{jugadores}</span><span><Icono id="clock" />{duracion}</span></div>
      </div>
    </button>
  );
}
