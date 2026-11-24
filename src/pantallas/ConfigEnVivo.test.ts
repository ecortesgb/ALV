import { describe, expect, it } from "vitest";
import { leerEstadoConfig } from "./ConfigEnVivo";

describe("configuración en vivo: lo que llega de otro aparato", () => {
  it("acepta lo bien formado y corta lo largo", () => {
    const e = leerEstadoConfig({ quien: "Ana", paso: "Elige el juego", escenario: "fogata", escenarioNombre: "FBI", juego: "impostor", juegoNombre: "El impostor",
      modo: "Individual", grupos: [{ nombre: "x".repeat(99), jugadores: ["Beto", 5] }], herramienta: "", nivel: "Frío" })!;
    expect(e.juego).toBe("impostor");
    expect(e.grupos[0]!.nombre).toHaveLength(24);
    expect(e.grupos[0]!.jugadores).toEqual(["Beto", ""]);
  });
  it("rechaza un juego con forma rara y limpia un escenario raro", () => {
    expect(leerEstadoConfig({ juego: "<b>x</b>" })).toBeNull();
    expect(leerEstadoConfig({ juego: "mimica", escenario: "../../x" })!.escenario).toBeNull();
  });
});
