// Logros (migración 042; Maestro v1.54, 14.3). El servidor decide cuándo se gana un logro; aquí solo se lee.
// Sin nube (modo demostración) se usa el catálogo de content/logros.ts con un avance de muestra fijo.
// Los logros NO dan XP ni monedas (D0).
import { cliente, hayNube } from "./cliente";
import { LOGROS_ETAPA1, type CategoriaLogro, type Rareza } from "../content/logros";

export interface FilaLogro {
  clave: string; categoria: CategoriaLogro; juego: string | null; rareza: Rareza; oculto: boolean;
  nombre: string | null; descripcion: string | null; pista: string | null; meta: number; va: number;
  recompensa: string | null; ganado: string | null; destacado: boolean; orden: number;
}
export interface LogroNuevo { clave: string; nombre: string; rareza: Rareza; oculto: boolean; recompensa: string | null }

// ===== Demostración =====
const DEMO_VA: Record<string, number> = { "primeros-pasos": 1, "primera-victoria": 1, "noche-completa": 3, polifacetico: 10, estratega: 4, suertudo: 7, mvp: 5, imparable: 2,
  veterano: 21, "ya-eres-parte": 5, "casa-llena": 0, popular: 8, dupla: 2, "los-de-siempre": 6, "campeon-noche": 1, "cara-de-poker": 0, detective: 3, valiente: 10 };
const CLAVE_DEST = "alv-logros-destacados-demo";
const destacadosDemo = (): string[] => { try { return JSON.parse(localStorage.getItem(CLAVE_DEST) ?? "[]") as string[]; } catch { return []; } };
export function logrosDemo(): FilaLogro[] {
  const dest = destacadosDemo();
  return LOGROS_ETAPA1.map(l => {
    const va = Math.min(DEMO_VA[l.clave] ?? 0, l.meta);
    return { ...l, oculto: false, pista: null, va, ganado: va >= l.meta ? "2026-11-20T22:00:00Z" : null, destacado: dest.includes(l.clave) };
  });
}

// ===== Servidor =====
export async function miProgresoLogros(): Promise<FilaLogro[] | null> {
  if (!hayNube) return logrosDemo();
  try {
    const { data, error } = await cliente!.rpc("mi_progreso_logros");
    if (error) { console.error("miProgresoLogros", error.message); return null; }
    return (data ?? []) as FilaLogro[];
  } catch (e) { console.error("miProgresoLogros", e); return null; }
}

/** Logros que la cuenta ganó y todavía no vio. El servidor los marca vistos al entregarlos. */
export async function logrosNuevos(): Promise<LogroNuevo[]> {
  if (!hayNube) return [];
  try {
    const { data, error } = await cliente!.rpc("mis_logros_nuevos");
    if (error) { if (!/Could not find the function|PGRST202/.test(error.message + (error.code ?? ""))) console.error("logrosNuevos", error.message); return []; }
    return (data ?? []) as LogroNuevo[];
  } catch (e) { console.error("logrosNuevos", e); return []; }
}

/** Marca o quita un logro destacado (hasta 3). Devuelve cuántos destacados quedan, o null si no se pudo. */
export async function destacarLogro(clave: string, si: boolean): Promise<number | null> {
  if (!hayNube) {
    const d = destacadosDemo().filter(c => c !== clave);
    if (si) { if (d.length >= 3) return null; d.push(clave); }
    try { localStorage.setItem(CLAVE_DEST, JSON.stringify(d)); } catch { /* sin almacenamiento */ }
    return d.length;
  }
  try {
    const { data, error } = await cliente!.rpc("destacar_logro", { p_clave: clave, p_si: si });
    if (error) { console.error("destacarLogro", error.message); return null; }
    return data as number;
  } catch (e) { console.error("destacarLogro", e); return null; }
}
