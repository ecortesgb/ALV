// Fondo del flujo de juego (lobby, espera, partida y avisos): el cuarto de Elías. Sin la ciudad ni la azotea viejas.
import type { CSSProperties, ReactNode } from "react";
import { Marco, urlArte } from "../comun";
import "../azotea/azotea.css";
import "./lobby.css";
import "./partida.css";

export function FondoCuarto({ oscuro }: { oscuro?: boolean }) {
  return (
    <div className={"lb-fondo" + (oscuro ? " oscuro" : "")} aria-hidden="true">
      <span className="lb-cuarto" style={{ "--lb-fondo-g": urlArte("lobby/fondo-cuarto-1920.webp"), "--lb-fondo-c": urlArte("lobby/fondo-cuarto-1100.webp") } as CSSProperties} />
    </div>
  );
}

/** Aviso a pantalla completa con el cuarto de fondo (sala cerrada, te sacaron, no se pudo entrar…). */
export function AvisoCuarto({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <Marco clase="az lb pt-aviso" fondo={<FondoCuarto oscuro />}>
      <div className="lb-vacio" role="status">
        <b>{titulo}</b>
        {texto && <p>{texto}</p>}
        {children}
      </div>
    </Marco>
  );
}
