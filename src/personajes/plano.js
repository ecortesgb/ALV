// Resolver: figura v3 + catálogo → plano para el motor (§7 del formato). Aquí se decide todo; el motor solo dibuja.
import { familia } from "./familias";
import { PODERES } from "./poderes";
import { LOGICAS } from "./tipos";
/**
 * Cada lógica a un clip: el del personaje, si no el de su familia, si no el de su respaldo (siguiendo la cadena sin dar
 * vueltas). Solo se aceptan clips que el personaje declara en su ficha (mapa, vida o sentado) para no pedir uno que no está.
 */
export function resolverClips(ficha) {
    const fam = familia(ficha.familia);
    const respaldo = { ...(fam?.respaldo ?? {}), ...ficha.animaciones.respaldo };
    const propio = (l) => ficha.animaciones.mapa[l] ?? (l === "reposo" ? fam?.mapa.reposo : undefined);
    const fuera = {};
    for (const l of LOGICAS) {
        let actual = l;
        const vistos = new Set();
        while (actual && !vistos.has(actual)) {
            vistos.add(actual);
            const c = propio(actual);
            if (c) {
                fuera[l] = c;
                break;
            }
            actual = respaldo[actual];
        }
    }
    return fuera;
}
const unir = (base, rel) => new URL(rel, base).href;
/** El plano de una figura. null si su personaje no está en el catálogo cargado (la app usa entonces el personaje fijo). */
export function resolver(id, figura, catalogo) {
    if (figura.origen.tipo !== "catalogo")
        return null; // «creado» llega con el constructor básico (fase 6)
    const en = catalogo.get(figura.origen.personaje);
    const fam = familia(figura.familia);
    if (!en || !fam || en.ficha.familia !== figura.familia)
        return null;
    const f = en.ficha;
    return {
        id, familia: f.familia, rig: f.rig, glb: unir(en.base, f.glb), escala: fam.escala,
        huesos: { ...f.huesos }, clips: resolverClips(f), vida: [...f.animaciones.vida], sentado: f.animaciones.sentado,
        carga: { ...f.carga, metal: [...f.carga.metal] }, piezas: [],
        ...(() => { const p = poderesDeFicha(f, en.base); return p.length ? { poderes: p } : {}; })(),
    };
}
/** Los poderes que se ofrecen de un personaje: los de poderes.ts (en su orden) cuyo clip trae su ficha. */
export function poderesDeFicha(f, base) {
    const defs = PODERES[f.id], clips = f.poderes?.clips;
    if (!defs || !clips || !f.poderes)
        return [];
    const glb = unir(base, f.poderes.glb);
    return Object.entries(defs).filter(([k]) => clips[k]).map(([id, d]) => ({ id, nombre: d.nombre, glb, clip: clips[id], efectos: [d.efecto, ...(d.efectos ?? [])], ...(d.hasta ? { hasta: d.hasta } : {}), ...(d.bucle ? { bucle: d.bucle } : {}) }));
}
