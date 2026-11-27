import { describe, expect, it } from "vitest";
import { alCaer, anotarGolpe, avanzarPlataforma, crearPlataforma, radioEn, rankingPlataforma, salioDePartida } from "./plataforma";
import { colocar, crearCuarto, entrar, mandar, pasoCuarto } from "./cuarto";

describe("¡Al vacío!", () => {
  it("necesita 2 o más; en equipos reparte alternado", () => {
    expect(crearPlataforma(["a"], "solos", 0)).toBeNull();
    const p = crearPlataforma(["a", "b", "c", "d"], "equipos", 0)!;
    expect(p.equipo).toEqual({ a: 0, b: 1, c: 0, d: 1 });
  });

  it("solos: el último en pie gana la ronda; quien te tira gana un punto; 3 rondas y podio", () => {
    const p = crearPlataforma(["a", "b", "c"], "solos", 0)!;
    expect(avanzarPlataforma(p, 0)).toEqual([{ tipo: "ronda", n: 1 }]);
    anotarGolpe(p, "a", "b", 1000);
    expect(alCaer(p, "b", 2000)).toEqual([{ tipo: "fuera", id: "b", por: "a" }]);
    anotarGolpe(p, "a", "c", 1000);
    expect(alCaer(p, "c", 9000)[0]).toEqual({ tipo: "fuera", id: "c", por: null }); // el golpe fue hace mucho
    expect(p.fase).toBe("pausa");
    expect(p.puntos).toEqual({ a: 4, b: 0, c: 0 });
    expect(avanzarPlataforma(p, 10000)).toEqual([]); // pausa
    avanzarPlataforma(p, 13000);
    expect(p.ronda).toBe(2);
    alCaer(p, "a", 14000); alCaer(p, "b", 15000);
    avanzarPlataforma(p, 20000);
    alCaer(p, "a", 21000); alCaer(p, "c", 22000);
    const fin = avanzarPlataforma(p, 30000);
    expect(fin[0]!.tipo).toBe("fin");
    expect(rankingPlataforma(p)).toEqual([{ id: "a", lugar: 1, puntos: 4 }, { id: "b", lugar: 2, puntos: 3 }, { id: "c", lugar: 2, puntos: 3 }]);
  });

  it("equipos: gana el equipo con alguien en pie (todos sus miembros); tirar a un compañero no da punto", () => {
    const p = crearPlataforma(["a", "b", "c", "d"], "equipos", 0)!;
    avanzarPlataforma(p, 0);
    anotarGolpe(p, "a", "c", 100);
    expect(alCaer(p, "c", 200)[0]).toEqual({ tipo: "fuera", id: "c", por: null });
    alCaer(p, "b", 300);
    const ev = alCaer(p, "d", 400);
    expect(ev[1]).toEqual({ tipo: "ganaRonda", ids: ["a", "c"], equipo: 0 });
    expect(p.puntos.c).toBe(3);
  });

  it("la plataforma se encoge con el tiempo y quien se va a media ronda queda fuera", () => {
    const p = crearPlataforma(["a", "b"], "solos", 0)!;
    avanzarPlataforma(p, 0);
    expect(radioEn(p, 10000)).toBe(7.5);
    expect(radioEn(p, 40000)).toBeCloseTo((7.5 + 2.4) / 2);
    expect(radioEn(p, 90000)).toBeCloseTo(2.4);
    expect(salioDePartida(p, "b", 1000)).toEqual([{ tipo: "ganaRonda", ids: ["a"], equipo: null }]);
  });

  it("en el cuarto: sin reaparecer, el que sale de la plataforma sigue cayendo; colocar los pone de pie en círculo", () => {
    const e = crearCuarto({ forma: "plataforma", radio: 5, reaparecer: false, sinVuelo: true });
    const a = entrar(e, "a"); entrar(e, "b");
    colocar(e, ["a", "b"], 3);
    expect(Math.hypot(a.x, a.z)).toBeCloseTo(3);
    let cayo = false;
    for (let i = 0; i < 200; i++) { mandar(e, "a", { x: 0, z: 1 }); if (pasoCuarto(e, 16).some(v => v.tipo === "cae" && v.id === "a")) cayo = true; }
    expect(cayo).toBe(true);
    for (let i = 0; i < 300; i++) pasoCuarto(e, 16);
    expect(a.y).toBeLessThan(-14);
    mandar(e, "b", { x: 0, z: 0, volar: true }); pasoCuarto(e, 16);
    expect(e.cuerpos.get("b")!.vuela).toBe(false);
    colocar(e, ["a", "b"], 3);
    expect(a.y).toBe(0); expect(a.cayendo).toBe(false);
  });
});
