// Lobby estilo fiesta (pedido de Elías del 2026-11-22, referencia LEGO Party): cada quien en su columna de color con su
// figura en el pedestal. El administrador (anfitrión) siempre es P1 rojo; los demás por orden de entrada y género.
// Cada jugador solo elige con cuál de sus 3 figuras juega y da «Listo». El administrador además puede sacar a alguien,
// dar listo por alguien y «Continuar» a la configuración de la partida. Fondo y botones del HUB «La Azotea».
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { escribirCapsulas, leerCapsulas, apodoDe, useCapsulas, useFoto, N_CAPSULAS } from "../../app/figura3d";
import { ir } from "../../app/rutas";
import { enlace, esLocal, modoLocal, type Miembro, type SalaV } from "../../servicios/enlace";
import { PersonajeLocal, type DatosPersonaje } from "./PersonajeLocal";
import { DatosAcceso, ElegirComoAgregar, EntrarCuenta } from "./AgregarEnAparato";
import { abrirEspejo, crearPersonajeRapido, entrarCuentaEnAparato, type Espejo, type PersonajeRapido } from "../../servicios/aparato";
import { hayNube } from "../../servicios/cliente";
import { colorDe, varsColor } from "../../app/colorJugador";
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
import { RuedaFigura, type MandoRueda } from "../gestos/RuedaFigura";
import { useVidaPropia } from "../../app/vidaPerfil";
import { Confeti, NumeroLetrero, useCelebracion } from "../LetreroVivo";

/** 053: la sala espejo de la nube de un lobby local (una sola vez aunque se pida dos veces). Null si no se pudo. */
const pidiendoEspejo = new Map<string, Promise<Espejo | null>>();
export function asegurarEspejo(sala: SalaV): Promise<Espejo | null> {
  const ya = modoLocal.espejo(sala);
  if (ya) return Promise.resolve(ya);
  if (!hayNube || !modoLocal.esCuenta(sala.anfitrionId)) return Promise.resolve(null);
  let p = pidiendoEspejo.get(sala.codigo);
  if (!p) {
    p = abrirEspejo().then(e => { if (e) modoLocal.fijarEspejo(sala, e); else pidiendoEspejo.delete(sala.codigo); return e; });
    pidiendoEspejo.set(sala.codigo, p);
  }
  return p;
}

/** 053: pasar del lobby en línea (o de la espera) al lobby de un solo aparato, con tu cuenta como P1. */
export function jugarEnEsteAparato(yo: { id: string; nombre: string; figura: Miembro["figura"] }) {
  const sl = modoLocal.abrir(yo);
  void asegurarEspejo(sl);
  ir("sala", sl.codigo);
}

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
  const fiesta = useCelebracion(miembros.length ? p.todos : null);
  // Vida automática de TU figura (etapa 3): solo este aparato la decide y la manda a la sala; las demás llegan por la red.
  useVidaPropia({ activo: true, jugador: yo, figura: miembros.find(m => m.id === yo)?.figura ?? null, contexto: "lobby" });
  // Tocar tu figura abre la rueda de gestos (reemplaza al botón «Gestos»; Elías, 26 nov).
  const rueda = useRef<MandoRueda>(null);
  const tocarFigura = (_m: Miembro, x: number, y: number) => rueda.current?.abrir(x, y);
  const hayAdmin = miembros.some(m => m.anfitrion);
  // Modo Local: un solo teléfono; el anfitrión agrega personajes sin cuenta y les cambia la figura.
  const local = esLocal(sala.id);
  const [editar, setEditar] = useState<{ tipo: "elegir" } | { tipo: "nuevo" } | { tipo: "rapido" } | { tipo: "cuenta" } | { tipo: "figura"; m: Miembro } | null>(null);
  // 053: personaje rápido recién creado (sus datos de acceso se ven una sola vez) y su estado mientras se crea.
  const [acceso, setAcceso] = useState<PersonajeRapido | null>(null);
  const [creando, setCreando] = useState(false), [errorRapido, setErrorRapido] = useState<string | null>(null);
  // La sala espejo se abre en cuanto el anfitrión entra a su lobby local, así también él gana sus puntos.
  useEffect(() => { if (local && soyAnfitrion) void asegurarEspejo(sala); }, [local, soyAnfitrion, sala]);
  const [verResultados, setVerResultados] = useState(true);
  // En línea: «Cambiar figura» abre tus figuras guardadas en un aviso de caja de bloques (igual que en Local, Elías 26 nov).
  const [verFiguras, setVerFiguras] = useState(false);
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
          <button type="button" className="lb-continuar" onClick={() => ir(local ? "configurar" : "modos", sala.codigo)}><span>Continuar</span><small>{local ? "Todos listos: arma la partida" : "Todos listos: elige el modo"}</small></button>
          {/* Con «Continuar» a la vista el administrador también puede quitarse el listo (Elías, 25 nov). */}
          <button type="button" className="lb-mini lb-quitar-listo" onClick={() => listo(m)}>Ya no estoy listo</button>
        </>
      ) : (<>
        {local ? <button type="button" className="lb-mini" onClick={() => setEditar({ tipo: "figura", m })}>Cambiar figura</button>
          : <button type="button" className="lb-mini" onClick={() => setVerFiguras(true)}>Cambiar figura</button>}
        <button type="button" className={"lb-listo" + (m.listo ? " quitar" : "")} onClick={() => listo(m)}>
          {!m.listo && <img src={ico("ico-listo")} alt="" />}{m.listo ? "Ya no estoy listo" : "¡Listo!"}
        </button>
      </>)}
      {soyAnfitrion && <OpcionesAdmin copando={copando} alCopas={alCopas} alCerrar={alSalir} />}
    </div>
  );

  // «Agregar jugador» en el primer lugar libre (hasta 8). En Local: con cuenta, cuenta existente o sin cuenta.
  // En línea (Elías, 27 nov): crea un personaje rápido que entra a esta sala. Si entra con su UsuarioN en su celular juega ahí;
  // si no, juega en el celular del anfitrión (se le pasa el turno).
  const agregaEnLinea = !local && soyAnfitrion && hayNube;
  const libreLocal = (local || agregaEnLinea) && soyAnfitrion ? (i: number) => (i === miembros.length && miembros.length < CUPO_LOBBY
    ? <button type="button" className="lb-agregar" onClick={() => setEditar(agregaEnLinea ? { tipo: "rapido" } : hayNube ? { tipo: "elegir" } : { tipo: "nuevo" })}><b><span>＋</span>Agregar jugador</b></button> : null) : undefined;
  const guardarPersonaje = (d: DatosPersonaje) => {
    if (editar?.tipo === "nuevo") { if (!modoLocal.agregar(sala, d)) aviso("No se pudo agregar (máximo 8)."); }
    else if (editar?.tipo === "figura") modoLocal.figura(sala, editar.m.id, d.figura);
    setEditar(null); refrescar();
  };
  const crearRapido = async (d: DatosPersonaje) => {
    if (creando) return;
    setCreando(true); setErrorRapido(null);
    // En línea la cuenta nueva entra directo a esta sala; en Local, a su sala espejo.
    const espejo = local ? await asegurarEspejo(sala) : { id: sala.id, codigo: sala.codigo };
    const r = espejo ? await crearPersonajeRapido(d.nombre, d.figura, espejo, true) : "No se pudo conectar con el servidor. Intenta otra vez o agrégalo sin cuenta.";
    setCreando(false);
    if (typeof r === "string") { setErrorRapido(r); return; }
    if (local && !modoLocal.agregarCuenta(sala, { id: r.id, nombre: d.nombre, figura: r.figura, cuenta: "rapida", genero: d.genero })) aviso("No se pudo agregar (máximo 8).");
    setEditar(null); setAcceso(r); refrescar();
  };
  const entrarConCuenta = async (usuario: string, clave: string): Promise<string | null> => {
    const espejo = await asegurarEspejo(sala);
    if (!espejo) return "No se pudo conectar con el servidor. Intenta otra vez.";
    // Su sesión se queda en esta pestaña mientras dura el lobby: así usa sus comodines en su turno (Maestro v1.72).
    const r = await entrarCuentaEnAparato(usuario, clave, espejo, miembros.map(m => m.id), true);
    if (typeof r === "string") return r;
    if (!modoLocal.agregarCuenta(sala, { ...r, cuenta: "registrada" })) return "El lobby está lleno (8).";
    setEditar(null); refrescar(); aviso(`${r.nombre} entró con su cuenta.`);
    return null;
  };

  return (
    <Marco clase={"az lb" + claseLobby} fondo={<FondoCuarto />}>
      <div className="lb-caja">
        <header className="lb-top">
          <button type="button" className={"pf-atras" + (soyAnfitrion ? " lb-atras-anf" : "")} onClick={alSalir}><span aria-hidden="true">◀</span>{local ? "Terminar" : soyAnfitrion ? "Cerrar" : "Salir"}</button>
          <div className={"lb-banner" + (p.todos ? " todos" : "") + (fiesta ? " mov-celebra" : "")} role="status" aria-live="polite">
            {/* El número late cuando entra o sale alguien (LetreroVivo, movimiento.css). */}
            <NumeroLetrero valor={miembros.length}>{miembros.length}/{CUPO_LOBBY}</NumeroLetrero>
            <span className="lb-banner-t">{p.todos ? "¡Todos listos!" : `${p.listos} listo${p.listos === 1 ? "" : "s"}`}</span>
            {local && <small className="lb-banner-s">Modo local · un solo teléfono</small>}
            {!soyAnfitrion && <small className="lb-banner-s">{!hayAdmin ? "Esperando al administrador" : p.todos ? "El administrador arma la partida" : "Elige tu figura y da ¡Listo!"}</small>}
          </div>
          {fiesta && <Confeti />}
          <span className="lb-red">{red === "vivo" ? "" : red === "respaldo" ? "Reconectando…" : "Conectando…"}</span>
          {soyAnfitrion && !local && <BotonCast sala={sala} pantalla={pantalla} className="lb-cast" />}
          {!local && <button type="button" className="lb-aparato" title="Todos juegan en este aparato y cada cuenta gana sus puntos"
            onClick={() => { const m = miembros.find(x => x.id === yo); jugarEnEsteAparato({ id: yo, nombre: m?.nombre ?? "Jugador", figura: m?.figura ?? null }); }}>Jugar en este aparato</button>}
        </header>

        {final && verResultados && (
          <section className="lb-resultados" aria-label="Resultados de la partida anterior">
            <div className="lb-res-tit"><b>Resultados · {nombreJuego(final.juegoId)}</b><button type="button" className="lb-mini" onClick={() => setVerResultados(false)}>Ocultar</button></div>
            <PodioJuego v={final} miembros={miembros} modo="celular" />
          </section>
        )}

        {ancho ? (
          <section className="lb-escenario" style={{ "--lugares": lugaresSala(miembros.length, local || agregaEnLinea) } as CSSProperties}>
            <Pedestales miembros={miembros} yo={yo} className="lb-pedestales" fiesta={{ arriba: botonesAdmin, abajo: miPanel, escenarios: PRUEBA_ESCENARIOS, libre: libreLocal, tocar: tocarFigura }} vida="lobby" />
          </section>
        ) : (
          <Carrusel lugares={lugaresSala(miembros.length, local || agregaEnLinea)} ids={miembros.map(m => m.id)} yo={yo}>
            <Pedestales miembros={miembros} yo={yo} className="lb-pedestales" fiesta={{ arriba: botonesAdmin, abajo: miPanel, escenarios: PRUEBA_ESCENARIOS, libre: libreLocal, tocar: tocarFigura }} vida="lobby" />
          </Carrusel>
        )}
      </div>
      <RuedaFigura ref={rueda} jugador={yo} figura={miembros.find(m => m.id === yo)?.figura} pistaSobre=".lb-rot.yo .lb-toca" />
      {vivo && <div className={"cv-lobby" + (vivoMin ? " min" : "")} role="button" tabIndex={0} aria-expanded={!vivoMin} onClick={() => setVivoMin(x => !x)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setVivoMin(x => !x); }}><ConfigEnVivo e={vivo} /></div>}
      {verFiguras && (
        <div className="a-velo" onClick={() => setVerFiguras(false)}>
          <div className="d-pnl a-dialogo lbn-dlg lb-figs-dlg" style={varsColor(colorDe(yo, miembros.map(x => x.id)))} role="dialog" aria-modal="true" aria-label="Tu figura" onClick={e => e.stopPropagation()}>
            <span className="dsp ol a-t2">Tu figura</span>
            <ElegirFigura uid={yo} alCambiar={refrescar} bloqueado={!!miembros.find(x => x.id === yo)?.listo} />
            <div className="a-fila">
              <button type="button" className="a-plano" onClick={() => ir("personalizar")}>Personalizar</button>
              <button type="button" className="d-btn k-yel" autoFocus onClick={() => setVerFiguras(false)}><span className="dsp">Cerrar</span></button>
            </div>
          </div>
        </div>
      )}
      {editar?.tipo === "elegir" && <ElegirComoAgregar conNube={hayNube && modoLocal.esCuenta(sala.anfitrionId)} alCerrar={() => setEditar(null)} alElegir={t => { setErrorRapido(null); setEditar(t === "sin-cuenta" ? { tipo: "nuevo" } : t === "rapido" ? { tipo: "rapido" } : { tipo: "cuenta" }); }} />}
      {editar?.tipo === "cuenta" && <EntrarCuenta alEntrar={entrarConCuenta} alCerrar={() => setEditar(null)} />}
      {editar?.tipo === "rapido" && <PersonajeLocal titulo="Personaje nuevo" rapido ocupado={creando} error={errorRapido} alListo={d => void crearRapido(d)} alCerrar={() => { if (!creando) setEditar(null); }} />}
      {acceso && <DatosAcceso p={acceso} enLinea={!local} alListo={() => setAcceso(null)} />}
      {editar && (editar.tipo === "nuevo" || editar.tipo === "figura") && <PersonajeLocal titulo={editar.tipo === "nuevo" ? "Nuevo jugador" : `Figura de ${editar.m.nombre}`} soloFigura={editar.tipo === "figura"}
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
