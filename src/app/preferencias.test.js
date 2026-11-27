import { describe, expect, it } from "vitest";
import { limpiarPreferencias, PREFERENCIAS_INICIALES } from "./preferencias";
describe("preferencias del aparato", () => {
    it("sin nada guardado usa los valores iniciales", () => {
        expect(limpiarPreferencias(null)).toEqual(PREFERENCIAS_INICIALES);
    });
    it("descarta valores sin sentido y acota el volumen", () => {
        const p = limpiarPreferencias({ efectos: "sí", volumenEfectos: 400, calidad: "ultra", letra: "enorme", modoTV: 1, animaciones: false });
        expect(p.efectos).toBe(true);
        expect(p.volumenEfectos).toBe(100);
        expect(p.calidad).toBe("auto");
        expect(p.letra).toBe("normal");
        expect(p.modoTV).toBe(false);
        expect(p.animaciones).toBe(false);
    });
    it("respeta el interruptor viejo de sonidos la primera vez", () => {
        expect(limpiarPreferencias(null, "no").efectos).toBe(false);
        expect(limpiarPreferencias({ efectos: true }, "no").efectos).toBe(true);
    });
});
