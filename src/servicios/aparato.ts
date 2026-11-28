// Jugar varios en un mismo aparato (053, pedido de Elías del 27 nov).
// En el lobby de un aparato se agrega una cuenta existente (usuario y contraseña) o un «personaje rápido»: una cuenta real
// UsuarioN con contraseña aleatoria y código de recuperación, que se muestran UNA sola vez.
// Cada cuenta entra con SU sesión, en un cliente aparte que no guarda nada, a la sala espejo de la nube («ALV en un
// aparato»). Así el servidor sabe que esa persona está en la sala y le da sus puntos cuando el anfitrión termina la partida.
// La sesión aparte se cierra en cuanto entra: en el aparato no se guarda ninguna contraseña ni sesión ajena.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FiguraV2 } from "../content/personaje";
import { desdeBase, haciaBase } from "../personajes/integracion";
import { cliente, clienteAparte, clienteSostenido, fijarUsuario, hayNube } from "./cliente";
import { nickValido, passValida } from "./cuenta";

/** Nombre de la sala espejo en la nube. lobby_abierto (053) la ignora para que nadie entre solo a ella. */
export const NOMBRE_ESPEJO = "ALV en un aparato";
export interface Espejo { id: string; codigo: string }
export interface CuentaEnAparato { id: string; nombre: string; figura: FiguraV2 | null }
export interface PersonajeRapido extends CuentaEnAparato { usuario: string; clave: string; codigo: string }

const log = (donde: string, e: unknown) => console.error(donde, e instanceof Error ? e.message : (e as { message?: string })?.message ?? e);
const correo = (nick: string) => `${nick.trim().toLowerCase()}@jugadores.alv.invalid`;
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
/** Contraseña aleatoria de 10 (letras y números sin los que se confunden), con al menos un número. */
export function claveAleatoria(n = 10): string {
  for (;;) {
    const c = Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALFABETO[b % ALFABETO.length]).join("");
    if (/\d/.test(c) && /[A-Z]/.test(c) && /[a-z]/.test(c)) return c;
  }
}
/** El código se muestra en 3 grupos de 4 para copiarlo a mano. */
export const codigoLegible = (c: string) => c.replace(/(.{4})(?=.)/g, "$1-");

/** Abre la sala espejo con la cuenta del dueño del aparato (queda como anfitrión y miembro). */
export async function abrirEspejo(): Promise<Espejo | null> {
  if (!cliente) return null;
  try {
    let { data, error } = await cliente.rpc("crear_evento", { p_nombre: NOMBRE_ESPEJO, p_adulto: true, p_drunk: true });
    // Auditoría 28 nov: el servidor deja máximo 3 salas abiertas por anfitrión. Las espejo de sesiones locales que se
    // cerraron sin «Terminar sesión» (app cerrada, recarga) se quedaban abiertas y a la tercera ya no se podían agregar
    // cuentas en el aparato. Se cierran las espejo viejas de esta cuenta y se intenta otra vez.
    if (error && /demasiados/.test(error.message) && await cerrarEspejosViejos()) {
      ({ data, error } = await cliente.rpc("crear_evento", { p_nombre: NOMBRE_ESPEJO, p_adulto: true, p_drunk: true }));
    }
    const f = (data as { id: string; codigo: string }[] | null)?.[0];
    if (error || !f) { log("abrirEspejo", error); return null; }
    return { id: f.id, codigo: f.codigo };
  } catch (e) { log("abrirEspejo", e); return null; }
}

/** Cierra las salas espejo abiertas de la cuenta del aparato. true si cerró alguna. */
async function cerrarEspejosViejos(): Promise<boolean> {
  if (!cliente) return false;
  const { data: s } = await cliente.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return false;
  const { data, error } = await cliente.from("eventos").select("id").eq("anfitrion", uid).eq("cerrado", false).eq("nombre", NOMBRE_ESPEJO);
  if (error || !data?.length) return false;
  const r = await Promise.all(data.map(e => cliente!.rpc("cerrar_evento", { p_evento: e.id as string })));
  return r.some(x => !x.error);
}

/** Con la sesión aparte: entra a la sala espejo y lee su nombre y su figura activa. Siempre cierra la sesión aparte. */
async function entrarYLeer(c: SupabaseClient, uid: string, espejo: Espejo, cerrar = true): Promise<CuentaEnAparato | string> {
  try {
    const u = await c.rpc("unirse_evento", { p_codigo: espejo.codigo });
    if (u.error) {
      log("aparato unirse", u.error);
      return /mayores/.test(u.error.message) ? "Esa cuenta no ha completado su registro de mayor de edad. Que entre una vez en su celular."
        : /llena/.test(u.error.message) ? "El lobby está lleno (8)." : "No se pudo entrar al lobby. Intenta otra vez.";
    }
    const [p, f] = await Promise.all([
      c.from("perfiles").select("nombre").eq("id", uid).maybeSingle(),
      c.from("figuras_jugador").select("figura").eq("jugador", uid).eq("activa", true).maybeSingle(),
    ]);
    return { id: uid, nombre: String(p.data?.nombre ?? "Jugador").slice(0, 20), figura: (desdeBase(f.data?.figura) as FiguraV2 | null) ?? null };
  } finally {
    if (cerrar) try { await c.auth.signOut({ scope: "local" }); } catch { /* la sesión aparte no se guardó en ningún lado */ }
  }
}

/** Cuenta existente: usuario y contraseña. Devuelve la cuenta o el mensaje para la persona. */
export async function entrarCuentaEnAparato(nick: string, pass: string, espejo: Espejo, yaDentro: string[], sostener = false): Promise<CuentaEnAparato | string> {
  // Con `sostener`, la sesión queda en esta pestaña mientras dura el lobby (para usar sus comodines en su turno).
  const claveSesion = `alv-sost-${nick.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}-${Math.random().toString(36).slice(2, 8)}`;
  const c = (sostener ? clienteSostenido(claveSesion) : null) ?? clienteAparte();
  if (!c) return "Sin servidor no se pueden agregar cuentas.";
  if (!nickValido(nick) || !passValida(pass)) return "Usuario o contraseña incorrectos.";
  try {
    const { data, error } = await c.auth.signInWithPassword({ email: correo(nick), password: pass });
    if (error || !data.user) return "Usuario o contraseña incorrectos.";
    if (yaDentro.includes(data.user.id)) { await c.auth.signOut({ scope: "local" }); return "Esa cuenta ya está en el lobby."; }
    const r = await entrarYLeer(c, data.user.id, espejo, !sostener);
    if (sostener) {
      if (typeof r === "string") { try { await c.auth.signOut({ scope: "local" }); } catch { /* nada */ } }
      else sostenidos.registrar(espejo.id, data.user.id, claveSesion, c);
    }
    return r;
  } catch (e) { log("entrarCuentaEnAparato", e); return "No se pudo. Intenta otra vez."; }
}

/**
 * Personaje rápido: crea la cuenta UsuarioN (el número lo da el servidor), con contraseña aleatoria, le pone el apodo,
 * guarda su figura (si se eligió) y la mete a la sala espejo. El código de recuperación lo genera el servidor.
 */
export async function crearPersonajeRapido(apodo: string, figura: FiguraV2 | null, espejo: Espejo, sostener = false): Promise<PersonajeRapido | string> {
  const limpio = apodo.replace(/\s+/g, " ").trim();
  if (limpio.length < 2 || limpio.length > 20) return "El nombre va de 2 a 20 letras.";
  if (!cliente || !hayNube) return "Sin servidor no se pueden crear cuentas.";
  const primero = await numeroLibre();
  const clave = claveAleatoria();
  // Si otro aparato ganó el número, se prueba con los siguientes.
  for (let n = primero, intento = 0; intento < 5; n++, intento++) {
    const nick = `usuario${n}`;
    // En la sala en línea su sesión se queda en este celular para jugar por él si no entra en el suyo.
    const claveSesion = `alv-sost-${nick}-${Math.random().toString(36).slice(2, 8)}`;
    const c = (sostener ? clienteSostenido(claveSesion) : null) ?? clienteAparte()!;
    try {
      const { data, error } = await c.auth.signUp({ email: correo(nick), password: clave });
      if (error || !data.user || !data.session) { if (error && /registered|exists/i.test(error.message)) continue; log("crearPersonajeRapido", error ?? "sin sesión"); return "No se pudo crear el personaje. Intenta otra vez."; }
      const r = await c.rpc("crear_cuenta_rapida", { p_apodo: limpio });
      if (r.error || typeof r.data !== "string") { log("crear_cuenta_rapida", r.error); await c.auth.signOut({ scope: "local" }); return "No se pudo crear el personaje. Intenta otra vez."; }
      if (figura) {
        const h = haciaBase(figura);
        if (h.tipo === "subir") {
          const g = await c.from("figuras_jugador").upsert([{ jugador: data.user.id, capsula: 1, nombre: limpio.slice(0, 24), figura: h.figura, actualizado: new Date().toISOString() }], { onConflict: "jugador,capsula" });
          if (g.error) log("figura rápida", g.error); else await c.rpc("activar_capsula", { p_capsula: 1 });
        }
      }
      const dentro = await entrarYLeer(c, data.user.id, espejo, !sostener);
      if (typeof dentro === "string") { if (sostener) try { await c.auth.signOut({ scope: "local" }); } catch { /* nada */ } return dentro; }
      if (sostener) {
        sostenidos.registrar(espejo.id, data.user.id, claveSesion, c);
        try { await c.rpc("marcar_en_sala", { p_evento: espejo.id, p_listo: true, p_gesto: null, p_a: null }); } catch { /* el anfitrión le da listo */ }
      }
      return { ...dentro, figura: dentro.figura ?? figura, usuario: `Usuario${n}`, clave, codigo: r.data };
    } catch (e) { log("crearPersonajeRapido", e); return "No se pudo crear el personaje. Intenta otra vez."; }
  }
  return "No se pudo crear el personaje. Intenta otra vez.";
}

/** El siguiente UsuarioN libre. Sin la 057 (pantalla de acceso, sin sesión) no se puede preguntar: se usa un número al azar. */
async function numeroLibre(): Promise<number> {
  try {
    const sig = await cliente!.rpc("siguiente_usuario");
    if (!sig.error && typeof sig.data === "number") return sig.data;
    log("siguiente_usuario", sig.error);
  } catch (e) { log("siguiente_usuario", e); }
  return 10000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 90000);
}

export interface MiCuentaRapida { usuario: string; clave: string; codigo: string }

/**
 * «Entrar sin cuenta» en la pantalla de acceso (Elías, 27 nov): crea una cuenta UsuarioN con contraseña aleatoria y código
 * de recuperación, y la deja abierta en este aparato. Ya no hay entradas sin historial. Devuelve los datos o un mensaje.
 */
export async function crearMiCuentaRapida(apodo: string): Promise<MiCuentaRapida | string> {
  const limpio = apodo.replace(/\s+/g, " ").trim();
  if (limpio.length < 2 || limpio.length > 20) return "El apodo va de 2 a 20 letras.";
  if (!cliente || !hayNube) return "Sin servidor no se pueden crear cuentas.";
  const FALLO = "No se pudo crear tu cuenta. Intenta otra vez.";
  const primero = await numeroLibre();
  const clave = claveAleatoria();
  for (let n = primero, intento = 0; intento < 5; n++, intento++) {
    const nick = `usuario${n}`;
    try {
      const { data, error } = await cliente.auth.signUp({ email: correo(nick), password: clave });
      if (error || !data.user || !data.session) { if (error && /registered|exists/i.test(error.message)) continue; log("crearMiCuentaRapida", error ?? "sin sesión"); return FALLO; }
      const r = await cliente.rpc("crear_cuenta_rapida", { p_apodo: limpio });
      if (r.error || typeof r.data !== "string") { log("crear_cuenta_rapida", r.error); await cliente.auth.signOut({ scope: "local" }); return FALLO; }
      fijarUsuario(nick);
      return { usuario: `Usuario${n}`, clave, codigo: r.data };
    } catch (e) { log("crearMiCuentaRapida", e); return FALLO; }
  }
  return FALLO;
}

/** Olvidó la contraseña de su personaje rápido: usuario + código de recuperación + contraseña nueva (función recuperar-cuenta). */
export async function recuperarCuenta(usuario: string, codigo: string, clave: string): Promise<string | null> {
  if (!cliente) return "Sin servidor no se puede.";
  const cod = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!nickValido(usuario) || cod.length !== 12) return "Revisa tu usuario y tu código (12 letras y números).";
  if (!passValida(clave)) return "La contraseña nueva va de 8 a 72 caracteres.";
  try {
    const { error } = await cliente.functions.invoke("recuperar-cuenta", { body: { usuario: usuario.trim().toLowerCase(), codigo: cod, clave } });
    if (error) { log("recuperarCuenta", error); return "No se pudo. Revisa tu usuario y tu código."; }
    return null;
  } catch (e) { log("recuperarCuenta", e); return "No se pudo. Revisa tu usuario y tu código."; }
}

// ---------- Personajes que juegan en el celular del anfitrión (sala en línea, Elías 27 nov) ----------
// «Si lo creé y no entra con su usuario, que se quede para jugar en mi celular; si no, que entre con el suyo.»
// El celular del anfitrión guarda la sesión de cada personaje rápido que creó en esa sala (solo en esta pestaña) y, cuando le
// toca y no está en su propio celular, manda sus jugadas con SU sesión: el servidor sigue sabiendo quién contesta.
interface Registro { sala: string; jugadores: { id: string; clave: string }[] }
const REGISTRO = "alv-sostenidos";
const clientes = new Map<string, SupabaseClient>();
let enMano = "";
const leerRegistro = (): Registro | null => { try { return JSON.parse(sessionStorage.getItem(REGISTRO) ?? "null") as Registro | null; } catch { return null; } };
const guardarRegistro = (r: Registro | null) => { try { if (r) sessionStorage.setItem(REGISTRO, JSON.stringify(r)); else sessionStorage.removeItem(REGISTRO); } catch { /* sin almacenamiento */ } };

export const sostenidos = {
  registrar(sala: string, id: string, clave: string, c: SupabaseClient) {
    const r = leerRegistro();
    const base: Registro = r && r.sala === sala ? r : { sala, jugadores: [] };
    if (!base.jugadores.some(j => j.id === id)) base.jugadores.push({ id, clave });
    guardarRegistro(base); clientes.set(id, c);
  },
  /** Ids de los personajes que este celular sostiene en la sala. */
  de(sala: string): string[] { const r = leerRegistro(); return r && r.sala === sala ? r.jugadores.map(j => j.id) : []; },
  /** Cliente con la sesión del personaje (se rearma tras recargar la página). */
  cliente(id: string): SupabaseClient | null {
    const ya = clientes.get(id); if (ya) return ya;
    const j = leerRegistro()?.jugadores.find(x => x.id === id); if (!j) return null;
    const c = clienteSostenido(j.clave); if (c) clientes.set(id, c);
    return c;
  },
  /** Deja de jugar por él en este celular (lo sacaron de la sala). */
  async soltar(id: string) {
    const c = sostenidos.cliente(id);
    if (c) try { await c.auth.signOut({ scope: "local" }); } catch { /* nada */ }
    clientes.delete(id); if (enMano === id) enMano = "";
    const r = leerRegistro(); if (r) guardarRegistro({ ...r, jugadores: r.jugadores.filter(j => j.id !== id) });
  },
  /** Se cerró la sala: suelta a todos. */
  async soltarTodos() { for (const id of (leerRegistro()?.jugadores ?? []).map(j => j.id)) await sostenidos.soltar(id); guardarRegistro(null); },
  /** Quién tiene el celular del anfitrión en este momento ("" = el anfitrión). */
  pasarA(id: string) { enMano = id && sostenidos.cliente(id) ? id : ""; },
  enMano: () => enMano,
};
