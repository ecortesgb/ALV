// Lobby: los personajes del grupo en el escenario mientras se arma la partida.
// Se pueden saludar, bailar, chocar la mano o empujarse (todo cosmético: no cambia nada del juego).
// Abajo se configura: juego, escenario, intensidad y jugadores. «Iniciar» abre la pantalla de carga.
import { useEffect, useMemo, useRef, useState } from "react";
import { CONTENIDO } from "../content";
import { ESCENARIOS, JUEGOS, LUGARES, SECCIONES } from "../content/catalogo";
import { nivelPorXp } from "../engine/economia";
import { juegosCompatibles } from "../engine/filtros";
import { crearPartida, type EstadoPartida } from "../engine/partida";
import type { DefinicionJuego, Intensidad, SeccionId } from "../engine/types";
import { Avatar, Retrato } from "./Avatar";
import { aviso, BotonPantallaCompleta, BotonSonido, COLOR_SECCION, confirmar, configuracion, INTENSIDADES } from "./comun";
import { useAura } from "./efectos";
import { acciones, parejaDe, saldosDe, useEstado, type JugadorLocal } from "./estado";
import { lugaresDeSesion } from "./puntos-sesion";
import { sonar } from "./sonido";
import { XpExtra } from "./XpExtra";
import { PanelSala, SalaInvitado } from "./Sala";
import { PartidaCelular, useAPartidaDeSala } from "./PartidaCelular";
import { personajeInicial } from "../content/personaje";

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
  const lista = compatibles.filter(j => seccion === "todas" || j.seccion === seccion);
  const juego = compatibles.find(j => j.id === juegoId) ?? null;
  const [cargando, setCargando] = useState<DefinicionJuego | null>(null);
  const [premiado, setPremiado] = useState<string | null>(null);
  const lugares = lugaresDeSesion(s);
  const hayXpSesion = s.jugadores.some(j => saldosDe(j).delEvento > 0);

  useEffect(() => {
    if (arg?.startsWith("j-")) setJuegoId(arg.slice(2));
    if (arg?.startsWith("s-")) setSeccion(arg.slice(2) as SeccionId);
  }, [arg]);

  const iniciar = () => {
    if (!juego) { aviso("Elige un juego primero."); return; }
    sonar("revelar");
    setCargando(juego);
  };

  const enJuego = useAPartidaDeSala();
  // Celular que entró a la sala de otro: ve a todos en el escenario; el anfitrión inicia la partida.
  if (s.sala && !s.sala.anfitrion && enJuego) return <PartidaCelular p={enJuego} />;
  if (s.sala && !s.sala.anfitrion) {
    const enSala: JugadorLocal[] = (s.miembros ?? []).map((m, i) => ({ id: m.id, nombre: m.nombre, personaje: m.personaje ?? personajeInicial(i), movimientos: [], tiene: [] }));
    return (
      <div className="lobby">
        <div className="lobby-escena">
          <span className="label">Sala {s.sala.codigo} · {enSala.length} de 8</span>
          <h1 className="titulo">{esc.emoji} {esc.nombre}</h1>
          {enSala.length > 0 && <Escenario jugadores={enSala} color={esc.color} />}
        </div>
        <SalaInvitado />
      </div>
    );
  }

  if (cargando) return <Carga juego={cargando} alTerminar={() => jugar(crearPartida(cargando, cfg, Date.now() % 100000, CONTENIDO))} />;

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
        <Escenario jugadores={s.jugadores} color={esc.color} lugares={hayXpSesion ? lugares : undefined} />
        <div className="lobby-iniciar">
          <div className="pila" style={{ gap: 2, flex: 1, minWidth: 0 }}>
            <span className="label">Siguiente juego</span>
            <b className="juego-elegido">{juego ? juego.nombre : "Elige un juego abajo"}</b>
          </div>
          <button className="btn principal" disabled={!juego} onClick={iniciar}>Iniciar</button>
        </div>
      </div>

      <div className="lobby-config">
        <section className="pila" aria-labelledby="t-juego">
          <span id="t-juego" className="label paso-armado"><i>1</i> Modo de juego</span>
          <div className="pestanas-menu" role="group" aria-label="Filtrar por sección">
            <button className="opcion" aria-pressed={seccion === "todas"} onClick={() => setSeccion("todas")}>Todos</button>
            {(Object.keys(SECCIONES) as SeccionId[]).filter(k => k !== "mix" && compatibles.some(j => j.seccion === k)).map(k => (
              <button key={k} className="opcion" style={{ ["--sc" as string]: COLOR_SECCION[k] }} aria-pressed={seccion === k} onClick={() => setSeccion(k)}>{SECCIONES[k].sigla}</button>
            ))}
          </div>
          <div className="modos">
            {lista.map(j => (
              <button key={j.id} className="juego modo" aria-pressed={juegoId === j.id} style={{ ["--sc" as string]: COLOR_SECCION[j.seccion] }} onClick={() => setJuegoId(j.id)}>
                <span className="modo-cinta">{juegoId === j.id ? "✓ Elegido" : SECCIONES[j.seccion].sigla}</span>
                <span className="icono">{j.sigla ?? SECCIONES[j.seccion].sigla}</span>
                <span className="texto">
                  <b>{j.nombre}</b>
                  <span className="modo-meta">{SECCIONES[j.seccion].trata}</span>
                  <small>{j.descripcion}{s.jugadores.length <= 3 && j.modoCorto ? ` ${j.modoCorto}` : ""}</small>
                </span>
              </button>
            ))}
            {lista.length === 0 && <p className="hint">No hay juegos de esta sección con la configuración actual.</p>}
          </div>
          {JUEGOS.some(j => !j.motor) && <p className="hint">Próximamente: {JUEGOS.filter(j => !j.motor).map(j => j.nombre).join(", ")}.</p>}
        </section>

        <section className="pila" aria-labelledby="t-esc">
          <span id="t-esc" className="label paso-armado"><i>2</i> Escenario</span>
          <div className="escenarios">
            {ESCENARIOS.filter(e => e.activo).map(e => (
              <button key={e.id} className="escenario" aria-pressed={e.id === cfg.escenario} style={{ ["--sc" as string]: e.color }} onClick={() => acciones.ajustes({ escenario: e.id })}>
                <span className="emoji" aria-hidden="true">{e.emoji}</span>
                <span><b>{e.nombre}</b><small>{e.ambientacion}</small></span>
              </button>
            ))}
          </div>
          <p className="hint">Reglas de {lugar.nombre.toLowerCase()}: nunca {lugar.nuncaSePermite.join(", ").toLowerCase()}.</p>
        </section>

        <section className="card" aria-labelledby="t-cond">
          <span id="t-cond" className="label paso-armado"><i>3</i> Condiciones</span>
          <div className="opciones">
            {([1, 2, 3, 4] as Intensidad[]).map(x => (
              <button key={x} className="opcion" aria-pressed={cfg.intensidad === x} onClick={() => acciones.ajustes({ intensidad: x })}>{INTENSIDADES[x]}</button>
            ))}
          </div>
          <label className="interruptor">Juegan en parejas (1.º con 2.º, 3.º con 4.º…)<input type="checkbox" checked={s.enParejas} onChange={x => acciones.enParejas(x.target.checked)} /></label>
          <label className="interruptor">Contenido adulto (FAP)<input type="checkbox" checked={s.ajustes.adulto} onChange={async x => {
            const encender = x.target.checked;
            if (encender && !(await confirmar({ titulo: "¿Encender contenido adulto?", texto: "Solo si todos son mayores de 18 y están de acuerdo.", si: "Sí, encender", no: "Mejor no" }))) return;
            acciones.ajustes({ adulto: encender });
          }} /></label>
          <label className="interruptor">Modo Drunk (HBD)<input type="checkbox" checked={s.ajustes.drunk} onChange={x => acciones.ajustes({ drunk: x.target.checked })} /></label>
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

/** Escenario con los personajes en semicírculo. Tocar uno abre sus gestos. */
export function Escenario({ jugadores, color, lugares, interactivo = true, todosListos = false }:
  { jugadores: JugadorLocal[]; color: string; lugares?: Record<string, number>; interactivo?: boolean; todosListos?: boolean }) {
  const [anims, setAnims] = useState<Record<string, Anim>>({});
  const [listos, setListos] = useState<Set<string>>(new Set());
  const [elegido, setElegido] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<Gesto | null>(null);
  const reloj = useRef(0);
  const n = jugadores.length;
  const idx = (id: string) => jugadores.findIndex(j => j.id === id);
  const nombre = (id: string) => jugadores.find(j => j.id === id)?.nombre ?? "";

  const animar = (id: string, a: Omit<Anim, "clave">, ms = 900) => {
    const clave = ++reloj.current;
    setAnims(x => ({ ...x, [id]: { ...a, clave } }));
    setTimeout(() => setAnims(x => (x[id]?.clave === clave ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== id)) : x)), ms);
  };

  const hacer = (gesto: Gesto, de: string, a?: string) => {
    if (gesto === "listo") {
      setListos(x => { const y = new Set(x); if (y.has(de)) y.delete(de); else { y.add(de); sonar("exito"); animar(de, { gesto: "listo" }, 700); } return y; });
      return;
    }
    if ((gesto === "empujar" || gesto === "chocar") && a) {
      const hacia = idx(a) > idx(de) ? "der" : "izq";
      animar(de, { gesto, hacia });
      if (gesto === "empujar") setTimeout(() => { sonar("paso"); animar(a, { gesto: "caer", hacia }, 1300); }, 260);
      else { sonar("exito"); animar(a, { gesto: "chocar", hacia: hacia === "der" ? "izq" : "der" }); }
      aviso(gesto === "empujar" ? `${nombre(de)} empujó a ${nombre(a)}` : `${nombre(de)} y ${nombre(a)} chocaron la mano`);
    } else {
      sonar("clic");
      animar(de, { gesto }, gesto === "bailar" ? 1600 : 1000);
    }
    setPendiente(null);
  };

  const tocar = (id: string) => {
    if (!interactivo) return;
    if (pendiente && elegido && id !== elegido) { hacer(pendiente, elegido, id); return; }
    setPendiente(null);
    setElegido(e => (e === id ? null : id));
  };

  return (
    <div className="escenario-vivo" style={{ ["--sc" as string]: color }}>
      <div className="piso" aria-hidden="true" />
      <ul className="elenco" aria-label="Personajes en el lobby">
        {jugadores.map((j, i) => {
          const centro = (n - 1) / 2, d = n > 1 ? Math.abs(i - centro) / centro : 0;
          const anim = anims[j.id];
          const listo = todosListos || listos.has(j.id);
          const cls = ["actor", anim ? `g-${anim.gesto}` : "", anim?.hacia ? `h-${anim.hacia}` : "", listo ? "listo" : "", elegido === j.id ? "elegido" : ""].join(" ");
          return (
            <li key={j.id} className={cls} style={{ ["--d" as string]: d.toFixed(2), ["--i" as string]: i, zIndex: 10 - Math.round(d * 5) }}>
              <button className="actor-boton" data-sin-clic disabled={!interactivo} aria-pressed={elegido === j.id}
                aria-label={`${j.nombre}${lugares?.[j.id] ? `, lugar ${lugares[j.id]}` : ""}${listo ? ", listo" : ""}`} onClick={() => tocar(j.id)}>
                {lugares?.[j.id] && <span className={"lugar-chip l" + Math.min(4, lugares[j.id]!)}>#{lugares[j.id]}</span>}
                <span key={anim?.clave ?? 0} className="cuerpo"><Avatar p={j.personaje} size={n > 6 ? 62 : 74} nombre={j.nombre} /></span>
                <span className="sombra" aria-hidden="true" />
                <small className="nombre">{listo ? "✓ " : ""}{j.nombre}</small>
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
      {interactivo && !elegido && <p className="hint escenario-ayuda">Toca a un personaje para saludar, bailar, chocar o empujar.</p>}
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
      <Escenario jugadores={s.jugadores} color={esc.color} interactivo={false} todosListos />
      <div className="bloques" aria-label={`Cargando ${Math.round(avance * 100)}%`}>
        {Array.from({ length: bloques }, (_, i) => <span key={i} className={i < llenos ? "lleno" : ""} />)}
      </div>
      <p className="consejo">{consejo}</p>
    </div>
  );
}
