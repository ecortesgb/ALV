// La Pantalla (#/tv/código): la laptop o TV que todos ven. No juega: corre el motor y dibuja lo público.
// Sin QR (Elías, 18 nov): quien abre ALV entra al lobby único con «¡Jugar!». Tiene controles de respaldo para quien tiene el control.
import { useEffect, useState } from "react";
import { RaizDS, Reloj } from "../../ds";
import { ir } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { enlace } from "../../servicios/enlace";
import { EscenaTv } from "../../juegos/general/tv";
import { esPublico, marcador, nombreDe, nombreJuego } from "../../juegos/general/texto";
import { Conexion, useDespierta, usePantalla, useQuedan } from "../../pantallas/Sala";
import { Posiciones, esFinalDeJuego } from "../../juegos/general/Copas";
import { confirmar } from "../../pantallas/comun";
import { FichaJugador } from "../../pantallas/lobby/Ficha";
import { FondoCuarto } from "../../pantallas/lobby/Cuarto";
import { FondoEscenario } from "../../pantallas/Fondos";
import { escucharSalirPantalla } from "../../servicios/difusion";
import { ConfigEnVivo, useConfigEnVivo } from "../../pantallas/ConfigEnVivo";
import { MesaJuego } from "../../pantallas/MesaJuego";
import "../../pantallas/lobby/cast.css";
import { colorDe, varsColor } from "../../app/colorJugador";
import { CUPO_LOBBY, Pedestales, TodosListos } from "../../pantallas/SalaEspera";
import { useColoresSala } from "../../pantallas/lobby/colores";
import { useSala } from "../sala";
import { AvisoLogro } from "../../pantallas/AvisoLogro";
import { control, useMotor } from "./motor";
import { useGestosSala } from "../../servicios/gestosSala";

export function PantallaTv({ codigo }: { codigo: string }) {
  const ses = useSesion();
  const s = useSala(codigo, ses.uid);
  const ordenados = useColoresSala(s.sala, s.miembros);
  // La TV solo escucha los gestos de los jugadores (no tiene figura propia).
  useGestosSala(s.sala?.id, "", s.miembros);
  const tengoControl = !!s.sala && s.sala.anfitrionId === ses.uid;
  // El motor corre siempre en el celular del anfitrión (Elías, 24 nov); la Pantalla solo muestra. Las salas viejas
  // «con pantalla» (modo tv) siguen corriéndolo aquí.
  useMotor(s.sala, s.partida, tengoControl && s.sala?.modo === "tv", s.tic);
  useDespierta(true);
  usePantalla(s.sala, true, true); // se anota como la Pantalla: los celulares saben si está
  const v = s.partida && !s.partida.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
  const final = s.partida?.terminada && esPublico(s.partida.estado) ? s.partida.estado : null;
  const quedanS = useQuedan(v);
  // Si esta pantalla es del anfitrión, también anuncia el lobby.
  useEffect(() => { if (!s.sala || !tengoControl) return; return enlace.anunciarLobby(s.sala); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [s.sala?.id, tengoControl]);
  const [ruleta, setRuleta] = useState<{ quien: string; texto: string } | null>(null);
  const nRuleta = v?.ruleta?.n ?? 0;
  useEffect(() => {
    if (!v?.ruleta || nRuleta === 0) return;
    setRuleta({ quien: nombreDe(v, v.ruleta.jugador), texto: v.ruleta.texto });
    const t = setTimeout(() => setRuleta(null), 9000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nRuleta]);

  // Con el estilo del lobby (Elías, 23 nov): el cuarto de fondo y los componentes de cada juego en vidrio (`az pt`).
  // En partida, el fondo es el escenario elegido (Elías, 24 nov); en el lobby y las copas, el cuarto.
  const escPartida = v && v.juegoId !== "copas" && v.escenario ? v.escenario : null;
  // En el lobby, la TV muestra en grande lo que el anfitrión va armando.
  const vivoTv = useConfigEnVivo(s.sala?.id, !v);
  // Dejar de proyectar (Elías, 24 nov): este aparato vuelve a ser normal. También si el anfitrión lo pide desde su celular.
  const dejar = () => ir(s.sala ? "sala" : "inicio", s.sala?.codigo);
  useEffect(() => { if (!s.sala) return; return escucharSalirPantalla(s.sala.id, dejar); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [s.sala?.id]);
  const marco = (hijos: React.ReactNode) => <RaizDS ancho className={"alv a-tv az pt" + (escPartida ? " pt-esc" : "")}>{escPartida ? <FondoEscenario escenario={escPartida} /> : <FondoCuarto oscuro />}{hijos}
    <button type="button" className="cs-boton on tv-dejar" onClick={dejar} aria-label="Dejar de proyectar"><span aria-hidden="true">✕</span> Dejar de proyectar</button>
    <AvisoLogro tv={s.sala?.id ?? ""} /></RaizDS>;
  if (s.error || s.cerrada) return marco(<div className="lb-vacio a-tv-msj"><b>{s.cerrada ? "La sala se cerró" : "No se pudo abrir la pantalla"}</b>{s.error && <p>{s.error}</p>}<button type="button" className="lb-listo" onClick={() => ir("inicio")}>Ir al inicio</button></div>);
  if (!s.sala) return marco(<div className="lb-vacio a-tv-msj"><b>Abriendo la sala…</b></div>);
  const pid = s.partida?.id ?? "";

  if (v) {
    const ultima = esFinalDeJuego(v);
    // Ceremonia de copas: sin ronda, marcador ni controles de partida; quien tiene el control puede cerrar la sala.
    const copas = v.juegoId === "copas";
    // Mesa con los personajes a los lados (Elías, 24 nov). El impostor ya pone a todos en su escena.
    const conMesa = !copas && !v.impostor;
    const cerrar = async () => { if (s.sala && await confirmar({ titulo: "¿Cerrar la sala?", texto: "Todos salen y la sesión termina.", si: "Cerrar sala", peligro: true })) { await enlace.cerrar(s.sala); ir("inicio"); } };
    return marco(<>
      <header className="a-tv-top">
        {!copas && <div className="lb-banner pt-banner tv-banner">
          <span className="lb-banner-n">{v.impostor?.etapa === "papeles" ? "La nave" : v.impostor ? `Vuelta ${v.ronda}` : `${v.ronda}/${v.totalRondas}`}</span>
          <span className="lb-banner-t">{nombreJuego(v.juegoId)}</span>
        </div>}
        <Conexion red={s.red} />
        {v.reloj && v.fase === "contestando" && <Reloj segundos={quedanS} total={v.reloj.total} pausado={v.pausada} style={{ width: "6.5em", height: "6.5em" }} />}
      </header>
      <main className="a-tv-main">{conMesa ? <MesaJuego v={v} miembros={s.miembros} modo="tv"><EscenaTv v={v} miembros={s.miembros} /></MesaJuego> : <EscenaTv v={v} miembros={s.miembros} />}{v.fase === "revelada" && v.ausentes?.length > 0 && <p className="a-tv-sub">Sin respuesta en esta ronda: {v.ausentes.map(j => nombreDe(v, j)).join(", ")}</p>}</main>
      {!copas && !conMesa && <footer className="a-tv-pie">
        <ul className="a-tv-marcador" aria-label="Marcador">
          {/* Fichas con la cabina de cada jugador (pantallas/lobby/Ficha.tsx) y sus puntos. */}
          {marcador(v).map(j => <li key={j.id} className="tv-ficha" style={varsColor(colorDe(j.id, v.jugadores.map(x => x.id)))}>
            <FichaJugador id={j.id} figura={s.miembros.find(m => m.id === j.id)?.figura} nombre={j.nombre} color={colorDe(j.id, v.jugadores.map(x => x.id))} tamano={v.jugadores.length > 5 ? 54 : 64}>
              <span className="fj-datos"><span>🏆 <b>{j.puntos}</b></span>{(v.cartasEnMano[j.id] ?? 0) > 0 && <span>⚡ <b>{v.cartasEnMano[j.id]}</b></span>}</span>
            </FichaJugador>
          </li>)}
        </ul>
      </footer>}
      {v.pausada && <div className="a-tv-velo"><span className="tv-pausa">Pausa</span></div>}
      {ruleta && <div className="a-tv-velo" onClick={() => setRuleta(null)}><div className="d-pnl a-tv-ruleta"><img className="tv-ruleta-ico" src={`${import.meta.env.BASE_URL}arte/ui/configurar/herr-ruleta.webp`} alt="" /><span className="lb-banner-t">Ruleta de castigos</span><span className="dsp ol a-tv-t1">{ruleta.quien}</span><span className="a-tv-sub">{ruleta.texto}</span></div></div>}
      {tengoControl && copas && <div className="a-tv-respaldo" aria-label="Controles de respaldo"><button type="button" onClick={() => void cerrar()}>Cerrar sala</button></div>}
      {tengoControl && !copas && v.impostor?.etapa !== "papeles" && (
        <div className="a-tv-respaldo" aria-label="Controles de respaldo">
          <button type="button" onClick={() => void control(pid, v.pausada ? "reanudar" : "pausar")}>{v.pausada ? "Seguir" : "Pausar"}</button>
          {v.fase === "contestando" ? <button type="button" onClick={() => void control(pid, "saltar")}>Saltar</button>
            : <button type="button" onClick={() => void control(pid, "siguiente")}>{ultima ? "Resultados" : "Siguiente"}</button>}
          <button type="button" onClick={() => void confirmar({ titulo: "¿Terminar la partida?", texto: "Se reparten los puntos como van.", si: "Terminar", peligro: true }).then(ok => { if (ok) void control(pid, "terminar"); })}>Terminar</button>
        </div>
      )}
    </>);
  }

  return marco(<>
    {vivoTv && <div className="cv-tv"><ConfigEnVivo e={vivoTv} grande /></div>}
    <header className="a-tv-top">
      <div className="lb-banner pt-banner tv-banner">
        <span className="lb-banner-n">{s.miembros.length}/{CUPO_LOBBY}</span>
        <span className="lb-banner-t">{final ? `Resultados · ${nombreJuego(final.juegoId)}` : `${s.miembros.filter(m => m.listo).length} listos`}</span>
        <small className="lb-banner-s">{final ? "Marquen «¡Listo!» para la siguiente" : "Abre ALV en tu celular y toca «¡Jugar!»"}</small>
      </div>
      <Conexion red={s.red} />
    </header>
    <main className="a-tv-main a-tv-lobby">
      {final ? <Posiciones v={final} miembros={s.miembros} grande /> : (
        <div className="a-tv-elenco">
          <Pedestales miembros={ordenados} className="lb-pedestales" fiesta={{ escenarios: true }} vida="tv" />
          {!s.miembros.length && <span className="dsp ol a-tv-t2">Abre ALV y toca «¡Jugar!» para entrar</span>}
        </div>
      )}
      <TodosListos miembros={s.miembros} />
    </main>
  </>);
}
