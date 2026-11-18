// Color y número de cada jugador (P1 rojo, P2 azul, P3 amarillo, P4 verde y más para salas grandes).
// No se guarda nada: sale del orden de entrada a la sala, que todos los aparatos leen igual
// (nube: `miembros_evento` ordenado por `unido`; respaldo local: orden de la lista). En una partida
// se usa el orden de `v.jugadores`, que el motor copia de esa misma lista al arrancar.
// Lo usan la sala de espera y, después, el marcador, el podio y los resultados.
import type { CSSProperties } from "react";

export interface ColorJugador {
  /** 1, 2, 3… */
  n: number;
  /** «P1», «P2»… */
  etiqueta: string;
  nombre: string;
  /** Color principal (relleno de la columna, insignia). */
  base: string;
  claro: string;
  oscuro: string;
  /** Texto legible encima de `base`. */
  texto: string;
}

type Tono = Omit<ColorJugador, "n" | "etiqueta">;

/** Los cuatro primeros son los de la referencia; los demás se inventaron para salas de hasta 8 (y siguen en ciclo). */
export const COLORES_JUGADOR: readonly Tono[] = [
  { nombre: "Rojo", base: "#e8343a", claro: "#ff7a6e", oscuro: "#8f1420", texto: "#ffffff" },
  { nombre: "Azul", base: "#2f7cf0", claro: "#7cc0ff", oscuro: "#123f99", texto: "#ffffff" },
  { nombre: "Amarillo", base: "#ffcf2e", claro: "#fff09a", oscuro: "#b37a00", texto: "#0a1030" },
  { nombre: "Verde", base: "#2fbf4f", claro: "#8cf09a", oscuro: "#11702a", texto: "#ffffff" },
  { nombre: "Naranja", base: "#ff8a1f", claro: "#ffc078", oscuro: "#a44a00", texto: "#0a1030" },
  { nombre: "Morado", base: "#9a4cf0", claro: "#cfa0ff", oscuro: "#53198f", texto: "#ffffff" },
  { nombre: "Rosa", base: "#ff4fa8", claro: "#ff9fd0", oscuro: "#a01860", texto: "#ffffff" },
  { nombre: "Turquesa", base: "#1fc7c1", claro: "#8af2ec", oscuro: "#0b6f6c", texto: "#0a1030" },
];

/** Color del lugar `i` (0 = P1). */
export function colorJugador(i: number): ColorJugador {
  const k = Math.max(0, Math.floor(i));
  return { ...COLORES_JUGADOR[k % COLORES_JUGADOR.length]!, n: k + 1, etiqueta: `P${k + 1}` };
}

/** Color de `id` según el orden de `ids` (los miembros de la sala o los jugadores de la partida). null si no está. */
export function colorDe(id: string, ids: readonly string[]): ColorJugador | null {
  const i = ids.indexOf(id);
  return i < 0 ? null : colorJugador(i);
}

/** Variables de CSS para pintar algo con el color del jugador: --pj, --pj-claro, --pj-oscuro, --pj-texto. */
export const varsColor = (c: ColorJugador | null): CSSProperties =>
  (c ? { "--pj": c.base, "--pj-claro": c.claro, "--pj-oscuro": c.oscuro, "--pj-texto": c.texto } : {}) as CSSProperties;
