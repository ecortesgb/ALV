import { describe, expect, it } from "vitest";
import { bandosIniciales, intercambiar, parejasIniciales, parejasValidas } from "./bandos";
describe("ALVersus: bandos de arranque", () => {
    it("mujer a Ellas y hombre a Ellos", () => {
        expect(bandosIniciales(["a", "b"], { a: "mujer", b: "hombre" })).toEqual({ a: "ellas", b: "ellos" });
    });
    it("«Prefiero no decirlo» (otro) va al bando con menos gente", () => {
        const r = bandosIniciales(["a", "b", "c", "x"], { a: "mujer", b: "mujer", c: "hombre", x: "otro" });
        expect(r.x).toBe("ellos");
    });
    it("con bandos parejos decide el azar", () => {
        expect(bandosIniciales(["a", "b", "x"], { a: "mujer", b: "hombre", x: "otro" }, {}, () => .2).x).toBe("ellas");
        expect(bandosIniciales(["a", "b", "x"], { a: "mujer", b: "hombre", x: "otro" }, {}, () => .8).x).toBe("ellos");
    });
    it("varios sin género se reparten parejo", () => {
        const r = bandosIniciales(["a", "b", "c", "d"], {}, {}, () => .1);
        expect(Object.values(r).filter(b => b === "ellas")).toHaveLength(2);
    });
    it("respeta lo que el anfitrión ya cambió", () => {
        expect(bandosIniciales(["a", "b"], { a: "mujer", b: "hombre" }, { a: "ellos" })).toEqual({ a: "ellos", b: "ellos" });
    });
});
describe("parejas editables", () => {
    it("de arranque por orden de llegada", () => {
        expect(parejasIniciales(["a", "b", "c", "d"])).toEqual({ a: "p1", b: "p1", c: "p2", d: "p2" });
    });
    it("conserva las que ya servían y rehace si alguien sobra", () => {
        const g = { a: "p2", b: "p1", c: "p1", d: "p2" };
        expect(parejasIniciales(["a", "b", "c", "d"], g)).toEqual(g);
        expect(parejasIniciales(["a", "b", "c", "d", "e", "f"], g)).toEqual({ a: "p1", b: "p1", c: "p2", d: "p2", e: "p3", f: "p3" });
    });
    it("intercambiar cambia a dos personas de pareja", () => {
        const g = intercambiar({ a: "p1", b: "p1", c: "p2", d: "p2" }, "b", "c");
        expect(g).toEqual({ a: "p1", b: "p2", c: "p1", d: "p2" });
        expect(parejasValidas(["a", "b", "c", "d"], g)).toBe(true);
    });
    it("una pareja de tres no vale", () => {
        expect(parejasValidas(["a", "b", "c", "d"], { a: "p1", b: "p1", c: "p1", d: "p2" })).toBe(false);
    });
});
describe("el motor usa las parejas elegidas", () => {
    const js = ["a", "b", "c", "d"].map(id => ({ id, nombre: id.toUpperCase(), puntos: 0 }));
    it("con op.grupos arma esas parejas", async () => {
        const { armarGrupos } = await import("../engine/nucleo");
        const r = armarGrupos(js, { modalidad: "parejas", grupos: { a: "p1", b: "p2", c: "p1", d: "p2" } });
        expect(r?.equipos).toEqual([{ id: "p1", nombre: "A y C" }, { id: "p2", nombre: "B y D" }]);
    });
    it("sin op.grupos, por orden de llegada como antes", async () => {
        const { armarGrupos } = await import("../engine/nucleo");
        expect(armarGrupos(js, { modalidad: "parejas" })?.equipos).toEqual([{ id: "p1", nombre: "A y B" }, { id: "p2", nombre: "C y D" }]);
    });
    it("una pareja de tres no arranca", async () => {
        const { armarGrupos } = await import("../engine/nucleo");
        expect(armarGrupos(js, { modalidad: "parejas", grupos: { a: "p1", b: "p1", c: "p1", d: "p2" } })).toBeNull();
    });
});
