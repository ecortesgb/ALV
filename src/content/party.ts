// ALV PARTY (Competitivo, decisión de Elías, 27 nov 2026): los Mini-Juegos dentro de su propio configurador.
// Solo datos. Las reglas viven en src/personajes/minijuegos/*.ts y la TV en tools/personajes/minijuegos/tv-*.html.
// XP y monedas: las da el servidor con terminar_partida_sala (049) cuando el anfitrión de la sala tiene sesión.

export type IdMini = "bala" | "desenfunda" | "martillazo" | "alto" | "paracaidas" | "plataforma";

export interface Minijuego {
  id: IdMini;
  /** Id en la base (terminar_partida_sala y logros). */
  idBase: string;
  nombre: string;
  descripcion: string;
  /** Qué botón usa en el mando. */
  mando: string;
  /** Página de la TV, relativa a tools/personajes/minijuegos/. */
  tv: string;
  categoria: IdCategoria;
  /** Duración aproximada de una partida. */
  duracion: string;
  color: string;
  emoji: string;
  /** Portada (arte de Elías, 800×598) en public/arte/party/. */
  portada: string;
  /** Mini tutorial de la pantalla de carga: 3 pasos cortos. */
  tutorial: string[];
  /** Botones del mando que usa (public/arte/ui/mando/x-<b>.webp). */
  botones: BotonMando[];
  /** Si se juega solos o por equipos (la TV lo lee de ?modalidad=). Sin esto, cada quien para sí. */
  modalidades?: ModalidadParty[];
}

export type BotonMando = "a" | "b" | "rt" | "stick";
export type ModalidadParty = "solos" | "equipos";
export const MODALIDADES_PARTY: { id: ModalidadParty; nombre: string; texto: string }[] = [
  { id: "solos", nombre: "Individual", texto: "Cada quien para sí. Gana el último en pie." },
  { id: "equipos", nombre: "Equipos", texto: "Gana el último equipo con alguien en pie." },
];

export type IdCategoria = "reflejos" | "punteria" | "nervios" | "pelea";
export interface CategoriaParty { id: IdCategoria; nombre: string; texto: string; color: string }

export const CATEGORIAS_PARTY: CategoriaParty[] = [
  { id: "reflejos", nombre: "Reflejos", texto: "Gana el más rápido.", color: "#e8412c" },
  { id: "punteria", nombre: "Puntería", texto: "Gana el que atina al momento exacto.", color: "#1d8fe0" },
  { id: "nervios", nombre: "Nervios", texto: "Gana el que se aguanta.", color: "#3cb043" },
  { id: "pelea", nombre: "Pelea", texto: "Gana el último en pie.", color: "#c2185b" },
];

export const MINIJUEGOS: Minijuego[] = [
  { id: "desenfunda", idBase: "mj-desenfunda", nombre: "¡Desenfunda!", descripcion: "Dispara en cuanto salga el ¡YA! Sin adelantarte. 5 rondas.",
    mando: "Dispara", tv: "tv-desenfunda.html", categoria: "reflejos", duracion: "2 min", color: "#e8412c", emoji: "🤠",
    portada: "party/desenfunda.webp", botones: ["rt"],
    tutorial: ["Quietos: espera a que salga ¡YA! en la pantalla.", "Toca RT para disparar. Si te adelantas, quedas fuera de esa ronda.", "Son 5 rondas. Gana quien gane más duelos."] },
  { id: "bala", idBase: "mj-bala", nombre: "Esquiva la bala", descripcion: "Salta cuando pase la bala. Gana el último en pie.",
    mando: "Salta", tv: "tv-bala.html", categoria: "reflejos", duracion: "1 a 3 min", color: "#f2a900", emoji: "💥",
    portada: "party/bala.webp", botones: ["a"],
    tutorial: ["La bala cruza la pista hacia ti.", "Toca A para saltar justo cuando pase.", "Si te pega, quedas fuera. Gana el último en pie."] },
  { id: "martillazo", idBase: "mj-martillazo", nombre: "Martillazo", descripcion: "Golpea cuando la barra esté al centro. Más puntos entre más cerca.",
    mando: "Golpea", tv: "tv-martillazo.html", categoria: "punteria", duracion: "2 min", color: "#1d8fe0", emoji: "🔨",
    portada: "party/martillazo.webp", botones: ["b"],
    tutorial: ["Una barra va y viene sobre el bloque.", "Toca B para golpear cuando esté al centro.", "Entre más cerca del centro, más puntos. Gana quien sume más."] },
  { id: "paracaidas", idBase: "mj-paracaidas", nombre: "Paracaídas", descripcion: "Abre el paracaídas lo más cerca del piso sin estrellarte.",
    mando: "Abre", tv: "tv-paracaidas.html", categoria: "punteria", duracion: "2 min", color: "#7b4fd6", emoji: "🪂",
    portada: "party/paracaidas.webp", botones: ["a"],
    tutorial: ["Vas cayendo sobre la ciudad.", "Toca A para abrir el paracaídas lo más cerca del piso.", "Si no abres a tiempo, te estrellas. Gana quien abra más abajo."] },
  { id: "alto", idBase: "mj-alto-total", nombre: "Alto total", descripcion: "Mantén ¡CORRE! en verde y suelta en rojo. Llega a la meta.",
    mando: "Corre", tv: "tv-alto-total.html", categoria: "nervios", duracion: "1 min", color: "#3cb043", emoji: "🚦",
    portada: "party/alto-total.webp", botones: ["a"],
    tutorial: ["Mantén A apretado para correr con la luz verde.", "Suelta en cuanto se ponga roja: si te mueves en rojo, te atrapan.", "Gana quien llegue primero a la meta."] },
  { id: "plataforma", idBase: "mj-plataforma", nombre: "ALVacío", descripcion: "Empuja y golpea a los demás para tirarlos de la plataforma. Gana el último en pie.",
    mando: "Golpea", tv: "tv-plataforma.html", categoria: "pelea", duracion: "2 a 4 min", color: "#c2185b", emoji: "🥊",
    portada: "party/plataforma.webp", botones: ["stick", "a", "b"],
    tutorial: ["Muévete con el stick y salta con A.", "Golpea con B para tirar a los demás de la plataforma.", "Gana el último en pie, o el último equipo con alguien arriba."], modalidades: ["solos", "equipos"] },
];

/** Ambientes de la TV (escena-mj.js los lee de ?ambiente=). */
export type IdAmbiente = "noche" | "atardecer" | "dia";
export const AMBIENTES_PARTY: { id: IdAmbiente; nombre: string; texto: string; color: string; arte: string }[] = [
  { id: "noche", nombre: "De noche", texto: "Luces de la ciudad y cielo oscuro.", color: "#141a3a", arte: "azotea-pedestal-noche-1100.webp" },
  { id: "atardecer", nombre: "Atardecer", texto: "Cielo naranja y luz cálida.", color: "#d9693a", arte: "azotea-pedestal-atardecer-1100.webp" },
  { id: "dia", nombre: "De día", texto: "Cielo azul y sol de mediodía.", color: "#5fb2ec", arte: "azotea-pedestal-dia-1100.webp" },
];

export const MAX_JUGADORES_PARTY = 6;

export const miniDe = (id: string) => MINIJUEGOS.find(m => m.id === id);

export interface ConfigParty { juego: IdMini; ambiente: IdAmbiente; modalidad?: ModalidadParty }

/** Revisa una configuración. Devuelve la razón por la que no se puede empezar, o null. */
export function motivoParty(c: Partial<ConfigParty>): string | null {
  const m = c.juego ? miniDe(c.juego) : undefined;
  if (!m) return "Elige un minijuego";
  if ((m.modalidades?.length ?? 0) > 1 && !m.modalidades!.includes(c.modalidad!)) return "Elige individual o equipos";
  if (!AMBIENTES_PARTY.some(a => a.id === c.ambiente)) return "Elige el escenario";
  return null;
}

/** Código de sala de la TV: 4 letras sin I ni O (las mismas que salaNueva del canal). */
export function salaParty(azar = Math.random): string {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () => L[Math.floor(azar() * L.length)]).join("");
}

/**
 * Direcciones del juego: la TV (tv-*.html) y el mando (control.html), en la misma sala.
 * `base` es la raíz de la app (import.meta.env.BASE_URL resuelto contra la página).
 */
export function urlsParty(c: ConfigParty & { jugadores?: number }, sala: string, base: string, nombre?: string, personaje?: string | null,
  /** Este aparato muestra el juego y también es el mando de quien lo tiene (sin Pantalla en el lobby). */ tactil = false): { tv: string; mando: string } {
  const m = miniDe(c.juego)!;
  const dir = new URL("tools/personajes/minijuegos/", base);
  const tv = new URL(m.tv, dir);
  tv.search = new URLSearchParams({ sala, ambiente: c.ambiente, ...(c.modalidad && m.modalidades?.includes(c.modalidad) ? { modalidad: c.modalidad } : {}), modo: "party",
    // Cuántos mandos espera: al entrar todos (y cargar), la TV empieza sola.
    ...(c.jugadores && c.jugadores >= 1 && c.jugadores <= MAX_JUGADORES_PARTY ? { jugadores: String(c.jugadores) } : {}),
    ...(tactil ? { tactil: "1", ...(nombre ? { nombre: nombre.slice(0, 16) } : {}), ...(personaje && /^[a-z0-9-]{1,40}$/.test(personaje) ? { personaje } : {}) } : {}) }).toString();
  const mando = new URL("control.html", dir);
  // El mando entra solo con el personaje que el jugador ya tiene en ALV (sin elegir otra vez).
  mando.search = new URLSearchParams({ sala, ...(nombre ? { nombre: nombre.slice(0, 16) } : {}),
    ...(personaje && /^[a-z0-9-]{1,40}$/.test(personaje) ? { personaje } : {}), entrar: "1" }).toString();
  return { tv: tv.href, mando: mando.href };
}

/** Aviso que manda el anfitrión al comenzar: lo oyen la Pantalla y los celulares del lobby. */
export interface AvisoParty extends ConfigParty { sala: string; /** Mandos que se esperan (la TV empieza sola al juntarlos). */ jugadores?: number }

/** Valida un aviso que llega por la difusión (no se confía en nada de lo que llega). null si no sirve. */
export function leerAvisoParty(d: unknown): AvisoParty | null {
  if (!d || typeof d !== "object") return null;
  const x = d as Record<string, unknown>;
  if (typeof x.sala !== "string" || !/^[A-HJ-NP-Z]{4}$/.test(x.sala)) return null;
  const c: Partial<ConfigParty> = {
    juego: typeof x.juego === "string" ? (x.juego as IdMini) : undefined,
    ambiente: typeof x.ambiente === "string" ? (x.ambiente as IdAmbiente) : undefined,
    ...(x.modalidad === "solos" || x.modalidad === "equipos" ? { modalidad: x.modalidad } : {}),
  };
  if (motivoParty(c)) return null;
  const jugadores = typeof x.jugadores === "number" && Number.isInteger(x.jugadores) && x.jugadores >= 1 && x.jugadores <= MAX_JUGADORES_PARTY ? x.jugadores : undefined;
  return { ...(c as ConfigParty), sala: x.sala, ...(jugadores ? { jugadores } : {}) };
}
