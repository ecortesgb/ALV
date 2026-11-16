import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" para que funcione igual en GitHub Pages (subcarpeta) que en un dominio propio.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // css: la prueba del Design System lee sus estilos copiados (src/ds) para revisar que sean los aprobados.
  test: { environment: "node", include: ["src/**/*.test.ts"], css: { include: [/src[\\/]ds[\\/].*\.css/] } },
});
