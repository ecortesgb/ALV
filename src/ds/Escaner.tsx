import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { Icono } from "./Icono";
import { Onomatopeya } from "./Onomatopeya";

export interface EscanerProps {
  /** Lo que se ve al mantener: la palabra, el papel o la respuesta. */
  secreto: string;
  /** Línea chica arriba del secreto. */
  encabezado?: string;
  /** Línea abajo del secreto (la categoría). */
  detalle?: string;
  sello?: string;
  /** Fija el estado (solo para la página interna del Design System). */
  muestra?: boolean;
  style?: CSSProperties;
}

/**
 * Tarjeta del secreto: se ve solo mientras el jugador mantiene el dedo (o la barra espaciadora / Enter).
 * Solo en el celular de su dueño; nunca en la Pantalla de TV.
 */
export function Escaner({ secreto, encabezado = "PALABRA CLASIFICADA", detalle, sello = "ULTRA SECRETO", muestra, style }: EscanerProps) {
  const [presionado, setPresionado] = useState(false);
  const on = muestra ?? presionado;
  const tecla = (e: KeyboardEvent, valor: boolean) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); setPresionado(valor); }
  };
  return (
    <div className={"d-pnl hold" + (on ? " on" : "")} style={{ position: "relative", minHeight: "17em", ...style }}
      role="button" tabIndex={0} aria-pressed={on} aria-label="Mantén presionado para ver tu secreto"
      onPointerDown={() => setPresionado(true)} onPointerUp={() => setPresionado(false)}
      onPointerLeave={() => setPresionado(false)} onPointerCancel={() => setPresionado(false)}
      onContextMenu={e => e.preventDefault()} onBlur={() => setPresionado(false)}
      onKeyDown={e => tecla(e, true)} onKeyUp={e => tecla(e, false)}>
      <div className="d-cover" aria-hidden={on}><div className="d-scan"><Icono id="finger" /></div><b>MANTÉN EL DEDO PARA VER</b></div>
      <div className="d-word" aria-hidden={!on} aria-live="polite">
        <Onomatopeya texto="¡SHHH!" color="var(--rosa-sfx)" tamano="2em" giro={-10} style={{ position: "absolute", top: ".6em", left: ".6em" }} />
        <span className="kick">{encabezado}</span>
        <span className="dsp ol">{secreto}</span>
        {detalle && <small>{detalle}</small>}
        {sello && <span className="d-stamp">{sello}</span>}
      </div>
    </div>
  );
}
