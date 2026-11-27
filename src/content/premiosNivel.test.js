import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { siguientePremio } from "./premiosNivel";
const aqui = dirname(fileURLToPath(import.meta.url));
describe("premios por nivel", () => {
    it("cada nivel desde el 2 tiene premio", () => {
        expect(siguientePremio(0)).toEqual({ nivel: 2 });
        expect(siguientePremio(1)).toEqual({ nivel: 2 });
        expect(siguientePremio(8)).toEqual({ nivel: 9 });
    });
    it("la 052 da personajes y la 035 quedó marcada para no aplicarse", () => {
        const sql = readFileSync(join(aqui, "../../supabase/migrations/052_comodines_y_premios_personajes.sql"), "utf8");
        expect(sql).toContain("create function public.reclamar_premios_nivel() returns table (personaje text, nivel smallint, rareza text)");
        expect(sql).toContain("random() < 0.7");
        const vieja = readFileSync(join(aqui, "../../supabase/migrations/035_premios_por_nivel.sql"), "utf8");
        expect(vieja.startsWith("-- NO APLICAR")).toBe(true);
    });
});
