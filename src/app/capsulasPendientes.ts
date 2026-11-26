// Cápsulas guardadas en este aparato que todavía no llegan a la nube (fase 5, Codex paso4-r1). Al guardar una figura se
// marca su espacio como pendiente; mientras lo esté, la nube no lo pisa al cargar y se vuelve a intentar subir (al entrar,
// al recuperar la conexión). guardarCapsulasNube() borra los espacios ausentes, así que NUNCA se sube sin haber leído
// antes la nube y combinado con ella.
import type { EstadoCapsulas } from "./figura3d";

const clave = (jugador: string) => "alv-capsulas-pendientes-" + (jugador.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
const valido = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < 3;

export function leerPendientes(jugador: string): number[] {
  try {
    const x = JSON.parse(localStorage.getItem(clave(jugador)) ?? "[]") as unknown;
    return Array.isArray(x) ? [...new Set(x.filter(valido))].sort() : [];
  } catch { return []; }
}
function escribir(jugador: string, lista: number[]) {
  try { if (lista.length) localStorage.setItem(clave(jugador), JSON.stringify(lista)); else localStorage.removeItem(clave(jugador)); } catch { /* sin almacenamiento */ }
}
export function marcarPendiente(jugador: string, i: number) { if (valido(i)) escribir(jugador, [...new Set([...leerPendientes(jugador), i])]); }
/** Quita solo los que se subieron (si mientras tanto se marcó otro, se queda). */
export function quitarPendientes(jugador: string, subidos: readonly number[]) { escribir(jugador, leerPendientes(jugador).filter(i => !subidos.includes(i))); }

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
