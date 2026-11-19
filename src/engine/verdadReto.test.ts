// Verdad o reto con elección, una sola Verdad, tomar y herramientas (Maestro 6A.6 B y 6A.11 C4, C9, C13).
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida, VR_PUNTOS, type Accion, type AccionSinId, type EstadoPartida, type HerramientaVR } from "./partida";
import { armarArranque } from "./nucleo";
import { vistaPublica } from "./vistas";

const def = JUEGOS.find(j => j.id === "verdad-reto")!;
const gente = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
let k = 0;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, { ...a, id: `vr${++k}` } as Accion, CONTENIDO);
function partida(herramienta: HerramientaVR = "orden", n = 4, semilla = 7, rondas = 8) {
  const a = armarArranque(gente(n), "verdad-reto", rondas, 2, semilla, { herramienta })!;
  return crearPartida(def, a.cfg, a.semilla, CONTENIDO, a.rondas);
}
const vr = (e: EstadoPartida) => vistaPublica(e).verdadReto!;
/** Juega una ronda completa: elige, decide la fuente y califica. Deja la ronda revelada. */
function ronda(e: EstadoPartida, elige: "verdad" | "reto", fuente: "app" | "voz", resultado: "cumplio" | "tomo") {
  const { pregunta, responde } = vr(e);
  e = juega(e, { tipo: "contestar", jugador: responde, valor: { elige } });
  e = juega(e, { tipo: "contestar", jugador: pregunta, valor: { fuente } });
  e = juega(e, { tipo: "contestar", jugador: pregunta, valor: resultado });
  return juega(e, { tipo: "revelar" });
}

describe("arranque", () => {
  it("siempre trae la herramienta; una desconocida queda «en orden»", () => {
    expect(armarArranque(gente(3), "verdad-reto", 8, 2, 1, { herramienta: "dados" })!.cfg.verdadReto).toEqual({ herramienta: "dados" });
    expect(armarArranque(gente(3), "verdad-reto", 8, 2, 1, { herramienta: "botella" })!.cfg.verdadReto).toEqual({ herramienta: "orden" });
    expect(armarArranque(gente(3), "verdad-reto", 8, 2, 1)!.cfg.verdadReto).toEqual({ herramienta: "orden" });
  });
});

describe("una ronda", () => {
  it("en orden: responde el del turno y pregunta el anterior", () => {
    const e = partida("orden");
    expect(vr(e)).toMatchObject({ responde: "j0", pregunta: "j3", etapa: "elegir" });
    expect(vistaPublica(e).esperados).toEqual(["j0"]);
  });
  it("elige → fuente → califica, y cada paso lo hace la persona correcta", () => {
    let e = partida("orden");
    const { pregunta, responde } = vr(e);
    // Quien pregunta no puede elegir por el otro.
    e = juega(e, { tipo: "contestar", jugador: pregunta, valor: { elige: "reto" } });
    expect(vr(e).etapa).toBe("elegir");
    e = juega(e, { tipo: "contestar", jugador: responde, valor: { elige: "reto" } });
    expect(vr(e)).toMatchObject({ etapa: "fuente", eleccion: "reto" });
    expect(vistaPublica(e).esperados).toEqual([pregunta]);
    // Quien responde no decide la fuente.
    e = juega(e, { tipo: "contestar", jugador: responde, valor: { fuente: "app" } });
    expect(vr(e).etapa).toBe("fuente");
    e = juega(e, { tipo: "contestar", jugador: pregunta, valor: { fuente: "app" } });
    expect(vr(e)).toMatchObject({ etapa: "calificar", fuente: "app" });
    expect(e.carta?.tipo).toBe("reto");
    expect(e.carta?.texto.length).toBeGreaterThan(5);
    e = juega(e, { tipo: "contestar", jugador: pregunta, valor: "cumplio" });
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos[responde]).toBe(VR_PUNTOS.reto);
    expect(e.retos[responde]).toBe(1);
    expect(e.revelado).toMatchObject({ jugador: responde, pregunta, eleccion: "reto", resultado: "cumplio" });
  });
  it("en voz alta no hay carta de la app", () => {
    let e = partida("orden");
    const { pregunta, responde } = vr(e);
    e = juega(e, { tipo: "contestar", jugador: responde, valor: { elige: "verdad" } });
    e = juega(e, { tipo: "contestar", jugador: pregunta, valor: { fuente: "voz" } });
    expect(e.carta).toBeUndefined();
    expect(vr(e).etapa).toBe("calificar");
  });
  it("tomar da puntos, menos que un reto, y no cuenta como reto", () => {
    const e = ronda(partida("orden"), "reto", "voz", "tomo");
    expect(e.puntos.j0).toBe(VR_PUNTOS.tomar);
    expect(VR_PUNTOS.tomar).toBeLessThan(VR_PUNTOS.reto);
    expect(e.retos.j0).toBe(0);
  });
});

describe("una sola Verdad por jugador", () => {
  it("quien ya usó su Verdad solo puede elegir Reto", () => {
    let e = ronda(partida("orden", 2), "verdad", "voz", "cumplio"); // ronda 1: responde j0
    e = juega(e, { tipo: "siguiente" });
    e = ronda(e, "reto", "voz", "cumplio"); // ronda 2: responde j1
    e = juega(e, { tipo: "siguiente" });
    expect(vr(e).responde).toBe("j0");
    expect(vr(e).verdadUsada).toEqual(["j0"]);
    const otraVez = juega(e, { tipo: "contestar", jugador: "j0", valor: { elige: "verdad" } });
    expect(vr(otraVez).etapa).toBe("elegir");
    expect(vr(juega(e, { tipo: "contestar", jugador: "j0", valor: { elige: "reto" } })).eleccion).toBe("reto");
  });
});

describe("comodines", () => {
  it("con Escudo quien responde pasa sin tomar: 0 puntos y la ronda se puede revelar", () => {
    let e: EstadoPartida = { ...partida("orden"), manos: { j0: ["escudo"], j1: [], j2: [], j3: [] } };
    e = juega(e, { tipo: "usar-carta", jugador: "j0", carta: "escudo" });
    expect(vr(e).etapa).toBe("listo");
    e = juega(e, { tipo: "revelar" });
    expect(e.fase).toBe("revelada");
    expect(e.puntos.j0).toBe(0);
    expect(e.revelado).toMatchObject({ resultado: "paso" });
  });
  it("Cambio cambia solo la carta de la app", () => {
    let e: EstadoPartida = { ...partida("orden"), manos: { j0: ["cambio"], j1: [], j2: [], j3: [] } };
    e = juega(e, { tipo: "contestar", jugador: "j0", valor: { elige: "verdad" } });
    // Antes de que haya carta no se puede usar.
    expect(juega(e, { tipo: "usar-carta", jugador: "j0", carta: "cambio" }).manos.j0).toEqual(["cambio"]);
    e = juega(e, { tipo: "contestar", jugador: "j3", valor: { fuente: "app" } });
    e = juega(e, { tipo: "usar-carta", jugador: "j0", carta: "cambio" });
    expect(e.manos.j0).toEqual([]);
    expect(e.cambios).toBe(1);
    expect(e.carta?.tipo).toBe("verdad");
    expect(vr(e)).toMatchObject({ etapa: "calificar", responde: "j0", pregunta: "j3" });
  });
});

describe("herramientas", () => {
  for (const h of ["ruleta", "reloj", "dados", "poker"] as const) {
    it(`${h}: quien pregunta y quien responde son personas distintas en cada ronda`, () => {
      let e = partida(h, 5, 31, 6);
      for (let r = 0; r < 6 && e.fase !== "terminada"; r++) {
        const s = vr(e);
        expect(s.pregunta).not.toBe(s.responde);
        expect(s.herramienta).toBe(h);
        e = juega(ronda(e, "reto", "voz", "cumplio"), { tipo: "siguiente" });
      }
    });
  }
  it("dados: pregunta el más alto y responde el más bajo; lo que sacó cada quien es público", () => {
    const e = partida("dados", 5, 3);
    const sel = vistaPublica(e).seleccion as { dados: Record<string, number> };
    const s = vr(e);
    const valores = Object.values(sel.dados);
    expect(valores).toHaveLength(5);
    expect(sel.dados[s.pregunta]).toBe(Math.max(...valores));
    expect(sel.dados[s.responde]).toBe(Math.min(...valores));
  });
  it("póker: cartas distintas; la más alta pregunta y la más baja responde", () => {
    const e = partida("poker", 6, 9);
    const sel = vistaPublica(e).seleccion as { cartas: Record<string, { v: number; p: number }> };
    const valor = (j: string) => sel.cartas[j]!.v * 4 + sel.cartas[j]!.p;
    const todos = Object.keys(sel.cartas).map(valor);
    expect(new Set(todos).size).toBe(6);
    const s = vr(e);
    expect(valor(s.pregunta)).toBe(Math.max(...todos));
    expect(valor(s.responde)).toBe(Math.min(...todos));
  });
});

describe("partidas guardadas", () => {
  it("sin cfg.verdadReto corre el modo anterior (la carta sale sola)", () => {
    const cfg = { jugadores: gente(3), lugar: "interior" as const, intensidad: 2 as const, dificultad: 1 as const, adulto: false, drunk: false };
    const e = crearPartida(def, cfg, 7, CONTENIDO, 3);
    expect(e.carta).toBeDefined();
    expect(vistaPublica(e).verdadReto).toBeUndefined();
  });
});

describe("temporizador por turno (6A.11 C6)", () => {
  const conTiempo = (juego: "verdad-reto" | "impostor", n = 4) => {
    const a = armarArranque(gente(n), juego, 8, 2, 5, { herramienta: "orden", temporizador: 30 })!;
    return crearPartida(JUEGOS.find(j => j.id === juego)!, a.cfg, a.semilla, CONTENIDO, a.rondas);
  };
  it("el arranque guarda el tiempo solo en los juegos que lo usan, entre 10 y 180 s", () => {
    expect(armarArranque(gente(4), "verdad-reto", 8, 2, 1, { temporizador: 30 })!.cfg.temporizador).toBe(30);
    expect(armarArranque(gente(4), "verdad-reto", 8, 2, 1, { temporizador: 999 })!.cfg.temporizador).toBe(180);
    expect(armarArranque(gente(4), "mas-probable", 8, 2, 1, { temporizador: 30 })!.cfg.temporizador).toBeUndefined();
    expect(armarArranque(gente(4), "verdad-reto", 8, 2, 1)!.cfg.temporizador).toBeUndefined();
  });
  it("sin temporizador, «tiempo» no hace nada", () => {
    const e = partida("orden");
    expect(juega(e, { tipo: "tiempo" })).toBe(e);
  });
  it("Verdad o reto: si no elige a tiempo pierde el turno (0 puntos) y la ronda se puede revelar", () => {
    let e = juega(conTiempo("verdad-reto"), { tipo: "tiempo" });
    expect(vr(e).etapa).toBe("listo");
    e = juega(e, { tipo: "revelar" });
    expect(e.revelado).toMatchObject({ resultado: "tiempo" });
    expect(e.puntos.j0).toBe(0);
  });
  it("Verdad o reto: si quien pregunta no decide a tiempo, sale la carta de ALV", () => {
    let e = conTiempo("verdad-reto");
    e = juega(e, { tipo: "contestar", jugador: "j0", valor: { elige: "reto" } });
    e = juega(e, { tipo: "tiempo" });
    expect(vr(e)).toMatchObject({ etapa: "calificar", fuente: "app" });
    expect(e.carta?.tipo).toBe("reto");
  });
  it("El impostor: a quien no dice su palabra a tiempo se le salta", () => {
    let e = conTiempo("impostor");
    const orden = vistaPublica(e).impostor!.orden;
    e = juega(e, { tipo: "tiempo" });
    expect(e.pistas?.[orden[0]!]).toBe("…");
    expect(e.turnoDe).toBe(orden[1]);
  });
  it("en pausa el tiempo no cuenta", () => {
    const e = juega(conTiempo("verdad-reto"), { tipo: "pausar" });
    expect(juega(e, { tipo: "tiempo" })).toBe(e);
  });
});
