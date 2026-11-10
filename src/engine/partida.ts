// La partida como máquina de estados pura: aplicar(estado, acción) → estado nuevo.
// Nada aquí toca pantallas ni red. Cada acción trae un id único: si llega repetida (mala señal), se ignora.
import { crearAzar } from "./azar";
import { cartasPermitidas } from "./filtros";
import { xpDePartida } from "./economia";
import type { Carta, Configuracion, DefinicionJuego, Jugador, TemaImpostor } from "./types";

export type Fase = "contestando" | "revelada" | "terminada";

export interface EventoMotor { n: number; tipo: string; jugador?: string; datos?: unknown }

export interface EstadoPartida {
  version: number;
  juegoId: string;
  motor: NonNullable<DefinicionJuego["motor"]>;
  semilla: number;
  cfg: Configuracion;
  totalRondas: number;
  ronda: number; // empieza en 1
  fase: Fase;
  /** Jugador en turno (turnos-cartas). */
  turnoDe?: string;
  /** Lo que ve todo el mundo de la ronda: la carta, el tema o la pregunta. */
  carta?: { id: string; texto: string; opcionB?: string; tipo?: string };
  /** Datos privados por jugador: palabra del impostor, de quién es la pregunta… Nunca salen en la vista pública. */
  privado: Record<string, unknown>;
  /** Respuestas secretas. Solo se publican al revelar. */
  respuestas: Record<string, unknown>;
  /** Resultado de la ronda, público después de revelar. */
  revelado?: unknown;
  puntos: Record<string, number>;
  retos: Record<string, number>;
  accionesVistas: string[];
  bitacora: EventoMotor[];
}

export type Accion =
  | { id: string; tipo: "contestar"; jugador: string; valor: unknown }
  | { id: string; tipo: "revelar" }
  | { id: string; tipo: "siguiente" }
  | { id: string; tipo: "terminar" };

/** Una acción antes de ponerle su id único. */
export type AccionSinId = Accion extends infer A ? (A extends Accion ? Omit<A, "id"> : never) : never;

export interface Contenido { cartas: Carta[]; temas: TemaImpostor[] }

// ---------- Mecánicas ----------

interface Preparacion { carta?: EstadoPartida["carta"]; privado: Record<string, unknown>; turnoDe?: string }
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
const azarDeRonda = (e: EstadoPartida) => crearAzar(e.semilla * 1000 + e.ronda);

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

const MECANICAS: Record<EstadoPartida["motor"], Mecanica> = {
  "turnos-cartas": turnosCartas, votacion, "rol-secreto": rolSecreto, pareja,
};

// ---------- Máquina de estados ----------

function prepararRonda(e: EstadoPartida, c: Contenido): EstadoPartida {
  const p = MECANICAS[e.motor].preparar(e, c);
  return { ...e, fase: "contestando", carta: p.carta, privado: p.privado, turnoDe: p.turnoDe, respuestas: {}, revelado: undefined };
}

function registrar(e: EstadoPartida, tipo: string, jugador?: string, datos?: unknown): EventoMotor[] {
  return [...e.bitacora, { n: e.bitacora.length + 1, tipo, jugador, datos }];
}

export function crearPartida(juego: DefinicionJuego, cfg: Configuracion, semilla: number, contenido: Contenido, totalRondas = 8): EstadoPartida {
  if (!juego.motor) throw new Error(`El juego ${juego.id} todavía no corre en el motor`);
  const cero = Object.fromEntries(cfg.jugadores.map(j => [j.id, 0]));
  const base: EstadoPartida = {
    version: 1, juegoId: juego.id, motor: juego.motor, semilla, cfg, totalRondas, ronda: 1, fase: "contestando",
    privado: {}, respuestas: {}, puntos: { ...cero }, retos: { ...cero }, accionesVistas: [],
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
      for (const [j, v] of Object.entries(p.retos ?? {})) retos[j] = (retos[j] ?? 0) + v;
      return sube({ ...e, fase: "revelada", puntos, retos, revelado: p.revelado, bitacora: registrar(e, "revelada", undefined, p.revelado) });
    }
    case "siguiente": {
      if (e.fase !== "revelada") return e;
      if (e.ronda >= e.totalRondas) return sube({ ...e, fase: "terminada", bitacora: registrar(e, "terminada") });
      const n = prepararRonda({ ...e, ronda: e.ronda + 1 }, contenido);
      return sube({ ...n, bitacora: registrar(e, "ronda", undefined, { ronda: e.ronda + 1 }) });
    }
    case "terminar":
      return sube({ ...e, fase: "terminada", bitacora: registrar(e, "terminada") });
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
    return { jugador: j.id, nombre: j.nombre, puntos: p, lugar, xp };
  });
}
