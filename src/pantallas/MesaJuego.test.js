import { describe, expect, it } from "vitest";
import { lados, turnoDe } from "./MesaJuego";
const base = (extra = {}) => ({
    jugadores: ["a", "b", "c", "d", "e"].map(id => ({ id, nombre: id.toUpperCase() })), fase: "contestando", esperados: [], contestaron: [], puntos: {}, ...extra,
});
describe("mesa de la partida", () => {
    it("individual: alterna izquierda y derecha", () => {
        const l = lados(base());
        expect(l.izq[0].ids).toEqual(["a", "c", "e"]);
        expect(l.der[0].ids).toEqual(["b", "d"]);
    });
    it("por grupos: cada grupo de un lado, en orden fijo", () => {
        const l = lados(base({ grupos: [{ id: "b", nombre: "Los Tacos", jugadores: ["b", "d"], puntos: 4 }, { id: "a", nombre: "Equipo A", jugadores: ["a", "c", "e"], puntos: 2 }] }));
        expect(l.izq.map(g => g.titulo)).toEqual(["Equipo A"]);
        expect(l.der.map(g => g.titulo)).toEqual(["Los Tacos"]);
    });
    it("turno: verdad o reto marca a quien pregunta y a quien responde; al revelar, nadie", () => {
        const vr = { herramienta: "dados", pregunta: "a", responde: "c", etapa: "elegir", verdadUsada: [] };
        expect(turnoDe(base({ verdadReto: vr }))).toEqual(["c", "a"]);
        expect(turnoDe(base({ verdadReto: vr, fase: "revelada" }))).toEqual([]);
        expect(turnoDe(base({ turnoDe: "d" }))).toEqual(["d"]);
    });
});
