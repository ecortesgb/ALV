// Sistema global de animaciones (ALV_PLAN_ANIMACIONES.md).
// Una sola tienda para toda la app: qué gesto pidió cada jugador, con qué prioridad y hasta cuándo suena.
// No sabe nada del 3D: las escenas (Escena3D, EscenaAzotea) se suscriben y le pasan el gesto al motor
// (tools/minifig/escena.js), que lo dibuja y avisa al terminar. La red (servicios/gestosSala.ts) también se suscribe.
//
// Uso:
//   pedirGesto(miId, "victoria", miFigura)      → true si entró (y entonces lo ven las escenas y la sala)
//   const { gesto } = useGesto(miId)              → para apagar botones mientras suena algo más importante
//   animacionDe(figura)                           → talla y especial del personaje (para mandarlo al motor)
import { useSyncExternalStore } from "react";
import datos from "../content/animaciones-personajes.json";
import type { FiguraV2 } from "../content/personaje";

export type Gesto = "saludar" | "victoria" | "derrota" | "especial";
export const GESTOS: readonly Gesto[] = ["saludar", "victoria", "derrota", "especial"];
export const esGesto = (x: unknown): x is Gesto => typeof x === "string" && (GESTOS as readonly string[]).includes(x);

/** Prioridad de cada cosa que hace una figura (más = más importante). Cambiarla aquí cambia la app y el motor. */
export const PRIORIDAD: Record<Gesto | "espera" | "punto", number> = { espera: 0, saludar: 1, punto: 1, victoria: 1, derrota: 1, especial: 2 };
/** Entre un gesto y otro de la misma figura (contra toques repetidos). */
export const ENFRIAR_MS = 600;
/** Lo más que dura cada gesto. El motor avisa antes cuando termina de verdad (depende de la animación y la talla). */
export const DURACION_MS: Record<Gesto, number> = { saludar: 2500, victoria: 3800, derrota: 3800, especial: 6500 };

// ---------- Personajes: talla y especial (datos, el motor no cambia al agregar uno) ----------

export type Talla = "normal" | "grande" | "androide" | "pequeno";
export const TALLAS: readonly Talla[] = ["normal", "grande", "androide", "pequeno"];
export interface EspecialDetalle {
  anim: string;
  /** La figura cambia de talla a media animación (Hulk crece). */
  cambia?: { talla: Talla };
  /** Cambia una parte de la figura dibujada: su cara, o esconde el pelo o casco, o la capa. */
  pieza?: { rostro?: string; ocultar?: "cabello" | "capa" };
  /** Segundo en que hace el cambio y en que lo deshace (si no, al terminar). */
  en?: number; vuelve?: number;
}
export type Especial = string | EspecialDetalle;
export interface AnimPersonaje { talla?: Talla; especial?: Especial }

const NOMBRE_ANIM = /^[a-z0-9-]{1,40}$/;
const numero = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 10 ? x : undefined);
/** Revisa una entrada (del JSON o de una figura) y se queda solo con lo válido. Nunca truena. */
export function limpiarAnim(x: unknown): AnimPersonaje {
  if (!x || typeof x !== "object") return {};
  const o = x as Record<string, unknown>, r: AnimPersonaje = {};
  if (typeof o.talla === "string" && (TALLAS as readonly string[]).includes(o.talla)) r.talla = o.talla as Talla;
  const e = o.especial;
  if (typeof e === "string" && NOMBRE_ANIM.test(e)) r.especial = e;
  else if (e && typeof e === "object" && typeof (e as EspecialDetalle).anim === "string" && NOMBRE_ANIM.test((e as EspecialDetalle).anim)) {
    const d = e as Record<string, unknown>, s: EspecialDetalle = { anim: String(d.anim) };
    const ca = d.cambia as Record<string, unknown> | undefined;
    if (ca && typeof ca.talla === "string" && (TALLAS as readonly string[]).includes(ca.talla)) s.cambia = { talla: ca.talla as Talla };
    const pz = d.pieza as Record<string, unknown> | undefined;
    if (pz && typeof pz === "object") {
      const p: EspecialDetalle["pieza"] = {};
      if (typeof pz.rostro === "string" && NOMBRE_ANIM.test(pz.rostro)) p.rostro = pz.rostro;
      if (pz.ocultar === "cabello" || pz.ocultar === "capa") p.ocultar = pz.ocultar;
      if (p.rostro || p.ocultar) s.pieza = p;
    }
    const en = numero(d.en), vu = numero(d.vuelve);
    if (en != null) s.en = en; if (vu != null) s.vuelve = vu;
    r.especial = s;
  }
  return r;
}

interface Entrada extends AnimPersonaje { nombre: string }
const PERSONAJES = new Map<string, Entrada>();
const POR_NOMBRE = new Map<string, string>();
for (const [id, x] of Object.entries((datos as { personajes: Record<string, unknown> }).personajes)) {
  const nombre = typeof (x as { nombre?: unknown }).nombre === "string" ? (x as { nombre: string }).nombre : "";
  PERSONAJES.set(id, { nombre, ...limpiarAnim(x) });
  if (nombre) POR_NOMBRE.set(nombre, id);
}

/** Id del personaje (traje) de una figura, si es uno del catálogo sin apodo; si no, null. */
export function personajeDe(f: FiguraV2 | null | undefined): string | null {
  if (!f) return null;
  const propio = (f as { extensiones?: { alv?: { personaje?: unknown } } }).extensiones?.alv?.personaje;
  if (typeof propio === "string" && PERSONAJES.has(propio)) return propio;
  return (f.nombre && POR_NOMBRE.get(f.nombre)) || null;
}

/** Talla y especial de la figura: los suyos si los trae, si no los de su personaje. Vacío = normal y especial según su poder. */
export function animacionDe(f: FiguraV2 | null | undefined): AnimPersonaje {
  if (!f) return {};
  const propio = limpiarAnim((f as { extensiones?: { alv?: { anim?: unknown } } }).extensiones?.alv?.anim);
  const id = personajeDe(f), base = id ? PERSONAJES.get(id) : undefined;
  const r: AnimPersonaje = {};
  const talla = propio.talla ?? base?.talla, especial = propio.especial ?? base?.especial;
  if (talla) r.talla = talla; if (especial) r.especial = especial;
  return r;
}

// ---------- Tienda de gestos ----------

export interface EstadoGesto {
  /** Lo que suena ahora (null = la espera de siempre). */
  gesto: Gesto | null; prioridad: number;
  /** Personaje con que se pidió (id del traje o null). */
  personaje: string | null;
  desde: number; hasta: number;
  /** Cuántos gestos ha hecho (los avisos de la red llegan en este orden). */
  n: number;
}
export interface EventoGesto { jugador: string; gesto: Gesto; prioridad: number; personaje: string | null; n: number; remoto: boolean }

const QUIETO: EstadoGesto = Object.freeze({ gesto: null, prioridad: 0, personaje: null, desde: 0, hasta: 0, n: 0 });
const estados = new Map<string, EstadoGesto>();
const relojes = new Map<string, ReturnType<typeof setTimeout>>();
const oyentesId = new Map<string, Set<() => void>>();
const alEscenas = new Set<(e: EventoGesto) => void>();
const alPropios = new Set<(e: EventoGesto) => void>();

export const estadoGesto = (jugador: string): EstadoGesto => estados.get(jugador) ?? QUIETO;

/**
 * ¿Entra este gesto? Entra si su prioridad es mayor o igual a la que suena y no es el mismo, y si ya pasó el
 * enfriamiento desde el último. Es la misma regla que aplica el motor.
 */
export function decidir(e: EstadoGesto, gesto: Gesto, ahora: number): boolean {
  const p = PRIORIDAD[gesto], sonando = e.gesto != null && ahora < e.hasta;
  if (sonando && (p < e.prioridad || e.gesto === gesto)) return false;
  return ahora - e.desde >= ENFRIAR_MS || e.n === 0;
}

function poner(jugador: string, e: EstadoGesto) {
  estados.set(jugador, e);
  const r = relojes.get(jugador); if (r) clearTimeout(r);
  if (e.gesto) relojes.set(jugador, setTimeout(() => terminarGesto(jugador, e.gesto!), Math.max(0, e.hasta - Date.now())));
  oyentesId.get(jugador)?.forEach(f => f());
}

/** Pide que la figura de `jugador` haga `gesto`. Devuelve si entró; si entró, lo dibujan las escenas y se avisa a la sala. */
export function pedirGesto(jugador: string, gesto: Gesto, figura?: FiguraV2 | null, ahora = Date.now()): boolean {
  if (!jugador || !esGesto(gesto)) return false;
  const e = estadoGesto(jugador);
  if (!decidir(e, gesto, ahora)) return false;
  // `n` crece siempre, también si este aparato se recarga (sale de la hora en décimas de segundo): así los demás no lo descartan.
  const ev: EventoGesto = { jugador, gesto, prioridad: PRIORIDAD[gesto], personaje: personajeDe(figura), n: Math.max(e.n + 1, Math.floor(ahora / 100)), remoto: false };
  poner(jugador, { gesto, prioridad: ev.prioridad, personaje: ev.personaje, desde: ahora, hasta: ahora + DURACION_MS[gesto], n: ev.n });
  alEscenas.forEach(f => f(ev));
  alPropios.forEach(f => f(ev));
  return true;
}

/**
 * Un gesto que llegó por la red. Quien lo mandó ya decidió con las prioridades: aquí no se vuelve a decidir
 * (así todos ven lo mismo); solo se descarta si es repetido o viejo (`n` no avanza).
 */
export function aplicarGestoRemoto(jugador: string, gesto: Gesto, n: number, personaje: string | null, ahora = Date.now()): boolean {
  if (!jugador || !esGesto(gesto) || !Number.isInteger(n) || n < 1) return false;
  const e = estadoGesto(jugador);
  if (n <= e.n) return false;
  const ev: EventoGesto = { jugador, gesto, prioridad: PRIORIDAD[gesto], personaje, n, remoto: true };
  poner(jugador, { gesto, prioridad: ev.prioridad, personaje, desde: ahora, hasta: ahora + DURACION_MS[gesto], n });
  alEscenas.forEach(f => f(ev));
  return true;
}

/** El motor avisó que terminó (o que no pudo hacerlo): la figura vuelve a su espera. */
export function terminarGesto(jugador: string, gesto: Gesto) {
  const e = estados.get(jugador); if (!e || e.gesto !== gesto) return;
  poner(jugador, { ...e, gesto: null, prioridad: 0, hasta: 0 });
}

/** Las escenas oyen aquí qué gesto dibujar. Devuelve cómo dejar de oír. */
export function alPedirGesto(f: (e: EventoGesto) => void): () => void { alEscenas.add(f); return () => { alEscenas.delete(f); }; }
/** La red oye aquí los gestos de este aparato para mandarlos a la sala. */
export function alGestoPropio(f: (e: EventoGesto) => void): () => void { alPropios.add(f); return () => { alPropios.delete(f); }; }

/** Estado del gesto de un jugador; solo se vuelve a dibujar quien lo usa cuando cambia ese jugador. */
export function useGesto(jugador: string): EstadoGesto {
  return useSyncExternalStore(
    f => { let s = oyentesId.get(jugador); if (!s) oyentesId.set(jugador, (s = new Set())); s.add(f); return () => { s!.delete(f); if (!s!.size) oyentesId.delete(jugador); }; },
    () => estadoGesto(jugador),
  );
}

/** Solo para pruebas: deja la tienda vacía. */
export function reiniciarGestos() { relojes.forEach(clearTimeout); relojes.clear(); estados.clear(); }
