// Pruebas del prototipo de Mini-Juegos (zona aparte): reloj, juicio del salto, rondas, contrato del canal y cuarto.
import { describe, expect, it } from "vitest";
import * as desenfunda from "./desenfunda";
import * as martillazo from "./martillazo";
import * as paracaidas from "./paracaidas";
import codigoParacaidasTv from "../../../tools/personajes/minijuegos/tv-paracaidas.js?raw";
import * as alto from "./altoTotal";
import { acotarToque, estimar, muestra, relojListo } from "./reloj";
import { aireDe, avanzar, crearPartida, empezar, enElAire, llegada, posBala, ranking, saltar, CONFIG_BALA, type Bala, type EstadoBala, type Evento } from "./bala";
import { alargar, crearCuarto, entrar, mandar, pasoCuarto } from "./cuarto";
import { abrirCanalNube, crearSecuencias, deLaTv, idDeLlave, leer, validarDeCelular, SERVIDOR, TV, type Mensaje } from "./canal";
import { JUEGO_XP, RONDAS_XP, resultadosXp } from "./xpSala";

describe("Paracaídas", () => {
  const jugadores = ["a", "b", "c", "d", "e"].map(id => ({ id }));
  function preparar() {
    const e = paracaidas.crearPartida(jugadores, { caidaMs: [5000, 5000] }, () => 0);
    paracaidas.empezar(e, 1000);
    return e;
  }
  it("altura común a 20 m/s desde los pies, independiente de tamaños", () => {
    const e = preparar();
    expect(e.jugadores).toEqual(jugadores);
    expect(paracaidas.altura(e, 1000)).toBe(100);
    expect(paracaidas.altura(e, 2000)).toBe(80);
    expect(paracaidas.altura(e, 2500)).toBe(70);
    expect(paracaidas.altura(e, 6100)).toBe(0);
  });
  it("T no aparece en los eventos anteriores al impacto", () => {
    const e = paracaidas.crearPartida(jugadores, {}, () => 0.812);
    const ev = paracaidas.empezar(e, 1000);
    expect(ev).toEqual([{ tipo: "ronda", ronda: 1 }]);
    ev.push(...paracaidas.abrir(e, "a", 2000));
    ev.push(...paracaidas.avanzar(e, e.impacto - 1));
    expect(ev).toEqual([
      { tipo: "ronda", ronda: 1 }, { tipo: "abre", id: "a" },
      { tipo: "aterriza", id: "a", altura: paracaidas.altura(e, 2400) },
    ]);
    expect(JSON.stringify(ev)).not.toContain(String(e.impacto));
    expect(JSON.stringify(ev)).not.toContain(String(e.impacto - e.inicioRonda));
  });
  it("400 ms para abrir, después 250 ms para confirmar la altura al completar la apertura", () => {
    const e = preparar();
    expect(paracaidas.abrir(e, "a", 2000)).toEqual([{ tipo: "abre", id: "a" }]);
    expect(e.aperturas.get("a")).toEqual({ s: 2000, fin: 2400, altura: 72 });
    expect(paracaidas.avanzar(e, 2399)).toEqual([]);
    expect(paracaidas.avanzar(e, 2649)).toEqual([]);
    expect(paracaidas.avanzar(e, 2650)).toEqual([{ tipo: "aterriza", id: "a", altura: 72 }]);
  });
  it("una llegada 240 ms después conserva la hora del toque y espera su juicio", () => {
    const e = preparar();
    expect(paracaidas.abrir(e, "a", 5550, 5790)).toEqual([{ tipo: "abre", id: "a" }]);
    expect(paracaidas.avanzar(e, 6199)).toEqual([]);
    expect(paracaidas.avanzar(e, 6200)).toEqual([{ tipo: "aterriza", id: "a", altura: 1 }]);
  });
  it("azar inyectable y eventos previos al impacto sin T ni duración", () => {
    const e = paracaidas.crearPartida(jugadores, {}, () => 0.5);
    expect(paracaidas.empezar(e, 0)).toEqual([{ tipo: "ronda", ronda: 1 }]);
    expect(e.impacto).toBe(4750); // 3500 + 0.5 × 2500
    const ev = [...paracaidas.abrir(e, "a", 4000), ...paracaidas.avanzar(e, 4749)];
    expect(ev).toEqual([{ tipo: "abre", id: "a" }, { tipo: "aterriza", id: "a", altura: 7 }]);
    expect(JSON.stringify(ev)).not.toMatch(/impacto|caidaMs|duracion|"T"/);
    expect(paracaidas.empezar(e, 0)).toEqual([]);
  });
  it("la caída dura entre 3.5 y 6 s (decisión P2 de Codex)", () => {
    expect(paracaidas.CONFIG_PARACAIDAS.caidaMs).toEqual([3500, 6000]);
    for (const r of [0, 0.5, 0.999]) {
      const e = paracaidas.crearPartida([{ id: "a" }], {}, () => r);
      paracaidas.empezar(e, 1000);
      expect(e.impacto - 1000).toBeGreaterThanOrEqual(3500);
      expect(e.impacto - 1000).toBeLessThanOrEqual(6000);
    }
  });
  it("apertura de 400 ms y confirmación 250 ms después, con altura al completarse", () => {
    const e = preparar();
    expect(paracaidas.abrir(e, "a", 5000)).toEqual([{ tipo: "abre", id: "a" }]);
    expect(e.aperturas.get("a")).toEqual({ s: 5000, fin: 5400, altura: 12 });
    expect(paracaidas.avanzar(e, 5399)).toEqual([]);
    expect(paracaidas.avanzar(e, 5649)).toEqual([]);
    expect(paracaidas.avanzar(e, 5650)).toEqual([{ tipo: "aterriza", id: "a", altura: 12 }]);
  });
  it("aterriza justo con 70 ms de tolerancia; con 71 se estrella", () => {
    const e = preparar();
    paracaidas.abrir(e, "a", 5670); paracaidas.abrir(e, "b", 5671);
    const ev = paracaidas.avanzar(e, 6320);
    expect(ev).toContainEqual({ tipo: "aterriza", id: "a", altura: 0 });
    expect(ev).toContainEqual({ tipo: "estrella", id: "b" });
    expect(e.resultados.get("a")).toBe(0);
  });
  it("acepta hora atrasada por red dentro de los 250 ms sin usar la llegada para la altura", () => {
    const e = preparar();
    paracaidas.avanzar(e, 6100);
    const ev = paracaidas.abrir(e, "a", 5500, 6249);
    expect(ev).toContainEqual({ tipo: "abre", id: "a" });
    expect(ev).toContainEqual({ tipo: "aterriza", id: "a", altura: 2 });
    expect(e.aperturas.get("a")?.s).toBe(5500);
  });
  it("después del juicio el toque no resucita al jugador, aunque no se haya avanzado antes", () => {
    const e = preparar();
    expect(paracaidas.abrir(e, "a", 5500, 6250)).not.toContainEqual({ tipo: "abre", id: "a" });
    expect(e.resultados.get("a")).toBeNull();
  });
  it("ignora segundo toque, desconocidos, horas inválidas y anteriores al inicio menos 70", () => {
    const e = preparar();
    expect(paracaidas.abrir(e, "a", 929)).toEqual([]);
    expect(paracaidas.abrir(e, "x", 1000)).toEqual([]);
    for (const n of [NaN, Infinity]) {
      expect(paracaidas.abrir(e, "a", n)).toEqual([]);
      expect(paracaidas.abrir(e, "a", 1000, n)).toEqual([]);
    }
    expect(paracaidas.abrir(e, "a", 930)).toEqual([{ tipo: "abre", id: "a" }]);
    expect(paracaidas.abrir(e, "a", 1100)).toEqual([]);
    expect(e.aperturas.get("a")?.s).toBe(930);
  });
  it("puntos N, N−1: empates comparten lugar y saltan lugares; estrellados y sin toque valen 0", () => {
    const e = preparar();
    // Llegan juntos: las horas de toque, no el orden de recepción, fijan los lugares.
    paracaidas.abrir(e, "c", 5200, 5600);
    paracaidas.abrir(e, "a", 5500, 5600); paracaidas.abrir(e, "b", 5500, 5600);
    paracaidas.abrir(e, "d", 5800);
    const ev = paracaidas.avanzar(e, 6250);
    expect(ev).toContainEqual({ tipo: "puntos", ronda: 1, tabla: [
      { id: "a", altura: 2, lugar: 1, puntos: 5 }, { id: "b", altura: 2, lugar: 1, puntos: 5 },
      { id: "c", altura: 8, lugar: 3, puntos: 3 },
      { id: "d", altura: null, lugar: 4, puntos: 0 }, { id: "e", altura: null, lugar: 4, puntos: 0 },
    ] });
  });
  it("sin empate otorga N, N−1, N−2", () => {
    const e = preparar();
    for (const [i, id] of ["a", "b", "c"].entries()) paracaidas.abrir(e, id, 5500 - i * 100, 5500);
    paracaidas.avanzar(e, 6250);
    expect([...e.puntos.values()]).toEqual([5, 4, 3, 0, 0]);
  });
  it("tres rondas con pausa CONFIG_BALA, suma acumulada y empate final compartido", () => {
    const e = preparar();
    let t = 1000;
    for (let ronda = 1; ronda <= 3; ronda++) {
      for (const id of ["a", "b"]) paracaidas.abrir(e, id, t + 4500);
      const ev = paracaidas.avanzar(e, t + 5250);
      expect(ev.filter(x => x.tipo === "puntos")).toHaveLength(1);
      if (ronda < 3) {
        expect(e.fase).toBe("pausa");
        expect(paracaidas.abrir(e, "c", t + 5300)).toEqual([]);
        expect(e.finFase).toBe(t + 5250 + CONFIG_BALA.pausaMs);
        expect(paracaidas.avanzar(e, e.finFase - 1)).toEqual([]);
        t = e.finFase;
        expect(paracaidas.avanzar(e, t)).toEqual([{ tipo: "ronda", ronda: ronda + 1 }]);
        expect(e.aperturas.size).toBe(0); expect(e.resultados.size).toBe(0);
      } else expect(ev).toContainEqual({ tipo: "fin", ranking: [
        { id: "a", lugar: 1, puntos: 15 }, { id: "b", lugar: 1, puntos: 15 },
        { id: "c", lugar: 3, puntos: 0 }, { id: "d", lugar: 3, puntos: 0 }, { id: "e", lugar: 3, puntos: 0 },
      ] });
    }
    expect(e.fase).toBe("fin"); expect(paracaidas.avanzar(e, 1e9)).toEqual([]);
  });
  it("aunque todos abran temprano, espera el impacto para cerrar la ronda", () => {
    const e = preparar();
    for (const j of jugadores) paracaidas.abrir(e, j.id, 1000);
    expect(paracaidas.avanzar(e, 2000).some(x => x.tipo === "puntos")).toBe(false);
    expect(e.fase).toBe("ronda");
    expect(paracaidas.avanzar(e, 6250).some(x => x.tipo === "puntos")).toBe(true);
  });
  it("gana la suma de las tres rondas, aunque otro gane la segunda", () => {
    const e = paracaidas.crearPartida([{ id: "a" }, { id: "b" }], { caidaMs: [5000, 5000] }, 7);
    paracaidas.empezar(e, 0);
    let ev: paracaidas.Evento[] = [];
    for (let ronda = 1; ronda <= 3; ronda++) {
      const t = e.inicioRonda;
      paracaidas.abrir(e, "a", t + (ronda === 2 ? 4400 : 4500), t + 4500);
      paracaidas.abrir(e, "b", t + (ronda === 2 ? 4500 : 4400), t + 4500);
      ev = paracaidas.avanzar(e, t + 5250);
      if (ronda < 3) paracaidas.avanzar(e, e.finFase);
    }
    expect(ev).toContainEqual({ tipo: "fin", ranking: [
      { id: "a", lugar: 1, puntos: 5 }, { id: "b", lugar: 2, puntos: 4 },
    ] });
  });
  it("O2: seis cuerpos, domos y etiquetas bajo franja a 1280×720 en las 20 combinaciones de tres abiertos arriba", () => {
    // Ejecuta la función real de la TV. La proyección independiente comprueba las cajas 3D y los 62 px de etiqueta.
    const codigo = codigoParacaidasTv.slice(codigoParacaidasTv.indexOf("export function encuadrarGrupo"),
      codigoParacaidasTv.indexOf("const v = new THREE.Vector3")).replace("export ", "");
    const encuadrar = new Function("ETIQUETA", codigo + "; return encuadrarGrupo;")(62);
    const W = 1280, H = 720, franja = Math.round(H * 0.13 + Math.min(260, H * 0.36));
    const tan = Math.tan(32 * Math.PI / 360), altos = [2.7, 2.7, 2.7, 2.7, 4.6, 5.5];
    // Cajas conservadoras: ancho igual al alto, más los domos creados por la TV (radio = ancho × .8).
    const radios = altos.map(h => Math.max(3.2, h * 1.6) / 2);
    const camera = {
      fov: 32, position: { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { Object.assign(this, { x, y, z }); } },
      lookAt() {}, updateProjectionMatrix() {}, updateMatrixWorld() {},
    };
    const proyectar = (x: number, y: number, z = 0) => ({
      x: W / 2 + (x - camera.position.x) * H / (2 * tan * (camera.position.z - z)),
      y: H / 2 - (y - camera.position.y) * H / (2 * tan * (camera.position.z - z)),
    });
    let casos = 0;
    for (let mask = 0; mask < 64; mask++) {
      if (mask.toString(2).replace(/0/g, "").length !== 3) continue;
      casos++;
      // 32.5 unidades es el máximo inicial (130 m); ningún abierto puede quedar por encima.
      const figuras = altos.map((h, i) => ({ h, r: radios[i]!, y: mask >> i & 1 ? 32.5 : 0.05, abierto: !!(mask >> i & 1), x: 0 }));
      const limites = { minX: -30, maxX: 30, minY: 0,
        maxY: Math.max(...figuras.map(p => p.y + p.h + (p.abierto ? 1.1 + p.r * 0.65 : 0) + 0.35)),
        profundidad: Math.max(...radios) };
      encuadrar(camera, limites, W, H, franja);
      const escala = H / (2 * camera.position.z * tan);
      const paso = Math.max(...radios.map(r => 2 * r + 1), (Math.min(180, W * 0.14) + 12) / escala);
      figuras.forEach((p, i) => { p.x = (i - 2.5) * paso; });
      limites.minX = Math.min(-6, ...figuras.map(p => p.x - p.r));
      limites.maxX = Math.max(6, ...figuras.map(p => p.x + p.r));
      encuadrar(camera, limites, W, H, franja);
      for (const p of figuras) {
        const techo = p.y + p.h + (p.abierto ? 1.1 + p.r * 0.65 : 0);
        const puntos = [];
        for (const x of [p.x - p.r, p.x + p.r]) for (const y of [p.y, techo]) for (const z of [-p.r, p.r]) puntos.push(proyectar(x, y, z));
        const etiqueta = proyectar(p.x, techo + 0.35);
        puntos.push({ x: etiqueta.x - 89.6, y: etiqueta.y - 62 }, { x: etiqueta.x + 89.6, y: etiqueta.y });
        for (const punto of puntos) {
          expect(punto.y).toBeGreaterThanOrEqual(franja); expect(punto.y).toBeLessThanOrEqual(H - 24);
          expect(punto.x).toBeGreaterThanOrEqual(0); expect(punto.x).toBeLessThanOrEqual(W);
        }
      }
    }
    expect(casos).toBe(20);
  });
});

describe("Alto total", () => {
  function preparar(cfg: Partial<alto.ConfigAltoTotal> = {}) {
    const e = alto.crearPartida([{ id: "a" }, { id: "big-fig" }], cfg, () => 0);
    expect(alto.empezar(e, 0)).toEqual([{ tipo: "luz", color: "verde" }]);
    return e;
  }
  const mandar = (e: alto.EstadoAltoTotal, a: alto.Entrada["a"], s: number, llegada = s, id = "a") =>
    alto.recibir(e, id, { a, s }, llegada);
  function correr(e: alto.EstadoAltoTotal, desde: number, hasta: number, id = "a") {
    mandar(e, "aprieta", desde, desde, id);
    for (let s = desde + 250; s <= hasta; s += 250) mandar(e, "latido", s, s, id);
  }
  it("solo suma verde, incluso durante la gracia, y Big Fig corre a la misma velocidad", () => {
    const e = preparar();
    for (const id of ["a", "big-fig"]) {
      correr(e, 0, 1500, id); mandar(e, "suelta", 1800, 1800, id);
      expect(alto.posicion(e, id, 1800)).toBe(1.5);
    }
    expect(alto.avanzar(e, 3500)).toContainEqual({ tipo: "luz", color: "verde" });
  });
  it("no aplica KO hasta rojo + 370 + 250, aunque haya prueba de pulsación", () => {
    const e = preparar(); correr(e, 0, 1750);
    expect(mandar(e, "latido", 1870)).not.toContainEqual({ tipo: "atrapado", id: "a" });
    expect(alto.avanzar(e, 2119)).toEqual([]);
    expect(alto.avanzar(e, 2120)).toContainEqual({ tipo: "atrapado", id: "a" });
  });
  it.each([1800, 1869])("soltar a %i dentro de la gracia no castiga", s => {
    const e = preparar(); correr(e, 0, 1750); mandar(e, "suelta", s);
    expect(alto.avanzar(e, 2300)).not.toContainEqual({ tipo: "atrapado", id: "a" });
    expect(alto.posicion(e, "a", 2300)).toBe(1.5);
  });
  it("rojo + 370 es inclusivo: el intervalo que no terminó antes de ahí sí castiga", () => {
    const e = preparar(); correr(e, 0, 1750); mandar(e, "suelta", 1870);
    expect(alto.avanzar(e, 2119)).toEqual([]);
    expect(alto.avanzar(e, 2120)).toContainEqual({ tipo: "atrapado", id: "a" });
  });
  it("admite suelta atrasada en la ventana de juicio antes de juzgar", () => {
    const e = preparar(); correr(e, 0, 1750);
    alto.avanzar(e, 2000);
    expect(mandar(e, "suelta", 1830, 2070)).not.toContainEqual({ tipo: "atrapado", id: "a" });
    expect(alto.avanzar(e, 2200)).toEqual([]);
  });
  it("una suelta atrasada recalcula y puede bajar la posición", () => {
    const e = preparar(); correr(e, 0, 750);
    expect(alto.posicion(e, "a", 1000)).toBe(1);
    mandar(e, "suelta", 800, 1040);
    expect(alto.posicion(e, "a", 1040)).toBe(0.8);
  });
  it.each([1500, 1750])("sin latidos acaba en el último latido %i; desconectarse no castiga", ultimo => {
    const e = preparar(); correr(e, 0, ultimo);
    expect(alto.avanzar(e, ultimo + 600)).not.toContainEqual({ tipo: "atrapado", id: "a" });
    expect(alto.posicion(e, "a", 4000)).toBe(1.5);
    expect(alto.avanzar(e, 4000)).not.toContainEqual({ tipo: "atrapado", id: "a" });
  });
  it("sin más latidos ni siquiera una aprieta al final de verde se prolonga hasta rojo", () => {
    const e = preparar(); mandar(e, "aprieta", 1490);
    expect(alto.avanzar(e, 2200)).not.toContainEqual({ tipo: "atrapado", id: "a" });
    expect(alto.posicion(e, "a", 2200)).toBe(0);
  });
  it("un latido aislado no inventa un intervalo de carrera, pero sí prueba pulsación en rojo", () => {
    const e = preparar(); mandar(e, "latido", 100); mandar(e, "latido", 350);
    expect(alto.posicion(e, "a", 500)).toBe(0);
    mandar(e, "latido", 2000);
    expect(alto.avanzar(e, 2250)).toContainEqual({ tipo: "atrapado", id: "a" });
  });
  it("KO de 1 s, posición cero y después exige soltar y volver a apretar", () => {
    const e = preparar(); correr(e, 0, 2000);
    expect(alto.avanzar(e, 2120)).toContainEqual({ tipo: "atrapado", id: "a" });
    expect(e.jugadores[0]!.koHasta).toBe(3120);
    expect(alto.posicion(e, "a", 2120)).toBe(0);
    mandar(e, "suelta", 2500); mandar(e, "aprieta", 3000);
    for (let s = 3250; s <= 4000; s += 250) mandar(e, "latido", s);
    expect(alto.posicion(e, "a", 4000)).toBe(0);
    mandar(e, "suelta", 4100); mandar(e, "latido", 4200);
    expect(alto.posicion(e, "a", 4200)).toBe(0);
    mandar(e, "aprieta", 4250); mandar(e, "latido", 4500);
    expect(alto.posicion(e, "a", 4500)).toBe(0.25);
  });
  it("si ya soltó antes del juicio, tras el KO basta una aprieta nueva (no le pide otra suelta)", () => {
    const e = preparar(); correr(e, 0, 1750); mandar(e, "suelta", 1900);
    expect(alto.avanzar(e, 2120)).toContainEqual({ tipo: "atrapado", id: "a" });
    expect(e.jugadores[0]!.exigeSoltar).toBe(false);
    mandar(e, "aprieta", 3000); // durante el KO (termina en 3120): no cuenta
    mandar(e, "suelta", 3050);
    mandar(e, "aprieta", 3600); mandar(e, "latido", 3850); mandar(e, "latido", 4100);
    expect(alto.posicion(e, "a", 4100)).toBe(0.5);
  });
  it("una suelta atrasada que llega después del KO también lo desbloquea", () => {
    const e = preparar(); correr(e, 0, 2000);
    expect(alto.avanzar(e, 2120)).toContainEqual({ tipo: "atrapado", id: "a" });
    expect(e.jugadores[0]!.exigeSoltar).toBe(true);
    mandar(e, "suelta", 2050, 2200); // soltó antes del juicio pero el mensaje llegó después
    mandar(e, "aprieta", 3600); mandar(e, "latido", 3850);
    expect(alto.posicion(e, "a", 3850)).toBe(0.25);
  });
  it("confirma el cruce a los 250 ms y comparte lugar con cruces simultáneos", () => {
    const e = preparar({ verdeMinMs: 10000, verdeMaxMs: 10000 });
    for (let s = 0; s <= 7000; s += 250) for (const id of ["a", "big-fig"]) {
      mandar(e, s ? "latido" : "aprieta", s, s, id);
    }
    expect(alto.avanzar(e, 7249)).toEqual([]);
    const ev = alto.avanzar(e, 7250);
    expect(ev.filter(x => x.tipo === "cruza")).toHaveLength(2);
    expect(ev).toContainEqual({ tipo: "fin", porTiempo: false, ranking: [
      { id: "a", lugar: 1, cruce: 7000, distancia: 7 }, { id: "big-fig", lugar: 1, cruce: 7000, distancia: 7 },
    ] });
  });
  it("no confirma cruce especulativo si dejan de llegar latidos antes de la meta", () => {
    const e = preparar({ verdeMinMs: 10000, verdeMaxMs: 10000 }); correr(e, 0, 6750);
    expect(alto.posicion(e, "a", 7000)).toBe(7);
    expect(alto.avanzar(e, 7250)).toEqual([]);
    expect(alto.posicion(e, "a", 7350)).toBe(6.75);
  });
  it("suelta atrasada antes del cruce impide confirmarlo", () => {
    const e = preparar({ verdeMinMs: 10000, verdeMaxMs: 10000 }); correr(e, 0, 6750);
    mandar(e, "suelta", 6900, 7100);
    expect(alto.avanzar(e, 7250)).toEqual([]);
    expect(alto.posicion(e, "a", 7250)).toBe(6.9);
  });
  it("el primer cruce manda; el resto queda por distancia", () => {
    const e = preparar({ verdeMinMs: 10000, verdeMaxMs: 10000 });
    for (let s = 0; s <= 7000; s += 250) {
      mandar(e, s ? "latido" : "aprieta", s);
      if (s >= 250) mandar(e, s === 250 ? "aprieta" : "latido", s, s, "big-fig");
    }
    mandar(e, "suelta", 7000, 7000, "big-fig");
    alto.avanzar(e, 7250);
    expect(alto.ranking(e).map(x => [x.id, x.lugar, x.cruce, x.distancia])).toEqual([
      ["a", 1, 7000, 7], ["big-fig", 2, null, 6.75],
    ]);
  });
  it("se sigue avanzando hasta la confirmación del primer cruce", () => {
    const e = preparar({ verdeMinMs: 10000, verdeMaxMs: 10000 });
    for (let s = 0; s <= 7250; s += 250) {
      if (s <= 7000) mandar(e, s ? "latido" : "aprieta", s);
      if (s >= 1000) mandar(e, s === 1000 ? "aprieta" : "latido", s, s, "big-fig");
    }
    expect(e.fase).toBe("fin"); expect(e.fin).toBe(7250);
    expect(alto.posicion(e, "big-fig", 9000)).toBe(6.25);
  });
  it("si al avanzar hay varios cruces ya juzgados, los ordena por su hora", () => {
    const e = preparar({ verdeMinMs: 10000, verdeMaxMs: 10000, metaMs: 1000 });
    mandar(e, "aprieta", 0); mandar(e, "aprieta", 100, 100, "big-fig");
    for (const s of [250, 500, 750, 1000, 1100]) {
      mandar(e, "latido", s); mandar(e, "latido", s, s, "big-fig");
    }
    const ev = alto.avanzar(e, 1400);
    expect(ev.filter(x => x.tipo === "cruza")).toHaveLength(2);
    expect(alto.ranking(e).map(x => [x.id, x.lugar, x.cruce])).toEqual([["a", 1, 1000], ["big-fig", 2, 1100]]);
  });
  it("corta a los 60 s, espera juicio y ordena por distancia", () => {
    const e = preparar(); correr(e, 0, 1000); mandar(e, "suelta", 1000);
    correr(e, 0, 500, "big-fig"); mandar(e, "suelta", 500, 1000, "big-fig");
    expect(alto.avanzar(e, 60000).some(x => x.tipo === "fin")).toBe(false);
    expect(alto.avanzar(e, 60250)).toContainEqual({ tipo: "fin", porTiempo: true, ranking: [
      { id: "a", lugar: 1, distancia: 1, cruce: null }, { id: "big-fig", lugar: 2, distancia: 0.5, cruce: null },
    ] });
  });
  it("distancias empatadas comparten lugar", () => {
    const e = preparar(); alto.avanzar(e, 60250);
    expect(alto.ranking(e).map(x => x.lugar)).toEqual([1, 1]);
  });
  it("al límite, los 600 ms sin latidos se miden con el reloj real del juicio", () => {
    const e = preparar({ verdeMinMs: 61000, verdeMaxMs: 61000 });
    correr(e, 59000, 59500);
    alto.avanzar(e, 60250);
    expect(alto.posicion(e, "a", 60250)).toBe(0.5);
    expect(alto.posicion(e, "a", 90000)).toBe(0.5);
  });
  it("un latido posterior al límite respalda el intervalo previo sin sumar carrera extra", () => {
    const e = preparar({ verdeMinMs: 61000, verdeMaxMs: 61000 });
    correr(e, 59000, 60000); mandar(e, "latido", 60250);
    expect(e.fase).toBe("fin");
    expect(alto.posicion(e, "a", 60250)).toBe(1);
  });
  it("apretar en rojo se juzga 250 ms después de ese evento", () => {
    const e = preparar();
    expect(mandar(e, "aprieta", 2100)).not.toContainEqual({ tipo: "atrapado", id: "a" });
    expect(alto.avanzar(e, 2349)).toEqual([]);
    expect(alto.avanzar(e, 2350)).toContainEqual({ tipo: "atrapado", id: "a" });
  });
  it("el fin de rojo es exclusivo y la siguiente verde vuelve a sumar", () => {
    const e = preparar(); mandar(e, "aprieta", 3500); mandar(e, "latido", 3750);
    expect(alto.posicion(e, "a", 3750)).toBe(0.25);
    expect(alto.avanzar(e, 4000)).not.toContainEqual({ tipo: "atrapado", id: "a" });
  });
  it("azar inyectable respeta los rangos de verde y rojo", () => {
    const e = alto.crearPartida([], {}, () => 0.5); alto.empezar(e, 100);
    expect(e.tramos[0]!.fin).toBe(2850); alto.avanzar(e, 2850);
    expect(e.tramos[1]!.fin).toBe(5600);
  });
  it.each(["aprieta", "suelta", "latido"])("contrato corre admite %s", a => {
    const d = { n: 1, pid: "partida", s: 123.5, inc: 0, a };
    expect(validarDeCelular({ de: "a", tipo: "corre", d })).toEqual(d);
  });
  it.each([
    { pid: "x".repeat(21) }, { pid: 1 }, { s: NaN }, { s: Infinity }, { s: "1" },
    { inc: -1 }, { inc: Infinity }, { inc: "0" }, { a: "correr" }, { a: null }, { n: -1 },
  ])("contrato corre rechaza %j", cambio => {
    expect(validarDeCelular({ de: "a", tipo: "corre", d: { n: 1, pid: "p", s: 10, inc: 0, a: "latido", ...cambio } })).toBeNull();
  });
});

describe("Martillazo", () => {
  function preparar(ids = ["a", "b"], azar: () => number = () => 0) {
    const e = martillazo.crearPartida(ids.map(id => ({ id })), {}, azar);
    expect(martillazo.empezar(e, 1000)).toEqual([{ tipo: "intento", intento: 1 }]);
    return e;
  }
  function siguiente(e: martillazo.EstadoMartillazo) {
    martillazo.avanzar(e, e.juicio ?? e.inicioIntento + 6250);
    return martillazo.avanzar(e, e.finFase);
  }
  it("recorre un triángulo lineal 0–100–0 con periodos 1600, 1300 y 1000 ms", () => {
    const e = preparar();
    for (const periodo of [1600, 1300, 1000]) {
      expect(e.cfg.periodosMs[e.intento - 1]).toBe(periodo);
      for (const [fraccion, p] of [[0, 0], [0.125, 25], [0.25, 50], [0.5, 100], [0.75, 50], [1, 0], [1.25, 50]]) {
        expect(martillazo.posicion(e, "a", e.inicioIntento + periodo * fraccion!)).toBeCloseTo(p!);
      }
      siguiente(e);
    }
    expect(e.fase).toBe("fin");
  });
  it("la TV elige una fase independiente por jugador y la renueva en cada intento con azar inyectable", () => {
    const fases = [0, 0.25, 0.5, 0.75, 0.125, 0.625];
    const e = preparar(["a", "b"], () => fases.shift()!);
    for (const ps of [[0, 50], [100, 50], [25, 75]]) {
      expect(martillazo.posicion(e, "a", e.inicioIntento)).toBe(ps[0]);
      expect(martillazo.posicion(e, "b", e.inicioIntento)).toBe(ps[1]);
      siguiente(e);
    }
    const a = martillazo.crearPartida([{ id: "a" }], {}, 123);
    const b = martillazo.crearPartida([{ id: "a" }], {}, 123);
    martillazo.empezar(a, 0); martillazo.empezar(b, 0);
    expect(a.fases).toEqual(b.fases);
  });
  it.each([
    [0, 0, false, "rebota"], [29.5, 59, false, "rebota"], [30, 60, false, "agrieta"],
    [44.5, 89, false, "agrieta"], [45, 90, false, "rompe"], [46.9, 94, false, "rompe"],
    [47, 94, true, "rompe"], [50, 100, true, "rompe"], [53, 94, true, "rompe"],
    [53.1, 94, false, "rompe"], [100, 0, false, "rebota"], [33.2, 66, false, "agrieta"],
  ])("posición %s: puntaje %s, perfecto %s y resultado %s", (p, puntos, perfecto, resultado) => {
    const e = preparar();
    const s = e.inicioIntento + Number(p) * 8;
    expect(martillazo.tocar(e, "a", s)).toContainEqual({ tipo: "puntaje", intento: 1, id: "a", puntos, perfecto, resultado });
  });
  it.each([47, 53])("también incluye el extremo perfecto %s cuando la barra baja", p => {
    const e = preparar();
    const s = e.inicioIntento + (200 - p) * 8;
    expect(martillazo.posicion(e, "a", s)).toBe(p);
    expect(martillazo.tocar(e, "a", s)).toContainEqual({ tipo: "puntaje", intento: 1, id: "a", puntos: 94, perfecto: true, resultado: "rompe" });
  });
  it("el margen de 70 ms solo admite el toque en los límites; no corrige su posición ni amplía perfecto", () => {
    for (const [fase, s, admitido] of [[0.25, 930, true], [0.25, 929, false], [0.5, 7070, true], [0.5, 7071, false]] as const) {
      const e = preparar(["a"], () => fase);
      const ev = martillazo.tocar(e, "a", s, Math.max(1000, s));
      expect(e.toques.has("a")).toBe(admitido);
      if (admitido) {
        const p = martillazo.posicion(e, "a", s);
        expect(ev).toContainEqual({ tipo: "puntaje", intento: 1, id: "a", puntos: Math.round(100 - 2 * Math.abs(p - 50)), perfecto: false, resultado: "agrieta" });
      }
    }
  });
  it("son tres intentos y cuenta el mejor, incluso si después no toca", () => {
    const e = preparar();
    martillazo.tocar(e, "a", 1400); // 100
    martillazo.tocar(e, "b", 1240); // 60
    siguiente(e);
    martillazo.tocar(e, "a", e.inicioIntento); // 0
    martillazo.tocar(e, "b", e.inicioIntento + 1300 / 4); // 100
    siguiente(e);
    const ev = martillazo.avanzar(e, e.inicioIntento + 6250);
    expect(ev).toContainEqual({ tipo: "fin", ranking: [{ id: "a", puntos: 100, lugar: 1 }, { id: "b", puntos: 100, lugar: 1 }] });
    expect(e.fase).toBe("fin");
    expect(martillazo.empezar(e, 99999)).toEqual([]);
    expect(martillazo.avanzar(e, 99999)).toEqual([]);
  });
  it("sin toque a los 6 s vale cero, y cierra tras los 250 ms de juicio", () => {
    const e = preparar();
    expect(martillazo.avanzar(e, 6999)).toEqual([]);
    expect(martillazo.avanzar(e, 7000)).toEqual([]);
    expect(e.juicio).toBe(7250);
    expect(martillazo.avanzar(e, 7249)).toEqual([]);
    expect(martillazo.avanzar(e, 7250)).toEqual([
      { tipo: "sinToque", intento: 1, id: "a" }, { tipo: "sinToque", intento: 1, id: "b" },
    ]);
    expect([...e.puntos.values()]).toEqual([0, 0]);
    expect(e.fase).toBe("pausa");
  });
  it("un toque atrasado dentro de los 250 ms se puntúa con la hora del toque", () => {
    const e = preparar(["a"], () => 0.5);
    martillazo.avanzar(e, 7000);
    expect(martillazo.tocar(e, "a", 7000, 7249)).toContainEqual({ tipo: "puntaje", intento: 1, id: "a", puntos: 100, perfecto: true, resultado: "rompe" });
    expect(e.juicio).toBe(7250);
    expect(martillazo.avanzar(e, 7250)).toEqual([]);
    expect(e.fase).toBe("pausa");
    const tarde = preparar(["a"]);
    expect(martillazo.tocar(tarde, "a", 7000, 7250)).toEqual([{ tipo: "sinToque", intento: 1, id: "a" }]);
    expect(tarde.toques.size).toBe(0);
  });
  it("todos juegan a la vez: solo un toque por jugador e intento, y juicio al tocar el último", () => {
    const e = preparar();
    expect(martillazo.tocar(e, "a", 1200)).toContainEqual({ tipo: "toque", intento: 1, id: "a" });
    expect(e.juicio).toBeNull();
    expect(martillazo.tocar(e, "a", 1400)).toEqual([]);
    expect(e.puntos.get("a")).toBe(50);
    martillazo.tocar(e, "b", 1400);
    expect(e.juicio).toBe(1650);
    martillazo.avanzar(e, 1649); expect(e.fase).toBe("intento");
    siguiente(e);
    expect(e.toques.size).toBe(0);
    expect(martillazo.tocar(e, "a", e.inicioIntento)).toContainEqual({ tipo: "toque", intento: 2, id: "a" });
  });
  it("empates comparten lugar, saltando las plazas ocupadas como bala y desenfunda", () => {
    const e = preparar(["a", "b", "c", "d"]);
    for (const [id, t] of [["a", 1400], ["b", 1400], ["c", 1240], ["d", 1000]] as const) martillazo.tocar(e, id, t);
    expect(martillazo.ranking(e)).toEqual([
      { id: "a", puntos: 100, lugar: 1 }, { id: "b", puntos: 100, lugar: 1 },
      { id: "c", puntos: 60, lugar: 3 }, { id: "d", puntos: 0, lugar: 4 },
    ]);
  });
  it("ignora desconocidos, horas no finitas y mensajes de un intento anterior", () => {
    const e = preparar();
    expect(martillazo.tocar(e, "x", 1400)).toEqual([]);
    expect(martillazo.tocar(e, "a", NaN)).toEqual([]);
    expect(martillazo.tocar(e, "a", 1400, Infinity)).toEqual([]);
    siguiente(e);
    expect(martillazo.tocar(e, "a", 1400, e.inicioIntento)).toEqual([]);
    expect(e.toques.size).toBe(0);
  });
});

describe("¡Desenfunda!", () => {
  function preparar() {
    const e = desenfunda.crearPartida([{ id: "a" }, { id: "b" }, { id: "c" }], {}, 7);
    desenfunda.empezar(e, 1000);
    return e;
  }
  it("el adelantado queda fuera solo esa ronda y vuelve a participar en la siguiente", () => {
    const e = preparar();
    expect(desenfunda.tocar(e, "a", e.ya - 100)).toContainEqual({ tipo: "adelantado", ronda: 1, id: "a" });
    desenfunda.avanzar(e, e.ya);
    desenfunda.tocar(e, "a", e.ya + 80);
    desenfunda.tocar(e, "b", e.ya + 100);
    expect(desenfunda.avanzar(e, e.juicio!)).toContainEqual({ tipo: "gana", ronda: 1, ids: ["b"], reaccionMs: 100 });
    desenfunda.avanzar(e, e.finFase);
    expect(e.adelantados.size).toBe(0);
    desenfunda.avanzar(e, e.ya);
    desenfunda.tocar(e, "a", e.ya + 90);
    expect(desenfunda.avanzar(e, e.juicio!)).toContainEqual({ tipo: "gana", ronda: 2, ids: ["a"], reaccionMs: 90 });
  });
  it("gana el menor tiempo válido, aunque llegue después por la red dentro del juicio", () => {
    const e = preparar(); desenfunda.avanzar(e, e.ya);
    desenfunda.tocar(e, "a", e.ya + 220, e.ya + 230);
    expect(desenfunda.avanzar(e, e.ya + 479).some(x => x.tipo === "gana")).toBe(false);
    desenfunda.tocar(e, "b", e.ya + 120, e.ya + 470);
    expect(e.juicio).toBe(e.ya + 480);
    expect(desenfunda.avanzar(e, e.juicio!)).toContainEqual({ tipo: "gana", ronda: 1, ids: ["b"], reaccionMs: 120 });
  });
  it("un toque que llega al cerrar el juicio ya no cambia el resultado", () => {
    const e = preparar(); desenfunda.avanzar(e, e.ya);
    desenfunda.tocar(e, "a", e.ya + 200);
    expect(desenfunda.tocar(e, "b", e.ya + 100, e.juicio!)).toContainEqual({ tipo: "gana", ronda: 1, ids: ["a"], reaccionMs: 200 });
    expect(e.toques.has("b")).toBe(false);
  });
  it("empate exacto: ambos suman la ronda", () => {
    const e = preparar(); desenfunda.avanzar(e, e.ya);
    desenfunda.tocar(e, "a", e.ya + 123);
    desenfunda.tocar(e, "b", e.ya + 123, e.ya + 200);
    expect(desenfunda.avanzar(e, e.juicio!)).toContainEqual({ tipo: "gana", ronda: 1, ids: ["a", "b"], reaccionMs: 123 });
    expect(desenfunda.ranking(e).filter(x => x.lugar === 1).map(x => x.id)).toEqual(["a", "b"]);
  });
  it("el margen favorece al jugador hasta 70 ms; las reacciones toleradas son cero", () => {
    const e = preparar();
    expect(desenfunda.tocar(e, "a", e.ya - 71)).toContainEqual({ tipo: "adelantado", ronda: 1, id: "a" });
    expect(desenfunda.tocar(e, "b", e.ya - 70)).not.toContainEqual({ tipo: "adelantado", ronda: 1, id: "b" });
    desenfunda.avanzar(e, e.ya);
    desenfunda.tocar(e, "c", e.ya);
    expect(desenfunda.avanzar(e, e.juicio!)).toContainEqual({ tipo: "gana", ronda: 1, ids: ["b", "c"], reaccionMs: 0 });
  });
  it("sin toque válido en 3 s se cierra sin ganador, incluso si todos se adelantaron", () => {
    for (const todos of [false, true]) {
      const e = preparar();
      if (todos) e.jugadores.forEach(j => desenfunda.tocar(e, j.id, e.ya - 500));
      desenfunda.avanzar(e, e.ya);
      expect(desenfunda.avanzar(e, e.ya + 2999)).toEqual([]);
      expect(desenfunda.avanzar(e, e.ya + 3000)).toEqual([{ tipo: "sinGanador", ronda: 1 }]);
      expect(desenfunda.ranking(e).every(x => x.rondas === 0)).toBe(true);
    }
  });
  it("un toque al final de los 3 s conserva sus 250 ms completos de juicio", () => {
    const e = preparar(); desenfunda.avanzar(e, e.ya);
    desenfunda.tocar(e, "a", e.ya + 2990);
    expect(desenfunda.avanzar(e, e.ya + 3000)).toEqual([]);
    expect(desenfunda.avanzar(e, e.juicio!)).toContainEqual({ tipo: "gana", ronda: 1, ids: ["a"], reaccionMs: 2990 });
  });
  it("son exactamente 5 rondas y el ranking permite empates por rondas ganadas", () => {
    const e = preparar(); const ev: desenfunda.Evento[] = [];
    for (const ids of [["a"], ["b"], ["a"], ["b"], ["c"]]) {
      desenfunda.avanzar(e, e.ya);
      ids.forEach(id => desenfunda.tocar(e, id, e.ya + 100));
      ev.push(...desenfunda.avanzar(e, e.juicio!));
      if (e.fase === "pausa") ev.push(...desenfunda.avanzar(e, e.finFase));
    }
    expect(e.fase).toBe("fin"); expect(e.ronda).toBe(5);
    expect(ev.filter(x => x.tipo === "fin")).toEqual([{ tipo: "fin", ranking: [
      { id: "a", rondas: 2, lugar: 1 }, { id: "b", rondas: 2, lugar: 1 }, { id: "c", rondas: 1, lugar: 3 },
    ] }]);
    expect(desenfunda.avanzar(e, e.ya + 100000)).toEqual([]);
    expect(desenfunda.empezar(e, 0)).toEqual([]);
  });
  it("ignora un segundo toque, jugadores ajenos y horas inválidas o de otra ronda", () => {
    const e = preparar(); desenfunda.avanzar(e, e.ya);
    desenfunda.tocar(e, "a", e.ya + 150);
    desenfunda.tocar(e, "a", e.ya + 90, e.ya + 170);
    desenfunda.tocar(e, "ajeno", e.ya + 80);
    desenfunda.tocar(e, "b", NaN);
    desenfunda.tocar(e, "b", e.inicioRonda - 1, e.ya + 180);
    expect([...e.toques]).toEqual([["a", e.ya + 150]]);
  });
  it("la semilla es repetible y acepta un generador inyectado", () => {
    expect(preparar().amagos).toEqual(preparar().amagos);
    const e = desenfunda.crearPartida([{ id: "a" }], {}, () => 0);
    desenfunda.empezar(e, 0);
    expect(e.ya).toBe(1500); expect(e.amagos).toHaveLength(1);
  });
  it("emite de 1 a 3 amagos espaciados y nunca revela el YA ni su horario antes de tiempo", () => {
    const cantidades = new Set<number>();
    for (let semilla = 0; semilla < 100; semilla++) {
      const e = desenfunda.crearPartida([{ id: "a" }], {}, semilla);
      const ev = desenfunda.empezar(e, 1000);
      expect(ev).toEqual([{ tipo: "ronda", ronda: 1 }]);
      expect(e.ya - 1000).toBeGreaterThanOrEqual(1500); expect(e.ya - 1000).toBeLessThanOrEqual(4000);
      cantidades.add(e.amagos.length);
      let anterior = 1000;
      for (const amago of [...e.amagos]) {
        expect(amago.t - anterior).toBeGreaterThanOrEqual(700 - 1e-9);
        expect(amago.t - anterior).toBeLessThanOrEqual(1400 + 1e-9);
        expect(amago.t).toBeLessThan(e.ya);
        ev.push(...desenfunda.avanzar(e, amago.t)); anterior = amago.t;
      }
      ev.push(...desenfunda.avanzar(e, e.ya - 1));
      expect(ev.every(x => x.tipo !== "ya" && !("t" in x) && !("ya" in x))).toBe(true);
      expect(desenfunda.avanzar(e, e.ya)).toContainEqual({ tipo: "ya", ronda: 1, t: e.ya });
    }
    expect([...cantidades].sort()).toEqual([1, 2, 3]);
  });
  it("si la TV se retrasa, el YA y la ventana de reacción empiezan cuando se muestra", () => {
    const e = preparar(); const real = e.ya + 400;
    expect(desenfunda.avanzar(e, real)).toContainEqual({ tipo: "ya", ronda: 1, t: real });
    expect(e.ya).toBe(real);
    desenfunda.tocar(e, "a", real - 100, real + 20);
    expect(e.adelantados.has("a")).toBe(true);
  });
});

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

  it("RT (poder) hace el movimiento especial en el piso, avisa y no se mueve mientras dura", () => {
    const e = crearCuarto({ forma: "caja", ancho: 10, fondo: 6 });
    const c = entrar(e, "a");
    for (let i = 0; i < 120; i++) pasoCuarto(e, 16); // que llegue al piso
    mandar(e, "a", { x: 0, z: 0, poder: true });
    const ev = pasoCuarto(e, 16);
    expect(c.anim).toBe("poder");
    expect(ev).toContainEqual({ tipo: "poder", id: "a" });
    const x = c.x;
    mandar(e, "a", { x: 1, z: 0 }); pasoCuarto(e, 100);
    expect(c.x).toBe(x);
    expect(validarDeCelular({ de: "c1", tipo: "boton", d: { n: 1, b: "poder" } })).toEqual({ n: 1, b: "poder" });
  });

  it("X (poder2) hace el segundo poder y la TV alarga el poder al largo de su clip (entre 0.4 y 6 s)", () => {
    const e = crearCuarto({ forma: "caja", ancho: 10, fondo: 6 });
    const c = entrar(e, "a");
    for (let i = 0; i < 120; i++) pasoCuarto(e, 16);
    mandar(e, "a", { x: 0, z: 0, poder2: true });
    expect(pasoCuarto(e, 16)).toContainEqual({ tipo: "poder", id: "a", n: 2 });
    expect(c.anim).toBe("poder2");
    alargar(e, "a", 3500);
    for (let i = 0; i < 180; i++) { mandar(e, "a", { x: 0, z: 0 }); pasoCuarto(e, 16); } // 2.9 s: sigue
    expect(c.anim).toBe("poder2");
    for (let i = 0; i < 60; i++) { mandar(e, "a", { x: 0, z: 0 }); pasoCuarto(e, 16); }
    expect(c.anim).toBe("reposo");
    alargar(e, "a", 99999); // ya no está en un poder: nada
    expect(c.hasta).toBe(0);
    mandar(e, "a", { x: 0, z: 0, poder: true }); pasoCuarto(e, 16);
    alargar(e, "a", 99999);
    expect(c.hasta - c.animDesde).toBe(6000);
    expect(validarDeCelular({ de: "c1", tipo: "boton", d: { n: 1, b: "poder2" } })).toEqual({ n: 1, b: "poder2" });
  });

  it("vuelo: despega a su altura, A sube, B baja, se mueve rápido sin gravedad y aterriza con el mismo botón o bajando", () => {
    const e = crearCuarto({ forma: "caja", ancho: 20, fondo: 12 });
    const c = entrar(e, "a");
    for (let i = 0; i < 120; i++) pasoCuarto(e, 16);
    mandar(e, "a", { x: 0, z: 0, volar: true });
    expect(pasoCuarto(e, 16)).toContainEqual({ tipo: "despega", id: "a" });
    expect(c.vuela).toBe(true); expect(c.anim).toBe("volar");
    for (let i = 0; i < 90; i++) { mandar(e, "a", { x: 0, z: 0 }); pasoCuarto(e, 16); }
    expect(c.y).toBeCloseTo(e.cfg.vueloAlto, 1);
    mandar(e, "a", { x: 0, z: 0, saltar: true }); pasoCuarto(e, 16);
    for (let i = 0; i < 90; i++) { mandar(e, "a", { x: 0, z: 0 }); pasoCuarto(e, 16); }
    expect(c.y).toBeCloseTo(e.cfg.vueloAlto + e.cfg.vueloPaso, 1);
    const x0 = c.x;
    for (let i = 0; i < 30; i++) { mandar(e, "a", { x: 1, z: 0 }); pasoCuarto(e, 16); }
    expect(c.x - x0).toBeGreaterThan(e.cfg.correr * 0.48); // más rápido que corriendo
    expect(c.anim).toBe("volar");
    mandar(e, "a", { x: 0, z: 0, volar: true });
    expect(pasoCuarto(e, 16)).toContainEqual({ tipo: "aterriza", id: "a" });
    for (let i = 0; i < 120; i++) { mandar(e, "a", { x: 0, z: 0 }); pasoCuarto(e, 16); }
    expect(c.enPiso).toBe(true); expect(c.y).toBe(0);
    // Bajando con B hasta el piso también aterriza; en el aire B no golpea.
    mandar(e, "a", { x: 0, z: 0, volar: true }); pasoCuarto(e, 16);
    mandar(e, "a", { x: 0, z: 0, golpe: true }); pasoCuarto(e, 16);
    expect(c.vuela).toBe(true); expect(c.anim).toBe("volar");
    mandar(e, "a", { x: 0, z: 0, golpe: true }); pasoCuarto(e, 16);
    expect(c.vuela).toBe(false);
  });

  it("movimiento de sus sets (rueda, 2ª página): se queda quieto, la TV lo alarga y el celular solo manda ids con forma de set", () => {
    const e = crearCuarto({ forma: "caja", ancho: 10, fondo: 6 });
    const c = entrar(e, "a");
    for (let i = 0; i < 120; i++) pasoCuarto(e, 16);
    mandar(e, "a", { x: 0, z: 0, mov: true }); pasoCuarto(e, 16);
    expect(c.anim).toBe("mov");
    alargar(e, "a", 3000);
    expect(c.hasta - c.animDesde).toBe(3000);
    const x = c.x;
    mandar(e, "a", { x: 1, z: 0 }); pasoCuarto(e, 100);
    expect(c.x).toBe(x);
    expect(validarDeCelular({ de: "c1", tipo: "mov", d: { n: 1, m: "base-bailar" } })).toEqual({ n: 1, m: "base-bailar" });
    expect(validarDeCelular({ de: "c1", tipo: "mov", d: { n: 1, m: "vuelo-volar-rapido" } })).toEqual({ n: 1, m: "vuelo-volar-rapido" });
    expect(validarDeCelular({ de: "c1", tipo: "mov", d: { n: 1, m: "<b>" } })).toBeNull();
    expect(validarDeCelular({ de: "c1", tipo: "mov", d: { n: 1, m: "bailar" } })).toBeNull();
  });

  it("la rueda del mando pone los 4 gestos, se queda quieto mientras duran e ignora gestos raros", () => {
    const e = crearCuarto({ forma: "caja", ancho: 10, fondo: 6 });
    const c = entrar(e, "a");
    for (let i = 0; i < 120; i++) pasoCuarto(e, 16);
    for (const g of ["saludo", "festejo", "especial", "derrota"] as const) {
      mandar(e, "a", { x: 0, z: 0, gesto: g }); pasoCuarto(e, 16);
      expect(c.anim).toBe(g);
      const x = c.x;
      mandar(e, "a", { x: 1, z: 0 }); pasoCuarto(e, 100);
      expect(c.x).toBe(x);
      for (let i = 0; i < 160; i++) { mandar(e, "a", { x: 0, z: 0 }); pasoCuarto(e, 16); } // termina el gesto
      expect(c.anim).toBe("reposo");
    }
    mandar(e, "a", { x: 0, z: 0, gesto: "toString" as never }); pasoCuarto(e, 16);
    expect(c.anim).toBe("reposo");
    expect(validarDeCelular({ de: "c1", tipo: "gesto", d: { n: 1, g: "derrota" } })).toEqual({ n: 1, g: "derrota" });
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

describe("canal por la nube (Realtime de Supabase)", () => {
  // Un Realtime de mentira: todos los canales con el mismo nombre se oyen entre sí (sin eco propio).
  function nubeFalsa() {
    const salas = new Map<string, { key: string; bc: ((m: { payload: unknown }) => void)[]; join: ((m: { newPresences: unknown[] }) => void)[]; leave: ((m: { leftPresences: unknown[] }) => void)[] }[]>();
    return {
      channel(nombre: string, op: { config: { presence: { key: string } } }) {
        const yo = { key: op.config.presence.key, bc: [] as never[], join: [] as never[], leave: [] as never[] } as never as { key: string; bc: ((m: { payload: unknown }) => void)[]; join: ((m: { newPresences: unknown[] }) => void)[]; leave: ((m: { leftPresences: unknown[] }) => void)[] };
        const lista = salas.get(nombre) ?? []; salas.set(nombre, lista);
        const c = {
          on(tipo: string, f: { event: string }, g: never) { if (tipo === "broadcast") yo.bc.push(g); else if (f.event === "join") yo.join.push(g); else yo.leave.push(g); return c; },
          subscribe(f?: (e: string) => void) { lista.push(yo); f?.("SUBSCRIBED"); return c; },
          send(m: { payload: unknown }) { lista.filter(o => o !== yo).forEach(o => o.bc.forEach(g => g({ payload: m.payload }))); },
          track(d: Record<string, unknown>) { lista.filter(o => o !== yo).forEach(o => o.join.forEach(g => g({ newPresences: [d] }))); },
          _salir() { lista.splice(lista.indexOf(yo), 1); lista.forEach(o => o.leave.forEach(g => g({ leftPresences: [{ id: yo.key }] }))); },
        };
        return c;
      },
      removeChannel(c: { _salir: () => void }) { c._salir(); },
    };
  }

  it("entrega mensajes, avisa bienvenida, entro y salio, y descarta remitentes falsos", async () => {
    const nube = nubeFalsa() as never;
    const tv: Mensaje[] = [], cel: Mensaje[] = [];
    const cTv = abrirCanalNube(nube, "ABCD", TV, m => tv.push(m));
    const idCel = idDeLlave("secreto");
    expect(idCel).toMatch(/^c[0-9a-f]{12}$/);
    const cCel = abrirCanalNube(nube, "ABCD", idCel, m => cel.push(m));
    expect(cel[0]).toEqual({ de: SERVIDOR, tipo: "bienvenida", d: { yo: idCel } });
    expect(tv.some(m => m.de === SERVIDOR && m.tipo === "entro" && m.d.id === idCel)).toBe(true);
    cCel.enviar("salto", { pid: "p1", s: 5, inc: 1 });
    expect(tv.at(-1)).toEqual({ de: idCel, tipo: "salto", d: { pid: "p1", s: 5, inc: 1, n: 1 } });
    cTv.enviar("estado", { fase: "lobby" });
    expect(cel.at(-1)?.de).toBe(TV);
    // Un celular no puede hacerse pasar por el «servidor».
    const falso = abrirCanalNube(nube, "ABCD", SERVIDOR, () => {});
    const antes = tv.length;
    falso.enviar("anfitrion", { id: idCel });
    expect(tv.slice(antes).some(m => m.tipo === "anfitrion")).toBe(false);
    cCel.cerrar();
    expect(tv.some(m => m.de === SERVIDOR && m.tipo === "salio" && m.d.id === idCel)).toBe(true);
    // Otra sala no se oye.
    const otra: Mensaje[] = [];
    abrirCanalNube(nube, "ZZZZ", "x", m => otra.push(m));
    cTv.enviar("estado", {});
    expect(otra.filter(m => m.de !== SERVIDOR)).toEqual([]);
  });
});

describe("XP de Mini-Juegos desde la sala (049)", () => {
  const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
  it("arma los resultados con las cuentas de la sala y deja fuera a quien no tiene", () => {
    const r = resultadosXp(
      [{ id: "c1", lugar: 1 }, { id: "c2", lugar: 2 }, { id: "c3", lugar: 2 }, { id: "bot", lugar: 4 }],
      [{ id: "c1", cuenta: A }, { id: "c2", cuenta: B }, { id: "c3", cuenta: null }, { id: "bot", cuenta: A, bot: true }]);
    expect(r).toEqual({ jugadores: 4, resultados: [
      { jugador: A, rondas: RONDAS_XP, retos: 0, lugar: 1 }, { jugador: B, rondas: RONDAS_XP, retos: 0, lugar: 2 }] });
  });
  it("una cuenta repetida cuenta una vez; lugares raros y uno solo no cuentan", () => {
    expect(resultadosXp([{ id: "c1", lugar: 1 }, { id: "c2", lugar: 1 }], [{ id: "c1", cuenta: A }, { id: "c2", cuenta: A }])?.resultados).toHaveLength(1);
    expect(resultadosXp([{ id: "c1", lugar: 9 }, { id: "c2", lugar: 0 }], [{ id: "c1", cuenta: A }, { id: "c2", cuenta: B }])).toBeNull();
    expect(resultadosXp([{ id: "c1", lugar: 1 }], [{ id: "c1", cuenta: A }])).toBeNull();
    expect(resultadosXp("x", null)).toBeNull();
  });
  it("cada juego de la TV tiene su id en la base y el hola acepta la cuenta", () => {
    expect(Object.values(JUEGO_XP).sort()).toEqual(["mj-alto-total", "mj-bala", "mj-desenfunda", "mj-martillazo", "mj-paracaidas", "mj-plataforma"]);
    expect(validarDeCelular({ de: "c1", tipo: "hola", d: { n: 1, nombre: "a", personaje: "hulk", cuenta: A } })).toEqual({ n: 1, nombre: "a", personaje: "hulk", cuenta: A });
    expect(validarDeCelular({ de: "c1", tipo: "hola", d: { n: 1, nombre: "a", personaje: "hulk", cuenta: "<x>" } })).toEqual({ n: 1, nombre: "a", personaje: "hulk" });
  });
  it("la 054 (la última que define terminar_partida_sala) acepta esos ids", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("supabase/migrations/054_minijuego_plataforma_xp.sql", "utf8");
    for (const id of Object.values(JUEGO_XP)) expect(sql).toContain(`'${id}'`);
    expect(sql).toContain("privado.es_anfitrion(v_evento)");
  });
});
