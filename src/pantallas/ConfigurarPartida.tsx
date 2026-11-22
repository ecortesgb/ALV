// Configurar partida (Maestro v1.44): lo hace solo el anfitrión, después de que todos dan «¡Listo!».
// Estilo menú de juego de fiesta: arriba el nombre de la sección, en medio las tarjetas para elegir y abajo «Siguiente».
// Secciones: tipo de partida → (armar equipos, si aplica) → juego → opciones o instrumento → escenario → resumen.
// En el resumen cada parte se toca para cambiarla (y se regresa al resumen); desde ahí se inicia.
// `ConfigurarPartida` recibe los miembros y devuelve la configuración; no habla con la base.
// `PaginaConfigurar` (#/configurar/código) la envuelve: arranca la partida en la sala y regresa a ella.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CONTENIDO } from "../content";
import { EJE_DE_MAZO, ESCENARIOS, JUEGOS, NIVELES_EJE } from "../content/catalogo";
import { ARTE_ESCENARIOS, ARTE_JUEGOS, ARTE_TIPOS, EMOJI_JUEGO } from "../content/arteJuegos";
import { INSTRUMENTOS, MODALIDADES, MODALIDADES_JUEGO, admite } from "../content/configurar";
import { GRUPOS_EQUIPOS, GRUPOS_SEXOS, JUEGOS_CON_TEMPORIZADOR, armarArranque, armarGrupos, conParejas, intensidadVieja } from "../engine/nucleo";
import { adultoPorEjes, cartasPermitidas } from "../engine/filtros";
import { maxImpostores } from "../engine/partida";
import type { DefinicionJuego, EscenarioId, Modalidad, OpcionesPartida } from "../engine/types";
import { Boton, Chip, Icono, Panel } from "../ds";
import { colorJugador, varsColor } from "../app/colorJugador";
import { bandosIniciales, intercambiar, parejasIniciales } from "../app/bandos";
import { generosSala, type Genero } from "../servicios/cuenta";
import { ir } from "../app/rutas";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import type { FiguraV2 } from "../content/personaje";
import { entregarCopas, iniciarPartida } from "../roles/pantalla/motor";
import { useSala } from "../roles/sala";
import { FILAS, Reglas, candado, colorDe, duracion, gente } from "./Catalogo";
import { SeccionIntensidad, ejesDeJuego, nivelMinimo, type ValorIntensidad } from "./Intensidad";
import { CartaEscenario, CartaJuego, CartaTipo, srcArte } from "./TarjetasConfig";
import { Marco, NombreJugador, Retrato, Vacio, aviso, confirmar } from "./comun";
import { FondoEscenario } from "./Fondos";
import "./configurar.css";

export interface MiembroConfig { id: string; nombre: string; figura?: FiguraV2 | null }

/** Lo que devuelve el configurador: con esto se llama a `iniciarPartida`. */
export interface PartidaConfigurada {
  juego: string;
  rondas: number;
  /** Temperatura, Voltaje y Drunk (Maestro v1.52). */
  ejes: ValorIntensidad;
  opciones: OpcionesPartida;
}

type Seccion = "tipo" | "grupos" | "juego" | "intensidad" | "opciones" | "escenario" | "resumen";

/** Nivel con que arranca el configurador (hasta que existan las reglas de la casa). */
export const EJES_INICIALES: ValorIntensidad = { temperatura: 1, voltaje: 1, drunk: false };

/** Candado del juego sin contar el nivel (el nivel se revisa en su sección). */
const candadoJuego = (j: DefinicionJuego, n: number) => candado(j, n, 4);

/** Si el juego pide más nivel del elegido (Dados HOT solo en Sobrecarga), la razón; si no, null. */
export function faltaNivel(juego: string, ejes: ValorIntensidad): string | null {
  const j = defJuego(juego);
  for (const eje of ejesDeJuego(juego)) {
    const min = nivelMinimo(juego, eje);
    if (ejes[eje] < min) return `${j?.nombre ?? "Este juego"} pide ${NIVELES_EJE[eje][min]}`;
  }
  return null;
}

/** Cuántas preguntas y retos hay para esta configuración (los mismos filtros del motor). */
export function cuentaCartas(miembros: { id: string; nombre: string }[], juego: string, rondas: number, opciones: OpcionesPartida) {
  const a = armarArranque(miembros, juego, rondas, 1, 1, opciones);
  const mazos = (defJuego(juego)?.mazo ?? "").split("+").filter(Boolean);
  if (!a || mazos.length === 0) return undefined;
  const de = (eje: string) => cartasPermitidas(a.cfg, CONTENIDO.cartas, mazos.filter(m => EJE_DE_MAZO[m] === eje)).length;
  return { preguntas: de("temperatura"), retos: de("voltaje") };
}

const defJuego = (id: string) => JUEGOS.find(j => j.id === id);
const esImpostor = (j?: DefinicionJuego) => j?.motor === "rol-secreto";

/** Por qué un tipo de partida no sirve con `n` jugadores (o null si sí). */
export function candadoTipo(tipo: Modalidad, n: number): string | null {
  const m = MODALIDADES.find(x => x.id === tipo)!;
  if (n < m.minimo) return `Mínimo ${m.minimo}`;
  if (m.par && n % 2 !== 0) return "Número par";
  return null;
}

/** Por qué el escenario no sirve con este juego (o null si sí). */
export function candadoEscenario(esc: EscenarioId | undefined, j?: DefinicionJuego): string | null {
  if (!esc || !j || j.lugares.length === 0) return null;
  const lugar = ESCENARIOS.find(e => e.id === esc)?.lugar;
  return lugar && !j.lugares.includes(lugar) ? "No en este lugar" : null;
}

/** Temas que puede elegir El impostor (los de adulto, con Extremo o Sobrecarga). */
export function temasImpostor(adulto: boolean) {
  return CONTENIDO.temas.filter(t => t.escenario === null && (!t.adulto || adulto)).map(t => ({ id: t.id, nombre: t.nombre }));
}

/** Revisa la configuración completa. Devuelve la razón por la que no se puede iniciar, o null. */
export function motivoConfig(c: PartidaConfigurada, miembros: { id: string; nombre: string }[]): string | null {
  const j = defJuego(c.juego);
  if (!j) return "Elige un juego";
  const tipo = c.opciones.modalidad ?? "individual";
  if (!admite(c.juego, tipo)) return `${j.nombre} no se juega en ${MODALIDADES.find(m => m.id === tipo)!.nombre}`;
  const t = candadoTipo(tipo, miembros.length);
  if (t) return `${MODALIDADES.find(m => m.id === tipo)!.nombre}: ${t.toLowerCase()}`;
  if (!armarGrupos(conParejas(miembros), c.opciones)) return tipo === "sexos" ? "Falta decir de qué bando es cada quien" : "Revisa los equipos";
  const cj = candadoJuego(j, miembros.length);
  if (cj) return `${j.nombre}: ${cj.toLowerCase()}`;
  const cn = faltaNivel(c.juego, c.ejes);
  if (cn) return cn;
  const ce = candadoEscenario(c.opciones.escenario, j);
  if (ce) return `${j.nombre} no se juega en ${ESCENARIOS.find(e => e.id === c.opciones.escenario)?.nombre ?? "ese escenario"}`;
  return null;
}

/** Juegos que ya se jugaron en este aparato (para proponer «Cómo jugar» solo la primera vez). */
const CLAVE_JUGADOS = "alv-juegos-jugados";
function jugados(): string[] { try { return JSON.parse(localStorage.getItem(CLAVE_JUGADOS) ?? "[]") as string[]; } catch { return []; } }
export const yaJugado = (juego: string) => jugados().includes(juego);
function marcarJugado(juego: string) { try { localStorage.setItem(CLAVE_JUGADOS, JSON.stringify([...new Set([...jugados(), juego])].slice(-40))); } catch { /* sin almacenamiento: se vuelve a proponer */ } }

const EMOJI_TEMA: Record<string, string> = { fut: "⚽", fam: "⭐", pel: "🎬", com: "🌮", ani: "🦁", hot: "🔥" };

/** Equipos por orden de llegada: A, B, A, B… */
const repartir = (ids: string[], cuantos: number) => Object.fromEntries(ids.map((id, i) => [id, GRUPOS_EQUIPOS[i % cuantos]!.id]));

/** Ilustración de un juego (o rayos con su emoji si todavía no tiene). */
function ArteJuego({ id, className = "" }: { id: string; className?: string }) {
  const arte = ARTE_JUEGOS[id];
  return arte ? <img className={className} src={srcArte(arte)} alt="" draggable={false} />
    : <span className={"cfg-sinarte " + className} style={{ "--tc": colorDe(id) } as CSSProperties}><span aria-hidden="true">{EMOJI_JUEGO[id] ?? "🎲"}</span></span>;
}

export function ConfigurarPartida({ miembros, alIniciar, alCancelar, iniciando, inicial, alEntregarCopas, alFondo, generos }: {
  miembros: MiembroConfig[];
  /** Género de cada quien (para ALVersus). undefined mientras se lee; sin nube, {}. */
  generos?: Record<string, Genero>;
  /** «Terminar la noche»: entrega las copas de todos los juegos jugados (solo el anfitrión). */
  alEntregarCopas?: () => void;
  /** Fondo de la página: en la sección «Escenario» el del escenario elegido (null = Ciudad ALV); fuera de ella, undefined. */
  alFondo?: (escenario: EscenarioId | null | undefined) => void;
  alIniciar: (c: PartidaConfigurada) => void;
  alCancelar?: () => void;
  iniciando?: boolean;
  /** Para «Otra partida»: arranca con lo de la vez pasada (y abre directo en el resumen). */
  inicial?: PartidaConfigurada;
}) {
  const n = miembros.length;
  const ids = useMemo(() => miembros.map(m => m.id), [miembros]);
  const [sec, setSec] = useState<Seccion>(inicial ? "resumen" : "tipo");
  // Si se entró a una sección desde el resumen, «Listo» regresa al resumen.
  const [desdeResumen, setDesdeResumen] = useState(false);
  const cuerpo = useRef<HTMLDivElement>(null);
  useEffect(() => { cuerpo.current?.scrollTo({ top: 0 }); }, [sec]);
  const [tipo, setTipo] = useState<Modalidad>(inicial?.opciones.modalidad ?? "individual");
  const [cuantosEquipos, setCuantosEquipos] = useState(2);
  const [grupos, setGrupos] = useState<Record<string, string>>(inicial?.opciones.grupos ?? {});
  const [juego, setJuego] = useState(inicial?.juego ?? "impostor");
  const [ejes, setEjes] = useState<ValorIntensidad>(inicial?.ejes ?? EJES_INICIALES);
  const adulto = adultoPorEjes(ejes);
  const [rondas, setRondas] = useState(inicial?.rondas ?? 8);
  const [instrumento, setInstrumento] = useState<string | undefined>(undefined);
  const [impostores, setImpostores] = useState(inicial?.opciones.impostor?.cantidad ?? 1);
  const [tema, setTema] = useState<string | null>(inicial?.opciones.impostor?.tema ?? null);
  const [escenario, setEscenario] = useState<EscenarioId | undefined>(inicial?.opciones.escenario);
  const [filtro, setFiltro] = useState("todos");
  // En la sección «Escenario» la página toma el fondo del escenario elegido.
  useEffect(() => { alFondo?.(sec === "escenario" ? escenario ?? null : undefined); }, [sec, escenario, alFondo]);
  // Temporizador por turno (herramienta opcional, 6A.11 C6). null: sin tiempo.
  const [temporizador, setTemporizador] = useState<number | null>(inicial?.opciones.temporizador ?? null);
  const conTemporizador = JUEGOS_CON_TEMPORIZADOR.includes(juego);
  const [verReglas, setVerReglas] = useState(false);
  // «Cómo jugar»: se propone explicar si en este aparato nunca se ha jugado ese juego; el anfitrión puede omitirlo.
  const [explicar, setExplicar] = useState<boolean | null>(null);
  const explicarFinal = explicar ?? !yaJugado(juego);
  const j = defJuego(juego);
  const instrumentos = INSTRUMENTOS[juego] ?? [];
  const inst = instrumentos.find(i => i.id === instrumento) ?? instrumentos[0];
  const maxImp = maxImpostores(n);
  const conGrupos = tipo === "equipos" || tipo === "sexos" || tipo === "parejas";
  // Parejas: la primera persona tocada espera a la segunda para intercambiarlas.
  const [tocado, setTocado] = useState<string | null>(null);

  // Al cambiar de tipo, grupos de arranque (el anfitrión los puede cambiar antes de iniciar): equipos alternados;
  // parejas por orden de llegada; ALVersus según el género de cada quien («Prefiero no decirlo» al bando con menos gente).
  useEffect(() => {
    if (tipo === "equipos") setGrupos(g => (ids.every(id => GRUPOS_EQUIPOS.some(x => x.id === g[id])) ? g : repartir(ids, cuantosEquipos)));
    if (tipo === "parejas") setGrupos(g => parejasIniciales(ids, g));
    if (tipo === "sexos" && generos) setGrupos(g => bandosIniciales(ids, generos, g));
    setTocado(null);
  }, [tipo, ids, generos]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (impostores > maxImp) setImpostores(maxImp); }, [maxImp, impostores]);
  // Si el juego elegido no admite el tipo de partida, se cambia por el primero que sí (y vuelve a «Todos»).
  useEffect(() => {
    if (admite(juego, tipo)) return;
    const otro = FILAS.flatMap(f => f.juegos).find(id => admite(id, tipo));
    if (otro) { setJuego(otro); setInstrumento(undefined); setExplicar(null); }
    setFiltro("todos");
  }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  const opciones: OpcionesPartida = {
    modalidad: tipo,
    ...(conGrupos ? { grupos: Object.fromEntries(ids.filter(id => grupos[id]).map(id => [id, grupos[id]!])) } : {}),
    ...(escenario ? { escenario } : {}),
    ...(inst?.turno ? { turno: inst.turno } : {}),
    ...(inst?.herramienta ? { herramienta: inst.herramienta } : {}),
    ...(esImpostor(j) ? { impostor: { cantidad: Math.min(impostores, maxImp), tema } } : {}),
    ...(explicarFinal ? { explicar: true } : {}),
    ...(temporizador && conTemporizador ? { temporizador } : {}),
    ejes,
  };
  const config: PartidaConfigurada = { juego, rondas, ejes, opciones };
  const cuenta = useMemo(() => cuentaCartas(miembros, juego, rondas, opciones), [miembros, juego, rondas, JSON.stringify(opciones)]); // eslint-disable-line react-hooks/exhaustive-deps
  const motivo = motivoConfig(config, miembros);
  const gruposOk = !!armarGrupos(conParejas(miembros), opciones);

  const orden: Seccion[] = ["tipo", ...(conGrupos ? ["grupos" as const] : []), "juego", "intensidad", "opciones", "escenario", "resumen"];
  const k = orden.indexOf(sec);
  const falta = (s: Seccion): string | null => {
    if (s === "tipo") return candadoTipo(tipo, n);
    if (s === "grupos") return gruposOk ? null : tipo === "sexos" ? (generos ? "Toca Ellas o Ellos en cada quien" : "Acomodando bandos…") : tipo === "parejas" ? "Cada pareja necesita dos" : "Cada equipo necesita gente";
    if (s === "juego") return j ? candadoJuego(j, n) : "Elige un juego";
    if (s === "intensidad") return faltaNivel(juego, ejes);
    if (s === "escenario") return candadoEscenario(escenario, j);
    return null;
  };
  const siguiente = () => {
    // Desde el resumen se regresa al resumen, salvo que el tipo nuevo pida armar equipos antes.
    if (desdeResumen && !(sec === "tipo" && conGrupos)) { setDesdeResumen(false); setSec("resumen"); return; }
    setSec(orden[Math.min(orden.length - 1, k + 1)]!);
  };
  const atras = () => {
    if (desdeResumen) { setDesdeResumen(false); setSec("resumen"); return; }
    if (k <= 0) alCancelar?.(); else setSec(orden[k - 1]!);
  };
  const editar = (s: Seccion) => { setDesdeResumen(true); setSec(s); };
  const color = (id: string) => colorJugador(ids.indexOf(id));

  const TITULO: Record<Seccion, string> = {
    tipo: "Tipo de partida", grupos: tipo === "sexos" ? "Ellas y ellos" : tipo === "parejas" ? "Arma las parejas" : "Arma los equipos", juego: "Elige el juego",
    intensidad: "Intensidad", opciones: esImpostor(j) ? "Opciones del juego" : "Herramienta", escenario: "Escenario", resumen: "¡Todo listo!",
  };

  let contenido: ReactNode;
  if (sec === "tipo") {
    contenido = (
      <div className="cfg-tipos" role="radiogroup" aria-label="Tipo de partida">
        {MODALIDADES.map((m, i) => <CartaTipo key={m.id} id={m.id} indice={i} nombre={m.nombre} texto={m.gana} elegida={tipo === m.id} bloqueada={candadoTipo(m.id, n)} onClick={() => setTipo(m.id)} />)}
      </div>
    );
  } else if (sec === "grupos" && tipo === "parejas") {
    const parejas = [...new Set(ids.map(id => grupos[id]).filter((g): g is string => !!g))].sort((x, y) => Number(x.slice(1)) - Number(y.slice(1)));
    const tocar = (id: string) => {
      if (!tocado) { setTocado(id); return; }
      if (tocado !== id) setGrupos(g => intercambiar(g, tocado, id));
      setTocado(null);
    };
    contenido = (
      <Panel className="a-pila cfg-ancho">
        <span className="a-kick">{tocado ? `Ahora toca a quien cambia de lugar con ${miembros.find(m => m.id === tocado)?.nombre ?? ""}` : "Toca a dos personas para cambiarlas de pareja"}</span>
        <div className="cp-equipos" style={{ "--cols": 2 } as CSSProperties}>
          {parejas.map((g, x) => (
            <div key={g} className="cp-equipo"><span className="dsp ol">Pareja {x + 1}</span>
              {miembros.filter(m => grupos[m.id] === g).map(m => (
                <button key={m.id} type="button" className={"cp-mover" + (tocado === m.id ? " on" : "")} aria-pressed={tocado === m.id} onClick={() => tocar(m.id)}>
                  <Persona m={m} c={color(m.id)} />
                </button>
              ))}
            </div>
          ))}
        </div>
      </Panel>
    );
  } else if (sec === "grupos") {
    contenido = tipo === "equipos" ? (
      <Panel className="a-pila cfg-ancho">
        <div className="a-entre"><span className="a-kick">Toca a alguien para cambiarlo de equipo</span>
          <div className="a-fila">{[2, 3, 4].filter(x => x <= Math.floor(n / 2)).map(x => <Chip key={x} texto={`${x} equipos`} seleccionado={cuantosEquipos === x} onClick={() => { setCuantosEquipos(x); setGrupos(repartir(ids, x)); }} />)}</div>
        </div>
        <div className="cp-equipos" style={{ "--cols": cuantosEquipos } as CSSProperties}>
          {GRUPOS_EQUIPOS.slice(0, cuantosEquipos).map((g, x) => (
            <div key={g.id} className="cp-equipo"><span className="dsp ol">{g.nombre}</span>
              {miembros.filter(m => grupos[m.id] === g.id).map(m => (
                <button key={m.id} type="button" className="cp-mover" onClick={() => setGrupos(z => ({ ...z, [m.id]: GRUPOS_EQUIPOS[(x + 1) % cuantosEquipos]!.id }))} aria-label={`Pasar a ${m.nombre} al ${GRUPOS_EQUIPOS[(x + 1) % cuantosEquipos]!.nombre}`}>
                  <Persona m={m} c={color(m.id)} />
                </button>
              ))}
            </div>
          ))}
        </div>
      </Panel>
    ) : (
      <Panel className="a-pila cfg-ancho"><span className="a-kick">¿De qué bando es cada quien?</span>
        <p className="a-suave cp-nota">Ya los acomodamos según su registro; quien prefirió no decirlo va al bando con menos gente. Toca para cambiar.</p>
        <ul className="cp-bandos">{miembros.map(m => (
          <li key={m.id}><Persona m={m} c={color(m.id)} />
            <div className="a-fila">{GRUPOS_SEXOS.map(g => <Chip key={g.id} texto={g.nombre} seleccionado={grupos[m.id] === g.id} onClick={() => setGrupos(z => ({ ...z, [m.id]: g.id }))} />)}</div>
          </li>
        ))}</ul>
      </Panel>
    );
  } else if (sec === "juego") {
    // Solo los juegos que admiten la modalidad elegida (Maestro 6A.12).
    const lista = (filtro === "todos" ? FILAS.flatMap(f => f.juegos) : FILAS.find(f => f.id === filtro)?.juegos ?? []).filter(id => admite(id, tipo));
    contenido = (
      <div className="cfg-juego">
        {j && (
          <section className="cfg-destacado" key={j.id} aria-label={`Elegido: ${j.nombre}`} style={{ "--tc": colorDe(j.id) } as CSSProperties}>
            <ArteJuego id={j.id} className="cfg-destacado-arte" />
            <div className="cfg-destacado-info">
              <span className="cfg-etq dsp">Juego:</span>
              <span className="dsp ol cfg-destacado-nombre">{j.nombre}</span>
              <div className="a-fila a-envuelve"><span className="cfg-pastilla"><Icono id="users" />{gente(j)}</span><span className="cfg-pastilla"><Icono id="clock" />{duracion(j)}</span>{j.sigla && <span className="cfg-pastilla dsp">{j.sigla}</span>}</div>
              <p className="cfg-desc">{j.descripcion}</p>
              <button type="button" className="a-plano cfg-reglas-btn" onClick={() => setVerReglas(v => !v)}>{verReglas ? "Ocultar reglas" : "Ver reglas"}</button>
              {verReglas && <Reglas id={j.id} />}
            </div>
          </section>
        )}
        <div className="tc-filtros" role="tablist" aria-label="Categorías">
          {[{ id: "todos", nombre: "Todos", color: "var(--amarillo)", juegos: Object.keys(MODALIDADES_JUEGO) }, ...FILAS].filter(f => f.juegos.some(id => admite(id, tipo))).map(f => (
            <button key={f.id} type="button" role="tab" aria-selected={filtro === f.id} className={"tc-filtro" + (filtro === f.id ? " on" : "")} style={{ "--f": f.color } as CSSProperties} onClick={() => setFiltro(f.id)}>{f.nombre}</button>
          ))}
        </div>
        <div className="cfg-carrusel" key={filtro}>
          {lista.map((id, x) => {
            const d = defJuego(id);
            if (!d) return null;
            return <CartaJuego key={id} id={id} nombre={d.nombre} sigla={d.sigla ?? "ALV"} color={colorDe(id)} jugadores={gente(d)} duracion={duracion(d)} indice={x}
              elegida={juego === id} bloqueada={candadoJuego(d, n)} onClick={() => { setJuego(id); setInstrumento(undefined); setExplicar(null); }} />;
          })}
        </div>
      </div>
    );
  } else if (sec === "intensidad") {
    contenido = <SeccionIntensidad juego={juego} valor={ejes} alCambiar={setEjes} cuenta={cuenta} />;
  } else if (sec === "opciones") {
    contenido = (
      <div className="cfg-opciones">
        <div className="cfg-opciones-arte" style={{ "--tc": colorDe(juego) } as CSSProperties}>
          <ArteJuego id={juego} className="cfg-opciones-img" />
          <span className="cfg-cinta dsp ol">{j?.nombre}</span>
        </div>
        <div className="a-pila cfg-opciones-lado">
          {esImpostor(j) ? <>
            <section className="a-pila"><span className="cfg-sub dsp ol">¿Cuántos impostores?</span>
              <div className="a-fila a-envuelve">{[1, 2, 3].map(x => (
                <button key={x} type="button" className={"cp-num dsp ol" + (impostores === x ? " on" : "")} aria-pressed={impostores === x} disabled={x > maxImp} onClick={() => setImpostores(x)}>{x}</button>
              ))}</div>
              <p className="a-nota">{maxImp < 3 ? `Con ${n} jugadores caben hasta ${maxImp}: siempre hay más civiles que impostores.` : "Siempre hay más civiles que impostores."}</p>
            </section>
            <section className="a-pila"><span className="cfg-sub dsp ol">Categoría de las palabras</span>
              <div className="cfg-temas">
                {[{ id: null as string | null, nombre: "Al azar", ico: "🎲" }, { id: "escenario", nombre: "Del escenario", ico: "🏝️" }, ...temasImpostor(adulto).map(t => ({ ...t, ico: EMOJI_TEMA[t.id] ?? "🎭" }))].map(t => (
                  <button key={t.id ?? "azar"} type="button" className={"cfg-tema" + (tema === t.id ? " on" : "")} aria-pressed={tema === t.id} onClick={() => setTema(t.id)}><span aria-hidden="true">{t.ico}</span>{t.nombre}</button>
                ))}
              </div>
            </section>
            <p className="a-nota">Se juega por vueltas hasta atrapar a todos los impostores, o hasta que ellos igualen a los civiles.</p>
            {conTemporizador && <section className="a-pila"><span className="cfg-sub dsp ol">⏱ Temporizador</span>
              <div className="a-fila a-envuelve">{[null, 20, 30, 60, 90].map(x => (
                <button key={x ?? 0} type="button" className={"cfg-tiempo" + (temporizador === x ? " on" : "")} aria-pressed={temporizador === x} onClick={() => setTemporizador(x)}>{x ? `${x} s` : "Sin tiempo"}</button>
              ))}</div>
              <p className="a-nota">{temporizador ? `Cada turno dura ${temporizador} s; si se acaba, el turno pasa al siguiente.` : "Sin tiempo por turno: si alguien tarda, el anfitrión decide esperar o seguir."}</p>
            </section>}
          </> : <>
            <section className="a-pila"><span className="cfg-sub dsp ol">¿Con qué se juega?</span>
              <div className="cfg-temas grandes">
                {instrumentos.map(x => (
                  <button key={x.id} type="button" className={"cfg-tema" + (inst?.id === x.id ? " on" : "")} aria-pressed={inst?.id === x.id} onClick={() => setInstrumento(x.id)}>
                    <span aria-hidden="true">{x.emoji ?? (x.id === "ruleta" ? "🎡" : x.id === "reloj-arena" ? "⏳" : x.id === "dados" ? "🎲" : x.id === "botella" ? "🍾" : "🃏")}</span>
                    <span><b className="dsp">{x.nombre}</b><small>{x.detalle}</small></span>
                  </button>
                ))}
              </div>
            </section>
            {conTemporizador && <section className="a-pila"><span className="cfg-sub dsp ol">⏱ Temporizador</span>
              <div className="a-fila a-envuelve">{[null, 20, 30, 60, 90].map(x => (
                <button key={x ?? 0} type="button" className={"cfg-tiempo" + (temporizador === x ? " on" : "")} aria-pressed={temporizador === x} onClick={() => setTemporizador(x)}>{x ? `${x} s` : "Sin tiempo"}</button>
              ))}</div>
              <p className="a-nota">{temporizador ? `Cada turno dura ${temporizador} s; si se acaba, el turno pasa al siguiente.` : "Sin tiempo por turno: si alguien tarda, el anfitrión decide esperar o seguir."}</p>
            </section>}
            <section className="a-pila"><span className="cfg-sub dsp ol">Rondas</span><div className="a-fila a-envuelve">{[5, 8, 12].map(x => (
              <button key={x} type="button" className={"cp-num dsp ol" + (rondas === x ? " on" : "")} aria-pressed={rondas === x} onClick={() => setRondas(x)}>{x}</button>
            ))}</div></section>
          </>}
        </div>
      </div>
    );
  } else if (sec === "escenario") {
    contenido = (
      <div className="cfg-escs">
        <CartaEscenario id="ciudad" nombre="Ciudad ALV" texto="Sin escenario: cartas de cualquier lugar." emoji="🌃" color="#5fb4ff" elegida={!escenario} onClick={() => setEscenario(undefined)} />
        {ESCENARIOS.filter(e => e.activo && (!e.adulto || adulto)).map(e => (
          <CartaEscenario key={e.id} id={e.id} nombre={e.nombre} texto={e.ambientacion} emoji={e.emoji} color={e.color} elegida={escenario === e.id} bloqueada={candadoEscenario(e.id, j)} onClick={() => setEscenario(e.id)} />
        ))}
      </div>
    );
  } else {
    const m = MODALIDADES.find(x => x.id === tipo)!;
    const esc = ESCENARIOS.find(e => e.id === escenario);
    contenido = (
      <div className="cfg-resumen">
        <div className="cfg-tablero">
          <span className="cfg-tachas" aria-hidden="true" />
          <Casilla titulo="Tipo" valor={m.nombre} detalle={conGrupos ? (gruposOk ? "Equipos listos" : "Falta armar equipos") : m.gana} img={srcArte(ARTE_TIPOS[tipo])} alTocar={() => editar("tipo")} />
          <Casilla titulo="Juego" valor={j?.nombre ?? "—"} detalle={j ? `${gente(j)} jugadores` : undefined} arte={<ArteJuego id={juego} />} alTocar={() => editar("juego")} ancha />
          <Casilla titulo="Nivel" valor={ejesDeJuego(juego).map(x => NIVELES_EJE[x][ejes[x]]).join(" · ") || "Sin nivel"}
            detalle={(ejes.drunk ? "Drunk encendido" : "Drunk apagado") + (cuenta && ejesDeJuego(juego).length ? ` · ${[ejesDeJuego(juego).includes("temperatura") ? `${cuenta.preguntas} preguntas` : "", ejesDeJuego(juego).includes("voltaje") ? `${cuenta.retos} retos` : ""].filter(Boolean).join(" y ")}` : "")}
            emoji={ejes.temperatura === 3 || ejes.voltaje === 3 ? "🔥" : ejes.drunk ? "🍹" : "🌡️"} alTocar={() => editar("intensidad")} />
          <Casilla titulo={esImpostor(j) ? "Opciones" : "Herramienta"} valor={esImpostor(j) ? `${Math.min(impostores, maxImp)} ${Math.min(impostores, maxImp) === 1 ? "impostor" : "impostores"}` : inst?.nombre ?? "—"}
            detalle={esImpostor(j) ? (tema === null ? "Palabras al azar" : tema === "escenario" ? "Palabras del escenario" : temasImpostor(adulto).find(t => t.id === tema)?.nombre ?? "") + (temporizador && conTemporizador ? ` · ⏱ ${temporizador} s` : "") : `${rondas} rondas${temporizador && conTemporizador ? ` · ⏱ ${temporizador} s` : ""}`}
            emoji={esImpostor(j) ? "🕵️" : "🃏"} alTocar={() => editar("opciones")} />
          <Casilla titulo="Escenario" valor={esc ? esc.nombre : "Ciudad ALV"} detalle={esc ? esc.ambientacion : "Sin escenario"} img={ARTE_ESCENARIOS[escenario ?? "ciudad"] ? srcArte(ARTE_ESCENARIOS[escenario ?? "ciudad"]!) : undefined} emoji={esc?.emoji} alTocar={() => editar("escenario")} />
          <div className="cfg-casilla cfg-reglas">
            <span className="cfg-casilla-t dsp">Cómo jugar</span>
            <div className="cfg-reglas-opc" role="radiogroup" aria-label="Explicar las reglas">
              <button type="button" role="radio" aria-checked={explicarFinal} className={explicarFinal ? "on" : ""} onClick={() => setExplicar(true)}><span aria-hidden="true">📖</span>Explicar</button>
              <button type="button" role="radio" aria-checked={!explicarFinal} className={!explicarFinal ? "on" : ""} onClick={() => setExplicar(false)}><span aria-hidden="true">⏩</span>Omitir</button>
            </div>
            <small>{yaJugado(juego) ? "Ya lo jugaron en este aparato." : "Primera vez con este juego: se recomienda explicar."}</small>
          </div>
          <div className="cfg-casilla cfg-gente">
            <span className="cfg-casilla-t dsp">{n} jugadores</span>
            <ul className="cp-jugadores" aria-label="Jugadores">{miembros.map(x => <li key={x.id}><Persona m={x} c={color(x.id)} /></li>)}</ul>
          </div>
        </div>
        {motivo && <p className="a-error" role="alert">{motivo}</p>}
      </div>
    );
  }

  return (
    <div className="cfg">
      <header className="cfg-cab">
        <button type="button" className="cfg-volver" onClick={atras} aria-label={desdeResumen ? "Volver al resumen" : k <= 0 ? "Cancelar" : "Atrás"}><Icono id="back" /></button>
        <h2 className="cfg-titulo dsp ol" key={sec}>{TITULO[sec]}</h2>
        {alEntregarCopas && sec === "tipo" && <button type="button" className="cfg-copas" onClick={alEntregarCopas}><span aria-hidden="true">🏆</span> Entregar copas</button>}
        <ol className="cfg-avance" aria-hidden="true">{orden.map((s, x) => <li key={s} className={x === k ? "on" : x < k ? "hecho" : ""} />)}</ol>
      </header>
      <div className="cfg-cuerpo" ref={cuerpo} key={sec}>{contenido}</div>
      <footer className="cfg-pie">
        {sec === "tipo" && <p className="cfg-pie-info" aria-live="polite"><b className="dsp">{MODALIDADES.find(x => x.id === tipo)!.nombre}:</b> {MODALIDADES.find(x => x.id === tipo)!.gana}</p>}
        {sec === "resumen"
          ? <Boton color="amarillo" principal texto="¡Iniciar!" sub={motivo ?? `${j?.nombre ?? ""} · ${n} jugadores`} icono="play" desactivado={!!motivo} cargando={iniciando} onClick={() => { marcarJugado(juego); alIniciar(config); }} />
          : <Boton color={desdeResumen ? "verde" : "azul"} texto={desdeResumen && !(sec === "tipo" && conGrupos) ? "Listo" : "Siguiente"} sub={falta(sec) ?? undefined} icono="chev" desactivado={!!falta(sec)} onClick={siguiente} />}
      </footer>
    </div>
  );
}

/** Una casilla del resumen: se toca para cambiar esa parte. */
function Casilla({ titulo, valor, detalle, img, arte, emoji, ancha, alTocar }: { titulo: string; valor: string; detalle?: string; img?: string; arte?: ReactNode; emoji?: string; ancha?: boolean; alTocar: () => void }) {
  return (
    <button type="button" className={"cfg-casilla" + (ancha ? " ancha" : "")} onClick={alTocar} aria-label={`${titulo}: ${valor}. Cambiar`}>
      <span className="cfg-casilla-t dsp">{titulo}</span>
      <span className="cfg-casilla-img">{img ? <img src={img} alt="" draggable={false} /> : arte ?? <span className="cfg-casilla-emoji" aria-hidden="true">{emoji ?? "✨"}</span>}</span>
      <b className="dsp ol">{valor}</b>
      {detalle && <small>{detalle}</small>}
      <span className="cfg-cambiar"><Icono id="gear" />Cambiar</span>
    </button>
  );
}

/** Ficha chica de un jugador con su color: P1, retrato y nombre. */
function Persona({ m, c }: { m: MiembroConfig; c: ReturnType<typeof colorJugador> }) {
  return (
    <span className="cp-persona" style={varsColor(c)}>
      <span className="cp-pn dsp">{c.etiqueta}</span>
      <Retrato id={m.id} figura={m.figura} nombre={m.nombre} size={32} />
      <NombreJugador nombre={m.nombre} figura={m.figura} clase="" />
    </span>
  );
}

/**
 * #/configurar/código: el anfitrión configura y arranca la partida de su sala; al iniciar vuelve a la sala.
 * Los demás ven que el anfitrión está configurando. Si ya hay una partida en curso, regresa a la sala.
 */
export function PaginaConfigurar({ codigo }: { codigo: string }) {
  const ses = useSesion();
  const s = useSala(codigo, ses.uid);
  const [iniciando, setIniciando] = useState(false);
  const [fondoEsc, setFondoEsc] = useState<EscenarioId | null | undefined>(undefined);
  const soyAnfitrion = !!s.sala && s.sala.anfitrionId === ses.uid;
  const [generos, setGeneros] = useState<Record<string, Genero> | undefined>(undefined);
  const salaId = s.sala?.id, cuantos = s.miembros.length;
  // Se vuelve a leer si entra o sale alguien (para ALVersus).
  useEffect(() => { if (salaId && soyAnfitrion) void generosSala(salaId).then(setGeneros); }, [salaId, soyAnfitrion, cuantos]);
  const enCurso = !!s.partida && !s.partida.terminada;
  useEffect(() => { if (enCurso && !iniciando) ir("sala", codigo); }, [enCurso, iniciando, codigo]);
  if (s.error) return <Marco clase="a-centro"><Vacio titulo="No se pudo abrir" texto={s.error}><Boton color="amarillo" texto="Volver" icono="back" onClick={() => ir("jugar")} /></Vacio></Marco>;
  if (!s.sala) return <Marco clase="a-centro"><p className="a-suave a-pulso" role="status">Abriendo la sala {codigo}…</p></Marco>;
  const sala = s.sala;
  const iniciar = async (c: PartidaConfigurada) => {
    setIniciando(true);
    const ok = await iniciarPartida(sala, s.miembros, c.juego, c.rondas, intensidadVieja(c.ejes), c.opciones);
    setIniciando(false);
    if (!ok) { aviso("No se pudo iniciar. Intenta otra vez."); return; }
    sonar("exito");
    ir("sala", codigo);
  };
  // Fin de la noche: se suman todos los juegos terminados y la ceremonia sale en la Pantalla y en cada celular.
  const copas = async () => {
    if (!(await confirmar({ titulo: "¿Entregar las copas?", texto: "Se suman los puntos de todos los juegos de la noche y se anuncian los ganadores.", si: "Entregar copas" }))) return;
    setIniciando(true);
    const ok = await entregarCopas(sala, s.miembros);
    setIniciando(false);
    if (!ok) { aviso("No se pudieron entregar las copas. Intenta otra vez."); return; }
    sonar("exito");
    ir("sala", codigo);
  };
  return (
    <Marco clase="cfg-pagina" fondo={fondoEsc !== undefined ? <FondoEscenario escenario={fondoEsc} /> : undefined}>
      {soyAnfitrion
        ? <ConfigurarPartida miembros={s.miembros} generos={generos} iniciando={iniciando} alIniciar={c => void iniciar(c)} alCancelar={() => ir("sala", codigo)} alEntregarCopas={() => void copas()} alFondo={setFondoEsc} />
        : <Vacio titulo="El anfitrión está configurando" texto="En cuanto toque «Iniciar», empieza la partida."><Boton color="amarillo" texto="Volver a la sala" icono="back" onClick={() => ir("sala", codigo)} /></Vacio>}
    </Marco>
  );
}
