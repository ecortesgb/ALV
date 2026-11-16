import type { CSSProperties } from "react";
import { Icono, type IconoId } from "./Icono";

/** Etiqueta amarilla recortada en diagonal que nombra la sección («Jugar», «Ronda 2 de 5»). No es botón. */
export function Etiqueta({ texto, icono, grande, style }: { texto: string; icono?: IconoId; grande?: boolean; style?: CSSProperties }) {
  return <span className="d-lbl" style={{ ...(grande ? { fontSize: "1.7em" } : {}), ...style }}>{icono && <Icono id={icono} />}{texto}</span>;
}

/** Cartel rojo con el nombre del juego. Solo en la Pantalla de TV. */
export function Cartel({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <div className="d-ban">
      <span className="dsp ol">{titulo}</span>
      {sub && <span className="dsp sub ol">{sub}</span>}
    </div>
  );
}
