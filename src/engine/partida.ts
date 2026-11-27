// La partida como máquina de estados pura: aplicar(estado, acción) → estado nuevo.
// Nada aquí toca pantallas ni red. Cada acción trae un id único: si llega repetida (mala señal), se ignora.
import { crearAzar } from "./azar";
import { cartasPermitidas } from "./filtros";
import { yaSalio } from "./yaSalieron";
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
  /** El anfitrión detuvo la partida: nadie puede contestar hasta reanudar. */
  pausada?: boolean;
  /** El impostor: la pista que cada quien dijo en la ronda (pública, máximo 40 letras). */
  pistas?: Record<string, string>;
  /** XP por reto en vivo que dio quien tiene el control (la acredita el servidor al dársela). */
  xpReto?: Record<string, number>;
  /** Ruleta de castigos del anfitrión: a quién le tocó y qué. `n` sube con cada giro. */
  ruletaExtra?: { jugador: string; texto: string; n: number };
  /** Cuenta que tiene el control (anfitrión). Solo ella pausa, salta, revela y pasa de ronda. */
  control?: string;
  /** Quienes no contestaron y la ronda se cerró sin ellos («Seguir sin él»). No puntúan esa ronda. Se limpia al empezar la siguiente. */
  ausentes?: string[];
  /** Cuántas veces el anfitrión eligió «Esperar» en esta ronda (rearma el aviso de espera). */
  esperas?: number;
  /** El impostor con eliminación (cfg.impostor): quienes ya salieron por votación, en orden. */
  eliminados?: string[];
  /** Verdad o reto nuevo (cfg.verdadReto): lo que se eligió en la ronda (verdad o reto, y si la pregunta la da la app o se dice en voz alta). */
  vr?: { eleccion?: "verdad" | "reto"; fuente?: "app" | "voz" };
  /** Verdad o reto nuevo: quienes ya usaron su única Verdad. */
  verdadUsada?: string[];
  /** Temperatura + Voltaje (cfg.ejes): cartas que ya salieron en la partida, para no repetirlas. Privado: no va en las vistas. */
  usadas?: string[];
  /** Pantalla de carga (cfg.explicar): el anfitrión ya tocó «¡Iniciar!». Antes de eso no corre ningún reloj. */
  comenzada?: boolean;
  /** Papeles en la mesa (cfg.impostor.papeles): «papeles» = repartidos, cada quien ve el suyo antes de la discusión.
   * Sin valor, la vuelta de palabras de siempre. */
  naveEtapa?: "papeles";
  /** Papeles: quienes ya tocaron «Ya lo vi». */
  vistos?: string[];
  /** Papeles: las palabras que dijo cada quien en las vueltas ya cerradas, en orden. */
  palabrasVueltas?: Record<string, string[]>;
  accionesVistas: string[];
  bitacora: EventoMotor[];
}

/** ¿La partida sigue en su pantalla de carga? (pidió explicar, nadie ha hecho nada y el anfitrión no ha tocado «¡Iniciar!»). */
export const enCarga = (e: EstadoPartida) =>
  !!e.cfg.explicar && !e.comenzada && e.ronda === 1 && e.fase === "contestando" && Object.keys(e.respuestas).length === 0 && Object.keys(e.pistas ?? {}).length === 0 && !e.vr;

export type Accion =
  | { id: string; tipo: "contestar"; jugador: string; valor: unknown }
  | { id: string; tipo: "revelar" }
  | { id: string; tipo: "siguiente" }
  | { id: string; tipo: "terminar" }
  /** El anfitrión entrega una carta ya pagada (la compra la valida el servidor). */
  | { id: string; tipo: "dar-carta"; jugador: string; carta: string }
  | { id: string; tipo: "usar-carta"; jugador: string; carta: string }
  | { id: string; tipo: "pausar" }
  | { id: string; tipo: "reanudar" }
  /** Salta la ronda sin puntos (se acabó el tiempo o alguien no contesta). */
  | { id: string; tipo: "saltar" }
  /** El anfitrión elige seguir sin quien no contesta: se revela con lo que hay y los ausentes no puntúan la ronda. */
  | { id: string; tipo: "seguir-sin" }
  /** El anfitrión elige seguir esperando: la ronda sigue abierta y el aviso se rearma. */
  | { id: string; tipo: "esperar" }
  | { id: string; tipo: "pista"; jugador: string; texto: string }
  | { id: string; tipo: "xp-reto"; jugador: string; xp: number }
  | { id: string; tipo: "ruleta" }
  | { id: string; tipo: "pasar-control"; jugador: string }
  /** Se acabó el tiempo del turno (temporizador): el turno pasa al siguiente. Lo manda quien corre el motor. */
  | { id: string; tipo: "tiempo" }
  /** El anfitrión cerró la pantalla de carga: empieza la partida (y sus relojes) para todos. */
  | { id: string; tipo: "comenzar" }
  /** Papeles: un jugador ya vio su papel («Ya lo vi»). */
  | { id: string; tipo: "visto"; jugador: string }
  /** Papeles: el anfitrión abre la discusión (empieza la vuelta de palabras). */
  | { id: string; tipo: "discutir" };

export const MAX_PISTA = 40;

export const MAX_EN_MANO = 3;
export const RETOS_POR_CARTA = 3;
const IDS_PODER = CARTAS_PODER.map(c => c.id) as string[];

/** Una acción antes de ponerle su id único. */
export type AccionSinId = Accion extends infer A ? (A extends Accion ? Omit<A, "id"> : never) : never;

export interface Contenido { cartas: Carta[]; temas: TemaImpostor[] }

// ---------- Mecánicas ----------

interface Preparacion { carta?: EstadoPartida["carta"]; privado: Record<string, unknown>; turnoDe?: string; seleccion?: Record<string, unknown> }
interface Puntuacion { puntos: Record<string, number>; retos?: Record<string, number>; revelado: unknown; eliminados?: string[] }

interface Mecanica {
  preparar(e: EstadoPartida, c: Contenido): Preparacion;
  /** Quién debe contestar en esta ronda. */
  quienes(e: EstadoPartida): string[];
  valida(e: EstadoPartida, jugador: string, valor: unknown): boolean;
  /** `c` solo lo usan las mecánicas que sacan cartas al revelar (castigos de la nave). */
  puntuar(e: EstadoPartida, c?: Contenido): Puntuacion;
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
  let pool = cartasPermitidas(e.cfg, c.cartas, mazos);
  if (pool.length === 0) return undefined;
  // Temperatura + Voltaje: sin repetir carta en la partida. Si ya salieron todas, se vuelve a usar el mazo completo.
  if (e.cfg.ejes && e.usadas?.length) {
    const nuevas = pool.filter(x => !e.usadas!.includes(x.id));
    if (nuevas.length) pool = nuevas;
  }
  // Sin repetir entre noches: primero las que no han salido en este aparato. Si ya salieron todas, el mazo completo.
  if (e.cfg.yaSalieron) {
    const nuevas = pool.filter(x => !yaSalio(e.cfg.yaSalieron, x.id));
    if (nuevas.length) pool = nuevas;
  }
  return azarDeRonda(e).elegir(pool);
}

/** Temperatura + Voltaje: anota la carta nueva que quedó en la mesa. Las partidas sin ejes no cambian. */
function anotarCarta(antes: EstadoPartida | undefined, n: EstadoPartida): EstadoPartida {
  const id = n.carta?.id;
  if (!n.cfg.ejes || !id || id === antes?.carta?.id || (n.usadas ?? []).includes(id)) return n;
  return { ...n, usadas: [...(n.usadas ?? []), id] };
}

/** Normaliza una respuesta escrita para comparar: sin acentos, minúsculas, sin espacios de más. */
export function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// ---------- Verdad o reto con herramientas (Maestro 6A.6 B y 6A.11 C4, C9, C13) ----------
// Una herramienta (en orden, ruleta, reloj, dados o cartas de póker) decide quién pregunta y quién responde.
// Quien responde elige Verdad o Reto (Verdad solo una vez por jugador). Quien pregunta decide si la app da la carta
// o la dice en voz alta, y después califica: cumplió o tomó. Con un comodín, quien responde pasa sin tomar.

export type HerramientaVR = "orden" | "ruleta" | "reloj" | "dados" | "poker";
export const HERRAMIENTAS_VR: HerramientaVR[] = ["orden", "ruleta", "reloj", "dados", "poker"];
/** Puntos de cada resultado. «Tomar» da 1 punto, menos que cumplir un reto (decisión de Elías, Maestro 6A.11 C4). */
export const VR_PUNTOS = { verdad: 1, reto: 2, tomar: 1 } as const;
export const conVerdadReto = (e: Pick<EstadoPartida, "motor" | "cfg">) => e.motor === "turnos-cartas" && !!e.cfg.verdadReto;
export interface SeleccionVR {
  herramienta: HerramientaVR; pregunta: string; responde: string;
  /** Dados: lo que sacó cada quien. */ dados?: Record<string, number>;
  /** Póker: carta de cada quien (valor 2 a 14, palo 0 a 3). */ cartas?: Record<string, { v: number; p: number }>;
}
export const seleccionVR = (e: EstadoPartida) => e.seleccion as unknown as SeleccionVR;
/** Etapa de la ronda: elegir (quien responde), fuente (quien pregunta), calificar (quien pregunta) o listo (pasó con comodín). */
export function etapaVR(e: EstadoPartida): "elegir" | "fuente" | "calificar" | "listo" {
  const s = seleccionVR(e);
  if (e.respuestas[s.responde] === "paso" || e.respuestas[s.responde] === "tiempo") return "listo";
  if (!e.vr?.eleccion) return "elegir";
  if (!e.vr.fuente) return "fuente";
  return "calificar";
}

/** Carta de la app para lo que se eligió (respeta nivel, lugar y demás filtros). */
function cartaVR(e: EstadoPartida, c: Contenido, tipo: "verdad" | "reto", cambios: number): EstadoPartida["carta"] {
  const s = seleccionVR(e);
  const carta = sacarCarta({ ...e, cambios }, c, [tipo]);
  const para = e.cfg.jugadores.find(j => j.id === s.responde), otro = e.cfg.jugadores.find(j => j.id === s.pregunta);
  return carta ? { id: carta.id, texto: personalizar(carta.texto, e, para, otro), tipo } : undefined;
}

const verdadRetoNuevo: Mecanica = {
  preparar(e) {
    const azar = azarDeRonda(e), js = ids(e), n = js.length;
    const herramienta = e.cfg.verdadReto?.herramienta ?? "orden";
    let pregunta: string, responde: string;
    const extra: Partial<SeleccionVR> = {};
    if (herramienta === "orden") {
      const k = (e.ronda - 1) % n;
      responde = js[k]!; pregunta = js[(k - 1 + n) % n]!;
    } else if (herramienta === "ruleta") {
      responde = azar.elegir(js); pregunta = azar.elegir(js.filter(j => j !== responde));
    } else if (herramienta === "reloj") {
      // Manecilla chica: quién pregunta. Manecilla grande: quién responde. Pueden caer en vecinos.
      [pregunta, responde] = azar.mezclar(js) as [string, string];
    } else if (herramienta === "dados") {
      // Cada quien tira un dado: el más alto pregunta y el más bajo responde (empates: los desempata el azar).
      const dados: Record<string, number> = {}, desempate: Record<string, number> = {};
      for (const j of js) { dados[j] = azar.entero(6) + 1; desempate[j] = azar.siguiente(); }
      const orden = [...js].sort((a, b) => dados[b]! - dados[a]! || desempate[b]! - desempate[a]!);
      pregunta = orden[0]!; responde = orden[n - 1]!; extra.dados = dados;
    } else {
      // Póker: una carta a cada quien de una baraja; la más alta pregunta y la más baja responde (el palo desempata).
      const baraja = azar.mezclar(Array.from({ length: 52 }, (_, i) => ({ v: 2 + Math.floor(i / 4), p: i % 4 })));
      const cartas: Record<string, { v: number; p: number }> = {};
      js.forEach((j, i) => { cartas[j] = baraja[i]!; });
      const valor = (j: string) => cartas[j]!.v * 4 + cartas[j]!.p;
      const orden = [...js].sort((a, b) => valor(b) - valor(a));
      pregunta = orden[0]!; responde = orden[n - 1]!; extra.cartas = cartas;
    }
    const seleccion: SeleccionVR = { herramienta, pregunta, responde, ...extra };
    return { privado: {}, turnoDe: responde, seleccion: seleccion as unknown as Record<string, unknown> };
  },
  quienes(e) {
    const s = seleccionVR(e), et = etapaVR(e);
    return et === "fuente" || et === "calificar" ? [s.pregunta] : [s.responde];
  },
  valida: (e, _j, v) => etapaVR(e) === "calificar" && (v === "cumplio" || v === "tomo"),
  puntuar(e) {
    const s = seleccionVR(e);
    const propia = e.respuestas[s.responde];
    const resultado = propia === "paso" || propia === "tiempo" ? propia : (e.respuestas[s.pregunta] as "cumplio" | "tomo" | undefined) ?? "paso";
    const esReto = e.vr?.eleccion === "reto";
    const p = resultado === "cumplio" ? (esReto ? VR_PUNTOS.reto : VR_PUNTOS.verdad) : resultado === "tomo" ? VR_PUNTOS.tomar : 0;
    return {
      puntos: { [s.responde]: p },
      retos: { [s.responde]: resultado === "cumplio" && esReto ? 1 : 0 },
      revelado: { jugador: s.responde, pregunta: s.pregunta, eleccion: e.vr?.eleccion ?? null, resultado, cumplio: resultado === "cumplio" },
    };
  },
};

/** Verdad o reto: el jugador en turno cumple (+1 verdad, +2 reto) o pasa (0, sin castigo). */
const turnosCartas: Mecanica = {
  preparar(e, c) {
    // En orden, o la ruleta elige a alguien al azar (la pantalla la gira con `seleccion.indice`).
    const conRuleta = e.cfg.turno === "ruleta";
    const indice = conRuleta ? azarDeRonda(e).entero(e.cfg.jugadores.length) : (e.ronda - 1) % e.cfg.jugadores.length;
    const turno = e.cfg.jugadores[indice];
    const carta = sacarCarta(e, c, ["verdad", "reto"]);
    const otros = e.cfg.jugadores.filter(j => j.id !== turno?.id);
    const otro = otros.length ? azarDeRonda(e).elegir(otros) : undefined;
    return {
      turnoDe: turno?.id,
      privado: {},
      ...(conRuleta ? { seleccion: { indice } } : {}),
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
      const ra = e.respuestas[a] as { eleccion: string; prediccion: string } | undefined;
      const rb = e.respuestas[b] as { eleccion: string; prediccion: string } | undefined;
      // Si falta uno, la predicción del otro no se puede comprobar: nadie suma.
      puntos[a] = ra && rb && ra.prediccion === rb.eleccion ? 1 : 0;
      puntos[b] = ra && rb && rb.prediccion === ra.eleccion ? 1 : 0;
      return { puntos, revelado: { respuestas: e.respuestas } };
    }
    const cuenta = { a: 0, b: 0 };
    for (const j of js) if (j in e.respuestas) cuenta[e.respuestas[j] as "a" | "b"]++;
    const mayoria = cuenta.a === cuenta.b ? null : cuenta.a > cuenta.b ? "a" : "b";
    for (const j of js) puntos[j] = mayoria && e.respuestas[j] === mayoria ? 1 : 0;
    return { puntos, revelado: { cuenta, mayoria, respuestas: e.respuestas } };
  },
};

// ---------- El impostor con eliminación (Maestro v1.44) ----------
// Una vuelta = cada quien que sigue en juego dice o escribe su palabra en orden; luego todos votan.
// El más votado sale (empate: nadie sale). Si atrapan a todos los impostores, ganan los civiles; si los
// impostores igualan a los civiles (o se acaban las vueltas), ganan los impostores. La palabra no cambia
// entre vueltas y solo se revela al final.

/** ¿Esta partida es El impostor con eliminación? */
export const conEliminacion = (e: Pick<EstadoPartida, "motor" | "cfg">) => e.motor === "rol-secreto" && !!e.cfg.impostor;
/** Máximo de impostores para `n` jugadores: siempre menos que los civiles. */
export const maxImpostores = (n: number) => Math.max(1, Math.floor((n - 1) / 2));
/** Quienes siguen en juego. */
export const vivos = (e: EstadoPartida) => ids(e).filter(j => !(e.eliminados ?? []).includes(j));
const ordenVuelta = (e: EstadoPartida) => ((e.seleccion?.orden ?? []) as string[]);
/** «pistas» mientras alguien del orden no ha dicho su palabra; luego «votar». */
export type EtapaImpostor = "papeles" | "pistas" | "votar";
export const etapaImpostor = (e: EstadoPartida): EtapaImpostor => e.naveEtapa ?? (ordenVuelta(e).some(j => !(j in (e.pistas ?? {}))) ? "pistas" : "votar");
const siguienteEnHablar = (e: EstadoPartida, pistas: Record<string, string>) => ordenVuelta(e).find(j => !(j in pistas));
const esImpostor = (e: EstadoPartida, j: string) => (e.privado[j] as { rol?: string } | undefined)?.rol === "impostor";

/** Palabras que pueden salir de un tema: las de siempre y, con más Temperatura, las de ese nivel y los de abajo. */
export function palabrasDeTema(t: TemaImpostor, temperatura: number): string[] {
  if (temperatura < 2 || !t.porNivel) return t.palabras;
  return [...t.palabras, ...(t.porNivel[2] ?? []), ...(temperatura >= 3 ? t.porNivel[3] ?? [] : [])];
}

/** Elige el tema según las opciones: uno fijo, el del escenario o al azar entre los permitidos. */
function temaElegido(e: EstadoPartida, c: Contenido, azar: ReturnType<typeof crearAzar>): TemaImpostor {
  // Las categorías de la nave solo las sortean las partidas con papeles; las demás, nunca (partidas guardadas iguales).
  const nave = !!e.cfg.impostor?.papeles;
  // En la nave lo adulto lo abre solo la Temperatura en Extremo (el Voltaje es para los castigos; Elías, 25 nov).
  const adulto = nave && e.cfg.ejes ? e.cfg.ejes.temperatura === 3 : e.cfg.adulto;
  const permitido = (t: TemaImpostor) => (!t.adulto || adulto) && !!t.soloNave === nave;
  const pedido = e.cfg.impostor?.tema;
  const fijo = pedido === "escenario" ? c.temas.find(t => t.escenario === e.cfg.escenario && permitido(t)) : c.temas.find(t => t.id === pedido && permitido(t));
  if (fijo) return fijo;
  const pool = c.temas.filter(t => permitido(t) && (t.escenario === null || t.escenario === e.cfg.escenario));
  return azar.elegir(pool.length ? pool : c.temas.filter(t => !t.adulto && !!t.soloNave === nave));
}

const impostorEliminacion: Mecanica = {
  preparar(e, c) {
    const azar = azarDeRonda(e);
    let privado = e.privado, carta = e.carta;
    if (e.ronda === 1 || Object.keys(privado).length === 0) {
      // El secreto se reparte una sola vez: misma palabra y mismos impostores toda la partida.
      const tema = temaElegido(e, c, azar);
      const palabra = azar.elegir(palabrasDeTema(tema, e.cfg.ejes?.temperatura ?? 1));
      const cuantos = Math.min(Math.max(1, Math.floor(e.cfg.impostor?.cantidad ?? 1)), maxImpostores(ids(e).length));
      const impostores = azar.mezclar(ids(e)).slice(0, cuantos);
      privado = {};
      for (const j of ids(e)) {
        const pista = e.cfg.impostor?.pista ? tema.pistas?.[palabra] : undefined;
        privado[j] = impostores.includes(j)
          ? { rol: "impostor", tema: tema.nombre, companeros: impostores.filter(x => x !== j), ...(pista ? { pista } : {}) }
          : { rol: "civil", tema: tema.nombre, palabra };
      }
      carta = { id: `tema-${tema.id}`, texto: tema.nombre };
    }
    // Orden de la vuelta: empieza alguien al azar y sigue el orden de la sala, solo quienes siguen en juego.
    const quedan = vivos(e);
    const inicio = quedan.length ? azar.entero(quedan.length) : 0;
    const orden = [...quedan.slice(inicio), ...quedan.slice(0, inicio)];
    return { privado, carta, turnoDe: orden[0], seleccion: { orden } };
  },
  quienes: e => (e.naveEtapa ? [] : etapaImpostor(e) === "pistas" ? (e.turnoDe ? [e.turnoDe] : []) : vivos(e)),
  valida: (e, j, v) => etapaImpostor(e) === "votar" && typeof v === "string" && ((enNave(e) && v === SALTAR_VOTO) || (v !== j && vivos(e).includes(v))),
  puntuar(e, c) {
    const quedan = vivos(e), nave = enNave(e);
    const votos: Record<string, number> = {};
    let saltos = 0;
    for (const j of quedan) {
      const v = e.respuestas[j] as string | undefined;
      if (v === SALTAR_VOTO && nave) saltos++;
      else if (v) votos[v] = (votos[v] ?? 0) + 1;
    }
    const max = Math.max(0, ...Object.values(votos));
    const masVotados = Object.keys(votos).filter(k => votos[k] === max);
    // Empate entre personas, o «Nadie» con tantos votos o más que el más votado: nadie sale.
    const eliminado = max > 0 && masVotados.length === 1 && max > saltos ? masVotados[0]! : null;
    const eliminados = eliminado ? [...(e.eliminados ?? []), eliminado] : [...(e.eliminados ?? [])];
    const siguen = ids(e).filter(j => !eliminados.includes(j));
    const impostoresVivos = siguen.filter(j => esImpostor(e, j)).length;
    const civilesVivos = siguen.length - impostoresVivos;
    const fin = impostoresVivos === 0 ? "civiles" : impostoresVivos >= civilesVivos || e.ronda >= e.totalRondas ? "impostores" : null;
    const puntos: Record<string, number> = {};
    for (const j of quedan) {
      const voto = e.respuestas[j] as string | undefined;
      let p = 0;
      if (esImpostor(e, j)) { if (j !== eliminado) p += 1; } // sobrevivir a la votación
      else if (voto && esImpostor(e, voto)) p += 1; // votar por un impostor
      puntos[j] = p;
    }
    // Premio final: en la nave +5 a cada impostor o +3 a cada civil (Elías, 24 nov); antes +3 / +2.
    const premio = fin === "impostores" ? (nave ? 5 : 3) : (nave ? 3 : 2);
    if (fin) for (const j of ids(e)) if ((fin === "impostores") === esImpostor(e, j)) puntos[j] = (puntos[j] ?? 0) + premio;
    const civil = ids(e).find(j => !esImpostor(e, j));
    const final = fin ? { palabra: (e.privado[civil ?? ""] as { palabra?: string } | undefined)?.palabra ?? "", impostores: ids(e).filter(j => esImpostor(e, j)) } : {};
    if (!nave) {
      return {
        puntos, eliminados,
        revelado: { votos, eliminado, eraImpostor: eliminado ? esImpostor(e, eliminado) : false, empate: masVotados.length > 1, quedan: impostoresVivos, fin, ...final },
      };
    }
    // «No revelar hasta descubrir a todos»: mientras la partida sigue, no se dice si el expulsado era impostor ni cuántos quedan.
    const secreto = e.cfg.impostor?.revelar === false && !fin;
    const castigos = fin && e.cfg.impostor?.castigo && c ? castigosNave(e, c, fin) : undefined;
    return {
      puntos, eliminados,
      revelado: {
        votos, saltos, eliminado, empate: masVotados.length > 1 || (max > 0 && saltos >= max), fin,
        ...(secreto ? { secreto: true } : { eraImpostor: eliminado ? esImpostor(e, eliminado) : false, quedan: impostoresVivos }),
        ...final, ...(castigos ? { castigos } : {}),
      },
    };
  },
};

/** Valor del voto «Nadie» (saltar el voto) en la nave. */
export const SALTAR_VOTO = "saltar";
/** ¿Esta partida juega El impostor con las reglas de la nave? */
export const enNave = (e: Pick<EstadoPartida, "motor" | "cfg">) => conEliminacion(e) && !!e.cfg.impostor?.nave;
/** ¿Esta partida de la nave reparte papeles en la mesa antes de la primera vuelta? */
export const conPapeles = (e: Pick<EstadoPartida, "motor" | "cfg">) => enNave(e) && !!e.cfg.impostor?.papeles;

/** Acciones que valen mientras cada quien ve su papel. */
const EN_PAPELES = new Set(["visto", "discutir", "comenzar", "terminar", "pausar", "reanudar", "xp-reto", "pasar-control"]);

/** Castigo de la nave: a cada civil si ganan los impostores, o a cada impostor si pierden. Con Drunk, cartas de trago
 * (siempre «de lo que tengas»); sin Drunk, castigos leves. Sale con la semilla de la partida: se reconstruye igual. */
function castigosNave(e: EstadoPartida, c: Contenido, fin: "civiles" | "impostores"): Record<string, { texto: string; trago: boolean }> {
  const perdedores = ids(e).filter(j => esImpostor(e, j) === (fin === "civiles"));
  const permitidas = cartasPermitidas(e.cfg, c.cartas, ["castigo-nave"]);
  // Voltaje (Elías, 25 nov): cada nivel saca sus castigos; si no hay de ese nivel, los del nivel de abajo.
  const voltaje = e.cfg.ejes?.voltaje ?? 1;
  const nivelDe = (x: { nivel?: number }) => x.nivel ?? 1;
  const hay = (n: number) => permitidas.some(x => nivelDe(x) === n && x.drunk === !!e.cfg.drunk);
  const nivel = [voltaje, 2, 1].find(n => n <= voltaje && hay(n)) ?? 1;
  const delTipo = permitidas.filter(x => x.drunk === !!e.cfg.drunk && nivelDe(x) === nivel);
  const pool = crearAzar(e.semilla * 53 + 4099).mezclar(delTipo.length ? delTipo : permitidas.filter(x => !x.drunk));
  const out: Record<string, { texto: string; trago: boolean }> = {};
  if (!pool.length) return out;
  perdedores.forEach((j, i) => { const x = pool[i % pool.length]!; out[j] = { texto: x.texto, trago: x.drunk }; });
  return out;
}

/** El impostor: todos ven la palabra menos uno. Votan a quién creen impostor. */
const rolSecretoClasico: Mecanica = {
  preparar(e, c) {
    const azar = azarDeRonda(e);
    const clasicos = c.temas.filter(t => !t.soloConfig && !t.soloNave);
    const temas = clasicos.filter(t => (!t.adulto || e.cfg.adulto) && (t.escenario === null || t.escenario === e.cfg.escenario));
    const tema = azar.elegir(temas.length ? temas : clasicos.filter(t => !t.adulto));
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
    for (const j of ids(e)) { const v = e.respuestas[j] as string | undefined; if (v) votos[v] = (votos[v] ?? 0) + 1; }
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
      const ra = e.respuestas[a], rb = e.respuestas[b];
      const coinciden = typeof ra === "string" && typeof rb === "string" && normalizar(ra) === normalizar(rb);
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
    for (const j of ids(e)) { const v = e.respuestas[j] as string | undefined; if (v) votos[v] = (votos[v] ?? 0) + 1; }
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

// ---------- Juego físico (ALV_PLAN_MODOS_DE_JUEGO.md §5, D5 y D6) ----------
// Los retos se hacen en persona. Cada ronda sale un reto sugerido (mazo de competencias del lugar) que el administrador
// puede cambiar. El administrador da o quita puntos a cualquiera (se ven al momento) y usa herramientas: dados, ruleta,
// una carta, un orden al azar o un cronómetro. Lo que sale es público. Al tocar «Terminar ronda» se revela el resumen.
// Todo llega como «contestar» del administrador: { puntos }, { herramienta }, { otro } o "listo".

// ALV FÍSICO (Elías, 27 nov): el modo es un complemento para jugar en persona. Además de dados, ruleta, carta, orden y
// cronómetro, salen una palabra (mazo «palabra», con sus prohibidas) y una pregunta (mazo «verdad») para alguien al azar.
// Las dos respetan los mismos filtros del motor (lugar, escenario, Temperatura, Drunk, parejas). Nadie gana puntos por
// usar una herramienta: los puntos solo los da el administrador.
export type HerramientaFisico = "dados" | "ruleta" | "carta" | "orden" | "cronometro" | "palabra" | "pregunta";
export const HERRAMIENTAS_FISICO: HerramientaFisico[] = ["dados", "ruleta", "carta", "orden", "cronometro", "palabra", "pregunta"];
/** Lo público de la ronda física: puntos dados en la ronda y la última herramienta usada (`n` sube con cada uso). */
export interface SeleccionFisico {
  deltas: Record<string, number>;
  herr?: {
    tipo: HerramientaFisico; n: number; dados?: [number, number]; jugador?: string; carta?: { v: number; p: number }; orden?: string[]; segundos?: number;
    /** Palabra o pregunta que salió (id de la carta, texto ya personalizado y, en la palabra, sus prohibidas). */
    texto?: { id: string; texto: string; prohibidas?: string[] };
  };
}
export const MAX_DELTA_FISICO = 5;
export const conFisico = (e: Pick<EstadoPartida, "motor">) => e.motor === "fisico";
export const seleccionFisico = (e: Pick<EstadoPartida, "seleccion">) => (e.seleccion ?? { deltas: {} }) as unknown as SeleccionFisico;
/** Quien da los puntos: el que tiene el control (el anfitrión) o, si no hay, el primero de la lista. */
export const adminFisico = (e: EstadoPartida) => e.control ?? e.cfg.jugadores[0]?.id ?? "";

const fisico: Mecanica = {
  preparar(e, c) {
    const carta = sacarCarta(e, c, ["competencia"]);
    return { privado: {}, seleccion: { deltas: {} }, carta: carta && { id: carta.id, texto: carta.texto, tipo: carta.descripcion ?? "" } };
  },
  quienes: e => [adminFisico(e)],
  valida: (_e, _j, v) => v === "listo",
  puntuar(e) {
    const d = seleccionFisico(e).deltas;
    // Los puntos ya se sumaron al darlos. Quien terminó la ronda arriba cuenta como reto cumplido.
    return { puntos: {}, retos: Object.fromEntries(Object.entries(d).map(([j, x]) => [j, x > 0 ? 1 : 0])), revelado: { deltas: { ...d } } };
  },
};

/** Aplica lo que manda el administrador en el juego físico. Devuelve null si no es una jugada física. */
function jugadaFisico(e: EstadoPartida, jugador: string, valor: unknown, c: Contenido): EstadoPartida | null {
  if (!conFisico(e) || e.fase !== "contestando" || e.pausada || jugador !== adminFisico(e) || typeof valor !== "object" || !valor) return null;
  const v = valor as { puntos?: { jugador?: unknown; delta?: unknown }; herramienta?: unknown; segundos?: unknown; otro?: unknown };
  const s = seleccionFisico(e);
  if (v.puntos) {
    const j = v.puntos.jugador, d = v.puntos.delta;
    if (typeof j !== "string" || !ids(e).includes(j) || !Number.isInteger(d) || d === 0 || Math.abs(d as number) > MAX_DELTA_FISICO) return e;
    const deltas = { ...s.deltas, [j]: (s.deltas[j] ?? 0) + (d as number) };
    return { ...e, puntos: { ...e.puntos, [j]: (e.puntos[j] ?? 0) + (d as number) }, seleccion: { ...s, deltas } as unknown as Record<string, unknown>,
      bitacora: registrar(e, "puntos", j, { delta: d }) };
  }
  if (typeof v.herramienta === "string") {
    const tipo = v.herramienta as HerramientaFisico;
    if (!HERRAMIENTAS_FISICO.includes(tipo)) return e;
    const n = (s.herr?.n ?? 0) + 1;
    const azar = crearAzar(e.semilla * 53 + e.ronda * 977 + n * 7919);
    const js = ids(e);
    const herr: SeleccionFisico["herr"] = { tipo, n };
    if (tipo === "dados") herr.dados = [azar.entero(6) + 1, azar.entero(6) + 1];
    else if (tipo === "ruleta") herr.jugador = azar.elegir(js);
    else if (tipo === "carta") herr.carta = { v: 2 + azar.entero(13), p: azar.entero(4) };
    else if (tipo === "orden") herr.orden = azar.mezclar(js);
    else if (tipo === "palabra" || tipo === "pregunta") {
      const mazo = tipo === "palabra" ? "palabra" : "verdad";
      const antes = s.herr?.tipo === tipo ? s.herr.texto?.id : undefined;
      // Otra semilla por uso; hasta 6 intentos para que no repita la que está en la mesa.
      let carta: Carta | undefined;
      for (let t = 0; t < 6 && (!carta || carta.id === antes); t++) carta = sacarCarta({ ...e, cambios: e.cambios + n * 131 + t * 17 }, c, [mazo]);
      if (!carta) return e;
      if (tipo === "pregunta") {
        herr.jugador = azar.elegir(js);
        const para = e.cfg.jugadores.find(j => j.id === herr.jugador);
        const otro = azar.elegir(e.cfg.jugadores.filter(j => j.id !== herr.jugador));
        herr.texto = { id: carta.id, texto: personalizar(carta.texto, e, para, otro) };
      } else herr.texto = { id: carta.id, texto: carta.texto, ...(carta.prohibidas?.length ? { prohibidas: carta.prohibidas.slice(0, 5) } : {}) };
    } else {
      const seg = v.segundos;
      if (!Number.isInteger(seg) || (seg as number) < 5 || (seg as number) > 300) return e;
      herr.segundos = seg as number;
    }
    return { ...e, seleccion: { ...s, herr } as unknown as Record<string, unknown>, bitacora: registrar(e, "herramienta", jugador, { tipo }) };
  }
  if (v.otro === true) {
    // Otro reto sugerido: se vuelve a sacar con otra semilla; los puntos y la herramienta de la ronda se quedan.
    // Se intenta hasta 6 veces que salga una distinta a la de la mesa (si el mazo del lugar es chico, puede repetirse).
    let cambios = e.cambios + 1, carta = sacarCarta({ ...e, cambios }, c, ["competencia"]);
    for (let t = 0; t < 5 && carta && carta.id === e.carta?.id; t++) carta = sacarCarta({ ...e, cambios: ++cambios }, c, ["competencia"]);
    return { ...e, cambios, carta: carta && { id: carta.id, texto: carta.texto, tipo: carta.descripcion ?? "" }, bitacora: registrar(e, "otro-reto", jugador) };
  }
  return e;
}

const MECANICAS: Record<Motor, Mecanica> = {
  "turnos-cartas": turnosCartas, votacion, "rol-secreto": rolSecretoClasico, pareja,
  botella, ruleta, dados, conteo, confesion, senalar, competencia, fisico,
};
/** La mecánica que corre esta partida (El impostor tiene dos: clásico y con eliminación). */
const mecanica = (e: EstadoPartida): Mecanica => (conEliminacion(e) ? impostorEliminacion : conVerdadReto(e) ? verdadRetoNuevo : MECANICAS[e.motor]);

/** Quién debe contestar en la ronda actual. */
export const quienesContestan = (e: EstadoPartida): string[] => mecanica(e).quienes(e);

// ---------- Máquina de estados ----------

function prepararRonda(e: EstadoPartida, c: Contenido): EstadoPartida {
  const p = mecanica(e).preparar(e, c);
  return { ...e, fase: "contestando", carta: p.carta, privado: p.privado, turnoDe: p.turnoDe, seleccion: p.seleccion, respuestas: {}, revelado: undefined, pistas: {}, ausentes: undefined, esperas: 0, vr: undefined };
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
  // Papeles en la mesa: nace con los papeles repartidos; «discutir» abre la primera vuelta.
  if (cfg.impostor?.papeles && juego.motor === "rol-secreto") return { ...prepararRonda(base, contenido), naveEtapa: "papeles", vistos: [], palabrasVueltas: {} };
  return anotarCarta(undefined, prepararRonda(base, contenido));
}

/** Pasa la ronda a «revelada». Los `ausentes` (si hay) no contestaron: no puntúan ni ganan retos esa ronda. */
function revelarRonda(e: EstadoPartida, ausentes: string[], contenido?: Contenido): EstadoPartida {
  const p = mecanica(e).puntuar(e, contenido);
  const puntos = { ...e.puntos }, retos = { ...e.retos };
  for (const [j, v] of Object.entries(p.puntos)) if (!ausentes.includes(j)) puntos[j] = (puntos[j] ?? 0) + v;
  let manos = e.manos;
  const azar = azarDeRonda(e);
  for (const [j, v] of Object.entries(p.retos ?? {})) {
    if (ausentes.includes(j)) continue;
    const antes = retos[j] ?? 0;
    retos[j] = antes + v;
    // Cada 3 retos cumplidos se gana una carta de poder.
    if (v > 0 && Math.floor(retos[j]! / RETOS_POR_CARTA) > Math.floor(antes / RETOS_POR_CARTA)) manos = conCarta(manos, j, azar.elegir(IDS_PODER));
  }
  return { ...e, fase: "revelada", puntos, retos, manos, revelado: p.revelado, ...(p.eliminados ? { eliminados: p.eliminados } : {}), ...(ausentes.length ? { ausentes } : {}), bitacora: registrar(e, "revelada", undefined, ausentes.length ? { ...(p.revelado as object), ausentes } : p.revelado) };
}

/** Aplica una acción. Si es repetida o no es válida en este momento, devuelve el mismo estado sin cambios. */
export function aplicar(e: EstadoPartida, a: Accion, contenido: Contenido): EstadoPartida {
  if (e.accionesVistas.includes(a.id) || e.fase === "terminada") return e;
  const m = mecanica(e);
  const visto = [...e.accionesVistas, a.id];
  const sube = (n: EstadoPartida): EstadoPartida => anotarCarta(e, { ...n, version: e.version + 1, accionesVistas: visto });
  // Papeles: solo pasan sus propias acciones y las del anfitrión que no tocan la ronda.
  if (e.naveEtapa && !EN_PAPELES.has(a.tipo)) return e;

  switch (a.tipo) {
    case "contestar": {
      // Verdad o reto nuevo: las dos primeras etapas (elegir y fuente) se mandan como «contestar» y no son la respuesta final.
      if (conVerdadReto(e) && !e.pausada && e.fase === "contestando") {
        const et = etapaVR(e), s = seleccionVR(e), v = (a.valor ?? {}) as { elige?: unknown; fuente?: unknown };
        if (et === "elegir") {
          if (a.jugador !== s.responde || (v.elige !== "verdad" && v.elige !== "reto")) return e;
          if (v.elige === "verdad" && (e.verdadUsada ?? []).includes(a.jugador)) return e; // solo una Verdad por jugador
          const verdadUsada = v.elige === "verdad" ? [...(e.verdadUsada ?? []), a.jugador] : e.verdadUsada;
          return sube({ ...e, vr: { eleccion: v.elige }, ...(verdadUsada ? { verdadUsada } : {}), bitacora: registrar(e, "elige", a.jugador, { opcion: v.elige }) });
        }
        if (et === "fuente") {
          if (a.jugador !== s.pregunta || (v.fuente !== "app" && v.fuente !== "voz")) return e;
          const carta = v.fuente === "app" ? cartaVR(e, contenido, e.vr!.eleccion!, e.cambios) : undefined;
          return sube({ ...e, vr: { ...e.vr, fuente: v.fuente }, carta, bitacora: registrar(e, "fuente", a.jugador, { fuente: v.fuente }) });
        }
      }
      // Juego físico: puntos, herramientas y otro reto no son la respuesta final («listo» sí).
      if (conFisico(e) && a.valor !== "listo") {
        const n = jugadaFisico(e, a.jugador, a.valor, contenido);
        return !n || n === e ? e : sube(n);
      }
      if (e.pausada) return e;
      if (e.fase !== "contestando" || !m.quienes(e).includes(a.jugador) || a.jugador in e.respuestas) return e;
      if (!m.valida(e, a.jugador, a.valor)) return e;
      return sube({ ...e, respuestas: { ...e.respuestas, [a.jugador]: a.valor }, bitacora: registrar(e, "contesto", a.jugador) });
    }
    case "revelar": {
      if (e.fase !== "contestando" || !m.quienes(e).every(j => j in e.respuestas)) return e;
      return sube(revelarRonda(e, [], contenido));
    }
    case "seguir-sin": {
      const quienes = m.quienes(e), faltan = quienes.filter(j => !(j in e.respuestas));
      // Solo con al menos una respuesta y al menos una falta. Si nadie contestó, la salida es «saltar».
      if (e.fase !== "contestando" || faltan.length === 0 || faltan.length === quienes.length) return e;
      return sube(revelarRonda(e, faltan, contenido));
    }
    case "esperar": {
      if (e.fase !== "contestando") return e;
      return sube({ ...e, esperas: (e.esperas ?? 0) + 1, bitacora: registrar(e, "espera") });
    }
    case "siguiente": {
      if (e.fase !== "revelada") return e;
      const acaba = conEliminacion(e) ? !!(e.revelado as { fin?: unknown } | undefined)?.fin || e.ronda >= e.totalRondas : e.ronda >= e.totalRondas;
      if (acaba) return sube({ ...e, fase: "terminada", bitacora: registrar(e, "terminada") });
      // Papeles: las palabras de la vuelta que se cierra quedan en el tablero.
      const palabrasVueltas = conPapeles(e) ? Object.fromEntries(ids(e).map(j => [j, [...(e.palabrasVueltas?.[j] ?? []), ...(e.pistas?.[j] ? [e.pistas[j]!] : [])]])) : undefined;
      const n = prepararRonda({ ...e, ronda: e.ronda + 1, cambios: 0, ...(palabrasVueltas ? { palabrasVueltas } : {}) }, contenido);
      return sube({ ...n, bitacora: registrar(e, "ronda", undefined, { ronda: e.ronda + 1 }) });
    }
    case "terminar":
      return sube({ ...e, fase: "terminada", bitacora: registrar(e, "terminada") });
    case "dar-carta": {
      if (!IDS_PODER.includes(a.carta) || !(a.jugador in e.manos) || (e.manos[a.jugador]?.length ?? 0) >= MAX_EN_MANO) return e;
      return sube({ ...e, manos: conCarta(e.manos, a.jugador, a.carta), bitacora: registrar(e, "carta-recibida", a.jugador, { carta: a.carta }) });
    }
    case "pausar":
      return e.pausada ? e : sube({ ...e, pausada: true, bitacora: registrar(e, "pausada") });
    case "reanudar":
      return e.pausada ? sube({ ...e, pausada: false, bitacora: registrar(e, "reanudada") }) : e;
    case "saltar": {
      if (e.fase !== "contestando") return e;
      // El impostor con eliminación: saltar en la vuelta de palabras salta solo a quien le toca hablar.
      if (conEliminacion(e) && etapaImpostor(e) === "pistas" && e.turnoDe) {
        const pistas = { ...(e.pistas ?? {}), [e.turnoDe]: "…" };
        return sube({ ...e, pistas, turnoDe: siguienteEnHablar(e, pistas), bitacora: registrar(e, "turno-saltado", e.turnoDe) });
      }
      return sube({ ...e, fase: "revelada", revelado: { saltada: true }, bitacora: registrar(e, "saltada") });
    }
    case "pista": {
      const texto = typeof a.texto === "string" ? a.texto.replace(/\s+/g, " ").trim().slice(0, MAX_PISTA) : "";
      if (e.motor !== "rol-secreto" || e.fase !== "contestando" || !ids(e).includes(a.jugador) || !texto) return e;
      if (e.pausada && conEliminacion(e)) return e;
      if (conEliminacion(e)) {
        // Solo habla quien tiene el turno; al terminar pasa al siguiente y, cuando todos hablaron, se vota.
        if (etapaImpostor(e) !== "pistas" || a.jugador !== e.turnoDe) return e;
        const pistas = { ...(e.pistas ?? {}), [a.jugador]: texto };
        return sube({ ...e, pistas, turnoDe: siguienteEnHablar(e, pistas), bitacora: registrar(e, "pista", a.jugador) });
      }
      return sube({ ...e, pistas: { ...(e.pistas ?? {}), [a.jugador]: texto }, bitacora: registrar(e, "pista", a.jugador) });
    }
    case "xp-reto": {
      if (!ids(e).includes(a.jugador) || !Number.isInteger(a.xp) || a.xp < 1 || a.xp > 200) return e;
      const xpReto = { ...(e.xpReto ?? {}), [a.jugador]: (e.xpReto?.[a.jugador] ?? 0) + a.xp };
      return sube({ ...e, xpReto, bitacora: registrar(e, "xp-reto", a.jugador, { xp: a.xp }) });
    }
    case "ruleta": {
      const n = (e.ruletaExtra?.n ?? 0) + 1;
      const azar = crearAzar(e.semilla * 31 + e.ronda * 101 + n * 7907);
      const j = azar.elegir(e.cfg.jugadores);
      const pool = cartasPermitidas(e.cfg, contenido.cartas, ["castigo", "castigo-iva"]);
      if (!pool.length) return e;
      const otros = e.cfg.jugadores.filter(x => x.id !== j.id);
      const texto = personalizar(azar.elegir(pool).texto, e, j, otros.length ? azar.elegir(otros) : undefined);
      return sube({ ...e, ruletaExtra: { jugador: j.id, texto, n }, bitacora: registrar(e, "ruleta", j.id) });
    }
    case "tiempo": {
      // Temporizador: se acabó el tiempo del turno. El impostor salta a quien no dijo su palabra; en Verdad o reto,
      // si nadie decidió la fuente sale la carta de ALV, y si quien responde no eligió o no cumplió, pierde el turno (0).
      if (!e.cfg.temporizador || e.fase !== "contestando" || e.pausada || enCarga(e)) return e;
      if (conEliminacion(e) && etapaImpostor(e) === "pistas" && e.turnoDe) {
        const pistas = { ...(e.pistas ?? {}), [e.turnoDe]: "…" };
        return sube({ ...e, pistas, turnoDe: siguienteEnHablar(e, pistas), bitacora: registrar(e, "tiempo", e.turnoDe) });
      }
      if (conVerdadReto(e)) {
        const et = etapaVR(e), s = seleccionVR(e);
        if (et === "listo") return e;
        if (et === "fuente") return sube({ ...e, vr: { ...e.vr, fuente: "app" }, carta: cartaVR(e, contenido, e.vr!.eleccion!, e.cambios), bitacora: registrar(e, "tiempo", s.pregunta) });
        return sube({ ...e, respuestas: { ...e.respuestas, [s.responde]: "tiempo" }, bitacora: registrar(e, "tiempo", s.responde) });
      }
      return e;
    }
    case "visto": {
      if (e.naveEtapa !== "papeles" || !ids(e).includes(a.jugador) || (e.vistos ?? []).includes(a.jugador)) return e;
      return sube({ ...e, vistos: [...(e.vistos ?? []), a.jugador], bitacora: registrar(e, "visto", a.jugador) });
    }
    case "discutir": {
      if (e.naveEtapa !== "papeles") return e;
      return sube({ ...e, naveEtapa: undefined, bitacora: registrar(e, "discusion") });
    }
    case "comenzar":
      return !e.cfg.explicar || e.comenzada ? e : sube({ ...e, comenzada: true, bitacora: registrar(e, "comenzada") });
    case "pasar-control": {
      if (!ids(e).includes(a.jugador) || a.jugador === e.control) return e;
      return sube({ ...e, control: a.jugador, bitacora: registrar(e, "control", a.jugador) });
    }
    case "usar-carta": {
      if (e.pausada) return e;
      const mano = e.manos[a.jugador] ?? [];
      const i = mano.indexOf(a.carta);
      if (i < 0 || e.fase !== "contestando") return e;
      const esTurno = ["turnos-cartas", "botella", "ruleta", "dados"].includes(e.motor) && a.jugador === e.turnoDe && !(a.jugador in e.respuestas);
      // Escudo, Pasa turno y Cambio solo los usa quien está en turno; las demás son sociales y el anfitrión las hace cumplir.
      if (["escudo", "turno", "cambio"].includes(a.carta) && !esTurno) return e;
      const manos = { ...e.manos, [a.jugador]: mano.filter((_, k) => k !== i) };
      let n: EstadoPartida = { ...e, manos, cartaUsada: { jugador: a.jugador, carta: a.carta, ronda: e.ronda }, bitacora: registrar(e, "carta-usada", a.jugador, { carta: a.carta }) };
      if (a.carta === "escudo" || a.carta === "turno") n = { ...n, respuestas: { ...n.respuestas, [a.jugador]: "paso" } };
      if (a.carta === "cambio") {
        // Verdad o reto nuevo: cambia solo la carta que dio la app (si la pregunta se dice en voz alta, no hay carta que cambiar).
        if (conVerdadReto(e)) {
          if (!e.carta || !e.vr?.eleccion) return e;
          n = { ...n, cambios: e.cambios + 1, carta: cartaVR(e, contenido, e.vr.eleccion, e.cambios + 1) };
        } else n = prepararRonda({ ...n, cambios: e.cambios + 1 }, contenido);
      }
      return sube(n);
    }
  }
}

/** Ranking final y XP por jugador (la XP real la confirma el servidor con la misma regla). */
/** Puntos por equipo (suma de sus integrantes), de mayor a menor. Vacío si nadie tiene equipo. */
export function puntosPorEquipo(e: EstadoPartida): { equipo: string; puntos: number; jugadores: string[] }[] {
  const mapa = new Map<string, { puntos: number; jugadores: string[] }>();
  for (const j of e.cfg.jugadores) {
    if (!j.equipo) continue;
    const t = mapa.get(j.equipo) ?? { puntos: 0, jugadores: [] };
    t.puntos += e.puntos[j.id] ?? 0;
    t.jugadores.push(j.id);
    mapa.set(j.equipo, t);
  }
  return [...mapa].map(([equipo, t]) => ({ equipo, ...t })).sort((a, b) => b.puntos - a.puntos || a.equipo.localeCompare(b.equipo));
}

/** ¿La partida se gana por grupo (parejas, equipos o guerra de sexos)? */
export const porGrupos = (e: Pick<EstadoPartida, "cfg">) => !!e.cfg.modalidad && e.cfg.modalidad !== "individual" && e.cfg.jugadores.some(j => j.equipo);

export function resultados(e: EstadoPartida) {
  const rondasJugadas = e.bitacora.filter(b => b.tipo === "revelada").length;
  // En parejas, equipos o guerra de sexos el lugar sale de los puntos del grupo: gana el grupo entero.
  const delGrupo = porGrupos(e) ? new Map(puntosPorEquipo(e).flatMap(g => g.jugadores.map(j => [j, g.puntos] as const))) : null;
  const valor = (id: string) => delGrupo?.get(id) ?? e.puntos[id] ?? 0;
  const orden = [...e.cfg.jugadores].sort((x, y) => valor(y.id) - valor(x.id));
  let lugar = 0, previo: number | null = null;
  return orden.map((j, i) => {
    const p = e.puntos[j.id] ?? 0;
    const v = valor(j.id);
    if (v !== previo) { lugar = i + 1; previo = v; }
    const xp = xpDePartida({ rondas: rondasJugadas, retosCumplidos: e.retos[j.id] ?? 0, lugar }, e.cfg.jugadores.length);
    // rondas y retos van al servidor, que vuelve a calcular la XP con la misma fórmula.
    return { jugador: j.id, nombre: j.nombre, puntos: p, lugar, xp, rondas: rondasJugadas, retos: e.retos[j.id] ?? 0 };
  });
}
