// Perfiles de personalidad (ALV_PLAN_ANIMATION_LIBRARY.md, etapa 2).
//
// Tres cosas separadas, a propósito:
//   · Apariencia (la figura: piezas, colores, traje)           → no se toca aquí.
//   · Personalidad (este archivo)                              → figura.extensiones.alv.personalidad = { perfil }.
//   · Animaciones disponibles (motor + Animation Library)       → el motor no sabe de perfiles; solo recibe
//     perillas genéricas (espera, velocidad, intensidad) y pedidos de «momento» con prioridad 0.5.
//
// El perfil es CONDUCTA: cada cuánto actúa solo, qué tan probable es que actúe, qué prefiere, a qué velocidad e
// intensidad, y cuánto varía. El director de abajo es lógica pura (sin React ni 3D) y se prueba con azar sembrado.
import datos from "../content/perfiles-animacion.json";
import { completar, type Figura } from "./editarFigura";
import type { FiguraV2 } from "../content/personaje";

export type Perfil = "alegre" | "heroico" | "comico" | "timido" | "agresivo" | "elegante";
export const PERFILES: readonly Perfil[] = ["alegre", "heroico", "comico", "timido", "agresivo", "elegante"];
export const esPerfil = (x: unknown): x is Perfil => typeof x === "string" && (PERFILES as readonly string[]).includes(x);

/** Una animación posible: de la biblioteca (`lib`, con respaldo de ALV) o de ALV (`anim`). `dur` para las de bucle. */
export interface Opcion { lib?: string; respaldo?: string; anim?: string; peso: number; dur?: [number, number] }
export interface DatosPerfil {
  nombre: string; descripcion: string;
  espera: { lib?: string; respaldo: string };
  /** Segundos entre una oportunidad de actuar y la siguiente. */
  intervalo: [number, number];
  /** Probabilidad (0–1) de actuar en cada oportunidad (si no, se queda en reposo). */
  actuar: number;
  velocidad: number; intensidad: number;
  /** Cuánto varían velocidad e intensidad cada vez (±, fracción). */
  variacion: number;
  preferencias: Opcion[];
}
export const DATOS = (datos as unknown as { perfiles: Record<Perfil, DatosPerfil> }).perfiles;

// ---------- La personalidad en la figura (sin tocar la apariencia) ----------

/** Perfil guardado en la figura, o null (sin personalidad = como siempre). Nunca truena. */
export function perfilDe(f: FiguraV2 | Figura | null | undefined): Perfil | null {
  const p = (f as { extensiones?: { alv?: { personalidad?: { perfil?: unknown } } } } | null | undefined)?.extensiones?.alv?.personalidad?.perfil;
  return esPerfil(p) ? p : null;
}
/** Pone o quita la personalidad. Solo cambia extensiones.alv.personalidad: piezas, traje y momentos quedan igual. */
export function ponerPersonalidad(f: FiguraV2 | Figura, perfil: Perfil | null): Figura {
  const g = completar(f);
  const ext = (g.extensiones ?? {}) as Record<string, unknown>;
  const alv = { ...((ext.alv as Record<string, unknown>) ?? {}) };
  if (perfil) alv.personalidad = { perfil }; else delete alv.personalidad;
  g.extensiones = { ...ext, alv };
  return g;
}

/**
 * La figura que se le manda al motor, SIN la personalidad: el motor no la necesita (recibe perillas) y así cambiar de
 * perfil no rearma la figura 3D (su huella no cambia). La figura guardada no se toca.
 */
export function soloApariencia<T extends FiguraV2 | Figura | null | undefined>(f: T): T {
  const alv = (f as { extensiones?: { alv?: Record<string, unknown> } } | null | undefined)?.extensiones?.alv;
  if (!f || !alv || !("personalidad" in alv)) return f;
  const { personalidad: _fuera, ...resto } = alv; void _fuera;
  const ext = (f as { extensiones: Record<string, unknown> }).extensiones;
  return { ...(f as object), extensiones: { ...ext, alv: resto } } as unknown as T;
}

// ---------- Lo que ALV le manda al motor (perillas genéricas) ----------

export interface AnimPerfil { espera?: string; vel?: number; int?: number }
/**
 * Perillas del perfil para el motor. La espera del perfil SOLO si el jugador no eligió un paquete de momentos
 * (lo comprado manda). `hay(nombre)` dice si el motor conoce esa animación (las «lib:» pueden no estar cargadas).
 */
export function animPerfil(f: FiguraV2 | Figura | null | undefined, hay: (n: string) => boolean = () => false): AnimPerfil {
  const p = perfilDe(f); if (!p) return {};
  const d = DATOS[p], paquete = (f as { momentos?: { paquete?: unknown } } | null | undefined)?.momentos?.paquete;
  const r: AnimPerfil = { vel: d.velocidad, int: d.intensidad };
  if (!paquete) r.espera = d.espera.lib && hay(d.espera.lib) ? d.espera.lib : d.espera.respaldo;
  return r;
}

// ---------- Director de conducta ----------

/** Contextos con vida automática. En partida nunca (no distraer); los resultados tienen prioridad absoluta. */
export type Contexto = "editor" | "hub" | "perfil" | "lobby" | "tv" | "partida" | "resultado";
export const CON_VIDA: readonly Contexto[] = ["editor", "hub", "perfil", "lobby", "tv"];
export const vidaPermitida = (c: Contexto) => CON_VIDA.includes(c);
/** Cuánto se espacian las oportunidades según dónde está la figura (el perfil conserva sus diferencias). */
export const ESPACIADO: Record<Contexto, number> = { editor: 1, hub: 1, perfil: 1.2, lobby: 1.6, tv: 1, partida: 1, resultado: 1 };
/** Prioridad de la vida automática: la corta cualquier gesto del jugador (1) o resultado. */
export const PRIORIDAD_VIDA = 0.5;

export interface Accion {
  /** Lo que se toca en este aparato (biblioteca si la tiene; si no, el respaldo). */
  cual: string;
  /** Para la red: el id de la biblioteca (si la opción tiene) y el respaldo de ALV; cada aparato elige según lo que tenga. */
  lib?: string; respaldo: string;
  prio: number; vel: number; int: number; dur?: number;
}
export type Azar = () => number;

/** Azar sembrable (mulberry32) para que las pruebas y la comparación sean repetibles. */
export function azarSembrado(semilla: number): Azar {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Director de una figura: `espera()` dice cuánto esperar (ms) hasta la próxima oportunidad; `decidir()` dice qué
 * hacer en esa oportunidad (o null = quedarse en reposo). Evita repetir lo mismo dos veces seguidas y varía velocidad
 * e intensidad dentro de su margen. No sabe nada del motor: quien lo usa manda la acción como «momento».
 */
export function crearDirector(perfil: Perfil, azar: Azar = Math.random, hay: (n: string) => boolean = () => false, espaciado = 1) {
  const d = DATOS[perfil];
  const ultimas: string[] = [];
  const entre = ([a, b]: [number, number]) => a + (b - a) * azar();
  // Variación controlada, recortada a los mismos topes que el motor y la red (velocidad 0.5–1.6, intensidad 0.4–1.4):
  // así lo que decide el dueño es exactamente lo que reproducen los demás.
  const variar = (base: number, min: number, max: number) => Math.min(max, Math.max(min, +(base * (1 + (azar() * 2 - 1) * d.variacion)).toFixed(3)));
  const nombreDe = (o: Opcion) => (o.lib && hay(o.lib) ? o.lib : o.anim ?? o.respaldo ?? "");
  return {
    perfil,
    espera: () => Math.round(entre(d.intervalo) * 1000 * espaciado),
    decidir(): Accion | null {
      if (azar() >= d.actuar) return null;
      // No repetir las dos últimas (si hay con qué variar).
      const opciones = d.preferencias.map(o => ({ o, n: nombreDe(o) })).filter(x => x.n);
      const libres = opciones.filter(x => !ultimas.includes(x.n));
      const pool = libres.length ? libres : opciones;
      const total = pool.reduce((s, x) => s + x.o.peso, 0);
      if (!pool.length) return null;
      let r = azar() * total, elegido = pool[pool.length - 1]!;
      for (const x of pool) { r -= x.o.peso; if (r < 0) { elegido = x; break; } }
      ultimas.unshift(elegido.n); ultimas.length = Math.min(ultimas.length, 2);
      const respaldo = elegido.o.anim ?? elegido.o.respaldo ?? elegido.n;
      const a: Accion = { cual: elegido.n, respaldo, prio: PRIORIDAD_VIDA, vel: variar(d.velocidad, 0.5, 1.6), int: variar(d.intensidad, 0.4, 1.4) };
      if (elegido.o.lib) a.lib = elegido.o.lib;
      if (elegido.o.dur) a.dur = +entre(elegido.o.dur).toFixed(2);
      return a;
    },
  };
}
