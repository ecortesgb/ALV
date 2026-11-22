import { describe, expect, it } from "vitest";
import { COLORES_JUGADOR, asignarColores, colorDe, colorJugador, fijarColoresSala, varsColor } from "./colorJugador";

describe("Color por jugador", () => {
  it("los cuatro primeros son rojo, azul, amarillo y verde", () => {
    expect([0, 1, 2, 3].map(i => colorJugador(i).nombre)).toEqual(["Rojo", "Azul", "Amarillo", "Verde"]);
    expect(colorJugador(0).etiqueta).toBe("P1");
    expect(colorJugador(3).n).toBe(4);
  });
  it("una sala llena (8) tiene ocho colores distintos", () => {
    const bases = Array.from({ length: 8 }, (_, i) => colorJugador(i).base);
    expect(new Set(bases).size).toBe(8);
  });
  it("después de los colores conocidos sigue en ciclo, con su número", () => {
    const c = colorJugador(COLORES_JUGADOR.length);
    expect(c.base).toBe(colorJugador(0).base);
    expect(c.etiqueta).toBe(`P${COLORES_JUGADOR.length + 1}`);
  });
  it("sale del orden de entrada", () => {
    const ids = ["ana", "beto", "caro"];
    expect(colorDe("caro", ids)?.nombre).toBe("Amarillo");
    expect(colorDe("nadie", ids)).toBeNull();
  });
  it("lobby: el anfitrión es P1 rojo aunque haya entrado después", () => {
    const m = asignarColores(["beto", "ana"], "ana");
    expect(m.get("ana")).toMatchObject({ nombre: "Rojo", etiqueta: "P1" });
    expect(m.get("beto")?.etiqueta).toBe("P2");
  });
  it("lobby: mujeres rosa, amarillo, morado, naranja; hombres azul, verde, café", () => {
    const ids = ["adm", "m1", "h1", "m2", "h2", "m3", "h3", "m4"];
    const g = { m1: "mujer", m2: "mujer", m3: "mujer", m4: "mujer", h1: "hombre", h2: "hombre", h3: "hombre" } as const;
    const m = asignarColores(ids, "adm", g);
    expect(ids.map(i => m.get(i)?.nombre)).toEqual(["Rojo", "Rosa", "Azul", "Amarillo", "Verde", "Morado", "Café", "Naranja"]);
    expect(new Set([...m.values()].map(c => c.base)).size).toBe(8);
  });
  it("lobby: sin género o con su grupo lleno toma el siguiente libre (primarios primero)", () => {
    const m = asignarColores(["adm", "x", "h1", "h2", "h3", "h4"], "adm", { h1: "hombre", h2: "hombre", h3: "hombre", h4: "hombre" });
    expect(m.get("x")?.nombre).toBe("Azul");
    expect(["h1", "h2", "h3", "h4"].map(i => m.get(i)?.nombre)).toEqual(["Verde", "Café", "Amarillo", "Naranja"]);
  });
  it("colorDe usa los colores de la sala cuando están fijados", () => {
    fijarColoresSala(asignarColores(["ana", "beto"], "beto", { ana: "mujer" }));
    expect(colorDe("ana", ["ana", "beto"])?.nombre).toBe("Rosa");
    expect(colorDe("beto", ["ana", "beto"])?.nombre).toBe("Rojo");
    fijarColoresSala(null);
    expect(colorDe("ana", ["ana", "beto"])?.nombre).toBe("Rojo");
  });
  it("da las variables de CSS", () => {
    expect(varsColor(colorJugador(1))).toMatchObject({ "--pj": colorJugador(1).base });
    expect(varsColor(null)).toEqual({});
  });
});
