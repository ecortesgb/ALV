// Rueda de gestos: aparece al tocar al personaje (referencia de Elías: menú radial de 4 gajos con la cabeza al centro;
// 2ª referencia, 26 nov: anillo de vidrio gris casi transparente, íconos blancos y el nombre del gesto al centro).
// Chica y semitransparente para no tapar la figura; el gajo señalado toma su color. Abre con rebote. Se cierra al elegir, al
// tocar fuera o con Esc. Con teclado: flechas para moverse, Enter para elegir.
import React, { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { LogoALV } from "../Logo";
import "./rueda-gestos.css";

export interface GestoRueda { cual: string; txt: string; c1: string; c2: string; dibujo: JSX.Element;
  /** Ícono ilustrado (PNG/WebP con fondo transparente); si no carga o no hay, se dibuja `dibujo`. */ img?: string }

/** Gajo de anillo de a0 a a1 grados (0 = derecha, sentido del reloj en pantalla), radios r0 y r1. */
function gajo(a0: number, a1: number, r0: number, r1: number): string {
  const p = (a: number, r: number) => { const t = (a * Math.PI) / 180; return `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`; };
  const g = a1 - a0 > 180 ? 1 : 0;
  return `M ${p(a0, r1)} A ${r1} ${r1} 0 ${g} 1 ${p(a1, r1)} L ${p(a1, r0)} A ${r0} ${r0} 0 ${g} 0 ${p(a0, r0)} Z`;
}
const R0 = 34, R1 = 96, HUECO = 3;
/** Centro de cada gajo en grados: izquierda, arriba, derecha, abajo (como la referencia). */
const ANGULOS = [180, 270, 0, 90];
/** Con «Transformar» (5 gajos): los 4 de siempre corridos hacia arriba y el quinto abajo. */
const ANGULOS_5 = [198, 270, 342, 54, 126];
const angulos = (n: number) => (n >= 5 ? ANGULOS_5 : ANGULOS);
/** Íconos ilustrados que no cargaron (se usa el dibujo de respaldo). */
const sinImg = new Set<string>();
const ICONOS = `${import.meta.env.BASE_URL}arte/ui/gestos/`;

export function RuedaGestos({ gestos, x, y, centro, onElegir, onCerrar }: {
  /** 4 gestos en orden: izquierda, arriba, derecha, abajo (o 5: el quinto, «Transformar», abajo). */
  gestos: GestoRueda[]; x: number; y: number; centro?: string | null;
  onElegir: (cual: string) => void;
  /** «elegir» o «tecla» (Esc): quien la abrió devuelve el foco al personaje; «fuera»: el foco se queda donde fue. */
  onCerrar: (motivo: "elegir" | "tecla" | "fuera") => void;
}) {
  const [sale, setSale] = useState<string | null>(null); // gesto elegido: animación de salida antes de cerrar
  const [foco, setFoco] = useState(0);
  // Gesto señalado (cursor, foco o elegido): su nombre sale al centro, como la referencia.
  const [senal, setSenal] = useState<string | null>(null);
  const [, forzar] = useState(0);
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
    const n = Math.min(5, gestos.length);
    const sig = n === 4 ? { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 }[e.key as "ArrowLeft"]
      : e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i + n - 1) % n : undefined;
    if (sig !== undefined) { e.preventDefault(); setFoco(sig); setSenal(gestos[sig]?.cual ?? null); botones.current[sig]?.focus(); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(gestos[i]!.cual); }
  };
  const nombre = gestos.find(g => g.cual === (sale ?? senal))?.txt;
  return (
    <div ref={caja} className={"rg" + (sale ? " rg-sale" : "")} style={{ left: x, top: y }} role="menu" aria-label="Animaciones de tu personaje" onBlur={salioFoco}>
      <span className="rg-vidrio" aria-hidden="true" />
      <svg viewBox="-100 -100 200 200" className="rg-svg">
        {gestos.slice(0, 5).map((g, i, todos) => {
          const ang = angulos(todos.length), medio = 180 / ang.length;
          const a = ang[i]!, d = gajo(a - medio + HUECO / 2, a + medio - HUECO / 2, R0, R1);
          const t = (a * Math.PI) / 180, cx = 66 * Math.cos(t), cy = 66 * Math.sin(t);
          return (
            <g key={g.cual} ref={el => { botones.current[i] = el; }} className={"rg-gajo" + (sale === g.cual ? " on" : "")} role="menuitem" tabIndex={foco === i ? 0 : -1}
              aria-label={g.txt} onClick={() => elegir(g.cual)} onKeyDown={e => mover(e, i)}
              onPointerEnter={() => setSenal(g.cual)} onPointerLeave={() => setSenal(x => (x === g.cual ? null : x))}
              style={{ "--c1": g.c1, "--c2": g.c2, "--i": i, "--dx": `${(Math.cos(t) * 6).toFixed(1)}px`, "--dy": `${(Math.sin(t) * 6).toFixed(1)}px` } as CSSProperties}>
              <path d={d} className="rg-forma" />
              {g.img && !sinImg.has(g.img)
                ? <image href={g.img} x={cx - 29} y={cy - 29} width={58} height={58} className="rg-img" onError={() => { sinImg.add(g.img!); forzar(n => n + 1); }} />
                : <svg x={cx - 20} y={cy - 20} width="40" height="40" viewBox="0 0 24 24" className="rg-ico" aria-hidden="true">{g.dibujo}</svg>}
            </g>
          );
        })}
        <circle r={R0 - 3} className="rg-centro" />
        {nombre ? <text y={6} className="rg-nombre">{nombre}</text>
          : centro && <image href={centro} x={-27} y={-27} width={54} height={54} className="rg-cara" />}
      </svg>
      {/* Sin imagen de centro: el logo ALV completo, con su estallido y la cinta (Elías, 26 nov). */}
      {!centro && !nombre && <span className="rg-logo" aria-hidden="true"><LogoALV ruleta={false} /></span>}
    </div>
  );
}

// Íconos propios de ALV (Elías, 26 nov: «más originales, no genéricos»): la silueta de una minifigura haciendo cada
// gesto, como la referencia del menú radial (una persona saludando). Se arma con piezas: perno, cabeza, torso, brazos
// con mano de pinza, cadera y piernas; cada pose solo gira brazos, cabeza y piernas. Viewbox 24 × 24.
interface Pose { bi: number; bd: number; cabeza?: number; baja?: number; pi?: number; pd?: number; extra?: JSX.Element }
const TINTA = "#1a1440";
function Minifig({ bi, bd, cabeza = 0, baja = 0, pi = 0, pd = 0, extra }: Pose) {
  const c = { fill: "#fff", stroke: TINTA, strokeWidth: 0.9, strokeLinejoin: "round" as const, paintOrder: "stroke" as const };
  // Brazo con su mano de pinza: nace en el hombro y apunta hacia abajo; `a` lo gira (sentido del reloj, en grados).
  const brazo = (x: number, a: number) => (
    <g transform={`translate(${x} 8.3) rotate(${a})`}>
      <rect {...c} x={-1.05} y={-0.6} width={2.1} height={5} rx={1} />
      <path {...c} d="M-1.3 4.6a1.3 1.3 0 1 0 2.6 0" fill="none" strokeWidth={1.7} stroke="#fff" />
    </g>
  );
  const pierna = (x: number, a: number) => <rect {...c} x={x} y={15.2} width={4.6} height={6.6} rx={0.6} transform={`rotate(${a} ${x + 2.3} 15.2)`} />;
  return (
    <g>
      {pierna(7.1, pi)}{pierna(12.3, pd)}
      {brazo(7.6, bi)}{brazo(16.4, bd)}
      <path {...c} d="M8 7.3h8l.9 6.5H7.1Z" />
      <rect {...c} x={7} y={13.6} width={10} height={1.9} rx={0.4} />
      <g transform={`translate(0 ${baja}) rotate(${cabeza} 12 6.6)`}>
        <rect {...c} x={10.9} y={0.9} width={2.2} height={1.3} rx={0.3} />
        <rect {...c} x={9.1} y={1.9} width={5.8} height={4.9} rx={1.7} />
      </g>
      {extra}
    </g>
  );
}
const trazo = { fill: "none", stroke: "#fff", strokeWidth: 1.1, strokeLinecap: "round" as const };
export function TrazosGesto({ cual }: { cual: string }) {
  // Saludar: un brazo arriba con dos rayitas de movimiento junto a la mano.
  if (cual === "saludar") return <Minifig bi={12} bd={-152} cabeza={-6} extra={<><path {...trazo} d="M20.6 1.4l1.4-.6M21.3 3.6l1.6.1" /></>} />;
  // Ganar: los dos brazos arriba, de brinco (piernas abiertas) y chispas.
  if (cual === "victoria") return <Minifig bi={148} bd={-148} pi={8} pd={-8} extra={<><path {...trazo} d="M2.2 4.2l1.3.8M1.6 7.4h1.5M21.8 4.2l-1.3.8M22.4 7.4h-1.5" /></>} />;
  // Perder: cabeza abajo, brazos colgados y una gota de sudor.
  if (cual === "derrota") return <Minifig bi={4} bd={-4} cabeza={14} baja={0.9} extra={<path fill="#fff" stroke={TINTA} strokeWidth={0.7} d="M18.4 2.2c.9 1.3 1.4 2.1 1.4 2.8a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.5 1.4-2.8Z" />} />;
  // Transformar: la figura entre dos flechas que dan la vuelta (cambia de forma).
  if (cual === "transformar") return <Minifig bi={20} bd={-20} extra={<><path {...trazo} d="M3.4 9.2a8.6 8.6 0 0 1 4-6.4M2.4 5.4l1 3.9 3.6-1.6" /><path {...trazo} d="M20.6 14.8a8.6 8.6 0 0 1-4 6.4M21.6 18.6l-1-3.9-3.6 1.6" /></>} />;
  // Especial: golpe al frente con un rayo saliendo del puño.
  return <Minifig bi={58} bd={-96} cabeza={-4} pi={6} pd={-4} extra={<path fill="#fff" stroke={TINTA} strokeWidth={0.7} strokeLinejoin="round" d="M21.2 5.2l2.4.2-1.6 2.3 1.6.1-3.2 3.6.9-2.6-1.5-.1Z" />} />;
}
/** Rueda que sale al tocar al personaje (referencia de Elías: distribución y colores): izquierda, arriba, derecha, abajo.
 *  Nombres como en el HUB (decidió Codex, encargo 2026-11-26-rueda-gestos-r1, E3). */
export const RUEDA: GestoRueda[] = [
  { cual: "saludar", txt: "Saludar", c1: "#9be04a", c2: "#4fa81f", dibujo: <TrazosGesto cual="saludar" />, img: `${ICONOS}gesto-saludar.webp` },
  { cual: "victoria", txt: "Ganar", c1: "#ffd84a", c2: "#e0a400", dibujo: <TrazosGesto cual="victoria" />, img: `${ICONOS}gesto-victoria.webp` },
  { cual: "especial", txt: "Especial", c1: "#ff9a3a", c2: "#e8560f", dibujo: <TrazosGesto cual="especial" />, img: `${ICONOS}gesto-especial.webp` },
  { cual: "derrota", txt: "Perder", c1: "#4f86e8", c2: "#1f4fb0", dibujo: <TrazosGesto cual="derrota" />, img: `${ICONOS}gesto-derrota.webp` },
];
/** Quinto gajo, solo en personajes que se transforman (Banner ↔ Hulk, Tony / Iron Man, Peter ↔ Spider-Man; Elías, 27 nov). */
export const GAJO_TRANSFORMAR: GestoRueda = { cual: "transformar", txt: "Transformar", c1: "#c77dff", c2: "#7b2cbf", dibujo: <TrazosGesto cual="transformar" /> };
