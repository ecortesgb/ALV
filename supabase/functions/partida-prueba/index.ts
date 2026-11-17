// Edge Function de prueba (solo local): corre el motor puro de ALV (src/engine/nucleo.ts) en memoria.
// Recibe juego, jugadores, rondas, semilla y acciones; devuelve en cada paso estado, roles, vistas por jugador,
// reloj lógico, ranking y XP. No lee ni escribe la base, no usa llaves y no se despliega.
// GET sin cuerpo: responde que está lista (la prueba de humo de la Fase 0).
import { correr, revisar, type Entrada } from "./correr.ts";

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "GET") return json({ ok: true, funcion: "partida-prueba", mensaje: "Motor puro listo" });
  if (req.method !== "POST") return json({ ok: false, error: "método no permitido" }, 405);
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return json({ ok: false, error: "JSON no válido" }, 400);
  }
  const motivo = revisar(cuerpo);
  if (motivo) return json({ ok: false, error: `entrada no válida: ${motivo}` }, 400);
  try {
    const r = correr(cuerpo as Entrada);
    return json(r, r.ok ? 200 : 400);
  } catch (err) {
    console.error("partida-prueba:", err);
    return json({ ok: false, error: "error interno" }, 500);
  }
});
