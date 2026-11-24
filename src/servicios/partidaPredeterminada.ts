// Partida predeterminada del administrador (migración 039, clave «partida» de `preferencias_cuenta`).
// En la cuenta se guarda lo que el servidor acepta (juego, modalidad, escenario, rondas, temporizador, Temperatura,
// Voltaje, Drunk y explicar). La herramienta y las opciones del impostor no caben en la 039: se guardan en este aparato
// y se usan solo si el juego coincide. Sin nube, todo va a este aparato.
import type { OpcionesPartida } from "../engine/types";
import { cliente, cuentaActiva } from "./cliente";

export interface PartidaGuardada {
  juego: string;
  rondas: number;
  ejes: { temperatura: 1 | 2 | 3; voltaje: 1 | 2 | 3; drunk: boolean };
  opciones: OpcionesPartida;
}

const CLAVE = "alv-partida-predeterminada";
const local = (): PartidaGuardada | null => { try { return JSON.parse(localStorage.getItem(`${CLAVE}-${cuentaActiva() ?? "demo"}`) ?? "null") as PartidaGuardada | null; } catch { return null; } };
const guardarLocal = (p: PartidaGuardada | null) => {
  try {
    const k = `${CLAVE}-${cuentaActiva() ?? "demo"}`;
    if (p) localStorage.setItem(k, JSON.stringify(p)); else localStorage.removeItem(k);
  } catch { /* sin almacenamiento */ }
};

const nivel = (x: unknown): 1 | 2 | 3 => (x === 2 || x === 3 ? x : 1);

/** Lo que devuelve la 039 convertido a una partida del configurador. */
export function desdeCuenta(d: Record<string, unknown> | null | undefined, extra: PartidaGuardada | null): PartidaGuardada | null {
  if (!d || typeof d.juego !== "string") return null;
  const mod = d.modalidad === "parejas" || d.modalidad === "equipos" || d.modalidad === "sexos" ? d.modalidad : "individual";
  const mismo = extra?.juego === d.juego ? extra.opciones : undefined;
  return {
    juego: d.juego,
    rondas: typeof d.rondas === "number" ? d.rondas : 8,
    ejes: { temperatura: nivel(d.temperatura), voltaje: nivel(d.voltaje), drunk: d.drunk === true },
    opciones: {
      modalidad: mod,
      ...(typeof d.escenario === "string" ? { escenario: d.escenario as OpcionesPartida["escenario"] } : {}),
      ...(typeof d.temporizador === "number" ? { temporizador: d.temporizador } : {}),
      ...(d.explicar === true ? { explicar: true } : {}),
      ...(mismo?.herramienta ? { herramienta: mismo.herramienta } : {}),
      ...(mismo?.turno ? { turno: mismo.turno } : {}),
      ...(mismo?.impostor ? { impostor: mismo.impostor } : {}),
    },
  };
}

/** Lo que se manda a `guardar_preferencias` (solo las claves que valida la 039). */
export function paraCuenta(p: PartidaGuardada): Record<string, unknown> {
  return {
    juego: p.juego, modalidad: p.opciones.modalidad ?? "individual", escenario: p.opciones.escenario ?? null,
    rondas: Math.round(Math.min(40, Math.max(1, p.rondas))), temporizador: p.opciones.temporizador ?? null,
    temperatura: p.ejes.temperatura, voltaje: p.ejes.voltaje, drunk: p.ejes.drunk, explicar: !!p.opciones.explicar,
  };
}

/** Lee la partida predeterminada (null si no hay). */
export async function leerPartidaPredeterminada(): Promise<PartidaGuardada | null> {
  const aqui = local();
  if (!cliente || !cuentaActiva()) return aqui;
  try {
    const { data, error } = await cliente.from("preferencias_cuenta").select("datos").maybeSingle();
    if (error) { console.error("partida predeterminada", error.message); return aqui; }
    const d = (data?.datos as Record<string, unknown> | undefined)?.partida as Record<string, unknown> | null | undefined;
    return desdeCuenta(d, aqui);
  } catch (e) { console.error("partida predeterminada", e); return aqui; }
}

/** Guarda (o borra, con null) la partida predeterminada. Devuelve null si salió bien, o el motivo. */
export async function guardarPartidaPredeterminada(p: PartidaGuardada | null): Promise<string | null> {
  if (!cliente || !cuentaActiva()) { guardarLocal(p); return null; }
  try {
    const { error } = await cliente.rpc("guardar_preferencias", { p: { partida: p ? paraCuenta(p) : null } });
    if (error) { console.error("guardar partida predeterminada", error.message); return error.message.includes("sin permiso") ? "Solo un administrador puede guardarla." : "No se pudo guardar. Intenta otra vez."; }
    guardarLocal(p);
    return null;
  } catch (e) { console.error("guardar partida predeterminada", e); return "No se pudo guardar. Intenta otra vez."; }
}
