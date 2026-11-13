// Restablece la contraseña de una cuenta. Solo la puede usar un administrador (privado.administradores).
// La llave secreta (service role) la pone Supabase como variable del servidor: nunca está en el código ni llega al navegador.
// Errores hacia la app: mensajes genéricos. El detalle va al log (sin la contraseña).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGENES = ["https://ecortesgb.github.io", "http://localhost:5173"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // ¿Quien llama es administrador? Se pregunta con SU sesión, no con la llave secreta.
  const comoUsuario = createClient(URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: esAdmin, error: errAdmin } = await comoUsuario.rpc("soy_admin");
  if (errAdmin || esAdmin !== true) return respuesta(origen, 403, { error: "Sin permiso" });

  let jugador = "", clave = "";
  try {
    const cuerpo = await req.json();
    jugador = String(cuerpo?.jugador ?? "");
    clave = String(cuerpo?.clave ?? "");
  } catch { return respuesta(origen, 400, { error: "Datos no válidos" }); }
  if (!UUID.test(jugador) || clave.length < 8 || clave.length > 72) return respuesta(origen, 400, { error: "Datos no válidos" });

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const { data: perfil } = await admin.from("perfiles").select("id").eq("id", jugador).maybeSingle();
  if (!perfil) return respuesta(origen, 404, { error: "No existe esa cuenta" });

  const { error } = await admin.auth.admin.updateUserById(jugador, { password: clave });
  if (error) {
    console.error("restablecer-clave: falló", { jugador, mensaje: error.message });
    return respuesta(origen, 500, { error: "No se pudo cambiar. Intenta otra vez." });
  }
  console.log("restablecer-clave: hecho", { jugador });
  return respuesta(origen, 200, { ok: true });
});
