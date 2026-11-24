import { describe, expect, it } from "vitest";
import { laminas, tarjetasInicio } from "./comoJugar";

describe("tarjetas al iniciar", () => {
  it("primero cómo se juega, luego herramienta, temporizador y escenario", () => {
    const t = tarjetasInicio({ juegoId: "verdad-reto", explicar: true, herramienta: "dados", temporizador: 30, escenario: "alverca" });
    const reglas = laminas("verdad-reto").length;
    expect(t.slice(0, reglas).every(x => x.grupo === "juego")).toBe(true);
    expect(t.slice(reglas).map(x => x.grupo)).toEqual(["herramienta", "herramienta", "escenario"]);
    expect(t[reglas]!.imagen).toBe("ui/configurar/herr-dados.webp");
    expect(t[reglas + 1]!.texto).toMatch(/30 segundos/);
    expect(t.at(-1)!.texto).toMatch(/agua/);
  });
  it("sin explicar solo salen herramienta y escenario", () => {
    expect(tarjetasInicio({ juegoId: "mimica", escenario: "fogata" }).map(x => x.grupo)).toEqual(["escenario"]);
    expect(tarjetasInicio({ juegoId: "mimica" })).toEqual([]);
  });
  it("herramienta desconocida no agrega tarjeta", () => {
    expect(tarjetasInicio({ juegoId: "mimica", herramienta: "nada" })).toEqual([]);
  });
});
