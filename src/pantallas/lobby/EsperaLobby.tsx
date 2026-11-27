// Lobby vacío (ruta #/jugar): cuando alguien elige En línea o Físico y el administrador todavía no abre el lobby.
// Sin códigos (Elías, 22 nov): en cuanto el lobby aparece, entra solo. Sin el administrador no se puede empezar.
import { useEffect } from "react";
import { atras, ir } from "../../app/rutas";
import { useLobby, useLobbyAbierto } from "../../app/lobby";
import { Marco } from "../comun";
import { CUPO_LOBBY } from "../SalaEspera";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "./lobby.css";
import { FondoCuarto } from "./Cuarto";
import { jugarEnEsteAparato } from "./Lobby";
import { useSesion } from "../../app/sesion";
import { figuraActiva, useCapsulas } from "../../app/figura3d";

export function EsperaLobby() {
  const info = useLobbyAbierto();
  const anunciado = useLobby();
  const codigo = info?.codigo ?? anunciado;
  const ses = useSesion();
  const caps = useCapsulas(ses.uid);
  useEffect(() => { if (codigo) ir("sala", codigo); }, [codigo]);
  return (
    <Marco clase="az lb" fondo={<FondoCuarto />}>
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
          {/* 055: sin esperar a nadie: todos juegan en este aparato y cada cuenta gana sus puntos. */}
          <button type="button" className="lb-aparato" onClick={() => jugarEnEsteAparato({ id: ses.uid, nombre: ses.nombre, figura: figuraActiva(caps) })}>Jugar en este aparato</button>
        </div>
      </div>
    </Marco>
  );
}
