/** Un grupo con este número de elementos o menos se va a «Otros» de su saga («si hay más de 3»). */
export const MINIMO_GRUPO = 3;
/** Nombre del personaje sin la versión entre paréntesis: «Batman (Batman Returns)» → «Batman». */
export const nombreBase = (nombre) => nombre.replace(/\s*\([^)]*\)\s*$/, "").trim() || nombre;
export const esOtros = (grupo) => grupo === "otros" || grupo.startsWith("otros-");
export const otrosDe = (saga) => (saga ? "otros-" + saga : "otros");
/** Grupo con el que se muestra cada elemento: el suyo, o «Otros» de su saga si su grupo tiene MINIMO_GRUPO o menos. */
export function grupoMostrado(items, saga, grupo) {
    const cuenta = new Map();
    for (const x of items) {
        const k = saga(x) + "|" + grupo(x);
        cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
    }
    return x => {
        const g = grupo(x), s = saga(x);
        if (!g || esOtros(g))
            return g;
        return (cuenta.get(s + "|" + g) ?? 0) <= MINIMO_GRUPO ? otrosDe(s) : g;
    };
}
/** Junta las versiones de un mismo personaje. Devuelve un representante por nombre base (el que se llama igual, si
 *  existe; si no, el primero) con la lista de versiones, en el orden de entrada. */
export function juntarVersiones(items, nombre) {
    const por = new Map();
    for (const x of items) {
        const b = nombreBase(nombre(x));
        por.set(b, [...(por.get(b) ?? []), x]);
    }
    return [...por.entries()].map(([base, versiones]) => ({ base, versiones, rep: versiones.find(v => nombre(v) === base) ?? versiones[0] }));
}
