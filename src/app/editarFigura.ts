// Ediciones de la figura (versión 2 de Minifig Studio) que usa el personalizador. Funciones puras: reciben una figura y
// devuelven otra; nunca la modifican. Siguen las reglas de nucleo/minifig-core.js (resolver):
//   identidad (piel, rostro, detalles, cabello) · ropa (torso, brazos, guantes, cadera, piernas) · manual (ajustes de un
//   solo lado: brazo_izq, mano_der, pierna_izq…) · accesorios (cabeza = casco, cara = máscara, espalda = cuello o capa,
//   mano_der / mano_izq = objetos).
// Básico y Completo editan la MISMA figura: nada de aquí borra lo que el otro modo personalizó, salvo cuando el jugador
// elige «ambos» lados (eso sí unifica los dos).
import type { FiguraV2 } from "../content/personaje";

export interface Pz { id: string; color?: string }
export type Lado = "ambos" | "izq" | "der";
export interface Figura {
  version: 2; nombre: string;
  identidad: { piel: string; cabeza: string | null; rostro: string | null; detalles: string[]; cabello: { id: string; color: string } | null; estilo: string };
  ropa: {
    torso: { id: string | null; color: string; estampado: string | null; colores: string[]; texto: string; imagen: unknown };
    mangas: string | null; brazos: string | null; guantes: string | null;
    cadera: { id: string | null; color: string; cinturon: { id: string; color: string } | null };
    piernas: { tipo: "normal" | "cortas"; id: string | null; color: string; botas: string | null };
  };
  traje: { id: string | null; encima: boolean; usar: { pelo: boolean; rostro: boolean }; quitar: string[] };
  manual: Record<string, Record<string, unknown> | undefined>;
  accesorios: { cabeza: Pz | null; cara: Pz | null; espalda: Pz | null; mano_der: Pz | null; mano_izq: Pz | null };
  momentos: { paquete: string | null; espera: string; victoria: string; derrota: string; punto: string };
  extensiones: Record<string, unknown>;
}

/** Figura de partida (igual que MinifigCore.nueva(), con colores de ALV). */
export function figuraNueva(): Figura {
  return {
    version: 2, nombre: "Mi figura",
    identidad: { piel: "#f2cd37", cabeza: null, rostro: "FACE_001", detalles: [], cabello: { id: "HAIR_001", color: "#582a12" }, estilo: "neutro" },
    ropa: {
      torso: { id: null, color: "#c91a09", estampado: null, colores: ["#ffffff", "#1b2a34", "#6b4a2b"], texto: "", imagen: null },
      mangas: null, brazos: null, guantes: null,
      cadera: { id: null, color: "#0055bf", cinturon: null },
      piernas: { tipo: "normal", id: null, color: "#0055bf", botas: null },
    },
    traje: { id: null, encima: true, usar: { pelo: false, rostro: false }, quitar: [] },
    manual: {},
    accesorios: { cabeza: null, cara: null, espalda: null, mano_der: null, mano_izq: null },
    momentos: { paquete: null, espera: "respirar", victoria: "salto-puno", derrota: "cabeza-baja", punto: "puno-arriba" },
    extensiones: {},
  };
}

const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
/** Mezcla profunda como la de minifig-core: los arreglos se reemplazan. */
function mezclar(a: Record<string, unknown>, b: Record<string, unknown>) {
  for (const k of Object.keys(b)) {
    const v = b[k];
    if (esObjeto(v) && esObjeto(a[k])) mezclar(a[k] as Record<string, unknown>, v);
    else a[k] = structuredClone(v);
  }
  return a;
}
/** Cualquier figura guardada, con todos sus campos (lo que falte sale de figuraNueva). */
export function completar(f: FiguraV2 | Figura | null | undefined): Figura {
  const base = figuraNueva() as unknown as Record<string, unknown>;
  return (f ? mezclar(base, f as unknown as Record<string, unknown>) : base) as unknown as Figura;
}
const editar = (f: FiguraV2 | Figura, cambio: (g: Figura) => void): Figura => { const g = completar(f); cambio(g); return g; };

// ---------- Pelo y casco ----------
export const peloDe = (f: Figura) => f.identidad.cabello;
export const ponerPelo = (f: Figura, id: string | null) => editar(f, g => { g.identidad.cabello = id ? { id, color: g.identidad.cabello?.color ?? "#582a12" } : null; });
export const colorPelo = (f: Figura, color: string) => editar(f, g => { if (g.identidad.cabello) g.identidad.cabello.color = color; });
export const ponerCasco = (f: Figura, id: string | null, color: string) => editar(f, g => { g.accesorios.cabeza = id ? { id, color: g.accesorios.cabeza?.color ?? color } : null; });
export const colorCasco = (f: Figura, color: string) => editar(f, g => { if (g.accesorios.cabeza) g.accesorios.cabeza.color = color; });

// ---------- Cabeza ----------
export const ponerPiel = (f: Figura, hex: string) => editar(f, g => { g.identidad.piel = hex; });
export const ponerRostro = (f: Figura, id: string) => editar(f, g => { g.identidad.rostro = id; g.accesorios.cara = null; });
/** Lentes, barbas, pecas: se prenden y apagan. Dos que ocupan el mismo lugar (dos lentes) no van juntos. */
export function alternarDetalle(f: Figura, id: string | null, ocupa: (id: string) => string | null) {
  return editar(f, g => {
    if (!id) { g.identidad.detalles = []; return; }
    const d = g.identidad.detalles;
    if (d.includes(id)) { g.identidad.detalles = d.filter(x => x !== id); return; }
    const o = ocupa(id);
    g.identidad.detalles = [...(o ? d.filter(x => ocupa(x) !== o) : d), id];
  });
}
export const ponerMascara = (f: Figura, id: string | null) => editar(f, g => { g.accesorios.cara = id ? { id } : null; });

// ---------- Cuello y capa (los dos viven en accesorios.espalda; con capa, el cuello va en manual._cuelloExtra) ----------
const esCapa = (p: Pz | null | undefined) => !!p && p.id.startsWith("CAPE_");
export const capaDe = (f: Figura): Pz | null => (esCapa(f.accesorios.espalda) ? f.accesorios.espalda : null);
export function cuelloDe(f: Figura): Pz | null {
  const e = f.accesorios.espalda;
  if (e && !esCapa(e)) return e;
  return esCapa(e) ? ((f.manual._cuelloExtra as Pz | undefined) ?? null) : null;
}
export function ponerCuello(f: Figura, p: Pz | null) {
  return editar(f, g => {
    if (esCapa(g.accesorios.espalda)) { if (p) g.manual._cuelloExtra = { ...p }; else delete g.manual._cuelloExtra; }
    else g.accesorios.espalda = p ? { ...p } : null;
  });
}
export function ponerCapa(f: Figura, p: Pz | null) {
  return editar(f, g => {
    const cuello = cuelloDe(g);
    delete g.manual._cuelloExtra;
    if (p) { g.accesorios.espalda = { ...p }; if (cuello) g.manual._cuelloExtra = { ...cuello }; }
    else g.accesorios.espalda = cuello ? { ...cuello } : null;
  });
}

// ---------- Torso ----------
export const ponerEstampado = (f: Figura, id: string | null) => editar(f, g => { g.ropa.torso.estampado = id; });
export const colorTorso = (f: Figura, hex: string) => editar(f, g => { g.ropa.torso.color = hex; });
export const colorEstampado = (f: Figura, i: number, hex: string) => editar(f, g => {
  const c = g.ropa.torso.colores.slice(0, 3);
  while (c.length < 3) c.push(["#ffffff", "#1b2a34", "#6b4a2b"][c.length]!);
  c[i] = hex; g.ropa.torso.colores = c;
});

// ---------- Brazos y manos ----------
const CLAVE: Record<"brazo" | "mano" | "pierna", Record<Exclude<Lado, "ambos">, string>> = {
  brazo: { izq: "brazo_izq", der: "brazo_der" }, mano: { izq: "mano_izq", der: "mano_der" }, pierna: { izq: "pierna_izq", der: "pierna_der" },
};
/** Color base (sin ajustes de un lado) de brazos, manos o piernas, como lo calcula resolver(). */
function baseDe(g: Figura, parte: "brazo" | "mano" | "pierna"): string {
  if (parte === "pierna") return g.ropa.piernas.color;
  if (parte === "mano") return g.ropa.guantes ?? g.identidad.piel;
  return g.ropa.brazos ?? (g.ropa.mangas === "sin" ? g.identidad.piel : g.ropa.torso.color);
}
/**
 * Pinta un solo lado. Trampa del motor: el ajuste del lado derecho cambia el color base de AMBOS lados (resolver hace
 * `S.piernas.color = pierna_der.color`), así que al pintar el derecho el izquierdo se fija a como se veía.
 */
function pintarLado(g: Figura, parte: "brazo" | "mano" | "pierna", lado: Exclude<Lado, "ambos">, hex: string) {
  const izq = CLAVE[parte].izq;
  if (lado === "der" && !g.manual[izq]?.color) colorManual(g, izq, colorVisible(g, parte, "izq"));
  colorManual(g, CLAVE[parte][lado], hex);
}
function colorVisible(g: Figura, parte: "brazo" | "mano" | "pierna", lado: Exclude<Lado, "ambos">): string {
  const der = g.manual[CLAVE[parte].der]?.color as string | undefined;
  const propio = g.manual[CLAVE[parte][lado]]?.color as string | undefined;
  return propio ?? der ?? baseDe(g, parte);
}
function colorManual(g: Figura, clave: string, hex: string | null) {
  const m = { ...(g.manual[clave] ?? {}) };
  if (hex) m.color = hex; else delete m.color;
  if (Object.keys(m).length) g.manual[clave] = m; else delete g.manual[clave];
}
/** Brazos: "torso" = mangas del color del torso, "piel" = sin mangas, o un color. */
export function ponerBrazos(f: Figura, lado: Lado, valor: "torso" | "piel" | string) {
  return editar(f, g => {
    if (lado === "ambos") {
      g.ropa.brazos = valor === "torso" || valor === "piel" ? null : valor;
      g.ropa.mangas = valor === "piel" ? "sin" : valor === "torso" ? "larga" : g.ropa.mangas;
      colorManual(g, CLAVE.brazo.izq, null); colorManual(g, CLAVE.brazo.der, null);
      return;
    }
    pintarLado(g, "brazo", lado, valor === "torso" ? g.ropa.torso.color : valor === "piel" ? g.identidad.piel : valor);
  });
}
/** Manos: "piel" = sin guantes, o un color. */
export function ponerManos(f: Figura, lado: Lado, valor: "piel" | string) {
  return editar(f, g => {
    if (lado === "ambos") { g.ropa.guantes = valor === "piel" ? null : valor; colorManual(g, CLAVE.mano.izq, null); colorManual(g, CLAVE.mano.der, null); return; }
    pintarLado(g, "mano", lado, valor === "piel" ? g.identidad.piel : valor);
  });
}
/** Color que se ve en un lado (para marcar la muestra elegida). */
export function colorDeLado(f: Figura, parte: "brazo" | "mano" | "pierna", lado: Lado): string | null {
  if (lado !== "ambos") return colorVisible(f, parte, lado);
  if (parte === "brazo") return f.ropa.brazos ?? (f.ropa.mangas === "sin" ? "piel" : "torso");
  if (parte === "mano") return f.ropa.guantes ?? "piel";
  return f.ropa.piernas.color;
}
/** ¿Tiene un lado distinto del otro? (para avisarlo en Básico) */
export const ladosPersonalizados = (f: Figura, parte: "brazo" | "mano" | "pierna") => !!(f.manual[CLAVE[parte].izq]?.color || f.manual[CLAVE[parte].der]?.color);

// ---------- Cadera, piernas y botas ----------
export const colorCadera = (f: Figura, hex: string) => editar(f, g => { g.ropa.cadera.color = hex; });
export const ponerCinturon = (f: Figura, color: string | null) => editar(f, g => { g.ropa.cadera.cinturon = color ? { id: "BELT_001", color } : null; });
export const tipoPiernas = (f: Figura, tipo: "normal" | "cortas") => editar(f, g => { g.ropa.piernas.tipo = tipo; g.ropa.piernas.id = null; });
/** Color de piernas. `conCadera` (Básico, «piernas completas»): la cadera toma el mismo color. */
export function colorPiernas(f: Figura, lado: Lado, hex: string, conCadera = false) {
  return editar(f, g => {
    if (lado === "ambos") {
      g.ropa.piernas.color = hex; if (conCadera) g.ropa.cadera.color = hex;
      if (!conCadera) { colorManual(g, CLAVE.pierna.izq, null); colorManual(g, CLAVE.pierna.der, null); }
      return;
    }
    pintarLado(g, "pierna", lado, hex);
  });
}
export const ponerBotas = (f: Figura, color: string | null) => editar(f, g => { g.ropa.piernas.botas = color; });

// ---------- Objetos ----------
export const ponerObjeto = (f: Figura, mano: "mano_der" | "mano_izq", p: Pz | null) => editar(f, g => { g.accesorios[mano] = p ? { ...p } : null; });

// ---------- Detalles por grupo (lentes / barba / marcas) ----------
/** Quita los detalles de un grupo (`ocupa`: "ojos", "barba"; null = marcas sueltas como pecas). */
export const quitarDetalles = (f: Figura, ocupa: (id: string) => string | null, grupo: string | null) =>
  editar(f, g => { g.identidad.detalles = g.identidad.detalles.filter(x => ocupa(x) !== grupo); });

// ---------- Momentos, nombre ----------
export interface Paquete { id: string | null; espera: string; victoria: string; derrota: string; punto: string }
/** Los momentos de siempre (MOMENTOS_BASE de minifig-core). */
export const MOMENTOS_NORMALES: Paquete = { id: null, espera: "respirar", victoria: "salto-puno", derrota: "cabeza-baja", punto: "puno-arriba" };
export const ponerMomentos = (f: Figura, p: Paquete) =>
  editar(f, g => { g.momentos = { paquete: p.id, espera: p.espera, victoria: p.victoria, derrota: p.derrota, punto: p.punto }; });
/** Apodo de la figura (nombre del outfit). No es el nombre de la cuenta. */
export const LARGO_APODO = 24;
export const limpiarApodo = (s: string) => s.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").slice(0, LARGO_APODO);
export const ponerApodo = (f: Figura, nombre: string) => editar(f, g => {
  const apodo = limpiarApodo(nombre).trim();
  g.nombre = apodo || "Mi figura";
  // extensiones.alv.apodo: solo existe si el jugador lo escribió (las figuras viejas traen nombres de personaje en `nombre`).
  const alv = { ...((g.extensiones.alv as Record<string, unknown> | undefined) ?? {}) };
  if (apodo) alv.apodo = apodo; else delete alv.apodo;
  g.extensiones = { ...g.extensiones, alv };
});
