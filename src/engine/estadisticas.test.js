// Datos por jugador que van a `resultados_partida.datos` (migración 040).
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida } from "./partida";
import { armarArranque } from "./nucleo";
import { vistaPublica } from "./vistas";
import { datosPorJugador } from "./estadisticas";
const gente = (n) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
let k = 0;
const juega = (e, a) => aplicar(e, { ...a, id: `es${++k}` }, CONTENIDO);
const def = (id) => JUEGOS.find(j => j.id === id);
const impostores = (e) => Object.entries(e.privado).filter(([, p]) => p.rol === "impostor").map(([j]) => j);
describe("El impostor con eliminación", () => {
    it("marca al impostor atrapado y cuenta los votos que recibió un civil", () => {
        const a = armarArranque(gente(4), "impostor", 8, 2, 11, { impostor: { cantidad: 1, tema: null } });
        let e = crearPartida(def("impostor"), a.cfg, a.semilla, CONTENIDO, a.rondas);
        const imp = impostores(e)[0];
        const civil = a.cfg.jugadores.map(j => j.id).find(j => j !== imp);
        // Vuelta 1: todos votan por un civil (el civil vota por otro civil) → sale el civil.
        for (const j of vistaPublica(e).impostor.orden)
            e = juega(e, { tipo: "pista", jugador: j, texto: "x" });
        const otroCivil = a.cfg.jugadores.map(j => j.id).find(j => j !== imp && j !== civil);
        for (const j of vistaPublica(e).esperados)
            e = juega(e, { tipo: "contestar", jugador: j, valor: j === civil ? otroCivil : civil });
        e = juega(e, { tipo: "revelar" });
        e = juega(e, { tipo: "siguiente" });
        // Vuelta 2: todos votan por el impostor.
        for (const j of vistaPublica(e).impostor.orden)
            e = juega(e, { tipo: "pista", jugador: j, texto: "y" });
        const otro = vistaPublica(e).esperados.find(j => j !== imp);
        for (const j of vistaPublica(e).esperados)
            e = juega(e, { tipo: "contestar", jugador: j, valor: j === imp ? otro : imp });
        e = juega(e, { tipo: "revelar" });
        const d = datosPorJugador(e);
        expect(d[imp]).toEqual({ impostor: true, atrapado: true, votosRecibidos: 0 });
        expect(d[civil].impostor).toBe(false);
        expect(d[civil].votosRecibidos).toBe(3);
    });
});
describe("El impostor clásico", () => {
    it("cada ronda tiene su impostor; quien lo fue queda marcado", () => {
        const juego = def("impostor");
        const cfg = { jugadores: gente(4), lugar: "cualquiera", intensidad: 2, dificultad: 2, adulto: false, drunk: false, turno: "orden" };
        let e = crearPartida(juego, cfg, 5, CONTENIDO, 3);
        const imp = impostores(e)[0];
        for (const j of vistaPublica(e).esperados)
            e = juega(e, { tipo: "contestar", jugador: j, valor: j === imp ? (j === "j0" ? "j1" : "j0") : imp });
        e = juega(e, { tipo: "revelar" });
        const d = datosPorJugador(e);
        expect(d[imp].impostor).toBe(true);
        expect(d[imp].atrapado).toBe(true);
        expect(Object.values(d).filter(x => x.impostor).length).toBe(1);
    });
});
describe("Verdad o reto", () => {
    it("cuenta las veces que eligió reto y las que tomó", () => {
        const a = armarArranque(gente(3), "verdad-reto", 6, 2, 7, { herramienta: "orden" });
        let e = crearPartida(def("verdad-reto"), a.cfg, a.semilla, CONTENIDO, a.rondas);
        const { pregunta, responde } = vistaPublica(e).verdadReto;
        e = juega(e, { tipo: "contestar", jugador: responde, valor: { elige: "reto" } });
        e = juega(e, { tipo: "contestar", jugador: pregunta, valor: { fuente: "voz" } });
        e = juega(e, { tipo: "contestar", jugador: pregunta, valor: "tomo" });
        e = juega(e, { tipo: "revelar" });
        const d = datosPorJugador(e);
        expect(d[responde]).toEqual({ reto: 1, tomo: 1 });
        expect(d[pregunta]).toEqual({ reto: 0, tomo: 0 });
    });
});
describe("otros juegos", () => {
    it("no manda datos", () => {
        const a = armarArranque(gente(3), "que-prefieres", 3, 2, 3);
        const e = crearPartida(def("que-prefieres"), a.cfg, a.semilla, CONTENIDO, a.rondas);
        expect(datosPorJugador(e)).toEqual({});
    });
});
describe("datosDeRepeticion (acciones guardadas)", () => {
    it("cuenta los votos al impostor de cada civil y el peor lugar", async () => {
        const { datosDeRepeticion } = await import("./estadisticas");
        const { reconstruir } = await import("./nucleo");
        const a = armarArranque(gente(4), "impostor", 8, 2, 21, { impostor: { cantidad: 1, tema: null } });
        let n = 0;
        const filas = [{ id: "arr", jugador: "j0", tipo: "control", datos: { que: "arranque", ...a }, creada: "" }];
        const fila = (jugador, tipo, datos) => filas.push({ id: `f${++n}`, jugador, tipo, datos, creada: "" });
        let e = reconstruir(filas, "j0");
        const imp = impostores(e)[0];
        const civiles = ["j0", "j1", "j2", "j3"].filter(j => j !== imp);
        for (const j of vistaPublica(e).impostor.orden)
            fila(j, "pista", { texto: "x" });
        // Dos civiles votan por el impostor, el tercero por un civil; el impostor vota por un civil.
        e = reconstruir(filas, "j0");
        for (const j of vistaPublica(e).esperados)
            fila(j, "contestar", { valor: j === imp ? civiles[0] : j === civiles[2] ? civiles[0] : imp });
        fila("j0", "control", { que: "revelar" });
        const d = datosDeRepeticion(filas, "j0");
        expect(d[civiles[0]].votoImpostor).toBe(1);
        expect(d[civiles[1]].votoImpostor).toBe(1);
        expect(d[civiles[2]].votoImpostor ?? 0).toBe(0);
        expect(d[imp].votoImpostor ?? 0).toBe(0);
        for (const j of ["j0", "j1", "j2", "j3"])
            expect(d[j].peorLugar).toBeGreaterThanOrEqual(1);
    });
});
