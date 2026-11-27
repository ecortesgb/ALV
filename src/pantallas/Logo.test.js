import { describe, expect, it } from "vitest";
import { TITULO_FINAL, TITULOS, tirada } from "./Logo";
describe("ruleta de títulos", () => {
    it("pasan 5 títulos distintos y termina siempre en el verdadero", () => {
        const t = tirada(5);
        expect(t).toHaveLength(6);
        expect(t.at(-1)).toBe(TITULO_FINAL);
        expect(new Set(t.slice(0, 5)).size).toBe(5);
        for (const x of t.slice(0, 5))
            expect(TITULOS).toContain(x);
    });
    it("todos los títulos son A, L, V", () => {
        for (const x of [...TITULOS, TITULO_FINAL]) {
            const iniciales = x.split(/[\s,]+/).filter(p => p.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(p)).map(p => p[0].toUpperCase()).join("");
            expect(iniciales, x).toBe("ALV");
        }
    });
});
