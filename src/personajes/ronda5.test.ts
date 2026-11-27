// Ronda 5 del personalizador (Elías, 2026-11-27): Piel solo color, máscaras aparte, MODOK fuera.
import { describe, expect, it } from "vitest";
import { leerFicha } from "./ficha";
import { BASE_CREAR, esMascara, figuraInicial, piezasDe, piezasDeCatalogo, ponerPieza, ponerPiel } from "./constructorDatos";
import type { Catalogo } from "./plano";
import type { Ficha } from "./tipos";

const ficha = (id: string): Ficha => {
  const r = leerFicha({
    id, nombre: id, saga: "marvel", grupo: "avengers", bando: "heroe", familia: "minifig", rig: "esqueleto", glb: id + ".glb",
    fotos: { tarjeta: id + "-tarjeta.webp", busto: id + "-busto.webp" }, huesos: { cabeza: "Head" },
    animaciones: { mapa: { reposo: "Idle" }, respaldo: {}, vida: [], sentado: null }, medidas: { altura: 0.38, pies_en_cero: true, frente: "+Z" },
    carga: { colores_srgb: false, rugosidad: null, metal: [] }, origen: { fuente: "juego" }, publica: false, calidad: { estado: "jugable" },
  });
  if (!r.ok) throw new Error(r.errores.join());
  return r.ficha;
};
const ids = [BASE_CREAR, "batman", "spider-man", "modok"];
const cat: Catalogo = new Map(ids.map(id => [id, { ficha: ficha(id), base: `http://x/catalogo/${id}/` }]));
const ranuras = new Map<string, string[]>([
  [BASE_CREAR, ["head", "face", "hair", "torso", "arms", "hands", "hips", "legs"]],
  ["batman", ["head", "torso", "arms", "hands", "hips", "legs"]],
  ["spider-man", ["head", "face", "torso", "arms", "hands", "hips", "legs"]],
  ["modok", ["torso", "arms", "hands", "hips", "legs"]],
]);
const piezas = piezasDeCatalogo(cat, ranuras);
const f0 = figuraInicial(cat)!;

describe("máscaras y piel", () => {
  it("las cabezas con la cara impresa son máscaras; la del civil no", () => {
    expect(esMascara(piezas.get("batman--cabeza"))).toBe(true);
    expect(esMascara(piezas.get(`${BASE_CREAR}--cabeza`))).toBe(false);
  });
  it("una máscara sin cara propia quita la cara; con cara propia trae la suya", () => {
    expect(ponerPieza(f0, piezas.get("batman--cabeza")!, piezas).piezas).toMatchObject({ cara: { id: "sin-cara" }, cabello: { id: "sin-cabello" } });
    expect(ponerPieza(f0, piezas.get("spider-man--cabeza")!, piezas).piezas.cara).toEqual({ id: "spider-man--cara" });
  });
  it("«Sin cara» no se ofrece para elegir", () => {
    expect(piezasDe(piezas, "cara").some(p => p.id === "sin-cara")).toBe(false);
  });
  it("Piel tiñe la cabeza lisa del personaje", () => {
    expect(ponerPiel(f0, "morena", piezas).piezas.cabeza).toEqual({ id: `${BASE_CREAR}--cabeza`, tintes: { piel: "morena" } });
    expect(ponerPiel(ponerPiel(f0, "morena", piezas), null, piezas).piezas.cabeza).toBeUndefined();
  });
  it("Piel sobre una máscara vuelve a la cabeza lisa y regresa la cara", () => {
    const f1 = ponerPieza(f0, piezas.get("batman--cabeza")!, piezas);
    const f2 = ponerPiel(f1, "clara", piezas);
    expect(f2.piezas.cabeza).toEqual({ id: `${BASE_CREAR}--cabeza`, tintes: { piel: "clara" } });
    expect(f2.piezas.cara).toEqual({ id: `${BASE_CREAR}--cara` });
  });
});

describe("piezas fuera", () => {
  it("MODOK no presta piezas", () => {
    for (const parte of ["torso", "brazos", "manos", "piernas"] as const) expect(piezasDe(piezas, parte).some(p => p.donante === "modok")).toBe(false);
  });
});
