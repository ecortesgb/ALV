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
/** Artículos que el servidor dice que la cuenta compró (se actualiza al leer la cuenta). */
let tieneCuenta: string[] = [];
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
    usuario = nick.trim().toLowerCase();
    return null;
  } catch (e) { console.error("entrar", e); return GENERICO; }
}

export async function salir(): Promise<void> {
  try { await cliente?.auth.signOut(); } catch (e) { console.error("salir", e); }
  usuario = null;
  tieneCuenta = [];
}

/** Hechos de una partida para la cuenta. La XP la calcula el servidor con la misma fórmula del motor. */
export interface HechosPartida { juego: string; rondas: number; retos: number; lugar: number; jugadores: number }

/** Manda los hechos de la partida; devuelve la XP que el servidor acreditó, o null si no se pudo. */
export async function registrarPartidaNube(h: HechosPartida): Promise<number | null> {
  if (!cliente || !usuario) return null;
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
  if (!cliente || !usuario) return false;
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
    const tiene = new Set(tieneCuenta);
    const puesto = Object.fromEntries(Object.entries(p.puesto ?? {}).map(([z, v]) => [z, v && tiene.has(v) ? v : null]));
    const { error } = await cliente.from("personajes").update({ piezas: { ...p, puesto }, actualizado: new Date().toISOString() }).eq("jugador", uid);
    if (error) console.error("guardarPersonaje", error.message);
  } catch (e) { console.error("guardarPersonaje", e); }
}

/** Lo que el servidor dice de la cuenta: saldos y artículos comprados. */
export interface DatosCuenta { acumulada: number; disponible: number; delEvento: number; tiene: string[] }

export async function leerCuenta(): Promise<DatosCuenta | null> {
  if (!cliente || !usuario) return null;
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
      tiene: (tieneCuenta = (inv.data ?? []).map(x => (x as { articulo: string }).articulo)),
    };
  } catch (e) { console.error("leerCuenta", e); return null; }
}

/** Traduce el motivo que da la base a un mensaje claro; lo demás queda genérico. */
function motivoCompra(msg: string): string {
  if (msg.includes("saldo insuficiente")) return "No te alcanza la XP disponible.";
  if (msg.includes("nivel insuficiente")) return "Todavía no tienes el nivel para esto.";
  if (msg.includes("ya lo tienes")) return "Ya lo tienes.";
  if (msg.includes("ya tienes todo")) return "Ya tienes todo lo que puede dar este sobre.";
  return "No se pudo comprar. Intenta otra vez.";
}

/** Compra un accesorio en la cuenta. Devuelve null si salió bien, o el motivo. */
export async function comprarAccesorioNube(articulo: string): Promise<string | null> {
  if (!cliente || !usuario) return "No hay cuenta abierta.";
  try {
    const { error } = await cliente.rpc("comprar_accesorio", { p_articulo: articulo });
    if (error) { console.error("comprarAccesorioNube", error.message); return motivoCompra(error.message); }
    return null;
  } catch (e) { console.error("comprarAccesorioNube", e); return "No se pudo comprar. Intenta otra vez."; }
}

/** Abre un sobre en el servidor: él decide las cartas. */
export async function comprarSobreNube(sobre: string): Promise<{ ok: true; cartas: { id: string; rareza: string }[] } | { ok: false; motivo: string }> {
  if (!cliente || !usuario) return { ok: false, motivo: "No hay cuenta abierta." };
  try {
    const { data, error } = await cliente.rpc("comprar_sobre", { p_sobre: sobre });
    if (error) { console.error("comprarSobreNube", error.message); return { ok: false, motivo: motivoCompra(error.message) }; }
    return { ok: true, cartas: ((data ?? []) as { articulo: string; rareza: string }[]).map(c => ({ id: c.articulo, rareza: c.rareza })) };
  } catch (e) { console.error("comprarSobreNube", e); return { ok: false, motivo: "No se pudo comprar. Intenta otra vez." }; }
}

// ---------- Sala en línea (evento) ----------

export interface Sala { id: string; codigo: string; nombre: string; anfitrion: boolean }
export interface MiembroSala { id: string; nombre: string; personaje: Personaje | null; anfitrion: boolean }

const uidActual = async () => (await cliente?.auth.getUser())?.data.user?.id ?? null;

/** Abre una sala nueva; quien la abre es el anfitrión. */
export async function abrirSala(nombre: string, adulto: boolean, drunk: boolean): Promise<Sala | null> {
  if (!cliente || !usuario) return null;
  try {
    const { data, error } = await cliente.rpc("crear_evento", { p_nombre: nombre.slice(0, 60) || "Sala ALV", p_adulto: adulto, p_drunk: drunk });
    if (error) { console.error("abrirSala", error.message); return null; }
    const fila = (data as { id: string; codigo: string }[] | null)?.[0];
    return fila ? { id: fila.id, codigo: fila.codigo, nombre, anfitrion: true } : null;
  } catch (e) { console.error("abrirSala", e); return null; }
}

/** Entra a una sala con su código. Devuelve la sala o un motivo. */
export async function unirseSala(codigo: string): Promise<Sala | string> {
  if (!cliente || !usuario) return "Primero entra a tu cuenta.";
  const limpio = codigo.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(limpio)) return "El código tiene 6 letras o números.";
  try {
    const { data, error } = await cliente.rpc("unirse_evento", { p_codigo: limpio });
    if (error) { console.error("unirseSala", error.message); return error.message.includes("llena") ? "La sala está llena (8)." : "No encontramos esa sala o ya se cerró."; }
    const sala = await leerSala(data as string);
    return sala ?? "No se pudo entrar a la sala.";
  } catch (e) { console.error("unirseSala", e); return "No se pudo entrar a la sala."; }
}

async function leerSala(id: string): Promise<Sala | null> {
  if (!cliente) return null;
  const uid = await uidActual();
  const { data, error } = await cliente.from("eventos").select("id, codigo, nombre, anfitrion, cerrado").eq("id", id).maybeSingle();
  if (error || !data || data.cerrado) return null;
  return { id: data.id, codigo: data.codigo, nombre: data.nombre, anfitrion: data.anfitrion === uid };
}

/** La sala abierta más reciente en la que está la cuenta (para volver después de recargar). */
export async function miSalaAbierta(): Promise<Sala | null> {
  if (!cliente || !usuario) return null;
  try {
    const uid = await uidActual();
    const { data, error } = await cliente.from("eventos").select("id, codigo, nombre, anfitrion").eq("cerrado", false).order("inicia", { ascending: false }).limit(1);
    if (error || !data?.[0]) return null;
    const e = data[0];
    return { id: e.id, codigo: e.codigo, nombre: e.nombre, anfitrion: e.anfitrion === uid };
  } catch (e) { console.error("miSalaAbierta", e); return null; }
}

/** Quién está en la sala, con su personaje. Devuelve null si la sala ya no existe o se cerró. */
export async function miembrosSala(sala: Sala): Promise<MiembroSala[] | null> {
  if (!cliente || !usuario) return null;
  try {
    const ev = await cliente.from("eventos").select("anfitrion, cerrado").eq("id", sala.id).maybeSingle();
    if (ev.error || !ev.data || ev.data.cerrado) return null;
    const m = await cliente.from("miembros_evento").select("jugador, unido").eq("evento", sala.id).order("unido");
    if (m.error) return null;
    const ids = (m.data ?? []).map(x => x.jugador as string);
    if (ids.length === 0) return [];
    const [perf, pers] = await Promise.all([
      cliente.from("perfiles").select("id, nombre").in("id", ids),
      cliente.from("personajes").select("jugador, piezas").in("jugador", ids),
    ]);
    const nombre = new Map((perf.data ?? []).map(x => [x.id as string, x.nombre as string]));
    // Una cuenta recién creada guarda su personaje un segundo después: mientras, va el de inicio.
    const piezas = new Map((pers.data ?? []).filter(x => (x.piezas as Partial<Personaje>)?.piel).map(x => [x.jugador as string, x.piezas as Personaje]));
    return ids.map(id => ({ id, nombre: nombre.get(id) ?? "Jugador", personaje: piezas.get(id) ?? null, anfitrion: id === ev.data!.anfitrion }));
  } catch (e) { console.error("miembrosSala", e); return null; }
}

export async function cerrarSala(sala: Sala): Promise<void> {
  try { const r = await cliente?.rpc("cerrar_evento", { p_evento: sala.id }); if (r?.error) console.error("cerrarSala", r.error.message); }
  catch (e) { console.error("cerrarSala", e); }
}

export async function salirDeSala(sala: Sala): Promise<void> {
  try { const r = await cliente?.rpc("salir_evento", { p_evento: sala.id }); if (r?.error) console.error("salirDeSala", r.error.message); }
  catch (e) { console.error("salirDeSala", e); }
}

/** Enlace que abre la app directo en la pantalla para unirse. */
export const enlaceSala = (codigo: string) => `${location.origin}${location.pathname}#/unirse/${codigo}`;

// ---------- Partida en varios celulares ----------

/** id de la cuenta abierta (para saber cuál es mi jugador en la partida de la sala). */
export const miUid = uidActual;

export async function crearPartidaSala(sala: Sala, juego: string, semilla: number): Promise<string | null> {
  if (!cliente) return null;
  try {
    const { data, error } = await cliente.from("partidas").insert({ evento: sala.id, juego, semilla }).select("id").single();
    if (error) { console.error("crearPartidaSala", error.message); return null; }
    return data.id as string;
  } catch (e) { console.error("crearPartidaSala", e); return null; }
}

/** El anfitrión publica lo público y el secreto de cada celular (clave: id de cuenta). */
export async function publicarPartida(partida: string, version: number, estado: unknown, privados: Record<string, unknown>): Promise<void> {
  if (!cliente) return;
  try {
    const { error } = await cliente.rpc("publicar_partida", { p_partida: partida, p_version: version, p_estado: estado, p_privados: privados });
    if (error) console.error("publicarPartida", error.message);
  } catch (e) { console.error("publicarPartida", e); }
}

export interface AccionSala { id: string; jugador: string; tipo: "contestar" | "carta" | "mision"; datos: Record<string, unknown>; creada: string }

/** Respuestas que mandaron los celulares. El anfitrión las lee en orden. */
export async function leerAcciones(partida: string): Promise<AccionSala[]> {
  if (!cliente) return [];
  try {
    const { data, error } = await cliente.from("acciones").select("id, jugador, tipo, datos, creada").eq("partida", partida).order("creada");
    if (error) { console.error("leerAcciones", error.message); return []; }
    return (data ?? []) as AccionSala[];
  } catch (e) { console.error("leerAcciones", e); return []; }
}

/** El celular manda su respuesta. El id lo pone el celular: si se reenvía por mala señal, cuenta una vez. */
export async function enviarAccion(partida: string, id: string, tipo: AccionSala["tipo"], datos: Record<string, unknown>): Promise<boolean> {
  if (!cliente) return false;
  try {
    const uid = await uidActual();
    if (!uid) return false;
    const { error } = await cliente.from("acciones").insert({ id, partida, jugador: uid, tipo, datos });
    if (error && !error.message.includes("duplicate")) { console.error("enviarAccion", error.message); return false; }
    return true;
  } catch (e) { console.error("enviarAccion", e); return false; }
}

export async function terminarPartidaSala(partida: string, juego: string, jugadores: number,
  resultados: { jugador: string; rondas: number; retos: number; lugar: number }[]): Promise<void> {
  if (!cliente) return;
  try {
    const { error } = await cliente.rpc("terminar_partida_sala", { p_partida: partida, p_juego: juego, p_jugadores: jugadores, p_resultados: resultados });
    if (error) console.error("terminarPartidaSala", error.message);
  } catch (e) { console.error("terminarPartidaSala", e); }
}

export interface PartidaPublicada { id: string; version: number; estado: Record<string, unknown>; terminada: boolean }

/** La partida más reciente de la sala (la que se está jugando o la última que terminó). */
export async function partidaDeSala(sala: Sala): Promise<PartidaPublicada | null> {
  if (!cliente) return null;
  try {
    const { data, error } = await cliente.from("partidas").select("id, version, estado_publico, terminada")
      .eq("evento", sala.id).order("creada", { ascending: false }).limit(1);
    if (error || !data?.[0]) return null;
    const p = data[0];
    return { id: p.id, version: p.version, estado: p.estado_publico as Record<string, unknown>, terminada: !!p.terminada };
  } catch (e) { console.error("partidaDeSala", e); return null; }
}

/** Mi dato secreto en esa partida (palabra, rol, pregunta, mi mano). Solo lo puede leer su dueño. */
export async function miSecreto(partida: string): Promise<Record<string, unknown> | null> {
  if (!cliente) return null;
  try {
    const uid = await uidActual();
    const { data, error } = await cliente.from("datos_privados").select("datos").eq("partida", partida).eq("jugador", uid ?? "").maybeSingle();
    if (error) return null;
    return (data?.datos as Record<string, unknown>) ?? null;
  } catch (e) { console.error("miSecreto", e); return null; }
}
