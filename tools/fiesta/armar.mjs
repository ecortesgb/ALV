// Arma la app para la fiesta (se corre UNA vez con internet, antes de llegar al lugar):
//   npm run fiesta:armar
// 1. Build de la app sin nube y con el Modo Fiesta encendido, en dist-fiesta/.
// 2. Baja Three.js r128 y las fuentes de Google y los deja dentro de dist-fiesta/vendor/.
// 3. Cambia en la app las direcciones de internet (cdnjs, jsdelivr, Google Fonts) por las de la laptop.
// Las descargas se guardan en .fiesta-cache/ para no repetirlas.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SALIDA = join(RAIZ, "dist-fiesta");
const CACHE = join(RAIZ, ".fiesta-cache");
const VENDOR = join(SALIDA, "vendor");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
mkdirSync(CACHE, { recursive: true });

// 1. Build. Las variables ya puestas mandan sobre .env.local: sin Supabase y con Fiesta.
console.log("1/3 Armando la app (sin nube)…");
process.env.VITE_ALV_FIESTA = "1";
process.env.VITE_SUPABASE_URL = "";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "";
rmSync(SALIDA, { recursive: true, force: true });
const { build } = await import("vite");
await build({ root: RAIZ, logLevel: "warn", build: { outDir: SALIDA, emptyOutDir: true } });

// 2a. Three.js r128 completo (build + examples), del registro de npm.
console.log("2/3 Bajando Three.js y fuentes…");
async function bajar(url, cabeceras = {}) {
  const r = await fetch(url, { headers: cabeceras });
  if (!r.ok) throw new Error(`No se pudo bajar ${url} (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}
const tgz = join(CACHE, "three-0.128.0.tgz");
if (!existsSync(tgz)) writeFileSync(tgz, await bajar("https://registry.npmjs.org/three/-/three-0.128.0.tgz"));
const destThree = join(VENDOR, "three@0.128.0");
mkdirSync(destThree, { recursive: true });
execFileSync("tar", ["-xzf", tgz, "-C", destThree, "--strip-components=1"], { stdio: "inherit" });

// 2b. Fuentes de Google: cada hoja de estilos y sus archivos woff2.
const textos = [];
(function juntar(dir) {
  for (const n of readdirSync(dir)) {
    const r = join(dir, n);
    if (r.startsWith(VENDOR)) continue;
    if (statSync(r).isDirectory()) juntar(r);
    else if ([".html", ".js", ".css"].includes(extname(n))) textos.push(r);
  }
})(SALIDA);
const hojas = new Set();
for (const f of textos) for (const m of readFileSync(f, "utf8").matchAll(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'`\s)]+/g)) hojas.add(m[0].replace(/&amp;/g, "&"));
const reemplazos = new Map();
mkdirSync(join(VENDOR, "fuentes"), { recursive: true });
for (const hoja of hojas) {
  const id = createHash("sha1").update(hoja).digest("hex").slice(0, 10);
  const enCache = join(CACHE, `fuentes-${id}.css`);
  let css = existsSync(enCache) ? readFileSync(enCache, "utf8") : (await bajar(hoja, { "user-agent": UA })).toString("utf8");
  writeFileSync(enCache, css);
  for (const m of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) {
    const nombre = createHash("sha1").update(m[1]).digest("hex").slice(0, 16) + extname(new URL(m[1]).pathname);
    const local = join(CACHE, nombre);
    if (!existsSync(local)) writeFileSync(local, await bajar(m[1]));
    writeFileSync(join(VENDOR, "fuentes", nombre), readFileSync(local));
    css = css.split(m[1]).join(`/vendor/fuentes/${nombre}`);
  }
  writeFileSync(join(VENDOR, "fuentes", `${id}.css`), css);
  reemplazos.set(hoja, `/vendor/fuentes/${id}.css`);
}

// 3. Direcciones de internet → laptop.
console.log("3/3 Cambiando direcciones de internet por las de la laptop…");
let cambiados = 0;
for (const f of textos) {
  const antes = readFileSync(f, "utf8");
  let t = antes
    .split("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js").join("/vendor/three@0.128.0/build/three.min.js")
    .split("https://cdn.jsdelivr.net/npm/three@0.128.0/").join("/vendor/three@0.128.0/");
  for (const [hoja, local] of reemplazos) t = t.split(hoja).join(local).split(hoja.replace(/&/g, "&amp;")).join(local);
  // Los avisos de conexión previa a Google ya no sirven sin internet.
  t = t.replace(/<link[^>]+rel="preconnect"[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g, "");
  if (t !== antes) { writeFileSync(f, t); cambiados++; }
}
const quedan = textos.filter(f => /https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com)/.test(readFileSync(f, "utf8")));
console.log(`Listo: ${cambiados} archivos cambiados.`);
if (quedan.length) console.log("Aviso: todavía piden internet:\n  " + quedan.map(f => f.slice(SALIDA.length + 1)).join("\n  "));
console.log("\nAhora, ya sin internet si quieres:  npm run fiesta\n");
