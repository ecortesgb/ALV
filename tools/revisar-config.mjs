// Se corre antes de cada build: frena la publicación si alguien puso una llave que no es la publicable.
const url = process.env.VITE_SUPABASE_URL ?? "";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
if (key && !key.startsWith("sb_publishable_")) {
  console.error("VITE_SUPABASE_PUBLISHABLE_KEY debe ser la llave publicable (sb_publishable_...). Build detenido.");
  process.exit(1);
}
if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
  console.error("VITE_SUPABASE_URL no parece una URL de Supabase. Build detenido.");
  process.exit(1);
}
// Animaciones privadas (ALV_PLAN_ANIMATION_LIBRARY.md §6): las tablas derivan de un juego y NUNCA van a la página
// publicada. Si alguna llega a public/, el build se detiene.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const SOSPECHOSOS = [/animation-library-v\d+\.json$/i, /tablas-alv/i, /biblioteca-v\d+/i];
const MARCAS = ['"clip_tt"', '"archivo_tt"', '"articulaciones"'];
function revisarCarpeta(dir) {
  for (const n of readdirSync(dir)) {
    const ruta = join(dir, n), st = statSync(ruta);
    if (st.isDirectory()) { revisarCarpeta(ruta); continue; }
    const mala = SOSPECHOSOS.some(r => r.test(ruta)) || (/\.json$/i.test(n) && st.size < 5_000_000 && MARCAS.some(m => readFileSync(ruta, "utf8").includes(m)));
    if (mala) { console.error(`Animación privada dentro de public/ (${ruta}). Las tablas no se publican. Build detenido.`); process.exit(1); }
  }
}
revisarCarpeta("public");
// Personajes (ALV_PLAN_PERSONAJES_NUEVO.md): ningún modelo 3D se publica si no está en src/personajes/archivos-3d.json
// con licencia pública. Lo sacado de un juego nunca entra al build.
const MODELOS = /\.(glb|gltf|fbx|blend|blend1|obj|dae|ktx2|ghg|gsc)$/i;
const permitidos = new Set(JSON.parse(readFileSync("src/personajes/archivos-3d.json", "utf8")).archivos.map(a => a.ruta));
(function modelos(dir) {
  for (const n of readdirSync(dir)) {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) { modelos(ruta); continue; }
    if (MODELOS.test(n) && !permitidos.has(ruta.split("\\").join("/"))) { console.error(`Modelo 3D sin permiso en public/ (${ruta}). Agrégalo a src/personajes/archivos-3d.json solo si su licencia es pública. Build detenido.`); process.exit(1); }
  }
})("public");
// Imágenes privadas (Codex O8, 2026-11-25): las fotos de tarjeta y busto y las miniaturas de piezas salen de un juego.
// Se frenan por nombre en public/ y src/, y por contenido: si existe ../personajes-privado (build en esta PC), ninguna
// imagen de public/ o src/ puede ser idéntica (SHA256) a una de ahí.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
const IMAGENES = /\.(webp|png|jpe?g|avif|gif)$/i;
const NOMBRE_PRIVADO = /-(tarjeta|busto)\.(webp|png|jpe?g|avif)$/i;
const huella = r => createHash("sha256").update(readFileSync(r)).digest("hex");
function imagenes(dir, fuera = []) {
  if (!existsSync(dir)) return fuera;
  for (const n of readdirSync(dir)) {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) { if (n !== "node_modules") imagenes(ruta, fuera); continue; }
    if (IMAGENES.test(n)) fuera.push(ruta);
  }
  return fuera;
}
const publicables = [...imagenes("public"), ...imagenes("src")];
for (const r of publicables) if (NOMBRE_PRIVADO.test(r)) { console.error(`Foto de personaje privada en ${r} (tarjeta/busto salen del juego). Build detenido.`); process.exit(1); }
const privada = process.env.ALV_PERSONAJES_PRIVADO ?? "../personajes-privado";
if (existsSync(privada)) {
  const prohibidas = new Set(imagenes(privada).map(huella));
  for (const r of publicables) if (prohibidas.has(huella(r))) { console.error(`Imagen idéntica a una de personajes-privado en ${r}. Lo del juego no se publica. Build detenido.`); process.exit(1); }
}
const bib = process.env.VITE_ANIM_BIBLIOTECA_URL ?? "";
if (bib && !/^https?:\/\/[^\s"'<>]+$/.test(bib)) { console.error("VITE_ANIM_BIBLIOTECA_URL no es una dirección http(s). Build detenido."); process.exit(1); }
console.log(url ? "config ok: con servidor" : "config ok: sin servidor (modo local)");
