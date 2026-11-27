// «Completa el look» y «colores que combinan»: sugerencias a partir de lo que la figura ya lleva.
// Las piezas traen etiquetas de estilo (tools/miniaturas/index.html → catalogo-figura.json); no hay datos de otros jugadores.
import { alternarDetalle, capaDe, cuelloDe, ponerCapa, ponerCascoSolo, ponerCuello, ponerMascaraCompleta, ponerObjeto, ponerTorsoCompleto, } from "../app/editarFigura";
import catalogo from "../content/catalogo-figura.json";
const SECCIONES = ["torso", "casco", "mascara", "cuello", "capa", "objeto", "detalle"];
const NOMBRE_SECCION = { casco: "Casco", mascara: "Máscara", cuello: "Cuello", capa: "Capa", torso: "Torso", objeto: "Objeto", detalle: "Cara" };
const lista = (s) => catalogo.secciones[s] ?? [];
/** Lo que la figura lleva puesto, por sección (ids del catálogo). */
export function puestas(f) {
    return {
        casco: f.accesorios.cabeza ? [f.accesorios.cabeza.id] : [],
        mascara: f.accesorios.cara ? [f.accesorios.cara.id] : [],
        cuello: cuelloDe(f) ? [cuelloDe(f).id] : [],
        capa: capaDe(f) ? [capaDe(f).id] : [],
        torso: f.ropa.torso.estampado ? [f.ropa.torso.estampado] : [],
        objeto: [f.accesorios.mano_der?.id, f.accesorios.mano_izq?.id].filter(Boolean),
        detalle: f.identidad.detalles.slice(),
    };
}
/** Estilos de la figura, del más fuerte al más débil (cuántas piezas puestas tienen esa etiqueta). */
export function estilosDe(f) {
    const cuenta = new Map(), p = puestas(f);
    for (const s of SECCIONES)
        for (const id of p[s])
            for (const t of lista(s).find(x => x.id === id)?.tags ?? [])
                cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
    return [...cuenta].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}
/** Hasta `n` piezas de otras secciones que combinan con el estilo de la figura (no las que ya lleva). */
export function sugerencias(f, excluir = [], n = 4) {
    const estilos = estilosDe(f).slice(0, 2);
    if (!estilos.length)
        return [];
    const p = puestas(f), salida = [];
    for (const s of SECCIONES) {
        if (excluir.includes(s) || p[s].length && s !== "detalle" && s !== "objeto")
            continue; // sección ya cubierta
        for (const it of lista(s)) {
            if (!it.id || !it.tags || p[s].includes(it.id))
                continue;
            const comun = it.tags.filter(t => estilos.includes(t));
            if (comun.length)
                salida.push({ seccion: s, item: it, etiqueta: NOMBRE_SECCION[s], puntos: comun.length * 10 - SECCIONES.indexOf(s) });
        }
    }
    // Una por sección, las de más puntos primero.
    const vistas = new Set();
    return salida.sort((a, b) => b.puntos - a.puntos).filter(x => (vistas.has(x.seccion) ? false : (vistas.add(x.seccion), true))).slice(0, n);
}
/** Ordena una cuadrícula: primero «nada», luego las piezas del estilo de la figura, luego el resto. */
export function ordenarPorEstilo(items, estilos) {
    if (!estilos.length)
        return items;
    const top = estilos.slice(0, 2), peso = (x) => (!x.id ? -1 : x.tags?.some(t => top.includes(t)) ? 0 : 1);
    return items.map((x, i) => [x, i]).sort((a, b) => peso(a[0]) - peso(b[0]) || a[1] - b[1]).map(([x]) => x);
}
export const ocupaDetalle = (id) => lista("detalle").find(x => x.id === id)?.ocupa ?? null;
/** Pone una sugerencia en la figura (misma regla que su página). */
export function aplicar(f, s) {
    const { id, color, original } = s.item;
    switch (s.seccion) {
        case "casco": return ponerCascoSolo(f, id, color ?? "#6c6e68");
        case "mascara": return ponerMascaraCompleta(f, id, color ?? "#c91a09");
        case "cuello": return ponerCuello(f, id ? { id, color: "#6c6e68" } : null);
        case "capa": return ponerCapa(f, id ? { id, color: "#c91a09" } : null);
        case "torso": return ponerTorsoCompleto(f, id, original);
        case "objeto": return ponerObjeto(f, f.accesorios.mano_der ? "mano_izq" : "mano_der", id ? { id, color: color ?? "#a0a5a9" } : null);
        case "detalle": return f.identidad.detalles.includes(id) ? f : alternarDetalle(f, id, ocupaDetalle);
    }
}
// ---------- Colores que combinan ----------
function hsl(hex) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (!d)
        return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
}
const distanciaTono = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
/**
 * Hasta 4 colores de `paleta` que combinan con `base` (torso y piernas): un neutro que contraste, uno parecido (análogo)
 * y el opuesto (complementario). Sirve de guía; todos los colores se pueden elegir.
 */
export function combinan(base, paleta) {
    const b = base.filter(Boolean).map(hsl);
    if (!b.length)
        return [];
    const [h0, s0, l0] = b[0];
    const enBase = (c) => base.some(x => x.toLowerCase() === c.toLowerCase());
    const cand = paleta.filter(c => !enBase(c)).map(c => ({ c, v: hsl(c) }));
    const elegir = (puntos) => cand.map(x => ({ ...x, p: puntos(x.v) })).sort((a, b) => a.p - b.p)[0]?.c;
    const neutro = elegir(([, s, l]) => s * 3 + (Math.abs(l - l0) > 0.45 ? 0 : 1) - Math.abs(l - l0));
    const opuesto = s0 > 0.15 ? elegir(([h, s]) => Math.abs(distanciaTono(h, (h0 + 180) % 360) - 0) / 60 + (s < 0.3 ? 2 : 0)) : undefined;
    const parecido = s0 > 0.15 ? elegir(([h, s, l]) => (distanciaTono(h, h0) < 8 ? 3 : distanciaTono(h, h0) / 30) + (s < 0.3 ? 2 : 0) + Math.abs(l - l0)) : undefined;
    const segundo = b[1] ? elegir(([h, s, l]) => distanciaTono(h, b[1][0]) / 40 + Math.abs(s - b[1][1]) + Math.abs(l - b[1][2]) * 2) : undefined;
    return [...new Set([neutro, parecido, opuesto, segundo].filter(Boolean))].slice(0, 4);
}
