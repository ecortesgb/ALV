// Qué puede ver cada interfaz. La Pantalla (TV) y el Anfitrión reciben la vista pública;
// cada celular recibe además solo lo suyo. En producción el servidor arma estas vistas
// y la base de datos (RLS) impide leer lo privado de otro; esto define exactamente qué sale.
import { quienesContestan, type EstadoPartida } from "./partida";

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
    carta: e.carta,
    seleccion: e.seleccion,
    segundos: e.segundos,
    contestaron: Object.keys(e.respuestas),
    revelado: e.fase === "contestando" ? undefined : e.revelado,
    puntos: { ...e.puntos },
    cartasEnMano: Object.fromEntries(Object.entries(e.manos).map(([j, m]) => [j, m.length])),
    cartaUsada: e.cartaUsada,
    jugadores: e.cfg.jugadores.map(j => ({ id: j.id, nombre: j.nombre })),
    pausada: !!e.pausada,
    pistas: { ...(e.pistas ?? {}) },
    xpReto: { ...(e.xpReto ?? {}) },
    ruleta: e.ruletaExtra,
    control: e.control,
    esperados: quienesContestan(e),
    ausentes: [...(e.ausentes ?? [])],
    esperas: e.esperas ?? 0,
    votosDe: e.fase !== "contestando" && (e.motor === "rol-secreto" || e.motor === "senalar") && !(e.revelado as { saltada?: boolean } | undefined)?.saltada
      ? Object.fromEntries(Object.entries(e.respuestas).map(([j, v]) => [j, String(v)])) : undefined,
  };
}

export interface VistaJugador extends VistaPublica {
  yo: string;
  mio?: unknown;
  miRespuesta?: unknown;
  miMano: string[];
}

export function vistaJugador(e: EstadoPartida, jugadorId: string): VistaJugador {
  return { ...vistaPublica(e), yo: jugadorId, mio: e.privado[jugadorId], miRespuesta: e.respuestas[jugadorId], miMano: [...(e.manos[jugadorId] ?? [])] };
}
