export const NOMBRE_SAGA = {
    marvel: "Marvel", dc: "DC", "star-wars": "Star Wars", "harry-potter": "Harry Potter", piratas: "Piratas",
    "senor-de-los-anillos": "El Señor de los Anillos", otros: "Otros",
};
const ORDEN_SAGA = ["marvel", "dc", "star-wars", "harry-potter", "senor-de-los-anillos", "piratas", "otros"];
export const nombreSaga = (s) => NOMBRE_SAGA[s] ?? s.replace(/-/g, " ").replace(/^./, c => c.toUpperCase());
/** Qué estados de calidad salen en la galería (los «borrador» solo en pruebas). */
const VISIBLES = new Set(["jugable", "revision", "aprobado"]);
export function tarjetas(catalogo, opciones = {}) {
    const fuera = [];
    for (const { ficha: f, base } of catalogo.values()) {
        if (!VISIBLES.has(f.calidad.estado) && !opciones.conBorradores)
            continue;
        const foto = /\.webp$|\.png$|\.jpg$/i.test(f.fotos.tarjeta) && !/no-hay/.test(f.fotos.tarjeta) ? new URL(f.fotos.tarjeta, base).href : null;
        fuera.push({ id: f.id, nombre: f.nombre, saga: f.saga, grupo: f.grupo, bando: f.bando, familia: f.familia,
            tamano: f.familia === "bigfig" ? "grande" : "normal", foto, prueba: !!opciones.pruebas?.has(f.id) });
    }
    const orden = (s) => { const i = ORDEN_SAGA.indexOf(s); return i < 0 ? ORDEN_SAGA.length : i; };
    return fuera.sort((a, b) => orden(a.saga) - orden(b.saga) || a.saga.localeCompare(b.saga) || a.nombre.localeCompare(b.nombre, "es"));
}
/** «Todos», «Favoritos» (si hay) y las sagas que tienen al menos un personaje, en su orden. */
export function categorias(lista, favoritos) {
    const porSaga = new Map();
    for (const t of lista)
        porSaga.set(t.saga, (porSaga.get(t.saga) ?? 0) + 1);
    const favs = lista.filter(t => favoritos.has(t.id)).length;
    return [
        { id: "todos", nombre: "Todos", cuantos: lista.length },
        ...(favs ? [{ id: "favoritos", nombre: "Favoritos", cuantos: favs }] : []),
        ...[...porSaga].map(([id, cuantos]) => ({ id, nombre: nombreSaga(id), cuantos })),
    ];
}
export const SIN_FILTRO = { categoria: "todos", bando: null, tamano: null };
export function filtrar(lista, f, favoritos) {
    return lista.filter(t => (f.categoria === "todos" || (f.categoria === "favoritos" ? favoritos.has(t.id) : t.saga === f.categoria))
        && (!f.bando || t.bando === f.bando) && (!f.tamano || t.tamano === f.tamano));
}
/** Parte la lista en páginas de `porPagina` (al menos 1). */
export function paginas(lista, porPagina) {
    const n = Math.max(1, Math.floor(porPagina));
    const fuera = [];
    for (let i = 0; i < lista.length; i += n)
        fuera.push(lista.slice(i, i + n));
    return fuera.length ? fuera : [[]];
}
/** Cuántas tarjetas caben en una caja (columnas × filas), con un tamaño mínimo de tarjeta. */
export function caben(ancho, alto, tarjeta = { min: 118, proporcion: 1.3, hueco: 10 }) {
    const columnas = Math.max(1, Math.floor((ancho + tarjeta.hueco) / (tarjeta.min + tarjeta.hueco)));
    const anchoReal = (ancho - tarjeta.hueco * (columnas - 1)) / columnas;
    const filas = Math.max(1, Math.floor((alto + tarjeta.hueco) / (anchoReal * tarjeta.proporcion + tarjeta.hueco)));
    return { columnas, filas };
}
// ---------- Favoritos (en este aparato; en la cuenta, después) ----------
const claveFav = (jugador) => "alv-personajes-favoritos-" + (jugador.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
export function leerFavoritos(jugador) {
    try {
        const x = JSON.parse(localStorage.getItem(claveFav(jugador)) ?? "[]");
        return new Set(Array.isArray(x) ? x.filter((i) => typeof i === "string" && /^[a-z0-9][a-z0-9-]{1,59}$/.test(i)).slice(0, 200) : []);
    }
    catch {
        return new Set();
    }
}
export function guardarFavoritos(jugador, favs) {
    try {
        localStorage.setItem(claveFav(jugador), JSON.stringify([...favs].slice(0, 200)));
    }
    catch { /* sin almacenamiento */ }
}
