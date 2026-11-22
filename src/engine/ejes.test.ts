// Temperatura + Voltaje en el motor (Maestro v1.52): filtro por eje y nivel, Drunk aparte, sin repetir cartas
// y partidas sin ejes iguales que antes.
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { EJE_DE_MAZO, JUEGOS } from "../content/catalogo";
import { cartasPermitidas } from "./filtros";
import { armarArranque, ejesDe, intensidadVieja } from "./nucleo";
import { aplicar, crearPartida, type Accion, type AccionSinId, type EstadoPartida } from "./partida";
import { vistaJugador, vistaPublica } from "./vistas";
import type { Configuracion, EjesPartida } from "./types";

const miembros = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
const cfgEjes = (ejes: EjesPartida, extra: Partial<Configuracion> = {}): Configuracion => ({
  jugadores: miembros(4).map((m, i) => ({ ...m, parejaDe: `j${i ^ 1}` })), lugar: "interior", intensidad: 4, dificultad: 2,
  adulto: false, drunk: false, ejes, ...extra,
});
let k = 0;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, { ...a, id: `x${++k}` } as Accion, CONTENIDO);

describe("Temperatura + Voltaje · arranque", () => {
  it("con ejes guarda los dos niveles, Drunk aparte y lo adulto solo con nivel 3", () => {
    const a = armarArranque(miembros(4), "verdad-reto", 8, 2, 1, { ejes: { temperatura: 2, voltaje: 1, drunk: true } })!;
    expect(a.cfg.ejes).toEqual({ temperatura: 2, voltaje: 1 });
    expect(a.cfg.drunk).toBe(true);
    expect(a.cfg.adulto).toBe(false);
    const b = armarArranque(miembros(4), "verdad-reto", 8, 2, 1, { ejes: { temperatura: 1, voltaje: 3, drunk: false } })!;
    expect(b.cfg.adulto).toBe(true);
    expect(b.cfg.drunk).toBe(false);
  });

  it("sin ejes, la configuración queda exactamente como antes", () => {
    const a = armarArranque(miembros(4), "verdad-reto", 8, 3, 1, {})!;
    expect(a.cfg.ejes).toBeUndefined();
    expect(a.cfg).toMatchObject({ intensidad: 3, adulto: true, drunk: true });
  });

  it("valores raros del navegador se vuelven nivel 1 y Drunk apagado", () => {
    expect(ejesDe({ ejes: { temperatura: 7, voltaje: "3", drunk: "si" } as never })).toEqual({ temperatura: 1, voltaje: 1, drunk: false });
    expect(intensidadVieja({ temperatura: 1, voltaje: 1 })).toBe(1);
    expect(intensidadVieja({ temperatura: 2, voltaje: 1 })).toBe(3);
    expect(intensidadVieja({ temperatura: 1, voltaje: 3 })).toBe(4);
  });
});

describe("Temperatura + Voltaje · filtro", () => {
  const mazos = ["verdad", "reto", "yo-nunca", "castigo", "palabra"];

  it("cada nivel saca solo cartas de ese nivel: preguntas por Temperatura, retos por Voltaje", () => {
    const pool = cartasPermitidas(cfgEjes({ temperatura: 2, voltaje: 1 }), CONTENIDO.cartas, mazos);
    for (const c of pool) {
      const eje = EJE_DE_MAZO[c.mazo];
      if (eje === "temperatura") expect(c.nivel, c.id).toBe(2);
      if (eje === "voltaje") expect(c.nivel, c.id).toBe(1);
    }
    expect(pool.some(c => c.mazo === "verdad" && c.nivel === 2)).toBe(true);
    const extremo = cartasPermitidas(cfgEjes({ temperatura: 3, voltaje: 3 }), CONTENIDO.cartas, ["verdad", "reto"]);
    expect(extremo.length).toBeGreaterThan(0);
    expect(extremo.every(c => c.nivel === 3)).toBe(true);
    expect(pool.some(c => c.mazo === "palabra")).toBe(true);
  });

  it("incluye las cartas nuevas y respeta Drunk", () => {
    const sin = cartasPermitidas(cfgEjes({ temperatura: 3, voltaje: 3 }), CONTENIDO.cartas, mazos);
    expect(sin.some(c => c.soloEjes)).toBe(true);
    expect(sin.some(c => c.drunk)).toBe(false);
    const con = cartasPermitidas(cfgEjes({ temperatura: 3, voltaje: 3 }, { drunk: true }), CONTENIDO.cartas, mazos);
    expect(con.some(c => c.drunk)).toBe(true);
  });

  it("las cartas de pareja necesitan parejas en la sala y el lugar limita el esfuerzo", () => {
    const solos = cfgEjes({ temperatura: 3, voltaje: 3 }, { jugadores: miembros(3) });
    expect(cartasPermitidas(solos, CONTENIDO.cartas, mazos).some(c => c.pidePareja)).toBe(false);
    const alberca = cfgEjes({ temperatura: 3, voltaje: 3 }, { lugar: "alberca", escenario: "alverca" });
    expect(cartasPermitidas(alberca, CONTENIDO.cartas, mazos).some(c => c.esfuerzo === "alto")).toBe(false);
  });
});

describe("Temperatura + Voltaje · partida", () => {
  it("Yo nunca de 12 rondas en Frío no repite cartas", () => {
    const a = armarArranque(miembros(4), "yo-nunca", 12, 2, 4242, { ejes: { temperatura: 1, voltaje: 1, drunk: false } })!;
    let e = crearPartida(JUEGOS.find(j => j.id === a.juego)!, a.cfg, a.semilla, CONTENIDO, a.rondas);
    const vistas: string[] = [];
    while (e.fase !== "terminada") {
      vistas.push(e.carta!.id);
      for (const j of e.cfg.jugadores) e = juega(e, { tipo: "contestar", jugador: j.id, valor: "no" });
      e = juega(e, { tipo: "revelar" });
      e = juega(e, { tipo: "siguiente" });
    }
    expect(vistas).toHaveLength(12);
    expect(new Set(vistas).size).toBe(12);
    for (const id of vistas) expect(CONTENIDO.cartas.find(c => c.id === id)!.nivel).toBe(1);
    expect(e.usadas).toEqual(vistas);
  });

  it("si se acaban las cartas, vuelve a usar el mazo en vez de quedarse sin carta", () => {
    const a = armarArranque(miembros(4), "yo-nunca", 20, 2, 9, { ejes: { temperatura: 1, voltaje: 1, drunk: false } })!;
    const pool = cartasPermitidas(a.cfg, CONTENIDO.cartas, ["yo-nunca"]);
    let e = crearPartida(JUEGOS.find(j => j.id === a.juego)!, a.cfg, a.semilla, CONTENIDO, a.rondas);
    e = { ...e, usadas: pool.map(c => c.id) };
    e = juega(juega(e, { tipo: "saltar" }), { tipo: "siguiente" });
    expect(e.carta?.id).toBeDefined();
  });

  it("las cartas usadas no salen en ninguna vista", () => {
    const a = armarArranque(miembros(4), "yo-nunca", 5, 2, 7, { ejes: { temperatura: 2, voltaje: 1, drunk: false } })!;
    const e = crearPartida(JUEGOS.find(j => j.id === a.juego)!, a.cfg, a.semilla, CONTENIDO, a.rondas);
    expect(e.usadas).toHaveLength(1);
    expect(JSON.stringify(vistaPublica(e))).not.toContain("usadas");
    expect(JSON.stringify(vistaJugador(e, "j0"))).not.toContain("usadas");
  });

  it("una partida sin ejes no anota cartas usadas (igual que antes)", () => {
    const a = armarArranque(miembros(4), "yo-nunca", 5, 2, 7, {})!;
    const e = crearPartida(JUEGOS.find(j => j.id === a.juego)!, a.cfg, a.semilla, CONTENIDO, a.rondas);
    expect(e.usadas).toBeUndefined();
  });
});
