// Una sola app con tres interfaces: #/anfitrion, #/jugador y #/pantalla.
// Por ahora el Anfitrión corre una partida local con el motor real; Jugador y Pantalla se conectan en la fase F3.
import { useEffect, useMemo, useState } from "react";
import { CONTENIDO } from "../content";
import { ESCENARIOS, JUEGOS, LUGARES, SECCIONES } from "../content/catalogo";
import { juegosCompatibles } from "../engine/filtros";
import { aplicar, crearPartida, resultados, type AccionSinId, type EstadoPartida } from "../engine/partida";
import { vistaPublica } from "../engine/vistas";
import type { Configuracion, EscenarioId, Intensidad, Jugador } from "../engine/types";

type Ruta = "anfitrion" | "jugador" | "pantalla";
const rutaActual = (): Ruta => {
  const h = location.hash.replace("#/", "");
  return h === "jugador" || h === "pantalla" ? h : "anfitrion";
};

export function App() {
  const [ruta, setRuta] = useState<Ruta>(rutaActual());
  useEffect(() => {
    const f = () => setRuta(rutaActual());
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return (
    <div className="app">
      <h1 className="logo">A<b>L</b>V</h1>
      <p className="sub">Amigos, Locuras y Verdades</p>
      <nav className="tabs">
        <a href="#/anfitrion" className={ruta === "anfitrion" ? "on" : ""}>Anfitrión</a>
        <a href="#/jugador" className={ruta === "jugador" ? "on" : ""}>Jugador</a>
        <a href="#/pantalla" className={ruta === "pantalla" ? "on" : ""}>Pantalla</a>
      </nav>
      {ruta === "anfitrion" && <Anfitrion />}
      {ruta !== "anfitrion" && (
        <div className="card">
          <h2>{ruta === "jugador" ? "Tu celular" : "Pantalla (TV)"}</h2>
          <p className="muted">Se conecta a la sala en la fase F3: cuentas, QR y tiempo real.</p>
        </div>
      )}
    </div>
  );
}

const NOMBRES = ["Jugador 1", "Jugador 2", "Jugador 3", "Jugador 4", "Jugador 5", "Jugador 6", "Jugador 7", "Jugador 8"];
const INTENSIDADES = ["", "Tranquilo", "Picante", "Sin filtro", "Salvaje"];

function armarJugadores(n: number, enParejas: boolean): Jugador[] {
  return NOMBRES.slice(0, n).map((nombre, i) => {
    const otro = i % 2 === 0 ? i + 1 : i - 1;
    return { id: `j${i}`, nombre, parejaDe: enParejas && otro < n ? `j${otro}` : undefined };
  });
}

function Anfitrion() {
  const [n, setN] = useState(4);
  const [parejas, setParejas] = useState(true);
  const [escenario, setEscenario] = useState<EscenarioId>("alverca");
  const [intensidad, setIntensidad] = useState<Intensidad>(2);
  const [adulto, setAdulto] = useState(false);
  const [drunk, setDrunk] = useState(false);
  const [partida, setPartida] = useState<EstadoPartida | null>(null);
  const [cuenta, setCuenta] = useState(0);

  const esc = ESCENARIOS.find(e => e.id === escenario)!;
  const cfg: Configuracion = useMemo(() => ({
    jugadores: armarJugadores(n, parejas), lugar: esc.lugar, escenario, intensidad, dificultad: 1, adulto, drunk,
  }), [n, parejas, esc.lugar, escenario, intensidad, adulto, drunk]);
  const compatibles = juegosCompatibles(cfg);
  const lugar = LUGARES.find(l => l.id === esc.lugar)!;

  const accion = (a: AccionSinId) => {
    setCuenta(c => c + 1);
    setPartida(p => (p ? aplicar(p, { ...a, id: `local-${cuenta}-${Date.now()}` } as Parameters<typeof aplicar>[1], CONTENIDO) : p));
  };

  if (partida) return <PartidaLocal e={partida} accion={accion} salir={() => setPartida(null)} />;

  return (
    <>
      <div className="card">
        <h2>Escenario</h2>
        <div className="chips">
          {ESCENARIOS.filter(e => e.activo).map(e => (
            <button key={e.id} className={"chip" + (e.id === escenario ? " on" : "")} style={{ ["--esc" as string]: e.color }} onClick={() => setEscenario(e.id)}>
              {e.emoji} {e.nombre}<small>{e.ambientacion}</small>
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 12 }}>Reglas de {lugar.nombre}: nunca {lugar.nuncaSePermite.join(", ").toLowerCase()}.</p>
      </div>

      <div className="card">
        <h2>Configurador</h2>
        <div className="grid">
          <label className="f">Jugadores
            <select value={n} onChange={e => setN(Number(e.target.value))}>
              {[2, 3, 4, 5, 6, 7, 8].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="f">Intensidad
            <select value={intensidad} onChange={e => setIntensidad(Number(e.target.value) as Intensidad)}>
              {[1, 2, 3, 4].map(x => <option key={x} value={x}>{INTENSIDADES[x]}</option>)}
            </select>
          </label>
          <label className="toggle"><input type="checkbox" checked={parejas} onChange={e => setParejas(e.target.checked)} /> En parejas</label>
          <label className="toggle"><input type="checkbox" checked={adulto} onChange={e => setAdulto(e.target.checked)} /> Contenido adulto</label>
          <label className="toggle"><input type="checkbox" checked={drunk} onChange={e => setDrunk(e.target.checked)} /> Modo Drunk (HBD)</label>
        </div>
        {drunk && <p className="aviso">Drunk: siempre hay opción sin alcohol, pasar no tiene castigo y máximo 3 por persona por hora.</p>}
      </div>

      <div className="card">
        <h2>Juegos para esta configuración ({compatibles.length} de {JUEGOS.length})</h2>
        {compatibles.map(j => (
          <div className="juego" key={j.id}>
            <div>
              <span className="sigla">{SECCIONES[j.seccion].sigla}{j.sigla ? ` · ${j.sigla}` : ""}</span>
              <div><b>{j.nombre}</b></div>
              <div className="muted">{j.descripcion}{n <= 3 && j.modoCorto ? ` ${j.modoCorto}` : ""}</div>
            </div>
            {j.motor
              ? <button className="btn" onClick={() => setPartida(crearPartida(j, cfg, Date.now() % 100000, CONTENIDO))}>Jugar</button>
              : <span className="muted">Pronto</span>}
          </div>
        ))}
      </div>
    </>
  );
}

/** Partida en un solo dispositivo: sirve para probar el motor antes de conectar los celulares. */
function PartidaLocal({ e, accion, salir }: { e: EstadoPartida; accion: (a: AccionSinId) => void; salir: () => void }) {
  const v = vistaPublica(e);
  const nombre = (id?: string) => v.jugadores.find(j => j.id === id)?.nombre ?? "";
  const pendientes = e.cfg.jugadores.filter(j => !(j.id in e.respuestas) && (e.motor !== "turnos-cartas" || j.id === e.turnoDe));

  return (
    <div className="card">
      <h2>Ronda {v.ronda} de {v.totalRondas} · {JUEGOS.find(j => j.id === v.juegoId)?.nombre}</h2>
      {v.fase === "terminada" ? (
        <>
          <p><b>Resultados</b></p>
          {resultados(e).map(r => <div key={r.jugador}>{r.lugar}. {r.nombre} — {r.puntos} pts · +{r.xp} XP</div>)}
          <p style={{ marginTop: 16 }}><button className="btn" onClick={salir}>Volver</button></p>
        </>
      ) : (
        <>
          <div className="carta">
            {v.turnoDe && <div className="muted" style={{ fontSize: 14 }}>Turno de {nombre(v.turnoDe)}</div>}
            {v.carta?.texto ?? "Sin cartas para esta configuración"}
            {v.carta?.opcionB && <div style={{ marginTop: 8 }}>o… {v.carta.opcionB}</div>}
          </div>
          <p className="muted">{v.contestaron.length} ya contestaron. En la versión con celulares, cada quien contesta en el suyo.</p>
          {v.fase === "contestando" && pendientes.map(j => (
            <div key={j.id} style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0", flexWrap: "wrap" }}>
              <b style={{ minWidth: 90 }}>{j.nombre}</b>
              <Respuesta e={e} jugador={j.id} enviar={valor => accion({ tipo: "contestar", jugador: j.id, valor })} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {v.fase === "contestando" && <button className="btn" disabled={pendientes.length > 0} onClick={() => accion({ tipo: "revelar" })}>Revelar</button>}
            {v.fase === "revelada" && <button className="btn" onClick={() => accion({ tipo: "siguiente" })}>Siguiente</button>}
            <button className="btn sec" onClick={() => accion({ tipo: "terminar" })}>Terminar</button>
          </div>
          {v.fase === "revelada" && <pre className="muted" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(v.revelado, null, 1)}</pre>}
        </>
      )}
      <div className="puntos" style={{ marginTop: 16 }}>{v.jugadores.map(j => <span key={j.id}>{j.nombre}: {v.puntos[j.id]}</span>)}</div>
    </div>
  );
}

function Respuesta({ e, jugador, enviar }: { e: EstadoPartida; jugador: string; enviar: (v: unknown) => void }) {
  const [texto, setTexto] = useState("");
  if (e.motor === "turnos-cartas") return <><button className="btn" onClick={() => enviar("cumplio")}>Cumplió</button><button className="btn sec" onClick={() => enviar("paso")}>Pasa</button></>;
  if (e.motor === "votacion") {
    if (e.cfg.jugadores.length === 2) return <><button className="btn sec" onClick={() => enviar({ eleccion: "a", prediccion: "a" })}>A (y cree A)</button><button className="btn sec" onClick={() => enviar({ eleccion: "b", prediccion: "a" })}>B (y cree A)</button></>;
    return <><button className="btn sec" onClick={() => enviar("a")}>A</button><button className="btn sec" onClick={() => enviar("b")}>B</button></>;
  }
  if (e.motor === "rol-secreto") {
    return <select defaultValue="" onChange={ev => ev.target.value && enviar(ev.target.value)}><option value="">Votar por…</option>
      {e.cfg.jugadores.filter(j => j.id !== jugador).map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}</select>;
  }
  return <><input value={texto} maxLength={120} onChange={ev => setTexto(ev.target.value)} placeholder="Respuesta secreta" style={{ background: "var(--btn)", border: "1px solid var(--line)", borderRadius: 10, padding: 10 }} />
    <button className="btn" disabled={!texto.trim()} onClick={() => enviar(texto)}>Enviar</button></>;
}
