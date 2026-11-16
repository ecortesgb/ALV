import { describe, expect, it } from "vitest";
import { href, leerRuta } from "./rutas";

describe("Rutas de hoy (no cambian)", () => {
  it("cada pantalla abre igual que antes", () => {
    expect(leerRuta("")).toEqual({ ruta: "inicio" });
    expect(leerRuta("#/")).toEqual({ ruta: "inicio" });
    expect(leerRuta("#/inicio")).toEqual({ ruta: "inicio" });
    expect(leerRuta("#/lobby")).toEqual({ ruta: "lobby" });
    expect(leerRuta("#/lobby/j-impostor")).toEqual({ ruta: "lobby", arg: "j-impostor" });
    expect(leerRuta("#/unirse/ABC123")).toEqual({ ruta: "unirse", arg: "ABC123" });
    expect(leerRuta("#/perfil/cosas")).toEqual({ ruta: "perfil", arg: "cosas" });
    expect(leerRuta("#/figura/j0")).toEqual({ ruta: "figura", arg: "j0" });
    for (const r of ["tienda", "ranking", "fisico", "ajustes", "jugar"]) expect(leerRuta(`#/${r}`)).toEqual({ ruta: r });
  });
  it("las viejas guardadas siguen llevando a su lugar", () => {
    expect(leerRuta("#/juegos/ptm")).toEqual({ ruta: "lobby", arg: "s-ptm" });
    expect(leerRuta("#/juegos")).toEqual({ ruta: "lobby" });
    expect(leerRuta("#/grupo")).toEqual({ ruta: "lobby" });
    expect(leerRuta("#/historial")).toEqual({ ruta: "ranking" });
  });
  it("lo desconocido va al inicio", () => {
    expect(leerRuta("#/no-existe/x")).toEqual({ ruta: "inicio" });
    expect(leerRuta("#/%E0%A4%A")).toEqual({ ruta: "inicio" });
  });
});

describe("Rutas por aparato de ALV 2.0", () => {
  it("el QR y el celular abren la sala con el código", () => {
    expect(leerRuta("#/s/k7pq2m")).toEqual({ ruta: "unirse", arg: "K7PQ2M" });
    expect(leerRuta("#/sala/K7PQ2M")).toEqual({ ruta: "unirse", arg: "K7PQ2M" });
  });
  it("la TV y la mesa llevan su código; uno mal escrito se descarta", () => {
    expect(leerRuta("#/tv/K7PQ2M")).toEqual({ ruta: "tv", arg: "K7PQ2M" });
    expect(leerRuta("#/mesa/K7PQ2M")).toEqual({ ruta: "mesa", arg: "K7PQ2M" });
    expect(leerRuta("#/tv/<script>")).toEqual({ ruta: "tv" });
    expect(leerRuta("#/sala/123")).toEqual({ ruta: "unirse" });
  });
  it("proyectar y la página del Design System", () => {
    expect(leerRuta("#/proyectar")).toEqual({ ruta: "proyectar" });
    expect(leerRuta("#/ds")).toEqual({ ruta: "ds" });
  });
  it("los nombres nuevos con pantalla de hoy llevan a ella", () => {
    expect(leerRuta("#/hub")).toEqual({ ruta: "inicio" });
    expect(leerRuta("#/catalogo")).toEqual({ ruta: "lobby" });
    expect(leerRuta("#/juego/impostor")).toEqual({ ruta: "lobby", arg: "j-impostor" });
    expect(leerRuta("#/coleccion")).toEqual({ ruta: "perfil", arg: "cosas" });
    expect(leerRuta("#/personalizar")).toEqual({ ruta: "perfil" });
    expect(leerRuta("#/admin")).toEqual({ ruta: "ajustes" });
  });
  it("href arma la dirección y escapa el argumento", () => {
    expect(href("tv", "K7PQ2M")).toBe("#/tv/K7PQ2M");
    expect(href("inicio")).toBe("#/inicio");
    expect(leerRuta(href("perfil", "a b"))).toEqual({ ruta: "perfil", arg: "a b" });
  });
});
