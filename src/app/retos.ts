// Lo que una figura lleva puesto (ids y colores) y si cumple un reto. Debe dar lo mismo que privado.ids_de_figura,
// privado.colores_de_figura y privado.cumple_reto de la migración 033 (el servidor es quien da el premio).
import { rarezaDe, type Condicion } from "../content/rarezas";

type J = Record<string, unknown>;
const esObj = (v: unknown): v is J => !!v && typeof v === "object" && !Array.isArray(v);

/** Todas las piezas: ids de cualquier nivel, rostro, estampado, detalles y el paquete de momentos (MOM_x). */
export function idsDe(f: object | null | undefined): Set<string> {
  const ids = new Set<string>();
  const recorrer = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(recorrer);
    else if (esObj(v)) for (const [k, x] of Object.entries(v)) { if (k === "id" && typeof x === "string") ids.add(x); else recorrer(x); }
  };
  if (!f) return ids;
  recorrer(f);
  const g = f as J, I = (g.identidad ?? {}) as J, T = ((g.ropa ?? {}) as J).torso as J | undefined, M = (g.momentos ?? {}) as J;
  if (typeof I.rostro === "string") ids.add(I.rostro);
  if (T && typeof T.estampado === "string") ids.add(T.estampado);
  if (Array.isArray(I.detalles)) I.detalles.forEach(d => typeof d === "string" && ids.add(d));
  if (typeof M.paquete === "string") ids.add("MOM_" + M.paquete);
  return ids;
}

/** Todos los colores: claves «color», colores del torso, piel, brazos, guantes y botas. En minúsculas. */
export function coloresDe(f: object | null | undefined): Set<string> {
  const c = new Set<string>();
  const add = (v: unknown) => { if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) c.add(v.toLowerCase()); };
  const recorrer = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(recorrer);
    else if (esObj(v)) for (const [k, x] of Object.entries(v)) { if (k === "color") add(x); else recorrer(x); }
  };
  if (!f) return c;
  recorrer(f);
  const g = f as J, I = (g.identidad ?? {}) as J, R = (g.ropa ?? {}) as J, T = (R.torso ?? {}) as J, P = (R.piernas ?? {}) as J;
  add(I.piel); add(R.brazos); add(R.guantes); add(P.botas);
  if (Array.isArray(T.colores)) T.colores.forEach(add);
  return c;
}

const en = (lista: string[], v: unknown) => typeof v === "string" && lista.some(x => x.toLowerCase() === v.toLowerCase());

/** ¿La figura cumple la condición? Cada clave presente debe cumplirse. */
export function cumple(f: object | null | undefined, c: Condicion): boolean {
  if (!f) return false;
  const ids = idsDe(f), col = coloresDe(f);
  const R = ((f as J).ropa ?? {}) as J, A = ((f as J).accesorios ?? {}) as J;
  if (c.todas && !c.todas.every(id => ids.has(id))) return false;
  if (c.alguna && !c.alguna.every(g => g.some(id => ids.has(id)))) return false;
  if (c.colores && !c.colores.every(g => g.some(x => col.has(x.toLowerCase())))) return false;
  if (c.torso && !en(c.torso, ((R.torso ?? {}) as J).color)) return false;
  if (c.piernas && !en(c.piernas, ((R.piernas ?? {}) as J).color)) return false;
  if (c.dosObjetos && !(esObj(A.mano_der) && esObj(A.mano_izq))) return false;
  return true;
}

/** Piezas no comunes que la figura lleva y el jugador no tiene. */
export const bloqueadasEn = (f: object | null | undefined, tengo: Set<string>) =>
  [...idsDe(f)].filter(id => rarezaDe(id) !== "comun" && !tengo.has(id));
