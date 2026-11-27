import { describe, expect, it } from "vitest";
import { calcularCopas, esResultado } from "./copas";
const J = ["a", "b", "c", "d"].map(id => ({ id, nombre: id.toUpperCase() }));
const ind = (puntos) => ({ juegoId: "impostor", modalidad: "individual", jugadores: J, puntos });
describe("copas de la noche", () => {
    it("individual: suma todos los juegos y da 1.º, 2.º y 3.º (los empates comparten lugar)", () => {
        const c = calcularCopas([ind({ a: 3, b: 1, c: 2, d: 0 }), ind({ a: 0, b: 4, c: 1, d: 1 })]);
        expect(c.totales).toEqual({ a: 3, b: 5, c: 3, d: 1 });
        expect(c.individual).toEqual([
            { id: "b", nombre: "B", puntos: 5, lugar: 1 },
            { id: "a", nombre: "A", puntos: 3, lugar: 2 },
            { id: "c", nombre: "C", puntos: 3, lugar: 2 },
        ]);
        expect(c.parejas).toBeUndefined();
        expect(c.juegos).toBe(2);
    });
    it("parejas y equipos se reconocen por sus integrantes y suman lo que jugaron juntos", () => {
        const parejas = (pAB, pCD) => ({ juegoId: "yo-nunca", modalidad: "parejas", jugadores: J, puntos: {},
            grupos: [{ id: "p1", nombre: "A y B", jugadores: ["a", "b"], puntos: pAB }, { id: "p2", nombre: "C y D", jugadores: ["c", "d"], puntos: pCD }] });
        // En el segundo juego la pareja «p1» es otra (A con C): no se mezcla con A y B.
        const otra = { juegoId: "mimica", modalidad: "parejas", jugadores: J, puntos: {},
            grupos: [{ id: "p1", nombre: "A y C", jugadores: ["c", "a"], puntos: 9 }, { id: "p2", nombre: "B y D", jugadores: ["b", "d"], puntos: 0 }] };
        const c = calcularCopas([parejas(4, 2), parejas(3, 1), otra]);
        expect(c.parejas).toEqual([{ nombre: "A y C", jugadores: ["a", "c"], puntos: 9 }]);
    });
    it("ALVersus: gana el bando aunque cambien sus integrantes; empate = los dos", () => {
        const sexos = (ellas, ellos) => ({ juegoId: "mas-probable", modalidad: "sexos", jugadores: J, puntos: {},
            grupos: [{ id: "ellas", nombre: "Ellas", jugadores: ["a", "c"], puntos: ellas }, { id: "ellos", nombre: "Ellos", jugadores: ["b", "d"], puntos: ellos }] });
        expect(calcularCopas([sexos(3, 1), sexos(0, 1)]).alversus).toEqual([{ nombre: "Ellas", jugadores: ["a", "c"], puntos: 3 }]);
        expect(calcularCopas([sexos(2, 2)]).alversus?.map(g => g.nombre)).toEqual(["Ellas", "Ellos"]);
    });
    it("equipos: nombre del equipo con sus integrantes", () => {
        const c = calcularCopas([{ juegoId: "lista", modalidad: "equipos", jugadores: J, puntos: {},
                grupos: [{ id: "a", nombre: "Equipo A", jugadores: ["a", "b"], puntos: 7 }, { id: "b", nombre: "Equipo B", jugadores: ["c", "d"], puntos: 2 }] }]);
        expect(c.equipos).toEqual([{ nombre: "Equipo A: A y B", jugadores: ["a", "b"], puntos: 7 }]);
    });
    it("sin juegos no hay ganadores", () => {
        expect(calcularCopas([])).toEqual({ juegos: 0, individual: [], totales: {} });
    });
    it("esResultado descarta la propia ceremonia y lo que no es un juego", () => {
        expect(esResultado(ind({ a: 1 }))).toBe(true);
        expect(esResultado({ juegoId: "copas", jugadores: [], puntos: {} })).toBe(false);
        expect(esResultado({})).toBe(false);
    });
});
