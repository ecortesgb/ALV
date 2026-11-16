// Pantalla provisional de una ruta de ALV 2.0 que todavía no se programa. Solo muestra texto fijo.
import { Boton, Etiqueta, FondoCiudad, Panel, RaizDS } from "../ds";

export function Esqueleto({ etiqueta, titulo, texto }: { etiqueta: string; titulo: string; texto: string }) {
  return (
    <RaizDS style={{ position: "fixed", inset: 0, overflow: "auto", background: "var(--noche)" }}>
      <FondoCiudad />
      <div style={{ position: "relative", minHeight: "100%", display: "grid", placeItems: "center", padding: 16 }}>
        <Panel style={{ padding: "1.2em 1.4em", maxWidth: "26em", display: "grid", gap: ".9em", justifyItems: "start" }}>
          <Etiqueta texto={etiqueta} icono="star" />
          <span className="dsp ol" style={{ fontSize: "2em" }}>{titulo}</span>
          <p style={{ margin: 0, color: "var(--texto-suave)", fontWeight: 600 }}>{texto}</p>
          <Boton color="naranja" icono="back" texto="Ir al inicio" onClick={() => { location.hash = "/inicio"; }} />
        </Panel>
      </div>
    </RaizDS>
  );
}
