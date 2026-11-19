// Modalidades por juego (Maestro 6A.11 y 6A.12).
import { describe, expect, it } from "vitest";
import { JUEGOS } from "./catalogo";
import { MODALIDADES_JUEGO, admite } from "./configurar";

describe("modalidades por juego", () => {
  it("El impostor y Verdad o reto solo se juegan en individual (decisión de Elías)", () => {
    for (const j of ["impostor", "verdad-reto"]) {
      expect(admite(j, "individual")).toBe(true);
      for (const m of ["parejas", "equipos", "sexos"] as const) expect(admite(j, m), `${j} con ${m}`).toBe(false);
    }
  });
  it("El reloj y la Ruleta de castigos ya no son juegos que se configuran (son herramientas)", () => {
    for (const j of ["reloj", "ruleta"]) for (const m of ["individual", "parejas", "equipos", "sexos"] as const) expect(admite(j, m)).toBe(false);
  });
  it("los juegos de pareja solo salen en Parejas", () => {
    expect(MODALIDADES_JUEGO.conoces).toEqual(["parejas"]);
    expect(MODALIDADES_JUEGO["dados-hot"]).toEqual(["parejas"]);
  });
  it("todo juego configurable existe y corre en el motor", () => {
    for (const id of Object.keys(MODALIDADES_JUEGO)) expect(JUEGOS.find(j => j.id === id)?.motor, id).toBeTruthy();
  });
  it("cada modalidad tiene al menos un juego", () => {
    for (const m of ["individual", "parejas", "equipos", "sexos"] as const) expect(Object.keys(MODALIDADES_JUEGO).some(j => admite(j, m)), m).toBe(true);
  });
});
