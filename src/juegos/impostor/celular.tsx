// El impostor con eliminación en el celular (Maestro v1.44).
// Arriba: tu figura en su pedestal de color, junto al lector de huella para ver tu palabra.
// En tu turno: un pizarrón para escribir tu palabra (la dices en voz alta). Al final de la vuelta: votar.
import { useEffect, useState } from "react";
import { MAX_PISTA } from "../../engine/partida";
import { Boton, Escaner, Panel } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Escena3D, enEscena, type Momento } from "../../app/figura3d";
import { NombreJugador, Retrato } from "../../pantallas/comun";
import type { Miembro } from "../../servicios/enlace";
import type { MiVista } from "../general/celular";
import { desenlaceImpostor, nombreDe, type Publico } from "../general/texto";
import { RelojTurno } from "../general/RelojTurno";
import "./impostor.css";

type Mandar = (tipo: "contestar" | "carta" | "pista", datos: Record<string, unknown>) => Promise<boolean>;

export function CelularImpostor({ v, mi, miembros, mandar }: { v: Publico; mi: MiVista; miembros: Miembro[]; mandar: Mandar }) {
  const yo = mi.yo, im = v.impostor!;
  const ids = v.jugadores.map(j => j.id);
  const figura = (id: string) => miembros.find(m => m.id === id)?.figura;
  const color = (id: string) => colorDe(id, ids);
  const m = (mi.mio ?? {}) as { rol?: string; palabra?: string; tema?: string; companeros?: string[] };
  const soyImpostor = m.rol === "impostor";
  const fuera = im.eliminados.includes(yo);
  const vivos = ids.filter(id => !im.eliminados.includes(id));
  const clave = `${v.ronda}-${im.etapa}`;
  const [texto, setTexto] = useState(""), [enviado, setEnviado] = useState<string | null>(null), [voto, setVoto] = useState<string | null>(null);
  useEffect(() => { setTexto(""); setEnviado(null); setVoto(null); }, [clave]);
  const meToca = v.fase === "contestando" && im.etapa === "pistas" && v.turnoDe === yo && !v.pausada;
  const yaVote = v.contestaron.includes(yo) || enviado === clave;

  const decir = async () => {
    const t = texto.trim();
    if (!t) return;
    setEnviado(clave);
    if (!(await mandar("pista", { texto: t }))) setEnviado(null);
  };
  const votar = async (id: string) => {
    setVoto(id); setEnviado(clave);
    if (!(await mandar("contestar", { valor: id }))) { setEnviado(null); setVoto(null); }
  };

  // La figura festeja o se lamenta al revelar; sale de escena si la eliminaron.
  const r = (v.revelado ?? {}) as { eliminado?: string | null; fin?: string | null; impostores?: string[] };
  const gane = !!r.fin && (r.fin === "impostores") === soyImpostor;
  const momento: Momento | null = v.fase !== "revelada" ? null : r.fin ? (gane ? "victoria" : "derrota") : r.eliminado === yo ? "derrota" : null;
  const cuadro = (
    <div className="im-yo" style={varsColor(color(yo))}>
      <div className={"im-yo-fig" + (fuera ? " fuera" : "")}>
        <span className="im-pn dsp">{color(yo)?.etiqueta}</span>
        <Escena3D modo="sala" figuras={[{ ...enEscena(yo, figura(yo)), color: color(yo)?.base, columna: 0 }]} columnas={1}
          momentos={momento ? [{ id: yo, cual: momento, n: v.ronda }] : []} className="im-3d" />
        {fuera && <span className="im-sello dsp ol">Fuera</span>}
      </div>
      <Escaner secreto={soyImpostor ? "Eres el impostor" : m.palabra ?? "…"} encabezado={soyImpostor ? "TU PAPEL" : "PALABRA CLASIFICADA"}
        detalle={`Tema: ${m.tema ?? v.carta?.texto ?? ""}${soyImpostor && m.companeros?.length ? ` · Cómplice: ${m.companeros.map(c => nombreDe(v, c)).join(", ")}` : ""}`}
        style={{ minHeight: "100%" }} />
    </div>
  );

  // Fila de quién habla y qué dijo, con su color.
  const ronda = (
    <ol className="im-orden" aria-label="Orden de la vuelta">
      {im.orden.map(id => {
        const dijo = v.pistas[id];
        return (
          <li key={id} className={(v.turnoDe === id && im.etapa === "pistas" ? "turno" : "") + (id === yo ? " yo" : "")} style={varsColor(color(id))}>
            <span className="im-pn dsp">{color(id)?.etiqueta}</span>
            <NombreJugador nombre={nombreDe(v, id)} figura={figura(id)} clase="im-nom" />
            <b className="im-dijo">{dijo ?? (v.turnoDe === id && im.etapa === "pistas" ? "hablando…" : "")}</b>
          </li>
        );
      })}
    </ol>
  );

  let cuerpo: JSX.Element;
  if (v.fase === "revelada") {
    const d = desenlaceImpostor(v);
    cuerpo = (
      <Panel className="im-res a-entra" como="section">
        <span className="a-kick">{r.fin ? "Fin de la partida" : `Vuelta ${v.ronda}`}</span>
        <span className="dsp ol a-t1">{d.titular}</span>
        {d.detalle && <p className="a-suave">{d.detalle}</p>}
        {r.fin && <p className="dsp ol im-gane">{gane ? "¡Ganaste!" : "Perdiste esta"}</p>}
        <p className="a-nota">Llevas {v.puntos[yo] ?? 0} {(v.puntos[yo] ?? 0) === 1 ? "punto" : "puntos"}</p>
      </Panel>
    );
  } else if (v.pausada) {
    cuerpo = <Panel className="im-res"><span className="dsp ol a-t1">En pausa</span><p className="a-suave">El anfitrión detuvo la partida un momento.</p></Panel>;
  } else if (fuera) {
    cuerpo = <Panel className="im-res"><span className="dsp ol a-t2">Saliste de escena</span><p className="a-suave">Ya no hablas ni votas. Mira cómo termina y no digas nada.</p></Panel>;
  } else if (im.etapa === "pistas") {
    cuerpo = meToca ? (
      <form className="im-pizarron a-entra" onSubmit={e => { e.preventDefault(); void decir(); }} style={varsColor(color(yo))}>
        <span className="im-piz-t dsp">¡Te toca! Dila en voz alta y escríbela</span>
        <input className="im-tiza" value={texto} maxLength={MAX_PISTA} onChange={e => setTexto(e.target.value)} placeholder="Tu palabra" aria-label="Tu palabra" autoComplete="off" enterKeyHint="send" disabled={enviado === clave} />
        <Boton color="amarillo" texto={enviado === clave ? "Enviando…" : "¡Ya la dije!"} icono="play" desactivado={!texto.trim()} cargando={enviado === clave} onClick={() => void decir()} />
      </form>
    ) : (
      <div className="im-pizarron espera" style={varsColor(color(v.turnoDe ?? ""))}>
        <span className="im-piz-t dsp">Le toca a</span>
        <span className="im-turno"><Retrato id={v.turnoDe ?? ""} figura={figura(v.turnoDe ?? "")} nombre={nombreDe(v, v.turnoDe)} size={44} /><NombreJugador nombre={nombreDe(v, v.turnoDe)} figura={figura(v.turnoDe ?? "")} /></span>
        <small>{v.pistas[yo] ? `Tú dijiste «${v.pistas[yo]}»` : "Escucha bien y piensa la tuya."}</small>
      </div>
    );
  } else {
    cuerpo = yaVote ? (
      <Panel className="im-res"><span className="a-kick">Tu voto</span><span className="dsp ol a-t2">{voto ? nombreDe(v, voto) : "Enviado"}</span>
        <p className="a-estado" role="status">{v.contestaron.includes(yo) ? "La TV ya lo recibió" : "Enviado…"}</p>
        <p className="a-nota">Faltan {vivos.filter(j => !v.contestaron.includes(j)).length} por votar.</p></Panel>
    ) : (
      <section className="im-votar a-entra" aria-label="Votar">
        <span className="dsp ol a-t2">¿Quién es el impostor?</span>
        <div className="im-sospechosos">
          {vivos.filter(id => id !== yo).map(id => (
            <button key={id} type="button" className="im-sospechoso" style={varsColor(color(id))} onClick={() => void votar(id)}>
              <span className="im-pn dsp">{color(id)?.etiqueta}</span>
              <Retrato id={id} figura={figura(id)} nombre={nombreDe(v, id)} size={64} />
              <NombreJugador nombre={nombreDe(v, id)} figura={figura(id)} />
              {v.pistas[id] && <small>«{v.pistas[id]}»</small>}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="im-cel a-pila" aria-label="El impostor">
      <div className="a-entre"><span className="a-kick">Vuelta {v.ronda} · {im.total} {im.total === 1 ? "impostor" : "impostores"}</span>{im.eliminados.length > 0 && <span className="a-nota">Fuera: {im.eliminados.map(j => nombreDe(v, j)).join(", ")}</span>}<RelojTurno v={v} size="3em" /></div>
      {cuadro}
      {cuerpo}
      {v.fase !== "revelada" && ronda}
    </section>
  );
}
