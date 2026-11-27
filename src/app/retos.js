// Lo que una figura lleva puesto (ids y colores) y si cumple un reto. Debe dar lo mismo que privado.ids_de_figura,
// privado.colores_de_figura y privado.cumple_reto de la migración 033 (el servidor es quien da el premio).
import { rarezaDe } from "../content/rarezas";
const esObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
/** Todas las piezas: ids de cualquier nivel, rostro, estampado, detalles y el paquete de momentos (MOM_x). */
export function idsDe(f) {
    const ids = new Set();
    const recorrer = (v) => {
        if (Array.isArray(v))
            v.forEach(recorrer);
        else if (esObj(v))
            for (const [k, x] of Object.entries(v)) {
                if (k === "id" && typeof x === "string")
                    ids.add(x);
                else
                    recorrer(x);
            }
    };
    if (!f)
        return ids;
    recorrer(f);
    const g = f, I = (g.identidad ?? {}), T = (g.ropa ?? {}).torso, M = (g.momentos ?? {});
    if (typeof I.rostro === "string")
        ids.add(I.rostro);
    if (T && typeof T.estampado === "string")
        ids.add(T.estampado);
    if (Array.isArray(I.detalles))
        I.detalles.forEach(d => typeof d === "string" && ids.add(d));
    if (typeof M.paquete === "string")
        ids.add("MOM_" + M.paquete);
    return ids;
}
/** Todos los colores: claves «color», colores del torso, piel, brazos, guantes y botas. En minúsculas. */
export function coloresDe(f) {
    const c = new Set();
    const add = (v) => { if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v))
        c.add(v.toLowerCase()); };
    const recorrer = (v) => {
        if (Array.isArray(v))
            v.forEach(recorrer);
        else if (esObj(v))
            for (const [k, x] of Object.entries(v)) {
                if (k === "color")
                    add(x);
                else
                    recorrer(x);
            }
    };
    if (!f)
        return c;
    recorrer(f);
    const g = f, I = (g.identidad ?? {}), R = (g.ropa ?? {}), T = (R.torso ?? {}), P = (R.piernas ?? {});
    add(I.piel);
    add(R.brazos);
    add(R.guantes);
    add(P.botas);
    if (Array.isArray(T.colores))
        T.colores.forEach(add);
    return c;
}
const en = (lista, v) => typeof v === "string" && lista.some(x => x.toLowerCase() === v.toLowerCase());
/** ¿La figura cumple la condición? Cada clave presente debe cumplirse. */
export function cumple(f, c) {
    if (!f)
        return false;
    const ids = idsDe(f), col = coloresDe(f);
    const R = (f.ropa ?? {}), A = (f.accesorios ?? {});
    if (c.todas && !c.todas.every(id => ids.has(id)))
        return false;
    if (c.alguna && !c.alguna.every(g => g.some(id => ids.has(id))))
        return false;
    if (c.colores && !c.colores.every(g => g.some(x => col.has(x.toLowerCase()))))
        return false;
    if (c.torso && !en(c.torso, (R.torso ?? {}).color))
        return false;
    if (c.piernas && !en(c.piernas, (R.piernas ?? {}).color))
        return false;
    if (c.dosObjetos && !(esObj(A.mano_der) && esObj(A.mano_izq)))
        return false;
    return true;
}
/** Piezas no comunes que la figura lleva y el jugador no tiene. */
export const bloqueadasEn = (f, tengo) => [...idsDe(f)].filter(id => rarezaDe(id) !== "comun" && !tengo.has(id));
