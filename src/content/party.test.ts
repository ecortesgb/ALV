import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AMBIENTES_PARTY, CATEGORIAS_PARTY, MINIJUEGOS, leerAvisoParty, motivoParty, salaParty, urlsParty } from "./party";

const PUBLICO = join(__dirname, "../../public");

describe("ALV PARTY", () => {
  it("cada minijuego tiene su TV, su portada, su tutorial, su categoría y el id que acepta la base (049 y 054)", () => {
    // Se lee el archivo (la zona de personajes no se importa desde fuera; separacion.test.ts).
    const xp = readFileSync(join(__dirname, "../personajes/minijuegos/xpSala.ts"), "utf8");
    const ids = [...xp.slice(xp.indexOf("JUEGO_XP"), xp.indexOf("};", xp.indexOf("JUEGO_XP"))).matchAll(/"(mj-[a-z-]+)"/g)].map(m => m[1]);
    expect(MINIJUEGOS.map(m => m.idBase).sort()).toEqual(ids.sort());
    for (const m of MINIJUEGOS) {
      expect(existsSync(join(__dirname, "../../tools/personajes/minijuegos", m.tv))).toBe(true);
      expect(existsSync(join(PUBLICO, "arte", m.portada))).toBe(true);
      expect(m.tutorial).toHaveLength(3);
      for (const b of m.botones) expect(existsSync(join(PUBLICO, "arte/ui/mando", `x-${b}.webp`))).toBe(true);
      expect(CATEGORIAS_PARTY.some(c => c.id === m.categoria)).toBe(true);
    }
    for (const c of CATEGORIAS_PARTY) expect(MINIJUEGOS.some(m => m.categoria === c.id)).toBe(true);
    for (const a of AMBIENTES_PARTY) expect(existsSync(join(PUBLICO, "arte", a.arte))).toBe(true);
  });
  it("no deja empezar sin juego ni con valores raros", () => {
    expect(motivoParty({ ambiente: "noche" })).toBe("Elige un minijuego");
    expect(motivoParty({ juego: "bala", ambiente: "luna" as never })).toBe("Elige el escenario");
    expect(motivoParty({ juego: "bala", ambiente: "dia" })).toBeNull();
  });
  it("la TV y el mando quedan en la misma sala, con el ambiente", () => {
    const u = urlsParty({ juego: "paracaidas", ambiente: "atardecer" }, "ABCD", "https://x.test/ALV/", "Elías");
    const tv = new URL(u.tv), mando = new URL(u.mando);
    expect(tv.pathname).toBe("/ALV/tools/personajes/minijuegos/tv-paracaidas.html");
    expect(tv.searchParams.get("sala")).toBe("ABCD");
    expect(tv.searchParams.get("ambiente")).toBe("atardecer");
    expect(tv.searchParams.has("bots")).toBe(false);
    expect(mando.pathname).toBe("/ALV/tools/personajes/minijuegos/control.html");
    expect(mando.searchParams.get("sala")).toBe("ABCD");
    expect(mando.searchParams.get("nombre")).toBe("Elías");
  });
  it("el aviso que llega por la sala se valida antes de usarlo", () => {
    expect(leerAvisoParty({ sala: "ABCD", juego: "bala", ambiente: "noche" })).toEqual({ sala: "ABCD", juego: "bala", ambiente: "noche" });
    expect(leerAvisoParty({ sala: "abcd", juego: "bala", ambiente: "noche" })).toBeNull();
    expect(leerAvisoParty({ sala: "ABCI", juego: "bala", ambiente: "noche" })).toBeNull();
    expect(leerAvisoParty({ sala: "ABCD", juego: "javascript:", ambiente: "noche" })).toBeNull();
    expect(leerAvisoParty({ sala: "ABCD", juego: "plataforma", ambiente: "noche" })).toBeNull();
    expect(leerAvisoParty({ sala: "ABCD", juego: "plataforma", ambiente: "noche", modalidad: "equipos" })?.modalidad).toBe("equipos");
    expect(leerAvisoParty(null)).toBeNull();
  });
  it("código de sala de 4 letras sin I ni O", () => {
    for (let i = 0; i < 50; i++) expect(salaParty()).toMatch(/^[A-HJ-NP-Z]{4}$/);
  });
});

describe("Carga de ALV PARTY", () => {
  it("usa la carga de los juegos de mesa: juego, 3 pasos con botones y escenario", () => {
    const src = readFileSync(join(__dirname, "../pantallas/party/CargaParty.tsx"), "utf8");
    expect(src).toContain("PantallaCarga");
  });
});

describe("ALVacío", () => {
  it("se juega solos o por equipos y pide elegir", () => {
    expect(motivoParty({ juego: "plataforma", ambiente: "noche" })).toBe("Elige individual o equipos");
    const u = urlsParty({ juego: "plataforma", ambiente: "dia", modalidad: "equipos" }, "ABCD", "https://x.test/");
    expect(new URL(u.tv).pathname).toBe("/tools/personajes/minijuegos/tv-plataforma.html");
    expect(new URL(u.tv).searchParams.get("modalidad")).toBe("equipos");
    expect(new URL(urlsParty({ juego: "bala", ambiente: "noche", modalidad: "equipos" }, "ABCD", "https://x.test/").tv).searchParams.has("modalidad")).toBe(false);
  });
});
