// Tiempo real (Maestro §22.1): un solo archivo escucha los cambios de la sala.
// Estados: conectando → vivo. Si el servidor no confirma en 5 s, respaldo: se consulta cada 3 s.
// Aun en vivo se consulta cada 12 s, por si se perdió un aviso. Cada aparato recibe solo lo que RLS le deja leer.
import { cliente } from "./cliente";

export type EstadoRed = "conectando" | "vivo" | "respaldo";
const TABLAS = ["partidas", "datos_privados", "acciones", "miembros_evento", "eventos", "figuras_jugador"] as const;
export const ESPERA_VIVO_MS = 5000, RESPALDO_MS = 3000, LATIDO_MS = 12000;

/** Escucha la sala. `alCambiar` se llama en cada aviso (o cada consulta de respaldo). Devuelve cómo dejar de escuchar. */
export function escucharSala(salaId: string, alCambiar: () => void, alEstado?: (e: EstadoRed) => void): () => void {
  let estado: EstadoRed = "conectando", cerrado = false;
  let reloj: ReturnType<typeof setInterval> | undefined;
  const fijar = (e: EstadoRed) => {
    if (cerrado || e === estado && reloj) return;
    estado = e; alEstado?.(e);
    clearInterval(reloj);
    reloj = setInterval(alCambiar, e === "vivo" ? LATIDO_MS : RESPALDO_MS);
  };
  fijar("conectando");
  const espera = setTimeout(() => { if (estado !== "vivo") fijar("respaldo"); }, ESPERA_VIVO_MS);
  if (!cliente) { fijar("respaldo"); return () => { cerrado = true; clearInterval(reloj); clearTimeout(espera); }; }
  let canal = cliente.channel(`sala-${salaId}`);
  for (const t of TABLAS) canal = canal.on("postgres_changes", { event: "*", schema: "public", table: t }, () => { if (!cerrado) alCambiar(); });
  canal.subscribe(s => {
    if (cerrado) return;
    if (s === "SUBSCRIBED") { fijar("vivo"); alCambiar(); }
    else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") fijar("respaldo");
  });
  const visible = () => { if (document.visibilityState === "visible") alCambiar(); };
  document.addEventListener("visibilitychange", visible);
  addEventListener("online", alCambiar);
  return () => {
    cerrado = true; clearInterval(reloj); clearTimeout(espera);
    document.removeEventListener("visibilitychange", visible);
    removeEventListener("online", alCambiar);
    void cliente?.removeChannel(canal);
  };
}
