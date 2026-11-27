// Orden del ranking en el aparato: mismo criterio de empates que el servidor (1, 1, 3; Maestro v1.54, T1).
import { describe, expect, it } from "vitest";
import { demoJugadores, ordenarPor } from "./ranking";
const fila = (id, puntos_alv, victorias = 0) => ({ posicion: 0, id, nombre: id, nivel: 1, figura: null, puntos_alv, victorias,
    partidas: 1, mvp: 0, racha: 0, juegos: 1, victorias_azar: 0, victorias_deduccion: 0 });
describe("ordenarPor", () => {
    it("empates comparten lugar y se salta el siguiente", () => {
        const r = ordenarPor([fila("a", 5), fila("b", 9), fila("c", 5), fila("d", 1)], "puntos");
        expect(r.map(f => [f.id, f.lugar])).toEqual([["b", 1], ["a", 2], ["c", 2], ["d", 4]]);
    });
    it("ordena por la categoría elegida", () => {
        const r = ordenarPor([fila("a", 9, 1), fila("b", 3, 4)], "victorias");
        expect(r[0].id).toBe("b");
        expect(r[0].valor).toBe(4);
    });
});
describe("modo demostración", () => {
    it("el ranking de muestra viene ordenado y con la cuenta dentro", () => {
        const r = demoJugadores("global", false);
        expect(r.length).toBeGreaterThan(5);
        expect(r[0].posicion).toBe(1);
        expect(r.some(f => f.id === "demo-yo" || f.nombre === "Tú")).toBe(true);
    });
});
