// Preferencias en la cuenta (migración 039): al iniciar sesión se leen y pisan las del aparato; cada cambio se guarda en
// segundo plano (agrupado, 0.6 s). Nombre visible y borrar la propia cuenta. El servidor valida todo en sus funciones.
import { CLAVES_CUENTA, cambiarPreferencias, registrarGuardadoCuenta, type Preferencias } from "../app/preferencias";
import { cliente, cuentaActiva } from "./cliente";

let cuenta: string | null = null;   // uid cuyas preferencias ya se leyeron
let pendiente: Record<string, unknown> = {};
let reloj: ReturnType<typeof setTimeout> | undefined;

function guardarEnCuenta(cambio: Partial<Preferencias>) {
  if (!cliente || !cuenta) return;
  Object.assign(pendiente, cambio);
  clearTimeout(reloj);
  reloj = setTimeout(async () => {
    const p = pendiente; pendiente = {};
    try {
      const { error } = await cliente!.rpc("guardar_preferencias", { p });
      if (error) console.error("guardar_preferencias", error.message);
    } catch (e) { console.error("guardar_preferencias", e); }
  }, 600);
}
registrarGuardadoCuenta(guardarEnCuenta);

/** Lee las preferencias de la cuenta una vez por sesión y las aplica en este aparato. */
export async function cargarPreferenciasCuenta(uid: string): Promise<void> {
  if (!cliente || cuenta === uid) return;
  cuenta = uid;
  try {
    const { data, error } = await cliente.from("preferencias_cuenta").select("datos").maybeSingle();
    if (error) { console.error("preferencias_cuenta", error.message); return; }
    const datos = (data?.datos ?? {}) as Record<string, unknown>;
    const deCuenta = Object.fromEntries(Object.entries(datos).filter(([k]) => (CLAVES_CUENTA as readonly string[]).includes(k)));
    if (Object.keys(deCuenta).length) cambiarPreferencias(deCuenta as Partial<Preferencias>, { desdeCuenta: true });
  } catch (e) { console.error("preferencias_cuenta", e); }
}

/** Al salir: los cambios de aquí en adelante ya no van a esa cuenta. */
export function olvidarPreferenciasCuenta() { cuenta = null; pendiente = {}; clearTimeout(reloj); }

/** Cambia el nombre visible. Devuelve el nombre guardado, o un mensaje de error en `error`. */
export async function cambiarNombreVisible(nombre: string): Promise<{ nombre?: string; error?: string }> {
  if (!cliente) return { error: "No hay conexión." };
  try {
    const { data, error } = await cliente.rpc("cambiar_nombre", { p_nombre: nombre });
    if (error) return { error: error.message.includes("no válido") ? "De 2 a 20 letras, números, espacios, punto, guion o guion bajo." : "No se pudo cambiar. Intenta otra vez." };
    return { nombre: String(data) };
  } catch (e) { console.error("cambiarNombreVisible", e); return { error: "No se pudo cambiar. Intenta otra vez." }; }
}

/** Nombre de usuario con el que se entra (no cambia). */
export const nombreDeUsuario = () => cuentaActiva();

/** Borra la cuenta abierta. Para confirmar se escribe el nombre de usuario. Devuelve null si se borró, o el motivo. */
export async function borrarMiCuenta(confirmacion: string): Promise<string | null> {
  if (!cliente) return "No hay conexión.";
  try {
    const { error } = await cliente.rpc("borrar_mi_cuenta", { p_confirmar: confirmacion });
    if (!error) { olvidarPreferenciasCuenta(); return null; }
    if (error.message.includes("confirmación")) return "El nombre de usuario no coincide.";
    if (error.message.includes("único administrador")) return "Eres el único administrador: tu cuenta no se puede borrar.";
    console.error("borrarMiCuenta", error.message);
    return "No se pudo borrar. Intenta otra vez.";
  } catch (e) { console.error("borrarMiCuenta", e); return "No se pudo borrar. Intenta otra vez."; }
}
