// Juegos de risa de ALV FÍSICO (Elías, 27 nov): corren en el motor físico con turno, carta tapada o pública,
// «Mostrar respuesta», siguiente carta, cronómetro de quien tiene el turno y el reloj a ciegas.
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { IDS_RISA, RISA, castigoRisa } from "../content/risa";
import { JUEGOS_FISICO, MODALIDADES_JUEGO } from "../content/configurar";
import { laminas } from "../content/comoJugar";
import { aplicar, crearPartida, juegoParaGuardar, resultados, type Accion, type AccionSinId, type EstadoPartida, type SeleccionFisico } from "./partida";
import { armarArranque } from "./nucleo";
import { vistaJugador, vistaPublica } from "./vistas";
import type { LugarId } from "./types";

const gente = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
let k = 0;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, { ...a, id: `ri${++k}` } as Accion, CONTENIDO);
const contesta = (e: EstadoPartida, j: string, valor: unknown) => juega(e, { tipo: "contestar", jugador: j, valor });
const sel = (e: EstadoPartida) => (e.seleccion ?? {}) as unknown as SeleccionFisico;
function partida(id: string, n = 4, lugar: LugarId = "interior"): EstadoPartida {
  const a = armarArranque(gente(n), id, 5, 1, 7, {})!;
  const def = JUEGOS.find(j => j.id === id)!;
  return { ...crearPartida(def, { ...a.cfg, lugar, intensidad: 3 }, a.semilla, CONTENIDO, a.rondas), control: "j0" };
}

describe("catálogo de los juegos de risa", () => {
  it("cada juego está en el catálogo, en ALV FÍSICO, tiene modalidades, láminas y al menos 10 cartas para todos", () => {
    expect(IDS_RISA.length).toBe(16);
    for (const id of IDS_RISA) {
      const j = JUEGOS.find(x => x.id === id);
      expect(j?.motor, id).toBe("fisico");
      expect(JUEGOS_FISICO, id).toContain(id);
      expect(MODALIDADES_JUEGO[id], id).toBeTruthy();
      expect(laminas(id).length, id).toBeGreaterThanOrEqual(5);
      const cartas = CONTENIDO.cartas.filter(c => c.mazo === j!.mazo);
      expect(cartas.filter(c => c.intensidad === 1).length, id).toBeGreaterThanOrEqual(10);
      expect(cartas.every(c => !c.adulto && !c.drunk && c.esfuerzo === "bajo"), id).toBe(true);
    }
  });
  it("los ids de las cartas no se repiten", () => {
    const ids = CONTENIDO.cartas.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("Termina el dicho trae la respuesta y Sin decirla sus 3 prohibidas", () => {
    for (const c of CONTENIDO.cartas.filter(c => c.mazo === "risa-termina-frase")) expect(c.opcionB, c.id).toBeTruthy();
    for (const c of CONTENIDO.cartas.filter(c => c.mazo === "risa-sin-decirla")) expect(c.prohibidas?.length, c.id).toBe(3);
  });
  it("con agua, harina o slime solo en exterior; junto al fuego, el castigo de interior", () => {
    const r = RISA["sin-decirla"]!;
    expect(castigoRisa(r, "campo")).toBe(r.castigo.exterior);
    expect(castigoRisa(r, "fogata")).toBe(r.castigo.interior);
    expect(castigoRisa(r, "asador")).toBe(r.castigo.interior);
    expect(castigoRisa(r, "interior")).toBe(r.castigo.interior);
  });
  it("en el servidor se guardan como «fisico» (la 054 no conoce los ids nuevos)", () => {
    expect(juegoParaGuardar(partida("pinzas"))).toBe("fisico");
    expect(juegoParaGuardar({ juegoId: "impostor" })).toBe("impostor");
  });
});

describe("carta tapada (Pinzas)", () => {
  it("el turno rota por ronda y la palabra solo llega al celular de quien describe", () => {
    let e = partida("pinzas");
    expect(e.turnoDe).toBe("j0");
    const pub = JSON.stringify(vistaPublica(e));
    const secreto = (vistaJugador(e, "j0").mio as { secreto: string }).secreto;
    expect(secreto).toBeTruthy();
    expect(pub).not.toContain(secreto);
    expect(vistaJugador(e, "j1").mio).toBeUndefined();
    e = juega(juega(contesta(e, "j0", "listo"), { tipo: "revelar" }), { tipo: "siguiente" });
    expect(e.turnoDe).toBe("j1");
  });
  it("quien describe pide la siguiente palabra y arranca el cronómetro, pero no da puntos", () => {
    let e = partida("pinzas");
    e = { ...e, control: "j3", turnoDe: "j1", privado: { j1: { secreto: "Tamal" } } };
    const antes = e.carta?.id;
    e = contesta(e, "j1", { otro: true });
    expect(e.carta?.id).not.toBe(antes);
    expect(sel(e).vuelta).toBe(2);
    expect((e.privado.j1 as { secreto: string }).secreto).toBeTruthy();
    e = contesta(e, "j1", { herramienta: "cronometro", segundos: 60 });
    expect(sel(e).herr?.segundos).toBe(60);
    expect(contesta(e, "j1", { puntos: { jugador: "j1", delta: 5 } })).toBe(e);
    expect(contesta(e, "j1", { herramienta: "dados" }).seleccion).toEqual(e.seleccion);
    // Alguien sin turno ni control no manda nada.
    expect(contesta(e, "j2", { otro: true })).toBe(e);
  });
  it("«Mostrar respuesta» la destapa para todos y al terminar la ronda sale en lo revelado", () => {
    let e = partida("chisme");
    const secreto = (e.privado[e.turnoDe!] as { secreto: string }).secreto;
    e = contesta(e, "j0", { mostrar: true });
    expect(sel(e).mostrar).toBe(secreto);
    e = juega(contesta(e, "j0", "listo"), { tipo: "revelar" });
    expect((e.revelado as { oculto?: string }).oculto).toBe(secreto);
  });
});

describe("carta a la mitad y al revés", () => {
  it("Termina el dicho: la respuesta solo la tiene el administrador hasta que la muestra", () => {
    let e = partida("termina-frase");
    const resp = (e.privado.j0 as { respuesta: string }).respuesta;
    expect(resp).toBeTruthy();
    expect(JSON.stringify(vistaPublica(e))).not.toContain(resp);
    e = contesta(e, "j0", { mostrar: true });
    expect(vistaPublica(e).seleccion).toMatchObject({ mostrar: resp });
  });
  it("sin turno: solo el administrador pide la siguiente", () => {
    const e = partida("al-reves");
    expect(e.turnoDe).toBeUndefined();
    expect(contesta(e, "j1", { otro: true })).toBe(e);
    expect(contesta(e, "j0", { otro: true }).carta?.id).not.toBe(e.carta?.id);
  });
});

describe("Dame tres: el cronómetro vuelve a empezar con cada categoría", () => {
  it("cada «Siguiente» trae otra categoría y un cronómetro nuevo de 5 s", () => {
    let e = partida("dame-tres");
    e = contesta(e, "j0", { otro: true });
    const n1 = sel(e).herr?.n;
    expect(sel(e).herr).toMatchObject({ tipo: "cronometro", segundos: 5 });
    e = contesta(e, "j0", { otro: true });
    expect(sel(e).herr?.n).toBe(n1! + 1);
  });
});

describe("Para el reloj: cronómetro a ciegas", () => {
  it("cada quien manda su tiempo una vez; los valores raros no cuentan", () => {
    let e = partida("para-el-reloj", 3);
    expect(Number(e.carta?.tipo)).toBeGreaterThan(0);
    e = contesta(e, "j1", { reloj: 12_400 });
    e = contesta(e, "j0", { reloj: 13_100 });
    expect(sel(e).reloj).toEqual({ j1: 12_400, j0: 13_100 });
    expect(contesta(e, "j1", { reloj: 1 })).toBe(e);
    expect(contesta(e, "j2", { reloj: -5 })).toBe(e);
    expect(contesta(e, "j2", { reloj: 1.5 })).toBe(e);
    expect(contesta(e, "j2", { reloj: 999_999 })).toBe(e);
  });
});

describe("una partida completa de cada juego", () => {
  for (const id of IDS_RISA) {
    it(id, () => {
      let e = partida(id, 4, "campo");
      for (let r = 0; r < 5; r++) {
        expect(e.carta, `${id} ronda ${r + 1}`).toBeTruthy();
        e = contesta(e, "j0", { puntos: { jugador: `j${r % 4}`, delta: 2 } });
        e = juega(contesta(e, "j0", "listo"), { tipo: "revelar" });
        expect(e.fase).toBe("revelada");
        e = juega(e, { tipo: "siguiente" });
      }
      expect(e.fase).toBe("terminada");
      expect(resultados(e).length).toBe(4);
    });
  }
});
