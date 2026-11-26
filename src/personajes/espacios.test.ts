import { describe, expect, it } from "vitest";
import { destinoGuardado } from "./espacios";

const vacio = { figura: null, antes: false };
const figura = { figura: {}, antes: false };
const antes = { figura: null, antes: true };

describe("destinoGuardado", () => {
  it("el vacío elegido gana al activo y al primer vacío", () => {
    expect(destinoGuardado([vacio, figura, vacio], 1, 2)).toBe(2);
    expect(destinoGuardado([vacio, figura, vacio], null, 2)).toBe(2);
    expect(destinoGuardado([vacio, figura, vacio], 1, 0)).toBe(0);
  });

  it.each([figura, antes])("ignora el elegido ocupado: %j", ocupado => {
    expect(destinoGuardado([vacio, ocupado, figura], 2, 1)).toBe(2);
    expect(destinoGuardado([vacio, ocupado, figura], null, 1)).toBe(0);
  });

  it.each([-1, 3, 10, 0.5, NaN, Infinity])("ignora el índice inválido %s", elegido => {
    expect(destinoGuardado([figura, vacio, antes], 0, elegido)).toBe(0);
    expect(destinoGuardado([figura, vacio, antes], null, elegido)).toBe(1);
  });

  it("sin elegido conserva el activo, incluido el índice cero", () => {
    expect(destinoGuardado([figura, vacio, antes], 0, null)).toBe(0);
    expect(destinoGuardado([vacio, figura, antes], 1, null)).toBe(1);
  });

  it("sin elegido ni activo usa el primer vacío", () => {
    expect(destinoGuardado([antes, vacio, vacio], null, null)).toBe(1);
  });

  it("sin elegido ni activo usa cero si no hay vacíos", () => {
    expect(destinoGuardado([figura, antes, figura], null, null)).toBe(0);
    expect(destinoGuardado([], null, null)).toBe(0);
  });
});
