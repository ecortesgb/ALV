// Lobby: los personajes del grupo en el escenario mientras se arma la partida.
// Se pueden saludar, bailar, chocar la mano o empujarse (todo cosmético: no cambia nada del juego).
// Abajo se configura: juego, escenario, intensidad y jugadores. «Iniciar» abre la pantalla de carga.
import { useEffect, useMemo, useRef, useState } from "react";
import { CONTENIDO } from "../content";
import { ESCENARIOS, SECCIONES } from "../content/catalogo";
import { nivelPorXp } from "../engine/economia";
import { juegosCompatibles } from "../engine/filtros";
import { crearPartida, type EstadoPartida } from "../engine/partida";
import type { DefinicionJuego, EscenarioId, SeccionId } from "../engine/types";
import { ArmadoPartida } from "./Armado";
import { IlustracionJuego, VentanaReglas } from "./Juegos";
import { REGLAS } from "../content/reglas";
import { createPortal } from "react-dom";
import { Avatar, Retrato } from "./Avatar";
import { aviso, BotonPantallaCompleta, BotonSonido, COLOR_SECCION, confirmar, configuracion } from "./comun";
import { useAura } from "./efectos";
import { acciones, esMenorConCuenta, jugadoresDelModo, parejaDe, saldosDe, useEstado, type JugadorLocal } from "./estado";
import { lugaresDeSesion } from "./puntos-sesion";
import { sonar } from "./sonido";
import { XpExtra } from "./XpExtra";
import { PanelSala, SalaInvitado, Unirse } from "./Sala";
import { marcarEnSala, miUid, type GestoSala } from "./nube";
import { traducirSala } from "./salaVista";
import { sorprendeme } from "../engine/filtros";
import { crearAzar } from "../engine/azar";
import { PartidaCelular, useAPartidaDeSala } from "./PartidaCelular";
import { personajeInicial } from "../content/personaje";


type Gesto = GestoSala | "caer" | "listo";
interface Anim { gesto: Gesto; clave: number; hacia?: "izq" | "der" }

const GESTOS: { k: Gesto; icono: string; nombre: string; conOtro?: boolean }[] = [
  { k: "saludar", icono: "👋", nombre: "Saludar" },
  { k: "bailar", icono: "🕺", nombre: "Bailar" },
  { k: "festejar", icono: "🏆", nombre: "Festejar" },
  { k: "aplaudir", icono: "👏", nombre: "Aplaudir" },
  { k: "robot", icono: "🤖", nombre: "Robot" },
  { k: "caminar", icono: "🚶", nombre: "Caminar" },
  { k: "mirar", icono: "👀", nombre: "Mirar" },
  { k: "chocar", icono: "🙌", nombre: "Chocar", conOtro: true },
  { k: "empujar", icono: "🫸", nombre: "Empujar", conOtro: true },
];
/** Cuánto dura cada gesto (ms), igual que su animación. */
const DURACION: Partial<Record<Gesto, number>> = { bailar: 1600, robot: 1600, caminar: 1600, aplaudir: 1200, festejar: 1100, mirar: 1400 };

const CONSEJOS = [
  "Toca a un personaje para saludar, bailar, chocar la mano o empujar a alguien.",
  "Pasar no tiene castigo. Nunca.",
  "El GOAT de hoy se decide con la XP de esta sesión, no con la de toda la vida.",
  "En los juegos secretos, mantén presionado para ver lo tuyo. Al soltar se tapa.",
  "Los accesorios solo se ven: nadie gana por traer la corona más cara.",
  "Las cartas de poder salvan de un castigo, pero no dan puntos.",
  "Si alguien no quiere un reto, pasa y ya. Así se juega en ALV.",
];

export function Lobby({ jugar, arg }: { jugar: (p: EstadoPartida) => void; arg?: string }) {
  const s = useEstado();
  const cfg = configuracion(s);
  const esc = ESCENARIOS.find(e => e.id === cfg.escenario)!;
  useAura(esc.color);

  const [seccion, setSeccion] = useState<SeccionId | "todas">(arg?.startsWith("s-") ? (arg.slice(2) as SeccionId) : "todas");
  const [juegoId, setJuegoId] = useState<string | null>(arg?.startsWith("j-") ? arg.slice(2) : null);
  const compatibles = juegosCompatibles(cfg).filter(j => j.motor);
  const juego = compatibles.find(j => j.id === juegoId) ?? null;
  const [cargando, setCargando] = useState<DefinicionJuego | null>(null);
  const [premiado, setPremiado] = useState<string | null>(null);
  const [armando, setArmando] = useState(arg?.startsWith("s-") ?? false);
  const lugares = lugaresDeSesion(s);
  // Cuenta de un menor de 18: sin contenido adulto ni Drunk, aunque estuvieran encendidos de antes.
  const menor = esMenorConCuenta(s);
  useEffect(() => { if (menor && (s.ajustes.adulto || s.ajustes.drunk)) acciones.ajustes({ adulto: false, drunk: false }); }, [menor, s.ajustes.adulto, s.ajustes.drunk]);
  const hayXpSesion = s.jugadores.some(j => saldosDe(j).delEvento > 0);

  useEffect(() => {
    if (arg?.startsWith("j-")) setJuegoId(arg.slice(2));
    if (arg?.startsWith("s-")) { setSeccion(arg.slice(2) as SeccionId); setArmando(true); }
  }, [arg]);

  const iniciar = () => {
    if (!juego) { aviso("Elige un juego primero."); return; }
    sonar("revelar");
    setCargando(juego);
  };

  const enJuego = useAPartidaDeSala();
  const invitado = !!s.sala && !s.sala.anfitrion;
  const enSala = useMemo<JugadorLocal[]>(() => (s.miembros ?? []).map((m, i) => ({ id: m.id, nombre: m.nombre, personaje: m.personaje ?? personajeInicial(i), movimientos: [], tiene: [] })), [s.miembros]);
  const sincro = useSincroSala(invitado ? "invitado" : "anfitrion", invitado ? enSala : jugadoresDelModo(s));
  // Todos los de la sala (mínimo 2) dieron «listo».
  const todosListos = !!s.sala && (s.miembros?.length ?? 0) >= 2 && (s.miembros ?? []).every(m => m.listo);

  const sorpresa = () => {
    const r = sorprendeme(cfg, crearAzar(Date.now() % 1e6));
    const def = r && compatibles.find(j => j.id === r.juego.id);
    if (!def) { aviso("No hay juegos para esta configuración."); return; }
    setJuegoId(def.id); sonar("revelar"); setCargando(def);
  };

  // Local: solo los creados en este celular. En línea: solo cuentas reales de la sala. No se mezclan.
  const enLinea = (s.ajustes.modo ?? (s.sala ? "linea" : "local")) === "linea";
  const [hoja, setHoja] = useState<"jugadores" | "sala" | null>(null);

  if (enLinea && invitado && enJuego) return <PartidaCelular p={enJuego} />;

  if (armando && !cargando) {
    return <ArmadoPartida juegoInicial={juegoId} seccionInicial={seccion} cerrar={() => setArmando(false)}
      iniciar={def => { setArmando(false); setJuegoId(def.id); setCargando(def); }} />;
  }

  if (cargando) {
    return <Carga juego={cargando} cancelar={() => { setCargando(null); setArmando(true); }}
      iniciar={() => jugar(crearPartida(cargando, cfg, Date.now() % 100000, CONTENIDO, s.ajustes.rondas ?? 8))} />;
  }

  const vista = enLinea ? (s.sala ? (invitado ? enSala : jugadoresDelModo(s)) : []) : s.jugadores.filter(j => !j.remoto);
  const anfitrion = !enLinea || !!s.sala?.anfitrion;
  return (
    <div className="lobby-grande">
      <header className="lobby-arriba">
        <a className="hub-icono volver" href="#/inicio" aria-label="Volver a la pantalla principal">‹</a>
        <span className="pila" style={{ gap: 0, minWidth: 0, flex: 1 }}>
          <span className="label">{enLinea ? (s.sala ? `En línea · sala ${s.sala.codigo}` : "En línea") : "Juego local"} · {vista.length} de 8</span>
          <h1 className="lobby-titulo">{esc.emoji} {esc.nombre}</h1>
        </span>
        {enLinea
          ? <button className="lobby-boton" onClick={() => setHoja("sala")}>📡 Sala</button>
          : <button className="lobby-boton" onClick={() => setHoja("jugadores")}>👥 Jugadores</button>}
        <BotonPantallaCompleta /><BotonSonido />
      </header>

      {enLinea && todosListos && (
        <div className="todos-listos">
          <b>¡Todos listos!</b>
          {anfitrion ? <span className="hint">Elige Sorpréndeme o Comenzar.</span> : <span className="hint">El anfitrión elige el juego.</span>}
        </div>
      )}

      <div className="lobby-escenario">
        {vista.length > 0
          ? <Escenario jugadores={vista} color={esc.color} fondo={esc.id} lugares={!enLinea && hayXpSesion ? lugares : undefined} sincro={enLinea && s.sala ? sincro : undefined} />
          : (
            <div className="lobby-vacio">
              <b>Todavía no hay sala</b>
              <p className="hint">Abre una sala y comparte el código, o entra a la de alguien más. Aquí solo juegan cuentas reales.</p>
              <button className="btn principal" onClick={() => setHoja("sala")}>📡 Abrir o entrar a una sala</button>
            </div>
          )}
      </div>

      <footer className="lobby-abajo">
        {!anfitrion ? <p className="hint" style={{ textAlign: "center", flex: 1 }}>Da «listo» tocando a tu personaje. El anfitrión elige el juego.</p>
          : juego ? (
            <>
              <span className="lobby-juego"><span className="label">Siguiente juego</span><b>{juego.nombre}</b></span>
              <button className="btn" onClick={() => setArmando(true)}>Cambiar</button>
              <button className="hub-jugar lobby-comenzar" onClick={iniciar}>¡Comenzar!</button>
            </>
          ) : (
            <>
              <button className="lobby-sorpresa" onClick={sorpresa} disabled={vista.length < 2}><span className="mini-ruleta" aria-hidden="true" /> Sorpréndeme</button>
              <button className="hub-jugar lobby-comenzar" onClick={() => setArmando(true)} disabled={vista.length < 2}>¡Comenzar!</button>
            </>
          )}
      </footer>

      {hoja && (
        <HojaLobby titulo={hoja === "sala" ? "Sala en línea" : "Jugadores de este celular"} cerrar={() => setHoja(null)}>
          {hoja === "sala"
            ? <>{!s.sala && <Unirse />}{invitado ? <SalaInvitado /> : <PanelSala />}</>
            : <JugadoresLocales premiar={setPremiado} />}
        </HojaLobby>
      )}
      {s.jugadores.find(x => x.id === premiado) && <XpExtra j={s.jugadores.find(x => x.id === premiado)!} cerrar={() => setPremiado(null)} />}
    </div>
  );
}

/** Hoja que sube desde abajo, para lo que no debe estorbar al escenario. */
function HojaLobby({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [cerrar]);
  return createPortal(
    <div className="hoja-fondo" onClick={e => { if (e.target === e.currentTarget) cerrar(); }}>
      <section className="hoja" role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="entre"><h2>{titulo}</h2><button className="btn sm" onClick={cerrar}>Listo</button></header>
        <div className="hoja-cuerpo">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

/** Jugadores creados en este celular (modo local): nombre, personaje, XP extra, quitar y agregar. */
function JugadoresLocales({ premiar }: { premiar: (id: string) => void }) {
  const s = useEstado();
  const locales = s.jugadores.filter(j => !j.remoto);
  return (
    <div className="pila">
      <div className="cartas-jugadores">
        {locales.map((x, i) => {
          const pareja = s.jugadores.find(o => o.id === parejaDe(s.jugadores.indexOf(x), s));
          return (
            <div key={x.id} className="carta-jugador" style={{ ["--i" as string]: i }}>
              <a className="cj-retrato" href={`#/perfil/${x.id}`} aria-label={`Editar personaje de ${x.nombre}`}><Retrato j={x} size={84} /></a>
              <input className="cj-nombre" value={x.nombre} maxLength={30} aria-label="Nombre" onChange={ev => acciones.renombrar(x.id, ev.target.value)} />
              <small className="muted">Nv {nivelPorXp(saldosDe(x).acumulada)}{pareja ? ` · 💞 ${pareja.nombre}` : ""}</small>
              <span className="cj-botones">
                <button className="btn sm cyan" aria-label={`Dar XP extra a ${x.nombre}`} onClick={() => premiar(x.id)}>+XP</button>
                {locales.length > 2 && <button className="btn sm" aria-label={`Quitar a ${x.nombre}`} onClick={() => acciones.quitar(x.id)}>✕</button>}
              </span>
            </div>
          );
        })}
        {locales.length < 8 && (
          <button className="carta-jugador agregar" onClick={() => { sonar("exito"); acciones.agregar(); }} aria-label="Agregar jugador">
            <span className="cj-mas" aria-hidden="true">+</span><b>Agregar</b><small className="muted">{8 - locales.length} lugares</small>
          </button>
        )}
      </div>
      <p className="hint">Toca un retrato para armar su personaje. Estos jugadores solo existen en este celular.</p>
      <div className="evento-chip">
        <span className="pila" style={{ gap: 0, flex: 1 }}><b>🎟️ Evento abierto</b><small className="muted">Su XP compra cartas de poder y ordena el podio.</small></span>
        <button className="btn sm" onClick={async () => { if (await confirmar({ titulo: "¿Cerrar el evento?", texto: "La XP del evento ya no comprará cartas.", si: "Sí, cerrar", no: "Seguir en el evento", peligro: true })) { acciones.cerrarEvento(); aviso("Evento cerrado. Empieza uno nuevo."); } }}>Cerrar</button>
      </div>
    </div>
  );
}

/** Escenario conectado a una sala en línea: ids ya traducidos a los de esta vista. */
export interface SincroEscenario {
  /** Mi personaje en esta vista: es el único que puedo mover. */
  yo: string | null;
  listos: Set<string>;
  gestos: Record<string, { gesto: GestoSala; a?: string; n: number }>;
  enviar: (cambio: { listo?: boolean; gesto?: GestoSala; a?: string }) => void;
}

/**
 * Escenario con los personajes en semicírculo. Tocar uno abre sus gestos.
 * Con `sincro` (sala en línea) cada quien mueve solo a su personaje, sus gestos y su «listo» van al servidor
 * y los gestos de los demás celulares se animan aquí cuando llegan.
 */
export function Escenario({ jugadores, color, lugares, interactivo = true, todosListos = false, sincro, fondo, fiesta = false, destacado, listosIds }:
  { jugadores: JugadorLocal[]; color: string; lugares?: Record<string, number>; interactivo?: boolean; todosListos?: boolean; sincro?: SincroEscenario;
    /** Dibujo de fondo del lugar (alberca, bosque, fogata). */ fondo?: EscenarioId;
    /** Los personajes se animan solos (pantalla de carga y vista previa). */ fiesta?: boolean;
    /** En la partida: a quién le toca (pasa al frente con reflector) y quiénes ya contestaron. */ destacado?: string; listosIds?: string[] }) {
  const [anims, setAnims] = useState<Record<string, Anim>>({});
  const [listosLocal, setListos] = useState<Set<string>>(new Set());
  // Mi «listo» se ve al instante aunque el servidor tarde un par de segundos en confirmarlo.
  const [miListo, setMiListo] = useState<{ v: boolean; hasta: number } | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<Gesto | null>(null);
  const reloj = useRef(0);
  const n = jugadores.length;
  const idx = (id: string) => jugadores.findIndex(j => j.id === id);
  const nombre = (id: string) => jugadores.find(j => j.id === id)?.nombre ?? "";

  const listos = useMemo(() => {
    if (!sincro) return listosLocal;
    const y = new Set(sincro.listos);
    if (sincro.yo && miListo && Date.now() < miListo.hasta) { if (miListo.v) y.add(sincro.yo); else y.delete(sincro.yo); }
    return y;
  }, [sincro, listosLocal, miListo]);

  const animar = (id: string, a: Omit<Anim, "clave">, ms = 900) => {
    const clave = ++reloj.current;
    setAnims(x => ({ ...x, [id]: { ...a, clave } }));
    setTimeout(() => setAnims(x => (x[id]?.clave === clave ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== id)) : x)), ms);
  };

  /** Solo la animación y el sonido: sirve para mis gestos y para los que llegan de otros celulares. */
  const reproducir = (gesto: GestoSala, de: string, a?: string) => {
    if ((gesto === "empujar" || gesto === "chocar") && a && idx(a) >= 0) {
      const hacia = idx(a) > idx(de) ? "der" : "izq";
      animar(de, { gesto, hacia });
      if (gesto === "empujar") setTimeout(() => { sonar("paso"); animar(a, { gesto: "caer", hacia }, 1300); }, 260);
      else { sonar("exito"); animar(a, { gesto: "chocar", hacia: hacia === "der" ? "izq" : "der" }); }
      aviso(gesto === "empujar" ? `${nombre(de)} empujó a ${nombre(a)}` : `${nombre(de)} y ${nombre(a)} chocaron la mano`);
    } else {
      sonar("clic");
      animar(de, { gesto }, DURACION[gesto] ?? 1000);
    }
  };

  const hacer = (gesto: Gesto, de: string, a?: string) => {
    if (gesto === "listo") {
      const ahora = !listos.has(de);
      if (ahora) { sonar("exito"); animar(de, { gesto: "listo" }, 700); }
      if (sincro && de === sincro.yo) { setMiListo({ v: ahora, hasta: Date.now() + 5000 }); sincro.enviar({ listo: ahora }); }
      else setListos(x => { const y = new Set(x); if (ahora) y.add(de); else y.delete(de); return y; });
      return;
    }
    if (gesto === "caer") return;
    reproducir(gesto, de, a);
    if (sincro && de === sincro.yo) sincro.enviar({ gesto, a });
    setPendiente(null);
  };

  // Modo fiesta: cada poco alguien saluda, baila o festeja, sin sonido.
  useEffect(() => {
    if (!fiesta || n === 0) return;
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      const j = jugadores[Math.floor(Math.random() * n)];
      const lista = ["saludar", "bailar", "festejar", "aplaudir", "robot", "caminar", "mirar"] as const;
      const g = lista[Math.floor(Math.random() * lista.length)]!;
      if (j) animar(j.id, { gesto: g }, DURACION[g] ?? 1000);
    }, 900);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiesta, n]);

  // Gestos que llegan de los demás celulares: se anima cada uno cuya cuenta subió desde la última lectura.
  const vistos = useRef<Record<string, number> | null>(null);
  const claveGestos = sincro ? Object.entries(sincro.gestos).map(([k, v]) => `${k}:${v.n}`).join("|") : "";
  useEffect(() => {
    if (!sincro) return;
    const antes = vistos.current;
    vistos.current = Object.fromEntries(Object.entries(sincro.gestos).map(([k, v]) => [k, v.n]));
    if (!antes) return; // la primera lectura no repite gestos viejos
    for (const [id, g] of Object.entries(sincro.gestos)) {
      if (id === sincro.yo || (antes[id] ?? 0) >= g.n) continue;
      reproducir(g.gesto, id, g.a);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveGestos]);

  const tocar = (id: string) => {
    if (!interactivo) return;
    if (pendiente && elegido && id !== elegido) { hacer(pendiente, elegido, id); return; }
    if (sincro && id !== sincro.yo) { aviso("Solo puedes mover a tu personaje."); return; }
    setPendiente(null);
    setElegido(e => (e === id ? null : id));
  };

  return (
    <div className={"escenario-vivo" + (fondo ? " fondo-" + fondo : "") + (destacado ? " con-turno" : "")} style={{ ["--sc" as string]: color }}>
      {fondo && <div className="paisaje" aria-hidden="true" />}
      <div className="piso" aria-hidden="true" />
      <ul className="elenco" aria-label="Personajes en el lobby">
        {jugadores.map((j, i) => {
          const centro = (n - 1) / 2, d = n > 1 ? Math.abs(i - centro) / centro : 0;
          const anim = anims[j.id];
          const listo = todosListos || listos.has(j.id) || !!listosIds?.includes(j.id);
          const soyYo = !!sincro && sincro.yo === j.id;
          const turno = destacado === j.id;
          const cls = ["actor", anim ? `g-${anim.gesto}` : "", anim?.hacia ? `h-${anim.hacia}` : "", listo ? "listo" : "", elegido === j.id || turno ? "elegido" : "", soyYo ? "soy-yo" : "",
            turno ? "en-turno" : destacado ? "atras" : ""].join(" ");
          return (
            <li key={j.id} className={cls} style={{ ["--d" as string]: d.toFixed(2), ["--i" as string]: i, zIndex: 10 - Math.round(d * 5) }}>
              <button className="actor-boton" data-sin-clic disabled={!interactivo} aria-pressed={elegido === j.id}
                aria-label={`${j.nombre}${soyYo ? " (tú)" : ""}${lugares?.[j.id] ? `, lugar ${lugares[j.id]}` : ""}${listo ? ", listo" : ""}`} onClick={() => tocar(j.id)}>
                {lugares?.[j.id] && <span className={"lugar-chip l" + Math.min(4, lugares[j.id]!)}>#{lugares[j.id]}</span>}
                <span key={anim?.clave ?? 0} className="cuerpo"><Avatar p={j.personaje} size={n > 6 ? 62 : 74} nombre={j.nombre} articulado /></span>
                <span className="sombra" aria-hidden="true" />
                <small className="nombre">{turno ? "▶ " : listo ? "✓ " : ""}{soyYo ? "Tú" : j.nombre}</small>
              </button>
            </li>
          );
        })}
      </ul>
      {interactivo && elegido && (
        <div className="gestos" role="group" aria-label={`Gestos de ${nombre(elegido)}`}>
          {pendiente ? (
            <>
              <span className="hint" style={{ color: "var(--ink)" }}>¿A quién? Toca a otro personaje</span>
              <div className="chips">
                {jugadores.filter(j => j.id !== elegido).map(j => <button key={j.id} className="opcion" onClick={() => hacer(pendiente, elegido, j.id)}>{j.nombre}</button>)}
                <button className="opcion" onClick={() => setPendiente(null)}>Cancelar</button>
              </div>
            </>
          ) : (
            <div className="chips">
              {GESTOS.map(g => (
                <button key={g.k} className="opcion" disabled={g.conOtro && n < 2} onClick={() => (g.conOtro ? setPendiente(g.k) : hacer(g.k, elegido))}>
                  <span aria-hidden="true">{g.icono}</span> {g.nombre}
                </button>
              ))}
              <button className="opcion" aria-pressed={listos.has(elegido)} onClick={() => hacer("listo", elegido)}>✅ {listos.has(elegido) ? "No listo" : "Listo"}</button>
            </div>
          )}
        </div>
      )}
      {interactivo && !elegido && <p className="hint escenario-ayuda">{sincro ? "Toca a tu personaje para saludar, bailar, chocar, empujar o darte por listo." : "Toca a un personaje para saludar, bailar, chocar o empujar."}</p>}
    </div>
  );
}

/** Pantalla de carga entre el lobby y la partida: personajes listos, barra de bloques y consejos. */
function Carga({ juego, iniciar, cancelar }: { juego: DefinicionJuego; iniciar: () => void; cancelar: () => void }) {
  const s = useEstado();
  const esc = ESCENARIOS.find(e => e.id === s.ajustes.escenario) ?? ESCENARIOS[0]!;
  const rapido = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const total = rapido ? 400 : 3200;
  const [avance, setAvance] = useState(0);
  const [reglas, setReglas] = useState(false);
  const consejo = useMemo(() => CONSEJOS[Math.floor(Math.random() * CONSEJOS.length)]!, []);
  useEffect(() => {
    const inicio = performance.now();
    let marco = 0;
    const paso = () => {
      const p = Math.min(1, (performance.now() - inicio) / total);
      setAvance(p);
      if (p < 1) marco = requestAnimationFrame(paso);
      else { sonar("carta"); setReglas(true); }
    };
    marco = requestAnimationFrame(paso);
    // Respaldo: si el navegador frena las animaciones (ahorro de batería, pestaña oculta), igual se termina a tiempo.
    const respaldo = window.setTimeout(() => { setAvance(1); setReglas(true); }, total + 400);
    return () => { cancelAnimationFrame(marco); window.clearTimeout(respaldo); };
  }, [total]);
  const bloques = 12, llenos = Math.round(avance * bloques);
  const r = juego.motor ? REGLAS[juego.motor] : null;
  return (
    <div className="carga carga-juego" role="status" aria-live="polite" style={{ ["--sc" as string]: COLOR_SECCION[juego.seccion] }}>
      <div className="carga-info">
        <IlustracionJuego juego={juego} grande />
        <span className="pila" style={{ gap: 4 }}>
          <span className="label">{SECCIONES[juego.seccion].trata} · {esc.emoji} {esc.nombre}</span>
          <h1 className="carga-nombre">{juego.nombre}</h1>
          <p className="carga-desc">{r?.objetivo ?? juego.descripcion}</p>
          {r && <small className="carga-gana">🏆 {r.gana}</small>}
        </span>
      </div>
      <Escenario jugadores={jugadoresDelModo(s)} color={esc.color} interactivo={false} todosListos fondo={esc.id} fiesta />
      <div className="bloques" aria-label={`Cargando ${Math.round(avance * 100)}%`}>
        {Array.from({ length: bloques }, (_, i) => <span key={i} className={i < llenos ? "lleno" : ""} />)}
      </div>
      <p className="consejo">{consejo}</p>
      {reglas && <VentanaReglas juego={juego} cerrar={cancelar} iniciar={() => { sonar("revelar"); iniciar(); }} />}
    </div>
  );
}

/**
 * Traduce la sala del servidor a la vista del escenario.
 * Anfitrión: su cuenta es el primer jugador local y los demás son `c-<id>`. Invitado: los ids son los de la cuenta.
 */
function useSincroSala(vista: "anfitrion" | "invitado", jugadores: JugadorLocal[]): SincroEscenario | undefined {
  const s = useEstado();
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { if (s.sala) void miUid().then(setUid); }, [s.sala?.id]);
  return useMemo(() => {
    const sala = s.sala;
    if (!sala || !s.miembros) return undefined;
    const primero = jugadores[0]?.id;
    const { listos, gestos, aServidor } = traducirSala(vista, s.miembros, primero);
    return {
      yo: vista === "invitado" ? uid : primero ?? null,
      listos, gestos,
      enviar: c => {
        const a = c.a ? aServidor(c.a) : undefined;
        // Chocar o empujar a alguien que juega en este celular sin cuenta: solo se ve aquí.
        if (c.gesto && (c.gesto === "chocar" || c.gesto === "empujar") && !a) return;
        void marcarEnSala(sala, { listo: c.listo, gesto: c.gesto as GestoSala | undefined, a }).then(ok => { if (!ok) aviso("No se pudo enviar. Revisa tu señal."); });
      },
    };
  }, [s.sala, s.miembros, uid, jugadores, vista]);
}
