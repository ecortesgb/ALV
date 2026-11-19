// Verdad o reto en el celular (Maestro 6A.6 B y 6A.11 C4, C13).
// Quien responde elige Verdad o Reto (Verdad solo una vez). Quien pregunta decide si la app da la carta o la dice en
// voz alta, y luego califica: cumplió o tomó. Con un comodín, quien responde pasa sin tomar.
import { CARTAS_PODER } from "../../content/catalogo";
import { VR_PUNTOS } from "../../engine/partida";
import { Panel } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { NombreJugador, Retrato } from "../../pantallas/comun";
import type { Miembro } from "../../servicios/enlace";
import type { MiVista } from "../general/celular";
import { desenlace, nombreDe, type Publico } from "../general/texto";
import { Herramienta } from "./herramienta";
import { RelojTurno } from "../general/RelojTurno";
import "./verdadReto.css";

type Mandar = (tipo: "contestar" | "carta" | "pista", datos: Record<string, unknown>) => Promise<boolean>;

export function CelularVerdadReto({ v, mi, miembros, mandar }: { v: Publico; mi: MiVista; miembros: Miembro[]; mandar: Mandar }) {
  const yo = mi.yo, vr = v.verdadReto!;
  const ids = v.jugadores.map(j => j.id);
  const figura = (id: string) => miembros.find(m => m.id === id)?.figura;
  const Persona = ({ id, size = 40 }: { id: string; size?: number }) => (
    <span className="vr-persona" style={varsColor(colorDe(id, ids))}>
      <span className="vr-pn dsp">{colorDe(id, ids)?.etiqueta}</span>
      <Retrato id={id} figura={figura(id)} nombre={nombreDe(v, id)} size={size} />
      <NombreJugador nombre={nombreDe(v, id)} figura={figura(id)} clase="" />
    </span>
  );
  const soyResponde = vr.responde === yo, soyPregunta = vr.pregunta === yo;
  const yaUseVerdad = vr.verdadUsada.includes(yo);
  const esReto = vr.eleccion === "reto";
  const contestar = (valor: unknown) => void mandar("contestar", { valor });

  // Comodines de quien responde: pasar (Escudo o Pasa turno) y cambiar la carta (solo si la dio la app).
  const comodines = soyResponde && v.fase === "contestando" && vr.etapa !== "listo" ? mi.miMano.filter(c => c === "escudo" || c === "turno" || (c === "cambio" && vr.etapa === "calificar" && vr.fuente === "app")) : [];
  const barraComodines = comodines.length > 0 && (
    <div className="vr-comodines" aria-label="Tus comodines">
      <span className="a-kick">Comodín</span>
      {comodines.map((c, i) => {
        const d = CARTAS_PODER.find(x => x.id === c);
        return <button key={c + i} type="button" className="vr-comodin" title={d?.efecto} onClick={() => void mandar("carta", { carta: c })}>{c === "cambio" ? "🔄" : "🛡️"} {d?.nombre ?? c}</button>;
      })}
    </div>
  );

  let cuerpo: JSX.Element;
  if (v.fase === "revelada") {
    const d = desenlace(v);
    cuerpo = <Panel className="vr-res a-entra" como="section"><span className="a-kick">Resultado</span><span className="dsp ol a-t1">{d.titular}</span>{d.detalle && <p className="a-suave">{d.detalle}</p>}<p className="a-nota">Llevas {v.puntos[yo] ?? 0} {(v.puntos[yo] ?? 0) === 1 ? "punto" : "puntos"}</p></Panel>;
  } else if (v.pausada) {
    cuerpo = <Panel className="vr-res"><span className="dsp ol a-t1">En pausa</span><p className="a-suave">El anfitrión detuvo la partida un momento.</p></Panel>;
  } else if (vr.etapa === "elegir") {
    cuerpo = soyResponde ? (
      <section className="vr-elegir a-entra" aria-label="Elige verdad o reto">
        <span className="dsp ol a-t2">¿Verdad o reto?</span>
        <div className="vr-dos">
          <button type="button" className="vr-opcion verdad" disabled={yaUseVerdad} onClick={() => contestar({ elige: "verdad" })}>
            <span className="vr-op-ico" aria-hidden="true">🗣️</span><b className="dsp ol">Verdad</b><small>{yaUseVerdad ? "Ya usaste tu verdad" : `Contesta una pregunta · +${VR_PUNTOS.verdad}`}</small>
          </button>
          <button type="button" className="vr-opcion reto" onClick={() => contestar({ elige: "reto" })}>
            <span className="vr-op-ico" aria-hidden="true">🔥</span><b className="dsp ol">Reto</b><small>Haz una actividad · +{VR_PUNTOS.reto}</small>
          </button>
        </div>
        <p className="a-nota">Solo puedes elegir Verdad una vez en toda la partida.</p>
      </section>
    ) : <Panel className="vr-espera"><span className="a-kick">{soyPregunta ? "Tú preguntas" : "Le toca a"}</span><Persona id={vr.responde} size={56} /><p className="a-suave">Está eligiendo verdad o reto…</p></Panel>;
  } else if (vr.etapa === "fuente") {
    cuerpo = soyPregunta ? (
      <section className="vr-fuente a-entra" aria-label="Quién pone la pregunta">
        <span className={"vr-sello dsp ol " + (esReto ? "reto" : "verdad")}>{esReto ? "Reto" : "Verdad"}</span>
        <span className="dsp ol a-t2">{esReto ? "¿Quién pone el reto?" : "¿Quién pone la pregunta?"}</span>
        <p className="a-suave">Para <b>{nombreDe(v, vr.responde)}</b>.</p>
        <div className="vr-dos">
          <button type="button" className="vr-opcion app" onClick={() => contestar({ fuente: "app" })}><span className="vr-op-ico" aria-hidden="true">💡</span><b className="dsp ol">Que ALV me dé una</b><small>Sale en la pantalla</small></button>
          <button type="button" className="vr-opcion voz" onClick={() => contestar({ fuente: "voz" })}><span className="vr-op-ico" aria-hidden="true">🎤</span><b className="dsp ol">La digo yo</b><small>En voz alta, de mi cabeza</small></button>
        </div>
      </section>
    ) : <Panel className="vr-espera"><span className={"vr-sello dsp ol " + (esReto ? "reto" : "verdad")}>{esReto ? "Reto" : "Verdad"}</span><p className="a-suave"><b>{nombreDe(v, vr.pregunta)}</b> está preparando {esReto ? "el reto" : "la pregunta"}…</p></Panel>;
  } else if (vr.etapa === "calificar") {
    const carta = vr.fuente === "app" ? <p className="vr-carta">{v.carta?.texto ?? "Sin carta para este nivel"}</p> : <p className="vr-carta voz">🎤 {nombreDe(v, vr.pregunta)} lo dice en voz alta</p>;
    cuerpo = (
      <section className="vr-calificar a-entra" aria-label="Calificar">
        <span className={"vr-sello dsp ol " + (esReto ? "reto" : "verdad")}>{esReto ? "Reto" : "Verdad"}</span>
        {carta}
        {soyPregunta ? <>
          <span className="a-kick">¿Qué hizo {nombreDe(v, vr.responde)}?</span>
          <div className="vr-dos">
            <button type="button" className="vr-opcion cumplio" onClick={() => contestar("cumplio")}><span className="vr-op-ico" aria-hidden="true">✅</span><b className="dsp ol">{esReto ? "¡Lo cumplió!" : "¡Respondió!"}</b><small>+{esReto ? VR_PUNTOS.reto : VR_PUNTOS.verdad}</small></button>
            <button type="button" className="vr-opcion tomo" onClick={() => contestar("tomo")}><span className="vr-op-ico" aria-hidden="true">🥤</span><b className="dsp ol">Tomó</b><small>+{VR_PUNTOS.tomar} · lo que cada quien quiera</small></button>
          </div>
        </> : soyResponde ? <p className="a-suave">{esReto ? "Haz el reto" : "Responde"} o toma algo (lo que tú quieras). <b>{nombreDe(v, vr.pregunta)}</b> califica.</p>
          : <p className="a-suave"><b>{nombreDe(v, vr.pregunta)}</b> califica a <b>{nombreDe(v, vr.responde)}</b>.</p>}
      </section>
    );
  } else {
    cuerpo = <Panel className="vr-espera"><p className="a-suave"><b>{nombreDe(v, vr.responde)}</b> pasó con un comodín.</p></Panel>;
  }

  return (
    <section className="vr-cel a-pila" aria-label="Verdad o reto">
      <div className="vr-arriba"><Herramienta v={v} chica /><RelojTurno v={v} /></div>
      <div className="vr-duelo">
        <div><span className="a-kick">Pregunta</span><Persona id={vr.pregunta} /></div>
        <span className="vr-flecha" aria-hidden="true">➜</span>
        <div><span className="a-kick">Responde</span><Persona id={vr.responde} /></div>
      </div>
      {cuerpo}
      {barraComodines}
    </section>
  );
}
