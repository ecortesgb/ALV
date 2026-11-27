// Fase 5 · ÚNICO punto por donde la app usa el sistema de personajes nuevo (ALV_PLAN_FASE5.md; arquitectura decidida por
// Codex, encargo 2026-11-26-fase5-r1). Aquí viven:
//   · la bandera (solo en desarrollo: en la app publicada no se puede encender),
//   · la fuente de los GLB privados (una sola función: con el corte, fuentePrivada() de alv-privacidad),
//   · el puente temporal v2 ↔ v3: la figura nueva viaja DENTRO de la v2 como extensiones.alv.v3, así pasa el CHECK de la
//     base (version = 2) sin migración y quien tenga la bandera apagada ve la v2 de respaldo,
//   · la resolución central de una figura v3 a su plano (catálogo y lo creado en el constructor, igual en HUB, TV y fotos).
// No importa nada del sistema viejo (candado separacion.test.ts): la figura v2 se trata como objeto con version = 2.
import { useEffect, useState } from "react";
import { cliente } from "../servicios/cliente";
import { fuentePrivada } from "../servicios/personajesPrivados";
import { BASE_CREAR, piezasDeCatalogo, planoConstructor, type PiezaCons, type Piezas } from "./constructorDatos";
import { piezasGenericas } from "./genericas";
import { baseGenerica, conMovimientos, type BaseGenerica } from "./movimientos";
import { leerFigura } from "./figura";
import { caretaEn, conEspecialAlSalir, cuantasFormas, figuraEnForma, type Careta } from "./formas";
import { cargarIndice, type Indice } from "./indice";
import { poderesDeFicha, resolver, type Catalogo } from "./plano";
import type { FiguraV3, Plano } from "./tipos";
export type { FiguraV3 } from "./tipos";

/** Lo mínimo de una figura v2 que el puente necesita (el tipo completo vive en el sistema viejo). */
export interface FiguraV2Puente { version: 2; extensiones?: Record<string, unknown>; [k: string]: unknown }

type Entorno = { DEV?: boolean; VITE_PERSONAJES_V3?: string; VITE_PERSONAJES_PRIVADOS_URL?: string; VITE_CORTE_V3?: string };
const entorno = (): Entorno => import.meta.env as unknown as Entorno;

/** Día del corte a v3 (Codex, v3-directo-r1): EXACTAMENTE VITE_CORTE_V3=1 al compilar (publicar.yml la pasa desde las
 *  variables de GitHub). Enciende a la vez: la base guarda y devuelve v3 directa, la bandera también en lo publicado y la
 *  fuente privada. Sin ella, todo como antes. */
export function modoCorteV3(env: Entorno = entorno()): boolean {
  return env.VITE_CORTE_V3 === "1";
}

/** Bandera de la fase 5: con el corte, siempre; si no, solo en desarrollo, con VITE_PERSONAJES_V3=1 o ?v3=1. Sin corte, en el
 *  build publicado DEV es false y nada la enciende (Codex D3, modificada en v3-directo-r1; ?v3=1 nunca activa lo publicado). */
export function banderaV3(env: Entorno = entorno(), busqueda: string = typeof location !== "undefined" ? location.search : ""): boolean {
  if (modoCorteV3(env)) return true;
  if (!env.DEV) return false;
  return env.VITE_PERSONAJES_V3 === "1" || new URLSearchParams(busqueda).get("v3") === "1";
}

/** De dónde se leen los personajes privados (índice y GLB). Desarrollo: VITE_PERSONAJES_PRIVADOS_URL (servidor 4193).
 *  Publicado con el corte: SOLO `fuentePrivada({ cliente })` (service worker + bucket privado de la 045). Sin corte: null.
 *  Tener fuente NO enciende la bandera. */
export async function fuenteDePersonajes(env: Entorno = entorno()): Promise<string | null> {
  if (env.DEV && env.VITE_PERSONAJES_PRIVADOS_URL) return env.VITE_PERSONAJES_PRIVADOS_URL; // desarrollo: ensayo con la local
  // Publicado con el corte: SOLO la fuente privada (Codex, v3-directo-r1): sin sesión o sin acceso da null y se ve el
  // respaldo; nunca se regresa a una URL local o pública. Un null no se guarda: «Reintentar» vuelve a preguntar.
  if (modoCorteV3(env)) return fuentePrivada({ cliente });
  return null;
}

/** Si una escena (iframe de escena.html) ya se puede crear, y con qué clave. Con el corte, los GLB privados solo llegan por
 *  el service worker, y un iframe solo queda bajo su control si se crea DESPUÉS de que `fuentePrivada()` lo registró:
 *  mientras el catálogo carga no se crea, y si el catálogo llega más tarde (Reintentar) la clave cambia y el iframe se
 *  vuelve a crear. Sin corte, siempre y con la misma clave (como antes). */
export function montajeEscena(corte: boolean, estado: "cargando" | "listo" | "sin-acceso", hayCatalogo: boolean): { montar: boolean; clave: string } {
  if (!corte) return { montar: true, clave: "siempre" };
  if (!hayCatalogo && estado === "cargando") return { montar: false, clave: "espera" };
  return { montar: true, clave: hayCatalogo ? "privada" : "respaldo" };
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
export function resolverFigura(id: string, f: FiguraV3, catalogo: Catalogo, piezas: Piezas, base: BaseGenerica | null = null): Plano | null {
  if (f.origen.tipo !== "catalogo") return null;
  const plano = Object.keys(f.piezas).length ? planoConstructor(id, f, catalogo, piezas) : resolver(id, f, catalogo);
  return plano ? conMovimientos(plano, f, catalogo, base) : null;
}

// ---------- Frontera con la base (Codex, v3-directo-r1, opción A) ----------
// Dentro de la app la figura sigue siendo una v2 (con la v3 en el puente); la base, después del corte, recibe y devuelve la
// v3 DIRECTA. Solo estas dos funciones cruzan la frontera, en los puntos de entrada y salida (cuenta, enlace, hubVivo, RPC).

/** Los campos que todavía leen las pantallas viejas (momentos, personalidad, apodo) salen de la v3: un solo valor. */
export function proyectar(v3: FiguraV3): FiguraV2Puente {
  const alv = (v3.extensiones.alv ?? {}) as Record<string, unknown>;
  const ext: Record<string, unknown> = { v3 };
  if (alv.apodo !== undefined) ext.apodo = alv.apodo;
  if (alv.personalidad !== undefined) ext.personalidad = alv.personalidad;
  return { version: 2, momentos: { ...v3.momentos }, extensiones: { alv: ext } };
}

/** Lo que llega de la base (o de otro aparato) a la forma interna. v3 válida → puente proyectado (sin depender del catálogo
 *  ni del GLB: si faltan recursos se ve el respaldo y los datos se conservan); v2 → igual que siempre, SALVO con el corte: ahí
 *  una v2 de la base (las que quedan durante la ventana de mantenimiento, antes de la 046) no cuenta como figura y se ignora;
 *  lo demás → null. */
export function desdeBase(f: unknown, corte: boolean = modoCorteV3()): FiguraV2Puente | null {
  if (!f || typeof f !== "object" || Array.isArray(f)) return null;
  const v = (f as { version?: unknown }).version;
  if (v === 2) return corte ? null : (f as FiguraV2Puente);
  if (v === 3) { const v3 = leerFigura(f); return v3 ? proyectar(v3) : null; }
  return null;
}

/** Filas de una RPC con `figura` (ranking, salón, récords, torneos): cada figura pasa por la frontera. */
export function conFiguras<T extends { figura?: unknown }>(filas: T[]): T[] {
  return filas.map(r => ("figura" in r ? { ...r, figura: desdeBase(r.figura) } : r)); // con el corte, las v2 quedan en null
}

const momentosValidos = (m: unknown): m is FiguraV3["momentos"] => {
  const x = m as Record<string, unknown> | null;
  return !!x && typeof x === "object" && ["espera", "victoria", "derrota", "punto"].every(k => typeof x[k] === "string" && (x[k] as string).length <= 40)
    && (x.paquete === null || (typeof x.paquete === "string" && x.paquete.length <= 40));
};

/** Qué se manda a la base. Sin corte: la figura tal cual (v2 o puente, como hoy). Con corte: la v3 del puente, con lo que una
 *  pantalla vieja haya cambiado en la proyección (momentos, personalidad, apodo) ya dentro de la v3; una v2 sin v3 se OMITE
 *  (no se sube y tampoco cuenta como espacio vacío: nunca produce un borrado); lo inválido es error. */
export type HaciaBase = { tipo: "subir"; figura: unknown } | { tipo: "omitir" } | { tipo: "error" };
export function haciaBase(f: unknown, corte: boolean = modoCorteV3()): HaciaBase {
  if (!f || typeof f !== "object" || (f as { version?: unknown }).version !== 2) return { tipo: "error" };
  if (!corte) return { tipo: "subir", figura: f };
  const p = f as FiguraV2Puente & { momentos?: unknown };
  const pAlv = (p.extensiones?.alv ?? {}) as Record<string, unknown>;
  if (pAlv.v3 === undefined) return { tipo: "omitir" };
  const v3 = leerFigura(pAlv.v3);
  if (!v3) return { tipo: "error" };
  const alv = { ...((v3.extensiones.alv ?? {}) as Record<string, unknown>) };
  for (const k of ["apodo", "personalidad"]) { if (k in pAlv) alv[k] = pAlv[k]; else delete alv[k]; }
  const junta = leerFigura({ ...v3, momentos: momentosValidos(p.momentos) ? p.momentos : v3.momentos, extensiones: { ...v3.extensiones, alv } });
  return junta ? { tipo: "subir", figura: junta } : { tipo: "error" };
}

// ---------- Para las escenas de la app (HUB, lobby, TV, nave) ----------

export interface CatalogoV3 { catalogo: Catalogo; piezas: Piezas;
  /** Base genérica de minifigura (movimientos genéricos); null si la entrega no la trae. */
  base?: BaseGenerica | null }

/** La base genérica de minifigura del índice (la primera válida). */
export function baseDelIndice(ind: Pick<Indice, "genericas">): BaseGenerica | null {
  for (const g of ind.genericas) { const b = baseGenerica(g); if (b) return b; }
  return null;
}

/** Piezas del constructor: las de cada personaje del catálogo (originales) más las genéricas de producción. */
export function todasLasPiezas(ind: Pick<Indice, "catalogo" | "ranuras" | "genericas">): Map<string, PiezaCons> {
  const fuera = piezasDeCatalogo(ind.catalogo, ind.ranuras);
  const carga = ind.catalogo.get(BASE_CREAR)?.ficha.carga;
  for (const g of ind.genericas) {
    const { piezas, errores } = piezasGenericas(g, carga);
    if (errores.length) console.warn("piezas genéricas rechazadas:", errores);
    for (const [id, pz] of piezas) if (!fuera.has(id)) fuera.set(id, pz);
  }
  return fuera;
}
let cargaCatalogo: Promise<CatalogoV3 | null> | null = null;
/** El catálogo, una sola vez por página, solo con la bandera encendida y una fuente. null si no (o si falla: entonces
 *  todas las figuras se ven con su v2 de respaldo). */
export function catalogoParaEscena(): Promise<CatalogoV3 | null> {
  if (!banderaV3()) return Promise.resolve(null);
  if (modoCorteV3()) vigilarCuenta();
  if (!cargaCatalogo) {
    cargaCatalogo = fuenteDePersonajes()
      .then(f => (f ? cargarIndice(f).then(ind => ({ catalogo: ind.catalogo, piezas: todasLasPiezas(ind), base: baseDelIndice(ind) })) : null))
      .catch(err => { console.warn("personajes nuevos: no cargó el catálogo; se usan las figuras de respaldo", err); return null; });
  }
  return cargaCatalogo;
}
/** El catálogo para una escena (null mientras carga, con la bandera apagada o sin fuente). */
export function useCatalogoV3(): CatalogoV3 | null {
  return useEstadoCatalogoV3().catalogo;
}
/** Vuelve a pedir el catálogo (p. ej. tras recuperar la sesión o el acceso privado). Avisa a quien lo esté usando. */
const oyentesCat = new Set<() => void>();
export function reintentarCatalogo() { cargaCatalogo = null; oyentesCat.forEach(f => f()); }

/** Qué hacer cuando cambia la cuenta con el corte (Codex fuente-privada-verif, 1). Lo privado ya cargado (catálogo, GLB en
 *  los iframes, fotos en memoria) es de la cuenta anterior y `fuentePrivada()` guarda su resultado por página: al salir o
 *  entrar con otra cuenta se recarga la página completa. Si antes no había cuenta, no había nada privado: solo se vuelve a
 *  pedir el catálogo. Renovar el token (misma cuenta) no hace nada. `antes` undefined = aún no se sabe (primer aviso). */
export function cambioDeCuenta(antes: string | null | undefined, ahora: string | null): "nada" | "reintentar" | "recargar" {
  if (antes === undefined || antes === ahora) return "nada";
  return antes === null ? "reintentar" : "recargar";
}
let vigilando = false;
function vigilarCuenta() {
  if (vigilando || !cliente) return;
  vigilando = true;
  let antes: string | null | undefined;
  cliente.auth.onAuthStateChange((_evento, s) => {
    const ahora = s?.user?.id ?? null, que = cambioDeCuenta(antes, ahora);
    antes = ahora;
    // Fuera del aviso: Supabase pide no llamar a auth dentro de él (reintentar vuelve a pedir la sesión).
    if (que === "reintentar") setTimeout(reintentarCatalogo, 0);
    if (que === "recargar") location.reload();
  });
}
/** El catálogo y en qué va: «cargando», «listo» o «sin-acceso» (sin fuente, sin sesión o falló: se ve el respaldo y se
 *  puede reintentar; Codex, v3-directo-r1). Con la bandera apagada: «sin-acceso» y nada se pide. */
export function useEstadoCatalogoV3(): { catalogo: CatalogoV3 | null; estado: "cargando" | "listo" | "sin-acceso"; reintentar: () => void } {
  const [r, setR] = useState<{ catalogo: CatalogoV3 | null; estado: "cargando" | "listo" | "sin-acceso" }>({ catalogo: null, estado: "cargando" });
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => { const f = () => setVuelta(n => n + 1); oyentesCat.add(f); return () => { oyentesCat.delete(f); }; }, []);
  useEffect(() => {
    let vivo = true;
    setR(x => (x.catalogo ? x : { catalogo: null, estado: "cargando" }));
    catalogoParaEscena().then(c => { if (vivo) setR({ catalogo: c, estado: c ? "listo" : "sin-acceso" }); });
    return () => { vivo = false; };
  }, [vuelta]);
  return { ...r, reintentar: reintentarCatalogo };
}
/** El catálogo y si la escena ya se puede crear (ver `montajeEscena`). */
export function useEscenaV3(): { catalogo: CatalogoV3 | null; montar: boolean; clave: string } {
  const { catalogo, estado } = useEstadoCatalogoV3();
  return { catalogo, ...montajeEscena(modoCorteV3(), estado, !!catalogo) };
}
/** Una figura lista para la escena vieja con el adaptador de la fase 5: la v2 sin el puente y, si su v3 se puede resolver,
 *  el `plano3` que el adaptador carga. Sin catálogo (bandera apagada) la figura pasa igual que siempre. */
export function paraEscena<T extends { id: string; figura?: unknown }>(x: T, cat: CatalogoV3 | null): T & { plano3?: Plano } {
  if (!cat || !x.figura || typeof x.figura !== "object") return x;
  const v3 = leerV3(x.figura);
  const plano = v3 ? resolverFigura(x.id, v3, cat.catalogo, cat.piezas, cat.base ?? null) : null;
  return { ...x, figura: sinV3(x.figura as FiguraV2Puente), ...(plano ? { plano3: plano } : {}) };
}

// ---------- Transformaciones (Elías, 27 nov: Banner ↔ Hulk, Tony / Iron Man / casco, Peter ↔ Spider-Man) ----------

/** Cuántas formas tiene la figura (0 = no se transforma). No necesita el catálogo. */
export function formasDe(f: unknown): number { return cuantasFormas(leerV3(f)); }

/** La figura (v2 con su v3 en el puente) en el paso `paso` de su ciclo; sin ciclo, paso 0 o sin catálogo, la misma. */
export function enForma(f: FiguraV2Puente, paso: number, cat: CatalogoV3 | null): FiguraV2Puente {
  const v3 = paso ? leerV3(f) : null;
  if (!v3 || !cat) return f;
  const otra = figuraEnForma(v3, paso, cat.catalogo, cat.piezas);
  return otra === v3 ? f : empaquetarV3(otra, sinV3(f)) ?? f;
}

/** ¿Al dejar la forma de `paso` se hace antes la animación especial (Banner se transforma)? */
export function especialAlSalir(f: unknown, paso: number): boolean { const v3 = leerV3(f); return !!v3 && conEspecialAlSalir(v3, paso); }

/** Careta levantada en ese paso (Iron Man), para la escena. null = cerrada. */
export function caretaDe(f: unknown, paso: number): Careta | null { const v3 = paso ? leerV3(f) : null; return v3 ? caretaEn(v3, paso) : null; }

// ---------- Poderes (Elías, 27 nov: escudo del Capi, rayo de Cíclope, telaraña, fuego, vuelo…) ----------

/** Los poderes que se le ofrecen a la figura (en orden; el primero es el principal). Vacío si su personaje no tiene. */
export function poderesDe(f: unknown, cat: CatalogoV3 | null): { id: string; nombre: string }[] {
  const v3 = leerV3(f);
  if (!v3 || !cat || v3.origen.tipo !== "catalogo") return [];
  const en = cat.catalogo.get(v3.origen.personaje);
  return en ? poderesDeFicha(en.ficha, en.base, cat.catalogo).map(p => ({ id: p.id, nombre: p.nombre })) : [];
}
