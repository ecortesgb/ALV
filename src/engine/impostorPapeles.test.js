// El impostor en la nave con papeles (Elías, 24 nov): sin sala de espera; se configura en «Modo de juego» y, después
// de la carga, la partida nace en la mesa con los papeles repartidos. Cada quien marca «visto» y «discutir» abre la vuelta.
// Sin `papeles`, todo igual (lo cubren impostorNave.test.ts, impostor.test.ts y la equivalencia del núcleo).
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida, etapaImpostor, SALTAR_VOTO } from "./partida";
import { aAccion, armarArranque, reconstruir, relojLogico } from "./nucleo";
import { vistaJugador, vistaPublica } from "./vistas";
const impostorDef = JUEGOS.find(j => j.id === "impostor");
const gente = (n) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
let k = 0;
const juega = (e, a) => aplicar(e, { ...a, id: `s${++k}` }, CONTENIDO);
const priv = (e, j) => e.privado[j];
const todos = (n) => Array.from({ length: n }, (_, i) => `j${i}`);
function arranque(n, semilla, impostor = {}, extra = {}) {
    return armarArranque(gente(n), "impostor", 8, 2, semilla, { ...extra, impostor: { cantidad: 1, tema: null, papeles: true, ...impostor } });
}
function partida(n = 4, semilla = 11, impostor = {}, extra = {}) {
    const a = arranque(n, semilla, impostor, extra);
    return crearPartida(impostorDef, a.cfg, a.semilla, CONTENIDO, a.rondas);
}
const enPistas = (n = 4, semilla = 11) => juega(partida(n, semilla), { tipo: "discutir" });
describe("papeles en la nave", () => {
    it("nace en la mesa con los papeles repartidos y las reglas de la nave", () => {
        const e = partida(5, 9, { cantidad: 2 });
        expect(etapaImpostor(e)).toBe("papeles");
        expect(e.vistos).toEqual([]);
        expect(e.cfg.impostor).toMatchObject({ nave: true, papeles: true });
        const ps = todos(5).map(j => priv(e, j));
        expect(ps.filter(p => p.rol === "impostor")).toHaveLength(2);
        expect(new Set(ps.filter(p => p.rol === "civil").map(p => p.palabra)).size).toBe(1);
        for (const p of ps.filter(p => p.rol === "impostor"))
            expect(p.companeros).toHaveLength(1);
    });
    it("sin papeles nada cambia", () => {
        const a = armarArranque(gente(4), "impostor", 8, 2, 5, { impostor: { cantidad: 1, tema: null, nave: true } });
        expect(a.cfg.impostor?.papeles).toBeUndefined();
        const e = crearPartida(impostorDef, a.cfg, a.semilla, CONTENIDO, a.rondas);
        expect(e.naveEtapa).toBeUndefined();
        expect(etapaImpostor(e)).toBe("pistas");
    });
    it("la categoría elegida se respeta y misma semilla da los mismos papeles", () => {
        const a = partida(4, 21, { tema: "s-obj" }), b = partida(4, 21, { tema: "s-obj" });
        expect(a.privado).toEqual(b.privado);
        expect(priv(a, "j0").tema).toBe("Objetos");
    });
    it("la pista solo la ve el impostor y solo con la opción", () => {
        const con = partida(4, 13, { pista: true, tema: "s-pel" });
        const tema = CONTENIDO.temas.find(t => t.id === "s-pel");
        const imp = todos(4).find(j => priv(con, j).rol === "impostor");
        const civil = todos(4).find(j => priv(con, j).rol === "civil");
        expect(priv(con, imp).pista).toBe(tema.pistas[priv(con, civil).palabra]);
        expect(priv(con, civil).pista).toBeUndefined();
        for (const j of todos(4))
            expect(priv(partida(4, 13, { tema: "s-pel" }), j).pista).toBeUndefined();
    });
    it("al azar solo salen categorías de la nave, y Adultos solo con Temperatura alta", () => {
        const vistos = new Set();
        for (let s = 1; s <= 200; s++) {
            const t = priv(partida(4, s), "j0").tema;
            const tema = CONTENIDO.temas.find(x => x.nombre === t && x.soloNave);
            expect(tema, t).toBeDefined();
            expect(tema.id).not.toBe("s-adu");
            vistos.add(tema.id);
        }
        expect(vistos.size).toBeGreaterThanOrEqual(8);
        // Adultos pedido sin Temperatura alta: no sale (se sortea entre las permitidas).
        for (let s = 1; s <= 30; s++)
            expect(priv(partida(4, s, { tema: "s-adu" }), "j0").tema).not.toBe("Adultos");
        expect(priv(partida(4, 3, { tema: "s-adu" }, { ejes: { temperatura: 3, voltaje: 1, drunk: false } }), "j0").tema).toBe("Adultos");
        // Sin papeles nunca sale una categoría de la nave.
        for (let s = 1; s <= 100; s++) {
            const a = armarArranque(gente(4), "impostor", 8, 2, s, { impostor: { cantidad: 1, tema: null, nave: true } });
            const t = crearPartida(impostorDef, a.cfg, a.semilla, CONTENIDO, a.rondas).privado.j0.tema;
            expect(CONTENIDO.temas.find(x => x.nombre === t)?.soloNave, t).toBeFalsy();
        }
    });
    it("visto: una vez por jugador y solo en papeles", () => {
        let e = juega(partida(), { tipo: "visto", jugador: "j1" });
        expect(e.vistos).toEqual(["j1"]);
        expect(juega(e, { tipo: "visto", jugador: "j1" })).toBe(e);
        expect(juega(e, { tipo: "visto", jugador: "x9" })).toBe(e);
        e = juega(e, { tipo: "discutir" });
        expect(juega(e, { tipo: "visto", jugador: "j2" })).toBe(e);
    });
    it("discutir abre la vuelta de palabras aunque falte alguien", () => {
        const e = enPistas();
        expect(e.naveEtapa).toBeUndefined();
        expect(etapaImpostor(e)).toBe("pistas");
        expect(e.turnoDe).toBeDefined();
    });
    it("las acciones de la partida no hacen nada en papeles", () => {
        const e = partida();
        for (const a of [{ tipo: "revelar" }, { tipo: "seguir-sin" }, { tipo: "saltar" }, { tipo: "tiempo" }, { tipo: "pista", jugador: "j0", texto: "hola" }, { tipo: "contestar", jugador: "j0", valor: "j1" }]) {
            expect(juega(e, a), a.tipo).toBe(e);
        }
    });
    it("solo quien controla abre la discusión; «visto» viaja como fila carta", () => {
        expect(aAccion({ id: "f1", jugador: "j1", tipo: "control", datos: { que: "discutir" }, creada: "" }, ["j0"])).toBeNull();
        expect(aAccion({ id: "f1", jugador: "j0", tipo: "control", datos: { que: "discutir" }, creada: "" }, ["j0"])).toEqual({ id: "f1", tipo: "discutir" });
        expect(aAccion({ id: "f2", jugador: "j2", tipo: "carta", datos: { que: "visto" }, creada: "" }, ["j0"])).toEqual({ id: "f2", tipo: "visto", jugador: "j2" });
    });
    it("en papeles nadie está «listo»: no sale la revelación automática", () => {
        expect(relojLogico(partida()).listos).toBe(false);
        expect(relojLogico(partida()).hayEspera).toBe(false);
    });
    it("guarda las palabras de cada vuelta", () => {
        let e = enPistas(4, 17);
        for (let v = 1; v <= 2; v++) {
            for (const j of [...e.seleccion.orden])
                e = juega(e, { tipo: "pista", jugador: j, texto: `p${v}-${j}` });
            for (const j of todos(4))
                e = juega(e, { tipo: "contestar", jugador: j, valor: SALTAR_VOTO });
            e = juega(e, { tipo: "revelar" });
            if (v === 1)
                e = juega(e, { tipo: "siguiente" });
        }
        expect(e.palabrasVueltas?.j2).toEqual(["p1-j2"]);
        expect(juega(e, { tipo: "siguiente" }).palabrasVueltas?.j2).toEqual(["p1-j2", "p2-j2"]);
    });
    it("reconstruir da lo mismo que aplicar en orden", () => {
        const a = arranque(4, 31, { pista: true, tema: "s-fut" });
        const filas = [
            { id: "arr", jugador: "j0", tipo: "control", datos: { que: "arranque", ...a }, creada: "" },
            { id: "a3", jugador: "j1", tipo: "carta", datos: { que: "visto" }, creada: "" },
            { id: "a4", jugador: "j2", tipo: "carta", datos: { que: "visto" }, creada: "" },
            { id: "a5", jugador: "j0", tipo: "control", datos: { que: "discutir" }, creada: "" },
        ];
        const r = reconstruir(filas, "j0");
        let e = { ...crearPartida(impostorDef, a.cfg, a.semilla, CONTENIDO, a.rondas), control: "j0" };
        for (const f of filas.slice(1))
            e = aplicar(e, aAccion(f, ["j0"]), CONTENIDO);
        expect(r).toEqual(e);
        expect(etapaImpostor(r)).toBe("pistas");
    });
});
describe("vistas con papeles", () => {
    it("en papeles: quiénes ya vieron, sin roles, palabra ni pista", () => {
        let e = partida(4, 13, { pista: true, tema: "s-pel" });
        e = juega(e, { tipo: "visto", jugador: "j2" });
        const v = vistaPublica(e);
        expect(v.impostor?.etapa).toBe("papeles");
        expect(v.impostor?.vistos).toEqual(["j2"]);
        expect(v.impostor?.palabras).toEqual({});
        const civil = todos(4).find(j => priv(e, j).rol === "civil");
        const imp = todos(4).find(j => priv(e, j).rol === "impostor");
        const texto = JSON.stringify(v);
        expect(texto).not.toContain(priv(e, civil).palabra);
        expect(texto).not.toContain(`"${priv(e, imp).pista}"`);
    });
    it("cada quien ve lo suyo: el impostor sus compañeros y la pista, el civil su palabra", () => {
        const e = partida(6, 3, { cantidad: 2, pista: true });
        const imp = todos(6).find(j => priv(e, j).rol === "impostor");
        const civil = todos(6).find(j => priv(e, j).rol === "civil");
        const mi = vistaJugador(e, imp).mio, mc = vistaJugador(e, civil).mio;
        expect(mi.companeros).toHaveLength(1);
        expect(mi.pista).toBeTruthy();
        expect(mc.palabra).toBeTruthy();
        expect(mc.pista).toBeUndefined();
    });
    it("el tablero junta las palabras de las vueltas cerradas y la actual", () => {
        let e = enPistas(4, 17);
        for (const j of [...e.seleccion.orden])
            e = juega(e, { tipo: "pista", jugador: j, texto: `a-${j}` });
        for (const j of todos(4))
            e = juega(e, { tipo: "contestar", jugador: j, valor: SALTAR_VOTO });
        e = juega(juega(e, { tipo: "revelar" }), { tipo: "siguiente" });
        const primero = e.seleccion.orden[0];
        e = juega(e, { tipo: "pista", jugador: primero, texto: "b" });
        expect(vistaPublica(e).impostor?.palabras?.[primero]).toEqual([`a-${primero}`, "b"]);
    });
    it("sin papeles la vista no trae palabras ni vistos", () => {
        const a = armarArranque(gente(4), "impostor", 8, 2, 5, { impostor: { cantidad: 1, tema: null, nave: true } });
        const v = vistaPublica(crearPartida(impostorDef, a.cfg, a.semilla, CONTENIDO, a.rondas));
        expect(v.impostor?.palabras).toBeUndefined();
        expect(v.impostor?.vistos).toBeUndefined();
    });
});
