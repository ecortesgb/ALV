// Lo que cualquier aparato puede decir de la partida usando solo la vista pública.
import { JUEGOS } from "../../content/catalogo";
import type { VistaPublica } from "../../engine/vistas";

export type Publico = VistaPublica & { reloj: { fin: number; total: number } | null; /** P-03: cuándo vence la espera por quien no contesta (null: no hay espera). */ espera?: { fin: number } | null };
export const esPublico = (e: Record<string, unknown> | null | undefined): e is Publico & Record<string, unknown> =>
  !!e && typeof e.juegoId === "string" && Array.isArray(e.jugadores) && typeof e.fase === "string";

export const nombreJuego = (id: string) => JUEGOS.find(j => j.id === id)?.nombre ?? "Partida";
export const nombreDe = (v: Publico, id?: string) => v.jugadores.find(j => j.id === id)?.nombre ?? "Alguien";
const lista = (ns: string[]) => (ns.length <= 1 ? ns.join("") : ns.slice(0, -1).join(", ") + " y " + ns.at(-1));

/** Qué se le pide a la mesa en esta ronda. */
export function instruccion(v: Publico): string {
  const turno = nombreDe(v, v.turnoDe);
  switch (v.motor) {
    case "turnos-cartas": return `Turno de ${turno}: ${v.carta?.tipo === "reto" ? "reto" : "verdad"}`;
    case "botella": return `${nombreDe(v, v.seleccion?.pregunta as string)} le pregunta a ${turno}`;
    case "ruleta": return `La ruleta eligió a ${turno}`;
    case "dados": return `Tiran los dados: ${turno} y ${nombreDe(v, v.seleccion?.a as string)}`;
    case "votacion": return "Elijan en secreto en su celular";
    case "rol-secreto": return "Digan una pista por turno y voten al impostor";
    case "pareja": return "Cada pareja contesta en secreto";
    case "conteo": return `Turno de ${turno}`;
    case "confesion": return "Yo nunca… ¿o sí? Contesten en su celular";
    case "senalar": return "Señalen a alguien en su celular";
    case "competencia": return "Compitan. El anfitrión marca quién ganó";
  }
}

/** Lo que pasó en la ronda, ya revelada. Titular y detalle. */
export function desenlace(v: Publico): { titular: string; detalle?: string } {
  const r = (v.revelado ?? {}) as Record<string, unknown>;
  if (r.saltada) return { titular: "Ronda saltada", detalle: "Nadie suma puntos." };
  switch (v.motor) {
    case "turnos-cartas": case "botella": case "ruleta": case "dados":
      return r.cumplio ? { titular: `¡${nombreDe(v, r.jugador as string)} cumplió!` } : { titular: `${nombreDe(v, r.jugador as string)} no cumplió`, detalle: "Sin puntos esta vez." };
    case "votacion": {
      const c = r.cuenta as { a: number; b: number } | undefined;
      if (!c) return { titular: "¡Se revelan las elecciones!" };
      return r.mayoria ? { titular: `Gana ${r.mayoria === "a" ? v.carta?.texto : v.carta?.opcionB}`, detalle: `${c.a} contra ${c.b}` } : { titular: "Empate", detalle: `${c.a} contra ${c.b}. Nadie suma.` };
    }
    case "rol-secreto":
      return { titular: r.atrapado ? `¡Atraparon a ${nombreDe(v, r.impostor as string)}!` : `${nombreDe(v, r.impostor as string)} era el impostor y escapó`, detalle: `La palabra era «${String(r.palabra ?? "")}»` };
    case "pareja": {
      const res = (r.resultados ?? []) as { pareja: [string, string]; coinciden: boolean }[];
      const ok = res.filter(x => x.coinciden).map(x => `${nombreDe(v, x.pareja[0])} y ${nombreDe(v, x.pareja[1])}`);
      return ok.length ? { titular: "¡Coincidieron!", detalle: lista(ok) } : { titular: "Nadie coincidió" };
    }
    case "conteo": return { titular: `${nombreDe(v, r.jugador as string)} logró ${String(r.logro ?? 0)}` };
    case "confesion": {
      const c = ((r.confesaron ?? []) as string[]).map(j => nombreDe(v, j));
      return c.length ? { titular: "Confesaron", detalle: lista(c) } : { titular: "Nadie lo ha hecho" };
    }
    case "senalar": return { titular: lista(((r.elegidos ?? []) as string[]).map(j => nombreDe(v, j))), detalle: "La mesa los señaló" };
    case "competencia": return { titular: `¡Ganó ${nombreDe(v, r.ganador as string)}!`, detalle: "+3 puntos" };
  }
}

/** Marcador de mayor a menor, con el lugar (los empates comparten lugar). */
export function marcador(v: Publico): { id: string; nombre: string; puntos: number; lugar: number }[] {
  const orden = [...v.jugadores].sort((a, b) => (v.puntos[b.id] ?? 0) - (v.puntos[a.id] ?? 0));
  let lugar = 0, previo: number | null = null;
  return orden.map((j, i) => { const p = v.puntos[j.id] ?? 0; if (p !== previo) { lugar = i + 1; previo = p; } return { id: j.id, nombre: j.nombre, puntos: p, lugar }; });
}

/** Segundos que le quedan al reloj de la ronda (0 si no hay). */
export const quedan = (v: Publico, ahora = Date.now()) => (v.reloj ? Math.max(0, (v.reloj.fin - ahora) / 1000) : 0);
