// Menú de gestos (ALV_PLAN_ANIMACIONES.md): Saludar, Ganar, Perder y Especial para tu figura.
// No sabe nada del 3D: le pide el gesto a la tienda global (app/animaciones.ts) y la tienda se lo pasa a las escenas
// y a la sala. Se usa en el HUB, el Perfil, el lobby y la mesa de juego.
import { useState, type CSSProperties } from "react";
import { PRIORIDAD, pedirGesto, useGesto, type Gesto } from "../../app/animaciones";
import { sonar } from "../../app/sonido";
import type { FiguraV2 } from "../../content/personaje";
import "./menu-gestos.css";

const BOTONES: { g: Gesto; txt: string; c1: string; c2: string }[] = [
  { g: "saludar", txt: "Saludar", c1: "#5ad1ff", c2: "#1d6fd6" },
  { g: "victoria", txt: "Ganar", c1: "#ffd84a", c2: "#e08a00" },
  { g: "derrota", txt: "Perder", c1: "#b9a7ff", c2: "#5a3fc0" },
  { g: "especial", txt: "Especial", c1: "#ff7ad9", c2: "#c21d8f" },
];

function Dibujo({ g }: { g: Gesto }) {
  // Trazos propios (el juego de íconos no trae mano ni calavera), en blanco con contorno oscuro.
  const comun = { fill: "#fff", stroke: "#1a1440", strokeWidth: 1.6, strokeLinejoin: "round" as const };
  if (g === "saludar") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...comun} d="M8 21c-2.6-1.6-4-4.2-4-7.2V8.4a1.4 1.4 0 0 1 2.8 0V12h.6V4.8a1.4 1.4 0 0 1 2.8 0V11h.6V3.6a1.4 1.4 0 0 1 2.8 0V11h.6V5a1.4 1.4 0 0 1 2.8 0v8.4c0 4.3-2.7 8.1-7 8.1-.7 0-1.4-.2-2-.5Z" /></svg>;
  if (g === "victoria") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...comun} d="M7 3h10v3h3.5c0 3.6-1.9 5.8-4.6 6.2A5 5 0 0 1 13 15v2.5h3V21H8v-3.5h3V15a5 5 0 0 1-2.9-2.8C5.4 11.8 3.5 9.6 3.5 6H7Z" /></svg>;
  if (g === "derrota") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...comun} d="M12 2.5c4.7 0 8 3.2 8 7.6 0 2.6-1.2 4.4-3 5.4V19a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19v-3.5c-1.8-1-3-2.8-3-5.4 0-4.4 3.3-7.6 8-7.6Z" /><circle cx="9" cy="11" r="1.9" fill="#1a1440" /><circle cx="15" cy="11" r="1.9" fill="#1a1440" /><path d="M10 20.4v-2.6M14 20.4v-2.6" stroke="#1a1440" strokeWidth="1.4" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...comun} d="M12 1.8 14.3 9.7 22.2 12 14.3 14.3 12 22.2 9.7 14.3 1.8 12 9.7 9.7Z" /><path {...comun} d="M19 2.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" /></svg>;
}

/** `plegable`: un solo botón que abre los cuatro (lobby y mesa en el teléfono); se cierra solo después de un gesto. */
export function MenuGestos({ jugador, figura, className, plegable }: { jugador: string; figura?: FiguraV2 | null; className?: string; plegable?: boolean }) {
  const est = useGesto(jugador);
  const [abierto, setAbierto] = useState(!plegable);
  // Cada toque reinicia la animación del botón (rebote si entró, temblor si no).
  const [toque, setToque] = useState<{ g: Gesto; ok: boolean; k: number } | null>(null);
  const tocar = (g: Gesto) => {
    const ok = pedirGesto(jugador, g, figura);
    sonar(ok ? (g === "especial" ? "poder" : "clic") : "tic");
    setToque(t => ({ g, ok, k: (t?.k ?? 0) + 1 }));
    if (ok && plegable) setTimeout(() => setAbierto(false), 450);
  };
  if (!abierto) return (
    <button type="button" className={"mg-abrir" + (est.gesto ? " suena" : "") + (className ? " " + className : "")} aria-expanded={false} onClick={() => { sonar("clic"); setAbierto(true); }}>
      <span className="mg-ico"><Dibujo g="especial" /></span><span className="mg-txt dsp">Gestos</span>
    </button>
  );
  return (
    <div className={"mg" + (plegable ? " mg-plegable" : "") + (className ? " " + className : "")} role="group" aria-label="Gestos de tu figura">
      {plegable && <button type="button" className="mg-cerrar" aria-label="Cerrar gestos" onClick={() => setAbierto(false)}>✕</button>}
      {BOTONES.map(b => {
        const suena = est.gesto === b.g;
        const bloqueado = !!est.gesto && !suena && PRIORIDAD[b.g] < est.prioridad;
        const t = toque?.g === b.g ? toque : null;
        return (
          <button key={b.g} type="button" aria-pressed={suena}
            className={"mg-b" + (suena ? " suena" : "") + (bloqueado ? " bloqueado" : "") + (t ? (t.ok ? " rebota" : " tiembla") : "")}
            data-k={t?.k} style={{ "--c1": b.c1, "--c2": b.c2 } as CSSProperties} onClick={() => tocar(b.g)}
            onAnimationEnd={() => setToque(x => (x?.g === b.g ? null : x))}>
            <span className="mg-ico"><Dibujo g={b.g} /></span>
            <span className="mg-txt dsp">{b.txt}</span>
          </button>
        );
      })}
    </div>
  );
}
