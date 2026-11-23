// Efectos de sonido hechos con la Web Audio API: sin archivos ni dependencias.
// Encendido y volumen salen de las preferencias del aparato (app/preferencias.ts). Nada en la app depende solo del sonido.
import { cambiarPreferencias, preferencias, usePreferencias, vibrar } from "./preferencias";

type Nota = { f: number; a?: number; t: number; d: number; tipo?: OscillatorType; v?: number };

let ctx: AudioContext | null = null;
/** Volumen 70 = el volumen de siempre; 0 = mudo; 100 ≈ 1.4 veces. */
const factor = () => preferencias().volumenEfectos / 70;

function contexto(): AudioContext | null {
  if (!preferencias().efectos || preferencias().volumenEfectos <= 0) return null;
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
    const t0 = c.currentTime + n.t, v = Math.max(0.0002, (n.v ?? 0.08) * factor());
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
  tic: [{ f: 1200, t: 0, d: 0.03, tipo: "triangle", v: 0.05 }],
  clic: [{ f: 520, a: 380, t: 0, d: 0.05, v: 0.04 }],
  /** Pieza que encaja: doble chasquido corto de plástico. */
  encaje: [{ f: 2400, a: 1200, t: 0, d: 0.022, tipo: "square", v: 0.035 }, { f: 1700, a: 700, t: 0.035, d: 0.03, tipo: "triangle", v: 0.05 }, { f: 180, a: 90, t: 0.035, d: 0.05, tipo: "sine", v: 0.06 }],
  exito: [{ f: 523, t: 0, d: 0.09 }, { f: 659, t: 0.08, d: 0.09 }, { f: 784, t: 0.16, d: 0.16 }],
  paso: [{ f: 330, a: 220, t: 0, d: 0.16, tipo: "triangle", v: 0.07 }],
  error: [{ f: 196, t: 0, d: 0.12, tipo: "sawtooth", v: 0.06 }, { f: 147, t: 0.12, d: 0.2, tipo: "sawtooth", v: 0.06 }],
  tiempo: [{ f: 880, t: 0, d: 0.1 }, { f: 880, t: 0.16, d: 0.1 }, { f: 660, t: 0.32, d: 0.3 }],
  carta: [{ f: 900, a: 300, t: 0, d: 0.07, tipo: "triangle", v: 0.05 }, { f: 1000, a: 340, t: 0.06, d: 0.07, tipo: "triangle", v: 0.05 }],
  poder: [{ f: 220, a: 1320, t: 0, d: 0.28, tipo: "sawtooth", v: 0.06 }, { f: 1320, t: 0.28, d: 0.18, v: 0.05 }],
  revelar: [{ f: 392, t: 0, d: 0.1, tipo: "triangle" }, { f: 494, t: 0.1, d: 0.1, tipo: "triangle" }, { f: 740, t: 0.2, d: 0.28, tipo: "triangle" }],
  fanfarria: [{ f: 523, t: 0, d: 0.12 }, { f: 523, t: 0.14, d: 0.12 }, { f: 523, t: 0.28, d: 0.12 }, { f: 659, t: 0.42, d: 0.2 }, { f: 587, t: 0.64, d: 0.12 }, { f: 784, t: 0.78, d: 0.5 }],
  // ---- Tienda: apertura de sobres ----
  /** Sacudida del sobre: golpe sordo con crujido. */
  sacudir: [{ f: 140, a: 70, t: 0, d: 0.09, tipo: "sine", v: 0.09 }, { f: 3200, a: 1800, t: 0, d: 0.04, tipo: "square", v: 0.02 }, { f: 2600, a: 1500, t: 0.05, d: 0.04, tipo: "square", v: 0.02 }],
  /** Rasgar el papel: barrido rasposo hacia abajo. */
  rasgar: [{ f: 4200, a: 900, t: 0, d: 0.22, tipo: "sawtooth", v: 0.03 }, { f: 3100, a: 700, t: 0.04, d: 0.2, tipo: "square", v: 0.02 }, { f: 260, a: 120, t: 0.18, d: 0.12, tipo: "sine", v: 0.07 }],
  /** Voltear una carta. */
  voltear: [{ f: 600, a: 1500, t: 0, d: 0.08, tipo: "triangle", v: 0.05 }, { f: 1500, a: 2100, t: 0.07, d: 0.05, tipo: "sine", v: 0.03 }],
  rara: [{ f: 659, t: 0, d: 0.1, tipo: "triangle" }, { f: 988, t: 0.09, d: 0.22, tipo: "triangle" }],
  epica: [{ f: 523, t: 0, d: 0.1, tipo: "triangle" }, { f: 784, t: 0.09, d: 0.1, tipo: "triangle" }, { f: 1047, t: 0.18, d: 0.3, tipo: "triangle" }, { f: 220, a: 880, t: 0, d: 0.3, tipo: "sawtooth", v: 0.03 }],
  legendaria: [{ f: 110, a: 55, t: 0, d: 0.5, tipo: "sine", v: 0.12 }, { f: 523, t: 0.1, d: 0.12 }, { f: 659, t: 0.22, d: 0.12 }, { f: 784, t: 0.34, d: 0.12 }, { f: 1047, t: 0.46, d: 0.5 }, { f: 1319, t: 0.46, d: 0.5, tipo: "triangle", v: 0.05 }],
} satisfies Record<string, Nota[]>;

export type Sonido = keyof typeof SONIDOS;

/** Momentos que además vibran (si el aparato vibra y la vibración está encendida), aunque el sonido esté apagado. */
const VIBRA: Partial<Record<Sonido, number | number[]>> = {
  tiempo: [120, 80, 120], revelar: 60, exito: [40, 40, 80], error: [90, 50, 90], poder: 50, fanfarria: [60, 40, 60, 40, 120], legendaria: [80, 50, 160],
};

// Clic de botones con el audio de Elías (public/audio/clic.mp3). Mientras carga (o si falla) suena el clic sintético.
const MUESTRA_CLIC = `${import.meta.env.BASE_URL}audio/clic.mp3`;
let bufClic: AudioBuffer | null = null, pidiendoClic = false;
function cargarClic(c: AudioContext) {
  if (bufClic || pidiendoClic) return;
  pidiendoClic = true;
  fetch(MUESTRA_CLIC).then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).then(x => { bufClic = x; }).catch(() => { /* se queda el sintético */ });
}
function tocarClic(): boolean {
  const c = contexto();
  if (!c) return true; // apagado: no suena nada
  cargarClic(c);
  if (!bufClic) return false;
  const fuente = c.createBufferSource(), gan = c.createGain();
  fuente.buffer = bufClic;
  gan.gain.value = 0.7 * factor();
  fuente.connect(gan).connect(c.destination);
  fuente.start();
  return true;
}

export const sonar = (s: Sonido) => {
  const v = VIBRA[s];
  if (v) vibrar(v);
  if (s === "clic" && tocarClic()) return;
  tocar(SONIDOS[s]);
};

/** Enciende o apaga los efectos. */
export function fijarEfectos(encendidos: boolean) {
  cambiarPreferencias({ efectos: encendidos });
  if (!encendidos) void ctx?.suspend(); else sonar("clic");
}
export const alternarSonido = () => fijarEfectos(!preferencias().efectos);

/** Cambia el volumen y suena un clic con el volumen nuevo para que se oiga cómo queda. */
export function fijarVolumenEfectos(v: number) {
  cambiarPreferencias({ volumenEfectos: v });
  sonar("clic");
}

export const useSonidoActivo = () => usePreferencias().efectos;

/** Clic en cualquier botón o enlace de la app. Se instala una sola vez. */
export function instalarClics() {
  const f = (e: Event) => {
    const el = (e.target as Element | null)?.closest?.("button, a, .opcion");
    if (el && !(el as HTMLButtonElement).disabled && !el.hasAttribute("data-sin-clic")) sonar("clic");
  };
  document.addEventListener("click", f);
  return () => document.removeEventListener("click", f);
}
