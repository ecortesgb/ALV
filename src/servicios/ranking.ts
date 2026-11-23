// Ranking (migración 040; Maestro v1.54, 14.3). Lee ranking_jugadores y ranking_grupos del servidor.
// Sin nube (modo demostración) devuelve un ranking de mentira, siempre igual, con la cuenta abierta dentro.
// Los Puntos ALV los calcula el servidor: aquí solo se leen.
import { useSyncExternalStore } from "react";
import { cliente, hayNube } from "./cliente";
import { sesionAhora } from "../app/sesion";
import type { FiguraV2 } from "../content/personaje";

export type FiltroRanking = "amigos" | "global";

export interface FilaJugador {
  posicion: number; id: string; nombre: string; nivel: number; figura: FiguraV2 | null;
  puntos_alv: number; victorias: number; partidas: number; mvp: number; racha: number; juegos: number;
  victorias_azar: number; victorias_deduccion: number; titulo?: string | null; rareza_titulo?: string | null;
}
export interface FilaGrupo {
  posicion: number; integrantes: string[]; nombres: string[]; puntos_alv: number; victorias: number; partidas: number;
  porcentaje: number; racha: number; grupo?: string; nombre_grupo?: string | null; color?: string | null; emoji?: string | null;
}

/** Categorías del ranking individual (encargo §1 A; «Más divertido» llega con las votaciones, etapa 2). */
export const CATEGORIAS = [
  { id: "puntos", titulo: "Mejor jugador", campo: "puntos_alv", unidad: "PA" },
  { id: "victorias", titulo: "Más victorias", campo: "victorias", unidad: "victorias" },
  { id: "mvp", titulo: "Más MVP", campo: "mvp", unidad: "MVP" },
  { id: "racha", titulo: "Más competitivo", campo: "racha", unidad: "seguidas" },
  { id: "versatil", titulo: "Más versátil", campo: "juegos", unidad: "juegos" },
  { id: "azar", titulo: "Más impredecible", campo: "victorias_azar", unidad: "de azar" },
  { id: "deduccion", titulo: "Más estratega", campo: "victorias_deduccion", unidad: "de deducción" },
] as const satisfies readonly { id: string; titulo: string; campo: keyof FilaJugador; unidad: string }[];
export type Categoria = (typeof CATEGORIAS)[number]["id"];

/** Ordena por una categoría con empates compartidos (1, 1, 3), como el servidor. */
export function ordenarPor(filas: FilaJugador[], cat: Categoria): (FilaJugador & { lugar: number; valor: number })[] {
  const campo = CATEGORIAS.find(c => c.id === cat)!.campo;
  const orden = [...filas].sort((a, b) => (b[campo] as number) - (a[campo] as number) || b.puntos_alv - a.puntos_alv || a.nombre.localeCompare(b.nombre));
  let lugar = 0, previo: number | null = null;
  return orden.map((f, i) => {
    const v = f[campo] as number;
    if (v !== previo) { lugar = i + 1; previo = v; }
    return { ...f, lugar, valor: v };
  });
}

// ===== Demostración =====
const DEMO = ["Ana", "Beto", "Cata", "Dani", "Fer", "Gael", "Iris", "Leo", "Mau", "Nora", "Pau", "Rita"];
export function demoJugadores(filtro: FiltroRanking, temporada: boolean): FilaJugador[] {
  const s = sesionAhora();
  const base = (filtro === "amigos" ? DEMO.slice(0, 6) : DEMO).map((nombre, i) => {
    const pa = Math.max(0, 48 - i * 4 - (i % 3)) >> (temporada ? 1 : 0);
    return { id: `demo-${i}`, nombre, nivel: 12 - (i % 9), figura: null, puntos_alv: pa, victorias: Math.round(pa / 3),
      partidas: 10 + ((i * 7) % 23), mvp: (i * 5) % 7, racha: (i * 3) % 6, juegos: 3 + ((i * 2) % 9),
      victorias_azar: (i * 4) % 5, victorias_deduccion: (11 - i) % 6, posicion: 0,
      ...(i === 0 ? { titulo: "Imparable", rareza_titulo: "epica" } : i === 2 ? { titulo: "Campeón", rareza_titulo: "legendaria" } : {}) };
  });
  const yo = { id: s.uid || "demo-yo", nombre: s.nombre || "Tú", nivel: s.nivel, figura: null, puntos_alv: temporada ? 9 : 17, victorias: 6,
    partidas: 21, mvp: 3, racha: 2, juegos: 7, victorias_azar: 2, victorias_deduccion: 3, posicion: 0 };
  return ordenarPor([...base, yo], "puntos").map(f => ({ ...f, posicion: f.lugar }));
}
function demoGrupos(modalidad: "parejas" | "equipos"): FilaGrupo[] {
  const tam = modalidad === "parejas" ? 2 : 3;
  return Array.from({ length: 5 }, (_, i) => {
    const nombres = Array.from({ length: tam }, (_, k) => DEMO[(i * tam + k) % DEMO.length]!);
    const vic = 9 - i * 2, pj = 12 + i;
    return { posicion: i + 1, integrantes: nombres.map((_, k) => `demo-g${i}-${k}`), nombres, puntos_alv: vic * 3,
      victorias: vic, partidas: pj, porcentaje: Math.round((100 * vic) / pj), racha: Math.max(0, 4 - i), grupo: `demo-g${i}`,
      ...(i === 0 ? { nombre_grupo: "Los reyes", color: "#ff3b6b", emoji: "👑" } : {}) };
  });
}

// ===== Servidor =====
export async function rankingJugadores(filtro: FiltroRanking, temporada: boolean): Promise<FilaJugador[] | null> {
  if (!hayNube) return demoJugadores(filtro, temporada);
  try {
    const { data, error } = await cliente!.rpc("ranking_jugadores", { p_filtro: filtro, p_temporada: temporada });
    if (error) { console.error("rankingJugadores", error.message); return null; }
    return (data ?? []) as FilaJugador[];
  } catch (e) { console.error("rankingJugadores", e); return null; }
}

export async function rankingGrupos(modalidad: "parejas" | "equipos", filtro: FiltroRanking, temporada: boolean): Promise<FilaGrupo[] | null> {
  if (!hayNube) return demoGrupos(modalidad);
  try {
    const { data, error } = await cliente!.rpc("ranking_grupos", { p_modalidad: modalidad, p_filtro: filtro, p_temporada: temporada });
    if (error) { console.error("rankingGrupos", error.message); return null; }
    return (data ?? []) as FilaGrupo[];
  } catch (e) { console.error("rankingGrupos", e); return null; }
}

/** «Aparecer en el ranking Global» (T8). Encendido por omisión. */
export async function fijarRankingGlobal(visible: boolean): Promise<boolean> {
  if (!hayNube) return true;
  try {
    const { error } = await cliente!.rpc("fijar_ranking_global", { p_visible: visible });
    if (error) { console.error("fijarRankingGlobal", error.message); return false; }
    return true;
  } catch (e) { console.error("fijarRankingGlobal", e); return false; }
}

// ===== Puntos ALV de la temporada para la pastilla PTS (T10) =====
let misPuntos: number | null = null, pedidos = false;
const oyentes = new Set<() => void>();
export async function cargarMisPuntos(): Promise<void> {
  pedidos = true;
  const filas = await rankingJugadores("amigos", true);
  const s = sesionAhora();
  const yo = filas?.find(f => f.id === s.uid) ?? (hayNube ? undefined : filas?.find(f => f.id === "demo-yo"));
  misPuntos = yo?.puntos_alv ?? (filas ? 0 : misPuntos);
  for (const f of oyentes) f();
}
/** Puntos ALV del mes de la cuenta abierta; null mientras no se leen. */
export function useMisPuntos(): number | null {
  const v = useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => misPuntos);
  if (!pedidos && sesionAhora().fase === "dentro") void cargarMisPuntos();
  return v;
}

/** Lee si la cuenta aparece en el Global (preferencias_cuenta.datos.rankingGlobal; sin dato = sí). */
export async function leerRankingGlobal(): Promise<boolean> {
  if (!hayNube) return true;
  try {
    const { data, error } = await cliente!.from("preferencias_cuenta").select("datos").maybeSingle();
    if (error) return true;
    return (data?.datos as Record<string, unknown> | undefined)?.rankingGlobal !== false;
  } catch { return true; }
}

// ===== Reconocimientos por votación (043, D6) =====
export type CategoriaVoto = "divertido" | "bromista" | "alma" | "impredecible";
export const VOTOS: { id: CategoriaVoto; titulo: string; emoji: string }[] = [
  { id: "divertido", titulo: "Más divertido", emoji: "😂" }, { id: "bromista", titulo: "El bromista", emoji: "🃏" },
  { id: "alma", titulo: "Alma de la fiesta", emoji: "🎉" }, { id: "impredecible", titulo: "El impredecible de la noche", emoji: "🎲" },
];
export interface FilaVoto { posicion: number; id: string; nombre: string; nivel: number; figura: FiguraV2 | null; votos: number }
export async function rankingReconocimientos(filtro: FiltroRanking, categoria: CategoriaVoto | null, temporada: boolean): Promise<FilaVoto[] | null> {
  if (!hayNube) return DEMO.slice(0, 6).map((nombre, i) => ({ posicion: i + 1, id: `demo-${i}`, nombre, nivel: 8 - i, figura: null, votos: 12 - i * 2 }));
  try {
    const { data, error } = await cliente!.rpc("ranking_reconocimientos", { p_filtro: filtro, p_categoria: categoria, p_temporada: temporada });
    if (error) { console.error("rankingReconocimientos", error.message); return null; }
    return (data ?? []) as FilaVoto[];
  } catch (e) { console.error("rankingReconocimientos", e); return null; }
}
export interface ConteoVoto { categoria: CategoriaVoto; votado: string | null; nombre: string | null; votos: number; mi_voto: string | null }
const demoVotos: Record<string, string> = {};
export async function votosDeLaNoche(evento: string): Promise<ConteoVoto[] | null> {
  if (!hayNube) return VOTOS.map(v => ({ categoria: v.id, votado: demoVotos[v.id] ?? null, nombre: null, votos: demoVotos[v.id] ? 1 : 0, mi_voto: demoVotos[v.id] ?? null }));
  try {
    const { data, error } = await cliente!.rpc("votos_de_la_noche", { p_evento: evento });
    if (error) { console.error("votosDeLaNoche", error.message); return null; }
    return (data ?? []) as ConteoVoto[];
  } catch (e) { console.error("votosDeLaNoche", e); return null; }
}
export async function votarNoche(evento: string, categoria: CategoriaVoto, votado: string): Promise<string | null> {
  if (!hayNube) { demoVotos[categoria] = votado; return null; }
  try {
    const { error } = await cliente!.rpc("votar_noche", { p_evento: evento, p_categoria: categoria, p_votado: votado });
    if (!error) return null;
    console.error("votarNoche", error.message);
    return /cerrada/.test(error.message) ? "La votación de esta noche ya cerró." : /no válido/.test(error.message) ? "Ese voto no se puede." : "No se pudo votar.";
  } catch (e) { console.error("votarNoche", e); return "No se pudo votar."; }
}

// ===== Identidad de parejas y equipos (043, D4) =====
export interface MiGrupo { grupo: string; modalidad: "parejas" | "equipos"; integrantes: string[]; partidas: number; nombre: string | null; color: string | null; emoji: string | null }
export async function misGrupos(): Promise<MiGrupo[] | null> {
  if (!hayNube) return [{ grupo: "demo-g0", modalidad: "parejas", integrantes: ["Ana", "Beto"], partidas: 12, nombre: "Los reyes", color: "#ff3b6b", emoji: "👑" }];
  try {
    const { data, error } = await cliente!.rpc("mis_grupos");
    if (error) { console.error("misGrupos", error.message); return null; }
    return (data ?? []) as MiGrupo[];
  } catch (e) { console.error("misGrupos", e); return null; }
}
export async function nombrarGrupo(grupo: string, nombre: string, color: string, emoji: string): Promise<string | null> {
  if (!hayNube) return null;
  try {
    const { error } = await cliente!.rpc("nombrar_grupo", { p_grupo: grupo, p_nombre: nombre, p_color: color, p_emoji: emoji || null });
    if (!error) return null;
    console.error("nombrarGrupo", error.message);
    return /nombre/.test(error.message) ? "El nombre debe tener de 2 a 30 letras." : "No se pudo guardar.";
  } catch (e) { console.error("nombrarGrupo", e); return "No se pudo guardar."; }
}
