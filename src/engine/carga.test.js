// Pantalla de carga (Elías, 24 nov): mientras se ve, no corre ningún reloj; «comenzar» del anfitrión la quita para todos.
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida, enCarga } from "./partida";
import { aAccion, armarArranque, claveTurno, relojLogico } from "./nucleo";
import { vistaPublica } from "./vistas";
const gente = (n) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
let k = 0;
const juega = (e, a) => aplicar(e, { ...a, id: `cg${++k}` }, CONTENIDO);
function partida(juego, op = {}) {
    const a = armarArranque(gente(4), juego, 5, 1, 9, { explicar: true, ...op });
    return crearPartida(JUEGOS.find(j => j.id === juego), a.cfg, a.semilla, CONTENIDO, a.rondas);
}
describe("pantalla de carga", () => {
    it("con temporizador, el turno no corre hasta «comenzar»", () => {
        let e = partida("verdad-reto", { temporizador: 30 });
        expect(enCarga(e)).toBe(true);
        expect(claveTurno(e)).toBeNull();
        expect(juega(e, { tipo: "tiempo" }).version).toBe(e.version); // «tiempo» no aplica en carga
        e = juega(e, { tipo: "comenzar" });
        expect(enCarga(e)).toBe(false);
        expect(claveTurno(e)).not.toBeNull();
        expect(vistaPublica(e).explicar).toBeUndefined();
    });
    it("el reloj de ronda (Mímica) tampoco corre en carga", () => {
        let e = partida("mimica");
        expect(relojLogico(e).conReloj).toBe(false);
        e = juega(e, { tipo: "comenzar" });
        expect(relojLogico(e).conReloj).toBe(true);
    });
    it("si alguien juega antes, la carga termina sola", () => {
        const e = partida("que-prefieres");
        const n = juega(e, { tipo: "contestar", jugador: "j1", valor: "a" });
        expect(enCarga(n)).toBe(false);
    });
    it("sin explicar no hay carga y «comenzar» no cambia nada", () => {
        const a = armarArranque(gente(4), "mimica", 5, 1, 9, {});
        const e = crearPartida(JUEGOS.find(j => j.id === "mimica"), a.cfg, a.semilla, CONTENIDO, a.rondas);
        expect(enCarga(e)).toBe(false);
        expect(juega(e, { tipo: "comenzar" }).version).toBe(e.version);
    });
    it("«comenzar» solo vale del anfitrión", () => {
        const f = (jugador) => ({ id: "x", tipo: "control", jugador, datos: { que: "comenzar" } });
        expect(aAccion(f("j0"), ["j0"])).toEqual({ id: "x", tipo: "comenzar" });
        expect(aAccion(f("j2"), ["j0"])).toBeNull();
    });
});
