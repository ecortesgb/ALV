import { describe, expect, it } from "vitest";
import {
  elegirEnFiltro, porVerificar, restaurar,
  combinar, contar, decidir, estadoDe, exportar, filtrarRev, guardarRevision, leerExportado, leerRevision, quitar, sha256,
  siguientePendiente, textoAnimaciones, usarDelArchivo, vacia, type Firma,
} from "./revisionDatos";

const F = (c: string): Firma => ({ glb: c.repeat(64).slice(0, 64), anim: "b".repeat(64) });
const A = F("a"), A2 = F("c");
const ids = ["abominacion", "ant-man", "black-widow", "hulk"];
const firmas = new Map(ids.map(id => [id, A]));

describe("modo revisión: registro", () => {
  it("decide, cuenta y filtra; sin firma conocida muestra lo registrado", () => {
    let r = decidir(vacia(), "ant-man", "aprobado", " bien ", A, "2026-11-26T10:00:00Z");
    r = decidir(r, "hulk", "rechazado", "cara rota", A, "2026-11-26T10:01:00Z");
    expect(r.personajes["ant-man"]!.actual!.nota).toBe("bien");
    expect(contar(ids, r, firmas)).toEqual({ total: 4, aprobados: 1, rechazados: 1, pendientes: 2, sinRevisar: 2, deNuevo: 0 });
    expect(filtrarRev(ids, "pendientes", r, firmas)).toEqual(["abominacion", "black-widow"]);
    expect(filtrarRev(ids, "rechazados", r, firmas)).toEqual(["hulk"]);
    expect(estadoDe(r.personajes.hulk, null)).toBe("rechazado");
    expect(r.ultimo).toBe("hulk");
  });
  it("si cambia el GLB o las animaciones, sale «revisar de nuevo» y la decisión vieja queda como antecedente", () => {
    let r = decidir(vacia(), "hulk", "aprobado", "", A);
    const otras = new Map(firmas); otras.set("hulk", A2);
    expect(estadoDe(r.personajes.hulk, A2)).toBe("revisar-de-nuevo");
    expect(contar(ids, r, otras).deNuevo).toBe(1);
    r = decidir(r, "hulk", "rechazado", "brazo chueco", A2);
    expect(r.personajes.hulk!.anteriores).toHaveLength(1);
    expect(estadoDe(r.personajes.hulk, A2)).toBe("rechazado");
  });
  it("siguiente pendiente da la vuelta y no salta a aprobados; null si no queda ninguno", () => {
    let r = decidir(vacia(), "black-widow", "aprobado", "", A);
    expect(siguientePendiente(ids, "ant-man", r, firmas)).toBe("hulk");
    expect(siguientePendiente(ids, "hulk", r, firmas)).toBe("abominacion");
    for (const id of ids) r = decidir(r, id, "aprobado", "", A);
    expect(siguientePendiente(ids, "hulk", r, firmas)).toBeNull();
  });
  it("quitar decisión la vuelve pendiente y deja la nota como borrador", () => {
    const r = quitar(decidir(vacia(), "hulk", "rechazado", "cara rota", A), "hulk");
    expect(estadoDe(r.personajes.hulk, A)).toBe("sin-revisar");
    expect(r.personajes.hulk!.borrador).toBe("cara rota");
  });
  it("la firma de animaciones no depende del orden de las claves", () => {
    const a = textoAnimaciones({ animaciones: { mapa: { reposo: "Idle", saludo: "WAVE" }, respaldo: {}, vida: ["x"], sentado: null } });
    const b = textoAnimaciones({ animaciones: { mapa: { saludo: "WAVE", reposo: "Idle" }, respaldo: {}, vida: ["x"], sentado: null } });
    expect(a).toBe(b);
  });
  it("sha256 coincide con el valor conocido", async () => {
    expect(await sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("modo revisión: exportar, importar y guardar", () => {
  it("exporta e importa lo mismo; lo inválido del archivo se descarta", () => {
    const r = decidir(vacia(), "hulk", "rechazado", "cara rota", A, "2026-11-26T10:00:00Z");
    const e = exportar(ids, r, firmas, new Map([["hulk", "Hulk"]]), "2026-11-26T11:00:00Z");
    expect(e).toMatchObject({ version: 1, tipo: "alv-revision-personajes", total: 4, rechazados: 1, pendientes: 3 });
    const leido = leerExportado(JSON.parse(JSON.stringify(e)));
    expect(leido.ok && leido.personajes.hulk!.actual!.nota).toBe("cara rota");
    const malo = leerExportado({ ...e, personajes: { "../x": e.personajes.hulk, hulk: { actual: { estado: "talvez", nota: "", fecha: "x", firma: A } } } });
    expect(malo.ok && Object.keys(malo.personajes)).toEqual([]);
    expect(leerExportado({ version: 2 }).ok).toBe(false);
  });
  it("al combinar, lo nuevo se agrega y lo distinto es conflicto (no se sustituye hasta elegir)", () => {
    const mia = decidir(vacia(), "hulk", "aprobado", "", A);
    const otra = decidir(decidir(vacia(), "hulk", "rechazado", "no", A), "ant-man", "aprobado", "", A);
    const c = combinar(mia, otra.personajes);
    expect(c.conflictos).toEqual(["hulk"]);
    expect(c.agregados).toBe(1);
    expect(estadoDe(c.revision.personajes.hulk, A)).toBe("aprobado");
    const elegido = usarDelArchivo(c.revision, "hulk", otra.personajes.hulk!);
    expect(estadoDe(elegido.personajes.hulk, A)).toBe("rechazado");
    expect(elegido.personajes.hulk!.anteriores).toHaveLength(1);
  });
  it("guarda y retoma en el navegador; si falla, avisa", () => {
    const mem = new Map<string, string>();
    const alm = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const r = { ...decidir(vacia(), "hulk", "aprobado", "", A), filtro: "todos" as const, avanzar: false };
    expect(guardarRevision(r, alm)).toBe(true);
    const de = leerRevision(alm);
    expect(de).toMatchObject({ ultimo: "hulk", filtro: "todos", avanzar: false });
    expect(guardarRevision(r, { setItem: () => { throw new Error("lleno"); } })).toBe(false);
    expect(leerRevision({ getItem: () => "{roto" })).toEqual(vacia());
  });
});

describe("modo revisión: recorridos de la verificación de Codex", () => {
  it("deshacer revierte solo esa decisión y conserva lo que se hizo después", () => {
    const antes = decidir(vacia(), "hulk", "aprobado", "", A);
    const previo = antes.personajes["ant-man"];
    let r = decidir(antes, "ant-man", "aprobado", "", A);
    r = decidir(r, "black-widow", "rechazado", "dientes", A); // trabajo posterior
    r = restaurar(r, "ant-man", previo);
    expect(r.personajes["ant-man"]).toBeUndefined();
    expect(estadoDe(r.personajes["black-widow"], A)).toBe("rechazado");
    expect(estadoDe(r.personajes.hulk, A)).toBe("aprobado");
  });
  it("las decisiones sin firma comprobada quedan por verificar", () => {
    const r = decidir(decidir(vacia(), "hulk", "aprobado", "", A), "ant-man", "aprobado", "", A);
    expect(porVerificar(r, new Map(), ids)).toEqual(["ant-man", "hulk"]);
    expect(porVerificar(r, new Map([["hulk", A]]), ids)).toEqual(["ant-man"]);
  });
  it("al cambiar de filtro se elige uno de ese filtro, o ninguno si está vacío", () => {
    expect(elegirEnFiltro(["hulk"], "ant-man")).toBe("hulk");
    expect(elegirEnFiltro(["ant-man", "hulk"], "hulk")).toBe("hulk");
    expect(elegirEnFiltro([], "hulk")).toBeNull();
  });
});
