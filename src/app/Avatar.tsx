// El personaje de bloques: capas de imagen apiladas y, encima, los adornos de la tienda dibujados en SVG.
import { rutaPieza, TIENDA, type Personaje } from "../content/personaje";
import { nivelPorXp } from "../engine/economia";
import { saldosDe, type JugadorLocal } from "./estado";

interface Props {
  p: Personaje;
  /** Ancho en px; el alto es 1.5 veces. */
  size: number;
  nombre?: string;
  /** Corona del ALV vigente (no se vende). */
  lider?: boolean;
  /** Delantal del mesero (no se vende). */
  mesero?: boolean;
}

export function Avatar({ p, size, nombre, lider, mesero }: Props) {
  const puesto = p.puesto ?? {};
  const mano = puesto.mano && TIENDA.some(a => a.id === puesto.mano && a.pieza) ? puesto.mano : null;
  const capas = [p.piernas, p.piel, p.torso, p.facial || p.rostro, p.cabello, mano].filter(Boolean) as string[];
  return (
    <span className="av" style={{ width: size, height: Math.round(size * 1.5) }} role="img" aria-label={`Personaje de ${nombre ?? "jugador"}`}>
      {puesto.espalda === "capa" && (
        <svg viewBox="0 0 400 520" aria-hidden="true"><path d="M140 212 L260 212 L308 478 L92 478Z" fill="#C8102E" /><path d="M140 212 L260 212 L266 236 L134 236Z" fill="#FFCF4A" /></svg>
      )}
      {capas.map(id => <img key={id} src={rutaPieza(id)} alt="" loading="lazy" decoding="async" />)}
      <svg viewBox="0 0 400 520" aria-hidden="true">
        {mesero && <><path d="M162 226 L238 226 L250 340 L150 340Z" fill="#F7F2FF" opacity=".95" /><path d="M162 226 Q200 205 238 226" fill="none" stroke="#F7F2FF" strokeWidth="5" /></>}
        {puesto.cuello === "collar" && <><path d="M160 213 Q200 262 240 213" fill="none" stroke="#FFCF4A" strokeWidth="8" strokeLinecap="round" /><circle cx="200" cy="252" r="12" fill="#FFCF4A" stroke="#B8861B" strokeWidth="3" /></>}
        {puesto.pecho === "medallas" && <><path d="M176 222 L180 262" stroke="#FF2E88" strokeWidth="7" /><path d="M224 222 L220 262" stroke="#22E1FF" strokeWidth="7" /><circle cx="180" cy="274" r="14" fill="#FF7A2E" stroke="#0E0A1F" strokeWidth="2" /><circle cx="220" cy="274" r="14" fill="#A77BFF" stroke="#0E0A1F" strokeWidth="2" /></>}
        {lider
          ? <Corona relleno="#FFCF4A" gema="#FF2E88" extra />
          : puesto.cabeza === "corona-neon" ? <Corona relleno="#FF2E88" gema="#22E1FF" />
          : puesto.cabeza === "corona-carton" ? <path d="M150 102 L158 52 L182 80 L200 44 L218 80 L242 52 L250 102Z" fill="#C9A26B" stroke="#8A6A3B" strokeWidth="4" strokeLinejoin="round" />
          : null}
      </svg>
    </span>
  );
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
  const s = size / 1.0345; // ancho del Avatar para que 300 unidades del lienzo llenen el retrato
  // Desfase de la animación por nombre, para que no respiren todos al mismo tiempo.
  const desfase = ((quien ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 9) * -0.4;
  return (
    <span className={"retrato t-" + tipoCartaPorNivel(n)} style={{ width: size, height: size }} role="img" aria-label={`Personaje de ${quien ?? "jugador"}`}>
      <span className="retrato-cuerpo" aria-hidden="true" style={{ left: 0.0173 * s, top: 0.1208 * s, animationDelay: `${desfase}s` }}>
        <Avatar p={personaje} size={s} lider={false} />
      </span>
    </span>
  );
}

function Corona({ relleno, gema, extra }: { relleno: string; gema: string; extra?: boolean }) {
  return (
    <>
      <path d="M146 100 L156 44 L180 76 L200 30 L220 76 L244 44 L254 100Z" fill={relleno} stroke="#B8861B" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="200" cy="80" r="9" fill={gema} />
      {extra && <><circle cx="165" cy="88" r="6" fill="#22E1FF" /><circle cx="235" cy="88" r="6" fill="#22E1FF" /></>}
    </>
  );
}

/** Ícono de un adorno de la tienda que no es pieza de bloques. */
export function IconoAdorno({ id }: { id: string }) {
  if (id === "collar") return <svg viewBox="0 0 120 90" aria-hidden="true"><path d="M14 10 Q60 90 106 10" fill="none" stroke="#FFCF4A" strokeWidth="9" strokeLinecap="round" /><circle cx="60" cy="66" r="13" fill="#FFCF4A" stroke="#B8861B" strokeWidth="4" /></svg>;
  if (id === "medallas") return <svg viewBox="0 0 120 100" aria-hidden="true"><path d="M38 4 L44 56" stroke="#FF2E88" strokeWidth="10" /><path d="M82 4 L76 56" stroke="#22E1FF" strokeWidth="10" /><circle cx="44" cy="70" r="20" fill="#FF7A2E" /><circle cx="78" cy="70" r="20" fill="#A77BFF" /></svg>;
  if (id === "capa") return <svg viewBox="0 0 100 110" aria-hidden="true"><path d="M26 6 L74 6 L96 104 L4 104Z" fill="#C8102E" /><path d="M26 6 L74 6 L78 20 L22 20Z" fill="#FFCF4A" /></svg>;
  const f = id === "corona-neon" ? "#FF2E88" : "#C9A26B";
  return <svg viewBox="0 0 120 80" aria-hidden="true"><path d="M8 72 L18 16 L42 46 L60 4 L78 46 L102 16 L112 72Z" fill={f} stroke="#B8861B" strokeWidth="4" strokeLinejoin="round" /></svg>;
}
