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
console.log(url ? "config ok: con servidor" : "config ok: sin servidor (modo local)");
