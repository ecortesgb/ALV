// Administración: solo cuentas en privado.administradores. El servidor valida el permiso en cada función.
import { passValida } from "./cuenta";
import { cliente, cuentaActiva } from "./cliente";

/** ¿La cuenta abierta es administradora? */
export async function soyAdmin(): Promise<boolean> {
  if (!cliente || !cuentaActiva()) return false;
  try { const { data, error } = await cliente.rpc("soy_admin"); return !error && data === true; } catch { return false; }
}

export interface CuentaAdmin { id: string; nombre: string; acumulada: number; disponible: number; delEvento: number }

/** Todas las cuentas con su XP (el servidor rechaza si no eres administrador). */
export async function adminJugadores(): Promise<CuentaAdmin[] | null> {
  if (!cliente || !cuentaActiva()) return null;
  try {
    const { data, error } = await cliente.rpc("admin_jugadores");
    if (error) { console.error("adminJugadores", error.message); return null; }
    return ((data ?? []) as { id: string; nombre: string; acumulada: number; disponible: number; del_evento: number }[])
      .map(x => ({ id: x.id, nombre: x.nombre, acumulada: x.acumulada, disponible: x.disponible, delEvento: x.del_evento }));
  } catch (e) { console.error("adminJugadores", e); return null; }
}

/** Suma o quita XP a una cuenta. Devuelve null si salió bien, o el motivo. */
export async function adminAjustarXp(jugador: string, xp: number, motivo: string): Promise<string | null> {
  if (!cliente || !cuentaActiva()) return "No hay cuenta abierta.";
  try {
    const { error } = await cliente.rpc("admin_ajustar_xp", { p_jugador: jugador, p_xp: xp, p_motivo: motivo });
    if (!error) return null;
    console.error("adminAjustarXp", error.message);
    return error.message.includes("no tiene xp") ? "No tiene XP para quitar." : "No se pudo ajustar.";
  } catch (e) { console.error("adminAjustarXp", e); return "No se pudo ajustar."; }
}

/** Pone una contraseña nueva a otra cuenta (función del servidor; solo administradores). */
export async function restablecerClave(jugador: string, clave: string): Promise<string | null> {
  if (!cliente || !cuentaActiva()) return "No hay cuenta abierta.";
  if (!passValida(clave)) return "La contraseña va de 8 a 72 caracteres.";
  try {
    const { error } = await cliente.functions.invoke("restablecer-clave", { body: { jugador, clave } });
    if (error) { console.error("restablecerClave", error.message); return "No se pudo cambiar la contraseña."; }
    return null;
  } catch (e) { console.error("restablecerClave", e); return "No se pudo cambiar la contraseña."; }
}

/** Borra todas las cuentas de invitado con su XP, figuras y salas. Devuelve cuántas borró, o null si no se pudo. */
export async function adminBorrarInvitados(): Promise<number | null> {
  if (!cliente || !cuentaActiva()) return null;
  try {
    const { data, error } = await cliente.rpc("admin_borrar_invitados");
    if (error) { console.error("adminBorrarInvitados", error.message); return null; }
    return typeof data === "number" ? data : 0;
  } catch (e) { console.error("adminBorrarInvitados", e); return null; }
}
