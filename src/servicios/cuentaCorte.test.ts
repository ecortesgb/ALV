// Frontera v3 en las cápsulas de la nube (Codex, v3-directo-r1): con el corte sube la v3 DIRECTA, nunca borra por estar vacío,
// omite lo que no es v3 sin borrarlo y solo activa lo que sí subió. Sin corte, todo como antes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

type Fila = { jugador: string; capsula: number; nombre: string; figura: unknown; activa?: boolean; actualizado?: string };
const db = { filas: [] as Fila[], llamadas: [] as unknown[][] };
vi.mock("./cliente", () => ({
  hayNube: true, GENERICO: "x", cuentaActiva: () => null, fijarUsuario: () => {}, fijarArticulos: () => {},
  uidActual: async () => "u1",
  cliente: {
    from: () => ({
      select: () => ({ eq: async () => ({ data: db.filas, error: null }) }),
      upsert: async (filas: Fila[]) => { db.llamadas.push(["upsert", filas.map(f => [f.capsula, (f.figura as { version: number }).version])]); return { error: null }; },
      delete: () => ({ eq: () => ({ in: async (_c: string, caps: number[]) => { db.llamadas.push(["delete", caps]); return { error: null }; } }) }),
    }),
    rpc: async (_n: string, a: unknown) => { db.llamadas.push(["activar", a]); return { error: null }; },
  },
}));

const { cargarCapsulasNube, guardarCapsulasNube } = await import("./cuenta");
const { proyectar } = await import("../personajes/integracion");
const { claveCapsulas } = await import("../app/figura3d");
const { prepararEpoca, marcarPendiente, leerPendientes } = await import("../app/capsulasPendientes");

const v3 = { version: 3 as const, familia: "minifig", origen: { tipo: "catalogo" as const, personaje: "thor", version: "base", revision: 1 }, piezas: {},
  momentos: { paquete: null, espera: "respirar", victoria: "salto-puno", derrota: "cabeza-baja", punto: "puno-arriba" }, extensiones: {} };
const cap = (figura: unknown) => ({ nombre: "x", figura: figura as never, actualizado: "" });

describe("cápsulas en la nube con y sin corte", () => {
  beforeEach(() => { db.filas = []; db.llamadas = []; mem.clear(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("con corte: lo que llega v3 directo entra como puente; lo inválido y las v2 no entran", async () => {
    vi.stubEnv("VITE_CORTE_V3", "1");
    db.filas = [{ jugador: "u1", capsula: 1, nombre: "Thor", figura: v3, activa: true }, { jugador: "u1", capsula: 2, nombre: "Rota", figura: { version: 3, familia: 7 } },
      { jugador: "u1", capsula: 3, nombre: "Vieja", figura: { version: 2 } }];
    const e = (await cargarCapsulasNube())!;
    expect(e.slots[2]).toBeNull(); // una v2 de la base (antes de la 046) no cuenta con el corte
    expect((e.slots[0]!.figura as unknown as { extensiones: { alv: { v3: unknown } } }).extensiones.alv.v3).toEqual(v3);
    expect(e.slots[1]).toBeNull();
    expect(e.activa).toBe(0);
  });
  it("con corte: sube la v3 directa, NO borra vacíos, omite la v2 sin borrarla, activa solo lo subido y no se anuncia sincronizado", async () => {
    vi.stubEnv("VITE_CORTE_V3", "1");
    const ok = await guardarCapsulasNube({ version: 1, activa: 2, slots: [cap(proyectar(v3)), null, cap({ version: 2, cabello: "x" })] });
    expect(ok).toBe(false);
    expect(db.llamadas).toEqual([["upsert", [[1, 3]]]]); // ni delete, ni activar la 3 (no se subió)
  });
  it("con corte y todo v3: activa y da true", async () => {
    vi.stubEnv("VITE_CORTE_V3", "1");
    expect(await guardarCapsulasNube({ version: 1, activa: 0, slots: [cap(proyectar(v3)), null, null] })).toBe(true);
    expect(db.llamadas).toEqual([["upsert", [[1, 3]]], ["activar", { p_capsula: 1 }]]);
  });
  it("sin corte: como siempre (sube la v2/puente tal cual, borra vacíos, activa)", async () => {
    expect(await guardarCapsulasNube({ version: 1, activa: 0, slots: [cap({ version: 2 }), null, null] })).toBe(true);
    expect(db.llamadas).toEqual([["upsert", [[1, 2]]], ["delete", [2, 3]], ["activar", { p_capsula: 1 }]]);
  });
  it("con corte las cápsulas y los pendientes viven en claves aparte; al revertir se borran los pendientes de antes", () => {
    expect(claveCapsulas("ana")).toBe("alv-capsulas-ana");
    marcarPendiente("ana", 1);
    vi.stubEnv("VITE_CORTE_V3", "1");
    expect(claveCapsulas("ana")).toBe("alv-capsulas-c3-ana");
    expect(leerPendientes("ana")).toEqual([]); // los de antes del corte no se ven
    marcarPendiente("ana", 2);
    prepararEpoca();
    vi.unstubAllEnvs();
    expect(leerPendientes("ana")).toEqual([1]);
    prepararEpoca(); // build sin corte después de uno con corte: vuelve a empezar desde la nube
    expect(leerPendientes("ana")).toEqual([]);
    expect(mem.get("alv-epoca-figuras")).toBe("v2");
  });
});
