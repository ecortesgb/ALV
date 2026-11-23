// La copia del catálogo en la app (content/logros.ts) debe ser igual a la que inserta la migración 042.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOGROS_ETAPA1 } from "./logros";

const bloqueDe = (archivo: string) => {
  const sql = readFileSync(join(__dirname, "../../supabase/migrations", archivo), "utf8");
  const i = sql.indexOf("insert into public.logros (");
  return sql.slice(i, sql.indexOf(";", i));
};
const bloque = bloqueDe("042_logros.sql") + bloqueDe("041_torneos.sql");
const filas = [...bloque.matchAll(/\(\s*'([a-z0-9-]+)',\s*'([a-z]+)',\s*(null|'[a-z0-9-]+'),\s*'([a-z]+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*'([^']+)',\s*(\d+)\)/g)]
  .map(m => ({ clave: m[1], categoria: m[2], juego: m[3] === "null" ? null : m[3]!.slice(1, -1), rareza: m[4], nombre: m[5], descripcion: m[6], meta: Number(m[7]), recompensa: m[8], orden: Number(m[9]) }));

describe("catálogo de logros = migraciones 042 y 041", () => {
  it("mismos logros, mismos datos", () => {
    expect(filas.length).toBe(19);
    const orden = (xs: { orden: number }[]) => [...xs].sort((a, b) => a.orden - b.orden);
    expect(orden(filas)).toEqual(orden(LOGROS_ETAPA1));
  });
  it("ningún logro da XP ni habla de beber", () => {
    for (const l of LOGROS_ETAPA1) {
      expect(l.recompensa).not.toMatch(/xp|moneda/i);
      expect(`${l.nombre} ${l.descripcion}`).not.toMatch(/beb|trago|shot|tom[aó]/i);
    }
  });
});
