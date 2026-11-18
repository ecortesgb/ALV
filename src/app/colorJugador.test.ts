import { describe, expect, it } from "vitest";
import { COLORES_JUGADOR, colorDe, colorJugador, varsColor } from "./colorJugador";

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
  it("da las variables de CSS", () => {
    expect(varsColor(colorJugador(1))).toMatchObject({ "--pj": colorJugador(1).base });
    expect(varsColor(null)).toEqual({});
  });
});
