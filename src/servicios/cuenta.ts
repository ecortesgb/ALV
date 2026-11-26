// Cuenta: entrar es con nickname y contraseña; no se pide correo.
// El nickname se guarda como correo interno (no real) para que Supabase lo haga único.
import type { Session } from "@supabase/supabase-js";
import type { FiguraV2 } from "../content/personaje";
import { normalizar, N_CAPSULAS, type EstadoCapsulas } from "../app/figura3d";
import { desdeBase, haciaBase, modoCorteV3 } from "../personajes/integracion";
import { cliente, cuentaActiva, fijarArticulos, fijarUsuario, GENERICO, uidActual } from "./cliente";

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
  if (!nickValido(nick) || !passValida(pass) || esNickInvitado(nick)) return "Nickname de 3 a 20 letras, números o _. Contraseña de 8 o más.";
  try {
    const { data, error } = await cliente.auth.signUp({ email: correoInterno(nick), password: pass });
    if (error || !data.user) return GENERICO;
    if (data.session) await cliente.from("perfiles").update({ nombre: nick.trim() }).eq("id", data.user.id);
    fijarUsuario(nick.trim().toLowerCase());
    return null;
  } catch (e) { console.error("registrar", e); return GENERICO; }
}

/** Los apodos que empiezan con «inv_» son de las cuentas de invitado: no se pueden registrar a mano. */
export const esNickInvitado = (n: string) => n.trim().toLowerCase().startsWith("inv_");
const azar = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");

/**
 * Invitado de prueba (Maestro §3.2, v1.32 y v1.33): crea una cuenta desechable sin pedir contraseña ni fecha.
 * La persona solo elige apodo y confirma que es mayor de 18. Elías borra estas cuentas al terminar las pruebas.
 * Devuelve null si salió bien, o un mensaje.
 */
export async function entrarInvitado(apodo: string): Promise<string | null> {
  if (!cliente) return GENERICO;
  const limpio = apodo.replace(/\s+/g, " ").trim();
  if (limpio.length < 2 || limpio.length > 20) return "El apodo va de 2 a 20 letras.";
  try {
    const nick = "inv_" + azar(12);
    const { data, error } = await cliente.auth.signUp({ email: correoInterno(nick), password: azar(28) });
    if (error || !data.session) { console.error("entrarInvitado", error?.message ?? "sin sesión"); return "No se pudo entrar como invitado. Intenta otra vez."; }
    const r = await cliente.rpc("entrar_invitado", { p_apodo: limpio });
    if (r.error) { console.error("entrarInvitado", r.error.message); await cliente.auth.signOut(); return "No se pudo entrar como invitado. Intenta otra vez."; }
    fijarUsuario(nick);
    return null;
  } catch (e) { console.error("entrarInvitado", e); return "No se pudo entrar como invitado. Intenta otra vez."; }
}

export type Genero = "hombre" | "mujer" | "otro";
export interface Registro { nacimiento: string; genero: Genero }

/** Género de cada quien en la sala (función 011: solo para quien está en esa sala abierta). Para armar ALVersus. */
export async function generosSala(evento: string): Promise<Record<string, Genero>> {
  if (!cliente) return {};
  try {
    const { data, error } = await cliente.rpc("generos_sala", { p_evento: evento });
    if (error || !Array.isArray(data)) { if (error) console.error("generosSala", error); return {}; }
    return Object.fromEntries((data as { jugador: string; genero: Genero }[]).map(r => [r.jugador, r.genero]));
  } catch (e) { console.error("generosSala", e); return {}; }
}

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
      const fig = desdeBase(f.figura); // frontera v3 (fase 5): una v3 directa llega como puente; lo inválido no entra
      if (i < 0 || i >= N_CAPSULAS || !fig) continue;
      slots[i] = { nombre: String(f.nombre ?? ""), figura: fig as FiguraV2, actualizado: String(f.actualizado ?? "") };
      if (f.activa) activa = i;
    }
    return normalizar({ version: 1, activa, slots });
  } catch (e) { console.error("cargarCapsulasNube", e); return null; }
}

/** Sube las cápsulas tal como están en el celular: guarda las llenas, borra las vacías y marca la activa.
 *  Con el corte a v3 (Codex, v3-directo-r1): cada figura cruza la frontera (haciaBase): sube su v3; una figura sin v3 o
 *  inválida NO se sube y TAMPOCO se borra (y el resultado es false: no se anuncia «sincronizado»); los espacios vacíos ya no
 *  se borran (las bajas solo pueden ser explícitas; la 046 quita además el DELETE directo); solo se activa una cápsula que sí
 *  se subió. */
export async function guardarCapsulasNube(e: EstadoCapsulas): Promise<boolean> {
  if (!cliente) return false;
  try {
    const uid = await uidActual();
    if (!uid) return false;
    const corte = modoCorteV3();
    let omitidas = false;
    const llenas = e.slots.flatMap((c, i) => {
      if (!c) return [];
      const h = haciaBase(c.figura, corte);
      if (h.tipo !== "subir") { omitidas = true; return []; }
      return [{ jugador: uid, capsula: i + 1, nombre: c.nombre.slice(0, 24), figura: h.figura, actualizado: new Date().toISOString() }];
    });
    const vacias = corte ? [] : e.slots.flatMap((c, i) => (c ? [] : [i + 1]));
    if (llenas.length) {
      // Sin la columna activa: solo la cambia la función activar_capsula.
      const { error } = await cliente.from("figuras_jugador").upsert(llenas, { onConflict: "jugador,capsula" });
      if (error) { console.error("guardarCapsulasNube", error.message); return false; }
    }
    if (vacias.length) {
      const { error } = await cliente.from("figuras_jugador").delete().eq("jugador", uid).in("capsula", vacias);
      if (error) { console.error("guardarCapsulasNube borrar", error.message); return false; }
    }
    if (e.activa != null && llenas.some(f => f.capsula === e.activa! + 1)) {
      const { error } = await cliente.rpc("activar_capsula", { p_capsula: e.activa + 1 });
      if (error) { console.error("activar_capsula", error.message); return false; }
    }
    return !omitidas;
  } catch (err) { console.error("guardarCapsulasNube", err); return false; }
}

/** Cambia la contraseña de la cuenta abierta. Devuelve null si salió bien, o el motivo. */
export async function cambiarClave(nueva: string): Promise<string | null> {
  if (!cliente) return GENERICO;
  if (!passValida(nueva)) return "La contraseña va de 8 a 72 caracteres.";
  try {
    const { error } = await cliente.auth.updateUser({ password: nueva });
    if (error) { console.error("cambiarClave", error.message); return "No se pudo cambiar la contraseña."; }
    return null;
  } catch (e) { console.error("cambiarClave", e); return "No se pudo cambiar la contraseña."; }
}

/**
 * Cambia la contraseña comprobando antes la actual (se entra con ella; si no es, no se cambia nada).
 * Devuelve null si salió bien, o el mensaje para la persona.
 */
export async function cambiarClaveConActual(actual: string, nueva: string): Promise<string | null> {
  if (!cliente) return GENERICO;
  const nick = cuentaActiva();
  if (!nick) return "No hay cuenta abierta.";
  if (!passValida(nueva)) return "La contraseña nueva va de 8 a 72 caracteres.";
  if (actual === nueva) return "La contraseña nueva es igual a la actual.";
  try {
    const { error } = await cliente.auth.signInWithPassword({ email: correoInterno(nick), password: actual });
    if (error) return "La contraseña actual no es correcta.";
  } catch (e) { console.error("cambiarClaveConActual", e); return "No se pudo comprobar. Intenta otra vez."; }
  return cambiarClave(nueva);
}

/** Cierra la sesión en todos los aparatos donde esté abierta esta cuenta (también en este). */
export async function salirDeTodos(): Promise<boolean> {
  if (!cliente) return false;
  try {
    const { error } = await cliente.auth.signOut({ scope: "global" });
    if (error) { console.error("salirDeTodos", error.message); return false; }
    fijarUsuario(null);
    fijarArticulos([]);
    return true;
  } catch (e) { console.error("salirDeTodos", e); return false; }
}

/** Cuándo se inició sesión por última vez en esta cuenta (ISO), o null. */
export async function ultimoInicio(): Promise<string | null> {
  if (!cliente) return null;
  try { const { data } = await cliente.auth.getUser(); return data.user?.last_sign_in_at ?? null; } catch { return null; }
}

export interface MovimientoXp { tipo: string; xp: number; motivo: string; creado: string }
/** Mis movimientos de XP (solo los míos: RLS), del más nuevo al más viejo. */
export async function misMovimientos(): Promise<MovimientoXp[]> {
  if (!cliente) return [];
  try {
    const { data, error } = await cliente.from("movimientos_xp").select("tipo, xp, motivo, creado").order("creado", { ascending: false }).limit(500);
    if (error) { console.error("misMovimientos", error.message); return []; }
    return (data ?? []) as MovimientoXp[];
  } catch (e) { console.error("misMovimientos", e); return []; }
}

export interface FilaRanking { id: string; nombre: string; acumulada: number; nivel: number }
/** Ranking entre la cuenta y la gente con la que ha compartido sala. */
export async function rankingConocidos(): Promise<FilaRanking[] | null> {
  if (!cliente) return null;
  try {
    const { data, error } = await cliente.rpc("ranking_conocidos");
    if (error) { console.error("rankingConocidos", error.message); return null; }
    return (data ?? []) as FilaRanking[];
  } catch (e) { console.error("rankingConocidos", e); return null; }
}
