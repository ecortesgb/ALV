// Juego físico (ALV_PLAN_MODOS_DE_JUEGO.md §5, D5 y D6): el administrador da y quita puntos y usa herramientas.
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida, resultados } from "./partida";
import { armarArranque, reconstruir } from "./nucleo";
import { vistaPublica } from "./vistas";
const def = JUEGOS.find(j => j.id === "fisico");
const gente = (n) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
let k = 0;
const juega = (e, a) => aplicar(e, { ...a, id: `fi${++k}` }, CONTENIDO);
function partida(n = 4, op = {}) {
    const a = armarArranque(gente(n), "fisico", 5, 1, 11, op);
    return { ...crearPartida(def, a.cfg, a.semilla, CONTENIDO, a.rondas), control: "j0" };
}
const da = (e, jugador, delta, quien = "j0") => juega(e, { tipo: "contestar", jugador: quien, valor: { puntos: { jugador, delta } } });
const sel = (e) => e.seleccion;
describe("juego físico", () => {
    it("solo el administrador espera y la ronda trae un reto sugerido", () => {
        const e = partida();
        expect(vistaPublica(e).esperados).toEqual(["j0"]);
        expect(e.carta?.texto).toBeTruthy();
    });
    it("los puntos se suman al momento y se ven en la vista", () => {
        let e = partida();
        e = da(e, "j1", 3);
        e = da(e, "j2", -1);
        e = da(e, "j1", 1);
        expect(e.puntos).toMatchObject({ j1: 4, j2: -1 });
        expect(sel(e).deltas).toEqual({ j1: 4, j2: -1 });
        expect(vistaPublica(e).puntos.j1).toBe(4);
    });
    it("nadie más da puntos y los valores raros no cuentan", () => {
        let e = partida();
        const antes = e.version;
        e = da(e, "j1", 2, "j1");
        e = da(e, "j1", 9);
        e = da(e, "j1", 0);
        e = da(e, "nadie", 1);
        e = juega(e, { tipo: "contestar", jugador: "j0", valor: { puntos: { jugador: "j1", delta: 1.5 } } });
        expect(e.version).toBe(antes);
        expect(e.puntos.j1).toBe(0);
    });
    it("herramientas: dados, ruleta, carta, orden y cronómetro; cada uso cambia `n`", () => {
        let e = partida();
        e = juega(e, { tipo: "contestar", jugador: "j0", valor: { herramienta: "dados" } });
        const d = sel(e).herr;
        expect(d.tipo).toBe("dados");
        expect(d.dados.every(x => x >= 1 && x <= 6)).toBe(true);
        e = juega(e, { tipo: "contestar", jugador: "j0", valor: { herramienta: "ruleta" } });
        expect(["j0", "j1", "j2", "j3"]).toContain(sel(e).herr.jugador);
        e = juega(e, { tipo: "contestar", jugador: "j0", valor: { herramienta: "orden" } });
        expect([...sel(e).herr.orden].sort()).toEqual(["j0", "j1", "j2", "j3"]);
        e = juega(e, { tipo: "contestar", jugador: "j0", valor: { herramienta: "carta" } });
        expect(sel(e).herr.carta.v).toBeGreaterThanOrEqual(2);
        e = juega(e, { tipo: "contestar", jugador: "j0", valor: { herramienta: "cronometro", segundos: 60 } });
        expect(sel(e).herr).toMatchObject({ tipo: "cronometro", segundos: 60, n: 5 });
        const v = e.version;
        e = juega(e, { tipo: "contestar", jugador: "j0", valor: { herramienta: "cronometro", segundos: 9999 } });
        e = juega(e, { tipo: "contestar", jugador: "j0", valor: { herramienta: "bomba" } });
        expect(e.version).toBe(v);
    });
    it("otro reto cambia la carta sin perder los puntos de la ronda", () => {
        let e = partida();
        e = da(e, "j1", 2);
        const antes = e.carta?.id;
        e = juega(e, { tipo: "contestar", jugador: "j0", valor: { otro: true } });
        expect(e.cambios).toBeGreaterThanOrEqual(1);
        expect(e.carta?.id).not.toBe(antes);
        expect(sel(e).deltas.j1).toBe(2);
    });
    it("«listo» cierra la ronda: el resumen trae lo dado y quien sumó cumple un reto", () => {
        let e = partida();
        e = da(e, "j1", 2);
        e = da(e, "j2", -1);
        e = juega(e, { tipo: "contestar", jugador: "j0", valor: "listo" });
        e = juega(e, { tipo: "revelar" });
        expect(e.fase).toBe("revelada");
        expect(e.revelado).toEqual({ deltas: { j1: 2, j2: -1 } });
        expect(e.puntos).toMatchObject({ j1: 2, j2: -1 });
        expect(e.retos).toMatchObject({ j1: 1, j2: 0 });
        e = juega(e, { tipo: "siguiente" });
        expect(e.ronda).toBe(2);
        expect(sel(e).deltas).toEqual({});
        e = da(e, "j3", 1);
        expect(resultados(e)[0]).toMatchObject({ jugador: "j1", puntos: 2, lugar: 1 });
    });
    it("en pausa no se dan puntos", () => {
        let e = partida();
        e = juega(e, { tipo: "pausar" });
        e = da(e, "j1", 1);
        expect(e.puntos.j1).toBe(0);
    });
    it("por equipos gana el equipo que suma más", () => {
        let e = partida(4, { modalidad: "equipos", grupos: { j0: "a", j1: "b", j2: "a", j3: "b" } });
        e = da(e, "j1", 2);
        e = da(e, "j3", 2);
        e = da(e, "j0", 3);
        const v = vistaPublica(e);
        expect(v.grupos.find(g => g.id === "b").puntos).toBe(4);
        expect(resultados(e).find(r => r.jugador === "j3").lugar).toBe(1);
    });
    it("se reconstruye igual desde las acciones guardadas", () => {
        const a = armarArranque(gente(3), "fisico", 5, 1, 21, {});
        const filas = [
            { id: "a0", tipo: "control", jugador: "j0", datos: { que: "arranque", ...a } },
            { id: "a1", tipo: "contestar", jugador: "j0", datos: { valor: { puntos: { jugador: "j2", delta: 3 } } } },
            { id: "a2", tipo: "contestar", jugador: "j0", datos: { valor: { herramienta: "dados" } } },
            { id: "a3", tipo: "contestar", jugador: "j2", datos: { valor: { puntos: { jugador: "j2", delta: 3 } } } },
        ];
        const e = reconstruir(filas, "j0");
        expect(e.puntos.j2).toBe(3);
        expect(sel(e).herr?.tipo).toBe("dados");
        expect(reconstruir(filas, "j0").seleccion).toEqual(e.seleccion);
    });
});
