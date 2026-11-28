import { describe, expect, it } from "vitest";
import { armarRueda, pagina } from "./categorias";

describe("círculo por categorías", () => {
  const sets = [
    { set: "vuelo", nombre: "Volar", movs: [{ id: "vuelo-despegar", nombre: "Despegar" }] },
    { set: "pelea", nombre: "Pelea", movs: [{ id: "pelea-golpe1", nombre: "Gancho" }, { id: "pelea-golpe2", nombre: "Patada" }] },
    { set: "base", nombre: "Bailes y burlas", movs: [{ id: "base-bailar", nombre: "Breakdance" }, { id: "base-burla", nombre: "Burla" }] },
    { set: "reacciones", nombre: "Reacciones", movs: [{ id: "reacciones-aturdido", nombre: "Mareado" }] },
  ];
  it("ordena por intención y lo propio va primero", () => {
    const r = armarRueda([{ id: "repulsor", nombre: "Repulsor", tipo: "rayo" }], sets);
    expect(r.principal).toEqual(["poderes", "especial", "pelea", "fiesta", "gestos"]);
    expect(r.opciones.poderes.map(o => o.cual)).toEqual(["poder:repulsor", "mov:vuelo-despegar"]);
    expect(r.opciones.poderes[0]!.tipo).toBe("rayo");
    expect(r.opciones.pelea.map(o => o.tipo)).toEqual(["golpe", "patada"]);
    expect(r.opciones.fiesta.map(o => o.tipo)).toEqual(["baile", "burla"]);
    expect(r.opciones.gestos.map(o => o.cual)).toEqual(["saludar", "victoria", "derrota", "mov:reacciones-aturdido"]);
  });
  it("sin poderes ni armas, esas categorías no salen", () => {
    expect(armarRueda([], []).principal).toEqual(["especial", "gestos"]);
  });
  it("más de 8: páginas de 7 con «Más» que da la vuelta", () => {
    const l = Array.from({ length: 10 }, (_, i) => ({ cual: "mov:x" + i, txt: "x" + i, tipo: "golpe" as const }));
    expect(pagina(l, 0).map(o => o.cual)).toEqual([...l.slice(0, 7).map(o => o.cual), "mas"]);
    expect(pagina(l, 1).map(o => o.cual)).toEqual([...l.slice(7).map(o => o.cual), "mas"]);
    expect(pagina(l, 2)[0]!.cual).toBe("mov:x0");
    expect(pagina(l.slice(0, 8), 0)).toHaveLength(8);
  });
});
