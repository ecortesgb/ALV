// «Cómo jugar» (Maestro v1.44): láminas que explican un juego antes de la primera ronda.
// Solo datos. Los juegos sin láminas propias se explican con sus reglas (content/reglas.ts).
import { ESCENARIOS, JUEGOS, LUGARES } from "./catalogo";
import { reglasDe } from "./reglas";
import { RISA } from "./risa";
import { ARTE_ESCENARIOS, ARTE_JUEGOS } from "./arteJuegos";
import type { EscenarioId, Modalidad } from "../engine/types";
import { MOTORES_PROMEDIO, VR_PUNTOS } from "../engine/partida";

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

/** Juegos de risa de ALV FÍSICO: una lámina por paso, el material, los puntos y el castigo (según el lugar, se dicen los dos). */
function laminasRisa(id: string): Lamina[] | undefined {
  const r = RISA[id];
  if (!r) return undefined;
  const iconos = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];
  return [
    ...r.pasos.map((t, i) => ({ titulo: i === 0 ? "Cómo se juega" : `Paso ${i + 1}`, texto: t, icono: iconos[i] })),
    { titulo: "Lo que necesitan", texto: r.material.join(". ") + ".", icono: "🧺" },
    { titulo: "Puntos", texto: r.puntos.join(". ") + ". El administrador los da en su celular.", icono: "⭐" },
    { titulo: "Castigo", texto: `En alberca, bosque, campo o terraza: ${r.castigo.exterior}. En interior o junto al fuego: ${r.castigo.interior}.`, icono: "💦" },
  ];
}

const GANA: Record<Modalidad, string> = {
  individual: "Gana la persona con más puntos.",
  parejas: "Los puntos se suman por pareja. Gana la pareja con más puntos.",
  equipos: "Los puntos se suman por equipo. Gana el equipo con más puntos.",
  sexos: "Ellas contra ellos: los puntos se suman por bando. Gana el bando con más puntos.",
};

/** Cómo gana el grupo: en los juegos donde todos contestan, con el promedio de sus integrantes (Elías, 27 nov, 6A). */
const ganaGrupo = (mod: Exclude<Modalidad, "individual">, motor: string) =>
  MOTORES_PROMEDIO.includes(motor as never) ? GANA[mod].replace(/se suman por (pareja|equipo|bando)/, "cuentan como el promedio de cada $1") : GANA[mod];

/** Láminas de un juego, con una última lámina sobre cómo se gana según el tipo de partida. */
export function laminas(juegoId: string, modalidad: Modalidad = "individual"): Lamina[] {
  const j = JUEGOS.find(x => x.id === juegoId);
  if (!j?.motor) return [];
  const propias = PROPIAS[juegoId] ?? laminasRisa(juegoId);
  const r = reglasDe({ id: j.id, motor: j.motor });
  const base = propias ?? [
    { titulo: "De qué se trata", texto: r.objetivo, icono: "🎯" },
    { titulo: "Puntos", texto: r.puntos.join(". ") + ".", icono: "⭐" },
    { titulo: "¿Quién gana?", texto: r.gana, icono: "🏆" },
  ];
  if (modalidad === "individual") return base;
  // Con tipo de partida, la última lámina dice cómo se suma por grupo.
  return [...(propias ? base : base.slice(0, -1)), { titulo: "Por grupos", texto: ganaGrupo(modalidad, j.motor), icono: "👥" }];
}

// ---------- Tarjetas al iniciar (pedido de Elías, ALV_PLAN_MODOS_DE_JUEGO.md §10) ----------
// Antes de la primera ronda: primero cómo se juega, luego cada herramienta elegida y al final el escenario.
// Los textos de herramientas y escenarios son PROPUESTA (los escribió Claude con lo que ya hace el motor).

/** De qué es cada tarjeta: cambia la etiqueta de arriba y la imagen. */
export type GrupoTarjeta = "juego" | "herramienta" | "escenario";
export interface Tarjeta extends Lamina { grupo: GrupoTarjeta; /** Archivo dentro de `public/arte/` (si falta, la ilustración del juego). */ imagen?: string; /** Línea corta abajo («Gana…», un consejo). */ consejo?: string }

const HERRAMIENTA: Record<string, { titulo: string; texto: string }> = {
  orden: { titulo: "En orden", texto: "Se va por turnos: responde el que sigue y pregunta el de antes. Nadie se salta." },
  reloj: { titulo: "El reloj", texto: "Dos manecillas giran: la chica marca quién pregunta y la grande quién responde. Pueden caer en vecinos." },
  dados: { titulo: "Dados", texto: "Cada quien tira un dado. El número más alto pregunta y el más bajo responde. Si empatan, decide el azar." },
  poker: { titulo: "Cartas de póker", texto: "Cada quien recibe una carta. La más alta pregunta y la más baja responde; el palo desempata." },
  ruleta: { titulo: "Ruleta", texto: "La ruleta gira y elige quién responde y quién pregunta. Puede tocarle dos veces seguidas a alguien." },
};

/** Lo que cuida el escenario (sale de las reglas de seguridad del lugar) y su ambientación. */
function tarjetaEscenario(id: EscenarioId): Tarjeta | null {
  const e = ESCENARIOS.find(x => x.id === id);
  if (!e) return null;
  const l = LUGARES.find(x => x.id === e.lugar);
  const cuida = l?.nuncaSePermite.slice(0, 3).join(", ").toLowerCase();
  const texto = [`${e.ambientacion} Salen cartas pensadas para este lugar.`,
    l?.bloqueaTrasTomar ? "Después de tomar, no hay retos en el agua." : "",
    cuida ? `Aquí no se vale: ${cuida}.` : ""].filter(Boolean).join(" ");
  return { grupo: "escenario", titulo: e.nombre, texto, icono: e.emoji, imagen: ARTE_ESCENARIOS[id] };
}

/**
 * Pantalla de carga (Elías, 24 nov): UNA tarjeta del juego (de qué se trata y cómo se gana) y después una por herramienta,
 * el temporizador y el escenario. Pasan solas mientras carga la partida.
 */
export function tarjetasCarga(o: { juegoId: string; modalidad?: Modalidad; herramienta?: string; temporizador?: number; escenario?: EscenarioId;
  /** El impostor en la nave: su propia carga (Elías, 24 nov). */
  nave?: { votos: "visibles" | "secretos"; revelar: boolean; castigo: boolean } }): Tarjeta[] {
  const j = JUEGOS.find(x => x.id === o.juegoId);
  if (!j?.motor) return [];
  if (o.nave) return [...cargaNave(o.nave), ...tarjetasInicio({ ...o, explicar: false })];
  const r = reglasDe({ id: j.id, motor: j.motor });
  const mod = o.modalidad ?? "individual";
  // Verdad o reto tiene sus 5 láminas propias: van todas en la carga (Elías, 27 nov).
  if (PROPIAS[j.id] && j.id === "verdad-reto") {
    const propias = PROPIAS[j.id]!.map((l, i, xs) => ({ ...l, grupo: "juego" as const, imagen: ARTE_JUEGOS[j.id], ...(i === xs.length - 1 ? { consejo: mod === "individual" ? r.gana : ganaGrupo(mod, j.motor ?? "") } : {}) }));
    return [...propias, ...tarjetasInicio({ ...o, explicar: false })];
  }
  const juego: Tarjeta = { grupo: "juego", titulo: j.nombre, texto: r.objetivo, consejo: mod === "individual" ? r.gana : ganaGrupo(mod, j.motor), icono: "🎯", imagen: ARTE_JUEGOS[j.id] };
  return [juego, ...tarjetasInicio({ ...o, explicar: false })];
}

/**
 * Todas las tarjetas del inicio: cómo se juega, cada herramienta (Verdad o reto) y el temporizador, y el escenario.
 * Si `explicar` está apagado, solo salen las de herramienta y escenario (las reglas ya las conocen).
 */
export function tarjetasInicio(o: { juegoId: string; modalidad?: Modalidad; explicar?: boolean; herramienta?: string; temporizador?: number; escenario?: EscenarioId }): Tarjeta[] {
  const out: Tarjeta[] = o.explicar ? laminas(o.juegoId, o.modalidad).map(l => ({ ...l, grupo: "juego" as const })) : [];
  const h = o.herramienta ? HERRAMIENTA[o.herramienta] : undefined;
  if (h) out.push({ grupo: "herramienta", ...h, icono: "🎲", imagen: `ui/configurar/herr-${o.herramienta}.webp` });
  if (o.temporizador) out.push({ grupo: "herramienta", titulo: "Temporizador", icono: "⏱️", imagen: "ui/configurar/herr-tiempo.webp",
    texto: `Cada turno dura ${o.temporizador} segundos. Si se acaba el tiempo, el turno pasa al siguiente y no suma puntos.` });
  const esc = o.escenario ? tarjetaEscenario(o.escenario) : null;
  if (esc) out.push(esc);
  return out;
}

/** Carga de El impostor en la nave: la nave, la asamblea y cómo termina (textos PROPUESTA). */
function cargaNave(n: { votos: "visibles" | "secretos"; revelar: boolean; castigo: boolean }): Tarjeta[] {
  return [
    { grupo: "juego", titulo: "El impostor", icono: "🚀", imagen: "impostor/nave-carga.webp",
      texto: "Todos a bordo reciben la misma palabra secreta, menos los impostores. Por turnos, cada quien dice una palabra que tenga que ver, sin decir la secreta.",
      consejo: "Mantén el dedo en el lector para ver tu palabra." },
    { grupo: "juego", titulo: "Asamblea en la nave", icono: "🗳️", imagen: "impostor/nave-mesa.webp",
      texto: `Al terminar la vuelta, cada quien vota en su celular quién se baja de la nave, o «Nadie». ${n.votos === "visibles" ? "Cada voto cae con el color de quien votó." : "Los votos son secretos: solo se ve cuántos tuvo cada quien."} El más votado sale volando; si hay empate, nadie sale.`,
      consejo: n.revelar ? "Al expulsar se dice si era impostor." : "Si era impostor, se sabrá hasta el final." },
    { grupo: "juego", titulo: "¿Quién gana?", icono: "🏆", imagen: "impostor/nave-ganan-civiles.webp",
      texto: "Si sacan a todos los impostores, la nave está a salvo. Si los impostores igualan a los civiles, se quedan con la nave.",
      consejo: `Votar por un impostor +1 · impostor que sobrevive una votación +1 · al final +3 a cada civil o +5 a cada impostor.${n.castigo ? " El bando que pierde recibe un castigo." : ""}` },
  ];
}

