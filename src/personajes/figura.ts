// Figura del jugador v3 (§5 del formato): crearla desde el catálogo y validar la que llega de fuera.
import { familia } from "./familias";
import { esId, esParte, type Ficha, type FiguraV3, type PiezaPuesta } from "./tipos";

const MOMENTOS_BASE: FiguraV3["momentos"] = { paquete: null, espera: "respirar", victoria: "salto-puno", derrota: "cabeza-baja", punto: "puno-arriba" };
const TOPE_BYTES = 8192;

/** Figura nueva a partir de un personaje del catálogo, sin tocar el estilo de movimiento que ya tenía el jugador. */
export function deCatalogo(ficha: Ficha, antes?: FiguraV3 | null, version = "base"): FiguraV3 {
  return {
    version: 3,
    familia: ficha.familia,
    origen: { tipo: "catalogo", personaje: ficha.id, version, revision: 1 },
    piezas: {},
    momentos: antes?.momentos ?? { ...MOMENTOS_BASE },
    extensiones: antes?.extensiones ?? {},
  };
}

const esPuesta = (x: unknown): x is PiezaPuesta => {
  const p = x as PiezaPuesta | null;
  if (!p || typeof p !== "object" || !esId(p.id)) return false;
  if (p.var !== undefined && !esId(p.var)) return false;
  if (p.tintes !== undefined && (typeof p.tintes !== "object" || !Object.entries(p.tintes).every(([k, v]) => /^[a-z_]{1,20}$/.test(k) && esId(v)))) return false;
  return true;
};

/** Valida una figura que llega del aparato, de la nube o de otro jugador. null si no es una v3 válida. */
export function leerFigura(x: unknown): FiguraV3 | null {
  if (!x || typeof x !== "object") return null;
  let s: string;
  try { s = JSON.stringify(x); } catch { return null; }
  if (s.length > TOPE_BYTES) return null;
  const f = x as Record<string, unknown>;
  if (f.version !== 3 || !esId(f.familia) || !familia(f.familia)) return null;
  const o = f.origen as Record<string, unknown> | null;
  if (!o || (o.tipo !== "creado" && !(o.tipo === "catalogo" && esId(o.personaje) && esId(o.version) && Number.isInteger(o.revision)))) return null;
  const piezas = f.piezas as Record<string, unknown> | null;
  if (!piezas || typeof piezas !== "object" || Array.isArray(piezas)) return null;
  if (!Object.entries(piezas).every(([k, v]) => esParte(k) && esPuesta(v))) return null;
  const m = f.momentos as Record<string, unknown> | null;
  const momentos = m && typeof m === "object" && ["espera", "victoria", "derrota", "punto"].every(k => typeof m[k] === "string" && (m[k] as string).length <= 40)
    && (m.paquete === null || (typeof m.paquete === "string" && m.paquete.length <= 40))
    ? (m as FiguraV3["momentos"]) : { ...MOMENTOS_BASE };
  const ext = f.extensiones && typeof f.extensiones === "object" && !Array.isArray(f.extensiones) ? (f.extensiones as FiguraV3["extensiones"]) : {};
  return { version: 3, familia: f.familia, origen: o as FiguraV3["origen"], piezas: piezas as FiguraV3["piezas"], momentos, extensiones: ext };
}

/** Apodo de la figura (mismo límite que hoy: 24 caracteres, sin saltos). */
export function apodo(f: FiguraV3 | null | undefined): string | null {
  const a = f?.extensiones.alv?.apodo;
  if (typeof a !== "string") return null;
  const t = a.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24);
  return t || null;
}
