// Comodines de la colección en la partida (Elías, 27 nov, Maestro v1.72).
// Primera tanda: 8 comodines que sirven en Verdad o reto y en los juegos por turno. Los de castigo, mesero y trampa
// esperan a los juegos que tienen esas mecánicas. Los comodines solo salen de sobres o de la colección (no se ganan).
import type { Motor } from "../engine/types";

export type IdComodinPartida = "turno" | "escudo" | "cambio" | "dos-caminos" | "rebaja" | "segundo-intento" | "prorroga" | "suerte";

/** Qué hace cada uno en la partida (texto corto para el botón del celular). */
export const EFECTO_EN_PARTIDA: Record<IdComodinPartida, string> = {
  turno: "Pasas sin cumplir ni tomar. 0 puntos.",
  escudo: "Te salvas de cumplir o tomar. 0 puntos.",
  cambio: "La app te da otra carta.",
  "dos-caminos": "La app te muestra dos cartas y tú eliges una.",
  rebaja: "Tu reto se hace a la mitad: la mitad del tiempo o de las repeticiones.",
  "segundo-intento": "Si no lo cumples, lo intentas una vez más.",
  prorroga: "Tu turno tiene 30 segundos más.",
  suerte: "Al azar: tu reto se suaviza, se duplica, se anula, pasa a otra persona o lo hace toda la mesa.",
};

export const COMODINES_PARTIDA = Object.keys(EFECTO_EN_PARTIDA) as IdComodinPartida[];

/** Juegos donde ya se pueden usar: Verdad o reto, Dados HOT y los juegos por turno con carta. En Dados HOT todo es de
 * contacto entre la pareja: la suerte nunca lo pasa a otra persona ni a toda la mesa. */
export const MOTORES_CON_COMODINES: Motor[] = ["turnos-cartas", "botella", "ruleta", "dados"];

/** Segundos que agrega la Prórroga. */
export const PRORROGA_S = 30;

/** Resultados del sorteo de ¿Voy a tener suerte?, todos con la misma probabilidad. */
export type Suerte = "suaviza" | "duplica" | "anula" | "pasa" | "mesa";
export const SUERTES: Suerte[] = ["suaviza", "duplica", "anula", "pasa", "mesa"];
export const TEXTO_SUERTE: Record<Suerte, string> = {
  suaviza: "¡Se suaviza! Se hace a la mitad.",
  duplica: "¡Se duplica! Se hace dos veces y vale el doble.",
  anula: "¡Se anula! Pasas sin cumplir ni tomar.",
  pasa: "¡Pasa a otra persona!",
  mesa: "¡Lo hace toda la mesa!",
};

export const esComodinPartida = (id: unknown): id is IdComodinPartida => typeof id === "string" && (COMODINES_PARTIDA as string[]).includes(id);
