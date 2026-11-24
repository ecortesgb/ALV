// Juego físico en el celular. El administrador (quien tiene el control) da y quita puntos, usa herramientas,
// cambia el reto sugerido y termina la ronda. Los demás ven el reto, la herramienta y sus puntos.
import { useState, type CSSProperties } from "react";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Burbuja } from "../../pantallas/Identidad";
import { ArteCfg } from "../../pantallas/TarjetasConfig";
import type { Miembro } from "../../servicios/enlace";
import { desenlace, instruccion, nombreDe, resumenDeltas, type Publico } from "../general/texto";
import type { MiVista } from "../general/celular";
import { HERR_FISICO, ResultadoHerramienta, selFisico } from "./herramientas";
import type { HerramientaFisico } from "../../engine/partida";
import "./fisico.css";

type Mandar = (tipo: "contestar" | "carta" | "pista", datos: Record<string, unknown>) => Promise<boolean>;
const PASOS = [-1, 1, 2, 3];
const TIEMPOS = [30, 60, 120];

export function CelularFisico({ v, mi, miembros, mandar }: { v: Publico; mi: MiVista; miembros: Miembro[]; mandar: Mandar }) {
  const yo = mi.yo;
  const soyAdmin = v.esperados.includes(yo);
  const ids = v.jugadores.map(j => j.id);
  const s = selFisico(v);
  const [cerrando, setCerrando] = useState(false);
  const enviar = (valor: unknown) => mandar("contestar", { valor });
  const figura = (id: string) => miembros.find(m => m.id === id)?.figura;

  const reto = (
    <div className="fi-reto">
      <span className="fi-kick">Reto sugerido</span>
      <b className="fi-reto-t">{v.carta?.texto ?? "Inventen el reto de esta ronda"}</b>
      {v.carta?.tipo && <p>{v.carta.tipo}</p>}
      {soyAdmin && v.fase === "contestando" && <button type="button" className="fi-chip" onClick={() => void enviar({ otro: true })}>Otro reto</button>}
    </div>
  );

  if (v.fase === "revelada") {
    const d = desenlace(v);
    return (
      <section className="fi fi-cel a-entra">
        <span className="fi-kick">Resultado de la ronda {v.ronda}</span>
        <b className="fi-titular">{d.titular}</b>
        {d.detalle && <p className="fi-detalle">{d.detalle}</p>}
        <p className="fi-nota">Llevas {v.puntos[yo] ?? 0} {(v.puntos[yo] ?? 0) === 1 ? "punto" : "puntos"}.{soyAdmin ? " Toca «Siguiente ronda» para seguir." : ""}</p>
      </section>
    );
  }
  if (v.pausada) return <section className="fi fi-cel"><b className="fi-titular">En pausa</b><p className="fi-nota">El administrador detuvo la partida un momento.</p></section>;

  if (!soyAdmin) {
    const mio = s.deltas[yo] ?? 0;
    return (
      <section className="fi fi-cel a-entra">
        <span className="fi-kick">{instruccion(v)}</span>
        {reto}
        <ResultadoHerramienta v={v} miembros={miembros} />
        <div className="fi-mio">
          <span>Tus puntos</span><b>{v.puntos[yo] ?? 0}</b>
          {mio !== 0 && <i className={mio > 0 ? "sube" : "baja"}>{mio > 0 ? "+" : "−"}{Math.abs(mio)} esta ronda</i>}
        </div>
      </section>
    );
  }

  // Administrador: herramientas, puntos por jugador (o por grupo) y terminar la ronda.
  const Fila = ({ id }: { id: string }) => {
    const c = colorDe(id, ids), d = s.deltas[id] ?? 0;
    return (
      <li className="fi-fila" style={varsColor(c)}>
        <Burbuja p={{ id, nombre: nombreDe(v, id), figura: figura(id), color: c }} tamano={40} />
        <span className="fi-nom">{nombreDe(v, id)}<small>{v.puntos[id] ?? 0} pts{d !== 0 && <i className={d > 0 ? "sube" : "baja"}> {d > 0 ? "+" : "−"}{Math.abs(d)}</i>}</small></span>
        <span className="fi-pasos">{PASOS.map(x => (
          <button key={x} type="button" className={"fi-paso" + (x < 0 ? " menos" : "")} onClick={() => void enviar({ puntos: { jugador: id, delta: x } })} aria-label={`${x > 0 ? "Dar" : "Quitar"} ${Math.abs(x)} a ${nombreDe(v, id)}`}>{x > 0 ? `+${x}` : `−${-x}`}</button>
        ))}</span>
      </li>
    );
  };
  // Orden fijo (A, B… o p1, p2…): si se ordenaran por puntos, los botones saltarían mientras el administrador toca.
  const grupos = v.grupos?.length ? [...v.grupos].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })) : null;
  const herramienta = (tipo: HerramientaFisico, segundos?: number) => void enviar({ herramienta: tipo, ...(segundos ? { segundos } : {}) });
  const resumen = resumenDeltas(v, s.deltas);
  return (
    <section className="fi fi-cel fi-admin a-entra">
      <span className="fi-kick">Ronda {v.ronda} de {v.totalRondas} · tú das los puntos</span>
      {reto}
      <div className="fi-herrs" role="group" aria-label="Herramientas">
        {(["dados", "ruleta", "carta", "orden"] as const).map(t => (
          <button key={t} type="button" className="fi-herr" onClick={() => herramienta(t)}><ArteCfg nombre={HERR_FISICO[t].icono} className="fi-herr-ico" /><span>{HERR_FISICO[t].nombre}</span></button>
        ))}
        <div className="fi-herr fi-herr-crono"><ArteCfg nombre="herr-tiempo" className="fi-herr-ico" /><span className="fi-crono-ops">{TIEMPOS.map(t => (
          <button key={t} type="button" onClick={() => herramienta("cronometro", t)} aria-label={`Cronómetro de ${t} segundos`}>{t < 60 ? `${t} s` : `${t / 60} min`}</button>
        ))}</span></div>
      </div>
      <ResultadoHerramienta v={v} miembros={miembros} />
      {grupos ? grupos.map(g => (
        <div key={g.id} className="fi-grupo" style={{ "--n": g.jugadores.length } as CSSProperties}>
          <div className="fi-grupo-cab"><b>{g.nombre}</b><span>{g.puntos} pts</span>
            <button type="button" className="fi-chip" onClick={() => { for (const j of g.jugadores) void enviar({ puntos: { jugador: j, delta: 1 } }); }}>+1 a cada quien</button></div>
          <ul className="fi-lista">{g.jugadores.map(id => <Fila key={id} id={id} />)}</ul>
        </div>
      )) : <ul className="fi-lista">{ids.map(id => <Fila key={id} id={id} />)}</ul>}
      <button type="button" className="fi-terminar" disabled={cerrando} onClick={async () => { setCerrando(true); if (!(await enviar("listo"))) setCerrando(false); }}>
        <b>{cerrando ? "Cerrando…" : "Terminar ronda"}</b><small>{resumen || "Nadie lleva puntos en esta ronda"}</small>
      </button>
    </section>
  );
}
