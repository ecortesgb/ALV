// ALV: una sola app. Pestañas de abajo: Inicio, Lobby, Tienda, Ranking y Perfil.
// El flujo es como en los juegos de futbol en línea: Jugar → lobby con los personajes → condiciones → Iniciar → carga → partida.
import { useEffect, useState } from "react";
import { logrosDe } from "../engine/logros";
import type { EstadoPartida } from "../engine/partida";
import { Retrato } from "./Avatar";
import { Cuenta, SincroCuenta } from "./Cuenta";
import { hayNube, sesionActual } from "./nube";
import { Avisos, Confirmaciones, Icono } from "./comun";
import { Fondo } from "./efectos";
import { type JugadorLocal, parejaDe, saldosDe, useEstado } from "./estado";
import { Lobby } from "./Lobby";
import { Partida } from "./Partida";
import { EditorPersonaje, Tienda } from "./Personaje";
import { SelectorEquipo, TarjetaJugador } from "./Tarjetas";
import { Ranking } from "./Ranking";
import { SincroSala, Unirse } from "./Sala";
import { useAPartidaDeSala } from "./PartidaCelular";
import { instalarClics } from "./sonido";
import { CabeceraJuego, Hub, PantallaModos } from "./Hub";
import { Notificaciones, PaginaAjustes, PaginaFisico, PantallaCarga, PantallaCuenta } from "./Bienvenida";

type Ruta = "inicio" | "lobby" | "tienda" | "ranking" | "perfil" | "unirse" | "fisico" | "ajustes" | "jugar";
const RUTAS: Ruta[] = ["inicio", "lobby", "tienda", "ranking", "perfil", "unirse", "fisico", "ajustes", "jugar"];
/** Rutas viejas que siguen funcionando si alguien las tenía guardadas. */
const ANTES: Record<string, Ruta> = { juegos: "lobby", grupo: "lobby", historial: "ranking" };
const NOMBRES: [Exclude<Ruta, "unirse" | "fisico" | "ajustes" | "jugar">, string][] = [["inicio", "Inicio"], ["lobby", "Lobby"], ["tienda", "Tienda"], ["ranking", "Ranking"], ["perfil", "Perfil"]];

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

  // Entrada: pantalla de carga (una vez por visita) → cuenta (si hay servidor y no hay sesión) → novedades → menú.
  const [entrada, setEntrada] = useState<"carga" | "cuenta" | "avisos" | "lista">(() => {
    try { return sessionStorage.getItem("alv.iniciado") ? "lista" : "carga"; } catch { return "carga"; }
  });
  const iniciar = async () => {
    try { sessionStorage.setItem("alv.iniciado", "1"); } catch { /* sin almacenamiento */ }
    setEntrada(hayNube && !(await sesionActual()) ? "cuenta" : "avisos");
  };
  // La primera vez que alguien crea su cuenta entra directo a armar su personaje.
  const trasCuenta = (creada: boolean) => { if (creada) { ir("perfil"); setEntrada("lista"); } else setEntrada("avisos"); };

  const ancho = !!partida || ruta === "lobby" || ruta === "ranking" || ruta === "fisico";
  return (
    <>
      <Fondo />
      <main className={"app" + (ancho ? " ancho" : "") + (!partida && (ruta === "inicio" || ruta === "jugar") ? " inmersiva" : "")}>
        {partida ? <Partida inicial={partida} salir={() => setPartida(null)} />
          : ruta === "inicio" ? <Hub abrirNovedades={() => setEntrada("avisos")} />
          : ruta === "jugar" ? <PantallaModos />
          : ruta === "lobby" ? <Lobby jugar={setPartida} arg={arg} />
          : ruta === "tienda" ? <PaginaTienda id={arg} />
          : ruta === "ranking" ? <Ranking />
          : ruta === "unirse" ? <PaginaUnirse codigo={arg} />
          : ruta === "fisico" ? <PaginaFisico />
          : ruta === "ajustes" ? <PaginaAjustes />
          : <Perfil id={arg} />}
      </main>
      {!partida && ruta !== "inicio" && ruta !== "jugar" && (
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
      {entrada === "carga" && <PantallaCarga iniciar={() => void iniciar()} />}
      {entrada === "cuenta" && <PantallaCuenta seguir={trasCuenta} />}
      {entrada === "avisos" && !partida && <Notificaciones cerrar={() => setEntrada("lista")} />}
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
          <Retrato j={j} size={22} /> {j.nombre}
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
      <section className="card">
        <h2>¿Tú armas la sala?</h2>
        <p className="hint">Crea la sala desde el lobby y comparte el código o el QR. Pueden entrar hasta 8.</p>
        <a className="btn principal jugar" href="#/lobby">Crear mi sala</a>
      </section>
    </>
  );
}

function PaginaTienda({ id }: { id?: string }) {
  const s = useEstado();
  const j = s.jugadores.find(x => x.id === id) ?? s.jugadores[0]!;
  return (
    <>
      <CabeceraJuego titulo="Tienda" color="#FFC23D" derecha={<span className="hub-moneda"><i aria-hidden="true">✦</i>{saldosDe(j).disponible}</span>} />
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

type PestanaCasillero = "armar" | "equipo" | "logros" | "cuenta";
const PESTANAS_CASILLERO: [PestanaCasillero, string, string][] = [["armar", "🧱", "Armar"], ["equipo", "🛡️", "Equipo"], ["logros", "🏅", "Logros"], ["cuenta", "👤", "Cuenta"]];

/** Casillero: tu carta arriba y pestañas para armar al personaje, el equipo, los logros y la cuenta. */
function Perfil({ id }: { id?: string }) {
  const s = useEstado();
  const j = s.jugadores.find(x => x.id === id) ?? s.jugadores[0]!;
  const [tab, setTab] = useState<PestanaCasillero>("armar");
  return (
    <>
      <CabeceraJuego titulo="Casillero" color="#FF2E88" />
      <QuienSoy id={j.id} base="perfil" />
      <TarjetaJugador j={j} />
      <div className="pestanas-menu casillero-tabs" role="tablist" aria-label="Casillero">
        {PESTANAS_CASILLERO.map(([k, ic, n]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}><span aria-hidden="true">{ic}</span> {n}</button>)}
      </div>
      <div key={tab} className="casillero-panel">
        {tab === "armar" && <EditorPersonaje j={j} />}
        {tab === "equipo" && <SelectorEquipo j={j} />}
        {tab === "logros" && <LogrosDe j={j} />}
        {tab === "cuenta" && (hayNube ? <Cuenta j={j} /> : <p className="hint">Las cuentas necesitan conexión con el servidor.</p>)}
      </div>
    </>
  );
}
