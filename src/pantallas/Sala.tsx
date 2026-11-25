// La sala en el celular (#/sala/código): espera, partida y resultados, en un solo lugar.
// El papel es del aparato: aquí siempre se juega. A quien tiene el control le sale además la barra del anfitrión.
// Sin pantalla (modo mesa), el celular del anfitrión también corre el motor y se queda encendido.
import { useEffect, useState } from "react";
import { Chip, Escaner, Panel, Reloj } from "../ds";
import { ir } from "../app/rutas";
import { refrescarSesion, useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { enlace, esLocal, modoLocal, type SalaV } from "../servicios/enlace";
import type { FiguraV2 } from "../content/personaje";
import type { ColorJugador } from "../app/colorJugador";
import { LOBBY_NUEVO } from "./lobby/version";
import { FichaJugador } from "./lobby/Ficha";
import { AvisoCuarto, FondoCuarto } from "./lobby/Cuarto";
import { FondoEscenario } from "./Fondos";
import { ComoJugar, tocaExplicar } from "../juegos/general/ComoJugar";
import type { PresenciaPantalla } from "../servicios/tiempoReal";
import { HerramientaCelular, type MiVista } from "../juegos/general/celular";
import { esPublico, marcador, nombreJuego, quedan, type Publico } from "../juegos/general/texto";
import { control, entregarCopas, jugada, useMotor } from "../roles/pantalla/motor";
import { AnuncioDiscusion, PapelNave, useAnuncioDiscusion } from "../juegos/impostor/papelNave";
import { esFinalDeJuego } from "../juegos/general/Copas";
import { useSala } from "../roles/sala";
import { Marco, aviso, confirmar } from "./comun";
import { colorDe } from "../app/colorJugador";
import { Lobby } from "./lobby/Lobby";
import { useColoresSala } from "./lobby/colores";
import { BotonCast } from "./lobby/Cast";
import { MesaJuego } from "./MesaJuego";

/** Mantiene la pantalla encendida mientras `activo` (la Pantalla y el celular que hace de Pantalla). */
export function useDespierta(activo: boolean) {
  useEffect(() => {
    if (!activo || !("wakeLock" in navigator)) return;
    let cerrojo: WakeLockSentinel | null = null, vivo = true;
    const pedir = () => { void navigator.wakeLock.request("screen").then(c => { if (vivo) cerrojo = c; else void c.release(); }).catch(() => { /* el navegador no lo permitió */ }); };
    pedir();
    const f = () => { if (document.visibilityState === "visible") pedir(); };
    document.addEventListener("visibilitychange", f);
    return () => { vivo = false; document.removeEventListener("visibilitychange", f); void cerrojo?.release(); };
  }, [activo]);
}

/** ¿Está conectada la Pantalla de la sala? `soyPantalla`: este aparato es la Pantalla y se anota. Sin `activo` o sin servidor: «desconocida». */
export function usePantalla(sala: SalaV | null, soyPantalla: boolean, activo: boolean): PresenciaPantalla {
  const [p, setP] = useState<PresenciaPantalla>("desconocida");
  useEffect(() => {
    setP("desconocida");
    if (!activo || !sala) return;
    return enlace.vigilarPantalla(sala, soyPantalla, setP);
  }, [sala?.id, soyPantalla, activo]); // eslint-disable-line react-hooks/exhaustive-deps
  return p;
}

/** Atributo `inert` (React 18 no lo conoce): quita el foco y los toques a todo lo de dentro. */
const inerte = (si: boolean): Record<string, string> => (si ? { inert: "" } : {});

/** Segundos que quedan, actualizados 4 veces por segundo solo si hay reloj. */
export function useQuedan(v: Publico | null): number {
  const [, set] = useState(0);
  const hay = !!v?.reloj && v.fase === "contestando" && !v.pausada;
  useEffect(() => { if (!hay) return; const t = setInterval(() => set(x => x + 1), 250); return () => clearInterval(t); }, [hay]);
  return v && hay ? quedan(v) : 0;
}

/** P-03: true cuando ya pasó `fin` (marca de tiempo). Un solo temporizador, sin intervalos. */
export function useVencida(fin: number | null | undefined): boolean {
  const [, set] = useState(0);
  useEffect(() => {
    if (!fin) return;
    const t = setTimeout(() => set(x => x + 1), Math.max(0, fin - Date.now()) + 20);
    return () => clearTimeout(t);
  }, [fin]);
  return !!fin && Date.now() >= fin;
}

export function Conexion({ red }: { red: string }) {
  if (red === "vivo") return null;
  return <span className="a-red" role="status">{red === "respaldo" ? "Reconectando…" : "Conectando…"}</span>;
}

function XpReto({ v, alDar, cerrar }: { v: Publico; alDar: (jugador: string, xp: number) => void; cerrar: () => void }) {
  const [quien, setQuien] = useState(v.jugadores[0]?.id ?? "");
  return (
    <div className="a-velo" onClick={cerrar}>
      <Panel className="a-dialogo a-pila" como="section"><div onClick={e => e.stopPropagation()} className="a-pila">
        <span className="dsp ol a-t2">XP por reto en vivo</span>
        <div className="a-fila a-envuelve">{v.jugadores.map(j => <Chip key={j.id} texto={j.nombre} seleccionado={quien === j.id} onClick={() => setQuien(j.id)} />)}</div>
        <div className="a-fila a-envuelve">{[10, 25, 50, 100].map(x => <button key={x} type="button" className="d-btn k-grn a-chico" onClick={() => { alDar(quien, x); cerrar(); }}><span className="dsp">+{x}</span></button>)}</div>
        <button type="button" className="a-plano" onClick={cerrar}>Cancelar</button>
      </div></Panel>
    </div>
  );
}

export function Sala({ codigo }: { codigo: string }) {
  const ses = useSesion();
  const s = useSala(codigo, ses.uid);
  // Colores del lobby (anfitrión P1 rojo; los demás por entrada y género) y los miembros en orden de lugares.
  const ordenados = useColoresSala(s.sala, s.miembros);
  const soyAnfitrion = !!s.sala && s.sala.anfitrionId === ses.uid;
  // Modo Local: un solo teléfono. Juega quien lo tiene en la mano (`enMano`); vacío = el anfitrión.
  const local = esLocal(s.sala?.id);
  const [enMano, setEnMano] = useState("");
  // Local: la pantalla de carga se ve una vez por partida, antes de pasar el teléfono.
  const [cargaVista, setCargaVista] = useState("");
  // Local, El impostor en la nave: quiénes ya vieron su palabra antes de la primera vuelta (Elías, 24 nov).
  // «Ya la vi» nunca va al motor; se guarda en la sesión del navegador para que una recarga no repita la ronda.
  const [vistos, setVistos] = useState<{ pid: string; ids: string[] }>({ pid: "", ids: [] });
  const v = s.partida && !s.partida.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
  const final = s.partida?.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
  // El impostor en la nave, papeles en la mesa (Elías, 24 nov): «Ya lo vi» se marca al instante y «¡A discutir!» se anuncia.
  const [vistoYo, setVistoYo] = useState("");
  const anuncioNave = useAnuncioDiscusion(v);
  // Relevo: con pantalla, el motor corre en la TV. Si el anfitrión termina la partida, su celular también la procesa,
  // así la partida se cierra aunque la TV se haya apagado o desconectado (antes se quedaba trabada).
  const [relevo, setRelevo] = useState(false);
  const corroMotor = soyAnfitrion && (s.sala?.modo === "mesa" || relevo);
  useMotor(s.sala, s.partida, corroMotor, s.tic, () => void refrescarSesion());
  useDespierta(corroMotor && !!v);
  // Con pantalla (modo tv) la partida solo avanza si la Pantalla está. Sin ella, el celular no deja contestar ni avanzar.
  // ¿Hay una Pantalla conectada? Con ella se juega «en pantalla externa» (Elías, 24 nov); se vigila siempre (no en Local).
  const pantalla = usePantalla(s.sala, false, !!s.sala && !local);
  const sinPantalla = s.sala?.modo === "tv" && !!v && pantalla === "ausente";
  const conPantalla = pantalla === "presente";
  const quedanS = useQuedan(v);
  const esperaVencida = useVencida(v?.fase === "contestando" && !v.pausada ? v.espera?.fin : null);
  const [copando, setCopando] = useState(false), [xpReto, setXpReto] = useState(false);
  const terminada = !!s.partida?.terminada;
  useEffect(() => { if (terminada) { sonar("exito"); void refrescarSesion(); } }, [terminada, s.partida?.id]);
  useEffect(() => { setRelevo(false); }, [s.partida?.id]);
  // Al volver al lobby (o al cambiar de partida), el teléfono regresa al anfitrión.
  useEffect(() => { if (local && !v) { modoLocal.pasarA(""); setEnMano(""); } }, [local, !!v, s.partida?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Lobby: cada quien marca «¡Listo!» y el anfitrión inicia la partida cuando quiera (Elías, 18 nov).
  const listoYo = !!s.miembros.find(m => m.id === ses.uid)?.listo;
  // El anfitrión anuncia su lobby mientras esté abierto: quien abre ALV entra sin código.
  useEffect(() => { if (!s.sala || !soyAnfitrion) return; return enlace.anunciarLobby(s.sala); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [s.sala?.id, soyAnfitrion]);
  // Al empezar una partida, cada quien se quita el «listo» para la siguiente espera.
  const enJuego = !!s.partida && !s.partida.terminada;
  useEffect(() => { if (enJuego && listoYo && s.sala) void enlace.marcarListo(s.sala, false).then(s.refrescar); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [enJuego, s.partida?.id, listoYo]);
  const nRuleta = v?.ruleta?.n ?? 0;
  useEffect(() => { if (v?.ruleta && nRuleta > 0) aviso(`Ruleta: ${v.jugadores.find(j => j.id === v.ruleta!.jugador)?.nombre ?? ""} · ${v.ruleta.texto}`); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [nRuleta]);

  if (s.error) return <AvisoCuarto titulo="No se pudo entrar" texto={s.error}><button type="button" className="lb-listo" onClick={() => ir("modos")}>Volver</button></AvisoCuarto>;
  if (s.cerrada) return <AvisoCuarto titulo="La sala se cerró" texto="El anfitrión terminó la sesión."><button type="button" className="lb-listo" onClick={() => ir("inicio")}>Ir al inicio</button></AvisoCuarto>;
  if (!s.sala) return <AvisoCuarto titulo="Entrando al lobby…" />;
  const sala = s.sala, pid = s.partida?.id ?? "";

  const salir = async () => {
    const caja = LOBBY_NUEVO ? { lobby: colorDe(ses.uid, s.miembros.map(m => m.id)) } : {};
    if (!(await confirmar(local ? { titulo: "¿Terminar la sesión local?", texto: "Se borran los personajes y las partidas de este teléfono.", si: "Terminar sesión", peligro: true, ...caja }
      : soyAnfitrion ? { titulo: "¿Cerrar la sala?", texto: "Todos salen y la sesión termina.", si: "Cerrar sala", peligro: true, ...caja } : { titulo: "¿Salir de la sala?", si: "Salir", ...caja }))) return;
    await (soyAnfitrion ? enlace.cerrar(sala) : enlace.salir(sala));
    ir("inicio");
  };
  const terminarPartida = async () => {
    if (!(await confirmar({ titulo: "¿Terminar la partida?", texto: "Se reparten los puntos como van.", si: "Terminar", peligro: true }))) return;
    await control(pid, "terminar");
    if (sala.modo === "tv") setRelevo(true);
  };

  // ---------- En partida ----------
  if (v) {
    // Local: a quién le toca el teléfono. Mientras alguien deba contestar, a él; si no, al anfitrión.
    const anf = sala.anfitrionId;
    const pendientes = v.fase === "contestando" ? v.esperados.filter(j => !v.contestaron.includes(j)) : [];
    const mano = enMano || anf;
    const idPartida = s.partida?.id ?? "";
    const yaVieron = vistos.pid === idPartida ? vistos.ids : leerVistos(idPartida);
    const naveSala = !!v.impostor?.palabras;
    // Local: «¡A discutir!» se ve antes de pasar el teléfono al primer turno.
    if (local && naveSala && anuncioNave) return <Marco clase="az pt ns-marco" fondo={<FondoCuarto oscuro />}><AnuncioDiscusion modo="celular" /></Marco>;
    const etapaNave = naveSala ? v.impostor!.etapa : null;
    const verPalabra = local && !!v.impostor?.nave && !naveSala && v.ronda === 1 && v.fase === "contestando" && v.impostor.etapa === "pistas" && Object.keys(v.pistas).length === 0;
    const faltaVer = verPalabra ? v.jugadores.map(j => j.id).find(id => !yaVieron.includes(id)) : undefined;
    // Local, papeles de la nave: el teléfono pasa por cada quien que no ha visto su papel.
    const faltaPapel = local && etapaNave === "papeles" ? v.jugadores.map(j => j.id).find(id => !(v.impostor!.vistos ?? []).includes(id)) : undefined;
    const sigue = faltaPapel ?? faltaVer ?? pendientes[0] ?? anf;
    // Pantalla de carga: en Local siempre aquí; con la sala de espera de la nave también en línea (antes de la sala).
    if ((local || (naveSala && !(conPantalla && !soyAnfitrion))) && tocaExplicar(v) && cargaVista !== idPartida) {
      return <Marco clase="az pt" fondo={v.escenario ? <FondoEscenario escenario={v.escenario} /> : <FondoCuarto oscuro />}><ComoJugar v={v} modo="celular" alCerrar={() => { setCargaVista(idPartida); if (soyAnfitrion) void control(idPartida, "comenzar"); }} /></Marco>;
    }
    if (local && mano !== sigue && v.juegoId !== "copas") {
      const m = s.miembros.find(x => x.id === sigue);
      return <PasaTelefono nombre={m?.nombre ?? "el siguiente"} id={sigue} figura={m?.figura ?? null} color={colorDe(sigue, v.jugadores.map(j => j.id))}
        alListo={() => { modoLocal.pasarA(sigue === anf ? "" : sigue); setEnMano(sigue === anf ? "" : sigue); s.refrescar(); }} />;
    }
    // Papeles de la nave: cada quien ve el suyo (en Local, por turnos); luego el anfitrión abre la discusión.
    if (etapaNave === "papeles" && (!local || mano === (faltaPapel ?? anf))) {
      const quien = local ? mano : ses.uid;
      const sec = (s.secreto ?? {}) as { mio?: { rol?: string; tema?: string; palabra?: string; companeros?: string[]; pista?: string } | null };
      const vi = (v.impostor!.vistos ?? []).includes(quien) || vistoYo === `${idPartida}:${quien}`;
      return (
        <Marco clase="az pt ns-marco" fondo={<FondoCuarto oscuro />}>
          <div className="pt-caja">
            <PapelNave v={v} mio={sec.mio ?? null} miembros={s.miembros} yo={quien} vi={vi} local={local}
              alVisto={() => { setVistoYo(`${idPartida}:${quien}`); void jugada(idPartida, "carta", { que: "visto" }); }}
              soyAnfitrion={soyAnfitrion && (!local || quien === anf)} alDiscutir={() => void control(idPartida, "discutir")} />
          </div>
        </Marco>
      );
    }
    if (faltaVer && mano === faltaVer) {
      const m = s.miembros.find(x => x.id === mano);
      const sec = (s.secreto ?? {}) as { mio?: { rol?: string; palabra?: string; tema?: string } | null };
      const mio = sec.mio ?? null;
      const imp = mio?.rol === "impostor";
      const listo = () => { const ids = [...yaVieron, mano]; guardarVistos(idPartida, ids); setVistos({ pid: idPartida, ids }); };
      return (
        <Marco clase="az lb pt-aviso" fondo={v.escenario ? <FondoEscenario escenario={v.escenario} /> : <FondoCuarto oscuro />}>
          <div className="a-pasa-caja nv-ver" style={{ "--pj": colorDe(mano, v.jugadores.map(j => j.id))?.base ?? "#ffc21a" } as React.CSSProperties}>
            <span className="nv-ver-t dsp ol">{m?.nombre ?? "Tu turno"}: tu palabra secreta</span>
            {mio ? <Escaner secreto={imp ? "Eres el impostor" : mio.palabra ?? "…"} encabezado={imp ? "TU PAPEL" : "PALABRA CLASIFICADA"} detalle={`Tema: ${mio.tema ?? v.carta?.texto ?? ""}`} />
              : <p className="a-suave">Cargando…</p>}
            <p className="a-suave">Mantén el dedo para verla. Cuando la memorices, suelta y toca «Ya la vi».</p>
            <button type="button" className="lb-listo" disabled={!mio} onClick={listo}>Ya la vi</button>
          </div>
        </Marco>
      );
    }
    const yo = local ? mano : ses.uid;
    const yoNombre = s.miembros.find(x => x.id === yo)?.nombre ?? ses.nombre;
    const estoy = v.jugadores.some(j => j.id === yo);
    const sec = (s.secreto ?? {}) as { mio?: unknown; miRespuesta?: unknown; miMano?: string[] };
    const mi: MiVista = { yo, mio: sec.mio ?? null, miRespuesta: sec.miRespuesta ?? null, miMano: sec.miMano ?? [] };
    const ultima = esFinalDeJuego(v);
    // Ceremonia de copas de la noche: sin ronda, sin barra del anfitrión ni marcador; al final se cierra la sala.
    const copas = v.juegoId === "copas";
    const ids = v.jugadores.map(j => j.id);
    const figDe = (id: string) => s.miembros.find(x => x.id === id)?.figura ?? null;
    const ico = (n: string) => `${import.meta.env.BASE_URL}arte/ui/${n}.webp`;
    return (
      <Marco clase={"az pt" + (!copas && v.escenario ? " pt-esc" : "")} fondo={!copas && v.escenario ? <FondoEscenario escenario={v.escenario} /> : <FondoCuarto oscuro />} fijo={soyAnfitrion && !copas ? (
        // Barra del anfitrión con el arte nuevo (Elías, 23 nov): sin los iconos del sistema de diseño viejo.
        <nav className={"pt-host" + (sinPantalla ? " a-sin-pantalla" : "")} aria-label="Controles del anfitrión" {...inerte(sinPantalla)}>
          {v.fase === "revelada" && !sinPantalla && <button type="button" className="pt-momento" onClick={() => void control(pid, "siguiente")}>{ultima ? "Ver resultados" : "Siguiente ronda"}</button>}
          <div className="pt-host-fila">
            <button type="button" className="pt-hb" onClick={() => void control(pid, v.pausada ? "reanudar" : "pausar")}><b className="pt-hb-txt">{v.pausada ? "▶" : "❚❚"}</b><small>{v.pausada ? "Seguir" : "Pausar"}</small></button>
            <button type="button" className="pt-hb" onClick={() => void (v.fase === "contestando" ? control(pid, "saltar") : control(pid, "siguiente"))}><img src={ico("configurar/omitir")} alt="" /><small>Saltar</small></button>
            <button type="button" className="pt-hb" onClick={() => void control(pid, "ruleta")}><img src={ico("configurar/herr-ruleta")} alt="" /><small>Ruleta</small></button>
            {!local && <button type="button" className="pt-hb" onClick={() => setXpReto(true)}><img src={ico("hub/xp")} alt="" /><small>XP reto</small></button>}
            {/* Terminar y salir solo en el celular del anfitrión (Elías, 24 nov): ya no van abajo del juego para todos. */}
            <button type="button" className="pt-hb" onClick={() => void terminarPartida()}><b className="pt-hb-txt">⏹</b><small>Terminar</small></button>
            <button type="button" className="pt-hb peligro" onClick={() => void salir()}><b className="pt-hb-txt">✕</b><small>{local ? "Cerrar" : "Cerrar sala"}</small></button>
          </div>
        </nav>
      ) : undefined}>
        <div className={"pt-caja" + (soyAnfitrion && !copas ? " con-barra" : "")}>
          <header className="pt-top">
            <div className="lb-banner pt-banner">
              {!copas && <span className="lb-banner-n">{v.impostor ? `Vuelta ${v.ronda}` : `${v.ronda}/${v.totalRondas}`}</span>}
              <span className="lb-banner-t">{nombreJuego(v.juegoId)}</span>
            </div>
            {v.reloj && v.fase === "contestando" && <Reloj segundos={quedanS} total={v.reloj.total} pausado={v.pausada} style={{ width: 56, height: 56 }} />}
            <Conexion red={s.red} />
            {soyAnfitrion && !local && !copas && <BotonCast sala={sala} pantalla={pantalla} className="pt-cast" />}
          </header>
          {/* Tu ficha: tu cabina, tus puntos, tu lugar y tus comodines. */}
          {estoy && !copas && conPantalla && (() => {
            const m = marcador(v).find(j => j.id === yo), cartas = v.cartasEnMano[yo] ?? 0;
            return <FichaJugador className="pt-mia" id={yo} figura={figDe(yo)} nombre={yoNombre} color={colorDe(yo, ids)} tamano={72} yo>
              <span className="fj-datos"><span>🏆 <b>{v.puntos[yo] ?? 0}</b></span>{m && <span>🏅 <b>{m.lugar}.º</b></span>}{cartas > 0 && <span>⚡ <b>{cartas}</b></span>}</span>
            </FichaJugador>;
          })()}
          {sinPantalla && <div className="pt-aviso" role="alert"><b>La pantalla se desconectó</b><p>La partida espera. {soyAnfitrion ? "Abre la pantalla otra vez para seguir." : "Lo que ya enviaste se conserva."}</p></div>}
          {soyAnfitrion && !sinPantalla && esperaVencida && v.fase === "contestando" && (
            <div className="pt-aviso" role="alert">
              <b>Falta contestar: {v.esperados.filter(j => !v.contestaron.includes(j)).map(j => v.jugadores.find(p => p.id === j)?.nombre ?? "alguien").join(", ")}</b>
              <div className="pt-fila">
                <button type="button" className="lb-sec" onClick={() => void control(pid, "esperar")}>Esperar al jugador</button>
                <button type="button" className="lb-listo" onClick={() => void control(pid, "seguir-sin")}>Seguir sin él</button>
              </div>
            </div>
          )}
          {v.fase === "revelada" && v.ausentes?.includes(yo) && <div className="pt-aviso" role="status"><b>La ronda se cerró sin tu respuesta</b><p>No sumaste puntos en esta ronda. Sigues en la partida y juegas la siguiente.</p></div>}
          {/* Mesa (Elías, 24 nov): en celulares, todos a los lados con sus puntos y reacciones; tu herramienta al centro. */}
          {(() => {
            const juego = estoy ? <div className={"pt-juego" + (sinPantalla ? " a-espera-tv" : "")} {...inerte(sinPantalla)}><HerramientaCelular v={v} mi={mi} miembros={s.miembros} sinCarga={local || (conPantalla && !soyAnfitrion)} alComenzar={soyAnfitrion ? () => void control(pid, "comenzar") : undefined} mandar={async (t, d) => !sinPantalla && jugada(pid, t, d)} /></div>
              : <div className="pt-aviso"><b>Juegas en la siguiente</b><p>Llegaste con la partida empezada. Mira la pantalla.</p></div>;
            // El impostor con papeles en la mesa ya muestra a todos en su tablero: sin la mesa de los lados (Elías, 24 nov).
            return !copas && !conPantalla && !v.impostor?.palabras ? <MesaJuego v={v} miembros={s.miembros} yo={yo} modo="celular">{juego}</MesaJuego> : juego;
          })()}
          {/* Con pantalla externa, el marcador y la tarjeta grande se ven en la TV: aquí solo lo tuyo. */}
          {conPantalla && !copas && <p className="pt-mira" role="status"><span aria-hidden="true">📺</span> Mira la pantalla: aquí solo va lo tuyo.</p>}
          {/* En la partida, terminar y salir van en la barra del anfitrión; solo la ceremonia de copas cierra aquí. */}
          {copas && <div className="pt-salidas">
            <button type="button" className="lb-listo" onClick={() => void salir()}>{local ? "Terminar sesión" : soyAnfitrion ? "Cerrar sala" : "Salir de la sala"}</button>
          </div>}
        </div>
        {xpReto && <XpReto v={v} cerrar={() => setXpReto(false)} alDar={(j, x) => { void enlace.darXp(sala, j, x).then(ok => { if (ok) { void control(pid, "xp-reto", { jugador: j, xp: x }); aviso(`+${x} XP para ${v.jugadores.find(p => p.id === j)?.nombre ?? ""}`); } else aviso("No se pudo dar la XP."); }); }} />}
      </Marco>
    );
  }

  // ---------- Espera: lobby estilo fiesta (pantallas/lobby/Lobby.tsx) ----------
  // Si el administrador te sacó del lobby, ya no apareces en la lista.
  if (s.miembros.length > 0 && !s.miembros.some(m => m.id === ses.uid)) return <AvisoCuarto titulo="Saliste del lobby" texto="El administrador te sacó del lobby."><button type="button" className="lb-listo" onClick={() => ir("inicio")}>Ir al inicio</button></AvisoCuarto>;
  const copasNoche = async () => {
    if (!(await confirmar({ titulo: "¿Entregar las copas?", texto: "Se suman los puntos de todos los juegos de la noche y se anuncian los ganadores.", si: "Entregar copas" }))) return;
    setCopando(true);
    const ok = await entregarCopas(sala, s.miembros);
    setCopando(false);
    if (!ok) aviso("No se pudieron entregar las copas. Intenta otra vez."); else { sonar("exito"); s.refrescar(); }
  };
  return <Lobby sala={sala} miembros={ordenados} yo={ses.uid} soyAnfitrion={soyAnfitrion} final={final} red={s.red} refrescar={s.refrescar}
    alSalir={() => void salir()} alCopas={() => void copasNoche()} copando={copando} pantalla={pantalla} />;
}

/** Local: tapa la pantalla entre turnos para que nadie vea lo de otro. */
function PasaTelefono({ nombre, id, figura, color, alListo }: { nombre: string; id: string; figura: FiguraV2 | null; color: ColorJugador | null; alListo: () => void }) {
  return (
    <Marco clase="az lb pt-aviso" fondo={<FondoCuarto oscuro />}>
      <div className="a-pasa-caja" style={{ "--pj": color?.base ?? "#ffc21a" } as React.CSSProperties}>
        <span className="dsp ol a-t2">Pásale el teléfono a</span>
        <FichaJugador className="pt-pasa-ficha" id={id} figura={figura} nombre={nombre} color={color} tamano={120} />
        <p className="a-suave">Que nadie más vea la pantalla.</p>
        <button type="button" className="lb-listo" onClick={alListo}>Soy {nombre}</button>
      </div>
    </Marco>
  );
}

const claveVistos = (pid: string) => `alv-vistos-${pid}`;
function leerVistos(pid: string): string[] {
  try { const x = JSON.parse(sessionStorage.getItem(claveVistos(pid)) ?? "[]"); return Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : []; } catch { return []; }
}
function guardarVistos(pid: string, ids: string[]) { try { sessionStorage.setItem(claveVistos(pid), JSON.stringify(ids)); } catch { /* sin almacenamiento: se recuerda mientras siga abierta */ } }
