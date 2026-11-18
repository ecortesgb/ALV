// Lo que dibuja la Pantalla (TV o laptop) durante la ronda. Recibe SOLO la vista pública:
// nunca palabras, papeles ni votos antes de la revelación (la prueba de la frontera lo revisa).
import { Cartel, Chip, Onomatopeya, RuedaSospechosos } from "../../ds";
import { NombreJugador, Retrato } from "../../pantallas/comun";
import type { Miembro } from "../../servicios/enlace";
import { desenlace, instruccion, nombreDe, nombreJuego, type Publico } from "./texto";

const figuraDe = (ms: Miembro[], id: string) => ms.find(m => m.id === id)?.figura;

/** Quién ya contestó, sin decir qué. */
function Esperando({ v }: { v: Publico }) {
  if (v.esperados.length < 2) return null;
  return (
    <div className="a-tv-esp" aria-label="Quién ya contestó">
      {v.esperados.map(id => <Chip key={id} texto={nombreDe(v, id)} icono={v.contestaron.includes(id) ? "star" : "clock"} seleccionado={v.contestaron.includes(id)} />)}
    </div>
  );
}

export function EscenaTv({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  const revelada = v.fase === "revelada";
  const d = revelada ? desenlace(v) : null;
  const r = (v.revelado ?? {}) as { votos?: Record<string, number>; impostor?: string };

  if (v.motor === "rol-secreto") {
    const personas = v.jugadores.map(j => ({
      id: j.id, nombre: j.nombre, figura: <Retrato id={j.id} figura={figuraDe(miembros, j.id)} nombre={j.nombre} size={96} />,
      evidencia: v.pistas[j.id], votos: revelada && r.votos ? r.votos[j.id] ?? 0 : undefined,
    }));
    const habla = revelada ? r.impostor : v.jugadores.find(j => !v.pistas[j.id])?.id;
    return (
      <div className="a-tv-escena">
        <Cartel titulo={nombreJuego(v.juegoId)} sub={d ? d.titular : `Tema: ${v.carta?.texto ?? ""}`} />
        <RuedaSospechosos personas={personas} habla={habla} alto={300} style={{ width: "100%" }} />
        {d?.detalle ? <p className="dsp ol a-tv-detalle">{d.detalle}</p> : <Esperando v={v} />}
        {revelada && v.votosDe && <p className="a-tv-votos">{Object.entries(v.votosDe).map(([de, a]) => `${nombreDe(v, de)} → ${nombreDe(v, a)}`).join("   ·   ")}</p>}
      </div>
    );
  }

  const turno = v.turnoDe && ["turnos-cartas", "botella", "ruleta", "dados", "conteo"].includes(v.motor) ? v.turnoDe : undefined;
  return (
    <div className="a-tv-escena">
      <Cartel titulo={nombreJuego(v.juegoId)} sub={instruccion(v)} />
      <div className="a-tv-centro">
        {turno && <div className="a-tv-turno"><Retrato id={turno} figura={figuraDe(miembros, turno)} nombre={nombreDe(v, turno)} size={132} /><span className="d-lbl"><NombreJugador nombre={nombreDe(v, turno)} figura={figuraDe(miembros, turno)} clase="" /></span></div>}
        <div className={"d-pnl a-tv-carta" + (revelada ? " es-res" : "")} key={revelada ? "r" : v.carta?.id}>
          {d ? <>
            <Onomatopeya texto={d.titular.startsWith("¡") ? "¡BOOM!" : "¡ZAS!"} color="var(--rosa-sfx)" tamano="2.4em" giro={-10} style={{ position: "absolute", top: "-.5em", left: "-.3em" }} />
            <span className="dsp ol a-tv-t1">{d.titular}</span>{d.detalle && <span className="a-tv-sub">{d.detalle}</span>}
          </> : v.motor === "votacion" ? (
            <div className="a-tv-ab"><span className="dsp ol a-tv-t2">{v.carta?.texto}</span><span className="d-lbl">o</span><span className="dsp ol a-tv-t2">{v.carta?.opcionB}</span></div>
          ) : <span className="dsp ol a-tv-t1">{v.motor === "pareja" ? "¿Cuánto conoces a tu pareja?" : v.carta?.texto ?? "Sin carta para este nivel"}</span>}
        </div>
      </div>
      {revelada && v.votosDe ? <p className="a-tv-votos">{Object.entries(v.votosDe).map(([de, a]) => `${nombreDe(v, de)} → ${nombreDe(v, a)}`).join("   ·   ")}</p> : <Esperando v={v} />}
    </div>
  );
}
