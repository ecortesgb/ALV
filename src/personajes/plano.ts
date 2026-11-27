// Resolver: figura v3 + catálogo → plano para el motor (§7 del formato). Aquí se decide todo; el motor solo dibuja.
import { familia } from "./familias";
import { SETS, setsDe, sonidosDe } from "./sets";
import { PODERES, PRESTADOS, type Efecto, type PoderDef, type PoderPlano } from "./poderes";
import { LOGICAS, type Ficha, type FiguraV3, type Logica, type Plano } from "./tipos";

/** Personaje del catálogo ya cargado: su ficha y la URL de su carpeta (termina en «/»). */
export interface EnCatalogo { ficha: Ficha; base: string }
export type Catalogo = ReadonlyMap<string, EnCatalogo>;

/**
 * Cada lógica a un clip: el del personaje, si no el de su familia, si no el de su respaldo (siguiendo la cadena sin dar
 * vueltas). Solo se aceptan clips que el personaje declara en su ficha (mapa, vida o sentado) para no pedir uno que no está.
 */
export function resolverClips(ficha: Ficha): Partial<Record<Logica, string>> {
  const fam = familia(ficha.familia);
  const respaldo = { ...(fam?.respaldo ?? {}), ...ficha.animaciones.respaldo };
  const propio = (l: Logica) => ficha.animaciones.mapa[l] ?? (l === "reposo" ? fam?.mapa.reposo : undefined);
  const fuera: Partial<Record<Logica, string>> = {};
  for (const l of LOGICAS) {
    let actual: Logica | undefined = l;
    const vistos = new Set<Logica>();
    while (actual && !vistos.has(actual)) {
      vistos.add(actual);
      const c = propio(actual);
      if (c) { fuera[l] = c; break; }
      actual = respaldo[actual];
    }
  }
  return fuera;
}

const unir = (base: string, rel: string) => new URL(rel, base).href;

/** El plano de una figura. null si su personaje no está en el catálogo cargado (la app usa entonces el personaje fijo). */
export function resolver(id: string, figura: FiguraV3, catalogo: Catalogo): Plano | null {
  if (figura.origen.tipo !== "catalogo") return null; // «creado» llega con el constructor básico (fase 6)
  const en = catalogo.get(figura.origen.personaje);
  const fam = familia(figura.familia);
  if (!en || !fam || en.ficha.familia !== figura.familia) return null;
  const f = en.ficha;
  return {
    id, familia: f.familia, rig: f.rig, glb: unir(en.base, f.glb), escala: fam.escala,
    huesos: { ...f.huesos }, clips: resolverClips(f), vida: [...f.animaciones.vida], sentado: f.animaciones.sentado,
    carga: { ...f.carga, metal: [...f.carga.metal] }, piezas: [],
    ...(() => { const p = poderesDeFicha(f, en.base, catalogo); return p.length ? { poderes: p } : {}; })(),
    ...(() => { const m = movimientosDeFicha(f, catalogo); return m.length ? { movs: m } : {}; })(),
  };
}

/**
 * Los poderes que se ofrecen de un personaje: los de poderes.ts (en su orden) cuyo clip trae su ficha. Si no trae
 * ninguno y hay catálogo, los prestados (PRESTADOS) cuyo donante está cargado, es de su familia y trae ese clip.
 */
export function poderesDeFicha(f: Ficha, base: string, catalogo?: Catalogo | null): PoderPlano[] {
  const propios = propiosDe(f, base);
  return propios.length || !catalogo ? propios : prestadosDe(f, catalogo);
}

const plano = (id: string, d: PoderDef, glb: string, clip: string): PoderPlano =>
  ({ id, nombre: d.nombre, glb, clip, efectos: [d.efecto, ...(d.efectos ?? [])], ...(d.hasta ? { hasta: d.hasta } : {}), ...(d.bucle ? { bucle: d.bucle } : {}) });

function propiosDe(f: Ficha, base: string): PoderPlano[] {
  const defs = PODERES[f.id], clips = f.poderes?.clips;
  if (!defs || !clips || !f.poderes) return [];
  const glb = unir(base, f.poderes.glb);
  return Object.entries(defs).filter(([k]) => clips[k]).map(([id, d]) => plano(id, d, glb, clips[id]!));
}

function prestadosDe(f: Ficha, catalogo: Catalogo): PoderPlano[] {
  const fuera: PoderPlano[] = [];
  for (const [id, pr] of Object.entries(PRESTADOS[f.id] ?? {})) {
    const don = catalogo.get(pr.de), clip = don?.ficha.poderes?.clips[pr.poder];
    if (!don || !clip || !don.ficha.poderes || don.ficha.familia !== f.familia) continue;
    const orig = PODERES[pr.de]?.[pr.poder];
    const efecto = { ...orig?.efecto, ...pr.efecto } as Efecto;
    if (!efecto.tipo) continue;
    const nombre = pr.nombre ?? orig?.nombre;
    if (!nombre) continue;
    const hasta = pr.hasta ?? orig?.hasta, bucle = pr.bucle ?? orig?.bucle;
    fuera.push(plano(id, { nombre, efecto, efectos: pr.efectos ?? orig?.efectos, ...(hasta ? { hasta } : {}), ...(bucle ? { bucle } : {}) },
      unir(don.base, don.ficha.poderes.glb), clip));
  }
  return fuera;
}

/**
 * Movimientos de los sets compartidos del personaje (sets.ts), en orden: los de sus sets propios y al final los de «base».
 * Un set se ofrece solo si su anfitrión está en el catálogo, es de la misma familia y trae ese set en su ficha.
 * Id = «<set>-<movimiento>» (el mismo formato que un poder: viaja por la red igual).
 */
export function movimientosDeFicha(f: Ficha, catalogo: Catalogo): PoderPlano[] {
  const fuera: PoderPlano[] = [];
  for (const sid of setsDe(f.id)) {
    const def = SETS[sid], host = def && catalogo.get(def.anfitrion), s = host?.ficha.sets?.[sid];
    if (!def || !host || !s || host.ficha.familia !== f.familia) continue;
    const glb = unir(host.base, s.glb);
    for (const [mid, m] of Object.entries(def.movs)) {
      const clip = s.clips[mid];
      if (!clip) continue;
      const sonidos = sonidosDe(f.id, `${sid}-${mid}`);
      fuera.push({ id: `${sid}-${mid}`, nombre: m.nombre, glb, clip, efectos: [], ...(sonidos.length ? { sonidos } : {}) });
    }
  }
  return fuera;
}
