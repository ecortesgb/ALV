// Lo que dibuja la Pantalla (TV o laptop) durante la ronda. Recibe SOLO la vista pública:
// nunca palabras, papeles ni votos antes de la revelación (la prueba de la frontera lo revisa).
// La carta del turno va enorme al centro (CartaTurno), legible a 4 m.
import type { CSSProperties } from "react";
import { Cartel, Onomatopeya, RuedaSospechosos } from "../../ds";
import { Burbuja, FilaBurbujas } from "../../pantallas/Identidad";
import { colorDe } from "../../app/colorJugador";
import type { Miembro } from "../../servicios/enlace";
import { desenlace, instruccion, nombreDe, nombreJuego, type Publico } from "./texto";
import { TvImpostor } from "../impostor/tv";
import { TvVerdadReto } from "../verdadReto/tv";
import { TvFisico } from "../fisico/tv";
import { ComoJugar, tocaExplicar } from "./ComoJugar";
import { CartaTurno, claveCarta, escalaTexto, selloDe } from "./CartaTurno";
import { GraficaVotos } from "./GraficaVotos";
import { CeremoniaCopas, PodioJuego, esFinalDeJuego } from "./Copas";

const figuraDe = (ms: Miembro[], id: string) => ms.find(m => m.id === id)?.figura;

/** Quién ya contestó, sin decir qué. */
function Esperando({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  if (v.esperados.length < 2) return null;
  return (
    <div className="a-tv-esp" aria-label="Quién ya contestó">
      <FilaBurbujas tamano="2.6em" conNombre gente={v.esperados.map(id => ({ id, nombre: nombreDe(v, id), figura: figuraDe(miembros, id), color: colorDe(id, v.jugadores.map(j => j.id)),
        apagada: !v.contestaron.includes(id), insignia: v.contestaron.includes(id) ? "✓" : undefined }))} />
    </div>
  );
}

export function EscenaTv({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  // «Cómo jugar» encima de la escena hasta que la partida arranca.
  // Copas de la noche: la ceremonia ocupa toda la escena.
  if (v.juegoId === "copas") return <CeremoniaCopas v={v} miembros={miembros} modo="tv" />;
  return <>{tocaExplicar(v) && <ComoJugar v={v} modo="tv" />}<Escena v={v} miembros={miembros} />{esFinalDeJuego(v) && <PodioJuego v={v} miembros={miembros} modo="tv" />}</>;
}

function Escena({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  const revelada = v.fase === "revelada";
  const d = revelada ? desenlace(v) : null;
  const r = (v.revelado ?? {}) as { votos?: Record<string, number>; impostor?: string };

  if (v.motor === "rol-secreto" && v.impostor) return <TvImpostor v={v} miembros={miembros} />;
  if (v.motor === "turnos-cartas" && v.verdadReto) return <TvVerdadReto v={v} miembros={miembros} />;
  if (v.motor === "fisico") return <TvFisico v={v} miembros={miembros} />;
  if (v.motor === "rol-secreto") {
    const personas = v.jugadores.map(j => ({
      id: j.id, nombre: j.nombre, figura: <Burbuja p={{ id: j.id, nombre: j.nombre, figura: figuraDe(miembros, j.id), color: colorDe(j.id, v.jugadores.map(x => x.id)) }} tamano={96} />,
      evidencia: v.pistas[j.id], votos: revelada && r.votos ? r.votos[j.id] ?? 0 : undefined,
    }));
    const habla = revelada ? r.impostor : v.jugadores.find(j => !v.pistas[j.id])?.id;
    return (
      <div className="a-tv-escena">
        <Cartel titulo={nombreJuego(v.juegoId)} sub={d ? d.titular : `Tema: ${v.carta?.texto ?? ""}`} />
        <RuedaSospechosos personas={personas} habla={habla} alto={300} style={{ width: "100%" }} />
        {d?.detalle ? <p className="dsp ol a-tv-detalle">{d.detalle}</p> : <Esperando v={v} miembros={miembros} />}
        {revelada && v.votosDe && <p className="a-tv-votos">{Object.entries(v.votosDe).map(([de, a]) => `${nombreDe(v, de)} → ${nombreDe(v, a)}`).join("   ·   ")}</p>}
      </div>
    );
  }

  // ¿Quién es más probable? al revelar: gráfica de votos con la figura de cada quien (Elías, 27 nov).
  if (v.motor === "senalar" && revelada && d) return (
    <div className="a-tv-escena">
      <Cartel titulo={nombreJuego(v.juegoId)} sub={v.carta?.texto ?? ""} />
      <span className="dsp ol a-tv-t1">{d.titular}</span>
      <GraficaVotos v={v} miembros={miembros} />
      {v.votoSecreto && <p className="a-tv-votos">Voto secreto</p>}
    </div>
  );

  const turno = v.turnoDe && ["turnos-cartas", "botella", "ruleta", "dados", "conteo"].includes(v.motor) ? v.turnoDe : undefined;
  return (
    <div className="a-tv-escena">
      <Cartel titulo={nombreJuego(v.juegoId)} sub={instruccion(v)} />
      <div className="a-tv-centro">
        {turno && <div className="a-tv-turno"><Burbuja p={{ id: turno, nombre: nombreDe(v, turno), figura: figuraDe(miembros, turno), color: colorDe(turno, v.jugadores.map(x => x.id)) }} tamano="5.5em" seleccionada conNombre /></div>}
        {d ? (
          <div className="d-pnl a-tv-carta es-res" key="r">
            <Onomatopeya texto={d.titular.startsWith("¡") ? "¡BOOM!" : "¡ZAS!"} color="var(--rosa-sfx)" tamano="2.4em" giro={-10} style={{ position: "absolute", top: "-.5em", left: "-.3em" }} />
            <span className="dsp ol a-tv-t1">{d.titular}</span>{d.detalle && <span className="a-tv-sub">{d.detalle}</span>}
          </div>
        ) : v.pareja ? (
          // Calificar: lo que escribió cada pareja; ellas marcan en su celular si coinciden.
          <div className="d-pnl a-tv-carta" key="calificar"><div className="a-pila"><span className="dsp ol a-tv-t2">¿Coinciden?</span>
            {v.pareja.parejas.map(([a, b]) => <span key={a} className="a-tv-sub">{nombreDe(v, a)}: «{String((v.seleccion?.textos as Record<string, string> | undefined)?.[a] ?? "")}» · {nombreDe(v, b)}: «{String((v.seleccion?.textos as Record<string, string> | undefined)?.[b] ?? "")}»</span>)}
          </div></div>
        ) : v.motor === "votacion" ? (
          // ¿Qué prefieres?: las dos opciones en la misma carta, A contra B.
          <CartaTurno modo="tv" clave={claveCarta(v)} tono="votacion" sello="¿Qué prefieres?" cartaId={v.carta?.id}>
            <div className="cr-ab" style={{ "--cr-k": Math.min(escalaTexto(v.carta?.texto ?? ""), escalaTexto(v.carta?.opcionB ?? "")) } as CSSProperties}>
              <span className="cr-op a"><i aria-hidden="true">A</i>{v.carta?.texto}</span><span className="cr-o" aria-hidden="true">o</span><span className="cr-op b"><i aria-hidden="true">B</i>{v.carta?.opcionB}</span>
            </div>
          </CartaTurno>
        ) : (
          <CartaTurno modo="tv" clave={claveCarta(v)} tono={selloDe(v).tono} sello={selloDe(v).sello} cartaId={v.carta?.id} detalle={v.motor === "competencia" ? v.carta?.tipo : undefined}
            texto={v.motor === "pareja" ? "¿Cuánto conoces a tu pareja?" : v.carta?.texto ?? "Sin carta para este nivel"} />
        )}
      </div>
      {revelada && v.votosDe ? <p className="a-tv-votos">{Object.entries(v.votosDe).map(([de, a]) => `${nombreDe(v, de)} → ${nombreDe(v, a)}`).join("   ·   ")}</p> : <Esperando v={v} miembros={miembros} />}
    </div>
  );
}
