// Ficha de jugador en la partida: el medallón del HUB teñido con su color del lobby, su busto y su número en la estrella
// (Elías, 28 nov: los círculos son los del HUB o, en juegos, del color que tocó en el lobby).
import type { CSSProperties, ReactNode } from "react";
import { claveArchivo, varsColor, type ColorJugador } from "../../app/colorJugador";
import { apodoDe } from "../../app/figura3d";
import type { FiguraV2 } from "../../content/personaje";
import { urlArte } from "../comun";
import { MedallonJugador } from "../azotea/Cabecera";
import "../azotea/azotea.css";
import { carpetaLobby } from "./version";

/** Fondo de la ficha: la cabina del color (sin color, la vacía). */
export const cabinaDe = (c: ColorJugador | null) => urlArte(`${carpetaLobby}/cabina-${c ? claveArchivo(c) : "vacia"}.webp`);

export function FichaJugador({ id, figura, nombre, color, tamano = 64, className = "", yo, soloCara, children }: {
  id: string; figura: FiguraV2 | null | undefined; nombre: string; color: ColorJugador | null; tamano?: number; className?: string; yo?: boolean;
  /** Solo la cabina con el busto (sin nombre), para podios. */ soloCara?: boolean; children?: ReactNode;
}) {
  const apodo = apodoDe(figura ?? null);
  return (
    <span className={"fj" + (yo ? " yo" : "") + (className ? " " + className : "")} style={{ ...varsColor(color), "--fj-t": `${tamano}px`, "--fj-cab": cabinaDe(color) } as CSSProperties}>
      <span className="fj-cab" aria-hidden="true"><MedallonJugador id={id} figura={figura} tamano={tamano} estrella={color?.etiqueta?.replace(/\D/g, "") || undefined} /></span>
      {soloCara ? <span className="a-oculto">{apodo ?? nombre}</span> : <span className="fj-txt"><span className="fj-nom">{apodo ?? nombre}</span>{children}</span>}
    </span>
  );
}
