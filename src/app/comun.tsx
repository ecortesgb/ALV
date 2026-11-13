// Piezas compartidas entre pantallas: colores por sección, configuración del grupo, aviso flotante,
// confirmaciones con el diseño de la app y botón de sonido.
import { useEffect, useRef, useState } from "react";
import { ESCENARIOS } from "../content/catalogo";
import type { Configuracion, SeccionId } from "../engine/types";
import { parejaDe, type EstadoLocal } from "./estado";
import { alternarSonido, useSonidoActivo } from "./sonido";

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

/** Pregunta de sí o no con el diseño de la app. Sustituye al `confirm()` del navegador. */
export interface Pregunta { titulo: string; texto?: string; si: string; no: string; peligro?: boolean }
let preguntar: (p: Pregunta) => Promise<boolean> = () => Promise.resolve(false);
export const confirmar = (p: Pregunta) => preguntar(p);
export function Confirmaciones() {
  const [p, setP] = useState<Pregunta | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    preguntar = x => new Promise<boolean>(r => { resolver.current(false); resolver.current = r; setP(x); });
    return () => { preguntar = () => Promise.resolve(false); };
  }, []);
  useEffect(() => { if (p && dlg.current && !dlg.current.open) dlg.current.showModal(); }, [p]);
  const cerrar = (v: boolean) => { resolver.current(v); resolver.current = () => {}; setP(null); };
  if (!p) return null;
  return (
    <dialog ref={dlg} className="modal" aria-labelledby="modal-titulo" onCancel={e => { e.preventDefault(); cerrar(false); }}
      onClick={e => { if (e.target === dlg.current) cerrar(false); }}>
      <div className="modal-caja">
        <h2 id="modal-titulo">{p.titulo}</h2>
        {p.texto && <p className="hint">{p.texto}</p>}
        <div className="modal-botones">
          <button className="btn" autoFocus onClick={() => cerrar(false)}>{p.no}</button>
          <button className={"btn " + (p.peligro ? "peligro" : "lime")} onClick={() => cerrar(true)}>{p.si}</button>
        </div>
      </div>
    </dialog>
  );
}

/** Botón flotante para silenciar o activar los efectos de sonido. */
export function BotonSonido() {
  const activo = useSonidoActivo();
  return (
    <button className="sonido" data-sin-clic aria-pressed={activo} aria-label={activo ? "Silenciar sonido" : "Activar sonido"} title={activo ? "Sonido activado" : "Sonido silenciado"} onClick={alternarSonido}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9z" />
        {activo ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
      </svg>
    </button>
  );
}

/** Pantalla completa para la laptop o el proyector. Se oculta si el navegador no la permite (iPhone). */
export function BotonPantallaCompleta() {
  const [activa, setActiva] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  useEffect(() => {
    const f = () => setActiva(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  if (typeof document === "undefined" || !document.fullscreenEnabled) return null;
  const alternar = () => { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}); };
  return (
    <button className="sonido" aria-pressed={activa} aria-label={activa ? "Salir de pantalla completa" : "Pantalla completa"} title={activa ? "Salir de pantalla completa" : "Pantalla completa (laptop o proyector)"} onClick={alternar}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {activa ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
      </svg>
    </button>
  );
}

export const Icono = {
  inicio: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  juegos: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="5" width="12" height="16" rx="2" /><path d="M9 3h10a2 2 0 0 1 2 2v12" /></svg>,
  grupo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 20c0-2.5 1.5-4.5 4-4.5" /></svg>,
  lobby: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="7" cy="9" r="2.6" /><circle cx="17" cy="9" r="2.6" /><circle cx="12" cy="7.5" r="3" /><path d="M2.5 19c.4-3 2.2-4.8 4.5-4.8M21.5 19c-.4-3-2.2-4.8-4.5-4.8M6.5 20c.6-3.6 2.8-5.6 5.5-5.6s4.9 2 5.5 5.6" /></svg>,
  tienda: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M8.5 7V5.5a3.5 3.5 0 0 1 7 0V7M4 11h16" /></svg>,
  ranking: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M3 20h18M5 20v-6h4v6M10 20V9h4v11M15 20v-8h4v8" /><path d="M12 3l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 5.1l2-.3z" /></svg>,
  historial: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  ajustes: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  perfil: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
  estrella: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C6FF3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z" /></svg>,
};
