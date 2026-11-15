// Copia versionada de Minifig Studio dentro de ALV (public/minifig/).
// Uso: node tools/copiar-minifig.mjs [carpeta de minifig-studio]
// Solo copia lo que corre en el navegador: núcleo, biblioteca (JSON + geometría), scripts y la página del editor.
// Nunca copia herramientas/ (ahí viven las llaves), supabase/, pruebas/ ni biblioteca/ldraw/ (archivos crudos).
// Además agrega lo propio de ALV (tools/minifig/): el puente del editor y la escena 3D de varias figuras.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raizApp = resolve(aqui, "..");
const origen = resolve(process.argv[2] ?? join(raizApp, "..", "..", "minifig-studio"));
const destino = join(raizApp, "public", "minifig");
const propios = join(aqui, "minifig");

if (!existsSync(join(origen, "nucleo", "minifig-core.js"))) {
  console.error(`No encuentro Minifig Studio en ${origen}`);
  process.exit(1);
}

rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });

const copiar = (de, a = de) => cpSync(join(origen, de), join(destino, a), { recursive: true });
copiar("nucleo");
copiar("js");
mkdirSync(join(destino, "biblioteca"), { recursive: true });
for (const f of readdirSync(join(origen, "biblioteca"))) if (f.endsWith(".json")) copiar(join("biblioteca", f));
copiar(join("biblioteca", "migraciones"));
copiar(join("biblioteca", "geometria"));

// Página del editor: la misma del taller, con el puente de ALV antes del arranque.
let html = readFileSync(join(origen, "index.html"), "utf8");
const arranque = '<script src="js/99-arranque.js"></script>';
if (!html.includes(arranque)) { console.error("index.html cambió: no encuentro js/99-arranque.js"); process.exit(1); }
html = html.replace(arranque, '<script src="alv-puente.js"></script>\n' + arranque);
writeFileSync(join(destino, "index.html"), html);
for (const f of readdirSync(propios)) cpSync(join(propios, f), join(destino, f));

// Revisión: nada que parezca una llave.
const sospechoso = /(sb_secret_|service_role|rebrickable_key|eyJhbGciOi)/;
const revisar = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) revisar(p); else if (sospechoso.test(readFileSync(p, "utf8"))) { console.error("Posible llave en " + p); process.exit(1); } } };
revisar(destino);

// Huella de versión: cambia si cambia cualquier archivo copiado.
const h = createHash("sha256");
const sumar = d => { for (const f of readdirSync(d).sort()) { const p = join(d, f); if (statSync(p).isDirectory()) sumar(p); else h.update(f).update(readFileSync(p)); } };
sumar(destino);
const version = { copiado: new Date().toISOString(), huella: h.digest("hex").slice(0, 12) };
writeFileSync(join(destino, "VERSION.json"), JSON.stringify(version, null, 2) + "\n");
console.log(`Minifig Studio copiado a public/minifig (${version.huella})`);
