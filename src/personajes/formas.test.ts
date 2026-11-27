import { describe, expect, it } from "vitest";
import type { PiezaCons, Piezas } from "./constructorDatos";
import { deCatalogo } from "./figura";
import { caretaEn, conEspecialAlSalir, cuantasFormas, figuraEnForma } from "./formas";
import type { Catalogo } from "./plano";
import type { Ficha, FiguraV3 } from "./tipos";

const ficha = (id: string, familia = "minifig") => ({ id, nombre: id, familia, glb: id + ".glb", fotos: { tarjeta: "", busto: "" } }) as unknown as Ficha;
const IDS = ["bruce-banner", "hulk", "tony-stark", "iron-man", "peter-parker", "spider-man", "batman", "hulkbuster", "mistica", "gwen-stacy", "pepper-potts"];
const catalogo: Catalogo = new Map(IDS.map(id => [id, { ficha: ficha(id, id === "hulk" ? "bigfig" : "minifig"), base: "https://x/" + id + "/" }]));
const pieza = (id: string, parte: string, donante: string | null): PiezaCons =>
  ({ id, nombre: id, parte, glb: donante ? donante + ".glb" : "", ranuras: [parte], foto: null, donante, familia: donante ? "minifig" : null, origen: donante ? "original" : "ninguna", grupo: "" }) as PiezaCons;
const piezas: Piezas = new Map([
  ["sin-sombrero", pieza("sin-sombrero", "sombrero", null)],
  ["tony-stark--cara", pieza("tony-stark--cara", "cara", "tony-stark")],
  ["tony-stark--cabeza", pieza("tony-stark--cabeza", "cabeza", "tony-stark")],
  ["tony-stark--cabello", pieza("tony-stark--cabello", "cabello", "tony-stark")],
].map(([k, v]) => [k as string, v as PiezaCons]));
const de = (id: string): FiguraV3 => ({ ...deCatalogo(catalogo.get(id)!.ficha), extensiones: { alv: { apodo: "Yo" } } });
const quien = (f: FiguraV3) => (f.origen.tipo === "catalogo" ? f.origen.personaje : "creado");

describe("transformaciones", () => {
  it("solo los personajes con pareja se transforman", () => {
    expect(cuantasFormas(de("bruce-banner"))).toBe(2);
    expect(cuantasFormas(de("hulk"))).toBe(2);
    expect(cuantasFormas(de("iron-man"))).toBe(3);
    expect(cuantasFormas(de("batman"))).toBe(0);
    expect(cuantasFormas(null)).toBe(0);
  });
  it("Banner se vuelve Hulk y regresa; la especial va solo al salir de Banner", () => {
    const b = de("bruce-banner");
    expect(quien(figuraEnForma(b, 1, catalogo, piezas))).toBe("hulk");
    expect(figuraEnForma(b, 2, catalogo, piezas)).toBe(b);
    expect(conEspecialAlSalir(b, 0)).toBe(true);
    expect(conEspecialAlSalir(b, 1)).toBe(false);
  });
  it("conserva apodo y momentos del jugador en la otra forma", () => {
    const h = figuraEnForma(de("peter-parker"), 1, catalogo, piezas);
    expect(quien(h)).toBe("spider-man");
    expect(h.extensiones.alv?.apodo).toBe("Yo");
  });
  it("Iron Man: careta arriba (misma figura), luego Tony, luego Iron Man otra vez", () => {
    const im = de("iron-man");
    expect(figuraEnForma(im, 1, catalogo, piezas)).toBe(im);
    expect(caretaEn(im, 1)?.mallas.length).toBe(4);
    expect(caretaEn(im, 0)).toBeNull();
    expect(quien(figuraEnForma(im, 2, catalogo, piezas))).toBe("tony-stark");
    expect(figuraEnForma(im, 3, catalogo, piezas)).toBe(im);
    const tony = de("tony-stark");
    expect(quien(figuraEnForma(tony, 1, catalogo, piezas))).toBe("iron-man");
    expect(quien(figuraEnForma(tony, 2, catalogo, piezas))).toBe("iron-man");
    expect(caretaEn(tony, 2)).not.toBeNull();
  });
  it("segunda tanda: salir del Hulkbuster y Mística disfrazada (quien elige a Gwen no se transforma)", () => {
    expect(quien(figuraEnForma(de("hulkbuster"), 1, catalogo, piezas))).toBe("iron-man");
    expect(cuantasFormas(de("iron-man"))).toBe(3); // Iron Man sigue en el ciclo de Tony
    const m = de("mistica");
    expect([1, 2, 3].map(k => quien(figuraEnForma(m, k, catalogo, piezas)))).toEqual(["gwen-stacy", "pepper-potts", "mistica"]);
    expect(cuantasFormas(de("gwen-stacy"))).toBe(0);
    expect(cuantasFormas(de("peter-parker"))).toBe(2);
  });
  it("si falta el personaje, se queda la misma figura", () => {
    const sinHulk: Catalogo = new Map([...catalogo].filter(([k]) => k !== "hulk"));
    const b = de("bruce-banner");
    expect(figuraEnForma(b, 1, sinHulk, piezas)).toBe(b);
  });
});
