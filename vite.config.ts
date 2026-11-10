import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" para que funcione igual en GitHub Pages (subcarpeta) que en un dominio propio.
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
