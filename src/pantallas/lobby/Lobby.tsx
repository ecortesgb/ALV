// Lobby estilo fiesta (pedido de Elías del 2026-11-22, referencia LEGO Party): cada quien en su columna de color con su
// figura en el pedestal. El administrador (anfitrión) siempre es P1 rojo; los demás por orden de entrada y género.
// Cada jugador solo elige con cuál de sus 3 figuras juega y da «Listo». El administrador además puede sacar a alguien,
// dar listo por alguien y «Continuar» a la configuración de la partida. Fondo y botones del HUB «La Azotea».
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { escribirCapsulas, leerCapsulas, apodoDe, useCapsulas, useFoto, N_CAPSULAS } from "../../app/figura3d";
import { ir } from "../../app/rutas";
import { enlace, esLocal, modoLocal, type Miembro, type SalaV } from "../../servicios/enlace";
import { PersonajeLocal, type DatosPersonaje } from "./PersonajeLocal";
import { colorDe } from "../../app/colorJugador";
import { BotonCast } from "./Cast";
import { ConfigEnVivo, useConfigEnVivo } from "../ConfigEnVivo";
import type { PresenciaPantalla } from "../../servicios/tiempoReal";
import type { Publico } from "../../juegos/general/texto";
import { nombreJuego } from "../../juegos/general/texto";
import { PodioJuego } from "../../juegos/general/Copas";
import { Marco, aviso, confirmar, useAncho } from "../comun";
import { CUPO_LOBBY, Pedestales, lugaresSala, preparados } from "../SalaEspera";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "./lobby.css";
import { FondoCuarto } from "./Cuarto";
import { claseLobby, LOBBY_NUEVO } from "./version";
import { MenuGestos } from "../gestos/MenuGestos";
import { useVidaPropia } from "../../app/vidaPerfil";

/** Cabinas por color con pedestal (Elías aprobó el 22 nov; las cápsulas viejas se quitaron el 23 nov). */
const PRUEBA_ESCENARIOS = true;

export interface PropsLobby {
  sala: SalaV; miembros: Miembro[]; yo: string; soyAnfitrion: boolean; final: Publico | null; red: string;
  refrescar: () => void; alSalir: () => void; alCopas: () => void; copando: boolean;
  /** ¿Hay una Pantalla conectada? (con ella se juega en pantalla externa). */
  pantalla?: PresenciaPantalla;
}

export function Lobby({ sala, miembros, yo, soyAnfitrion, final, red, refrescar, alSalir, alCopas, copando, pantalla = "desconocida" }: PropsLobby) {
  const ancho = useAncho();
  const p = preparados(miembros);
  // Vida automática de TU figura (etapa 3): solo este aparato la decide y la manda a la sala; las demás llegan por la red.
  useVidaPropia({ activo: true, jugador: yo, figura: miembros.find(m => m.id === yo)?.figura ?? null, contexto: "lobby" });
  const hayAdmin = miembros.some(m => m.anfitrion);
  // Modo Local: un solo teléfono; el anfitrión agrega personajes sin cuenta y les cambia la figura.
  const local = esLocal(sala.id);
  const [editar, setEditar] = useState<{ tipo: "nuevo" } | { tipo: "figura"; m: Miembro } | null>(null);
  const [verResultados, setVerResultados] = useState(true);
  // En celulares (sin pantalla), los demás ven en vivo lo que el anfitrión va armando.
  const vivo = useConfigEnVivo(!soyAnfitrion && !local ? sala.id : undefined, pantalla !== "presente");
  const [vivoMin, setVivoMin] = useState(false);


  const listo = (m: Miembro) => {
    if (m.id === yo) void enlace.marcarListo(sala, !m.listo).then(refrescar);
    else void enlace.listoDe(sala, m.id, !m.listo).then(ok => { if (!ok) aviso("Falta activar esto en el servidor (038)."); refrescar(); });
  };
  const expulsar = async (m: Miembro) => {
    if (!(await confirmar({ titulo: `¿Sacar a ${m.nombre} del lobby?`, si: "Sacar", peligro: true, ...(LOBBY_NUEVO ? { lobby: colorDe(m.id, miembros.map(x => x.id)) } : {}) }))) return;
    const ok = await enlace.expulsar(sala, m.id);
    if (!ok) aviso("Falta activar esto en el servidor (038).");
    refrescar();
  };

  const ico = (n: string) => `${import.meta.env.BASE_URL}arte/lobby/${n}.webp`;
  // Botones redondos del administrador sobre la cápsula de cada jugador (como X / Y de la referencia).
  const botonesAdmin = (m: Miembro) => soyAnfitrion && m.id !== yo ? (
    local ? <span className="lb-redondos">
      <button type="button" className="lb-redondo" onClick={() => setEditar({ tipo: "figura", m })} aria-label={`Cambiar la figura de ${m.nombre}`} title="Cambiar figura"><img src={ico("ico-cambiar-figura")} alt="" /></button>
      <button type="button" className="lb-redondo peligro" onClick={() => void expulsar(m)} aria-label={`Quitar a ${m.nombre}`} title="Quitar"><img src={ico("ico-sacar")} alt="" /></button>
    </span> :
    <span className="lb-redondos">
      <button type="button" className={"lb-redondo" + (m.listo ? " activo" : "")} onClick={() => listo(m)} aria-label={m.listo ? `Quitar el listo a ${m.nombre}` : `Dar listo por ${m.nombre}`} title={m.listo ? "Quitar listo" : "Dar listo"}><img src={ico("ico-dar-listo")} alt="" /></button>
      <button type="button" className="lb-redondo peligro" onClick={() => void expulsar(m)} aria-label={`Sacar a ${m.nombre} del lobby`} title="Sacar del lobby"><img src={ico("ico-sacar")} alt="" /></button>
    </span>
  ) : null;
  // Tu selector dentro de tu cápsula: figura y «¡Listo!». Al administrador, además, opciones a un lado y «Continuar»
  // cuando todos están listos.
  const miPanel = (m: Miembro) => m.id !== yo ? null : (
    <div className="lb-panel">
      {soyAnfitrion && p.todos ? (
        <>
          <button type="button" className="lb-continuar" onClick={() => ir("configurar", sala.codigo)}><span>Continuar</span><small>Todos listos: arma la partida</small></button>
          {/* Con «Continuar» a la vista el administrador también puede quitarse el listo (Elías, 25 nov). */}
          <button type="button" className="lb-mini lb-quitar-listo" onClick={() => listo(m)}>Ya no estoy listo</button>
        </>
      ) : (<>
        {local ? <button type="button" className="lb-mini" onClick={() => setEditar({ tipo: "figura", m })}>Cambiar figura</button>
          : <ElegirFigura uid={yo} alCambiar={refrescar} bloqueado={m.listo} />}
        <button type="button" className={"lb-listo" + (m.listo ? " quitar" : "")} onClick={() => listo(m)}>
          {!m.listo && <img src={ico("ico-listo")} alt="" />}{m.listo ? "Ya no estoy listo" : "¡Listo!"}
        </button>
      </>)}
      {soyAnfitrion && <OpcionesAdmin copando={copando} alCopas={alCopas} alCerrar={alSalir} />}
      <MenuGestos jugador={m.id} figura={m.figura} plegable className="lb-gestos" />
    </div>
  );

  // Local: «Agregar jugador» en el primer lugar libre (hasta 8).
  const libreLocal = local && soyAnfitrion ? (i: number) => (i === miembros.length && miembros.length < CUPO_LOBBY
    ? <button type="button" className="lb-agregar" onClick={() => setEditar({ tipo: "nuevo" })}><b><span>＋</span>Agregar jugador</b></button> : null) : undefined;
  const guardarPersonaje = (d: DatosPersonaje) => {
    if (editar?.tipo === "nuevo") { if (!modoLocal.agregar(sala, d)) aviso("No se pudo agregar (máximo 8)."); }
    else if (editar?.tipo === "figura") modoLocal.figura(sala, editar.m.id, d.figura);
    setEditar(null); refrescar();
  };

  return (
    <Marco clase={"az lb" + claseLobby} fondo={<FondoCuarto />}>
      <div className="lb-caja">
        <header className="lb-top">
          <button type="button" className={"pf-atras" + (soyAnfitrion ? " lb-atras-anf" : "")} onClick={alSalir}><span aria-hidden="true">◀</span>{local ? "Terminar" : soyAnfitrion ? "Cerrar" : "Salir"}</button>
          <div className={"lb-banner" + (p.todos ? " todos" : "")} role="status" aria-live="polite">
            <span className="lb-banner-n">{miembros.length}/{CUPO_LOBBY}</span>
            <span className="lb-banner-t">{p.todos ? "¡Todos listos!" : `${p.listos} listo${p.listos === 1 ? "" : "s"}`}</span>
            {local && <small className="lb-banner-s">Modo local · un solo teléfono</small>}
            {!soyAnfitrion && <small className="lb-banner-s">{!hayAdmin ? "Esperando al administrador" : p.todos ? "El administrador arma la partida" : "Elige tu figura y da ¡Listo!"}</small>}
          </div>
          <span className="lb-red">{red === "vivo" ? "" : red === "respaldo" ? "Reconectando…" : "Conectando…"}</span>
          {soyAnfitrion && !local && <BotonCast sala={sala} pantalla={pantalla} className="lb-cast" />}
        </header>

        {final && verResultados && (
          <section className="lb-resultados" aria-label="Resultados de la partida anterior">
            <div className="lb-res-tit"><b>Resultados · {nombreJuego(final.juegoId)}</b><button type="button" className="lb-mini" onClick={() => setVerResultados(false)}>Ocultar</button></div>
            <PodioJuego v={final} miembros={miembros} modo="celular" />
          </section>
        )}

        {ancho ? (
          <section className="lb-escenario" style={{ "--lugares": lugaresSala(miembros.length, local) } as CSSProperties}>
            <Pedestales miembros={miembros} yo={yo} className="lb-pedestales" fiesta={{ arriba: botonesAdmin, abajo: miPanel, escenarios: PRUEBA_ESCENARIOS, libre: libreLocal }} vida="lobby" />
          </section>
        ) : (
          <Carrusel lugares={lugaresSala(miembros.length, local)} ids={miembros.map(m => m.id)} yo={yo}>
            <Pedestales miembros={miembros} yo={yo} className="lb-pedestales" fiesta={{ arriba: botonesAdmin, abajo: miPanel, escenarios: PRUEBA_ESCENARIOS, libre: libreLocal }} vida="lobby" />
          </Carrusel>
        )}
      </div>
      {vivo && <div className={"cv-lobby" + (vivoMin ? " min" : "")} role="button" tabIndex={0} aria-expanded={!vivoMin} onClick={() => setVivoMin(x => !x)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setVivoMin(x => !x); }}><ConfigEnVivo e={vivo} /></div>}
      {editar && <PersonajeLocal titulo={editar.tipo === "nuevo" ? "Nuevo jugador" : `Figura de ${editar.m.nombre}`} soloFigura={editar.tipo === "figura"}
        inicial={editar.tipo === "figura" ? { figura: editar.m.figura, nombre: editar.m.nombre } : undefined}
        color={editar.tipo === "figura" ? colorDe(editar.m.id, miembros.map(x => x.id)) : undefined} alListo={guardarPersonaje} alCerrar={() => setEditar(null)} />}
    </Marco>
  );
}

/** Celular: las cabinas en fila, una por pantalla; arranca en la tuya y muestra puntos de posición. */
function Carrusel({ lugares, ids, yo, children }: { lugares: number; ids: string[]; yo: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [actual, setActual] = useState(Math.max(0, ids.indexOf(yo)));
  const mio = ids.indexOf(yo);
  useEffect(() => { const el = ref.current; if (el && mio >= 0) el.scrollLeft = mio * el.clientWidth; }, [mio]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const f = () => setActual(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", f, { passive: true });
    return () => el.removeEventListener("scroll", f);
  }, []);
  return (<>
    <section ref={ref} className="lb-escenario lb-carrusel" aria-label="Cabinas del lobby: desliza para ver a los demás">
      <div className="lb-pista" style={{ "--lugares": lugares } as CSSProperties}>{children}</div>
    </section>
    <div className="lb-puntos-cel" aria-hidden="true">{Array.from({ length: lugares }, (_, i) => <i key={i} className={i === actual ? "si" : ""} />)}</div>
  </>);
}

/** Opciones del administrador a un lado de su selector: finalizar la sesión con copas y cerrar el lobby (proyectar ya es el botón «cast» de arriba). */
function OpcionesAdmin({ copando, alCopas, alCerrar }: { copando: boolean; alCopas: () => void; alCerrar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className={"lb-opciones" + (abierto ? " abierto" : "")}>
      <button type="button" className="lb-opc-tab" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}>{abierto ? "Cerrar ›" : "‹ Opciones"}</button>
      {abierto && <div className="lb-opc-lista">
        <button type="button" className="lb-sec" disabled={copando} onClick={alCopas}>{copando ? "Entregando…" : "Finalizar sesión"}<small>Entrega las copas</small></button>
        <button type="button" className="lb-sec peligro" onClick={alCerrar}>Cerrar lobby</button>
      </div>}
    </div>
  );
}

/** Tus 3 figuras guardadas en carrusel con flechas: la elegida es con la que juegas (la misma que en Personalizar). */
function ElegirFigura({ uid, alCambiar, bloqueado }: { uid: string; alCambiar: () => void; bloqueado: boolean }) {
  const caps = useCapsulas(uid);
  const llenas = caps.slots.map((c, i) => ({ c, i })).filter(x => x.c);
  const pos = Math.max(0, llenas.findIndex(x => x.i === caps.activa));
  const elegir = (i: number) => {
    if (bloqueado || i === caps.activa || !caps.slots[i]) return;
    escribirCapsulas(uid, { ...leerCapsulas(uid), activa: i });
    void enlace.activarCapsula(i + 1).then(alCambiar);
  };
  const paso = (d: number) => { if (llenas.length > 1) elegir(llenas[(pos + d + llenas.length) % llenas.length]!.i); };
  if (!llenas.length) return <button type="button" className="lb-mini" onClick={() => ir("personalizar")}>Crear tu figura</button>;
  return (
    <div className={"lb-figs" + (bloqueado ? " bloqueado" : "")} role="group" aria-label="Elige tu figura">
      <small>Tu figura ({llenas.length}/{N_CAPSULAS})</small>
      <div className="lb-figs-fila">
        <button type="button" className="lb-flecha" onClick={() => paso(-1)} disabled={bloqueado || llenas.length < 2} aria-label="Figura anterior">‹</button>
        {caps.slots.map((c, i) => c && <Miniatura key={i} figura={c.figura} activa={caps.activa === i} nombre={apodoDe(c.figura) ?? (c.nombre || `Figura ${i + 1}`)} onClick={() => elegir(i)} bloqueado={bloqueado} />)}
        <button type="button" className="lb-flecha" onClick={() => paso(1)} disabled={bloqueado || llenas.length < 2} aria-label="Figura siguiente">›</button>
      </div>
    </div>
  );
}

function Miniatura({ figura, activa, nombre, onClick, bloqueado }: { figura: Parameters<typeof useFoto>[0]; activa: boolean; nombre: string; onClick: () => void; bloqueado: boolean }) {
  const foto = useFoto(figura, undefined, "busto");
  return (
    <button type="button" className={"lb-mini-fig" + (activa ? " activa" : "")} onClick={onClick} disabled={bloqueado && !activa} aria-pressed={activa} aria-label={activa ? `${nombre}, con la que juegas` : `Jugar con ${nombre}`}>
      {foto ? <img src={foto} alt="" draggable={false} /> : <span className="lb-cargando" />}
    </button>
  );
}
