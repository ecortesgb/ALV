// Llama por HTTP a la Edge Function LOCAL partida-prueba y compara la respuesta con la referencia del motor anterior.
// Solo 127.0.0.1. La llave local se toma de la variable ALV_LLAVE_LOCAL (sacarla de `supabase status` al correr;
// nunca escribirla en archivos). Correr desde app/:
//   deno run --sloppy-imports --allow-read=. --allow-net=127.0.0.1:54321 --allow-env=ALV_LLAVE_LOCAL tools/deno/llamar_partida_prueba.ts
import { comparar, entradaEscenario, leerGolden } from "./comparar_partida.ts";

const URL_FUNCION = "http://127.0.0.1:54321/functions/v1/partida-prueba";
const llave = Deno.env.get("ALV_LLAVE_LOCAL");
if (!llave) { console.error("Falta ALV_LLAVE_LOCAL"); Deno.exit(2); }

const g = leerGolden();
const cuerpo = JSON.stringify(entradaEscenario(g));

const sin = await fetch(URL_FUNCION, { method: "POST", headers: { "Content-Type": "application/json" }, body: cuerpo });
await sin.body?.cancel();
console.log(`POST sin autorización: HTTP ${sin.status}`);

const t0 = performance.now();
const con = await fetch(URL_FUNCION, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${llave}` }, body: cuerpo });
const texto = await con.text();
console.log(`POST con autorización local: HTTP ${con.status} (${texto.length} bytes, ${Math.round(performance.now() - t0)} ms)`);
if (con.status !== 200) { console.error(texto.slice(0, 500)); Deno.exit(1); }

const r = comparar(JSON.parse(texto), g);
console.log(`pasos comparados: ${r.pasos}, campos comparados: ${r.campos}, diferencias: ${r.difs.length}`);
for (const d of r.difs.slice(0, 20)) console.log(`  ${d}`);
Deno.exit(sin.status === 401 && r.difs.length === 0 ? 0 : 1);
