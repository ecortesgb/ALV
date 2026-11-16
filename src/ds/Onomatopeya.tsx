import type { CSSProperties } from "react";

/** Palabra de cómic («¡ALV!», «¡SHHH!»). Una sola por pantalla y solo para momentos, nunca para leer información. */
export function Onomatopeya({ texto, color, giro = -8, tamano = "2.6em", style }: { texto: string; color?: string; giro?: number; tamano?: string; style?: CSSProperties }) {
  return <span className="sfx" aria-hidden="true" style={{ display: "inline-block", fontSize: tamano, transform: `rotate(${giro}deg)`, ...(color ? { color } : {}), ...style }}>{texto}</span>;
}
