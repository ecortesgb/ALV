// Partida en varios celulares: el anfitrión publica, cada celular manda sus acciones y lee su secreto.
import { cliente, uidActual } from "./cliente";
import type { Sala } from "./sala";

/** id de la cuenta abierta (para saber cuál es mi jugador en la partida de la sala). */
export const miUid = uidActual;

export async function crearPartidaSala(sala: Sala, juego: string, semilla: number): Promise<string | null> {
  if (!cliente) return null;
  try {
    const { data, error } = await cliente.from("partidas").insert({ evento: sala.id, juego, semilla }).select("id").single();
    if (error) { console.error("crearPartidaSala", error.message); return null; }
    return data.id as string;
  } catch (e) { console.error("crearPartidaSala", e); return null; }
}

/** El anfitrión publica lo público y el secreto de cada celular (clave: id de cuenta). */
export async function publicarPartida(partida: string, version: number, estado: unknown, privados: Record<string, unknown>): Promise<void> {
  if (!cliente) return;
  try {
    const { error } = await cliente.rpc("publicar_partida", { p_partida: partida, p_version: version, p_estado: estado, p_privados: privados });
    if (error) console.error("publicarPartida", error.message);
  } catch (e) { console.error("publicarPartida", e); }
}

export interface AccionSala { id: string; jugador: string; tipo: "contestar" | "carta" | "mision"; datos: Record<string, unknown>; creada: string }

/** Respuestas que mandaron los celulares. El anfitrión las lee en orden. */
export async function leerAcciones(partida: string): Promise<AccionSala[]> {
  if (!cliente) return [];
  try {
    const { data, error } = await cliente.from("acciones").select("id, jugador, tipo, datos, creada").eq("partida", partida).order("creada");
    if (error) { console.error("leerAcciones", error.message); return []; }
    return (data ?? []) as AccionSala[];
  } catch (e) { console.error("leerAcciones", e); return []; }
}

/** El celular manda su respuesta. El id lo pone el celular: si se reenvía por mala señal, cuenta una vez. */
export async function enviarAccion(partida: string, id: string, tipo: AccionSala["tipo"], datos: Record<string, unknown>): Promise<boolean> {
  if (!cliente) return false;
  try {
    const uid = await uidActual();
    if (!uid) return false;
    const { error } = await cliente.from("acciones").insert({ id, partida, jugador: uid, tipo, datos });
    if (error && !error.message.includes("duplicate")) { console.error("enviarAccion", error.message); return false; }
    return true;
  } catch (e) { console.error("enviarAccion", e); return false; }
}

export async function terminarPartidaSala(partida: string, juego: string, jugadores: number,
  resultados: { jugador: string; rondas: number; retos: number; lugar: number }[]): Promise<void> {
  if (!cliente) return;
  try {
    const { error } = await cliente.rpc("terminar_partida_sala", { p_partida: partida, p_juego: juego, p_jugadores: jugadores, p_resultados: resultados });
    if (error) console.error("terminarPartidaSala", error.message);
  } catch (e) { console.error("terminarPartidaSala", e); }
}

export interface PartidaPublicada { id: string; version: number; estado: Record<string, unknown>; terminada: boolean }

/** La partida más reciente de la sala (la que se está jugando o la última que terminó). */
export async function partidaDeSala(sala: Sala): Promise<PartidaPublicada | null> {
  if (!cliente) return null;
  try {
    const { data, error } = await cliente.from("partidas").select("id, version, estado_publico, terminada")
      .eq("evento", sala.id).order("creada", { ascending: false }).limit(1);
    if (error || !data?.[0]) return null;
    const p = data[0];
    return { id: p.id, version: p.version, estado: p.estado_publico as Record<string, unknown>, terminada: !!p.terminada };
  } catch (e) { console.error("partidaDeSala", e); return null; }
}

/** Mi dato secreto en esa partida (palabra, rol, pregunta, mi mano). Solo lo puede leer su dueño. */
export async function miSecreto(partida: string): Promise<Record<string, unknown> | null> {
  if (!cliente) return null;
  try {
    const uid = await uidActual();
    const { data, error } = await cliente.from("datos_privados").select("datos").eq("partida", partida).eq("jugador", uid ?? "").maybeSingle();
    if (error) return null;
    return (data?.datos as Record<string, unknown>) ?? null;
  } catch (e) { console.error("miSecreto", e); return null; }
}
