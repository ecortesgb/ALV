import type { CSSProperties } from "react";
import { Icono, type IconoId } from "./Icono";

export type ColorBoton = "amarillo" | "azul" | "morado" | "verde" | "naranja" | "rojo";
const CLASE: Record<ColorBoton, string> = { amarillo: "k-yel", azul: "k-blu", morado: "k-pur", verde: "k-grn", naranja: "k-org", rojo: "k-red" };

export interface BotonProps {
  /** Color por sección: Jugar amarillo, Personalizar azul, Tienda morado, Ranking verde, Logros naranja; interrumpir, rojo. */
  color: ColorBoton;
  texto: string;
  icono?: IconoId;
  sub?: string;
  /** Burbuja de aviso («NUEVO», «2»). */
  aviso?: string;
  /** El botón Jugar: el más grande y late. */
  principal?: boolean;
  desactivado?: boolean;
  cargando?: boolean;
  /** Fija la apariencia de un estado (solo para la página interna del Design System). */
  muestra?: "encima" | "presionado";
  /** Botón de la barra del anfitrión (icono arriba, texto abajo). */
  compacto?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

/** Botón inclinado con bisel y sombra dura: el control principal de ALV. */
export function Boton({ color, texto, icono, sub, aviso, principal, desactivado, cargando, muestra, compacto, onClick, className = "", style }: BotonProps) {
  const cls = ["d-btn", CLASE[color], principal && "d-play", compacto && "d-hb", aviso && !principal && "con-aviso", desactivado && "is-off", cargando && "is-carga",
    muestra === "encima" && "is-hover", muestra === "presionado" && "is-press", className].filter(Boolean).join(" ");
  const ic = desactivado ? "lock" : icono;
  return (
    <button type="button" className={cls} style={style} disabled={desactivado} aria-busy={cargando || undefined}
      onClick={cargando || desactivado ? undefined : onClick}>
      {ic && <Icono id={ic} />}
      {principal
        ? <span><span className="dsp">{texto}</span>{sub && <small>{sub}</small>}</span>
        : compacto ? <span>{texto}</span>
        : <><span className="dsp">{texto}</span>{sub && <small>{sub}</small>}</>}
      {aviso && <span className="d-badge">{aviso}</span>}
    </button>
  );
}
