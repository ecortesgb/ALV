import { describe, expect, it } from "vitest";
import { edadDe } from "./estado";

describe("edadDe", () => {
  const hoy = new Date(2026, 10, 13); // 13 de noviembre de 2026
  it("cumple 18 justo hoy", () => expect(edadDe("2008-11-13", hoy)).toBe(18));
  it("un día antes de cumplir 18 sigue en 17", () => expect(edadDe("2008-11-14", hoy)).toBe(17));
  it("ya cumplió este año", () => expect(edadDe("2000-01-01", hoy)).toBe(26));
  it("le falta el mes de su cumpleaños", () => expect(edadDe("2000-12-01", hoy)).toBe(25));
});
