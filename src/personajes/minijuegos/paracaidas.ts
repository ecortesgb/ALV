// Paracaídas: reglas puras. Altura e impacto se miden desde los pies, sin conocer la figura.
import { azarCon, CONFIG_BALA } from "./bala";

export interface ConfigParacaidas {
  caidaMs: readonly [number, number]; velocidad: number; aperturaMs: number;
  margenMs: number; esperaJuicioMs: number; pausaMs: number;
}
export const CONFIG_PARACAIDAS: ConfigParacaidas = {
  caidaMs: [3500, 6000], velocidad: 20, aperturaMs: 400, // 3.5–6 s, decisión P2 de Codex (paracaidas-r1)
  margenMs: CONFIG_BALA.margenMs, esperaJuicioMs: CONFIG_BALA.esperaJuicioMs, pausaMs: CONFIG_BALA.pausaMs,
};
export interface Lugar { id: string; lugar: number; puntos: number }
export interface FilaRonda extends Lugar { altura: number | null }
export type Evento =
  | { tipo: "ronda"; ronda: number }
  | { tipo: "abre"; id: string }
  | { tipo: "aterriza"; id: string; altura: number }
  | { tipo: "estrella"; id: string }
  | { tipo: "puntos"; ronda: number; tabla: FilaRonda[] }
  | { tipo: "fin"; ranking: Lugar[] };
export interface EstadoParacaidas {
  cfg: ConfigParacaidas; jugadores: { id: string }[]; azar: () => number;
  fase: "espera" | "ronda" | "pausa" | "fin"; ronda: number;
  inicioRonda: number; impacto: number; finFase: number;
  aperturas: Map<string, { s: number; fin: number; altura: number }>;
  resultados: Map<string, number | null>; puntos: Map<string, number>;
}
export function crearPartida(jugadores: { id: string }[], cfg: Partial<ConfigParacaidas> = {},
  semilla: number | (() => number) = Date.now()): EstadoParacaidas {
  return {
    cfg: { ...CONFIG_PARACAIDAS, ...cfg }, jugadores: jugadores.map(j => ({ id: j.id })),
    azar: typeof semilla === "function" ? semilla : azarCon(semilla),
    fase: "espera", ronda: 0, inicioRonda: 0, impacto: 0, finFase: 0,
    aperturas: new Map(), resultados: new Map(), puntos: new Map(jugadores.map(j => [j.id, 0])),
  };
}
function abrirRonda(e: EstadoParacaidas, horaTv: number): Evento {
  e.fase = "ronda"; e.ronda++; e.inicioRonda = horaTv;
  const [min, max] = e.cfg.caidaMs;
  e.impacto = horaTv + min + Math.floor(e.azar() * (max - min));
  e.aperturas.clear(); e.resultados.clear();
  return { tipo: "ronda", ronda: e.ronda }; // Nunca anuncia la duración de la caída.
}
export function empezar(e: EstadoParacaidas, horaTv: number): Evento[] {
  return e.fase === "espera" ? [abrirRonda(e, horaTv)] : [];
}
/** Altura lógica común (pies), a 20 m/s; nunca atraviesa el piso. */
export function altura(e: EstadoParacaidas, horaTv: number): number {
  return Math.round(Math.max(0, e.impacto - Math.max(e.inicioRonda, horaTv)) * e.cfg.velocidad / 1000 * 1e10) / 1e10;
}
export function ranking(e: EstadoParacaidas): Lugar[] {
  const filas = e.jugadores.map(j => ({ id: j.id, puntos: e.puntos.get(j.id)! }));
  filas.sort((a, b) => b.puntos - a.puntos);
  return filas.map(f => ({ ...f, lugar: 1 + filas.filter(o => o.puntos > f.puntos).length }));
}
function cerrarRonda(e: EstadoParacaidas, horaTv: number): Evento[] {
  const filas = e.jugadores.map(j => ({ id: j.id, altura: e.resultados.get(j.id)! }));
  const valor = (h: number | null) => h === null ? Infinity : h;
  filas.sort((a, b) => valor(a.altura) - valor(b.altura));
  const tabla = filas.map(f => {
    const lugar = 1 + filas.filter(o => valor(o.altura) < valor(f.altura)).length;
    const puntos = f.altura === null ? 0 : filas.length - lugar + 1;
    e.puntos.set(f.id, e.puntos.get(f.id)! + puntos);
    return { ...f, lugar, puntos };
  });
  const ev: Evento[] = [{ tipo: "puntos", ronda: e.ronda, tabla }];
  if (e.ronda === 3) { e.fase = "fin"; ev.push({ tipo: "fin", ranking: ranking(e) }); }
  else { e.fase = "pausa"; e.finFase = horaTv + e.cfg.pausaMs; }
  return ev;
}
export function avanzar(e: EstadoParacaidas, horaTv: number): Evento[] {
  if (!Number.isFinite(horaTv)) return [];
  if (e.fase === "pausa" && horaTv >= e.finFase) return [abrirRonda(e, horaTv)];
  if (e.fase !== "ronda") return [];
  const ev: Evento[] = [];
  for (const j of e.jugadores) {
    if (e.resultados.has(j.id)) continue;
    const a = e.aperturas.get(j.id);
    const salva = a !== undefined && a.fin <= e.impacto + e.cfg.margenMs;
    const juicio = (salva ? a.fin : e.impacto) + e.cfg.esperaJuicioMs;
    if (horaTv < juicio) continue;
    e.resultados.set(j.id, salva ? a.altura : null);
    ev.push(salva ? { tipo: "aterriza", id: j.id, altura: a.altura } : { tipo: "estrella", id: j.id });
  }
  // Aunque todos abran pronto, deja llegar el piso y agota la espera de red antes de dar puntos.
  if (e.resultados.size === e.jugadores.length && horaTv >= e.impacto + e.cfg.esperaJuicioMs) {
    ev.push(...cerrarRonda(e, horaTv));
  }
  return ev;
}
/** La llegada cierra los juicios; la hora s decide si los 400 ms de apertura alcanzaron. */
export function abrir(e: EstadoParacaidas, id: string, s: number, llegada = s): Evento[] {
  if (!Number.isFinite(s) || !Number.isFinite(llegada)) return [];
  const ev = avanzar(e, llegada);
  if (e.fase !== "ronda" || !e.puntos.has(id) || e.aperturas.has(id) || e.resultados.has(id) ||
    s < e.inicioRonda - e.cfg.margenMs || s > llegada + e.cfg.margenMs) return ev;
  const fin = s + e.cfg.aperturaMs;
  e.aperturas.set(id, { s, fin, altura: altura(e, fin) });
  ev.push({ tipo: "abre", id }, ...avanzar(e, llegada));
  return ev;
}
