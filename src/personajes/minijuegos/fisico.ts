// Sala de Físico (prototipo, zona aparte). Decisión de Elías (2026-11-26): los personajes de frente sobre el fondo del
// escenario elegido; el anfitrión da a mano puntos, castigos y retos según cumplan o no en persona; desde la sala se elige
// un juego físico que pone en la TV lo que haga falta. Primer juego: «Palabra prohibida» (categoría + palabra secreta;
// pierde quien la diga en voz alta). Lógica pura que corre en la TV; sin DOM ni 3D.
//
// Reglas del proyecto que se respetan aquí (app/CLAUDE.md, Producto):
// - Las cartas de trago nunca exigen alcohol: cada quien elige qué tomar. Tomar nunca da puntos ni XP.
// - Ningún castigo o reto de contacto (globo de agua) sale sin el consentimiento de quien lo recibe: queda pendiente
//   hasta que acepta en su celular; si no acepta, toca uno sin contacto.
// - Los puntos solo los da el anfitrión; el total de nadie baja de 0 (como el motor, que nunca da negativos).
// - En la nube no hace falta migración nueva: la 040 (aplicada) ya acepta 'fisico' en terminar_partida_sala y guarda
//   puntos y lugar por jugador en resultados_partida. Falta que Físico viva en una sala real de la app (integración).
//   En el prototipo los puntos viven en la TV (memoria y localStorage). Punto de conexión: `alCambiarPuntos` en
//   tools/personajes/minijuegos/tv-fisico.js.

export interface Categoria { id: string; nombre: string; palabras: string[] }

/** Contenido de prueba del prototipo (el contenido real irá en src/content con sus etiquetas, como las demás cartas). */
export const CATEGORIAS: Categoria[] = [
  { id: "scooby", nombre: "Personajes de Scooby-Doo", palabras: ["Shaggy", "Scooby", "Fred", "Daphne", "Vilma", "Scrappy"] },
  { id: "avengers", nombre: "Avengers", palabras: ["Iron Man", "Thor", "Hulk", "Black Widow", "Hawkeye", "Capitán América"] },
  { id: "frutas", nombre: "Frutas", palabras: ["Mango", "Plátano", "Fresa", "Sandía", "Piña", "Uva", "Manzana"] },
  { id: "futbol", nombre: "Equipos de futbol de México", palabras: ["América", "Chivas", "Cruz Azul", "Pumas", "Tigres", "Rayados"] },
  { id: "tacos", nombre: "Tipos de taco", palabras: ["Pastor", "Suadero", "Carnitas", "Barbacoa", "Bistec", "Campechano"] },
  { id: "simpsons", nombre: "Personajes de Los Simpson", palabras: ["Homero", "Bart", "Lisa", "Marge", "Maggie", "Moe", "Flanders"] },
  { id: "animales", nombre: "Animales de la granja", palabras: ["Vaca", "Cerdo", "Gallina", "Caballo", "Borrego", "Pato"] },
  { id: "pokemon", nombre: "Pokémon", palabras: ["Pikachu", "Charmander", "Bulbasaur", "Squirtle", "Eevee", "Snorlax"] },
];

export interface Castigo { id: string; texto: string; contacto: boolean; trago: boolean }

/** Castigos y retos del prototipo. `contacto` pide consentimiento; `trago` nunca exige alcohol ni da puntos. */
export const CASTIGOS: Castigo[] = [
  { id: "globo", texto: "Globo de agua", contacto: true, trago: false },
  { id: "beber", texto: "Toma algo (lo que tú elijas)", contacto: false, trago: true },
  { id: "sentadillas", texto: "10 sentadillas", contacto: false, trago: false },
  { id: "cantar", texto: "Canta el coro de una canción", contacto: false, trago: false },
  { id: "imitar", texto: "Imita a un personaje por 10 s", contacto: false, trago: false },
];
// Sin retos que involucren a otra persona: el consentimiento sería de dos (Codex O2); se agregan cuando haya cómo pedirlo.
export const RETOS: Castigo[] = [
  { id: "baile", texto: "Baila 15 s sin música", contacto: false, trago: false },
  { id: "trabalenguas", texto: "Di un trabalenguas sin trabarte", contacto: false, trago: false },
  { id: "chiste", texto: "Cuenta un chiste", contacto: false, trago: false },
];
const SIN_CONTACTO = (l: Castigo[]) => l.filter(c => !c.contacto);

/** `arbitro`: quién era el anfitrión cuando empezó la ronda (el único que conoce la palabra tapada). */
export interface Ronda { n: number; categoria: Categoria; palabra: string; revelada: boolean; perdio: string | null; arbitro: string | null }
export interface Pendiente { id: string; tipo: "castigo" | "reto"; castigo: Castigo }
export type Entrada =
  | { tipo: "puntos"; id: string; n: number; total: number }
  | { tipo: "castigo" | "reto"; id: string; castigo: Castigo; estado: "aplicado" | "pendiente" | "rechazado" }
  | { tipo: "perdio"; id: string; ronda: number }
  | { tipo: "ronda"; n: number; categoria: string }
  | { tipo: "anulada"; n: number };

export interface EstadoFisico {
  jugadores: string[];
  /** Puntos guardados de una carga anterior (la TV se recargó): quien vuelva a entrar los recupera (Codex O5). */
  guardados: Map<string, number>;
  puntos: Map<string, number>;
  ronda: Ronda | null;
  /** Rondas empezadas (sigue contando aunque una se anule). */
  rondas: number;
  usadas: Set<string>;
  pendientes: Map<string, Pendiente>;
  historial: Entrada[];
}

export function crearFisico(jugadores: string[], puntos: Record<string, number> = {}): EstadoFisico {
  return {
    jugadores: [...jugadores],
    guardados: new Map(Object.entries(puntos).map(([id, n]) => [id, Math.max(0, Math.floor(Number(n) || 0))])),
    puntos: new Map(jugadores.map(id => [id, Math.max(0, Math.floor(Number(puntos[id]) || 0))])),
    ronda: null, rondas: 0, usadas: new Set(), pendientes: new Map(), historial: [],
  };
}

/** Entra alguien a la sala a mitad (empieza en 0 o con lo que traía). */
export function agregarJugador(e: EstadoFisico, id: string) {
  if (e.jugadores.includes(id)) return;
  e.jugadores.push(id);
  if (!e.puntos.has(id)) e.puntos.set(id, e.guardados.get(id) ?? 0);
}

/**
 * Nueva ronda: categoría (la que pida el anfitrión o una al azar) y una palabra que no haya salido. La palabra empieza
 * tapada (Codex F1); `visible` = true para jugar con la palabra a la vista (p. ej. si están de espaldas a la TV).
 */
export function nuevaRonda(e: EstadoFisico, azar: () => number, categoriaId?: string, visible = false, arbitro: string | null = null): Ronda {
  const posibles = categoriaId ? CATEGORIAS.filter(c => c.id === categoriaId) : CATEGORIAS;
  const lista = posibles.length ? posibles : CATEGORIAS;
  let cat = lista[Math.floor(azar() * lista.length) % lista.length]!;
  let libres = cat.palabras.filter(p => !e.usadas.has(cat.id + "|" + p));
  if (!libres.length && !categoriaId) {
    const otra = CATEGORIAS.find(c => c.palabras.some(p => !e.usadas.has(c.id + "|" + p)));
    if (otra) { cat = otra; libres = cat.palabras.filter(p => !e.usadas.has(cat.id + "|" + p)); }
  }
  if (!libres.length) { for (const p of cat.palabras) e.usadas.delete(cat.id + "|" + p); libres = [...cat.palabras]; }
  const palabra = libres[Math.floor(azar() * libres.length) % libres.length]!;
  e.usadas.add(cat.id + "|" + palabra);
  const n = ++e.rondas;
  e.ronda = { n, categoria: cat, palabra, revelada: visible, perdio: null, arbitro };
  e.historial.push({ tipo: "ronda", n, categoria: cat.nombre });
  return e.ronda;
}

/**
 * Si cambia el anfitrión a media ronda (se fue y otro tomó su lugar), quien recibió la palabra tapada podría volver a
 * competir sabiéndola: la ronda se anula y el anfitrión de ahora saca otra (Codex N1). Devuelve true si anuló algo.
 * Una ronda ya decidida («la dijo») o con la palabra a la vista no se anula.
 */
export function cambioDeArbitro(e: EstadoFisico, anfitrionActual: string | null): boolean {
  const r = e.ronda;
  if (!r || r.perdio || r.revelada || r.arbitro === anfitrionActual) return false;
  e.historial.push({ tipo: "anulada", n: r.n });
  e.ronda = null;
  return true;
}

/** Un solo control de visibilidad (Codex O3): lo que dice `revelada` es lo que muestra la TV. */
export function revelar(e: EstadoFisico): boolean {
  if (!e.ronda) return false;
  e.ronda.revelada = true;
  return true;
}
/** Tapar otra vez. No se puede después de «la dijo»: queda a la vista hasta la siguiente ronda. */
export function tapar(e: EstadoFisico): boolean {
  if (!e.ronda || e.ronda.perdio) return false;
  e.ronda.revelada = false;
  return true;
}

/** El anfitrión marca quién la dijo: pierde la ronda y la palabra se revela. Solo uno por ronda. */
export function perdio(e: EstadoFisico, id: string): boolean {
  if (!e.ronda || e.ronda.perdio || !e.jugadores.includes(id)) return false;
  e.ronda.perdio = id; e.ronda.revelada = true;
  e.historial.push({ tipo: "perdio", id, ronda: e.ronda.n });
  return true;
}

/** Puntos a mano del anfitrión: entero de −5 a 10; el total nunca baja de 0. Devuelve el total o null si no vale. */
export function darPuntos(e: EstadoFisico, id: string, n: number): number | null {
  if (!e.jugadores.includes(id) || !Number.isInteger(n) || n < -5 || n > 10 || n === 0) return null;
  const total = Math.max(0, (e.puntos.get(id) ?? 0) + n);
  e.puntos.set(id, total);
  e.historial.push({ tipo: "puntos", id, n, total });
  return total;
}

/**
 * Castigo o reto que pone el anfitrión. Si es de contacto queda pendiente hasta que la persona acepte en su celular.
 * Nunca cambia puntos (tomar nunca da puntos ni XP). Devuelve el estado o null si no vale.
 */
export function asignar(e: EstadoFisico, id: string, tipo: "castigo" | "reto", castigoId: string): "aplicado" | "pendiente" | null {
  if (!e.jugadores.includes(id) || e.pendientes.has(id)) return null;
  const c = (tipo === "castigo" ? CASTIGOS : RETOS).find(x => x.id === castigoId);
  if (!c) return null;
  if (c.contacto) {
    e.pendientes.set(id, { id, tipo, castigo: c });
    e.historial.push({ tipo, id, castigo: c, estado: "pendiente" });
    return "pendiente";
  }
  e.historial.push({ tipo, id, castigo: c, estado: "aplicado" });
  return "aplicado";
}

/**
 * Respuesta de quien recibe un castigo o reto de contacto. Solo cuenta la de esa persona y solo si tiene uno pendiente.
 * Si no acepta, se le asigna uno sin contacto al azar (cumplir sigue siendo obligatorio, pero sin contacto).
 */
export function responder(e: EstadoFisico, id: string, acepta: boolean, azar: () => number): { estado: "aplicado" | "rechazado"; castigo: Castigo; alternativa?: Castigo } | null {
  const p = e.pendientes.get(id);
  if (!p) return null;
  e.pendientes.delete(id);
  if (acepta) { e.historial.push({ tipo: p.tipo, id, castigo: p.castigo, estado: "aplicado" }); return { estado: "aplicado", castigo: p.castigo }; }
  e.historial.push({ tipo: p.tipo, id, castigo: p.castigo, estado: "rechazado" });
  const opciones = SIN_CONTACTO(p.tipo === "castigo" ? CASTIGOS : RETOS);
  const alternativa = opciones[Math.floor(azar() * opciones.length) % opciones.length]!;
  e.historial.push({ tipo: p.tipo, id, castigo: alternativa, estado: "aplicado" });
  return { estado: "rechazado", castigo: p.castigo, alternativa };
}

export function tabla(e: EstadoFisico): { id: string; puntos: number; lugar: number }[] {
  const filas = e.jugadores.map(id => ({ id, puntos: e.puntos.get(id) ?? 0 }));
  filas.sort((a, b) => b.puntos - a.puntos);
  return filas.map(f => ({ ...f, lugar: 1 + filas.filter(o => o.puntos > f.puntos).length }));
}
