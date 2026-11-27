// Galería «Elegir personaje» (ALV_PLAN_PERSONAJES_NUEVO.md §2.2): lógica pura. Categorías por saga, filtros sencillos
// (bando y tamaño), favoritos y páginas que se pasan de lado (sin bajar).
import type { Catalogo } from "./plano";
import type { Bando, Id } from "./tipos";

export interface Tarjeta {
  id: Id; nombre: string; saga: Id; grupo: Id; bando: Bando; familia: Id;
  tamano: "normal" | "grande";
  /** URL de la foto de tarjeta, o null si la ficha no trae una que se pueda usar. */
  foto: string | null;
  prueba: boolean;
}

export const NOMBRE_SAGA: Record<string, string> = {
  marvel: "Marvel", dc: "DC", "star-wars": "Star Wars", "harry-potter": "Harry Potter", piratas: "Piratas",
  "senor-de-los-anillos": "El Señor de los Anillos", disney: "Disney", "looney-tunes": "Looney Tunes", simpsons: "Los Simpson",
  "plaza-sesamo": "Plaza Sésamo", muppets: "Los Muppets", "hora-de-aventura": "Hora de Aventura",
  "chicas-superpoderosas": "Las Chicas Superpoderosas", increibles: "Los Increíbles", futbol: "Fútbol", otros: "Otros",
};
const ORDEN_SAGA = ["marvel", "dc", "star-wars", "harry-potter", "disney", "simpsons", "looney-tunes", "muppets", "plaza-sesamo",
  "hora-de-aventura", "chicas-superpoderosas", "futbol", "senor-de-los-anillos", "piratas", "otros"];
/** Sagas chicas (van a «Otros» y su nombre se ve como grupo): solo el nombre bien escrito. */
const NOMBRE_SAGA_CHICA: Record<string, string> = {
  "volver-al-futuro": "Volver al Futuro", et: "E.T.", gremlins: "Gremlins", sonic: "Sonic", "scooby-doo": "Scooby-Doo",
  "mago-de-oz": "El Mago de Oz", monstruos: "Monstruos", invincible: "Invincible", "the-boys": "The Boys",
  picapiedra: "Los Picapiedra", "big-bang-theory": "The Big Bang Theory",
};
export const nombreSaga = (s: string) => NOMBRE_SAGA[s] ?? NOMBRE_SAGA_CHICA[s] ?? s.replace(/-/g, " ").replace(/^./, c => c.toUpperCase());

/** Personajes que necesita una saga para tener su propio botón; con menos va a «Otros». */
export const SAGA_MINIMA = 3;

/** Qué estados de calidad salen en la galería (los «borrador» solo en pruebas). */
const VISIBLES = new Set(["jugable", "revision", "aprobado"]);

export function tarjetas(catalogo: Catalogo, opciones: { conBorradores?: boolean; pruebas?: ReadonlySet<Id> } = {}): Tarjeta[] {
  const fuera: Tarjeta[] = [];
  for (const { ficha: f, base } of catalogo.values()) {
    if (!VISIBLES.has(f.calidad.estado) && !opciones.conBorradores) continue;
    const foto = /\.webp$|\.png$|\.jpg$/i.test(f.fotos.tarjeta) && !/no-hay/.test(f.fotos.tarjeta) ? new URL(f.fotos.tarjeta, base).href : null;
    fuera.push({ id: f.id, nombre: f.nombre, saga: f.saga, grupo: f.grupo, bando: f.bando, familia: f.familia,
      tamano: f.familia === "bigfig" ? "grande" : "normal", foto, prueba: !!opciones.pruebas?.has(f.id) });
  }
  // Una saga sin botón propio (fuera de NOMBRE_SAGA) con 3 personajes o menos va a «Otros», con su nombre como grupo
  // (Elías, 2026-11-27: «como son menos de 3 que salgan en otros de la saga»): Volver al Futuro, E.T., Gremlins, Sonic…
  const cuantos = new Map<string, number>();
  for (const t of fuera) cuantos.set(t.saga, (cuantos.get(t.saga) ?? 0) + 1);
  for (const t of fuera) if (!(t.saga in NOMBRE_SAGA) && (cuantos.get(t.saga) ?? 0) <= SAGA_MINIMA) { t.grupo = t.saga; t.saga = "otros"; }
  const orden = (s: string) => { const i = ORDEN_SAGA.indexOf(s); return i < 0 ? ORDEN_SAGA.length : i; };
  return fuera.sort((a, b) => orden(a.saga) - orden(b.saga) || a.saga.localeCompare(b.saga) || a.nombre.localeCompare(b.nombre, "es"));
}

export interface Categoria { id: string; nombre: string; cuantos: number }
/** «Todos», «Favoritos» (si hay) y las sagas que tienen al menos un personaje, en su orden. */
export function categorias(lista: Tarjeta[], favoritos: ReadonlySet<Id>): Categoria[] {
  const porSaga = new Map<string, number>();
  for (const t of lista) porSaga.set(t.saga, (porSaga.get(t.saga) ?? 0) + 1);
  const favs = lista.filter(t => favoritos.has(t.id)).length;
  return [
    { id: "todos", nombre: "Todos", cuantos: lista.length },
    ...(favs ? [{ id: "favoritos", nombre: "Favoritos", cuantos: favs }] : []),
    ...[...porSaga].map(([id, cuantos]) => ({ id, nombre: nombreSaga(id), cuantos })),
  ];
}

export interface Filtro { categoria: string; bando: Bando | null; tamano: Tarjeta["tamano"] | null }
export const SIN_FILTRO: Filtro = { categoria: "todos", bando: null, tamano: null };

export function filtrar(lista: Tarjeta[], f: Filtro, favoritos: ReadonlySet<Id>): Tarjeta[] {
  return lista.filter(t =>
    (f.categoria === "todos" || (f.categoria === "favoritos" ? favoritos.has(t.id) : t.saga === f.categoria))
    && (!f.bando || t.bando === f.bando) && (!f.tamano || t.tamano === f.tamano));
}

/** Parte la lista en páginas de `porPagina` (al menos 1). */
export function paginas<T>(lista: T[], porPagina: number): T[][] {
  const n = Math.max(1, Math.floor(porPagina));
  const fuera: T[][] = [];
  for (let i = 0; i < lista.length; i += n) fuera.push(lista.slice(i, i + n));
  return fuera.length ? fuera : [[]];
}

/** Cuántas tarjetas caben en una caja (columnas × filas), con un tamaño mínimo de tarjeta. */
export function caben(ancho: number, alto: number, tarjeta = { min: 118, proporcion: 1.3, hueco: 10 }): { columnas: number; filas: number } {
  const columnas = Math.max(1, Math.floor((ancho + tarjeta.hueco) / (tarjeta.min + tarjeta.hueco)));
  const anchoReal = (ancho - tarjeta.hueco * (columnas - 1)) / columnas;
  const filas = Math.max(1, Math.floor((alto + tarjeta.hueco) / (anchoReal * tarjeta.proporcion + tarjeta.hueco)));
  return { columnas, filas };
}

// ---------- Favoritos (en este aparato; en la cuenta, después) ----------

const claveFav = (jugador: string) => "alv-personajes-favoritos-" + (jugador.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
export function leerFavoritos(jugador: string): Set<Id> {
  try {
    const x = JSON.parse(localStorage.getItem(claveFav(jugador)) ?? "[]");
    return new Set(Array.isArray(x) ? x.filter((i): i is string => typeof i === "string" && /^[a-z0-9][a-z0-9-]{1,59}$/.test(i)).slice(0, 200) : []);
  } catch { return new Set(); }
}
export function guardarFavoritos(jugador: string, favs: ReadonlySet<Id>) {
  try { localStorage.setItem(claveFav(jugador), JSON.stringify([...favs].slice(0, 200))); } catch { /* sin almacenamiento */ }
}
