// Efectos de sonido hechos con la Web Audio API: sin archivos ni dependencias.
// El silencio se guarda en el dispositivo. Nada en la app depende solo del sonido.
import { useSyncExternalStore } from "react";

const CLAVE = "alv-sonido";
type Nota = { f: number; a?: number; t: number; d: number; tipo?: OscillatorType; v?: number };

const leer = (): boolean => { try { return localStorage.getItem(CLAVE) !== "no"; } catch { return true; } };
let activo = leer();
const oyentes = new Set<() => void>();
let ctx: AudioContext | null = null;

function contexto(): AudioContext | null {
  if (!activo) return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** Toca una lista de notas. `f` es la frecuencia inicial, `a` la final (para barridos), `t` el inicio y `d` la duración, en segundos. */
function tocar(notas: Nota[]) {
  const c = contexto();
  if (!c) return;
  for (const n of notas) {
    const osc = c.createOscillator(), gan = c.createGain();
    const t0 = c.currentTime + n.t, v = n.v ?? 0.08;
    osc.type = n.tipo ?? "square";
    osc.frequency.setValueAtTime(n.f, t0);
    if (n.a) osc.frequency.exponentialRampToValueAtTime(n.a, t0 + n.d);
    gan.gain.setValueAtTime(0.0001, t0);
    gan.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
    gan.gain.exponentialRampToValueAtTime(0.0001, t0 + n.d);
    osc.connect(gan).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + n.d + 0.02);
  }
}

const SONIDOS = {
  clic: [{ f: 520, a: 380, t: 0, d: 0.05, v: 0.04 }],
  exito: [{ f: 523, t: 0, d: 0.09 }, { f: 659, t: 0.08, d: 0.09 }, { f: 784, t: 0.16, d: 0.16 }],
  paso: [{ f: 330, a: 220, t: 0, d: 0.16, tipo: "triangle", v: 0.07 }],
  error: [{ f: 196, t: 0, d: 0.12, tipo: "sawtooth", v: 0.06 }, { f: 147, t: 0.12, d: 0.2, tipo: "sawtooth", v: 0.06 }],
  tiempo: [{ f: 880, t: 0, d: 0.1 }, { f: 880, t: 0.16, d: 0.1 }, { f: 660, t: 0.32, d: 0.3 }],
  carta: [{ f: 900, a: 300, t: 0, d: 0.07, tipo: "triangle", v: 0.05 }, { f: 1000, a: 340, t: 0.06, d: 0.07, tipo: "triangle", v: 0.05 }],
  poder: [{ f: 220, a: 1320, t: 0, d: 0.28, tipo: "sawtooth", v: 0.06 }, { f: 1320, t: 0.28, d: 0.18, v: 0.05 }],
  revelar: [{ f: 392, t: 0, d: 0.1, tipo: "triangle" }, { f: 494, t: 0.1, d: 0.1, tipo: "triangle" }, { f: 740, t: 0.2, d: 0.28, tipo: "triangle" }],
  fanfarria: [{ f: 523, t: 0, d: 0.12 }, { f: 523, t: 0.14, d: 0.12 }, { f: 523, t: 0.28, d: 0.12 }, { f: 659, t: 0.42, d: 0.2 }, { f: 587, t: 0.64, d: 0.12 }, { f: 784, t: 0.78, d: 0.5 }],
} satisfies Record<string, Nota[]>;

export type Sonido = keyof typeof SONIDOS;
export const sonar = (s: Sonido) => tocar(SONIDOS[s]);

export function alternarSonido() {
  activo = !activo;
  try { localStorage.setItem(CLAVE, activo ? "si" : "no"); } catch { /* sin almacenamiento: vale solo para esta visita */ }
  if (!activo) void ctx?.suspend(); else sonar("clic");
  oyentes.forEach(f => f());
}

export const useSonidoActivo = () => useSyncExternalStore(
  f => { oyentes.add(f); return () => { oyentes.delete(f); }; },
  () => activo,
);

/** Clic en cualquier botón o enlace de la app. Se instala una sola vez. */
export function instalarClics() {
  const f = (e: Event) => {
    const el = (e.target as Element | null)?.closest?.("button, a, .opcion");
    if (el && !(el as HTMLButtonElement).disabled && !el.hasAttribute("data-sin-clic")) sonar("clic");
  };
  document.addEventListener("click", f);
  return () => document.removeEventListener("click", f);
}
