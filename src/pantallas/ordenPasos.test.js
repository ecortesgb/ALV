// Orden del configurador (Elías, 24 nov): el escenario se elige al final, justo antes del resumen, en todos los juegos;
// El impostor no pide escenario (juega en la nave) y en «Modo de juego» pone sus opciones y la categoría (Elías, 24 nov).
import { describe, expect, it } from "vitest";
import { candadoEscenario, ordenPasos } from "./ConfigurarPartida";
import { ESCENARIOS, JUEGOS } from "../content/catalogo";
import { MODALIDADES_JUEGO } from "../content/configurar";
describe("orden de pasos del configurador", () => {
    it("todos empiezan eligiendo el juego y terminan en escenario y resumen", () => {
        const o = ordenPasos("verdad-reto", false);
        expect(o[0]).toBe("juego");
        expect(o.slice(-3)).toEqual(["intensidad", "escenario", "resumen"]);
    });
    it("con equipos, los equipos van después del modo", () => {
        const conModos = Object.keys(MODALIDADES_JUEGO).find(id => MODALIDADES_JUEGO[id].length > 1);
        const o = ordenPasos(conModos, true);
        expect(o).toContain("tipo");
        expect(o.indexOf("grupos")).toBe(o.indexOf("tipo") + 1);
    });
    it("El impostor: sus opciones en «Modo de juego» y sin escenario", () => {
        expect(ordenPasos("impostor", false)).toEqual(["juego", "tipo", "opciones", "intensidad", "resumen"]);
    });
    it("el escenario se bloquea si no admite el juego elegido", () => {
        // Busca un par juego/escenario que no se lleven (el juego pide otros lugares).
        const par = JUEGOS.flatMap(j => ESCENARIOS.filter(e => j.lugares.length > 0 && !j.lugares.includes(e.lugar)).map(e => ({ j, e })))[0];
        expect(par).toBeDefined();
        expect(candadoEscenario(par.e.id, par.j)).toBe("No en este lugar");
        expect(candadoEscenario(undefined, par.j)).toBeNull();
    });
});
