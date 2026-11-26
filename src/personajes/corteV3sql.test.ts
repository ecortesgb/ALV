// La prueba remota de la 046 lleva copia EXACTA de la subida y de la reversión (si una cambia, hay que regenerarla).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leer = (r: string) => readFileSync(new URL(r, import.meta.url), "utf8").replace(/\r\n/g, "\n").trimEnd();
describe("046: la prueba remota usa el mismo SQL que se aplicaría", () => {
  const remota = leer("../../supabase/pruebas/046_remota_prueba.sql");
  it("contiene la subida y la reversión tal cual, y termina en ROLLBACK", () => {
    expect(remota).toContain(leer("../../supabase/pendientes/046_figuras_v3_NO_APLICAR.sql"));
    expect(remota).toContain(leer("../../supabase/pendientes/046_figuras_v3_reversion.sql"));
    expect(remota.startsWith("--")).toBe(true);
    expect(remota.endsWith("rollback;")).toBe(true);
    expect(remota.indexOf("begin;")).toBeLessThan(remota.indexOf("-- ===== 046"));
  });
});
