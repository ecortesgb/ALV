// Qué puede ver cada interfaz. La Pantalla (TV) y el Anfitrión reciben la vista pública;
// cada celular recibe además solo lo suyo. En producción el servidor arma estas vistas
// y la base de datos (RLS) impide leer lo privado de otro; esto define exactamente qué sale.
import type { EstadoPartida } from "./partida";

export interface VistaPublica {
  version: number;
  juegoId: string;
  ronda: number;
  totalRondas: number;
  fase: EstadoPartida["fase"];
  turnoDe?: string;
  carta?: EstadoPartida["carta"];
  /** Quién ya contestó (sin decir qué). */
  contestaron: string[];
  revelado?: unknown;
  puntos: Record<string, number>;
  jugadores: { id: string; nombre: string }[];
}

export function vistaPublica(e: EstadoPartida): VistaPublica {
  return {
    version: e.version,
    juegoId: e.juegoId,
    ronda: e.ronda,
    totalRondas: e.totalRondas,
    fase: e.fase,
    turnoDe: e.turnoDe,
    carta: e.carta,
    contestaron: Object.keys(e.respuestas),
    revelado: e.fase === "contestando" ? undefined : e.revelado,
    puntos: { ...e.puntos },
    jugadores: e.cfg.jugadores.map(j => ({ id: j.id, nombre: j.nombre })),
  };
}

export interface VistaJugador extends VistaPublica {
  yo: string;
  mio?: unknown;
  miRespuesta?: unknown;
}

export function vistaJugador(e: EstadoPartida, jugadorId: string): VistaJugador {
  return { ...vistaPublica(e), yo: jugadorId, mio: e.privado[jugadorId], miRespuesta: e.respuestas[jugadorId] };
}
