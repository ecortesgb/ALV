// Rueda de gestos: aparece al tocar al personaje (referencia de Elías: menú radial de 4 gajos con la cabeza al centro;
// 2ª referencia, 26 nov: anillo de vidrio gris casi transparente, íconos blancos y el nombre del gesto al centro).
// Chica y semitransparente para no tapar la figura; el gajo señalado toma su color. Abre con rebote. Se cierra al elegir, al
// tocar fuera o con Esc. Con teclado: flechas para moverse, Enter para elegir.
import React, { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { LogoALV } from "../Logo";
import type { Categoria, Opcion, TipoIcono } from "./categorias";
import { NOMBRE_CATEGORIA } from "./categorias";
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
/** Cualquier otro número (poderes): repartidos desde arriba; con 2, izquierda y derecha. Con 4 y 5 da los mismos de arriba. */
const angulos = (n: number) => (n === 4 ? ANGULOS : n === 5 ? ANGULOS_5 : n === 2 ? [180, 0] : Array.from({ length: n }, (_, i) => (270 + ((i - 1) * 360) / n + 360) % 360));
/** Íconos ilustrados que no cargaron (se usa el dibujo de respaldo). */
const sinImg = new Set<string>();
const ICONOS = `${import.meta.env.BASE_URL}arte/ui/gestos/`;

export function RuedaGestos({ gestos, x, y, centro, boton, fija, grande, onElegir, onCerrar }: {
  /** 4 gestos en orden: izquierda, arriba, derecha, abajo (o 5: el quinto, «Transformar», abajo). */
  gestos: GestoRueda[]; x: number; y: number; centro?: string | null;
  /** El centro como botón (Transformar en el círculo principal, Volver en los demás): se elige como un gajo. */
  boton?: GestoRueda | null;
  /** Siempre abierta (personalizador): no se cierra al elegir ni al tocar fuera, y no toma el foco al salir. */
  fija?: boolean;
  /** Círculo más grande (6 categorías o 8 movimientos). */
  grande?: boolean;
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
  useEffect(() => { if (!fija) botones.current[0]?.focus({ preventScroll: true }); }, [fija]);
  useEffect(() => {
    if (fija) return;
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) onCerrar("fuera"); };
    const tecla = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onCerrar("tecla"); };
    const t = setTimeout(() => addEventListener("pointerdown", fuera, true), 0);
    addEventListener("keydown", tecla);
    return () => { clearTimeout(t); removeEventListener("pointerdown", fuera, true); removeEventListener("keydown", tecla); };
  }, [onCerrar, fija]);
  // Avisa la elección al momento (quien la usa decide cuándo empieza el gesto); late 100 ms y se cierra en 120 ms.
  const elegir = (cual: string) => {
    if (fija) { setSale(cual); onElegir(cual); setTimeout(() => setSale(null), 220); return; }
    if (sale) return; setSale(cual); onElegir(cual); setTimeout(() => onCerrar("elegir"), 220);
  };
  // Si el foco sale de la rueda (Tab, Mayús+Tab), se cierra sin moverlo (Codex, cierre-r1).
  const salioFoco = (e: React.FocusEvent) => { if (!fija && !sale && !caja.current?.contains(e.relatedTarget as Node | null) && e.relatedTarget) onCerrar("fuera"); };
  const mover = (e: KeyboardEvent, i: number) => {
    const n = Math.min(8, gestos.length);
    const sig = n === 4 ? { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 }[e.key as "ArrowLeft"]
      : e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i + n - 1) % n : undefined;
    if (sig !== undefined) { e.preventDefault(); setFoco(sig); setSenal(gestos[sig]?.cual ?? null); botones.current[sig]?.focus(); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(gestos[i]!.cual); }
  };
  const nombre = (gestos.find(g => g.cual === (sale ?? senal)) ?? (boton && boton.cual === (sale ?? senal) ? boton : undefined))?.txt;
  return (
    <div ref={caja} className={"rg" + (sale && !fija ? " rg-sale" : "") + (fija ? " rg-fija" : "") + (grande ? " rg-grande" : "")} style={{ left: x, top: y }} role="menu" aria-label="Animaciones de tu personaje" onBlur={salioFoco}>
      <span className="rg-vidrio" aria-hidden="true" />
      <svg viewBox="-100 -100 200 200" className="rg-svg">
        {gestos.slice(0, 8).map((g, i, todos) => {
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
        {boton
          ? <g className={"rg-gajo rg-boton" + (sale === boton.cual ? " on" : "")} role="menuitem" tabIndex={-1} aria-label={boton.txt} onClick={() => elegir(boton.cual)}
              onPointerEnter={() => setSenal(boton.cual)} onPointerLeave={() => setSenal(x => (x === boton.cual ? null : x))}
              style={{ "--c1": boton.c1, "--c2": boton.c2, "--i": 0, "--dx": "0px", "--dy": "0px" } as CSSProperties}>
              <circle r={R0 - 3} className="rg-centro" />
              {nombre ? <NombreCentro txt={nombre} />
                : boton.img && !sinImg.has(boton.img)
                  ? <image href={boton.img} x={-27} y={-27} width={54} height={54} className="rg-img" onError={() => { sinImg.add(boton.img!); forzar(n => n + 1); }} />
                  : <svg x={-17} y={-17} width="34" height="34" viewBox="0 0 24 24" className="rg-ico" aria-hidden="true">{boton.dibujo}</svg>}
            </g>
          : <circle r={R0 - 3} className="rg-centro" />}
        {!boton && (nombre ? <NombreCentro txt={nombre} />
          : centro && <image href={centro} x={-27} y={-27} width={54} height={54} className="rg-cara" />)}
      </svg>
      {/* Sin imagen de centro: el logo ALV completo, con su estallido y la cinta (Elías, 26 nov). */}
      {!centro && !nombre && !boton && <span className="rg-logo" aria-hidden="true"><LogoALV ruleta={false} /></span>}
    </div>
  );
}

/** Nombre al centro; los largos («Volverse invisible») en dos renglones y más chicos para caber en el círculo. */
function NombreCentro({ txt }: { txt: string }) {
  if (txt.length <= 9) return <text y={6} className="rg-nombre">{txt}</text>;
  const p = txt.split(" ");
  let mejor = [txt, ""], dif = Infinity;
  for (let i = 1; i < p.length; i++) { const a = p.slice(0, i).join(" "), b = p.slice(i).join(" "), d = Math.abs(a.length - b.length); if (d < dif) { dif = d; mejor = [a, b]; } }
  const largo = Math.max(mejor[0]!.length, mejor[1]!.length), tam = largo > 9 ? 8.5 : 10;
  return mejor[1] ? <text y={-1} className="rg-nombre" style={{ fontSize: tam }}><tspan x={0}>{mejor[0]}</tspan><tspan x={0} dy={tam + 1}>{mejor[1]}</tspan></text>
    : <text y={4} className="rg-nombre" style={{ fontSize: tam }}>{txt}</text>;
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
  // Poderes: brazos al frente y una estrella de energía.
  if (cual === "poderes" || cual.startsWith("poder:")) return <Minifig bi={70} bd={-70} cabeza={-4} extra={<path fill="#fff" stroke={TINTA} strokeWidth={0.7} strokeLinejoin="round" d="M12 .3l1 2.2 2.4.2-1.8 1.6.6 2.3L12 5.4 9.8 6.6l.6-2.3L8.6 2.7l2.4-.2Z" />} />;
  // Movimientos: una pierna arriba y los brazos abiertos (baile), con dos notas.
  if (cual === "movimientos" || cual.startsWith("mov:")) return <Minifig bi={110} bd={-40} pi={30} pd={-4} extra={<><path {...trazo} d="M2.4 3.2v3.4M2.4 3.2l2.2-.6v3" /><circle cx={1.8} cy={6.8} r={0.7} fill="#fff" stroke={TINTA} strokeWidth={0.6} /></>} />;
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
export const GAJO_PODERES: GestoRueda = { cual: "poderes", txt: "Poderes", c1: "#4fd8ff", c2: "#1479c9", dibujo: <TrazosGesto cual="poderes" />, img: `${ICONOS}gesto-poderes.webp` };
const COLORES_PODER: [string, string][] = [["#4fd8ff", "#1479c9"], ["#ff7a59", "#d0341a"], ["#b7f04a", "#4f9f12"], ["#ffd84a", "#e0a400"]];
/** Un gajo por poder del personaje (segunda rueda de «Poderes»). */
export const gajosPoder = (lista: { id: string; nombre: string }[]): GestoRueda[] => lista.slice(0, 8).map((p, i) => {
  const [c1, c2] = COLORES_PODER[i % COLORES_PODER.length]!;
  return { cual: "poder:" + p.id, txt: p.nombre, c1, c2, dibujo: <TrazosGesto cual="poder:" /> };
});
// Íconos de Elías (27 nov): «Acción» abre los sets de movimientos; Golpear y Patada son atajos de la Pelea que tienen todos.
export const GAJO_MOVIMIENTOS: GestoRueda = { cual: "movimientos", txt: "Acción", c1: "#ffb347", c2: "#e06a00", dibujo: <TrazosGesto cual="movimientos" />, img: `${ICONOS}gesto-accion.webp` };
export const GAJO_GOLPEAR: GestoRueda = { cual: "mov:pelea-golpe1", txt: "Golpear", c1: "#ff7a59", c2: "#d0341a", dibujo: <TrazosGesto cual="mov:" />, img: `${ICONOS}gesto-golpear.webp` };
export const GAJO_PATADA: GestoRueda = { cual: "mov:pelea-golpe2", txt: "Patada", c1: "#c8b6ff", c2: "#6f4fd6", dibujo: <TrazosGesto cual="mov:" />, img: `${ICONOS}gesto-patada.webp` };
/** Ícono propio de un set en la rueda de «Acción» (Volar). */
const IMG_SET: Record<string, string> = { vuelo: `${ICONOS}gesto-volar.webp` };
const COLORES_MOV: [string, string][] = [["#ffb347", "#e06a00"], ["#ff8fd8", "#c2368f"], ["#7fe0c8", "#1f9e80"], ["#c8b6ff", "#6f4fd6"]];
/** Un gajo por set de movimientos (segunda rueda de «Movimientos»). */
export const gajosSet = (lista: { set: string; nombre: string }[]): GestoRueda[] => lista.slice(0, 8).map((g, i) => {
  const [c1, c2] = COLORES_MOV[i % COLORES_MOV.length]!;
  return { cual: "set:" + g.set, txt: g.nombre, c1, c2, dibujo: <TrazosGesto cual="movimientos" />, ...(IMG_SET[g.set] ? { img: IMG_SET[g.set] } : {}) };
});
/** Un gajo por movimiento de un set (tercera rueda). */
export const gajosMovimiento = (lista: { id: string; nombre: string }[]): GestoRueda[] => lista.slice(0, 8).map((m, i) => {
  const [c1, c2] = COLORES_MOV[i % COLORES_MOV.length]!;
  return { cual: "mov:" + m.id, txt: m.nombre, c1, c2, dibujo: <TrazosGesto cual="mov:" /> };
});
export const GAJO_TRANSFORMAR: GestoRueda = { cual: "transformar", txt: "Transformar", c1: "#c77dff", c2: "#7b2cbf", dibujo: <TrazosGesto cual="transformar" />, img: `${ICONOS}cat-transformar.webp` };

// ---------- Círculo por categorías (Elías, 27 nov: «muy amontonadas y desorganizadas»; categorias.ts) ----------
// Mientras llegan los íconos ilustrados de Elías, cada tipo tiene un dibujo de trazo blanco y su color.
const D = { fill: "#fff", stroke: TINTA, strokeWidth: 0.8, strokeLinejoin: "round" as const, paintOrder: "stroke" as const };
const L = { fill: "none", stroke: "#fff", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export function IconoTipo({ tipo }: { tipo: TipoIcono }) {
  switch (tipo) {
    case "rayo": return <><path {...L} d="M3 12h9" opacity={0.6} /><path {...D} d="M13.5 2 6 13.2h5.2L9.6 22 18 10h-5.3L15.4 2Z" /></>;
    case "fuego": return <path {...D} d="M12 22c-4.4 0-7-2.9-7-6.6 0-3.4 2.4-5.4 3.6-8.4.9 1.6 1.2 3 1.2 4.3 1.6-1.6 2.6-4.6 2.2-9.3 4.2 2.6 7 7.4 7 11.6 0 5.2-2.8 8.4-7 8.4Zm0-1.8c1.8 0 3.1-1.3 3.1-3.3 0-1.8-1-3.2-2.4-4.6-.2 1.6-.9 2.7-2 3.4-.3-.7-.5-1.3-.5-2.1-1 1-1.4 2-1.4 3.2 0 2 1.4 3.4 3.2 3.4Z" />;
    case "vuelo": return <><path {...D} d="M12 2c2.2 2 3.2 4.8 3.2 8v5.4h-6.4V10c0-3.2 1-6 3.2-8Z" /><path {...D} d="M8.8 11.5 5 15.2v2.4l3.8-1.6M15.2 11.5l3.8 3.7v2.4l-3.8-1.6" /><path {...L} d="M10.4 18.4 9.6 22M13.6 18.4l.8 3.6M12 18.4V22" /></>;
    case "escudo": return <><circle {...D} cx={12} cy={12} r={9.4} /><circle {...L} stroke={TINTA} strokeWidth={1} cx={12} cy={12} r={6} /><path {...D} fill={TINTA} d="M12 8.6l1 2.2 2.4.2-1.8 1.6.5 2.4-2.1-1.2-2.1 1.2.5-2.4-1.8-1.6 2.4-.2Z" /></>;
    case "disparo": return <><path {...D} d="M3 7.5h13.5v3.7H9.6l-1 6.3H4.8l.8-6.3H3Z" /><path {...L} d="M18.6 9.3h2.4M18.3 6.6l1.8-1.3M18.3 12l1.8 1.3" /></>;
    case "espada": return <><path {...D} d="M18.6 2.4 21.6 5.4 9.8 17.2l-3-3Z" /><path {...D} d="M5 13.2l5.8 5.8-1.4 1.4-1.6-1.6-2.8 2.8-1.6-1.6 2.8-2.8-1.6-1.6Z" /></>;
    case "magia": return <><path {...D} d="M3.4 20.6 14.6 9.4l1.6 1.6L5 22.2Z" /><path {...D} d="M16.6 1.8l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9Z" /><path {...L} d="M21 9.6h1.4M20.3 13l1 1M12.2 3.4l-.6-1.2" /></>;
    case "baile": return <><path {...D} d="M9 4.4 19.4 2v13.4a3 3 0 1 1-2-2.8V6.6l-6.4 1.5v9.8a3 3 0 1 1-2-2.8Z" /></>;
    case "burla": return <><circle {...D} cx={12} cy={12} r={9.4} /><circle cx={8.8} cy={9.6} r={1.1} fill={TINTA} /><path fill="none" stroke={TINTA} strokeWidth={1.2} strokeLinecap="round" d="M14 9.4h2.6" /><path fill={TINTA} d="M7.6 13.4h8.8c0 2.6-2 4.4-4.4 4.4s-4.4-1.8-4.4-4.4Z" /><path fill="#ff5a7a" d="M11 15.8h3v2.8a1.5 1.5 0 0 1-3 0Z" /></>;
    case "reaccion": return <path {...D} d="M12 1.6l2.2 5.4 5.6-2.2-2.6 5.2 5.2 2.4-5.6 1.6 1.6 5.8-5-3.4-3.6 4.8-.6-5.8-5.8.4 4.4-3.8L3.6 7.6l5.6.6Z" />;
    case "golpe": return <><path {...D} d="M7 8.2a2 2 0 0 1 4 0V7a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v6.4c0 4-2.8 6.6-6.6 6.6S6 18.8 6 15.6V12a2 2 0 0 1 1-1.8Z" /><path {...L} d="M2 6.5h3M1.6 10h3M2 13.5h3" /></>;
    case "patada": return <><path {...D} d="M4 4.4h5.4l1 7.4 8.6 2.4a2.6 2.6 0 0 1-.7 5.1H5.6L4 11.6Z" /><path {...L} d="M20.6 4.6l1.4-1.4M21.4 8.6h1.6" /></>;
    case "tecno": return <><path {...D} d="M10.4 2h3.2l.5 2.6 2 1 2.4-1.4 2.2 2.2-1.4 2.4.8 2 2.6.6v3.2l-2.6.5-.8 2 1.4 2.4-2.2 2.2-2.4-1.4-2 .8-.5 2.6h-3.2l-.5-2.6-2-.8-2.4 1.4-2.2-2.2 1.4-2.4-.8-2-2.6-.5v-3.2l2.6-.6.8-2-1.4-2.4 2.2-2.2 2.4 1.4 2-1Z" /><circle cx={12} cy={12} r={3.2} fill={TINTA} /></>;
    case "mente": return <><path {...D} d="M12 4.4c4.4 0 7.4 3 7.4 6.8 0 2.6-1.4 4.4-3 5.4V21H9.2v-2.2H6.8a1.6 1.6 0 0 1-1.6-1.6v-2.6L3.6 13.4l1.6-2.6C5.6 7 8.2 4.4 12 4.4Z" /><path {...L} stroke={TINTA} strokeWidth={1.1} d="M10 9.6a2.4 2.4 0 0 1 4.4 1.2c0 1.6-2 1.8-2 3.4" /><path {...L} d="M20.6 3.2l1.4-1.2M22 7h1.6M17.6 1.6 18 0" /></>;
    case "fuerza": return <><path {...D} d="M2 9.6h2.4v4.8H2ZM4.4 8h2.8v8H4.4ZM16.8 8h2.8v8h-2.8ZM19.6 9.6H22v4.8h-2.4Z" /><path {...D} d="M7.2 10.8h9.6v2.4H7.2Z" /></>;
    case "acrobacia": return <><path {...L} d="M4.4 15.6A8 8 0 0 1 19 9.4" /><path {...L} d="M19.6 4.8 19 9.4l-4.6-.6" /><circle {...D} cx={6.4} cy={18.6} r={2.6} /></>;
    case "garras": return <path {...L} strokeWidth={2.2} d="M5 3.6 9.6 20.4M10.6 2.4l4 18.4M16.4 3.4l2.6 16.4" />;
    case "festejo": return <><path {...D} d="M3.2 21 8 7.4l8.6 8.6Z" /><path {...L} d="M13 4.4l.6-2.2M17.6 7.6l3-.8M15.6 2.8l-1 3.4M19.8 11.4l2-1" /><circle cx={19.4} cy={3.6} r={1.2} fill="#fff" /><circle cx={21.2} cy={15.2} r={1} fill="#fff" /></>;
    case "saludar": case "victoria": case "derrota": return <TrazosGesto cual={tipo} />;
    case "mas": return <><circle {...D} cx={5} cy={12} r={2.2} /><circle {...D} cx={12} cy={12} r={2.2} /><circle {...D} cx={19} cy={12} r={2.2} /></>;
    default: return <TrazosGesto cual="poderes" />;
  }
}
const COLOR_TIPO: Partial<Record<TipoIcono, [string, string]>> = {
  rayo: ["#ff5a5a", "#c0182a"], fuego: ["#ff9a3a", "#e0400f"], vuelo: ["#7fd8ff", "#1479c9"], escudo: ["#8fb4ff", "#2f56c9"],
  disparo: ["#ffd84a", "#c98a00"], espada: ["#c8d4e8", "#5a6a8a"], magia: ["#c77dff", "#7b2cbf"], baile: ["#ff8fd8", "#c2368f"],
  burla: ["#ffd84a", "#e0a400"], reaccion: ["#ff7a59", "#d0341a"], golpe: ["#ff7a59", "#d0341a"], patada: ["#c8b6ff", "#6f4fd6"],
  tecno: ["#7fe0c8", "#1f9e80"], mente: ["#ff8fd8", "#a12fa8"], fuerza: ["#9be04a", "#4fa81f"], acrobacia: ["#ffb347", "#e06a00"],
  garras: ["#c8d4e8", "#5a6a8a"], festejo: ["#ffd84a", "#e0a400"], saludar: ["#9be04a", "#4fa81f"], victoria: ["#ffd84a", "#e0a400"],
  derrota: ["#4f86e8", "#1f4fb0"], mas: ["#e8ecf5", "#8a93ad"], poder: ["#4fd8ff", "#1479c9"],
};
/** Íconos ilustrados de Elías que ya existen, por tipo. */
const IMG_TIPO: Partial<Record<TipoIcono, string>> = {
  vuelo: `${ICONOS}gesto-volar.webp`, golpe: `${ICONOS}gesto-golpear.webp`, patada: `${ICONOS}gesto-patada.webp`,
  saludar: `${ICONOS}gesto-saludar.webp`, victoria: `${ICONOS}gesto-victoria.webp`, derrota: `${ICONOS}gesto-derrota.webp`,
  mas: `${ICONOS}cat-mas.webp`,
  // Íconos de tipo de Elías (27 nov, 11 PM).
  ...Object.fromEntries((["rayo", "fuego", "escudo", "disparo", "espada", "magia", "baile", "burla", "reaccion", "tecno", "mente", "fuerza",
    "acrobacia", "garras", "festejo"] as const).map(t => [t, `${ICONOS}tipo-${t}.webp`])),
};
export const gajosOpciones = (lista: Opcion[]): GestoRueda[] => lista.slice(0, 8).map(o => {
  const [c1, c2] = COLOR_TIPO[o.tipo] ?? ["#4fd8ff", "#1479c9"];
  return { cual: o.cual, txt: o.txt, c1, c2, dibujo: <IconoTipo tipo={o.tipo} />, ...(IMG_TIPO[o.tipo] ? { img: IMG_TIPO[o.tipo] } : {}) };
});
const ICONO_CATEGORIA: Record<Categoria, { tipo: TipoIcono; img?: string; c: [string, string] }> = {
  poderes: { tipo: "poder", img: `${ICONOS}gesto-poderes.webp`, c: ["#4fd8ff", "#1479c9"] },
  especial: { tipo: "poder", img: `${ICONOS}cat-especial.webp`, c: ["#ff9a3a", "#e8560f"] },
  pelea: { tipo: "golpe", img: `${ICONOS}gesto-golpear.webp`, c: ["#ff7a59", "#d0341a"] },
  habilidad: { tipo: "espada", img: `${ICONOS}cat-habilidad.webp`, c: ["#c8d4e8", "#5a6a8a"] },
  fiesta: { tipo: "baile", img: `${ICONOS}cat-fiesta.webp`, c: ["#ff8fd8", "#c2368f"] },
  gestos: { tipo: "saludar", img: `${ICONOS}cat-gestos.webp`, c: ["#9be04a", "#4fa81f"] },
};
export const gajosCategorias = (lista: Categoria[]): GestoRueda[] => lista.map(c => {
  const i = ICONO_CATEGORIA[c];
  return { cual: "cat:" + c, txt: NOMBRE_CATEGORIA[c], c1: i.c[0], c2: i.c[1], dibujo: c === "especial" ? <TrazosGesto cual="especial" /> : <IconoTipo tipo={i.tipo} />, ...(i.img ? { img: i.img } : {}) };
});
export const BOTON_VOLVER: GestoRueda = { cual: "volver", txt: "Volver", c1: "#e8ecf5", c2: "#8a93ad", img: `${ICONOS}cat-volver.webp`,
  dibujo: <path fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" d="M14.5 5 7.5 12l7 7" /> };
