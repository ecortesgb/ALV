export const NOTA_MAX = 300;
export const CLAVE = "alv-revision-personajes-v1";
export const vacia = () => ({ version: 1, personajes: {}, filtro: "pendientes", avanzar: true });
/** Texto canónico de las animaciones de la ficha (para su firma): claves ordenadas, solo lo que cambia lo que se ve. */
export function textoAnimaciones(f) {
    const orden = (o) => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));
    const a = f.animaciones;
    return JSON.stringify({ mapa: orden(a.mapa), respaldo: orden(a.respaldo), vida: [...a.vida], sentado: a.sentado ?? null });
}
export const mismaFirma = (a, b) => !!a && !!b && a.glb === b.glb && a.anim === b.anim;
/** Estado de un personaje. Sin firma actual conocida (aún se calcula) se muestra lo registrado. */
export function estadoDe(r, firma) {
    if (!r?.actual)
        return "sin-revisar";
    if (firma && !mismaFirma(r.actual.firma, firma))
        return "revisar-de-nuevo";
    return r.actual.estado;
}
export const esPendiente = (e) => e === "sin-revisar" || e === "revisar-de-nuevo";
/** Registra la decisión. Si había otra hecha sobre otro archivo, pasa a «anteriores» (antecedente, ya no vale). */
export function decidir(rev, id, estado, nota, firma, fecha = new Date().toISOString()) {
    const prev = rev.personajes[id] ?? {};
    const anteriores = [...(prev.anteriores ?? [])];
    if (prev.actual && !mismaFirma(prev.actual.firma, firma))
        anteriores.push(prev.actual);
    const actual = { estado, nota: nota.trim().slice(0, NOTA_MAX), fecha, firma };
    return { ...rev, ultimo: id, personajes: { ...rev.personajes, [id]: { actual, ...(anteriores.length ? { anteriores } : {}) } } };
}
/** «Quitar decisión»: vuelve a pendiente (los antecedentes se quedan). */
export function quitar(rev, id) {
    const prev = rev.personajes[id];
    if (!prev?.actual)
        return rev;
    const { actual: _fuera, ...resto } = prev;
    return { ...rev, personajes: { ...rev.personajes, [id]: { ...resto, borrador: prev.actual.nota } } };
}
/** Deshacer UNA decisión: devuelve ese personaje a como estaba antes, sin tocar lo que se hizo después en otros
 *  (Codex, modo-revision-verif). */
export function restaurar(rev, id, previo) {
    const personajes = { ...rev.personajes };
    if (previo)
        personajes[id] = previo;
    else
        delete personajes[id];
    return { ...rev, personajes };
}
/** Personajes con decisión cuya firma actual aún no se comprobó: hasta que no quede ninguno, conteos, filtros y
 *  exportación son provisionales (un GLB cambiado tiene que salir en «Revisar de nuevo»). */
export const porVerificar = (rev, firmas, ids) => ids.filter(id => !!rev.personajes[id]?.actual && !firmas.has(id));
/** Al cambiar de filtro: si el personaje visible no está en él, el primero del filtro; null si el filtro está vacío. */
export const elegirEnFiltro = (filtrados, actual) => actual && filtrados.includes(actual) ? actual : filtrados[0] ?? null;
export function conBorrador(rev, id, texto) {
    const prev = rev.personajes[id] ?? {};
    return { ...rev, personajes: { ...rev.personajes, [id]: { ...prev, borrador: texto.slice(0, NOTA_MAX) } } };
}
export function contar(ids, rev, firmas) {
    const c = { total: ids.length, aprobados: 0, rechazados: 0, pendientes: 0, sinRevisar: 0, deNuevo: 0 };
    for (const id of ids) {
        const e = estadoDe(rev.personajes[id], firmas.get(id) ?? null);
        if (e === "aprobado")
            c.aprobados++;
        else if (e === "rechazado")
            c.rechazados++;
        else {
            c.pendientes++;
            if (e === "sin-revisar")
                c.sinRevisar++;
            else
                c.deNuevo++;
        }
    }
    return c;
}
export function filtrarRev(ids, filtro, rev, firmas) {
    if (filtro === "todos")
        return ids;
    return ids.filter(id => {
        const e = estadoDe(rev.personajes[id], firmas.get(id) ?? null);
        return filtro === "pendientes" ? esPendiente(e) : filtro === "aprobados" ? e === "aprobado" : e === "rechazado";
    });
}
/** El siguiente pendiente después de `desde` (dando la vuelta), o null si no queda ninguno. No salta a aprobados. */
export function siguientePendiente(ids, desde, rev, firmas) {
    const i0 = desde ? ids.indexOf(desde) : -1;
    for (let k = 1; k <= ids.length; k++) {
        const id = ids[(i0 + k + ids.length) % ids.length];
        if (id !== desde && esPendiente(estadoDe(rev.personajes[id], firmas.get(id) ?? null)))
            return id;
    }
    return null;
}
export function exportar(ids, rev, firmas, nombres, fecha = new Date().toISOString()) {
    const c = contar(ids, rev, firmas);
    const personajes = {};
    for (const [id, r] of Object.entries(rev.personajes)) {
        if (!r.actual && !r.anteriores?.length)
            continue;
        personajes[id] = { ...(nombres.get(id) ? { nombre: nombres.get(id) } : {}), ...(r.actual ? { actual: r.actual } : {}), ...(r.anteriores?.length ? { anteriores: r.anteriores } : {}) };
    }
    return { version: 1, tipo: "alv-revision-personajes", fecha, total: c.total, aprobados: c.aprobados, rechazados: c.rechazados, pendientes: c.pendientes, personajes };
}
const esFirma = (x) => !!x && typeof x === "object" && typeof x.glb === "string" && typeof x.anim === "string"
    && /^[0-9a-f]{64}$/.test(x.glb) && /^[0-9a-f]{64}$/.test(x.anim);
const esRegistro = (x) => {
    const r = x;
    return !!r && typeof r === "object" && (r.estado === "aprobado" || r.estado === "rechazado") && typeof r.nota === "string" && r.nota.length <= NOTA_MAX
        && typeof r.fecha === "string" && !Number.isNaN(Date.parse(r.fecha)) && esFirma(r.firma);
};
const ID = /^[a-z0-9][a-z0-9-]{1,59}$/;
/** Lee un archivo exportado (lo de fuera no es confiable: se valida campo por campo). */
export function leerExportado(x) {
    const d = x;
    if (!d || typeof d !== "object" || d.version !== 1 || d.tipo !== "alv-revision-personajes" || !d.personajes || typeof d.personajes !== "object")
        return { ok: false, error: "No es un archivo de revisión de personajes." };
    const personajes = {};
    for (const [id, r] of Object.entries(d.personajes)) {
        if (!ID.test(id) || !r || typeof r !== "object")
            continue;
        const actual = esRegistro(r.actual) ? r.actual : undefined;
        const anteriores = Array.isArray(r.anteriores) ? r.anteriores.filter(esRegistro).slice(0, 20) : [];
        if (actual || anteriores.length)
            personajes[id] = { ...(actual ? { actual } : {}), ...(anteriores.length ? { anteriores } : {}) };
    }
    return { ok: true, personajes };
}
/** Combina por id. Si los dos tienen decisión distinta (estado o nota) sobre el mismo personaje, es un conflicto: no se
 *  sustituye y se devuelve para preguntar (Codex). Lo que solo trae el archivo se agrega. */
export function combinar(rev, entrante) {
    const personajes = { ...rev.personajes };
    const conflictos = [];
    let agregados = 0;
    for (const [id, r] of Object.entries(entrante)) {
        const mio = personajes[id];
        const ant = [...(mio?.anteriores ?? [])];
        for (const a of r.anteriores ?? [])
            if (!ant.some(x => x.fecha === a.fecha && x.estado === a.estado))
                ant.push(a);
        if (!r.actual) {
            personajes[id] = { ...mio, ...(ant.length ? { anteriores: ant } : {}) };
            continue;
        }
        if (!mio?.actual) {
            personajes[id] = { ...mio, actual: r.actual, ...(ant.length ? { anteriores: ant } : {}) };
            agregados++;
            continue;
        }
        const igual = mio.actual.estado === r.actual.estado && mio.actual.nota === r.actual.nota && mismaFirma(mio.actual.firma, r.actual.firma);
        if (!igual)
            conflictos.push(id);
        personajes[id] = { ...mio, ...(ant.length ? { anteriores: ant } : {}) };
    }
    return { revision: { ...rev, personajes }, conflictos, agregados };
}
/** Sustituye la decisión de un personaje por la del archivo (cuando Elías lo elige en un conflicto). */
export function usarDelArchivo(rev, id, del) {
    if (!del.actual)
        return rev;
    const mio = rev.personajes[id];
    const ant = [...(mio?.anteriores ?? [])];
    if (mio?.actual)
        ant.push(mio.actual);
    return { ...rev, personajes: { ...rev.personajes, [id]: { actual: del.actual, anteriores: ant } } };
}
// ---------- Guardado en este navegador ----------
export function leerRevision(almacen = typeof localStorage !== "undefined" ? localStorage : null) {
    try {
        const x = JSON.parse(almacen?.getItem(CLAVE) ?? "null");
        if (!x || x.version !== 1)
            return vacia();
        const leido = leerExportado({ version: 1, tipo: "alv-revision-personajes", personajes: x.personajes ?? {} });
        const personajes = leido.ok ? leido.personajes : {};
        for (const [id, r] of Object.entries((x.personajes ?? {}))) {
            if (ID.test(id) && typeof r?.borrador === "string")
                personajes[id] = { ...personajes[id], borrador: r.borrador.slice(0, NOTA_MAX) };
        }
        const filtro = ["pendientes", "aprobados", "rechazados", "todos"].includes(x.filtro) ? x.filtro : "pendientes";
        return { version: 1, personajes, filtro, avanzar: x.avanzar !== false, ...(typeof x.ultimo === "string" && ID.test(x.ultimo) ? { ultimo: x.ultimo } : {}) };
    }
    catch {
        return vacia();
    }
}
/** true si se guardó; false si el navegador no deja (el trabajo sigue en memoria y hay que exportarlo). */
export function guardarRevision(rev, almacen = typeof localStorage !== "undefined" ? localStorage : null) {
    try {
        if (!almacen)
            return false;
        almacen.setItem(CLAVE, JSON.stringify(rev));
        return true;
    }
    catch {
        return false;
    }
}
/** SHA256 en hexadecimal (navegador o Node con WebCrypto). */
export async function sha256(datos) {
    const buf = typeof datos === "string" ? new TextEncoder().encode(datos) : new Uint8Array(datos);
    const h = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}
