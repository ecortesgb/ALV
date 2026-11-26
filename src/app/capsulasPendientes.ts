// Cápsulas guardadas en este aparato que todavía no llegan a la nube (fase 5, Codex paso4-r1). Al guardar una figura se
// marca su espacio como pendiente; mientras lo esté, la nube no lo pisa al cargar y se vuelve a intentar subir (al entrar,
// al recuperar la conexión). guardarCapsulasNube() borra los espacios ausentes, así que NUNCA se sube sin haber leído
// antes la nube y combinado con ella.
import type { EstadoCapsulas } from "./figura3d";
import { modoCorteV3 } from "../personajes/integracion";

const PREFIJO = "alv-capsulas-pendientes-", PREFIJO_CORTE = "alv-capsulas-pendientes-c3-";
const clave = (jugador: string) => (modoCorteV3() ? PREFIJO_CORTE : PREFIJO) + (jugador.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");

/** Época de las figuras en este aparato («corte» o «v2»). Si un build SIN corte encuentra la marca «corte» (se revirtió),
 *  borra los pendientes de antes del corte para que la sincronización vuelva a empezar desde la nube (Codex, v3-directo-r1).
 *  Lo de la época del corte vive en sus propias claves y un build sin corte no lo lee. */
export function prepararEpoca(corte: boolean = modoCorteV3()) {
  try {
    const MARCA = "alv-epoca-figuras", antes = localStorage.getItem(MARCA);
    if (!corte && antes === "corte") {
      const borrar: string[] = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIJO) && !k.startsWith(PREFIJO_CORTE)) borrar.push(k); }
      borrar.forEach(k => localStorage.removeItem(k));
    }
    localStorage.setItem(MARCA, corte ? "corte" : "v2");
  } catch { /* sin almacenamiento */ }
}
const valido = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < 3;

/** Sellos de los espacios pendientes: cada guardado pone un sello nuevo, así una subida solo quita la marca del guardado
 *  que de verdad subió (si mientras subía se guardó otra vez ese espacio, la marca nueva se queda). Codex, paso4-verif. */
export type Sellos = Record<number, string>;
export function leerSellos(jugador: string): Sellos {
  try {
    const x = JSON.parse(localStorage.getItem(clave(jugador)) ?? "{}") as unknown;
    if (!x || typeof x !== "object" || Array.isArray(x)) return {};
    const fuera: Sellos = {};
    for (const [k, v] of Object.entries(x)) if (valido(Number(k)) && typeof v === "string" && v.length <= 40) fuera[Number(k)] = v;
    return fuera;
  } catch { return {}; }
}
export const leerPendientes = (jugador: string): number[] => Object.keys(leerSellos(jugador)).map(Number).sort();
function escribir(jugador: string, s: Sellos) {
  try { if (Object.keys(s).length) localStorage.setItem(clave(jugador), JSON.stringify(s)); else localStorage.removeItem(clave(jugador)); } catch { /* sin almacenamiento */ }
}
let serie = 0;
export function marcarPendiente(jugador: string, i: number) {
  if (!valido(i)) return;
  escribir(jugador, { ...leerSellos(jugador), [i]: Date.now().toString(36) + "-" + (++serie).toString(36) + "-" + Math.random().toString(36).slice(2, 8) });
}
/** Quita solo las marcas cuyo sello sigue siendo el que se subió. */
export function quitarPendientes(jugador: string, subidos: Sellos) {
  const ahora = leerSellos(jugador);
  for (const [k, v] of Object.entries(subidos)) if (ahora[Number(k)] === v) delete ahora[Number(k)];
  escribir(jugador, ahora);
}

/**
 * Lo que debe quedar aquí y en la nube: manda la nube (lo que se borró o cambió en otro aparato se respeta), salvo los
 * espacios pendientes de este aparato, que se quedan como están aquí. La activa: la de aquí si es un pendiente; si no,
 * la de la nube.
 */
export function combinar(nube: EstadoCapsulas, aqui: EstadoCapsulas, pendientes: readonly number[]): EstadoCapsulas {
  const slots = nube.slots.map((c, k) => (pendientes.includes(k) ? aqui.slots[k] ?? null : c ?? null));
  const activaAqui = aqui.activa != null && pendientes.includes(aqui.activa) && slots[aqui.activa] ? aqui.activa : null;
  const activa = activaAqui ?? (nube.activa != null && slots[nube.activa] ? nube.activa : slots.findIndex(Boolean) >= 0 ? slots.findIndex(Boolean) : null);
  return { version: 1, activa, slots };
}
