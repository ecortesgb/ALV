import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PREMIOS_NIVEL, premiosEntre, premiosValidos, siguientePremio } from "./premiosNivel";
const aqui = dirname(fileURLToPath(import.meta.url));
describe("premios por nivel", () => {
    it("todas las piezas de premio son bloqueables", () => { expect(premiosValidos()).toBe(true); });
    it("subir de 1 a 4 da los premios de 2, 3 y 4; sin subir no da nada", () => {
        expect(premiosEntre(1, 4).map(p => p.nivel)).toEqual([2, 3, 4]);
        expect(premiosEntre(4, 4)).toEqual([]);
    });
    it("el siguiente premio salta los niveles sin premio", () => {
        expect(siguientePremio(8)).toEqual({ nivel: 10, pieza: "MOM_fuego" });
        expect(siguientePremio(99)).toBeNull();
    });
    it("la migración 035 tiene exactamente la misma lista", () => {
        const sql = readFileSync(join(aqui, "../../supabase/migrations/035_premios_por_nivel.sql"), "utf8");
        const bloque = sql.slice(sql.indexOf("-- generado: premios"), sql.indexOf("-- fin generado"));
        const enSql = [...bloque.matchAll(/\('([A-Za-z0-9_]+)', (\d+)\)/g)].map(m => `${m[1]}@${m[2]}`).sort();
        const enTs = Object.entries(PREMIOS_NIVEL).flatMap(([n, ids]) => ids.map(id => `${id}@${n}`)).sort();
        expect(enSql).toEqual(enTs);
    });
});
