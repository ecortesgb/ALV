// nube.ts se partió en servicios/ sin cambiar lo que ofrece: las pantallas de hoy siguen encontrando todo.
import { describe, expect, it } from "vitest";
import * as nube from "../app/nube";
import * as servicios from ".";

/** Lo que nube.ts exportaba antes de partirse (funciones y valores; los tipos no existen al correr). */
const ANTES = [
  "hayNube", "nickValido", "passValida", "cuentaActiva", "sesionActual", "registrar", "guardarRegistro", "miRegistro",
  "entrar", "salir", "registrarPartidaNube", "registrarXpExtraNube", "cargarPersonaje", "guardarPersonaje",
  "cargarCapsulasNube", "guardarCapsulasNube", "leerCuenta", "comprarAccesorioNube", "comprarSobreNube",
  "abrirSala", "unirseSala", "miSalaAbierta", "miembrosSala", "marcarEnSala", "generosSala",
  "soyAdmin", "adminJugadores", "adminAjustarXp", "restablecerClave", "cerrarSala", "salirDeSala", "enlaceSala",
  "miUid", "crearPartidaSala", "publicarPartida", "leerAcciones", "enviarAccion", "terminarPartidaSala",
  "partidaDeSala", "miSecreto",
].sort();

describe("servicios/ (antes nube.ts)", () => {
  it("nube.ts sigue ofreciendo exactamente lo mismo", () => {
    expect(Object.keys(nube).sort()).toEqual(ANTES);
    for (const k of ANTES) expect((nube as Record<string, unknown>)[k]).toBe((servicios as Record<string, unknown>)[k]);
  });
  // Con un .env.local que apunte a Supabase esta prueba se salta: no debe tocar la base real.
  it.skipIf(nube.hayNube)("sin servidor configurado, todo responde sin red y con mensajes genéricos", async () => {
    expect(nube.cuentaActiva()).toBeNull();
    expect(await nube.sesionActual()).toBeNull();
    expect(await nube.entrar("elias", "12345678")).toBe("No se pudo. Revisa tu nickname y contraseña.");
    expect(await nube.unirseSala("ABC123")).toBe("Primero entra a tu cuenta.");
    expect(await nube.comprarSobreNube("basico")).toEqual({ ok: false, motivo: "No hay cuenta abierta." });
    expect(await nube.leerAcciones("x")).toEqual([]);
    expect(await nube.restablecerClave("x", "corta")).toBe("No hay cuenta abierta.");
  });
  it("las reglas del nickname y la contraseña no cambiaron", () => {
    expect(nube.nickValido("Elias_7")).toBe(true);
    expect(nube.nickValido("el")).toBe(false);
    expect(nube.nickValido("con espacio")).toBe(false);
    expect(nube.passValida("1234567")).toBe(false);
    expect(nube.passValida("12345678")).toBe(true);
  });
});
