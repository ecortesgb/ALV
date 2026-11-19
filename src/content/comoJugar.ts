// «Cómo jugar» (Maestro v1.44): láminas que explican un juego antes de la primera ronda.
// Solo datos. Los juegos sin láminas propias se explican con sus reglas (content/reglas.ts).
import { JUEGOS } from "./catalogo";
import { REGLAS } from "./reglas";
import type { Modalidad } from "../engine/types";
import { VR_PUNTOS } from "../engine/partida";

export interface Lamina { titulo: string; texto: string; icono?: string }

const PROPIAS: Record<string, Lamina[]> = {
  "verdad-reto": [
    { titulo: "Quién pregunta", texto: "La herramienta (en orden, reloj, dados, cartas de póker o ruleta) decide quién pregunta y quién responde.", icono: "🎲" },
    { titulo: "Verdad o reto", texto: "Quien responde elige: Verdad (contestar una pregunta) o Reto (hacer una actividad). Verdad solo se puede elegir una vez en toda la partida.", icono: "🔥" },
    { titulo: "La pregunta", texto: "Quien pregunta decide: que ALV la dé en la pantalla o decirla en voz alta, de su cabeza.", icono: "💡" },
    { titulo: "Responder, hacerlo o tomar", texto: "Si no quieres, toma algo (lo que tú quieras). También da puntos, aunque menos. Con un comodín puedes pasar sin tomar.", icono: "🥤" },
    { titulo: "Puntos", texto: `Verdad cumplida: +${VR_PUNTOS.verdad}. Reto cumplido: +${VR_PUNTOS.reto}. Tomar: +${VR_PUNTOS.tomar}. Pasar con comodín: 0. Quien pregunta califica.`, icono: "⭐" },
  ],
  impostor: [
    { titulo: "La palabra secreta", texto: "Todos reciben la misma palabra en su celular… menos los impostores. Mantén el dedo en el lector para verla.", icono: "🤫" },
    { titulo: "Por turnos", texto: "Cuando te toque, di en voz alta una palabra que tenga que ver y escríbela en tu pizarrón. ¡Sin decir la secreta!", icono: "✍️" },
    { titulo: "A votar", texto: "Al terminar la vuelta, todos votan quién creen que es impostor. El más votado sale de escena. Si hay empate, nadie sale.", icono: "🗳️" },
    { titulo: "¿Quién gana?", texto: "Si atrapan a todos los impostores, ganan los civiles. Si los impostores igualan a los civiles, ganan ellos.", icono: "🏆" },
    { titulo: "Puntos", texto: "Votar por un impostor: +1. Impostor que sobrevive una votación: +1. Al final: +2 a cada civil si ganan, o +3 a cada impostor.", icono: "⭐" },
  ],
};

const GANA: Record<Modalidad, string> = {
  individual: "Gana la persona con más puntos.",
  parejas: "Los puntos se suman por pareja. Gana la pareja con más puntos.",
  equipos: "Los puntos se suman por equipo. Gana el equipo con más puntos.",
  sexos: "Ellas contra ellos: los puntos se suman por bando. Gana el bando con más puntos.",
};

/** Láminas de un juego, con una última lámina sobre cómo se gana según el tipo de partida. */
export function laminas(juegoId: string, modalidad: Modalidad = "individual"): Lamina[] {
  const j = JUEGOS.find(x => x.id === juegoId);
  if (!j?.motor) return [];
  const propias = PROPIAS[juegoId];
  const r = REGLAS[j.motor];
  const base = propias ?? [
    { titulo: "De qué se trata", texto: r.objetivo, icono: "🎯" },
    { titulo: "Puntos", texto: r.puntos.join(". ") + ".", icono: "⭐" },
    { titulo: "¿Quién gana?", texto: r.gana, icono: "🏆" },
  ];
  if (modalidad === "individual") return base;
  // Con tipo de partida, la última lámina dice cómo se suma por grupo.
  return [...(propias ? base : base.slice(0, -1)), { titulo: "Por grupos", texto: GANA[modalidad], icono: "👥" }];
}
