// El personaje de bloques: capas de imagen apiladas y, encima, los adornos de la tienda dibujados en SVG.
import { rutaPieza, TIENDA, type Personaje } from "../content/personaje";

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
