import { describe, expect, it } from "vitest";
import { logrosDe, type JugadorLogros, type PartidaLogros } from "./logros";

const gan = (id: string, j: JugadorLogros[], h: PartidaLogros[] = []) =>
  logrosDe(id, j, h).filter(l => l.ganado).map(l => l.clave);

const grupo: JugadorLogros[] = [
  { id: "a", nombre: "Ana", delEvento: 30, pareja: "b" },
  { id: "b", nombre: "Beto", delEvento: 10, pareja: "a" },
  { id: "c", nombre: "Caro", delEvento: 5, pareja: "d" },
  { id: "d", nombre: "Dani", delEvento: 2, pareja: "c" },
];

describe("logros de sesión", () => {
  it("da GOAT solo al primero con XP", () => {
    expect(gan("a", grupo)).toContain("goat");
    expect(gan("b", grupo)).not.toContain("goat");
  });
  it("sin XP de sesión nadie tiene GOAT ni dupla", () => {
    const cero = grupo.map(j => ({ ...j, delEvento: 0 }));
    for (const j of cero) expect(gan(j.id, cero)).toEqual([]);
  });
  it("da dupla a la pareja con más XP de sesión", () => {
    expect(gan("a", grupo)).toContain("dupla");
    expect(gan("c", grupo)).not.toContain("dupla");
  });
});

describe("logros históricos", () => {
  const partida = (resultados: PartidaLogros["resultados"]): PartidaLogros => ({ juego: "Verdad o reto", resultados });
  it("MVP al mejor puntaje de una partida, sin contar XP extra", () => {
    const h = [
      partida([{ id: "c", nombre: "Caro", puntos: 4, xp: 4 }, { id: "a", nombre: "Ana", puntos: 2, xp: 2 }]),
      { juego: "XP extra", extra: "Ayudó", resultados: [{ id: "b", nombre: "Beto", puntos: 0, xp: 50 }] },
    ];
    expect(gan("c", grupo, h)).toContain("mvp");
    expect(gan("b", grupo, h)).not.toContain("mvp");
  });
  it("sobreviviente con 10 partidas, por id o por nombre si es historial viejo", () => {
    const h = Array.from({ length: 10 }, () => partida([{ nombre: "Ana", puntos: 1, xp: 1 }]));
    expect(gan("a", grupo, h)).toContain("sobreviviente");
    expect(gan("a", grupo, h.slice(1))).not.toContain("sobreviviente");
  });
});
