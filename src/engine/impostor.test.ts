// El impostor con eliminación (Maestro v1.44) y los tipos de partida.
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida, resultados, type Accion, type AccionSinId, type EstadoPartida } from "./partida";
import { armarArranque, armarGrupos } from "./nucleo";
import { vistaPublica } from "./vistas";

const impostorDef = JUEGOS.find(j => j.id === "impostor")!;
const gente = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
let k = 0;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, { ...a, id: `i${++k}` } as Accion, CONTENIDO);

function partida(n: number, semilla: number, op: Parameters<typeof armarArranque>[5] = {}) {
  const a = armarArranque(gente(n), "impostor", 8, 2, semilla, op)!;
  return crearPartida(impostorDef, a.cfg, a.semilla, CONTENIDO, a.rondas);
}
const impostores = (e: EstadoPartida) => Object.entries(e.privado).filter(([, p]) => (p as { rol: string }).rol === "impostor").map(([j]) => j);
/** Todos los que siguen dicen su palabra en el orden de la vuelta. */
function hablan(e: EstadoPartida) {
  for (const j of vistaPublica(e).impostor!.orden) e = juega(e, { tipo: "pista", jugador: j, texto: `palabra de ${j}` });
  return e;
}
/** Todos los que siguen votan por `a` (y `a` vota por `otro`). */
function votan(e: EstadoPartida, a: string, otro: string) {
  for (const j of vistaPublica(e).esperados) e = juega(e, { tipo: "contestar", jugador: j, valor: j === a ? otro : a });
  return juega(e, { tipo: "revelar" });
}

describe("arranque de El impostor", () => {
  it("siempre trae opciones de impostor y una vuelta por jugador", () => {
    const a = armarArranque(gente(6), "impostor", 8, 2, 1, { impostor: { cantidad: 2, tema: "pel" } })!;
    expect(a.cfg.impostor).toEqual({ cantidad: 2, tema: "pel" });
    expect(a.rondas).toBe(6);
    expect(armarArranque(gente(4), "impostor", 8, 2, 1)!.cfg.impostor).toEqual({ cantidad: 1, tema: null });
  });
  it("nunca hay tantos impostores como civiles", () => {
    expect(armarArranque(gente(4), "impostor", 8, 2, 1, { impostor: { cantidad: 3, tema: null } })!.cfg.impostor!.cantidad).toBe(1);
    expect(armarArranque(gente(5), "impostor", 8, 2, 1, { impostor: { cantidad: 3, tema: null } })!.cfg.impostor!.cantidad).toBe(2);
    expect(impostores(partida(7, 3, { impostor: { cantidad: 3, tema: null } })).length).toBe(3);
  });
  it("el tema pedido y el del escenario", () => {
    const pel = partida(4, 9, { impostor: { cantidad: 1, tema: "pel" } });
    expect(pel.carta?.texto).toBe("Películas");
    const esc = partida(4, 9, { escenario: "alverca", impostor: { cantidad: 1, tema: "escenario" } });
    expect(esc.carta?.texto).toBe("ALVerca");
    expect(esc.cfg.lugar).toBe("alberca");
  });
});

describe("una vuelta: hablar en orden, votar, eliminar", () => {
  it("solo habla quien tiene el turno, en orden; luego se vota", () => {
    let e = partida(4, 11);
    const v0 = vistaPublica(e);
    expect(v0.impostor!.etapa).toBe("pistas");
    expect(v0.impostor!.orden).toHaveLength(4);
    expect(v0.esperados).toEqual([v0.impostor!.orden[0]]);
    const [primero, segundo] = v0.impostor!.orden as [string, string];
    // El segundo no puede hablar antes que el primero.
    e = juega(e, { tipo: "pista", jugador: segundo, texto: "antes" });
    expect(e.pistas).toEqual({});
    // Nadie puede votar mientras se dicen las palabras.
    e = juega(e, { tipo: "contestar", jugador: primero, valor: segundo });
    expect(e.respuestas).toEqual({});
    e = juega(e, { tipo: "pista", jugador: primero, texto: "agua" });
    expect(e.turnoDe).toBe(segundo);
    e = hablan(e);
    expect(vistaPublica(e).impostor!.etapa).toBe("votar");
    expect(vistaPublica(e).esperados.sort()).toEqual(["j0", "j1", "j2", "j3"]);
  });

  it("el más votado sale de escena y ya no habla ni vota", () => {
    let e = hablan(partida(5, 21));
    const imp = impostores(e)[0]!;
    const civil = ["j0", "j1", "j2", "j3", "j4"].find(j => j !== imp)!;
    e = votan(e, civil, imp);
    const r = e.revelado as { eliminado: string; eraImpostor: boolean; fin: unknown; palabra?: string };
    expect(r).toMatchObject({ eliminado: civil, eraImpostor: false, fin: null });
    expect(r.palabra).toBeUndefined(); // la palabra no se dice hasta el final
    e = juega(e, { tipo: "siguiente" });
    expect(e.ronda).toBe(2);
    expect(vistaPublica(e).impostor!.eliminados).toEqual([civil]);
    expect(vistaPublica(e).impostor!.orden).not.toContain(civil);
    e = hablan(e);
    expect(vistaPublica(e).esperados).not.toContain(civil);
  });

  it("misma palabra y mismos impostores en todas las vueltas", () => {
    let e = hablan(partida(6, 5));
    const antes = JSON.stringify(e.privado);
    const imp = impostores(e)[0]!;
    const civil = ["j0", "j1", "j2", "j3", "j4", "j5"].find(j => j !== imp)!;
    e = juega(votan(e, civil, imp), { tipo: "siguiente" });
    expect(JSON.stringify(e.privado)).toBe(antes);
  });

  it("empate: nadie sale", () => {
    let e = hablan(partida(4, 8));
    const [a, b, c, d] = ["j0", "j1", "j2", "j3"] as const;
    e = juega(e, { tipo: "contestar", jugador: a, valor: b });
    e = juega(e, { tipo: "contestar", jugador: b, valor: a });
    e = juega(e, { tipo: "contestar", jugador: c, valor: a });
    e = juega(e, { tipo: "contestar", jugador: d, valor: b });
    e = juega(e, { tipo: "revelar" });
    expect(e.revelado).toMatchObject({ eliminado: null, empate: true, fin: null });
    expect(e.eliminados ?? []).toEqual([]);
  });

  it("saltar en la vuelta de palabras salta solo a quien le toca", () => {
    let e = partida(4, 13);
    const [primero, segundo] = vistaPublica(e).impostor!.orden as [string, string];
    e = juega(e, { tipo: "saltar" });
    expect(e.fase).toBe("contestando");
    expect(e.pistas?.[primero]).toBe("…");
    expect(e.turnoDe).toBe(segundo);
  });
});

describe("cómo termina", () => {
  it("atrapan al único impostor: ganan los civiles y se revela la palabra", () => {
    let e = hablan(partida(4, 31));
    const imp = impostores(e)[0]!;
    const otro = ["j0", "j1", "j2", "j3"].find(j => j !== imp)!;
    e = votan(e, imp, otro);
    const r = e.revelado as { fin: string; palabra: string; impostores: string[] };
    expect(r.fin).toBe("civiles");
    expect(r.impostores).toEqual([imp]);
    expect(r.palabra.length).toBeGreaterThan(0);
    // Civiles que votaron bien: +1 y +2 por ganar. El impostor: 0.
    expect(e.puntos[otro]).toBe(3);
    expect(e.puntos[imp]).toBe(0);
    e = juega(e, { tipo: "siguiente" });
    expect(e.fase).toBe("terminada");
  });

  it("con dos impostores, atrapar a uno no basta: sigue", () => {
    let e = hablan(partida(6, 41, { impostor: { cantidad: 2, tema: null } }));
    const [i1, i2] = impostores(e) as [string, string];
    e = votan(e, i1, i2);
    expect(e.revelado).toMatchObject({ eliminado: i1, eraImpostor: true, quedan: 1, fin: null });
    e = juega(e, { tipo: "siguiente" });
    expect(e.fase).toBe("contestando");
    e = votan(hablan(e), i2, i1 === "j0" ? "j1" : "j0");
    expect(e.revelado).toMatchObject({ fin: "civiles" });
  });

  it("si los impostores igualan a los civiles, ganan ellos", () => {
    let e = hablan(partida(4, 51));
    const imp = impostores(e)[0]!;
    const civiles = ["j0", "j1", "j2", "j3"].filter(j => j !== imp);
    e = juega(votan(e, civiles[0]!, imp), { tipo: "siguiente" }); // 1 impostor y 2 civiles
    e = votan(hablan(e), civiles[1]!, imp); // 1 contra 1
    expect(e.revelado).toMatchObject({ fin: "impostores", impostores: [imp] });
    expect(e.puntos[imp]).toBe(1 + 1 + 3);
    expect(juega(e, { tipo: "siguiente" }).fase).toBe("terminada");
  });

  it("la vista pública nunca dice quién es impostor ni la palabra antes del final", () => {
    let e = partida(5, 61);
    const palabra = (Object.values(e.privado).find(p => (p as { rol: string }).rol === "civil") as { palabra: string }).palabra;
    const imp = impostores(e)[0]!;
    for (let paso = 0; paso < 3 && e.fase !== "terminada"; paso++) {
      for (const x of [e, hablan(e)]) {
        const t = JSON.stringify(vistaPublica(x));
        expect(t).not.toContain(palabra);
        expect(t).not.toContain('"rol"');
      }
      e = hablan(e);
      const civil = vistaPublica(e).esperados.find(j => j !== imp)!;
      e = votan(e, civil, imp);
      if (!(e.revelado as { fin?: string }).fin) expect(JSON.stringify(vistaPublica(e))).not.toContain(palabra);
      e = juega(e, { tipo: "siguiente" });
    }
  });
});

describe("tipos de partida", () => {
  const js = gente(4);
  it("parejas por orden de llegada, con número par", () => {
    expect(armarGrupos(js, { modalidad: "parejas" })!.equipos).toEqual([{ id: "p1", nombre: "J0 y J1" }, { id: "p2", nombre: "J2 y J3" }]);
    expect(armarGrupos(gente(5), { modalidad: "parejas" })).toBeNull();
  });
  it("equipos y guerra de sexos piden grupo para todos y al menos dos grupos", () => {
    expect(armarGrupos(js, { modalidad: "equipos", grupos: { j0: "a", j1: "b", j2: "a" } })).toBeNull();
    expect(armarGrupos(js, { modalidad: "sexos", grupos: { j0: "ellas", j1: "ellas", j2: "ellas", j3: "ellas" } })).toBeNull();
    const g = armarGrupos(js, { modalidad: "sexos", grupos: { j0: "ellas", j1: "ellos", j2: "ellas", j3: "ellos" } })!;
    expect(g.jugadores.map(j => j.equipo)).toEqual(["ellas", "ellos", "ellas", "ellos"]);
    expect(g.equipos).toEqual([{ id: "ellas", nombre: "Ellas" }, { id: "ellos", nombre: "Ellos" }]);
  });
  it("gana el grupo: el lugar sale de los puntos del grupo (promedio en Más probable)", () => {
    const a = armarArranque(js, "mas-probable", 5, 2, 1, { modalidad: "equipos", grupos: { j0: "a", j1: "b", j2: "a", j3: "b" } })!;
    const e = { ...crearPartida(JUEGOS.find(j => j.id === "mas-probable")!, a.cfg, 1, CONTENIDO), puntos: { j0: 5, j1: 3, j2: 0, j3: 3 } };
    const lugares = Object.fromEntries(resultados(e).map(r => [r.jugador, r.lugar]));
    // Equipo B (promedio 3) gana al A (promedio 2.5) aunque J0 tenga más puntos que nadie.
    expect(lugares).toEqual({ j1: 1, j3: 1, j0: 3, j2: 3 });
    expect(vistaPublica(e).grupos).toEqual([
      { id: "b", nombre: "Equipo B", jugadores: ["j1", "j3"], puntos: 3 },
      { id: "a", nombre: "Equipo A", jugadores: ["j0", "j2"], puntos: 2.5 },
    ]);
  });
  it("individual no cambia nada", () => {
    const a = armarArranque(js, "mas-probable", 5, 2, 1, { modalidad: "individual" })!;
    expect(a.cfg.modalidad).toBeUndefined();
    expect(vistaPublica(crearPartida(JUEGOS.find(j => j.id === "mas-probable")!, a.cfg, 1, CONTENIDO)).grupos).toBeUndefined();
  });
});

describe("Cómo jugar", () => {
  it("el arranque guarda si se explican las reglas y la vista pública lo avisa", () => {
    const con = armarArranque(gente(4), "impostor", 8, 2, 1, { explicar: true })!;
    expect(con.cfg.explicar).toBe(true);
    expect(vistaPublica(crearPartida(impostorDef, con.cfg, 1, CONTENIDO, con.rondas)).explicar).toBe(true);
    const sin = armarArranque(gente(4), "impostor", 8, 2, 1)!;
    expect(vistaPublica(crearPartida(impostorDef, sin.cfg, 1, CONTENIDO, sin.rondas)).explicar).toBeUndefined();
  });
  it("cada juego del motor tiene láminas; con tipo de partida, la última habla de grupos", async () => {
    const { laminas } = await import("../content/comoJugar");
    for (const j of JUEGOS.filter(x => x.motor)) expect(laminas(j.id).length, j.id).toBeGreaterThanOrEqual(3);
    expect(laminas("impostor").map(l => l.titulo)).toEqual(["La palabra secreta", "Por turnos", "A votar", "¿Quién gana?", "Puntos"]);
    expect(laminas("mas-probable", "equipos").at(-1)!.texto).toMatch(/equipo/);
  });
});
