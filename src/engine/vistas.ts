// Qué puede ver cada interfaz. La Pantalla (TV) y el Anfitrión reciben la vista pública;
// cada celular recibe además solo lo suyo. En producción el servidor arma estas vistas
// y la base de datos (RLS) impide leer lo privado de otro; esto define exactamente qué sale.
import { risaDe, conEliminacion, conPapeles, enNave, type EtapaImpostor, conVerdadReto, etapaImpostor, etapaVR, seleccionVR, etapaPareja, parejasCompletas, parejasPorDecidir, porGrupos, puntosPorEquipo, quienesContestan, comodinesUsables, objetivosComodin, type EstadoPartida } from "./partida";
import type { EscenarioId, LugarId, Modalidad } from "./types";
import { CON_OBJETIVO } from "../content/comodinesPartida";

export interface VistaPublica {
  version: number;
  juegoId: string;
  /** Mecánica y mazo: el celular los usa para saber qué herramienta mostrar. */
  motor: EstadoPartida["motor"];
  mazo?: string;
  ronda: number;
  totalRondas: number;
  fase: EstadoPartida["fase"];
  turnoDe?: string;
  /** Juegos de risa: el lugar decide el castigo (con agua o harina solo en exterior). Los demás juegos no lo mandan. */
  lugar?: LugarId;
  carta?: EstadoPartida["carta"];
  seleccion?: EstadoPartida["seleccion"];
  segundos?: number;
  /** Quién ya contestó (sin decir qué). */
  contestaron: string[];
  revelado?: unknown;
  puntos: Record<string, number>;
  /** Cuántas cartas de poder tiene cada quien (no cuáles). */
  cartasEnMano: Record<string, number>;
  cartaUsada?: EstadoPartida["cartaUsada"];
  /** Comodines de la colección (Maestro v1.72): si la partida los acepta y lo que dejaron en la ronda. */
  comodines?: boolean;
  efectos?: EstadoPartida["efectos"];
  /** Comodines que duran (v1.74): mesero, trampas que esperan y candados. */
  duraderos?: EstadoPartida["duraderos"];
  /** Dados HOT con Drunk: quien no quiere hacerlo toma algo en vez de perder el punto. */
  drunk?: boolean;
  jugadores: { id: string; nombre: string }[];
  pausada: boolean;
  /** El impostor: pistas dichas en la ronda. */
  pistas: Record<string, string>;
  xpReto: Record<string, number>;
  ruleta?: EstadoPartida["ruletaExtra"];
  /** Quién tiene el control. */
  control?: string;
  /** Quiénes deben contestar en esta ronda (para saber a quién se espera). */
  esperados: string[];
  /** Quienes no contestaron y la ronda se cerró sin ellos (solo tras «Seguir sin él»). */
  ausentes: string[];
  /** Veces que el anfitrión eligió esperar en esta ronda. */
  esperas: number;
  /** Al revelar una votación (El impostor, ¿Quién es más probable?): quién votó a quién. Antes, nada. */
  votosDe?: Record<string, string>;
  /** Escenario elegido (fondo y ambientación). Falta en partidas sin escenario. */
  escenario?: EscenarioId;
  /** Tipo de partida y sus grupos con puntos (solo parejas, equipos o guerra de sexos). */
  modalidad?: Modalidad;
  grupos?: { id: string; nombre: string; jugadores: string[]; puntos: number }[];
  /** El impostor con eliminación: cuántos impostores hay, quiénes ya salieron, en qué etapa va la vuelta y el orden para hablar. */
  impostor?: { total: number; eliminados: string[]; etapa: EtapaImpostor; orden: string[];
    /** Papeles en la mesa (Elías, 24 nov), etapa «papeles»: quiénes ya vieron su papel (sin decir cuál). */
    vistos?: string[];
    /** Papeles en la mesa: las palabras que dijo cada quien, de la primera vuelta a la actual. */
    palabras?: Record<string, string[]>;
    /** Reglas de la nave (Elías, 24 nov): se puede saltar el voto, cómo se ven los votos, si se revela al expulsar y si hay castigo. */
    nave?: { votos: "visibles" | "secretos"; revelar: boolean; castigo: boolean };
    /** Nave con votos a la vista: quién votó a quién mientras se vota («saltar» = Nadie). Con votos secretos nunca sale. */
    votosEnVivo?: Record<string, string> };
  /** El anfitrión pidió explicar las reglas («Cómo jugar») antes de la primera ronda. */
  explicar?: boolean;
  /** Segundos por turno, si el anfitrión eligió temporizador. */
  temporizador?: number;
  /** ¿Quién es más probable? con voto secreto: al revelar no sale quién votó a quién. */
  votoSecreto?: boolean;
  /** ¿Cuánto conoces a tu pareja? al calificar: lo escrito va en `seleccion.textos`; aquí, las parejas que no se pusieron
   * de acuerdo y esperan al anfitrión (por su primer integrante). */
  pareja?: { etapa: "calificar"; parejas: [string, string][]; porDecidir: string[] };
  /** Verdad o reto nuevo: quién pregunta y quién responde, en qué etapa va, qué se eligió y quién ya usó su Verdad.
   * Lo que sacó cada quien con los dados o las cartas de póker va en `seleccion` (es público). */
  verdadReto?: {
    herramienta: string; pregunta: string; responde: string; etapa: "elegir" | "fuente" | "calificar" | "listo";
    eleccion?: "verdad" | "reto"; fuente?: "app" | "voz"; verdadUsada: string[];
  };
}

export function vistaPublica(e: EstadoPartida): VistaPublica {
  return {
    version: e.version,
    juegoId: e.juegoId,
    motor: e.motor,
    mazo: e.mazo,
    ronda: e.ronda,
    totalRondas: e.totalRondas,
    fase: e.fase,
    turnoDe: e.turnoDe,
    ...(risaDe(e) ? { lugar: e.cfg.lugar } : {}),
    carta: e.carta,
    seleccion: e.seleccion,
    segundos: e.segundos,
    contestaron: Object.keys(e.respuestas),
    revelado: e.fase === "contestando" ? undefined : e.revelado,
    puntos: { ...e.puntos },
    cartasEnMano: Object.fromEntries(Object.entries(e.manos).map(([j, m]) => [j, m.length])),
    cartaUsada: e.cartaUsada,
    ...(e.cfg.comodines ? { comodines: true } : {}),
    ...(e.efectos ? { efectos: e.efectos } : {}),
    ...(e.duraderos ? { duraderos: e.duraderos } : {}),
    ...(e.motor === "dados" && e.cfg.drunk ? { drunk: true } : {}),
    jugadores: e.cfg.jugadores.map(j => ({ id: j.id, nombre: j.nombre })),
    pausada: !!e.pausada,
    pistas: { ...(e.pistas ?? {}) },
    xpReto: { ...(e.xpReto ?? {}) },
    ruleta: e.ruletaExtra,
    control: e.control,
    esperados: quienesContestan(e),
    ausentes: [...(e.ausentes ?? [])],
    esperas: e.esperas ?? 0,
    // Nave con votos secretos: al revelar solo sale el conteo, nunca quién votó a quién.
    votosDe: e.fase !== "contestando" && (e.motor === "rol-secreto" || e.motor === "senalar") && !(e.revelado as { saltada?: boolean } | undefined)?.saltada
      && !(enNave(e) && e.cfg.impostor?.votos === "secretos")
      // ¿Quién es más probable? con voto secreto (Elías, 27 nov): igual, solo el conteo.
      && !(e.motor === "senalar" && e.cfg.votoSecreto)
      ? Object.fromEntries(Object.entries(e.respuestas).map(([j, v]) => [j, String(v)])) : undefined,
    ...(e.cfg.escenario ? { escenario: e.cfg.escenario } : {}),
    ...(e.cfg.modalidad ? { modalidad: e.cfg.modalidad } : {}),
    // La pantalla de carga se quita en todos los aparatos cuando el anfitrión toca «¡Iniciar!».
    ...(e.cfg.explicar && !e.comenzada ? { explicar: true } : {}),
    // Temporizador por turno: solo en partidas que lo eligieron (las guardadas antes salen igual).
    ...(e.cfg.temporizador ? { temporizador: e.cfg.temporizador } : {}),
    ...(e.cfg.votoSecreto ? { votoSecreto: true } : {}),
    ...(e.motor === "pareja" && e.fase === "contestando" && etapaPareja(e) === "calificar" ? { pareja: { etapa: "calificar" as const, parejas: parejasCompletas(e), porDecidir: parejasPorDecidir(e) } } : {}),
    ...(conVerdadReto(e) ? { verdadReto: {
      herramienta: seleccionVR(e).herramienta, pregunta: seleccionVR(e).pregunta, responde: seleccionVR(e).responde, etapa: etapaVR(e),
      ...(e.vr?.eleccion ? { eleccion: e.vr.eleccion } : {}), ...(e.vr?.fuente ? { fuente: e.vr.fuente } : {}), verdadUsada: [...(e.verdadUsada ?? [])],
    } } : {}),
    ...(porGrupos(e) ? { grupos: puntosPorEquipo(e).map(g => ({ ...g, nombre: e.cfg.equipos?.find(x => x.id === g.equipo)?.nombre ?? g.equipo, id: g.equipo })).map(({ equipo: _, ...g }) => g) } : {}),
    ...(conEliminacion(e) ? { impostor: {
      // Cuántos impostores hay es público (lo eligió el anfitrión, ya ajustado al número de jugadores); quiénes, no.
      total: Object.values(e.privado).filter(p => (p as { rol?: string }).rol === "impostor").length,
      eliminados: [...(e.eliminados ?? [])], etapa: etapaImpostor(e), orden: [...((e.seleccion?.orden ?? []) as string[])],
      ...(enNave(e) ? {
        nave: { votos: e.cfg.impostor?.votos === "secretos" ? "secretos" as const : "visibles" as const, revelar: e.cfg.impostor?.revelar !== false, castigo: !!e.cfg.impostor?.castigo },
        ...(e.cfg.impostor?.votos !== "secretos" && e.fase === "contestando" && etapaImpostor(e) === "votar"
          ? { votosEnVivo: Object.fromEntries(Object.entries(e.respuestas).map(([j, v]) => [j, String(v)])) } : {}),
      } : {}),
      ...(conPapeles(e) ? {
        ...(e.naveEtapa === "papeles" ? { vistos: [...(e.vistos ?? [])] } : {}),
        // Vueltas cerradas + la palabra de esta vuelta (si ya la dijo).
        palabras: Object.fromEntries(e.cfg.jugadores.map(x => x.id).map(j => [j, [...(e.palabrasVueltas?.[j] ?? []), ...(e.pistas?.[j] && !e.naveEtapa ? [e.pistas[j]!] : [])]]).filter(([, l]) => (l as string[]).length > 0)),
      } : {}),
    } } : {}),
  };
}

export interface VistaJugador extends VistaPublica {
  yo: string;
  mio?: unknown;
  miRespuesta?: unknown;
  miMano: string[];
  /** Comodines que este jugador puede usar ahora mismo (el celular los cruza con su colección). */
  misComodines: string[];
  /** Comodines dirigidos que puede usar ahora: a quién puede ir cada uno. */
  misObjetivos: Record<string, string[]>;
}

export function vistaJugador(e: EstadoPartida, jugadorId: string): VistaJugador {
  const misComodines = comodinesUsables(e, jugadorId);
  const misObjetivos = Object.fromEntries(misComodines.filter(c => CON_OBJETIVO.includes(c)).map(c => [c, objetivosComodin(e, jugadorId, c)]));
  return { ...vistaPublica(e), yo: jugadorId, mio: e.privado[jugadorId], miRespuesta: e.respuestas[jugadorId], miMano: [...(e.manos[jugadorId] ?? [])], misComodines, misObjetivos };
}
