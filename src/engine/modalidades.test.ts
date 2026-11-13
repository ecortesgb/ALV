import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida, puntosPorEquipo, type Accion, type AccionSinId, type EstadoPartida } from "./partida";
import { vistaPublica } from "./vistas";
import type { Configuracion } from "./types";

const verdadReto = JUEGOS.find(j => j.id === "verdad-reto")!;
const base = (extra: Partial<Configuracion> = {}): Configuracion => ({
  jugadores: [
    { id: "a", nombre: "Ana", equipo: "rojo" }, { id: "b", nombre: "Beto", equipo: "azul" },
    { id: "c", nombre: "Caro", equipo: "rojo" }, { id: "d", nombre: "Dani", equipo: "azul" },
  ],
  lugar: "interior", intensidad: 2, dificultad: 1, adulto: false, drunk: false, ...extra,
});
let n = 0;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, { ...a, id: `m${++n}` } as Accion, CONTENIDO);

describe("turno en Verdad o reto", () => {
  it("en orden: cada ronda le toca al siguiente y no hay ruleta", () => {
    let e = crearPartida(verdadReto, base(), 7, CONTENIDO, 4);
    const turnos: string[] = [];
    for (let r = 0; r < 4; r++) {
      turnos.push(e.turnoDe!);
      expect(vistaPublica(e).seleccion).toBeUndefined();
      e = juega(e, { tipo: "contestar", jugador: e.turnoDe!, valor: "paso" });
      e = juega(e, { tipo: "revelar" });
      if (e.fase !== "terminada") e = juega(e, { tipo: "siguiente" });
    }
    expect(turnos).toEqual(["a", "b", "c", "d"]);
  });

  it("con ruleta: la pantalla recibe el índice y coincide con quien juega", () => {
    let e = crearPartida(verdadReto, base({ turno: "ruleta" }), 11, CONTENIDO, 6);
    for (let r = 0; r < 6 && e.fase !== "terminada"; r++) {
      const { indice } = vistaPublica(e).seleccion as { indice: number };
      expect(e.cfg.jugadores[indice]!.id).toBe(e.turnoDe);
      e = juega(e, { tipo: "contestar", jugador: e.turnoDe!, valor: "cumplio" });
      e = juega(e, { tipo: "revelar" });
      if (e.fase !== "terminada") e = juega(e, { tipo: "siguiente" });
    }
  });
});

describe("puntosPorEquipo", () => {
  it("suma a los integrantes y ordena de mayor a menor", () => {
    const e = { ...crearPartida(verdadReto, base(), 1, CONTENIDO), puntos: { a: 3, b: 1, c: 2, d: 0 } };
    expect(puntosPorEquipo(e)).toEqual([
      { equipo: "rojo", puntos: 5, jugadores: ["a", "c"] },
      { equipo: "azul", puntos: 1, jugadores: ["b", "d"] },
    ]);
  });
  it("sin equipos devuelve vacío", () => {
    const sin = base({ jugadores: [{ id: "a", nombre: "Ana" }, { id: "b", nombre: "Beto" }] });
    expect(puntosPorEquipo(crearPartida(verdadReto, sin, 1, CONTENIDO))).toEqual([]);
  });
});
