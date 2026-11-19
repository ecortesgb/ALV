// Lo que cualquier aparato puede decir de la partida usando solo la vista pública.
import { JUEGOS } from "../../content/catalogo";
import type { VistaPublica } from "../../engine/vistas";
import type { Copas } from "../../engine/copas";
import { VR_PUNTOS } from "../../engine/partida";

export type Publico = VistaPublica & { /** Solo en la ceremonia de copas (juegoId «copas»). */ copas?: Copas; reloj: { fin: number; total: number } | null; /** Temporizador por turno (si se eligió). */ turnoReloj?: { fin: number; total: number }; /** P-03: cuándo vence la espera por quien no contesta (null: no hay espera). */ espera?: { fin: number } | null };
export const esPublico = (e: Record<string, unknown> | null | undefined): e is Publico & Record<string, unknown> =>
  !!e && typeof e.juegoId === "string" && Array.isArray(e.jugadores) && typeof e.fase === "string";

export const nombreJuego = (id: string) => (id === "copas" ? "Copas de la noche" : JUEGOS.find(j => j.id === id)?.nombre ?? "Partida");
export const nombreDe = (v: Publico, id?: string) => v.jugadores.find(j => j.id === id)?.nombre ?? "Alguien";
const lista = (ns: string[]) => (ns.length <= 1 ? ns.join("") : ns.slice(0, -1).join(", ") + " y " + ns.at(-1));

/** Qué se le pide a la mesa en esta ronda. */
export function instruccion(v: Publico): string {
  const turno = nombreDe(v, v.turnoDe);
  switch (v.motor) {
    case "turnos-cartas": {
      const vr = v.verdadReto;
      if (vr) {
        const r = nombreDe(v, vr.responde), p = nombreDe(v, vr.pregunta);
        if (vr.etapa === "elegir") return `${r} elige: ¿verdad o reto?`;
        if (vr.etapa === "fuente") return `${p} prepara ${vr.eleccion === "reto" ? "el reto" : "la pregunta"} para ${r}`;
        if (vr.etapa === "calificar") return `${r}: ${vr.eleccion === "reto" ? "haz el reto" : "responde"} o toma. ${p} califica`;
        return `${r} pasó con un comodín`;
      }
      return `Turno de ${turno}: ${v.carta?.tipo === "reto" ? "reto" : "verdad"}`;
    }
    case "botella": return `${nombreDe(v, v.seleccion?.pregunta as string)} le pregunta a ${turno}`;
    case "ruleta": return `La ruleta eligió a ${turno}`;
    case "dados": return `Tiran los dados: ${turno} y ${nombreDe(v, v.seleccion?.a as string)}`;
    case "votacion": return "Elijan en secreto en su celular";
    case "rol-secreto":
      if (v.impostor) return v.impostor.etapa === "votar" ? "¡A votar! ¿Quién es el impostor?" : `Le toca a ${turno}: dila y escríbela`;
      return "Digan una pista por turno y voten al impostor";
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
      if (v.verdadReto && typeof r.resultado === "string") {
        const quien = nombreDe(v, r.jugador as string), reto = r.eleccion === "reto";
        if (r.resultado === "cumplio") return { titular: reto ? `¡${quien} cumplió el reto!` : `¡${quien} respondió!`, detalle: `+${reto ? VR_PUNTOS.reto : VR_PUNTOS.verdad} ${reto ? "puntos" : "punto"}` };
        if (r.resultado === "tomo") return { titular: `${quien} tomó`, detalle: `+${VR_PUNTOS.tomar} ${VR_PUNTOS.tomar === 1 ? "punto" : "puntos"}` };
        if (r.resultado === "tiempo") return { titular: `Se le acabó el tiempo a ${quien}`, detalle: "Pierde el turno: sin puntos." };
        return { titular: `${quien} pasó con un comodín`, detalle: "Sin puntos esta vez." };
      }
      return r.cumplio ? { titular: `¡${nombreDe(v, r.jugador as string)} cumplió!` } : { titular: `${nombreDe(v, r.jugador as string)} no cumplió`, detalle: "Sin puntos esta vez." };
    case "votacion": {
      const c = r.cuenta as { a: number; b: number } | undefined;
      if (!c) return { titular: "¡Se revelan las elecciones!" };
      return r.mayoria ? { titular: `Gana ${r.mayoria === "a" ? v.carta?.texto : v.carta?.opcionB}`, detalle: `${c.a} contra ${c.b}` } : { titular: "Empate", detalle: `${c.a} contra ${c.b}. Nadie suma.` };
    }
    case "rol-secreto":
      if (v.impostor) return desenlaceImpostor(v);
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

/** El impostor con eliminación: qué pasó en la votación de esta vuelta (y quién ganó, si se acabó). */
export function desenlaceImpostor(v: Publico): { titular: string; detalle?: string } {
  const r = (v.revelado ?? {}) as { eliminado?: string | null; eraImpostor?: boolean; empate?: boolean; quedan?: number; fin?: "civiles" | "impostores" | null; palabra?: string; impostores?: string[] };
  if ((r as { saltada?: boolean }).saltada) return { titular: "Votación saltada", detalle: "Nadie sale en esta vuelta." };
  const palabra = r.palabra ? `La palabra era «${r.palabra}». ` : "";
  const quienes = lista((r.impostores ?? []).map(j => nombreDe(v, j)));
  const varios = (r.impostores ?? []).length > 1;
  if (r.fin === "civiles") return { titular: "¡Ganan los civiles!", detalle: `${palabra}${varios ? "Los impostores eran" : "El impostor era"} ${quienes}.` };
  if (r.fin === "impostores") {
    const sale = r.eliminado ? `${nombreDe(v, r.eliminado)} salió y ` : "";
    return { titular: varios ? "¡Ganan los impostores!" : "¡Gana el impostor!", detalle: `${sale}${varios ? "los impostores eran" : "el impostor era"} ${quienes}. ${palabra}`.trim() };
  }
  if (!r.eliminado) return { titular: "¡Empate!", detalle: "Nadie sale. Otra vuelta." };
  const nombre = nombreDe(v, r.eliminado);
  if (r.eraImpostor) return { titular: `¡${nombre} era impostor!`, detalle: r.quedan === 1 ? "Queda uno más. Otra vuelta." : `Quedan ${r.quedan ?? 0}. Otra vuelta.` };
  return { titular: `${nombre} no era el impostor`, detalle: "Sale de escena. El impostor sigue entre ustedes." };
}
