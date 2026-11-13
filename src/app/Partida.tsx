// Partida en la pantalla del anfitrión. Lo secreto (palabra del impostor, respuestas de pareja, votos)
// se contesta pasando el celular, o en el celular propio si el jugador entró a la sala con su cuenta.
import { useEffect, useMemo, useRef, useState, type PointerEvent as PE } from "react";
import { CONTENIDO } from "../content";
import { ESCENARIOS, JUEGOS, SECCIONES } from "../content/catalogo";
import { aplicar, resultados, type AccionSinId, type EstadoPartida } from "../engine/partida";
import { vistaJugador, vistaPublica } from "../engine/vistas";
import { Avatar } from "./Avatar";
import { acciones, useEstado } from "./estado";
import { crearPartidaSala, leerAcciones, publicarPartida, terminarPartidaSala } from "./nube";
import { aviso, BotonPantallaCompleta, BotonSonido, COLOR_SECCION, confirmar, NOMBRE_CARTA_PODER } from "./comun";
import { sonar } from "./sonido";
import { Anillo, Confeti, Flotantes, useAura, useFlotantes } from "./efectos";

let contador = 0;
const nuevoId = () => `l${Date.now().toString(36)}${(contador++).toString(36)}`;
/** Jugador que entró a la sala desde su celular: contesta allá, no aquí. */
const esRemoto = (id?: string) => !!id && id.startsWith("c-");
/** Primero los que juegan en esta pantalla; los de celular contestan solos. */
const localPrimero = (ids: string[]) => [...ids].sort((a, b) => Number(esRemoto(a)) - Number(esRemoto(b)));

function EsperaCelular({ nombre }: { nombre: string }) {
  return (
    <div className="pasar">
      <h1 className="titulo">📱 {nombre} contesta en su celular</h1>
      <p className="hint">La pantalla sigue sola cuando llegue su respuesta.</p>
    </div>
  );
}

/**
 * Sala en línea: si hay jugadores que entraron desde su celular, la partida se crea en el servidor,
 * se publica cada cambio (lo público y el secreto de cada uno) y se leen sus respuestas cada segundo y medio.
 */
function useSalaEnLinea(e: EstadoPartida, setE: (f: (x: EstadoPartida) => EstadoPartida) => void) {
  const s = useEstado();
  const sala = s.sala?.anfitrion ? s.sala : undefined;
  const remotos = e.cfg.jugadores.filter(j => esRemoto(j.id)).map(j => j.id);
  const enLinea = !!sala && remotos.length > 0;
  const id = useRef<string | null>(null);
  const [listo, setListo] = useState(0);
  const vistas = useRef(new Set<string>());
  const terminado = useRef(false);

  useEffect(() => {
    if (!enLinea || id.current || !sala) return;
    void crearPartidaSala(sala, e.juegoId, e.semilla).then(x => { id.current = x; setListo(n => n + 1); });
  }, [enLinea]);

  useEffect(() => {
    if (!id.current || e.fase === "terminada") return;
    const privados = Object.fromEntries(remotos.map(r => {
      const vj = vistaJugador(e, r);
      return [r.slice(2), { mio: vj.mio ?? null, miRespuesta: vj.miRespuesta ?? null, miMano: vj.miMano }];
    }));
    void publicarPartida(id.current, e.version + 1, vistaPublica(e), privados);
  }, [e.version, listo]);

  useEffect(() => {
    if (!enLinea) return;
    const t = window.setInterval(async () => {
      if (!id.current) return;
      for (const a of await leerAcciones(id.current)) {
        if (vistas.current.has(a.id)) continue;
        vistas.current.add(a.id);
        const jugador = `c-${a.jugador}`;
        if (a.tipo === "contestar") setE(x => aplicar(x, { id: a.id, tipo: "contestar", jugador, valor: a.datos.valor }, CONTENIDO));
        if (a.tipo === "carta") setE(x => aplicar(x, { id: a.id, tipo: "usar-carta", jugador, carta: String(a.datos.carta) }, CONTENIDO));
      }
    }, 1500);
    return () => window.clearInterval(t);
  }, [enLinea]);

  // En los juegos por turno, cuando el del turno ya contestó desde su celular, la ronda se revela sola.
  useEffect(() => {
    if (e.fase !== "contestando" || !e.turnoDe || !esRemoto(e.turnoDe)) return;
    if (!["turnos-cartas", "botella", "ruleta", "dados", "conteo"].includes(e.motor)) return;
    if (e.turnoDe in e.respuestas) setE(x => aplicar(x, { id: nuevoId(), tipo: "revelar" }, CONTENIDO));
  }, [e.version]);

  // Al terminar, el servidor suma la XP de cada jugador con cuenta (misma fórmula y topes).
  const cerrar = (conXp: boolean) => {
    if (!id.current || terminado.current) return;
    terminado.current = true;
    const res = conXp ? resultados(e).filter(r => esRemoto(r.jugador)).map(r => ({ jugador: r.jugador.slice(2), rondas: r.rondas, retos: r.retos, lugar: r.lugar })) : [];
    void terminarPartidaSala(id.current, e.juegoId, e.cfg.jugadores.length, res);
  };
  useEffect(() => { if (e.fase === "terminada") cerrar(true); }, [e.fase]);
  return { enLinea, cerrar };
}

export function Partida({ inicial, salir }: { inicial: EstadoPartida; salir: () => void }) {
  const [e, setE] = useState(inicial);
  const s = useEstado();
  const juego = JUEGOS.find(j => j.id === e.juegoId)!;
  const esc = ESCENARIOS.find(x => x.id === e.cfg.escenario);
  const v = vistaPublica(e);
  const jl = (id?: string) => s.jugadores.find(j => j.id === id);
  const accion = (a: AccionSinId) => setE(x => aplicar(x, { ...a, id: nuevoId() } as Parameters<typeof aplicar>[1], CONTENIDO));
  const enSala = useSalaEnLinea(e, setE);
  const color = COLOR_SECCION[juego.seccion];
  useAura(esc?.color ?? color);

  if (e.fase === "terminada") return <Podio e={e} salir={salir} />;

  return (
    <div className="pila partida" style={{ ["--sc" as string]: esc?.color ?? color }}>
      <div className="entre">
        <button className="btn sm" onClick={async () => { if (await confirmar({ titulo: "¿Salir de la partida?", texto: "No se guarda la XP de una partida sin terminar.", si: "Sí, salir", no: "Continuar jugando", peligro: true })) { enSala.cerrar(false); salir(); } }}>Salir</button>
        <span className="sigla" style={{ color }}>{juego.sigla ?? SECCIONES[juego.seccion].sigla}</span>
        <span className="fila" style={{ gap: 8 }}><span className="label">Ronda {v.ronda} de {v.totalRondas}</span><BotonPantallaCompleta /><BotonSonido /></span>
      </div>

      <ol className="turnos" aria-label="Jugadores y turno">
        {v.jugadores.map(j => {
          const loc = jl(j.id), enTurno = j.id === v.turnoDe, listo = v.fase === "contestando" && !v.turnoDe && v.contestaron.includes(j.id);
          return (
            <li key={j.id} className={(enTurno ? "activo" : "") + (listo ? " listo" : "")} aria-current={enTurno ? "true" : undefined}>
              <span className="burbuja">{loc && <Avatar p={loc.personaje} size={40} nombre={j.nombre} />}</span>
              <small>{enTurno ? "Su turno" : listo ? "✓ Listo" : j.nombre}</small>
            </li>
          );
        })}
      </ol>

      {["turnos-cartas", "botella", "ruleta", "dados"].includes(e.motor) && <TurnoCartas key={e.motor} e={e} accion={accion} />}
      {e.motor === "conteo" && <Conteo e={e} accion={accion} />}
      {e.motor === "confesion" && <Confesion e={e} accion={accion} />}
      {e.motor === "senalar" && <Senalar e={e} accion={accion} />}
      {e.motor === "competencia" && <Competencia e={e} accion={accion} />}
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

function TurnoCartas({ e, accion }: { e: EstadoPartida; accion: (a: AccionSinId) => void }) {
  const s = useEstado();
  const v = vistaPublica(e);
  const turno = s.jugadores.find(j => j.id === v.turnoDe);
  const [verMano, setVerMano] = useState(false);
  const compradas = useRef<Record<string, number>>({});
  const tipo = v.carta?.tipo ?? "";
  const esReto = tipo === "reto";
  // Verdad o reto: verdad +1, reto +2. Reloj, ruleta y dados: cumplir +1.
  const valor = e.motor === "turnos-cartas" ? (esReto ? 2 : 1) : 1;
  const mano = turno ? vistaJugador(e, turno.id).miMano : [];
  const contesto = !!turno && v.contestaron.includes(turno.id);
  const flot = useFlotantes();
  const sel = v.seleccion as Record<string, string | number> | undefined;
  const jl = (id?: unknown) => s.jugadores.find(j => j.id === id);
  // Reloj, ruleta y dados giran primero; la carta sale cuando se detienen.
  const [animando, setAnimando] = useState(e.motor !== "turnos-cartas");
  useEffect(() => {
    if (e.motor === "turnos-cartas") return;
    setAnimando(true);
    const t = setTimeout(() => setAnimando(false), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 2600);
    return () => clearTimeout(t);
  }, [v.ronda, e.motor]);
  const puedeGesto = v.fase === "contestando" && !contesto && !!turno && !animando;
  const arrastre = useArrastre({
    activo: puedeGesto,
    derecha: () => responder("cumplio"),
    izquierda: () => responder("paso"),
    arriba: () => { if (mano.length > 0) setVerMano(true); },
  });

  const responder = (valor: "cumplio" | "paso") => { if (!turno) return; sonar(valor === "cumplio" ? "exito" : "paso");
    if (valor === "cumplio") flot.lanzar(esReto ? [["+2 pts", "lime"], ["+3 XP", "cyan"]] : [["+1 pt", "lime"]]); accion({ tipo: "contestar", jugador: turno.id, valor }); accion({ tipo: "revelar" }); };
  const etiqueta = e.motor === "botella" ? `${jl(sel?.pregunta)?.nombre ?? ""} le pregunta a`
    : e.motor === "ruleta" ? "La ruleta eligió a" : e.motor === "dados" ? "Tira los dados" : "Le toca a";
  const nombreTipo = ({ reto: "Reto", verdad: "Verdad", castigo: "Castigo", dados: "Dados HOT" } as Record<string, string>)[tipo] ?? "Carta";
  const usar = (carta: string) => {
    if (!turno) return;
    sonar("poder");
    accion({ tipo: "usar-carta", jugador: turno.id, carta });
    if (carta === "escudo" || carta === "turno") accion({ tipo: "revelar" });
    setVerMano(false);
  };
  const comprar = () => {
    if (!turno) return;
    const n = compradas.current[turno.id] ?? 0;
    const r = acciones.comprarCarta(turno.id, n, mano.length);
    if (!r.ok) { sonar("error"); aviso(r.motivo); return; }
    compradas.current[turno.id] = n + 1;
    const id = ["escudo", "cambio", "turno", "salvavidas", "relevo", "doble-castigo", "mesero"][Math.floor(Math.random() * 7)]!;
    accion({ tipo: "dar-carta", jugador: turno.id, carta: id });
    aviso(`Compraste ${NOMBRE_CARTA_PODER[id]} por ${r.precio} XP del evento`);
  };

  return (
    <>
      {e.motor === "botella" && <RelojBotella e={e} />}
      {e.motor === "ruleta" && <RuletaJugadores e={e} />}
      {e.motor === "dados" && <Dados e={e} />}
      {!animando && <>
      <div className="turno">
        <div className="marco">{turno && <Avatar p={turno.personaje} size={60} nombre={turno.nombre} />}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="label">{etiqueta}</span>
          <div className="quien">{turno?.nombre.toUpperCase()}</div>
        </div>
        {v.fase === "contestando" && <Anillo clave={`${v.ronda}-${v.carta?.id}`} {...(e.motor === "dados" ? { segundos: Number(sel?.segundos ?? 30) } : {})} />}
      </div>

      <div className={"mesa" + (e.motor === "turnos-cartas" ? "" : " compacta")}>
        <Flotantes lista={flot.lista} />
        <div className="detras a" /><div className="detras b" />
        <div key={v.carta?.id} className={"carta " + tipo} {...arrastre.props} style={e.motor === "turnos-cartas" ? arrastre.estilo : { ...arrastre.estilo, height: 300 }}>
          <div className="cara">
            <div className="entre">
              <span className="tipo">{nombreTipo} · {ESCENARIOS.find(x => x.id === e.cfg.escenario)?.sigla}</span>
            </div>
            <p>{v.carta?.texto ?? "No hay cartas para esta configuración. Sube la intensidad o cambia de escenario."}</p>
            <div className="fila" style={{ flexWrap: "wrap" }}>
              <span className="chip lime">+{valor} {valor === 1 ? "punto" : "puntos"}</span>
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
          <b>{(v.revelado as { cumplio?: boolean })?.cumplio ? `¡${turno?.nombre} cumplió! +${valor}` : `${turno?.nombre} pasó. Sin castigo.`}</b>
          <button className="btn principal" data-sin-clic onClick={() => { sonar("carta"); accion({ tipo: "siguiente" }); }}>{v.ronda >= v.totalRondas ? "Ver resultados" : "Siguiente"}</button>
        </div>
      )}
      </>}
    </>
  );
}

/** Lugares alrededor de un círculo (el primero arriba, en sentido de las manecillas). */
const anguloDe = (i: number, n: number) => (360 / n) * i;

/** El reloj: los jugadores alrededor; la manecilla corta (pregunta) y la larga (responde) giran y se detienen. */
function RelojBotella({ e }: { e: EstadoPartida }) {
  const s = useEstado();
  const v = vistaPublica(e);
  const sel = v.seleccion as { pregunta: string; responde: string };
  const n = e.cfg.jugadores.length;
  const idx = (id: string) => e.cfg.jugadores.findIndex(j => j.id === id);
  const vueltas = useRef(0);
  const [giro, setGiro] = useState({ corta: 0, larga: 0 });
  useEffect(() => {
    vueltas.current += 1;
    const base = vueltas.current * 1080;
    const t = setTimeout(() => setGiro({ corta: base + anguloDe(idx(sel.pregunta), n), larga: base + 720 + anguloDe(idx(sel.responde), n) }), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.ronda]);
  return (
    <div className="circulo" role="img" aria-label="Reloj que elige quién pregunta y quién responde">
      {e.cfg.jugadores.map((j, i) => {
        const a = (anguloDe(i, n) - 90) * (Math.PI / 180), loc = s.jugadores.find(x => x.id === j.id);
        const activo = j.id === sel.pregunta ? " pregunta" : j.id === sel.responde ? " responde" : "";
        return (
          <div key={j.id} className={"asiento" + activo} style={{ left: `${50 + 41 * Math.cos(a)}%`, top: `${50 + 41 * Math.sin(a)}%` }}>
            {loc && <Avatar p={loc.personaje} size={34} nombre={j.nombre} />}
            <small>{j.nombre}</small>
          </div>
        );
      })}
      <div className="manecilla corta" style={{ transform: `translate(-50%, -100%) rotate(${giro.corta}deg)` }} />
      <div className="manecilla larga" style={{ transform: `translate(-50%, -100%) rotate(${giro.larga}deg)` }} />
      <div className="centro" />
    </div>
  );
}

/** Ruleta de castigos: una rebanada por jugador; gira y se detiene en el elegido. */
function RuletaJugadores({ e }: { e: EstadoPartida }) {
  const v = vistaPublica(e);
  const { indice } = v.seleccion as { indice: number };
  const n = e.cfg.jugadores.length, paso = 360 / n;
  const COLORES = ["#FF2E88", "#22E1FF", "#C6FF3D", "#FFC23D", "#A77BFF", "#FF7A2E", "#2EE6B5", "#FF4D5E"];
  const fondo = `conic-gradient(${e.cfg.jugadores.map((_, i) => `${COLORES[i % 8]} ${i * paso}deg ${(i + 1) * paso}deg`).join(", ")})`;
  const vueltas = useRef(0);
  const [giro, setGiro] = useState(0);
  useEffect(() => {
    vueltas.current += 1;
    // La flecha está arriba: se gira para que el centro de la rebanada elegida quede bajo ella.
    const t = setTimeout(() => setGiro(vueltas.current * 1440 - (indice * paso + paso / 2)), 30);
    return () => clearTimeout(t);
  }, [v.ronda, indice, paso]);
  return (
    <div className="ruletaGrande">
      <div className="flecha" aria-hidden="true" />
      <div className="rueda" style={{ background: fondo, transform: `rotate(${giro}deg)` }}>
        {e.cfg.jugadores.map((j, i) => (
          <span key={j.id} style={{ transform: `rotate(${i * paso + paso / 2}deg)` }}><i>{j.nombre}</i></span>
        ))}
      </div>
    </div>
  );
}

/** Dados HOT: tres dados que se agitan y muestran acción, zona y segundos. */
function Dados({ e }: { e: EstadoPartida }) {
  const v = vistaPublica(e);
  const sel = v.seleccion as { accion: string; zona: string; segundos: number };
  return (
    <div className="tiradados" key={v.ronda}>
      <div className="dado" style={{ animationDelay: "0s" }}><small>Acción</small>{sel.accion}</div>
      <div className="dado" style={{ animationDelay: ".15s" }}><small>Zona</small>{sel.zona}</div>
      <div className="dado" style={{ animationDelay: ".3s" }}><small>Tiempo</small>{sel.segundos} s</div>
    </div>
  );
}

/** Contra reloj: el que describe (o enumera) suma una por cada acierto antes de que se acabe el tiempo. */
function Conteo({ e, accion }: { e: EstadoPartida; accion: (a: AccionSinId) => void }) {
  const s = useEstado();
  const v = vistaPublica(e);
  const turno = s.jugadores.find(j => j.id === v.turnoDe);
  const palabras = e.mazo === "palabra" && turno ? ((vistaJugador(e, turno.id).mio as { palabras: { palabra: string; prohibidas: string[] }[] })?.palabras ?? []) : [];
  const total = v.segundos ?? 30;
  const [etapa, setEtapa] = useState<"pasar" | "listo" | "jugando" | "fin">(e.mazo === "palabra" ? "pasar" : "listo");
  const [t, setT] = useState(total);
  const [cuenta, setCuenta] = useState(0);
  const [i, setI] = useState(0);
  useEffect(() => { setEtapa(e.mazo === "palabra" ? "pasar" : "listo"); setT(total); setCuenta(0); setI(0); }, [v.ronda, e.mazo, total]);
  useEffect(() => {
    if (etapa !== "jugando") return;
    const iv = setInterval(() => setT(x => { if (x <= 1) { setEtapa("fin"); return 0; } return x - 1; }), 1000);
    return () => clearInterval(iv);
  }, [etapa]);
  const enviar = () => { if (!turno) return; accion({ tipo: "contestar", jugador: turno.id, valor: cuenta }); accion({ tipo: "revelar" }); };
  const actual = palabras[i];
  const siguiente = (acierto: boolean) => {
    if (acierto) setCuenta(c => c + 1);
    if (i + 1 >= palabras.length) setEtapa("fin"); else setI(i + 1);
  };

  if (v.fase === "revelada") return <Revelado e={e} accion={accion} />;
  if (esRemoto(v.turnoDe)) return <EsperaCelular nombre={turno?.nombre ?? ""} />;
  if (etapa === "pasar") return <PasarCelular j={turno} onListo={() => setEtapa("listo")} texto="Solo tú vas a ver las palabras. Los demás adivinan." />;

  return (
    <>
      <div className="turno">
        <div className="marco">{turno && <Avatar p={turno.personaje} size={60} nombre={turno.nombre} />}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="label">{e.mazo === "palabra" ? (e.juegoId === "mimica" ? "Haz mímica, sin hablar" : "Describe sin decir las tachadas") : "Di todo lo que puedas"}</span>
          <div className="quien">{turno?.nombre.toUpperCase()}</div>
        </div>
      </div>
      <div className="temporizador" aria-label={`${t} segundos`}>
        <span style={{ width: `${(t / total) * 100}%` }} className={t <= 5 ? "fin" : ""} />
        <b>{t}</b>
      </div>
      {e.mazo !== "palabra" && <div className="carta" style={{ height: "auto", minHeight: 150 }}><div className="cara"><span className="tipo">Lista relámpago</span><p>{v.carta?.texto}</p></div></div>}
      {etapa === "listo" && <button className="btn principal" onClick={() => setEtapa("jugando")}>¡Arranca! · {total} s</button>}
      {etapa === "jugando" && e.mazo === "palabra" && actual && (
        <div className="pila">
          <div className="carta" style={{ height: "auto", minHeight: 170 }}><div className="cara" style={{ textAlign: "center" }}>
            <span className="tipo">Palabra {i + 1} de {palabras.length}</span>
            <p style={{ fontSize: 34 }}>{actual.palabra}</p>
            {actual.prohibidas.length > 0 && <div className="fila" style={{ justifyContent: "center", flexWrap: "wrap" }}>{actual.prohibidas.map(x => <span key={x} className="chip pink" style={{ textDecoration: "line-through" }}>{x}</span>)}</div>}
          </div></div>
          <div className="tres" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button className="btn" onClick={() => siguiente(false)}>Pasar palabra</button>
            <button className="btn lime" onClick={() => siguiente(true)}>¡Adivinaron! +1</button>
          </div>
        </div>
      )}
      {etapa === "jugando" && e.mazo !== "palabra" && (
        <button className="btn lime contador" onClick={() => setCuenta(c => Math.min(40, c + 1))}>+1 · llevan {cuenta}</button>
      )}
      {etapa === "fin" && (
        <div className="revelado pila">
          <b>¡Tiempo! {turno?.nombre} logró {cuenta}.</b>
          {e.mazo !== "palabra" && <div className="tres"><button className="btn" onClick={() => setCuenta(c => Math.max(0, c - 1))}>−1</button><span className="sigla" style={{ textAlign: "center", fontSize: 28, alignSelf: "center" }}>{cuenta}</span><button className="btn" onClick={() => setCuenta(c => Math.min(40, c + 1))}>+1</button></div>}
          <button className="btn principal" onClick={enviar}>Guardar {cuenta} puntos</button>
        </div>
      )}
    </>
  );
}

/** Yo nunca: cada quien toca si sí lo ha hecho. Es público: se trata de confesar. */
function Confesion({ e, accion }: { e: EstadoPartida; accion: (a: AccionSinId) => void }) {
  const s = useEstado();
  const v = vistaPublica(e);
  if (v.fase === "revelada") return <Revelado e={e} accion={accion} />;
  const faltan = e.cfg.jugadores.filter(j => !v.contestaron.includes(j.id));
  return (
    <>
      <div className="carta" style={{ height: "auto", minHeight: 200, alignSelf: "center" }}><div className="cara"><span className="tipo">Yo nunca · NMMS</span><p>{v.carta?.texto}</p><span className="chip lime">Confesar suma +1</span></div></div>
      <div className="pila">
        {e.cfg.jugadores.map(j => {
          const loc = s.jugadores.find(x => x.id === j.id), ya = v.contestaron.includes(j.id);
          return (
            <div key={j.id} className="jugador">
              <span className="marco">{loc && <Avatar p={loc.personaje} size={48} nombre={j.nombre} />}</span>
              <b style={{ flex: 1 }}>{j.nombre}</b>
              {ya ? <span className="chip lime">Listo</span> : <>
                <button className="btn sm lime" onClick={() => accion({ tipo: "contestar", jugador: j.id, valor: "si" })}>Yo sí</button>
                <button className="btn sm" onClick={() => accion({ tipo: "contestar", jugador: j.id, valor: "no" })}>Yo no</button>
              </>}
            </div>
          );
        })}
      </div>
      <button className="btn principal" disabled={faltan.length > 0} onClick={() => accion({ tipo: "revelar" })}>Revelar</button>
    </>
  );
}

/** ¿Quién es más probable?: cada quien señala en secreto, pasando el celular. */
function Senalar({ e, accion }: { e: EstadoPartida; accion: (a: AccionSinId) => void }) {
  const s = useEstado();
  const v = vistaPublica(e);
  const idPendiente = localPrimero(e.cfg.jugadores.map(j => j.id).filter(id => !v.contestaron.includes(id)))[0];
  const pendiente = e.cfg.jugadores.find(j => j.id === idPendiente);
  const [mostrando, setMostrando] = useState(false);
  useEffect(() => setMostrando(false), [pendiente?.id]);
  if (v.fase === "revelada") return <Revelado e={e} accion={accion} />;
  const jl = (id?: string) => s.jugadores.find(j => j.id === id);
  return (
    <>
      <div className="carta" style={{ height: "auto", minHeight: 180, alignSelf: "center" }}><div className="cara"><span className="tipo">¿Quién es más probable que…? · POV</span><p>{v.carta?.texto}</p></div></div>
      {pendiente ? (esRemoto(pendiente.id) ? <EsperaCelular nombre={pendiente.nombre} /> : mostrando ? (
        <div className="card">
          <span className="label">{pendiente.nombre}, señala en secreto</span>
          <div className="pila">
            {e.cfg.jugadores.map(j => (
              <button key={j.id} className="btn" style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={() => accion({ tipo: "contestar", jugador: pendiente.id, valor: j.id })}>
                {jl(j.id) && <Avatar p={jl(j.id)!.personaje} size={28} nombre={j.nombre} />} {j.nombre}
              </button>
            ))}
          </div>
        </div>
      ) : <PasarCelular j={jl(pendiente.id)} onListo={() => setMostrando(true)} texto="Vas a señalar en secreto." />)
        : <button className="btn principal" onClick={() => accion({ tipo: "revelar" })}>Revelar</button>}
    </>
  );
}

/** Reto del lugar: una competencia real; el anfitrión marca quién ganó. */
function Competencia({ e, accion }: { e: EstadoPartida; accion: (a: AccionSinId) => void }) {
  const s = useEstado();
  const v = vistaPublica(e);
  if (v.fase === "revelada") return <Revelado e={e} accion={accion} />;
  const anfitrion = e.cfg.jugadores[0]!.id;
  return (
    <>
      <div className="carta" style={{ height: "auto", minHeight: 220, alignSelf: "center" }}><div className="cara">
        <span className="tipo">Reto del lugar · PVP</span>
        <p>{v.carta?.texto ?? "No hay competencias para este escenario."}</p>
        {v.carta?.tipo && <p className="hint" style={{ fontSize: 15 }}>{v.carta.tipo}</p>}
        <span className="chip lime">El ganador suma +3</span>
      </div></div>
      <span className="label">¿Quién ganó?</span>
      <div className="secciones">
        {e.cfg.jugadores.map(j => {
          const loc = s.jugadores.find(x => x.id === j.id);
          return (
            <button key={j.id} className="jugador" style={{ color: "inherit" }} onClick={() => { accion({ tipo: "contestar", jugador: anfitrion, valor: j.id }); accion({ tipo: "revelar" }); }}>
              <span className="marco">{loc && <Avatar p={loc.personaje} size={48} nombre={j.nombre} />}</span>
              <b>{j.nombre}</b>
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Rondas donde cada quien contesta en secreto: ¿Qué prefieres? y ¿Cuánto conoces a tu pareja? */
function Secreto({ e, accion }: { e: EstadoPartida; accion: (a: AccionSinId) => void }) {
  const s = useEstado();
  const v = vistaPublica(e);
  const debenContestar = e.motor === "pareja" ? e.cfg.jugadores.filter(j => j.id in e.privado).map(j => j.id) : e.cfg.jugadores.map(j => j.id);
  const pendiente = localPrimero(debenContestar.filter(id => !v.contestaron.includes(id)))[0];
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
        esRemoto(pendiente) ? <EsperaCelular nombre={nombre(pendiente)} /> :
        mostrando
          ? <Contestar e={e} jugador={pendiente} enviar={valor => accion({ tipo: "contestar", jugador: pendiente, valor })} />
          : <PasarCelular j={s.jugadores.find(x => x.id === pendiente)} onListo={() => setMostrando(true)} />
      ) : (
        <div className="pila">
          <p className="hint" style={{ textAlign: "center" }}>Todos contestaron. Pongan el celular donde todos lo vean.</p>
          <button className="btn principal" data-sin-clic onClick={() => { sonar("revelar"); accion({ tipo: "revelar" }); }}>Revelar</button>
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

/**
 * Cortina de «mantén presionado para ver»: lo secreto solo se ve mientras el dedo (o la tecla Espacio o Enter)
 * está abajo. Al soltar se vuelve a tapar, para que nadie lo vea al pasar el celular.
 * El contenido tapado no se dibuja: no basta con desenfocarlo.
 */
function Cortina({ children, alVer }: { children: React.ReactNode; alVer?: () => void }) {
  const [viendo, setViendo] = useState(false);
  const ver = () => { setViendo(true); alVer?.(); };
  const tapar = () => setViendo(false);
  useEffect(() => {
    if (!viendo) return;
    addEventListener("blur", tapar);
    document.addEventListener("visibilitychange", tapar);
    return () => { removeEventListener("blur", tapar); document.removeEventListener("visibilitychange", tapar); };
  }, [viendo]);
  const tecla = (x: React.KeyboardEvent) => x.key === " " || x.key === "Enter";
  return (
    <div className={"cortina" + (viendo ? " viendo" : "")} role="button" tabIndex={0} data-sin-clic
      aria-label="Mantén presionado para ver tu secreto" aria-pressed={viendo}
      onPointerDown={x => { x.currentTarget.setPointerCapture?.(x.pointerId); ver(); }}
      onPointerUp={tapar} onPointerCancel={tapar} onLostPointerCapture={tapar}
      onKeyDown={x => { if (tecla(x)) { x.preventDefault(); if (!x.repeat) ver(); } }} onKeyUp={x => { if (tecla(x)) tapar(); }} onBlur={tapar}
      onContextMenu={x => x.preventDefault()}>
      {viendo
        ? <div className="cortina-secreto" aria-live="polite">{children}</div>
        : <div className="cortina-tapa">
            <svg viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M14 30c-2-8 2-18 10-18s12 8 10 18M19 34c-1-7 0-14 5-14s6 7 5 16M24 26v12M9 24c1-9 7-16 15-16s14 7 15 16" /></svg>
            <b>Mantén presionado para ver tu secreto</b>
            <small>Al soltar se vuelve a tapar</small>
          </div>}
    </div>
  );
}

/** Navegadores que pueden tapar un campo de texto con puntos; si no, se usa un campo de contraseña. */
const TAPA_CSS = typeof CSS !== "undefined" && CSS.supports?.("-webkit-text-security", "disc");

function Contestar({ e, jugador, enviar }: { e: EstadoPartida; jugador: string; enviar: (v: unknown) => void }) {
  const mio = vistaJugador(e, jugador).mio as { pregunta?: string; papel?: string } | undefined;
  const [texto, setTexto] = useState("");
  const [verTexto, setVerTexto] = useState(false);
  const [eleccion, setEleccion] = useState<"a" | "b" | null>(null);
  const v = vistaPublica(e);
  const otro = e.cfg.jugadores.find(j => j.id !== jugador)?.nombre;

  if (e.motor === "pareja") {
    return (
      <div className="card">
        <span className="label">{mio?.papel === "contesta" ? "Contesta sobre ti" : "Adivina qué contestó tu pareja"}</span>
        <h2>{mio?.pregunta}</h2>
        <div className="escribir">
          <input className={"input" + (verTexto ? "" : " tapado")} type={verTexto || TAPA_CSS ? "text" : "password"} value={texto} maxLength={120} onChange={x => setTexto(x.target.value)} placeholder="Tu respuesta secreta"
            autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-lpignore="true" data-1p-ignore aria-describedby="nota-secreta" />
          <button type="button" className="btn sm ver" data-sin-clic aria-label="Mantén presionado para ver lo que escribiste" aria-pressed={verTexto}
            onPointerDown={() => setVerTexto(true)} onPointerUp={() => setVerTexto(false)} onPointerLeave={() => setVerTexto(false)} onPointerCancel={() => setVerTexto(false)}
            onKeyDown={x => { if (x.key === " " || x.key === "Enter") { x.preventDefault(); setVerTexto(true); } }} onKeyUp={() => setVerTexto(false)} onBlur={() => setVerTexto(false)}>👁</button>
        </div>
        <p id="nota-secreta" className="hint">Lo que escribes queda tapado. Mantén el ojo para revisarlo.</p>
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
  const [yaVio, setYaVio] = useState(false);
  useEffect(() => { setVistos([]); setEtapa("ver"); setMostrando(false); }, [v.ronda]);
  // Los que tienen celular ven su palabra allá; aquí solo pasan el celular los demás.
  const porVer = ids.find(id => !vistos.includes(id) && !esRemoto(id));
  const porVotar = localPrimero(ids.filter(id => !v.contestaron.includes(id)))[0];
  useEffect(() => { setMostrando(false); setYaVio(false); }, [porVer, porVotar]);
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
        <Cortina key={porVer} alVer={() => setYaVio(true)}>
          {mio.rol === "impostor"
            ? <><div className="secreto" style={{ color: "var(--red)" }}>¡ERES EL IMPOSTOR!</div><p className="hint">No sabes la palabra. Escucha y disimula.</p></>
            : <><span className="label">Tu palabra</span><div className="secreto">{mio.palabra}</div></>}
        </Cortina>
        <button className="btn principal" disabled={!yaVio} onClick={() => setVistos(x => [...x, porVer])}>{yaVio ? "Listo, ya la vi" : "Primero mira tu secreto"}</button>
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
    if (esRemoto(porVotar)) return <EsperaCelular nombre={jl(porVotar)?.nombre ?? ""} />;
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
      <button className="btn principal" data-sin-clic onClick={() => { sonar("revelar"); accion({ tipo: "revelar" }); }}>Revelar al impostor</button>
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
  } else if (e.motor === "conteo") {
    const x = r as { jugador: string; logro: number };
    contenido = <h2>{nombre(x.jugador)} logró {x.logro} {x.logro === 1 ? "punto" : "puntos"}</h2>;
  } else if (e.motor === "confesion") {
    const x = r as { confesaron: string[] };
    contenido = <><h2>{x.confesaron.length === 0 ? "Nadie lo ha hecho… dicen." : "Confesaron:"}</h2><p className="hint">{x.confesaron.map(nombre).join(", ")}</p></>;
  } else if (e.motor === "senalar") {
    const x = r as { votos: Record<string, number>; elegidos: string[] };
    contenido = <><h2>{x.elegidos.map(nombre).join(" y ")}</h2><p className="hint">{Object.entries(x.votos).map(([id, n]) => `${nombre(id)}: ${n}`).join(" · ")}. Quien coincidió con la mayoría suma +1.</p></>;
  } else if (e.motor === "competencia") {
    const x = r as { ganador: string };
    contenido = <h2>¡Ganó {nombre(x.ganador)}! +3</h2>;
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
    acciones.acreditar(JUEGOS.find(j => j.id === e.juegoId)?.nombre ?? e.juegoId, res, { juegoId: e.juegoId, jugadores: e.cfg.jugadores.length });
    sonar("fanfarria");
  }, [e.juegoId, res]);
  const jl = (id: string) => s.jugadores.find(j => j.id === id);
  const top = [res[1], res[0], res[2]];
  useAura("#FFCF4A");
  const cuenta = res.some(r => r.xp > 0);
  return (
    <div className="pila">
      {cuenta && <Confeti />}
      <div style={{ alignSelf: "flex-end" }}><BotonSonido /></div>
      <div style={{ textAlign: "center", marginTop: -36 }}><span className="sigla" style={{ fontSize: 40, color: "var(--gold)" }}>GG</span><p className="hint">Fin de partida</p></div>
      <div className="podio">
        {top.map((r, i) => r ? (
          <div key={r.jugador} className={"puesto p" + [2, 1, 3][i]}>
            <span className="sube">{jl(r.jugador) && <Avatar p={jl(r.jugador)!.personaje} size={i === 1 ? 84 : 64} nombre={r.nombre} lider={i === 1} />}</span>
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

/** Gesto en la carta: deslizar a la derecha = Cumplió, a la izquierda = Paso, hacia arriba = mano de cartas. Los botones siguen igual. */
function useArrastre({ activo, derecha, izquierda, arriba }: { activo: boolean; derecha: () => void; izquierda: () => void; arriba: () => void }) {
  const [d, setD] = useState({ x: 0, y: 0 });
  const inicio = useRef<{ x: number; y: number; id: number } | null>(null);
  const UMBRAL = 90;
  const fin = () => {
    const { x, y } = d;
    inicio.current = null;
    setD({ x: 0, y: 0 });
    if (x > UMBRAL) derecha();
    else if (x < -UMBRAL) izquierda();
    else if (y < -UMBRAL) arriba();
  };
  const reducir = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    props: {
      onPointerDown: (e: PE<HTMLDivElement>) => { if (!activo) return; inicio.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; e.currentTarget.setPointerCapture?.(e.pointerId); },
      onPointerMove: (e: PE<HTMLDivElement>) => { const i = inicio.current; if (!i || i.id !== e.pointerId) return; setD({ x: e.clientX - i.x, y: e.clientY - i.y }); },
      onPointerUp: () => { if (inicio.current) fin(); },
      onPointerCancel: () => { inicio.current = null; setD({ x: 0, y: 0 }); },
    },
    estilo: activo && !reducir && (d.x !== 0 || d.y !== 0)
      ? { transform: `translate(${d.x * 0.6}px, ${d.y * 0.4}px) rotate(${d.x / 14}deg)`, transition: "none", touchAction: "none" }
      : { touchAction: activo ? "pan-y" : undefined },
  } as const;
}
