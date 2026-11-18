import { describe, expect, it } from "vitest";
import { figuraNueva, ponerCascoSolo, ponerTorsoCompleto } from "../app/editarFigura";
import catalogo from "../content/catalogo-figura.json";
import { aplicar, combinan, estilosDe, ordenarPorEstilo, sugerencias } from "./look";

describe("completa el look", () => {
  it("sin piezas con estilo no sugiere nada", () => {
    expect(sugerencias(figuraNueva())).toEqual([]);
  });
  it("un casco espacial sugiere piezas espaciales de otras secciones y se pueden aplicar", () => {
    const f = ponerCascoSolo(figuraNueva(), "HELM_013", "#f4f4f4");
    expect(estilosDe(f)[0]).toBe("espacio");
    const s = sugerencias(f);
    expect(s.length).toBeGreaterThan(0);
    expect(s.every(x => x.seccion !== "casco")).toBe(true);
    const g = aplicar(f, s[0]!);
    expect(estilosDe(g)).toContain("espacio");
  });
  it("ordena primero «nada» y luego las del estilo", () => {
    const orden = ordenarPorEstilo(catalogo.secciones.casco as { id: string | null; tags?: string[] }[], ["espacio"]);
    expect(orden[0]!.id).toBeNull(); expect(orden[1]!.id).toBe("HELM_013");
  });
  it("un traje con original también cuenta para el estilo", () => {
    const t = (catalogo.secciones.torso as { id: string | null; original?: never }[]).find(x => x.id === "PRINT_015")!;
    expect(estilosDe(ponerTorsoCompleto(figuraNueva(), t.id, t.original))).toContain("trabajo");
  });
});

describe("colores que combinan", () => {
  it("devuelve colores de la paleta que no son los de la base", () => {
    const c = combinan(["#c91a09", "#0055bf"], catalogo.paleta);
    expect(c.length).toBeGreaterThanOrEqual(2);
    expect(c.every(x => catalogo.paleta.includes(x))).toBe(true);
    expect(c).not.toContain("#c91a09");
  });
});
