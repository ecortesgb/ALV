// Reglas claras de cada mecánica, escritas a partir de cómo puntúa el motor (engine/partida.ts).
// Si cambia la puntuación del motor, se cambia aquí también.
import type { Motor } from "../engine/types";

export interface Reglas { objetivo: string; puntos: string[]; gana: string }

export const REGLAS: Record<Motor, Reglas> = {
  "turnos-cartas": {
    objetivo: "En tu turno sale una carta de Verdad o de Reto. Cúmplela o pásala.",
    puntos: ["Verdad cumplida: +1 punto", "Reto cumplido: +2 puntos (y cuenta como reto para tu XP)", "Pasar: 0, sin castigo"],
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
    puntos: ["Con 3 o más: elegir lo mismo que la mayoría, +1", "Con 2: adivinar lo que eligió tu rival, +1"],
    gana: "Quien junte más puntos al terminar las rondas.",
  },
  "rol-secreto": {
    objetivo: "Todos ven la palabra secreta menos uno: el impostor. Den pistas sin decirla y voten.",
    puntos: ["Impostor que escapa: +3", "Votar por el impostor: +1", "Si hay empate en la votación, el impostor escapa"],
    gana: "Quien junte más puntos al terminar las rondas.",
  },
  pareja: {
    objetivo: "En cada pareja, uno contesta sobre sí y el otro adivina, sin verse.",
    puntos: ["Si coinciden: +2 a cada uno", "Si no: 0"],
    gana: "La pareja que más coincida.",
  },
  conteo: {
    objetivo: "Contra reloj: di, describe o actúa todas las que puedas antes de que se acabe el tiempo.",
    puntos: ["Cada una que logres: +1 punto"],
    gana: "Quien junte más puntos al terminar las rondas.",
  },
  confesion: {
    objetivo: "Sale un «Yo nunca…». Quien sí lo haya hecho, lo confiesa.",
    puntos: ["Confesar: +1 punto"],
    gana: "El más sincero (el que más confiese).",
  },
  senalar: {
    objetivo: "«¿Quién es más probable que…?». Todos señalan en secreto y se revela al mismo tiempo.",
    puntos: ["Coincidir con la mayoría: +1 punto"],
    gana: "Quien mejor conozca al grupo.",
  },
  competencia: {
    objetivo: "Una competencia real del lugar. El anfitrión marca quién ganó cada ronda.",
    puntos: ["Ganar la ronda: +3 puntos"],
    gana: "Quien gane más rondas.",
  },
};

/** Cómo se gana la XP en cualquier juego (resumen de engine/economia.ts). */
export const REGLAS_XP = [
  "Terminar la partida: +20 XP, más +2 por ronda",
  "Cada reto cumplido: +3 XP",
  "1.º, 2.º y 3.º lugar: +15, +10 y +5 XP",
  "La partida cuenta para XP desde 5 rondas",
];
