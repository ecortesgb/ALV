import { describe, expect, it } from "vitest";
import { existeSonido } from "../app/sonido";
import { SETS, SONIDOS_MOV, SONIDO_PROPIO, sonidosDe } from "./sets";

describe("sonidos de movimientos", () => {
  it("cada movimiento con sonido existe en su set y cada sonido existe en sonido.ts", () => {
    for (const [mov, toques] of Object.entries(SONIDOS_MOV)) {
      const i = mov.indexOf("-");
      expect(SETS[mov.slice(0, i)]?.movs[mov.slice(i + 1)], mov).toBeTruthy();
      for (const [s, t] of toques) { expect(existeSonido(s), `${mov}: ${s}`).toBeTruthy(); expect(t).toBeGreaterThanOrEqual(0); expect(t).toBeLessThan(5); }
    }
    for (const cambios of Object.values(SONIDO_PROPIO)) for (const s of Object.values(cambios)) expect(existeSonido(s), s).toBeTruthy();
  });
  it("todo movimiento de la rueda que no es baile ni burla tiene sonido", () => {
    const sinSonido = Object.entries(SETS).flatMap(([sid, d]) => Object.entries(d.movs).filter(([, m]) => m.rueda).map(([mid]) => `${sid}-${mid}`))
      .filter(id => !SONIDOS_MOV[id]);
    expect(sinSonido.sort()).toEqual(["base-bailar", "base-bailar2", "base-bailar3", "base-burla", "base-burla2", "base-burla3", "base-nervios"]);
  });
  it("Star Wars usa sable láser y bláster; Harry Potter, varita", () => {
    expect(sonidosDe("darth-vader", "espada-combo").map(x => x.cual)).toEqual(["sable", "sable"]);
    expect(sonidosDe("sif", "espada-combo").map(x => x.cual)).toEqual(["espada", "espada"]);
    expect(sonidosDe("mandaloriano", "rifle-disparar")[0]!.cual).toBe("blaster");
    expect(sonidosDe("harry-potter", "magia-hechizo")[0]!.cual).toBe("varita");
  });
});
