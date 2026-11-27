import { describe, expect, it } from "vitest";
import { crearAzar } from "./azar";
import { RACHA_CERO, abrirSobre, faltanParaGarantia, probabilidadComodines, probabilidadPiezas, sobreDisponible, tirarRareza, type Racha } from "./sobresTienda";
import { GARANTIA, PIEZAS_COLECCION, SOBRES, TOPE_COMODIN, piezasDeSobre, sobrePorId } from "../content/tienda";
import { RAREZA } from "../content/rarezas";

const S = (id: string) => sobrePorId(id)!;
const nada = new Set<string>();

describe("sobres de la tienda", () => {
  it("distingue el 50 % por extracción del 87.5 % por sobre y respeta el tope", () => {
    for (const demo of [true, false]) {
      const tasas = probabilidadComodines(S("comodines"), { turno: TOPE_COMODIN }, demo);
      expect(tasas).toHaveLength(2);
      expect(tasas.every(c => c.porCarta === 0.5 && c.enSobre === 0.875)).toBe(true);
      expect(tasas.find(c => c.id === "turno")?.alTope).toBe(true);
      expect(tasas.find(c => c.id === "cambio")?.alTope).toBe(false);
    }
  });

  it("calcula la garantía por pieza y el reparto sin repetidas", () => {
    const sobre = { ...S("basico"), piezas: 1, pesos: { rara: 100, epica: 0, legendaria: 0 } };
    const legendarias = piezasDeSobre(sobre).filter(p => p.rareza === "legendaria");
    const tasas = probabilidadPiezas(sobre, nada, { sinEpica: 0, sinLegendaria: GARANTIA.legendaria - 1 });
    expect(tasas.legendaria).toBeCloseTo(1 / legendarias.length);
    expect(tasas.rara).toBe(0);
    expect(tasas.epica).toBe(0);
    const par = S("basico");
    const tasasPar = probabilidadPiezas(par, nada, RACHA_CERO);
    expect(piezasDeSobre(par).reduce((s, p) => s + tasasPar[p.rareza], 0)).toBeCloseTo(par.piezas);
  });
  it("los 5 sobres de Elías con sus precios", () => {
    expect(SOBRES.map(s => [s.id, s.precio])).toEqual([["basico", 50], ["accesorios", 120], ["comodines", 150], ["mixto", 180], ["epico", 200]]);
  });

  it("la colección son las piezas bloqueadas de rarezas.ts, sin comunes", () => {
    expect(PIEZAS_COLECCION.length).toBe(Object.values(RAREZA).filter(r => r !== "comun").length);
    expect(PIEZAS_COLECCION.some(p => (p.rareza as string) === "comun")).toBe(false);
  });

  it("trae lo que dice: piezas y comodines", () => {
    for (const s of SOBRES) {
      const a = abrirSobre(s, nada, {}, RACHA_CERO, crearAzar(7))!;
      expect(a.cartas.filter(c => c.tipo === "pieza").length).toBe(s.piezas);
      expect(a.cartas.filter(c => c.tipo !== "pieza").length).toBe(s.comodines);
    }
  });

  it("nunca repite piezas, ni dentro del sobre ni con lo que ya tienes", () => {
    const tengo = new Set<string>();
    let racha: Racha = RACHA_CERO;
    for (let i = 0; i < 200; i++) {
      const a = abrirSobre(S("basico"), tengo, {}, racha, crearAzar(i));
      if (!a) break;
      for (const c of a.cartas) if (c.tipo === "pieza") { expect(tengo.has(c.id)).toBe(false); tengo.add(c.id); }
      racha = a.racha;
    }
    expect(tengo.size).toBe(PIEZAS_COLECCION.length);
    expect(sobreDisponible(S("basico"), tengo)).toBe(false);
    expect(abrirSobre(S("basico"), tengo, {}, RACHA_CERO, crearAzar(1))).toBeNull();
    expect(sobreDisponible(S("comodines"), tengo)).toBe(true);
  });

  it("el de accesorios solo trae cascos, detalles, cuello y objetos", () => {
    for (let i = 0; i < 30; i++) {
      const a = abrirSobre(S("accesorios"), nada, {}, RACHA_CERO, crearAzar(i))!;
      const ok = new Set(piezasDeSobre(S("accesorios")).map(p => p.id));
      for (const c of a.cartas) if (c.tipo === "pieza") expect(ok.has(c.id)).toBe(true);
    }
  });

  it("el épico trae al menos una épica", () => {
    for (let i = 0; i < 100; i++) {
      const a = abrirSobre(S("epico"), nada, {}, RACHA_CERO, crearAzar(i))!;
      expect(a.cartas.some(c => c.tipo === "pieza" && c.rareza !== "rara")).toBe(true);
    }
  });

  it("garantía: al sobre 8 sin épica sale épica o mejor, y la racha vuelve a 0", () => {
    const racha = { sinEpica: GARANTIA.epica - 1, sinLegendaria: 0 };
    for (let i = 0; i < 50; i++) {
      const a = abrirSobre(S("basico"), nada, {}, racha, crearAzar(i))!;
      expect(a.cartas.some(c => c.tipo === "pieza" && c.rareza !== "rara")).toBe(true);
      expect(a.racha.sinEpica).toBe(0);
    }
  });

  it("garantía: al sobre 25 sin legendaria sale legendaria", () => {
    const a = abrirSobre(S("basico"), nada, {}, { sinEpica: 0, sinLegendaria: GARANTIA.legendaria - 1 }, crearAzar(3))!;
    expect(a.cartas.some(c => c.tipo === "pieza" && c.rareza === "legendaria")).toBe(true);
    expect(a.racha).toEqual({ sinEpica: 0, sinLegendaria: 0 });
  });

  it("la racha sube con sobres sin épica y no cambia con el de comodines", () => {
    const a = abrirSobre(S("basico"), nada, {}, RACHA_CERO, crearAzar(1))!;
    const sinEpica = !a.cartas.some(c => c.tipo === "pieza" && c.rareza !== "rara");
    expect(a.racha.sinEpica).toBe(sinEpica ? 1 : 0);
    const r = { sinEpica: 3, sinLegendaria: 4 };
    expect(abrirSobre(S("comodines"), nada, {}, r, crearAzar(1))!.racha).toEqual(r);
    expect(faltanParaGarantia(r)).toEqual({ epica: GARANTIA.epica - 3, legendaria: GARANTIA.legendaria - 4 });
  });

  it("si una rareza se acaba, sale de otra", () => {
    const tengo = new Set(PIEZAS_COLECCION.filter(p => p.rareza === "rara").map(p => p.id));
    const a = abrirSobre(S("basico"), tengo, {}, RACHA_CERO, crearAzar(5))!;
    expect(a.cartas.filter(c => c.tipo === "pieza").length).toBe(2);
  });

  it("comodines con tope: el que ya tienes 9 veces se cambia por monedas", () => {
    const llenos = { turno: TOPE_COMODIN, cambio: TOPE_COMODIN, escudo: TOPE_COMODIN };
    const a = abrirSobre(S("comodines"), nada, llenos, RACHA_CERO, crearAzar(2))!;
    expect(a.cartas.every(c => c.tipo === "monedas")).toBe(true);
  });

  it("la mejor carta va al final y marca la luz", () => {
    for (let i = 0; i < 40; i++) {
      const a = abrirSobre(S("mixto"), nada, {}, RACHA_CERO, crearAzar(i))!;
      const ultima = a.cartas[a.cartas.length - 1]!;
      expect(ultima.tipo).toBe("pieza");
      if (ultima.tipo === "pieza") expect(a.mejor).toBe(ultima.rareza);
    }
  });

  it("las probabilidades se parecen a los pesos", () => {
    const azar = crearAzar(99), n = 20000, cuenta = { rara: 0, epica: 0, legendaria: 0 };
    for (let i = 0; i < n; i++) cuenta[tirarRareza(S("epico").pesos, azar)]++;
    expect(cuenta.rara / n).toBeCloseTo(0.4, 1);
    expect(cuenta.epica / n).toBeCloseTo(0.45, 1);
    expect(cuenta.legendaria / n).toBeCloseTo(0.15, 1);
  });
});
