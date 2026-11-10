// Partida en un solo dispositivo. Lo secreto (palabra del impostor, respuestas de pareja, votos)
// se contesta pasando el celular: cada quien ve solo lo suyo y la pantalla se tapa entre jugadores.
import { useEffect, useMemo, useRef, useState } from "react";
import { CONTENIDO } from "../content";
import { ESCENARIOS, JUEGOS, SECCIONES } from "../content/catalogo";
import { aplicar, resultados, type AccionSinId, type EstadoPartida } from "../engine/partida";
import { vistaJugador, vistaPublica } from "../engine/vistas";
import { Avatar } from "./Avatar";
import { acciones, useEstado } from "./estado";
import { aviso, COLOR_SECCION, NOMBRE_CARTA_PODER } from "./comun";

let contador = 0;
const nuevoId = () => `l${Date.now().toString(36)}${(contador++).toString(36)}`;

export function Partida({ inicial, salir }: { inicial: EstadoPartida; salir: () => void }) {
  const [e, setE] = useState(inicial);
  const s = useEstado();
  const juego = JUEGOS.find(j => j.id === e.juegoId)!;
  const esc = ESCENARIOS.find(x => x.id === e.cfg.escenario);
  const v = vistaPublica(e);
  const jl = (id?: string) => s.jugadores.find(j => j.id === id);
  const accion = (a: AccionSinId) => setE(x => aplicar(x, { ...a, id: nuevoId() } as Parameters<typeof aplicar>[1], CONTENIDO));
  const color = COLOR_SECCION[juego.seccion];

  if (e.fase === "terminada") return <Podio e={e} salir={salir} />;

  return (
    <div className="pila partida" style={{ ["--sc" as string]: esc?.color ?? color }}>
      <div className="entre">
        <button className="btn sm" onClick={() => { if (confirm("¿Salir de la partida? No se guarda la XP de una partida sin terminar.")) salir(); }}>Salir</button>
        <span className="sigla" style={{ color }}>{juego.sigla ?? SECCIONES[juego.seccion].sigla}</span>
        <span className="label">Ronda {v.ronda} de {v.totalRondas}</span>
      </div>

      {e.motor === "turnos-cartas" && <TurnoCartas e={e} accion={accion} />}
      {e.motor === "votacion" && <Secreto e={e} accion={accion} />}
      {e.motor === "rol-secreto" && <Impostor e={e} accion={accion} />}
      {e.motor === "pareja" && <Secreto e={e} accion={accion} />}

      {v.cartaUsada && v.cartaUsada.ronda === v.ronda && (
        <p className="hint" style={{ textAlign: "center" }}>⚡ {jl(v.cartaUsada.jugador)?.nombre} usó <b style={{ color: "var(--cyan)" }}>{NOMBRE_CARTA_PODER[v.cartaUsada.carta]}</b></p>
      )}

      <div className="marcador" aria-label="Puntos">
        {[...v.jugadores].sort((a, b) => (v.puntos[b.id] ?? 0) - (v.puntos[a.id] ?? 0)).map(j => {
          const loc = jl(j.id);
          return (
            <div key={j.id} className={"lugar" + (j.id === v.turnoDe ? " activo" : "")}>
              {loc && <Avatar p={loc.personaje} size={34} nombre={j.nombre} />}
              <b>{j.nombre}</b>
              <span>{v.puntos[j.id] ?? 0}</span>
              {(v.cartasEnMano[j.id] ?? 0) > 0 && <small className="muted">🃏 {v.cartasEnMano[j.id]}</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Reloj de arena de 60 s por ronda. */
function Reloj({ clave, segundos = 60 }: { clave: string; segundos?: number }) {
  const [t, setT] = useState(segundos);
  useEffect(() => { setT(segundos); const i = setInterval(() => setT(x => Math.max(0, x - 1)), 1000); return () => clearInterval(i); }, [clave, segundos]);
  return (
    <div className={"reloj" + (t <= 10 ? " fin" : "")} role="timer" aria-label={`${t} segundos`}>
      <svg width="34" height="44" viewBox="0 0 40 52" aria-hidden="true"><path d="M6 3h28M6 49h28" stroke="#F7F2FF" strokeWidth="3" strokeLinecap="round" /><path d="M9 4c0 13 22 13 22 22S9 39 9 48h22c0-9-22-13-22-22S31 17 31 4z" fill="none" stroke="#F7F2FF" strokeWidth="2.4" /><path d={`M14 12h12c-1 5-6 8-6 12-0-4-5-7-6-12z`} fill="#FFC23D" opacity={t / segundos} /><path d="M12 46h16c0-5-8-7-8-12 0 5-8 7-8 12z" fill="#FFC23D" opacity={1 - t / segundos} /></svg>
      {t > 0 ? `0:${String(t).padStart(2, "0")}` : "¡TIEMPO!"}
    </div>
  );
}

function TurnoCartas({ e, accion }: { e: EstadoPartida; accion: (a: AccionSinId) => void }) {
  const s = useEstado();
  const v = vistaPublica(e);
  const turno = s.jugadores.find(j => j.id === v.turnoDe);
  const [verMano, setVerMano] = useState(false);
  const compradas = useRef<Record<string, number>>({});
  const esReto = v.carta?.tipo === "reto";
  const mano = turno ? vistaJugador(e, turno.id).miMano : [];
  const contesto = !!turno && v.contestaron.includes(turno.id);

  const responder = (valor: "cumplio" | "paso") => { if (!turno) return; accion({ tipo: "contestar", jugador: turno.id, valor }); accion({ tipo: "revelar" }); };
  const usar = (carta: string) => {
    if (!turno) return;
    accion({ tipo: "usar-carta", jugador: turno.id, carta });
    if (carta === "escudo" || carta === "turno") accion({ tipo: "revelar" });
    setVerMano(false);
  };
  const comprar = () => {
    if (!turno) return;
    const n = compradas.current[turno.id] ?? 0;
    const r = acciones.comprarCarta(turno.id, n, mano.length);
    if (!r.ok) { aviso(r.motivo); return; }
    compradas.current[turno.id] = n + 1;
    const id = ["escudo", "cambio", "turno", "salvavidas", "relevo", "doble-castigo", "mesero"][Math.floor(Math.random() * 7)]!;
    accion({ tipo: "dar-carta", jugador: turno.id, carta: id });
    aviso(`Compraste ${NOMBRE_CARTA_PODER[id]} por ${r.precio} XP del evento`);
  };

  return (
    <>
      <div className="turno">
        <div className="marco">{turno && <Avatar p={turno.personaje} size={60} nombre={turno.nombre} />}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="label">Le toca a</span>
          <div className="quien">{turno?.nombre.toUpperCase()}</div>
        </div>
        {v.fase === "contestando" && <Reloj clave={`${v.ronda}-${v.carta?.id}`} />}
      </div>

      <div className="mesa">
        <div className="detras a" /><div className="detras b" />
        <div key={v.carta?.id} className={"carta " + (esReto ? "reto" : "verdad")}>
          <div className="cara">
            <div className="entre">
              <span className="tipo">{esReto ? "Reto" : "Verdad"} · {ESCENARIOS.find(x => x.id === e.cfg.escenario)?.sigla}</span>
            </div>
            <p>{v.carta?.texto ?? "No hay cartas para esta configuración. Sube la intensidad o cambia de escenario."}</p>
            <div className="fila" style={{ flexWrap: "wrap" }}>
              <span className="chip lime">+{esReto ? 2 : 1} {esReto ? "puntos" : "punto"}</span>
              {esReto && <span className="chip cyan">+3 XP</span>}
              <span className="chip gold">Pasar no tiene castigo</span>
            </div>
          </div>
        </div>
      </div>

      {v.fase === "contestando" && !contesto && (
        <>
          <div className="tres">
            <button className="btn" onClick={() => responder("paso")}>← Paso</button>
            <button className="btn cyan" onClick={() => setVerMano(x => !x)}>↑ Carta {mano.length > 0 ? `(${mano.length})` : ""}</button>
            <button className="btn lime" onClick={() => responder("cumplio")}>Cumplió →</button>
          </div>
          {verMano && (
            <div className="card">
              <span className="label">Mano de {turno?.nombre}</span>
              <div className="mano">
                {mano.length === 0 && <div className="poder vacio"><b>Sin cartas</b><small>1 por cada 3 retos</small></div>}
                {mano.map((c, i) => <button key={c + i} className="poder" onClick={() => usar(c)}><b>{NOMBRE_CARTA_PODER[c]}</b><small>Usar</small></button>)}
              </div>
              <button className="btn sm cyan" onClick={comprar}>Comprar carta con XP del evento</button>
            </div>
          )}
        </>
      )}

      {v.fase === "revelada" && (
        <div className="revelado pila">
          <b>{(v.revelado as { cumplio?: boolean })?.cumplio ? `¡${turno?.nombre} cumplió! +${esReto ? 2 : 1}` : `${turno?.nombre} pasó. Sin castigo.`}</b>
          <button className="btn principal" onClick={() => accion({ tipo: "siguiente" })}>{v.ronda >= v.totalRondas ? "Ver resultados" : "Siguiente"}</button>
        </div>
      )}
    </>
  );
}

/** Rondas donde cada quien contesta en secreto: ¿Qué prefieres? y ¿Cuánto conoces a tu pareja? */
function Secreto({ e, accion }: { e: EstadoPartida; accion: (a: AccionSinId) => void }) {
  const s = useEstado();
  const v = vistaPublica(e);
  const debenContestar = e.motor === "pareja" ? e.cfg.jugadores.filter(j => j.id in e.privado).map(j => j.id) : e.cfg.jugadores.map(j => j.id);
  const pendiente = debenContestar.find(id => !v.contestaron.includes(id));
  const [mostrando, setMostrando] = useState(false);
  useEffect(() => setMostrando(false), [pendiente]);
  const nombre = (id?: string) => e.cfg.jugadores.find(j => j.id === id)?.nombre ?? "";

  if (v.fase === "revelada") return <Revelado e={e} accion={accion} />;

  return (
    <>
      <div className="mesa" style={{ minHeight: 0 }}>
        <div key={v.carta?.id} className="carta" style={{ height: "auto", minHeight: 200 }}>
          <div className="cara">
            <span className="tipo">{e.motor === "pareja" ? "¿Cuánto conoces a tu pareja?" : "¿Qué prefieres?"}</span>
            <p>{e.motor === "pareja" ? "Cada quien contesta en secreto. Si coinciden, +2 a cada uno." : v.carta?.texto}</p>
            {v.carta?.opcionB && <p style={{ margin: 0, fontSize: 20, color: "var(--cyan)" }}>o… {v.carta.opcionB}</p>}
          </div>
        </div>
      </div>
      {pendiente ? (
        mostrando
          ? <Contestar e={e} jugador={pendiente} enviar={valor => accion({ tipo: "contestar", jugador: pendiente, valor })} />
          : <PasarCelular j={s.jugadores.find(x => x.id === pendiente)} onListo={() => setMostrando(true)} />
      ) : (
        <div className="pila">
          <p className="hint" style={{ textAlign: "center" }}>Todos contestaron. Pongan el celular donde todos lo vean.</p>
          <button className="btn principal" onClick={() => accion({ tipo: "revelar" })}>Revelar</button>
        </div>
      )}
      <p className="hint" style={{ textAlign: "center" }}>{v.contestaron.length} de {debenContestar.length} ya contestaron{pendiente ? ` · falta ${nombre(pendiente)}` : ""}</p>
    </>
  );
}

function PasarCelular({ j, onListo, texto }: { j?: { nombre: string; personaje: import("../content/personaje").Personaje }; onListo: () => void; texto?: string }) {
  return (
    <div className="pasar">
      <div className="marco">{j && <Avatar p={j.personaje} size={110} nombre={j.nombre} />}</div>
      <h1 className="titulo">Pásale el celular a {j?.nombre}</h1>
      <p className="hint">{texto ?? "Nadie más debe ver la pantalla."}</p>
      <button className="btn principal" onClick={onListo}>Soy {j?.nombre}</button>
    </div>
  );
}

function Contestar({ e, jugador, enviar }: { e: EstadoPartida; jugador: string; enviar: (v: unknown) => void }) {
  const mio = vistaJugador(e, jugador).mio as { pregunta?: string; papel?: string } | undefined;
  const [texto, setTexto] = useState("");
  const [eleccion, setEleccion] = useState<"a" | "b" | null>(null);
  const v = vistaPublica(e);
  const otro = e.cfg.jugadores.find(j => j.id !== jugador)?.nombre;

  if (e.motor === "pareja") {
    return (
      <div className="card">
        <span className="label">{mio?.papel === "contesta" ? "Contesta sobre ti" : "Adivina qué contestó tu pareja"}</span>
        <h2>{mio?.pregunta}</h2>
        <input className="input" value={texto} maxLength={120} onChange={x => setTexto(x.target.value)} placeholder="Tu respuesta secreta" autoFocus />
        <button className="btn principal" disabled={!texto.trim()} onClick={() => enviar(texto)}>Enviar en secreto</button>
      </div>
    );
  }
  if (e.cfg.jugadores.length === 2 && eleccion) {
    return (
      <div className="card">
        <span className="label">Ahora adivina: ¿qué eligió {otro}?</span>
        <div className="opcionAB">
          <button className="btn" onClick={() => enviar({ eleccion, prediccion: "a" })}>A · {v.carta?.texto}</button>
          <button className="btn" onClick={() => enviar({ eleccion, prediccion: "b" })}>B · {v.carta?.opcionB}</button>
        </div>
      </div>
    );
  }
  const elegir = (x: "a" | "b") => (e.cfg.jugadores.length === 2 ? setEleccion(x) : enviar(x));
  return (
    <div className="card">
      <span className="label">Elige en secreto</span>
      <div className="opcionAB">
        <button className="btn" onClick={() => elegir("a")}>A · {v.carta?.texto}</button>
        <button className="btn" onClick={() => elegir("b")}>B · {v.carta?.opcionB}</button>
      </div>
    </div>
  );
}

function Impostor({ e, accion }: { e: EstadoPartida; accion: (a: AccionSinId) => void }) {
  const s = useEstado();
  const v = vistaPublica(e);
  const ids = e.cfg.jugadores.map(j => j.id);
  const [vistos, setVistos] = useState<string[]>([]);
  const [mostrando, setMostrando] = useState(false);
  const [etapa, setEtapa] = useState<"ver" | "hablar" | "votar">("ver");
  useEffect(() => { setVistos([]); setEtapa("ver"); setMostrando(false); }, [v.ronda]);
  const porVer = ids.find(id => !vistos.includes(id));
  const porVotar = ids.find(id => !v.contestaron.includes(id));
  useEffect(() => setMostrando(false), [porVer, porVotar]);
  const jl = (id?: string) => s.jugadores.find(j => j.id === id);
  useEffect(() => { if (etapa === "ver" && !porVer) setEtapa("hablar"); }, [etapa, porVer]);

  if (v.fase === "revelada") return <Revelado e={e} accion={accion} />;

  if (etapa === "ver") {
    if (!porVer) return null;
    if (!mostrando) return <PasarCelular j={jl(porVer)} onListo={() => setMostrando(true)} texto={`Tema: ${v.carta?.texto}. Vas a ver tu palabra en secreto.`} />;
    const mio = vistaJugador(e, porVer).mio as { rol: string; palabra?: string; tema: string };
    return (
      <div className="pasar">
        <span className="label">Tema: {mio.tema}</span>
        {mio.rol === "impostor"
          ? <><div className="secreto" style={{ color: "var(--red)" }}>¡ERES EL IMPOSTOR!</div><p className="hint">No sabes la palabra. Escucha y disimula.</p></>
          : <><span className="label">Tu palabra</span><div className="secreto">{mio.palabra}</div></>}
        <button className="btn principal" onClick={() => setVistos(x => [...x, porVer])}>Listo, ya la vi</button>
      </div>
    );
  }
  if (etapa === "hablar") {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <span className="label">Tema: {v.carta?.texto}</span>
        <h1 className="titulo">Cada quien dice una palabra que tenga que ver.</h1>
        <p className="hint">El impostor no sabe la palabra: que no se note. Después, todos votan en secreto.</p>
        <button className="btn principal" onClick={() => setEtapa("votar")}>A votar</button>
      </div>
    );
  }
  if (porVotar) {
    if (!mostrando) return <PasarCelular j={jl(porVotar)} onListo={() => setMostrando(true)} texto="Vas a votar en secreto." />;
    return (
      <div className="card">
        <span className="label">¿Quién es el impostor?</span>
        <div className="pila">
          {e.cfg.jugadores.filter(j => j.id !== porVotar).map(j => (
            <button key={j.id} className="btn" style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={() => accion({ tipo: "contestar", jugador: porVotar, valor: j.id })}>
              {jl(j.id) && <Avatar p={jl(j.id)!.personaje} size={28} nombre={j.nombre} />} {j.nombre}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="pila">
      <p className="hint" style={{ textAlign: "center" }}>Todos votaron.</p>
      <button className="btn principal" onClick={() => accion({ tipo: "revelar" })}>Revelar al impostor</button>
    </div>
  );
}

function Revelado({ e, accion }: { e: EstadoPartida; accion: (a: AccionSinId) => void }) {
  const v = vistaPublica(e);
  const nombre = (id?: string) => e.cfg.jugadores.find(j => j.id === id)?.nombre ?? "";
  const r = v.revelado as Record<string, unknown>;
  let contenido: React.ReactNode = null;
  if (e.motor === "rol-secreto") {
    const x = r as { impostor: string; palabra: string; atrapado: boolean };
    contenido = <><h2>{x.atrapado ? "¡Lo atraparon!" : "¡El impostor escapó!"}</h2><p className="hint">El impostor era <b style={{ color: "var(--red)" }}>{nombre(x.impostor)}</b>. La palabra: <b style={{ color: "var(--lime)" }}>{x.palabra}</b>.</p></>;
  } else if (e.motor === "pareja") {
    const x = r as { resultados: { pareja: [string, string]; coinciden: boolean }[]; respuestas: Record<string, string> };
    contenido = x.resultados.map(({ pareja: [a, b], coinciden }) => (
      <div key={a}><b>{nombre(a)} y {nombre(b)}</b>: «{x.respuestas[a]}» y «{x.respuestas[b]}» {coinciden ? <span className="chip lime">+2 c/u</span> : <span className="chip pink">No coinciden</span>}</div>
    ));
  } else {
    const x = r as { cuenta?: { a: number; b: number }; mayoria?: string | null; respuestas: Record<string, unknown> };
    contenido = x.cuenta
      ? <p className="hint">A: <b>{x.cuenta.a}</b> · B: <b>{x.cuenta.b}</b>. {x.mayoria ? `La mayoría eligió ${x.mayoria.toUpperCase()}: +1 a cada uno.` : "Empate: nadie suma."}</p>
      : <p className="hint">{Object.entries(x.respuestas).map(([id, rr]) => `${nombre(id)} eligió ${String((rr as { eleccion: string }).eleccion).toUpperCase()}`).join(" · ")}</p>;
  }
  return (
    <div className="revelado pila">
      {contenido}
      <button className="btn principal" onClick={() => accion({ tipo: "siguiente" })}>{v.ronda >= v.totalRondas ? "Ver resultados" : "Siguiente ronda"}</button>
    </div>
  );
}

function Podio({ e, salir }: { e: EstadoPartida; salir: () => void }) {
  const s = useEstado();
  const res = useMemo(() => resultados(e), [e]);
  const acreditado = useRef(false);
  useEffect(() => {
    if (acreditado.current) return;
    acreditado.current = true;
    acciones.acreditar(JUEGOS.find(j => j.id === e.juegoId)?.nombre ?? e.juegoId, res);
  }, [e.juegoId, res]);
  const jl = (id: string) => s.jugadores.find(j => j.id === id);
  const top = [res[1], res[0], res[2]];
  const cuenta = res.some(r => r.xp > 0);
  return (
    <div className="pila">
      <div style={{ textAlign: "center" }}><span className="sigla" style={{ fontSize: 40, color: "var(--gold)" }}>GG</span><p className="hint">Fin de partida</p></div>
      <div className="podio">
        {top.map((r, i) => r ? (
          <div key={r.jugador} className={"puesto p" + [2, 1, 3][i]}>
            {jl(r.jugador) && <Avatar p={jl(r.jugador)!.personaje} size={i === 1 ? 84 : 64} nombre={r.nombre} lider={i === 1} />}
            <b>{r.nombre}</b>
            <div className="escalon">{[2, 1, 3][i]}</div>
          </div>
        ) : <div key={i} />)}
      </div>
      <div className="card">
        {res.map(r => (
          <div key={r.jugador} className="entre"><span><b>{r.lugar}.</b> {r.nombre} · {r.puntos} pts</span><span className="chip lime">+{r.xp} XP</span></div>
        ))}
        {!cuenta && <p className="hint">Una partida cuenta para XP desde 5 rondas.</p>}
      </div>
      <button className="btn principal" onClick={salir}>Volver</button>
    </div>
  );
}
