// Cola del aviso de logro: hasta 4 salen todos; con más, los 3 más raros y «+N logros más».
import { describe, expect, it } from "vitest";
import { armarCola } from "./AvisoLogro";

describe("armarCola", () => {
  it("con 4 o menos salen todos en orden", () => {
    const xs = [{ nombre: "a" }, { nombre: "b" }, { nombre: "c" }, { nombre: "d" }];
    expect(armarCola(xs)).toEqual(xs);
  });
  it("con más de 4: los 3 más raros y cuántos faltan", () => {
    const r = armarCola([
      { nombre: "c1", rareza: "comun" as const }, { nombre: "l", rareza: "legendaria" as const }, { nombre: "c2", rareza: "comun" as const },
      { nombre: "e", rareza: "epica" as const }, { nombre: "r", rareza: "rara" as const }, { nombre: "c3", rareza: "comun" as const },
    ]);
    expect(r.map(x => x.nombre)).toEqual(["l", "e", "r", "+3 logros más"]);
    expect(r[3]!.tipo).toBe("mas");
  });
});
