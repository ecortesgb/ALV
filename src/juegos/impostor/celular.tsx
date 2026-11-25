// El impostor con eliminación en el celular (Maestro v1.44).
// Arriba: tu figura en su pedestal de color, junto al lector de huella para ver tu palabra.
// En tu turno: un pizarrón para escribir tu palabra (la dices en voz alta). Al final de la vuelta: votar.
import { useEffect, useRef, useState } from "react";
import { MAX_PISTA, SALTAR_VOTO } from "../../engine/partida";
import { Boton, Escaner, Panel } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Escena3D, enEscena, type Momento } from "../../app/figura3d";
import { NombreJugador } from "../../pantallas/comun";
import { AnilloBurbujas, Burbuja, ElegirEnAnillo } from "../../pantallas/Identidad";
import type { Miembro } from "../../servicios/enlace";
import type { MiVista } from "../general/celular";
import { desenlaceImpostor, nombreDe, type Publico } from "../general/texto";
import { RelojTurno } from "../general/RelojTurno";
import { CastigosNave, ExpulsionNave, FinNave, TableroVotos, VictoriaNave, arteNave, esNave, revNave, usePasoExpulsion } from "./nave";
import { Posiciones } from "../general/Copas";
import { AnuncioDiscusion, useAnuncioDiscusion } from "./papelNave";
import { HistorialPalabras, MesaPalabras, PizarraVotos } from "./mesaNave";
import "./impostor.css";

type Mandar = (tipo: "contestar" | "carta" | "pista", datos: Record<string, unknown>) => Promise<boolean>;

export function CelularImpostor({ v, mi, miembros, mandar }: { v: Publico; mi: MiVista; miembros: Miembro[]; mandar: Mandar }) {
  const yo = mi.yo, im = v.impostor!;
  const ids = v.jugadores.map(j => j.id);
  const figura = (id: string) => miembros.find(m => m.id === id)?.figura;
  const color = (id: string) => colorDe(id, ids);
  const m = (mi.mio ?? {}) as { rol?: string; palabra?: string; tema?: string; companeros?: string[]; pista?: string };
  // Papeles en la mesa (Elías, 24 nov): tablero con la palabra de cada quien y el aviso «¡A discutir!».
  const sala = !!im.palabras;
  const anuncio = useAnuncioDiscusion(v);
  const soyImpostor = m.rol === "impostor";
  const fuera = im.eliminados.includes(yo);
  const vivos = ids.filter(id => !im.eliminados.includes(id));
  const clave = `${v.ronda}-${im.etapa}`;
  const [texto, setTexto] = useState(""), [enviado, setEnviado] = useState<string | null>(null), [voto, setVoto] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [verVueltas, setVerVueltas] = useState(false);
  useEffect(() => { setTexto(""); setEnviado(null); setVoto(null); setSel(null); }, [clave]);
  const meToca = v.fase === "contestando" && im.etapa === "pistas" && v.turnoDe === yo && !v.pausada;
  const nave = esNave(v);
  const [paso, saltarVictoria] = usePasoExpulsion(v);
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

  // Papeles en la mesa, durante la vuelta y la votación (Elías, 24 nov): una sola pantalla. Al centro el tablero con la
  // palabra de cada quien (también es donde se vota); arriba tu palabra con la huella; abajo lo que te toca hacer.
  // Al revelar, con papeles (Elías, 24 nov): primero la expulsión a pantalla completa; luego, si la partida sigue, quién
  // salió y el tablero con los votos; si acabó, el final en páginas que se deslizan (resultado, castigo, posiciones).
  if (sala && v.fase === "revelada") {
    const rv = revNave(v);
    const capa = paso === "vuela" ? <ExpulsionNave v={v} miembros={miembros} modo="celular" />
      : paso === "victoria" ? <VictoriaNave v={v} miembros={miembros} modo="celular" alSaltar={saltarVictoria} /> : null;
    const puntos = v.puntos[yo] ?? 0;
    if (rv.fin) {
      const gano = (rv.fin === "impostores") === soyImpostor;
      const paginas: { id: string; titulo: string; cuerpo: JSX.Element }[] = [
        { id: "res", titulo: "Resultado", cuerpo: <><FinNave v={v} miembros={miembros} modo="celular" yo={yo} sinCastigos /><p className={"nv-gane dsp" + (gano ? " si" : "")}>{gano ? "¡Ganaste!" : "Perdiste esta"} <small>· {puntos} {puntos === 1 ? "punto" : "puntos"}</small></p></> },
      ];
      if (Object.keys(rv.castigos ?? {}).length) paginas.push({ id: "cas", titulo: "Castigo", cuerpo: <CastigosNave v={v} miembros={miembros} modo="celular" yo={yo} /> });
      paginas.push({ id: "pos", titulo: "Posiciones", cuerpo: <Posiciones v={v} miembros={miembros} /> });
      return (
        <section className="im-cel nv-cel nv-cel-fin" aria-label="Final de El impostor" style={{ "--espacio": arteNave("espacio") } as React.CSSProperties}>
          <PaginasFin paginas={paginas} />
          {capa}
        </section>
      );
    }
    const sale = rv.eliminado ? { id: rv.eliminado, nombre: nombreDe(v, rv.eliminado), figura: figura(rv.eliminado), color: color(rv.eliminado) } : null;
    const d = desenlaceImpostor(v);
    // El titular ya dice si era impostor; la etiqueta solo cuando es secreto.
    const marca = sale && rv.secreto ? "¿Quién sabe?" : null;
    return (
      <section className="im-cel nv-cel" aria-label="El impostor" style={{ "--espacio": arteNave("espacio") } as React.CSSProperties}>
        <div className={"nv-salio" + (rv.eraImpostor && !rv.secreto ? " imp" : "")}>
          {sale ? <Burbuja p={{ ...sale, apagada: true }} tamano="2.8em" /> : <span className="nv-nadie grande" aria-hidden="true" style={{ "--arte": arteNave("boton-saltar") } as React.CSSProperties} />}
          <span className="nv-salio-txt">
            <b className="dsp">{d.titular}</b>
            {marca ? <span className={"nv-marca dsp" + (rv.eraImpostor && !rv.secreto ? " imp" : "")}>{marca}</span> : d.detalle && <small>{d.detalle}</small>}
          </span>
        </div>
        <TableroVotos v={v} miembros={miembros} compacto yo={yo} />
        <p className="nv-accion nv-ac-t dsp">Llevas {puntos} {puntos === 1 ? "punto" : "puntos"}
          <small>{rv.quedan != null && !rv.secreto ? (rv.quedan === 1 ? "Queda 1 impostor. " : `Quedan ${rv.quedan} impostores. `) : ""}El anfitrión pasa a la siguiente vuelta.</small></p>
        {capa}
      </section>
    );
  }

  if (sala && v.fase !== "revelada") {
    const enVoto = im.etapa === "votar" && !fuera && !yaVote && !v.pausada;
    const nombreSel = sel === SALTAR_VOTO ? "Nadie" : sel ? nombreDe(v, sel) : null;
    const quien = v.turnoDe ?? "";
    let accion: JSX.Element;
    if (v.pausada) accion = <p className="nv-ac-t dsp">En pausa <small>El anfitrión detuvo la partida un momento.</small></p>;
    else if (fuera) accion = <p className="nv-ac-t dsp">Saliste de la nave <small>Ya no hablas ni votas. No digas nada hasta el final.</small></p>;
    else if (im.etapa === "pistas" && meToca) accion = (
      <form className="nv-ac-turno" onSubmit={e => { e.preventDefault(); void decir(); }}>
        <span className="nv-ac-k">¡Te toca! Dila en voz alta y escríbela</span>
        <span className="nv-ac-fila">
          <input className="nv-ac-input" value={texto} maxLength={MAX_PISTA} onChange={e => setTexto(e.target.value)} placeholder="Tu palabra" aria-label="Tu palabra" autoComplete="off" enterKeyHint="send" disabled={enviado === clave} />
          <button type="submit" className="lb-listo nv-ac-btn" disabled={!texto.trim() || enviado === clave}>{enviado === clave ? "…" : "¡Ya la dije!"}</button>
        </span>
      </form>
    );
    else if (im.etapa === "pistas") accion = (
      <div className="nv-ac-espera">
        <Burbuja p={{ id: quien, nombre: nombreDe(v, quien), figura: figura(quien), color: color(quien) }} tamano="2.6em" seleccionada />
        <span><span className="nv-ac-k">Le toca a</span><b className="dsp">{nombreDe(v, quien)}</b></span>
        <small>{v.pistas[yo] ? `Tú dijiste «${v.pistas[yo]}»` : "Escucha y piensa la tuya"}</small>
      </div>
    );
    else if (enVoto) accion = (
      <div className="nv-ac-voto">
        <span className="nv-ac-k">{sel ? "¿Seguro?" : "Toca en el tablero quién se baja (o «Nadie»)"}</span>
        <button type="button" className={"nv-ac-votar dsp" + (sel ? " listo" : "")} disabled={!sel} onClick={() => { if (sel) void votar(sel); }}>
          {nombreSel ? <>Votar: <b>{nombreSel}</b></> : "Votar"}
        </button>
      </div>
    );
    else accion = <p className="nv-ac-t dsp">Tu voto: {voto === SALTAR_VOTO ? "Nadie" : voto ? nombreDe(v, voto) : "enviado"}
      <small>Faltan {vivos.filter(j => !v.contestaron.includes(j)).length} por votar. Si hay empate, nadie sale.</small></p>;
    // Mesa con las figuras y sus palabras; al votar, encima se abre la pizarra (Elías, 24 nov).
    const votando = im.etapa === "votar" && !v.pausada;
    const hayVueltas = v.ronda > 1 && Object.values(im.palabras ?? {}).some(p => p.length > 0);
    return (
      <section className={"im-cel nv-cel nm-cel" + (votando ? " votando" : "")} aria-label="El impostor"
        style={{ "--espacio": arteNave("espacio"), "--cuarto": arteNave("nave-cuarto") } as React.CSSProperties}>
        <MesaPalabras v={v} miembros={miembros} yo={yo} />
        <div className="nv-cel-cab">
          <span className="nv-cel-k">{votando ? "¡A votar!" : `Vuelta ${v.ronda}`} · {im.total} {im.total === 1 ? "impostor" : "impostores"}</span>
          <RelojTurno v={v} size="2.4em" />
          <MiPalabra imp={soyImpostor} palabra={m.palabra} tema={m.tema ?? v.carta?.texto ?? ""} pista={m.pista} comp={(m.companeros ?? []).map(c => nombreDe(v, c))} />
          {hayVueltas && <button type="button" className="nm-ver-vueltas" onClick={() => setVerVueltas(true)}>📜 Vueltas</button>}
        </div>
        {votando ? <PizarraVotos v={v} miembros={miembros} yo={yo} sel={sel} alElegir={setSel} puedo={enVoto} miVoto={voto}
            alVotar={() => { if (sel) void votar(sel); }} />
          : <div className="nv-accion" style={varsColor(color(meToca ? yo : quien))}>{accion}</div>}
        {verVueltas && <HistorialPalabras v={v} miembros={miembros} alCerrar={() => setVerVueltas(false)} />}
        {anuncio && <AnuncioDiscusion modo="celular" />}
      </section>
    );
  }

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
        detalle={`Tema: ${m.tema ?? v.carta?.texto ?? ""}${soyImpostor && m.pista ? ` · Pista: ${m.pista}` : ""}${soyImpostor && m.companeros?.length ? ` · Cómplice: ${m.companeros.map(c => nombreDe(v, c)).join(", ")}` : ""}`}
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
  if (v.fase === "revelada" && nave && r.fin && paso !== "vuela") {
    cuerpo = <><FinNave v={v} miembros={miembros} modo="celular" yo={yo} /><p className="dsp ol im-gane" style={{ textAlign: "center" }}>{gane ? "¡Ganaste!" : "Perdiste esta"}</p></>;
  } else if (v.fase === "revelada") {
    const d = desenlaceImpostor(v);
    cuerpo = (
      <Panel className="im-res a-entra" como="section">
        <span className="a-kick">{r.fin ? "Fin de la partida" : `Vuelta ${v.ronda}`}</span>
        <span className="dsp ol a-t1">{d.titular}</span>
        {d.detalle && <p className="a-suave">{d.detalle}</p>}
        {r.fin && <p className="dsp ol im-gane">{gane ? "¡Ganaste!" : "Perdiste esta"}</p>}
        <p className="a-nota">Llevas {v.puntos[yo] ?? 0} {(v.puntos[yo] ?? 0) === 1 ? "punto" : "puntos"}</p>
        {nave && <TableroVotos v={v} miembros={miembros} compacto yo={yo} />}
        {nave && paso === "vuela" && <ExpulsionNave v={v} miembros={miembros} modo="celular" />}
      </Panel>
    );
  } else if (v.pausada) {
    cuerpo = <Panel className="im-res"><span className="dsp ol a-t1">En pausa</span><p className="a-suave">El anfitrión detuvo la partida un momento.</p></Panel>;
  } else if (fuera) {
    cuerpo = nave
      ? <Panel className="im-res"><span className="dsp ol a-t2">Saliste de la nave</span><p className="a-suave">Ya no hablas ni votas. Sabrás quién era el impostor cuando acabe la partida; mientras, no digas nada.</p>{im.etapa === "votar" && <TableroVotos v={v} miembros={miembros} compacto yo={yo} />}</Panel>
      : <Panel className="im-res"><span className="dsp ol a-t2">Saliste de escena</span><p className="a-suave">Ya no hablas ni votas. Mira cómo termina y no digas nada.</p></Panel>;
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
        <span className="im-turno"><Burbuja p={{ id: v.turnoDe ?? "", nombre: nombreDe(v, v.turnoDe), figura: figura(v.turnoDe ?? ""), color: color(v.turnoDe ?? "") }} tamano={48} seleccionada /><NombreJugador nombre={nombreDe(v, v.turnoDe)} figura={figura(v.turnoDe ?? "")} /></span>
        <small>{v.pistas[yo] ? `Tú dijiste «${v.pistas[yo]}»` : "Escucha bien y piensa la tuya."}</small>
      </div>
    );
  } else {
    cuerpo = yaVote ? (
      <Panel className="im-res"><span className="a-kick">Tu voto</span><span className="dsp ol a-t2">{voto === SALTAR_VOTO ? "Nadie, todavía" : voto ? nombreDe(v, voto) : "Enviado"}</span>
        <p className="a-estado" role="status">{v.contestaron.includes(yo) ? (nave ? "Tu voto ya está en la nave" : "La TV ya lo recibió") : "Enviado…"}</p>
        <p className="a-nota">Faltan {vivos.filter(j => !v.contestaron.includes(j)).length} por votar.</p>
        {nave && <TableroVotos v={v} miembros={miembros} compacto yo={yo} />}</Panel>
    ) : nave ? (
      <VotarNave clave={clave} gente={vivos.filter(id => id !== yo).map(id => ({ id, nombre: nombreDe(v, id), figura: figura(id), color: color(id), nota: v.pistas[id] }))} alVotar={id => void votar(id)} />
    ) : (
      <section className="im-votar a-entra" aria-label="Votar">
        {/* Burbujas en anillo con la palabra de cada quien: un toque marca y «Votar» confirma. */}
        <ElegirEnAnillo clave={clave} titulo="¿Quién es el impostor?" confirmar="Votar" alElegir={id => void votar(id)}
          gente={vivos.filter(id => id !== yo).map(id => ({ id, nombre: nombreDe(v, id), figura: figura(id), color: color(id), nota: v.pistas[id] }))} />
      </section>
    );
  }

  return (
    <section className="im-cel a-pila" aria-label="El impostor">
      <div className="a-entre"><span className="a-kick">Vuelta {v.ronda} · {im.total} {im.total === 1 ? "impostor" : "impostores"}</span>{im.eliminados.length > 0 && <span className="a-nota">Fuera: {im.eliminados.map(j => nombreDe(v, j)).join(", ")}</span>}<RelojTurno v={v} size="3em" /></div>
      {cuadro}
      {cuerpo}
      {v.fase !== "revelada" && (sala ? im.etapa === "pistas" && <TableroVotos v={v} miembros={miembros} compacto yo={yo} /> : ronda)}
      {anuncio && <AnuncioDiscusion modo="celular" />}
    </section>
  );
}

/** Final en páginas que se deslizan a los lados (sin bajar): pestañas arriba, deslizar o tocarlas. */
function PaginasFin({ paginas }: { paginas: { id: string; titulo: string; cuerpo: JSX.Element }[] }) {
  const [i, setI] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const ir = (n: number) => { const c = caja.current; if (c) c.scrollTo({ left: n * c.clientWidth, behavior: "smooth" }); };
  return (
    <div className="nv-pags">
      <div className="nv-pags-tabs" role="tablist">
        {paginas.map((p, n) => <button key={p.id} type="button" role="tab" aria-selected={i === n} className={i === n ? "on" : ""} onClick={() => ir(n)}>{p.titulo}</button>)}
      </div>
      <div ref={caja} className="nv-pags-caja" onScroll={e => { const c = e.currentTarget; setI(Math.round(c.scrollLeft / Math.max(1, c.clientWidth))); }}>
        {paginas.map(p => <div key={p.id} className="nv-pag" role="tabpanel" aria-label={p.titulo}>{p.cuerpo}</div>)}
      </div>
      {paginas.length > 1 && <span className="nv-pags-pista" aria-hidden="true">{i < paginas.length - 1 ? `Desliza → ${paginas[i + 1]!.titulo}` : "← Desliza para volver"}</span>}
    </div>
  );
}

/** Tu palabra en chico: mantén el dedo para verla (al soltar se tapa). El impostor ve su papel, la pista o la categoría. */
function MiPalabra({ imp, palabra, tema, pista, comp }: { imp: boolean; palabra?: string; tema: string; pista?: string; comp: string[] }) {
  const [ver, setVer] = useState(false);
  const tecla = (e: React.KeyboardEvent, x: boolean) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setVer(x); } };
  return (
    <button type="button" className={"nv-mia" + (ver ? " on" : "") + (imp ? " imp" : "")} aria-pressed={ver} aria-label="Mantén presionado para ver tu palabra"
      onPointerDown={() => setVer(true)} onPointerUp={() => setVer(false)} onPointerLeave={() => setVer(false)} onPointerCancel={() => setVer(false)}
      onContextMenu={e => e.preventDefault()} onBlur={() => setVer(false)} onKeyDown={e => tecla(e, true)} onKeyUp={e => tecla(e, false)}>
      {ver ? (
        <span className="nv-mia-txt" aria-live="polite">
          <b className="dsp">{imp ? "Impostor" : palabra ?? "…"}</b>
          <small>{imp ? (pista ? `Pista: ${pista}` : `Categoría: ${tema}`) + (comp.length ? ` · Con ${comp.join(", ")}` : "") : `Categoría: ${tema}`}</small>
        </span>
      ) : <span className="nv-mia-tapa"><span aria-hidden="true">👆</span> Mantén para ver tu palabra</span>}
    </button>
  );
}

/** Votar en la nave (Elías, 24 nov): los de la mesa alrededor y el botón dorado al centro; «Nadie, todavía» salta el voto. */
function VotarNave({ gente, alVotar, clave }: { gente: Parameters<typeof AnilloBurbujas>[0]["gente"]; alVotar: (id: string) => void; clave: string }) {
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => setSel(null), [clave]);
  const nombre = sel === SALTAR_VOTO ? "Nadie" : gente.find(p => p.id === sel)?.nombre;
  return (
    <section className="nv-votar a-entra" aria-label="Votar">
      <span className="nv-votar-t dsp ol">¿Quién se baja de la nave?</span>
      <AnilloBurbujas gente={gente} seleccionada={sel === SALTAR_VOTO ? null : sel} alElegir={setSel} ancho={400} etiqueta="¿Quién se baja de la nave?"
        centro={<span className="nv-centro" style={{ "--arte": arteNave("nave-mesa") } as React.CSSProperties}>
          <button type="button" className={"nv-boton" + (sel ? " listo" : "")} disabled={!sel} onClick={() => { if (sel) alVotar(sel); }}>
            Votar{nombre && <small>{nombre}</small>}
          </button>
        </span>} />
      <button type="button" className="nv-saltar" aria-pressed={sel === SALTAR_VOTO} onClick={() => setSel(SALTAR_VOTO)}>Nadie, todavía</button>
      <p className="a-nota">Toca a alguien (o «Nadie») y luego el botón. Si hay empate, nadie sale.</p>
    </section>
  );
}
