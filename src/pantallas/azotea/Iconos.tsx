// Iconos ilustrados de los botones del HUB (provisionales, mismo lenguaje: volumen, contorno de tinta, brillo arriba).
// La propuesta es cambiarlos por renders de piezas con el mismo motor de la figura; la Tienda ya usa el arte del sobre.
import { useState, type ReactElement } from "react";

const T = "#0a1030";

export type IconoHub = "jugar" | "personalizar" | "tienda" | "ranking" | "logros" | "chat" | "regalo";

// Primero se usa el icono 3D de Elías (public/arte/ui/hub/icono-<cual>.webp); si todavía no existe, el dibujo de abajo.
const faltan = new Set<IconoHub>();

export function IconoIlustrado({ cual }: { cual: IconoHub }) {
  const [falta, setFalta] = useState(() => faltan.has(cual));
  if (!falta) return <img className="az-ico az-ico-arte" src={`${import.meta.env.BASE_URL}arte/ui/hub/icono-${cual}.webp`} alt="" draggable={false}
    onError={() => { faltan.add(cual); setFalta(true); }} />;
  if (cual === "tienda") return <img className="az-ico" src={`${import.meta.env.BASE_URL}arte/tienda/sobre-basico.webp`} alt="" draggable={false} />;
  return <svg className="az-ico" viewBox="0 0 96 96" aria-hidden="true">{DIBUJO[cual]}</svg>;
}

const brillo = (d: string) => <path d={d} fill="#fff" opacity=".55" />;

const DIBUJO: Record<Exclude<IconoHub, "tienda">, ReactElement> = {
  jugar: <g strokeLinejoin="round">
    <path d="M28 14c-6-4-12 0-12 7v54c0 7 6 11 12 7l46-27c6-4 6-10 0-14z" fill="#1b2a7a" stroke={T} strokeWidth="5" />
    <path d="M31 24v40l34-20z" fill="#fff" />
    {brillo("M24 22c0-3 2-4 5-3l6 3-8 4z")}
    <path d="M78 10l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffe066" stroke={T} strokeWidth="3" />
    <path d="M86 40l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="#fff" stroke={T} strokeWidth="2.5" />
  </g>,
  personalizar: <g strokeLinejoin="round" stroke={T} strokeWidth="4.5">
    <path d="M34 12l-24 12 8 20 10-5v45h40V39l10 5 8-20-24-12c-2 7-7 11-14 11s-12-4-14-11z" fill="#5aa6ff" />
    <path d="M34 12c2 7 7 11 14 11s12-4 14-11" fill="none" stroke="#fff" strokeWidth="4" />
    <path d="M48 44l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="#ffe066" strokeWidth="3" />
    {brillo("M30 40c0-6 2-9 5-10v30h-5z")}
  </g>,
  ranking: <g strokeLinejoin="round" stroke={T} strokeWidth="4.5">
    <path d="M26 16h44v18c0 14-10 24-22 24S26 48 26 34z" fill="#ffc21a" />
    <path d="M26 22H12c0 14 8 20 16 20M70 22h14c0 14-8 20-16 20" fill="none" />
    <path d="M42 58h12v12H42z" fill="#e6a400" /><path d="M28 70h40l4 14H24z" fill="#ffc21a" />
    <path d="M48 26l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#fff6c8" strokeWidth="2.5" />
    {brillo("M31 20h6v16c0 6 2 10 5 13-6-1-11-7-11-15z")}
  </g>,
  logros: <g strokeLinejoin="round" stroke={T} strokeWidth="4.5">
    <path d="M26 8h16l10 28H36zM70 8H54L44 36h16z" fill="#ff4f6e" /><path d="M42 8h12L48 24z" fill="#5aa6ff" />
    <circle cx="48" cy="60" r="26" fill="#ffc21a" /><circle cx="48" cy="60" r="17" fill="#ffd95a" strokeWidth="3" />
    <path d="M48 48l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#fff6c8" strokeWidth="2.5" />
    {brillo("M30 52c3-8 9-12 16-13-6 4-10 9-12 16z")}
  </g>,
  chat: <g strokeLinejoin="round" stroke={T} strokeWidth="4.5">
    <path d="M14 22c0-7 5-12 12-12h44c7 0 12 5 12 12v28c0 7-5 12-12 12H44L26 78V62c-7 0-12-5-12-12z" fill="#4fe0d4" />
    <circle cx="34" cy="36" r="5" fill="#fff" strokeWidth="3" /><circle cx="48" cy="36" r="5" fill="#fff" strokeWidth="3" /><circle cx="62" cy="36" r="5" fill="#fff" strokeWidth="3" />
    {brillo("M22 20c2-4 5-5 9-5h10c-8 2-13 5-15 11z")}
  </g>,
  regalo: <g strokeLinejoin="round" stroke={T} strokeWidth="4.5">
    <path d="M12 38h72v16H12z" fill="#ff4fa3" /><path d="M18 54h60v30H18z" fill="#e8358a" />
    <path d="M42 38h12v46H42z" fill="#ffd23f" />
    <path d="M48 38c-9-18-27-18-24-6 1 6 15 6 24 6zm0 0c9-18 27-18 24-6-1 6-15 6-24 6z" fill="#ffd23f" />
    {brillo("M18 42h20v6H18z")}
  </g>,
};
