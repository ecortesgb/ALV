// Carga el catálogo desde el índice del servidor de personajes (personajes-privados en desarrollo; el almacenamiento
// privado con sesión después). Cada ficha se valida; las rechazadas se reportan y no entran.
import { leerFicha } from "./ficha";
export async function cargarIndice(fuente, f = fetch) {
    const base = fuente.endsWith("/") ? fuente : fuente + "/";
    const r = await f(base + "indice.json");
    if (!r.ok)
        throw new Error("índice " + r.status);
    const datos = (await r.json());
    const catalogo = new Map(), pruebas = new Set(), errores = [], ranuras = new Map();
    for (const ent of Array.isArray(datos.personajes) ? datos.personajes : []) {
        const e = ent;
        if (typeof e.ruta !== "string" || !/^[\w-]+\/[\w-]+\/$/.test(e.ruta)) {
            errores.push(`${String(e.id)}: ruta`);
            continue;
        }
        const v = leerFicha(e.ficha, { rutasLibres: e.prueba === true });
        if (!v.ok) {
            errores.push(`${String(e.id)}: ${v.errores.join(", ")}`);
            continue;
        }
        if (catalogo.has(v.ficha.id))
            continue;
        catalogo.set(v.ficha.id, { ficha: v.ficha, base: new URL(e.ruta, base).href });
        if (e.prueba === true)
            pruebas.add(v.ficha.id);
        if (Array.isArray(e.ranuras))
            ranuras.set(v.ficha.id, e.ranuras.filter((r) => typeof r === "string" && /^[a-z]{2,20}$/.test(r)));
    }
    const genericas = [];
    for (const g of Array.isArray(datos.piezas) ? datos.piezas : []) {
        const e = g;
        if (typeof e.familia !== "string" || !/^[a-z0-9-]{2,30}$/.test(e.familia) || typeof e.ruta !== "string" || !/^piezas\/[a-z0-9-]+\/$/.test(e.ruta)) {
            errores.push("piezas: entrada no válida");
            continue;
        }
        genericas.push({ familia: e.familia, base: new URL(e.ruta, base).href, datos: e.datos });
    }
    return { catalogo, pruebas, errores, ranuras, genericas };
}
