// La partida como máquina de estados pura: aplicar(estado, acción) → estado nuevo.
// Nada aquí toca pantallas ni red. Cada acción trae un id único: si llega repetida (mala señal), se ignora.
import { crearAzar } from "./azar";
import { cartasPermitidas } from "./filtros";
import { xpDePartida } from "./economia";
import { CARTAS_PODER, DADOS } from "../content/catalogo";
import type { Carta, Configuracion, DefinicionJuego, Jugador, Motor, TemaImpostor } from "./types";

export type Fase = "contestando" | "revelada" | "terminada";

export interface EventoMotor { n: number; tipo: string; jugador?: string; datos?: unknown }

export interface EstadoPartida {
  version: number;
  juegoId: string;
  motor: Motor;
  /** Mazo del juego (lista, palabra, castigo…) y segundos del temporizador. */
  mazo?: string;
  segundos?: number;
  semilla: number;
  cfg: Configuracion;
  totalRondas: number;
  ronda: number; // empieza en 1
  fase: Fase;
  /** Jugador en turno (turnos-cartas). */
  turnoDe?: string;
  /** Lo que ve todo el mundo de la ronda: la carta, el tema o la pregunta. */
  carta?: { id: string; texto: string; opcionB?: string; tipo?: string };
  /** Lo que el azar eligió en la ronda y todos pueden ver: manecillas del reloj, ruleta, dados. */
  seleccion?: Record<string, unknown>;
  /** Datos privados por jugador: palabra del impostor, de quién es la pregunta… Nunca salen en la vista pública. */
  privado: Record<string, unknown>;
  /** Respuestas secretas. Solo se publican al revelar. */
  respuestas: Record<string, unknown>;
  /** Resultado de la ronda, público después de revelar. */
  revelado?: unknown;
  puntos: Record<string, number>;
  retos: Record<string, number>;
  /** Cartas de poder en la mano de cada jugador (máximo 3). Privadas: la vista pública solo dice cuántas. */
  manos: Record<string, string[]>;
  /** Cuántas veces se cambió la carta en esta ronda (para sacar otra con la misma semilla). */
  cambios: number;
  /** Última carta de poder usada, pública: «Ana usó Escudo». */
  cartaUsada?: { jugador: string; carta: string; ronda: number };
  accionesVistas: string[];
  bitacora: EventoMotor[];
}

export type Accion =
  | { id: string; tipo: "contestar"; jugador: string; valor: unknown }
  | { id: string; tipo: "revelar" }
  | { id: string; tipo: "siguiente" }
  | { id: string; tipo: "terminar" }
  /** El anfitrión entrega una carta ya pagada (la compra la valida el servidor). */
  | { id: string; tipo: "dar-carta"; jugador: string; carta: string }
  | { id: string; tipo: "usar-carta"; jugador: string; carta: string };

export const MAX_EN_MANO = 3;
export const RETOS_POR_CARTA = 3;
const IDS_PODER = CARTAS_PODER.map(c => c.id) as string[];

/** Una acción antes de ponerle su id único. */
export type AccionSinId = Accion extends infer A ? (A extends Accion ? Omit<A, "id"> : never) : never;

export interface Contenido { cartas: Carta[]; temas: TemaImpostor[] }

// ---------- Mecánicas ----------

interface Preparacion { carta?: EstadoPartida["carta"]; privado: Record<string, unknown>; turnoDe?: string; seleccion?: Record<string, unknown> }
interface Puntuacion { puntos: Record<string, number>; retos?: Record<string, number>; revelado: unknown }

interface Mecanica {
  preparar(e: EstadoPartida, c: Contenido): Preparacion;
  /** Quién debe contestar en esta ronda. */
  quienes(e: EstadoPartida): string[];
  valida(e: EstadoPartida, jugador: string, valor: unknown): boolean;
  puntuar(e: EstadoPartida): Puntuacion;
}

const ids = (e: EstadoPartida) => e.cfg.jugadores.map(j => j.id);
const nombre = (e: EstadoPartida, id?: string) => e.cfg.jugadores.find(j => j.id === id)?.nombre ?? "";
const azarDeRonda = (e: EstadoPartida) => crearAzar(e.semilla * 1000 + e.ronda + e.cambios * 7919);

function personalizar(texto: string, e: EstadoPartida, para: Jugador | undefined, otro: Jugador | undefined) {
  return texto
    .replaceAll("{pareja}", nombre(e, para?.parejaDe) || "tu pareja")
    .replaceAll("{alguien}", otro?.nombre ?? "alguien");
}

function sacarCarta(e: EstadoPartida, c: Contenido, mazos: string[]): Carta | undefined {
  const pool = cartasPermitidas(e.cfg, c.cartas, mazos);
  if (pool.length === 0) return undefined;
  return azarDeRonda(e).elegir(pool);
}

/** Normaliza una respuesta escrita para comparar: sin acentos, minúsculas, sin espacios de más. */
export function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Verdad o reto: el jugador en turno cumple (+1 verdad, +2 reto) o pasa (0, sin castigo). */
const turnosCartas: Mecanica = {
  preparar(e, c) {
    const turno = e.cfg.jugadores[(e.ronda - 1) % e.cfg.jugadores.length];
    const carta = sacarCarta(e, c, ["verdad", "reto"]);
    const otros = e.cfg.jugadores.filter(j => j.id !== turno?.id);
    const otro = otros.length ? azarDeRonda(e).elegir(otros) : undefined;
    return {
      turnoDe: turno?.id,
      privado: {},
      carta: carta && { id: carta.id, texto: personalizar(carta.texto, e, turno, otro), tipo: carta.mazo },
    };
  },
  quienes: e => (e.turnoDe ? [e.turnoDe] : []),
  valida: (_e, _j, v) => v === "cumplio" || v === "paso",
  puntuar(e) {
    const j = e.turnoDe!;
    const cumplio = e.respuestas[j] === "cumplio";
    const esReto = e.carta?.tipo === "reto";
    return {
      puntos: { [j]: cumplio ? (esReto ? 2 : 1) : 0 },
      retos: { [j]: cumplio && esReto ? 1 : 0 },
      revelado: { jugador: j, cumplio },
    };
  },
};

/** ¿Qué prefieres?: todos eligen en secreto. Con 3+, la mayoría suma 1. Con 2, cada uno predice al otro. */
const votacion: Mecanica = {
  preparar(e, c) {
    const carta = sacarCarta(e, c, ["que-prefieres"]);
    return { privado: {}, carta: carta && { id: carta.id, texto: carta.texto, opcionB: carta.opcionB } };
  },
  quienes: ids,
  valida(e, _j, v) {
    const ok = (x: unknown) => x === "a" || x === "b";
    if (e.cfg.jugadores.length === 2) {
      const r = v as { eleccion?: unknown; prediccion?: unknown } | null;
      return !!r && ok(r.eleccion) && ok(r.prediccion);
    }
    return ok(v);
  },
  puntuar(e) {
    const js = ids(e);
    const puntos: Record<string, number> = {};
    if (js.length === 2) {
      const [a, b] = js as [string, string];
      const ra = e.respuestas[a] as { eleccion: string; prediccion: string };
      const rb = e.respuestas[b] as { eleccion: string; prediccion: string };
      puntos[a] = ra.prediccion === rb.eleccion ? 1 : 0;
      puntos[b] = rb.prediccion === ra.eleccion ? 1 : 0;
      return { puntos, revelado: { respuestas: e.respuestas } };
    }
    const cuenta = { a: 0, b: 0 };
    for (const j of js) cuenta[e.respuestas[j] as "a" | "b"]++;
    const mayoria = cuenta.a === cuenta.b ? null : cuenta.a > cuenta.b ? "a" : "b";
    for (const j of js) puntos[j] = mayoria && e.respuestas[j] === mayoria ? 1 : 0;
    return { puntos, revelado: { cuenta, mayoria, respuestas: e.respuestas } };
  },
};

/** El impostor: todos ven la palabra menos uno. Votan a quién creen impostor. */
const rolSecreto: Mecanica = {
  preparar(e, c) {
    const azar = azarDeRonda(e);
    const temas = c.temas.filter(t => (!t.adulto || e.cfg.adulto) && (t.escenario === null || t.escenario === e.cfg.escenario));
    const tema = azar.elegir(temas.length ? temas : c.temas.filter(t => !t.adulto));
    const palabra = azar.elegir(tema.palabras);
    const impostor = azar.elegir(ids(e));
    const privado: Record<string, unknown> = {};
    for (const j of ids(e)) privado[j] = j === impostor ? { rol: "impostor", tema: tema.nombre } : { rol: "civil", tema: tema.nombre, palabra };
    return { privado, carta: { id: `tema-${tema.id}`, texto: tema.nombre } };
  },
  quienes: ids,
  valida: (e, j, v) => typeof v === "string" && v !== j && ids(e).includes(v),
  puntuar(e) {
    const impostor = ids(e).find(j => (e.privado[j] as { rol: string }).rol === "impostor")!;
    const votos: Record<string, number> = {};
    for (const j of ids(e)) { const v = e.respuestas[j] as string; votos[v] = (votos[v] ?? 0) + 1; }
    const max = Math.max(...Object.values(votos));
    const masVotados = Object.keys(votos).filter(k => votos[k] === max);
    const atrapado = masVotados.length === 1 && masVotados[0] === impostor; // empate = el impostor escapa
    const puntos: Record<string, number> = {};
    for (const j of ids(e)) {
      if (j === impostor) puntos[j] = atrapado ? 0 : 3;
      else puntos[j] = e.respuestas[j] === impostor ? 1 : 0;
    }
    const palabra = (e.privado[ids(e).find(j => j !== impostor)!] as { palabra: string }).palabra;
    return { puntos, revelado: { impostor, palabra, votos, atrapado } };
  },
};

/** ¿Cuánto conoces a tu pareja?: en cada pareja, uno contesta sobre sí y el otro adivina. Si coinciden, +2 a cada uno. */
function parejasDe(e: EstadoPartida): [string, string][] {
  const vistos = new Set<string>(), res: [string, string][] = [];
  for (const j of e.cfg.jugadores) {
    if (!j.parejaDe || vistos.has(j.id) || !e.cfg.jugadores.some(o => o.id === j.parejaDe)) continue;
    vistos.add(j.id); vistos.add(j.parejaDe);
    res.push([j.id, j.parejaDe]);
  }
  return res;
}
const pareja: Mecanica = {
  preparar(e, c) {
    const carta = sacarCarta(e, c, ["conoces"]);
    const privado: Record<string, unknown> = {};
    for (const [a, b] of parejasDe(e)) {
      const sujeto = e.ronda % 2 === 1 ? a : b, adivina = sujeto === a ? b : a;
      const pregunta = (carta?.texto ?? "").replaceAll("{pareja}", nombre(e, sujeto));
      privado[sujeto] = { papel: "contesta", pregunta: pregunta.replace(nombre(e, sujeto), "ti") };
      privado[adivina] = { papel: "adivina", pregunta };
    }
    return { privado, carta: carta && { id: carta.id, texto: "Cada pareja contesta en secreto" } };
  },
  quienes: e => parejasDe(e).flat(),
  valida: (_e, _j, v) => typeof v === "string" && v.trim().length > 0 && v.length <= 120,
  puntuar(e) {
    const puntos: Record<string, number> = {};
    const resultados: { pareja: [string, string]; coinciden: boolean }[] = [];
    for (const [a, b] of parejasDe(e)) {
      const coinciden = normalizar(e.respuestas[a] as string) === normalizar(e.respuestas[b] as string);
      puntos[a] = puntos[b] = coinciden ? 2 : 0;
      resultados.push({ pareja: [a, b], coinciden });
    }
    return { puntos, revelado: { resultados, respuestas: e.respuestas } };
  },
};

/** El reloj: la manecilla corta elige quién pregunta y la larga quién responde. */
const botella: Mecanica = {
  preparar(e, c) {
    const azar = azarDeRonda(e);
    const [pregunta, responde] = azar.mezclar(e.cfg.jugadores) as [Jugador, Jugador];
    const carta = sacarCarta(e, c, ["verdad"]);
    return {
      turnoDe: responde.id, privado: {},
      seleccion: { pregunta: pregunta.id, responde: responde.id },
      carta: carta && { id: carta.id, texto: personalizar(carta.texto, e, responde, pregunta), tipo: "verdad" },
    };
  },
  quienes: e => (e.turnoDe ? [e.turnoDe] : []),
  valida: (_e, _j, v) => v === "cumplio" || v === "paso",
  puntuar(e) {
    const j = e.turnoDe!, cumplio = e.respuestas[j] === "cumplio";
    return { puntos: { [j]: cumplio ? 1 : 0 }, revelado: { jugador: j, cumplio } };
  },
};

/** Ruleta de castigos: gira y elige a quién y qué castigo. Cumplirlo suma 1. */
const ruleta: Mecanica = {
  preparar(e, c) {
    const azar = azarDeRonda(e);
    const i = azar.entero(e.cfg.jugadores.length);
    const j = e.cfg.jugadores[i]!;
    const otros = e.cfg.jugadores.filter(x => x.id !== j.id);
    const carta = sacarCarta(e, c, ["castigo", "castigo-iva"]);
    return {
      turnoDe: j.id, privado: {}, seleccion: { indice: i, giro: azar.siguiente() },
      carta: carta && { id: carta.id, texto: personalizar(carta.texto, e, j, otros.length ? azar.elegir(otros) : undefined), tipo: "castigo" },
    };
  },
  quienes: e => (e.turnoDe ? [e.turnoDe] : []),
  valida: (_e, _j, v) => v === "cumplio" || v === "paso",
  puntuar(e) {
    const j = e.turnoDe!, cumplio = e.respuestas[j] === "cumplio";
    return { puntos: { [j]: cumplio ? 1 : 0 }, revelado: { jugador: j, cumplio } };
  },
};

/** Dados HOT: por turnos, cada quien con su pareja. Solo con contenido adulto (lo filtra el catálogo). */
const dados: Mecanica = {
  preparar(e) {
    const azar = azarDeRonda(e);
    const conPareja = e.cfg.jugadores.filter(j => j.parejaDe && e.cfg.jugadores.some(o => o.id === j.parejaDe));
    const de = conPareja[(e.ronda - 1) % Math.max(conPareja.length, 1)];
    const accion = azar.elegir(DADOS.accion), zona = azar.elegir(DADOS.zona), segundos = azar.elegir(DADOS.segundos);
    return {
      turnoDe: de?.id, privado: {},
      seleccion: { de: de?.id, a: de?.parejaDe, accion, zona, segundos },
      carta: { id: `dados-${e.ronda}-${e.cambios}`, texto: `${accion} ${zona} de ${nombre(e, de?.parejaDe)} durante ${segundos} segundos`, tipo: "dados" },
    };
  },
  quienes: e => (e.turnoDe ? [e.turnoDe] : []),
  valida: (_e, _j, v) => v === "cumplio" || v === "paso",
  puntuar(e) {
    const j = e.turnoDe!, cumplio = e.respuestas[j] === "cumplio";
    return { puntos: { [j]: cumplio ? 1 : 0 }, revelado: { jugador: j, cumplio } };
  },
};

/** Contra reloj: lista relámpago, bienvenida, mímica y palabra prohibida. Se cuenta cuántas logró. */
const MAX_CONTEO = 40, PALABRAS_POR_TURNO = 8;
const conteo: Mecanica = {
  preparar(e, c) {
    const turno = e.cfg.jugadores[(e.ronda - 1) % e.cfg.jugadores.length]!;
    if (e.mazo === "palabra") {
      // Mímica y palabra prohibida: solo quien describe ve las palabras.
      const pool = cartasPermitidas({ ...e.cfg, escenario: e.cfg.escenario }, c.cartas, ["palabra"]);
      const palabras = azarDeRonda(e).mezclar(pool).slice(0, PALABRAS_POR_TURNO).map(x => ({ palabra: x.texto, prohibidas: e.juegoId === "prohibida" ? x.prohibidas ?? [] : [] }));
      return { turnoDe: turno.id, privado: { [turno.id]: { palabras } }, carta: { id: `palabras-${e.ronda}-${e.cambios}`, texto: `${turno.nombre} describe; los demás adivinan`, tipo: "palabra" } };
    }
    const carta = sacarCarta(e, c, [e.mazo ?? "lista"]);
    return { turnoDe: turno.id, privado: {}, carta: carta && { id: carta.id, texto: carta.texto, tipo: "lista" } };
  },
  quienes: e => (e.turnoDe ? [e.turnoDe] : []),
  valida(e, j, v) {
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return false;
    const tope = e.mazo === "palabra" ? ((e.privado[j] as { palabras?: unknown[] })?.palabras?.length ?? 0) : MAX_CONTEO;
    return v <= tope;
  },
  puntuar(e) {
    const j = e.turnoDe!, n = e.respuestas[j] as number;
    return { puntos: { [j]: n }, revelado: { jugador: j, logro: n } };
  },
};

/** Yo nunca: cada quien dice si sí lo ha hecho. Confesar suma 1. */
const confesion: Mecanica = {
  preparar(e, c) {
    const carta = sacarCarta(e, c, [e.mazo ?? "yo-nunca"]);
    return { privado: {}, carta: carta && { id: carta.id, texto: carta.texto, tipo: "yo-nunca" } };
  },
  quienes: ids,
  valida: (_e, _j, v) => v === "si" || v === "no",
  puntuar(e) {
    const puntos: Record<string, number> = {};
    const confesaron = ids(e).filter(j => e.respuestas[j] === "si");
    for (const j of ids(e)) puntos[j] = e.respuestas[j] === "si" ? 1 : 0;
    return { puntos, revelado: { confesaron } };
  },
};

/** ¿Quién es más probable?: todos señalan en secreto. Quien coincide con la mayoría suma 1. */
const senalar: Mecanica = {
  preparar(e, c) {
    const carta = sacarCarta(e, c, [e.mazo ?? "mas-probable"]);
    return { privado: {}, carta: carta && { id: carta.id, texto: carta.texto, tipo: "mas-probable" } };
  },
  quienes: ids,
  valida: (e, _j, v) => typeof v === "string" && ids(e).includes(v),
  puntuar(e) {
    const votos: Record<string, number> = {};
    for (const j of ids(e)) { const v = e.respuestas[j] as string; votos[v] = (votos[v] ?? 0) + 1; }
    const max = Math.max(...Object.values(votos));
    const ganadores = Object.keys(votos).filter(k => votos[k] === max);
    const puntos: Record<string, number> = {};
    for (const j of ids(e)) puntos[j] = ganadores.includes(e.respuestas[j] as string) ? 1 : 0;
    return { puntos, revelado: { votos, elegidos: ganadores } };
  },
};

/** Reto del lugar: una competencia real; el anfitrión marca quién ganó (+3). */
const competencia: Mecanica = {
  preparar(e, c) {
    const carta = sacarCarta(e, c, ["competencia"]);
    return { privado: {}, turnoDe: e.cfg.jugadores[0]?.id, carta: carta && { id: carta.id, texto: carta.texto, tipo: carta.descripcion ?? "" } };
  },
  // Lo captura el dispositivo del anfitrión (el primer jugador del grupo).
  quienes: e => (e.cfg.jugadores[0] ? [e.cfg.jugadores[0].id] : []),
  valida: (e, _j, v) => typeof v === "string" && ids(e).includes(v),
  puntuar(e) {
    const ganador = e.respuestas[e.cfg.jugadores[0]!.id] as string;
    return { puntos: { [ganador]: 3 }, revelado: { ganador } };
  },
};

const MECANICAS: Record<Motor, Mecanica> = {
  "turnos-cartas": turnosCartas, votacion, "rol-secreto": rolSecreto, pareja,
  botella, ruleta, dados, conteo, confesion, senalar, competencia,
};

// ---------- Máquina de estados ----------

function prepararRonda(e: EstadoPartida, c: Contenido): EstadoPartida {
  const p = MECANICAS[e.motor].preparar(e, c);
  return { ...e, fase: "contestando", carta: p.carta, privado: p.privado, turnoDe: p.turnoDe, seleccion: p.seleccion, respuestas: {}, revelado: undefined };
}

/** Da una carta de poder si hay lugar en la mano. */
function conCarta(manos: Record<string, string[]>, jugador: string, carta: string): Record<string, string[]> {
  const mano = manos[jugador] ?? [];
  if (mano.length >= MAX_EN_MANO) return manos;
  return { ...manos, [jugador]: [...mano, carta] };
}

function registrar(e: EstadoPartida, tipo: string, jugador?: string, datos?: unknown): EventoMotor[] {
  return [...e.bitacora, { n: e.bitacora.length + 1, tipo, jugador, datos }];
}

export function crearPartida(juego: DefinicionJuego, cfg: Configuracion, semilla: number, contenido: Contenido, totalRondas = 8): EstadoPartida {
  if (!juego.motor) throw new Error(`El juego ${juego.id} todavía no corre en el motor`);
  const cero = Object.fromEntries(cfg.jugadores.map(j => [j.id, 0]));
  const base: EstadoPartida = {
    version: 1, juegoId: juego.id, motor: juego.motor, mazo: juego.mazo, segundos: juego.segundos, semilla, cfg, totalRondas, ronda: 1, fase: "contestando",
    privado: {}, respuestas: {}, puntos: { ...cero }, retos: { ...cero },
    manos: Object.fromEntries(cfg.jugadores.map(j => [j.id, [] as string[]])), cambios: 0, accionesVistas: [],
    bitacora: [{ n: 1, tipo: "partida-creada", datos: { juego: juego.id, semilla } }],
  };
  return prepararRonda(base, contenido);
}

/** Aplica una acción. Si es repetida o no es válida en este momento, devuelve el mismo estado sin cambios. */
export function aplicar(e: EstadoPartida, a: Accion, contenido: Contenido): EstadoPartida {
  if (e.accionesVistas.includes(a.id) || e.fase === "terminada") return e;
  const m = MECANICAS[e.motor];
  const visto = [...e.accionesVistas, a.id];
  const sube = (n: EstadoPartida): EstadoPartida => ({ ...n, version: e.version + 1, accionesVistas: visto });

  switch (a.tipo) {
    case "contestar": {
      if (e.fase !== "contestando" || !m.quienes(e).includes(a.jugador) || a.jugador in e.respuestas) return e;
      if (!m.valida(e, a.jugador, a.valor)) return e;
      return sube({ ...e, respuestas: { ...e.respuestas, [a.jugador]: a.valor }, bitacora: registrar(e, "contesto", a.jugador) });
    }
    case "revelar": {
      if (e.fase !== "contestando" || !m.quienes(e).every(j => j in e.respuestas)) return e;
      const p = m.puntuar(e);
      const puntos = { ...e.puntos }, retos = { ...e.retos };
      for (const [j, v] of Object.entries(p.puntos)) puntos[j] = (puntos[j] ?? 0) + v;
      let manos = e.manos;
      const azar = azarDeRonda(e);
      for (const [j, v] of Object.entries(p.retos ?? {})) {
        const antes = retos[j] ?? 0;
        retos[j] = antes + v;
        // Cada 3 retos cumplidos se gana una carta de poder.
        if (v > 0 && Math.floor(retos[j]! / RETOS_POR_CARTA) > Math.floor(antes / RETOS_POR_CARTA)) manos = conCarta(manos, j, azar.elegir(IDS_PODER));
      }
      return sube({ ...e, fase: "revelada", puntos, retos, manos, revelado: p.revelado, bitacora: registrar(e, "revelada", undefined, p.revelado) });
    }
    case "siguiente": {
      if (e.fase !== "revelada") return e;
      if (e.ronda >= e.totalRondas) return sube({ ...e, fase: "terminada", bitacora: registrar(e, "terminada") });
      const n = prepararRonda({ ...e, ronda: e.ronda + 1, cambios: 0 }, contenido);
      return sube({ ...n, bitacora: registrar(e, "ronda", undefined, { ronda: e.ronda + 1 }) });
    }
    case "terminar":
      return sube({ ...e, fase: "terminada", bitacora: registrar(e, "terminada") });
    case "dar-carta": {
      if (!IDS_PODER.includes(a.carta) || !(a.jugador in e.manos) || (e.manos[a.jugador]?.length ?? 0) >= MAX_EN_MANO) return e;
      return sube({ ...e, manos: conCarta(e.manos, a.jugador, a.carta), bitacora: registrar(e, "carta-recibida", a.jugador, { carta: a.carta }) });
    }
    case "usar-carta": {
      const mano = e.manos[a.jugador] ?? [];
      const i = mano.indexOf(a.carta);
      if (i < 0 || e.fase !== "contestando") return e;
      const esTurno = ["turnos-cartas", "botella", "ruleta", "dados"].includes(e.motor) && a.jugador === e.turnoDe && !(a.jugador in e.respuestas);
      // Escudo, Pasa turno y Cambio solo los usa quien está en turno; las demás son sociales y el anfitrión las hace cumplir.
      if (["escudo", "turno", "cambio"].includes(a.carta) && !esTurno) return e;
      const manos = { ...e.manos, [a.jugador]: mano.filter((_, k) => k !== i) };
      let n: EstadoPartida = { ...e, manos, cartaUsada: { jugador: a.jugador, carta: a.carta, ronda: e.ronda }, bitacora: registrar(e, "carta-usada", a.jugador, { carta: a.carta }) };
      if (a.carta === "escudo" || a.carta === "turno") n = { ...n, respuestas: { ...n.respuestas, [a.jugador]: "paso" } };
      if (a.carta === "cambio") n = prepararRonda({ ...n, cambios: e.cambios + 1 }, contenido);
      return sube(n);
    }
  }
}

/** Ranking final y XP por jugador (la XP real la confirma el servidor con la misma regla). */
export function resultados(e: EstadoPartida) {
  const rondasJugadas = e.bitacora.filter(b => b.tipo === "revelada").length;
  const orden = [...e.cfg.jugadores].sort((x, y) => (e.puntos[y.id] ?? 0) - (e.puntos[x.id] ?? 0));
  let lugar = 0, previo: number | null = null;
  return orden.map((j, i) => {
    const p = e.puntos[j.id] ?? 0;
    if (p !== previo) { lugar = i + 1; previo = p; }
    const xp = xpDePartida({ rondas: rondasJugadas, retosCumplidos: e.retos[j.id] ?? 0, lugar }, e.cfg.jugadores.length);
    // rondas y retos van al servidor, que vuelve a calcular la XP con la misma fórmula.
    return { jugador: j.id, nombre: j.nombre, puntos: p, lugar, xp, rondas: rondasJugadas, retos: e.retos[j.id] ?? 0 };
  });
}
