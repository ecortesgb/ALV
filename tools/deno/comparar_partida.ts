// Comparación campo por campo de la salida de la Edge Function partida-prueba contra la referencia del motor anterior
// (src/engine/nucleo.golden.json). La usan partida_prueba_test.ts (en memoria) y llamar_partida_prueba.ts (por HTTP).
import { resultados } from "../../src/engine/partida.ts";
import type { EstadoPartida } from "../../src/engine/partida.ts";
import type { FilaAccion } from "../../src/engine/nucleo.ts";
import { A, PARTIDA, RONDAS, SEMILLA, CFG } from "../../src/engine/nucleo.escenario.ts";

export interface Golden {
  filas: FilaAccion[];
  pasos: { k: number; tiempos: Record<string, unknown>; estado: Record<string, unknown>; publicar: { publico: Record<string, unknown>; privados: Record<string, unknown> } }[];
  resultados: unknown[];
}
export const leerGolden = () =>
  JSON.parse(Deno.readTextFileSync(new URL("../../src/engine/nucleo.golden.json", import.meta.url))) as Golden;

/** La entrada de la función para el mismo escenario: arranque armado por la función, el resto de filas tal cual. */
export function entradaEscenario(g: Golden) {
  const { jugadores, ...opciones } = CFG;
  return {
    juego: "impostor", jugadores, rondas: RONDAS, semilla: SEMILLA, partida: PARTIDA, anfitrion: A,
    inicio: g.filas[0]!.creada, opciones, relojFin: 1000, esperaFin: 2000, acciones: g.filas.slice(1),
  };
}

const json = (x: unknown) => JSON.parse(JSON.stringify(x)) as unknown;

/** Rutas donde a y b difieren (vacío = iguales). Compara valores tal como quedan en JSON. */
export function diferencias(a: unknown, b: unknown, ruta = ""): string[] {
  if (a === b) return [];
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return [ruta || "(raíz)"];
  if (Array.isArray(a) !== Array.isArray(b)) return [ruta];
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  const todas = new Set([...ka, ...kb]);
  const out: string[] = [];
  for (const k of todas) out.push(...diferencias((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${ruta}.${k}`));
  return out;
}

// deno-lint-ignore no-explicit-any
type Salida = { ok: boolean; filas: unknown[]; pasos: any[]; fase: string; resultados: unknown[] };

/** Compara todo. Devuelve los pasos comparados, cuántos campos y la lista de diferencias. */
export function comparar(salidaCruda: unknown, g: Golden) {
  const s = json(salidaCruda) as Salida;
  const difs: string[] = [];
  let campos = 0;
  const campo = (nombre: string, a: unknown, b: unknown) => {
    campos++;
    for (const d of diferencias(a, b)) difs.push(`${nombre}${d === "(raíz)" ? "" : d}`);
  };
  campo("filas", s.filas, g.filas);
  campo("numero de pasos", s.pasos.length, g.pasos.length);
  for (const p of g.pasos) {
    const f = s.pasos[p.k - 1];
    const n = `paso ${p.k}`;
    if (!f || f.k !== p.k) { difs.push(`${n}: falta`); continue; }
    // Estado: cada campo de primer nivel por separado (incluye puntos, retos, manos, bitácora, control).
    for (const c of new Set([...Object.keys(p.estado), ...Object.keys(f.estado)])) campo(`${n} estado.${c}`, f.estado[c], p.estado[c]);
    // Roles: lo privado de cada jugador (rol, tema, palabra).
    const rolesRef = (p.estado.privado ?? {}) as Record<string, unknown>;
    for (const j of new Set([...Object.keys(rolesRef), ...Object.keys(f.roles ?? {})])) campo(`${n} roles.${j}`, f.roles?.[j], rolesRef[j]);
    // Vista pública, campo por campo (incluye reloj y espera publicados).
    for (const c of new Set([...Object.keys(p.publicar.publico), ...Object.keys(f.vistas.publico)])) campo(`${n} publico.${c}`, f.vistas.publico[c], p.publicar.publico[c]);
    // Vista de cada jugador: mio, miRespuesta, miMano.
    for (const j of new Set([...Object.keys(p.publicar.privados), ...Object.keys(f.vistas.privados)])) {
      const a = (f.vistas.privados[j] ?? {}) as Record<string, unknown>, b = (p.publicar.privados[j] ?? {}) as Record<string, unknown>;
      for (const c of new Set([...Object.keys(a), ...Object.keys(b)])) campo(`${n} vista.${j}.${c}`, a[c], b[c]);
    }
    // Reloj lógico: claveReloj, conReloj, listos, hayEspera, claveEspera, autoRev.
    for (const c of new Set([...Object.keys(p.tiempos), ...Object.keys(f.reloj)])) campo(`${n} reloj.${c}`, f.reloj[c], p.tiempos[c]);
    // Ranking y XP del paso: la referencia solo guardó el final; en cada paso se compara contra resultados()
    // calculado sobre el estado de la referencia.
    campo(`${n} ranking`, f.ranking, json(resultados(p.estado as unknown as EstadoPartida)));
  }
  campo("fase final", s.fase, "terminada");
  campo("ranking y XP final", s.resultados, g.resultados);
  return { pasos: g.pasos.length, campos, difs };
}
