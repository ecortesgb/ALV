// Forma de cada jugador (transformaciones, Elías 27 nov 2026): en qué paso de su ciclo va (Banner ↔ Hulk, Tony / Iron Man /
// casco arriba, Peter ↔ Spider-Man). «Transformar» en la rueda avanza un paso y la forma se queda hasta volver a tocar.
// Igual que los gestos: este aparato decide la de su jugador y la avisa a la sala (gestosSala.ts); las de los demás llegan
// por la red. Solo es dibujo: nunca cambia la figura guardada ni decide nada del juego.
import { useSyncExternalStore } from "react";
import { caretaDe, enForma, especialAlSalir, formasDe, type CatalogoV3, type FiguraV2Puente } from "../personajes/integracion";

export interface EstadoForma {
  paso: number;
  /** Orden de los avisos (crece siempre, también al recargar: sale de la hora). */
  n: number;
  /** El último cambio empieza con la animación especial de la forma de antes (Banner se transforma en Hulk). */
  conEspecial: boolean;
}
export interface EventoForma extends EstadoForma { jugador: string }

const QUIETA: EstadoForma = Object.freeze({ paso: 0, n: 0, conEspecial: false });
const estados = new Map<string, EstadoForma>();
const oyentes = new Set<() => void>();
const alPropias = new Set<(e: EventoForma) => void>();
let version = 0;

// La forma propia se queda al recargar o cambiar de pantalla (misma pestaña).
const GUARDA = "alv-formas";
try {
  const g = JSON.parse(sessionStorage.getItem(GUARDA) ?? "{}") as Record<string, unknown>;
  for (const [j, v] of Object.entries(g)) {
    const e = v as Partial<EstadoForma>;
    if (Number.isInteger(e.paso) && e.paso! > 0 && e.paso! < 10 && Number.isInteger(e.n)) estados.set(j, { paso: e.paso!, n: e.n!, conEspecial: false });
  }
} catch { /* sin almacenamiento */ }
const guardar = (j: string, e: EstadoForma) => {
  try {
    const g = JSON.parse(sessionStorage.getItem(GUARDA) ?? "{}") as Record<string, unknown>;
    g[j] = { paso: e.paso, n: e.n };
    sessionStorage.setItem(GUARDA, JSON.stringify(g));
  } catch { /* sin almacenamiento */ }
};

function poner(jugador: string, e: EstadoForma) {
  estados.set(jugador, e);
  version++;
  oyentes.forEach(f => f());
}

export const estadoForma = (jugador: string): EstadoForma => estados.get(jugador) ?? QUIETA;

/** Paso de la forma de un jugador para su figura de ahora (0 si su personaje no se transforma). */
export function pasoDe(jugador: string, figura: unknown): number {
  const n = formasDe(figura), p = estadoForma(jugador).paso;
  return n > 1 ? p % n : 0;
}

/** ¿Esta figura se puede transformar? */
export const seTransforma = (figura: unknown) => formasDe(figura) > 1;

/** «Transformar» de este aparato: avanza un paso del ciclo. false si la figura no se transforma. */
export function transformar(jugador: string, figura: unknown, ahora = Date.now()): boolean {
  const total = formasDe(figura);
  if (!jugador || total < 2) return false;
  const e = estadoForma(jugador), paso = pasoDe(jugador, figura);
  const nuevo: EstadoForma = { paso: (paso + 1) % total, n: Math.max(e.n + 1, Math.floor(ahora / 100)), conEspecial: especialAlSalir(figura, paso) };
  poner(jugador, nuevo);
  guardar(jugador, nuevo);
  alPropias.forEach(f => f({ jugador, ...nuevo }));
  return true;
}

/** Una forma que llegó por la red: solo se descarta si es vieja o repetida (`n` no avanza). */
export function aplicarFormaRemota(jugador: string, paso: number, n: number, conEspecial: boolean): boolean {
  if (!jugador || !Number.isInteger(paso) || paso < 0 || paso > 9 || !Number.isInteger(n) || n < 1) return false;
  if (n <= estadoForma(jugador).n) return false;
  poner(jugador, { paso, n, conEspecial });
  return true;
}

/** Avisos de las formas que decidió este aparato (para mandarlos a la sala). */
export function alFormaPropia(f: (e: EventoForma) => void): () => void { alPropias.add(f); return () => { alPropias.delete(f); }; }

/** Cambia cada vez que alguna forma cambia (las escenas vuelven a mandar sus figuras). */
export function useVersionFormas(): number {
  return useSyncExternalStore(f => { oyentes.add(f); return () => { oyentes.delete(f); }; }, () => version);
}

/**
 * Una figura de escena en su forma de ahora. `transforma` (el orden del último cambio) le dice a la escena que el cambio es
 * una transformación (nube de humo, y la especial antes si `conEspecial`), no una figura nueva.
 */
export function conForma<T extends { id: string; figura?: unknown }>(x: T, cat: CatalogoV3 | null): T & { transforma?: number; conEspecial?: boolean; careta?: unknown } {
  if (!x.figura || typeof x.figura !== "object" || !seTransforma(x.figura)) return x;
  const e = estadoForma(x.id);
  if (!e.n) return x;
  const paso = pasoDe(x.id, x.figura);
  const careta = caretaDe(x.figura, paso);
  return { ...x, figura: paso ? enForma(x.figura as FiguraV2Puente, paso, cat) : x.figura, transforma: e.n, conEspecial: e.conEspecial, ...(careta ? { careta } : {}) };
}

/** Solo para pruebas. */
export function reiniciarFormas() { estados.clear(); version++; try { sessionStorage.removeItem(GUARDA); } catch { /* nada */ } }
