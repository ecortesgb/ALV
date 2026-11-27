// La frontera (Maestro §22.1): lo que dibuja la TV no usa vistaJugador, privado, respuestas, manos ni semilla.
// Revisa cada juegos/<mecánica>/tv.tsx, todo roles/pantalla/ salvo motor.ts (el único que corre el motor) y pantallas/SalaEspera.tsx.
// Y los componentes del Design System no hablan con la base.
import { describe, expect, it } from "vitest";
const PROHIBIDAS = ["vistaJugador", "privado", "respuestas", "manos", "semilla"];
/** Quita comentarios para no confundir una explicación con un uso. */
export function sinComentarios(codigo) {
    return codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}
/** Palabras prohibidas que usa un archivo de la TV. */
export function violaciones(codigo) {
    const limpio = sinComentarios(codigo);
    return PROHIBIDAS.filter(p => new RegExp(`\\b${p}\\b`).test(limpio));
}
const tv = {
    ...import.meta.glob("../juegos/**/tv.tsx", { query: "?raw", import: "default", eager: true }),
    ...import.meta.glob(["./pantalla/**/*.{ts,tsx}", "!./pantalla/**/motor.ts", "!./pantalla/**/*.test.ts"], { query: "?raw", import: "default", eager: true }),
    // La sala de espera con pedestales también se dibuja en la TV.
    ...import.meta.glob("../pantallas/SalaEspera.tsx", { query: "?raw", import: "default", eager: true }),
};
const ds = import.meta.glob(["../ds/**/*.{ts,tsx}", "!../ds/**/*.test.ts"], { query: "?raw", import: "default", eager: true });
describe("La frontera de la TV", () => {
    it("el detector encuentra cada palabra prohibida y no se confunde con comentarios", () => {
        expect(violaciones("const v = vistaJugador(e, id);")).toEqual(["vistaJugador"]);
        expect(violaciones("e.privado[j]; e.respuestas; e.manos; e.semilla")).toEqual(["privado", "respuestas", "manos", "semilla"]);
        expect(violaciones("// aquí no se lee lo privado\n/* ni la semilla */ const x = vistaPublica(e);")).toEqual([]);
        expect(violaciones("const contestaron = v.contestaron; const cartasEnMano = 1;")).toEqual([]);
    });
    it("hay archivos de la TV que revisar", () => {
        expect(Object.keys(tv).length).toBeGreaterThan(0);
    });
    for (const [archivo, codigo] of Object.entries(tv)) {
        it(`${archivo} solo usa la vista pública`, () => {
            expect(violaciones(codigo)).toEqual([]);
        });
    }
});
describe("Los componentes del Design System no hablan con la base", () => {
    it("hay componentes que revisar", () => { expect(Object.keys(ds).length).toBeGreaterThanOrEqual(13); });
    for (const [archivo, codigo] of Object.entries(ds)) {
        it(`${archivo}`, () => {
            const limpio = sinComentarios(codigo);
            expect(limpio).not.toMatch(/from\s+["'][^"']*(servicios|nube|supabase)[^"']*["']/);
            expect(limpio).not.toMatch(/\bfetch\(/);
            expect(limpio).not.toMatch(/dangerouslySetInnerHTML/);
        });
    }
});
