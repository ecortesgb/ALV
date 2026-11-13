import { describe, expect, it } from "vitest";
import { puedePonerse } from "./equipos";

describe("puedePonerse (recompensas de equipo)", () => {
  it("sin equipo no se puede nada", () => expect(puedePonerse("bufanda", 20, undefined)).toBe(false));
  it("con un equipo que no existe tampoco", () => expect(puedePonerse("bufanda", 20, "equipo-falso")).toBe(false));
  it("bufanda desde nivel 2", () => {
    expect(puedePonerse("bufanda", 1, "gryffindor")).toBe(false);
    expect(puedePonerse("bufanda", 2, "gryffindor")).toBe(true);
  });
  it("el marco pide nivel 8", () => {
    expect(puedePonerse("marco", 7, "pumas")).toBe(false);
    expect(puedePonerse("marco", 8, "pumas")).toBe(true);
  });
});
