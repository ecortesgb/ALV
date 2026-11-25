// Categorías de la nave (Elías, 24 nov): 10 temas solo para El impostor con papeles, con nombre completo y una pista
// básica de una palabra por cada uno. Los 10 temas de antes se quedan para reconstruir partidas guardadas.
import { describe, expect, it } from "vitest";
import { CONTENIDO } from ".";

const IDS_SALA = ["s-pel", "s-vid", "s-ser", "s-can", "s-sup", "s-ani", "s-cel", "s-fut", "s-adu", "s-obj"];
const sala = CONTENIDO.temas.filter(t => t.soloNave);
const plano = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

describe("categorías de la nave", () => {
  it("hay 10 temas de la nave con 25 palabras y solo Adultos es adulto", () => {
    expect(sala.map(t => t.id)).toEqual(IDS_SALA);
    for (const t of sala) expect(t.palabras, t.id).toHaveLength(25);
    expect(sala.filter(t => t.adulto).map(t => t.id)).toEqual(["s-adu"]);
    for (const t of sala) expect(t.escenario, t.id).toBeNull();
  });

  it("cada palabra tiene pista", () => {
    for (const t of sala) expect(Object.keys(t.pistas ?? {}).sort(), t.id).toEqual([...t.palabras].sort());
  });

  it("la pista es una sola palabra corta", () => {
    for (const t of sala) for (const p of Object.values(t.pistas ?? {})) {
      expect(p, `${t.id}: ${p}`).toMatch(/^\S+$/);
      expect(p.length, `${t.id}: ${p}`).toBeLessThanOrEqual(16);
    }
  });

  it("la pista no delata la palabra", () => {
    for (const t of sala) for (const [palabra, pista] of Object.entries(t.pistas ?? {})) {
      const pp = plano(pista), pw = plano(palabra);
      const partes = pw.split(/[^a-z0-9]+/).filter(x => x.length >= 4);
      for (const parte of partes) expect(pp.includes(parte), `${palabra} → ${pista}`).toBe(false);
      expect(pw.includes(pp), `${palabra} → ${pista}`).toBe(false);
    }
  });

  it("palabras y pistas únicas por tema", () => {
    for (const t of sala) {
      expect(new Set(t.palabras.map(plano)).size, t.id).toBe(t.palabras.length);
      const ps = Object.values(t.pistas ?? {}).map(plano);
      expect(new Set(ps).size, t.id).toBe(ps.length);
    }
  });

  it("los temas viejos siguen iguales", () => {
    const viejos = CONTENIDO.temas.filter(t => !t.soloNave);
    expect(viejos.map(t => `${t.id}:${t.palabras.length}`)).toEqual(["alv:25", "asa:25", "vel:25", "lum:25", "fut:20", "fam:20", "pel:20", "hot:20", "com:20", "ani:20"]);
    expect(viejos[0]!.palabras.slice(0, 3)).toEqual(["Flotador", "Clavado", "Bloqueador"]);
  });
});
