// Piezas compartidas entre pantallas: colores por sección, configuración del grupo y aviso flotante.
import { useEffect, useState } from "react";
import { ESCENARIOS } from "../content/catalogo";
import type { Configuracion, SeccionId } from "../engine/types";
import { parejaDe, type EstadoLocal } from "./estado";

export const COLOR_SECCION: Record<SeccionId, string> = {
  mix: "#2EE6B5", ptm: "#FF2E88", hdspm: "#FF7A2E", qpm: "#22E1FF", gdlv: "#FFC23D", parejas: "#A77BFF", ntp: "#FF4D5E", pvt: "#C6FF3D",
};
export const INTENSIDADES = ["", "Tranquilo", "Picante", "Sin filtro", "Salvaje"] as const;
export const NOMBRE_CARTA_PODER: Record<string, string> = {
  escudo: "Escudo", salvavidas: "Salvavidas", relevo: "Relevo", "doble-castigo": "Doble castigo", cambio: "Cambio de pregunta", turno: "Pasa turno", mesero: "Cambio de mesero",
};

/** Configuración del motor a partir del grupo y los ajustes guardados. */
export function configuracion(s: EstadoLocal): Configuracion {
  const esc = ESCENARIOS.find(e => e.id === s.ajustes.escenario && e.activo) ?? ESCENARIOS[0]!;
  return {
    jugadores: s.jugadores.map((j, i) => ({ id: j.id, nombre: j.nombre || `Jugador ${i + 1}`, parejaDe: parejaDe(i, s) })),
    lugar: esc.lugar, escenario: esc.id, intensidad: s.ajustes.intensidad, dificultad: 1,
    adulto: s.ajustes.adulto, drunk: s.ajustes.drunk,
  };
}

let avisar: (t: string) => void = () => {};
export const aviso = (t: string) => avisar(t);
export function Avisos() {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    let tm: ReturnType<typeof setTimeout>;
    avisar = x => { setT(x); clearTimeout(tm); tm = setTimeout(() => setT(null), 2600); };
    return () => clearTimeout(tm);
  }, []);
  return t ? <div className="toast" role="status">{t}</div> : null;
}

export const Icono = {
  inicio: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  juegos: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="5" width="12" height="16" rx="2" /><path d="M9 3h10a2 2 0 0 1 2 2v12" /></svg>,
  grupo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 20c0-2.5 1.5-4.5 4-4.5" /></svg>,
  historial: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  perfil: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
  estrella: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C6FF3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z" /></svg>,
};
