// Galería y colección del sistema de personajes nuevo.
import { describe, expect, it } from "vitest";
import { leerFicha } from "./ficha";
import { deCatalogo } from "./figura";
import { SIN_FILTRO, caben, categorias, filtrar, paginas, tarjetas } from "./galeriaDatos";
import { figuraActiva, normalizar, ponerEnColeccion, vacia } from "./coleccion";
import type { Catalogo } from "./plano";
import type { Ficha } from "./tipos";

const ficha = (id: string, extra: Record<string, unknown> = {}): Ficha => {
  const r = leerFicha({
    id, nombre: id.replace(/-/g, " "), saga: "marvel", grupo: "avengers", bando: "heroe", familia: "minifig", rig: "esqueleto",
    glb: id + ".glb", fotos: { tarjeta: id + "-tarjeta.webp", busto: id + "-busto.webp" }, huesos: { cabeza: "Head" },
    animaciones: { mapa: { reposo: "Idle" }, respaldo: {}, vida: [], sentado: null }, medidas: { altura: 0.38, pies_en_cero: true, frente: "+Z" },
    carga: { colores_srgb: false, rugosidad: null, metal: [] }, origen: { fuente: "juego" }, publica: false, calidad: { estado: "jugable" }, ...extra,
  });
  if (!r.ok) throw new Error(r.errores.join());
  return r.ficha;
};
const cat = (...f: Ficha[]): Catalogo => new Map(f.map(x => [x.id, { ficha: x, base: `http://127.0.0.1:4193/catalogo/${x.id}/` }]));

const C = cat(
  ficha("iron-man"), ficha("hulk", { familia: "bigfig" }), ficha("loki", { bando: "villano" }),
  ficha("batman", { saga: "dc", grupo: "liga" }), ficha("borrador-x", { calidad: { estado: "borrador" } }),
);

describe("galería", () => {
  it("una saga chica sin botón propio va a «Otros» con su nombre de grupo", () => {
    const t = tarjetas(cat(ficha("iron-man"), ficha("marty", { saga: "volver-al-futuro", grupo: "volver-al-futuro" }), ficha("sonic", { saga: "sonic", grupo: "sonic" })));
    expect(t.map(x => [x.id, x.saga, x.grupo])).toEqual([["iron-man", "marvel", "avengers"], ["marty", "otros", "volver-al-futuro"], ["sonic", "otros", "sonic"]]);
  });
  it("ordena por saga y nombre, sin borradores", () => {
    const t = tarjetas(C);
    expect(t.map(x => x.id)).toEqual(["hulk", "iron-man", "loki", "batman"]);
    expect(t[0]!.tamano).toBe("grande");
    expect(t[1]!.foto).toBe("http://127.0.0.1:4193/catalogo/iron-man/iron-man-tarjeta.webp");
    expect(tarjetas(C, { conBorradores: true }).length).toBe(5);
  });
  it("categorías solo de lo que hay, favoritos si hay", () => {
    const t = tarjetas(C);
    expect(categorias(t, new Set()).map(c => c.id)).toEqual(["todos", "marvel", "dc"]);
    expect(categorias(t, new Set(["loki"])).map(c => `${c.id}:${c.cuantos}`)).toEqual(["todos:4", "favoritos:1", "marvel:3", "dc:1"]);
  });
  it("filtra por categoría, bando, tamaño y favoritos", () => {
    const t = tarjetas(C), fav = new Set(["batman"]);
    expect(filtrar(t, { ...SIN_FILTRO, categoria: "dc" }, fav).map(x => x.id)).toEqual(["batman"]);
    expect(filtrar(t, { ...SIN_FILTRO, bando: "villano" }, fav).map(x => x.id)).toEqual(["loki"]);
    expect(filtrar(t, { ...SIN_FILTRO, tamano: "grande" }, fav).map(x => x.id)).toEqual(["hulk"]);
    expect(filtrar(t, { ...SIN_FILTRO, categoria: "favoritos" }, fav).map(x => x.id)).toEqual(["batman"]);
  });
  it("páginas y cuántas caben", () => {
    expect(paginas([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(paginas([], 4)).toEqual([[]]);
    expect(caben(500, 400)).toEqual({ columnas: 3, filas: 1 }); // tarjetas de 160 × 208
    expect(caben(500, 500)).toEqual({ columnas: 3, filas: 2 });
    expect(caben(60, 60)).toEqual({ columnas: 1, filas: 1 });
  });
});

describe("colección v3", () => {
  const f = deCatalogo(ficha("iron-man")), g = deCatalogo(ficha("hulk", { familia: "bigfig" }));
  it("pone en el primer vacío y lo activa; después reemplaza el activo", () => {
    let c = ponerEnColeccion(vacia(), f);
    expect(c.activa).toBe(0);
    c = ponerEnColeccion(c, g);
    expect(c.activa).toBe(0);
    expect(figuraActiva(c)?.familia).toBe("bigfig");
    c = ponerEnColeccion(c, f, 2);
    expect(c.activa).toBe(2);
  });
  it("limpia lo que llega roto", () => {
    expect(normalizar({ activa: 1, espacios: [f, { version: 2 }, "x"] })).toEqual({ version: 1, activa: 0, espacios: [f, null, null] });
    expect(normalizar(null)).toEqual(vacia());
  });
});
