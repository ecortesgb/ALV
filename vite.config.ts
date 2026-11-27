import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Versión que se ve en Configuración → Acerca de ALV: la de package.json, el día del build y el commit.
function version() {
  const v = (JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string }).version;
  let commit = "";
  try { commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { /* sin git */ }
  const dia = new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "numeric" });
  return { v, commit, dia };
}

// base "./" para que funcione igual en GitHub Pages (subcarpeta) que en un dominio propio.
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: { __ALV_VERSION__: JSON.stringify(version()) },
  // Mini-Juegos: páginas aparte de la TV y del celular (zona de personajes), por Realtime de Supabase (?canal=nube).
  // Físico, el cuarto y la mesa de prueba siguen solo en desarrollo.
  build: {
    rollupOptions: {
      input: Object.fromEntries(["index.html", ...["index", "control", "tv-bala", "tv-desenfunda", "tv-martillazo", "tv-alto-total", "tv-paracaidas"]
        .map(n => `tools/personajes/minijuegos/${n}.html`)].map(f => [f.replace(/\.html$/, "").replace(/\//g, "-"), fileURLToPath(new URL(f, import.meta.url))])),
    },
  },
  // css: la prueba del Design System lee sus estilos copiados (src/ds) para revisar que sean los aprobados.
  test: { environment: "node", include: ["src/**/*.test.ts"], css: { include: [/src[\\/]ds[\\/].*\.css/] } },
});
