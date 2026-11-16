// La sala en el celular (#/sala/código): espera, partida y resultados, en un solo lugar.
// El papel es del aparato: aquí siempre se juega. A quien tiene el control le sale además la barra del anfitrión.
// Sin pantalla (modo mesa), el celular del anfitrión también corre el motor y se queda encendido.
import { useEffect, useState } from "react";
import { JUEGOS } from "../content/catalogo";
import { BarraAnfitrion, Boton, Chip, Etiqueta, Panel, Reloj } from "../ds";
import { ir } from "../app/rutas";
import { refrescarSesion, useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import { enlace, enlaceSala, type Miembro } from "../servicios/enlace";
import { HerramientaCelular, type MiVista } from "../juegos/general/celular";
import { esPublico, marcador, nombreJuego, quedan, type Publico } from "../juegos/general/texto";
import { control, iniciarPartida, jugada, useMotor } from "../roles/pantalla/motor";
import { useSala } from "../roles/sala";
import { Filas, NIVELES, Reglas, candado } from "./Catalogo";
import { Capsulas } from "./Personalizar";
import { Cabecera, Elenco, Marco, Retrato, Vacio, aviso, confirmar } from "./comun";

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

/** Segundos que quedan, actualizados 4 veces por segundo solo si hay reloj. */
export function useQuedan(v: Publico | null): number {
  const [, set] = useState(0);
  const hay = !!v?.reloj && v.fase === "contestando" && !v.pausada;
  useEffect(() => { if (!hay) return; const t = setInterval(() => set(x => x + 1), 250); return () => clearInterval(t); }, [hay]);
  return v && hay ? quedan(v) : 0;
}

export function Conexion({ red }: { red: string }) {
  if (red === "vivo") return null;
  return <span className="a-red" role="status">{red === "respaldo" ? "Reconectando…" : "Conectando…"}</span>;
}

/** Podio de una partida terminada, con lo público. */
export function Podio({ v, miembros, yo }: { v: Publico; miembros: Miembro[]; yo?: string }) {
  const m = marcador(v);
  return (
    <div className="a-podio">
      <ol className="a-podio-3">
        {m.slice(0, 3).map(j => (
          <li key={j.id} className={`l${j.lugar}`}>
            <Retrato id={j.id} figura={miembros.find(x => x.id === j.id)?.figura} nombre={j.nombre} size={j.lugar === 1 ? 92 : 72} />
            <b className="dsp ol">{j.lugar}</b><span className="dsp">{j.nombre}</span><small>{j.puntos} pts</small>
          </li>
        ))}
      </ol>
      {m.length > 3 && <ul className="a-tabla">{m.slice(3).map(j => <li key={j.id} className={j.id === yo ? "yo" : ""}><b>{j.lugar}</b><span>{j.nombre}</span><small>{j.puntos} pts</small></li>)}</ul>}
    </div>
  );
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
  const quedanS = useQuedan(v);
  const [juego, setJuego] = useState("impostor"), [rondas, setRondas] = useState(8), [nivel, setNivel] = useState<1 | 2 | 3 | 4>(2);
  const [iniciando, setIniciando] = useState(false), [xpReto, setXpReto] = useState(false), [verReglas, setVerReglas] = useState(false);
  const terminada = !!s.partida?.terminada;
  useEffect(() => { if (terminada) { sonar("exito"); void refrescarSesion(); } }, [terminada, s.partida?.id]);
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
    const ultima = v.ronda >= v.totalRondas;
    return (
      <Marco clase="a-partida" fijo={soyAnfitrion ? (
        <div className="a-barra">
          <BarraAnfitrion pausada={v.pausada}
            momento={v.fase === "revelada" ? { texto: ultima ? "Ver resultados" : "Siguiente ronda", icono: "skip", onClick: () => void control(pid, "siguiente") } : undefined}
            onPausar={() => void control(pid, v.pausada ? "reanudar" : "pausar")}
            onSaltar={() => void (v.fase === "contestando" ? control(pid, "saltar") : control(pid, "siguiente"))}
            onRuleta={() => void control(pid, "ruleta")} onXpReto={() => setXpReto(true)} />
        </div>
      ) : undefined}>
        <div className={"a-ancho a-angosto a-pila" + (soyAnfitrion ? " con-barra" : "")}>
          <header className="a-cab">
            <Etiqueta texto={`Ronda ${v.ronda} de ${v.totalRondas}`} icono="star" />
            <span className="dsp ol a-t3 a-crece">{nombreJuego(v.juegoId)}</span>
            {v.reloj && v.fase === "contestando" && <Reloj segundos={quedanS} total={v.reloj.total} pausado={v.pausada} style={{ width: 56, height: 56 }} />}
            <Conexion red={s.red} />
          </header>
          {estoy ? <HerramientaCelular v={v} mi={mi} miembros={s.miembros} mandar={(t, d) => jugada(pid, t, d)} />
            : <Panel className="a-herr"><span className="dsp ol a-t2">Juegas en la siguiente</span><p className="a-suave">Llegaste con la partida empezada. Mira la pantalla.</p></Panel>}
          <ul className="a-marcador" aria-label="Marcador">
            {marcador(v).map(j => <li key={j.id} className={j.id === ses.uid ? "yo" : ""}><Retrato id={j.id} figura={s.miembros.find(m => m.id === j.id)?.figura} nombre={j.nombre} size={32} /><span>{j.nombre}</span>{(v.cartasEnMano[j.id] ?? 0) > 0 && <Chip texto={String(v.cartasEnMano[j.id])} icono="bolt" />}<b className="dsp">{j.puntos}</b></li>)}
          </ul>
          {soyAnfitrion && <button type="button" className="a-plano" onClick={() => void confirmar({ titulo: "¿Terminar la partida?", texto: "Se reparten los puntos como van.", si: "Terminar", peligro: true }).then(ok => { if (ok) void control(pid, "terminar"); })}>Terminar partida</button>}
        </div>
        {xpReto && <XpReto v={v} cerrar={() => setXpReto(false)} alDar={(j, x) => { void enlace.darXp(sala, j, x).then(ok => { if (ok) { void control(pid, "xp-reto", { jugador: j, xp: x }); aviso(`+${x} XP para ${v.jugadores.find(p => p.id === j)?.nombre ?? ""}`); } else aviso("No se pudo dar la XP."); }); }} />}
      </Marco>
    );
  }

  // ---------- Espera (antes de la primera partida o entre partidas) ----------
  const yo = s.miembros.find(m => m.id === ses.uid);
  const def = JUEGOS.find(j => j.id === juego)!;
  const motivo = candado(def, s.miembros.length, nivel);
  const iniciar = async () => {
    setIniciando(true);
    const ok = await iniciarPartida(sala, s.miembros, juego, rondas, nivel);
    setIniciando(false);
    if (!ok) aviso("No se pudo iniciar. Intenta otra vez."); else { sonar("exito"); s.refrescar(); }
  };
  return (
    <Marco>
      <div className="a-ancho a-pila">
        <Cabecera titulo={`Sala ${sala.codigo}`} icono="users" alVolver={() => void salir()} derecha={<Conexion red={s.red} />} />
        {final && <Panel className="a-pila a-entra" como="section"><Etiqueta texto={`Resultados · ${nombreJuego(final.juegoId)}`} icono="trophy" /><Podio v={final} miembros={s.miembros} yo={ses.uid} /></Panel>}
        <div className="a-dos">
          <Panel className="a-pila" como="section">
            <div className="a-entre"><span className="dsp ol a-t2">{s.miembros.length} en la sala</span><Chip texto={sala.modo === "tv" ? "Con pantalla" : "Sin pantalla"} icono="eye" /></div>
            <div className="a-elenco"><Elenco gente={s.miembros} foco={ses.uid} /></div>
            <ul className="a-gente">{s.miembros.map(m => <li key={m.id}><span className="dsp">{m.nombre}</span>{m.anfitrion && <Chip texto="Anfitrión" icono="star" />}<Chip texto={m.listo ? "Listo" : "Esperando"} seleccionado={m.listo} /></li>)}</ul>
            <Capsulas />
            <Boton color={yo?.listo ? "azul" : "verde"} texto={yo?.listo ? "Ya no estoy listo" : "¡Listo!"} icono="star" onClick={() => void enlace.marcarListo(sala, !yo?.listo).then(s.refrescar)} />
            <button type="button" className="a-plano" onClick={() => { void navigator.clipboard?.writeText(enlaceSala(sala.codigo)).then(() => aviso("Enlace copiado")); }}>Copiar enlace para invitar</button>
          </Panel>
          {soyAnfitrion ? (
            <Panel className="a-pila" como="section">
              <Etiqueta texto="Tú eliges el juego" icono="star" />
              <Filas jugadores={s.miembros.length} nivel={nivel} elegido={juego} alElegir={id => { setJuego(id); setVerReglas(false); }} />
              <div className="a-entre"><span className="dsp ol a-t2">{def.nombre}</span><button type="button" className="a-plano" onClick={() => setVerReglas(x => !x)}>{verReglas ? "Ocultar reglas" : "Ver reglas"}</button></div>
              {verReglas && <Reglas id={juego} />}
              <div className="a-campo"><span>¿Hasta dónde quieren llegar?</span><div className="a-fila a-envuelve">{([1, 2, 3, 4] as const).map(n => <Chip key={n} texto={NIVELES[n]} seleccionado={nivel === n} onClick={() => setNivel(n)} />)}</div></div>
              <div className="a-campo"><span>Rondas</span><div className="a-fila a-envuelve">{[5, 8, 12].map(n => <Chip key={n} texto={String(n)} seleccionado={rondas === n} onClick={() => setRondas(n)} />)}</div></div>
              {sala.modo === "tv" && <p className="a-nota">Abre ALV en la laptop o TV con tu cuenta y elige «Volver a mi sala»: ahí se proyecta la partida.</p>}
              <Boton color="amarillo" principal texto={final ? "Otra partida" : "Iniciar"} sub={motivo ?? `${def.nombre} · ${rondas} rondas`} icono="play" desactivado={!!motivo} cargando={iniciando} onClick={() => void iniciar()} />
            </Panel>
          ) : <Panel className="a-pila a-centro-txt" como="section"><span className="dsp ol a-t2">Esperando al anfitrión</span><p className="a-suave">{s.miembros.find(m => m.anfitrion)?.nombre ?? "El anfitrión"} elige el juego. Mientras, cambia tu cápsula o marca «Listo».</p></Panel>}
        </div>
      </div>
    </Marco>
  );
}
