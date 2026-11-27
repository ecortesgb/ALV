// Rediseño del personalizador (2026-11-26): piezas genéricas, su grupo por tipo y movimientos de otros personajes.
import { describe, expect, it } from "vitest";
import { leerFicha } from "./ficha";
import { BASE_CREAR, figuraInicial, planoConstructor, ponerPieza, teñir } from "./constructorDatos";
import { grupoGenerica, piezasGenericas } from "./genericas";
import { resolverFigura, todasLasPiezas } from "./integracion";
import { baseGenerica, conMovimientos, elegirMovimiento, movimientosElegidos, opcionesMovimiento } from "./movimientos";
const ficha = (id, grupo, especial, extra = {}) => {
    const r = leerFicha({
        id, nombre: id, saga: "marvel", grupo, bando: "heroe", familia: "minifig", rig: "esqueleto", glb: id + ".glb",
        fotos: { tarjeta: id + "-tarjeta.webp", busto: id + "-busto.webp" }, huesos: { cabeza: "Head" },
        animaciones: { mapa: { reposo: "Idle", saludo: "WAVE", victoria: "CELEBRATION3", derrota: "KNOCKEDDOWN", especial }, respaldo: {}, vida: [], sentado: null },
        medidas: { altura: 0.38, pies_en_cero: true, frente: "+Z" }, carga: { colores_srgb: false, rugosidad: null, metal: [] }, origen: { fuente: "juego" },
        publica: false, calidad: { estado: "jugable" }, ...extra,
    });
    if (!r.ok)
        throw new Error(r.errores.join());
    return r.ficha;
};
const cat = new Map([
    [BASE_CREAR, { ficha: ficha(BASE_CREAR, "otros-marvel", "CAMERA_SHOOT"), base: "http://x/catalogo/peter-parker/" }],
    ["thor", { ficha: ficha("thor", "avengers", "SHOOT_CATCH"), base: "http://x/catalogo/thor/" }],
    ["hulk", { ficha: ficha("hulk", "avengers", "SMASH", { familia: "bigfig" }), base: "http://x/catalogo/hulk/" }],
]);
const datos = {
    base: { glb: "base.glb", animaciones: { mapa: { reposo: "IDLE2", saludo: "WAVE" }, vida: ["CHEER", "Shrug"] }, juego: { clips: { caminar: "Walk", golpe: "FIGHTCOMBO" } } },
    piezas: [
        { id: "torso-civil-m01", parte: "torso", nombre: "Civil 1", glb: "torso/torso-civil-m01.glb", foto: "torso/torso-civil-m01.webp", tintes: [{ material: "ropa", paleta: "ropa" }], inicial: { ropa: "#ffec6b" } },
        { id: "cabello-civil-m02", parte: "cabello", nombre: "Gorra", clase: "sombrero", glb: "cabello/cabello-civil-m02.glb", foto: "cabello/cabello-civil-m02.webp", tintes: [], inicial: {} },
        { id: "malo", parte: "torso", nombre: "x", glb: "../fuera.glb", foto: "torso/x.webp", tintes: [], inicial: {} },
    ],
};
const gen = { familia: "minifig", base: "http://x/piezas/minifig/", datos };
const ind = { catalogo: cat, ranuras: new Map([[BASE_CREAR, ["head", "torso"]], ["thor", ["torso"]]]), genericas: [gen] };
describe("piezas genéricas", () => {
    it("se validan, resuelven sus rutas y traen grupo y tintes", () => {
        const { piezas, errores } = piezasGenericas(gen, undefined);
        expect(errores).toEqual(["malo"]);
        expect(piezas.get("torso-civil-m01")).toMatchObject({ origen: "generica", grupo: "casual", glb: "http://x/piezas/minifig/torso/torso-civil-m01.glb", ranuras: ["torso", "neck"] });
        expect(piezas.get("cabello-civil-m02")).toMatchObject({ grupo: "gorras", ranuras: ["hair", "headgear"] });
    });
    it("lo no anotado cae en el primer grupo de su parte", () => {
        expect(grupoGenerica("cara-nueva", "cara")).toBe("normales");
        expect(grupoGenerica("x", "cadera")).toBe("todas");
    });
    it("se juntan con las originales y tiñen por material con su paleta", () => {
        const todas = todasLasPiezas(ind);
        expect(todas.get("thor--torso")).toMatchObject({ origen: "original", grupo: "avengers" });
        const f = teñir(ponerPieza(figuraInicial(cat), todas.get("torso-civil-m01")), "torso", "ropa", "rojo");
        expect(planoConstructor("yo", f, cat, todas).piezas[0].tintes).toEqual([{ material: "ropa", hex: "#c91a09" }]);
        const sinColor = ponerPieza(figuraInicial(cat), todas.get("torso-civil-m01"));
        expect(planoConstructor("yo", sinColor, cat, todas).piezas[0].tintes).toEqual([{ material: "ropa", hex: "#ffec6b" }]);
    });
});
describe("movimientos", () => {
    const base = baseGenerica(gen);
    it("la base genérica ofrece solo gestos con nombre (no caminar ni reposo)", () => {
        expect(base).toEqual({ familia: "minifig", glb: "http://x/piezas/minifig/base.glb", clips: ["WAVE", "CHEER", "Shrug", "FIGHTCOMBO"] });
    });
    it("originales sin repetir clip, primero los del gesto; nada de otra familia", () => {
        const ops = opcionesMovimiento(cat, base, "especial");
        const orig = ops.filter(o => o.origen === "original").map(o => o.id);
        expect(orig.slice(0, 2)).toEqual(["p:peter-parker:especial", "p:thor:especial"]);
        expect(orig).toContain("p:peter-parker:saludo");
        expect(orig.some(id => id.includes("hulk"))).toBe(false);
        expect(orig.filter(id => id.endsWith(":saludo"))).toHaveLength(1); // WAVE lo comparten: sale una vez
    });
    it("se guardan en extensiones y llegan al plano como clipsExt", () => {
        let f = elegirMovimiento(figuraInicial(cat), "especial", "p:thor:especial");
        f = elegirMovimiento(f, "saludo", "g:CHEER");
        expect(movimientosElegidos(f)).toEqual({ especial: "p:thor:especial", saludo: "g:CHEER" });
        const plano = resolverFigura("yo", f, cat, new Map(), base);
        expect(plano.clipsExt).toEqual({
            especial: { glb: "http://x/catalogo/thor/thor.glb", clip: "SHOOT_CATCH", carga: { colores_srgb: false, rugosidad: null, metal: [] } },
            saludo: { glb: "http://x/piezas/minifig/base.glb", clip: "CHEER" },
        });
        expect(movimientosElegidos(elegirMovimiento(f, "saludo", null))).toEqual({ especial: "p:thor:especial" });
    });
    it("lo inválido o de otra familia se ignora", () => {
        let f = elegirMovimiento(figuraInicial(cat), "especial", "p:hulk:especial");
        f = elegirMovimiento(f, "victoria", "g:NOEXISTE");
        f = { ...f, extensiones: { alv: { animaciones: { propias: { ...f.extensiones.alv.animaciones.propias, derrota: "<script>" } } } } };
        const plano = resolverFigura("yo", f, cat, new Map(), base);
        expect(plano.clipsExt).toBeUndefined();
        expect(conMovimientos(plano, f, cat, null)).toBe(plano);
    });
});
