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
  it("bloque juego opcional (§3, Codex 2026-11-26): sin él sigue valiendo; con él, solo <id>-juego.glb y acciones conocidas", () => {
    expect(buena().juego).toBeUndefined();
    const j = buena(ficha({ juego: { glb: "iron-man-juego.glb", clips: { caminar: "Walk", saltar: "Jump", ko: "KNOCKEDDOWN" } } }));
    expect(j.juego).toEqual({ glb: "iron-man-juego.glb", clips: { caminar: "Walk", saltar: "Jump", ko: "KNOCKEDDOWN" } });
    for (const malo of [{ glb: "otro-juego.glb", clips: { caminar: "Walk" } }, { glb: "../iron-man-juego.glb", clips: { caminar: "Walk" } },
      { glb: "iron-man-juego.glb", clips: { volar: "Fly" } }, { glb: "iron-man-juego.glb", clips: {} }, { glb: "iron-man-juego.glb", clips: { caminar: "<script>" } }]) {
      expect(leerFicha(ficha({ juego: malo })).ok, JSON.stringify(malo)).toBe(false);
    }
  });
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
  const L = ctx.LogicasALV as { logicaDe(c: unknown): string; LOGICAS: string[]; velocidadClip(v?: unknown): number };
  it("los clips del juego van siempre a velocidad 1, aunque el perfil o el gesto pidan otra (cómico 1.22, tímido 0.82)", () => {
    for (const v of [1.22, 1.15, 0.82, 0.5, 1.6, undefined, NaN]) expect(L.velocidadClip(v)).toBe(1);
    // Las dos escenas que dibujan figuras v3 la usan (app: adaptador de escena.js; galería y «Mi personaje»: escena-personajes.js).
    // (El camino v2 de escena.js conserva su velocidad: es para las tablas rígidas del motor viejo.)
    for (const f of ["tools/minifig/escena.js", "public/minifig/escena.js"]) expect(readFileSync(f, "utf8"), f).toMatch(/const vel = Lg && Lg\.velocidadClip \? Lg\.velocidadClip\(op\.vel\) : 1;[^\n]*\n\s*if \(!e\.v3\.tocar\(l, \{ vel \}\)\)/);
    for (const f of ["tools/personajes/escena-personajes.js", "public/personajes/escena-personajes.js"]) expect(readFileSync(f, "utf8"), f).toMatch(/p\.tocar\(d\.cual, \{ vel: window\.LogicasALV && window\.LogicasALV\.velocidadClip \? window\.LogicasALV\.velocidadClip\(d\.vel\) : 1 \}\)/);
  });
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

describe("cruces y compensación (lógica pura en vm)", () => {
  type Cruce = { entrante: string; pesoEntranteInicial: number; pesosSalientesIniciales: Map<string, number>; t: number; pesos: Map<string, number> };
  type Frente = { valor: number; logica: string; velocidad: number; t: number };
  const ctx: Record<string, unknown> = {};
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync("tools/personajes/logicas.js", "utf8"), ctx);
  const L = ctx.LogicasALV as {
    pasoCruce(e: Cruce, dt: number, mezcla: number): Cruce;
    pasoCompensacion(e: Frente | undefined, meta: number, logica: string, dt: number, mezcla: number): Frente;
  };
  const iniciar = (entrante: string, pesos: Map<string, number>): Cruce => ({
    entrante, pesos, pesoEntranteInicial: pesos.get(entrante) || 0,
    pesosSalientesIniciales: new Map([...pesos].filter(([a]) => a !== entrante)), t: 0,
  });
  const sumaUno = (e: Cruce) => expect([...e.pesos.values()].reduce((s, w) => s + w, 0)).toBeCloseTo(1, 12);

  it("la suma es 1 en cada paso, también con dt irregular y después de terminar", () => {
    let e = iniciar("saludo", new Map([["reposo", 0.7], ["victoria", 0.3]]));
    for (const dt of [0, 0.016, 0.07, 0.014, 0.1, 0.05, 0.1, 0.5]) {
      e = L.pasoCruce(e, dt, 0.35);
      sumaUno(e);
      for (const w of e.pesos.values()) { expect(w).toBeGreaterThanOrEqual(0); expect(w).toBeLessThanOrEqual(1); }
    }
    expect(e.pesos.get("saludo")).toBe(1);
    expect(e.pesos.get("reposo")).toBe(0);
    expect(e.pesos.get("victoria")).toBe(0);
  });
  it("interrumpir varias veces no sube ninguna saliente y conserva sus proporciones", () => {
    let e = L.pasoCruce(iniciar("saludo", new Map([["reposo", 1]])), 0.14, 0.35);
    for (const siguiente of ["victoria", "derrota", "especial"]) {
      const anteriores = e.pesos;
      e = iniciar(siguiente, anteriores);
      for (const dt of [0, 0.035, 0.035]) {
        const previo = e.pesos;
        e = L.pasoCruce(e, dt, 0.35);
        sumaUno(e);
        for (const [a, w] of previo) if (a !== siguiente) expect(e.pesos.get(a)!).toBeLessThanOrEqual(w);
      }
      expect(e.pesos.get("reposo")! / e.pesos.get("saludo")!).toBeCloseTo(1.5);
    }
  });
  it("una entrante con peso 0.4 parte de 0.4 y llega a 1 en 0.35 * 0.6 segundos", () => {
    const base = iniciar("saludo", new Map([["saludo", 0.4], ["reposo", 0.2], ["victoria", 0.4]]));
    let e = L.pasoCruce(base, 0, 0.35);
    expect(e.pesos.get("saludo")).toBe(0.4);
    e = L.pasoCruce(e, 0.105, 0.35);
    expect(e.pesos.get("saludo")).toBeCloseTo(0.7);
    sumaUno(e);
    e = L.pasoCruce(e, 0.105, 0.35);
    expect(e.pesos.get("saludo")).toBe(1);
    expect(base.t).toBe(0);
    expect([...base.pesos]).toEqual([["saludo", 0.4], ["reposo", 0.2], ["victoria", 0.4]]);
  });
  it("mezcla 0 apaga TODAS las salientes, incluidas las de cruces anteriores", () => {
    const e = L.pasoCruce(iniciar("especial", new Map([["reposo", 0.4], ["saludo", 0.4], ["victoria", 0.2]])), 0, 0);
    expect([...e.pesos]).toEqual([["especial", 1], ["reposo", 0], ["saludo", 0], ["victoria", 0]]);
    sumaUno(e);
  });
  it("la compensación llega linealmente a su meta en 0.35 s, hacia ambos lados", () => {
    for (const meta of [-0.7, 0.7]) {
      let e = L.pasoCompensacion(undefined, meta, "reposo", 0, 0.35);
      for (let i = 1; i <= 7; i++) {
        e = L.pasoCompensacion(e, meta, "reposo", 0.05, 0.35);
        expect(e.valor).toBeCloseTo(meta * i / 7, 12);
      }
      e = L.pasoCompensacion(e, 0, "saludo", 0, 0.35);
      expect(e.valor).toBeCloseTo(meta);
      for (let i = 1; i <= 7; i++) {
        e = L.pasoCompensacion(e, 0, "saludo", 0.05, 0.35);
        expect(e.valor).toBeCloseTo(meta * (1 - i / 7), 12);
      }
    }
  });
  it("al interrumpir la compensación parte del valor actual y sigue metas móviles sin congelar los gestos", () => {
    let e = L.pasoCompensacion(undefined, 0.7, "reposo", 0.175, 0.35);
    expect(e.valor).toBeCloseTo(0.35);
    const antes = e;
    e = L.pasoCompensacion(e, 0, "saludo", 0.05, 0.35);
    expect(e.valor).toBeCloseTo(0.3);
    expect(antes.valor).toBeCloseTo(0.35);
    const previo = e.valor;
    e = L.pasoCompensacion(e, -0.7, "saludo", 0.05, 0.35);
    expect(e.valor).toBeCloseTo(previo - 0.05);
    e = L.pasoCompensacion(e, -0.7, "saludo", 0.3, 0.35);
    const terminado = e.valor;
    e = L.pasoCompensacion(e, 0.7, "saludo", 0.05, 0.35);
    expect(e.valor - terminado).toBeCloseTo(0.05);
    const neutro = L.pasoCompensacion(undefined, 0, "reposo", 0.4, 0.35);
    expect(L.pasoCompensacion(neutro, 0.7, "reposo", 0.05, 0.35).valor).toBeGreaterThan(0);
  });
});

describe("motor: repetición, reentrada y retorno automático", () => {
  // Dobles mínimos de r128: tiempo independiente del peso y finished con la última pose retenida.
  class Accion {
    time = 0; weight = 1; enabled = true; paused = false; activa = false; clampWhenFinished = false;
    reinicios = 0; paradas = 0; vel = 1; loop = 0;
    constructor(readonly nombre: string) {}
    reset() { this.time = 0; this.paused = false; this.enabled = true; this.reinicios++; return this; }
    play() { this.activa = true; return this; }
    stop() { this.activa = false; this.paradas++; return this.reset(); }
    isRunning() { return this.activa && this.enabled && !this.paused; }
    setEffectiveWeight(w: number) { this.weight = w; return this; }
    setEffectiveTimeScale(v: number) { this.vel = v; return this; }
    setLoop(loop: number) { this.loop = loop; return this; }
  }
  async function preparar() {
    const acciones = new Map<string, Accion>();
    const pesosAlActualizar: number[] = [];
    let finished: (e: { action: Accion }) => void = () => {};
    class Mixer {
      clipAction(c: { name: string }) {
        if (!acciones.has(c.name)) acciones.set(c.name, new Accion(c.name));
        return acciones.get(c.name)!;
      }
      addEventListener(_nombre: string, fn: typeof finished) { finished = fn; }
      update(dt: number) {
        pesosAlActualizar.push([...acciones.values()].filter(a => a.activa && a.enabled).reduce((s, a) => s + a.weight, 0));
        for (const a of [...acciones.values()]) {
          if (!a.isRunning()) continue;
          a.time += dt * a.vel;
          if (a.loop === 1 && a.time >= 1) { a.time = 1; a.paused = a.clampWhenFinished; finished({ action: a }); }
        }
        return this;
      }
    }
    const obj = { name: "", userData: {}, scale: { setScalar() {} }, position: { y: 0 }, traverse() {}, updateMatrixWorld() {} };
    const ctx: Record<string, unknown> = { THREE: {
      GLTFLoader: class {}, SkeletonUtils: { clone: () => obj }, AnimationMixer: Mixer, Vector3: class {}, LoopRepeat: 2, LoopOnce: 1,
      Box3: class { min = { y: 0 }; max = { x: 1 }; setFromObject() { return this; } },
    } };
    ctx.self = ctx;
    vm.createContext(ctx);
    for (const f of ["logicas.js", "motor-personajes.js"]) vm.runInContext(readFileSync(`tools/personajes/${f}`, "utf8"), ctx);
    const motor = ctx.MotorPersonajes as {
      MEZCLA: number;
      cache: Map<string, unknown>;
      crear(p: unknown): Promise<{ tocar(c: string, op?: { mezcla?: number; vel?: number }): boolean; update(dt: number): void; estado(): { logica: string; tiempo: number } }>;
    };
    motor.cache.set("prueba.glb", Promise.resolve({ scene: obj, animations: ["Idle", "Wave", "Cheer"].map(name => ({ name, duration: 1 })) }));
    const p = await motor.crear({ id: "prueba", glb: "prueba.glb", clips: { reposo: "Idle", saludo: "Wave", victoria: "Cheer" } });
    return { p, acciones, pesosAlActualizar, mezcla: motor.MEZCLA };
  }
  it("repetir el mismo gesto en curso no reinicia tiempo, velocidad ni pesos (E1)", async () => {
    const { p, acciones } = await preparar();
    p.tocar("saludo"); p.update(0.14);
    const a = acciones.get("Wave")!, antes = [a.time, a.weight, a.reinicios, a.vel];
    expect(p.tocar("hola", { vel: 2 })).toBe(true);
    expect([a.time, a.weight, a.reinicios, a.vel]).toEqual(antes);
  });
  it("reentrar desde 0.4 conserva el tiempo y sube desde su peso actual; las salientes se detienen en 0 (E2/E3)", async () => {
    const { p, acciones, pesosAlActualizar, mezcla } = await preparar();
    expect(mezcla).toBe(0.35);
    p.tocar("saludo"); p.update(0.14);
    const a = acciones.get("Wave")!, tiempo = a.time, reinicios = a.reinicios;
    p.tocar("victoria");
    expect(a.weight).toBeCloseTo(0.4);
    p.tocar("saludo");
    expect(a.time).toBe(tiempo); expect(a.reinicios).toBe(reinicios); expect(a.weight).toBeCloseTo(0.4);
    p.update(0.105); expect(a.weight).toBeCloseTo(0.7);
    p.update(0.105); expect(a.weight).toBe(1);
    expect(acciones.get("Idle")!.activa).toBe(false);
    expect(acciones.get("Idle")!.weight).toBe(0);
    expect(acciones.get("Idle")!.paradas).toBe(1);
    for (const suma of pesosAlActualizar) expect(suma).toBeCloseTo(1, 12);
  });
  it("finished vuelve a reposo con cruce y otro gesto inmediato con mezcla 0 apaga también el clip terminado", async () => {
    const { p, acciones } = await preparar();
    p.tocar("saludo", { mezcla: 0 }); p.update(1);
    expect(p.estado().logica).toBe("reposo");
    p.update(0.14);
    expect(acciones.get("Wave")!.weight).toBeCloseTo(0.6);
    expect(acciones.get("Idle")!.weight).toBeCloseTo(0.4);
    p.tocar("victoria", { mezcla: 0 });
    for (const nombre of ["Wave", "Idle"]) {
      expect(acciones.get(nombre)!.weight).toBe(0);
      expect(acciones.get(nombre)!.activa).toBe(false);
    }
    expect(acciones.get("Cheer")!.weight).toBe(1);
    p.tocar("saludo", { mezcla: 0 });
    expect(p.estado().tiempo).toBe(0); // al volver desde peso 0 sí reinicia
  });
  it("recuperar un clip terminado que aún pesa conserva su tiempo y permite volver a emitir finished", async () => {
    const { p, acciones } = await preparar();
    p.tocar("saludo", { mezcla: 0 }); p.update(1); p.update(0.14);
    const a = acciones.get("Wave")!, reinicios = a.reinicios;
    expect(a.paused).toBe(true);
    p.tocar("saludo");
    expect(a.time).toBe(1); expect(a.reinicios).toBe(reinicios);
    expect(a.weight).toBeCloseTo(0.6); expect(a.paused).toBe(false);
    p.update(0.01);
    expect(p.estado().logica).toBe("reposo");
  });
});
