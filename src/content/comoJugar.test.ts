import { describe, expect, it } from "vitest";
import { laminas, tarjetasCarga, tarjetasInicio } from "./comoJugar";

describe("pantalla de carga", () => {
  it("una sola tarjeta del juego con su imagen y cómo se gana, luego herramienta, temporizador y escenario", () => {
    const m = tarjetasCarga({ juegoId: "mas-probable", escenario: "alverca" });
    expect(m.map(x => x.grupo)).toEqual(["juego", "escenario"]);
    expect(m[0]).toMatchObject({ titulo: "¿Quién es más probable?", imagen: "juegos/mas-probable.webp" });
    expect(m[0]!.consejo).toBeTruthy();
  });
  it("Verdad o reto muestra sus 5 láminas y la última dice cómo se gana", () => {
    const t = tarjetasCarga({ juegoId: "verdad-reto", herramienta: "dados", temporizador: 30, escenario: "alverca" });
    expect(t.map(x => x.grupo)).toEqual(["juego", "juego", "juego", "juego", "juego", "herramienta", "herramienta", "escenario"]);
    expect(t[0]).toMatchObject({ titulo: "Quién pregunta", imagen: "juegos/verdad-reto.webp" });
    expect(t[4]!.consejo).toBeTruthy();
  });
  it("por equipos, el consejo dice cómo se suma", () => {
    expect(tarjetasCarga({ juegoId: "mas-probable", modalidad: "equipos" })[0]!.consejo).toMatch(/equipo/);
  });
  it("juego sin herramienta ni escenario: solo su tarjeta", () => {
    expect(tarjetasCarga({ juegoId: "mimica" })).toHaveLength(1);
    expect(tarjetasCarga({ juegoId: "no-existe" })).toEqual([]);
  });
});

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
