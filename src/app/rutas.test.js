// Rutas de ALV 2.0: el papel del aparato lo da la ruta; los códigos mal escritos no pasan.
import { describe, expect, it } from "vitest";
import { href, leerRuta } from "./rutas";
describe("rutas", () => {
    it("lo vacío y lo desconocido van al inicio", () => {
        expect(leerRuta("")).toEqual({ ruta: "inicio" });
        expect(leerRuta("#/")).toEqual({ ruta: "inicio" });
        expect(leerRuta("#/loquesea/x")).toEqual({ ruta: "inicio" });
    });
    it("el QR (#/s/código) y #/sala/código abren la sala en el celular", () => {
        expect(leerRuta("#/s/k7pq2m")).toEqual({ ruta: "sala", arg: "K7PQ2M" });
        expect(leerRuta("#/sala/K7PQ2M")).toEqual({ ruta: "sala", arg: "K7PQ2M" });
        expect(leerRuta("#/unirse/K7PQ2M")).toEqual({ ruta: "sala", arg: "K7PQ2M" });
    });
    it("#/tv/código es la Pantalla", () => {
        expect(leerRuta("#/tv/K7PQ2M")).toEqual({ ruta: "tv", arg: "K7PQ2M" });
    });
    it("un código mal escrito no entra a ninguna sala: va a Jugar", () => {
        for (const malo of ["#/sala", "#/sala/abc", "#/tv/K7PQ2M9", "#/s/%3Cscript%3E", "#/tv/<b>x</b>", "#/sala/%E0%A4%A"])
            expect(leerRuta(malo)).toEqual({ ruta: "jugar" });
    });
    it("la ficha de un juego solo acepta ids de juego", () => {
        expect(leerRuta("#/juego/impostor")).toEqual({ ruta: "juego", arg: "impostor" });
        expect(leerRuta("#/juego/../../x")).toEqual({ ruta: "catalogo" });
        expect(leerRuta("#/juego")).toEqual({ ruta: "catalogo" });
    });
    it("las secciones y los nombres viejos llegan a su pantalla", () => {
        for (const r of ["jugar", "catalogo", "personalizar", "editor", "ranking", "logros", "perfil", "ajustes", "admin", "ds"])
            expect(leerRuta(`#/${r}`)).toEqual({ ruta: r });
        expect(leerRuta("#/hub")).toEqual({ ruta: "inicio" });
        expect(leerRuta("#/lobby")).toEqual({ ruta: "jugar" });
        expect(leerRuta("#/proyectar")).toEqual({ ruta: "jugar" });
        expect(leerRuta("#/figura/x")).toEqual({ ruta: "editor" });
    });
    it("href arma direcciones que leerRuta entiende", () => {
        expect(leerRuta(href("tv", "K7PQ2M"))).toEqual({ ruta: "tv", arg: "K7PQ2M" });
        expect(href("inicio")).toBe("#/inicio");
    });
});
