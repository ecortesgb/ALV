// Cuenta en la nube (Supabase). Entrar es con nickname y contraseña; no se pide correo.
// El nickname se guarda como correo interno (no real) para que Supabase lo haga único.
// Solo se usa la llave publicable. Los errores hacia el jugador son genéricos; el detalle no se muestra.
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { Personaje } from "../content/personaje";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const LLAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const cliente: SupabaseClient | null = URL && LLAVE
  ? createClient(URL, LLAVE, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

/** Hay servidor configurado. Sin él, la app sigue en modo local. */
export const hayNube = cliente !== null;

const NICK = /^[a-z0-9_]{3,20}$/;
export const nickValido = (n: string) => NICK.test(n.trim().toLowerCase());
export const passValida = (p: string) => p.length >= 8 && p.length <= 72;
const correoInterno = (nick: string) => `${nick.trim().toLowerCase()}@jugadores.alv.invalid`;

const GENERICO = "No se pudo. Revisa tu nickname y contraseña.";

/** Nickname de la cuenta abierta en este celular, o null. */
let usuario: string | null = null;
export const cuentaActiva = () => usuario;

export async function sesionActual(): Promise<Session | null> {
  if (!cliente) return null;
  try {
    const { data } = await cliente.auth.getSession();
    usuario = data.session?.user.email?.split("@")[0] ?? null;
    return data.session;
  } catch { return null; }
}

/** Crea la cuenta y deja su nombre visible como lo escribió. Devuelve null si salió bien, o un mensaje. */
export async function registrar(nick: string, pass: string): Promise<string | null> {
  if (!cliente) return GENERICO;
  if (!nickValido(nick) || !passValida(pass)) return "Nickname de 3 a 20 letras, números o _. Contraseña de 8 o más.";
  try {
    const { data, error } = await cliente.auth.signUp({ email: correoInterno(nick), password: pass });
    if (error || !data.user) return GENERICO;
    if (data.session) await cliente.from("perfiles").update({ nombre: nick.trim() }).eq("id", data.user.id);
    usuario = nick.trim().toLowerCase();
    return null;
  } catch (e) { console.error("registrar", e); return GENERICO; }
}

export async function entrar(nick: string, pass: string): Promise<string | null> {
  if (!cliente) return GENERICO;
  try {
    const { error } = await cliente.auth.signInWithPassword({ email: correoInterno(nick), password: pass });
    if (error) return GENERICO;
    usuario = nick.trim().toLowerCase();
    return null;
  } catch (e) { console.error("entrar", e); return GENERICO; }
}

export async function salir(): Promise<void> {
  try { await cliente?.auth.signOut(); } catch (e) { console.error("salir", e); }
  usuario = null;
}

/** Suma la XP de una partida a la cuenta. La base valida el tope y no deja pasar valores fuera de rango. */
export async function sumarXpCuenta(juego: string, xp: number): Promise<void> {
  if (!cliente || !usuario || xp <= 0) return;
  try {
    const { error } = await cliente.rpc("registrar_xp_partida", { p_evento: null, p_juego: juego, p_xp: xp, p_motivo: juego });
    if (error) console.error("sumarXpCuenta", error.message);
  } catch (e) { console.error("sumarXpCuenta", e); }
}

/** Lee el personaje guardado en la cuenta. Devuelve null si no hay nada o falla. */
export async function cargarPersonaje(): Promise<Personaje | null> {
  if (!cliente) return null;
  try {
    const uid = (await cliente.auth.getUser()).data.user?.id;
    if (!uid) return null;
    const { data, error } = await cliente.from("personajes").select("piezas").eq("jugador", uid).maybeSingle();
    if (error || !data) return null;
    return data.piezas as Personaje;
  } catch (e) { console.error("cargarPersonaje", e); return null; }
}

/** Guarda el personaje en la cuenta. La base solo deja tocar tu propio personaje. */
export async function guardarPersonaje(p: Personaje): Promise<void> {
  if (!cliente) return;
  try {
    const uid = (await cliente.auth.getUser()).data.user?.id;
    if (!uid) return;
    const { error } = await cliente.from("personajes").update({ piezas: p, actualizado: new Date().toISOString() }).eq("jugador", uid);
    if (error) console.error("guardarPersonaje", error.message);
  } catch (e) { console.error("guardarPersonaje", e); }
}
