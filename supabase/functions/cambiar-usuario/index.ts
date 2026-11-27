// Cambia el nombre de usuario (con el que se entra) de la cuenta abierta. Pide la contraseña actual.
// El nombre de usuario vive como correo interno nick@jugadores.alv.invalid: cambiarlo es cambiar ese correo, y eso solo
// lo hace el servidor con la llave secreta (service role), que Supabase pone como variable: nunca está en el código ni
// llega al navegador. No se permiten los nombres reservados (inv_… de invitados, usuarioN de personajes rápidos).
// Errores hacia la app: mensajes genéricos. El detalle va al log (sin contraseña).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGENES = ["https://ecortesgb.github.io", "http://localhost:5173"];
const NICK = /^[a-z0-9_]{3,20}$/;
const RESERVADO = /^(inv_|usuario[0-9]+$)/;
const DOMINIO = "@jugadores.alv.invalid";
const GENERICO = { error: "No se pudo cambiar. Intenta otra vez." };

function respuesta(origen: string | null, status: number, cuerpo: unknown) {
  const permitido = origen && ORIGENES.includes(origen) ? origen : ORIGENES[0]!;
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": permitido,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });
}

Deno.serve(async req => {
  const origen = req.headers.get("Origin");
  if (req.method === "OPTIONS") return respuesta(origen, 204, null);
  if (req.method !== "POST") return respuesta(origen, 405, { error: "Método no permitido" });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return respuesta(origen, 401, { error: "Sin sesión" });

  let nuevo = "", clave = "";
  try {
    const cuerpo = await req.json();
    nuevo = String(cuerpo?.usuario ?? "").trim().toLowerCase();
    clave = String(cuerpo?.clave ?? "");
  } catch { return respuesta(origen, 400, GENERICO); }
  if (!NICK.test(nuevo) || RESERVADO.test(nuevo)) return respuesta(origen, 400, { error: "Usa de 3 a 20 letras, números o _. No puede empezar con inv_ ni ser usuario y un número." });
  if (clave.length < 8 || clave.length > 72) return respuesta(origen, 400, { error: "La contraseña actual no es correcta." });

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
  // Quién llama: se lee de SU sesión.
  const { data: quien, error: errQuien } = await admin.auth.getUser(auth.slice(7));
  const yo = quien?.user;
  if (errQuien || !yo?.email || !yo.email.endsWith(DOMINIO)) return respuesta(origen, 401, { error: "Sin sesión" });
  const actual = yo.email.slice(0, -DOMINIO.length);
  if (actual.startsWith("inv_")) return respuesta(origen, 403, { error: "Las entradas de prueba no cambian de usuario." });
  if (actual === nuevo) return respuesta(origen, 400, { error: "Ese ya es tu usuario." });

  // La contraseña actual se comprueba entrando con ella, en un cliente que no guarda nada.
  const prueba = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const entrada = await prueba.auth.signInWithPassword({ email: yo.email, password: clave });
  if (entrada.error || entrada.data.user?.id !== yo.id) return respuesta(origen, 403, { error: "La contraseña actual no es correcta." });
  try { await prueba.auth.signOut({ scope: "local" }); } catch { /* nada */ }

  const r = await admin.auth.admin.updateUserById(yo.id, { email: nuevo + DOMINIO, email_confirm: true });
  if (r.error) {
    if (/already|exists|registered/i.test(r.error.message)) return respuesta(origen, 409, { error: "Ese usuario ya existe. Prueba con otro." });
    console.error("cambiar-usuario: falló", { jugador: yo.id, mensaje: r.error.message });
    return respuesta(origen, 500, GENERICO);
  }
  console.log("cambiar-usuario: hecho", { jugador: yo.id });
  return respuesta(origen, 200, { ok: true });
});
