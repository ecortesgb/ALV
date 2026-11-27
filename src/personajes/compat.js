const puestas = (f, piezas) => Object.entries(f.piezas).flatMap(([parte, p]) => { const pz = piezas.get(p.id); return pz ? [{ parte, pz }] : []; });
const choca = (a, b) => a.ocupa.some(v => b.ocupa.includes(v)) || a.excluye.some(c => b.clase.includes(c)) || b.excluye.some(c => a.clase.includes(c));
/** Qué pasaría al poner `nueva`. `no` = no se puede; si no, qué se quitaría. */
function revisar(f, nueva, piezas) {
    if (nueva.familia !== f.familia)
        return { no: "No es para este cuerpo", quitar: [] };
    const quitar = puestas(f, piezas).filter(x => x.parte === nueva.parte || choca(x.pz, nueva));
    const quedan = puestas(f, piezas).filter(x => !quitar.includes(x)).map(x => x.pz);
    const falta = nueva.requiere.find(c => !quedan.some(p => p.clase.includes(c)));
    if (falta)
        return { no: `Necesita una pieza «${falta}»`, quitar: [] };
    return { quitar };
}
/** Las piezas de una parte con su estado. El básico muestra «puesta» y «disponible»; el avanzado también «no». */
export function opciones(f, parte, piezas, soloBasico = false) {
    const fuera = [];
    for (const pz of piezas.values()) {
        if (pz.parte !== parte || pz.familia !== f.familia || (soloBasico && !pz.basico))
            continue;
        if (f.piezas[parte]?.id === pz.id) {
            fuera.push({ pieza: pz, estado: "puesta" });
            continue;
        }
        const r = revisar(f, pz, piezas);
        if (r.no) {
            fuera.push({ pieza: pz, estado: "no", motivo: r.no });
            continue;
        }
        const otra = r.quitar.find(x => x.parte !== parte);
        fuera.push(otra ? { pieza: pz, estado: "disponible", motivo: `Se quita: ${otra.pz.nombre}` } : { pieza: pz, estado: "disponible" });
    }
    return fuera;
}
/** Pone una pieza. null si no se puede. `aviso`: quita algo de otra parte (hay que preguntar antes). */
export function poner(f, id, piezas, variante) {
    const pz = piezas.get(id);
    if (!pz)
        return null;
    const r = revisar(f, pz, piezas);
    if (r.no)
        return null;
    const nuevas = { ...f.piezas };
    for (const q of r.quitar)
        delete nuevas[q.parte];
    nuevas[pz.parte] = variante ? { id, var: variante } : { id };
    const quitadas = r.quitar.map(q => q.pz.id);
    return { figura: { ...f, piezas: nuevas }, quitadas, aviso: r.quitar.some(q => q.parte !== pz.parte) };
}
/** Quita lo que haya en una parte, y lo que dependía de eso (una capa sin el torso que la sostiene). */
export function quitar(f, parte, piezas) {
    if (!f.piezas[parte])
        return { figura: f, quitadas: [], aviso: false };
    let nuevas = { ...f.piezas };
    const quitadas = [nuevas[parte].id];
    delete nuevas[parte];
    for (let cambio = true; cambio;) {
        cambio = false;
        const quedan = Object.values(nuevas).flatMap(p => { const z = piezas.get(p.id); return z ? [z] : []; });
        for (const [k, p] of Object.entries(nuevas)) {
            const z = piezas.get(p.id);
            if (z && z.requiere.some(c => !quedan.some(o => o !== z && o.clase.includes(c)))) {
                quitadas.push(p.id);
                nuevas = { ...nuevas };
                delete nuevas[k];
                cambio = true;
            }
        }
    }
    return { figura: { ...f, piezas: nuevas }, quitadas, aviso: quitadas.length > 1 };
}
