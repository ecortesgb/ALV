// La migración 058 lleva a mano personajes, accesorios y sobres de la tienda v2: esta prueba revisa que sean iguales a content/.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCESORIOS } from "./accesoriosTienda";
import { PRECIO_ACCESORIO, PRECIO_PERSONAJE, rarezaPersonaje } from "./personajesTienda";
import { NUMEROS_PERSONAJES } from "./numerosPersonajes";
import { PROB_CUALQUIERA, SOBRES_ALV } from "./tienda";

const sql = readFileSync(new URL("../../supabase/migrations/058_tienda_v2.sql", import.meta.url), "utf8");
const bloque = (nombre: string) => sql.slice(sql.indexOf("-- generado: " + nombre), sql.indexOf("-- fin generado", sql.indexOf("-- generado: " + nombre)));

describe("058 igual a content/", () => {
  it("personajes: misma rareza y los básicos fuera de venta", () => {
    const filas = [...bloque("personajes").matchAll(/\('([a-z0-9-]+)', '([a-z0-9-]+)', '(\w+)', (true|false)\)/g)];
    expect(filas.length).toBeGreaterThan(200);
    for (const [, id, , rareza] of filas) expect(rarezaPersonaje(id!), id).toBe(rareza);
    const libres = [...sql.matchAll(/update privado\.catalogo_tienda_personajes set activo = false where id in \(([^)]+)\)/g)]
      .flatMap(m => [...m[1]!.matchAll(/'([a-z0-9-]+)'/g)].map(x => x[1]!));
    expect(libres.length).toBe(23);
    for (const id of libres) expect(rarezaPersonaje(id), id).toBe("comun");
    for (const [, id] of filas) expect(NUMEROS_PERSONAJES[id!], id).toBeTypeOf("number");
  });
  it("accesorios: mismas cartas y precios", () => {
    const filas = [...bloque("accesorios").matchAll(/\('([a-z0-9-]+--\w+)', '([a-z0-9-]+)', '(\w+)'\)/g)].map(m => [m[1], m[2], m[3]]);
    expect(filas).toEqual(ACCESORIOS.map(a => [a.id, a.donante, a.parte]));
    expect(sql).toContain(`when 'rara' then ${PRECIO_ACCESORIO.rara} when 'epica' then ${PRECIO_ACCESORIO.epica} when 'legendaria' then ${PRECIO_ACCESORIO.legendaria}`);
    expect(PRECIO_ACCESORIO.rara).toBeLessThan(PRECIO_PERSONAJE.rara);
  });
  it("sobres: precio, cartas, pesos y mínimo", () => {
    const filas = [...bloque("sobres").matchAll(/\('(\w+)', (\d+), array\[([^\]]+)\], '(\{[^}]+\})', (null|'\w+')\)/g)];
    expect(filas.map(([, id, precio, ranuras, pesos, minimo]) => ({
      id, precio: Number(precio), ranuras: [...ranuras!.matchAll(/'(\w+)'/g)].map(x => x[1]), pesos: JSON.parse(pesos!),
      minimo: minimo === "null" ? undefined : minimo!.replace(/'/g, ""),
    }))).toEqual(SOBRES_ALV.map(s => ({ id: s.id, precio: s.precio, ranuras: s.ranuras, pesos: s.pesos, minimo: s.minimo })));
    for (const s of SOBRES_ALV) expect(s.ranuras.length).toBeGreaterThanOrEqual(1);
    for (const s of SOBRES_ALV) expect(s.ranuras.length).toBeLessThanOrEqual(3);
    expect(sql).toContain(`v_tiro < ${PROB_CUALQUIERA.personaje} then 'personaje' when v_tiro < ${PROB_CUALQUIERA.personaje + PROB_CUALQUIERA.accesorio} then 'accesorio'`);
  });
});
