import { beforeEach, describe, expect, it } from "vitest";
import { anotarCarta, mascaraSalieron, olvidarMazos, salieronDe } from "./cartasSalieron";
import { yaSalio } from "../engine/yaSalieron";

const memoria = new Map<string, string>();
beforeEach(() => {
  memoria.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => memoria.get(k) ?? null, setItem: (k: string, v: string) => void memoria.set(k, v), removeItem: (k: string) => void memoria.delete(k),
  };
});

describe("Cartas que ya salieron en este aparato", () => {
  it("anota solo cartas del contenido, sin repetir", () => {
    anotarCarta("verdad-001"); anotarCarta("verdad-001"); anotarCarta("reto-002"); anotarCarta("dados-3-0"); anotarCarta(undefined);
    expect(salieronDe(["verdad", "reto"])).toEqual(["verdad-001", "reto-002"]);
    expect(salieronDe(["verdad"])).toEqual(["verdad-001"]);
    const m = mascaraSalieron();
    expect(yaSalio(m, "verdad-001") && yaSalio(m, "reto-002")).toBe(true);
  });
  it("«castigo» no se confunde con «castigo-nave»", () => {
    anotarCarta("castigo-nave-001");
    expect(salieronDe(["castigo"])).toEqual([]);
    expect(salieronDe(["castigo-nave"])).toEqual(["castigo-nave-001"]);
  });
  it("empezar de cero olvida solo ese mazo", () => {
    anotarCarta("verdad-001"); anotarCarta("reto-002");
    olvidarMazos(["verdad"]);
    expect(salieronDe(["verdad", "reto"])).toEqual(["reto-002"]);
  });
  it("sin almacenamiento, todo cuenta como nuevo", () => {
    (globalThis as { localStorage?: unknown }).localStorage = undefined;
    anotarCarta("verdad-003");
    expect(salieronDe(["verdad"])).toEqual([]);
    expect(mascaraSalieron()).toBeUndefined();
  });
});
