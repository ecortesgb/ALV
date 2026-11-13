// Lobby: los personajes del grupo en el escenario mientras se arma la partida.
// Se pueden saludar, bailar, chocar la mano o empujarse (todo cosmético: no cambia nada del juego).
// Abajo se configura: juego, escenario, intensidad y jugadores. «Iniciar» abre la pantalla de carga.
import { useEffect, useMemo, useRef, useState } from "react";
import { CONTENIDO } from "../content";
import { ESCENARIOS, LUGARES, SECCIONES } from "../content/catalogo";
import { nivelPorXp } from "../engine/economia";
import { juegosCompatibles } from "../engine/filtros";
import { crearPartida, type EstadoPartida } from "../engine/partida";
import type { DefinicionJuego, EscenarioId, Intensidad, SeccionId } from "../engine/types";
import { ArmadoPartida } from "./Armado";
import { Avatar, Retrato } from "./Avatar";
import { aviso, BotonPantallaCompleta, BotonSonido, COLOR_SECCION, confirmar, configuracion, INTENSIDADES } from "./comun";
import { useAura } from "./efectos";
import { acciones, esMenorConCuenta, parejaDe, saldosDe, useEstado, type JugadorLocal, type Modalidad } from "./estado";
import { lugaresDeSesion } from "./puntos-sesion";
import { sonar } from "./sonido";
import { XpExtra } from "./XpExtra";
import { PanelSala, SalaInvitado } from "./Sala";
import { marcarEnSala, miUid, type GestoSala } from "./nube";
import { traducirSala } from "./salaVista";
import { sorprendeme } from "../engine/filtros";
import { crearAzar } from "../engine/azar";
import { PartidaCelular, useAPartidaDeSala } from "./PartidaCelular";
import { personajeInicial } from "../content/personaje";

const NOMBRE_MODALIDAD: Record<Modalidad, string> = { individual: "Individual", parejas: "Parejas", equipos: "Equipos", sexos: "Guerra de sexos" };

type Gesto = "saludar" | "bailar" | "chocar" | "empujar" | "caer" | "listo";
interface Anim { gesto: Gesto; clave: number; hacia?: "izq" | "der" }

const GESTOS: { k: Gesto; icono: string; nombre: string; conOtro?: boolean }[] = [
  { k: "saludar", icono: "👋", nombre: "Saludar" },
  { k: "bailar", icono: "🕺", nombre: "Bailar" },
  { k: "chocar", icono: "🙌", nombre: "Chocar", conOtro: true },
  { k: "empujar", icono: "🫸", nombre: "Empujar", conOtro: true },
];

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
  const lugar = LUGARES.find(l => l.id === esc.lugar)!;
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
  const sincro = useSincroSala(invitado ? "invitado" : "anfitrion", invitado ? enSala : s.jugadores);
  // Todos los de la sala (mínimo 2) dieron «listo».
  const todosListos = !!s.sala && (s.miembros?.length ?? 0) >= 2 && (s.miembros ?? []).every(m => m.listo);

  const sorpresa = () => {
    const r = sorprendeme(cfg, crearAzar(Date.now() % 1e6));
    const def = r && compatibles.find(j => j.id === r.juego.id);
    if (!def) { aviso("No hay juegos para esta configuración."); return; }
    setJuegoId(def.id); sonar("revelar"); setCargando(def);
  };

  // Celular que entró a la sala de otro: ve a todos en el escenario; el anfitrión inicia la partida.
  if (invitado && enJuego) return <PartidaCelular p={enJuego} />;
  if (s.sala && invitado) {
    return (
      <div className="lobby">
        <div className="lobby-escena">
          <span className="label">Sala {s.sala.codigo} · {enSala.length} de 8</span>
          <h1 className="titulo">{esc.emoji} {esc.nombre}</h1>
          {todosListos && <div className="todos-listos"><b>¡Todos listos!</b><span className="hint">El anfitrión elige: Sorpréndeme o continuar.</span></div>}
          {enSala.length > 0 && <Escenario jugadores={enSala} color={esc.color} sincro={sincro} />}
        </div>
        <SalaInvitado />
      </div>
    );
  }

  if (armando && !cargando) {
    return <ArmadoPartida juegoInicial={juegoId} seccionInicial={seccion} cerrar={() => setArmando(false)}
      iniciar={def => { setArmando(false); setJuegoId(def.id); setCargando(def); }} />;
  }

  if (cargando) return <Carga juego={cargando} alTerminar={() => jugar(crearPartida(cargando, cfg, Date.now() % 100000, CONTENIDO, s.ajustes.rondas ?? 8))} />;

  return (
    <div className="lobby">
      <div className="lobby-escena">
        <div className="entre">
          <div>
            <span className="label">Lobby · {s.jugadores.length} de 8</span>
            <h1 className="titulo">{esc.emoji} {esc.nombre}</h1>
          </div>
          <div className="fila" style={{ gap: 8 }}><BotonPantallaCompleta /><BotonSonido /></div>
        </div>
        {todosListos && (
          <div className="todos-listos">
            <b>¡Todos listos!</b>
            <div className="fila" style={{ gap: 8 }}>
              <button className="btn principal" onClick={sorpresa}>🎲 Sorpréndeme</button>
              <button className="btn" onClick={() => setArmando(true)}>Continuar ›</button>
            </div>
          </div>
        )}
        <Escenario jugadores={s.jugadores} color={esc.color} fondo={esc.id} lugares={hayXpSesion ? lugares : undefined} sincro={s.sala ? sincro : undefined} />
        <div className="lobby-iniciar">
          {juego ? (
            <>
              <div className="pila" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <span className="label">Siguiente juego</span>
                <b className="juego-elegido">{juego.nombre}</b>
              </div>
              <button className="btn" onClick={() => setArmando(true)}>Cambiar</button>
              <button className="btn principal" onClick={iniciar}>Iniciar</button>
            </>
          ) : (
            <>
              <button className="btn" style={{ flex: 1 }} onClick={sorpresa}>🎲 Sorpréndeme</button>
              <button className="btn principal" style={{ flex: 1.4 }} onClick={() => setArmando(true)}>Continuar ›</button>
            </>
          )}
        </div>
      </div>

      <div className="lobby-config">
        <section className="card" aria-labelledby="t-cond">
          <span id="t-cond" className="label">Condiciones</span>
          <div className="opciones">
            {([1, 2, 3, 4] as Intensidad[]).map(x => (
              <button key={x} className="opcion" aria-pressed={cfg.intensidad === x} onClick={() => acciones.ajustes({ intensidad: x })}>{INTENSIDADES[x]}</button>
            ))}
          </div>
          <p className="hint">Modalidad: <b>{NOMBRE_MODALIDAD[s.modalidad ?? (s.enParejas ? "parejas" : "individual")]}</b> · se cambia en «Continuar». Reglas de {lugar.nombre.toLowerCase()}: nunca {lugar.nuncaSePermite.join(", ").toLowerCase()}.</p>
          <label className="interruptor">Contenido adulto (FAP)<input type="checkbox" disabled={menor} checked={s.ajustes.adulto} onChange={async x => {
            const encender = x.target.checked;
            if (encender && !(await confirmar({ titulo: "¿Encender contenido adulto?", texto: "Solo si todos son mayores de 18 y están de acuerdo.", si: "Sí, encender", no: "Mejor no" }))) return;
            acciones.ajustes({ adulto: encender });
          }} /></label>
          <label className="interruptor">Modo Drunk (HBD)<input type="checkbox" disabled={menor} checked={s.ajustes.drunk} onChange={x => acciones.ajustes({ drunk: x.target.checked })} /></label>
          {menor && <p className="aviso">Tu cuenta es de menor de 18: el contenido adulto y el modo Drunk no están disponibles.</p>}
          {s.ajustes.drunk && <p className="aviso">Siempre hay opción sin alcohol, pasar no tiene castigo, máximo 3 por persona por hora y tomar nunca da XP.</p>}
        </section>

        <PanelSala />

        <section className="pila" aria-labelledby="t-jug">
          <span id="t-jug" className="label">Jugadores</span>
          {s.jugadores.map((x, i) => {
            const pareja = s.jugadores.find(o => o.id === parejaDe(i, s));
            return (
              <div key={x.id} className="jugador">
                {x.remoto
                  ? <span className="marco"><Retrato j={x} size={52} /></span>
                  : <a className="marco" href={`#/perfil/${x.id}`} aria-label={`Editar personaje de ${x.nombre}`}><Retrato j={x} size={52} /></a>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {x.remoto
                    ? <b style={{ paddingLeft: 8 }}>{x.nombre}</b>
                    : <input value={x.nombre} maxLength={30} aria-label="Nombre" onChange={ev => acciones.renombrar(x.id, ev.target.value)} />}
                  <small className="muted" style={{ paddingLeft: 8 }}>{x.remoto ? "📱 desde su celular" : `Nv ${nivelPorXp(saldosDe(x).acumulada)}`}{pareja ? ` · pareja de ${pareja.nombre}` : ""}</small>
                </div>
                {!x.remoto && <button className="btn sm cyan" aria-label={`Dar XP extra a ${x.nombre}`} onClick={() => setPremiado(x.id)}>+XP</button>}
                {s.jugadores.length > 2 && !x.remoto && <button className="btn sm" aria-label={`Quitar a ${x.nombre}`} onClick={() => acciones.quitar(x.id)}>✕</button>}
              </div>
            );
          })}
          {s.jugadores.length < 8 && <button className="btn" onClick={acciones.agregar}>+ Agregar jugador ({s.jugadores.length} de 8)</button>}
          <div className="card">
            <b>Evento</b>
            <p className="hint">La XP que ganan en este evento sirve para comprar cartas de poder y ordena el podio. Al cerrarlo, la que sobre queda solo para accesorios.</p>
            <button className="btn sm" onClick={async () => { if (await confirmar({ titulo: "¿Cerrar el evento?", texto: "La XP del evento ya no comprará cartas.", si: "Sí, cerrar", no: "Seguir en el evento", peligro: true })) { acciones.cerrarEvento(); aviso("Evento cerrado. Empieza uno nuevo."); } }}>Cerrar evento y empezar otro</button>
          </div>
        </section>
      </div>
      {s.jugadores.find(x => x.id === premiado) && <XpExtra j={s.jugadores.find(x => x.id === premiado)!} cerrar={() => setPremiado(null)} />}
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
export function Escenario({ jugadores, color, lugares, interactivo = true, todosListos = false, sincro, fondo, fiesta = false }:
  { jugadores: JugadorLocal[]; color: string; lugares?: Record<string, number>; interactivo?: boolean; todosListos?: boolean; sincro?: SincroEscenario;
    /** Dibujo de fondo del lugar (alberca, bosque, fogata). */ fondo?: EscenarioId;
    /** Los personajes se animan solos (pantalla de carga y vista previa). */ fiesta?: boolean }) {
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
      animar(de, { gesto }, gesto === "bailar" ? 1600 : 1000);
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
      const g = (["saludar", "bailar", "listo"] as const)[Math.floor(Math.random() * 3)]!;
      if (j) animar(j.id, { gesto: g }, g === "bailar" ? 1600 : 1000);
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
    <div className={"escenario-vivo" + (fondo ? " fondo-" + fondo : "")} style={{ ["--sc" as string]: color }}>
      {fondo && <div className="paisaje" aria-hidden="true" />}
      <div className="piso" aria-hidden="true" />
      <ul className="elenco" aria-label="Personajes en el lobby">
        {jugadores.map((j, i) => {
          const centro = (n - 1) / 2, d = n > 1 ? Math.abs(i - centro) / centro : 0;
          const anim = anims[j.id];
          const listo = todosListos || listos.has(j.id);
          const soyYo = !!sincro && sincro.yo === j.id;
          const cls = ["actor", anim ? `g-${anim.gesto}` : "", anim?.hacia ? `h-${anim.hacia}` : "", listo ? "listo" : "", elegido === j.id ? "elegido" : "", soyYo ? "soy-yo" : ""].join(" ");
          return (
            <li key={j.id} className={cls} style={{ ["--d" as string]: d.toFixed(2), ["--i" as string]: i, zIndex: 10 - Math.round(d * 5) }}>
              <button className="actor-boton" data-sin-clic disabled={!interactivo} aria-pressed={elegido === j.id}
                aria-label={`${j.nombre}${soyYo ? " (tú)" : ""}${lugares?.[j.id] ? `, lugar ${lugares[j.id]}` : ""}${listo ? ", listo" : ""}`} onClick={() => tocar(j.id)}>
                {lugares?.[j.id] && <span className={"lugar-chip l" + Math.min(4, lugares[j.id]!)}>#{lugares[j.id]}</span>}
                <span key={anim?.clave ?? 0} className="cuerpo"><Avatar p={j.personaje} size={n > 6 ? 62 : 74} nombre={j.nombre} /></span>
                <span className="sombra" aria-hidden="true" />
                <small className="nombre">{listo ? "✓ " : ""}{soyYo ? "Tú" : j.nombre}</small>
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
function Carga({ juego, alTerminar }: { juego: DefinicionJuego; alTerminar: () => void }) {
  const s = useEstado();
  const esc = ESCENARIOS.find(e => e.id === s.ajustes.escenario) ?? ESCENARIOS[0]!;
  const rapido = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const total = rapido ? 400 : 3200;
  const [avance, setAvance] = useState(0);
  const consejo = useMemo(() => CONSEJOS[Math.floor(Math.random() * CONSEJOS.length)]!, []);
  const listo = useRef(alTerminar);
  useEffect(() => {
    const inicio = performance.now();
    let marco = 0;
    const paso = () => {
      const p = Math.min(1, (performance.now() - inicio) / total);
      setAvance(p);
      if (p < 1) marco = requestAnimationFrame(paso);
      else { sonar("carta"); listo.current(); }
    };
    marco = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(marco);
  }, [total]);
  const bloques = 12, llenos = Math.round(avance * bloques);
  return (
    <div className="carga" role="status" aria-live="polite" style={{ ["--sc" as string]: COLOR_SECCION[juego.seccion] }}>
      <span className="sigla carga-sigla">{juego.sigla ?? SECCIONES[juego.seccion].sigla}</span>
      <h1 className="titulo" style={{ textAlign: "center" }}>{juego.nombre}</h1>
      <p className="hint" style={{ textAlign: "center" }}>{esc.emoji} {esc.nombre}</p>
      <Escenario jugadores={s.jugadores} color={esc.color} interactivo={false} todosListos fondo={esc.id} fiesta />
      <div className="bloques" aria-label={`Cargando ${Math.round(avance * 100)}%`}>
        {Array.from({ length: bloques }, (_, i) => <span key={i} className={i < llenos ? "lleno" : ""} />)}
      </div>
      <p className="consejo">{consejo}</p>
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
