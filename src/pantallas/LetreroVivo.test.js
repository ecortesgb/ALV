import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { esCelebracion } from "./LetreroVivo";
describe("letrero vivo (movimiento de interfaz)", () => {
    it("celebra solo al pasar de faltan a todos listos", () => {
        expect(esCelebracion(false, true)).toBe(true);
        expect(esCelebracion(true, true)).toBe(false);
        expect(esCelebracion(null, true)).toBe(false); // abrir o recargar la TV con todos listos
        expect(esCelebracion(true, false)).toBe(false);
        expect(esCelebracion(false, null)).toBe(false);
    });
    it("movimiento.css respeta «reducir movimiento» y no deja bucles en los controles", () => {
        const css = readFileSync(new URL("./movimiento.css", import.meta.url), "utf8");
        expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
        expect(css).toMatch(/html\.alv-quieto \.mov-confeti/);
        expect(css).not.toMatch(/infinite/);
        // Solo desplazamiento, escala y opacidad en los keyframes nuevos (nada de rotate).
        const cuadros = css.match(/@keyframes mov[\s\S]*?\}\s*\}/g) ?? [];
        expect(cuadros.length).toBeGreaterThan(5);
        for (const k of cuadros)
            expect(k).not.toMatch(/rotate|skew/);
    });
});
