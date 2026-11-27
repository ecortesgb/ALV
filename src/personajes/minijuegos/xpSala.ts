// XP de los Mini-Juegos desde la sala de ALV (decisión de Elías, 27 nov 2026; migración 049).
// El celular del anfitrión de la sala, al terminar una partida, crea la partida en la sala y la termina con el podio
// que dio la TV. El servidor vuelve a revisar todo: que quien llama sea el anfitrión, que cada cuenta sea miembro de
// la sala, lugares y topes (600 XP y 300 monedas al día). Lógica pura aquí; las llamadas reciben el cliente.

/** Juego de la TV → id del juego en la base (los acepta terminar_partida_sala desde la 049). */
export const JUEGO_XP: Record<string, string> = {
  bala: "mj-bala", desenfunda: "mj-desenfunda", martillazo: "mj-martillazo", alto: "mj-alto-total", paracaidas: "mj-paracaidas",
  // ¡Al vacío! corre en la TV del cuarto (juego «cuarto»); solo hay podio cuando se jugó una partida (migración 054).
  cuarto: "mj-plataforma",
};
/** Rondas que cuenta cada minijuego para la fórmula de XP (20 + 2 por ronda + lugar): 30 XP por jugar, +15/10/5 del podio. */
export const RONDAS_XP = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const esCuenta = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export interface ResultadoXp { jugador: string; rondas: number; retos: number; lugar: number }

/**
 * Del podio de la TV (`ranking`: id del canal y lugar) y la lista de jugadores (id del canal y su cuenta) salen los
 * resultados para el servidor. Sin cuenta, o con una cuenta repetida, no cuenta. null si no hay a quién darle.
 */
export function resultadosXp(ranking: unknown, jugadores: unknown): { jugadores: number; resultados: ResultadoXp[] } | null {
  if (!Array.isArray(ranking) || !Array.isArray(jugadores)) return null;
  const cuentaDe = new Map<string, string>();
  for (const j of jugadores) {
    const x = j as { id?: unknown; cuenta?: unknown; bot?: unknown };
    if (typeof x?.id === "string" && esCuenta(x.cuenta) && !x.bot) cuentaDe.set(x.id, x.cuenta.toLowerCase());
  }
  const total = Math.min(8, ranking.length);
  if (total < 2) return null;
  const vistas = new Set<string>(), resultados: ResultadoXp[] = [];
  for (const r of ranking.slice(0, 8)) {
    const x = r as { id?: unknown; lugar?: unknown };
    const cuenta = typeof x?.id === "string" ? cuentaDe.get(x.id) : undefined;
    const lugar = typeof x?.lugar === "number" && Number.isInteger(x.lugar) ? x.lugar : 0;
    if (!cuenta || vistas.has(cuenta) || lugar < 1 || lugar > total) continue;
    vistas.add(cuenta);
    resultados.push({ jugador: cuenta, rondas: RONDAS_XP, retos: 0, lugar });
  }
  return resultados.length ? { jugadores: total, resultados } : null;
}

interface Rpc { rpc(f: string, a: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> }
interface Cliente extends Rpc {
  auth: { getSession(): PromiseLike<{ data: { session: { user: { id: string } } | null } }> };
  from(t: string): { select(c: string): { eq(c: string, v: unknown): { eq(c: string, v: unknown): { order(c: string, o: { ascending: boolean }): { limit(n: number): PromiseLike<{ data: unknown[] | null; error: unknown }> } } } } };
}

/** Mi cuenta, o null sin sesión. */
export async function miCuenta(cli: Cliente | null): Promise<string | null> {
  try { const id = (await cli?.auth.getSession())?.data.session?.user.id; return esCuenta(id) ? id : null; } catch { return null; }
}

/** La sala abierta donde soy anfitrión (la más reciente), o null. */
export async function salaDondeMando(cli: Cliente, yo: string): Promise<string | null> {
  try {
    const { data, error } = await cli.from("eventos").select("id").eq("cerrado", false).eq("anfitrion", yo)
      .order("inicia", { ascending: false }).limit(1);
    const id = (data?.[0] as { id?: unknown } | undefined)?.id;
    return !error && typeof id === "string" ? id : null;
  } catch { return null; }
}

/** Reporta el podio a la sala. Devuelve si quedó guardado. Errores al log, nunca al jugador. */
export async function reportarXp(cli: Cliente, evento: string, juegoTv: string, r: { jugadores: number; resultados: ResultadoXp[] }): Promise<boolean> {
  const juego = JUEGO_XP[juegoTv];
  if (!juego) return false;
  try {
    const p = await cli.rpc("crear_partida_sala", { p_evento: evento, p_juego: juego, p_semilla: 1, p_config: { minijuego: true } });
    if (p.error || typeof p.data !== "string") { console.warn("minijuegos xp: crear", p.error); return false; }
    const t = await cli.rpc("terminar_partida_sala", { p_partida: p.data, p_juego: juego, p_jugadores: r.jugadores, p_resultados: r.resultados });
    if (t.error) { console.warn("minijuegos xp: terminar", t.error); return false; }
    return true;
  } catch (e) { console.warn("minijuegos xp", e); return false; }
}
