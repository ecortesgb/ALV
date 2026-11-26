import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { siguienteFondo } from "./rotacionFondos";

describe("rotación de fondos", () => {
  const fondos = ["uno", "dos", "tres"] as const;
  let memoria: Map<string, string>;
  let almacenamiento: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
  const descriptorOriginal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  beforeEach(() => {
    memoria = new Map<string, string>();
    almacenamiento = {
      getItem: vi.fn((clave: string) => memoria.get(clave) ?? null),
      setItem: vi.fn((clave: string, valor: string) => void memoria.set(clave, valor)),
    };
    (globalThis as { localStorage?: unknown }).localStorage = almacenamiento;
  });

  afterEach(() => {
    if (descriptorOriginal) Object.defineProperty(globalThis, "localStorage", descriptorOriginal);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("entrega 0, 1, 2 y vuelve a 0, guardando el último índice", () => {
    for (const indice of [0, 1, 2, 0]) {
      expect(siguienteFondo("personaje", fondos)).toBe(fondos[indice]);
      expect(memoria.get("alv-fondo-turno-personaje")).toBe(String(indice));
    }
  });

  it("devuelve siempre el único fondo", () => {
    for (let turno = 0; turno < 4; turno++) {
      expect(siguienteFondo("personaje", ["único"])).toBe("único");
      expect(memoria.get("alv-fondo-turno-personaje")).toBe("0");
    }
  });

  it("devuelve null para una lista vacía sin leer ni escribir", () => {
    expect(siguienteFondo("personaje", [])).toBeNull();
    expect(almacenamiento.getItem).not.toHaveBeenCalled();
    expect(almacenamiento.setItem).not.toHaveBeenCalled();
  });

  it("mantiene turnos independientes por clave", () => {
    expect(siguienteFondo("ana", fondos)).toBe("uno");
    expect(siguienteFondo("ana", fondos)).toBe("dos");
    expect(siguienteFondo("beto", fondos)).toBe("uno");
    expect(siguienteFondo("ana", fondos)).toBe("tres");
    expect(siguienteFondo("beto", fondos)).toBe("dos");
  });

  it("recorta los espacios de la clave y usa la misma llave", () => {
    expect(siguienteFondo(" personaje \t", fondos)).toBe("uno");
    expect(siguienteFondo("personaje", fondos)).toBe("dos");
    expect([...memoria.entries()]).toEqual([["alv-fondo-turno-personaje", "1"]]);
  });

  it.each(["", " \t\n"])("devuelve el primero sin almacenamiento con clave vacía %j", clave => {
    expect(siguienteFondo(clave, fondos)).toBe("uno");
    expect(almacenamiento.getItem).not.toHaveBeenCalled();
    expect(almacenamiento.setItem).not.toHaveBeenCalled();
  });

  it.each(["abc", "-1", "1.5", "1e3", "", "NaN", "1\n"])("empieza en 0 con el valor inválido %j", valor => {
    memoria.set("alv-fondo-turno-personaje", valor);
    expect(siguienteFondo("personaje", fondos)).toBe("uno");
    expect(memoria.get("alv-fondo-turno-personaje")).toBe("0");
  });

  it("ajusta el turno cuando la lista se achica", () => {
    memoria.set("alv-fondo-turno-personaje", "4");
    expect(siguienteFondo("personaje", fondos)).toBe("tres");
    expect(memoria.get("alv-fondo-turno-personaje")).toBe("2");
  });

  it("calcula el turno exacto para enteros mayores que la precisión de Number", () => {
    memoria.set("alv-fondo-turno-personaje", "9007199254740993");
    expect(siguienteFondo("personaje", fondos)).toBe("dos");
    expect(memoria.get("alv-fondo-turno-personaje")).toBe("1");
  });

  it("entrega y guarda el primero si falla la lectura", () => {
    almacenamiento.getItem.mockImplementation(() => { throw new Error("lectura bloqueada"); });
    expect(siguienteFondo("personaje", fondos)).toBe("uno");
    expect(memoria.get("alv-fondo-turno-personaje")).toBe("0");
  });

  it("entrega el siguiente sin lanzar si falla el guardado", () => {
    memoria.set("alv-fondo-turno-personaje", "0");
    almacenamiento.setItem.mockImplementation(() => { throw new Error("guardado bloqueado"); });
    expect(siguienteFondo("personaje", fondos)).toBe("dos");
  });

  it("entrega el primero sin lanzar cuando no existe localStorage", () => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    expect(siguienteFondo("personaje", fondos)).toBe("uno");
  });

  it("entrega el primero si el acceso a localStorage lanza", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => { throw new Error("almacenamiento bloqueado"); },
    });
    expect(siguienteFondo("personaje", fondos)).toBe("uno");
  });
});
