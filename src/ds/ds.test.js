import { describe, expect, it } from "vitest";
import * as ds from ".";
import { ICONOS } from "./iconos";
import tokens from "./tokens.css?raw";
import componentes from "./componentes.css?raw";
describe("Design System en código", () => {
    it("están los 13 componentes aprobados", () => {
        expect(ds.COMPONENTES_DS).toHaveLength(13);
        for (const c of ds.COMPONENTES_DS)
            expect(typeof ds[c], c).toBe("function");
    });
    it("los tokens son los de la fuente aprobada y viven dentro de .D", () => {
        expect(tokens).toContain("No editar a mano");
        expect(tokens).not.toContain(":root");
        for (const t of ["--noche: #0d1a45", "--tinta: #0a1030", "--amarillo: #ffd23f", "--verde: #35b84a", "--rojo-fbi: #ff3d4a", "--inclinacion: -9deg", "--tiempo-toque: 150ms", "--radio-panel: 11px"])
            expect(tokens).toContain(t);
    });
    it("los estilos de componentes están copiados y todos van dentro de .D", () => {
        expect(componentes).toContain(".D .d-btn{");
        expect(componentes).toContain("prefers-reduced-motion");
        // Toda regla con clase que no sea de animación o de icono lleva el prefijo .D.
        const reglas = componentes.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@import[^;]*;/g, "").replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, "");
        for (const sel of reglas.match(/(^|\})\s*([^{}@]+)\{/g) ?? []) {
            const s = sel.replace(/^\}?\s*/, "").replace(/\{$/, "").trim();
            if (!s || s === ".ic" || s.startsWith("from") || s.startsWith("to") || /^\d/.test(s))
                continue;
            for (const parte of s.split(","))
                expect(parte.trim().startsWith(".D"), parte).toBe(true);
        }
    });
    it("los 22 iconos de la fuente", () => {
        expect(Object.keys(ICONOS)).toHaveLength(22);
        expect(ICONOS.finger).toMatch(/^M/);
    });
    it("la ciudad siempre es la misma con la misma semilla", () => {
        expect(ds.ciudadGotica(21)).toEqual(ds.ciudadGotica(21));
        expect(ds.ciudadGotica(21)).not.toEqual(ds.ciudadGotica(33));
        expect(ds.ciudadGotica(21).length).toBeGreaterThan(100);
    });
});
