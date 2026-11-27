import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { claveCapsulas, figuraActiva, huella, normalizar, semillaDe } from "./figura3d";
const fig = (n) => ({ version: 2, nombre: n, identidad: {}, ropa: {} });
describe("cápsulas de figuras 3D", () => {
    it("normaliza: solo figuras versión 2, máximo 3 y la activa siempre llena", () => {
        const e = normalizar({ version: 1, activa: 2, slots: [{ nombre: "A", figura: fig("A") }, { nombre: "Vieja", figura: { version: 1 } }, null, { nombre: "Cuarta", figura: fig("D") }] });
        expect(e.slots).toHaveLength(3);
        expect(e.slots[1]).toBeNull();
        expect(e.activa).toBe(0);
        expect(figuraActiva(e)?.nombre).toBe("A");
    });
    it("vacío o roto: sin activa", () => {
        expect(normalizar(null).activa).toBeNull();
        expect(normalizar({ slots: "x" }).slots.every(s => s === null)).toBe(true);
    });
    it("recorta el nombre a 24 (igual que la base)", () => {
        expect(normalizar({ slots: [{ nombre: "x".repeat(40), figura: fig("A") }] }).slots[0].nombre).toHaveLength(24);
    });
    it("la clave coincide con la del puente del editor", () => {
        const puente = readFileSync(new URL("../../tools/minifig/alv-puente.js", import.meta.url), "utf8");
        expect(puente).toContain('"alv-capsulas-" + jugador');
        expect(claveCapsulas("j1 <x>")).toBe("alv-capsulas-j1x");
    });
    it("semilla y huella fijas para el mismo texto", () => {
        expect(semillaDe("abc")).toBe(semillaDe("abc"));
        expect(semillaDe("abc")).not.toBe(semillaDe("abd"));
        expect(huella(fig("A"))).toBe(huella(fig("A")));
    });
});
