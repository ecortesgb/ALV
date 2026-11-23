// Logros «vitrina de colección» (ALV_PLAN_RANKING_LOGROS.md v2, etapa 1; Maestro v1.54, 14.3).
// Mismo lenguaje que el HUB «La Azotea» y el Perfil, con otro diseño que el Ranking: repisas, insignias y avance.
// Datos: mi_progreso_logros (042). Los logros no dan XP (D0): la recompensa es la insignia.
// Insignias y dibujos son imágenes de Elías (public/arte/ui/logros/*.webp); mientras no llegan, el icono de Logros del HUB.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { atras } from "../../app/rutas";
import { refrescarSesion, useSesion } from "../../app/sesion";
import { JUEGOS } from "../../content/catalogo";
import { ORDEN_RAREZA, RAREZA_TEXTO } from "../../content/logros";
import { destacarLogro, miProgresoLogros, misObjetivos, reclamarObjetivo, usarTitulo, type FilaLogro, type Objetivo } from "../../servicios/logros";
import { Marco, aviso } from "../comun";
import { useRecursos } from "../Recursos";
import { RecursosAzotea, arteHub } from "../azotea/Cabecera";
import { FondoSeccion, type OpcionFondo } from "../FondoSeccion";
import { useMomentoAzotea } from "../azotea/HubAzotea";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "./logros.css";

const BASE = import.meta.env.BASE_URL;
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });

type Pestana = "coleccion" | "ocultos" | "minijuego" | "colectivos" | "objetivos" | "recompensas";
const PESTANAS: { id: Pestana; titulo: string; pronto?: boolean }[] = [
  { id: "coleccion", titulo: "Mi colección" }, { id: "ocultos", titulo: "Ocultos" }, { id: "minijuego", titulo: "Por minijuego" },
  { id: "colectivos", titulo: "Colectivos" }, { id: "objetivos", titulo: "Objetivos" }, { id: "recompensas", titulo: "Recompensas" },
];

const faltan = new Set<string>();
function Arte({ nombre, alterno, className = "" }: { nombre: string; alterno?: string; className?: string }) {
  const [falta, setFalta] = useState(() => faltan.has(nombre));
  if (falta && !alterno) return null;
  return <img className={className} src={falta ? alterno : `${BASE}arte/ui/logros/${nombre}.webp`} alt="" draggable={false}
    onError={() => { if (!falta) { faltan.add(nombre); setFalta(true); } }} />;
}

/** La insignia: marco por rareza (o bloqueado) y el dibujo del logro encima. */
// Fondos del salón de logros (Elías, 2026-11-23). PRUEBA: ?fondo=galeria | muro para comparar; el salón con vitrinas quedó por omisión.
const FONDOS_LOGROS: OpcionFondo[] = [
  { clave: "salon", archivo: "lg-salon", foco: "50% 45%" },
  { clave: "galeria", archivo: "lg-galeria", foco: "60% 50%" },
  { clave: "muro", archivo: "lg-muro", foco: "50% 40%" },
];

export function Insignia({ l, grande }: { l: Pick<FilaLogro, "clave" | "rareza" | "ganado"> & { oculto?: boolean }; grande?: boolean }) {
  const ganado = !!l.ganado, secreto = !!l.oculto && !ganado;
  return (
    <span className={`lg-insignia r-${l.rareza}` + (ganado ? " ganado" : " bloqueado") + (secreto ? " secreto" : "") + (grande ? " grande" : "")} aria-hidden="true">
      <Arte nombre={ganado ? `insignia-${l.rareza}` : secreto ? "insignia-oculta" : "insignia-bloqueada"} className="lg-marco" />
      {secreto ? <span className="lg-interroga">?</span> : <Arte nombre={`logro-${l.clave}`} alterno={arteHub("icono-logros")} className="lg-dibujo" />}
    </span>
  );
}

export function Logros() {
  const s = useSesion();
  const r = useRecursos();
  const momento = useMomentoAzotea();
  const [pestana, setPestana] = useState<Pestana>("coleccion");
  const [lista, setLista] = useState<FilaLogro[] | null | undefined>(undefined);
  const [abierto, setAbierto] = useState<FilaLogro | null>(null);

  const cargar = () => miProgresoLogros().then(setLista);
  useEffect(() => { void cargar(); }, [s.uid]);

  const visibles = useMemo(() => (lista ?? []).filter(l => !l.oculto || l.ganado), [lista]);
  const todos = lista ?? [];
  const ganados = visibles.filter(l => l.ganado);
  const destacados = visibles.filter(l => l.destacado);

  const destacar = async (l: FilaLogro) => {
    const si = !l.destacado;
    if (si && destacados.length >= 3) { aviso("Ya tienes 3 destacados. Quita uno primero."); return; }
    const n = await destacarLogro(l.clave, si);
    if (n == null) { aviso("No se pudo. Intenta de nuevo."); return; }
    aviso(si ? `«${l.nombre}» destacado en tu perfil.` : "Lo quitaste de tus destacados.");
    setAbierto(a => (a ? { ...a, destacado: si } : a));
    void cargar();
  };

  return (
    <Marco clase={`az pf lg m-${momento}`} fondo={<FondoSeccion opciones={FONDOS_LOGROS} velo={.5} />}>
      <div className="lg-caja">
        <header className="pf-top lg-top">
          <button type="button" className="pf-atras" onClick={atras}><span aria-hidden="true">◀</span>Atrás</button>
          <RecursosAzotea monedas={r.monedas} puntos={r.puntos} />
        </header>

        <div className="lg-cabeza">
          <h1 className="lg-titulo"><span>Tu vitrina</span></h1>
          {lista && (
            <div className="lg-total" aria-label={`${ganados.length} de ${todos.length} logros`}>
              <b>{ganados.length}</b><small>de {todos.length}</small>
              <span className="lg-barra"><i style={{ width: `${todos.length ? Math.round((100 * ganados.length) / todos.length) : 0}%` }} /></span>
            </div>
          )}
        </div>

        <nav className="lg-pestanas" aria-label="Secciones de logros">
          {PESTANAS.map(p => (
            <button key={p.id} type="button" className={"lg-pest" + (pestana === p.id ? " si" : "") + (p.pronto ? " pronto" : "")} aria-pressed={pestana === p.id} onClick={() => setPestana(p.id)}>
              <Arte nombre={`tab-${p.id}`} className="lg-pest-ico" />
              <span>{p.titulo}</span>
              {p.pronto && <small>Próximamente</small>}
            </button>
          ))}
        </nav>

        {lista === undefined ? <p className="lg-cargando" role="status">Abriendo la vitrina…</p>
          : lista === null ? <p className="lg-cargando" role="status">No se pudo leer tu colección. Revisa tu conexión.</p>
          : pestana === "coleccion" ? <>
              <Repisa titulo="Todos tus logros" logros={ordenar(visibles.filter(l => l.categoria === "coleccion"))} alAbrir={setAbierto} />
              <Repisa titulo="Tu camino" logros={ordenar(visibles.filter(l => l.categoria === "progresion"))} alAbrir={setAbierto} />
            </>
          : pestana === "ocultos" ? <Repisa titulo="Secretos" logros={ordenar(todos.filter(l => l.categoria === "oculto"))} alAbrir={setAbierto} />
          : pestana === "objetivos" ? <Objetivos />
          : pestana === "colectivos" ? <Repisa titulo="Con tus amigos" logros={ordenar(visibles.filter(l => l.categoria === "colectivo"))} alAbrir={setAbierto} />
          : pestana === "minijuego" ? <PorJuego logros={visibles.filter(l => l.categoria === "minijuego")} alAbrir={setAbierto} />
          : pestana === "recompensas" ? <Recompensas ganados={ganados} destacados={destacados} alAbrir={setAbierto} alTitulo={async c => { if (await usarTitulo(c)) { aviso(c ? "Título puesto." : "Quitaste tu título."); void cargar(); } else aviso("No se pudo cambiar."); }} />
          : null}
      </div>
      {abierto && <Detalle l={abierto} alCerrar={() => setAbierto(null)} alDestacar={() => void destacar(abierto)} />}
    </Marco>
  );
}

/** Ganados primero (los más recientes arriba); luego los que van más avanzados. */
function ordenar(ls: FilaLogro[]) {
  return [...ls].sort((a, b) => (b.ganado ? 1 : 0) - (a.ganado ? 1 : 0) || (b.ganado ?? "").localeCompare(a.ganado ?? "")
    || b.va / b.meta - a.va / a.meta || ORDEN_RAREZA[a.rareza] - ORDEN_RAREZA[b.rareza] || a.orden - b.orden);
}

function Repisa({ titulo, logros, alAbrir }: { titulo: string; logros: FilaLogro[]; alAbrir: (l: FilaLogro) => void }) {
  const ganados = logros.filter(l => l.ganado).length;
  return (
    <section className="lg-repisa" aria-label={titulo}>
      <h2 className="pf-tit"><span>{titulo}</span><small className="lg-cuenta">{ganados}/{logros.length}</small></h2>
      <ul className="lg-rejilla">
        {logros.map((l, i) => (
          <li key={l.clave} style={{ "--i": i } as CSSProperties}>
            <button type="button" className={"lg-carta" + (l.ganado ? " ganado" : "")} onClick={() => alAbrir(l)}
              aria-label={`${l.nombre ?? "Logro secreto"}. ${l.ganado ? "Ganado" : `${l.va} de ${l.meta}`}. ${RAREZA_TEXTO[l.rareza]}.`}>
              <Insignia l={l} />
              <b>{l.nombre ?? "???"}</b>
              {!l.nombre && l.pista && <small className="lg-pista">{l.pista}</small>}
              {l.ganado ? <small className="lg-fecha">{fecha(l.ganado)}</small>
                : <span className="lg-avance"><span className="lg-barra chica"><i style={{ width: `${Math.round((100 * l.va) / l.meta)}%` }} /></span><small>{l.va}/{l.meta}</small></span>}
              {l.destacado && <em className="lg-estrella" aria-hidden="true">★</em>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PorJuego({ logros, alAbrir }: { logros: FilaLogro[]; alAbrir: (l: FilaLogro) => void }) {
  const juegos = [...new Set(logros.map(l => l.juego ?? ""))];
  return <>{juegos.map(j => <Repisa key={j} titulo={JUEGOS.find(x => x.id === j)?.nombre ?? j} logros={ordenar(logros.filter(l => (l.juego ?? "") === j))} alAbrir={alAbrir} />)}</>;
}

function Recompensas({ ganados, destacados, alAbrir, alTitulo }: { ganados: FilaLogro[]; destacados: FilaLogro[]; alAbrir: (l: FilaLogro) => void; alTitulo: (c: string | null) => void }) {
  const actual = ganados.find(l => l.en_uso);
  return (
    <>
      <section className="pf-bloque lg-titulos" aria-label="Tu título">
        <h2 className="pf-tit"><span>Tu título y marco</span></h2>
        <p className="pf-suave">Elige un logro ganado: su nombre sale bajo tu apodo en el Ranking y su marco toma el color de su rareza.</p>
        {ganados.length === 0 ? <p className="pf-suave">Gana tu primer logro para tener un título.</p> : (
          <div className="lg-chips" role="group" aria-label="Títulos">
            <button type="button" className={"lg-chip" + (!actual ? " si" : "")} aria-pressed={!actual} onClick={() => alTitulo(null)}>Sin título</button>
            {ganados.map(l => <button key={l.clave} type="button" className={`lg-chip r-${l.rareza}` + (l.en_uso ? " si" : "")} aria-pressed={!!l.en_uso} onClick={() => alTitulo(l.clave)}>{l.nombre}</button>)}
          </div>
        )}
      </section>
      <section className="pf-bloque lg-destacados" aria-label="Destacados">
        <h2 className="pf-tit"><span>Destacados en tu perfil</span><small className="lg-cuenta">{destacados.length}/3</small></h2>
        <div className="lg-pedestales">
          {[0, 1, 2].map(i => {
            const l = destacados[i];
            return l ? <button key={l.clave} type="button" className="lg-pedestal" onClick={() => alAbrir(l)}><Insignia l={l} grande /><b>{l.nombre}</b></button>
              : <span key={i} className="lg-pedestal vacio"><span className="lg-hueco" /><small>Toca un logro ganado y elige «Destacar»</small></span>;
          })}
        </div>
      </section>
      <section className="pf-bloque" aria-label="Lo que puedes ganar">
        <h2 className="pf-tit"><span>Lo que ganas</span></h2>
        <p className="pf-suave">Cada logro te da su insignia para tu vitrina y tu perfil. Los logros no dan XP: la XP sale de jugar.
          Títulos, marcos, poses y efectos de entrada llegan en las siguientes etapas.</p>
        {ganados.length === 0 && <p className="pf-suave">Todavía no tienes insignias. Termina tu primera partida y gana «Primeros pasos».</p>}
      </section>
    </>
  );
}

/** Objetivos del día y de la semana (043): avance real, cobrar la XP una vez. */
function Objetivos() {
  const [lista, setLista] = useState<Objetivo[] | null | undefined>(undefined);
  const [cobrando, setCobrando] = useState<string | null>(null);
  const cargar = () => misObjetivos().then(setLista);
  useEffect(() => { void cargar(); }, []);
  const cobrar = async (o: Objetivo) => {
    setCobrando(o.clave);
    const xp = await reclamarObjetivo(o.clave);
    setCobrando(null);
    if (xp == null) { aviso("No se pudo cobrar. Intenta de nuevo."); return; }
    dispatchEvent(new CustomEvent("alv-logro", { detail: { tipo: "objetivo", nombre: o.nombre, rareza: "rara", recompensa: xp > 0 ? `+${xp} XP` : "Ya llegaste al tope de XP de hoy" } }));
    void refrescarSesion();
    void cargar();
  };
  if (lista === undefined) return <p className="lg-cargando" role="status">Leyendo tus objetivos…</p>;
  if (lista === null) return <p className="lg-cargando" role="status">No se pudieron leer tus objetivos.</p>;
  const grupo = (periodo: "dia" | "semana", titulo: string) => {
    const xs = lista.filter(o => o.periodo === periodo);
    if (!xs.length) return null;
    return (
      <section className="pf-bloque lg-objetivos" aria-label={titulo}>
        <h2 className="pf-tit"><span>{titulo}</span><small className="lg-cuenta">Se renuevan en {restante(xs[0]!.termina)}</small></h2>
        <ul className="lg-obj-lista">
          {xs.map(o => {
            const listo = o.va >= o.meta;
            return (
              <li key={o.clave} className={"lg-obj" + (o.reclamado ? " cobrado" : listo ? " listo" : "")}>
                <span className="lg-obj-txt"><b>{o.nombre}</b>
                  <span className="lg-avance"><span className="lg-barra"><i style={{ width: `${Math.round((100 * o.va) / o.meta)}%` }} /></span><small>{o.va}/{o.meta}</small></span></span>
                <span className="lg-obj-xp">+{o.xp} XP</span>
                {o.reclamado ? <span className="lg-obj-ok">✓ Cobrado</span>
                  : <button type="button" className="lg-obj-cobrar" disabled={!listo || cobrando === o.clave} onClick={() => void cobrar(o)}>{cobrando === o.clave ? "…" : "Cobrar"}</button>}
              </li>
            );
          })}
        </ul>
      </section>
    );
  };
  return <>{grupo("dia", "Objetivos de hoy")}{grupo("semana", "Objetivos de la semana")}
    <p className="lg-nota">La XP de los objetivos cuenta dentro del tope de 600 XP al día. Completar 10 objetivos te da el logro «Constante».</p></>;
}

const restante = (iso: string) => {
  const ms = Math.max(0, Date.parse(iso) - Date.now()), d = Math.floor(ms / 86400e3), h = Math.floor((ms % 86400e3) / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
  return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${Math.max(1, m)} min`;
};

function Detalle({ l, alCerrar, alDestacar }: { l: FilaLogro; alCerrar: () => void; alDestacar: () => void }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") alCerrar(); };
    addEventListener("keydown", f); return () => removeEventListener("keydown", f);
  }, [alCerrar]);
  return createPortal(
    <div className="D az lg-capa" role="dialog" aria-modal="true" aria-label={l.nombre ?? "Logro"} onClick={alCerrar}>
      <div className={`lg-detalle r-${l.rareza}`} onClick={e => e.stopPropagation()}>
        <button type="button" className="lg-cerrar" onClick={alCerrar} aria-label="Cerrar">✕</button>
        <Insignia l={l} grande />
        <span className={`lg-rareza r-${l.rareza}`}>{RAREZA_TEXTO[l.rareza]}</span>
        <h2>{l.nombre ?? "Logro secreto"}</h2>
        <p>{l.descripcion ?? `Pista: ${l.pista ?? "descúbrelo jugando."}`}</p>
        {l.ganado ? <p className="lg-ganado">Ganado el {fecha(l.ganado)}</p>
          : <div className="lg-avance grande"><span className="lg-barra"><i style={{ width: `${Math.round((100 * l.va) / l.meta)}%` }} /></span><small>{l.va} de {l.meta}</small></div>}
        <p className="lg-premio">Recompensa: <b>{l.recompensa ?? "Insignia"}</b></p>
        {l.ganado && <button type="button" className="lg-boton" onClick={alDestacar}>{l.destacado ? "Quitar de destacados" : "★ Destacar en mi perfil"}</button>}
      </div>
    </div>,
    document.body,
  );
}
