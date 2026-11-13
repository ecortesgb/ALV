import { describe, expect, it } from "vitest";
import { saldos, type Movimiento } from "./economia";

describe("saldos con XP quitada por el anfitrión", () => {
  it("resta de la total y primero de la del evento", () => {
    const m: Movimiento[] = [
      { tipo: "ganada", xp: 100, eventoId: "viejo" },
      { tipo: "ganada", xp: 50, eventoId: "hoy" },
      { tipo: "quitada", xp: 30, eventoId: "hoy" },
    ];
    expect(saldos(m, "hoy")).toEqual({ acumulada: 120, disponible: 120, delEvento: 20 });
  });
  it("si quita más que lo del evento, el resto sale de la XP vieja", () => {
    const m: Movimiento[] = [
      { tipo: "ganada", xp: 100, eventoId: "viejo" },
      { tipo: "ganada", xp: 20, eventoId: "hoy" },
      { tipo: "quitada", xp: 50, eventoId: "hoy" },
    ];
    expect(saldos(m, "hoy")).toEqual({ acumulada: 70, disponible: 70, delEvento: 0 });
  });
  it("nunca deja saldos negativos", () => {
    const m: Movimiento[] = [{ tipo: "ganada", xp: 10, eventoId: "hoy" }, { tipo: "quitada", xp: 500, eventoId: "hoy" }];
    expect(saldos(m, "hoy")).toEqual({ acumulada: 0, disponible: 0, delEvento: 0 });
  });
});
