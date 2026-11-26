// Pruebas del prototipo de Mini-Juegos (zona aparte): reloj, juicio del salto, rondas, contrato del canal y cuarto.
import { describe, expect, it } from "vitest";
import { acotarToque, estimar, muestra, relojListo } from "./reloj";
import { aireDe, avanzar, crearPartida, empezar, enElAire, llegada, posBala, ranking, saltar, CONFIG_BALA, type Bala, type EstadoBala, type Evento } from "./bala";
import { crearCuarto, entrar, mandar, pasoCuarto } from "./cuarto";
import { crearSecuencias, deLaTv, leer, validarDeCelular } from "./canal";

describe("reloj compartido", () => {
  it("con viaje simétrico encuentra el desfase exacto", () => {
    // El celular va 5000 ms atrás de la TV; 40 ms de ida y 40 de vuelta.
    const m = muestra(1000, 1000 + 40 + 5000, 1080)!;
    expect(m.offset).toBe(5000);
    expect(m.rtt).toBe(80);
  });
  it("con viaje asimétrico el error queda dentro de la incertidumbre (medio viaje)", () => {
    // Ida 120 ms, vuelta 20 ms: el error real es (120 − 20) / 2 = 50 ≤ 70.
    const real = 3000, m = muestra(0, 120 + real, 140)!;
    const e = estimar([m])!;
    expect(Math.abs(e.offset - real)).toBe(50);
    expect(Math.abs(e.offset - real)).toBeLessThanOrEqual(e.incertidumbre);
  });
  it("se queda con la muestra de viaje más corto", () => {
    const e = estimar([{ offset: 5030, rtt: 200 }, { offset: 5002, rtt: 30 }, { offset: 4990, rtt: 120 }])!;
    expect(e.offset).toBe(5002);
    expect(e.incertidumbre).toBe(15);
  });
  it("no deja jugar hasta tener 5 muestras con viaje razonable", () => {
    expect(relojListo(null)).toBe(false);
    expect(relojListo(estimar(Array(4).fill({ offset: 0, rtt: 40 })))).toBe(false);
    expect(relojListo(estimar(Array(5).fill({ offset: 0, rtt: 40 })))).toBe(true);
    expect(relojListo(estimar(Array(8).fill({ offset: 0, rtt: 900 })))).toBe(false);
  });
  it("rechaza toques sin hora, del futuro o viejos; acota un poco de futuro", () => {
    expect(muestra(1000, 5, 900)).toBeNull();
    expect(acotarToque(NaN, 1500)).toBeNull();
    expect(acotarToque(2000, 1500)).toBeNull();
    expect(acotarToque(100, 1500)).toBeNull();
    expect(acotarToque(1540, 1500)).toBe(1500);
    expect(acotarToque(1400, 1500)).toBe(1400);
  });
});

const dos = () => [{ id: "a", x: -1 }, { id: "b", x: 1 }];
/** Corre la partida hasta `hasta` en pasos de 10 ms y junta los eventos. */
function correr(e: EstadoBala, desde: number, hasta: number): Evento[] {
  const ev: Evento[] = [];
  for (let t = desde; t <= hasta; t += 10) ev.push(...avanzar(e, t));
  return ev;
}
/** Hora ideal para saltar: que el aire quede centrado en el encime. */
const ideal = (b: Bala, x: number, aire = CONFIG_BALA.aireMs) => llegada(b, x) - CONFIG_BALA.despegueMs - aire / 2;

describe("Esquiva la bala", () => {
  it("la bala recorre la fila a su velocidad", () => {
    const b: Bala = { id: 1, ronda: 1, dir: 1, v: 6, xInicio: -6, t0: 0 };
    expect(posBala(b, 1000)).toBe(0);
    expect(llegada(b, 3)).toBe(1500);
    expect(llegada({ ...b, dir: -1, xInicio: 6 }, 3)).toBe(500);
  });

  it("salto a tiempo salva; sin salto, eliminado", () => {
    const e = crearPartida(dos(), {}, 7);
    const [r] = empezar(e, 0);
    expect(r?.tipo).toBe("ronda");
    const b = e.balas[0]!;
    expect(saltar(e, "a", ideal(b, -1))).not.toBeNull();
    const ev = correr(e, 0, 6000);
    expect(ev).toContainEqual({ tipo: "salvado", id: "a", bala: b.id });
    expect(ev).toContainEqual({ tipo: "golpe", id: "b", bala: b.id });
    expect(e.fase).toBe("fin");
    expect(ranking(e)[0]).toEqual({ id: "a", lugar: 1, ronda: null });
  });

  it("saltar muy antes o muy tarde no salva", () => {
    for (const corrimiento of [-700, 600]) {
      const e = crearPartida(dos(), {}, 7);
      empezar(e, 0);
      const b = e.balas[0]!;
      saltar(e, "a", ideal(b, -1) + corrimiento);
      saltar(e, "b", ideal(b, 1));
      const ev = correr(e, 0, 6000);
      expect(ev).toContainEqual({ tipo: "golpe", id: "a", bala: b.id });
    }
  });

  it("una hora de toque que no es número no cuenta como salto", () => {
    const e = crearPartida(dos(), {}, 7);
    empezar(e, 0);
    expect(saltar(e, "a", NaN)).toBeNull();
    expect(saltar(e, "a", Infinity)).toBeNull();
    expect(e.saltos.get("a")).toEqual([]);
  });

  it("el margen absorbe hasta 70 ms de error de reloj en el borde, no más", () => {
    const c = CONFIG_BALA, aire = 650;
    const s = 1000, ini = s + c.despegueMs, fin = ini + 233;
    expect(enElAire(c, [{ s, aire }], ini, fin)).toBe(true);
    expect(enElAire(c, [{ s: s + 70, aire }], ini, fin)).toBe(true);
    expect(enElAire(c, [{ s: s + 80, aire }], ini, fin)).toBe(false);
  });

  it("el aire baja de 650 a 450 ms en 10 rondas, así la ventana válida se cierra aunque la bala acelere", () => {
    const c = CONFIG_BALA;
    expect(aireDe(c, 1)).toBe(650);
    expect(aireDe(c, 10)).toBe(450);
    expect(aireDe(c, 15)).toBe(450);
    // Ventana válida = aire + 2·margen − encime.
    const ventana = (k: number) => {
      const v = Math.min(c.velMax, c.vel0 * (1 + c.aumento * (k - 1)));
      return aireDe(c, k) + 2 * c.margenMs - (2 * (c.medioCuerpo + c.medioBala) / v) * 1000;
    };
    for (let k = 2; k <= 10; k++) expect(ventana(k)).toBeLessThan(ventana(k - 1));
  });

  it("aplastar el botón no sirve: no se puede saltar en el aire ni recuperándose", () => {
    const e = crearPartida(dos(), {}, 1);
    empezar(e, 0);
    expect(saltar(e, "a", 500)?.s).toBe(500);
    expect(saltar(e, "a", 600)).toBeNull();
    expect(saltar(e, "a", 500 + 80 + 650 + 299)).toBeNull();
    expect(saltar(e, "a", 500 + 80 + 650 + 300)).not.toBeNull();
  });

  it("un toque atrasado por la red pero con hora válida cuenta si llega antes de cerrar el juicio", () => {
    const e = crearPartida(dos(), {}, 7);
    empezar(e, 0);
    const b = e.balas[0]!;
    correr(e, 0, llegada(b, -1) + 100);
    saltar(e, "a", ideal(b, -1));
    expect(correr(e, llegada(b, -1) + 110, 6000)).toContainEqual({ tipo: "salvado", id: "a", bala: b.id });
  });

  it("un toque que llega después de cerrar el juicio ya no salva", () => {
    const e = crearPartida(dos(), {}, 7);
    empezar(e, 0);
    const b = e.balas[0]!;
    const ev = correr(e, 0, llegada(b, -1) + 600);
    saltar(e, "a", ideal(b, -1));
    ev.push(...correr(e, llegada(b, -1) + 610, 6000));
    expect(ev).toContainEqual({ tipo: "golpe", id: "a", bala: b.id });
  });

  it("si los dos últimos caen en la misma ronda, empatan", () => {
    const e = crearPartida([{ id: "a", x: -1 }, { id: "b", x: 1 }, { id: "c", x: 3 }], {}, 3);
    empezar(e, 0);
    const b = e.balas[0]!;
    saltar(e, "a", ideal(b, -1)); saltar(e, "b", ideal(b, 1));
    correr(e, 0, e.finFase + 20);
    expect(e.vivos.size).toBe(2);
    let t = e.finFase + 20;
    for (let i = 0; i < 6 && e.fase !== "fin"; i++) { correr(e, t, t + 8000); t += 8000; }
    expect(e.fase).toBe("fin");
    const r = ranking(e);
    expect(r.filter(l => l.lugar === 1).map(l => l.id).sort()).toEqual(["a", "b"]);
    expect(r.find(l => l.id === "c")?.lugar).toBe(3);
  });

  it("con saltos perfectos termina por tiempo antes de 60 s y empatan los que siguen; nada se juzga después", () => {
    const xs = [-4.5, -1.5, 1.5, 4.5];
    for (const semilla of [1, 2, 3, 4, 5]) {
      const e = crearPartida(xs.map((x, i) => ({ id: "j" + i, x })), {}, semilla);
      const ev: Evento[] = [];
      const saltarTodos = (balas: Bala[], aire: number) => balas.forEach(b => xs.forEach((x, i) => saltar(e, "j" + i, ideal(b, x, aire))));
      const r0 = empezar(e, 0)[0];
      if (r0?.tipo === "ronda") saltarTodos(r0.balas, r0.aire);
      let t = 0;
      while (e.fase !== "fin" && t < 70000) {
        t += 10;
        for (const x of avanzar(e, t)) { ev.push(x); if (x.tipo === "ronda") saltarTodos(x.balas, x.aire); }
      }
      expect(ev.filter(x => x.tipo === "golpe")).toEqual([]);
      const fin = ev.find(x => x.tipo === "fin");
      expect(fin && fin.tipo === "fin" && fin.porTiempo).toBe(true);
      expect(t).toBeLessThanOrEqual(60000);
      expect(ranking(e).every(l => l.lugar === 1)).toBe(true);
    }
  });

  it("dos balas en una ronda siempre dejan tiempo de caer y volver a saltar", () => {
    const c = CONFIG_BALA;
    for (let semilla = 1; semilla < 60; semilla++) {
      const e = crearPartida(dos(), {}, semilla);
      e.ronda = c.dobleDesde - 1; e.fase = "pausa"; e.finFase = 0;
      avanzar(e, 0);
      if (e.balas.length < 2) continue;
      const [b1, b2] = e.balas as [Bala, Bala];
      const aire = aireDe(c, e.ronda);
      expect(ideal(b2, -1, aire) - ideal(b1, -1, aire)).toBeGreaterThanOrEqual(c.despegueMs + aire + c.recuperaMs);
    }
  });

  it("la velocidad sube por ronda hasta el tope", () => {
    const e = crearPartida(dos(), { limiteMs: 1e9 }, 9);
    e.ronda = 40; e.fase = "pausa"; e.finFase = 0;
    avanzar(e, 0);
    expect(e.balas[0]!.v).toBe(CONFIG_BALA.velMax);
  });
});

describe("contrato del canal", () => {
  it("rechaza sobres mal formados, enormes, circulares o con BigInt sin lanzar", () => {
    expect(leer(null)).toBeNull();
    expect(leer({ de: 1, tipo: "x" })).toBeNull();
    expect(leer({ de: "a", tipo: "x".repeat(30) })).toBeNull();
    expect(leer({ de: "a", tipo: "salto", d: [1] })?.d).toEqual({});
    expect(leer({ de: "a", tipo: "x", d: { s: "x".repeat(30000) } })).toBeNull();
    const circular: Record<string, unknown> = {}; circular.yo = circular;
    expect(() => leer({ de: "a", tipo: "x", d: circular })).not.toThrow();
    expect(leer({ de: "a", tipo: "x", d: circular })).toBeNull();
    expect(leer({ de: "a", tipo: "x", d: { n: BigInt(1) } })).toBeNull();
  });
  it("valida cada tipo que manda un celular", () => {
    const m = (tipo: string, d: Record<string, unknown>, de = "c1") => validarDeCelular({ de, tipo, d });
    expect(m("salto", { n: 3, pid: "p1", s: 1000, inc: 20 })).toEqual({ n: 3, pid: "p1", s: 1000, inc: 20 });
    expect(m("salto", { n: 3, pid: "p1", s: NaN, inc: 20 })).toBeNull();
    expect(m("salto", { n: 3, s: 1000, inc: 20 })).toBeNull();
    expect(m("salto", { pid: "p1", s: 1000, inc: 20 })).toBeNull();
    expect(m("salto", { n: 3, pid: "p1", s: 1000, inc: 20 }, "tv")).toBeNull();
    expect(m("mando", { n: 1, x: 0.5, z: -1 })).toEqual({ n: 1, x: 0.5, z: -1 });
    expect(m("mando", { n: 1, x: 9, z: 0 })).toBeNull();
    expect(m("boton", { n: 1, b: "golpe" })).toEqual({ n: 1, b: "golpe" });
    expect(m("boton", { n: 1, b: "borrar" })).toBeNull();
    expect(m("raro", { n: 1 })).toBeNull();
  });
  it("el celular solo le cree a la TV", () => {
    expect(deLaTv({ de: "tv", tipo: "estado", d: {} })).toBe(true);
    expect(deLaTv({ de: "c9", tipo: "estado", d: {} })).toBe(false);
  });
  it("descarta repetidos y atrasados por remitente", () => {
    const s = crearSecuencias();
    expect(s.nueva("c1|salto", 1)).toBe(true);
    expect(s.nueva("c1|salto", 1)).toBe(false);
    expect(s.nueva("c1|salto", 3)).toBe(true);
    expect(s.nueva("c1|salto", 2)).toBe(false);
    expect(s.nueva("c2|salto", 2)).toBe(true);
  });
  it("un celular que se reconecta empieza otra vez en 1 en todos sus tipos", () => {
    const s = crearSecuencias();
    expect(s.nueva("c1|fx", 50)).toBe(true);
    expect(s.nueva("c1|mando", 40)).toBe(true);
    expect(s.nueva("c10|fx", 9)).toBe(true);
    s.olvidar("c1");
    expect(s.nueva("c1|fx", 1)).toBe(true);
    expect(s.nueva("c1|mando", 1)).toBe(true);
    expect(s.nueva("c10|fx", 9)).toBe(false); // otro celular cuyo id empieza igual no se toca
  });
});

describe("cuarto de Físico", () => {
  it("camina, corre y se queda dentro de la caja", () => {
    const e = crearCuarto({ forma: "caja", ancho: 10, fondo: 6 });
    const c = entrar(e, "a");
    mandar(e, "a", { x: 0.5, z: 0 });
    pasoCuarto(e, 100);
    expect(c.anim).toBe("caminar");
    for (let i = 0; i < 300; i++) { mandar(e, "a", { x: 1, z: 0 }); pasoCuarto(e, 16); }
    expect(c.anim).toBe("correr");
    expect(c.x).toBeLessThanOrEqual(5 - c.radio + 1e-9);
    mandar(e, "a", { x: 0, z: 0 });
    pasoCuarto(e, 16);
    expect(c.anim).toBe("reposo");
  });

  it("si el celular deja de mandar, a los 500 ms la palanca vuelve al centro", () => {
    const e = crearCuarto();
    const c = entrar(e, "a");
    mandar(e, "a", { x: 1, z: 0 });
    for (let i = 0; i < 20; i++) pasoCuarto(e, 16); // 320 ms
    expect(c.anim).toBe("correr");
    for (let i = 0; i < 625; i++) pasoCuarto(e, 16); // 10 s sin mensajes
    expect(c.anim).toBe("reposo");
  });

  it("empujado contra la pared por otro cuerpo, sigue dentro de la caja", () => {
    const e = crearCuarto({ forma: "caja", ancho: 10, fondo: 6 });
    const a = entrar(e, "a"), b = entrar(e, "b");
    const lim = 5 - a.radio;
    Object.assign(a, { x: lim, z: 0 }); Object.assign(b, { x: lim - 0.1, z: 0 });
    for (let i = 0; i < 30; i++) { mandar(e, "b", { x: 1, z: 0 }); pasoCuarto(e, 16); }
    for (const c of [a, b]) {
      expect(Math.abs(c.x)).toBeLessThanOrEqual(5 - c.radio + 1e-9);
      expect(Math.abs(c.z)).toBeLessThanOrEqual(3 - c.radio + 1e-9);
    }
  });

  it("salta, cae y aterriza", () => {
    const e = crearCuarto();
    const c = entrar(e, "a");
    mandar(e, "a", { x: 0, z: 0, saltar: true });
    pasoCuarto(e, 16);
    expect(c.anim).toBe("saltar");
    const vistas = new Set<string>();
    for (let i = 0; i < 120; i++) { pasoCuarto(e, 16); vistas.add(c.anim); }
    expect(vistas.has("caer")).toBe(true);
    expect(vistas.has("aterrizar")).toBe(true);
    expect(c.enPiso).toBe(true);
    expect(c.y).toBe(0);
  });

  it("tres golpes de frente tumban; de espaldas no pega", () => {
    const e = crearCuarto();
    const a = entrar(e, "a"), b = entrar(e, "b");
    Object.assign(a, { x: 0, z: 0, rot: 0 }); Object.assign(b, { x: 0, z: 1.2, rot: Math.PI });
    const tipos: string[] = [];
    for (let g = 0; g < 3; g++) {
      mandar(e, "a", { x: 0, z: 0, golpe: true });
      for (let i = 0; i < 70; i++) tipos.push(...pasoCuarto(e, 16).map(x => x.tipo));
      Object.assign(b, { x: 0, z: 1.2, empujeX: 0, empujeZ: 0 });
    }
    expect(tipos.filter(t => t === "golpe")).toHaveLength(3);
    expect(tipos).toContain("ko");
    const e2 = crearCuarto();
    const c = entrar(e2, "c"), d = entrar(e2, "d");
    Object.assign(c, { x: 0, z: 0, rot: Math.PI }); Object.assign(d, { x: 0, z: 1.2 });
    mandar(e2, "c", { x: 0, z: 0, golpe: true });
    const ev: string[] = [];
    for (let i = 0; i < 70; i++) ev.push(...pasoCuarto(e2, 16).map(x => x.tipo));
    expect(ev).not.toContain("golpe");
  });

  it("dos golpes simultáneos pegan los dos, sin importar el orden de entrada", () => {
    for (const orden of [["a", "b"], ["b", "a"]]) {
      const e = crearCuarto();
      for (const id of orden) entrar(e, id);
      const a = e.cuerpos.get("a")!, b = e.cuerpos.get("b")!;
      Object.assign(a, { x: 0, z: 0, rot: 0 }); Object.assign(b, { x: 0, z: 1.2, rot: Math.PI });
      mandar(e, "a", { x: 0, z: 0, golpe: true }); mandar(e, "b", { x: 0, z: 0, golpe: true });
      const ev = [];
      for (let i = 0; i < 40; i++) ev.push(...pasoCuarto(e, 16));
      const golpes = ev.filter(x => x.tipo === "golpe").map(x => (x as { de: string }).de).sort();
      expect(golpes).toEqual(["a", "b"]);
    }
  });

  it("en la plataforma, caminar o saltar hacia fuera hace caer y reaparecer en el centro", () => {
    for (const saltando of [false, true]) {
      const e = crearCuarto({ forma: "plataforma", radio: 3 });
      const c = entrar(e, "a");
      Object.assign(c, { x: saltando ? 2.6 : 0, z: 0 });
      const ev: string[] = [];
      for (let i = 0; i < 400; i++) {
        if (!c.cayendo && i < 40) mandar(e, "a", { x: 1, z: 0, saltar: saltando && i === 0 });
        ev.push(...pasoCuarto(e, 16).map(x => x.tipo));
      }
      expect(ev).toContain("cae");
      expect(Math.hypot(c.x, c.z)).toBeLessThan(3);
      expect(c.enPiso).toBe(true);
      expect(c.y).toBe(0);
    }
  });

  it("no se enciman", () => {
    const e = crearCuarto();
    const a = entrar(e, "a"), b = entrar(e, "b");
    Object.assign(a, { x: 0, z: 0 }); Object.assign(b, { x: 0.1, z: 0 });
    pasoCuarto(e, 16);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(a.radio + b.radio - 1e-9);
  });
});

import { agregarJugador, asignar, cambioDeArbitro, crearFisico, darPuntos, nuevaRonda, perdio, responder, revelar, tabla, tapar, CASTIGOS, CATEGORIAS, RETOS } from "./fisico";
import { azarCon } from "./bala";

describe("sala de Físico: Palabra prohibida", () => {
  it("cada ronda trae categoría y una palabra que no se repite hasta agotar", () => {
    const e = crearFisico(["a", "b"]);
    const azar = azarCon(4), vistas = new Set<string>();
    const cat = CATEGORIAS.find(c => c.id === "scooby")!;
    for (let i = 0; i < cat.palabras.length; i++) {
      const r = nuevaRonda(e, azar, "scooby");
      expect(r.categoria.id).toBe("scooby");
      expect(vistas.has(r.palabra)).toBe(false);
      vistas.add(r.palabra);
      expect(r.revelada).toBe(false);
    }
    expect(vistas.size).toBe(cat.palabras.length);
    expect(nuevaRonda(e, azar, "scooby").n).toBe(cat.palabras.length + 1); // ya agotada: vuelve a empezar
  });
  it("marcar quién la dijo revela la palabra; solo uno pierde por ronda", () => {
    const e = crearFisico(["a", "b"]);
    nuevaRonda(e, azarCon(1));
    expect(perdio(e, "zz")).toBe(false);
    expect(perdio(e, "b")).toBe(true);
    expect(e.ronda!.revelada).toBe(true);
    expect(perdio(e, "a")).toBe(false);
    const e2 = crearFisico(["a"]); nuevaRonda(e2, azarCon(2)); expect(revelar(e2)).toBe(true);
  });
  it("un solo control de visibilidad: tapada al empezar, se tapa y destapa, y tras «la dijo» ya no se tapa", () => {
    const e = crearFisico(["a", "b"]);
    expect(nuevaRonda(e, azarCon(3)).revelada).toBe(false);
    expect(nuevaRonda(e, azarCon(3), undefined, true).revelada).toBe(true);
    expect(tapar(e)).toBe(true); expect(e.ronda!.revelada).toBe(false);
    revelar(e); perdio(e, "a");
    expect(tapar(e)).toBe(false); expect(e.ronda!.revelada).toBe(true);
  });
  it("si cambia el anfitrión con la palabra tapada, la ronda se anula y la siguiente sigue la cuenta", () => {
    const e = crearFisico(["ana", "beto"]);
    nuevaRonda(e, azarCon(1), undefined, false, "ana");
    expect(cambioDeArbitro(e, "ana")).toBe(false);
    expect(cambioDeArbitro(e, "beto")).toBe(true); // Ana se fue: Beto recibiría la palabra
    expect(e.ronda).toBeNull();
    expect(nuevaRonda(e, azarCon(2), undefined, false, "beto").n).toBe(2);
    revelar(e);
    expect(cambioDeArbitro(e, "ana")).toBe(false); // a la vista: todos la conocen, no se anula
    nuevaRonda(e, azarCon(3), undefined, false, "beto"); perdio(e, "ana");
    expect(cambioDeArbitro(e, "ana")).toBe(false); // ya decidida
  });
  it("si la TV se recarga, quien vuelve a entrar recupera sus puntos", () => {
    const e = crearFisico([], { a: 7, b: 2 });
    agregarJugador(e, "a"); agregarJugador(e, "c");
    expect(e.puntos.get("a")).toBe(7);
    expect(e.puntos.get("c")).toBe(0);
  });
  it("puntos a mano: enteros de −5 a 10, el total nunca baja de 0", () => {
    const e = crearFisico(["a", "b"]);
    expect(darPuntos(e, "a", 3)).toBe(3);
    expect(darPuntos(e, "a", -5)).toBe(0);
    expect(darPuntos(e, "a", 11)).toBeNull();
    expect(darPuntos(e, "a", 1.5)).toBeNull();
    expect(darPuntos(e, "a", 0)).toBeNull();
    expect(darPuntos(e, "x", 2)).toBeNull();
    darPuntos(e, "b", 2); darPuntos(e, "a", 2);
    expect(tabla(e).map(f => f.lugar)).toEqual([1, 1]);
  });
  it("tomar algo nunca da puntos y nunca exige alcohol; el castigo no cambia puntos", () => {
    const beber = CASTIGOS.find(c => c.trago)!;
    expect(beber.texto.toLowerCase()).toContain("lo que tú elijas");
    expect(beber.texto.toLowerCase()).not.toMatch(/alcohol|cerveza|shot|tequila/);
    const e = crearFisico(["a"]);
    darPuntos(e, "a", 4);
    expect(asignar(e, "a", "castigo", "beber")).toBe("aplicado");
    expect(e.puntos.get("a")).toBe(4);
  });
  it("lo de contacto espera el sí de quien lo recibe; si dice que no, toca uno sin contacto", () => {
    const e = crearFisico(["a", "b"]);
    expect(asignar(e, "a", "castigo", "globo")).toBe("pendiente");
    expect(asignar(e, "a", "castigo", "sentadillas")).toBeNull(); // uno a la vez
    expect(responder(e, "b", true, azarCon(1))).toBeNull(); // otro no puede contestar por ella
    const r = responder(e, "a", false, azarCon(1))!;
    expect(r.estado).toBe("rechazado");
    expect(r.alternativa!.contacto).toBe(false);
    expect(asignar(e, "b", "castigo", "globo")).toBe("pendiente");
    expect(responder(e, "b", true, azarCon(1))!.estado).toBe("aplicado");
    // Ningún reto involucra a otra persona (su consentimiento no se pide todavía; Codex O2).
    expect(RETOS.filter(x => x.contacto)).toEqual([]);
  });
  it("entra alguien a mitad con 0 puntos", () => {
    const e = crearFisico(["a"], { a: 5 });
    agregarJugador(e, "b");
    expect(e.puntos.get("b")).toBe(0);
    expect(tabla(e)[0]).toEqual({ id: "a", puntos: 5, lugar: 1 });
  });
  it("el canal valida las acciones de la sala", () => {
    const m = (tipo: string, d: Record<string, unknown>) => validarDeCelular({ de: "c1", tipo, d });
    expect(m("fx", { n: 1, a: "puntos", id: "c2", n2: 3 })).toEqual({ n: 1, a: "puntos", id: "c2", n2: 3 });
    expect(m("fx", { n: 1, a: "puntos", id: "c2", n2: 30 })).toBeNull();
    expect(m("fx", { n: 1, a: "borrar", id: "c2" })).toBeNull();
    expect(m("fx", { n: 1, a: "castigo", id: "<b>", c: "globo" })).toBeNull();
    expect(m("gesto", { n: 1, g: "festejo" })).toEqual({ n: 1, g: "festejo" });
    expect(m("gesto", { n: 1, g: "bailar" })).toBeNull();
    expect(m("acepta", { n: 1, si: true })).toEqual({ n: 1, si: true });
    expect(m("acepta", { n: 1, si: "sí" })).toBeNull();
  });
});
