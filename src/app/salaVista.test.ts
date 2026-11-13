import { describe, expect, it } from "vitest";
import type { MiembroSala } from "./nube";
import { traducirSala } from "./salaVista";

const m = (id: string, extra: Partial<MiembroSala> = {}): MiembroSala =>
  ({ id, nombre: id, personaje: null, anfitrion: false, listo: false, gesto: null, gestoA: null, gestoN: 0, ...extra });

describe("traducirSala", () => {
  const miembros = [
    m("host", { anfitrion: true, listo: true, gesto: "saludar", gestoN: 1 }),
    m("ana", { listo: true, gesto: "empujar", gestoA: "host", gestoN: 3 }),
    m("beto"),
  ];

  it("anfitrión: su cuenta es su primer jugador local y los demás llevan c-", () => {
    const t = traducirSala("anfitrion", miembros, "local-0");
    expect([...t.listos].sort()).toEqual(["c-ana", "local-0"]);
    expect(t.gestos["local-0"]).toEqual({ gesto: "saludar", a: undefined, n: 1 });
    expect(t.gestos["c-ana"]).toEqual({ gesto: "empujar", a: "local-0", n: 3 });
    expect(t.gestos["c-beto"]).toBeUndefined();
  });

  it("anfitrión: traduce de vuelta al servidor y no manda a jugadores locales sin cuenta", () => {
    const t = traducirSala("anfitrion", miembros, "local-0");
    expect(t.aServidor("local-0")).toBe("host");
    expect(t.aServidor("c-ana")).toBe("ana");
    expect(t.aServidor("local-1")).toBeUndefined();
  });

  it("invitado: usa los ids de cuenta tal cual", () => {
    const t = traducirSala("invitado", miembros, "host");
    expect(t.gestos["ana"]).toEqual({ gesto: "empujar", a: "host", n: 3 });
    expect(t.aServidor("beto")).toBe("beto");
  });
});
