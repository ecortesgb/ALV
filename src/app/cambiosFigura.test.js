import { describe, expect, it } from "vitest";
import { cambiosEntre, pideAviso, tomarPartes } from "./cambiosFigura";
import { colorTorso, figuraNueva, ponerCapa, ponerPelo, ponerTorsoCompleto, vestirCompleto } from "./editarFigura";
import trajes from "../content/trajes-figura.json";
import { SAGAS, trajesUsados } from "../content/sagas";
const traje = (id) => trajes.trajes.find(t => t.id === id).figura;
describe("aviso antes de reemplazar o quitar", () => {
    it("cambiar un pelo común por otro, o un color, no pregunta", () => {
        const f = figuraNueva();
        expect(pideAviso(cambiosEntre(f, ponerPelo(f, "HAIR_014")))).toBe(false);
        expect(cambiosEntre(f, colorTorso(f, "#123456"))).toEqual([]);
    });
    it("poner algo donde no había nada no pregunta", () => {
        const f = figuraNueva();
        expect(pideAviso(cambiosEntre(f, ponerCapa(f, { id: "CAPE_001", color: "#c91a09" })))).toBe(false);
    });
    it("quitar algo pregunta y dice qué se va", () => {
        const f = ponerCapa(figuraNueva(), { id: "CAPE_001", color: "#c91a09" });
        const cs = cambiosEntre(f, ponerCapa(f, null));
        expect(pideAviso(cs)).toBe(true);
        expect(cs).toEqual([expect.objectContaining({ parte: "Capa", despues: null })]);
    });
    it("ponerse un personaje (varias partes) pregunta", () => {
        const f = figuraNueva();
        expect(pideAviso(cambiosEntre(f, vestirCompleto(f, traje("batman"))))).toBe(true);
    });
    it("reemplazar una pieza original pregunta", () => {
        const f = ponerTorsoCompleto(figuraNueva(), "PRINT_004");
        expect(pideAviso(cambiosEntre(f, ponerTorsoCompleto(f, "PRINT_020")))).toBe(true);
    });
});
describe("tomar partes de un personaje", () => {
    it("solo el torso del Capitán: mi pelo, mi cara y mis piernas se quedan", () => {
        const f = ponerPelo(figuraNueva(), "HAIR_014");
        const g = tomarPartes(f, traje("capitan-america"), ["torso"]);
        expect(g.ropa.torso.estampado).toBe("PRINT_001");
        expect(g.identidad.cabello?.id).toBe("HAIR_014");
        expect(g.ropa.piernas.color).toBe(f.ropa.piernas.color);
        expect(g.nombre).toBe(f.nombre);
    });
    it("traje del Capitán con la máscara de Spider-Man", () => {
        const cap = vestirCompleto(figuraNueva(), traje("capitan-america"));
        const g = tomarPartes(cap, traje("spider-man"), ["pelo"]);
        expect(g.accesorios.cara?.id).toBe("FACE_012");
        expect(g.ropa.torso.estampado).toBe("PRINT_001");
    });
});
describe("catálogo de sagas", () => {
    it("cada versión lista apunta a un traje que existe", () => {
        const ids = new Set(trajes.trajes.map(t => t.id));
        for (const t of trajesUsados())
            expect(ids.has(t), t).toBe(true);
    });
    it("trae las 5 sagas y los 25 personajes de la lista de Elías", () => {
        expect(SAGAS.map(s => s.nombre)).toEqual(["Marvel", "DC Comics", "Star Wars", "Harry Potter"]);
        expect(SAGAS[0].grupos.map(g => g.nombre)).toEqual(["Avengers", "X-Men"]);
        expect(SAGAS.flatMap(s => s.grupos.flatMap(g => g.personajes)).length).toBe(25);
        // Etapa 5: todos los personajes y versiones ya tienen su traje armado.
        expect(SAGAS.flatMap(s => s.grupos.flatMap(g => g.personajes.flatMap(p => p.versiones))).filter(v => !v.traje)).toEqual([]);
    });
});
