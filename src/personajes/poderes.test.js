import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { leerFicha } from "./ficha";
import { poderesDeFicha } from "./plano";
import { PODERES } from "./poderes";
const FICHA = {
    id: "iron-man", nombre: "Iron Man", saga: "marvel", grupo: "avengers", bando: "heroe", familia: "minifig", rig: "esqueleto",
    glb: "iron-man.glb", fotos: { tarjeta: "iron-man-tarjeta.webp", busto: "iron-man-busto.webp" },
    huesos: { cabeza: "Head", mano_der: "RightHand" },
    animaciones: { mapa: { reposo: "Idle" }, respaldo: {}, vida: [], sentado: null },
    medidas: { altura: 0.4, pies_en_cero: true, frente: "+Z" }, carga: { colores_srgb: true, rugosidad: null, metal: [] },
    origen: { fuente: "juego" }, publica: false, calidad: { estado: "jugable" },
};
const ficha = (cambio = {}) => ({ ...structuredClone(FICHA), ...cambio });
describe("poderes de personaje", () => {
    it("la ficha acepta el bloque poderes y rechaza lo mal formado", () => {
        const r = leerFicha(ficha({ poderes: { glb: "iron-man-poderes.glb", clips: { volar: "fly", repulsor: "shoot" } } }));
        expect(r.ok && r.ficha.poderes).toEqual({ glb: "iron-man-poderes.glb", clips: { volar: "fly", repulsor: "shoot" } });
        for (const malo of [{ glb: "otro-poderes.glb", clips: { volar: "fly" } }, { glb: "iron-man-poderes.glb", clips: {} },
            { glb: "iron-man-poderes.glb", clips: { "../x": "fly" } }, { glb: "iron-man-poderes.glb", clips: { volar: "<b>" } }]) {
            expect(leerFicha(ficha({ poderes: malo })).ok, JSON.stringify(malo)).toBe(false);
        }
        expect(leerFicha(ficha()).ok).toBe(true);
    });
    it("solo se ofrecen los poderes con efecto y con clip en la ficha, en el orden de poderes.ts", () => {
        const r = leerFicha(ficha({ poderes: { glb: "iron-man-poderes.glb", clips: { volar: "fly", repulsor: "shoot", despegar: "Fly_Intro" } } }));
        if (!r.ok)
            throw new Error(r.errores.join());
        const p = poderesDeFicha(r.ficha, "https://x/iron-man/");
        expect(p.map(x => x.id)).toEqual(["repulsor", "volar"]);
        expect(p[0]).toMatchObject({ glb: "https://x/iron-man/iron-man-poderes.glb", clip: "shoot", nombre: "Repulsor" });
        expect(p[0].efectos[0].tipo).toBe("rayo");
    });
    it("cada efecto de poderes.ts existe en efectos.js", () => {
        const js = readFileSync("tools/personajes/efectos.js", "utf8");
        const tipos = JSON.parse(js.match(/const TIPOS = (\[[^\]]+\])/)[1].replace(/"/g, '"').replace(/\s+/g, " "));
        for (const [pj, defs] of Object.entries(PODERES))
            for (const [k, d] of Object.entries(defs))
                for (const e of [d.efecto, ...(d.efectos ?? [])])
                    expect(tipos, `${pj}.${k}`).toContain(e.tipo);
    });
});
