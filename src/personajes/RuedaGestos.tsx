// Rueda de gestos: aparece al tocar al personaje (referencia de Elías: menú radial de 4 gajos con la cabeza al centro).
// Semitransparente para no tapar la figura; abre con rebote y cada gajo entra uno tras otro. Se cierra al elegir, al
// tocar fuera o con Esc. Con teclado: flechas para moverse, Enter para elegir.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
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
  onElegir: (cual: string) => void; onCerrar: () => void;
}) {
  const [sale, setSale] = useState<string | null>(null); // gesto elegido: animación de salida antes de cerrar
  const [foco, setFoco] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const botones = useRef<(SVGGElement | null)[]>([]);
  useEffect(() => { botones.current[0]?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) onCerrar(); };
    const tecla = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    const t = setTimeout(() => addEventListener("pointerdown", fuera, true), 0);
    addEventListener("keydown", tecla);
    return () => { clearTimeout(t); removeEventListener("pointerdown", fuera, true); removeEventListener("keydown", tecla); };
  }, [onCerrar]);
  // Avisa la elección al momento (quien la usa decide cuándo empieza el gesto); late 100 ms y se cierra en 120 ms.
  const elegir = (cual: string) => { if (sale) return; setSale(cual); onElegir(cual); setTimeout(onCerrar, 220); };
  const mover = (e: KeyboardEvent, i: number) => {
    const sig = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 }[e.key as "ArrowLeft"];
    if (sig !== undefined) { e.preventDefault(); setFoco(sig); botones.current[sig]?.focus(); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(gestos[i]!.cual); }
  };
  return (
    <div ref={caja} className={"rg" + (sale ? " rg-sale" : "")} style={{ left: x, top: y }} role="menu" aria-label="Animaciones de tu personaje">
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
