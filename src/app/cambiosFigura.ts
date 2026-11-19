// Qué cambia entre dos figuras, para el aviso de confirmación del personalizador (D3 del plan de 3 modos):
// se pregunta al quitar algo, al cambiar varias partes a la vez (un personaje o traje) o al reemplazar una pieza original
// (de personaje). Cambiar una pieza común por otra de la misma parte, cambiar colores o poner algo donde no había nada no
// pregunta; para eso está «Regresar».
import catalogo from "../content/catalogo-figura.json";
import { esOriginal } from "../content/sagas";
import { completar, conservar, capaDe, cuelloDe, type Figura, type Parte } from "./editarFigura";
import type { FiguraV2 } from "../content/personaje";

export interface Cambio { parte: string; antes: string | null; despues: string | null; /** ids de la pieza que se va */ antesId: string | null }

const NOMBRES = new Map<string, string>();
for (const lista of Object.values(catalogo.secciones) as { id?: string | null; nombre: string }[][]) for (const p of lista) if (p.id) NOMBRES.set(p.id, p.nombre);
for (const m of catalogo.paquetes) NOMBRES.set("MOM_" + m.id, m.nombre);
const nombre = (id: string | null | undefined) => (id ? NOMBRES.get(id) ?? id : null);

/** Lo que importa de cada parte (sin colores). */
function huella(f: Figura): [string, string | null][] {
  const det = (o: string) => f.identidad.detalles.filter(d => (o === "lentes" ? /DETAIL_00[1-3]|DETAIL_010/.test(d) : !/DETAIL_00[1-3]|DETAIL_010/.test(d)));
  return [
    ["Pelo", f.identidad.cabello?.id ?? null],
    ["Casco", f.accesorios.cabeza?.id ?? null],
    ["Máscara", f.accesorios.cara?.id ?? null],
    ["Rostro", f.identidad.rostro],
    ["Lentes y parche", det("lentes").join(",") || null],
    ["Barba y marcas", det("otros").join(",") || null],
    ["Cuello", cuelloDe(f)?.id ?? null],
    ["Capa", capaDe(f)?.id ?? null],
    ["Torso", f.ropa.torso.estampado ?? "liso"],
    ["Piernas", f.ropa.piernas.tipo],
    ["Botas", f.ropa.piernas.botas ? "botas" : null],
    ["Objeto mano derecha", f.accesorios.mano_der?.id ?? null],
    ["Objeto mano izquierda", f.accesorios.mano_izq?.id ?? null],
    ["Momentos", f.momentos.paquete ? "MOM_" + f.momentos.paquete : null],
  ];
}
const legible = (parte: string, v: string | null) =>
  v == null ? null : parte === "Torso" && v === "liso" ? "Liso" : parte === "Piernas" ? (v === "cortas" ? "Piernas cortas" : "Piernas") : parte === "Botas" ? "Botas"
    : v.split(",").map(x => nombre(x) ?? x).join(" + ");

/** Partes que cambian de pieza (o se quitan) entre `a` y `b`. */
export function cambiosEntre(a: FiguraV2 | Figura, b: FiguraV2 | Figura): Cambio[] {
  const ha = huella(completar(a)), hb = new Map(huella(completar(b)));
  return ha.filter(([k, v]) => (hb.get(k) ?? null) !== v).map(([k, v]) => ({ parte: k, antes: legible(k, v), despues: legible(k, hb.get(k) ?? null), antesId: v }));
}

/** ¿Hay que preguntar? Si algo se quita, si cambian dos partes o más, o si se va una pieza original. */
export const pideAviso = (cs: Cambio[]) =>
  cs.length >= 2 || cs.some(c => c.antes != null && c.despues == null) || cs.some(c => (c.antesId ?? "").split(",").some(esOriginal));

/**
 * Avanzado: tomar partes de un personaje (su casco, su torso…) y dejar el resto como está.
 * Las partes son las de «¡Sorpréndeme!» (pelo incluye casco y máscara; torso incluye brazos y manos).
 */
export function tomarPartes(f: FiguraV2 | Figura, personaje: FiguraV2 | Figura, partes: Iterable<Parte>): Figura {
  const g = conservar(completar(f), completar(personaje), partes);
  g.nombre = completar(f).nombre;
  return g;
}
