// Guardar «Mi personaje» con la nube simulada (fase 5, Codex paso4-r1): nunca se sube sin leer la nube, lo pendiente
// no lo pisa la nube y se reintenta.
import { beforeEach, describe, expect, it, vi } from "vitest";

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };

type Estado = { version: 1; activa: number | null; slots: ({ nombre: string; figura: unknown; actualizado: string } | null)[] };
const nube: { estado: Estado | null; leeBien: boolean; subeBien: boolean; subidas: Estado[]; retener: Promise<void> | null } = { estado: null, leeBien: true, subeBien: true, subidas: [], retener: null };
vi.mock("../servicios/cliente", () => ({ hayNube: true }));
vi.mock("../servicios/cuenta", () => ({
  cargarCapsulasNube: async () => (nube.leeBien ? structuredClone(nube.estado ?? { version: 1, activa: null, slots: [null, null, null] }) : null),
  guardarCapsulasNube: async (e: Estado) => { if (nube.retener) await nube.retener; if (!nube.subeBien) return false; nube.subidas.push(structuredClone(e)); nube.estado = structuredClone(e); return true; },
}));
vi.mock("../servicios/enlace", () => ({ enlace: { activarCapsula: async () => {} } }));
vi.mock("./Personalizador", () => ({ Personalizador: () => null }));
vi.mock("../app/sonido", () => ({ sonar: () => {} }));

const { guardarFiguraNueva, sincronizar } = await import("./Personalizar");
const { leerCapsulas, escribirCapsulas } = await import("../app/figura3d");
const { leerPendientes } = await import("../app/capsulasPendientes");

const v3 = (personaje: string) => ({ version: 3 as const, familia: "minifig", origen: { tipo: "catalogo" as const, personaje, version: "base", revision: 1 }, piezas: {},
  momentos: { paquete: null, espera: "respirar", victoria: "salto-puno", derrota: "cabeza-baja", punto: "puno-arriba" }, extensiones: {} });
const personaje = (e: Estado | null, i: number) => (e?.slots[i]?.figura as { extensiones?: { alv?: { v3?: { origen?: { personaje?: string } } } } } | undefined)?.extensiones?.alv?.v3?.origen?.personaje ?? null;
const U = "ana";

describe("guardar figura nueva con la nube (simulada)", () => {
  beforeEach(() => { mem.clear(); nube.estado = null; nube.leeBien = true; nube.subeBien = true; nube.subidas = []; nube.retener = null; });

  it("si la lectura de la nube falla NO se sube nada: queda aquí y pendiente", async () => {
    nube.estado = { version: 1, activa: 2, slots: [null, null, { nombre: "Otro aparato", figura: { version: 2 }, actualizado: "" }] };
    nube.leeBien = false;
    expect(await guardarFiguraNueva(U, 0, v3("thor"), "Thor")).toBe("local");
    expect(nube.subidas).toEqual([]);
    expect(personaje(leerCapsulas(U), 0)).toBe("thor");
    expect(leerPendientes(U)).toEqual([0]);
    // Vuelve la conexión: lee, combina (respeta el espacio 3 de otro aparato) y sube.
    nube.leeBien = true;
    expect(await sincronizar(U)).toBe(true);
    expect(nube.subidas).toHaveLength(1);
    expect(personaje(nube.estado, 0)).toBe("thor");
    expect(nube.estado!.slots[2]?.nombre).toBe("Otro aparato");
    expect(leerPendientes(U)).toEqual([]);
  });

  it("si la subida falla queda pendiente; al cargar de nuevo la nube no lo pisa y el reintento lo sube", async () => {
    nube.estado = { version: 1, activa: 0, slots: [{ nombre: "Vieja", figura: { version: 2 }, actualizado: "" }, null, null] };
    escribirCapsulas(U, structuredClone(nube.estado) as never);
    nube.subeBien = false;
    expect(await guardarFiguraNueva(U, 1, v3("hulk"), "Hulk")).toBe("local");
    expect(leerPendientes(U)).toEqual([1]);
    // Otra sincronización (p. ej. al volver a entrar) con la subida todavía caída: lo de aquí sigue.
    expect(await sincronizar(U)).toBe(false);
    expect(personaje(leerCapsulas(U), 1)).toBe("hulk");
    expect(leerCapsulas(U).activa).toBe(1);
    nube.subeBien = true;
    expect(await sincronizar(U)).toBe(true);
    expect(personaje(nube.estado, 1)).toBe("hulk");
    expect(nube.estado!.slots[0]?.nombre).toBe("Vieja");
    expect(nube.estado!.activa).toBe(1);
    expect(leerPendientes(U)).toEqual([]);
  });

  it("sin pendientes manda la nube (lo cambiado en otro aparato se respeta)", async () => {
    escribirCapsulas(U, { version: 1, activa: 0, slots: [{ nombre: "Local viejo", figura: { version: 2 }, actualizado: "" }, null, null] } as never);
    nube.estado = { version: 1, activa: 0, slots: [{ nombre: "De la nube", figura: { version: 2 }, actualizado: "" }, null, null] };
    expect(await sincronizar(U)).toBe(true);
    expect(leerCapsulas(U).slots[0]?.nombre).toBe("De la nube");
    expect(nube.subidas).toEqual([]);
  });

  it("otro guardado del MISMO espacio mientras sube el primero no se pierde (Codex, paso4-verif)", async () => {
    let soltar!: () => void;
    nube.retener = new Promise<void>(r => { soltar = r; });
    const a = guardarFiguraNueva(U, 0, v3("thor"), "Thor");
    await new Promise(r => setTimeout(r, 0)); // A ya leyó la nube y está subiendo (retenida)
    const b = guardarFiguraNueva(U, 0, v3("hulk"), "Hulk");
    expect(personaje(leerCapsulas(U), 0)).toBe("hulk");
    soltar(); nube.retener = null;
    expect(await Promise.all([a, b])).toEqual(["sincronizado", "sincronizado"]);
    expect(personaje(nube.estado, 0)).toBe("hulk");
    expect(personaje(leerCapsulas(U), 0)).toBe("hulk");
    expect(leerPendientes(U)).toEqual([]);
  });

  it("tras revertir el corte la primera sincronización toma la nube tal cual (aunque esté vacía) y no sube nada", async () => {
    escribirCapsulas(U, { version: 1, activa: 0, slots: [{ nombre: "Local", figura: { version: 2 }, actualizado: "" }, null, null] } as never);
    nube.estado = null; // nube vacía
    expect(await sincronizar(U, { desdeNube: true })).toBe(true);
    expect(nube.subidas).toEqual([]);
    expect(leerCapsulas(U).slots.every(s => !s)).toBe(true);
  });

  it("dos guardados seguidos van en fila y los dos llegan", async () => {
    const a = guardarFiguraNueva(U, 0, v3("thor"), "Thor"), b = guardarFiguraNueva(U, 1, v3("hulk"), "Hulk");
    expect(await Promise.all([a, b])).toEqual(["sincronizado", "sincronizado"]);
    expect([personaje(nube.estado, 0), personaje(nube.estado, 1)]).toEqual(["thor", "hulk"]);
  });
});
