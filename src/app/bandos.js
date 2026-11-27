/**
 * ALVersus: mujer → Ellas, hombre → Ellos. Quien eligió «Prefiero no decirlo» (se guarda como «otro») o no tiene
 * género va al bando con menos gente; si están parejos, al azar. Lo que el anfitrión ya acomodó se respeta.
 */
export function bandosIniciales(ids, generos, actuales = {}, azar = Math.random) {
    const r = {};
    const sinBando = [];
    for (const id of ids) {
        const a = actuales[id];
        if (a === "ellas" || a === "ellos")
            r[id] = a;
        else if (generos[id] === "mujer")
            r[id] = "ellas";
        else if (generos[id] === "hombre")
            r[id] = "ellos";
        else
            sinBando.push(id);
    }
    for (const id of sinBando) {
        const ellas = Object.values(r).filter(b => b === "ellas").length, ellos = Object.values(r).filter(b => b === "ellos").length;
        r[id] = ellas < ellos ? "ellas" : ellos < ellas ? "ellos" : azar() < .5 ? "ellas" : "ellos";
    }
    return r;
}
/** ¿Cada quien tiene pareja y cada pareja tiene exactamente dos? */
export function parejasValidas(ids, grupos) {
    if (ids.length < 4 || ids.length % 2 !== 0)
        return false;
    const cuenta = {};
    for (const id of ids) {
        const g = grupos[id];
        if (!g || !/^p\d+$/.test(g))
            return false;
        cuenta[g] = (cuenta[g] ?? 0) + 1;
    }
    return Object.values(cuenta).every(c => c === 2);
}
/** Parejas de arranque: las que ya estaban si siguen sirviendo; si no, por orden de llegada (1 con 2, 3 con 4…). */
export function parejasIniciales(ids, actuales = {}) {
    const previas = Object.fromEntries(ids.map(id => [id, actuales[id] ?? ""]));
    if (parejasValidas(ids, previas))
        return previas;
    return Object.fromEntries(ids.map((id, i) => [id, `p${Math.floor(i / 2) + 1}`]));
}
/** Intercambia a dos personas de pareja (o de equipo): cada quien se queda con el grupo del otro. */
export function intercambiar(grupos, a, b) {
    const ga = grupos[a], gb = grupos[b];
    if (!ga || !gb || a === b)
        return grupos;
    return { ...grupos, [a]: gb, [b]: ga };
}
