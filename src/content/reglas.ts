// Reglas claras de cada mecánica, escritas a partir de cómo puntúa el motor (engine/partida.ts).
// Si cambia la puntuación del motor, se cambia aquí también.
import type { Motor } from "../engine/types";

export interface Reglas { objetivo: string; puntos: string[]; gana: string }

export const REGLAS: Record<Motor, Reglas> = {
  "turnos-cartas": {
    objetivo: "Una herramienta elige quién pregunta y quién responde. Quien responde elige Verdad (solo una vez) o Reto; quien pregunta la saca de ALV o la dice en voz alta y califica.",
    puntos: ["Verdad cumplida: +1 punto", "Reto cumplido: +2 puntos (y cuenta como reto para tu XP)", "Tomar en vez de cumplir: +1 punto", "Pasar con comodín: 0"],
    gana: "Quien junte más puntos al terminar las rondas.",
  },
  botella: {
    objetivo: "El reloj elige quién pregunta y quién responde una verdad.",
    puntos: ["Responder: +1 punto", "Pasar: 0, sin castigo"],
    gana: "Quien junte más puntos al terminar las rondas.",
  },
  ruleta: {
    objetivo: "La ruleta elige a alguien y le toca un castigo divertido.",
    puntos: ["Cumplir el castigo: +1 punto", "Pasar: 0, sin castigo"],
    gana: "Quien junte más puntos al terminar las rondas.",
  },
  dados: {
    objetivo: "Por turnos, cada quien tira los dados con su pareja: acción, zona y tiempo.",
    puntos: ["Cumplir: +1 punto", "Pasar: 0, sin castigo"],
    gana: "Quien junte más puntos al terminar las rondas.",
  },
  votacion: {
    objetivo: "Sale un «¿Qué prefieres?». Cada quien elige A o B en secreto y se revela al mismo tiempo.",
    puntos: ["Con 3 o más: elegir lo mismo que la mayoría, +1", "Con empate entre A y B, nadie suma", "Con 2: adivinar lo que eligió tu rival, +1", "Opcional: la minoría bebe algo (lo que quiera, agua vale). No da puntos"],
    gana: "Quien junte más puntos al terminar las rondas.",
  },
  "rol-secreto": {
    objetivo: "Todos ven la palabra secreta menos los impostores. Por turnos, cada quien dice una palabra que tenga que ver, sin decir la secreta, y al final de la vuelta todos votan.",
    puntos: ["Votar por un impostor: +1", "Impostor que sobrevive una votación: +1", "Al final: +2 a cada civil si ganan o +3 a cada impostor (en la nave, +3 y +5)", "El más votado sale. Con empate, nadie sale"],
    gana: "Quien junte más puntos al terminar.",
  },
  pareja: {
    objetivo: "En cada pareja, uno contesta sobre sí y el otro adivina, sin verse. Luego los dos ven ambas respuestas y marcan si coinciden.",
    puntos: ["Si los dos marcan que coinciden: +2 a cada uno", "Si no: 0", "Si no se ponen de acuerdo, decide el anfitrión"],
    gana: "La pareja que más coincida.",
  },
  conteo: {
    objetivo: "Contra reloj: di, describe o actúa todas las que puedas antes de que se acabe el tiempo.",
    puntos: ["Cada una que logres: +1 punto"],
    gana: "Quien junte más puntos al terminar las rondas.",
  },
  confesion: {
    objetivo: "Sale un «Yo nunca…». Quien sí lo haya hecho, lo confiesa y bebe algo (lo que quiera, agua vale).",
    puntos: ["No da puntos: es para platicar", "Al terminar, cada quien gana la XP y las monedas de la partida según las rondas jugadas"],
    gana: "Nadie: no hay podio.",
  },
  senalar: {
    objetivo: "«¿Quién es más probable que…?». Todos señalan en secreto y se revela al mismo tiempo.",
    puntos: ["Coincidir con la mayoría: +1 punto", "Si empatan los más votados, todos ellos cuentan como mayoría", "Puedes votar por ti"],
    gana: "Quien mejor conozca al grupo.",
  },
  competencia: {
    objetivo: "Una competencia real del lugar. El anfitrión marca quién ganó cada ronda.",
    puntos: ["Ganar la ronda: +3 puntos", "Empate: +1 a cada quien empató", "Nadie ganó: 0"],
    gana: "Quien gane más rondas.",
  },
  fisico: {
    objetivo: "Retos en persona. ALV sugiere uno por ronda (se puede cambiar) y el administrador usa dados, ruleta, carta, orden, palabra, pregunta o cronómetro.",
    puntos: ["El administrador da o quita de 1 a 5 puntos a quien quiera, cuando quiera", "Quien termina la ronda con puntos a favor cumple un reto (cuenta para tu XP)"],
    gana: "Quien junte más puntos al terminar las rondas (o el grupo, según el modo de juego).",
  },
};

/** Reglas propias de un juego cuando no son las de su mecánica (Mímica y Descríbelo comparten mecánica con Lista relámpago). */
export const REGLAS_JUEGO: Record<string, Reglas> = {
  mimica: {
    objetivo: "Por turnos, quien actúa ve las palabras en su celular y las representa sin hablar. Los demás gritan la respuesta.",
    puntos: ["Cada palabra adivinada: +1 a quien actúa y +1 a quien la adivinó", "Quien actúa marca en su celular quién adivinó cada una"],
    gana: "Quien junte más puntos al terminar las rondas.",
  },
  prohibida: {
    objetivo: "Por turnos, quien describe ve la palabra y 3 palabras tachadas que no puede decir. Los demás adivinan.",
    puntos: ["Cada palabra adivinada: +1 a quien describe y +1 a quien la adivinó", "Si dice una tachada, esa palabra se pierde: 0"],
    gana: "Quien junte más puntos al terminar las rondas.",
  },
};

/** Reglas de un juego: las suyas si las tiene, o las de su mecánica. */
export const reglasDe = (j: { id: string; motor: Motor }): Reglas => REGLAS_JUEGO[j.id] ?? REGLAS[j.motor];

/** Cómo se gana la XP en cualquier juego (resumen de engine/economia.ts). */
export const REGLAS_XP = [
  "Terminar la partida: +20 XP, más +2 por ronda",
  "Cada reto cumplido: +3 XP",
  "1.º, 2.º y 3.º lugar: +15, +10 y +5 XP",
  "La partida cuenta para XP desde 5 rondas",
];
