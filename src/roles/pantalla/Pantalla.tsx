// La Pantalla (#/tv/código): la laptop o TV que todos ven. No juega: corre el motor y dibuja lo público.
// Sin QR (Elías, 18 nov): quien abre ALV entra al lobby único con «¡Jugar!». Tiene controles de respaldo para quien tiene el control.
import { useEffect, useState } from "react";
import { Boton, Cartel, Etiqueta, Onomatopeya, RaizDS, Reloj } from "../../ds";
import { FondoALV, FondoEscenario } from "../../pantallas/Fondos";
import { ir } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { enlace } from "../../servicios/enlace";
import { EscenaTv } from "../../juegos/general/tv";
import { esPublico, marcador, nombreDe, nombreJuego } from "../../juegos/general/texto";
import { Conexion, useDespierta, usePantalla, useQuedan } from "../../pantallas/Sala";
import { Posiciones, esFinalDeJuego } from "../../juegos/general/Copas";
import { confirmar } from "../../pantallas/comun";
import { TarjetaEsquina } from "../../pantallas/Identidad";
import { colorDe } from "../../app/colorJugador";
import { ContadorListos, Cupo, Pedestales, TodosListos } from "../../pantallas/SalaEspera";
import { useColoresSala } from "../../pantallas/lobby/colores";
import { useSala } from "../sala";
import { AvisoLogro } from "../../pantallas/AvisoLogro";
import { control, useMotor } from "./motor";

export function PantallaTv({ codigo }: { codigo: string }) {
  const ses = useSesion();
  const s = useSala(codigo, ses.uid);
  const ordenados = useColoresSala(s.sala, s.miembros);
  const tengoControl = !!s.sala && s.sala.anfitrionId === ses.uid;
  useMotor(s.sala, s.partida, tengoControl, s.tic);
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

  const marco = (hijos: React.ReactNode, fondo: React.ReactNode = <FondoALV />) => <RaizDS ancho className="alv a-tv">{fondo}{hijos}<AvisoLogro tv={s.sala?.id ?? ""} /></RaizDS>;
  if (s.error || s.cerrada) return marco(<div className="a-tv-msj"><span className="dsp ol a-tv-t1">{s.cerrada ? "La sala se cerró" : "No se pudo abrir la pantalla"}</span><p className="a-tv-sub">{s.error}</p><Boton color="amarillo" texto="Ir al inicio" icono="back" onClick={() => ir("inicio")} /></div>);
  if (!s.sala) return marco(<div className="a-tv-msj"><p className="a-tv-sub a-pulso" role="status">Abriendo la sala {codigo}…</p></div>);
  const pid = s.partida?.id ?? "";

  if (v) {
    const ultima = esFinalDeJuego(v);
    // Ceremonia de copas: sin ronda, marcador ni controles de partida; quien tiene el control puede cerrar la sala.
    const copas = v.juegoId === "copas";
    const cerrar = async () => { if (s.sala && await confirmar({ titulo: "¿Cerrar la sala?", texto: "Todos salen y la sesión termina.", si: "Cerrar sala", peligro: true })) { await enlace.cerrar(s.sala); ir("inicio"); } };
    return marco(<>
      <header className="a-tv-top">
        {!copas && <Etiqueta texto={v.impostor ? `Vuelta ${v.ronda}` : `Ronda ${v.ronda} de ${v.totalRondas}`} icono="star" grande />}
        <Conexion red={s.red} />
        {v.reloj && v.fase === "contestando" && <Reloj segundos={quedanS} total={v.reloj.total} pausado={v.pausada} style={{ width: "6.5em", height: "6.5em" }} />}
      </header>
      <main className="a-tv-main"><EscenaTv v={v} miembros={s.miembros} />{v.fase === "revelada" && v.ausentes?.length > 0 && <p className="a-tv-sub">Sin respuesta en esta ronda: {v.ausentes.map(j => nombreDe(v, j)).join(", ")}</p>}</main>
      {!copas && <footer className="a-tv-pie">
        <ul className="a-tv-marcador" aria-label="Marcador">
          {/* Tarjetas de esquina (Identidad.tsx): color del jugador, figura saliendo del círculo y sus puntos. */}
          {marcador(v).map(j => <li key={j.id} className="ide-marc"><TarjetaEsquina id={j.id} figura={s.miembros.find(m => m.id === j.id)?.figura} nombre={j.nombre} color={colorDe(j.id, v.jugadores.map(x => x.id))} tamano={v.jugadores.length > 5 ? "3em" : "3.5em"}
            datos={[{ icono: "🏆", valor: j.puntos, titulo: "puntos" }, ...((v.cartasEnMano[j.id] ?? 0) > 0 ? [{ icono: "⚡", valor: v.cartasEnMano[j.id]!, titulo: "comodines" }] : [])]} /></li>)}
        </ul>
      </footer>}
      {v.pausada && <div className="a-tv-velo"><Onomatopeya texto="PAUSA" color="var(--amarillo)" tamano="7em" giro={-6} /></div>}
      {ruleta && <div className="a-tv-velo" onClick={() => setRuleta(null)}><div className="d-pnl a-tv-ruleta"><Etiqueta texto="Ruleta de castigos" icono="wheel" grande /><span className="dsp ol a-tv-t1">{ruleta.quien}</span><span className="a-tv-sub">{ruleta.texto}</span></div></div>}
      {tengoControl && copas && <div className="a-tv-respaldo" aria-label="Controles de respaldo"><button type="button" onClick={() => void cerrar()}>Cerrar sala</button></div>}
      {tengoControl && !copas && (
        <div className="a-tv-respaldo" aria-label="Controles de respaldo">
          <button type="button" onClick={() => void control(pid, v.pausada ? "reanudar" : "pausar")}>{v.pausada ? "Seguir" : "Pausar"}</button>
          {v.fase === "contestando" ? <button type="button" onClick={() => void control(pid, "saltar")}>Saltar</button>
            : <button type="button" onClick={() => void control(pid, "siguiente")}>{ultima ? "Resultados" : "Siguiente"}</button>}
          <button type="button" onClick={() => void confirmar({ titulo: "¿Terminar la partida?", texto: "Se reparten los puntos como van.", si: "Terminar", peligro: true }).then(ok => { if (ok) void control(pid, "terminar"); })}>Terminar</button>
        </div>
      )}
    </>, <FondoEscenario escenario={v.escenario} />);
  }

  return marco(<>
    <header className="a-tv-top"><Cartel titulo={final ? `Resultados · ${nombreJuego(final.juegoId)}` : "Lobby ALV"} sub={final ? "Marquen «¡Listo!» para la siguiente" : "Abre ALV en tu celular y toca «¡Jugar!»"} /><Conexion red={s.red} />
      <span className="a-tv-cupo"><Cupo miembros={s.miembros} /></span><ContadorListos miembros={s.miembros} className="a-tv-contador" /></header>
    <main className="a-tv-main a-tv-lobby">
      {final ? <Posiciones v={final} miembros={s.miembros} grande /> : (
        <div className="a-tv-elenco">
          <Pedestales miembros={ordenados} className="lb-pedestales" />
          {!s.miembros.length && <span className="dsp ol a-tv-t2">Abre ALV y toca «¡Jugar!» para entrar</span>}
        </div>
      )}
      <TodosListos miembros={s.miembros} />
    </main>
  </>);
}
