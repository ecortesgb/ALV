import { describe, expect, it } from "vitest";
import { escenaDeRuta } from "./musica";
describe("música por pantalla", () => {
    it("partidas en el juego de un solo aparato y en la Pantalla; lo demás es HUB y menús", () => {
        expect(escenaDeRuta("#/juego/impostor")).toBe("partida");
        expect(escenaDeRuta("#/tv")).toBe("partida");
        expect(escenaDeRuta("#/inicio")).toBe("hub");
        expect(escenaDeRuta("#/ajustes/experiencia")).toBe("hub");
        expect(escenaDeRuta("")).toBe("hub");
    });
});
