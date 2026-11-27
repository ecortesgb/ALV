// ALV PARTY (Competitivo, decisión de Elías, 27 nov 2026): los Mini-Juegos dentro de su propio configurador.
// Solo datos. Las reglas viven en src/personajes/minijuegos/*.ts y la TV en tools/personajes/minijuegos/tv-*.html.
// XP y monedas: las da el servidor con terminar_partida_sala (049) cuando el anfitrión de la sala tiene sesión.

export type IdMini = "bala" | "desenfunda" | "martillazo" | "alto" | "paracaidas";

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
  /** Si se juega solos o por equipos (la TV lo lee de ?modalidad=). Sin esto, cada quien para sí. */
  modalidades?: ModalidadParty[];
}

export type ModalidadParty = "solos" | "equipos";
export const MODALIDADES_PARTY: { id: ModalidadParty; nombre: string; texto: string }[] = [
  { id: "solos", nombre: "Individual", texto: "Cada quien para sí. Gana el último en pie." },
  { id: "equipos", nombre: "Equipos", texto: "Gana el último equipo con alguien en pie." },
];

export type IdCategoria = "reflejos" | "punteria" | "nervios";
export interface CategoriaParty { id: IdCategoria; nombre: string; texto: string; color: string }

export const CATEGORIAS_PARTY: CategoriaParty[] = [
  { id: "reflejos", nombre: "Reflejos", texto: "Gana el más rápido.", color: "#e8412c" },
  { id: "punteria", nombre: "Puntería", texto: "Gana el que atina al momento exacto.", color: "#1d8fe0" },
  { id: "nervios", nombre: "Nervios", texto: "Gana el que se aguanta.", color: "#3cb043" },
];

export const MINIJUEGOS: Minijuego[] = [
  { id: "desenfunda", idBase: "mj-desenfunda", nombre: "¡Desenfunda!", descripcion: "Dispara en cuanto salga el ¡YA! Sin adelantarte. 5 rondas.",
    mando: "Dispara", tv: "tv-desenfunda.html", categoria: "reflejos", duracion: "2 min", color: "#e8412c", emoji: "🤠" },
  { id: "bala", idBase: "mj-bala", nombre: "Esquiva la bala", descripcion: "Salta cuando pase la bala. Gana el último en pie.",
    mando: "Salta", tv: "tv-bala.html", categoria: "reflejos", duracion: "1 a 3 min", color: "#f2a900", emoji: "💥" },
  { id: "martillazo", idBase: "mj-martillazo", nombre: "Martillazo", descripcion: "Golpea cuando la barra esté al centro. Más puntos entre más cerca.",
    mando: "Golpea", tv: "tv-martillazo.html", categoria: "punteria", duracion: "2 min", color: "#1d8fe0", emoji: "🔨" },
  { id: "paracaidas", idBase: "mj-paracaidas", nombre: "Paracaídas", descripcion: "Abre el paracaídas lo más cerca del piso sin estrellarte.",
    mando: "Abre", tv: "tv-paracaidas.html", categoria: "punteria", duracion: "2 min", color: "#7b4fd6", emoji: "🪂" },
  { id: "alto", idBase: "mj-alto-total", nombre: "Alto total", descripcion: "Mantén ¡CORRE! en verde y suelta en rojo. Llega a la meta.",
    mando: "Corre", tv: "tv-alto-total.html", categoria: "nervios", duracion: "1 min", color: "#3cb043", emoji: "🚦" },
];

/** Ambientes de la TV (escena-mj.js los lee de ?ambiente=). */
export type IdAmbiente = "noche" | "atardecer" | "dia";
export const AMBIENTES_PARTY: { id: IdAmbiente; nombre: string; texto: string; color: string }[] = [
  { id: "noche", nombre: "Azotea de noche", texto: "Luces de la ciudad y cielo oscuro.", color: "#141a3a" },
  { id: "atardecer", nombre: "Atardecer", texto: "Cielo naranja y luz cálida.", color: "#d9693a" },
  { id: "dia", nombre: "De día", texto: "Cielo azul y sol de mediodía.", color: "#5fb2ec" },
];

/** Dónde se ve el juego. */
export type IdPantalla = "aqui" | "proyectar";
export const PANTALLAS_PARTY: { id: IdPantalla; nombre: string; texto: string }[] = [
  { id: "aqui", nombre: "En esta pantalla", texto: "Este aparato muestra el juego. Cada quien juega desde su celular con el QR." },
  { id: "proyectar", nombre: "Proyectar a otra pantalla", texto: "Abres el juego en la TV o laptop y este aparato queda como tu mando." },
];

/** Jugadores de práctica que se mueven solos (para probar o completar). */
export const BOTS_PARTY = [0, 1, 2, 3] as const;

export const MAX_JUGADORES_PARTY = 6;

export const miniDe = (id: string) => MINIJUEGOS.find(m => m.id === id);

export interface ConfigParty { juego: IdMini; ambiente: IdAmbiente; pantalla: IdPantalla; bots: number; modalidad?: ModalidadParty }

/** Revisa una configuración. Devuelve la razón por la que no se puede empezar, o null. */
export function motivoParty(c: Partial<ConfigParty>): string | null {
  const m = c.juego ? miniDe(c.juego) : undefined;
  if (!m) return "Elige un minijuego";
  if ((m.modalidades?.length ?? 0) > 1 && !m.modalidades!.includes(c.modalidad!)) return "Elige individual o equipos";
  if (!AMBIENTES_PARTY.some(a => a.id === c.ambiente)) return "Elige el escenario";
  if (!PANTALLAS_PARTY.some(p => p.id === c.pantalla)) return "Elige dónde se ve";
  if (!BOTS_PARTY.includes(c.bots as 0)) return "Jugadores de práctica no válidos";
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
export function urlsParty(c: ConfigParty, sala: string, base: string, nombre?: string): { tv: string; mando: string } {
  const m = miniDe(c.juego)!;
  const dir = new URL("tools/personajes/minijuegos/", base);
  const tv = new URL(m.tv, dir);
  tv.search = new URLSearchParams({ sala, ambiente: c.ambiente, ...(c.bots ? { bots: String(c.bots) } : {}),
    ...(c.modalidad && m.modalidades?.includes(c.modalidad) ? { modalidad: c.modalidad } : {}), modo: "party" }).toString();
  const mando = new URL("control.html", dir);
  mando.search = new URLSearchParams({ sala, ...(nombre ? { nombre: nombre.slice(0, 16) } : {}) }).toString();
  return { tv: tv.href, mando: mando.href };
}
