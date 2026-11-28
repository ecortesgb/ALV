import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { instalarMusica } from "./musica";
import { instalarPreferencias } from "./preferencias";
import { instalarMovimiento } from "./movimiento";
import "../pantallas/alv.css";
import "./preferencias.css";

// En http dentro de una red local (Modo Fiesta) el navegador no da crypto.randomUUID: se arma con getRandomValues.
if (typeof crypto !== "undefined" && !crypto.randomUUID && crypto.getRandomValues) {
  (crypto as { randomUUID: () => string }).randomUUID = () => {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6]! & 0x0f) | 0x40; b[8] = (b[8]! & 0x3f) | 0x80;
    const h = Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
}

// Antes de dibujar: animaciones, tamaño de letra y modo TV elegidos en Configuración.
instalarPreferencias();
instalarMusica();
instalarMovimiento();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
