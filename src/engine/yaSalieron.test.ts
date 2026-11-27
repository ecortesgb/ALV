import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { cartasPermitidas } from "./filtros";
import { armarArranque } from "./nucleo";
import { aplicar, crearPartida, type Accion, type AccionSinId, type EstadoPartida } from "./partida";
import { vistaPublica } from "./vistas";
import { codificarSalieron, limpiarSalieron, yaSalio } from "./yaSalieron";
import type { Configuracion } from "./types";

const jugadores = ["Ana", "Beto", "Caro", "Dani"].map((nombre, i) => ({ id: `j${i}`, nombre }));
const cfg = (extra: Partial<Configuracion> = {}): Configuracion => ({ jugadores, lugar: "interior", intensidad: 2, dificultad: 1, adulto: false, drunk: false, ...extra });
const juego = (id: string) => JUEGOS.find(j => j.id === id)!;
let n = 0;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, { ...a, id: `s${++n}` } as Accion, CONTENIDO);

describe("Sin repetir entre noches: la máscara", () => {
  it("codifica y lee las mismas cartas", () => {
    const ids = ["verdad-001", "verdad-004", "verdad-112", "reto-005", "mas-probable-057"];
    const s = codificarSalieron(ids)!;
    for (const id of ids) expect(yaSalio(s, id)).toBe(true);
    for (const id of ["verdad-002", "verdad-111", "reto-004", "yo-nunca-001", "dados-3-0"]) expect(yaSalio(s, id)).toBe(false);
  });
  it("todo el contenido cabe en poco espacio", () => {
    const s = codificarSalieron(CONTENIDO.cartas.map(c => c.id))!;
    // Con los 747 textos de los juegos de risa (27 nov) sube a ~800; el arranque admite 4000 bytes.
    expect(JSON.stringify(s).length).toBeLessThan(1000);
    expect(CONTENIDO.cartas.every(c => yaSalio(s, c.id))).toBe(true);
  });
  it("ignora lo que no es id de carta y lo que llega mal del navegador", () => {
    expect(codificarSalieron(["hola", "dados-1-0x", ""])).toBeUndefined();
    expect(limpiarSalieron({ verdad: "f", "MAL mazo": "1", reto: "zz", otro: 5 })).toEqual({ verdad: "f" });
    expect(limpiarSalieron([1, 2])).toBeUndefined();
    expect(limpiarSalieron("verdad")).toBeUndefined();
  });
});

describe("Sin repetir entre noches: el motor", () => {
  it("saca primero las cartas que no han salido", () => {
    const pool = cartasPermitidas(cfg(), CONTENIDO.cartas, ["mas-probable"]);
    const nueva = pool[pool.length - 1]!;
    const salieron = codificarSalieron(pool.filter(c => c.id !== nueva.id).map(c => c.id));
    for (const semilla of [1, 7, 42, 999]) {
      const e = crearPartida(juego("mas-probable"), cfg({ yaSalieron: salieron }), 3, CONTENIDO, semilla);
      expect(e.carta?.id).toBe(nueva.id);
    }
  });
  it("si ya salieron todas, usa el mazo completo", () => {
    const todas = codificarSalieron(CONTENIDO.cartas.map(c => c.id));
    const e = crearPartida(juego("mas-probable"), cfg({ yaSalieron: todas }), 3, CONTENIDO, 5);
    expect(e.carta?.id).toBeTruthy();
  });
  it("sin la opción, la partida sale igual que antes", () => {
    const a = crearPartida(juego("mas-probable"), cfg(), 3, CONTENIDO, 11);
    const b = crearPartida(juego("mas-probable"), cfg({ yaSalieron: undefined }), 3, CONTENIDO, 11);
    expect(b.carta).toEqual(a.carta);
  });
  it("el arranque limpia lo que manda el configurador", () => {
    const a = armarArranque(jugadores, "mas-probable", 3, 2, 9, { yaSalieron: { "mas-probable": "3", "x y": "1" } as Record<string, string> })!;
    expect(a.cfg.yaSalieron).toEqual({ "mas-probable": "3" });
    expect(armarArranque(jugadores, "mas-probable", 3, 2, 9, {})!.cfg.yaSalieron).toBeUndefined();
  });
});

describe("¿Quién es más probable? con voto secreto", () => {
  const jugarRonda = (c: Configuracion) => {
    let e = crearPartida(juego("mas-probable"), c, 3, CONTENIDO, 4);
    e = juega(e, { tipo: "contestar", jugador: "j0", valor: "j2" });
    e = juega(e, { tipo: "contestar", jugador: "j1", valor: "j2" });
    e = juega(e, { tipo: "contestar", jugador: "j2", valor: "j0" });
    e = juega(e, { tipo: "contestar", jugador: "j3", valor: "j2" });
    return juega(e, { tipo: "revelar" });
  };
  it("a la vista: al revelar se ve quién votó a quién", () => {
    const v = vistaPublica(jugarRonda(cfg()));
    expect(v.votosDe).toEqual({ j0: "j2", j1: "j2", j2: "j0", j3: "j2" });
    expect(v.votoSecreto).toBeUndefined();
  });
  it("secreto: solo el conteo, nunca quién votó a quién", () => {
    const v = vistaPublica(jugarRonda(cfg({ votoSecreto: true })));
    expect(v.votosDe).toBeUndefined();
    expect(v.votoSecreto).toBe(true);
    expect((v.revelado as { votos: Record<string, number> }).votos).toEqual({ j2: 3, j0: 1 });
    expect(JSON.stringify(v)).not.toContain("respuestas");
  });
  it("solo se enciende en ¿Quién es más probable?", () => {
    expect(armarArranque(jugadores, "mas-probable", 3, 2, 9, { votoSecreto: true })!.cfg.votoSecreto).toBe(true);
    expect(armarArranque(jugadores, "yo-nunca", 3, 2, 9, { votoSecreto: true })!.cfg.votoSecreto).toBeUndefined();
  });
});
