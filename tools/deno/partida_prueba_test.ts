// Prueba de la Edge Function local partida-prueba con el motor puro (sin npm, sin vitest, sin red).
// 1) Corre la función en memoria con el escenario de la referencia (El impostor, 4 jugadores, semilla 777, 5 rondas)
//    y compara paso a paso contra nucleo.golden.json (motor anterior): cero diferencias.
// 2) Pureza: recorre los imports desde index.ts y revisa que nada use React, DOM, navegador, servicios ni supabase-js.
// Correr desde app/:  deno test --sloppy-imports --allow-read=. tools/deno/partida_prueba_test.ts
import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { correr, revisar } from "../../supabase/functions/partida-prueba/correr.ts";
import { comparar, entradaEscenario, leerGolden } from "./comparar_partida.ts";

const g = leerGolden();

Deno.test("partida-prueba en memoria: igual al motor anterior en cada paso", () => {
  const ent = entradaEscenario(g);
  strictEqual(revisar(ent), null);
  const r = comparar(correr(ent), g);
  console.log(`pasos comparados: ${r.pasos}, campos comparados: ${r.campos}, diferencias: ${r.difs.length}`);
  deepStrictEqual(r.difs, []);
  strictEqual(r.pasos, 56);
});

Deno.test("el comparador sí detecta una diferencia", () => {
  const s = JSON.parse(JSON.stringify(correr(entradaEscenario(g))));
  s.pasos[30].estado.puntos[Object.keys(s.pasos[30].estado.puntos)[0]] += 1;
  s.pasos[30].ranking[0].xp += 5;
  s.pasos[40].vistas.privados[Object.keys(s.pasos[40].vistas.privados)[3]].mio = null;
  const r = comparar(s, g);
  strictEqual(r.difs.some(d => d.startsWith("paso 31 estado.puntos")), true);
  strictEqual(r.difs.some(d => d.startsWith("paso 31 ranking")), true);
  strictEqual(r.difs.some(d => /^paso 41 vista\..+\.mio/.test(d)), true);
});

Deno.test("revisar rechaza entradas mal formadas", () => {
  strictEqual(revisar(null), "cuerpo no es un objeto");
  strictEqual(revisar({ ...entradaEscenario(g), semilla: "777" }), "semilla");
  strictEqual(revisar({ ...entradaEscenario(g), acciones: [{ id: "x", jugador: "y", tipo: "borrar", datos: {} }] }), "acciones");
});

// ---------- Pureza ----------
const PROHIBIDO: [string, RegExp][] = [
  ["react", /from\s+["'](react|react-dom)(\/[^"']*)?["']/],
  ["react-dom", /react-dom/],
  ["window", /\bwindow\b/],
  ["document", /\bdocument\b/],
  ["localStorage", /\b(localStorage|sessionStorage|indexedDB)\b/],
  ["navigator", /\bnavigator\b/],
  ["servicios/", /from\s+["'][^"']*servicios\/?[^"']*["']/],
  ["supabase-js", /@supabase\/|supabase-js|createClient/],
  ["red o base", /\bfetch\(|Deno\.env|WebSocket|BroadcastChannel/],
  ["pantallas o roles", /from\s+["'][^"']*(roles|pantallas|juegos|app|ds)\/[^"']*["']/],
];
const sinComentarios = (c: string) => c.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

function existe(p: URL) { try { return Deno.statSync(p).isFile; } catch { return false; } }
/** Archivos que alcanza index.ts por imports (los .json del contenido se listan pero no se revisan como código). */
function grafo(inicio: URL) {
  const vistos = new Map<string, string>();
  const externos: string[] = [];
  const pend = [inicio];
  while (pend.length) {
    const u = pend.pop()!;
    if (vistos.has(u.href)) continue;
    const codigo = Deno.readTextFileSync(u);
    vistos.set(u.href, codigo);
    for (const m of sinComentarios(codigo).matchAll(/(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/g)) {
      const ruta = m[1]!;
      if (!ruta.startsWith(".")) { externos.push(ruta); continue; }
      if (ruta.endsWith(".json")) continue;
      const base = new URL(ruta, u);
      pend.push(base.pathname.endsWith(".ts") ? base : existe(new URL(base.href + ".ts")) ? new URL(base.href + ".ts") : new URL(base.href + "/index.ts"));
    }
  }
  return { vistos, externos };
}

const { vistos, externos } = grafo(new URL("../../supabase/functions/partida-prueba/index.ts", import.meta.url));

Deno.test("pureza: el árbol de imports de la función no trae nada de npm ni de jsr", () => {
  deepStrictEqual(externos, []);
  const nombres = [...vistos.keys()].map(h => h.replace(/^.*\/app\//, ""));
  console.log(`archivos revisados (${nombres.length}): ${nombres.join(", ")}`);
  for (const e of ["supabase/functions/partida-prueba/index.ts", "supabase/functions/partida-prueba/correr.ts", "src/engine/nucleo.ts", "src/engine/partida.ts", "src/engine/vistas.ts", "src/content/index.ts"]) {
    strictEqual(nombres.includes(e), true, e);
  }
});

for (const [href, codigo] of vistos) {
  Deno.test(`pureza: ${href.replace(/^.*\/app\//, "")} sin React, DOM, navegador, servicios ni supabase-js`, () => {
    deepStrictEqual(PROHIBIDO.filter(([, re]) => re.test(sinComentarios(codigo))).map(([n]) => n), []);
  });
}

Deno.test("pureza: el detector sí encuentra lo prohibido", () => {
  const malo = `import React from "react";\nimport { x } from "../servicios/enlace";\nimport { createClient } from "@supabase/supabase-js";\nwindow.document; localStorage.x;`;
  deepStrictEqual(PROHIBIDO.filter(([, re]) => re.test(malo)).map(([n]) => n), ["react", "window", "document", "localStorage", "servicios/", "supabase-js"]);
});
