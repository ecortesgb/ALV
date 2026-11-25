// Ficha de jugador con el arte del lobby (Elías, 23 nov: «quitar todo rastro de imagen anterior»): la cabina de su
// color de fondo, su busto encima y su número. Reemplaza los círculos viejos en la partida.
import type { CSSProperties, ReactNode } from "react";
import { claveArchivo, varsColor, type ColorJugador } from "../../app/colorJugador";
import { apodoDe, semillaDe, useFoto } from "../../app/figura3d";
import type { FiguraV2 } from "../../content/personaje";
import { urlArte } from "../comun";
import { carpetaLobby } from "./version";

/** Fondo de la ficha: la cabina del color (sin color, la vacía). */
export const cabinaDe = (c: ColorJugador | null) => urlArte(`${carpetaLobby}/cabina-${c ? claveArchivo(c) : "vacia"}.webp`);

export function FichaJugador({ id, figura, nombre, color, tamano = 64, className = "", yo, soloCara, children }: {
  id: string; figura: FiguraV2 | null | undefined; nombre: string; color: ColorJugador | null; tamano?: number; className?: string; yo?: boolean;
  /** Solo la cabina con el busto (sin nombre), para podios. */ soloCara?: boolean; children?: ReactNode;
}) {
  const foto = useFoto(figura ?? null, figura ? undefined : semillaDe(id), "busto");
  const apodo = apodoDe(figura ?? null);
  return (
    <span className={"fj" + (yo ? " yo" : "") + (className ? " " + className : "")} style={{ ...varsColor(color), "--fj-t": `${tamano}px`, "--fj-cab": cabinaDe(color) } as CSSProperties}>
      <span className="fj-cab" aria-hidden="true">{foto ? <img src={foto} alt="" draggable={false} /> : <span className="fj-cargando" />}{color && <b className="fj-pn">{color.etiqueta}</b>}</span>
      {soloCara ? <span className="a-oculto">{apodo ?? nombre}</span> : <span className="fj-txt"><span className="fj-nom">{apodo ?? nombre}</span>{children}</span>}
    </span>
  );
}
