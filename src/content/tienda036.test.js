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
    it("comodines a la venta: 036 (básicos) + 052 (los demás), con su precio de reposición (050 y 052)", () => {
        const fila = /insert into public\.comodines_tienda \(id, especial\) values (.+);/.exec(sql);
        expect(fila).not.toBeNull();
        const basicos = [...fila[1].matchAll(/\('([a-z-]+)', (true|false)\)/g)].map(m => [m[1], m[2] === "true"]);
        const sql052 = readFileSync(new URL("../../supabase/migrations/052_comodines_y_premios_personajes.sql", import.meta.url), "utf8");
        const bloque = sql052.slice(sql052.indexOf("insert into public.comodines_tienda"), sql052.indexOf("on conflict (id)"));
        const nuevos = [...bloque.matchAll(/\('([a-z-]+)', (true|false), (\d+)\)/g)];
        expect([...basicos, ...nuevos.map(m => [m[1], m[2] === "true"])]).toEqual(COMODINES.map(c => [c.id, c.especial]));
        const sql050 = readFileSync(new URL("../../supabase/migrations/050_reposicion_comodines.sql", import.meta.url), "utf8");
        const precios = Object.fromEntries([...[...sql050.matchAll(/when '([a-z-]+)' then (\d+)/g)].map(m => [m[1], Number(m[2])]),
            ...nuevos.map(m => [m[1], Number(m[3])])]);
        expect(precios).toEqual(Object.fromEntries(COMODINES.map(c => [c.id, c.reposicion])));
    });
    it("garantía y tope de comodines", () => {
        expect(sql).toContain("v_sin_e + 1 >= 8");
        expect(sql).toContain("v_sin_l + 1 >= 25");
        expect(sql).toContain("v_cant >= 9");
    });
});
