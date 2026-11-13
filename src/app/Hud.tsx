// Piezas de la partida al estilo de menú de consola: nombre de la herramienta que toca, barra de rondas,
// botones de voto con letra y controles grandes del celular. Solo presentación: el motor no cambia.
import type { ReactNode } from "react";
import type { Motor } from "../engine/types";

/** Cada mecánica del motor, contada como herramienta para quien juega. */
export const HERRAMIENTAS: Record<Motor, { icono: string; nombre: string; como: string }> = {
  "turnos-cartas": { icono: "🃏", nombre: "Carta del turno", como: "Lee la carta en voz alta. Desliza a la derecha si cumplió, a la izquierda si pasa." },
  botella: { icono: "🍾", nombre: "Botella", como: "El reloj elige quién pregunta y quién responde." },
  ruleta: { icono: "🎡", nombre: "Ruleta de jugadores", como: "La ruleta elige a quién le toca." },
  dados: { icono: "🎲", nombre: "Dados", como: "Tira los dados: acción, zona y tiempo." },
  votacion: { icono: "🗳️", nombre: "Votación secreta", como: "Cada quien elige A o B en secreto. Se revela al mismo tiempo." },
  "rol-secreto": { icono: "🕵️", nombre: "Rol secreto", como: "Mira tu palabra a escondidas. Den pistas y voten al impostor." },
  pareja: { icono: "💞", nombre: "Respuesta en pareja", como: "Contesten por separado y vean si coinciden." },
  conteo: { icono: "⏱️", nombre: "Contra reloj", como: "Di todas las que puedas antes de que se acabe el tiempo." },
  confesion: { icono: "🙋", nombre: "Confesión", como: "Quien lo haya hecho, lo confiesa. Confesar suma." },
  senalar: { icono: "👉", nombre: "Señalar", como: "Señala en secreto a quien encaje. Se revela al mismo tiempo." },
  competencia: { icono: "🏁", nombre: "Duelo", como: "Compitan en vivo. El anfitrión marca quién ganó." },
};

/** Cinta con el icono y el nombre de la herramienta de la ronda. */
export function ChipHerramienta({ motor }: { motor: Motor }) {
  const h = HERRAMIENTAS[motor];
  return <span className="chip-herramienta"><span aria-hidden="true">{h.icono}</span> {h.nombre}</span>;
}

/** Panel con cabecera para la herramienta que se está usando. */
export function PanelHerramienta({ motor, children, sinComo = false }: { motor: Motor; children: ReactNode; sinComo?: boolean }) {
  const h = HERRAMIENTAS[motor];
  return (
    <section className="herramienta" aria-label={h.nombre}>
      <header className="herramienta-cab">
        <span className="herramienta-icono" aria-hidden="true">{h.icono}</span>
        <span className="pila" style={{ gap: 2, minWidth: 0 }}>
          <b>{h.nombre}</b>
          {!sinComo && <small>{h.como}</small>}
        </span>
      </header>
      <div className="herramienta-cuerpo">{children}</div>
    </section>
  );
}

/** Barra de rondas por segmentos: hechas, la actual y las que faltan. */
export function Rondas({ ronda, total }: { ronda: number; total: number }) {
  return (
    <span className="rondas" role="img" aria-label={`Ronda ${ronda} de ${total}`}>
      <span className="rondas-texto">Ronda <b>{ronda}</b>/{total}</span>
      <span className="rondas-barra" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => <i key={i} className={i + 1 < ronda ? "hecha" : i + 1 === ronda ? "actual" : ""} />)}
      </span>
    </span>
  );
}

/** Opción de voto con su letra, como las opciones de un menú. */
export function BotonVoto({ letra, children, onClick, elegido }: { letra: string; children: ReactNode; onClick: () => void; elegido?: boolean }) {
  return (
    <button className={"voto" + (elegido ? " elegido" : "")} aria-pressed={elegido} onClick={onClick}>
      <span className="voto-letra" aria-hidden="true">{letra}</span>
      <span className="voto-texto">{children}</span>
    </button>
  );
}
