import { describe, expect, it } from "vitest";
import { grupoMostrado, juntarVersiones, nombreBase } from "./agrupar";

describe("orden de originales", () => {
  it("nombre base sin la versión", () => {
    expect(nombreBase("Batman (Batman Returns)")).toBe("Batman");
    expect(nombreBase("Joker")).toBe("Joker");
  });
  it("grupos de 3 o menos van a Otros de su saga", () => {
    const xs = [["disney", "bluey"], ["disney", "bluey"], ...Array.from({ length: 4 }, () => ["disney", "princesas"]), ["marvel", "x-men"]];
    const g = grupoMostrado(xs, x => x[0]!, x => x[1]!);
    expect(xs.map(g)).toEqual(["otros-disney", "otros-disney", "princesas", "princesas", "princesas", "princesas", "otros-marvel"]);
  });
  it("las versiones de un personaje se juntan con el representante de nombre igual", () => {
    const j = juntarVersiones(["Batman (Batman Returns)", "Batman", "Robin"], x => x);
    expect(j).toEqual([{ base: "Batman", rep: "Batman", versiones: ["Batman (Batman Returns)", "Batman"] }, { base: "Robin", rep: "Robin", versiones: ["Robin"] }]);
  });
});
