// Personaje de bloques: las capas del armador del Centro de Mando (sin piezas GB ni Movistar).
// Capas de 400×520 que se apilan: piernas, piel, torso, rostro (o facial), cabello y lo que lleva en la mano.
import piezas from "./piezas.json";
import piezasEquipo from "./piezas-equipo.json";
import migracion from "./piezas-migracion.json";
import type { Azar } from "../engine/azar";
import type { AdornoEquipo } from "./equipos";

export type Paso = "piel" | "rostro" | "facial" | "cabello" | "torso" | "piernas";
export type Zona = "mano" | "cabeza" | "cuello" | "pecho" | "espalda";

export interface Pieza { id: string; nombre: string }
export const PIEZAS = piezas as unknown as Record<Paso | "accesorio", Pieza[]>;

/**
 * Piezas de equipo (personajes y marcas de cada casa o equipo): rostro, cabello, torso, facial, piernas o algo en la mano.
 * Solo las ve y se las pone quien es de ese equipo y tiene el nivel. Imágenes en public/piezas (ver docs/PIEZAS_DE_EQUIPO.md).
 */
export interface PiezaEquipo { id: string; nombre: string; paso: Paso | "mano"; equipo: string; nivel: number; personaje?: string }
export const PIEZAS_EQUIPO = piezasEquipo as PiezaEquipo[];
export const piezaEquipo = (id: string | null | undefined) => (id ? PIEZAS_EQUIPO.find(p => p.id === id) : undefined);
for (const p of PIEZAS_EQUIPO) if (p.paso !== "mano" && !PIEZAS[p.paso].some(x => x.id === p.id)) PIEZAS[p.paso].push({ id: p.id, nombre: p.nombre });

export const PASOS: { k: Paso; nombre: string; titulo: string; opcional?: boolean; nota?: string }[] = [
  { k: "piel", nombre: "Piel", titulo: "Tono de piel" },
  { k: "rostro", nombre: "Rostro", titulo: "Expresiones" },
  { k: "facial", nombre: "Facial", titulo: "Lentes, barbas y bigotes", opcional: true, nota: "Cada uno trae su propia expresión: reemplaza la del paso anterior." },
  { k: "cabello", nombre: "Cabello", titulo: "Peinados y sombreros", opcional: true },
  { k: "torso", nombre: "Torso", titulo: "Playeras, chamarras y jerseys" },
  { k: "piernas", nombre: "Piernas", titulo: "Color de piernas" },
];

export interface Personaje {
  piel: string; rostro: string; facial: string | null; cabello: string | null; torso: string; piernas: string;
  /** Lo que lleva puesto de la tienda, por zona. */
  puesto: Partial<Record<Zona, string | null>>;
  /** Equipo o casa, las recompensas de equipo que lleva puestas y lo que lleva en la mano de su equipo. Viaja a la nube. */
  equipo?: { id: string; adornos?: AdornoEquipo[]; mano?: string };
}

/** Artículos de la tienda. Todo es para lucir: nada da ventaja. Precio en XP disponible. */
export interface Articulo { id: string; nombre: string; zona: Zona; precio: number; nivel: number; pieza?: boolean }
const PRECIO_MANO: Record<string, number> = { "acc-tablet": 120, "acc-smartphone": 120, "acc-microfono": 120, "acc-estrella": 120, "acc-medalla": 160, "acc-trofeo": 160 };
export const TIENDA: Articulo[] = [
  ...PIEZAS.accesorio.map(a => ({ id: a.id, nombre: a.nombre === "Medalla" ? "Medalla en mano" : a.nombre, zona: "mano" as Zona, precio: PRECIO_MANO[a.id] ?? 80, nivel: 1, pieza: true })),
  { id: "corona-carton", nombre: "Corona de cartón", zona: "cabeza", precio: 160, nivel: 1 },
  { id: "medallas", nombre: "Medallas de adorno", zona: "pecho", precio: 200, nivel: 3 },
  { id: "collar", nombre: "Collar de oro", zona: "cuello", precio: 280, nivel: 5 },
  { id: "capa", nombre: "Capa de campeón", zona: "espalda", precio: 400, nivel: 10 },
  { id: "corona-neon", nombre: "Corona neón", zona: "cabeza", precio: 480, nivel: 15 },
];
export const ZONAS: [Zona, string][] = [["mano", "En la mano"], ["cabeza", "Cabeza"], ["cuello", "Cuello"], ["pecho", "Pecho"], ["espalda", "Espalda"]];

const ids = (k: Paso) => PIEZAS[k].map(p => p.id);
const en = <T,>(lista: T[], i: number) => lista[((i % lista.length) + lista.length) % lista.length] as T;

/** Un personaje distinto para cada lugar del grupo, para que nadie empiece igual. */
export function personajeInicial(i: number): Personaje {
  return {
    piel: en(ids("piel"), [2, 1, 4, 3, 7, 1, 5, 3][i % 8]!),
    rostro: en(ids("rostro"), i),
    facial: null,
    cabello: en(ids("cabello"), [0, 35, 25, 65, 5, 45, 15, 55][i % 8]!),
    torso: en(ids("torso"), i + 3),
    piernas: en(ids("piernas"), i + 1),
    puesto: {},
  };
}

export function personajeAlAzar(p: Personaje, azar: Azar): Personaje {
  const r = (k: Paso) => azar.elegir(ids(k).filter(id => !piezaEquipo(id)));
  return { ...p, piel: r("piel"), rostro: r("rostro"), facial: azar.siguiente() < 0.25 ? r("facial") : null,
    cabello: azar.siguiente() < 0.92 ? r("cabello") : null, torso: r("torso"), piernas: r("piernas") };
}

/** Revisa un cambio que llega de un celular: solo piezas que existen y adornos que el jugador ya tiene. */
export function cambioValido(cambio: Partial<Personaje>, tiene: string[]): boolean {
  for (const paso of PASOS) {
    if (!(paso.k in cambio)) continue;
    const v = cambio[paso.k];
    if (v === null && paso.opcional) continue;
    if (typeof v !== "string" || !ids(paso.k).includes(v)) return false;
  }
  for (const [zona, v] of Object.entries(cambio.puesto ?? {})) {
    if (v == null) continue;
    const art = TIENDA.find(a => a.id === v);
    if (!art || art.zona !== zona || !tiene.includes(v)) return false;
  }
  return true;
}

/**
 * Las piezas se renombraron (2026-11-12). Esta tabla lleva los personajes y accesorios ya guardados
 * a los nombres nuevos: la llave es una huella del nombre viejo, no el nombre.
 */
const MIGRACION = migracion as Record<string, string>;
function huella(s: string): string {
  let h = 0x811c9dc5;
  for (const c of new TextEncoder().encode(s)) h = Math.imul(h ^ c, 0x01000193) >>> 0;
  return h.toString(16);
}
export const idActual = (id: string): string => MIGRACION[huella(id)] ?? id;
export const idActualONulo = (id: string | null | undefined): string | null => (id ? idActual(id) : null);

/** Personaje guardado con nombres viejos de piezas, pasado a los actuales. */
export function migrarPersonaje(p: Personaje): Personaje {
  const puesto: Personaje["puesto"] = {};
  for (const [zona, v] of Object.entries(p.puesto ?? {})) puesto[zona as Zona] = idActualONulo(v);
  return { ...p, piel: idActual(p.piel), rostro: idActual(p.rostro), facial: idActualONulo(p.facial), cabello: idActualONulo(p.cabello),
    torso: idActual(p.torso), piernas: idActual(p.piernas), puesto };
}

export const rutaPieza = (id: string, mini = false) => `${import.meta.env.BASE_URL}piezas/${id}${mini ? "_m" : ""}.webp`;
