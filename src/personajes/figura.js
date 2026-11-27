// Figura del jugador v3 (§5 del formato): crearla desde el catálogo y validar la que llega de fuera.
import { familia } from "./familias";
import { esId, esParte } from "./tipos";
const MOMENTOS_BASE = { paquete: null, espera: "respirar", victoria: "salto-puno", derrota: "cabeza-baja", punto: "puno-arriba" };
// Tope de la figura v3: 8192 caracteres de JSON compacto (unidades UTF-16 de JS). La base (046, si se aplica) limita
// 8192 BYTES del jsonb guardado (pg_column_size): con acentos o muchos campos pueden no coincidir cerca del límite; si la
// base la rechaza, el guardado se queda pendiente en el aparato. Las figuras reales pesan menos de 1 KB.
const TOPE_JSON_CARACTERES = 8192;
/** Figura nueva a partir de un personaje del catálogo, sin tocar el estilo de movimiento que ya tenía el jugador. */
export function deCatalogo(ficha, antes, version = "base") {
    return {
        version: 3,
        familia: ficha.familia,
        origen: { tipo: "catalogo", personaje: ficha.id, version, revision: 1 },
        piezas: {},
        momentos: antes?.momentos ?? { ...MOMENTOS_BASE },
        extensiones: antes?.extensiones ?? {},
    };
}
const esPuesta = (x) => {
    const p = x;
    if (!p || typeof p !== "object" || !esId(p.id))
        return false;
    if (p.var !== undefined && !esId(p.var))
        return false;
    if (p.tintes !== undefined && (typeof p.tintes !== "object" || !Object.entries(p.tintes).every(([k, v]) => /^[a-z_]{1,20}$/.test(k) && esId(v))))
        return false;
    return true;
};
/** Valida una figura que llega del aparato, de la nube o de otro jugador. null si no es una v3 válida. */
export function leerFigura(x) {
    if (!x || typeof x !== "object")
        return null;
    let s;
    try {
        s = JSON.stringify(x);
    }
    catch {
        return null;
    }
    if (s.length > TOPE_JSON_CARACTERES)
        return null;
    const f = x;
    if (f.version !== 3 || !esId(f.familia) || !familia(f.familia))
        return null;
    const o = f.origen;
    if (!o || (o.tipo !== "creado" && !(o.tipo === "catalogo" && esId(o.personaje) && esId(o.version) && Number.isInteger(o.revision))))
        return null;
    const piezas = f.piezas;
    if (!piezas || typeof piezas !== "object" || Array.isArray(piezas))
        return null;
    if (!Object.entries(piezas).every(([k, v]) => esParte(k) && esPuesta(v)))
        return null;
    const m = f.momentos;
    const momentos = m && typeof m === "object" && ["espera", "victoria", "derrota", "punto"].every(k => typeof m[k] === "string" && m[k].length <= 40)
        && (m.paquete === null || (typeof m.paquete === "string" && m.paquete.length <= 40))
        ? m : { ...MOMENTOS_BASE };
    const ext = f.extensiones && typeof f.extensiones === "object" && !Array.isArray(f.extensiones) ? f.extensiones : {};
    return { version: 3, familia: f.familia, origen: o, piezas: piezas, momentos, extensiones: ext };
}
/** Apodo de la figura (mismo límite que hoy: 24 caracteres, sin saltos). */
export function apodo(f) {
    const a = f?.extensiones.alv?.apodo;
    if (typeof a !== "string")
        return null;
    const t = a.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24);
    return t || null;
}
