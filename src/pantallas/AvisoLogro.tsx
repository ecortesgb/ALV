// Aviso de logro estilo consola, adaptado a ALV (ALV_PLAN_RANKING_LOGROS.md §5; Maestro v1.54).
// Una cápsula entra, se abre, muestra la insignia, «Logro desbloqueado», el nombre y la recompensa, y se va sola.
// Nunca muestra XP en un logro (D0). Uno a la vez, en cola; si llegan más de 4 juntos, los 3 más raros y «+N más».
// Celular: arriba al centro. Computadora: abajo al centro. Con menos movimiento solo aparece y se desvanece.
// Fuentes: (1) el servidor (mis_logros_nuevos) al subir la XP, al cambiar de pantalla y cada minuto en la sala;
// (2) el evento `alv-logro` (pruebas y otras pantallas). Espera a que se cierre la pantalla de Recompensas.
// Para probarlo sin nube: dispatchEvent(new CustomEvent("alv-logro", { detail: [{ clave: "detective", nombre: "Detective", rareza: "comun" }] }))
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ir } from "../app/rutas";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { ORDEN_RAREZA, RAREZA_TEXTO, type Rareza } from "../content/logros";
import { logrosNuevos } from "../servicios/logros";
import { Insignia } from "./logros/Logros";
import "./logros/logros.css";
import "./aviso-logro.css";

export interface AvisoItem {
  tipo?: "logro" | "reto" | "nivel" | "mas";
  clave?: string; nombre: string; rareza?: Rareza; recompensa?: string | null; quien?: string; oculto?: boolean;
}
const ESPERA = 400;
const dura = (a: AvisoItem) => (a.rareza === "legendaria" ? 5500 : 4500);

/** Si llegan más de 4 juntos: los 3 más raros y uno que dice cuántos faltan. */
export function armarCola(nuevos: AvisoItem[]): AvisoItem[] {
  if (nuevos.length <= 4) return nuevos;
  const orden = [...nuevos].sort((a, b) => ORDEN_RAREZA[b.rareza ?? "comun"] - ORDEN_RAREZA[a.rareza ?? "comun"]);
  return [...orden.slice(0, 3), { tipo: "mas", nombre: `+${nuevos.length - 3} logros más` }];
}

const hayRecompensas = () => !!document.querySelector(".rw");

export function AvisoLogro() {
  const s = useSesion();
  const [actual, setActual] = useState<AvisoItem | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const cola = useRef<AvisoItem[]>([]);
  const ocupado = useRef(false);
  const ultimaXp = useRef(s.acumulada);
  const ultimaLectura = useRef(0);

  const siguiente = () => {
    if (ocupado.current) return;
    if (!cola.current.length) return;
    if (hayRecompensas()) { setTimeout(siguiente, 600); return; }
    const a = cola.current.shift()!;
    ocupado.current = true;
    setSaliendo(false);
    setActual(a);
    if (a.tipo !== "mas") sonar(a.rareza === "legendaria" ? "logroLegendario" : "logro");
    setTimeout(() => setSaliendo(true), dura(a));
    setTimeout(() => { setActual(null); ocupado.current = false; setTimeout(siguiente, ESPERA); }, dura(a) + 350);
  };
  const encolar = (nuevos: AvisoItem[]) => {
    if (!nuevos.length) return;
    cola.current.push(...armarCola(nuevos));
    siguiente();
  };

  // Evento de la propia app.
  useEffect(() => {
    const f = (e: Event) => {
      const d = (e as CustomEvent<AvisoItem | AvisoItem[]>).detail;
      encolar((Array.isArray(d) ? d : [d]).filter(x => x && typeof x.nombre === "string"));
    };
    addEventListener("alv-logro", f);
    return () => removeEventListener("alv-logro", f);
  }, []);

  // Servidor: al entrar, al subir la XP (terminó una partida), al cambiar de pantalla y cada minuto.
  useEffect(() => {
    if (s.fase !== "dentro" || s.invitado) return;
    const leer = (forzar = false) => {
      if (!forzar && Date.now() - ultimaLectura.current < 20000) return;
      ultimaLectura.current = Date.now();
      void logrosNuevos().then(ns => encolar(ns.map(n => ({ tipo: "logro", clave: n.clave, nombre: n.nombre, rareza: n.rareza, recompensa: n.recompensa, oculto: n.oculto }))));
    };
    leer(true);
    const alCambiar = () => leer();
    addEventListener("hashchange", alCambiar);
    const t = setInterval(() => { if (/^#\/(sala|tv|configurar)/.test(location.hash)) leer(true); }, 60000);
    return () => { removeEventListener("hashchange", alCambiar); clearInterval(t); };
  }, [s.fase, s.uid, s.invitado]);
  useEffect(() => {
    if (s.acumulada > ultimaXp.current && s.fase === "dentro") {
      // Un momento para que el servidor termine de guardar resultados y logros.
      const t = setTimeout(() => { ultimaLectura.current = Date.now(); void logrosNuevos().then(ns => encolar(ns.map(n => ({ tipo: "logro", clave: n.clave, nombre: n.nombre, rareza: n.rareza, recompensa: n.recompensa, oculto: n.oculto })))); }, 1500);
      ultimaXp.current = s.acumulada;
      return () => clearTimeout(t);
    }
    ultimaXp.current = s.acumulada;
  }, [s.acumulada]);

  // Deslizar para quitarlo.
  const inicio = useRef<number | null>(null);
  if (!actual) return null;
  const a = actual;
  const etiqueta = a.tipo === "mas" ? "Más logros" : a.tipo === "reto" ? "Reto completado" : a.tipo === "nivel" ? "¡Subiste de nivel!" : "Logro desbloqueado";
  const rareza = a.rareza ?? "comun";
  return createPortal(
    <div className={`D az al r-${rareza}` + (saliendo ? " sale" : "") + (a.oculto ? " oculto" : "")} role="status" aria-live="polite">
      <button type="button" className="al-capsula" onClick={() => { setSaliendo(true); ir("logros"); }}
        onPointerDown={e => { inicio.current = e.clientY; }}
        onPointerUp={e => { if (inicio.current != null && Math.abs(e.clientY - inicio.current) > 40) setSaliendo(true); inicio.current = null; }}
        aria-label={`${etiqueta}: ${a.nombre}${a.quien ? `, ${a.quien}` : ""}. Toca para ver tus logros.`}>
        <span className="al-circulo">
          <span className="al-anillo" aria-hidden="true" />
          {a.clave ? <Insignia l={{ clave: a.clave, rareza, ganado: "si" }} /> : <span className="al-mas" aria-hidden="true">★</span>}
        </span>
        <span className="al-texto">
          <small>{a.quien ? `${a.quien} · ` : ""}{etiqueta}</small>
          <b>{a.nombre}</b>
          {a.tipo !== "mas" && <em>{a.recompensa ?? `Insignia ${RAREZA_TEXTO[rareza].toLowerCase()}`}</em>}
        </span>
        <span className="al-brillo" aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
}
