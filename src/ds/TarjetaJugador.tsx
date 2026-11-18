import type { ReactNode } from "react";
import { Icono } from "./Icono";

export type Sigla = "PJ" | "PG" | "RC" | "MVP" | "IMP" | "RAC";
const ORDEN: Sigla[] = ["PJ", "PG", "RC", "MVP", "IMP", "RAC"];
const NOMBRE: Record<Sigla, string> = { PJ: "partidas jugadas", PG: "ganadas", RC: "retos cumplidos", MVP: "MVP", IMP: "impostores atrapados", RAC: "mejor racha" };
const num = (n: number) => n.toLocaleString("es-MX");

export interface TarjetaJugadorProps {
  /** Foto de la figura 3D (cabeza). Viene de fuera: el Design System no dibuja figuras. */
  retrato: ReactNode;
  apodo: string;
  /** Apodo de la figura en juego: va chico, arriba del nombre. */
  alias?: string;
  nivel: number;
  /** Título por nivel («Leyenda de la fogata»). */
  titulo?: string;
  xp: { actual: number; siguiente: number };
  /** XP para gastar: se ve en laptop y TV, no en celular. */
  xpParaGastar?: number;
  numeros?: Partial<Record<Sigla, number>>;
  onPerfil?: () => void;
  onAjustes?: () => void;
}

/** Barra del jugador: retrato, apodo, nivel y barra de XP; a la derecha la XP para gastar y el engrane. */
export function TarjetaJugador({ retrato, apodo, alias, nivel, titulo, xp, xpParaGastar, numeros, onPerfil, onAjustes }: TarjetaJugadorProps) {
  const pct = xp.siguiente > 0 ? Math.max(0, Math.min(1, xp.actual / xp.siguiente)) : 1;
  const sig = ORDEN.filter(s => numeros?.[s] != null);
  const cuerpo = (
    <>
      <div className="d-ret">{retrato}</div>
      <div className="d-ji">
        {alias && <span className="d-alias">{alias}</span>}
        <span className="dsp ol">{apodo}</span>
        <span className="dsp nv">Nivel {nivel}</span>
        {titulo && <span className="tit">{titulo}</span>}
        <div className="d-bar" role="progressbar" aria-label="XP del nivel" aria-valuemin={0} aria-valuemax={xp.siguiente} aria-valuenow={xp.actual}><i style={{ width: `${Math.round(pct * 100)}%` }} /></div>
        {sig.length > 0 && <div className="d-nums">{sig.map(s => <span key={s} className="d-chip" title={NOMBRE[s]}><b>{num(numeros![s]!)}</b>{s}</span>)}</div>}
      </div>
      <span className="d-num">{num(xp.actual)} / {num(xp.siguiente)}</span>
    </>
  );
  return (
    <div className="d-top">
      {onPerfil
        ? <button type="button" className="d-pnl d-jug" onClick={onPerfil} aria-label={`Perfil de ${apodo}`}>{cuerpo}</button>
        : <div className="d-pnl d-jug">{cuerpo}</div>}
      {xpParaGastar != null && <div className="d-pnl d-coin"><Icono id="star" /><span><b>{num(xpParaGastar)}</b><br /><small>XP para gastar</small></span></div>}
      {onAjustes && <button type="button" className="d-gear" onClick={onAjustes} aria-label="Ajustes"><Icono id="gear" /></button>}
    </div>
  );
}
