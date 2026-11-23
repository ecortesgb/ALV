// Ranking «salón de campeones» (ALV_PLAN_RANKING_LOGROS.md v2, etapa 1; Maestro v1.54, 14.3).
// Mismo lenguaje que el HUB «La Azotea» y el Perfil: fondo de la azotea por hora, Atrás, recursos, vidrio oscuro.
// Datos: ranking_jugadores y ranking_grupos (040). Los Puntos ALV los calcula el servidor.
// Trofeos, medallas y podio son imágenes de Elías (public/arte/ui/ranking/*.webp); mientras no llegan se usa el icono
// de puntos del HUB y el podio va sin ilustración. Posiciones, nombres y números son interfaz.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { apodoDe, semillaDe, useFoto } from "../../app/figura3d";
import { atras } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { tituloPorNivel } from "../../engine/economia";
import { CATEGORIAS, RECORDS, VOTOS, fijarOcultarBebidas, leerOcultarBebidas, records, salonDeLaFama, type FilaSalon, type Record_, misGrupos, nombrarGrupo, rankingReconocimientos, type CategoriaVoto, type FilaVoto, type MiGrupo, fijarRankingGlobal, leerRankingGlobal, ordenarPor, rankingGrupos, rankingJugadores, cargarMisPuntos,
  type Categoria, type FilaGrupo, type FilaJugador, type FiltroRanking } from "../../servicios/ranking";
import { hayNube } from "../../servicios/cliente";
import { Marco, aviso, useAncho } from "../comun";
import { useRecursos } from "../Recursos";
import { RecursosAzotea, arteHub } from "../azotea/Cabecera";
import { FondoSeccion, type OpcionFondo } from "../FondoSeccion";
import { useMomentoAzotea } from "../azotea/HubAzotea";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import { Torneos } from "./Torneos";
import "./ranking.css";

const BASE = import.meta.env.BASE_URL;
const num = (n: number) => Math.max(0, Math.round(n)).toLocaleString("es-MX");
const MES = () => new Date().toLocaleDateString("es-MX", { month: "long", timeZone: "America/Mexico_City" });

type Pestana = "general" | "individual" | "parejas" | "equipos" | "torneos" | "records" | "salon";
const PESTANAS: { id: Pestana; titulo: string; pronto?: string }[] = [
  { id: "general", titulo: "General" }, { id: "individual", titulo: "Individual" }, { id: "parejas", titulo: "Parejas" },
  { id: "equipos", titulo: "Equipos" }, { id: "torneos", titulo: "Torneos" }, { id: "records", titulo: "Récords" }, { id: "salon", titulo: "Salón de la Fama" },
];

// Arte de Elías con respaldo: si la imagen no existe, se usa la otra (o nada).
const faltan = new Set<string>();
// Fondo de ceremonia (Elías, 2026-11-23). PRUEBA: ?fondo=publico muestra la versión con público.
const FONDOS_RANKING: OpcionFondo[] = [
  { clave: "ceremonia", archivo: "rk-ceremonia", foco: "50% 40%" },
  { clave: "publico", archivo: "rk-ceremonia-publico", foco: "50% 35%" },
];

export function Arte({ nombre, alterno, className = "" }: { nombre: string; alterno?: string; className?: string }) {
  const [falta, setFalta] = useState(() => faltan.has(nombre));
  if (falta && !alterno) return null;
  return <img className={className} src={falta ? alterno : `${BASE}arte/ui/ranking/${nombre}.webp`} alt="" draggable={false}
    onError={() => { if (!falta) { faltan.add(nombre); setFalta(true); } }} />;
}
export const MEDALLA = ["medalla-oro", "medalla-plata", "medalla-bronce"] as const;

// Flechas de subida o bajada: comparan con la última vez que se abrió esta vista en el aparato.
const claveVista = (uid: string, v: string) => `alv-ranking-${uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)}-${v}`;
function leerPrevias(clave: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(clave) ?? "{}") as Record<string, number>; } catch { return {}; }
}
function guardarPrevias(clave: string, pos: Record<string, number>) { try { localStorage.setItem(clave, JSON.stringify(pos)); } catch { /* sin almacenamiento */ } }

export function Ranking() {
  const s = useSesion();
  const r = useRecursos();
  const ancho = useAncho();
  const momento = useMomentoAzotea();
  const [pestana, setPestana] = useState<Pestana>("general");
  const [filtro, setFiltro] = useState<FiltroRanking>("amigos");
  const [temporada, setTemporada] = useState(true);
  const [cat, setCat] = useState<Categoria>("puntos");
  const [voto, setVoto] = useState<CategoriaVoto | null>(null);
  const [jugadores, setJugadores] = useState<FilaJugador[] | null | undefined>(undefined);
  const [grupos, setGrupos] = useState<FilaGrupo[] | null | undefined>(undefined);
  const [enGlobal, setEnGlobal] = useState<boolean | null>(null);

  useEffect(() => { void leerRankingGlobal().then(setEnGlobal); }, [s.uid]);
  useEffect(() => {
    if (pestana !== "general" && pestana !== "individual") return;
    let vivo = true; setJugadores(undefined);
    void rankingJugadores(filtro, temporada).then(f => { if (vivo) setJugadores(f); });
    return () => { vivo = false; };
  }, [pestana === "general" || pestana === "individual", filtro, temporada]);
  useEffect(() => {
    if (pestana !== "parejas" && pestana !== "equipos") return;
    let vivo = true; setGrupos(undefined);
    void rankingGrupos(pestana, filtro, temporada).then(f => { if (vivo) setGrupos(f); });
    return () => { vivo = false; };
  }, [pestana, filtro, temporada]);
  useEffect(() => { void cargarMisPuntos(); }, []);

  const alternarGlobal = async () => {
    const nuevo = !(enGlobal ?? true);
    if (await fijarRankingGlobal(nuevo)) { setEnGlobal(nuevo); aviso(nuevo ? "Ya apareces en el ranking Global." : "Ya no apareces en el Global. Tus amigos te siguen viendo."); }
    else aviso("No se pudo cambiar. Intenta de nuevo.");
  };

  const etiquetaTemporada = temporada ? `Temporada de ${MES()}` : "Histórico";
  return (
    <Marco clase={`az pf rk m-${momento}`} fondo={<FondoSeccion opciones={FONDOS_RANKING} velo={.5} />}>
      <div className="rk-caja">
        <header className="pf-top rk-top">
          <button type="button" className="pf-atras" onClick={atras}><span aria-hidden="true">◀</span>Atrás</button>
          <RecursosAzotea monedas={r.monedas} puntos={r.puntos} />
        </header>

        <h1 className="rk-titulo"><span>Salón de campeones</span></h1>

        <nav className="rk-pestanas" aria-label="Secciones del ranking">
          {PESTANAS.map(p => (
            <button key={p.id} type="button" className={"rk-pest" + (pestana === p.id ? " si" : "") + (p.pronto ? " pronto" : "")}
              aria-pressed={pestana === p.id} onClick={() => setPestana(p.id)}>
              <Arte nombre={`tab-${p.id}`} className="rk-pest-ico" />
              <span>{p.titulo}</span>
              {p.pronto && <small>{p.pronto}</small>}
            </button>
          ))}
        </nav>

        {!PESTANAS.find(p => p.id === pestana)!.pronto && pestana !== "torneos" && pestana !== "salon" && (
          <div className="rk-filtros">
            <div className="rk-seg" role="group" aria-label="Con quién comparar">
              <button type="button" className={filtro === "amigos" ? "si" : ""} aria-pressed={filtro === "amigos"} onClick={() => setFiltro("amigos")}>Amigos Legendarios Verdaderos</button>
              <button type="button" className={filtro === "global" ? "si" : ""} aria-pressed={filtro === "global"} onClick={() => setFiltro("global")}>Global</button>
            </div>
            {pestana !== "records" && <div className="rk-seg" role="group" aria-label="Periodo">
              <button type="button" className={temporada ? "si" : ""} aria-pressed={temporada} onClick={() => setTemporada(true)}>Temporada</button>
              <button type="button" className={!temporada ? "si" : ""} aria-pressed={!temporada} onClick={() => setTemporada(false)}>Histórico</button>
            </div>}
          </div>
        )}

        {pestana === "individual" && (
          <div className="rk-cats rk-votos" role="group" aria-label="Reconocimientos de los amigos">
            {VOTOS.map(v => <button key={v.id} type="button" className={voto === v.id ? "si" : ""} aria-pressed={voto === v.id} onClick={() => setVoto(x => (x === v.id ? null : v.id))}>{v.emoji} {v.titulo}</button>)}
          </div>
        )}
        {pestana === "individual" && voto && <Reconocimientos categoria={voto} filtro={filtro} temporada={temporada} yo={s.uid} etiqueta={etiquetaTemporada} />}
        {(pestana === "general" || (pestana === "individual" && !voto)) && (
          <Jugadores filas={jugadores} cat={pestana === "general" ? "puntos" : cat} conCategorias={pestana === "individual"} alCat={c => { setCat(c); setVoto(null); }}
            yo={s.uid} vista={`${pestana}-${pestana === "general" ? "puntos" : cat}-${filtro}-${temporada ? "t" : "h"}`} etiqueta={etiquetaTemporada} ancho={ancho} />
        )}
        {(pestana === "parejas" || pestana === "equipos") && <><Grupos filas={grupos} modalidad={pestana} yo={s.uid} etiqueta={etiquetaTemporada} />
          <MisGrupos modalidad={pestana} alGuardar={() => void rankingGrupos(pestana, filtro, temporada).then(setGrupos)} /></>}
        {pestana === "torneos" && (
          <Torneos yo={s.uid} admin={s.admin || !hayNube} />
        )}
        {pestana === "records" && <Records filtro={filtro} yo={s.uid} />}
        {pestana === "salon" && <Salon />}

        {filtro === "global" && enGlobal !== null && !PESTANAS.find(p => p.id === pestana)!.pronto && pestana !== "torneos" && pestana !== "salon" && (
          <p className="rk-privacidad">
            {enGlobal ? "Apareces en el ranking Global." : "No apareces en el Global; solo te ven tus Amigos Legendarios Verdaderos."}
            <button type="button" onClick={() => void alternarGlobal()}>{enGlobal ? "Ocultarme" : "Aparecer"}</button>
          </p>
        )}
      </div>
    </Marco>
  );
}


/** Ranking individual: podio con los tres primeros y la tabla. */
function Jugadores({ filas, cat, conCategorias, alCat, yo, vista, etiqueta, ancho }: {
  filas: FilaJugador[] | null | undefined; cat: Categoria; conCategorias: boolean; alCat: (c: Categoria) => void;
  yo: string; vista: string; etiqueta: string; ancho: boolean;
}) {
  const orden = useMemo(() => (filas ? ordenarPor(filas, cat) : []), [filas, cat]);
  const def = CATEGORIAS.find(c => c.id === cat)!;
  const clave = claveVista(yo, vista);
  const [previas] = useState(() => leerPrevias(clave));
  useEffect(() => { if (orden.length) guardarPrevias(clave, Object.fromEntries(orden.map(f => [f.id, f.lugar]))); }, [orden, clave]);

  const conValor = orden.filter(f => f.valor > 0);
  const mia = orden.find(f => f.id === yo);
  const visibles = orden.slice(0, ancho ? 20 : 15);
  const miaFuera = mia && !visibles.some(f => f.id === yo);

  return (
    <>
      {conCategorias && (
        <div className="rk-cats" role="group" aria-label="Categoría">
          {CATEGORIAS.map(c => <button key={c.id} type="button" className={c.id === cat ? "si" : ""} aria-pressed={c.id === cat} onClick={() => alCat(c.id)}>{c.titulo}</button>)}
        </div>
      )}
      {filas === undefined ? <p className="rk-cargando" role="status">Leyendo el ranking…</p>
        : filas === null ? <p className="rk-cargando" role="status">No se pudo leer el ranking. Revisa tu conexión.</p>
        : !conValor.length ? (
          <section className="pf-bloque rk-vacio"><p className="pf-suave">Todavía nadie suma en «{def.titulo}» ({etiqueta.toLowerCase()}). El primer lugar está libre: termina una partida.</p></section>
        ) : (
          <>
            <Podio filas={conValor.slice(0, 3)} unidad={def.unidad} yo={yo} />
            <section className="pf-bloque rk-tabla-caja" aria-label={`${def.titulo}, ${etiqueta}`}>
              <h2 className="pf-tit"><span>{def.titulo}</span><small className="rk-periodo">{etiqueta}</small></h2>
              <ol className="rk-tabla">
                {visibles.map(f => <Fila key={f.id} f={f} unidad={def.unidad} yo={yo} antes={previas[f.id]} />)}
                {miaFuera && <><li className="rk-salto" aria-hidden="true">···</li><Fila f={mia} unidad={def.unidad} yo={yo} antes={previas[mia.id]} /></>}
              </ol>
            </section>
          </>
        )}
    </>
  );
}

function Retrato({ f, grande }: { f: Pick<FilaJugador, "id" | "figura">; grande?: boolean }) {
  const url = useFoto(f.figura, f.figura ? undefined : semillaDe(f.id), grande ? "cuerpo" : "busto");
  return <span className={grande ? "rk-cuerpo" : "rk-retrato"}>{url ? <img src={url} alt="" draggable={false} /> : <span className="rk-sin-foto" />}</span>;
}

export function Podio({ filas, unidad, yo }: { filas: (FilaJugador & { lugar: number; valor: number })[]; unidad: string; yo: string }) {
  // Orden visual: 2.º, 1.º, 3.º
  const lugares = [filas[1], filas[0], filas[2]];
  return (
    <section className="rk-podio" aria-label="Podio">
      <Arte nombre="podio" className="rk-podio-img" />
      {lugares.map((f, i) => {
        const puesto = i === 1 ? 1 : i === 0 ? 2 : 3;
        if (!f) return <span key={i} className={`rk-escalon p${puesto} vacio`} />;
        return (
          <div key={f.id} className={`rk-escalon p${puesto}` + (f.id === yo ? " yo" : "")} style={{ "--i": i } as CSSProperties}>
            {puesto === 1 && <span className="rk-rayos" aria-hidden="true" />}
            <Retrato f={f} grande />
            <div className="rk-placa">
              <Arte nombre={MEDALLA[f.lugar - 1] ?? "medalla-bronce"} alterno={arteHub("puntos")} className="rk-medalla" />
              <b>{apodoDe(f.figura) ?? f.nombre}</b>
              <small>{num(f.valor)} {unidad}</small>
            </div>
          </div>
        );
      })}
    </section>
  );
}

export function Fila({ f, unidad, yo, antes }: { f: FilaJugador & { lugar: number; valor: number }; unidad: string; yo: string; antes?: number }) {
  const cambio = antes == null ? 0 : antes - f.lugar;
  const apodo = apodoDe(f.figura);
  return (
    <li className={"rk-fila" + (f.id === yo ? " yo" : "") + (f.lugar <= 3 && f.valor > 0 ? ` top${f.lugar}` : "")}>
      <span className="rk-pos">{f.lugar <= 3 && f.valor > 0 ? <Arte nombre={MEDALLA[f.lugar - 1]!} alterno={arteHub("puntos")} className="rk-medalla-chica" /> : null}<b>{f.lugar}</b></span>
      <span className={"rk-marco" + (f.rareza_titulo ? ` r-${f.rareza_titulo}` : "")}><Retrato f={f} /></span>
      <span className="rk-nombre">
        <b>{apodo ?? f.nombre}{f.id === yo && <em>Tú</em>}</b>
        <small>{apodo ? `@${f.nombre} · ` : ""}Niv. {f.nivel} · {f.titulo ? <i className={`rk-tlogro r-${f.rareza_titulo ?? "comun"}`}>{f.titulo}</i> : tituloPorNivel(f.nivel)}</small>
      </span>
      {cambio !== 0 && <span className={"rk-cambio " + (cambio > 0 ? "sube" : "baja")} aria-label={cambio > 0 ? `Subió ${cambio}` : `Bajó ${-cambio}`}>
        <Arte nombre={cambio > 0 ? "flecha-sube" : "flecha-baja"} className="rk-flecha" /><span aria-hidden="true">{cambio > 0 ? "▲" : "▼"}{Math.abs(cambio)}</span>
      </span>}
      <span className="rk-valor"><b>{num(f.valor)}</b><small>{unidad}</small></span>
    </li>
  );
}

function Grupos({ filas, modalidad, yo, etiqueta }: { filas: FilaGrupo[] | null | undefined; modalidad: "parejas" | "equipos"; yo: string; etiqueta: string }) {
  if (filas === undefined) return <p className="rk-cargando" role="status">Leyendo el ranking…</p>;
  if (filas === null) return <p className="rk-cargando" role="status">No se pudo leer el ranking. Revisa tu conexión.</p>;
  const titulo = modalidad === "parejas" ? "Mejores parejas" : "Mejores equipos";
  if (!filas.length) return <section className="pf-bloque rk-vacio"><p className="pf-suave">Todavía no hay {modalidad} con partidas ({etiqueta.toLowerCase()}). Jueguen una partida {modalidad === "parejas" ? "en parejas" : "por equipos"} para estrenar esta tabla.</p></section>;
  return (
    <section className="pf-bloque rk-tabla-caja" aria-label={`${titulo}, ${etiqueta}`}>
      <h2 className="pf-tit"><span>{titulo}</span><small className="rk-periodo">{etiqueta}</small></h2>
      <ol className="rk-tabla">
        {filas.map(g => (
          <li key={g.integrantes.join("+")} className={"rk-fila grupo" + (g.integrantes.includes(yo) ? " yo" : "") + (g.posicion <= 3 ? ` top${g.posicion}` : "")}>
            <span className="rk-pos">{g.posicion <= 3 ? <Arte nombre={MEDALLA[g.posicion - 1]!} alterno={arteHub("puntos")} className="rk-medalla-chica" /> : null}<b>{g.posicion}</b></span>
            {g.emoji ? <span className="rk-emoji" style={{ borderColor: g.color ?? undefined }} aria-hidden="true">{g.emoji}</span> : null}
            <span className="rk-nombre">
              <b style={g.color ? { color: g.color } : undefined}>{g.nombre_grupo ?? g.nombres.join(" + ")}</b>
              {g.nombre_grupo && <small>{g.nombres.join(" + ")}</small>}
              <small>{g.victorias} {g.victorias === 1 ? "victoria" : "victorias"} · {g.partidas} {g.partidas === 1 ? "partida" : "partidas"} · {g.porcentaje}%{g.racha > 1 ? ` · racha de ${g.racha}` : ""}</small>
            </span>
            <span className="rk-valor"><b>{num(g.puntos_alv)}</b><small>PA</small></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Ranking por votos de la noche (043, D6). */
function Reconocimientos({ categoria, filtro, temporada, yo, etiqueta }: { categoria: CategoriaVoto; filtro: FiltroRanking; temporada: boolean; yo: string; etiqueta: string }) {
  const [filas, setFilas] = useState<FilaVoto[] | null | undefined>(undefined);
  useEffect(() => { let v = true; setFilas(undefined); void rankingReconocimientos(filtro, categoria, temporada).then(f => { if (v) setFilas(f); }); return () => { v = false; }; }, [categoria, filtro, temporada]);
  const def = VOTOS.find(v => v.id === categoria)!;
  if (filas === undefined) return <p className="rk-cargando" role="status">Contando votos…</p>;
  if (filas === null) return <p className="rk-cargando" role="status">No se pudo leer. Revisa tu conexión.</p>;
  if (!filas.length) return <section className="pf-bloque rk-vacio"><p className="pf-suave">Todavía nadie recibe votos de «{def.titulo}». Se vota al final de cada noche, en la pestaña Torneos.</p></section>;
  const conLugar = filas.map(f => ({ ...f, lugar: f.posicion, valor: f.votos, puntos_alv: 0, victorias: 0, partidas: 0, mvp: 0, racha: 0, juegos: 0, victorias_azar: 0, victorias_deduccion: 0 }));
  return (
    <section className="pf-bloque rk-tabla-caja" aria-label={`${def.titulo}, ${etiqueta}`}>
      <h2 className="pf-tit"><span>{def.emoji} {def.titulo}</span><small className="rk-periodo">{etiqueta}</small></h2>
      <ol className="rk-tabla">{conLugar.map(f => <Fila key={f.id} f={f} unidad={f.votos === 1 ? "voto" : "votos"} yo={yo} />)}</ol>
    </section>
  );
}

const COLORES = ["#ff3b6b", "#ffc21a", "#2ee6d6", "#4f8dff", "#a35cff", "#7ff7a0", "#ff8a1f", "#ffffff"];
const EMOJIS = ["👑", "🔥", "⚡", "🦁", "🐍", "🦄", "💀", "🎯", "🍕", "🚀", "🌮", "🎉"];

/** Ponle nombre, color y emoji a tus parejas y equipos (043, D4). */
function MisGrupos({ modalidad, alGuardar }: { modalidad: "parejas" | "equipos"; alGuardar: () => void }) {
  const [lista, setLista] = useState<MiGrupo[] | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [nombre, setNombre] = useState(""); const [color, setColor] = useState(COLORES[0]!); const [emoji, setEmoji] = useState(EMOJIS[0]!);
  useEffect(() => { void misGrupos().then(setLista); }, []);
  const mios = (lista ?? []).filter(g => g.modalidad === modalidad);
  if (!mios.length) return null;
  const abrir = (g: MiGrupo) => { setEditando(g.grupo); setNombre(g.nombre ?? ""); setColor(g.color ?? COLORES[0]!); setEmoji(g.emoji ?? EMOJIS[0]!); };
  const guardar = async (g: MiGrupo) => {
    const error = await nombrarGrupo(g.grupo, nombre.trim(), color, emoji);
    if (error) { aviso(error); return; }
    aviso("Guardado."); setEditando(null); void misGrupos().then(setLista); alGuardar();
  };
  return (
    <section className="pf-bloque rk-misgrupos" aria-label={`Tus ${modalidad}`}>
      <h2 className="pf-tit"><span>Tus {modalidad}</span></h2>
      <ul className="rk-misgrupos-lista">
        {mios.map(g => (
          <li key={g.grupo}>
            {editando === g.grupo ? (
              <div className="rk-grupo-editor">
                <input value={nombre} maxLength={30} onChange={e => setNombre(e.target.value)} placeholder="Nombre" aria-label="Nombre" />
                <div className="rk-paleta" role="group" aria-label="Color">{COLORES.map(c => <button key={c} type="button" className={c === color ? "si" : ""} style={{ background: c }} aria-label={c} onClick={() => setColor(c)} />)}</div>
                <div className="rk-paleta emojis" role="group" aria-label="Emoji">{EMOJIS.map(e => <button key={e} type="button" className={e === emoji ? "si" : ""} onClick={() => setEmoji(e)}>{e}</button>)}</div>
                <div className="rk-nuevo-acciones"><button type="button" className="rk-cancelar" onClick={() => setEditando(null)}>Cancelar</button>
                  <button type="button" className="rk-abrir" disabled={nombre.trim().length < 2} onClick={() => void guardar(g)}>Guardar</button></div>
              </div>
            ) : (
              <button type="button" className="rk-migrupo" onClick={() => abrir(g)}>
                <span className="rk-emoji" style={{ borderColor: g.color ?? undefined }} aria-hidden="true">{g.emoji ?? "＋"}</span>
                <span className="rk-nombre"><b style={g.color ? { color: g.color } : undefined}>{g.nombre ?? "Sin nombre"}</b><small>{g.integrantes.join(" + ")} · {g.partidas} partidas</small></span>
                <span className="rk-editar">✎</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Récords históricos (044). El fiestero solo cuenta partidas con Drunk y nunca da puntos ni XP (D7). */
function Records({ filtro, yo }: { filtro: FiltroRanking; yo: string }) {
  const [lista, setLista] = useState<Record_[] | null | undefined>(undefined);
  const [oculto, setOculto] = useState<boolean | null>(null);
  const cargar = () => records(filtro).then(setLista);
  useEffect(() => { setLista(undefined); void cargar(); }, [filtro]);
  useEffect(() => { void leerOcultarBebidas().then(setOculto); }, []);
  const alternar = async () => {
    const nuevo = !oculto;
    if (await fijarOcultarBebidas(nuevo)) { setOculto(nuevo); aviso(nuevo ? "Tu estadística de bebidas ya no se muestra." : "Tu estadística de bebidas se vuelve a mostrar."); void cargar(); }
    else aviso("No se pudo cambiar.");
  };
  if (lista === undefined) return <p className="rk-cargando" role="status">Buscando récords…</p>;
  if (lista === null) return <p className="rk-cargando" role="status">No se pudieron leer los récords.</p>;
  return (
    <>
      <ul className="rk-records">
        {RECORDS.map((d, i) => {
          const r = lista.find(x => x.clave === d.clave);
          return (
            <li key={d.clave} className={"rk-record" + (r?.id === yo ? " yo" : "") + (r ? "" : " libre")} style={{ "--i": i } as CSSProperties}>
              <span className="rk-record-emoji" aria-hidden="true">{d.emoji}</span>
              <b className="rk-record-tit">{d.titulo}</b>
              <small className="rk-record-txt">{d.texto}</small>
              {r ? <span className="rk-record-quien"><Retrato f={r} /><span><b>{r.nombre}{r.id === yo && <em>Tú</em>}</b><small>{num(r.valor)} {d.unidad}</small></span></span>
                : <span className="rk-record-quien vacio">Nadie todavía. ¡Es tuyo si lo quieres!</span>}
              {r && r.id !== yo && r.mio > 0 && <small className="rk-record-mio">Tú: {num(r.mio)}</small>}
            </li>
          );
        })}
      </ul>
      {oculto !== null && <p className="rk-privacidad">{oculto ? "Tu estadística de bebidas está oculta." : "Tu estadística de bebidas se muestra en «El fiestero»."}
        <button type="button" onClick={() => void alternar()}>{oculto ? "Mostrarla" : "Ocultarla"}</button></p>}
    </>
  );
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesTexto = (e: string) => { const [a, m] = e.split("-"); return `${MESES[Number(m) - 1] ?? ""} ${a}`; };

/** Salón de la Fama (044): fotos fijas de campeones de temporada, parejas, equipos y torneos. */
function Salon() {
  const [lista, setLista] = useState<FilaSalon[] | null | undefined>(undefined);
  useEffect(() => { void salonDeLaFama().then(setLista); }, []);
  if (lista === undefined) return <p className="rk-cargando" role="status">Abriendo el Salón de la Fama…</p>;
  if (lista === null) return <p className="rk-cargando" role="status">No se pudo leer el Salón de la Fama.</p>;
  if (!lista.length) return <section className="pf-bloque rk-vacio"><p className="pf-suave">El Salón de la Fama se llena al cerrar cada mes y cada torneo. El primer campeón de temporada se corona el día 1 del próximo mes.</p></section>;
  const meses = [...new Set(lista.filter(x => x.tipo !== "torneo").map(x => x.etiqueta))];
  const torneos = lista.filter(x => x.tipo === "torneo");
  return (
    <>
      {meses.map(m => {
        const xs = lista.filter(x => x.etiqueta === m && x.tipo !== "torneo");
        const podio = xs.filter(x => x.tipo === "temporada");
        const grupos = xs.filter(x => x.tipo !== "temporada");
        return (
          <section key={m} className="pf-bloque rk-salon" aria-label={`Temporada de ${mesTexto(m)}`}>
            <h2 className="pf-tit"><span>Temporada de {mesTexto(m)}</span></h2>
            {podio.length > 0 && <Podio filas={podio.map((x, i) => ({ posicion: x.posicion, lugar: x.posicion, valor: x.valor, id: `${m}-${i}`, nombre: x.nombres[0] ?? "", nivel: 1, figura: x.figura,
              puntos_alv: x.valor, victorias: 0, partidas: 0, mvp: 0, racha: 0, juegos: 0, victorias_azar: 0, victorias_deduccion: 0 }))} unidad="PA" yo="" />}
            {grupos.length > 0 && <ul className="rk-salon-grupos">{grupos.map((g, i) => (
              <li key={i}><span aria-hidden="true">{g.tipo === "pareja" ? "💞" : "🛡️"}</span><b>{g.tipo === "pareja" ? "Mejor pareja" : "Mejor equipo"}</b><small>{g.nombres.join(" + ")} · {num(g.valor)} PA</small></li>
            ))}</ul>}
          </section>
        );
      })}
      {torneos.length > 0 && (
        <section className="pf-bloque rk-salon" aria-label="Campeones de torneos">
          <h2 className="pf-tit"><span>Campeones de torneos</span></h2>
          <ul className="rk-salon-grupos">{torneos.map((t, i) => (
            <li key={i}><span aria-hidden="true">🏆</span><b>{t.etiqueta}</b><small>{t.nombres.join(", ")} · {num(t.valor)} PA</small></li>
          ))}</ul>
        </section>
      )}
    </>
  );
}
