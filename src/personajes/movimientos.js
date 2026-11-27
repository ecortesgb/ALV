import { resolverClips } from "./plano";
export const GESTOS = ["saludo", "victoria", "derrota", "especial"];
export const NOMBRE_GESTO = { saludo: "Saludar", victoria: "Ganar", derrota: "Perder", especial: "Especial" };
/** Clips genéricos que se ofrecen, con su nombre en español (los de caminar, correr y reposo no son gestos). */
export const NOMBRE_GEN = {
    WAVE: "Saludo con la mano", CHEER: "Porra", CLAP: "Aplausos", Shrug: "Ni modo", CELEBRATION1: "Festejo",
    JUMPANDLAND: "Salto", FIGHTCOMBO: "Combo de golpes", KNOCKEDDOWN: "Al suelo", Takehit1: "Golpe recibido",
    SCARED_IDLE: "Nervios", Fall: "Caída",
};
export function baseGenerica(g) {
    const b = g.datos?.base;
    if (!b || typeof b.glb !== "string" || !/^[a-z0-9][a-z0-9._-]{0,80}\.glb$/.test(b.glb))
        return null;
    const nombres = [
        ...Object.values((b.animaciones?.mapa ?? {})),
        ...(Array.isArray(b.animaciones?.vida) ? b.animaciones.vida : []),
        ...Object.values((b.juego?.clips ?? {})),
    ].filter((x) => typeof x === "string" && x in NOMBRE_GEN);
    return { familia: g.familia, glb: new URL(b.glb, g.base).href, clips: [...new Set(nombres)] };
}
const ID_ORIGINAL = /^p:([a-z0-9][a-z0-9-]{1,59}):(saludo|victoria|derrota|especial)$/;
const ID_GENERICO = /^g:([A-Za-z0-9_]{1,40})$/;
/** Opciones de un gesto. Originales: cada clip distinto de los personajes de la familia (primero los de ese gesto, luego
 *  los de los otros gestos), con la foto del primer personaje que lo usa. Genéricas: los clips de la base. */
export function opcionesMovimiento(catalogo, base, gesto, familia = "minifig") {
    const fuera = [], vistos = new Set();
    const fichas = [...catalogo.values()].filter(e => e.ficha.familia === familia).sort((a, b) => a.ficha.nombre.localeCompare(b.ficha.nombre, "es"));
    for (const g of [gesto, ...GESTOS.filter(x => x !== gesto)]) {
        for (const { ficha: f, base: carpeta } of fichas) {
            const clip = resolverClips(f)[g];
            if (!clip || vistos.has(clip))
                continue;
            vistos.add(clip);
            const foto = /\.(webp|png|jpg)$/i.test(f.fotos.busto) && !/no-hay/.test(f.fotos.busto) ? new URL(f.fotos.busto, carpeta).href : null;
            fuera.push({ id: `p:${f.id}:${g}`, nombre: f.nombre, sub: g === gesto ? NOMBRE_GESTO[g] : `${NOMBRE_GESTO[g]} (otro gesto)`, origen: "original", grupo: f.grupo, foto });
        }
    }
    if (base && base.familia === familia)
        for (const c of base.clips)
            fuera.push({ id: "g:" + c, nombre: NOMBRE_GEN[c], sub: "Genérico", origen: "generica", grupo: "todas", foto: null });
    return fuera;
}
/** Lo que la figura eligió para cada gesto (solo ids válidos). */
export function movimientosElegidos(f) {
    const p = f.extensiones.alv?.animaciones?.propias;
    const fuera = {};
    if (!p || typeof p !== "object")
        return fuera;
    for (const g of GESTOS) {
        const v = p[g];
        if (typeof v === "string" && (ID_ORIGINAL.test(v) || ID_GENERICO.test(v)))
            fuera[g] = v;
    }
    return fuera;
}
/** Pone (o quita, con null) el movimiento de un gesto. Conserva lo demás de las extensiones. */
export function elegirMovimiento(f, gesto, id) {
    const alv = f.extensiones.alv ?? {};
    const propias = { ...(alv.animaciones?.propias ?? {}) };
    if (id)
        propias[gesto] = id;
    else
        delete propias[gesto];
    return { ...f, extensiones: { ...f.extensiones, alv: { ...alv, animaciones: { ...(alv.animaciones ?? {}), propias } } } };
}
/** El plano con los gestos elegidos. Un original de otra familia, un personaje que no está o un clip que no existe se
 *  ignoran (queda el clip propio). */
export function conMovimientos(plano, f, catalogo, base) {
    const ext = {};
    for (const [g, id] of Object.entries(movimientosElegidos(f))) {
        const o = ID_ORIGINAL.exec(id);
        if (o) {
            const en = catalogo.get(o[1]);
            const clip = en && en.ficha.familia === plano.familia ? resolverClips(en.ficha)[o[2]] : undefined;
            if (en && clip)
                ext[g] = { glb: new URL(en.ficha.glb, en.base).href, clip, carga: { ...en.ficha.carga, metal: [...en.ficha.carga.metal] } };
            continue;
        }
        const gen = ID_GENERICO.exec(id);
        if (gen && base && base.familia === plano.familia && base.clips.includes(gen[1]))
            ext[g] = { glb: base.glb, clip: gen[1] };
    }
    return Object.keys(ext).length ? { ...plano, clipsExt: ext } : plano;
}
