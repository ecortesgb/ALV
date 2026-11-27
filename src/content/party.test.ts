import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIAS_PARTY, MINIJUEGOS, motivoParty, salaParty, urlsParty } from "./party";

describe("ALV PARTY", () => {
  it("los 5 minijuegos tienen su TV, su categoría y el id que acepta la base (049)", () => {
    // Se lee el archivo (la zona de personajes no se importa desde fuera; separacion.test.ts).
    const xp = readFileSync(join(__dirname, "../personajes/minijuegos/xpSala.ts"), "utf8");
    const ids = [...xp.slice(xp.indexOf("JUEGO_XP"), xp.indexOf("};", xp.indexOf("JUEGO_XP"))).matchAll(/"(mj-[a-z-]+)"/g)].map(m => m[1]);
    expect(MINIJUEGOS.map(m => m.idBase).sort()).toEqual(ids.sort());
    for (const m of MINIJUEGOS) {
      expect(existsSync(join(__dirname, "../../tools/personajes/minijuegos", m.tv))).toBe(true);
      expect(CATEGORIAS_PARTY.some(c => c.id === m.categoria)).toBe(true);
    }
    for (const c of CATEGORIAS_PARTY) expect(MINIJUEGOS.some(m => m.categoria === c.id)).toBe(true);
  });
  it("no deja empezar sin juego ni con valores raros", () => {
    expect(motivoParty({ ambiente: "noche", pantalla: "aqui", bots: 0 })).toBe("Elige un minijuego");
    expect(motivoParty({ juego: "bala", ambiente: "luna" as never, pantalla: "aqui", bots: 0 })).toBe("Elige el escenario");
    expect(motivoParty({ juego: "bala", ambiente: "noche", pantalla: "aqui", bots: 9 })).not.toBeNull();
    expect(motivoParty({ juego: "bala", ambiente: "dia", pantalla: "proyectar", bots: 2 })).toBeNull();
  });
  it("la TV y el mando quedan en la misma sala, con ambiente y práctica", () => {
    const u = urlsParty({ juego: "paracaidas", ambiente: "atardecer", pantalla: "proyectar", bots: 2 }, "ABCD", "https://x.test/ALV/", "Elías");
    const tv = new URL(u.tv), mando = new URL(u.mando);
    expect(tv.pathname).toBe("/ALV/tools/personajes/minijuegos/tv-paracaidas.html");
    expect(tv.searchParams.get("sala")).toBe("ABCD");
    expect(tv.searchParams.get("ambiente")).toBe("atardecer");
    expect(tv.searchParams.get("bots")).toBe("2");
    expect(mando.pathname).toBe("/ALV/tools/personajes/minijuegos/control.html");
    expect(mando.searchParams.get("sala")).toBe("ABCD");
    expect(mando.searchParams.get("nombre")).toBe("Elías");
    expect(new URL(urlsParty({ juego: "bala", ambiente: "noche", pantalla: "aqui", bots: 0 }, "ABCD", "https://x.test/").tv).searchParams.has("bots")).toBe(false);
  });
  it("modalidad: solo si el minijuego la admite", () => {
    MINIJUEGOS.push({ ...MINIJUEGOS[0]!, id: "prueba" as never, modalidades: ["solos", "equipos"] });
    try {
      expect(motivoParty({ juego: "prueba" as never, ambiente: "noche", pantalla: "aqui", bots: 0 })).toBe("Elige individual o equipos");
      const u = urlsParty({ juego: "prueba" as never, ambiente: "noche", pantalla: "aqui", bots: 0, modalidad: "equipos" }, "ABCD", "https://x.test/");
      expect(new URL(u.tv).searchParams.get("modalidad")).toBe("equipos");
      expect(new URL(urlsParty({ juego: "bala", ambiente: "noche", pantalla: "aqui", bots: 0, modalidad: "equipos" }, "ABCD", "https://x.test/").tv).searchParams.has("modalidad")).toBe(false);
    } finally { MINIJUEGOS.pop(); }
  });
  it("código de sala de 4 letras sin I ni O", () => {
    for (let i = 0; i < 50; i++) expect(salaParty()).toMatch(/^[A-HJ-NP-Z]{4}$/);
  });
});
