// Verdad o reto en la Pantalla (TV o laptop). Recibe SOLO la vista pública: la herramienta de la ronda,
// quién pregunta y quién responde con su color, qué se eligió, la carta (si la dio la app) y el resultado.
import { Cartel, Onomatopeya } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { NombreJugador, Retrato } from "../../pantallas/comun";
import type { Miembro } from "../../servicios/enlace";
import { desenlace, instruccion, nombreDe, nombreJuego, type Publico } from "../general/texto";
import { Herramienta } from "./herramienta";
import { RelojTurno } from "../general/RelojTurno";
import "./verdadReto.css";

export function TvVerdadReto({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  const vr = v.verdadReto!;
  const ids = v.jugadores.map(j => j.id);
  const figura = (id: string) => miembros.find(m => m.id === id)?.figura;
  const revelada = v.fase === "revelada";
  const d = revelada ? desenlace(v) : null;
  const esReto = vr.eleccion === "reto";
  const Lado = ({ id, rol }: { id: string; rol: string }) => (
    <div className={"vr-tv-lado" + (id === vr.responde ? " responde" : "")} style={varsColor(colorDe(id, ids))}>
      <span className="vr-tv-rol dsp ol">{rol}</span>
      <Retrato id={id} figura={figura(id)} nombre={nombreDe(v, id)} size={150} />
      <span className="vr-tv-nom"><span className="vr-pn dsp">{colorDe(id, ids)?.etiqueta}</span><NombreJugador nombre={nombreDe(v, id)} figura={figura(id)} /></span>
    </div>
  );
  return (
    <div className="vr-tv">
      <Cartel titulo={nombreJuego(v.juegoId)} sub={d ? d.titular : instruccion(v)} />
      <div className="vr-tv-centro">
        <Lado id={vr.pregunta} rol="Pregunta" />
        <div className="vr-tv-medio">
          <div className="vr-arriba"><Herramienta v={v} /><RelojTurno v={v} size="5em" /></div>
          {vr.eleccion ? (
            <div className={"vr-tv-carta" + (esReto ? " reto" : " verdad")} key={`${v.ronda}-${vr.etapa}`}>
              <span className="vr-sello dsp ol">{esReto ? "Reto" : "Verdad"}</span>
              {vr.etapa === "calificar" || revelada
                ? <p>{vr.fuente === "voz" ? `🎤 ${nombreDe(v, vr.pregunta)} lo dice en voz alta` : v.carta?.texto ?? ""}</p>
                : <p className="vr-tv-espera">{nombreDe(v, vr.pregunta)} prepara {esReto ? "el reto" : "la pregunta"}…</p>}
            </div>
          ) : !revelada && <div className="vr-tv-carta"><span className="vr-sello dsp ol">¿Verdad o reto?</span><p className="vr-tv-espera">{nombreDe(v, vr.responde)} está eligiendo…</p></div>}
        </div>
        <Lado id={vr.responde} rol="Responde" />
      </div>
      {revelada && d && <p className="dsp ol vr-tv-res">{d.detalle}</p>}
      {revelada && d?.titular.startsWith("¡") && <Onomatopeya texto="¡BIEN!" color="var(--amarillo)" tamano="4em" giro={-8} style={{ position: "absolute", top: "40%", left: "50%", translate: "-50% 0", zIndex: 5, pointerEvents: "none" }} />}
    </div>
  );
}
