// Preferencias de «Mi experiencia» (ALV_PLAN_CONFIGURACION.md, etapa 1). Viven en este aparato (localStorage) y se
// aplican al momento. En la etapa 2 (migración 039) las de la cuenta se guardan también en Supabase; calidad gráfica y
// pantalla completa siempre son del aparato.
import { useSyncExternalStore } from "react";

export type Calidad = "auto" | "alta" | "media" | "baja";
export type Letra = "normal" | "grande";
export interface Preferencias {
  efectos: boolean;
  /** 0 a 100. */
  volumenEfectos: number;
  musica: boolean;
  /** 0 a 100. */
  volumenMusica: number;
  vibracion: boolean;
  /** false = animaciones reducidas aunque el sistema no lo pida. */
  animaciones: boolean;
  calidad: Calidad;
  letra: Letra;
  /** Agranda textos y botones cuando este aparato es la Pantalla de la sala (#/tv). */
  modoTV: boolean;
}

const CLAVE = "alv-preferencias";
export const PREFERENCIAS_INICIALES: Preferencias = {
  efectos: true, volumenEfectos: 70, musica: true, volumenMusica: 50, vibracion: true, animaciones: true, calidad: "auto", letra: "normal", modoTV: false,
};

const CALIDADES: Calidad[] = ["auto", "alta", "media", "baja"];
const entero = (v: unknown, def: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : def);
const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);

/** Lee lo guardado y descarta lo que no tenga sentido (lo de localStorage no es confiable). */
export function limpiarPreferencias(crudo: unknown, sonidoViejo?: string | null): Preferencias {
  const o = crudo && typeof crudo === "object" ? (crudo as Record<string, unknown>) : {};
  const p = PREFERENCIAS_INICIALES;
  return {
    // El interruptor viejo de sonidos (alv-sonido = "no") se respeta la primera vez.
    efectos: bool(o.efectos, sonidoViejo === "no" ? false : p.efectos),
    volumenEfectos: entero(o.volumenEfectos, p.volumenEfectos),
    musica: bool(o.musica, p.musica),
    volumenMusica: entero(o.volumenMusica, p.volumenMusica),
    vibracion: bool(o.vibracion, p.vibracion),
    animaciones: bool(o.animaciones, p.animaciones),
    calidad: CALIDADES.includes(o.calidad as Calidad) ? (o.calidad as Calidad) : p.calidad,
    letra: o.letra === "grande" ? "grande" : "normal",
    modoTV: bool(o.modoTV, p.modoTV),
  };
}

function leer(): Preferencias {
  try { return limpiarPreferencias(JSON.parse(localStorage.getItem(CLAVE) ?? "null"), localStorage.getItem("alv-sonido")); }
  catch { return { ...PREFERENCIAS_INICIALES }; }
}

let prefs = leer();
const oyentes = new Set<() => void>();

export const preferencias = () => prefs;
export const suscribirPreferencias = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f); }; };
export const usePreferencias = () => useSyncExternalStore(suscribirPreferencias, () => prefs);

/** Las que viajan con la cuenta (migración 039). Calidad gráfica es del aparato. */
export const CLAVES_CUENTA = ["efectos", "volumenEfectos", "musica", "volumenMusica", "vibracion", "animaciones", "letra", "modoTV"] as const;
type ClaveCuenta = (typeof CLAVES_CUENTA)[number];
let alGuardarCuenta: ((cambio: Partial<Pick<Preferencias, ClaveCuenta>>) => void) | null = null;
/** servicios/preferencias.ts se registra aquí para guardar en la cuenta (así este módulo no depende de Supabase). */
export const registrarGuardadoCuenta = (f: typeof alGuardarCuenta) => { alGuardarCuenta = f; };

/** Cambia preferencias, las aplica al momento y las guarda en el aparato (y en la cuenta, si hay). */
export function cambiarPreferencias(cambio: Partial<Preferencias>, opciones: { desdeCuenta?: boolean } = {}) {
  prefs = limpiarPreferencias({ ...prefs, ...cambio });
  try { localStorage.setItem(CLAVE, JSON.stringify(prefs)); } catch { /* sin almacenamiento: vale solo para esta visita */ }
  aplicar();
  oyentes.forEach(f => f());
  if (!opciones.desdeCuenta && alGuardarCuenta) {
    const deCuenta = Object.fromEntries(Object.entries(cambio).filter(([k]) => (CLAVES_CUENTA as readonly string[]).includes(k)));
    if (Object.keys(deCuenta).length) alGuardarCuenta(deCuenta);
  }
}

// ---------- Movimiento ----------

const consultaSistema = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
/** ¿Hay que reducir el movimiento? Lo pide el sistema o se apagaron las animaciones aquí. */
export const movimientoReducido = () => !prefs.animaciones || !!consultaSistema?.matches;

/**
 * Las pantallas preguntan por movimiento reducido con matchMedia (una docena de lugares). Para que el interruptor
 * valga en todas sin tocarlas una por una, esa consulta responde «sí» cuando aquí se apagaron las animaciones.
 */
function envolverMatchMedia() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
  const original = window.matchMedia.bind(window);
  window.matchMedia = (q: string) => {
    const r = original(q);
    if (prefs.animaciones || !/prefers-reduced-motion:\s*reduce/.test(q)) return r;
    return new Proxy(r, { get: (t, k) => (k === "matches" ? true : Reflect.get(t, k, t)) }) as MediaQueryList;
  };
}

/** Parámetros para las escenas 3D (iframes): calidad elegida y movimiento reducido. */
export function paramsEscena(): string {
  return (prefs.calidad !== "auto" ? `&calidad=${prefs.calidad}` : "") + (movimientoReducido() ? "&quieto=1" : "") + paramBiblioteca();
}

/**
 * Dónde está la biblioteca de animaciones (ALV_PLAN_ANIMATION_LIBRARY.md). Solo existe si se define
 * VITE_ANIM_BIBLIOTECA_URL en .env.local: las tablas son privadas y nunca van al repositorio ni a la página publicada.
 */
export function paramBiblioteca(url: string | undefined = import.meta.env.VITE_ANIM_BIBLIOTECA_URL): string {
  if (!url || !/^https?:\/\/[^\s"'<>]+$/.test(url)) return "";
  return `&biblioteca=${encodeURIComponent(url)}`;
}

/** Calidad para la escena del HUB: «auto» es lo de siempre (alta en computadora, media en celular, y baja sola si va lenta). */
export const calidadAzotea = (tactil: boolean) => (prefs.calidad === "auto" ? (tactil ? "media" : "alta") : prefs.calidad);

// ---------- Vibración ----------

/** Solo aparatos táctiles: Chrome de computadora tiene la función pero no vibra. iPhone no la tiene. */
export const hayVibracion = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
  && typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
export function vibrar(patron: number | number[]) {
  if (!prefs.vibracion || movimientoReducido() || !hayVibracion()) return;
  try { navigator.vibrate(patron); } catch { /* sin vibración */ }
}

// ---------- Aplicar al documento ----------

const ZOOM_LETRA = 1.12, ZOOM_TV = 1.25;
const enPantalla = () => typeof location !== "undefined" && location.hash.startsWith("#/tv");

/** Clase de movimiento y tamaño de texto en <html>. Se llama al cambiar algo y al cambiar de ruta. */
export function aplicar() {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("alv-quieto", !prefs.animaciones);
  const zoom = prefs.modoTV && enPantalla() ? ZOOM_TV : prefs.letra === "grande" ? ZOOM_LETRA : 1;
  html.style.setProperty("--alv-zoom", String(zoom));
  html.classList.toggle("alv-zoom", zoom !== 1);
}

let instalado = false;
/** Se llama una vez al arrancar la app. */
export function instalarPreferencias() {
  if (instalado) return;
  instalado = true;
  envolverMatchMedia();
  aplicar();
  window.addEventListener("hashchange", aplicar);
}
