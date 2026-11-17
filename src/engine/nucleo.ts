// Núcleo del motor de la sala, sin React, sin navegador y sin Supabase: se puede correr en el navegador o en Deno
// (Edge Function, Fase 1 del motor en el servidor). Antes vivía dentro de roles/pantalla/motor.ts; ese archivo lo
// reexporta y conserva solo lo que necesita el navegador (useMotor, timers, enlace con la base).
// Las reglas no se cambian aquí: siguen en partida.ts y vistas.ts. Este archivo solo traduce filas guardadas a
// acciones, reconstruye la partida, arma lo que se publica y calcula las señales del reloj lógico.
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida, type Accion, type EstadoPartida } from "./partida";
import type { Configuracion } from "./types";
import { vistaJugador, vistaPublica } from "./vistas";

/** Misma forma que la fila de `servicios/enlace.ts` (se repite aquí para no depender de servicios). */
export type TipoFila = "contestar" | "carta" | "pista" | "control";
export interface FilaAccion { id: string; jugador: string; tipo: TipoFila; datos: Record<string, unknown>; creada: string }

export interface Arranque { semilla: number; juego: string; rondas: number; cfg: Configuracion }
export const SUSPENSO_MS = 2000;
/** P-03: sin respuesta de alguien, a los 20 s el anfitrión elige esperar o seguir sin él. «Esperar» rearma el mismo intervalo. */
export const ESPERA_MS = 20000;
export const CONTROL_SIMPLE = new Set(["pausar", "reanudar", "saltar", "seguir-sin", "esperar", "revelar", "siguiente", "terminar", "ruleta"]);

/** Parejas por orden de llegada (1 con 2, 3 con 4…). Solo si son pares. */
export function conParejas(miembros: { id: string; nombre: string }[]) {
  return miembros.map((m, i) => ({ id: m.id, nombre: m.nombre, ...(miembros.length % 2 === 0 ? { parejaDe: miembros[i % 2 === 0 ? i + 1 : i - 1]!.id } : {}) }));
}

/**
 * Configuración y arranque de una partida. La semilla la pone quien llama (el navegador hoy, el servidor después).
 * Devuelve null si el juego no corre en el motor o faltan jugadores.
 */
export function armarArranque(miembros: { id: string; nombre: string }[], juego: string, rondas: number, intensidad: 1 | 2 | 3 | 4, semilla: number): Arranque | null {
  const def = JUEGOS.find(j => j.id === juego);
  if (!def?.motor || miembros.length < def.minJugadores) return null;
  const cfg: Configuracion = {
    jugadores: conParejas(miembros), lugar: "cualquiera", intensidad: Math.max(def.intensidadMin, Math.min(def.intensidadMax, intensidad)) as 1 | 2 | 3 | 4,
    dificultad: 2, adulto: intensidad >= 3 || !!def.adulto, drunk: intensidad >= 2, turno: "orden",
  };
  return { semilla, juego, rondas: Math.max(3, Math.min(20, rondas)), cfg };
}

/** Traduce una fila guardada a una acción del motor. Lo de control solo vale si lo mandó quien tiene el control. */
export function aAccion(f: FilaAccion, controlan: string[]): Accion | null {
  const d = f.datos, id = f.id;
  if (f.tipo === "contestar") return { id, tipo: "contestar", jugador: f.jugador, valor: d.valor };
  if (f.tipo === "carta" && typeof d.carta === "string") return { id, tipo: "usar-carta", jugador: f.jugador, carta: d.carta };
  if (f.tipo === "pista" && typeof d.texto === "string") return { id, tipo: "pista", jugador: f.jugador, texto: d.texto };
  if (f.tipo !== "control" || !controlan.includes(f.jugador)) return null;
  const que = String(d.que ?? "");
  if (CONTROL_SIMPLE.has(que)) return { id, tipo: que } as Accion;
  if (que === "xp-reto" && typeof d.jugador === "string" && typeof d.xp === "number") return { id, tipo: "xp-reto", jugador: d.jugador, xp: d.xp };
  if (que === "pasar-control" && typeof d.jugador === "string") return { id, tipo: "pasar-control", jugador: d.jugador };
  return null;
}

/** Reconstruye la partida con su arranque y sus acciones en orden. Sin arranque válido devuelve null. */
export function reconstruir(filas: FilaAccion[], anfitrion: string): EstadoPartida | null {
  const a = filas.find(f => f.tipo === "control" && f.jugador === anfitrion && f.datos.que === "arranque");
  if (!a) return null;
  const d = a.datos as unknown as Arranque & { que: string };
  const def = JUEGOS.find(j => j.id === d.juego);
  if (!def?.motor || typeof d.semilla !== "number" || !Array.isArray(d.cfg?.jugadores)) return null;
  let e: EstadoPartida = { ...crearPartida(def, d.cfg, d.semilla, CONTENIDO, d.rondas), control: anfitrion };
  for (const f of filas) {
    if (f === a) continue;
    const acc = aAccion(f, [anfitrion, e.control ?? anfitrion]);
    if (acc) e = aplicar(e, acc, CONTENIDO);
  }
  return e;
}

/** Lo que se publica: la vista pública (con el reloj) y, por jugador, solo lo suyo. */
export function paraPublicar(e: EstadoPartida, relojFin: number | null, esperaFin: number | null = null) {
  const publico = { ...vistaPublica(e), reloj: relojFin && e.segundos ? { fin: relojFin, total: e.segundos } : null, espera: esperaFin ? { fin: esperaFin } : null };
  const privados: Record<string, unknown> = {};
  for (const j of e.cfg.jugadores) { const v = vistaJugador(e, j.id); privados[j.id] = { mio: v.mio ?? null, miRespuesta: v.miRespuesta ?? null, miMano: v.miMano }; }
  return { publico, privados };
}

/**
 * Reloj lógico: lo que el motor decide sin mirar la hora. Quien corre el motor pone la hora (Date.now en el navegador,
 * la hora del servidor después) y los temporizadores.
 * - `claveReloj`: si cambia, se rearma el reloj de la ronda (solo si `conReloj`).
 * - `listos`: todos contestaron; tras `SUSPENSO_MS` se manda «revelar» con el id `idAutoRevelar`.
 * - `hayEspera` y `claveEspera`: P-03, corre la espera de `ESPERA_MS`; si la clave cambia, se rearma.
 */
export function relojLogico(e: EstadoPartida) {
  const vp = vistaPublica(e);
  const listos = e.fase === "contestando" && !e.pausada && vp.esperados.every(j => vp.contestaron.includes(j));
  const hayEspera = e.fase === "contestando" && !e.pausada && !listos && vp.contestaron.length > 0;
  return {
    claveReloj: `${e.ronda}-${e.cambios}`,
    conReloj: !!(e.segundos && e.fase === "contestando"),
    listos,
    hayEspera,
    claveEspera: `${e.ronda}-${e.cambios}-${e.esperas ?? 0}`,
  };
}

/** Id de la revelación automática: el mismo en cada aparato, así una repetida no cuenta dos veces. */
export const idAutoRevelar = (partida: string, e: EstadoPartida) => `auto-rev-${partida.slice(0, 18)}-${e.ronda}-${e.cambios}`;
