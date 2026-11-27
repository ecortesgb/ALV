// Contenido de Temperatura + Voltaje (Maestro v1.52): cada carta en su nivel, cartas de trago sin exigir alcohol,
// retos de contacto marcados y cartas nuevas fuera del filtro de 4 niveles.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "./index";
import { EJE_DE_MAZO, NIVELES_EJE } from "./catalogo";
import { cartasPermitidas } from "../engine/filtros";
const cartas = CONTENIDO.cartas;
const MAZOS = [...new Set(cartas.map(c => c.mazo))];
describe("Temperatura + Voltaje", () => {
    it("cada carta tiene nivel 1 a 3; las de mazos sin eje (salvo castigos) van en 1", () => {
        for (const c of cartas) {
            expect([1, 2, 3], c.id).toContain(c.nivel);
            if (!EJE_DE_MAZO[c.mazo] && !c.mazo.startsWith("castigo"))
                expect(c.nivel, c.id).toBe(1);
        }
    });
    it("los mazos de preguntas y retos tienen eje, y los niveles tienen nombre", () => {
        for (const m of ["verdad", "reto", "yo-nunca", "mas-probable", "que-prefieres", "conoces"])
            expect(EJE_DE_MAZO[m]).toBeDefined();
        expect(EJE_DE_MAZO["castigo"]).toBeUndefined(); // los castigos salen en cualquier nivel
        expect(NIVELES_EJE.temperatura[3]).toBe("Extremo");
        expect(NIVELES_EJE.voltaje[3]).toBe("Sobrecarga");
    });
    it("ningún nivel de Verdad ni de Reto se queda con menos de 20 cartas generales", () => {
        for (const mazo of ["verdad", "reto"])
            for (const n of [1, 2, 3]) {
                expect(cartas.filter(c => c.mazo === mazo && c.nivel === n && c.escenario === null).length, `${mazo} ${n}`).toBeGreaterThanOrEqual(20);
            }
    });
    it("las cartas de trago son de Drunk y nunca exigen alcohol", () => {
        for (const c of cartas) {
            const pide = (EJE_DE_MAZO[c.mazo] === "voltaje" || c.mazo.startsWith("castigo")) && /\b(trago|tragos|shot|sorbo)\b/i.test(c.texto);
            if (pide)
                expect(c.drunk, c.id).toBe(true);
            if (/alcohol/i.test(c.texto))
                expect(c.texto, c.id).toMatch(/con o sin alcohol/i);
        }
    });
    it("los retos con contacto físico llevan su marca", () => {
        for (const c of cartas.filter(c => EJE_DE_MAZO[c.mazo] === "voltaje")) {
            if (/(beso|besos|masaje|toma la mano|piernas|entrelazados|úntale|carga a)/i.test(c.texto))
                expect(c.contacto, c.id).toBe(true);
        }
    });
    it("el filtro de 4 niveles no ve las cartas nuevas (las partidas guardadas salen igual)", () => {
        const todo = {
            jugadores: Array.from({ length: 8 }, (_, i) => ({ id: `j${i}`, nombre: `J${i}`, parejaDe: `j${i ^ 1}` })),
            lugar: "interior", intensidad: 4, dificultad: 4, adulto: true, drunk: true,
        };
        const pool = cartasPermitidas(todo, cartas, MAZOS);
        expect(pool.some(c => c.soloEjes)).toBe(false);
        // Los castigos de la nave (mazo propio, Elías 24 nov) no los ve ningún juego de antes.
        expect(cartas.filter(c => !c.soloEjes && c.mazo !== "castigo-nave")).toHaveLength(283);
    });
    it("ids únicos", () => {
        expect(new Set(cartas.map(c => c.id)).size).toBe(cartas.length);
    });
    it("la herramienta de conteo usa el mismo eje por mazo que el catálogo", () => {
        const txt = readFileSync(new URL("../../tools/revisar-contenido.mjs", import.meta.url), "utf8");
        for (const [mazo, eje] of Object.entries(EJE_DE_MAZO))
            expect(txt, mazo).toMatch(new RegExp(`"?${mazo}"?: "${eje}"`));
    });
});
