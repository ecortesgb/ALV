// Qué puede ver cada interfaz. La Pantalla (TV) y el Anfitrión reciben la vista pública;
// cada celular recibe además solo lo suyo. En producción el servidor arma estas vistas
// y la base de datos (RLS) impide leer lo privado de otro; esto define exactamente qué sale.
import type { EstadoPartida } from "./partida";

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
