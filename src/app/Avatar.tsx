// El personaje: siempre la figura 3D (foto sacada de la escena de figura3d.tsx), en cuerpo completo o como retrato.
import type { Personaje } from "../content/personaje";
import { nivelPorXp } from "../engine/economia";
import { equipoDe } from "../content/equipos";
import { saldosDe, type JugadorLocal } from "./estado";
import { FotoFigura, semillaDe, useFoto } from "./figura3d";

/** Semilla de la figura al azar de quien no tiene figura: sale de sus piezas 2D, distintas para cada lugar del grupo. */
export const semillaPersonaje = (p: Personaje) => semillaDe([p.piel, p.rostro, p.cabello, p.torso, p.piernas].join("|"));

interface Props {
  p: Personaje;
  /** Ancho en px; el alto es 1.5 veces. */
  size: number;
  nombre?: string;
  /** Ya no se dibujan (eran adornos 2D); se dejan para no tocar a quien los pasa. */
  lider?: boolean;
  /** Delantal del mesero (no se vende). */
  mesero?: boolean;
  /** Con articulaciones: cabeza, brazos y piernas se mueven por separado (escenario, editor, pantalla principal). */
  articulado?: boolean;
}

export function Avatar({ p, size, nombre }: Props) {
  // Todo es 3D: la foto de su figura en juego, o una al azar fija mientras no arme la suya.
  // Los adornos 2D (tienda, equipo, corona del líder, delantal) ya no se dibujan: se rehacen como piezas 3D.
  return <FotoFigura figura={p.figura} semilla={semillaPersonaje(p)} size={size} nombre={nombre} />;
}

/** Tipo de carta según el nivel: el mismo marco que la tarjeta de jugador. */
export type TipoCarta = "bronce" | "plata" | "oro" | "neon";
export const tipoCartaPorNivel = (n: number): TipoCarta => (n >= 10 ? "neon" : n >= 6 ? "oro" : n >= 3 ? "plata" : "bronce");

/**
 * Retrato de los hombros hacia arriba, como foto de credencial, con el fondo del tipo de carta y el personaje respirando.
 * Se usa en todas las vistas chicas; el cuerpo completo queda para el escenario, el podio y el editor.
 * Encuadre: en el lienzo de las piezas (400×520) toma de x=50 a 350 y de y=5 a 305: del pelo o la corona a los hombros.
 */
export function Retrato({ j, p, nombre, size, nivel }:
  { j?: JugadorLocal; p?: Personaje; nombre?: string; size: number; nivel?: number }) {
  const personaje = j?.personaje ?? p;
  if (!personaje) return null;
  const n = nivel ?? (j ? nivelPorXp(saldosDe(j).acumulada) : 1);
  const quien = nombre ?? j?.nombre;
  const eq = equipoDe(personaje.equipo?.id ?? j?.equipo);
  const marco = !!eq && !!personaje.equipo?.adornos?.includes("marco");
  // Desfase de la animación por nombre, para que no respiren todos al mismo tiempo.
  const desfase = ((quien ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 9) * -0.4;
  return (
    <span className={"retrato t-" + tipoCartaPorNivel(n) + (eq ? " con-equipo" : "") + (marco ? " marco-equipo" : "")} style={{ width: size, height: size, ...(eq ? { ["--eq1" as string]: eq.c1, ["--eq2" as string]: eq.c2 } : {}) }} role="img" aria-label={`Personaje de ${quien ?? "jugador"}`}>
      <span className="retrato-cuerpo" aria-hidden="true" style={{ inset: 0, animationDelay: `${desfase}s` }}>
        <FotoRetrato p={personaje} size={size} />
      </span>
    </span>
  );
}

/**
 * La foto de la figura (240×300, de y=-0.22 a 2.98 en unidades de la escena) recortada de los hombros al pelo:
 * de y≈1.6 a 2.85, o sea del 4 % al 43 % del alto de la foto, centrado a lo ancho.
 */
function FotoRetrato({ p, size }: { p: Personaje; size: number }) {
  const url = useFoto(p.figura, semillaPersonaje(p));
  if (!url) return <span className="av-3d-cargando" />;
  return <img src={url} alt="" draggable={false} style={{ position: "absolute", width: 2.05 * size, height: 2.56 * size, left: -0.526 * size, top: -0.1 * size, maxWidth: "none" }} />;
}

/** Ícono de un adorno de la tienda que no es pieza de bloques. */
export function IconoAdorno({ id }: { id: string }) {
  if (id === "collar") return <svg viewBox="0 0 120 90" aria-hidden="true"><path d="M14 10 Q60 90 106 10" fill="none" stroke="#FFCF4A" strokeWidth="9" strokeLinecap="round" /><circle cx="60" cy="66" r="13" fill="#FFCF4A" stroke="#B8861B" strokeWidth="4" /></svg>;
  if (id === "medallas") return <svg viewBox="0 0 120 100" aria-hidden="true"><path d="M38 4 L44 56" stroke="#FF2E88" strokeWidth="10" /><path d="M82 4 L76 56" stroke="#22E1FF" strokeWidth="10" /><circle cx="44" cy="70" r="20" fill="#FF7A2E" /><circle cx="78" cy="70" r="20" fill="#A77BFF" /></svg>;
  if (id === "capa") return <svg viewBox="0 0 100 110" aria-hidden="true"><path d="M26 6 L74 6 L96 104 L4 104Z" fill="#C8102E" /><path d="M26 6 L74 6 L78 20 L22 20Z" fill="#FFCF4A" /></svg>;
  const f = id === "corona-neon" ? "#FF2E88" : "#C9A26B";
  return <svg viewBox="0 0 120 80" aria-hidden="true"><path d="M8 72 L18 16 L42 46 L60 4 L78 46 L102 16 L112 72Z" fill={f} stroke="#B8861B" strokeWidth="4" strokeLinejoin="round" /></svg>;
}
