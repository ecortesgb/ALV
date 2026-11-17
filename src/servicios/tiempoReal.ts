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

// ---------- ¿Está la Pantalla? (P-02) ----------
// No había ninguna señal de que la Pantalla esté viva (el latido de 12 s de arriba es la consulta de cada aparato, no de la Pantalla).
// Se usa la misma conexión de Realtime, sin tablas ni funciones nuevas: la Pantalla manda un latido por un canal de difusión
// (`pantalla-<sala>`, no se guarda) y los celulares avisan si pasan unos segundos sin oírlo.
// Se probó antes la presencia de Realtime y se descartó: si el canal está vacío cuando un celular entra, supabase-js 2.10 deja
// encolados los avisos de entrada y salida y el celular nunca se entera.
export type PresenciaPantalla = "desconocida" | "presente" | "ausente";
export const LATIDO_PANTALLA_MS = 1500, SILENCIO_PANTALLA_MS = 4000, REVISION_PANTALLA_MS = 500;

/** Lleva la cuenta del último latido: «ausente» solo si pasa el silencio sin oír la Pantalla (también al arrancar sin oírla). */
export function crearDetectorPantalla(alEstado: (p: PresenciaPantalla) => void, silencioMs = SILENCIO_PANTALLA_MS) {
  let actual: PresenciaPantalla = "desconocida", desde = Date.now(), ultimo = 0;
  const poner = (p: PresenciaPantalla) => { if (p !== actual) { actual = p; alEstado(p); } };
  return {
    /** Se oyó a la Pantalla. */
    latido() { ultimo = Date.now(); poner("presente"); },
    /** Llamar cada rato: da la Pantalla por ida si pasó el silencio. */
    revisar() { if (actual !== "ausente" && Date.now() - Math.max(ultimo, desde) > silencioMs) poner("ausente"); },
    /** Sin canal (error o cerrado): no se sabe, así que no se avisa. */
    perdido() { desde = Date.now(); ultimo = 0; poner("desconocida"); },
    estado: () => actual,
  };
}

/**
 * Vigila la Pantalla de una sala. Si `soyPantalla`, este aparato manda el latido mientras esté abierto.
 * Sin servidor (respaldo local) no hay canal: queda «desconocida» y no se avisa nada.
 */
export function vigilarPantalla(salaId: string, soyPantalla: boolean, alEstado: (p: PresenciaPantalla) => void): () => void {
  if (!cliente) return () => { /* nada */ };
  const det = crearDetectorPantalla(alEstado);
  let cerrado = false, reloj: ReturnType<typeof setInterval> | undefined;
  const canal = cliente.channel(`pantalla-${salaId}`);
  if (!soyPantalla) canal.on("broadcast", { event: "tv" }, () => { if (!cerrado) det.latido(); });
  const latir = () => { void canal.send({ type: "broadcast", event: "tv", payload: {} }); };
  canal.subscribe(s => {
    if (cerrado) return;
    clearInterval(reloj);
    if (s === "SUBSCRIBED") {
      if (soyPantalla) { latir(); reloj = setInterval(latir, LATIDO_PANTALLA_MS); }
      else { det.perdido(); reloj = setInterval(() => det.revisar(), REVISION_PANTALLA_MS); }
    } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") det.perdido();
  });
  return () => { cerrado = true; clearInterval(reloj); void cliente?.removeChannel(canal); };
}
