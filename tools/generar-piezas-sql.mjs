// Escribe en la migración 033 el catálogo de piezas bloqueables y los retos, sacados de src/content/rarezas.ts
// (fuente única). Uso: node tools/generar-piezas-sql.mjs   (Node 22+ lee TypeScript sin compilar).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PRECIO, RAREZA, RETOS } from "../src/content/rarezas.ts";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const archivo = join(raiz, "supabase", "migrations", "033_piezas_rareza_y_retos.sql");
const q = s => "'" + String(s).replace(/'/g, "''") + "'";

const piezas = Object.entries(RAREZA).sort(([a], [b]) => a.localeCompare(b))
  .map(([id, r]) => `  (${q(id)}, ${q(r)}, ${PRECIO[r]})`).join(",\n");
let orden = 0;
const retos = RETOS.map(r => `  (${q(r.id)}, ${q(r.tipo)}, ${r.tipo === "diario" ? orden++ : 0}, ${q(r.nombre)}, ${q(JSON.stringify(r.condicion))}::jsonb, ${q(r.premio)})`).join(",\n");
const bloque = `-- >>> generado (no editar a mano: node tools/generar-piezas-sql.mjs)
insert into public.piezas_figura (id, rareza, precio) values
${piezas};

insert into public.retos_figura (id, tipo, orden, nombre, condicion, premio) values
${retos};
-- <<< generado`;

const sql = readFileSync(archivo, "utf8");
const nuevo = sql.replace(/-- >>> generado[\s\S]*?-- <<< generado/, bloque);
if (nuevo === sql && !sql.includes(bloque)) { console.error("No encontré el bloque «generado» en la 033"); process.exit(1); }
writeFileSync(archivo, nuevo);
console.log(`033: ${Object.keys(RAREZA).length} piezas y ${RETOS.length} retos`);
