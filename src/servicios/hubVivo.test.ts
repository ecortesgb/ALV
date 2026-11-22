import { describe, expect, it } from "vitest";
import { MAX_TEXTO, mensajeValido, unirPresencia } from "./hubVivo";

describe("chat del HUB: lo que llega de la red", () => {
  const base = { id: "m1", de: "u1", nombre: "Ana", texto: "hola", t: 1 };
  it("acepta un mensaje bien formado", () => { expect(mensajeValido(base)).toEqual(base); });
  it("rechaza tipos raros y vacíos", () => {
    expect(mensajeValido(null)).toBeNull();
    expect(mensajeValido({ ...base, texto: 5 })).toBeNull();
    expect(mensajeValido({ ...base, texto: "   " })).toBeNull();
    expect(mensajeValido({ ...base, id: "x".repeat(65) })).toBeNull();
  });
  it("recorta texto y nombre largos y junta espacios", () => {
    const m = mensajeValido({ ...base, texto: "a  b\n".repeat(200), nombre: "N".repeat(40) })!;
    expect(m.texto.length).toBe(MAX_TEXTO);
    expect(m.texto.startsWith("a b a b")).toBe(true);
    expect(m.nombre).toHaveLength(20);
  });
  it("sin nombre sale «Alguien»", () => { expect(mensajeValido({ ...base, nombre: " " })!.nombre).toBe("Alguien"); });
});

describe("quién está en línea", () => {
  it("una fila por cuenta aunque abra varias pestañas, en orden", () => {
    const l = unirPresencia([{ id: "b", nombre: "Beto" }, { id: "a", nombre: "Ana" }, { id: "b", nombre: "Beto" }, { basura: 1 }, null]);
    expect(l).toEqual([{ id: "a", nombre: "Ana" }, { id: "b", nombre: "Beto" }]);
  });
});
