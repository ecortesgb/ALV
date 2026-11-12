// ALV: una sola app. Pestañas de abajo: Inicio, Juegos, Grupo, Historial y Perfil.
// #/jugador y #/pantalla quedan reservadas para los celulares y la TV conectados (paso 5).
import { useEffect, useRef, useState } from "react";
import { CONTENIDO } from "../content";
import { ESCENARIOS, JUEGOS, LUGARES, SECCIONES } from "../content/catalogo";
import { crearAzar } from "../engine/azar";
import { nivelPorXp, XP_EXTRA, xpParaNivel } from "../engine/economia";
import { juegosCompatibles, sorprendeme } from "../engine/filtros";
import { crearPartida, type EstadoPartida } from "../engine/partida";
import type { DefinicionJuego, Intensidad, SeccionId } from "../engine/types";
import { Avatar } from "./Avatar";
import { Avisos, BotonSonido, COLOR_SECCION, Confirmaciones, configuracion, confirmar, Icono, INTENSIDADES, aviso } from "./comun";
import { instalarClics } from "./sonido";
import { acciones, parejaDe, saldosDe, useEstado, type JugadorLocal } from "./estado";
import { sonar } from "./sonido";
import { Partida } from "./Partida";
import { EditorPersonaje, NivelYSaldos } from "./Personaje";

type Ruta = "inicio" | "juegos" | "grupo" | "historial" | "perfil";
const RUTAS: Ruta[] = ["inicio", "juegos", "grupo", "historial", "perfil"];
const leerRuta = (): { ruta: Ruta; arg?: string } => {
  const [r, arg] = location.hash.replace(/^#\/?/, "").split("/");
  return { ruta: (RUTAS as string[]).includes(r ?? "") ? (r as Ruta) : "inicio", arg };
};
export const ir = (r: Ruta, arg?: string) => { location.hash = `/${r}${arg ? `/${arg}` : ""}`; };

export function App() {
  const [{ ruta, arg }, setR] = useState(leerRuta());
  const [partida, setPartida] = useState<EstadoPartida | null>(null);
  useEffect(() => {
    const f = () => setR(leerRuta());
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  useEffect(() => { scrollTo(0, 0); }, [ruta, partida === null]);
  useEffect(instalarClics, []);

  const jugar = (p: EstadoPartida) => setPartida(p);

  return (
    <>
      <main className="app">
        {partida ? <Partida inicial={partida} salir={() => setPartida(null)} />
          : ruta === "inicio" ? <Inicio jugar={jugar} />
          : ruta === "juegos" ? <Juegos jugar={jugar} seccion={arg as SeccionId | undefined} />
          : ruta === "grupo" ? <Grupo editar={arg} />
          : ruta === "historial" ? <Historial />
          : <Perfil />}
      </main>
      {!partida && (
        <nav className="abajo" aria-label="Secciones">
          {([["inicio", "Inicio"], ["juegos", "Juegos"], ["grupo", "Grupo"], ["historial", "Historial"], ["perfil", "Perfil"]] as [Ruta, string][]).map(([r, n]) => (
            <a key={r} href={`#/${r}`} aria-current={ruta === r ? "page" : undefined}>{Icono[r]}{n}</a>
          ))}
        </nav>
      )}
      <BotonSonido />
      <Avisos />
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
      <a className="yo" href="#/perfil" style={{ textDecoration: "none" }}>
        <span className="marco"><Avatar p={yo.personaje} size={38} nombre={yo.nombre} /></span>
        <span className="pila" style={{ gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>{yo.nombre} · Nv {nivel}</span>
          <span className="barra"><span style={{ width: `${avance}%` }} /></span>
        </span>
      </a>
    </div>
  );
}

const DESC_SECCION: Record<SeccionId, string> = {
  mix: "Ruleta de juegos", ptm: "Trampas y mentiras", hdspm: "Hazlo o pásalo", qpm: "Mímica y prohibida",
  gdlv: "Competencias y duelos", parejas: "Amores, líos y verdades", ntp: "El impostor", pvt: "Ruleta, reloj y fiesta",
};

function Inicio({ jugar }: { jugar: (p: EstadoPartida) => void }) {
  const s = useEstado();
  const cfg = configuracion(s);
  const esc = ESCENARIOS.find(e => e.id === cfg.escenario)!;
  const [giro, setGiro] = useState(0);
  const [girando, setGirando] = useState(false);
  const yo = s.jugadores[0]!;
  const sal = saldosDe(yo);

  const girar = () => {
    if (girando) return;
    const azar = crearAzar(Date.now() % 1e6);
    const r = sorprendeme(cfg, azar);
    if (!r) { aviso("No hay juegos para esta configuración."); return; }
    setGirando(true);
    setGiro(g => g + 1440 + azar.entero(360));
    setTimeout(() => { setGirando(false); jugar(crearPartida(r.juego, r.cfg, Date.now() % 100000, CONTENIDO)); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 50 : 3300);
  };

  return (
    <>
      <Encabezado />
      <h1 className="titulo">¿Qué tan buena idea es jugar esto hoy?</h1>
      <button className="heroe" onClick={girar} aria-label="¡Sorpréndeme! Elige un juego al azar">
        <span className="pila" style={{ gap: 6, flex: 1 }}>
          <span className="tag" style={{ color: "#FFE3F0" }}>ALV MIX</span>
          <span className="sigla">{girando ? "GIRANDO…" : "¡SORPRÉNDEME!"}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#FFE3F0" }}>{s.jugadores.length} jugadores · {INTENSIDADES[cfg.intensidad]} · {esc.emoji} {esc.nombre}</span>
        </span>
        <span className="ruleta" style={{ transform: `rotate(${giro}deg)` }} aria-hidden="true" />
      </button>
      <a href="#/perfil" className="card" style={{ flexDirection: "row", alignItems: "center", textDecoration: "none", color: "inherit", padding: "12px 14px" }}>
        {Icono.estrella}
        <span className="pila" style={{ gap: 4, flex: 1 }}>
          <b style={{ fontSize: 13 }}>XP de este evento para cartas de poder</b>
          <span className="hint">{sal.delEvento} XP del evento · {sal.disponible} XP disponible para accesorios</span>
        </span>
        <span className="chip lime">Tienda</span>
      </a>
      <div className="secciones">
        {(Object.keys(SECCIONES) as SeccionId[]).filter(k => k !== "mix").map(k => (
          <a key={k} className="seccion" href={`#/juegos/${k}`} style={{ ["--sc" as string]: COLOR_SECCION[k], textDecoration: "none" }}>
            <span className="sigla">{SECCIONES[k].sigla}</span>
            <b>{SECCIONES[k].trata}</b>
            <small>{DESC_SECCION[k]}</small>
          </a>
        ))}
      </div>
    </>
  );
}

function Juegos({ jugar, seccion }: { jugar: (p: EstadoPartida) => void; seccion?: SeccionId }) {
  const s = useEstado();
  const cfg = configuracion(s);
  const esc = ESCENARIOS.find(e => e.id === cfg.escenario)!;
  const lugar = LUGARES.find(l => l.id === esc.lugar)!;
  const lista = juegosCompatibles(cfg).filter(j => !seccion || j.seccion === seccion);
  const fuera = JUEGOS.filter(j => !lista.includes(j) && (!seccion || j.seccion === seccion));
  const empezar = (j: DefinicionJuego) => jugar(crearPartida(j, cfg, Date.now() % 100000, CONTENIDO));
  const n = s.jugadores.length;

  return (
    <>
      <div className="entre">
        <h1 className="titulo">{seccion ? `${SECCIONES[seccion].sigla} · ${SECCIONES[seccion].trata}` : "Arma la partida"}</h1>
        {seccion && <a className="btn sm" href="#/juegos" style={{ textDecoration: "none" }}>Todas</a>}
      </div>

      <div className="pila">
        <span className="label">Escenario</span>
        <div className="escenarios">
          {ESCENARIOS.filter(e => e.activo).map(e => (
            <button key={e.id} className="escenario" aria-pressed={e.id === cfg.escenario} style={{ ["--sc" as string]: e.color }} onClick={() => acciones.ajustes({ escenario: e.id })}>
              <span className="emoji" aria-hidden="true">{e.emoji}</span>
              <span><b>{e.nombre}</b><small>{e.ambientacion}</small></span>
            </button>
          ))}
        </div>
        <p className="hint">Reglas de {lugar.nombre.toLowerCase()}: nunca {lugar.nuncaSePermite.join(", ").toLowerCase()}. Próximamente: {ESCENARIOS.filter(e => !e.activo).map(e => e.sigla).join(", ")}.</p>
      </div>

      <div className="card">
        <span className="label">Intensidad</span>
        <div className="opciones">
          {([1, 2, 3, 4] as Intensidad[]).map(x => (
            <button key={x} className="opcion" aria-pressed={cfg.intensidad === x} onClick={() => acciones.ajustes({ intensidad: x })}>{INTENSIDADES[x]}</button>
          ))}
        </div>
        <label className="interruptor">Contenido adulto (FAP)<input type="checkbox" checked={s.ajustes.adulto} onChange={async x => {
          const encender = x.target.checked;
          if (encender && !(await confirmar({ titulo: "¿Encender contenido adulto?", texto: "Solo si todos son mayores de 18 y están de acuerdo.", si: "Sí, encender", no: "Mejor no" }))) return;
          acciones.ajustes({ adulto: encender });
        }} /></label>
        <label className="interruptor">Modo Drunk (HBD)<input type="checkbox" checked={s.ajustes.drunk} onChange={x => acciones.ajustes({ drunk: x.target.checked })} /></label>
        {s.ajustes.drunk && <p className="aviso">Siempre hay opción sin alcohol, pasar no tiene castigo, máximo 3 por persona por hora y tomar nunca da XP.</p>}
        <a className="hint" href="#/grupo">{n} jugadores{s.enParejas ? " en parejas" : ""} · cambiar en Grupo →</a>
      </div>

      <span className="label">{lista.length} juegos para tu grupo</span>
      <div className="pila">
        {lista.map(j => (
          <div key={j.id} className="juego" style={{ ["--sc" as string]: COLOR_SECCION[j.seccion] }}>
            <span className="icono">{j.sigla ?? SECCIONES[j.seccion].sigla}</span>
            <span className="texto"><b>{j.nombre}</b><small>{j.descripcion}{n <= 3 && j.modoCorto ? ` ${j.modoCorto}` : ""}</small></span>
            {j.motor ? <button className="btn sm lime" onClick={() => empezar(j)}>Jugar</button> : <span className="chip cyan">Pronto</span>}
          </div>
        ))}
      </div>
      {fuera.length > 0 && <p className="hint">No salen con esta configuración: {fuera.map(j => j.nombre).join(", ")}.</p>}
    </>
  );
}

function Grupo({ editar }: { editar?: string }) {
  const s = useEstado();
  const [premiado, setPremiado] = useState<string | null>(null);
  const j = s.jugadores.find(x => x.id === editar);
  if (j) {
    return (
      <>
        <a className="btn sm" href="#/grupo" style={{ alignSelf: "flex-start", textDecoration: "none" }}>← Grupo</a>
        <NivelYSaldos j={j} />
        <EditorPersonaje j={j} />
      </>
    );
  }
  return (
    <>
      <h1 className="titulo">Tu grupo</h1>
      <p className="hint">Por ahora todos juegan en este dispositivo y cada quien tiene su personaje, su XP y su tienda. Con las cuentas (siguiente paso), cada quien entra desde su celular.</p>
      <label className="interruptor card" style={{ flexDirection: "row" }}>Juegan en parejas (1.º con 2.º, 3.º con 4.º…)
        <input type="checkbox" checked={s.enParejas} onChange={x => acciones.enParejas(x.target.checked)} />
      </label>
      <div className="pila">
        {s.jugadores.map((x, i) => {
          const pareja = s.jugadores.find(o => o.id === parejaDe(i, s));
          return (
            <div key={x.id} className="jugador">
              <a className="marco" href={`#/grupo/${x.id}`} aria-label={`Editar personaje de ${x.nombre}`}><Avatar p={x.personaje} size={48} nombre={x.nombre} /></a>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input value={x.nombre} maxLength={30} aria-label="Nombre" onChange={ev => acciones.renombrar(x.id, ev.target.value)} />
                <small className="muted" style={{ paddingLeft: 8 }}>Nv {nivelPorXp(saldosDe(x).acumulada)}{pareja ? ` · pareja de ${pareja.nombre}` : ""}</small>
              </div>
              <button className="btn sm cyan" aria-label={`Dar XP extra a ${x.nombre}`} onClick={() => setPremiado(x.id)}>+XP</button>
              <a className="btn sm" href={`#/grupo/${x.id}`} style={{ textDecoration: "none" }}>Personaje</a>
              {s.jugadores.length > 2 && <button className="btn sm" aria-label={`Quitar a ${x.nombre}`} onClick={() => acciones.quitar(x.id)}>✕</button>}
            </div>
          );
        })}
      </div>
      {s.jugadores.length < 8 && <button className="btn" onClick={acciones.agregar}>+ Agregar jugador ({s.jugadores.length} de 8)</button>}
      {s.jugadores.find(x => x.id === premiado) && <XpExtra j={s.jugadores.find(x => x.id === premiado)!} cerrar={() => setPremiado(null)} />}
      <div className="card">
        <b>Evento</b>
        <p className="hint">La XP que ganan en este evento sirve para comprar cartas de poder. Al cerrarlo, la que sobre queda solo para accesorios.</p>
        <button className="btn sm" onClick={async () => { if (await confirmar({ titulo: "¿Cerrar el evento?", texto: "La XP del evento ya no comprará cartas.", si: "Sí, cerrar", no: "Seguir en el evento", peligro: true })) { acciones.cerrarEvento(); aviso("Evento cerrado. Empieza uno nuevo."); } }}>Cerrar evento y empezar otro</button>
      </div>
    </>
  );
}

/** El administrador da XP extra a un jugador por algo fuera del juego. Queda en el historial con su motivo. */
function XpExtra({ j, cerrar }: { j: JugadorLocal; cerrar: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [xp, setXp] = useState<number>(XP_EXTRA.opciones[1]);
  const [motivo, setMotivo] = useState("");
  useEffect(() => { if (dlg.current && !dlg.current.open) dlg.current.showModal(); }, []);
  const dar = () => {
    const error = acciones.darXpExtra(j.id, xp, motivo);
    if (error) { sonar("error"); aviso(error); return; }
    sonar("exito");
    aviso(`+${xp} XP extra para ${j.nombre}`);
    cerrar();
  };
  return (
    <dialog ref={dlg} className="modal" aria-labelledby="xp-extra-titulo" onCancel={e => { e.preventDefault(); cerrar(); }} onClick={e => { if (e.target === dlg.current) cerrar(); }}>
      <form className="modal-caja" onSubmit={e => { e.preventDefault(); dar(); }}>
        <h2 id="xp-extra-titulo">XP extra para {j.nombre}</h2>
        <p className="hint">Un plus por algo fuera del juego. Cuenta para su nivel y su saldo, y queda en el historial.</p>
        <div className="opciones" role="group" aria-label="Cuánta XP">
          {XP_EXTRA.opciones.map(n => <button type="button" key={n} className="opcion" aria-pressed={xp === n} onClick={() => setXp(n)}>+{n}</button>)}
        </div>
        <input className="input" value={motivo} maxLength={XP_EXTRA.motivoMax} onChange={e => setMotivo(e.target.value)} placeholder="Motivo (ej. ganó el concurso de clavados de panza)" aria-label="Motivo" />
        <div className="modal-botones">
          <button type="submit" className="btn lime" data-sin-clic disabled={!motivo.trim()}>Dar +{xp} XP</button>
          <button type="button" className="btn" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </dialog>
  );
}

function Historial() {
  const s = useEstado();
  return (
    <>
      <h1 className="titulo">Historial</h1>
      {s.historial.length === 0 && <p className="hint">Aquí aparecen las partidas que terminen.</p>}
      {s.historial.map((p, i) => (
        <div key={i} className="card">
          <div className="entre"><b>{p.extra ? `XP extra · ${p.extra}` : p.juego}</b><small className="muted">{new Date(p.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</small></div>
          {p.resultados.map((r, k) => <div key={k} className="entre"><span>{p.extra ? `${r.nombre} · la dio el administrador` : `${k + 1}. ${r.nombre} · ${r.puntos} pts`}</span><span className="chip lime">+{r.xp} XP</span></div>)}
        </div>
      ))}
    </>
  );
}

function Perfil() {
  const s = useEstado();
  const yo = s.jugadores[0]!;
  return (
    <>
      <h1 className="titulo">Tu personaje</h1>
      <NivelYSaldos j={yo} />
      <EditorPersonaje j={yo} />
    </>
  );
}
