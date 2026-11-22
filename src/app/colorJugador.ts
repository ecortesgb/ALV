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

// ---------- Colores del lobby (Elías, 2026-11-22) ----------
// El administrador (anfitrión) siempre es el primer lugar y siempre rojo. Los demás, por orden de entrada, toman color
// según su género: mujer rosa, amarillo, morado y naranja; hombre azul, verde y café (blanco y negro cambiaron a morado
// y café el 22 nov, con las cabinas de Elías). Si su grupo se acaba, o no dijo
// su género, toma el siguiente libre: primarios primero y después secundarios. Son 8 colores para 8 lugares.
const T = (nombre: string, base: string, claro: string, oscuro: string, texto: string): Tono => ({ nombre, base, claro, oscuro, texto });
export const PALETA_SALA = {
  rojo: T("Rojo", "#e8343a", "#ff7a6e", "#8f1420", "#ffffff"),
  azul: T("Azul", "#2f7cf0", "#7cc0ff", "#123f99", "#ffffff"),
  amarillo: T("Amarillo", "#ffcf2e", "#fff09a", "#b37a00", "#0a1030"),
  verde: T("Verde", "#2fbf4f", "#8cf09a", "#11702a", "#ffffff"),
  rosa: T("Rosa", "#ff4fa8", "#ff9fd0", "#a01860", "#ffffff"),
  naranja: T("Naranja", "#ff8a1f", "#ffc078", "#a44a00", "#0a1030"),
  morado: T("Morado", "#8b45d6", "#c79bff", "#4a1d82", "#ffffff"),
  cafe: T("Café", "#8a5634", "#c48a5e", "#4a2a14", "#ffffff"),
} as const;
type ClaveColor = keyof typeof PALETA_SALA;
export type GeneroColor = "mujer" | "hombre" | "otro";
const PREFERIDOS: Record<GeneroColor, ClaveColor[]> = {
  mujer: ["rosa", "amarillo", "morado", "naranja"],
  hombre: ["azul", "verde", "cafe"],
  otro: [],
};
/** Orden de respaldo: primarios y después secundarios. */
const RESPALDO: ClaveColor[] = ["azul", "amarillo", "verde", "naranja", "rosa", "morado", "cafe"];

/** Ids en el orden de los lugares: el anfitrión primero y los demás por orden de entrada. */
export function ordenSala(ids: readonly string[], anfitrion: string | null | undefined): string[] {
  return anfitrion && ids.includes(anfitrion) ? [anfitrion, ...ids.filter(i => i !== anfitrion)] : [...ids];
}

/**
 * Color y lugar de cada quien en la sala. `ids` en orden de entrada; `generos` puede faltar (sin servidor o sin dato).
 * Puro y determinista: todos los aparatos llegan al mismo resultado con los mismos datos.
 */
export function asignarColores(ids: readonly string[], anfitrion: string | null | undefined, generos: Readonly<Record<string, GeneroColor | undefined>> = {}): Map<string, ColorJugador> {
  const orden = ordenSala(ids, anfitrion);
  const libres = new Set<ClaveColor>(Object.keys(PALETA_SALA) as ClaveColor[]);
  const mapa = new Map<string, ColorJugador>();
  orden.forEach((id, k) => {
    let clave: ClaveColor | undefined;
    if (k === 0 && id === anfitrion) clave = "rojo";
    else {
      clave = PREFERIDOS[generos[id] ?? "otro"].find(c => libres.has(c)) ?? RESPALDO.find(c => libres.has(c)) ?? (libres.has("rojo") && !anfitrion ? "rojo" : undefined);
    }
    // Más de 8 (no debería pasar: el cupo es 8): se repite en ciclo.
    const tono = clave ? PALETA_SALA[clave] : COLORES_JUGADOR[k % COLORES_JUGADOR.length]!;
    if (clave) libres.delete(clave);
    mapa.set(id, { ...tono, n: k + 1, etiqueta: `P${k + 1}` });
  });
  return mapa;
}

// Colores de la sala abierta en este aparato. Los fija `useColoresSala` (Sala y Pantalla) y los usan el marcador,
// el podio y cada juego por medio de `colorDe`, así el color del lobby es el mismo en toda la partida.
let coloresSala: Map<string, ColorJugador> | null = null;
export function fijarColoresSala(m: Map<string, ColorJugador> | null) { coloresSala = m; }

/** Color de `id`: el de la sala si ya se calculó; si no, según el orden de `ids`. null si no está. */
export function colorDe(id: string, ids: readonly string[]): ColorJugador | null {
  const c = coloresSala?.get(id);
  if (c) return c;
  const i = ids.indexOf(id);
  return i < 0 ? null : colorJugador(i);
}

/** Variables de CSS para pintar algo con el color del jugador: --pj, --pj-claro, --pj-oscuro, --pj-texto. */
export const varsColor = (c: ColorJugador | null): CSSProperties =>
  (c ? { "--pj": c.base, "--pj-claro": c.claro, "--pj-oscuro": c.oscuro, "--pj-texto": c.texto } : {}) as CSSProperties;

/** Nombre de archivo del color (sin acentos): «Café» → «cafe». */
export const claveArchivo = (c: { nombre: string }) => c.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
