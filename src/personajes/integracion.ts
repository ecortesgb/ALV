// Fase 5 · ÚNICO punto por donde la app usa el sistema de personajes nuevo (ALV_PLAN_FASE5.md; arquitectura decidida por
// Codex, encargo 2026-11-26-fase5-r1). Aquí viven:
//   · la bandera (solo en desarrollo: en la app publicada no se puede encender),
//   · la fuente de los GLB privados (una sola función; después la conecta alv-privacidad a fuentePrivada()),
//   · el puente temporal v2 ↔ v3: la figura nueva viaja DENTRO de la v2 como extensiones.alv.v3, así pasa el CHECK de la
//     base (version = 2) sin migración y quien tenga la bandera apagada ve la v2 de respaldo,
//   · la resolución central de una figura v3 a su plano (catálogo y lo creado en el constructor, igual en HUB, TV y fotos).
// No importa nada del sistema viejo (candado separacion.test.ts): la figura v2 se trata como objeto con version = 2.
import { planoConstructor, type Piezas } from "./constructorDatos";
import { leerFigura } from "./figura";
import { resolver, type Catalogo } from "./plano";
import type { FiguraV3, Plano } from "./tipos";

/** Lo mínimo de una figura v2 que el puente necesita (el tipo completo vive en el sistema viejo). */
export interface FiguraV2Puente { version: 2; extensiones?: Record<string, unknown>; [k: string]: unknown }

type Entorno = { DEV?: boolean; VITE_PERSONAJES_V3?: string; VITE_PERSONAJES_PRIVADOS_URL?: string };
const entorno = (): Entorno => import.meta.env as unknown as Entorno;

/** Bandera de la fase 5: solo en desarrollo, con VITE_PERSONAJES_V3=1 o ?v3=1. En el build publicado DEV es false y
 *  nada la enciende (Codex D3: parámetro y no localStorage, para no dejarla prendida sin querer). */
export function banderaV3(env: Entorno = entorno(), busqueda: string = typeof location !== "undefined" ? location.search : ""): boolean {
  if (!env.DEV) return false;
  return env.VITE_PERSONAJES_V3 === "1" || new URLSearchParams(busqueda).get("v3") === "1";
}

/** De dónde se leen los personajes privados (índice y GLB). Desarrollo: VITE_PERSONAJES_PRIVADOS_URL (servidor 4193).
 *  Publicado: null en esta fase; luego `return fuentePrivada({ cliente })` (rama de alv-privacidad). Tener fuente NO
 *  enciende la bandera. */
export async function fuenteDePersonajes(env: Entorno = entorno()): Promise<string | null> {
  if (env.DEV && env.VITE_PERSONAJES_PRIVADOS_URL) return env.VITE_PERSONAJES_PRIVADOS_URL;
  return null; // luego: fuentePrivada({ cliente })
}

/** Tope de la columna figuras_jugador.figura (CHECK pg_column_size ≤ 32768); se deja margen. */
export const TOPE_PUENTE = 30000;

/** Empaqueta una v3 dentro de su v2 de respaldo (la última v2 del mismo espacio; sin ella, {version: 2}, que el motor viejo
 *  dibuja como su figura por defecto, siempre igual). Lo demás de la v2 se conserva. null si no cabe o la v3 no es válida. */
export function empaquetarV3(v3: FiguraV3, respaldo: FiguraV2Puente | null): FiguraV2Puente | null {
  const valida = leerFigura(v3);
  if (!valida) return null;
  const base: FiguraV2Puente = respaldo && respaldo.version === 2 ? respaldo : { version: 2 };
  const ext = (base.extensiones && typeof base.extensiones === "object" ? base.extensiones : {}) as Record<string, unknown>;
  const alv = (ext.alv && typeof ext.alv === "object" ? ext.alv : {}) as Record<string, unknown>;
  const fuera: FiguraV2Puente = { ...base, version: 2, extensiones: { ...ext, alv: { ...alv, v3: valida } } };
  return JSON.stringify(fuera).length <= TOPE_PUENTE ? fuera : null;
}

/** La v3 que viaja en una v2, validada (lo que llega de la nube o de otro aparato no es confiable). null si no trae. */
export function leerV3(f: unknown): FiguraV3 | null {
  const v3 = (f as { extensiones?: { alv?: { v3?: unknown } } } | null)?.extensiones?.alv?.v3;
  return v3 === undefined ? null : leerFigura(v3);
}

/** La v2 sin el puente (lo que dibuja el motor viejo cuando la v3 no se puede usar). */
export function sinV3<T extends FiguraV2Puente>(f: T): T {
  const alv = (f.extensiones as { alv?: Record<string, unknown> } | undefined)?.alv;
  if (!alv || !("v3" in alv)) return f;
  const { v3: _fuera, ...resto } = alv; void _fuera;
  return { ...f, extensiones: { ...f.extensiones, alv: resto } };
}

/** Resolución central (Codex, ajuste 3): la misma para el catálogo y para lo creado en el constructor (base del catálogo
 *  + piezas cambiadas), así HUB, lobby, TV y fotos reciben exactamente el mismo personaje compuesto. null si falta el
 *  personaje, la familia o la fuente: entonces se usa la v2 de respaldo. */
export function resolverFigura(id: string, f: FiguraV3, catalogo: Catalogo, piezas: Piezas): Plano | null {
  if (f.origen.tipo !== "catalogo") return null;
  return Object.keys(f.piezas).length ? planoConstructor(id, f, catalogo, piezas) : resolver(id, f, catalogo);
}
