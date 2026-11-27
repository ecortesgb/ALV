import { beforeEach, describe, expect, it } from "vitest";
import { aplicarFormaRemota, alFormaPropia, estadoForma, pasoDe, reiniciarFormas, transformar } from "./formas";
import { revisarForma } from "../servicios/gestosSala";

// Figura v2 con su v3 en el puente (lo que viaja en la app).
const fig = (personaje: string) => ({ version: 2, extensiones: { alv: { v3: {
  version: 3, familia: personaje === "hulk" ? "bigfig" : "minifig", origen: { tipo: "catalogo", personaje, version: "base", revision: 1 },
  piezas: {}, momentos: { paquete: null, espera: "respirar", victoria: "festejo", derrota: "tristeza", punto: "saltito" }, extensiones: {} } } } });

describe("forma de cada jugador", () => {
  beforeEach(() => reiniciarFormas());
  it("Transformar avanza el ciclo y se queda; avisa a la sala con la especial de Banner", () => {
    const avisos: unknown[] = [];
    const fuera = alFormaPropia(e => avisos.push(e));
    expect(transformar("ana", fig("bruce-banner"), 1_000_000)).toBe(true);
    expect(pasoDe("ana", fig("bruce-banner"))).toBe(1);
    expect(avisos).toMatchObject([{ jugador: "ana", paso: 1, conEspecial: true }]);
    expect(transformar("ana", fig("bruce-banner"), 1_000_100)).toBe(true);
    expect(pasoDe("ana", fig("bruce-banner"))).toBe(0);
    expect(avisos[1]).toMatchObject({ paso: 0, conEspecial: false });
    fuera();
  });
  it("un personaje sin pareja no se transforma", () => {
    expect(transformar("ana", fig("batman"))).toBe(false);
    expect(estadoForma("ana").n).toBe(0);
  });
  it("la forma remota se descarta si es vieja o repetida", () => {
    expect(aplicarFormaRemota("beto", 1, 50, true)).toBe(true);
    expect(aplicarFormaRemota("beto", 0, 50, false)).toBe(false);
    expect(aplicarFormaRemota("beto", 0, 49, false)).toBe(false);
    expect(estadoForma("beto")).toMatchObject({ paso: 1, n: 50, conEspecial: true });
  });
  it("revisa lo que llega por la red", () => {
    const m = new Set(["ana", "beto"]);
    expect(revisarForma({ j: "beto", k: 1, n: 5, e: true }, m, "ana")).toEqual({ j: "beto", k: 1, n: 5, e: true });
    expect(revisarForma({ j: "ana", k: 1, n: 5 }, m, "ana")).toBeNull();
    expect(revisarForma({ j: "zoe", k: 1, n: 5 }, m, "ana")).toBeNull();
    expect(revisarForma({ j: "beto", k: 12, n: 5 }, m, "ana")).toBeNull();
    expect(revisarForma({ j: "beto", k: 1, n: 1.5 }, m, "ana")).toBeNull();
  });
});

import { aplicarPoderRemoto, alPedirPoder, pedirPoder, reiniciarPoderes } from "./poderes";
import { revisarPoder } from "../servicios/gestosSala";
describe("poderes de cada jugador", () => {
  beforeEach(() => reiniciarPoderes());
  it("pide, enfría y descarta los viejos de la red", () => {
    const vistos: string[] = [];
    const fuera = alPedirPoder(e => vistos.push(`${e.jugador}:${e.poder}`));
    expect(pedirPoder("ana", "rayo", 1_000_000)).toBe(true);
    expect(pedirPoder("ana", "rayo", 1_000_300)).toBe(false);
    expect(pedirPoder("ana", "<x>", 1_005_000)).toBe(false);
    expect(aplicarPoderRemoto("beto", "escudo", 7)).toBe(true);
    expect(aplicarPoderRemoto("beto", "escudo", 7)).toBe(false);
    expect(vistos).toEqual(["ana:rayo", "beto:escudo"]);
    fuera();
  });
  it("revisa lo que llega por la red", () => {
    const m = new Set(["ana", "beto"]);
    expect(revisarPoder({ j: "beto", k: "rayo", n: 3 }, m, "ana")).toEqual({ j: "beto", k: "rayo", n: 3 });
    expect(revisarPoder({ j: "ana", k: "rayo", n: 3 }, m, "ana")).toBeNull();
    expect(revisarPoder({ j: "beto", k: "Rayo!", n: 3 }, m, "ana")).toBeNull();
    expect(revisarPoder({ j: "beto", k: "rayo", n: 0 }, m, "ana")).toBeNull();
  });
});
