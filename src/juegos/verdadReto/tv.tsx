// Verdad o reto en la Pantalla (TV o laptop). Recibe SOLO la vista pública: la herramienta de la ronda,
// quién pregunta y quién responde con su color, qué se eligió, la carta (si la dio la app) y el resultado.
// Con la carta en juego, ella manda: va enorme al centro y los lados se hacen chicos (Elías, 28 nov).
import { Cartel, Onomatopeya } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { NombreJugador } from "../../pantallas/comun";
import { Burbuja } from "../../pantallas/Identidad";
import type { Miembro } from "../../servicios/enlace";
import { desenlace, instruccion, nombreDe, nombreJuego, type Publico } from "../general/texto";
import { CartaTurno, claveCarta } from "../general/CartaTurno";
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
  const conCarta = !!vr.eleccion && (vr.etapa === "calificar" || revelada);
  // Antes era un componente declarado aquí adentro: React lo veía nuevo en cada dibujo y volvía a montar las burbujas.
  const lado = (id: string, rol: string) => (
    <div className={"vr-tv-lado" + (id === vr.responde ? " responde" : "")} style={varsColor(colorDe(id, ids))}>
      <span className="vr-tv-rol dsp ol">{rol}</span>
      <Burbuja p={{ id, nombre: nombreDe(v, id), figura: figura(id), color: colorDe(id, ids) }} tamano={conCarta ? "4.2em" : "6.5em"} seleccionada={id === vr.responde} />
      <span className="vr-tv-nom"><NombreJugador nombre={nombreDe(v, id)} figura={figura(id)} /></span>
    </div>
  );
  const sello = esReto ? "Reto" : "Verdad";
  return (
    <div className="vr-tv">
      <Cartel titulo={nombreJuego(v.juegoId)} sub={d ? d.titular : instruccion(v)} />
      <div className={"vr-tv-centro" + (conCarta ? " con-carta" : "")}>
        {lado(vr.pregunta, "Pregunta")}
        <div className="vr-tv-medio">
          <div className="vr-arriba"><Herramienta v={v} /><RelojTurno v={v} size="5em" /></div>
          {conCarta ? (vr.fuente === "voz"
            ? <CartaTurno modo="tv" clave={claveCarta(v, "voz")} tono="voz" sello={`${sello} · en voz alta`} texto={`🎤 ${nombreDe(v, vr.pregunta)} lo dice en voz alta`} />
            : <CartaTurno modo="tv" clave={claveCarta(v)} tono={esReto ? "reto" : "verdad"} sello={sello} texto={v.carta?.texto ?? ""} cartaId={v.carta?.id} />
          ) : vr.eleccion ? (
            <div className={"vr-tv-carta" + (esReto ? " reto" : " verdad")} key={`${v.ronda}-${vr.etapa}`}>
              <span className="vr-sello dsp ol">{sello}</span>
              <p className="vr-tv-espera">{nombreDe(v, vr.pregunta)} prepara {esReto ? "el reto" : "la pregunta"}…</p>
            </div>
          ) : !revelada && <div className="vr-tv-carta"><span className="vr-sello dsp ol">¿Verdad o reto?</span><p className="vr-tv-espera">{nombreDe(v, vr.responde)} está eligiendo…</p></div>}
        </div>
        {lado(vr.responde, "Responde")}
      </div>
      {revelada && d && <p className="dsp ol vr-tv-res">{d.detalle}</p>}
      {/* Arriba a la derecha: en medio tapaba la carta. */}
      {revelada && d?.titular.startsWith("¡") && <Onomatopeya texto="¡BIEN!" color="var(--amarillo)" tamano="4em" giro={-8} style={{ position: "absolute", top: "-.4em", right: "6%", zIndex: 5, pointerEvents: "none" }} />}
    </div>
  );
}
