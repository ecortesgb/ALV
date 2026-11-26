// Piezas genéricas del constructor (CONTRATO-ENTREGA.md §6): las entrega producción en `piezas/<familia>/piezas.json`
// y viajan dentro del índice privado. Aquí se validan y se pasan al formato del constructor, y se agrupan por tipo para
// el switch «Originales / Genéricas» del personalizador (pedido de Elías, 2026-11-26). Funciones puras.
import type { PiezaCons } from "./constructorDatos";
import { esId, esParte, type Carga, type Id, type Parte } from "./tipos";

/** Pieza tal como viene en piezas.json (solo lo que usa la app). */
interface PiezaEntrega {
  id: Id; parte: Parte; nombre: string; glb: string; foto: string; clase?: string;
  tintes: { material: string; paleta: string }[];
  inicial: Record<string, string>;
}
/** Lo que el índice trae de las genéricas de una familia: carpeta (ruta lógica) y el contenido de piezas.json. */
export interface GenericasIndice { familia: Id; base: string; datos: unknown }

const ARCHIVO = /^[a-z]+\/[a-z0-9][a-z0-9._-]{0,80}\.(glb|webp)$/;
const HEX = /^#[0-9a-f]{6}$/i;

/** Grupos por tipo, en el orden en que salen. Cada pieza va en uno; la que no esté anotada cae en «Otros». */
export const GRUPOS_GENERICAS: Partial<Record<Parte, { id: Id; nombre: string }[]>> = {
  cara: [
    { id: "normales", nombre: "Normales" }, { id: "mujer", nombre: "Con pestañas" }, { id: "marcas", nombre: "Con cicatrices" },
    { id: "enojados", nombre: "Enojados" }, { id: "mascaras", nombre: "Máscaras" },
  ],
  cabello: [
    { id: "corto", nombre: "Pelo corto" }, { id: "largo", nombre: "Pelo largo" }, { id: "gorras", nombre: "Gorras y gorros" },
    { id: "cascos", nombre: "Cascos y máscaras" },
  ],
  torso: [
    { id: "casual", nombre: "Casual" }, { id: "elegante", nombre: "Camisas y sacos" }, { id: "uniformes", nombre: "Uniformes" },
    { id: "heroe", nombre: "Trajes de héroe" },
  ],
  piernas: [{ id: "lisas", nombre: "Pantalones" }, { id: "botas", nombre: "Con botas o calcetas" }, { id: "heroe", nombre: "Trajes de héroe" }],
};
/** Anotadas a la vista con las miniaturas de la entrega del 2026-11-26 (hojas en el hilo del personalizador). */
const ETIQUETA: Record<Id, Id> = {
  "cara-civil-m01": "normales", "cara-base-03": "normales", "cara-base-09": "normales",
  "cara-civil-f01": "mujer", "cara-civil-f03": "mujer",
  "cara-base-02": "marcas", "cara-base-04": "marcas", "cara-base-07": "marcas",
  "cara-base-10": "enojados", "cara-base-01": "mascaras", "cara-base-08": "mascaras",
  "cabello-civil-m01": "corto", "cabello-civil-m04": "corto", "cabello-civil-m05": "corto", "cabello-civil-m06": "corto",
  "cabello-civil-m08": "corto", "cabello-civil-f08": "corto", "cabello-base-04": "corto", "cabello-base-09": "corto",
  "cabello-base-10": "corto", "cabello-alumno-a": "corto", "cabello-alumno-b": "corto", "cabello-alumno-c": "corto",
  "cabello-civil-f01": "largo", "cabello-civil-f02": "largo", "cabello-civil-f03": "largo", "cabello-civil-f04": "largo",
  "cabello-civil-f05": "largo", "cabello-civil-f06": "largo", "cabello-civil-f07": "largo", "cabello-reportera": "largo",
  "cabello-alumno-d": "largo", "cabello-alumno-e": "largo", "cabello-alumno-f": "largo",
  "cabello-civil-m02": "gorras", "cabello-civil-m03": "gorras", "cabello-base-05": "gorras", "cabello-policia": "gorras",
  "cabello-base-02": "cascos", "cabello-base-06": "cascos", "cabello-base-07": "cascos",
  "torso-civil-f02": "casual", "torso-civil-f03": "casual", "torso-civil-f04": "casual", "torso-civil-f05": "casual",
  "torso-civil-f07": "casual", "torso-civil-m01": "casual", "torso-civil-m02": "casual", "torso-civil-m03": "casual",
  "torso-civil-m06": "casual", "torso-civil-m07": "casual", "torso-base-04": "casual",
  "torso-civil-f01": "elegante", "torso-civil-f06": "elegante", "torso-civil-f08": "elegante", "torso-civil-m04": "elegante",
  "torso-civil-m05": "elegante", "torso-civil-m08": "elegante", "torso-base-03": "elegante", "torso-alumno-a": "elegante",
  "torso-alumno-b": "elegante", "torso-alumno-c": "elegante", "torso-alumno-d": "elegante",
  "torso-reportera": "uniformes", "torso-policia": "uniformes", "torso-base-05": "uniformes", "torso-base-10": "uniformes",
  "torso-base-01": "heroe", "torso-base-02": "heroe", "torso-base-06": "heroe", "torso-base-07": "heroe", "torso-base-08": "heroe",
  "torso-base-09": "heroe",
  "piernas-civil-f08": "botas", "piernas-base-07": "botas", "piernas-alumno-a": "botas", "piernas-alumno-c": "botas",
  "piernas-base-02": "heroe", "piernas-base-10": "heroe",
};
/** Grupo de una pieza genérica (el primero de su parte si no está anotada, o «otros» si la parte no tiene grupos). */
export function grupoGenerica(id: Id, parte: Parte): Id {
  const g = GRUPOS_GENERICAS[parte];
  if (!g) return "todas";
  const e = ETIQUETA[id];
  return e && g.some(x => x.id === e) ? e : parte === "piernas" ? "lisas" : g[0]!.id;
}

const esEntrega = (x: unknown): x is PiezaEntrega => {
  const p = x as PiezaEntrega | null;
  return !!p && typeof p === "object" && esId(p.id) && esParte(p.parte) && typeof p.nombre === "string" && p.nombre.length <= 60
    && typeof p.glb === "string" && ARCHIVO.test(p.glb) && typeof p.foto === "string" && ARCHIVO.test(p.foto)
    && Array.isArray(p.tintes) && p.tintes.every(t => t && /^[a-z0-9_]{1,20}$/.test(t.material) && /^(piel|pelo|ropa)$/.test(t.paleta))
    && !!p.inicial && typeof p.inicial === "object" && Object.values(p.inicial).every(v => typeof v === "string" && HEX.test(v));
};

/** Ranura (extras.slot) de cada parte; los cascos y gorras genéricos vienen como «cabello» con clase sombrero. */
const RANURA_GEN: Partial<Record<Parte, string>> = {
  cabeza: "head", cara: "face", cabello: "hair", torso: "torso", brazos: "arms", manos: "hands", cadera: "hips", piernas: "legs", accesorio: "accessory",
};

/** Piezas genéricas de una entrega, en el formato del constructor. Lo inválido se descarta (y se reporta). La `carga`
 *  (acabado del GLB) es la del personaje base: todas salen del mismo juego. */
export function piezasGenericas(g: GenericasIndice, carga: Carga | undefined): { piezas: Map<Id, PiezaCons>; errores: string[] } {
  const piezas = new Map<Id, PiezaCons>(), errores: string[] = [];
  const lista = (g.datos as { piezas?: unknown } | null)?.piezas;
  if (!Array.isArray(lista)) return { piezas, errores: ["piezas.json sin lista"] };
  for (const x of lista) {
    if (!esEntrega(x)) { errores.push(String((x as { id?: unknown })?.id)); continue; }
    const ranura = RANURA_GEN[x.parte];
    if (!ranura || piezas.has(x.id)) continue;
    // Gorras y cascos genéricos: su malla es «headgear» y tapan el pelo del base. Algunos torsos traen su cuello aparte.
    const ranuras = x.parte === "cabello" && x.clase === "sombrero" ? ["hair", "headgear"] : x.parte === "torso" ? ["torso", "neck"] : [ranura];
    piezas.set(x.id, {
      id: x.id, nombre: x.nombre, parte: x.parte, glb: new URL(x.glb, g.base).href, ranuras,
      foto: new URL(x.foto, g.base).href, donante: null, familia: g.familia,
      origen: "generica", grupo: grupoGenerica(x.id, x.parte),
      tintesDef: x.tintes.map(t => ({ material: t.material, paleta: t.paleta as "piel" | "pelo" | "ropa" })), inicial: { ...x.inicial },
      ...(carga ? { carga: { ...carga, metal: [...carga.metal] } } : {}),
    });
  }
  return { piezas, errores };
}
