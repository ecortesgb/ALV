// Lobby vacío (ruta #/jugar): cuando alguien elige En línea o Físico y el administrador todavía no abre el lobby.
// Sin códigos (Elías, 22 nov): en cuanto el lobby aparece, entra solo. Sin el administrador no se puede empezar.
import { useEffect, type CSSProperties } from "react";
import { atras, ir } from "../../app/rutas";
import { useLobby, useLobbyAbierto } from "../../app/lobby";
import { Marco, urlArte } from "../comun";
import { EscenarioFondo } from "../azotea/Escenario";
import { useMomentoAzotea } from "../azotea/HubAzotea";
import { escenarioActual } from "../azotea/paquetes";
import { CUPO_LOBBY } from "../SalaEspera";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "./lobby.css";

export function EsperaLobby() {
  const momento = useMomentoAzotea();
  const esc = escenarioActual();
  const info = useLobbyAbierto();
  const anunciado = useLobby();
  const codigo = info?.codigo ?? anunciado;
  useEffect(() => { if (codigo) ir("sala", codigo); }, [codigo]);
  return (
    <Marco clase={`az lb m-${momento}`} fondo={<div className="lb-fondo"><EscenarioFondo ambiente={esc.ambientes[momento]} momento={momento} velo={1} />
      <span className="lb-cuarto" style={{ "--lb-fondo-g": urlArte("lobby/fondo-lobby-1920.webp"), "--lb-fondo-c": urlArte("lobby/fondo-lobby-1100.webp") } as CSSProperties} aria-hidden="true" /></div>}>
      <div className="lb-caja">
        <header className="lb-top">
          <button type="button" className="pf-atras" onClick={atras}><span aria-hidden="true">◀</span>Atrás</button>
          <div className="lb-banner" role="status"><span className="lb-banner-n">0/{CUPO_LOBBY}</span><span className="lb-banner-t">Lobby vacío</span></div>
          <span />
        </header>
        <div className="lb-vacio">
          <b>Esperando al administrador</b>
          <p>En cuanto abra el lobby entras solo. Sin él no se puede empezar.</p>
          <span className="lb-puntitos" aria-hidden="true"><i /><i /><i /></span>
        </div>
      </div>
    </Marco>
  );
}
