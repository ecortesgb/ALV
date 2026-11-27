// Rueda de gestos: aparece al tocar al personaje (referencia de Elías: menú radial de 4 gajos con la cabeza al centro).
// Semitransparente para no tapar la figura; abre con rebote y cada gajo entra uno tras otro. Se cierra al elegir, al
// tocar fuera o con Esc. Con teclado: flechas para moverse, Enter para elegir.
import React, { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import "./rueda-gestos.css";

export interface GestoRueda { cual: string; txt: string; c1: string; c2: string; dibujo: JSX.Element }

/** Gajo de anillo de a0 a a1 grados (0 = derecha, sentido del reloj en pantalla), radios r0 y r1. */
function gajo(a0: number, a1: number, r0: number, r1: number): string {
  const p = (a: number, r: number) => { const t = (a * Math.PI) / 180; return `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`; };
  const g = a1 - a0 > 180 ? 1 : 0;
  return `M ${p(a0, r1)} A ${r1} ${r1} 0 ${g} 1 ${p(a1, r1)} L ${p(a1, r0)} A ${r0} ${r0} 0 ${g} 0 ${p(a0, r0)} Z`;
}
const R0 = 36, R1 = 96, HUECO = 4;
/** Centro de cada gajo en grados: izquierda, arriba, derecha, abajo (como la referencia). */
const ANGULOS = [180, 270, 0, 90];

export function RuedaGestos({ gestos, x, y, centro, onElegir, onCerrar }: {
  /** 4 gestos en orden: izquierda, arriba, derecha, abajo. */
  gestos: GestoRueda[]; x: number; y: number; centro?: string | null;
  onElegir: (cual: string) => void;
  /** «elegir» o «tecla» (Esc): quien la abrió devuelve el foco al personaje; «fuera»: el foco se queda donde fue. */
  onCerrar: (motivo: "elegir" | "tecla" | "fuera") => void;
}) {
  const [sale, setSale] = useState<string | null>(null); // gesto elegido: animación de salida antes de cerrar
  const [foco, setFoco] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const botones = useRef<(SVGGElement | null)[]>([]);
  useEffect(() => { botones.current[0]?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) onCerrar("fuera"); };
    const tecla = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onCerrar("tecla"); };
    const t = setTimeout(() => addEventListener("pointerdown", fuera, true), 0);
    addEventListener("keydown", tecla);
    return () => { clearTimeout(t); removeEventListener("pointerdown", fuera, true); removeEventListener("keydown", tecla); };
  }, [onCerrar]);
  // Avisa la elección al momento (quien la usa decide cuándo empieza el gesto); late 100 ms y se cierra en 120 ms.
  const elegir = (cual: string) => { if (sale) return; setSale(cual); onElegir(cual); setTimeout(() => onCerrar("elegir"), 220); };
  // Si el foco sale de la rueda (Tab, Mayús+Tab), se cierra sin moverlo (Codex, cierre-r1).
  const salioFoco = (e: React.FocusEvent) => { if (!sale && !caja.current?.contains(e.relatedTarget as Node | null) && e.relatedTarget) onCerrar("fuera"); };
  const mover = (e: KeyboardEvent, i: number) => {
    const sig = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 }[e.key as "ArrowLeft"];
    if (sig !== undefined) { e.preventDefault(); setFoco(sig); botones.current[sig]?.focus(); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(gestos[i]!.cual); }
  };
  return (
    <div ref={caja} className={"rg" + (sale ? " rg-sale" : "")} style={{ left: x, top: y }} role="menu" aria-label="Animaciones de tu personaje" onBlur={salioFoco}>
      <span className="rg-vidrio" aria-hidden="true" />
      <svg viewBox="-100 -100 200 200" className="rg-svg">
        {gestos.slice(0, 4).map((g, i) => {
          const a = ANGULOS[i]!, d = gajo(a - 45 + HUECO / 2, a + 45 - HUECO / 2, R0, R1);
          const t = (a * Math.PI) / 180, cx = 66 * Math.cos(t), cy = 66 * Math.sin(t);
          return (
            <g key={g.cual} ref={el => { botones.current[i] = el; }} className={"rg-gajo" + (sale === g.cual ? " on" : "")} role="menuitem" tabIndex={foco === i ? 0 : -1}
              aria-label={g.txt} onClick={() => elegir(g.cual)} onKeyDown={e => mover(e, i)}
              style={{ "--c1": g.c1, "--c2": g.c2, "--i": i, "--dx": `${(Math.cos(t) * 6).toFixed(1)}px`, "--dy": `${(Math.sin(t) * 6).toFixed(1)}px` } as CSSProperties}>
              <path d={d} className="rg-forma" />
              <svg x={cx - 15} y={cy - 24} width="30" height="30" viewBox="0 0 24 24" className="rg-ico" aria-hidden="true">{g.dibujo}</svg>
              <text x={cx} y={cy + 19} className="rg-txt">{g.txt}</text>
            </g>
          );
        })}
        <circle r={R0 - 4} className="rg-centro" />
        {centro && <image href={centro} x={-24} y={-24} width={48} height={48} className="rg-cara" />}
      </svg>
    </div>
  );
}

// Mismos trazos que el menú de gestos del HUB (pantallas/gestos/MenuGestos.tsx).
export function TrazosGesto({ cual }: { cual: string }) {
  const c = { fill: "#fff", stroke: "#1a1440", strokeWidth: 1.6, strokeLinejoin: "round" as const };
  if (cual === "saludar") return <path {...c} d="M8 21c-2.6-1.6-4-4.2-4-7.2V8.4a1.4 1.4 0 0 1 2.8 0V12h.6V4.8a1.4 1.4 0 0 1 2.8 0V11h.6V3.6a1.4 1.4 0 0 1 2.8 0V11h.6V5a1.4 1.4 0 0 1 2.8 0v8.4c0 4.3-2.7 8.1-7 8.1-.7 0-1.4-.2-2-.5Z" />;
  if (cual === "victoria") return <path {...c} d="M7 3h10v3h3.5c0 3.6-1.9 5.8-4.6 6.2A5 5 0 0 1 13 15v2.5h3V21H8v-3.5h3V15a5 5 0 0 1-2.9-2.8C5.4 11.8 3.5 9.6 3.5 6H7Z" />;
  if (cual === "derrota") return <><path {...c} d="M12 2.5c4.7 0 8 3.2 8 7.6 0 2.6-1.2 4.4-3 5.4V19a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19v-3.5c-1.8-1-3-2.8-3-5.4 0-4.4 3.3-7.6 8-7.6Z" /><circle cx="9" cy="11" r="1.9" fill="#1a1440" /><circle cx="15" cy="11" r="1.9" fill="#1a1440" /><path d="M10 20.4v-2.6M14 20.4v-2.6" stroke="#1a1440" strokeWidth="1.4" /></>;
  return <><path {...c} d="M12 1.8 14.3 9.7 22.2 12 14.3 14.3 12 22.2 9.7 14.3 1.8 12 9.7 9.7Z" /><path {...c} d="M19 2.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" /></>;
}
/** Rueda que sale al tocar al personaje (referencia de Elías: distribución y colores): izquierda, arriba, derecha, abajo.
 *  Nombres como en el HUB (decidió Codex, encargo 2026-11-26-rueda-gestos-r1, E3). */
export const RUEDA: GestoRueda[] = [
  { cual: "saludar", txt: "Saludar", c1: "#9be04a", c2: "#4fa81f", dibujo: <TrazosGesto cual="saludar" /> },
  { cual: "victoria", txt: "Ganar", c1: "#ffd84a", c2: "#e0a400", dibujo: <TrazosGesto cual="victoria" /> },
  { cual: "especial", txt: "Especial", c1: "#ff9a3a", c2: "#e8560f", dibujo: <TrazosGesto cual="especial" /> },
  { cual: "derrota", txt: "Perder", c1: "#4f86e8", c2: "#1f4fb0", dibujo: <TrazosGesto cual="derrota" /> },
];
