// Juego físico en la Pantalla (TV o laptop). Solo la vista pública: el reto sugerido, lo que salió de la
// herramienta y los puntos que va dando el administrador en la ronda.
import { Cartel } from "../../ds";
import type { Miembro } from "../../servicios/enlace";
import { desenlace, instruccion, nombreJuego, resumenDeltas, type Publico } from "../general/texto";
import { ResultadoHerramienta, selFisico } from "./herramientas";
import "./fisico.css";

export function TvFisico({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  const revelada = v.fase === "revelada";
  const d = revelada ? desenlace(v) : null;
  const ronda = resumenDeltas(v, selFisico(v).deltas);
  return (
    <div className="fi fi-tv">
      <Cartel titulo={nombreJuego(v.juegoId)} sub={d ? d.titular : instruccion(v)} />
      <div className="fi-tv-centro">
        <div className="fi-reto grande" key={v.carta?.id ?? "sin"}>
          <span className="fi-kick">Reto sugerido</span>
          <b className="fi-reto-t">{v.carta?.texto ?? "Inventen el reto de esta ronda"}</b>
          {v.carta?.tipo && <p>{v.carta.tipo}</p>}
        </div>
        <ResultadoHerramienta v={v} miembros={miembros} grande />
      </div>
      {(d?.detalle || ronda) && <p className="fi-tv-ronda">{d ? d.detalle : ronda}</p>}
    </div>
  );
}
