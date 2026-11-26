import { beforeEach, describe, expect, it } from "vitest";
import { combinar, leerPendientes, leerSellos, marcarPendiente, quitarPendientes } from "./capsulasPendientes";
import type { EstadoCapsulas } from "./figura3d";
import type { FiguraV2 } from "../content/personaje";

const cap = (n: string) => ({ nombre: n, figura: { version: 2 } as FiguraV2, actualizado: "" });
const est = (slots: (string | null)[], activa: number | null): EstadoCapsulas => ({ version: 1, activa, slots: slots.map(s => (s ? cap(s) : null)) });
const nombres = (e: EstadoCapsulas) => e.slots.map(s => s?.nombre ?? null);

describe("cápsulas pendientes (fase 5, Codex paso4-r1)", () => {
  beforeEach(() => { const m = new Map<string, string>(); (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; });

  it("sin pendientes manda la nube: lo borrado o cambiado en otro aparato se respeta", () => {
    const r = combinar(est(["N1", null, "N3"], 2), est(["A1", "A2", null], 0), []);
    expect(nombres(r)).toEqual(["N1", null, "N3"]);
    expect(r.activa).toBe(2);
  });
  it("un pendiente de este aparato no lo pisa la nube; los demás espacios vienen de la nube", () => {
    const r = combinar(est(["N1", "N2", "N3"], 0), est(["A1", "A2", null], 1), [1]);
    expect(nombres(r)).toEqual(["N1", "A2", "N3"]);
    expect(r.activa).toBe(1);
  });
  it("la activa de aquí solo manda si es un pendiente con figura", () => {
    expect(combinar(est(["N1", "N2", null], 1), est(["A1", "A2", null], 0), []).activa).toBe(1);
    expect(combinar(est(["N1", null, null], 0), est([null, null, "A3"], 2), [2]).activa).toBe(2);
  });
  it("marcar y quitar: solo se quita la marca del guardado que se subió", () => {
    marcarPendiente("ana", 1); marcarPendiente("ana", 2); marcarPendiente("ana", 7);
    expect(leerPendientes("ana")).toEqual([1, 2]);
    const subidos = leerSellos("ana");
    marcarPendiente("ana", 2); // se guarda otra vez el espacio 2 mientras subía
    quitarPendientes("ana", subidos);
    expect(leerPendientes("ana")).toEqual([2]);
    quitarPendientes("ana", leerSellos("ana"));
    expect(leerPendientes("ana")).toEqual([]);
    expect(leerPendientes("beto")).toEqual([]);
  });
});
