import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { ESCENARIOS, JUEGOS } from "../content/catalogo";
import { crearAzar } from "./azar";
import { cartasPermitidas, juegosCompatibles, sorprendeme } from "./filtros";
import { aplicar, crearPartida, resultados, type Accion, type AccionSinId, type EstadoPartida } from "./partida";
import { vistaJugador, vistaPublica } from "./vistas";
import { nivelPorXp, puedeComprarCarta, saldos, xpDePartida, xpExtraValida, xpParaNivel, type Movimiento } from "./economia";
import type { Configuracion, Jugador } from "./types";

const NOMBRES = ["Elías", "Ana", "Luis", "Caro", "Memo", "Sofi", "Rafa", "Lupe"];
/** n jugadores, emparejados de dos en dos (0-1, 2-3…). */
function grupo(n: number): Jugador[] {
  return NOMBRES.slice(0, n).map((nombre, i) => ({ id: `j${i}`, nombre, parejaDe: `j${i % 2 === 0 ? i + 1 : i - 1}` }))
    .map(j => (Number(j.parejaDe!.slice(1)) < n ? j : { ...j, parejaDe: undefined }));
}
const cfg = (n: number, extra: Partial<Configuracion> = {}): Configuracion => ({
  jugadores: grupo(n), lugar: "interior", escenario: undefined, intensidad: 2, dificultad: 1, adulto: false, drunk: false, ...extra,
});
const juego = (id: string) => JUEGOS.find(j => j.id === id)!;

let contador = 0;
const accion = (a: AccionSinId): Accion => ({ ...a, id: `a${++contador}` }) as Accion;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, accion(a), CONTENIDO);

/** Contesta por todos con una función y avanza hasta terminar. */
function jugarCompleta(e: EstadoPartida, respuesta: (e: EstadoPartida, j: string) => unknown): EstadoPartida {
  while (e.fase !== "terminada") {
    for (const j of e.cfg.jugadores.map(x => x.id)) e = juega(e, { tipo: "contestar", jugador: j, valor: respuesta(e, j) });
    e = juega(e, { tipo: "revelar" });
    e = juega(e, { tipo: "siguiente" });
  }
  return e;
}

describe("A · 2 jugadores", () => {
  it("solo ofrece juegos que sirven con 2", () => {
    const ids = juegosCompatibles(cfg(2)).map(j => j.id);
    for (const fuera of ["impostor", "reloj", "yo-nunca", "mas-probable"]) expect(ids).not.toContain(fuera);
    for (const dentro of ["verdad-reto", "conoces", "que-prefieres"]) expect(ids).toContain(dentro);
  });
  it("juega completas verdad o reto, ¿qué prefieres? y ¿cuánto conoces?", () => {
    const v = jugarCompleta(crearPartida(juego("verdad-reto"), cfg(2), 7, CONTENIDO), () => "cumplio");
    expect(v.fase).toBe("terminada");
    expect(resultados(v).every(r => r.xp > 0)).toBe(true);

    const q = jugarCompleta(crearPartida(juego("que-prefieres"), cfg(2), 7, CONTENIDO), () => ({ eleccion: "a", prediccion: "a" }));
    expect(q.puntos).toEqual({ j0: 8, j1: 8 });

    const c = jugarCompleta(crearPartida(juego("conoces"), cfg(2), 7, CONTENIDO), () => "Tacos");
    expect(c.puntos).toEqual({ j0: 16, j1: 16 });
  });
});

describe("B · 4 jugadores en 2 parejas", () => {
  it("cada pareja suma solo si coinciden sus respuestas", () => {
    let e = crearPartida(juego("conoces"), cfg(4), 3, CONTENIDO, 1);
    const resp: Record<string, string> = { j0: "Pizza", j1: "pizza ", j2: "Sushi", j3: "Tacos" };
    for (const j of Object.keys(resp)) e = juega(e, { tipo: "contestar", jugador: j, valor: resp[j] });
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos).toEqual({ j0: 2, j1: 2, j2: 0, j3: 0 });
  });
});

describe("C · 8 jugadores", () => {
  it("cuenta los 8 votos del impostor y descubre al impostor", () => {
    let e = crearPartida(juego("impostor"), cfg(8), 11, CONTENIDO, 1);
    const impostor = Object.entries(e.privado).find(([, v]) => (v as { rol: string }).rol === "impostor")![0];
    for (const j of e.cfg.jugadores.map(x => x.id)) {
      const voto = j === impostor ? e.cfg.jugadores.find(x => x.id !== j)!.id : impostor;
      e = juega(e, { tipo: "contestar", jugador: j, valor: voto });
    }
    expect(vistaPublica(e).contestaron).toHaveLength(8);
    e = juega(e, { tipo: "revelar" });
    expect((e.revelado as { atrapado: boolean }).atrapado).toBe(true);
    expect(e.puntos[impostor]).toBe(0);
  });
});

describe("D · información privada", () => {
  it("la vista pública no lleva la palabra, el rol ni las respuestas antes de revelar", () => {
    let e = crearPartida(juego("impostor"), cfg(6), 5, CONTENIDO, 1);
    const civil = Object.entries(e.privado).find(([, v]) => (v as { rol: string }).rol === "civil")!;
    const palabra = (civil[1] as { palabra: string }).palabra;
    e = juega(e, { tipo: "contestar", jugador: "j0", valor: "j1" });
    const publica = JSON.stringify(vistaPublica(e));
    expect(publica).not.toContain(palabra);
    expect(publica).not.toContain('"rol"');
    expect(publica).not.toContain('"j1"}'); // el voto de j0 no aparece
    expect(vistaPublica(e).contestaron).toEqual(["j0"]);
  });
  it("cada celular ve solo lo suyo; el impostor no recibe la palabra", () => {
    const e = crearPartida(juego("impostor"), cfg(4), 9, CONTENIDO, 1);
    for (const j of e.cfg.jugadores) {
      const mio = vistaJugador(e, j.id).mio as { rol: string; palabra?: string };
      if (mio.rol === "impostor") expect(mio.palabra).toBeUndefined();
      else expect(typeof mio.palabra).toBe("string");
      // Nadie recibe el dato privado de otro jugador.
      expect(JSON.stringify(vistaJugador(e, j.id)).match(/"rol"/g)).toHaveLength(1);
    }
  });
  it("las respuestas secretas de pareja no salen hasta revelar", () => {
    let e = crearPartida(juego("conoces"), cfg(2), 1, CONTENIDO, 1);
    e = juega(e, { tipo: "contestar", jugador: "j0", valor: "Respuesta secreta" });
    expect(JSON.stringify(vistaPublica(e))).not.toContain("Respuesta secreta");
    expect(JSON.stringify(vistaJugador(e, "j1"))).not.toContain("Respuesta secreta");
  });
});

describe("E · progresión y economía", () => {
  it("niveles: 220 XP = nivel 3, 900 = 7, 1,620 = 10", () => {
    expect(xpParaNivel(3)).toBe(220);
    expect(nivelPorXp(900)).toBe(7);
    expect(nivelPorXp(1619)).toBe(9);
    expect(nivelPorXp(1620)).toBe(10);
  });
  it("partida típica de 8 rondas da 52 XP; menos de 5 rondas no cuenta", () => {
    expect(xpDePartida({ rondas: 8, retosCumplidos: 3, lugar: 2 }, 4) + 0).toBe(20 + 16 + 9 + 10);
    expect(xpDePartida({ rondas: 4, retosCumplidos: 3, lugar: 1 }, 4)).toBe(0);
    expect(xpDePartida({ rondas: 8, retosCumplidos: 0, lugar: 2 }, 2)).toBe(36); // con 2 no hay 2.º lugar
  });
  it("ejemplo de Ana: cartas solo con XP del evento; al cerrar, lo que sobra es para accesorios", () => {
    const movs: Movimiento[] = [
      { tipo: "ganada", xp: 200, eventoId: "anterior" },
      { tipo: "ganada", xp: 930, eventoId: "finde" },
      { tipo: "carta", xp: 40, eventoId: "finde" },
      { tipo: "carta", xp: 60, eventoId: "finde" },
      { tipo: "carta", xp: 80, eventoId: "finde" },
    ];
    expect(saldos(movs, "finde")).toEqual({ acumulada: 1130, disponible: 950, delEvento: 750 });
    expect(saldos(movs, null)).toEqual({ acumulada: 1130, disponible: 950, delEvento: 0 });
    expect(puedeComprarCarta(saldos(movs, null), 0, 0, false)).toEqual({ ok: false, motivo: "evento-cerrado" });
  });
  it("un accesorio gasta primero la XP vieja", () => {
    const movs: Movimiento[] = [
      { tipo: "ganada", xp: 200, eventoId: "anterior" },
      { tipo: "ganada", xp: 100, eventoId: "finde" },
      { tipo: "accesorio", xp: 160 },
    ];
    expect(saldos(movs, "finde")).toEqual({ acumulada: 300, disponible: 140, delEvento: 100 });
  });
  it("tope de 3 cartas compradas por partida y precio que sube", () => {
    const s = { acumulada: 999, disponible: 999, delEvento: 999 };
    expect(puedeComprarCarta(s, 0, 0, true)).toEqual({ ok: true, precio: 40 });
    expect(puedeComprarCarta(s, 2, 0, true)).toEqual({ ok: true, precio: 80 });
    expect(puedeComprarCarta(s, 3, 0, true)).toEqual({ ok: false, motivo: "tope-partida" });
    expect(puedeComprarCarta(s, 1, 3, true)).toEqual({ ok: false, motivo: "mano-llena" });
  });
});

describe("F · desconexión", () => {
  it("una acción repetida (reenviada por mala señal) cuenta una sola vez", () => {
    let e = crearPartida(juego("verdad-reto"), cfg(3), 2, CONTENIDO, 1);
    const a = accion({ tipo: "contestar", jugador: e.turnoDe!, valor: "cumplio" });
    e = aplicar(e, a, CONTENIDO);
    const dos = aplicar(e, a, CONTENIDO);
    expect(dos).toBe(e);
    e = juega(e, { tipo: "revelar" });
    expect(Object.values(e.puntos).reduce((x, y) => x + y, 0)).toBeLessThanOrEqual(2);
  });
  it("con la misma semilla y acciones se reconstruye la misma partida", () => {
    const a = crearPartida(juego("impostor"), cfg(5), 42, CONTENIDO);
    const b = crearPartida(juego("impostor"), cfg(5), 42, CONTENIDO);
    expect(b).toEqual(a);
  });
});

describe("Seguridad y configurador", () => {
  it("en la alberca no salen retos de esfuerzo alto (pulmón de acero, pelea de gallos)", () => {
    const c = cfg(8, { lugar: "alberca", escenario: "alverca", intensidad: 4, adulto: true });
    const pool = cartasPermitidas(c, CONTENIDO.cartas, ["reto", "competencia", "castigo"]);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.some(x => x.esfuerzo === "alto")).toBe(false);
  });
  it("sin Drunk no sale ninguna carta de tomar; sin adulto, ninguna adulta", () => {
    const pool = cartasPermitidas(cfg(8, { intensidad: 4 }), CONTENIDO.cartas, ["verdad", "reto", "castigo", "yo-nunca"]);
    expect(pool.some(x => x.drunk || x.adulto)).toBe(false);
  });
  it("¡Sorpréndeme! nunca enciende adulto ni Drunk", () => {
    for (let s = 0; s < 50; s++) {
      const r = sorprendeme(cfg(8, { adulto: true, drunk: true, intensidad: 4 }), crearAzar(s))!;
      expect(r.cfg.adulto).toBe(false);
      expect(r.cfg.drunk).toBe(false);
      expect(r.juego.adulto).toBeFalsy();
    }
  });
  it("hay 3 escenarios activos: ALVerca, FBI y GPS", () => {
    expect(ESCENARIOS.filter(e => e.activo).map(e => e.sigla)).toEqual(["ALV", "FBI", "GPS"]);
  });
  it("la fogata tiene el reto del bombón", () => {
    const pool = cartasPermitidas(cfg(4, { lugar: "fogata", escenario: "fogata" }), CONTENIDO.cartas, ["reto-escenario"]);
    expect(pool.some(x => x.texto.includes("bombón"))).toBe(true);
  });
});

describe("Cartas de poder dentro de la partida", () => {
  const turno = (e: EstadoPartida) => e.turnoDe!;
  it("cada 3 retos cumplidos se gana una carta (máximo 3 en la mano)", () => {
    let e = crearPartida(juego("verdad-reto"), cfg(2), 4, CONTENIDO, 40);
    while (e.fase !== "terminada") {
      e = juega(e, { tipo: "contestar", jugador: turno(e), valor: "cumplio" });
      e = juega(e, { tipo: "revelar" });
      e = juega(e, { tipo: "siguiente" });
    }
    for (const j of ["j0", "j1"]) {
      const esperadas = Math.min(3, Math.floor(e.retos[j]! / 3));
      expect(e.manos[j]).toHaveLength(esperadas);
    }
  });
  it("una carta comprada llega con dar-carta y Escudo salta el reto sin castigo", () => {
    let e = crearPartida(juego("verdad-reto"), cfg(3), 8, CONTENIDO, 2);
    const j = turno(e);
    e = juega(e, { tipo: "dar-carta", jugador: j, carta: "escudo" });
    expect(vistaJugador(e, j).miMano).toEqual(["escudo"]);
    expect(vistaPublica(e).cartasEnMano[j]).toBe(1);
    expect(JSON.stringify(vistaPublica(e))).not.toContain("escudo");
    e = juega(e, { tipo: "usar-carta", jugador: j, carta: "escudo" });
    expect(e.respuestas[j]).toBe("paso");
    expect(e.manos[j]).toEqual([]);
    expect(vistaPublica(e).cartaUsada).toEqual({ jugador: j, carta: "escudo", ronda: 1 });
  });
  it("Cambio de pregunta saca otra carta; nadie usa Escudo fuera de su turno", () => {
    let e = crearPartida(juego("verdad-reto"), cfg(3), 8, CONTENIDO, 2);
    const j = turno(e), otro = e.cfg.jugadores.find(x => x.id !== j)!.id;
    e = juega(e, { tipo: "dar-carta", jugador: j, carta: "cambio" });
    e = juega(e, { tipo: "dar-carta", jugador: otro, carta: "escudo" });
    const antes = e.carta?.id;
    e = juega(e, { tipo: "usar-carta", jugador: j, carta: "cambio" });
    expect(e.carta?.id).not.toBe(antes);
    const sinCambio = juega(e, { tipo: "usar-carta", jugador: otro, carta: "escudo" });
    expect(sinCambio.manos[otro]).toEqual(["escudo"]);
  });
  it("no se puede dar una carta inventada ni pasar de 3", () => {
    let e = crearPartida(juego("verdad-reto"), cfg(2), 1, CONTENIDO, 2);
    e = juega(e, { tipo: "dar-carta", jugador: "j0", carta: "robo-de-puntos" });
    expect(e.manos.j0).toEqual([]);
    for (let i = 0; i < 5; i++) e = juega(e, { tipo: "dar-carta", jugador: "j0", carta: "escudo" });
    expect(e.manos.j0).toHaveLength(3);
  });
});

describe("XP extra del administrador", () => {
  it("solo acepta enteros de 1 a 200", () => {
    for (const bien of [1, 25, 200]) expect(xpExtraValida(bien)).toBe(true);
    for (const mal of [0, -5, 201, 2.5, NaN, Infinity, "50", null, undefined]) expect(xpExtraValida(mal)).toBe(false);
  });
  it("cuenta como XP ganada en el evento: sube la acumulada, la disponible y la del evento", () => {
    const movs: Movimiento[] = [{ tipo: "ganada", xp: 100, eventoId: "viejo" }, { tipo: "ganada", xp: 50, eventoId: "hoy" }];
    expect(saldos(movs, "hoy")).toEqual({ acumulada: 150, disponible: 150, delEvento: 50 });
  });
});

describe("XP calculada en el servidor", () => {
  it("resultados trae rondas y retos para que el servidor recalcule la misma XP", () => {
    let e = crearPartida(juego("verdad-reto"), cfg(4), 21, CONTENIDO, 8);
    e = jugarCompleta(e, () => "cumplio");
    for (const r of resultados(e)) {
      expect(r.rondas).toBe(8);
      expect(r.retos).toBeLessThanOrEqual(Math.ceil(r.rondas / 4)); // el mismo límite que pone la base
      // Fórmula de la base (006_xp_calculada_en_servidor.sql): 20 + 2·min(rondas,10) + 3·retos + premio por lugar.
      const premio = r.lugar <= 2 ? [15, 10][r.lugar - 1]! : 0;
      expect(r.xp).toBe(20 + 2 * Math.min(r.rondas, 10) + 3 * r.retos + premio);
    }
  });
});

describe("Mecánicas del paso 3", () => {
  it("los 14 juegos del catálogo ya corren en el motor", () => {
    expect(JUEGOS.filter(j => !j.motor).map(j => j.id)).toEqual([]);
  });
  it("reloj: pregunta y responde son personas distintas y solo responde quien le toca", () => {
    let e = crearPartida(juego("reloj"), cfg(5), 3, CONTENIDO, 1);
    const sel = vistaPublica(e).seleccion as { pregunta: string; responde: string };
    expect(sel.pregunta).not.toBe(sel.responde);
    e = juega(e, { tipo: "contestar", jugador: sel.pregunta, valor: "cumplio" });
    expect(vistaPublica(e).contestaron).toEqual([]);
    e = juega(e, { tipo: "contestar", jugador: sel.responde, valor: "cumplio" });
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos[sel.responde]).toBe(1);
  });
  it("ruleta: el índice que gira coincide con el jugador del castigo", () => {
    const e = crearPartida(juego("ruleta"), cfg(6), 9, CONTENIDO, 1);
    const { indice } = vistaPublica(e).seleccion as { indice: number };
    expect(e.cfg.jugadores[indice]!.id).toBe(e.turnoDe);
    expect(e.carta?.tipo).toBe("castigo");
  });
  it("dados HOT: solo con adulto y entre parejas", () => {
    expect(juegosCompatibles(cfg(4)).map(j => j.id)).not.toContain("dados-hot");
    const c = cfg(4, { adulto: true, intensidad: 4 });
    expect(juegosCompatibles(c).map(j => j.id)).toContain("dados-hot");
    const e = crearPartida(juego("dados-hot"), c, 2, CONTENIDO, 1);
    const s = vistaPublica(e).seleccion as { de: string; a: string };
    expect(e.cfg.jugadores.find(j => j.id === s.de)!.parejaDe).toBe(s.a);
  });
  it("mímica: solo quien describe ve las palabras y no puede contar de más", () => {
    let e = crearPartida(juego("mimica"), cfg(4), 6, CONTENIDO, 1);
    const yo = e.turnoDe!;
    const mias = (vistaJugador(e, yo).mio as { palabras: unknown[] }).palabras;
    expect(mias.length).toBeGreaterThan(0);
    const otro = e.cfg.jugadores.find(j => j.id !== yo)!.id;
    expect(vistaJugador(e, otro).mio).toBeUndefined();
    expect(JSON.stringify(vistaPublica(e))).not.toContain(JSON.stringify(mias[0]));
    e = juega(e, { tipo: "contestar", jugador: yo, valor: mias.length + 5 });
    expect(vistaPublica(e).contestaron).toEqual([]);
    e = juega(e, { tipo: "contestar", jugador: yo, valor: 3 });
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos[yo]).toBe(3);
  });
  it("yo nunca y ¿quién es más probable? cuentan bien", () => {
    let y = crearPartida(juego("yo-nunca"), cfg(3), 1, CONTENIDO, 1);
    for (const [j, v] of [["j0", "si"], ["j1", "no"], ["j2", "si"]]) y = juega(y, { tipo: "contestar", jugador: j!, valor: v });
    y = juega(y, { tipo: "revelar" });
    expect(y.puntos).toEqual({ j0: 1, j1: 0, j2: 1 });
    let m = crearPartida(juego("mas-probable"), cfg(4), 1, CONTENIDO, 1);
    for (const [j, v] of [["j0", "j2"], ["j1", "j2"], ["j2", "j3"], ["j3", "j2"]]) m = juega(m, { tipo: "contestar", jugador: j!, valor: v });
    m = juega(m, { tipo: "revelar" });
    expect((m.revelado as { elegidos: string[] }).elegidos).toEqual(["j2"]);
    expect(m.puntos).toEqual({ j0: 1, j1: 1, j2: 0, j3: 1 });
  });
  it("reto del lugar: el anfitrión marca al ganador (+3)", () => {
    let e = crearPartida(juego("reto-lugar"), cfg(4, { lugar: "alberca", escenario: "alverca" }), 1, CONTENIDO, 1);
    e = juega(e, { tipo: "contestar", jugador: "j0", valor: "j3" });
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos.j3).toBe(3);
  });
});

