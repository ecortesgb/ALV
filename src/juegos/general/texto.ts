// Lo que cualquier aparato puede decir de la partida usando solo la vista pública.
import { RISA } from "../../content/risa";
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
    case "pareja":
      if (v.pareja?.porDecidir.length) return "Una pareja no se puso de acuerdo: decide el anfitrión";
      return v.pareja ? "¿Coinciden? Cada pareja lo marca en su celular" : "Cada pareja contesta en secreto";
    case "conteo": return `Turno de ${turno}`;
    case "confesion": return "Yo nunca… ¿o sí? Contesten en su celular";
    case "senalar": return "Señalen a alguien en su celular";
    case "competencia": return "Compitan. El anfitrión marca quién ganó";
    case "fisico": {
      const r = RISA[v.juegoId];
      if (!r) return "Hagan el reto en persona. El administrador da los puntos";
      return r.turno && v.turnoDe ? `${r.turno.rol}: ${nombreDe(v, v.turnoDe)}` : "Juegan todos. El administrador da los puntos";
    }
  }
}

/** Juego físico: «+2 Ana · −1 Beto» con lo que se dio en la ronda (lo más alto primero). */
export function resumenDeltas(v: Publico, deltas: Record<string, number> | undefined): string {
  const xs = Object.entries(deltas ?? {}).filter(([, d]) => d !== 0).sort((a, b) => b[1] - a[1]);
  return xs.map(([j, d]) => `${d > 0 ? "+" : "−"}${Math.abs(d)} ${nombreDe(v, j)}`).join("  ·  ");
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
      // Dados HOT (Maestro v1.72): decir que no resta 1; con Drunk se toma algo y queda en 0; con comodín no resta.
      if (v.motor === "dados" && typeof r.resultado === "string") {
        const quien = nombreDe(v, r.jugador as string);
        if (r.resultado === "cumplio") return { titular: `¡${quien} cumplió!`, detalle: v.efectos?.duplica ? "+2 puntos (doble)" : "+1 punto" };
        if (r.resultado === "tomo") return { titular: `${quien} tomó algo`, detalle: "Sin puntos esta vez." };
        if (r.resultado === "comodin") return { titular: `${quien} pasó con un comodín`, detalle: "Sin puntos esta vez." };
        return { titular: `${quien} no lo hizo`, detalle: "−1 punto" };
      }
      return r.cumplio ? { titular: `¡${nombreDe(v, r.jugador as string)} cumplió!` } : { titular: `${nombreDe(v, r.jugador as string)} no cumplió`, detalle: "Sin puntos esta vez." };
    case "votacion": {
      const c = r.cuenta as { a: number; b: number } | undefined;
      if (!c) return { titular: "¡Se revelan las elecciones!" };
      if (!r.mayoria) return { titular: "Empate", detalle: `${c.a} contra ${c.b}. Nadie suma.` };
      const beben = ((r.beben ?? []) as string[]).map(j => nombreDe(v, j));
      return { titular: `Gana ${r.mayoria === "a" ? v.carta?.texto : v.carta?.opcionB}`, detalle: `${c.a} contra ${c.b}${beben.length ? `. Bebe algo: ${lista(beben)}` : ""}` };
    }
    case "rol-secreto":
      if (v.impostor) return desenlaceImpostor(v);
      return { titular: r.atrapado ? `¡Atraparon a ${nombreDe(v, r.impostor as string)}!` : `${nombreDe(v, r.impostor as string)} era el impostor y escapó`, detalle: `La palabra era «${String(r.palabra ?? "")}»` };
    case "pareja": {
      const res = (r.resultados ?? []) as { pareja: [string, string]; coinciden: boolean }[];
      const ok = res.filter(x => x.coinciden).map(x => `${nombreDe(v, x.pareja[0])} y ${nombreDe(v, x.pareja[1])}`);
      return ok.length ? { titular: "¡Coincidieron!", detalle: lista(ok) } : { titular: "Nadie coincidió" };
    }
    case "conteo": {
      const titular = `${nombreDe(v, r.jugador as string)} logró ${String(r.logro ?? 0)}`;
      if (!Array.isArray(r.adivinos)) return { titular };
      // Mímica y Descríbelo: quién adivinó cuántas (+1 cada una) y las que se perdieron por una tachada.
      const cuenta = new Map<string, number>();
      for (const a of r.adivinos as string[]) cuenta.set(a, (cuenta.get(a) ?? 0) + 1);
      const quienes = [...cuenta].map(([a, n]) => `${nombreDe(v, a)} +${n}`);
      const tach = Number(r.tachadas ?? 0);
      const partes = [quienes.length ? `Adivinaron: ${quienes.join(", ")}` : "Nadie adivinó", tach ? `${tach} ${tach === 1 ? "perdida" : "perdidas"} por decir una tachada` : ""].filter(Boolean);
      return { titular, detalle: partes.join(". ") };
    }
    case "confesion": {
      const c = ((r.confesaron ?? []) as string[]).map(j => nombreDe(v, j));
      return c.length ? { titular: "Confesaron", detalle: `${lista(c)}: ${c.length === 1 ? "bebe" : "beben"} algo (lo que quieran)` } : { titular: "Nadie lo ha hecho", detalle: "Nadie bebe esta vez." };
    }
    case "senalar": return { titular: lista(((r.elegidos ?? []) as string[]).map(j => nombreDe(v, j))), detalle: "La mesa los señaló" };
    case "competencia":
      if (r.nadie) return { titular: "Nadie ganó", detalle: "Sin puntos esta vez." };
      if (Array.isArray(r.empate)) return { titular: "¡Empate!", detalle: `${lista((r.empate as string[]).map(j => nombreDe(v, j)))}: +1 a cada quien` };
      return { titular: `¡Ganó ${nombreDe(v, r.ganador as string)}!`, detalle: "+3 puntos" };
    case "fisico": {
      const txt = resumenDeltas(v, r.deltas as Record<string, number> | undefined);
      // Juegos de risa: lo que estaba tapado (o la respuesta) sale al terminar la ronda.
      const era = typeof r.oculto === "string" ? ` · Era: «${r.oculto}»` : "";
      return txt ? { titular: "¡Ronda terminada!", detalle: txt + era } : { titular: "Ronda terminada", detalle: "Nadie sumó ni perdió puntos." + era };
    }
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
  if (v.impostor?.nave) return desenlaceNave(v, palabra, quienes, varios);
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

/** El impostor en la nave (Elías, 24 nov): textos propios de la nave; con «Guardar el secreto» no se dice si era impostor. */
function desenlaceNave(v: Publico, palabra: string, quienes: string, varios: boolean): { titular: string; detalle?: string } {
  const r = (v.revelado ?? {}) as { eliminado?: string | null; eraImpostor?: boolean; secreto?: boolean; empate?: boolean; saltos?: number; quedan?: number; fin?: "civiles" | "impostores" | null };
  const quienEra = `${varios ? "Los impostores eran" : "El impostor era"} ${quienes}.`;
  if (r.fin === "civiles") return { titular: "¡La nave está a salvo!", detalle: `${palabra}${quienEra}` };
  if (r.fin === "impostores") return { titular: varios ? "¡Los impostores se quedaron con la nave!" : "¡El impostor se quedó con la nave!", detalle: `${palabra}${quienEra}` };
  if (!r.eliminado) return { titular: "Nadie sale esta vez", detalle: r.empate && (r.saltos ?? 0) > 0 && !Object.values((v.revelado as { votos?: Record<string, number> }).votos ?? {}).some(n => n > (r.saltos ?? 0)) ? "Ganó «Nadie». Otra vuelta." : r.empate ? "Hubo empate. Otra vuelta." : "Nadie votó. Otra vuelta." };
  const nombre = nombreDe(v, r.eliminado);
  if (r.secreto) return { titular: `¡${nombre} salió volando!`, detalle: "Si era impostor, se sabrá al final. Otra vuelta." };
  if (r.eraImpostor) return { titular: `¡${nombre} salió volando y era impostor!`, detalle: r.quedan === 1 ? "Queda 1 impostor a bordo. Otra vuelta." : `Quedan ${r.quedan ?? 0} impostores a bordo. Otra vuelta.` };
  return { titular: `¡${nombre} salió volando!`, detalle: `Era civil. ${r.quedan === 1 ? "Queda 1 impostor" : `Quedan ${r.quedan ?? 0} impostores`} a bordo.` };
}
