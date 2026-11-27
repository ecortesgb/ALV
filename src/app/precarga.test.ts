import { beforeEach, describe, expect, it, vi } from "vitest";
// La precarga real necesita catálogo privado, service worker y DOM: aquí se simulan para ver qué pide.
const m = vi.hoisted(() => ({
  corte: true,
  cat: { catalogo: {} } as unknown,
  plano: { glb: "/p/cuerpo.glb", piezas: [{ glb: "/p/casco.glb" }, { glb: "/p/cuerpo.glb" }] } as unknown,
  figura: { version: 2 } as unknown,
}));
vi.mock("../personajes/integracion", () => ({
  modoCorteV3: () => m.corte,
  catalogoParaEscena: async () => m.cat,
  paraEscena: (x: object) => ({ ...x, plano3: m.plano }),
}));
vi.mock("./figura3d", () => ({ leerCapsulas: () => ({}), figuraActiva: () => m.figura }));
import { precargarHub } from "./precarga";

const links: { rel: string; href: string }[] = [];
const pedidos: string[] = [];
beforeEach(() => {
  links.length = 0; pedidos.length = 0;
  vi.stubGlobal("document", {
    head: { querySelector: (q: string) => links.find(l => q.includes(`"${l.href}"`)) ?? null, appendChild: (l: { rel: string; href: string }) => links.push(l) },
    createElement: () => ({ rel: "", as: "", href: "" }),
  });
  vi.stubGlobal("navigator", { serviceWorker: { controller: {} } });
  vi.stubGlobal("fetch", vi.fn(async (u: string) => { pedidos.push(u); return { arrayBuffer: async () => new ArrayBuffer(0) }; }));
});
const listo = () => new Promise(r => setTimeout(r, 0));

describe("precargarHub", () => {
  it("adelanta los scripts del motor y baja cada GLB de la figura una vez", async () => {
    precargarHub("ana");
    await listo();
    expect(links.some(l => l.href.includes("GLTFLoader.js"))).toBe(true);
    expect(links.some(l => l.href.endsWith("personajes/motor-personajes.js"))).toBe(true);
    expect(pedidos.sort()).toEqual(["/p/casco.glb", "/p/cuerpo.glb"]);
  });

  it("una sola vez por cuenta", async () => {
    precargarHub("beto"); await listo();
    const n = pedidos.length;
    precargarHub("beto"); await listo();
    expect(pedidos.length).toBe(n);
  });

  it("sin service worker al mando no pide GLB (no saldrían por la caché privada)", async () => {
    vi.stubGlobal("navigator", { serviceWorker: { controller: null } });
    precargarHub("cata"); await listo();
    expect(pedidos).toEqual([]);
  });

  it("sin catálogo o sin el corte no hace nada", async () => {
    m.cat = null;
    precargarHub("dani"); await listo();
    expect(pedidos).toEqual([]);
    m.corte = false; links.length = 0;
    precargarHub("eli"); await listo();
    expect(links).toEqual([]);
  });
});
