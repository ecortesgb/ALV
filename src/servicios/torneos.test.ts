// Cuenta regresiva de los torneos (texto en la tarjeta).
import { describe, expect, it } from "vitest";
import { cuentaRegresiva } from "./torneos";

const ahora = Date.parse("2026-11-23T12:00:00Z");
const en = (h: number) => new Date(ahora + h * 3600e3).toISOString();
describe("cuentaRegresiva", () => {
  it("días y horas", () => expect(cuentaRegresiva({ inicio: en(-1), fin: en(53), estado: "activo" }, ahora)).toBe("Termina en 2 d 5 h"));
  it("horas y minutos", () => expect(cuentaRegresiva({ inicio: en(-1), fin: en(3.5), estado: "activo" }, ahora)).toBe("Termina en 3 h 30 min"));
  it("próximo", () => expect(cuentaRegresiva({ inicio: en(2), fin: en(30), estado: "proximo" }, ahora)).toBe("Empieza en 2 h 0 min"));
  it("terminado", () => expect(cuentaRegresiva({ inicio: en(-30), fin: en(-2), estado: "terminado" }, ahora)).toBe("Terminado"));
});
