// ALV: una sola app. Pestañas de abajo: Inicio, Lobby, Tienda, Ranking y Perfil.
// El flujo es como en los juegos de futbol en línea: Jugar → lobby con los personajes → condiciones → Iniciar → carga → partida.
import { useEffect, useRef, useState } from "react";
import { ESCENARIOS, JUEGOS, SECCIONES } from "../content/catalogo";
import { crearAzar } from "../engine/azar";
import { nivelPorXp, xpParaNivel } from "../engine/economia";
import { sorprendeme } from "../engine/filtros";
import { logrosDe } from "../engine/logros";
import type { EstadoPartida } from "../engine/partida";
import type { SeccionId } from "../engine/types";
import { Avatar } from "./Avatar";
import { Cuenta, SincroCuenta } from "./Cuenta";
import { hayNube, sesionActual } from "./nube";
import { Avisos, BotonSonido, COLOR_SECCION, Confirmaciones, configuracion, Icono, INTENSIDADES, aviso } from "./comun";
import { Confeti, Fondo } from "./efectos";
import { acciones, type JugadorLocal, parejaDe, saldosDe, useEstado } from "./estado";
import { Lobby } from "./Lobby";
import { Partida } from "./Partida";
import { EditorPersonaje, NivelYSaldos, Tienda } from "./Personaje";
import { Ranking } from "./Ranking";
import { SincroSala, Unirse } from "./Sala";
import { useAPartidaDeSala } from "./PartidaCelular";
import { instalarClics, sonar } from "./sonido";

type Ruta = "inicio" | "lobby" | "tienda" | "ranking" | "perfil" | "unirse";
const RUTAS: Ruta[] = ["inicio", "lobby", "tienda", "ranking", "perfil", "unirse"];
/** Rutas viejas que siguen funcionando si alguien las tenía guardadas. */
const ANTES: Record<string, Ruta> = { juegos: "lobby", grupo: "lobby", historial: "ranking" };
const NOMBRES: [Exclude<Ruta, "unirse">, string][] = [["inicio", "Inicio"], ["lobby", "Lobby"], ["tienda", "Tienda"], ["ranking", "Ranking"], ["perfil", "Perfil"]];

const leerRuta = (): { ruta: Ruta; arg?: string } => {
  const [r = "", arg] = location.hash.replace(/^#\/?/, "").split("/");
  if (r in ANTES) return { ruta: ANTES[r]!, arg: r === "juegos" && arg ? `s-${arg}` : undefined };
  return { ruta: (RUTAS as string[]).includes(r) ? (r as Ruta) : "inicio", arg };
};
export const ir = (r: Ruta, arg?: string) => { location.hash = `/${r}${arg ? `/${arg}` : ""}`; };

export function App() {
  const [{ ruta, arg }, setR] = useState(leerRuta());
  const [partida, setPartida] = useState<EstadoPartida | null>(null);
  const paleta = useEstado().ajustes.paleta;
  useEffect(() => { document.documentElement.dataset.paleta = paleta === "lounge" ? "lounge" : "neon"; }, [paleta]);
  useEffect(() => { void sesionActual(); }, []);
  useEffect(() => {
    const f = () => setR(leerRuta());
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  useEffect(() => { scrollTo(0, 0); }, [ruta, partida === null]);
  useEffect(instalarClics, []);

  const ancho = !!partida || ruta === "lobby" || ruta === "ranking";
  return (
    <>
      <Fondo />
      <main className={"app" + (ancho ? " ancho" : "")}>
        {partida ? <Partida inicial={partida} salir={() => setPartida(null)} />
          : ruta === "inicio" ? <Inicio />
          : ruta === "lobby" ? <Lobby jugar={setPartida} arg={arg} />
          : ruta === "tienda" ? <PaginaTienda id={arg} />
          : ruta === "ranking" ? <Ranking />
          : ruta === "unirse" ? <PaginaUnirse codigo={arg} />
          : <Perfil id={arg} />}
      </main>
      {!partida && (
        <nav className="abajo" aria-label="Secciones">
          {NOMBRES.map(([r, n]) => (
            <a key={r} href={`#/${r}`} aria-current={ruta === r ? "page" : undefined}>{Icono[r]}{n}</a>
          ))}
        </nav>
      )}
      <AvisoPartidaSala ruta={ruta} />
      <Avisos />
      <SincroCuenta />
      <SincroSala />
      <Confirmaciones />
    </>
  );
}

function Encabezado() {
  const s = useEstado();
  const yo = s.jugadores[0]!;
  const xp = saldosDe(yo).acumulada, nivel = nivelPorXp(xp);
  const avance = ((xp - xpParaNivel(nivel)) / (xpParaNivel(nivel + 1) - xpParaNivel(nivel))) * 100;
  return (
    <div className="entre">
      <div>
        <h1 className="logo"><b>A</b>LV</h1>
        <div className="tag">AMIGOS, LOCURAS Y VERDADES</div>
      </div>
      <div className="fila" style={{ gap: 8 }}>
      <BotonSonido />
      <a className="yo" href="#/perfil" style={{ textDecoration: "none" }}>
        <span className="marco"><Avatar p={yo.personaje} size={38} nombre={yo.nombre} /></span>
        <span className="pila" style={{ gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>{yo.nombre} · Nv {nivel}</span>
          <span className="barra"><span style={{ width: `${avance}%` }} /></span>
        </span>
      </a>
      </div>
    </div>
  );
}

const DESC_SECCION: Record<SeccionId, string> = {
  mix: "Ruleta de juegos", ptm: "Trampas y mentiras", hdspm: "Hazlo o pásalo", qpm: "Mímica y prohibida",
  gdlv: "Competencias y duelos", parejas: "Amores, líos y verdades", ntp: "El impostor", pvt: "Ruleta, reloj y fiesta",
};

function Inicio() {
  const s = useEstado();
  const cfg = configuracion(s);
  const esc = ESCENARIOS.find(e => e.id === cfg.escenario)!;
  const [giro, setGiro] = useState(0);
  const [girando, setGirando] = useState(false);
  const yo = s.jugadores[0]!;
  const sal = saldosDe(yo);
  const probados = new Set(s.historial.map(h => h.juego));

  const [celebra, setCelebra] = useState(false);
  const cuadro = useRef(0);
  useEffect(() => () => { cancelAnimationFrame(cuadro.current); clearTimeout(cuadro.current); }, []);

  /** Ruleta con fricción: gira rápido y frena con curva. Un clic por cada segmento que pasa. */
  const girar = () => {
    if (girando) return;
    const azar = crearAzar(Date.now() % 1e6);
    const r = sorprendeme(cfg, azar);
    if (!r) { aviso("No hay juegos para esta configuración."); return; }
    const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desde = giro, hasta = giro + 1440 + azar.entero(360), dur = reducir ? 50 : 3200;
    const t0 = performance.now();
    let segAnt = Math.floor(desde / 45);
    setGirando(true);
    const paso = (ahora: number) => {
      const k = Math.min(1, (ahora - t0) / dur);
      const ang = desde + (hasta - desde) * (1 - Math.pow(1 - k, 3));
      setGiro(ang);
      const seg = Math.floor(ang / 45);
      if (seg !== segAnt) { segAnt = seg; if (!reducir) sonar("tic"); }
      if (k < 1) cuadro.current = requestAnimationFrame(paso);
      else {
        setGirando(false); sonar("exito");
        // Destello con confeti en la categoría ganadora (tanda 3); luego se abre el juego.
        setCelebra(true);
        cuadro.current = window.setTimeout(() => ir("lobby", `j-${r.juego.id}`), reducir ? 0 : 1100) as unknown as number;
      }
    };
    cuadro.current = requestAnimationFrame(paso);
  };

  return (
    <>
      <Encabezado />
      {celebra && <Confeti duracion={1100} />}
      <h1 className="titulo">¿Qué tan buena idea es jugar esto hoy?</h1>
      <button className="heroe" onClick={girar} aria-label="¡Sorpréndeme! Elige un juego al azar">
        <span className="pila" style={{ gap: 6, flex: 1 }}>
          <span className="tag" style={{ color: "#FFE3F0" }}>ALV MIX</span>
          <span className="sigla">{girando ? "GIRANDO…" : "¡SORPRÉNDEME!"}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#FFE3F0" }}>{s.jugadores.length} jugadores · {INTENSIDADES[cfg.intensidad]} · {esc.emoji} {esc.nombre}</span>
        </span>
        <span className="ruleta" style={{ transform: `rotate(${giro}deg)`, transition: "none" }} aria-hidden="true" />
      </button>
      <a href="#/lobby" className="btn principal jugar">JUGAR · ABRIR LOBBY</a>
      {hayNube && (s.sala
        ? <a href="#/lobby" className="btn cyan" style={{ textAlign: "center", textDecoration: "none" }}>{s.sala.anfitrion ? "Tu sala" : "Estás en la sala"} {s.sala.codigo} · {s.miembros?.length ?? 1} conectados</a>
        : <a href="#/unirse" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>📱 Entrar a una sala con código</a>)}
      <a href="#/tienda" className="card" style={{ flexDirection: "row", alignItems: "center", textDecoration: "none", color: "inherit", padding: "12px 14px" }}>
        {Icono.estrella}
        <span className="pila" style={{ gap: 4, flex: 1 }}>
          <b style={{ fontSize: 13 }}>XP de este evento para cartas de poder</b>
          <span className="hint">{sal.delEvento} XP del evento · {sal.disponible} XP disponible para accesorios</span>
        </span>
        <span className="chip lime">Tienda</span>
      </a>
      <div className="secciones">
        {(Object.keys(SECCIONES) as SeccionId[]).filter(k => k !== "mix").map(k => {
          // Progreso: juegos de la sección que ya se jugaron en este dispositivo (el historial guarda el nombre).
          const del = JUEGOS.filter(j => j.seccion === k && j.motor);
          const hechos = del.filter(j => probados.has(j.nombre)).length;
          const pct = del.length ? (hechos / del.length) * 100 : 0;
          return (
            <a key={k} className="seccion" href={`#/lobby/s-${k}`} style={{ ["--sc" as string]: COLOR_SECCION[k], textDecoration: "none" }}>
              <span className="sigla">{SECCIONES[k].sigla}</span>
              <b>{SECCIONES[k].trata}</b>
              <small>{DESC_SECCION[k]}</small>
              <span className="barra" style={{ marginTop: 6 }} role="img" aria-label={`${hechos} de ${del.length} juegos jugados`}><span style={{ width: `${pct}%`, background: "var(--sc)" }} /></span>
              <small>{hechos} de {del.length} jugados</small>
            </a>
          );
        })}
      </div>
    </>
  );
}

/** Elige de qué jugador se trata (todos juegan en este dispositivo por ahora). */
function QuienSoy({ id, base }: { id?: string; base: "tienda" | "perfil" }) {
  const s = useEstado();
  const actual = s.jugadores.find(j => j.id === id) ?? s.jugadores[0]!;
  return (
    <div className="chips quien-soy" role="group" aria-label="Jugador">
      {s.jugadores.map(j => (
        <a key={j.id} className="opcion" href={`#/${base}/${j.id}`} aria-pressed={j.id === actual.id} aria-current={j.id === actual.id ? "true" : undefined}>
          <Avatar p={j.personaje} size={22} nombre={j.nombre} /> {j.nombre}
        </a>
      ))}
    </div>
  );
}

/** En el celular invitado: si el anfitrión empezó una partida y estás en otra pestaña, un botón te lleva. */
function AvisoPartidaSala({ ruta }: { ruta: Ruta }) {
  const p = useAPartidaDeSala();
  if (!p || ruta === "lobby") return null;
  return <a className="btn principal aviso-partida" href="#/lobby">¡Empezó la partida! Ir a jugar →</a>;
}

function PaginaUnirse({ codigo }: { codigo?: string }) {
  const s = useEstado();
  const conCuenta = !!s.cuenta;
  return (
    <>
      <h1 className="titulo">Sala</h1>
      {!conCuenta && <Cuenta j={s.jugadores[0]!} />}
      <Unirse codigo={codigo} />
    </>
  );
}

function PaginaTienda({ id }: { id?: string }) {
  const s = useEstado();
  const j = s.jugadores.find(x => x.id === id) ?? s.jugadores[0]!;
  return (
    <>
      <div className="entre"><h1 className="titulo">Tienda</h1><span className="chip lime">{saldosDe(j).disponible} XP disponible</span></div>
      <QuienSoy id={j.id} base="tienda" />
      <Tienda j={j} />
    </>
  );
}

function LogrosDe({ j }: { j: JugadorLocal }) {
  const s = useEstado();
  const datos = s.jugadores.map((x, i) => ({ id: x.id, nombre: x.nombre, delEvento: saldosDe(x).delEvento, pareja: parejaDe(i, s) }));
  const lista = logrosDe(j.id, datos, s.historial);
  const ganados = lista.filter(l => l.ganado).length;
  return (
    <section className="card" aria-labelledby="t-logros">
      <div className="entre"><h2 id="t-logros">Logros</h2><small className="muted">{ganados} de {lista.length}</small></div>
      <ul className="logros">
        {lista.map(l => (
          <li key={l.clave} className={"logro" + (l.ganado ? " ganado" : "")}>
            <b>{l.nombre}</b>
            <small className="muted">{l.ambito === "sesion" ? "Sesión" : "Histórico"} · {l.descripcion}</small>
            {l.ganado && <span className="chip lime">Ganado</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Compara la paleta de neón (por defecto) con Midnight Lounge. Solo cambia colores, no el juego. */
function Paleta() {
  const actual = useEstado().ajustes.paleta === "lounge" ? "lounge" : "neon";
  const opciones: { k: "neon" | "lounge"; nombre: string; colores: string[] }[] = [
    { k: "neon", nombre: "Neón sofisticado", colores: ["#0E0A1F", "#1B1230", "#FF2E88", "#22E1FF"] },
    { k: "lounge", nombre: "Midnight Lounge", colores: ["#0B0E14", "#161B26", "#E8417F", "#7FDDF2"] },
  ];
  return (
    <section className="card" aria-labelledby="t-paleta">
      <div className="entre"><h2 id="t-paleta">Paleta</h2><small className="muted">Solo cambia los colores</small></div>
      <div className="paleta-opciones" role="group" aria-label="Paleta de colores">
        {opciones.map(o => (
          <button key={o.k} className="opcion" aria-pressed={actual === o.k} onClick={() => acciones.ajustes({ paleta: o.k })} style={{ padding: 10, textAlign: "left" }}>
            {o.nombre}
            <span className="paleta-muestra" aria-hidden="true">{o.colores.map(c => <span key={c} style={{ background: c }} />)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Perfil({ id }: { id?: string }) {
  const s = useEstado();
  const j = s.jugadores.find(x => x.id === id) ?? s.jugadores[0]!;
  return (
    <>
      <h1 className="titulo">Tu personaje</h1>
      <QuienSoy id={j.id} base="perfil" />
      <NivelYSaldos j={j} />
      <Cuenta j={j} />
      <Paleta />
      <LogrosDe j={j} />
      <EditorPersonaje j={j} />
    </>
  );
}
