// Reglas revisadas con Elías (27 nov): ¿Qué prefieres? con la minoría que bebe, Yo nunca sin puntos ni podio,
// Mímica y Descríbelo con quién adivinó, ¿Cuánto conoces a tu pareja? con «¿Coinciden?», Reto del lugar con empate
// y «Nadie», y promedio por equipo en los juegos donde todos contestan.
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida, parejasPorDecidir, puntosPorEquipo, resultados, type Accion, type AccionSinId, type EstadoPartida } from "./partida";
import { relojLogico } from "./nucleo";
import { vistaPublica } from "./vistas";
import type { Configuracion, Jugador } from "./types";

const NOMBRES = ["Elías", "Ana", "Luis", "Caro", "Memo", "Sofi"];
const gente = (n: number, conPareja = false): Jugador[] =>
  NOMBRES.slice(0, n).map((nombre, i) => ({ id: `j${i}`, nombre, ...(conPareja ? { parejaDe: `j${i ^ 1}` } : {}) }));
const cfg = (n: number, extra: Partial<Configuracion> = {}, conPareja = false): Configuracion => ({
  jugadores: gente(n, conPareja), lugar: "interior", escenario: undefined, intensidad: 2, dificultad: 1, adulto: false, drunk: false, ...extra,
});
const juego = (id: string) => JUEGOS.find(j => j.id === id)!;
let n = 0;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, { ...a, id: `r${++n}` } as Accion, CONTENIDO);
const contesta = (e: EstadoPartida, j: string, valor: unknown) => juega(e, { tipo: "contestar", jugador: j, valor });

describe("¿Qué prefieres?: la minoría bebe algo", () => {
  it("apagado: no hay lista de quién bebe", () => {
    let e = crearPartida(juego("que-prefieres"), cfg(3), 1, CONTENIDO, 1);
    e = contesta(contesta(contesta(e, "j0", "a"), "j1", "a"), "j2", "b");
    e = juega(e, { tipo: "revelar" });
    expect((e.revelado as { beben?: string[] }).beben).toBeUndefined();
    expect(e.puntos).toEqual({ j0: 1, j1: 1, j2: 0 });
  });
  it("encendido: la minoría bebe y no cambia los puntos; con empate nadie bebe", () => {
    let e = crearPartida(juego("que-prefieres"), cfg(3, { minoriaBebe: true }), 1, CONTENIDO, 2);
    e = contesta(contesta(contesta(e, "j0", "a"), "j1", "a"), "j2", "b");
    e = juega(e, { tipo: "revelar" });
    expect((e.revelado as { beben?: string[] }).beben).toEqual(["j2"]);
    expect(e.puntos).toEqual({ j0: 1, j1: 1, j2: 0 });
    let f = crearPartida(juego("que-prefieres"), cfg(4, { minoriaBebe: true }), 1, CONTENIDO, 1);
    f = contesta(contesta(contesta(contesta(f, "j0", "a"), "j1", "a"), "j2", "b"), "j3", "b");
    f = juega(f, { tipo: "revelar" });
    expect((f.revelado as { beben?: string[] }).beben).toBeUndefined();
  });
});

describe("Yo nunca: sin puntos ni podio", () => {
  it("confesar no da puntos y nadie recibe el extra de 1.º a 3.º", () => {
    let e = crearPartida(juego("yo-nunca"), cfg(4), 1, CONTENIDO, 1);
    for (const j of ["j0", "j1", "j2", "j3"]) e = contesta(e, j, j === "j0" ? "si" : "no");
    e = juega(e, { tipo: "revelar" });
    expect((e.revelado as { confesaron: string[] }).confesaron).toEqual(["j0"]);
    expect(Object.values(e.puntos).every(p => p === 0)).toBe(true);
    e = juega(e, { tipo: "siguiente" });
    const rs = resultados(e);
    expect(rs.every(r => r.lugar === 4)).toBe(true);
    // Solo la XP de terminar y de rondas: 20 + 2 × 1.
    expect(rs.every(r => r.xp === 22)).toBe(true);
  });
});

describe("Mímica y Descríbelo: quién adivinó", () => {
  it("+1 a quien actúa y +1 a quien adivinó, por palabra; las tachadas no cuentan", () => {
    let e = crearPartida(juego("prohibida"), cfg(3), 1, CONTENIDO, 1);
    const actor = e.turnoDe!;
    const otros = ["j0", "j1", "j2"].filter(j => j !== actor);
    e = contesta(e, actor, { adivinos: [otros[0], otros[0], otros[1]], tachadas: 1 });
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos[actor]).toBe(3);
    expect(e.puntos[otros[0]!]).toBe(2);
    expect(e.puntos[otros[1]!]).toBe(1);
    expect((e.revelado as { tachadas: number }).tachadas).toBe(1);
  });
  it("no acepta que el actor se marque a sí mismo ni más marcas que palabras", () => {
    const e = crearPartida(juego("mimica"), cfg(3), 1, CONTENIDO, 1);
    const actor = e.turnoDe!, otro = ["j0", "j1", "j2"].find(j => j !== actor)!;
    expect(contesta(e, actor, { adivinos: [actor] })).toBe(e);
    expect(contesta(e, actor, { adivinos: Array(9).fill(otro) })).toBe(e);
    expect(contesta(e, actor, { adivinos: ["nadie"] })).toBe(e);
    // El número de antes sigue valiendo (partidas guardadas).
    expect(contesta(e, actor, 2)).not.toBe(e);
  });
});

describe("¿Cuánto conoces a tu pareja?: ¿Coinciden?", () => {
  const escribir = (e: EstadoPartida, t: Record<string, string>) => Object.entries(t).reduce((x, [j, v]) => contesta(x, j, v), e);
  it("después de escribir, cada pareja marca si coinciden; con los dos en Sí suman +2", () => {
    let e = crearPartida(juego("conoces"), cfg(4, {}, true), 1, CONTENIDO, 1);
    e = escribir(e, { j0: "La playa", j1: "playa", j2: "Sushi", j3: "Tacos" });
    expect(e.fase).toBe("contestando");
    expect(vistaPublica(e).pareja?.etapa).toBe("calificar");
    expect((e.seleccion?.textos as Record<string, string>).j0).toBe("La playa");
    e = escribir(e, { j0: "si", j1: "si", j2: "no", j3: "no" });
    expect(relojLogico(e).listos).toBe(true);
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos).toEqual({ j0: 2, j1: 2, j2: 0, j3: 0 });
  });
  it("si no se ponen de acuerdo, decide el anfitrión y hasta entonces no se revela", () => {
    let e: EstadoPartida = { ...crearPartida(juego("conoces"), cfg(4, {}, true), 1, CONTENIDO, 1), control: "j0" };
    e = escribir(e, { j0: "A", j1: "B", j2: "C", j3: "D" });
    e = escribir(e, { j0: "si", j1: "no", j2: "no", j3: "no" });
    expect(parejasPorDecidir(e)).toEqual(["j0"]);
    expect(relojLogico(e).listos).toBe(false);
    expect(juega(e, { tipo: "revelar" }).fase).toBe("contestando");
    // Solo el anfitrión decide.
    expect(contesta(e, "j2", { decide: "j0", coinciden: true })).toBe(e);
    e = contesta(e, "j0", { decide: "j0", coinciden: true });
    expect(relojLogico(e).listos).toBe(true);
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos).toEqual({ j0: 2, j1: 2, j2: 0, j3: 0 });
  });
  it("si falta alguien al escribir, «Seguir sin» pasa a calificar solo con las parejas completas", () => {
    let e = crearPartida(juego("conoces"), cfg(4, {}, true), 1, CONTENIDO, 1);
    e = escribir(e, { j0: "A", j1: "A", j2: "C" });
    e = juega(e, { tipo: "seguir-sin" });
    expect(vistaPublica(e).pareja?.parejas).toEqual([["j0", "j1"]]);
    e = escribir(e, { j0: "si", j1: "si" });
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos).toEqual({ j0: 2, j1: 2, j2: 0, j3: 0 });
  });
});

describe("Reto del lugar: empate y «Nadie»", () => {
  it("ganador +3, empate +1 a cada uno, nadie 0", () => {
    let e = crearPartida(juego("reto-lugar"), cfg(3), 1, CONTENIDO, 3);
    e = juega(contesta(e, "j0", "j1"), { tipo: "revelar" });
    expect(e.puntos).toEqual({ j0: 0, j1: 3, j2: 0 });
    e = juega(e, { tipo: "siguiente" });
    e = juega(contesta(e, "j0", ["j0", "j2"]), { tipo: "revelar" });
    expect(e.puntos).toEqual({ j0: 1, j1: 3, j2: 1 });
    e = juega(e, { tipo: "siguiente" });
    e = juega(contesta(e, "j0", "nadie"), { tipo: "revelar" });
    expect(e.puntos).toEqual({ j0: 1, j1: 3, j2: 1 });
  });
  it("un empate necesita al menos 2 personas distintas", () => {
    const e = crearPartida(juego("reto-lugar"), cfg(3), 1, CONTENIDO, 1);
    expect(contesta(e, "j0", ["j1"])).toBe(e);
    expect(contesta(e, "j0", ["j1", "j1"])).toBe(e);
  });
});

describe("Equipos de distinto tamaño: promedio donde todos contestan", () => {
  const equipos = (motorJuego: string) => {
    const c = cfg(6, { modalidad: "equipos", equipos: [{ id: "a", nombre: "A" }, { id: "b", nombre: "B" }] } as Partial<Configuracion>);
    c.jugadores = c.jugadores.map((j, i) => ({ ...j, equipo: i < 4 ? "a" : "b" }));
    const e = crearPartida(juego(motorJuego), c, 1, CONTENIDO, 1);
    return { ...e, puntos: { j0: 1, j1: 1, j2: 1, j3: 1, j4: 2, j5: 2 } };
  };
  it("¿Quién es más probable?: gana el equipo chico con mejor promedio", () => {
    const g = puntosPorEquipo(equipos("mas-probable"));
    expect(g.map(x => [x.equipo, x.puntos])).toEqual([["b", 2], ["a", 1]]);
  });
  it("en un juego por turnos se sigue sumando", () => {
    const g = puntosPorEquipo(equipos("reto-lugar"));
    expect(g.map(x => [x.equipo, x.puntos])).toEqual([["a", 4], ["b", 4]]);
  });
});
