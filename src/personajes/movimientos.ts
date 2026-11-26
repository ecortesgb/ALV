// Movimientos especiales del personalizador (pedido de Elías, 2026-11-26): cada gesto (saludar, ganar, perder, especial)
// puede tomar el clip de un personaje del catálogo (originales, por saga) o uno genérico de la base de minifigura que
// entregó producción (piezas/minifig/base.glb). La elección vive en `extensiones.alv.animaciones.propias` y el plano la
// lleva al motor en `clipsExt`. Funciones puras.
import type { GenericasIndice } from "./genericas";
import { resolverClips, type Catalogo } from "./plano";
import type { Carga, FiguraV3, Id, Logica, Plano } from "./tipos";

export const GESTOS = ["saludo", "victoria", "derrota", "especial"] as const;
export type Gesto = (typeof GESTOS)[number];
export const NOMBRE_GESTO: Record<Gesto, string> = { saludo: "Saludar", victoria: "Ganar", derrota: "Perder", especial: "Especial" };

/** Clips genéricos que se ofrecen, con su nombre en español (los de caminar, correr y reposo no son gestos). */
export const NOMBRE_GEN: Record<string, string> = {
  WAVE: "Saludo con la mano", CHEER: "Porra", CLAP: "Aplausos", Shrug: "Ni modo", CELEBRATION1: "Festejo",
  JUMPANDLAND: "Salto", FIGHTCOMBO: "Combo de golpes", KNOCKEDDOWN: "Al suelo", Takehit1: "Golpe recibido",
  SCARED_IDLE: "Nervios", Fall: "Caída",
};

/** La base genérica de una familia: su GLB y los clips que declara piezas.json. */
export interface BaseGenerica { familia: Id; glb: string; clips: string[] }
export function baseGenerica(g: GenericasIndice): BaseGenerica | null {
  const b = (g.datos as { base?: { glb?: unknown; animaciones?: { mapa?: unknown; vida?: unknown }; juego?: { clips?: unknown } } } | null)?.base;
  if (!b || typeof b.glb !== "string" || !/^[a-z0-9][a-z0-9._-]{0,80}\.glb$/.test(b.glb)) return null;
  const nombres = [
    ...Object.values((b.animaciones?.mapa ?? {}) as Record<string, unknown>),
    ...(Array.isArray(b.animaciones?.vida) ? b.animaciones.vida : []),
    ...Object.values((b.juego?.clips ?? {}) as Record<string, unknown>),
  ].filter((x): x is string => typeof x === "string" && x in NOMBRE_GEN);
  return { familia: g.familia, glb: new URL(b.glb, g.base).href, clips: [...new Set(nombres)] };
}

export interface OpcionMov { id: string; nombre: string; sub: string; origen: "original" | "generica"; grupo: Id; foto: string | null }

const ID_ORIGINAL = /^p:([a-z0-9][a-z0-9-]{1,59}):(saludo|victoria|derrota|especial)$/;
const ID_GENERICO = /^g:([A-Za-z0-9_]{1,40})$/;

/** Opciones de un gesto. Originales: cada clip distinto de los personajes de la familia (primero los de ese gesto, luego
 *  los de los otros gestos), con la foto del primer personaje que lo usa. Genéricas: los clips de la base. */
export function opcionesMovimiento(catalogo: Catalogo, base: BaseGenerica | null, gesto: Gesto, familia: Id = "minifig"): OpcionMov[] {
  const fuera: OpcionMov[] = [], vistos = new Set<string>();
  const fichas = [...catalogo.values()].filter(e => e.ficha.familia === familia).sort((a, b) => a.ficha.nombre.localeCompare(b.ficha.nombre, "es"));
  for (const g of [gesto, ...GESTOS.filter(x => x !== gesto)]) {
    for (const { ficha: f, base: carpeta } of fichas) {
      const clip = resolverClips(f)[g];
      if (!clip || vistos.has(clip)) continue;
      vistos.add(clip);
      const foto = /\.(webp|png|jpg)$/i.test(f.fotos.busto) && !/no-hay/.test(f.fotos.busto) ? new URL(f.fotos.busto, carpeta).href : null;
      fuera.push({ id: `p:${f.id}:${g}`, nombre: f.nombre, sub: g === gesto ? NOMBRE_GESTO[g] : `${NOMBRE_GESTO[g]} (otro gesto)`, origen: "original", grupo: f.grupo, foto });
    }
  }
  if (base && base.familia === familia) for (const c of base.clips) fuera.push({ id: "g:" + c, nombre: NOMBRE_GEN[c]!, sub: "Genérico", origen: "generica", grupo: "todas", foto: null });
  return fuera;
}

/** Lo que la figura eligió para cada gesto (solo ids válidos). */
export function movimientosElegidos(f: FiguraV3): Partial<Record<Gesto, string>> {
  const p = f.extensiones.alv?.animaciones?.propias;
  const fuera: Partial<Record<Gesto, string>> = {};
  if (!p || typeof p !== "object") return fuera;
  for (const g of GESTOS) { const v = (p as Record<string, unknown>)[g]; if (typeof v === "string" && (ID_ORIGINAL.test(v) || ID_GENERICO.test(v))) fuera[g] = v; }
  return fuera;
}

/** Pone (o quita, con null) el movimiento de un gesto. Conserva lo demás de las extensiones. */
export function elegirMovimiento(f: FiguraV3, gesto: Gesto, id: string | null): FiguraV3 {
  const alv = f.extensiones.alv ?? {};
  const propias = { ...(alv.animaciones?.propias ?? {}) };
  if (id) propias[gesto] = id; else delete propias[gesto];
  return { ...f, extensiones: { ...f.extensiones, alv: { ...alv, animaciones: { ...(alv.animaciones ?? {}), propias } } } };
}

/** El plano con los gestos elegidos. Un original de otra familia, un personaje que no está o un clip que no existe se
 *  ignoran (queda el clip propio). */
export function conMovimientos(plano: Plano, f: FiguraV3, catalogo: Catalogo, base: BaseGenerica | null): Plano {
  const ext: Partial<Record<Logica, { glb: string; clip: string; carga?: Carga }>> = {};
  for (const [g, id] of Object.entries(movimientosElegidos(f)) as [Gesto, string][]) {
    const o = ID_ORIGINAL.exec(id);
    if (o) {
      const en = catalogo.get(o[1]!);
      const clip = en && en.ficha.familia === plano.familia ? resolverClips(en.ficha)[o[2] as Gesto] : undefined;
      if (en && clip) ext[g] = { glb: new URL(en.ficha.glb, en.base).href, clip, carga: { ...en.ficha.carga, metal: [...en.ficha.carga.metal] } };
      continue;
    }
    const gen = ID_GENERICO.exec(id);
    if (gen && base && base.familia === plano.familia && base.clips.includes(gen[1]!)) ext[g] = { glb: base.glb, clip: gen[1]! };
  }
  return Object.keys(ext).length ? { ...plano, clipsExt: ext } : plano;
}
