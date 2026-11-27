// P-03: «Seguir sin él». La ronda se revela con lo que hay; quien no contestó no puntúa y juega la siguiente.
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida, type Accion, type AccionSinId, type EstadoPartida } from "./partida";
import { vistaPublica } from "./vistas";
import { aAccion, paraPublicar, ESPERA_MS } from "../roles/pantalla/motor";
import type { Configuracion } from "./types";

const cfg = (n: number): Configuracion => ({
  jugadores: ["Ana", "Luis", "Caro", "Memo"].slice(0, n).map((nombre, i) => ({ id: `j${i}`, nombre, parejaDe: `j${i % 2 === 0 ? i + 1 : i - 1}` })),
  lugar: "interior", escenario: undefined, intensidad: 2, dificultad: 1, adulto: false, drunk: false,
});
let n = 0;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, { ...a, id: `p${++n}` } as Accion, CONTENIDO);
const juego = (id: string) => JUEGOS.find(j => j.id === id)!;

describe("P-03 · seguir sin el ausente", () => {
  it("(a) revela con las respuestas que hay y el ausente no puntúa", () => {
    let e = crearPartida(juego("mas-probable"), cfg(3), 5, CONTENIDO, 3);
    e = juega(e, { tipo: "contestar", jugador: "j0", valor: "j1" });
    e = juega(e, { tipo: "contestar", jugador: "j1", valor: "j1" });
    // «revelar» normal sigue exigiendo a todos
    expect(juega(e, { tipo: "revelar" }).fase).toBe("contestando");
    e = juega(e, { tipo: "seguir-sin" });
    expect(e.fase).toBe("revelada");
    expect(e.ausentes).toEqual(["j2"]);
    expect(e.puntos).toEqual({ j0: 1, j1: 1, j2: 0 });
    expect(vistaPublica(e).ausentes).toEqual(["j2"]);
  });

  it("el ausente no puntúa ni siendo el impostor (El impostor)", () => {
    let e = crearPartida(juego("impostor"), cfg(4), 11, CONTENIDO, 3);
    const impostor = e.cfg.jugadores.find(j => (e.privado[j.id] as { rol: string }).rol === "impostor")!.id;
    const civiles = e.cfg.jugadores.map(j => j.id).filter(j => j !== impostor);
    // todos los civiles votan a un civil; el impostor no vota
    for (const j of civiles) e = juega(e, { tipo: "contestar", jugador: j, valor: civiles.find(x => x !== j)! });
    e = juega(e, { tipo: "seguir-sin" });
    expect(e.fase).toBe("revelada");
    expect(e.puntos[impostor]).toBe(0);
  });

  it("(b) el ausente no se expulsa: en la siguiente ronda contesta y puntúa con normalidad", () => {
    let e = crearPartida(juego("mas-probable"), cfg(3), 5, CONTENIDO, 3);
    e = juega(e, { tipo: "contestar", jugador: "j0", valor: "j1" });
    e = juega(e, { tipo: "contestar", jugador: "j1", valor: "j1" });
    e = juega(e, { tipo: "seguir-sin" });
    e = juega(e, { tipo: "siguiente" });
    expect(e.ronda).toBe(2);
    expect(e.ausentes).toBeUndefined();
    expect(vistaPublica(e).esperados).toContain("j2");
    for (const j of ["j0", "j1", "j2"]) e = juega(e, { tipo: "contestar", jugador: j, valor: "j2" });
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos.j2).toBe(1);
  });

  it("(b2) si el ausente contesta antes de la revelación, su respuesta cuenta", () => {
    let e = crearPartida(juego("mas-probable"), cfg(3), 5, CONTENIDO, 3);
    e = juega(e, { tipo: "contestar", jugador: "j0", valor: "j1" });
    e = juega(e, { tipo: "esperar" });
    expect(e.fase).toBe("contestando");
    e = juega(e, { tipo: "contestar", jugador: "j2", valor: "j1" });
    e = juega(e, { tipo: "contestar", jugador: "j1", valor: "j1" });
    e = juega(e, { tipo: "revelar" });
    expect(e.ausentes).toBeUndefined();
    expect(e.puntos).toEqual({ j0: 1, j1: 1, j2: 1 });
  });

  it("(c) sin ninguna respuesta, o sin faltantes, o fuera de ronda abierta, «seguir sin él» no hace nada", () => {
    let e = crearPartida(juego("mas-probable"), cfg(3), 5, CONTENIDO, 3);
    expect(juega(e, { tipo: "seguir-sin" }).fase).toBe("contestando");
    for (const j of ["j0", "j1", "j2"]) e = juega(e, { tipo: "contestar", jugador: j, valor: "j0" });
    expect(juega(e, { tipo: "seguir-sin" }).fase).toBe("contestando"); // nadie falta: lo revela «revelar»
    const r = juega(e, { tipo: "revelar" });
    expect(juega(r, { tipo: "seguir-sin" })).toBe(r);
    // juego de un solo jugador en turno: sin respuesta no se puede, se usa «saltar»
    const t = crearPartida(juego("verdad-reto"), cfg(3), 5, CONTENIDO, 3);
    expect(juega(t, { tipo: "seguir-sin" }).fase).toBe("contestando");
  });

  it("no rompe ¿Qué prefieres? de 2 ni ¿Cuánto conoces? con una respuesta menos", () => {
    let q = crearPartida(juego("que-prefieres"), cfg(2), 7, CONTENIDO, 3);
    q = juega(q, { tipo: "contestar", jugador: "j0", valor: { eleccion: "a", prediccion: "a" } });
    q = juega(q, { tipo: "seguir-sin" });
    expect(q.fase).toBe("revelada");
    expect(q.puntos).toEqual({ j0: 0, j1: 0 });
    let c = crearPartida(juego("conoces"), cfg(4), 7, CONTENIDO, 3);
    for (const j of ["j0", "j1", "j2"]) c = juega(c, { tipo: "contestar", jugador: j, valor: "Tacos" });
    c = juega(c, { tipo: "seguir-sin" });
    // Pasa a marcar «¿Coinciden?» solo la pareja completa.
    for (const j of ["j0", "j1"]) c = juega(c, { tipo: "contestar", jugador: j, valor: "si" });
    c = juega(c, { tipo: "revelar" });
    expect(c.fase).toBe("revelada");
    expect(c.puntos.j3).toBe(0);
  });

  it("el motor traduce las acciones de control y publica la espera", () => {
    const f = (que: string) => ({ id: "x1", tipo: "control", jugador: "host", datos: { que } }) as never;
    expect(aAccion(f("seguir-sin"), ["host"])).toEqual({ id: "x1", tipo: "seguir-sin" });
    expect(aAccion(f("esperar"), ["host"])).toEqual({ id: "x1", tipo: "esperar" });
    expect(aAccion(f("seguir-sin"), ["otro"])).toBeNull(); // solo quien tiene el control
    const e = crearPartida(juego("mas-probable"), cfg(3), 5, CONTENIDO, 3);
    expect(ESPERA_MS).toBe(20000);
    expect(paraPublicar(e, null, 12345).publico.espera).toEqual({ fin: 12345 });
    expect(paraPublicar(e, null).publico.espera).toBeNull();
  });
});
