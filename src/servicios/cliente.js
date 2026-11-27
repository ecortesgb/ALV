// Conexión con Supabase. Es el único archivo que crea el cliente.
// Solo se usa la llave publicable (tools/revisar-config.mjs detiene el build si no lo es).
// Los errores hacia el jugador son genéricos; el detalle va a la consola.
import { createClient } from "@supabase/supabase-js";
const URL = import.meta.env.VITE_SUPABASE_URL;
const LLAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cliente = URL && LLAVE
    ? createClient(URL, LLAVE, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;
/** Hay servidor configurado. Sin él, la app sigue en modo local. */
export const hayNube = cliente !== null;
export const GENERICO = "No se pudo. Revisa tu nickname y contraseña.";
/** Nickname de la cuenta abierta en este celular, o null. */
let usuario = null;
/** Artículos que el servidor dice que la cuenta compró (se actualiza al leer la cuenta). */
let tieneCuenta = [];
export const cuentaActiva = () => usuario;
export const fijarUsuario = (u) => { usuario = u; };
export const articulosCuenta = () => tieneCuenta;
export const fijarArticulos = (a) => (tieneCuenta = a);
/** id de la cuenta abierta, o null. */
export const uidActual = async () => (await cliente?.auth.getUser())?.data.user?.id ?? null;
