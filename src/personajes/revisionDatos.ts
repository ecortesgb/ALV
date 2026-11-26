// Modo revisión de personajes (Elías aprueba o rechaza cada personaje del catálogo; diseño decidido por Codex, encargo
// herramientas-locales/encargos-codex/2026-11-26-modo-revision-r1.md). Lógica pura: el registro, las firmas, los estados,
// los conteos y la combinación al importar. No toca el catálogo ni las fichas: solo registra la decisión.
import type { Ficha, Id } from "./tipos";

export type Decision = "aprobado" | "rechazado";
/** Lo que se vio al decidir: SHA256 del GLB y de las animaciones declaradas (mapa, respaldos, vida, sentado). */
export interface Firma { glb: string; anim: string }
export interface Registro { estado: Decision; nota: string; fecha: string; firma: Firma }
export interface Revisado { actual?: Registro; anteriores?: Registro[]; /** Nota que se está escribiendo (aún sin decisión). */ borrador?: string }
export type FiltroRev = "pendientes" | "aprobados" | "rechazados" | "todos";
export interface Revision {
  version: 1;
  personajes: Record<Id, Revisado>;
  ultimo?: Id;
  filtro: FiltroRev;
  /** «Avanzar al decidir» (Codex: encendido al principio, se recuerda). */
  avanzar: boolean;
}
/** Estado visible: «pendiente» se divide en sin revisar y revisar de nuevo (el GLB o las animaciones cambiaron). */
export type EstadoRev = "sin-revisar" | "revisar-de-nuevo" | Decision;

export const NOTA_MAX = 300;
export const CLAVE = "alv-revision-personajes-v1";
export const vacia = (): Revision => ({ version: 1, personajes: {}, filtro: "pendientes", avanzar: true });

/** Texto canónico de las animaciones de la ficha (para su firma): claves ordenadas, solo lo que cambia lo que se ve. */
export function textoAnimaciones(f: Pick<Ficha, "animaciones">): string {
  const orden = (o: Record<string, unknown>) => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));
  const a = f.animaciones;
  return JSON.stringify({ mapa: orden(a.mapa), respaldo: orden(a.respaldo), vida: [...a.vida], sentado: a.sentado ?? null });
}

export const mismaFirma = (a: Firma | null | undefined, b: Firma | null | undefined) => !!a && !!b && a.glb === b.glb && a.anim === b.anim;

/** Estado de un personaje. Sin firma actual conocida (aún se calcula) se muestra lo registrado. */
export function estadoDe(r: Revisado | undefined, firma: Firma | null): EstadoRev {
  if (!r?.actual) return "sin-revisar";
  if (firma && !mismaFirma(r.actual.firma, firma)) return "revisar-de-nuevo";
  return r.actual.estado;
}
export const esPendiente = (e: EstadoRev) => e === "sin-revisar" || e === "revisar-de-nuevo";

/** Registra la decisión. Si había otra hecha sobre otro archivo, pasa a «anteriores» (antecedente, ya no vale). */
export function decidir(rev: Revision, id: Id, estado: Decision, nota: string, firma: Firma, fecha = new Date().toISOString()): Revision {
  const prev = rev.personajes[id] ?? {};
  const anteriores = [...(prev.anteriores ?? [])];
  if (prev.actual && !mismaFirma(prev.actual.firma, firma)) anteriores.push(prev.actual);
  const actual: Registro = { estado, nota: nota.trim().slice(0, NOTA_MAX), fecha, firma };
  return { ...rev, ultimo: id, personajes: { ...rev.personajes, [id]: { actual, ...(anteriores.length ? { anteriores } : {}) } } };
}

/** «Quitar decisión»: vuelve a pendiente (los antecedentes se quedan). */
export function quitar(rev: Revision, id: Id): Revision {
  const prev = rev.personajes[id];
  if (!prev?.actual) return rev;
  const { actual: _fuera, ...resto } = prev;
  return { ...rev, personajes: { ...rev.personajes, [id]: { ...resto, borrador: prev.actual.nota } } };
}

/** Deshacer UNA decisión: devuelve ese personaje a como estaba antes, sin tocar lo que se hizo después en otros
 *  (Codex, modo-revision-verif). */
export function restaurar(rev: Revision, id: Id, previo: Revisado | undefined): Revision {
  const personajes = { ...rev.personajes };
  if (previo) personajes[id] = previo; else delete personajes[id];
  return { ...rev, personajes };
}

/** Personajes con decisión cuya firma actual aún no se comprobó: hasta que no quede ninguno, conteos, filtros y
 *  exportación son provisionales (un GLB cambiado tiene que salir en «Revisar de nuevo»). */
export const porVerificar = (rev: Revision, firmas: ReadonlyMap<Id, Firma>, ids: readonly Id[]): Id[] =>
  ids.filter(id => !!rev.personajes[id]?.actual && !firmas.has(id));

/** Al cambiar de filtro: si el personaje visible no está en él, el primero del filtro; null si el filtro está vacío. */
export const elegirEnFiltro = (filtrados: readonly Id[], actual: Id | null): Id | null =>
  actual && filtrados.includes(actual) ? actual : filtrados[0] ?? null;

export function conBorrador(rev: Revision, id: Id, texto: string): Revision {
  const prev = rev.personajes[id] ?? {};
  return { ...rev, personajes: { ...rev.personajes, [id]: { ...prev, borrador: texto.slice(0, NOTA_MAX) } } };
}

export interface Conteo { total: number; aprobados: number; rechazados: number; pendientes: number; sinRevisar: number; deNuevo: number }
export function contar(ids: Id[], rev: Revision, firmas: ReadonlyMap<Id, Firma>): Conteo {
  const c: Conteo = { total: ids.length, aprobados: 0, rechazados: 0, pendientes: 0, sinRevisar: 0, deNuevo: 0 };
  for (const id of ids) {
    const e = estadoDe(rev.personajes[id], firmas.get(id) ?? null);
    if (e === "aprobado") c.aprobados++;
    else if (e === "rechazado") c.rechazados++;
    else { c.pendientes++; if (e === "sin-revisar") c.sinRevisar++; else c.deNuevo++; }
  }
  return c;
}

export function filtrarRev(ids: Id[], filtro: FiltroRev, rev: Revision, firmas: ReadonlyMap<Id, Firma>): Id[] {
  if (filtro === "todos") return ids;
  return ids.filter(id => {
    const e = estadoDe(rev.personajes[id], firmas.get(id) ?? null);
    return filtro === "pendientes" ? esPendiente(e) : filtro === "aprobados" ? e === "aprobado" : e === "rechazado";
  });
}

/** El siguiente pendiente después de `desde` (dando la vuelta), o null si no queda ninguno. No salta a aprobados. */
export function siguientePendiente(ids: Id[], desde: Id | null, rev: Revision, firmas: ReadonlyMap<Id, Firma>): Id | null {
  const i0 = desde ? ids.indexOf(desde) : -1;
  for (let k = 1; k <= ids.length; k++) {
    const id = ids[(i0 + k + ids.length) % ids.length]!;
    if (id !== desde && esPendiente(estadoDe(rev.personajes[id], firmas.get(id) ?? null))) return id;
  }
  return null;
}

// ---------- Exportar e importar (revision-personajes.json) ----------

export interface Exportado {
  version: 1; tipo: "alv-revision-personajes"; fecha: string;
  total: number; aprobados: number; rechazados: number; pendientes: number;
  personajes: Record<Id, { nombre?: string } & Revisado>;
}
export function exportar(ids: Id[], rev: Revision, firmas: ReadonlyMap<Id, Firma>, nombres: ReadonlyMap<Id, string>, fecha = new Date().toISOString()): Exportado {
  const c = contar(ids, rev, firmas);
  const personajes: Exportado["personajes"] = {};
  for (const [id, r] of Object.entries(rev.personajes)) {
    if (!r.actual && !r.anteriores?.length) continue;
    personajes[id] = { ...(nombres.get(id) ? { nombre: nombres.get(id) } : {}), ...(r.actual ? { actual: r.actual } : {}), ...(r.anteriores?.length ? { anteriores: r.anteriores } : {}) };
  }
  return { version: 1, tipo: "alv-revision-personajes", fecha, total: c.total, aprobados: c.aprobados, rechazados: c.rechazados, pendientes: c.pendientes, personajes };
}

const esFirma = (x: unknown): x is Firma => !!x && typeof x === "object" && typeof (x as Firma).glb === "string" && typeof (x as Firma).anim === "string"
  && /^[0-9a-f]{64}$/.test((x as Firma).glb) && /^[0-9a-f]{64}$/.test((x as Firma).anim);
const esRegistro = (x: unknown): x is Registro => {
  const r = x as Registro;
  return !!r && typeof r === "object" && (r.estado === "aprobado" || r.estado === "rechazado") && typeof r.nota === "string" && r.nota.length <= NOTA_MAX
    && typeof r.fecha === "string" && !Number.isNaN(Date.parse(r.fecha)) && esFirma(r.firma);
};
const ID = /^[a-z0-9][a-z0-9-]{1,59}$/;

/** Lee un archivo exportado (lo de fuera no es confiable: se valida campo por campo). */
export function leerExportado(x: unknown): { ok: true; personajes: Record<Id, Revisado> } | { ok: false; error: string } {
  const d = x as Exportado;
  if (!d || typeof d !== "object" || d.version !== 1 || d.tipo !== "alv-revision-personajes" || !d.personajes || typeof d.personajes !== "object") return { ok: false, error: "No es un archivo de revisión de personajes." };
  const personajes: Record<Id, Revisado> = {};
  for (const [id, r] of Object.entries(d.personajes)) {
    if (!ID.test(id) || !r || typeof r !== "object") continue;
    const actual = esRegistro(r.actual) ? r.actual : undefined;
    const anteriores = Array.isArray(r.anteriores) ? r.anteriores.filter(esRegistro).slice(0, 20) : [];
    if (actual || anteriores.length) personajes[id] = { ...(actual ? { actual } : {}), ...(anteriores.length ? { anteriores } : {}) };
  }
  return { ok: true, personajes };
}

/** Combina por id. Si los dos tienen decisión distinta (estado o nota) sobre el mismo personaje, es un conflicto: no se
 *  sustituye y se devuelve para preguntar (Codex). Lo que solo trae el archivo se agrega. */
export function combinar(rev: Revision, entrante: Record<Id, Revisado>): { revision: Revision; conflictos: Id[]; agregados: number } {
  const personajes = { ...rev.personajes };
  const conflictos: Id[] = [];
  let agregados = 0;
  for (const [id, r] of Object.entries(entrante)) {
    const mio = personajes[id];
    const ant = [...(mio?.anteriores ?? [])];
    for (const a of r.anteriores ?? []) if (!ant.some(x => x.fecha === a.fecha && x.estado === a.estado)) ant.push(a);
    if (!r.actual) { personajes[id] = { ...mio, ...(ant.length ? { anteriores: ant } : {}) }; continue; }
    if (!mio?.actual) { personajes[id] = { ...mio, actual: r.actual, ...(ant.length ? { anteriores: ant } : {}) }; agregados++; continue; }
    const igual = mio.actual.estado === r.actual.estado && mio.actual.nota === r.actual.nota && mismaFirma(mio.actual.firma, r.actual.firma);
    if (!igual) conflictos.push(id);
    personajes[id] = { ...mio, ...(ant.length ? { anteriores: ant } : {}) };
  }
  return { revision: { ...rev, personajes }, conflictos, agregados };
}

/** Sustituye la decisión de un personaje por la del archivo (cuando Elías lo elige en un conflicto). */
export function usarDelArchivo(rev: Revision, id: Id, del: Revisado): Revision {
  if (!del.actual) return rev;
  const mio = rev.personajes[id];
  const ant = [...(mio?.anteriores ?? [])];
  if (mio?.actual) ant.push(mio.actual);
  return { ...rev, personajes: { ...rev.personajes, [id]: { actual: del.actual, anteriores: ant } } };
}

// ---------- Guardado en este navegador ----------

export function leerRevision(almacen: Pick<Storage, "getItem"> | null = typeof localStorage !== "undefined" ? localStorage : null): Revision {
  try {
    const x = JSON.parse(almacen?.getItem(CLAVE) ?? "null");
    if (!x || x.version !== 1) return vacia();
    const leido = leerExportado({ version: 1, tipo: "alv-revision-personajes", personajes: x.personajes ?? {} });
    const personajes = leido.ok ? leido.personajes : {};
    for (const [id, r] of Object.entries((x.personajes ?? {}) as Record<string, Revisado>)) {
      if (ID.test(id) && typeof r?.borrador === "string") personajes[id] = { ...personajes[id], borrador: r.borrador.slice(0, NOTA_MAX) };
    }
    const filtro: FiltroRev = ["pendientes", "aprobados", "rechazados", "todos"].includes(x.filtro) ? x.filtro : "pendientes";
    return { version: 1, personajes, filtro, avanzar: x.avanzar !== false, ...(typeof x.ultimo === "string" && ID.test(x.ultimo) ? { ultimo: x.ultimo } : {}) };
  } catch { return vacia(); }
}
/** true si se guardó; false si el navegador no deja (el trabajo sigue en memoria y hay que exportarlo). */
export function guardarRevision(rev: Revision, almacen: Pick<Storage, "setItem"> | null = typeof localStorage !== "undefined" ? localStorage : null): boolean {
  try { if (!almacen) return false; almacen.setItem(CLAVE, JSON.stringify(rev)); return true; } catch { return false; }
}

/** SHA256 en hexadecimal (navegador o Node con WebCrypto). */
export async function sha256(datos: ArrayBuffer | string): Promise<string> {
  const buf = typeof datos === "string" ? new TextEncoder().encode(datos) : new Uint8Array(datos);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}
