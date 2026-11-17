// Corre el motor puro (src/engine/nucleo.ts) en memoria, paso a paso. Sin base de datos, sin red, sin hora del aparato.
// Lo usa index.ts (la Edge Function local) y la prueba de Deno tools/deno/partida_prueba_test.ts.
// La hora la pone quien llama (relojFin, esperaFin): así la salida es siempre la misma con la misma entrada.
import { idAutoRevelar, paraPublicar, reconstruir, relojLogico, type FilaAccion } from "../../../src/engine/nucleo.ts";
import { resultados } from "../../../src/engine/partida.ts";

export interface Entrada {
  juego: string;
  jugadores: { id: string; nombre: string }[];
  rondas: number;
  semilla: number;
  /** Filas de acciones en orden, sin la de arranque (la arma esta función). */
  acciones: FilaAccion[];
  /** Id de la partida: da el id del arranque y el de la revelación automática. */
  partida: string;
  /** Quien arranca y tiene el control al inicio. Si falta, el primer jugador. */
  anfitrion?: string;
  /** Fecha guardada de la fila de arranque (solo para que la fila quede igual a la guardada). */
  inicio?: string;
  opciones?: { lugar?: string; intensidad?: number; dificultad?: number; adulto?: boolean; drunk?: boolean; turno?: string };
  /** Hora de fin del reloj de ronda y de la espera que publicaría el servidor. */
  relojFin?: number;
  esperaFin?: number;
}

const MAX_JUGADORES = 20, MAX_ACCIONES = 2000;
const esTexto = (x: unknown, max = 200): x is string => typeof x === "string" && x.length > 0 && x.length <= max;
const TIPOS = new Set(["contestar", "carta", "pista", "control"]);

/** Revisa la forma de la entrada. Devuelve el motivo o null si está bien. */
export function revisar(x: unknown): string | null {
  if (!x || typeof x !== "object") return "cuerpo no es un objeto";
  const e = x as Record<string, unknown>;
  if (!esTexto(e.juego, 40)) return "juego";
  if (!esTexto(e.partida, 80)) return "partida";
  if (typeof e.semilla !== "number" || !Number.isFinite(e.semilla)) return "semilla";
  if (typeof e.rondas !== "number" || !Number.isInteger(e.rondas) || e.rondas < 1 || e.rondas > 20) return "rondas";
  if (!Array.isArray(e.jugadores) || e.jugadores.length < 1 || e.jugadores.length > MAX_JUGADORES) return "jugadores";
  if (!e.jugadores.every(j => j && esTexto(j.id, 80) && esTexto(j.nombre, 60))) return "jugadores";
  if (!Array.isArray(e.acciones) || e.acciones.length > MAX_ACCIONES) return "acciones";
  if (!e.acciones.every(f => f && esTexto(f.id, 120) && esTexto(f.jugador, 80) && TIPOS.has(f.tipo) && f.datos && typeof f.datos === "object")) return "acciones";
  if (e.anfitrion !== undefined && !esTexto(e.anfitrion, 80)) return "anfitrion";
  return null;
}

export function correr(ent: Entrada) {
  const anfitrion = ent.anfitrion ?? ent.jugadores[0]!.id;
  const o = ent.opciones ?? {};
  const arranque: FilaAccion = {
    id: `arranque-${ent.partida}`.slice(0, 60),
    jugador: anfitrion,
    tipo: "control",
    datos: {
      que: "arranque", semilla: ent.semilla, juego: ent.juego, rondas: ent.rondas,
      cfg: {
        jugadores: ent.jugadores.map(j => ({ id: j.id, nombre: j.nombre })),
        lugar: o.lugar ?? "cualquiera", intensidad: o.intensidad ?? 2, dificultad: o.dificultad ?? 2,
        adulto: o.adulto ?? false, drunk: o.drunk ?? true, turno: o.turno ?? "orden",
      },
    },
    creada: ent.inicio ?? "1970-01-01T00:00:00.000Z",
  };
  const filas = [arranque, ...ent.acciones];
  const relojFin = ent.relojFin ?? 1000, esperaFin = ent.esperaFin ?? 2000;
  const pasos = [];
  // Paso k = el motor con las primeras k filas (igual que la referencia del motor anterior).
  for (let k = 1; k <= filas.length; k++) {
    const e = reconstruir(filas.slice(0, k), anfitrion);
    if (!e) return { ok: false as const, error: "arranque no válido" };
    const t = relojLogico(e);
    const vistas = paraPublicar(e, e.fase === "contestando" ? relojFin : null, t.hayEspera ? esperaFin : null);
    pasos.push({
      k,
      accion: filas[k - 1]!.id,
      estado: e,
      roles: e.privado,
      vistas,
      reloj: { ...t, autoRev: t.listos ? idAutoRevelar(ent.partida, e) : null },
      ranking: resultados(e),
    });
  }
  const final = pasos[pasos.length - 1]!;
  return { ok: true as const, filas, pasos, fase: final.estado.fase, resultados: final.ranking };
}
