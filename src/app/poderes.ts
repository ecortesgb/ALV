// Poderes de cada jugador (Elías, 27 nov 2026): «Poderes» en la rueda (y el mando de los minijuegos) pide uno y las escenas lo
// dibujan (clip del juego + efectos). Igual que los gestos: este aparato decide los de su jugador y los avisa a la sala
// (gestosSala.ts, evento "p"); los de los demás llegan por la red. Solo es dibujo: nunca decide nada del juego.
export interface EventoPoder { jugador: string; poder: string; n: number }

/** Entre un poder y otro del mismo jugador (la escena además espera a que termine el que suena). */
export const ENFRIAR_PODER_MS = 900;
export const esPoder = (x: unknown): x is string => typeof x === "string" && /^[a-z][a-z0-9-]{0,23}$/.test(x);

const ultimos = new Map<string, { n: number; t: number }>();
const oyentes = new Set<(e: EventoPoder) => void>();
const propios = new Set<(e: EventoPoder) => void>();

/** Poder de este aparato. false si llega muy seguido o el nombre no es válido. */
export function pedirPoder(jugador: string, poder: string, ahora = Date.now()): boolean {
  if (!jugador || !esPoder(poder)) return false;
  const u = ultimos.get(jugador);
  if (u && ahora - u.t < ENFRIAR_PODER_MS) return false;
  const e: EventoPoder = { jugador, poder, n: Math.max((u?.n ?? 0) + 1, Math.floor(ahora / 100)) };
  ultimos.set(jugador, { n: e.n, t: ahora });
  oyentes.forEach(f => f(e));
  propios.forEach(f => f(e));
  return true;
}

/** Un poder que llegó por la red: se descarta si es viejo o repetido (`n` no avanza). */
export function aplicarPoderRemoto(jugador: string, poder: string, n: number, ahora = Date.now()): boolean {
  if (!jugador || !esPoder(poder) || !Number.isInteger(n) || n < 1) return false;
  const u = ultimos.get(jugador);
  if (u && n <= u.n) return false;
  ultimos.set(jugador, { n, t: ahora });
  oyentes.forEach(f => f({ jugador, poder, n }));
  return true;
}

/** Las escenas: cada poder pedido (propio o de la sala). */
export function alPedirPoder(f: (e: EventoPoder) => void): () => void { oyentes.add(f); return () => { oyentes.delete(f); }; }
/** La red: solo los que decidió este aparato. */
export function alPoderPropio(f: (e: EventoPoder) => void): () => void { propios.add(f); return () => { propios.delete(f); }; }

/** Solo para pruebas. */
export function reiniciarPoderes() { ultimos.clear(); }
