import { describe, expect, it } from "vitest";
import { EMOTES, alEmote, alEmotePropio, aplicarEmoteRemoto, lanzarEmote } from "./emotes";
import { revisarEmote } from "../servicios/gestosSala";

describe("Emotes al revelar", () => {
  it("lanzar avisa al canal y respeta el enfriamiento", () => {
    const salen: number[] = [];
    const fuera = alEmotePropio(e => salen.push(e.k));
    expect(lanzarEmote("j1", 2, 10_000)).toBe(true);
    expect(lanzarEmote("j1", 3, 10_100)).toBe(false);
    expect(lanzarEmote("j1", 3, 10_600)).toBe(true);
    expect(lanzarEmote("j1", EMOTES.length, 20_000)).toBe(false);
    fuera();
    expect(salen).toEqual([2, 3]);
  });
  it("lo remoto se dibuja una vez, en orden y sin ráfagas", () => {
    const llegan: string[] = [];
    const fuera = alEmote(e => llegan.push(`${e.jugador}:${e.k}`));
    expect(aplicarEmoteRemoto("ana", 0, 5, 1_000)).toBe(true);
    expect(aplicarEmoteRemoto("ana", 0, 5, 3_000)).toBe(false); // repetido
    expect(aplicarEmoteRemoto("ana", 1, 6, 1_100)).toBe(false); // muy seguido
    expect(aplicarEmoteRemoto("ana", 1, 7, 2_000)).toBe(true);
    expect(aplicarEmoteRemoto("beto", 9, 1, 2_000)).toBe(false); // no existe
    fuera();
    expect(llegan).toEqual(["ana:0", "ana:1"]);
  });
  it("el canal solo acepta emotes de miembros y con forma válida", () => {
    const m = new Set(["ana", "beto"]);
    expect(revisarEmote({ j: "ana", k: 1, n: 3 }, m, "beto")).toEqual({ j: "ana", k: 1, n: 3 });
    expect(revisarEmote({ j: "ana", k: 1, n: 3 }, m, "ana")).toBeNull();
    expect(revisarEmote({ j: "eve", k: 1, n: 3 }, m, "beto")).toBeNull();
    expect(revisarEmote({ j: "ana", k: "😂", n: 3 }, m, "beto")).toBeNull();
    expect(revisarEmote({ j: "ana", k: 1, n: 0 }, m, "beto")).toBeNull();
  });
});
