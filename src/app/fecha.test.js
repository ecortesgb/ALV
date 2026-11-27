import { describe, expect, it } from "vitest";
import { edadDe, fechaDeTexto, formatoFecha } from "./fecha";
const ref = new Date(2026, 10, 20); // 20 nov 2026
describe("fecha de nacimiento en un campo", () => {
    it("pone las diagonales mientras se escribe", () => {
        expect(formatoFecha("05")).toBe("05");
        expect(formatoFecha("0512")).toBe("05/12");
        expect(formatoFecha("05121990")).toBe("05/12/1990");
        expect(formatoFecha("05/12/19901234")).toBe("05/12/1990");
        expect(formatoFecha("ab0c5")).toBe("05");
    });
    it("entrega AAAA-MM-DD solo con fechas que existen", () => {
        expect(fechaDeTexto("05/12/1990", ref)).toBe("1990-12-05");
        expect(fechaDeTexto("29/02/2000", ref)).toBe("2000-02-29");
        expect(fechaDeTexto("29/02/2001", ref)).toBe("");
        expect(fechaDeTexto("31/04/1990", ref)).toBe("");
        expect(fechaDeTexto("01/13/1990", ref)).toBe("");
        expect(fechaDeTexto("05/12/19", ref)).toBe("");
        expect(fechaDeTexto("01/01/1919", ref)).toBe("");
        expect(fechaDeTexto("01/01/2027", ref)).toBe("");
    });
    it("la edad se sigue calculando con edadDe", () => {
        expect(edadDe(fechaDeTexto("20/11/2008", ref), ref)).toBe(18);
        expect(edadDe(fechaDeTexto("21/11/2008", ref), ref)).toBe(17);
    });
});
