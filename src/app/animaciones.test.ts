import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  DURACION_MS, ENFRIAR_MS, PRIORIDAD, alGestoPropio, alPedirGesto, animacionDe, aplicarGestoRemoto, decidir, estadoGesto,
  limpiarAnim, pedirGesto, personajeDe, reiniciarGestos, terminarGesto, type EventoGesto,
} from "./animaciones";
import { revisarGesto } from "../servicios/gestosSala";
import datos from "../content/animaciones-personajes.json";
import trajes from "../content/trajes-figura.json";
import type { FiguraV2 } from "../content/personaje";

const fig = (nombre: string, extra: Record<string, unknown> = {}) => ({ version: 2, nombre, identidad: {}, ropa: {}, ...extra }) as unknown as FiguraV2;
afterEach(() => reiniciarGestos());

describe("prioridades", () => {
  const T = 1_000_000;
  it("un gesto de menor prioridad no corta a uno mayor; uno igual o mayor sí", () => {
    expect(pedirGesto("a", "especial", null, T)).toBe(true);
    expect(pedirGesto("a", "victoria", null, T + 1000)).toBe(false);
    expect(pedirGesto("a", "saludar", null, T + 1500)).toBe(false);
    expect(pedirGesto("b", "victoria", null, T)).toBe(true);
    expect(pedirGesto("b", "derrota", null, T + 1000)).toBe(true);   // misma prioridad
    expect(pedirGesto("b", "especial", null, T + 2000)).toBe(true);  // mayor
  });
  it("el mismo gesto mientras suena se ignora, y hay enfriamiento entre toques", () => {
    expect(pedirGesto("a", "saludar", null, T)).toBe(true);
    expect(pedirGesto("a", "saludar", null, T + 1000)).toBe(false);
    expect(pedirGesto("a", "victoria", null, T + ENFRIAR_MS - 1)).toBe(false);
    expect(pedirGesto("a", "victoria", null, T + ENFRIAR_MS)).toBe(true);
  });
  it("al terminar (o al pasar su duración) vuelve a la espera y entra cualquiera", () => {
    pedirGesto("a", "especial", null, T);
    terminarGesto("a", "especial");
    expect(estadoGesto("a").gesto).toBeNull();
    expect(pedirGesto("a", "saludar", null, T + 1000)).toBe(true);
    const e = estadoGesto("a");
    expect(decidir(e, "victoria", e.desde + DURACION_MS.saludar + 1)).toBe(true);
  });
  it("la tabla es la del motor (tools/minifig/escena.js)", () => {
    const src = readFileSync("tools/minifig/escena.js", "utf8");
    const m = /const PRIO = (\{[^}]+\})/.exec(src);
    expect(m).not.toBeNull();
    expect(Function(`return ${m![1]}`)()).toMatchObject(PRIORIDAD); // el motor además conoce «bailar» (gesto viejo del lobby)
  });
});

describe("tienda y avisos", () => {
  it("avisa a las escenas y a la red; un gesto remoto solo a las escenas", () => {
    const escenas: EventoGesto[] = [], red: EventoGesto[] = [];
    const a = alPedirGesto(e => escenas.push(e)), b = alGestoPropio(e => red.push(e));
    pedirGesto("yo", "victoria", fig("Hulk"), 5_000_000);
    expect(red).toHaveLength(1);
    expect(red[0]).toMatchObject({ jugador: "yo", gesto: "victoria", personaje: "hulk" });
    aplicarGestoRemoto("otro", "saludar", 7, null, 5_000_000);
    expect(escenas.map(e => e.jugador)).toEqual(["yo", "otro"]);
    expect(red).toHaveLength(1);
    a(); b();
  });
  it("el número de gesto crece aunque el aparato se recargue", () => {
    pedirGesto("yo", "saludar", null, 2_000_000);
    const n1 = estadoGesto("yo").n;
    reiniciarGestos();
    pedirGesto("yo", "saludar", null, 2_000_500);
    expect(estadoGesto("yo").n).toBeGreaterThan(n1);
  });
  it("remotos: descarta repetidos y viejos, no vuelve a decidir prioridades", () => {
    expect(aplicarGestoRemoto("x", "especial", 10, null)).toBe(true);
    expect(aplicarGestoRemoto("x", "saludar", 10, null)).toBe(false);
    expect(aplicarGestoRemoto("x", "saludar", 9, null)).toBe(false);
    expect(aplicarGestoRemoto("x", "saludar", 11, null)).toBe(true); // lo decidió quien lo mandó
  });
});

describe("mensajes de la sala", () => {
  const miembros = new Set(["ana", "beto"]);
  it("acepta solo miembros, gestos conocidos y en orden", () => {
    const u = new Map<string, { n: number; t: number }>();
    expect(revisarGesto({ g: "victoria", j: "ana", n: 5, p: "hulk" }, miembros, "beto", u, 0)).toEqual({ g: "victoria", j: "ana", n: 5, p: "hulk" });
    expect(revisarGesto({ g: "victoria", j: "ana", n: 5 }, miembros, "beto", u, 10_000)).toBeNull();      // repetido
    expect(revisarGesto({ g: "victoria", j: "ana", n: 6 }, miembros, "beto", u, 100)).toBeNull();         // muy seguido
    expect(revisarGesto({ g: "volar", j: "ana", n: 7 }, miembros, "beto", u, 20_000)).toBeNull();          // gesto raro
    expect(revisarGesto({ g: "saludar", j: "intruso", n: 8 }, miembros, "beto", u, 20_000)).toBeNull();   // no es de la sala
    expect(revisarGesto({ g: "saludar", j: "beto", n: 8 }, miembros, "beto", u, 20_000)).toBeNull();      // el propio
    expect(revisarGesto({ g: "saludar", j: "ana", n: 1.5 }, miembros, "beto", u, 20_000)).toBeNull();
    expect(revisarGesto({ g: "saludar", j: "ana", n: 9, p: "<script>" }, miembros, "beto", u, 20_000)?.p).toBeNull();
  });
});

describe("personajes", () => {
  it("cada entrada existe en trajes-figura.json y su nombre coincide con el de la figura", () => {
    const porId = new Map((trajes as unknown as { trajes: { id: string; figura: { nombre: string } }[] }).trajes.map(t => [t.id, t.figura.nombre]));
    for (const [id, x] of Object.entries((datos as unknown as { personajes: Record<string, { nombre: string }> }).personajes)) {
      expect(porId.get(id), id).toBe(x.nombre);
    }
  });
  it("reconoce al personaje por su figura y da su talla y especial", () => {
    expect(personajeDe(fig("Hulk"))).toBe("hulk");
    expect(animacionDe(fig("Hulk"))).toEqual({ talla: "grande", especial: "furia" });
    expect(animacionDe(fig("Yoda")).talla).toBe("pequeno");
    expect(animacionDe(fig("Mi figura"))).toEqual({});
    expect(animacionDe(null)).toEqual({});
  });
  it("lo que trae la figura gana; lo inválido se ignora sin tronar", () => {
    const f = fig("Hulk", { extensiones: { alv: { anim: { talla: "androide", especial: { anim: "baile", pieza: { ocultar: "pelo" } } } } } });
    expect(animacionDe(f)).toEqual({ talla: "androide", especial: { anim: "baile" } });
    expect(limpiarAnim({ talla: "gigante", especial: "x y" })).toEqual({});
    expect(limpiarAnim({ especial: { anim: "visor", pieza: { rostro: "sonrisa-grande" }, en: 0.5, vuelve: 99 } }))
      .toEqual({ especial: { anim: "visor", pieza: { rostro: "sonrisa-grande" }, en: 0.5 } });
    expect(limpiarAnim("nada")).toEqual({});
  });
});

describe("motor: gestos.js", () => {
  // Carga momentos.js (Minifig Studio) y gestos.js (ALV) como en el navegador.
  const ctx: Record<string, unknown> = { Math, Number, String, Object, console };
  ctx.self = ctx; ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync("public/minifig/nucleo/momentos.js", "utf8"), ctx);
  vm.runInContext(readFileSync("tools/minifig/gestos.js", "utf8"), ctx);
  const M = ctx.Momentos as { info(n: string): { tipo: string; dur: number | null; bucle: boolean } | null; pose(n: string, t: number): Record<string, number>; lista(t?: string): unknown[] };
  const G = ctx.GestosALV as { TALLAS: Record<string, unknown>; especial(d: unknown, p?: string | null): { anim: string } };
  it("todo especial del JSON existe y sus poses dan números", () => {
    for (const x of Object.values((datos as unknown as { personajes: Record<string, { especial?: unknown }> }).personajes)) {
      const anim = G.especial(x.especial).anim;
      expect(M.info(anim), anim).not.toBeNull();
      for (const t of [0, 0.5, 1, 2, 3, 5]) for (const v of Object.values(M.pose(anim, t))) expect(Number.isFinite(v)).toBe(true);
    }
  });
  it("sin especial: el de su poder o el baile; las de Minifig Studio siguen igual", () => {
    expect(G.especial(null, "fuerza").anim).toBe("furia");
    expect(G.especial(undefined, "magia").anim).toBe("baile");
    expect(G.especial("no-existe", null).anim).toBe("baile");
    expect(M.info("golpe-suelo")?.tipo).toBe("victoria");
    expect(M.lista("especial").length).toBeGreaterThanOrEqual(5);
  });
  it("las tallas del motor son las de la app", () => {
    expect(Object.keys(G.TALLAS).sort()).toEqual(["androide", "grande", "normal", "pequeno"]);
  });
  it("public/minifig tiene la misma copia que tools/minifig", () => {
    for (const f of ["escena.js", "gestos.js", "escena.html", "biblioteca-anim.js"]) expect(readFileSync(`public/minifig/${f}`, "utf8"), f).toBe(readFileSync(`tools/minifig/${f}`, "utf8"));
  });
});
