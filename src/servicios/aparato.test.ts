import { describe, expect, it } from "vitest";
import { claveAleatoria, codigoLegible } from "./aparato";
import { passValida } from "./cuenta";

describe("personaje rápido (053)", () => {
  it("la contraseña aleatoria es válida, distinta cada vez y sin letras que se confunden", () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const c = claveAleatoria();
      expect(c).toHaveLength(10);
      expect(passValida(c)).toBe(true);
      expect(c).toMatch(/\d/); expect(c).toMatch(/[A-Z]/); expect(c).toMatch(/[a-z]/);
      expect(c).not.toMatch(/[0O1Il]/);
      vistas.add(c);
    }
    expect(vistas.size).toBe(200);
  });
  it("el código se muestra en grupos de 4", () => {
    expect(codigoLegible("ABCD2345WXYZ")).toBe("ABCD-2345-WXYZ");
  });
});
