// Red de seguridad de la Fase 6 (Maestro §22.1): los 14 juegos completos, la repetición con semilla
// y acciones, y el secreto (la vista pública nunca trae lo privado).
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida, resultados, type Accion, type EstadoPartida } from "./partida";
import { vistaPublica } from "./vistas";
import type { Configuracion, DefinicionJuego, Intensidad } from "./types";

const JUGABLES = JUEGOS.filter(j => j.motor);
// 5: con menos rondas la partida no da XP (economia.ts, minRondasParaContar).
const RONDAS = 5;

/** 4 jugadores en 2 parejas, con la intensidad y el adulto que pide el juego. */
function cfgPara(j: DefinicionJuego): Configuracion {
  const intensidad = Math.min(Math.max(2, j.intensidadMin), j.intensidadMax) as Intensidad;
  return {
    jugadores: [
      { id: "j0", nombre: "Elías", parejaDe: "j1" }, { id: "j1", nombre: "Ana", parejaDe: "j0" },
      { id: "j2", nombre: "Luis", parejaDe: "j3" }, { id: "j3", nombre: "Caro", parejaDe: "j2" },
    ],
    lugar: "interior", intensidad, dificultad: 1, adulto: !!j.adulto, drunk: false,
  };
}

/** Una respuesta válida para cada mecánica. */
function respuesta(e: EstadoPartida, j: string): unknown {
  switch (e.motor) {
    case "turnos-cartas": case "botella": case "ruleta": case "dados": return "cumplio";
    case "votacion": return j === "j3" ? "b" : "a";
    case "rol-secreto": return j === "j0" ? "j1" : "j0";
    case "pareja": return "Tacos";
    case "conteo": return 3;
    case "confesion": return j === "j1" ? "no" : "si";
    case "senalar": return "j2";
    case "competencia": return "j1";
  }
}

/**
 * Juega completa como lo haría la Pantalla: contestan todos, revelar, siguiente, hasta terminar.
 * Devuelve el estado final, las acciones que se mandaron (en orden) y cada estado intermedio.
 */
function jugar(juego: DefinicionJuego, semilla: number) {
  const contenido = CONTENIDO;
  let e = crearPartida(juego, cfgPara(juego), semilla, contenido, RONDAS);
  const inicial = e;
  const acciones: Accion[] = [];
  const estados: EstadoPartida[] = [e];
  let n = 0;
  const manda = (a: Accion) => { acciones.push(a); e = aplicar(e, a, contenido); estados.push(e); };
  let vueltas = 0;
  while (e.fase !== "terminada" && vueltas++ < 50) {
    for (const j of e.cfg.jugadores) manda({ id: `${juego.id}-${++n}`, tipo: "contestar", jugador: j.id, valor: respuesta(e, j.id) });
    manda({ id: `${juego.id}-${++n}`, tipo: "revelar" });
    manda({ id: `${juego.id}-${++n}`, tipo: "siguiente" });
  }
  return { inicial, final: e, acciones, estados };
}

describe("Los 14 juegos completos", () => {
  it("hay 14 juegos que corren en el motor", () => {
    expect(JUGABLES).toHaveLength(14);
  });
  for (const juego of JUGABLES) {
    it(`${juego.nombre}: de crear a terminar, con puntos y XP`, () => {
      const { final, estados } = jugar(juego, 2026);
      expect(final.fase).toBe("terminada");
      expect(final.bitacora.filter(b => b.tipo === "revelada")).toHaveLength(RONDAS);
      // Cada ronda tuvo algo que mostrar en la TV.
      for (const s of estados) if (s.fase === "contestando") expect(s.carta?.texto, `ronda ${s.ronda} sin carta`).toBeTruthy();
      expect(Object.values(final.puntos).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
      const r = resultados(final);
      expect(r).toHaveLength(4);
      expect(r.every(x => x.xp > 0)).toBe(true);
    });
  }
});

describe("Repetición: semilla más acciones guardadas da lo mismo", () => {
  for (const juego of JUGABLES) {
    it(`${juego.nombre}`, () => {
      const { inicial, final, acciones, estados } = jugar(juego, 77);
      // Desde cero, con la misma semilla y las mismas acciones (como la TV al recargar).
      const otraVez = acciones.reduce((e, a) => aplicar(e, a, CONTENIDO), crearPartida(juego, cfgPara(juego), 77, CONTENIDO, RONDAS));
      expect(otraVez).toEqual(final);
      // A media partida también.
      const mitad = Math.floor(acciones.length / 2);
      expect(acciones.slice(0, mitad).reduce((e, a) => aplicar(e, a, CONTENIDO), inicial)).toEqual(estados[mitad]);
      // Las acciones que llegan repetidas (mala señal) no cambian nada.
      const conRepetidas = acciones.flatMap(a => [a, a]).reduce((e, a) => aplicar(e, a, CONTENIDO), inicial);
      expect(conRepetidas).toEqual(final);
    });
  }
  it("otra semilla da otra partida", () => {
    const impostor = JUGABLES.find(j => j.id === "impostor")!;
    const a = Array.from({ length: 6 }, (_, i) => crearPartida(impostor, cfgPara(impostor), 100 + i, CONTENIDO).privado);
    expect(new Set(a.map(x => JSON.stringify(x))).size).toBeGreaterThan(1);
  });
});

/** Textos secretos dentro de lo privado de cada jugador (la palabra, la pregunta, las palabras a describir). */
function textosSecretos(privado: Record<string, unknown>): string[] {
  const out: string[] = [];
  const recorre = (v: unknown, clave = "") => {
    if (typeof v === "string") { if (["palabra", "pregunta", "prohibidas"].includes(clave) && v.length >= 3) out.push(v); return; }
    if (Array.isArray(v)) { for (const x of v) recorre(x, clave); return; }
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) recorre(x, k);
  };
  recorre(privado);
  return out;
}

/** Todas las llaves de un objeto, a cualquier profundidad. */
function llaves(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach(x => llaves(x, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { out.add(k); llaves(x, out); }
  return out;
}

describe("El secreto: la vista pública nunca trae lo privado", () => {
  for (const juego of JUGABLES) {
    it(`${juego.nombre}: en cada momento de la partida`, () => {
      const { estados } = jugar(juego, 739153);
      for (const e of estados) {
        const v = vistaPublica(e);
        const texto = JSON.stringify(v);
        const k = llaves(v);
        for (const prohibida of ["semilla", "privado", "manos", "miMano", "mio", "rol", "papel", "palabras", "accionesVistas", "bitacora", "cfg"]) {
          expect(k.has(prohibida), `${juego.id} ronda ${e.ronda} (${e.fase}) trae «${prohibida}»`).toBe(false);
        }
        expect(texto).not.toContain(String(e.semilla));
        // Las cartas de poder: solo cuántas, nunca cuáles.
        expect(Object.values(v.cartasEnMano).every(n => typeof n === "number")).toBe(true);
        if (e.fase === "contestando") {
          // Antes de revelar: ni respuestas ni resultado, solo quién ya contestó.
          expect(v.revelado).toBeUndefined();
          expect(k.has("respuestas")).toBe(false);
          expect(v.contestaron.every(j => typeof j === "string")).toBe(true);
          for (const s of textosSecretos(e.privado)) expect(texto, `${juego.id} deja ver «${s}»`).not.toContain(s);
        }
      }
    });
  }
  it("en El impostor nadie sabe quién es el impostor antes de revelar", () => {
    const impostor = JUGABLES.find(j => j.id === "impostor")!;
    let e = crearPartida(impostor, cfgPara(impostor), 9, CONTENIDO);
    const civil = Object.values(e.privado).find(p => (p as { rol: string }).rol === "civil") as { palabra: string };
    for (const j of ["j0", "j1", "j2"]) e = aplicar(e, { id: `x${j}`, tipo: "contestar", jugador: j, valor: j === "j0" ? "j1" : "j0" }, CONTENIDO);
    const texto = JSON.stringify(vistaPublica(e));
    expect(texto).not.toContain(civil.palabra);
    expect(vistaPublica(e).contestaron).toEqual(["j0", "j1", "j2"]);
  });
});
