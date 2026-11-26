import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { leerFicha } from "./ficha";
import { deCatalogo } from "./figura";
import { piezasDeCatalogo, ponerPieza } from "./constructorDatos";
import { TOPE_PUENTE, banderaV3, empaquetarV3, fuenteDePersonajes, leerV3, resolverFigura, sinV3 } from "./integracion";
import type { Catalogo } from "./plano";
import type { Ficha } from "./tipos";

const ficha = (id: string): Ficha => {
  const r = leerFicha({
    id, nombre: id, saga: "marvel", grupo: "avengers", bando: "heroe", familia: "minifig", rig: "esqueleto",
    glb: id + ".glb", fotos: { tarjeta: id + "-tarjeta.webp", busto: id + "-busto.webp" },
    huesos: { cabeza: "Head", cadera: "Hips" }, animaciones: { mapa: { reposo: "Idle" }, respaldo: {}, vida: [], sentado: null },
    medidas: { altura: 0.4, pies_en_cero: true, frente: "+Z" }, carga: { colores_srgb: false, rugosidad: null, metal: [] },
    origen: { fuente: "juego" }, publica: false, calidad: { estado: "jugable" },
  });
  if (!r.ok) throw new Error(r.errores.join(","));
  return r.ficha;
};
const cat: Catalogo = new Map(["peter-parker", "iron-man"].map(id => [id, { ficha: ficha(id), base: `http://x/catalogo/${id}/` }]));
const piezas = piezasDeCatalogo(cat, new Map([["peter-parker", ["torso", "head"]], ["iron-man", ["torso"]]]));

describe("fase 5: bandera y fuente", () => {
  it("la bandera solo existe en desarrollo, con la variable o ?v3=1", () => {
    expect(banderaV3({ DEV: false, VITE_PERSONAJES_V3: "1" }, "?v3=1")).toBe(false);
    expect(banderaV3({ DEV: true }, "")).toBe(false);
    expect(banderaV3({ DEV: true }, "?v3=1")).toBe(true);
    expect(banderaV3({ DEV: true, VITE_PERSONAJES_V3: "1" }, "")).toBe(true);
  });
  it("la fuente es la variable local en desarrollo y null en lo publicado; tenerla no enciende la bandera", async () => {
    expect(await fuenteDePersonajes({ DEV: true, VITE_PERSONAJES_PRIVADOS_URL: "http://127.0.0.1:4193/" })).toBe("http://127.0.0.1:4193/");
    expect(await fuenteDePersonajes({ DEV: false, VITE_PERSONAJES_PRIVADOS_URL: "http://127.0.0.1:4193/" })).toBeNull();
    expect(banderaV3({ DEV: true, VITE_PERSONAJES_PRIVADOS_URL: "http://127.0.0.1:4193/" }, "")).toBe(false);
  });
});

describe("fase 5: puente v2 ↔ v3", () => {
  const v3 = deCatalogo(cat.get("iron-man")!.ficha);
  it("empaqueta dentro de la v2 sin perder lo demás (personalidad incluida) y se lee igual", () => {
    const v2 = { version: 2 as const, cabello: "ld-1", extensiones: { alv: { personalidad: "comico" }, otro: 1 } };
    const p = empaquetarV3(v3, v2)!;
    expect(p.version).toBe(2);
    expect(p.cabello).toBe("ld-1");
    expect(p.extensiones).toMatchObject({ otro: 1, alv: { personalidad: "comico" } });
    expect(leerV3(p)).toEqual(v3);
    expect(sinV3(p)).toEqual({ ...v2, extensiones: { alv: { personalidad: "comico" }, otro: 1 } });
  });
  it("sin v2 previa el respaldo es {version: 2}; una v3 inválida o que no cabe no se empaqueta", () => {
    expect(empaquetarV3(v3, null)).toEqual({ version: 2, extensiones: { alv: { v3 } } });
    expect(empaquetarV3({ ...v3, familia: "gigante" } as typeof v3, null)).toBeNull();
    expect(empaquetarV3(v3, { version: 2, relleno: "x".repeat(TOPE_PUENTE) })).toBeNull();
  });
  it("lo que llega de fuera se valida: una v3 rota no se usa", () => {
    expect(leerV3({ version: 2 })).toBeNull();
    expect(leerV3({ version: 2, extensiones: { alv: { v3: { version: 3, familia: "../x" } } } })).toBeNull();
  });
  it("el puente no mete ids de piezas viejas: solo ids de personajes y piezas v3 dentro de extensiones.alv.v3", () => {
    const p = empaquetarV3(ponerPieza(deCatalogo(cat.get("peter-parker")!.ficha), piezas.get("iron-man--torso")!), { version: 2 })!;
    const ids: string[] = [];
    const recorrer = (x: unknown) => { if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { if (k === "id" && typeof v === "string") ids.push(v); recorrer(v); } };
    recorrer(p);
    // ids que privado.ids_de_figura() (033) recogería del puente: deben ser de v3 (con «--» o de catálogo), nunca «ld-…».
    expect(ids.every(i => !i.startsWith("ld-"))).toBe(true);
  });
  it("ninguna pieza vieja de la base (033) puede confundirse con una pieza v3: el guardián y los retos no cambian", () => {
    // privado.ids_de_figura() (033) junta TODO campo «id» de la figura, también dentro de extensiones.alv.v3, y el
    // guardián validar_piezas_figura lo compara con public.piezas_figura. Las piezas v3 se llaman «<personaje>--<parte>»;
    // si ningún id viejo lleva «--», un id v3 nunca coincide con una pieza bloqueada ni cumple un reto viejo.
    const sql = readFileSync(new URL("../../supabase/migrations/033_piezas_rareza_y_retos.sql", import.meta.url), "utf8");
    const bloque = sql.slice(sql.indexOf("insert into public.piezas_figura"));
    const viejas = [...bloque.slice(0, bloque.indexOf(";")).matchAll(/\('([^']+)'/g)].map(m => m[1]!);
    expect(viejas.length).toBeGreaterThan(50);
    expect(viejas.filter(v => v.includes("--"))).toEqual([]);
    expect([...piezas.keys()].filter(id => !id.startsWith("sin-")).every(id => id.includes("--"))).toBe(true);
  });
});

describe("fase 5: resolución central", () => {
  it("catálogo puro y creado en el constructor salen por el mismo camino", () => {
    const puro = resolverFigura("yo", deCatalogo(cat.get("iron-man")!.ficha), cat, piezas)!;
    expect(puro.glb).toBe("http://x/catalogo/iron-man/iron-man.glb");
    expect(puro.piezas).toEqual([]);
    const creado = resolverFigura("yo", ponerPieza(deCatalogo(cat.get("peter-parker")!.ficha), piezas.get("iron-man--torso")!), cat, piezas)!;
    expect(creado.glb).toBe("http://x/catalogo/peter-parker/peter-parker.glb");
    expect(creado.piezas.map(p => p.glb)).toEqual(["http://x/catalogo/iron-man/iron-man.glb"]);
  });
  it("sin el personaje en el catálogo no hay plano (se usa la v2 de respaldo)", () => {
    expect(resolverFigura("yo", deCatalogo(ficha("hulk-x")), cat, piezas)).toBeNull();
  });
});

describe("fase 5: copias para la escena vieja", () => {
  it("public/personajes tiene la misma copia del motor nuevo que tools/personajes (la carga la escena vieja)", () => {
    for (const f of ["motor-personajes.js", "logicas.js"]) expect(readFileSync(`public/personajes/${f}`, "utf8"), f).toBe(readFileSync(`tools/personajes/${f}`, "utf8"));
  });
});

describe("fase 5: corte a v3 (Codex, v3-directo-r1)", () => {
  const v3 = { ...deCatalogo(cat.get("iron-man")!.ficha), extensiones: { alv: { apodo: "Tony", personalidad: { perfil: "timido" } } } };
  it("el interruptor es exactamente VITE_CORTE_V3=1 y enciende la bandera también en lo publicado", async () => {
    const { modoCorteV3 } = await import("./integracion");
    expect(modoCorteV3({ VITE_CORTE_V3: "1" })).toBe(true);
    expect(modoCorteV3({ VITE_CORTE_V3: "true" })).toBe(false);
    expect(modoCorteV3({})).toBe(false);
    expect(banderaV3({ DEV: false, VITE_CORTE_V3: "1" }, "")).toBe(true);
    expect(banderaV3({ DEV: false }, "?v3=1")).toBe(false);
  });
  it("en lo publicado con corte la fuente nunca es la local", async () => {
    expect(await fuenteDePersonajes({ DEV: false, VITE_CORTE_V3: "1", VITE_PERSONAJES_PRIVADOS_URL: "http://127.0.0.1:4193/" })).toBeNull();
    expect(await fuenteDePersonajes({ DEV: true, VITE_CORTE_V3: "1", VITE_PERSONAJES_PRIVADOS_URL: "http://127.0.0.1:4193/" })).toBe("http://127.0.0.1:4193/");
  });
  it("ida y vuelta estable: haciaBase(desdeBase(v3)) es la misma v3, y proyecta momentos, personalidad y apodo", async () => {
    const { desdeBase, haciaBase } = await import("./integracion");
    const p = desdeBase(v3)!;
    expect(p.version).toBe(2);
    expect(p.momentos).toEqual(v3.momentos);
    expect(p.extensiones).toMatchObject({ alv: { apodo: "Tony", personalidad: { perfil: "timido" } } });
    expect(haciaBase(p, true)).toEqual({ tipo: "subir", figura: v3 });
  });
  it("v2 pasa igual; lo inválido no entra; sin corte se sube lo de siempre", async () => {
    const { desdeBase, haciaBase } = await import("./integracion");
    expect(desdeBase({ version: 2, cabello: "x" })).toEqual({ version: 2, cabello: "x" });
    expect(desdeBase({ version: 3, familia: "../x" })).toBeNull();
    expect(desdeBase(null)).toBeNull();
    expect(desdeBase([1])).toBeNull();
    expect(haciaBase({ version: 2, cabello: "x" }, false)).toEqual({ tipo: "subir", figura: { version: 2, cabello: "x" } });
    expect(haciaBase({ version: 3 }, false)).toEqual({ tipo: "error" });
  });
  it("con corte: una v2 sin v3 se OMITE (no se sube ni se borra); un puente roto es error", async () => {
    const { haciaBase } = await import("./integracion");
    expect(haciaBase({ version: 2, cabello: "x" }, true)).toEqual({ tipo: "omitir" });
    expect(haciaBase({ version: 2, extensiones: { alv: { v3: { version: 3, familia: "../x" } } } }, true)).toEqual({ tipo: "error" });
  });
  it("lo que una pantalla vieja cambie en la proyección entra a la v3 (un solo valor)", async () => {
    const { desdeBase, haciaBase } = await import("./integracion");
    const p = desdeBase(v3)! as unknown as { momentos: Record<string, unknown>; extensiones: { alv: Record<string, unknown> } };
    p.momentos = { ...p.momentos, victoria: "baile" };
    p.extensiones.alv.personalidad = { perfil: "comico" };
    delete p.extensiones.alv.apodo;
    const r = haciaBase(p, true) as { tipo: "subir"; figura: typeof v3 };
    expect(r.tipo).toBe("subir");
    expect(r.figura.momentos.victoria).toBe("baile");
    expect(r.figura.extensiones.alv).toEqual({ personalidad: { perfil: "comico" } });
    // momentos rotos en la proyección: se quedan los de la v3
    p.momentos = { espera: 3 } as never;
    expect((haciaBase(p, true) as { figura: typeof v3 }).figura.momentos).toEqual(v3.momentos);
  });
});
