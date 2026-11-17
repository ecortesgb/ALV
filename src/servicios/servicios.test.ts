// servicios/: sin servidor configurado nada toca la red y los mensajes son genéricos.
import { describe, expect, it, vi } from "vitest";
import * as servicios from ".";
import { crearDetectorPantalla, ESPERA_VIVO_MS, LATIDO_PANTALLA_MS, RESPALDO_MS, REVISION_PANTALLA_MS, SILENCIO_PANTALLA_MS } from "./tiempoReal";

describe("servicios/", () => {
  // Con un .env.local que apunte a Supabase esta prueba se salta: no debe tocar la base real.
  it.skipIf(servicios.hayNube)("sin servidor configurado, todo responde sin red y con mensajes genéricos", async () => {
    expect(servicios.cuentaActiva()).toBeNull();
    expect(await servicios.sesionActual()).toBeNull();
    expect(await servicios.entrar("elias", "12345678")).toBe("No se pudo. Revisa tu nickname y contraseña.");
    expect(await servicios.rankingConocidos()).toBeNull();
    expect(await servicios.misMovimientos()).toEqual([]);
    expect(await servicios.restablecerClave("x", "corta")).toBe("No hay cuenta abierta.");
  });
  it("las reglas del apodo y la contraseña no cambiaron", () => {
    expect(servicios.nickValido("Elias_7")).toBe(true);
    expect(servicios.nickValido("el")).toBe(false);
    expect(servicios.nickValido("con espacio")).toBe(false);
    expect(servicios.passValida("1234567")).toBe(false);
    expect(servicios.passValida("12345678")).toBe(true);
  });
  it("tiempo real: respaldo a los 5 s y consulta cada 3 s (Maestro §21.4)", () => {
    expect(ESPERA_VIVO_MS).toBe(5000);
    expect(RESPALDO_MS).toBe(3000);
  });
  it("el QR deja dentro de la sala", () => {
    (globalThis as { location?: unknown }).location = { origin: "https://ejemplo.test", pathname: "/ALV/" };
    expect(servicios.enlaceSala("K7PQ2M")).toBe("https://ejemplo.test/ALV/#/s/K7PQ2M");
  });
});

describe("P-02: detección de la Pantalla", () => {
  it("«ausente» llega tras el silencio, no antes, y el latido lo quita solo", () => {
    vi.useFakeTimers();
    const vistos: string[] = [];
    const d = crearDetectorPantalla(p => vistos.push(p), 4000);
    d.latido();
    vi.advanceTimersByTime(3900); d.revisar();
    expect(d.estado()).toBe("presente");
    d.latido(); // sigue latiendo: no hay aviso
    vi.advanceTimersByTime(3900); d.revisar();
    expect(vistos).toEqual(["presente"]);
    vi.advanceTimersByTime(200); d.revisar();
    expect(d.estado()).toBe("ausente");
    d.latido(); // la Pantalla vuelve: el aviso se va solo
    expect(d.estado()).toBe("presente");
    expect(vistos).toEqual(["presente", "ausente", "presente"]);
    vi.useRealTimers();
  });
  it("si nunca se oyó a la Pantalla también acaba en «ausente»; sin canal no se avisa", () => {
    vi.useFakeTimers();
    const d = crearDetectorPantalla(() => undefined, 4000);
    vi.advanceTimersByTime(3000); d.revisar();
    expect(d.estado()).toBe("desconocida");
    vi.advanceTimersByTime(1100); d.revisar();
    expect(d.estado()).toBe("ausente");
    d.perdido();
    expect(d.estado()).toBe("desconocida");
    vi.useRealTimers();
  });
  it("el aviso sale en menos de 6 s", () => {
    expect(SILENCIO_PANTALLA_MS + REVISION_PANTALLA_MS).toBeLessThan(6000);
    expect(LATIDO_PANTALLA_MS * 2).toBeLessThan(SILENCIO_PANTALLA_MS);
  });
});
