// Efectos de sonido hechos con la Web Audio API: sin archivos ni dependencias.
// Encendido y volumen salen de las preferencias del aparato (app/preferencias.ts). Nada en la app depende solo del sonido.
import { cambiarPreferencias, preferencias, usePreferencias, vibrar } from "./preferencias";
let ctx = null;
/** Volumen 70 = el volumen de siempre; 0 = mudo; 100 ≈ 1.4 veces. */
const factor = () => preferencias().volumenEfectos / 70;
function contexto() {
    if (!preferencias().efectos || preferencias().volumenEfectos <= 0)
        return null;
    try {
        const AC = window.AudioContext ?? window.webkitAudioContext;
        if (!AC)
            return null;
        ctx ??= new AC();
        if (ctx.state === "suspended")
            void ctx.resume();
        return ctx;
    }
    catch {
        return null;
    }
}
/** Toca una lista de notas. `f` es la frecuencia inicial, `a` la final (para barridos), `t` el inicio y `d` la duración, en segundos. */
function tocar(notas) {
    const c = contexto();
    if (!c)
        return;
    for (const n of notas) {
        if (n.ruido) {
            tocarRuido(c, n);
            continue;
        }
        const osc = c.createOscillator(), gan = c.createGain();
        const t0 = c.currentTime + n.t, v = Math.max(0.0002, (n.v ?? 0.08) * factor());
        osc.type = n.tipo ?? "square";
        osc.frequency.setValueAtTime(n.f, t0);
        if (n.a)
            osc.frequency.exponentialRampToValueAtTime(n.a, t0 + n.d);
        gan.gain.setValueAtTime(0.0001, t0);
        gan.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
        gan.gain.exponentialRampToValueAtTime(0.0001, t0 + n.d);
        osc.connect(gan).connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + n.d + 0.02);
    }
}
let bufRuido = null;
function tocarRuido(c, n) {
    if (!bufRuido) {
        bufRuido = c.createBuffer(1, c.sampleRate, c.sampleRate);
        const d = bufRuido.getChannelData(0);
        for (let i = 0; i < d.length; i++)
            d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource(), fil = c.createBiquadFilter(), gan = c.createGain();
    const t0 = c.currentTime + n.t, v = Math.max(0.0002, (n.v ?? 0.08) * factor());
    src.buffer = bufRuido;
    src.loop = true;
    fil.type = n.ruido;
    fil.Q.value = n.q ?? 1;
    fil.frequency.setValueAtTime(n.f, t0);
    if (n.a)
        fil.frequency.exponentialRampToValueAtTime(n.a, t0 + n.d);
    gan.gain.setValueAtTime(0.0001, t0);
    gan.gain.exponentialRampToValueAtTime(v, t0 + Math.min(0.03, n.d / 3));
    gan.gain.exponentialRampToValueAtTime(0.0001, t0 + n.d);
    src.connect(fil).connect(gan).connect(c.destination);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + n.d + 0.02);
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
    // ---- Aviso de logro (Ranking y Logros) ----
    /** Logro: «ding» suave de dos tonos con brillo. */
    logro: [{ f: 880, t: 0, d: 0.12, tipo: "sine", v: 0.07 }, { f: 1319, t: 0.1, d: 0.3, tipo: "sine", v: 0.07 }, { f: 2637, t: 0.1, d: 0.18, tipo: "triangle", v: 0.02 }],
    /** Logro legendario: subida con acorde final. */
    logroLegendario: [{ f: 659, t: 0, d: 0.1, tipo: "sine", v: 0.07 }, { f: 880, t: 0.09, d: 0.1, tipo: "sine", v: 0.07 }, { f: 1319, t: 0.18, d: 0.45, tipo: "sine", v: 0.07 },
        { f: 1047, t: 0.18, d: 0.45, tipo: "triangle", v: 0.04 }, { f: 2637, t: 0.22, d: 0.3, tipo: "triangle", v: 0.02 }],
    // ---- Poderes (Elías, 27 nov): uno por efecto de tools/personajes/efectos.js; suena cuando el efecto sale ----
    "poder-rayo": [{ f: 1800, a: 380, t: 0, d: 0.35, tipo: "sawtooth", v: 0.05 }, { f: 900, a: 260, t: 0, d: 0.45, tipo: "sine", v: 0.07 }, { f: 3000, a: 1200, t: 0, d: 0.25, ruido: "bandpass", q: 2, v: 0.05 }],
    "poder-electrico": [{ f: 4000, a: 1800, t: 0, d: 0.09, ruido: "bandpass", q: 3, v: 0.12 }, { f: 3500, a: 1500, t: 0.12, d: 0.1, ruido: "bandpass", q: 3, v: 0.1 }, { f: 4200, a: 1600, t: 0.27, d: 0.12, ruido: "bandpass", q: 3, v: 0.1 },
        { f: 70, a: 55, t: 0, d: 0.6, tipo: "sawtooth", v: 0.05 }, { f: 300, a: 80, t: 0, d: 0.5, ruido: "lowpass", v: 0.12 }],
    "poder-fuego": [{ f: 300, a: 1400, t: 0, d: 0.55, ruido: "lowpass", q: 0.7, v: 0.16 }, { f: 1400, a: 500, t: 0.4, d: 0.7, ruido: "lowpass", q: 0.7, v: 0.1 }],
    "poder-telarana": [{ f: 5000, a: 1800, t: 0, d: 0.13, ruido: "highpass", v: 0.12 }, { f: 1400, a: 500, t: 0, d: 0.12, tipo: "sine", v: 0.05 }],
    "poder-escudo": [{ f: 700, a: 2200, t: 0, d: 0.45, ruido: "bandpass", q: 1.5, v: 0.12 }, { f: 2200, a: 700, t: 0.5, d: 0.45, ruido: "bandpass", q: 1.5, v: 0.1 },
        { f: 1450, t: 0.95, d: 0.35, tipo: "triangle", v: 0.06 }, { f: 2180, t: 0.95, d: 0.25, tipo: "triangle", v: 0.04 }],
    "poder-invisible": [{ f: 660, a: 1320, t: 0, d: 0.6, tipo: "sine", v: 0.05 }, { f: 990, a: 1980, t: 0.05, d: 0.6, tipo: "sine", v: 0.04 }, { f: 6000, a: 3000, t: 0, d: 0.6, ruido: "highpass", v: 0.03 }],
    "poder-encoger": [{ f: 1500, a: 180, t: 0, d: 0.45, tipo: "triangle", v: 0.06 }, { f: 2600, t: 0.05, d: 0.08, tipo: "sine", v: 0.03 }, { f: 3100, t: 0.15, d: 0.08, tipo: "sine", v: 0.03 }],
    "poder-golpe": [{ f: 130, a: 38, t: 0, d: 0.6, tipo: "sine", v: 0.22 }, { f: 400, a: 90, t: 0, d: 0.5, ruido: "lowpass", v: 0.2 }],
    "poder-onda": [{ f: 1800, a: 900, t: 0, d: 0.08, ruido: "bandpass", q: 1, v: 0.2 }, { f: 160, a: 50, t: 0.02, d: 0.45, tipo: "sine", v: 0.14 }, { f: 600, a: 120, t: 0.05, d: 0.5, ruido: "lowpass", v: 0.08 }],
    "poder-campo": [{ f: 110, t: 0, d: 1.1, tipo: "sawtooth", v: 0.035 }, { f: 220, a: 330, t: 0, d: 1.1, tipo: "sine", v: 0.05 }, { f: 440, a: 660, t: 0.1, d: 0.9, tipo: "sine", v: 0.03 }],
    "poder-hechizo": [{ f: 784, t: 0, d: 0.25, tipo: "triangle", v: 0.05 }, { f: 1175, t: 0.08, d: 0.25, tipo: "triangle", v: 0.05 }, { f: 1568, t: 0.16, d: 0.4, tipo: "triangle", v: 0.05 },
        { f: 2000, a: 600, t: 0, d: 0.8, ruido: "bandpass", q: 4, v: 0.05 }],
    "poder-volar": [{ f: 250, a: 900, t: 0, d: 0.7, ruido: "lowpass", q: 0.8, v: 0.18 }, { f: 900, t: 0.7, d: 1.6, ruido: "lowpass", q: 0.8, v: 0.1 }, { f: 900, a: 200, t: 2.3, d: 0.7, ruido: "lowpass", q: 0.8, v: 0.1 }],
    "poder-estirar": [{ f: 220, a: 880, t: 0, d: 0.3, tipo: "triangle", v: 0.07 }, { f: 880, a: 330, t: 0.3, d: 0.35, tipo: "triangle", v: 0.06 }, { f: 330, a: 660, t: 0.65, d: 0.25, tipo: "triangle", v: 0.05 }],
    "poder-hielo": [{ f: 7000, a: 3500, t: 0, d: 0.7, ruido: "highpass", v: 0.06 }, { f: 2093, t: 0.1, d: 0.2, tipo: "triangle", v: 0.04 }, { f: 2637, t: 0.25, d: 0.2, tipo: "triangle", v: 0.04 }, { f: 3136, t: 0.4, d: 0.3, tipo: "triangle", v: 0.04 }],
    "poder-hormigas": [0, 0.07, 0.15, 0.2, 0.29, 0.36, 0.44, 0.5].map((t, i) => ({ f: 2500 + (i % 3) * 500, t, d: 0.025, tipo: "square", v: 0.02 })),
};
/** Sonido del efecto de un poder (lo pide la escena al salir el efecto). Nombre desconocido: no suena. */
export function sonarPoder(tipo) {
    const k = `poder-${String(tipo)}`;
    if (k in SONIDOS)
        sonar(k);
}
/** Momentos que además vibran (si el aparato vibra y la vibración está encendida), aunque el sonido esté apagado. */
const VIBRA = {
    tiempo: [120, 80, 120], revelar: 60, exito: [40, 40, 80], error: [90, 50, 90], poder: 50, fanfarria: [60, 40, 60, 40, 120], legendaria: [80, 50, 160], logro: 40, logroLegendario: [60, 40, 120],
};
// Clic de botones con el audio de Elías (public/audio/clic.mp3). Mientras carga (o si falla) suena el clic sintético.
const MUESTRA_CLIC = `${import.meta.env.BASE_URL}audio/clic.mp3`;
let bufClic = null, pidiendoClic = false;
function cargarClic(c) {
    if (bufClic || pidiendoClic)
        return;
    pidiendoClic = true;
    fetch(MUESTRA_CLIC).then(r => r.arrayBuffer()).then(b => c.decodeAudioData(b)).then(x => { bufClic = x; }).catch(() => { });
}
function tocarClic() {
    const c = contexto();
    if (!c)
        return true; // apagado: no suena nada
    cargarClic(c);
    if (!bufClic)
        return false;
    const fuente = c.createBufferSource(), gan = c.createGain();
    fuente.buffer = bufClic;
    gan.gain.value = 0.7 * factor();
    fuente.connect(gan).connect(c.destination);
    fuente.start();
    return true;
}
export const sonar = (s) => {
    const v = VIBRA[s];
    if (v)
        vibrar(v);
    if (s === "clic" && tocarClic())
        return;
    tocar(SONIDOS[s]);
};
/** Enciende o apaga los efectos. */
export function fijarEfectos(encendidos) {
    cambiarPreferencias({ efectos: encendidos });
    if (!encendidos)
        void ctx?.suspend();
    else
        sonar("clic");
}
export const alternarSonido = () => fijarEfectos(!preferencias().efectos);
/** Cambia el volumen y suena un clic con el volumen nuevo para que se oiga cómo queda. */
export function fijarVolumenEfectos(v) {
    cambiarPreferencias({ volumenEfectos: v });
    sonar("clic");
}
export const useSonidoActivo = () => usePreferencias().efectos;
/** Clic en cualquier botón o enlace de la app. Se instala una sola vez. */
export function instalarClics() {
    const f = (e) => {
        const el = e.target?.closest?.("button, a, .opcion");
        if (el && !el.disabled && !el.hasAttribute("data-sin-clic"))
            sonar("clic");
    };
    document.addEventListener("click", f);
    return () => document.removeEventListener("click", f);
}
