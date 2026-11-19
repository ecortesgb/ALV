// La sala en el celular (#/sala/código): espera, partida y resultados, en un solo lugar.
// El papel es del aparato: aquí siempre se juega. A quien tiene el control le sale además la barra del anfitrión.
// Sin pantalla (modo mesa), el celular del anfitrión también corre el motor y se queda encendido.
import { useEffect, useState } from "react";
import { BarraAnfitrion, Boton, Chip, Etiqueta, Panel, Reloj } from "../ds";
import { ir } from "../app/rutas";
import { refrescarSesion, useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { enlace, type SalaV } from "../servicios/enlace";
import type { PresenciaPantalla } from "../servicios/tiempoReal";
import { HerramientaCelular, type MiVista } from "../juegos/general/celular";
import { esPublico, marcador, nombreJuego, quedan, type Publico } from "../juegos/general/texto";
import { control, entregarCopas, jugada, useMotor } from "../roles/pantalla/motor";
import { PodioJuego, esFinalDeJuego } from "../juegos/general/Copas";
import { useSala } from "../roles/sala";
import { Capsulas } from "./Personalizar";
import { Cabecera, Marco, NombreJugador, Vacio, aviso, confirmar, useAncho } from "./comun";
import { Burbuja, TarjetaEsquina } from "./Identidad";
import { colorDe } from "../app/colorJugador";
import { ContadorListos, Cupo, FilaSala, Gestos, MiPedestal, Pedestales, TodosListos } from "./SalaEspera";
import { FondoEscenario } from "./Fondos";

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
  const soyAnfitrion = !!s.sala && s.sala.anfitrionId === ses.uid;
  const v = s.partida && !s.partida.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
  const final = s.partida?.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
  const corroMotor = soyAnfitrion && s.sala?.modo === "mesa";
  useMotor(s.sala, s.partida, corroMotor, s.tic, () => void refrescarSesion());
  useDespierta(corroMotor && !!v);
  // Con pantalla (modo tv) la partida solo avanza si la Pantalla está. Sin ella, el celular no deja contestar ni avanzar.
  const pantalla = usePantalla(s.sala, false, s.sala?.modo === "tv" && !!v);
  const sinPantalla = pantalla === "ausente";
  const quedanS = useQuedan(v);
  const esperaVencida = useVencida(v?.fase === "contestando" && !v.pausada ? v.espera?.fin : null);
  const [copando, setCopando] = useState(false), [xpReto, setXpReto] = useState(false);
  const terminada = !!s.partida?.terminada;
  useEffect(() => { if (terminada) { sonar("exito"); void refrescarSesion(); } }, [terminada, s.partida?.id]);
  // Lobby: cada quien marca «¡Listo!» y el anfitrión inicia la partida cuando quiera (Elías, 18 nov).
  const ancho = useAncho();
  const listoYo = !!s.miembros.find(m => m.id === ses.uid)?.listo;
  // El anfitrión anuncia su lobby mientras esté abierto: quien abre ALV entra sin código.
  useEffect(() => { if (!s.sala || !soyAnfitrion) return; return enlace.anunciarLobby(s.sala); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [s.sala?.id, soyAnfitrion]);
  // Al empezar una partida, cada quien se quita el «listo» para la siguiente espera.
  const enJuego = !!s.partida && !s.partida.terminada;
  useEffect(() => { if (enJuego && listoYo && s.sala) void enlace.marcarListo(s.sala, false).then(s.refrescar); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [enJuego, s.partida?.id, listoYo]);
  const nRuleta = v?.ruleta?.n ?? 0;
  useEffect(() => { if (v?.ruleta && nRuleta > 0) aviso(`Ruleta: ${v.jugadores.find(j => j.id === v.ruleta!.jugador)?.nombre ?? ""} · ${v.ruleta.texto}`); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [nRuleta]);

  if (s.error) return <Marco clase="a-centro"><Vacio titulo="No se pudo entrar" texto={s.error}><Boton color="amarillo" texto="Volver" icono="back" onClick={() => ir("jugar")} /></Vacio></Marco>;
  if (s.cerrada) return <Marco clase="a-centro"><Vacio titulo="La sala se cerró" texto="El anfitrión terminó la sesión."><Boton color="amarillo" texto="Ir al inicio" icono="back" onClick={() => ir("inicio")} /></Vacio></Marco>;
  if (!s.sala) return <Marco clase="a-centro"><p className="a-suave a-pulso" role="status">Entrando a la sala {codigo}…</p></Marco>;
  const sala = s.sala, pid = s.partida?.id ?? "";

  const salir = async () => {
    if (!(await confirmar(soyAnfitrion ? { titulo: "¿Cerrar la sala?", texto: "Todos salen y la sesión termina.", si: "Cerrar sala", peligro: true } : { titulo: "¿Salir de la sala?", si: "Salir" }))) return;
    await (soyAnfitrion ? enlace.cerrar(sala) : enlace.salir(sala));
    ir("inicio");
  };

  // ---------- En partida ----------
  if (v) {
    const estoy = v.jugadores.some(j => j.id === ses.uid);
    const sec = (s.secreto ?? {}) as { mio?: unknown; miRespuesta?: unknown; miMano?: string[] };
    const mi: MiVista = { yo: ses.uid, mio: sec.mio ?? null, miRespuesta: sec.miRespuesta ?? null, miMano: sec.miMano ?? [] };
    const ultima = esFinalDeJuego(v);
    // Ceremonia de copas de la noche: sin ronda, sin barra del anfitrión ni marcador; al final se cierra la sala.
    const copas = v.juegoId === "copas";
    return (
      <Marco clase="a-partida" fondo={<FondoEscenario escenario={v.escenario} />} fijo={soyAnfitrion && !copas ? (
        <div className={"a-barra" + (sinPantalla ? " a-sin-pantalla" : "")} {...inerte(sinPantalla)}>
          <BarraAnfitrion pausada={v.pausada}
            momento={v.fase === "revelada" && !sinPantalla ? { texto: ultima ? "Ver resultados" : "Siguiente ronda", icono: "skip", onClick: () => void control(pid, "siguiente") } : undefined}
            onPausar={() => void control(pid, v.pausada ? "reanudar" : "pausar")}
            onSaltar={() => void (v.fase === "contestando" ? control(pid, "saltar") : control(pid, "siguiente"))}
            onRuleta={() => void control(pid, "ruleta")} onXpReto={() => setXpReto(true)} />
        </div>
      ) : undefined}>
        <div className={"a-ancho a-angosto a-pila" + (soyAnfitrion && !copas ? " con-barra" : "")}>
          <header className="a-cab">
            {!copas && <Etiqueta texto={v.impostor ? `Vuelta ${v.ronda}` : `Ronda ${v.ronda} de ${v.totalRondas}`} icono="star" />}
            <span className="dsp ol a-t3 a-crece">{nombreJuego(v.juegoId)}</span>
            {v.reloj && v.fase === "contestando" && <Reloj segundos={quedanS} total={v.reloj.total} pausado={v.pausada} style={{ width: 56, height: 56 }} />}
            <Conexion red={s.red} />
          </header>
          {/* Tu tarjeta de esquina: tu color, tus puntos, tu lugar y tus comodines. */}
          {estoy && !copas && (() => {
            const ids = v.jugadores.map(j => j.id), m = marcador(v).find(j => j.id === ses.uid);
            const cartas = v.cartasEnMano[ses.uid] ?? 0;
            return <TarjetaEsquina className="a-mi-tarjeta" id={ses.uid} figura={s.miembros.find(x => x.id === ses.uid)?.figura} nombre={ses.nombre} color={colorDe(ses.uid, ids)} tamano={58}
              datos={[{ icono: "🏆", valor: v.puntos[ses.uid] ?? 0, titulo: "puntos" }, ...(m ? [{ icono: "🏅", valor: `${m.lugar}.º`, titulo: "lugar" }] : []), ...(cartas > 0 ? [{ icono: "⚡", valor: cartas, titulo: "comodines" }] : [])]} />;
          })()}
          {sinPantalla && <div className="a-aviso-tv" role="alert"><span className="dsp ol a-t3">La pantalla se desconectó</span><p>La partida espera. {soyAnfitrion ? "Abre la pantalla otra vez para seguir." : "Lo que ya enviaste se conserva."}</p></div>}
          {soyAnfitrion && !sinPantalla && esperaVencida && v.fase === "contestando" && (
            <Panel className="a-pila" como="section"><div role="alert" className="a-pila">
              <span className="dsp ol a-t3">Falta contestar: {v.esperados.filter(j => !v.contestaron.includes(j)).map(j => v.jugadores.find(p => p.id === j)?.nombre ?? "alguien").join(", ")}</span>
              <div className="a-fila a-envuelve">
                <Boton color="verde" texto="Esperar al jugador" icono="clock" onClick={() => void control(pid, "esperar")} />
                <Boton color="amarillo" texto="Seguir sin él" icono="skip" onClick={() => void control(pid, "seguir-sin")} />
              </div>
            </div></Panel>
          )}
          {v.fase === "revelada" && v.ausentes?.includes(ses.uid) && <div className="a-aviso-tv" role="status"><span className="dsp ol a-t3">La ronda se cerró sin tu respuesta</span><p>No sumaste puntos en esta ronda. Sigues en la partida y juegas la siguiente.</p></div>}
          {estoy ? <div className={sinPantalla ? "a-espera-tv" : undefined} {...inerte(sinPantalla)}><HerramientaCelular v={v} mi={mi} miembros={s.miembros} mandar={async (t, d) => !sinPantalla && jugada(pid, t, d)} /></div>
            : <Panel className="a-herr"><span className="dsp ol a-t2">Juegas en la siguiente</span><p className="a-suave">Llegaste con la partida empezada. Mira la pantalla.</p></Panel>}
          {!copas && <ul className="a-marcador" aria-label="Marcador">
            {marcador(v).map(j => <li key={j.id} className={j.id === ses.uid ? "yo" : ""}><Burbuja p={{ id: j.id, figura: s.miembros.find(m => m.id === j.id)?.figura, nombre: j.nombre, color: colorDe(j.id, v.jugadores.map(x => x.id)) }} tamano={34} /><NombreJugador nombre={j.nombre} figura={s.miembros.find(m => m.id === j.id)?.figura} clase="" />{(v.cartasEnMano[j.id] ?? 0) > 0 && <Chip texto={String(v.cartasEnMano[j.id])} icono="bolt" />}<b className="dsp">{j.puntos}</b></li>)}
          </ul>}
          {copas && <Boton color={soyAnfitrion ? "rojo" : "amarillo"} texto={soyAnfitrion ? "Cerrar sala" : "Salir de la sala"} icono="back" onClick={() => void salir()} />}
          {soyAnfitrion && !copas && <button type="button" className="a-plano" disabled={sinPantalla} onClick={() => void confirmar({ titulo: "¿Terminar la partida?", texto: "Se reparten los puntos como van.", si: "Terminar", peligro: true }).then(ok => { if (ok) void control(pid, "terminar"); })}>Terminar partida</button>}
        </div>
        {xpReto && <XpReto v={v} cerrar={() => setXpReto(false)} alDar={(j, x) => { void enlace.darXp(sala, j, x).then(ok => { if (ok) { void control(pid, "xp-reto", { jugador: j, xp: x }); aviso(`+${x} XP para ${v.jugadores.find(p => p.id === j)?.nombre ?? ""}`); } else aviso("No se pudo dar la XP."); }); }} />}
      </Marco>
    );
  }

  // ---------- Espera (antes de la primera partida o entre partidas) ----------
  const yo = s.miembros.find(m => m.id === ses.uid);
  // El anfitrión arma la partida en #/configurar (tipo, juego, opciones, escenario) y desde ahí la inicia.
  const copasNoche = async () => {
    if (!(await confirmar({ titulo: "¿Entregar las copas?", texto: "Se suman los puntos de todos los juegos de la noche y se anuncian los ganadores.", si: "Entregar copas" }))) return;
    setCopando(true);
    const ok = await entregarCopas(sala, s.miembros);
    setCopando(false);
    if (!ok) aviso("No se pudieron entregar las copas. Intenta otra vez."); else { sonar("exito"); s.refrescar(); }
  };
  const listo = (
    <Boton className="a-sala-boton" color={yo?.listo ? "azul" : "verde"} principal={!yo?.listo} texto={yo?.listo ? "Ya no estoy listo" : "¡Listo!"} icono="star" onClick={() => void enlace.marcarListo(sala, !yo?.listo).then(s.refrescar)} />
  );
  const gesto = (g: Parameters<typeof enlace.gesto>[1]) => void enlace.gesto(sala, g).then(s.refrescar);
  const outfit = (
    <div className="a-pila a-sala-outfit">
      <div className="a-entre"><span className="dsp ol a-t3">Tu outfit</span><button type="button" className="a-plano" onClick={() => ir("personalizar")}>Cambiar outfit</button></div>
      <Capsulas />
    </div>
  );
  return (
    <Marco clase="a-sala">
      <div className="a-ancho a-pila">
        <Cabecera titulo="Lobby" icono="users" alVolver={() => void salir()} derecha={<><ContadorListos miembros={s.miembros} /><Conexion red={s.red} /></>} />
        <TodosListos miembros={s.miembros} texto={soyAnfitrion ? "Toca «Armar partida»" : "El anfitrión prepara la partida"} />
        {final && <Panel className="a-pila a-entra" como="section"><Etiqueta texto={`Resultados · ${nombreJuego(final.juegoId)}`} icono="trophy" /><PodioJuego v={final} miembros={s.miembros} modo="celular" /></Panel>}
        {ancho ? <Pedestales miembros={s.miembros} yo={ses.uid} /> : <MiPedestal miembros={s.miembros} yo={ses.uid} />}
        <div className="a-dos">
          <Panel className="a-pila" como="section">
            {ancho ? <div className="a-entre"><Cupo miembros={s.miembros} /><Chip texto={sala.modo === "tv" ? "Con pantalla" : "Sin pantalla"} icono="eye" /></div>
              : <>{listo}<div className="a-entre"><Cupo miembros={s.miembros} /><Chip texto={sala.modo === "tv" ? "Con pantalla" : "Sin pantalla"} icono="eye" /></div><FilaSala miembros={s.miembros} yo={ses.uid} /></>}
            {ancho && listo}
            <Gestos alGesto={gesto} />
            {outfit}
          </Panel>
          {soyAnfitrion ? (
            <Panel className="a-pila" como="section">
              <Etiqueta texto="Tú armas la partida" icono="star" />
              <p className="a-suave">Eliges el tipo de partida, el juego, sus opciones y el escenario. Al final tocas «¡Iniciar!».</p>
              {sala.modo === "tv" && <p className="a-nota">Abre ALV en la laptop o TV con tu cuenta y elige «Volver a mi sala»: ahí se proyecta la partida.</p>}
              <Boton color="amarillo" principal texto={final ? "Otra partida" : "Armar partida"} sub={`${s.miembros.length} en el lobby`} icono="play" onClick={() => ir("configurar", sala.codigo)} />
              <Boton color="morado" texto="Entregar copas" sub="Cierra la noche con los ganadores" icono="trophy" cargando={copando} onClick={() => void copasNoche()} />
            </Panel>
          ) : <Panel className="a-pila a-centro-txt" como="section"><span className="dsp ol a-t2">Esperando al anfitrión</span><p className="a-suave">{s.miembros.find(m => m.anfitrion)?.nombre ?? "El anfitrión"} elige el juego e inicia la partida. Mientras, cambia tu outfit, saluda o baila.</p></Panel>}
        </div>
      </div>
    </Marco>
  );
}
