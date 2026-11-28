// Los 10 comodines de la segunda tanda (Maestro v1.74, 28 nov): castigo, mesero, trampa, pareja, pista y duelo.
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { admitePareja, aplicar, castigoDe, comodinesUsables, crearPartida, objetivosComodin, segundosTurno, type Accion, type AccionSinId, type EstadoPartida } from "./partida";
import { armarArranque, reconstruir, type FilaAccion } from "./nucleo";
import { vistaJugador, vistaPublica } from "./vistas";

const gente = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
let k = 0;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, { ...a, id: `c18-${++k}-xxxx` } as Accion, CONTENIDO);
const usa = (e: EstadoPartida, jugador: string, carta: string) => aplicar(e, { id: `c18-${++k}-xxxx`, tipo: "usar-carta", jugador, carta, cuenta: true }, CONTENIDO);
/** Apunta y usa, como el celular: primero la fila gratis con a quién va, luego el comodín pagado. */
const lanza = (e: EstadoPartida, jugador: string, carta: string, a: string) => usa(juega(e, { tipo: "apuntar", jugador, a }), jugador, carta);

function juego(id: string, n = 4, semilla = 3, op: Parameters<typeof armarArranque>[5] = {}) {
  const a = armarArranque(gente(n), id, 8, 2, semilla, op)!;
  return crearPartida(JUEGOS.find(j => j.id === id)!, a.cfg, a.semilla, CONTENIDO, a.rondas);
}
/** Gira la ruleta del anfitrión hasta que le toque a `j`. */
function ruletaA(e: EstadoPartida, j: string) {
  for (let i = 0; i < 60 && e.ruletaExtra?.jugador !== j; i++) e = juega(e, { tipo: "ruleta" });
  expect(e.ruletaExtra?.jugador).toBe(j);
  return e;
}

describe("en cualquier juego", () => {
  it("¿Qué prefieres? ya acepta comodines: cualquiera ve mesero, doble castigo y candado", () => {
    const e = juego("que-prefieres");
    expect(e.cfg.comodines).toBe(true);
    expect(comodinesUsables(e, "j2")).toEqual(["mesero", "doble-castigo", "candado"]);
    expect(vistaJugador(e, "j2").misObjetivos.mesero).toEqual(["j0", "j1", "j3"]);
  });
  it("un comodín dirigido sin elegir a quién no entra (el anfitrión lo devuelve)", () => {
    const e = juego("que-prefieres");
    expect(usa(e, "j0", "mesero")).toBe(e);
    expect(lanza(e, "j0", "mesero", "j0").duraderos).toBeUndefined();
  });
});

describe("Cambio de mesero, Salvavidas, Rebote y Candado", () => {
  it("el mesero sirve hasta que acaba el juego; se puede pasar el delantal", () => {
    let e = lanza(juego("que-prefieres"), "j0", "mesero", "j1");
    expect(vistaPublica(e).duraderos?.mesero).toMatchObject({ jugador: "j1", de: "j0" });
    expect(vistaPublica(e).cartaUsada).toMatchObject({ jugador: "j0", carta: "mesero", a: "j1" });
    expect(objetivosComodin(e, "j2", "mesero")).not.toContain("j1");
    for (const j of ["j0", "j1", "j2", "j3"]) e = juega(e, { tipo: "contestar", jugador: j, valor: "a" });
    e = juega(juega(e, { tipo: "revelar" }), { tipo: "siguiente" });
    expect(e.duraderos?.mesero?.jugador).toBe("j1");
    e = lanza(e, "j2", "mesero", "j3");
    expect(e.duraderos?.mesero).toMatchObject({ jugador: "j3", de: "j2" });
  });
  it("Salvavidas le quita el delantal a otra persona", () => {
    let e = lanza(juego("que-prefieres"), "j0", "mesero", "j1");
    expect(comodinesUsables(e, "j2")).toContain("salvavidas");
    expect(objetivosComodin(e, "j2", "salvavidas")).toEqual(["j1"]);
    e = lanza(e, "j2", "salvavidas", "j1");
    expect(e.duraderos?.mesero).toBeUndefined();
  });
  it("Rebote: el delantal regresa a quien lo dio", () => {
    let e = lanza(juego("que-prefieres"), "j0", "mesero", "j1");
    expect(comodinesUsables(e, "j1")).toContain("rebote");
    e = usa(e, "j1", "rebote");
    expect(e.duraderos?.mesero).toMatchObject({ jugador: "j0", de: "j1" });
    expect(e.cartaUsada).toMatchObject({ carta: "rebote", a: "j0" });
  });
  it("Candado: el siguiente comodín contra ti en la ronda no hace nada y se gasta", () => {
    let e = usa(juego("que-prefieres"), "j1", "candado");
    expect(comodinesUsables(e, "j1")).toEqual([]); // ya usó uno en esta ronda
    e = lanza(e, "j0", "mesero", "j1");
    expect(e.duraderos?.mesero).toBeUndefined();
    expect(e.efectos?.bloqueo).toEqual({ de: "j0", a: "j1", carta: "mesero" });
    e = lanza(e, "j2", "mesero", "j1");
    expect(e.duraderos?.mesero?.jugador).toBe("j1");
  });
  it("el Candado no para lo que ayuda (Salvavidas)", () => {
    let e = lanza(juego("que-prefieres"), "j0", "mesero", "j1");
    e = usa(e, "j1", "candado");
    e = lanza(e, "j2", "salvavidas", "j1");
    expect(e.duraderos?.mesero).toBeUndefined();
  });
});

describe("castigos de la ruleta del anfitrión", () => {
  it("Salvavidas cancela el castigo de otra persona", () => {
    let e = ruletaA(juego("que-prefieres"), "j1");
    expect(castigoDe(e, "j1")).toBe("ruleta");
    e = lanza(e, "j0", "salvavidas", "j1");
    expect(e.ruletaExtra?.anulado).toBe(true);
    expect(castigoDe(e, "j1")).toBeNull();
  });
  it("Escudo cancela tu propio castigo fuera de tu turno", () => {
    let e = ruletaA(juego("que-prefieres"), "j2");
    expect(comodinesUsables(e, "j2")).toContain("escudo");
    e = usa(e, "j2", "escudo");
    expect(e.ruletaExtra?.anulado).toBe(true);
  });
  it("Relevo: otra persona cumple tu castigo", () => {
    let e = ruletaA(juego("que-prefieres"), "j2");
    expect(objetivosComodin(e, "j2", "relevo")).toEqual(["j0", "j1", "j3"]);
    e = lanza(e, "j2", "relevo", "j3");
    expect(e.ruletaExtra).toMatchObject({ jugador: "j3", de: "j2" });
  });
  it("Doble castigo: el siguiente castigo de esa persona se cumple dos veces", () => {
    let e = lanza(juego("que-prefieres"), "j0", "doble-castigo", "j3");
    expect(e.duraderos?.trampas).toEqual([expect.objectContaining({ carta: "doble-castigo", a: "j3", de: "j0" })]);
    e = ruletaA(e, "j3");
    expect(e.ruletaExtra?.doble).toBe(true);
    expect(e.duraderos?.trampas).toEqual([]);
  });
  it("Rebote devuelve el Doble castigo a quien lo lanzó", () => {
    let e = lanza(juego("que-prefieres"), "j0", "doble-castigo", "j3");
    e = usa(e, "j3", "rebote");
    expect(e.duraderos?.trampas).toEqual([expect.objectContaining({ a: "j0", de: "j3" })]);
  });
  it("el castigo de una ronda pasada ya no se cancela", () => {
    let e = ruletaA(juego("que-prefieres"), "j1");
    for (const j of ["j0", "j1", "j2", "j3"]) e = juega(e, { tipo: "contestar", jugador: j, valor: "a" });
    e = juega(juega(e, { tipo: "revelar" }), { tipo: "siguiente" });
    expect(castigoDe(e, "j1")).toBeNull();
    expect(comodinesUsables(e, "j0")).not.toContain("salvavidas");
  });
});

describe("Contrarreloj", () => {
  it("el siguiente turno de esa persona corre con la mitad del tiempo", () => {
    let e = juego("verdad-reto", 3, 5, { herramienta: "orden", temporizador: 60 });
    const ahora = vistaPublica(e).verdadReto!.responde;
    // En orden: la siguiente ronda responde el que sigue.
    const ids = e.cfg.jugadores.map(j => j.id), siguiente = ids[(ids.indexOf(ahora) + 1) % ids.length]!;
    const lanzador = ids.find(j => j !== ahora && j !== siguiente)!;
    expect(comodinesUsables(e, lanzador)).toContain("contrarreloj");
    e = lanza(e, lanzador, "contrarreloj", siguiente);
    expect(segundosTurno(e)).toBe(60);
    e = juega(juega(e, { tipo: "saltar" }), { tipo: "siguiente" });
    expect(vistaPublica(e).verdadReto!.responde).toBe(siguiente);
    expect(e.efectos?.contrarreloj).toBe(true);
    expect(segundosTurno(e)).toBe(30);
    expect(e.duraderos?.trampas).toEqual([]);
  });
  it("sin temporizador no se ofrece", () => {
    expect(comodinesUsables(juego("verdad-reto", 3, 5, { herramienta: "orden" }), "j0")).not.toContain("contrarreloj");
  });
});

/** Verdad o reto hasta «calificar» con un reto de la app; busca una semilla donde la carta cumpla `pide`. */
function retoConCarta(pide: (e: EstadoPartida) => boolean) {
  for (let s = 1; s < 80; s++) {
    let e = juego("verdad-reto", 4, s, { herramienta: "orden" });
    const { pregunta, responde } = vistaPublica(e).verdadReto!;
    e = juega(e, { tipo: "contestar", jugador: responde, valor: { elige: "reto" } });
    e = juega(e, { tipo: "contestar", jugador: pregunta, valor: { fuente: "app" } });
    if (e.carta && pide(e)) return e;
  }
  throw new Error("no salió una carta así");
}
const cartaDe = (e: EstadoPartida) => CONTENIDO.cartas.find(c => c.id === e.carta?.id)!;

describe("Mano amiga y Duelo de dados", () => {
  it("Mano amiga: solo en retos que admiten pareja; quien ayuda queda a la vista", () => {
    const e = retoConCarta(x => admitePareja(cartaDe(x)));
    const { responde, pregunta } = vistaPublica(e).verdadReto!;
    expect(comodinesUsables(e, responde)).toContain("mano-amiga");
    expect(objetivosComodin(e, responde, "mano-amiga")).not.toContain(pregunta);
    const ayuda = objetivosComodin(e, responde, "mano-amiga")[0]!;
    const f = lanza(e, responde, "mano-amiga", ayuda);
    expect(f.efectos?.ayuda).toBe(ayuda);
  });
  it("un reto de contacto no admite ayuda ni duelo", () => {
    const e = retoConCarta(x => !!cartaDe(x).contacto);
    const { responde } = vistaPublica(e).verdadReto!;
    expect(comodinesUsables(e, responde)).not.toContain("mano-amiga");
    expect(comodinesUsables(e, responde)).not.toContain("duelo-dados");
  });
  it("Duelo de dados: quien saca menos cumple la carta", () => {
    const e = retoConCarta(x => !cartaDe(x).contacto);
    const { responde } = vistaPublica(e).verdadReto!;
    const rival = objetivosComodin(e, responde, "duelo-dados")[0]!;
    const f = lanza(e, responde, "duelo-dados", rival);
    const d = f.efectos!.duelo!;
    expect(d.dados[0]).not.toBe(d.dados[1]);
    expect(d.pierde).toBe(d.dados[0] < d.dados[1] ? responde : rival);
    expect(vistaPublica(f).verdadReto!.responde).toBe(d.pierde);
  });
  it("la marca de la carta manda sobre lo deducido", () => {
    const reto = CONTENIDO.cartas.find(c => c.mazo === "reto" && !c.contacto && !c.pidePareja && !c.texto.includes("{"))!;
    expect(admitePareja(reto)).toBe(true);
    expect(admitePareja({ ...reto, admitePareja: false })).toBe(false);
    expect(admitePareja({ ...reto, contacto: true })).toBe(false);
  });
});

describe("El impostor: Pista extra y castigo final de la nave", () => {
  const impostorDef = JUEGOS.find(j => j.id === "impostor")!;
  function nave(semilla = 4) {
    const a = armarArranque(gente(5), "impostor", 8, 2, semilla, { impostor: { cantidad: 1, tema: null, nave: true } })!;
    return crearPartida(impostorDef, a.cfg, a.semilla, CONTENIDO, a.rondas);
  }
  const impostor = (e: EstadoPartida) => Object.entries(e.privado).find(([, p]) => (p as { rol: string }).rol === "impostor")![0];
  it("el impostor ve una pista; en la TV sale como comodín secreto", () => {
    let e = nave();
    const imp = impostor(e);
    expect(comodinesUsables(e, imp)).toContain("pista-extra");
    e = usa(e, imp, "pista-extra");
    expect((e.privado[imp] as { pista?: string }).pista).toBeTruthy();
    expect(vistaPublica(e).cartaUsada).toMatchObject({ jugador: imp, carta: "secreto" });
    expect(JSON.stringify(vistaPublica(e))).not.toContain("pista-extra");
  });
  it("un civil también la puede usar para despistar (no recibe nada)", () => {
    let e = nave();
    const civil = e.cfg.jugadores.map(j => j.id).find(j => j !== impostor(e))!;
    const antes = e.privado[civil];
    e = usa(e, civil, "pista-extra");
    expect(e.privado[civil]).toEqual({ ...(antes as object), pistaExtra: true });
    e = juega(juega(e, { tipo: "saltar" }), { tipo: "revelar" });
  });
  it("Doble castigo llega al castigo final; en el resultado, Salvavidas lo cancela", () => {
    let e = nave();
    const imp = impostor(e);
    const civiles = e.cfg.jugadores.map(j => j.id).filter(j => j !== imp);
    e = lanza(e, civiles[0]!, "doble-castigo", imp);
    for (const j of vistaPublica(e).impostor!.orden) e = juega(e, { tipo: "pista", jugador: j, texto: "algo" });
    for (const j of vistaPublica(e).esperados) e = juega(e, { tipo: "contestar", jugador: j, valor: j === imp ? civiles[0] : imp });
    e = juega(e, { tipo: "revelar" });
    const r = e.revelado as { fin?: string; castigos?: Record<string, { doble?: boolean; anulado?: boolean }> };
    expect(r.fin).toBe("civiles");
    expect(r.castigos?.[imp]?.doble).toBe(true);
    expect(castigoDe(e, imp)).toBe("nave");
    e = lanza(e, civiles[1]!, "salvavidas", imp);
    expect((e.revelado as typeof r).castigos?.[imp]?.anulado).toBe(true);
  });
});

describe("filas de la base", () => {
  it("la fila «carta» con «apunta» dice a quién va el comodín que llega después", () => {
    const a = armarArranque(gente(3), "que-prefieres", 8, 2, 9)!;
    const filas: FilaAccion[] = [
      { id: "arranque-x", jugador: "j0", tipo: "control", datos: { que: "arranque", ...a }, creada: "" },
      { id: "apunta-123", jugador: "j1", tipo: "carta", datos: { que: "apunta", a: "j2" }, creada: "" },
      { id: "mesero-123", jugador: "j1", tipo: "comodin", datos: { carta: "mesero" }, creada: "" },
      { id: "mesero-456", jugador: "j0", tipo: "comodin", datos: { carta: "mesero" }, creada: "" },
    ];
    const e = reconstruir(filas, "j0")!;
    expect(e.duraderos?.mesero).toMatchObject({ jugador: "j2", de: "j1" });
    // j0 no dijo a quién: su comodín no entra y se devuelve.
    expect(e.accionesVistas).not.toContain("mesero-456");
  });
});
