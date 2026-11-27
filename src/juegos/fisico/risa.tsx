// Juegos de risa de ALV FÍSICO (content/risa.ts) en la TV y en los celulares. Todo lo de la ronda sale en pantalla: a quién le
// toca, la carta (tapada, pública, al revés o a la mitad), el cronómetro, cómo se juega, los puntos y el castigo según el lugar.
// La TV solo usa la vista pública: lo tapado vive en el privado de quien tiene el turno y sale hasta que se destapa.
import { useState } from "react";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Cartel } from "../../ds";
import { Burbuja } from "../../pantallas/Identidad";
import { RISA, castigoRisa, type JuegoRisa } from "../../content/risa";
import type { Miembro } from "../../servicios/enlace";
import { desenlace, nombreDe, nombreJuego, resumenDeltas, type Publico } from "../general/texto";
import { ResultadoHerramienta, selFisico } from "./herramientas";
import "./fisico.css";

type Mandar = (tipo: "contestar" | "carta" | "pista", datos: Record<string, unknown>) => Promise<boolean>;
type Mio = { secreto?: string; respuesta?: string } | undefined;

export const risaDeVista = (v: Pick<Publico, "juegoId">): JuegoRisa | undefined => RISA[v.juegoId];
export const alReves = (t: string) => [...t].reverse().join("");
/** Quien acompaña al del turno (dibuja, maneja): el que sigue en la lista. */
export function segundoVista(v: Publico): string | undefined {
  const i = v.jugadores.findIndex(j => j.id === v.turnoDe);
  return i < 0 || v.jugadores.length < 2 ? undefined : v.jugadores[(i + 1) % v.jugadores.length]!.id;
}
const segs = (ms: number) => (ms / 1000).toFixed(1);
/** Lo destapado: en la ronda, lo que mostró el administrador; al revelar, siempre. */
const destapado = (v: Publico) => (v.fase === "revelada" ? (v.revelado as { oculto?: string } | undefined)?.oculto : selFisico(v).mostrar);

/** «Describe: Ana · Dibuja con los ojos tapados: Luis», o «Juegan todos». */
export function turnoRisa(v: Publico, r: JuegoRisa): string {
  if (!r.turno || !v.turnoDe) return "Juegan todos";
  const otro = r.turno.segundo && segundoVista(v);
  return `${r.turno.rol}: ${nombreDe(v, v.turnoDe)}${otro ? ` · ${r.turno.segundo}: ${nombreDe(v, otro)}` : ""}`;
}

/** Texto tapado en el celular de quien tiene el turno. Cada carta nueva vuelve a salir tapada. */
function Secreto({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [ver, setVer] = useState(false);
  if (!ver) return (
    <button type="button" className="fi-tapada" onClick={() => setVer(true)}>
      <b>{etiqueta} lista</b><small>Que nadie más la vea. Toca para verla.</small>
    </button>
  );
  return <div className="fi-palabra"><b>{texto}</b><button type="button" className="fi-chip" onClick={() => setVer(false)}>Tapar</button></div>;
}

/** La carta de la ronda. `mio`: lo privado de este aparato (texto tapado o la respuesta para el administrador). */
export function CartaRisa({ v, r, mio, grande }: { v: Publico; r: JuegoRisa; mio?: Mio; grande?: boolean }) {
  const c = v.carta, abierto = destapado(v);
  const clase = "fi-reto ri-carta" + (grande ? " grande" : "");
  if (!c) return <div className={clase}><b className="fi-reto-t">Ya no hay cartas para este nivel</b></div>;
  let cuerpo: JSX.Element;
  if (r.muestra === "tapada") {
    cuerpo = abierto ? <b className="fi-reto-t">{abierto}</b>
      : mio?.secreto ? <Secreto key={c.id} texto={mio.secreto} etiqueta={r.etiqueta} />
      : <b className="fi-reto-t ri-oculta">🤫 Solo {nombreDe(v, v.turnoDe ?? "")} la ve en su celular</b>;
  } else if (r.muestra === "reves") {
    cuerpo = <><b className="fi-reto-t ri-reves">{alReves(c.texto)}</b>{abierto && <p className="ri-resp">Respuesta: {abierto}</p>}</>;
  } else if (r.muestra === "mitad") {
    cuerpo = <><b className="fi-reto-t">{c.texto}</b>{abierto && <p className="ri-resp">…{abierto}</p>}</>;
  } else if (r.muestra === "reloj") {
    cuerpo = <><b className="fi-reto-t ri-objetivo">{c.texto}</b><p>Paren su cronómetro en exactamente este tiempo, con los ojos cerrados.</p></>;
  } else if (r.lista) {
    cuerpo = <ul className="ri-lista">{c.texto.split("|").map(x => <li key={x}>{x}</li>)}</ul>;
  } else {
    const prohibidas = c.tipo ? c.tipo.split("|").filter(Boolean) : [];
    cuerpo = <><b className="fi-reto-t">{c.texto}</b>{prohibidas.length > 0 && <p className="ri-prohibidas">Prohibido decir: {prohibidas.join(" · ")}</p>}</>;
  }
  return (
    <div className={clase} key={c.id}>
      <span className="fi-kick">{r.etiqueta}{(selFisico(v).vuelta ?? 1) > 1 ? ` · ${selFisico(v).vuelta}` : ""}</span>
      {cuerpo}
      {/* Solo el administrador ve la respuesta antes de destaparla. */}
      {!abierto && mio?.respuesta && r.muestra === "mitad" && <p className="ri-solo-tu">Respuesta (solo tú): {mio.respuesta}</p>}
    </div>
  );
}

/** Para el reloj: quién ya paró y, cuando terminan todos (o al revelar), la tabla de quién quedó más cerca. */
export function TablaReloj({ v, grande }: { v: Publico; grande?: boolean }) {
  const reloj = selFisico(v).reloj ?? {};
  const objetivo = Number(v.carta?.tipo) * 1000;
  const listos = v.jugadores.filter(j => reloj[j.id] !== undefined);
  const todos = listos.length === v.jugadores.length || v.fase === "revelada";
  if (!todos) return <p className={"fi-nota ri-reloj-esp" + (grande ? " grande" : "")}>Ya pararon: {listos.length ? listos.map(j => j.nombre).join(", ") : "nadie"} ({listos.length} de {v.jugadores.length})</p>;
  if (!Number.isFinite(objetivo)) return null;
  const filas = listos.map(j => ({ j, ms: reloj[j.id]!, dif: Math.abs(reloj[j.id]! - objetivo) })).sort((a, b) => a.dif - b.dif);
  return (
    <ol className={"ri-tabla" + (grande ? " grande" : "")}>
      {filas.map((f, i) => (
        <li key={f.j.id} className={i === 0 ? "cerca" : i === filas.length - 1 && filas.length > 1 ? "lejos" : ""}>
          <b>{f.j.nombre}</b><span>{segs(f.ms)} s</span><small>{f.ms >= objetivo ? "+" : "−"}{segs(f.dif)}</small>
          {i === 0 && <i>Más cerca</i>}{i === filas.length - 1 && filas.length > 1 && <i>Más lejos</i>}
        </li>
      ))}
    </ol>
  );
}

/** Cronómetro a ciegas de este celular: «Empezar», ojos cerrados y «¡Ya!». No enseña el tiempo mientras cuenta. */
function RelojCiego({ v, yo, mandar }: { v: Publico; yo: string; mandar: Mandar }) {
  const [inicio, setInicio] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const mio = selFisico(v).reloj?.[yo];
  if (!v.jugadores.some(j => j.id === yo)) return null;
  if (mio !== undefined) return <p className="fi-nota">Paraste en {segs(mio)} s. Espera a los demás.</p>;
  if (inicio === null) return <button type="button" className="fi-terminar ri-empezar" onClick={() => setInicio(performance.now())}><b>Empezar</b><small>Cierra los ojos y cuenta en silencio</small></button>;
  return (
    <button type="button" className="fi-terminar ri-ya" disabled={enviando} key={v.carta?.id}
      onClick={async () => { setEnviando(true); if (!(await mandar("contestar", { valor: { reloj: Math.min(120_000, Math.round(performance.now() - inicio)) } }))) setEnviando(false); }}>
      <b>¡Ya!</b><small>Contando… tócalo cuando creas que llegaste</small>
    </button>
  );
}

/** Cómo se juega, puntos y castigo. En el celular va plegado. */
export function ReglasRisa({ v, r, plegado }: { v: Publico; r: JuegoRisa; plegado?: boolean }) {
  const castigo = castigoRisa(r, v.lugar ?? "interior");
  const cuerpo = <>
    <ol className="ri-pasos">{r.pasos.map(p => <li key={p}>{p}</li>)}</ol>
    <p className="ri-linea"><b>Puntos:</b> {r.puntos.join(". ")}.</p>
    <p className="ri-linea ri-castigo"><b>Castigo:</b> {castigo}.</p>
  </>;
  if (plegado) return <details className="ri-reglas"><summary>Cómo se juega y castigo</summary>{cuerpo}</details>;
  return <aside className="ri-reglas abierto"><span className="fi-kick">Cómo se juega</span>{cuerpo}</aside>;
}

/** Lo del juego de risa en el celular: turno, carta, controles de quien tiene el turno (o del administrador) y reglas. */
export function RisaCelular({ v, r, yo, mio, soyAdmin, mandar }: { v: Publico; r: JuegoRisa; yo: string; mio: Mio; soyAdmin: boolean; mandar: Mandar }) {
  const enviar = (valor: unknown) => void mandar("contestar", { valor });
  const miTurno = !!r.turno && v.turnoDe === yo;
  const manda = soyAdmin || miTurno;
  const oculto = r.muestra === "tapada" || r.muestra === "mitad" || r.muestra === "reves";
  const siguiente = r.muestra === "reloj" ? null : r.turno && r.segundos <= 10 ? "Siguiente (otra vez 5 s)" : `Siguiente ${r.etiqueta.toLowerCase()}`;
  return (
    <div className="a-pila ri-cel">
      {/* El turno ya lo dice la línea de arriba (instruccion); aquí solo se resalta cuando te toca a ti. */}
      {miTurno && <b className="fi-titular ri-tuyo">Te toca: {r.turno!.rol.toLowerCase()}</b>}
      <CartaRisa v={v} r={r} mio={mio} />
      {r.muestra === "reloj" && <><RelojCiego v={v} yo={yo} mandar={mandar} /><TablaReloj v={v} /></>}
      {manda && v.fase === "contestando" && (
        <div className="ri-ctrl" role="group" aria-label="Controles de la ronda">
          {r.muestra !== "reloj" && <button type="button" className="fi-chip ri-crono" onClick={() => enviar({ herramienta: "cronometro", segundos: Math.max(5, r.segundos) })}>⏱ Cronómetro {r.segundos} s</button>}
          {siguiente && <button type="button" className="fi-chip" onClick={() => enviar({ otro: true })}>{siguiente}</button>}
          {oculto && !selFisico(v).mostrar && <button type="button" className="fi-chip ri-mostrar" onClick={() => enviar({ mostrar: true })}>Mostrar respuesta a todos</button>}
        </div>
      )}
      <ReglasRisa v={v} r={r} plegado />
    </div>
  );
}

/** La TV en un juego de risa: turno, carta grande, cronómetro, reloj a ciegas y, al lado, cómo se juega y el castigo. */
export function TvRisa({ v, r, miembros }: { v: Publico; r: JuegoRisa; miembros: Miembro[] }) {
  const revelada = v.fase === "revelada";
  const d = revelada ? desenlace(v) : null;
  const ronda = resumenDeltas(v, selFisico(v).deltas);
  const ids = v.jugadores.map(j => j.id);
  const gente = r.turno && v.turnoDe ? [v.turnoDe, ...(r.turno.segundo && segundoVista(v) ? [segundoVista(v)!] : [])] : [];
  return (
    <div className="fi fi-tv ri-tv">
      <Cartel titulo={nombreJuego(v.juegoId)} sub={d ? d.titular : turnoRisa(v, r)} />
      <div className="ri-tv-cuerpo">
        <div className="ri-tv-centro">
          {gente.length > 0 && <div className="ri-tv-turno">{gente.map((id, i) => (
            <span key={id} className="ri-tv-quien" style={varsColor(colorDe(id, ids))}>
              <Burbuja p={{ id, nombre: nombreDe(v, id), figura: miembros.find(m => m.id === id)?.figura, color: colorDe(id, ids) }} tamano="4.5em" seleccionada={i === 0} />
              <small>{i === 0 ? r.turno!.rol : r.turno!.segundo}</small>
            </span>
          ))}</div>}
          <CartaRisa v={v} r={r} grande />
          {r.muestra === "reloj" && <TablaReloj v={v} grande />}
          <ResultadoHerramienta v={v} miembros={miembros} grande />
        </div>
        <ReglasRisa v={v} r={r} />
      </div>
      {(d?.detalle || ronda) && <p className="fi-tv-ronda">{d ? d.detalle : ronda}</p>}
    </div>
  );
}
