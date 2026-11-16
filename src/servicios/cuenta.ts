// Cuenta: entrar es con nickname y contraseña; no se pide correo.
// El nickname se guarda como correo interno (no real) para que Supabase lo haga único.
import type { Session } from "@supabase/supabase-js";
import type { FiguraV2, Personaje } from "../content/personaje";
import { esFigura, normalizar, N_CAPSULAS, type EstadoCapsulas } from "../app/figura3d";
import { articulosCuenta, cliente, cuentaActiva, fijarArticulos, fijarUsuario, GENERICO, uidActual } from "./cliente";

const NICK = /^[a-z0-9_]{3,20}$/;
export const nickValido = (n: string) => NICK.test(n.trim().toLowerCase());
export const passValida = (p: string) => p.length >= 8 && p.length <= 72;
const correoInterno = (nick: string) => `${nick.trim().toLowerCase()}@jugadores.alv.invalid`;

export async function sesionActual(): Promise<Session | null> {
  if (!cliente) return null;
  try {
    const { data } = await cliente.auth.getSession();
    fijarUsuario(data.session?.user.email?.split("@")[0] ?? null);
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
    fijarUsuario(nick.trim().toLowerCase());
    return null;
  } catch (e) { console.error("registrar", e); return GENERICO; }
}

export type Genero = "hombre" | "mujer" | "otro";
export interface Registro { nacimiento: string; genero: Genero }

/**
 * Guarda fecha de nacimiento (AAAA-MM-DD) y género de la cuenta abierta. La fecha se fija una sola vez;
 * el servidor valida todo y calcula si es mayor de 18. Devuelve ese dato, o null si no se pudo.
 */
export async function guardarRegistro(nacimiento: string, genero: Genero): Promise<boolean | null> {
  if (!cliente) return null;
  try {
    const { data, error } = await cliente.rpc("guardar_registro", { p_nacimiento: nacimiento, p_genero: genero });
    if (error) { console.error("guardarRegistro", error); return null; }
    return data === true;
  } catch (e) { console.error("guardarRegistro", e); return null; }
}

/** Fecha y género de la cuenta abierta (solo los suyos: RLS). null si no los ha llenado o no hay sesión. */
export async function miRegistro(): Promise<Registro | null> {
  if (!cliente) return null;
  try {
    const { data, error } = await cliente.from("datos_cuenta").select("nacimiento, genero").maybeSingle();
    if (error || !data) return null;
    return { nacimiento: String(data.nacimiento), genero: data.genero as Genero };
  } catch { return null; }
}

export async function entrar(nick: string, pass: string): Promise<string | null> {
  if (!cliente) return GENERICO;
  try {
    const { error } = await cliente.auth.signInWithPassword({ email: correoInterno(nick), password: pass });
    if (error) return GENERICO;
    fijarUsuario(nick.trim().toLowerCase());
    return null;
  } catch (e) { console.error("entrar", e); return GENERICO; }
}

export async function salir(): Promise<void> {
  try { await cliente?.auth.signOut(); } catch (e) { console.error("salir", e); }
  fijarUsuario(null);
  fijarArticulos([]);
}

/** Hechos de una partida para la cuenta. La XP la calcula el servidor con la misma fórmula del motor. */
export interface HechosPartida { juego: string; rondas: number; retos: number; lugar: number; jugadores: number }

/** Manda los hechos de la partida; devuelve la XP que el servidor acreditó, o null si no se pudo. */
export async function registrarPartidaNube(h: HechosPartida): Promise<number | null> {
  if (!cliente || !cuentaActiva()) return null;
  try {
    const { data, error } = await cliente.rpc("registrar_partida", {
      p_juego: h.juego, p_rondas: h.rondas, p_retos: h.retos, p_lugar: h.lugar, p_jugadores: h.jugadores,
    });
    if (error) { console.error("registrarPartidaNube", error.message); return null; }
    return typeof data === "number" ? data : 0;
  } catch (e) { console.error("registrarPartidaNube", e); return null; }
}

/** XP extra del anfitrión a la cuenta. El servidor limita 200 por entrega y 200 al día. */
export async function registrarXpExtraNube(xp: number, motivo: string): Promise<boolean> {
  if (!cliente || !cuentaActiva()) return false;
  try {
    const { error } = await cliente.rpc("registrar_xp_extra", { p_xp: xp, p_motivo: motivo });
    if (error) { console.error("registrarXpExtraNube", error.message); return false; }
    return true;
  } catch (e) { console.error("registrarXpExtraNube", e); return false; }
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
    // Solo se guarda puesto lo que la cuenta tiene; la base rechaza lo demás.
    const tiene = new Set(articulosCuenta());
    const puesto = Object.fromEntries(Object.entries(p.puesto ?? {}).map(([z, v]) => [z, v && tiene.has(v) ? v : null]));
    const { figura: _figura, ...sinFigura } = p;
    const { error } = await cliente.from("personajes").update({ piezas: { ...sinFigura, puesto }, actualizado: new Date().toISOString() }).eq("jugador", uid);
    if (error) console.error("guardarPersonaje", error.message);
  } catch (e) { console.error("guardarPersonaje", e); }
}

// ---------- Figuras 3D (cápsulas) ----------

/** Las cápsulas de la cuenta (tabla figuras_jugador). null si no hay sesión o falla; slots vacíos si no tiene ninguna. */
export async function cargarCapsulasNube(): Promise<EstadoCapsulas | null> {
  if (!cliente) return null;
  try {
    const uid = await uidActual();
    if (!uid) return null;
    const { data, error } = await cliente.from("figuras_jugador").select("capsula, nombre, figura, activa, actualizado").eq("jugador", uid);
    if (error || !data) return null;
    const slots: EstadoCapsulas["slots"] = Array(N_CAPSULAS).fill(null);
    let activa: number | null = null;
    for (const f of data) {
      const i = Number(f.capsula) - 1;
      if (i < 0 || i >= N_CAPSULAS || !esFigura(f.figura)) continue;
      slots[i] = { nombre: String(f.nombre ?? ""), figura: f.figura as FiguraV2, actualizado: String(f.actualizado ?? "") };
      if (f.activa) activa = i;
    }
    return normalizar({ version: 1, activa, slots });
  } catch (e) { console.error("cargarCapsulasNube", e); return null; }
}

/** Sube las cápsulas tal como están en el celular: guarda las llenas, borra las vacías y marca la activa. */
export async function guardarCapsulasNube(e: EstadoCapsulas): Promise<boolean> {
  if (!cliente) return false;
  try {
    const uid = await uidActual();
    if (!uid) return false;
    const llenas = e.slots.flatMap((c, i) => (c ? [{ jugador: uid, capsula: i + 1, nombre: c.nombre.slice(0, 24), figura: c.figura, actualizado: new Date().toISOString() }] : []));
    const vacias = e.slots.flatMap((c, i) => (c ? [] : [i + 1]));
    if (llenas.length) {
      // Sin la columna activa: solo la cambia la función activar_capsula.
      const { error } = await cliente.from("figuras_jugador").upsert(llenas, { onConflict: "jugador,capsula" });
      if (error) { console.error("guardarCapsulasNube", error.message); return false; }
    }
    if (vacias.length) {
      const { error } = await cliente.from("figuras_jugador").delete().eq("jugador", uid).in("capsula", vacias);
      if (error) { console.error("guardarCapsulasNube borrar", error.message); return false; }
    }
    if (e.activa != null) {
      const { error } = await cliente.rpc("activar_capsula", { p_capsula: e.activa + 1 });
      if (error) { console.error("activar_capsula", error.message); return false; }
    }
    return true;
  } catch (err) { console.error("guardarCapsulasNube", err); return false; }
}

/** Lo que el servidor dice de la cuenta: saldos y artículos comprados. */
export interface DatosCuenta { acumulada: number; disponible: number; delEvento: number; tiene: string[] }

export async function leerCuenta(): Promise<DatosCuenta | null> {
  if (!cliente || !cuentaActiva()) return null;
  try {
    const uid = (await cliente.auth.getUser()).data.user?.id;
    if (!uid) return null;
    const [sal, inv] = await Promise.all([
      cliente.rpc("mis_saldos"),
      cliente.from("inventario").select("articulo").eq("jugador", uid),
    ]);
    if (sal.error || inv.error) { console.error("leerCuenta", sal.error?.message ?? inv.error?.message); return null; }
    const fila = (sal.data as { acumulada: number; disponible: number; del_evento: number }[] | null)?.[0];
    return {
      acumulada: fila?.acumulada ?? 0, disponible: fila?.disponible ?? 0, delEvento: fila?.del_evento ?? 0,
      tiene: fijarArticulos((inv.data ?? []).map(x => (x as { articulo: string }).articulo)),
    };
  } catch (e) { console.error("leerCuenta", e); return null; }
}
