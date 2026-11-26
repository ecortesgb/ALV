// Martillazo: reglas puras. La TV elige las fases y juzga las horas traducidas a su reloj.
import { azarCon, CONFIG_BALA } from "./bala";

export interface ConfigMartillazo {
  periodosMs: readonly [number, number, number]; pausaMs: number;
  sinToqueMs: number; margenMs: number; esperaJuicioMs: number;
}
export const CONFIG_MARTILLAZO: ConfigMartillazo = {
  periodosMs: [1600, 1300, 1000], pausaMs: CONFIG_BALA.pausaMs,
  sinToqueMs: 6000, margenMs: CONFIG_BALA.margenMs, esperaJuicioMs: CONFIG_BALA.esperaJuicioMs,
};
export interface Lugar { id: string; lugar: number; puntos: number }
export type Resultado = "rompe" | "agrieta" | "rebota";
export type Evento =
  | { tipo: "intento"; intento: number }
  | { tipo: "toque"; intento: number; id: string }
  | { tipo: "puntaje"; intento: number; id: string; puntos: number; perfecto: boolean; resultado: Resultado }
  | { tipo: "sinToque"; intento: number; id: string }
  | { tipo: "fin"; ranking: Lugar[] };
export interface EstadoMartillazo {
  cfg: ConfigMartillazo; jugadores: { id: string }[]; azar: () => number;
  fase: "espera" | "intento" | "pausa" | "fin"; intento: number;
  inicioIntento: number; finFase: number; juicio: number | null;
  fases: Map<string, number>; toques: Map<string, number>; puntos: Map<string, number>;
}
export function crearPartida(jugadores: { id: string }[], cfg: Partial<ConfigMartillazo> = {},
  semilla: number | (() => number) = Date.now()): EstadoMartillazo {
  return {
    cfg: { ...CONFIG_MARTILLAZO, ...cfg }, jugadores: jugadores.map(j => ({ id: j.id })),
    azar: typeof semilla === "function" ? semilla : azarCon(semilla),
    fase: "espera", intento: 0, inicioIntento: 0, finFase: 0, juicio: null,
    fases: new Map(), toques: new Map(), puntos: new Map(jugadores.map(j => [j.id, 0])),
  };
}
function abrirIntento(e: EstadoMartillazo, ahora: number): Evento {
  e.intento++; e.fase = "intento"; e.inicioIntento = ahora; e.juicio = null;
  e.toques.clear(); e.fases.clear();
  e.jugadores.forEach(j => e.fases.set(j.id, e.azar()));
  return { tipo: "intento", intento: e.intento };
}
export function empezar(e: EstadoMartillazo, ahora: number): Evento[] {
  return e.fase === "espera" ? [abrirIntento(e, ahora)] : [];
}
/** Triángulo lineal 0 → 100 → 0. La fase es una fracción del periodo completo. */
export function posicion(e: EstadoMartillazo, id: string, horaTv: number): number {
  const periodo = e.cfg.periodosMs[e.intento - 1];
  const fase = e.fases.get(id);
  if (periodo === undefined || fase === undefined) return 0;
  const ciclos = (horaTv - e.inicioIntento) / periodo + fase;
  const vuelta = ciclos - Math.floor(ciclos);
  const p = vuelta <= 0.5 ? vuelta * 200 : (1 - vuelta) * 200;
  // Evita que 47 exacto en la bajada resulte 46.99999999999999 por coma flotante.
  return Math.round(p * 1e10) / 1e10;
}
export function ranking(e: EstadoMartillazo): Lugar[] {
  const filas = e.jugadores.map(j => ({ id: j.id, puntos: e.puntos.get(j.id) ?? 0 }));
  filas.sort((a, b) => b.puntos - a.puntos);
  return filas.map(f => ({ ...f, lugar: 1 + filas.filter(o => o.puntos > f.puntos).length }));
}
function cerrarIntento(e: EstadoMartillazo, ahora: number): Evento[] {
  const ev: Evento[] = e.jugadores.filter(j => !e.toques.has(j.id))
    .map(j => ({ tipo: "sinToque", intento: e.intento, id: j.id }));
  // Sin toque vale cero: el mejor puntaje acumulado permanece intacto.
  if (e.intento === 3) {
    e.fase = "fin"; ev.push({ tipo: "fin", ranking: ranking(e) });
  } else { e.fase = "pausa"; e.finFase = ahora + e.cfg.pausaMs; }
  return ev;
}
export function avanzar(e: EstadoMartillazo, ahora: number): Evento[] {
  if (e.fase === "pausa" && ahora >= e.finFase) return [abrirIntento(e, ahora)];
  if (e.fase !== "intento") return [];
  const limite = e.inicioIntento + e.cfg.sinToqueMs;
  if (e.juicio === null && ahora >= limite) e.juicio = limite + e.cfg.esperaJuicioMs;
  return e.juicio !== null && ahora >= e.juicio ? cerrarIntento(e, ahora) : [];
}
/** La llegada admite el mensaje; su hora real decide posición y puntaje, sin ensanchar la zona perfecta. */
export function tocar(e: EstadoMartillazo, id: string, horaTv: number, llegada = horaTv): Evento[] {
  if (!Number.isFinite(horaTv) || !Number.isFinite(llegada)) return [];
  const ev = avanzar(e, llegada);
  const limite = e.inicioIntento + e.cfg.sinToqueMs;
  if (e.fase !== "intento" || !e.puntos.has(id) || e.toques.has(id) ||
    horaTv < e.inicioIntento - e.cfg.margenMs || horaTv > limite + e.cfg.margenMs) return ev;
  e.toques.set(id, horaTv);
  const p = posicion(e, id, horaTv);
  const puntos = Math.round(100 - 2 * Math.abs(p - 50));
  e.puntos.set(id, Math.max(e.puntos.get(id)!, puntos));
  ev.push({ tipo: "toque", intento: e.intento, id }, {
    tipo: "puntaje", intento: e.intento, id, puntos, perfecto: p >= 47 && p <= 53,
    resultado: puntos >= 90 ? "rompe" : puntos >= 60 ? "agrieta" : "rebota",
  });
  if (e.toques.size === e.jugadores.length && e.juicio === null) {
    e.juicio = Math.min(llegada, limite) + e.cfg.esperaJuicioMs;
  }
  return ev;
}
