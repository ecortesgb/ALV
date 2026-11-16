import type { CSSProperties } from "react";
import { Boton } from "./Boton";
import { Etiqueta } from "./Etiqueta";
import type { IconoId } from "./Icono";

export interface BarraAnfitrionProps {
  pausada?: boolean;
  /** Botón del momento, arriba de la barra: «Revelar ya», «Siguiente ronda». */
  momento?: { texto: string; icono?: IconoId; onClick: () => void };
  onPausar?: () => void;
  onSaltar?: () => void;
  onRuleta?: () => void;
  onXpReto?: () => void;
}

const sd = (s: string) => ({ "--sd": s }) as CSSProperties;

/** Controles de quien tiene el control, al pie de su celular. Nunca en la TV ni en los demás celulares. */
export function BarraAnfitrion({ pausada, momento, onPausar, onSaltar, onRuleta, onXpReto }: BarraAnfitrionProps) {
  return (
    <div className="d-host">
      {momento && <Boton color="amarillo" texto={momento.texto} icono={momento.icono ?? "skip"} onClick={momento.onClick} />}
      <Etiqueta texto="Anfitrión" icono="star" />
      <div className="d-hostrow">
        <Boton compacto color="azul" icono={pausada ? "play" : "pause"} texto={pausada ? "Seguir" : "Pausar"} onClick={onPausar} />
        <Boton compacto color="amarillo" icono="skip" texto="Saltar" onClick={onSaltar} style={sd(".6s")} />
        <Boton compacto color="morado" icono="wheel" texto="Ruleta" onClick={onRuleta} style={sd("1.2s")} />
        <Boton compacto color="verde" icono="plus" texto="XP reto" onClick={onXpReto} style={sd("1.8s")} />
      </div>
    </div>
  );
}
