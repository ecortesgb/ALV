// Núcleo del motor de la sala, sin React, sin navegador y sin Supabase: se puede correr en el navegador o en Deno
// (Edge Function, Fase 1 del motor en el servidor). Antes vivía dentro de roles/pantalla/motor.ts; ese archivo lo
// reexporta y conserva solo lo que necesita el navegador (useMotor, timers, enlace con la base).
// Las reglas no se cambian aquí: siguen en partida.ts y vistas.ts. Este archivo solo traduce filas guardadas a
// acciones, reconstruye la partida, arma lo que se publica y calcula las señales del reloj lógico.
import { CONTENIDO } from "../content";
import { ESCENARIOS, JUEGOS } from "../content/catalogo";
import { aplicar, conEliminacion, conVerdadReto, crearPartida, enCarga, etapaImpostor, etapaVR, HERRAMIENTAS_VR, maxImpostores, parejasPorDecidir, type Accion, type EstadoPartida, type HerramientaVR } from "./partida";
import { adultoPorEjes } from "./filtros";
import { limpiarSalieron } from "./yaSalieron";
import type { Configuracion, EjesPartida, Jugador, NivelEje, OpcionesPartida } from "./types";
import { vistaJugador, vistaPublica } from "./vistas";

/** Misma forma que la fila de `servicios/enlace.ts` (se repite aquí para no depender de servicios). */
export type TipoFila = "contestar" | "carta" | "pista" | "control";
export interface FilaAccion { id: string; jugador: string; tipo: TipoFila; datos: Record<string, unknown>; creada: string }

export interface Arranque { semilla: number; juego: string; rondas: number; cfg: Configuracion }
export const SUSPENSO_MS = 2000;
/** P-03: sin respuesta de alguien, a los 20 s el anfitrión elige esperar o seguir sin él. «Esperar» rearma el mismo intervalo. */
export const ESPERA_MS = 20000;
export const CONTROL_SIMPLE = new Set(["pausar", "reanudar", "saltar", "seguir-sin", "esperar", "revelar", "siguiente", "terminar", "ruleta", "tiempo", "comenzar", "discutir"]);

/** Parejas por orden de llegada (1 con 2, 3 con 4…). Solo si son pares. */
export function conParejas(miembros: { id: string; nombre: string }[]) {
  return miembros.map((m, i) => ({ id: m.id, nombre: m.nombre, ...(miembros.length % 2 === 0 ? { parejaDe: miembros[i % 2 === 0 ? i + 1 : i - 1]!.id } : {}) }));
}

/** Nivel 1 a 3 válido (lo que llega del navegador no es confiable). */
const nivelEje = (x: unknown): NivelEje => (x === 2 || x === 3 ? x : 1);
/** Temperatura + Voltaje del configurador, ya revisados. */
export function ejesDe(op: OpcionesPartida): (EjesPartida & { drunk: boolean }) | null {
  if (!op.ejes || typeof op.ejes !== "object") return null;
  return { temperatura: nivelEje(op.ejes.temperatura), voltaje: nivelEje(op.ejes.voltaje), drunk: op.ejes.drunk === true };
}
/** Equivalente en la escala vieja de 4 niveles (solo para el rango de cada juego): 1 → 1, 2 → 3, 3 → 4. */
export const intensidadVieja = (e: EjesPartida) => ([1, 1, 3, 4] as const)[Math.max(e.temperatura, e.voltaje)]!;

/** Juegos donde el temporizador por turno funciona hoy. */
export const JUEGOS_CON_TEMPORIZADOR = ["impostor", "verdad-reto"];

/** Nombres de los grupos de cada tipo de partida. */
export const GRUPOS_EQUIPOS = [{ id: "a", nombre: "Equipo A" }, { id: "b", nombre: "Equipo B" }, { id: "c", nombre: "Equipo C" }, { id: "d", nombre: "Equipo D" }] as const;
export const GRUPOS_SEXOS = [{ id: "ellas", nombre: "Ellas" }, { id: "ellos", nombre: "Ellos" }] as const;

/**
 * Grupos de la partida según el tipo. Parejas: por orden de llegada (1 con 2, 3 con 4…), pide número par.
 * Equipos y guerra de sexos: cada jugador con su grupo en `grupos`; pide al menos dos grupos con gente.
 * Devuelve null si no se puede armar.
 */
/** Nombre de grupo que puso el anfitrión, limpio (sin saltos ni controles, 1 a 20 letras), o undefined. */
export function nombreGrupo(op: OpcionesPartida, id: string): string | undefined {
  const n = op.nombres?.[id];
  if (typeof n !== "string") return undefined;
  const sinControl = [...n].filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127).join("");
  const limpio = sinControl.replace(/\s+/g, " ").trim().slice(0, 20);
  return limpio || undefined;
}

export function armarGrupos(jugadores: Jugador[], op: OpcionesPartida): { jugadores: Jugador[]; equipos?: { id: string; nombre: string }[] } | null {
  const r = armarGruposBase(jugadores, op);
  if (!r?.equipos || !op.nombres) return r;
  return { ...r, equipos: r.equipos.map(g => ({ ...g, nombre: nombreGrupo(op, g.id) ?? g.nombre })) };
}

function armarGruposBase(jugadores: Jugador[], op: OpcionesPartida): { jugadores: Jugador[]; equipos?: { id: string; nombre: string }[] } | null {
  const tipo = op.modalidad ?? "individual";
  if (tipo === "individual") return { jugadores };
  if (tipo === "parejas") {
    if (jugadores.length < 4 || jugadores.length % 2 !== 0) return null;
    // Parejas que eligió el anfitrión (p1, p2…, dos por pareja). Sin ellas, por orden de llegada como siempre.
    const elegidas = op.grupos && jugadores.every(j => /^p\d+$/.test(op.grupos![j.id] ?? "")) ? op.grupos : null;
    if (elegidas) {
      const ids = [...new Set(jugadores.map(j => elegidas[j.id]!))];
      const de = (g: string) => jugadores.filter(j => elegidas[j.id] === g);
      if (ids.some(g => de(g).length !== 2)) return null;
      const orden = ids.sort((x, y) => Number(x.slice(1)) - Number(y.slice(1)));
      return {
        jugadores: jugadores.map(j => ({ ...j, equipo: elegidas[j.id]! })),
        equipos: orden.map(g => ({ id: g, nombre: de(g).map(j => j.nombre).join(" y ") })),
      };
    }
    const equipos: { id: string; nombre: string }[] = [];
    const con = jugadores.map((j, i) => ({ ...j, equipo: `p${Math.floor(i / 2) + 1}` }));
    for (let i = 0; i < jugadores.length; i += 2) equipos.push({ id: `p${i / 2 + 1}`, nombre: `${jugadores[i]!.nombre} y ${jugadores[i + 1]!.nombre}` });
    return { jugadores: con, equipos };
  }
  const posibles: readonly { id: string; nombre: string }[] = tipo === "sexos" ? GRUPOS_SEXOS : GRUPOS_EQUIPOS;
  const de = (id: string) => op.grupos?.[id];
  if (jugadores.some(j => !posibles.some(g => g.id === de(j.id)))) return null;
  const usados = posibles.filter(g => jugadores.some(j => de(j.id) === g.id));
  if (usados.length < 2) return null;
  return { jugadores: jugadores.map(j => ({ ...j, equipo: de(j.id)! })), equipos: usados.map(g => ({ ...g })) };
}

/**
 * Configuración y arranque de una partida. La semilla la pone quien llama (el navegador hoy, el servidor después).
 * `op` trae lo del configurador (tipo de partida, escenario, instrumento y opciones del juego). El impostor siempre
 * arranca con eliminación (Maestro v1.44); el modo clásico solo queda para reconstruir partidas guardadas antes.
 * Devuelve null si el juego no corre en el motor, faltan jugadores o los grupos no se pueden armar.
 */
export function armarArranque(miembros: { id: string; nombre: string }[], juego: string, rondas: number, intensidad: 1 | 2 | 3 | 4, semilla: number, op: OpcionesPartida = {}): Arranque | null {
  const def = JUEGOS.find(j => j.id === juego);
  if (!def?.motor || miembros.length < def.minJugadores) return null;
  const grupos = armarGrupos(conParejas(miembros), op);
  if (!grupos) return null;
  const escenario = op.escenario ? ESCENARIOS.find(x => x.id === op.escenario && x.activo) : undefined;
  // Temperatura + Voltaje (Maestro v1.52): con ejes, el nivel viejo se calcula de ellos, Drunk es su propio interruptor
  // y lo adulto se abre con Extremo o Sobrecarga. Sin ejes, todo como antes (partidas guardadas iguales).
  const ejes = ejesDe(op);
  const viejo = ejes ? intensidadVieja(ejes) : intensidad;
  const salieron = limpiarSalieron(op.yaSalieron);
  const cfg: Configuracion = {
    jugadores: grupos.jugadores, lugar: escenario?.lugar ?? "cualquiera", intensidad: Math.max(def.intensidadMin, Math.min(def.intensidadMax, viejo)) as 1 | 2 | 3 | 4,
    dificultad: 2, adulto: ejes ? adultoPorEjes(ejes) || !!def.adulto : intensidad >= 3 || !!def.adulto, drunk: ejes ? ejes.drunk : intensidad >= 2, turno: op.turno === "ruleta" ? "ruleta" : "orden",
    ...(ejes ? { ejes: { temperatura: ejes.temperatura, voltaje: ejes.voltaje } } : {}),
    ...(escenario ? { escenario: escenario.id } : {}),
    ...(op.modalidad && op.modalidad !== "individual" ? { modalidad: op.modalidad, equipos: grupos.equipos } : {}),
    ...(op.explicar ? { explicar: true } : {}),
    // Temporizador por turno: solo en los juegos que tienen turnos con tiempo (6A.11 C6), entre 10 y 180 s.
    ...(op.temporizador && JUEGOS_CON_TEMPORIZADOR.includes(juego) ? { temporizador: Math.round(Math.min(180, Math.max(10, op.temporizador))) } : {}),
    // Sin repetir entre noches y voto secreto (Elías, 27 nov): solo si el configurador los manda; sin ellos, todo igual.
    ...(salieron ? { yaSalieron: salieron } : {}),
    ...(op.votoSecreto === true && def.motor === "senalar" ? { votoSecreto: true } : {}),
    ...(op.minoriaBebe === true && def.motor === "votacion" ? { minoriaBebe: true } : {}),
  };
  if (juego === "verdad-reto") {
    // Verdad o reto siempre arranca con elección y herramienta (Maestro 6A.6 B); el modo anterior queda para partidas guardadas.
    const h = HERRAMIENTAS_VR.includes(op.herramienta as HerramientaVR) ? (op.herramienta as HerramientaVR) : "orden";
    cfg.verdadReto = { herramienta: h };
  }
  if (def.motor === "rol-secreto") {
    cfg.impostor = {
      cantidad: Math.min(Math.max(1, Math.floor(op.impostor?.cantidad ?? 1)), maxImpostores(miembros.length)),
      tema: typeof op.impostor?.tema === "string" ? op.impostor.tema.slice(0, 40) : null,
      // Reglas de la nave (Elías, 24 nov): solo si el configurador las pide; sin ellas, la partida es la de v1.44.
      ...(op.impostor?.nave ? {
        nave: true, votos: op.impostor.votos === "secretos" ? "secretos" as const : "visibles" as const,
        revelar: op.impostor.revelar !== false, castigo: op.impostor.castigo !== false,
      } : {}),
      // Papeles en la mesa (Elías, 24 nov): implica la nave; usa las categorías de la nave.
      ...(op.impostor?.papeles ? {
        nave: true, papeles: true, pista: op.impostor.pista === true,
        votos: op.impostor.votos === "secretos" ? "secretos" as const : "visibles" as const,
        revelar: op.impostor.revelar !== false, castigo: op.impostor.castigo !== false,
      } : {}),
    };
    // Se juega hasta atrapar a los impostores: una vuelta por jugador alcanza (cada vuelta sale uno, salvo empate).
    return { semilla, juego, rondas: Math.max(3, miembros.length), cfg };
  }
  return { semilla, juego, rondas: Math.max(3, Math.min(20, rondas)), cfg };
}

/** Traduce una fila guardada a una acción del motor. Lo de control solo vale si lo mandó quien tiene el control. */
export function aAccion(f: FilaAccion, controlan: string[]): Accion | null {
  const d = f.datos, id = f.id;
  if (f.tipo === "contestar") return { id, tipo: "contestar", jugador: f.jugador, valor: d.valor };
  // Papeles en la mesa: «Ya lo vi» viaja como fila `carta` (tipo que la base ya acepta, sin migración).
  if (f.tipo === "carta" && d.que === "visto") return { id, tipo: "visto", jugador: f.jugador };
  if (f.tipo === "carta" && typeof d.carta === "string") return { id, tipo: "usar-carta", jugador: f.jugador, carta: d.carta };
  if (f.tipo === "pista" && typeof d.texto === "string") return { id, tipo: "pista", jugador: f.jugador, texto: d.texto };
  if (f.tipo !== "control" || !controlan.includes(f.jugador)) return null;
  const que = String(d.que ?? "");
  if (CONTROL_SIMPLE.has(que)) return { id, tipo: que } as Accion;
  if (que === "xp-reto" && typeof d.jugador === "string" && typeof d.xp === "number") return { id, tipo: "xp-reto", jugador: d.jugador, xp: d.xp };
  if (que === "pasar-control" && typeof d.jugador === "string") return { id, tipo: "pasar-control", jugador: d.jugador };
  return null;
}

/** Reconstruye la partida con su arranque y sus acciones en orden. Sin arranque válido devuelve null. */
export function reconstruir(filas: FilaAccion[], anfitrion: string): EstadoPartida | null {
  const a = filas.find(f => f.tipo === "control" && f.jugador === anfitrion && f.datos.que === "arranque");
  if (!a) return null;
  const d = a.datos as unknown as Arranque & { que: string };
  const def = JUEGOS.find(j => j.id === d.juego);
  if (!def?.motor || typeof d.semilla !== "number" || !Array.isArray(d.cfg?.jugadores)) return null;
  let e: EstadoPartida = { ...crearPartida(def, d.cfg, d.semilla, CONTENIDO, d.rondas), control: anfitrion };
  for (const f of filas) {
    if (f === a) continue;
    const acc = aAccion(f, [anfitrion, e.control ?? anfitrion]);
    if (acc) e = aplicar(e, acc, CONTENIDO);
  }
  return e;
}

/** Lo que se publica: la vista pública (con el reloj) y, por jugador, solo lo suyo. */
export function paraPublicar(e: EstadoPartida, relojFin: number | null, esperaFin: number | null = null, turnoFin: number | null = null) {
  const publico = {
    ...vistaPublica(e), reloj: relojFin && e.segundos ? { fin: relojFin, total: e.segundos } : null, espera: esperaFin ? { fin: esperaFin } : null,
    // Temporizador por turno: solo existe si el anfitrión lo eligió (así las partidas sin él publican lo mismo que antes).
    ...(turnoFin && e.cfg.temporizador ? { turnoReloj: { fin: turnoFin, total: e.cfg.temporizador } } : {}),
  };
  const privados: Record<string, unknown> = {};
  for (const j of e.cfg.jugadores) { const v = vistaJugador(e, j.id); privados[j.id] = { mio: v.mio ?? null, miRespuesta: v.miRespuesta ?? null, miMano: v.miMano }; }
  return { publico, privados };
}

/**
 * Reloj lógico: lo que el motor decide sin mirar la hora. Quien corre el motor pone la hora (Date.now en el navegador,
 * la hora del servidor después) y los temporizadores.
 * - `claveReloj`: si cambia, se rearma el reloj de la ronda (solo si `conReloj`).
 * - `listos`: todos contestaron; tras `SUSPENSO_MS` se manda «revelar» con el id `idAutoRevelar`.
 * - `hayEspera` y `claveEspera`: P-03, corre la espera de `ESPERA_MS`; si la clave cambia, se rearma.
 */
export function relojLogico(e: EstadoPartida) {
  const vp = vistaPublica(e);
  // Pareja: si alguna no se puso de acuerdo, se espera la decisión del anfitrión antes de revelar.
  const listos = e.fase === "contestando" && !e.pausada && !e.naveEtapa && vp.esperados.every(j => vp.contestaron.includes(j)) && parejasPorDecidir(e).length === 0;
  const hayEspera = e.fase === "contestando" && !e.pausada && !listos && vp.contestaron.length > 0;
  return {
    claveReloj: `${e.ronda}-${e.cambios}`,
    conReloj: !!(e.segundos && e.fase === "contestando" && !enCarga(e) && !e.naveEtapa),
    listos,
    hayEspera,
    claveEspera: `${e.ronda}-${e.cambios}-${e.esperas ?? 0}`,
    // Temporizador por turno (6A.11 C6): si hay clave, corre el tiempo del turno; si cambia, se rearma. Solo aparece con temporizador.
    ...(claveTurno(e) ? { claveTurno: claveTurno(e)! } : {}),
  };
}

/** Clave del turno que corre con temporizador (quién habla en El impostor, o la etapa en Verdad o reto). null: no corre tiempo. */
export function claveTurno(e: EstadoPartida): string | null {
  if (!e.cfg.temporizador || e.fase !== "contestando" || e.pausada || enCarga(e) || e.naveEtapa) return null;
  if (conEliminacion(e) && etapaImpostor(e) === "pistas" && e.turnoDe) return `${e.ronda}-i-${e.turnoDe}-${e.esperas ?? 0}`;
  if (conVerdadReto(e) && etapaVR(e) !== "listo") return `${e.ronda}-vr-${etapaVR(e)}-${e.cambios}`;
  return null;
}

/** Id del aviso «se acabó el tiempo»: el mismo en cada aparato para que no cuente dos veces. */
export const idTiempo = (partida: string, clave: string) => `tiempo-${partida.slice(0, 18)}-${clave}`.slice(0, 60);

/** Id de la revelación automática: el mismo en cada aparato, así una repetida no cuenta dos veces. */
export const idAutoRevelar = (partida: string, e: EstadoPartida) => `auto-rev-${partida.slice(0, 18)}-${e.ronda}-${e.cambios}`;
