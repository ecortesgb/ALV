// Constructor básico (ALV_PLAN_PERSONAJES_RAPIDO.md, R5): piezas por ranura sobre el esqueleto común de minifigura.
// Mientras producción entrega las piezas genéricas (CONTRATO-ENTREGA.md §6), las piezas salen de los personajes del
// catálogo: cada ranura de cada personaje (su cabeza, su torso, su pelo…) es una pieza. Funciones puras.
import { deCatalogo } from "./figura";
import { resolver } from "./plano";
import { CABEZAS_CON_CARA, DONANTES_FUERA } from "./cabezas";
/** Ranura del GLB (extras.slot) que cambia cada parte. */
export const RANURA = {
    cabeza: "head", cara: "face", cabello: "hair", sombrero: "headgear", torso: "torso", brazos: "arms", manos: "hands",
    cadera: "hips", piernas: "legs", accesorio: "accessory",
};
/** Partes que se pueden dejar vacías («Sin pelo», «Sin casco»). */
export const OPCIONALES = ["cabello", "sombrero", "accesorio"];
/** Partes que se estorban: poner una quita la otra (pelo y casco ocupan el cráneo). */
const ESTORBA = { cabello: "sombrero", sombrero: "cabello" };
export const PALETAS = {
    piel: [
        { id: "amarilla", nombre: "Amarilla", hex: "#f2cd37" }, { id: "clara", nombre: "Clara", hex: "#f6d7b3" },
        { id: "blanca", nombre: "Blanca", hex: "#fbe7d6" }, { id: "morena", nombre: "Morena", hex: "#aa7d55" },
        { id: "oscura", nombre: "Oscura", hex: "#5c3a21" },
    ],
    pelo: [
        { id: "rubio", nombre: "Rubio", hex: "#e4b54a" }, { id: "castano", nombre: "Castaño", hex: "#6b3d1e" },
        { id: "negro", nombre: "Negro", hex: "#1b1b1f" }, { id: "rojo", nombre: "Rojo", hex: "#b4321c" }, { id: "rosa", nombre: "Rosa", hex: "#f06fae" },
    ],
    ropa: [
        { id: "rojo", nombre: "Rojo", hex: "#c91a09" }, { id: "azul", nombre: "Azul", hex: "#0055bf" }, { id: "verde", nombre: "Verde", hex: "#237841" },
        { id: "negro", nombre: "Negro", hex: "#1b2a34" }, { id: "blanco", nombre: "Blanco", hex: "#f4f4f4" }, { id: "gris", nombre: "Gris", hex: "#a0a5a9" },
        { id: "mezclilla", nombre: "Mezclilla", hex: "#4a6fa5" },
    ],
};
/** Qué paleta tiñe cada parte cuando la pieza es lisa (las del catálogo se tiñen enteras). */
export const PALETA_DE_PARTE = { cabeza: "piel", manos: "piel", cabello: "pelo" };
const sinId = (p) => "sin-" + p;
/** Personaje con el que arranca «Crear mi personaje» si no hay piezas genéricas: un civil liso. */
export const BASE_CREAR = "peter-parker";
/** Piezas sacadas del catálogo: una por cada parte que el personaje trae (según `ranuras` del índice). */
export function piezasDeCatalogo(catalogo, ranuras) {
    const fuera = new Map();
    for (const p of [...OPCIONALES, "cara"])
        fuera.set(sinId(p), { id: sinId(p), nombre: "Sin " + p, parte: p, glb: "", ranuras: [RANURA[p]], foto: null, donante: null, familia: null, origen: "ninguna", grupo: "" });
    for (const { ficha: f, base } of catalogo.values()) {
        if (f.familia !== "minifig")
            continue;
        const tiene = new Set(ranuras.get(f.id) ?? []);
        const glb = new URL(f.glb, base).href;
        const foto = /\.(webp|png|jpg)$/i.test(f.fotos.busto) && !/no-hay/.test(f.fotos.busto) ? new URL(f.fotos.busto, base).href : null;
        for (const [parte, ranura] of Object.entries(RANURA)) {
            if (!tiene.has(ranura))
                continue;
            // Torso y cabeza LDraw todavía no arman sobre otra figura (el motor no los pinta): fuera hasta revisarlos.
            if ((parte === "torso" || parte === "cabeza") && f.origen.fuente === "ldraw")
                continue;
            const id = `${f.id}--${parte}`;
            fuera.set(id, { id, nombre: f.nombre, parte, glb, ranuras: [ranura], foto: parte === "cabeza" || parte === "cara" || parte === "cabello" || parte === "sombrero" ? foto
                    : (/\.(webp|png|jpg)$/i.test(f.fotos.tarjeta) && !/no-hay/.test(f.fotos.tarjeta) ? new URL(f.fotos.tarjeta, base).href : null), donante: f.id, familia: f.familia, origen: "original", grupo: f.grupo });
        }
    }
    return fuera;
}
/** ¿La pieza sirve a esa familia? («Sin …» sirve a todas.) */
export const deFamilia = (pz, familia) => pz.familia === null || pz.familia === familia;
/** Solo se personaliza una familia que tiene piezas (hoy solo minifigura; Hulk y los grandes no). */
export const sePuedePersonalizar = (piezas, familia) => [...piezas.values()].some(p => p.familia === familia);
/** Piezas que no se ofrecen en el constructor, revisadas a la vista una por una (Codex, encargo
 *  2026-11-25-constructor-diseno-r3, D2 B: lista explícita, no medición por píxel). Hoja: capturas-personalizador/r3-caras-todas.png. */
export const PIEZAS_FUERA = new Map([
    ["loki--cara", "la cara sola sale con un recuadro blanco encima"],
]);
/** Piezas de una parte para esa familia, ordenadas por nombre, con «Sin …» primero si la parte es opcional. */
export function piezasDe(piezas, parte, familia = "minifig") {
    const l = [...piezas.values()].filter(p => p.parte === parte && deFamilia(p, familia) && !PIEZAS_FUERA.has(p.id) && !(p.donante && DONANTES_FUERA.has(p.donante))
        && !(parte === "cara" && p.origen === "ninguna")); // «Sin cara» solo lo pone una máscara, no se elige
    return l.sort((a, b) => (a.donante ? 1 : 0) - (b.donante ? 1 : 0) || a.nombre.localeCompare(b.nombre, "es"));
}
/** ¿Es una cabeza con la cara o una máscara impresa? (van en «Máscaras», no en Piel). */
export const esMascara = (pz) => !!pz && pz.parte === "cabeza" && !!pz.donante && CABEZAS_CON_CARA.has(pz.donante);
/** Cara de un personaje con máscara: se elige desde «Máscaras», no se repite en «Cara» (Elías, 2026-11-27). */
export const caraDeMascara = (pz) => !!pz && pz.parte === "cara" && !!pz.donante && CABEZAS_CON_CARA.has(pz.donante);
/** Piel: una cabeza lisa del color elegido (Elías, 2026-11-27: «en piel solo debe salir la cabeza y elegir el color»).
 *  Si la cabeza puesta es lisa se tiñe esa; si es una máscara, se cambia por la lisa del civil base, y la cara vuelve. */
export function ponerPiel(f, color, todas) {
    const base = f.origen.tipo === "catalogo" ? f.origen.personaje : BASE_CREAR;
    const piezas = { ...f.piezas };
    let id = piezas.cabeza?.id ?? `${base}--cabeza`;
    const pz = todas.get(id);
    if (!pz || esMascara(pz)) {
        id = `${BASE_CREAR}--cabeza`;
        // Lo que trajo la máscara se va con ella (su casco y su pelo); vuelve lo del personaje base.
        if (pz?.donante)
            for (const p of ["cabello", "sombrero"]) {
                const v = piezas[p]?.id;
                if (v === `${pz.donante}--${p}` || v === sinId(p))
                    delete piezas[p];
            }
    }
    if (color)
        piezas.cabeza = { id, tintes: { piel: color } };
    else if (id === `${base}--cabeza`)
        delete piezas.cabeza;
    else
        piezas.cabeza = { id };
    const cara = piezas.cara?.id;
    if (cara === sinId("cara") || (!cara && !todas.has(`${base}--cara`)))
        piezas.cara = { id: `${BASE_CREAR}--cara` };
    return { ...f, piezas };
}
/** Figura de partida de «Crear mi personaje»: el civil base tal cual, sin piezas cambiadas. */
export function figuraInicial(catalogo, antes) {
    const en = catalogo.get(BASE_CREAR) ?? [...catalogo.values()].find(x => x.ficha.familia === "minifig");
    if (!en)
        return null;
    return { ...deCatalogo(en.ficha, antes), origen: { tipo: "catalogo", personaje: en.ficha.id, version: "base", revision: 1 } };
}
/** Pone una pieza (o «Sin …»), quitando la que estorba; conserva los tintes de esa parte.
 *  Una cara original llega con la piel de su personaje (Elías, 2026-11-27: las caras se enciman en cabezas con la cara
 *  impresa, como Cíclope), salvo que la piel elegida sea genérica: esa se respeta. */
export function ponerPieza(f, pz, todas) {
    if (!deFamilia(pz, f.familia))
        return f; // otra familia: no se pone
    const piezas = { ...f.piezas };
    const antes = piezas[pz.parte];
    piezas[pz.parte] = antes?.tintes && pz.origen !== "original" ? { id: pz.id, tintes: { ...antes.tintes } } : { id: pz.id };
    const otra = ESTORBA[pz.parte];
    if (otra && pz.glb)
        piezas[otra] = { id: sinId(otra) };
    // Una máscara se pone completa, como la trae su personaje (Elías, 2026-11-27: «al elegir una máscara sale sin ojos, debe
    // salir completa»): su cara, su pelo y su casco, o «Sin …» si no los trae. Capitán América, por ejemplo, trae los ojos
    // en la ranura del casco.
    if (esMascara(pz) && todas)
        for (const p of ["cara", "cabello", "sombrero"]) {
            const suya = `${pz.donante}--${p}`;
            piezas[p] = { id: todas.has(suya) ? suya : sinId(p) };
        }
    if (pz.parte === "cara" && pz.origen === "original" && pz.donante && todas) {
        const piel = piezas.cabeza, generica = piel && todas.get(piel.id)?.origen === "generica";
        const base = f.origen.tipo === "catalogo" ? f.origen.personaje : BASE_CREAR;
        if (!generica) {
            if (pz.donante === base)
                delete piezas.cabeza;
            else if (todas.has(`${pz.donante}--cabeza`))
                piezas.cabeza = { id: `${pz.donante}--cabeza` };
        }
    }
    return { ...f, piezas };
}
/** Tiñe una parte. Si la parte no tiene pieza elegida, toma la del propio personaje base. */
export function teñir(f, parte, paleta, color) {
    const base = f.origen.tipo === "catalogo" ? f.origen.personaje : BASE_CREAR;
    const actual = f.piezas[parte] ?? { id: `${base}--${parte}` };
    return { ...f, piezas: { ...f.piezas, [parte]: { ...actual, tintes: { ...(actual.tintes ?? {}), [paleta]: color } } } };
}
/** Quita el color elegido y deja la pieza con su color de fábrica (Elías, 2026-11-26: «luego ya no puedes volver a ese
 *  color»). Si la parte era la del propio personaje y ya no le queda ningún tinte, deja de contar como cambiada. */
export function quitarTinte(f, parte, paleta) {
    const actual = f.piezas[parte];
    if (!actual?.tintes || !(paleta in actual.tintes))
        return f;
    const { [paleta]: _fuera, ...resto } = actual.tintes;
    void _fuera;
    const base = f.origen.tipo === "catalogo" ? f.origen.personaje : BASE_CREAR;
    const piezas = { ...f.piezas };
    if (!Object.keys(resto).length && actual.id === `${base}--${parte}`)
        delete piezas[parte];
    else
        piezas[parte] = { ...actual, tintes: resto };
    return { ...f, piezas };
}
/** El plano del personaje base con las piezas cambiadas y sus tintes. */
export function planoConstructor(id, f, catalogo, piezas) {
    const base = resolver(id, { ...f, piezas: {} }, catalogo);
    if (!base)
        return null;
    const fuera = [];
    for (const [parte, puesta] of Object.entries(f.piezas)) {
        const pz = piezas.get(puesta.id);
        if (!pz || pz.parte !== parte || !deFamilia(pz, f.familia))
            continue;
        const tintes = tintesPlano(pz, puesta.tintes);
        const carga = pz.carga ?? (pz.donante ? catalogo.get(pz.donante)?.ficha.carga : undefined);
        fuera.push(carga ? { glb: pz.glb, ranuras: [...pz.ranuras], tintes, carga: { ...carga, metal: [...carga.metal] } } : { glb: pz.glb, ranuras: [...pz.ranuras], tintes });
    }
    return { ...base, piezas: fuera };
}
/** Tintes para el motor. Originales: el color elegido tiñe toda la pieza («*»). Genéricas: cada material con tinte toma
 *  el color elegido de su paleta o, si no hay, su color de fábrica. */
export function tintesPlano(pz, elegidos) {
    const hexDe = (paleta, color) => (color ? PALETAS[paleta]?.find(x => x.id === color)?.hex : undefined);
    if (pz.tintesDef)
        return pz.tintesDef.flatMap(t => { const hex = hexDe(t.paleta, elegidos?.[t.paleta]) ?? pz.inicial?.[t.paleta]; return hex ? [{ material: t.material, hex }] : []; });
    return Object.entries(elegidos ?? {}).flatMap(([paleta, color]) => { const hex = hexDe(paleta, color); return hex ? [{ material: "*", hex }] : []; });
}
/** Paleta que se ofrece al elegir una pieza: la de la genérica, o la de la parte (piel, pelo) en las originales. */
export const paletaDePieza = (pz, parte) => pz?.tintesDef ? pz.tintesDef[0]?.paleta : PALETA_DE_PARTE[parte];
/** Piezas de la figura que no se pueden resolver (no están en el registro, son de otra parte o de otra familia).
 *  Para avisar en vez de perderlas en silencio (Codex O4). */
export function referenciasAusentes(f, piezas) {
    return Object.entries(f.piezas).filter(([parte, p]) => { const pz = piezas.get(p.id); return !pz || pz.parte !== parte || !deFamilia(pz, f.familia); }).map(([, p]) => p.id);
}
