import { describe, expect, it } from "vitest";
import { PERFIL_PERSONAJE } from "./caracter";
import datos from "../content/perfiles-animacion.json";
describe("personalidad por defecto de cada personaje", () => {
    it("cada perfil de la tabla existe en perfiles-animacion.json", () => {
        const perfiles = Object.keys(datos.perfiles);
        for (const [id, p] of Object.entries(PERFIL_PERSONAJE))
            expect(perfiles, id).toContain(p);
        expect(Object.keys(PERFIL_PERSONAJE).length).toBeGreaterThan(130);
    });
});
