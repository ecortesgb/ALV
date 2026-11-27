// Recupera una cuenta de personaje rápido (053): usuario + código de recuperación + contraseña nueva.
// No pide sesión (la persona olvidó su contraseña). La llave secreta (service role) la pone Supabase como variable del
// servidor: nunca está en el código ni llega al navegador. El código se compara en la base (hash bcrypt) y 5 fallos lo
// bloquean. Errores hacia la app: un solo mensaje genérico. El detalle va al log (sin código ni contraseña).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGENES = ["https://ecortesgb.github.io", "http://localhost:5173"];
const NICK = /^[a-z0-9_]{3,20}$/;
const CODIGO = /^[A-Z0-9]{12}$/;
const GENERICO = { error: "No se pudo. Revisa tu usuario y tu código." };

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

  let nick = "", codigo = "", clave = "";
  try {
    const cuerpo = await req.json();
    nick = String(cuerpo?.usuario ?? "").trim().toLowerCase();
    codigo = String(cuerpo?.codigo ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    clave = String(cuerpo?.clave ?? "");
  } catch { return respuesta(origen, 400, GENERICO); }
  if (!NICK.test(nick) || !CODIGO.test(codigo) || clave.length < 8 || clave.length > 72) return respuesta(origen, 400, GENERICO);

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const { data: jugador, error } = await admin.rpc("verificar_recuperacion", { p_correo: `${nick}@jugadores.alv.invalid`, p_codigo: codigo });
  if (error) { console.error("recuperar-cuenta: verificar", error.message); return respuesta(origen, 500, GENERICO); }
  if (!jugador) { console.log("recuperar-cuenta: rechazado", { nick }); return respuesta(origen, 403, GENERICO); }

  const r = await admin.auth.admin.updateUserById(String(jugador), { password: clave });
  if (r.error) { console.error("recuperar-cuenta: falló", { jugador, mensaje: r.error.message }); return respuesta(origen, 500, GENERICO); }
  console.log("recuperar-cuenta: hecho", { jugador });
  return respuesta(origen, 200, { ok: true });
});
