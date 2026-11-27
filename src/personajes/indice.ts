// Carga el catálogo desde el índice del servidor de personajes (personajes-privados en desarrollo; el almacenamiento
// privado con sesión después). Cada ficha se valida; las rechazadas se reportan y no entran.
import { leerFicha } from "./ficha";
import type { GenericasIndice } from "./genericas";
import type { Catalogo, EnCatalogo } from "./plano";
import type { Id } from "./tipos";

export interface Indice { catalogo: Catalogo; pruebas: Set<Id>; errores: string[];
  /** Ranuras de las mallas de cada personaje (extras.slot), para sacar piezas del constructor. */
  ranuras: Map<Id, string[]>;
  /** Piezas genéricas por familia (opcional: entregas sin ellas siguen sirviendo). */
  genericas: GenericasIndice[] }

export async function cargarIndice(fuente: string, f: typeof fetch = fetch): Promise<Indice> {
  const base = fuente.endsWith("/") ? fuente : fuente + "/";
  const r = await f(base + "indice.json");
  if (!r.ok) throw new Error("índice " + r.status);
  const datos = (await r.json()) as { personajes?: unknown; piezas?: unknown };
  const catalogo = new Map<Id, EnCatalogo>(), pruebas = new Set<Id>(), errores: string[] = [], ranuras = new Map<Id, string[]>();
  for (const ent of Array.isArray(datos.personajes) ? datos.personajes : []) {
    const e = ent as { id?: unknown; ruta?: unknown; prueba?: unknown; ficha?: unknown; ranuras?: unknown };
    if (typeof e.ruta !== "string" || !/^[\w-]+\/[\w-]+\/$/.test(e.ruta)) { errores.push(`${String(e.id)}: ruta`); continue; }
    const v = leerFicha(e.ficha, { rutasLibres: e.prueba === true });
    if (!v.ok) { errores.push(`${String(e.id)}: ${v.errores.join(", ")}`); continue; }
    if (catalogo.has(v.ficha.id)) continue;
    catalogo.set(v.ficha.id, { ficha: v.ficha, base: new URL(e.ruta, base).href });
    if (e.prueba === true) pruebas.add(v.ficha.id);
    if (Array.isArray(e.ranuras)) ranuras.set(v.ficha.id, e.ranuras.filter((r): r is string => typeof r === "string" && /^[a-z]{2,20}$/.test(r)));
  }
  const genericas: GenericasIndice[] = [];
  for (const g of Array.isArray(datos.piezas) ? datos.piezas : []) {
    const e = g as { familia?: unknown; ruta?: unknown; datos?: unknown };
    if (typeof e.familia !== "string" || !/^[a-z0-9-]{2,30}$/.test(e.familia) || typeof e.ruta !== "string" || !/^piezas\/[a-z0-9-]+\/$/.test(e.ruta)) { errores.push("piezas: entrada no válida"); continue; }
    genericas.push({ familia: e.familia, base: new URL(e.ruta, base).href, datos: e.datos });
  }
  return { catalogo, pruebas, errores, ranuras, genericas };
}
