import { describe, expect, it } from "vitest";
import { leerManifiesto, temaDe } from "./temas";
import { rutaConTema } from "./musica";

const h = (c: string) => c.repeat(64);

describe("temas de personaje", () => {
  it("valida el manifiesto que llega de la nube", () => {
    const m = leerManifiesto({
      temas: {
        xmen: { fondo: { g: h("a") + ".webp", c: h("b") + ".webp" }, musica: [h("c") + ".mp3", "../x.mp3", h("d") + ".webp"] },
        malo: { fondo: { g: "http://x/y.webp", c: h("b") + ".webp" }, musica: [] },
      },
      personajes: { wolverine: "xmen", ciclope: "malo", "../hack": "xmen" },
    });
    expect(Object.keys(m!.temas)).toEqual(["xmen"]);
    expect(m!.temas.xmen!.musica).toEqual([h("c") + ".mp3"]);
    expect(m!.personajes).toEqual({ wolverine: "xmen" });
    expect(temaDe(m, "wolverine")?.fondo.g).toBe(h("a") + ".webp");
    expect(temaDe(m, "ciclope")).toBeNull();
    expect(temaDe(m, null)).toBeNull();
    expect(m!.voces).toEqual({});
    const v = leerManifiesto({ temas: {}, personajes: {}, voces: { ciclope: { especial: h("e") + ".mp3", malo: h("e") + ".mp3" }, "x y": { especial: h("e") + ".mp3" }, tormenta: { especial: "a.mp3" } } });
    expect(v!.voces).toEqual({ ciclope: { especial: h("e") + ".mp3" } });
    expect(leerManifiesto(null)).toBeNull();
    expect(leerManifiesto({ temas: 3 })).toBeNull();
  });

  it("la canción del personaje suena en HUB, taller y perfil; no en lobby ni partida", () => {
    expect(rutaConTema("#/inicio")).toBe(true);
    expect(rutaConTema("")).toBe(true);
    expect(rutaConTema("#/personalizar")).toBe(true);
    expect(rutaConTema("#/sala/ABC123")).toBe(false);
    expect(rutaConTema("#/tv/ABC123")).toBe(false);
    expect(rutaConTema("#/tienda")).toBe(false);
  });
});
