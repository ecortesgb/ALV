// La migración 036 lleva los sobres y comodines a mano: esta prueba revisa que sean iguales a content/tienda.ts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMODINES, SOBRES } from "./tienda";
const sql = readFileSync(new URL("../../supabase/migrations/036_tienda_monedas_y_sobres.sql", import.meta.url), "utf8");
const lineas = sql.split(/\r?\n/);
describe("036 igual a content/tienda.ts", () => {
    it("sobres: precio, piezas, comodines, pesos, secciones y mínimo", () => {
        for (const s of SOBRES) {
            const linea = lineas.find(l => l.trimStart().startsWith(`('${s.id}', `) && l.includes("{"));
            expect(linea, s.id).toBeDefined();
            const partes = /^\s*\((.*?), '(\{.*\})', (.*?)\)[,;]?$/.exec(linea);
            expect(partes, s.id).not.toBeNull();
            const [, inicio, pesos, fin] = partes;
            const [, precio, piezas, comodines] = inicio.split(", ");
            expect([Number(precio), Number(piezas), Number(comodines)], s.id).toEqual([s.precio, s.piezas, s.comodines]);
            expect(JSON.parse(pesos), s.id).toEqual(s.pesos);
            const corte = fin.startsWith("array[") ? fin.indexOf("]") + 1 : fin.indexOf(",");
            const secciones = fin.slice(0, corte), minimo = fin.slice(corte).replace(/^,\s*/, "");
            expect(secciones === "null" ? undefined : [...secciones.matchAll(/'(\w+)'/g)].map(m => m[1]), s.id).toEqual(s.secciones);
            expect(minimo === "null" ? undefined : minimo.replace(/'/g, ""), s.id).toEqual(s.minimo);
        }
    });
    it("comodines a la venta", () => {
        const fila = /insert into public\.comodines_tienda \(id, especial\) values (.+);/.exec(sql);
        expect(fila).not.toBeNull();
        const ids = [...fila[1].matchAll(/\('(\w+)', (true|false)\)/g)].map(m => [m[1], m[2] === "true"]);
        expect(ids).toEqual(COMODINES.map(c => [c.id, c.especial]));
    });
    it("garantía y tope de comodines", () => {
        expect(sql).toContain("v_sin_e + 1 >= 8");
        expect(sql).toContain("v_sin_l + 1 >= 25");
        expect(sql).toContain("v_cant >= 9");
    });
});
