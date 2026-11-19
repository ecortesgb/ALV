import { describe, expect, it } from "vitest";
import { horaDePrueba, minutosAlSiguienteCorte, momentoDeMinutos } from "./horaDelDia";

const h = (hh: number, mm = 0) => hh * 60 + mm;

describe("momento del día", () => {
  it("cortes de México", () => {
    expect(momentoDeMinutos(h(3))).toBe("noche");
    expect(momentoDeMinutos(h(6))).toBe("atardecer");
    expect(momentoDeMinutos(h(6, 59))).toBe("atardecer");
    expect(momentoDeMinutos(h(7))).toBe("dia");
    expect(momentoDeMinutos(h(17, 59))).toBe("dia");
    expect(momentoDeMinutos(h(18))).toBe("atardecer");
    expect(momentoDeMinutos(h(19, 29))).toBe("atardecer");
    expect(momentoDeMinutos(h(19, 30))).toBe("noche");
    expect(momentoDeMinutos(h(23, 59))).toBe("noche");
  });
  it("minutos al siguiente corte", () => {
    expect(minutosAlSiguienteCorte(h(17, 50))).toBe(10);
    expect(minutosAlSiguienteCorte(h(22))).toBe(120);
    expect(minutosAlSiguienteCorte(h(19, 29.5))).toBe(1);
  });
  it("hora de prueba en la URL", () => {
    expect(horaDePrueba("?hora=19")).toBe(h(19));
    expect(horaDePrueba("?yo=Ana&hora=18:45")).toBe(h(18, 45));
    expect(horaDePrueba("?hora=19.5")).toBe(h(19, 30));
    expect(horaDePrueba("?hora=25")).toBeNull();
    expect(horaDePrueba("?yo=Ana")).toBeNull();
  });
});
