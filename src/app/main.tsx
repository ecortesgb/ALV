import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { instalarMusica } from "./musica";
import { instalarPreferencias } from "./preferencias";
import "../pantallas/alv.css";
import "./preferencias.css";

// Antes de dibujar: animaciones, tamaño de letra y modo TV elegidos en Configuración.
instalarPreferencias();
instalarMusica();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
