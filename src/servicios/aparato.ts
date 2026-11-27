// Jugar varios en un mismo aparato (055, pedido de Elías del 27 nov).
// En el lobby de un aparato se agrega una cuenta existente (usuario y contraseña) o un «personaje rápido»: una cuenta real
// UsuarioN con contraseña aleatoria y código de recuperación, que se muestran UNA sola vez.
// Cada cuenta entra con SU sesión, en un cliente aparte que no guarda nada, a la sala espejo de la nube («ALV en un
// aparato»). Así el servidor sabe que esa persona está en la sala y le da sus puntos cuando el anfitrión termina la partida.
// La sesión aparte se cierra en cuanto entra: en el aparato no se guarda ninguna contraseña ni sesión ajena.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FiguraV2 } from "../content/personaje";
import { desdeBase, haciaBase } from "../personajes/integracion";
import { cliente, clienteAparte, hayNube } from "./cliente";
import { nickValido, passValida } from "./cuenta";

/** Nombre de la sala espejo en la nube. lobby_abierto (055) la ignora para que nadie entre solo a ella. */
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
    const { data, error } = await cliente.rpc("crear_evento", { p_nombre: NOMBRE_ESPEJO, p_adulto: true, p_drunk: true });
    const f = (data as { id: string; codigo: string }[] | null)?.[0];
    if (error || !f) { log("abrirEspejo", error); return null; }
    return { id: f.id, codigo: f.codigo };
  } catch (e) { log("abrirEspejo", e); return null; }
}

/** Con la sesión aparte: entra a la sala espejo y lee su nombre y su figura activa. Siempre cierra la sesión aparte. */
async function entrarYLeer(c: SupabaseClient, uid: string, espejo: Espejo): Promise<CuentaEnAparato | string> {
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
    try { await c.auth.signOut({ scope: "local" }); } catch { /* la sesión aparte no se guardó en ningún lado */ }
  }
}

/** Cuenta existente: usuario y contraseña. Devuelve la cuenta o el mensaje para la persona. */
export async function entrarCuentaEnAparato(nick: string, pass: string, espejo: Espejo, yaDentro: string[]): Promise<CuentaEnAparato | string> {
  const c = clienteAparte();
  if (!c) return "Sin servidor no se pueden agregar cuentas.";
  if (!nickValido(nick) || !passValida(pass)) return "Usuario o contraseña incorrectos.";
  try {
    const { data, error } = await c.auth.signInWithPassword({ email: correo(nick), password: pass });
    if (error || !data.user) return "Usuario o contraseña incorrectos.";
    if (yaDentro.includes(data.user.id)) { await c.auth.signOut({ scope: "local" }); return "Esa cuenta ya está en el lobby."; }
    return await entrarYLeer(c, data.user.id, espejo);
  } catch (e) { log("entrarCuentaEnAparato", e); return "No se pudo. Intenta otra vez."; }
}

/**
 * Personaje rápido: crea la cuenta UsuarioN (el número lo da el servidor), con contraseña aleatoria, le pone el apodo,
 * guarda su figura (si se eligió) y la mete a la sala espejo. El código de recuperación lo genera el servidor.
 */
export async function crearPersonajeRapido(apodo: string, figura: FiguraV2 | null, espejo: Espejo): Promise<PersonajeRapido | string> {
  const limpio = apodo.replace(/\s+/g, " ").trim();
  if (limpio.length < 2 || limpio.length > 20) return "El nombre va de 2 a 20 letras.";
  if (!cliente || !hayNube) return "Sin servidor no se pueden crear cuentas.";
  const sig = await cliente.rpc("siguiente_usuario");
  if (sig.error || typeof sig.data !== "number") { log("siguiente_usuario", sig.error); return "No se pudo crear el personaje. Intenta otra vez."; }
  const clave = claveAleatoria();
  // Si otro aparato ganó el número, se prueba con los siguientes.
  for (let n = sig.data, intento = 0; intento < 5; n++, intento++) {
    const nick = `usuario${n}`;
    const c = clienteAparte()!;
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
      const dentro = await entrarYLeer(c, data.user.id, espejo);
      if (typeof dentro === "string") return dentro;
      return { ...dentro, figura: dentro.figura ?? figura, usuario: `Usuario${n}`, clave, codigo: r.data };
    } catch (e) { log("crearPersonajeRapido", e); return "No se pudo crear el personaje. Intenta otra vez."; }
  }
  return "No se pudo crear el personaje. Intenta otra vez.";
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
