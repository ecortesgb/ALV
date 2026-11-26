// Núcleo del sistema de personajes nuevo: ficha, figura v3, resolver a plano, compatibilidad y lógicas del motor.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { opciones, poner, quitar, type Piezas } from "./compat";
import { leerFicha, logicasQueFaltan } from "./ficha";
import { apodo, deCatalogo, leerFigura } from "./figura";
import { resolver, resolverClips, type Catalogo } from "./plano";
import type { Ficha, FiguraV3, Pieza } from "./tipos";

const FICHA = {
  id: "iron-man", nombre: "Iron Man", saga: "marvel", grupo: "avengers", bando: "heroe", familia: "minifig", rig: "esqueleto",
  glb: "iron-man.glb", fotos: { tarjeta: "iron-man-tarjeta.webp", busto: "iron-man-busto.webp" },
  huesos: { raiz: "Character", cadera: "Hips", torso: "Spine2", cuello: "Neck", cabeza: "Head", mano_der: "RightHand", mano_izq: "LeftHand" },
  animaciones: { mapa: { reposo: "Idle", entrada: "Fly_Intro", especial: "ChestBlast" }, respaldo: { saludo: "entrada" }, vida: ["Tiptoe"], sentado: null },
  medidas: { altura: 0.4, pies_en_cero: true, frente: "+Z" },
  carga: { colores_srgb: true, rugosidad: 0.4, metal: ["oro"] },
  origen: { fuente: "juego", juego: "LEGO Marvel Super Heroes", personaje_juego: "ironman", herramienta: "Figure Forge" },
  publica: false, calidad: { estado: "jugable" },
};
const ficha = (cambio: Record<string, unknown> = {}) => ({ ...structuredClone(FICHA), ...cambio });
const buena = (x = ficha()): Ficha => { const r = leerFicha(x); if (!r.ok) throw new Error(r.errores.join(", ")); return r.ficha; };

describe("ficha de producción", () => {
  it("acepta la ficha del contrato", () => expect(leerFicha(ficha()).ok).toBe(true));
  it("rechaza lo que no cuadra", () => {
    for (const malo of [{ id: "Iron Man" }, { familia: "gigante" }, { rig: "rigido" }, { glb: "../../secreto.glb" }, { glb: "https://x.com/a.glb" },
      { glb: "C:\\a.glb" }, { bando: "malo" }, { publica: true }, { calidad: { estado: "listo" } }]) {
      expect(leerFicha(ficha(malo)).ok, JSON.stringify(malo)).toBe(false);
    }
    expect(leerFicha(null).ok).toBe(false);
    expect(leerFicha(ficha({ animaciones: { mapa: {}, respaldo: {}, vida: [], sentado: null } })).ok).toBe(false); // sin reposo
    expect(leerFicha(ficha({ huesos: { raiz: "Character" } })).ok).toBe(false); // sin cabeza
  });
  it("solo las fichas de prueba pueden apuntar a otra carpeta", () => {
    const f = ficha({ glb: "../../referencias/hulk/hulk.glb" });
    expect(leerFicha(f).ok).toBe(false);
    expect(leerFicha(f, { rutasLibres: true }).ok).toBe(true);
  });
  it("dice qué lógicas faltan", () => expect(logicasQueFaltan(buena())).toEqual(["saludo", "victoria", "derrota"]));
});

describe("lógicas a clips", () => {
  it("usa la propia, luego su respaldo y luego el de la familia", () => {
    expect(resolverClips(buena())).toEqual({
      reposo: "Idle", entrada: "Fly_Intro", especial: "ChestBlast",
      saludo: "Fly_Intro",   // respaldo del personaje: saludo → entrada
      victoria: "Idle",      // familia: victoria → reposo
      derrota: "Idle",
    });
  });
  it("no se cicla", () => {
    const f = buena(ficha({ animaciones: { mapa: { reposo: "Idle" }, respaldo: { saludo: "victoria", victoria: "saludo" }, vida: [], sentado: null } }));
    expect(resolverClips(f).saludo).toBeUndefined();
  });
});

describe("figura v3", () => {
  it("se crea desde el catálogo y conserva el estilo de movimiento", () => {
    const antes = { ...deCatalogo(buena()), momentos: { paquete: "vuelo", espera: "flotar", victoria: "despegue", derrota: "x", punto: "y" } };
    const f = deCatalogo(buena(), antes);
    expect(f.origen).toEqual({ tipo: "catalogo", personaje: "iron-man", version: "base", revision: 1 });
    expect(f.momentos.paquete).toBe("vuelo");
    expect(leerFigura(f)).toEqual(f);
  });
  it("rechaza lo que no es v3 o viene inflado", () => {
    const f = deCatalogo(buena());
    expect(leerFigura({ ...f, version: 2 })).toBeNull();
    expect(leerFigura({ ...f, familia: "otra" })).toBeNull();
    expect(leerFigura({ ...f, piezas: { pierna: { id: "x1" } } })).toBeNull();
    expect(leerFigura({ ...f, extensiones: { relleno: "x".repeat(9000) } })).toBeNull();
    expect(leerFigura("hola")).toBeNull();
  });
  it("el apodo se limpia", () => {
    const f = deCatalogo(buena());
    expect(apodo({ ...f, extensiones: { alv: { apodo: "  Tony\nStark del futuro y más allá " } } })).toBe("TonyStark del futuro y m");
  });
});

describe("plano", () => {
  const cat: Catalogo = new Map([["iron-man", { ficha: buena(), base: "http://127.0.0.1:4193/catalogo/iron-man/" }]]);
  it("resuelve la URL, la escala y los clips", () => {
    const p = resolver("ana", deCatalogo(buena()), cat)!;
    expect(p.glb).toBe("http://127.0.0.1:4193/catalogo/iron-man/iron-man.glb");
    expect(p.huesos.cabeza).toBe("Head");
    expect(p.clips.especial).toBe("ChestBlast");
    expect(p.escala).toBeGreaterThan(0);
  });
  it("sin el personaje en el catálogo no hay plano", () => {
    const otra: FiguraV3 = { ...deCatalogo(buena()), origen: { tipo: "catalogo", personaje: "hulk", version: "base", revision: 1 } };
    expect(resolver("ana", otra, cat)).toBeNull();
  });
});

describe("compatibilidad", () => {
  const pz = (id: string, parte: Pieza["parte"], extra: Partial<Pieza> = {}): Pieza =>
    ({ id, nombre: id, familia: "minifig", parte, glb: id + ".glb", clase: [], ocupa: [], requiere: [], excluye: [], basico: false, publica: false, ...extra });
  const piezas: Piezas = new Map([
    pz("torso-liso", "torso", { clase: ["cuello-capa"], basico: true }),
    pz("torso-armadura", "torso", { basico: true }),
    pz("capa-superman", "capa", { ocupa: ["espalda", "nuca"], requiere: ["cuello-capa"] }),
    pz("mochila", "mochila", { ocupa: ["espalda"] }),
    pz("pelo-largo", "cabello", { clase: ["pelo-largo"], ocupa: ["craneo"] }),
    pz("casco-cerrado", "sombrero", { ocupa: ["craneo", "cara"] }),
    pz("capa-hulk", "capa", { familia: "bigfig" }),
  ].map(p => [p.id, p]));
  const base: FiguraV3 = { version: 3, familia: "minifig", origen: { tipo: "creado" }, piezas: {}, momentos: { paquete: null, espera: "a", victoria: "b", derrota: "c", punto: "d" }, extensiones: {} };

  it("la capa necesita un torso que la sostenga", () => {
    expect(poner(base, "capa-superman", piezas)).toBeNull();
    const con = poner(base, "torso-liso", piezas)!.figura;
    expect(poner(con, "capa-superman", piezas)!.figura.piezas.capa).toEqual({ id: "capa-superman" });
  });
  it("lo que ocupa el mismo espacio se quita, con aviso", () => {
    let f = poner(base, "torso-liso", piezas)!.figura;
    f = poner(f, "capa-superman", piezas)!.figura;
    const r = poner(f, "mochila", piezas)!;
    expect(r.quitadas).toEqual(["capa-superman"]);
    expect(r.aviso).toBe(true);
    expect(r.figura.piezas.capa).toBeUndefined();
  });
  it("cambiar una pieza de la misma parte no avisa", () => {
    const f = poner(base, "torso-liso", piezas)!.figura;
    const r = poner(f, "torso-armadura", piezas)!;
    expect(r.aviso).toBe(false);
    expect(r.quitadas).toEqual(["torso-liso"]);
  });
  it("quitar el torso se lleva la capa", () => {
    let f = poner(base, "torso-liso", piezas)!.figura;
    f = poner(f, "capa-superman", piezas)!.figura;
    const r = quitar(f, "torso", piezas);
    expect(r.quitadas).toEqual(["torso-liso", "capa-superman"]);
    expect(r.aviso).toBe(true);
  });
  it("opciones da el estado y el motivo; otra familia no aparece", () => {
    const f = poner(base, "pelo-largo", piezas)!.figura;
    const ops = opciones(f, "capa", piezas);
    expect(ops.map(o => [o.pieza.id, o.estado])).toEqual([["capa-superman", "no"]]);
    expect(opciones(f, "sombrero", piezas)[0]).toMatchObject({ estado: "disponible", motivo: "Se quita: pelo-largo" });
    expect(opciones(base, "torso", piezas, true).length).toBe(2);
  });
  it("no cambia la figura original", () => {
    const copia = structuredClone(base);
    poner(base, "torso-liso", piezas);
    expect(base).toEqual(copia);
  });
});

describe("lógicas del motor (tools/personajes/logicas.js)", () => {
  const ctx: Record<string, unknown> = {};
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync("tools/personajes/logicas.js", "utf8"), ctx);
  const L = ctx.LogicasALV as { logicaDe(c: unknown): string; LOGICAS: string[] };
  it("traduce momentos, gestos y vida", () => {
    expect(["espera", "punto", "victoria", "derrota", "saludar", "especial"].map(L.logicaDe)).toEqual(["reposo", "victoria", "victoria", "derrota", "saludo", "especial"]);
    expect(L.logicaDe("lib:gesture_wave")).toBe("saludo");
    expect(L.logicaDe("lib:celebration_cheer")).toBe("victoria");
    expect(L.logicaDe("cabeza-baja")).toBe("derrota");
    expect(L.logicaDe("furia")).toBe("especial");
  });
  it("cada id de la biblioteca cae en la misma lógica que su respaldo de ALV (todos los pares de perfiles-animacion.json)", () => {
    const pares: [string, string][] = [];
    JSON.parse(readFileSync("src/content/perfiles-animacion.json", "utf8"), (_k, v) => {
      if (v && typeof v === "object" && !Array.isArray(v) && typeof v.lib === "string" && typeof v.respaldo === "string") pares.push([v.lib, v.respaldo]);
      return v;
    });
    expect(pares.length).toBeGreaterThan(5);
    for (const [lib, respaldo] of pares) expect(L.logicaDe(lib), `${lib} → como ${respaldo}`).toBe(L.logicaDe(respaldo));
    expect(L.logicaDe("lib:reaction_confused")).toBe("derrota");
    expect(L.logicaDe("lib:personality_restless")).toBe("reposo");
  });
  it("las animaciones de ALV que usa la vida caen donde deben", () => {
    const esperado: Record<string, string> = { respirar: "reposo", saludar: "saludo", "salto-puno": "victoria", "puno-arriba": "victoria", baile: "victoria",
      flexionar: "victoria", mareo: "derrota", "cabeza-baja": "derrota", pisoton: "derrota" };
    for (const [n, l] of Object.entries(esperado)) expect(L.logicaDe(n), n).toBe(l);
  });
  it("lo desconocido es reposo y nunca truena", () => {
    for (const x of ["nada", "", null, 5, "lib:", "__proto__", "constructor"]) expect(L.LOGICAS).toContain(L.logicaDe(x));
    expect(L.logicaDe("constructor")).toBe("reposo");
  });
});
