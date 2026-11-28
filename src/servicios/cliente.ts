// Conexión con Supabase. Es el único archivo que crea el cliente.
// Solo se usa la llave publicable (tools/revisar-config.mjs detiene el build si no lo es).
// Los errores hacia el jugador son genéricos; el detalle va a la consola.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Modo Fiesta (laptop sin internet): nunca la nube de producción, aunque el .env.local la tenga. Con la copia local de
// Supabase (VITE_ALV_FIESTA_NUBE=1, tools/fiesta/supabase-local.mjs) se habla con ella por /supabase/ de la misma laptop.
const FIESTA = import.meta.env.VITE_ALV_FIESTA === "1";
const FIESTA_NUBE = FIESTA && import.meta.env.VITE_ALV_FIESTA_NUBE === "1" && typeof location !== "undefined";
const URL = FIESTA_NUBE ? location.origin + "/supabase" : FIESTA ? undefined : import.meta.env.VITE_SUPABASE_URL as string | undefined;
const LLAVE = FIESTA && !FIESTA_NUBE ? undefined : import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const cliente: SupabaseClient | null = URL && LLAVE
  ? createClient(URL, LLAVE, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

/**
 * Cliente aparte para una cuenta que entra en el aparato de otro (lobby de un aparato, 053). No guarda la sesión ni la
 * renueva: se usa unos segundos para crear o comprobar la cuenta y entrar a la sala espejo, y se cierra. Nunca toca la
 * sesión del dueño del aparato.
 */
export const clienteAparte = (): SupabaseClient | null => URL && LLAVE
  ? createClient(URL, LLAVE, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "alv-aparte-" + Math.random().toString(36).slice(2) } })
  : null;

/**
 * Cliente de un personaje rápido que juega en el celular del anfitrión dentro de una sala en línea (Elías, 27 nov).
 * Su sesión vive solo en esta pestaña (sessionStorage): sobrevive a una recarga y se borra al cerrar la pestaña o la sala.
 */
export const clienteSostenido = (clave: string): SupabaseClient | null => URL && LLAVE && typeof sessionStorage !== "undefined"
  ? createClient(URL, LLAVE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: clave, storage: sessionStorage } })
  : null;

/** Hay servidor configurado. Sin él, la app sigue en modo local. */
export const hayNube = cliente !== null;

export const GENERICO = "No se pudo. Revisa tu nickname y contraseña.";

/** Nickname de la cuenta abierta en este celular, o null. */
let usuario: string | null = null;
/** Artículos que el servidor dice que la cuenta compró (se actualiza al leer la cuenta). */
let tieneCuenta: string[] = [];

export const cuentaActiva = () => usuario;
export const fijarUsuario = (u: string | null) => { usuario = u; };
export const articulosCuenta = () => tieneCuenta;
export const fijarArticulos = (a: string[]) => (tieneCuenta = a);

/** id de la cuenta abierta, o null. */
export const uidActual = async () => (await cliente?.auth.getUser())?.data.user?.id ?? null;
