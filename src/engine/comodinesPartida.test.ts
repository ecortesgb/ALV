// Comodines de la colección en la partida (Elías, 27 nov, Maestro v1.72).
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { SUERTES } from "../content/comodinesPartida";
import { aplicar, comodinesUsables, crearPartida, type Accion, type AccionSinId, type EstadoPartida } from "./partida";
import { aAccion, armarArranque, reconstruir, type FilaAccion } from "./nucleo";
import { vistaJugador, vistaPublica } from "./vistas";

const gente = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
let k = 0;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, { ...a, id: `cm-${++k}-xxxx` } as Accion, CONTENIDO);
const usa = (e: EstadoPartida, jugador: string, carta: string, id?: string) => aplicar(e, { id: id ?? `cm-${++k}-xxxx`, tipo: "usar-carta", jugador, carta, cuenta: true }, CONTENIDO);
function vr(op: Record<string, unknown> = {}, n = 4, semilla = 7) {
  const a = armarArranque(gente(n), "verdad-reto", 8, 2, semilla, { herramienta: "orden", ...op })!;
  return crearPartida(JUEGOS.find(j => j.id === "verdad-reto")!, a.cfg, a.semilla, CONTENIDO, a.rondas);
}
const sel = (e: EstadoPartida) => vistaPublica(e).verdadReto!;
/** Verdad o reto hasta «calificar» con la carta de la app. */
function aCalificar(e: EstadoPartida, elige: "verdad" | "reto" = "reto") {
  const { pregunta, responde } = sel(e);
  e = juega(e, { tipo: "contestar", jugador: responde, valor: { elige } });
  return juega(e, { tipo: "contestar", jugador: pregunta, valor: { fuente: "app" } });
}

describe("configurador y arranque", () => {
  it("encendidos de inicio en los juegos que los aceptan; el anfitrión los apaga", () => {
    expect(armarArranque(gente(3), "verdad-reto", 8, 2, 1)!.cfg.comodines).toBe(true);
    expect(armarArranque(gente(3), "verdad-reto", 8, 2, 1, { comodines: false })!.cfg.comodines).toBeUndefined();
    expect(armarArranque(gente(3), "que-prefieres", 8, 2, 1)!.cfg.comodines).toBeUndefined();
  });
  it("con los comodines apagados nadie puede usar uno", () => {
    let e = aCalificar(vr({ comodines: false }));
    const { responde } = sel(e);
    expect(comodinesUsables(e, responde)).toEqual([]);
    const antes = e;
    e = usa(e, responde, "turno");
    expect(e).toBe(antes);
  });
});

describe("Verdad o reto", () => {
  it("solo quien responde, y según la etapa: al elegir pasa; con la carta de la app, también cambia o elige entre dos", () => {
    let e = vr();
    const { responde, pregunta } = sel(e);
    expect(comodinesUsables(e, pregunta)).toEqual([]);
    expect(comodinesUsables(e, responde)).toEqual(["turno", "escudo"]);
    e = aCalificar(e, "reto");
    expect(comodinesUsables(e, responde)).toEqual(["turno", "escudo", "cambio", "dos-caminos", "rebaja", "segundo-intento", "suerte"]);
    expect(vistaJugador(e, responde).misComodines).toContain("suerte");
  });
  it("Pasa turno: pasa sin tomar y con 0 puntos; uno por turno", () => {
    let e = aCalificar(vr());
    const { responde } = sel(e);
    e = usa(e, responde, "turno");
    expect(sel(e).etapa).toBe("listo");
    expect(vistaPublica(e).cartaUsada).toMatchObject({ jugador: responde, carta: "turno" });
    expect(comodinesUsables(e, responde)).toEqual([]);
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos[responde]).toBe(0);
  });
  it("Cambio saca otra carta", () => {
    let e = aCalificar(vr());
    const antes = e.carta!.id;
    e = usa(e, sel(e).responde, "cambio");
    expect(e.carta!.id).not.toBe(antes);
  });
  it("Dos caminos: dos cartas, nadie califica hasta que elige quien responde", () => {
    let e = aCalificar(vr());
    const { responde, pregunta } = sel(e);
    e = usa(e, responde, "dos-caminos");
    const caminos = vistaPublica(e).efectos!.caminos!;
    expect(caminos).toHaveLength(2);
    expect(caminos[0]!.id).not.toBe(caminos[1]!.id);
    const sinCalificar = juega(e, { tipo: "contestar", jugador: pregunta, valor: "cumplio" });
    expect(sinCalificar.respuestas[pregunta]).toBeUndefined();
    expect(juega(e, { tipo: "camino", jugador: pregunta, i: 1 }).carta!.id).toBe(e.carta!.id);
    e = juega(e, { tipo: "camino", jugador: responde, i: 1 });
    expect(e.carta!.id).toBe(caminos[1]!.id);
    expect(e.efectos!.caminos).toBeUndefined();
    e = juega(e, { tipo: "contestar", jugador: pregunta, valor: "cumplio" });
    expect(e.respuestas[pregunta]).toBe("cumplio");
  });
  it("Segundo intento: el primer «tomó» no cuenta, el segundo sí", () => {
    let e = aCalificar(vr());
    const { responde, pregunta } = sel(e);
    e = usa(e, responde, "segundo-intento");
    e = juega(e, { tipo: "contestar", jugador: pregunta, valor: "tomo" });
    expect(e.respuestas[pregunta]).toBeUndefined();
    expect(e.efectos!.segundo).toBe("usado");
    e = juega(e, { tipo: "contestar", jugador: pregunta, valor: "tomo" });
    expect(e.respuestas[pregunta]).toBe("tomo");
  });
  it("Prórroga solo con temporizador y suma 30 s", () => {
    let e = aCalificar(vr({ temporizador: 30 }));
    expect(comodinesUsables(e, sel(e).responde)).toContain("prorroga");
    e = usa(e, sel(e).responde, "prorroga");
    expect(e.efectos!.extra).toBe(30);
    expect(comodinesUsables(aCalificar(vr()), "j0")).not.toContain("prorroga");
  });
  it("¿Voy a tener suerte? con un reto de contacto nunca lo pasa a otra persona ni a toda la mesa", () => {
    for (let i = 0; i < 40; i++) {
      let e = aCalificar(vr({}, 4, 300 + i));
      const contacto = CONTENIDO.cartas.find(x => x.contacto && x.mazo === "reto")!;
      e = { ...e, carta: { id: contacto.id, texto: contacto.texto, tipo: "reto" } };
      e = usa(e, sel(e).responde, "suerte", `contacto-${i}-abcd`);
      expect(["pasa", "mesa"]).not.toContain(e.efectos!.suerte);
    }
  });
  it("¿Voy a tener suerte? sale igual al reconstruir y cada resultado hace lo suyo", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 60; i++) {
      let e = aCalificar(vr({}, 4, 100 + i));
      const { responde, pregunta } = sel(e);
      const id = `suerte-${i}-abcd`;
      e = usa(e, responde, "suerte", id);
      const s = e.efectos!.suerte!;
      vistos.add(s);
      expect(usa(aCalificar(vr({}, 4, 100 + i)), responde, "suerte", id).efectos!.suerte).toBe(s);
      if (s === "anula") expect(sel(e).etapa).toBe("listo");
      if (s === "pasa") { expect(sel(e).responde).not.toBe(responde); expect(sel(e).responde).not.toBe(pregunta); }
      if (s === "duplica") {
        e = juega(e, { tipo: "contestar", jugador: pregunta, valor: "cumplio" });
        e = juega(e, { tipo: "revelar" });
        expect(e.puntos[responde]).toBe(4);
      }
    }
    expect([...vistos].sort()).toEqual([...SUERTES].sort());
  });
});

describe("juegos por turno", () => {
  it("El reloj (botella): quien tiene el turno pasa, cambia o se rebaja; los demás no", () => {
    const a = armarArranque(gente(4), "reloj", 8, 2, 5)!;
    let e = crearPartida(JUEGOS.find(j => j.id === "reloj")!, a.cfg, a.semilla, CONTENIDO, a.rondas);
    const t = e.turnoDe!, otro = e.cfg.jugadores.find(j => j.id !== t)!.id;
    expect(comodinesUsables(e, otro)).toEqual([]);
    expect(comodinesUsables(e, t)).toEqual(expect.arrayContaining(["turno", "escudo", "rebaja", "segundo-intento"]));
    e = usa(e, t, "segundo-intento");
    e = juega(e, { tipo: "contestar", jugador: t, valor: "paso" });
    expect(e.respuestas[t]).toBeUndefined();
    e = juega(e, { tipo: "contestar", jugador: t, valor: "paso" });
    expect(e.respuestas[t]).toBe("paso");
  });
});

describe("filas de la base", () => {
  it("la fila «comodin» es un comodín de la colección; la fila «carta» con el mismo dato usa la mano vieja (vacía)", () => {
    const f = (tipo: FilaAccion["tipo"]): FilaAccion => ({ id: "f-123456", jugador: "j0", tipo, datos: { carta: "turno" }, creada: "" });
    expect(aAccion(f("comodin"), [])).toMatchObject({ tipo: "usar-carta", cuenta: true });
    expect(aAccion(f("carta"), [])).not.toHaveProperty("cuenta");
    expect(aAccion({ ...f("carta"), datos: { que: "camino", i: 1 } }, [])).toMatchObject({ tipo: "camino", i: 1 });
  });
  it("al reconstruir, un comodín que llegó fuera de su momento no entra (el motor lo deja para devolverlo)", () => {
    const a = armarArranque(gente(3), "verdad-reto", 8, 2, 9, { herramienta: "orden" })!;
    const filas: FilaAccion[] = [
      { id: "arranque-x", jugador: "j0", tipo: "control", datos: { que: "arranque", ...a }, creada: "" },
      { id: "tarde-1234", jugador: "j2", tipo: "comodin", datos: { carta: "turno" }, creada: "" },
    ];
    const e = reconstruir(filas, "j0")!;
    expect(e.accionesVistas).not.toContain("tarde-1234");
  });
});

describe("Dados HOT (Maestro v1.72)", () => {
  const parejas = gente(4);
  function dados(drunk: boolean) {
    const a = armarArranque(parejas, "dados-hot", 4, 4, 3, { modalidad: "parejas", ejes: { temperatura: 3, voltaje: 3, drunk } })!;
    return crearPartida(JUEGOS.find(j => j.id === "dados-hot")!, a.cfg, a.semilla, CONTENIDO, a.rondas);
  }
  it("acepta comodines; decir que no resta 1 punto", () => {
    let e = dados(false);
    expect(e.cfg.comodines).toBe(true);
    const t = e.turnoDe!;
    expect(juega(e, { tipo: "contestar", jugador: t, valor: "tomo" }).respuestas[t]).toBeUndefined();
    e = juega(e, { tipo: "contestar", jugador: t, valor: "paso" });
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos[t]).toBe(-1);
  });
  it("con Drunk toma algo y queda en 0; con Pasa turno tampoco resta", () => {
    let e = dados(true);
    const t = e.turnoDe!;
    e = juega(e, { tipo: "contestar", jugador: t, valor: "tomo" });
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos[t]).toBe(0);
    let f = dados(false);
    f = usa(f, f.turnoDe!, "turno");
    f = juega(f, { tipo: "revelar" });
    expect(f.puntos[f.turnoDe!]).toBe(0);
  });
  it("la suerte nunca lo pasa a otra persona ni a toda la mesa", () => {
    for (let i = 0; i < 30; i++) {
      const e = usa(dados(false), "j0", "suerte", `dados-${i}-abcd`);
      if (e.efectos?.suerte) expect(["pasa", "mesa"]).not.toContain(e.efectos.suerte);
    }
  });
});
