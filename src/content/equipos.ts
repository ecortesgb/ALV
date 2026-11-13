// Equipos y casas para dar identidad al jugador (color de su carta y frases del juego).
// Uso privado entre amigos: nombres y colores, sin escudos ni logos oficiales.
// Si algún día la app se publica o se vende, este catálogo se cambia por equipos originales sin derechos de terceros.

export interface Equipo { id: string; nombre: string; grupo: string; c1: string; c2: string; icono: string }

export const GRUPOS_EQUIPO = [
  "Casas de Hogwarts", "Tipos Pokémon", "Superhéroes", "Star Wars", "Transformers", "Futbol",
] as const;

export const EQUIPOS: Equipo[] = [
  { id: "gryffindor", nombre: "Gryffindor", grupo: "Casas de Hogwarts", c1: "#AE0001", c2: "#EEBA30", icono: "🦁" },
  { id: "slytherin", nombre: "Slytherin", grupo: "Casas de Hogwarts", c1: "#1A472A", c2: "#AAAAAA", icono: "🐍" },
  { id: "ravenclaw", nombre: "Ravenclaw", grupo: "Casas de Hogwarts", c1: "#0E1A40", c2: "#946B2D", icono: "🦅" },
  { id: "hufflepuff", nombre: "Hufflepuff", grupo: "Casas de Hogwarts", c1: "#ECB939", c2: "#372E29", icono: "🦡" },
  { id: "fuego", nombre: "Tipo Fuego", grupo: "Tipos Pokémon", c1: "#EE8130", c2: "#F7D02C", icono: "🔥" },
  { id: "agua", nombre: "Tipo Agua", grupo: "Tipos Pokémon", c1: "#6390F0", c2: "#B6E3FF", icono: "💧" },
  { id: "planta", nombre: "Tipo Planta", grupo: "Tipos Pokémon", c1: "#7AC74C", c2: "#2F5D1E", icono: "🌿" },
  { id: "electrico", nombre: "Tipo Eléctrico", grupo: "Tipos Pokémon", c1: "#F7D02C", c2: "#3B3B3B", icono: "⚡" },
  { id: "psiquico", nombre: "Tipo Psíquico", grupo: "Tipos Pokémon", c1: "#F95587", c2: "#5A2A6B", icono: "🔮" },
  { id: "vengadores", nombre: "Vengadores", grupo: "Superhéroes", c1: "#B11313", c2: "#1F4E9C", icono: "🛡️" },
  { id: "xmen", nombre: "X-Men", grupo: "Superhéroes", c1: "#F2C200", c2: "#1D2A5C", icono: "✖️" },
  { id: "liga-justicia", nombre: "Liga de la Justicia", grupo: "Superhéroes", c1: "#0B3D91", c2: "#D4AF37", icono: "⭐" },
  { id: "jedi", nombre: "Jedi", grupo: "Star Wars", c1: "#2E86FF", c2: "#9FE870", icono: "🗡️" },
  { id: "sith", nombre: "Sith", grupo: "Star Wars", c1: "#C40000", c2: "#1A1A1A", icono: "🌑" },
  { id: "autobots", nombre: "Autobots", grupo: "Transformers", c1: "#C8102E", c2: "#1F3A93", icono: "🚛" },
  { id: "decepticons", nombre: "Decepticons", grupo: "Transformers", c1: "#5B2C83", c2: "#9BA3AF", icono: "✈️" },
  { id: "real-madrid", nombre: "Real Madrid", grupo: "Futbol", c1: "#FFFFFF", c2: "#FEBE10", icono: "⚽" },
  { id: "man-united", nombre: "Manchester United", grupo: "Futbol", c1: "#DA291C", c2: "#FBE122", icono: "⚽" },
  { id: "america", nombre: "América", grupo: "Futbol", c1: "#FFE600", c2: "#0B2A5B", icono: "🦅" },
  { id: "pumas", nombre: "Pumas", grupo: "Futbol", c1: "#0B2A5B", c2: "#C9A227", icono: "🐾" },
];

export const equipoDe = (id?: string) => EQUIPOS.find(e => e.id === id);

/** Frase para cuando alguien gana XP, con el sabor de su equipo. */
export function fraseEquipo(id: string | undefined, xp: number): string | null {
  const e = equipoDe(id);
  if (!e) return null;
  if (e.grupo === "Casas de Hogwarts") return `¡${xp} puntos para ${e.nombre}!`;
  if (e.grupo === "Futbol") return `¡Golazo para el ${e.nombre}! +${xp}`;
  if (e.id === "sith") return `El lado oscuro suma ${xp}`;
  if (e.id === "jedi") return `Que la fuerza te acompañe: +${xp}`;
  return `${e.icono} +${xp} para ${e.nombre}`;
}

/** Recompensas de equipo: se ganan al llegar al nivel (no se compran) y se pintan con los colores del equipo. */
export type AdornoEquipo = "bufanda" | "escudo" | "capa" | "marco";
export const RECOMPENSAS_EQUIPO: { id: AdornoEquipo; nombre: string; nivel: number; donde: string }[] = [
  { id: "bufanda", nombre: "Bufanda del equipo", nivel: 2, donde: "Cuello" },
  { id: "escudo", nombre: "Escudo en el pecho", nivel: 4, donde: "Pecho" },
  { id: "capa", nombre: "Capa del equipo", nivel: 6, donde: "Espalda" },
  { id: "marco", nombre: "Marco de carta animado", nivel: 8, donde: "Tu carta y tu retrato" },
];

/** ¿Puede ponerse esta recompensa? Necesita equipo y el nivel pedido. */
export function puedePonerse(adorno: AdornoEquipo, nivel: number, equipo: string | undefined): boolean {
  const r = RECOMPENSAS_EQUIPO.find(x => x.id === adorno);
  return !!r && !!equipoDe(equipo) && nivel >= r.nivel;
}
