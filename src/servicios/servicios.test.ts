// servicios/: sin servidor configurado nada toca la red y los mensajes son genéricos.
import { describe, expect, it } from "vitest";
import * as servicios from ".";
import { ESPERA_VIVO_MS, RESPALDO_MS } from "./tiempoReal";

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
