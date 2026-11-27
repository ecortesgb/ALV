// Constructor básico: piezas sacadas del catálogo, poner y quitar, tintes y plano.
import { describe, expect, it } from "vitest";
import { leerFicha } from "./ficha";
import { leerFigura } from "./figura";
import { BASE_CREAR, figuraInicial, piezasDe, piezasDeCatalogo, planoConstructor, ponerPieza, teñir } from "./constructorDatos";
import type { Catalogo } from "./plano";
import type { Ficha } from "./tipos";

const ficha = (id: string, extra: Record<string, unknown> = {}): Ficha => {
  const r = leerFicha({
    id, nombre: id, saga: "marvel", grupo: "avengers", bando: "heroe", familia: "minifig", rig: "esqueleto", glb: id + ".glb",
    fotos: { tarjeta: id + "-tarjeta.webp", busto: id + "-busto.webp" }, huesos: { cabeza: "Head" },
    animaciones: { mapa: { reposo: "Idle" }, respaldo: {}, vida: [], sentado: null }, medidas: { altura: 0.38, pies_en_cero: true, frente: "+Z" },
    carga: { colores_srgb: false, rugosidad: null, metal: [] }, origen: { fuente: "juego" }, publica: false, calidad: { estado: "jugable" }, ...extra,
  });
  if (!r.ok) throw new Error(r.errores.join());
  return r.ficha;
};
const cat: Catalogo = new Map([BASE_CREAR, "iron-man", "hulk"].map(id => [id, { ficha: ficha(id, id === "hulk" ? { familia: "bigfig" } : {}), base: `http://x/catalogo/${id}/` }]));
const ranuras = new Map([[BASE_CREAR, ["head", "face", "hair", "torso", "arms", "hands", "hips", "legs"]], ["iron-man", ["head", "face", "headgear", "torso", "arms", "hands", "hips", "legs"]], ["hulk", ["head", "torso"]]]);
const piezas = piezasDeCatalogo(cat, ranuras);

describe("piezas del catálogo", () => {
  it("una por parte que el personaje trae; nada de Big Fig", () => {
    expect(piezas.get("iron-man--sombrero")).toMatchObject({ glb: "http://x/catalogo/iron-man/iron-man.glb", ranuras: ["headgear"], donante: "iron-man" });
    expect(piezas.has("iron-man--cabello")).toBe(false);
    expect([...piezas.keys()].some(k => k.startsWith("hulk"))).toBe(false);
    expect(piezasDe(piezas, "cabello").map(p => p.id)).toEqual(["sin-cabello", `${BASE_CREAR}--cabello`]);
  });
});

describe("armar y teñir", () => {
  const f0 = figuraInicial(cat)!;
  it("arranca con el civil base sin cambios", () => {
    expect(f0.origen).toMatchObject({ tipo: "catalogo", personaje: BASE_CREAR });
    expect(f0.piezas).toEqual({});
  });
  it("el casco quita el pelo y al revés", () => {
    const f1 = ponerPieza(f0, piezas.get("iron-man--sombrero")!);
    expect(f1.piezas.cabello).toEqual({ id: "sin-cabello" });
    const f2 = ponerPieza(f1, piezas.get(`${BASE_CREAR}--cabello`)!);
    expect(f2.piezas.sombrero).toEqual({ id: "sin-sombrero" });
  });
  it("teñir sin pieza elegida toma la del personaje base y conserva el tinte al cambiar de pieza", () => {
    const f1 = teñir(f0, "cabello", "pelo", "rubio");
    expect(f1.piezas.cabello).toEqual({ id: `${BASE_CREAR}--cabello`, tintes: { pelo: "rubio" } });
    expect(ponerPieza(f1, piezas.get("sin-cabello")!).piezas.cabello).toEqual({ id: "sin-cabello", tintes: { pelo: "rubio" } });
    expect(leerFigura(f1)).toEqual(f1); // sigue siendo una v3 válida
  });
  it("una cara original llega con la piel de su personaje; la piel genérica se respeta", () => {
    const f1 = ponerPieza(f0, piezas.get("iron-man--cara")!, piezas);
    expect(f1.piezas).toEqual({ cara: { id: "iron-man--cara" }, cabeza: { id: "iron-man--cabeza" } });
    expect(ponerPieza(f1, piezas.get(`${BASE_CREAR}--cara`)!, piezas).piezas).toEqual({ cara: { id: `${BASE_CREAR}--cara` } });
    const generica = [...piezas.values()].find(p => p.parte === "cabeza" && p.origen === "generica");
    if (generica) {
      const f2 = ponerPieza(ponerPieza(f0, generica, piezas), piezas.get("iron-man--cara")!, piezas);
      expect(f2.piezas.cabeza).toEqual({ id: generica.id });
    }
  });
  it("el plano lleva cada pieza con su ranura y el color ya resuelto", () => {
    let f = ponerPieza(f0, piezas.get("iron-man--torso")!);
    f = teñir(f, "cabeza", "piel", "morena");
    const p = planoConstructor("yo", f, cat, piezas)!;
    expect(p.glb).toBe(`http://x/catalogo/${BASE_CREAR}/${BASE_CREAR}.glb`);
    // Cada pieza lleva el acabado (carga) de su donante (Codex O7).
    expect(p.piezas).toEqual([
      { glb: "http://x/catalogo/iron-man/iron-man.glb", ranuras: ["torso"], tintes: [], carga: cat.get("iron-man")!.ficha.carga },
      { glb: `http://x/catalogo/${BASE_CREAR}/${BASE_CREAR}.glb`, ranuras: ["head"], tintes: [{ material: "*", hex: "#aa7d55" }], carga: cat.get(BASE_CREAR)!.ficha.carga },
    ]);
  });
  it("una pieza que no existe o de otra parte se ignora", () => {
    const f = { ...f0, piezas: { torso: { id: "iron-man--sombrero" }, cara: { id: "nadie--cara" } } };
    expect(planoConstructor("yo", f, cat, piezas)!.piezas).toEqual([]);
  });
});

describe("piezas fuera (lista revisada a la vista)", () => {
  it("una pieza de la lista no se ofrece y las demás sí", async () => {
    const { PIEZAS_FUERA } = await import("./constructorDatos");
    const pz = (id: string) => ({ id, nombre: id, parte: "cara" as const, glb: "x.glb", ranuras: ["face"], foto: null, donante: id.split("--")[0]!, familia: "minifig" });
    const mapa = new Map([["loki--cara", pz("loki--cara")], ["thor--cara", pz("thor--cara")]]);
    expect(PIEZAS_FUERA.has("loki--cara")).toBe(true);
    expect(piezasDe(mapa, "cara").map(p => p.id)).toEqual(["thor--cara"]);
  });
});
