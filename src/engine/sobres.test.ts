import { describe, expect, it } from "vitest";
import { crearAzar } from "./azar";
import { abrirSobre, rarezaDe, SOBRES } from "./sobres";

const pool = [
  { id: "a", precio: 40 }, { id: "b", precio: 100 }, { id: "c", precio: 200 }, { id: "d", precio: 300 }, { id: "e", precio: 50 },
];

describe("sobres", () => {
  it("rareza según precio", () => {
    expect(rarezaDe(60)).toBe("comun");
    expect(rarezaDe(120)).toBe("rara");
    expect(rarezaDe(240)).toBe("epica");
    expect(rarezaDe(480)).toBe("legendaria");
  });
  it("da tantas cartas como indica el sobre, sin repetir", () => {
    for (const def of SOBRES) {
      const cartas = abrirSobre(def, crearAzar(7), pool);
      expect(cartas.length).toBe(Math.min(def.cartas, pool.length));
      expect(new Set(cartas.map(c => c.id)).size).toBe(cartas.length);
    }
  });
  it("con la misma semilla sale lo mismo", () => {
    const a = abrirSobre(SOBRES[2]!, crearAzar(99), pool);
    const b = abrirSobre(SOBRES[2]!, crearAzar(99), pool);
    expect(a).toEqual(b);
  });
  it("si no quedan artículos, el sobre da menos cartas y no falla", () => {
    expect(abrirSobre(SOBRES[2]!, crearAzar(1), [])).toEqual([]);
    expect(abrirSobre(SOBRES[2]!, crearAzar(1), [{ id: "x", precio: 40 }]).length).toBe(1);
  });
});
