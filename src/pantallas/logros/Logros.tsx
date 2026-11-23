// Logros «vitrina de colección» (ALV_PLAN_RANKING_LOGROS.md v2, etapa 1; Maestro v1.54, 14.3).
// Mismo lenguaje que el HUB «La Azotea» y el Perfil, con otro diseño que el Ranking: repisas, insignias y avance.
// Datos: mi_progreso_logros (042). Los logros no dan XP (D0): la recompensa es la insignia.
// Insignias y dibujos son imágenes de Elías (public/arte/ui/logros/*.webp); mientras no llegan, el icono de Logros del HUB.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { atras } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { JUEGOS } from "../../content/catalogo";
import { ORDEN_RAREZA, RAREZA_TEXTO } from "../../content/logros";
import { destacarLogro, miProgresoLogros, type FilaLogro } from "../../servicios/logros";
import { Marco, aviso } from "../comun";
import { useRecursos } from "../Recursos";
import { RecursosAzotea, arteHub } from "../azotea/Cabecera";
import { EscenarioFondo } from "../azotea/Escenario";
import { useMomentoAzotea } from "../azotea/HubAzotea";
import { escenarioActual } from "../azotea/paquetes";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "./logros.css";

const BASE = import.meta.env.BASE_URL;
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });

type Pestana = "coleccion" | "ocultos" | "minijuego" | "colectivos" | "objetivos" | "recompensas";
const PESTANAS: { id: Pestana; titulo: string; pronto?: boolean }[] = [
  { id: "coleccion", titulo: "Mi colección" }, { id: "ocultos", titulo: "Ocultos", pronto: true }, { id: "minijuego", titulo: "Por minijuego" },
  { id: "colectivos", titulo: "Colectivos" }, { id: "objetivos", titulo: "Objetivos", pronto: true }, { id: "recompensas", titulo: "Recompensas" },
];

const faltan = new Set<string>();
function Arte({ nombre, alterno, className = "" }: { nombre: string; alterno?: string; className?: string }) {
  const [falta, setFalta] = useState(() => faltan.has(nombre));
  if (falta && !alterno) return null;
  return <img className={className} src={falta ? alterno : `${BASE}arte/ui/logros/${nombre}.webp`} alt="" draggable={false}
    onError={() => { if (!falta) { faltan.add(nombre); setFalta(true); } }} />;
}

/** La insignia: marco por rareza (o bloqueado) y el dibujo del logro encima. */
export function Insignia({ l, grande }: { l: Pick<FilaLogro, "clave" | "rareza" | "ganado">; grande?: boolean }) {
  const ganado = !!l.ganado;
  return (
    <span className={`lg-insignia r-${l.rareza}` + (ganado ? " ganado" : " bloqueado") + (grande ? " grande" : "")} aria-hidden="true">
      <Arte nombre={ganado ? `insignia-${l.rareza}` : "insignia-bloqueada"} className="lg-marco" />
      <Arte nombre={`logro-${l.clave}`} alterno={arteHub("icono-logros")} className="lg-dibujo" />
    </span>
  );
}

export function Logros() {
  const s = useSesion();
  const r = useRecursos();
  const momento = useMomentoAzotea();
  const esc = escenarioActual();
  const [pestana, setPestana] = useState<Pestana>("coleccion");
  const [lista, setLista] = useState<FilaLogro[] | null | undefined>(undefined);
  const [abierto, setAbierto] = useState<FilaLogro | null>(null);

  const cargar = () => miProgresoLogros().then(setLista);
  useEffect(() => { void cargar(); }, [s.uid]);

  const visibles = useMemo(() => (lista ?? []).filter(l => !l.oculto), [lista]);
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
    <Marco clase={`az pf lg m-${momento}`} fondo={<EscenarioFondo ambiente={esc.ambientes[momento]} momento={momento} velo={Math.max(esc.velo, .5)} />}>
      <div className="lg-caja">
        <header className="pf-top lg-top">
          <button type="button" className="pf-atras" onClick={atras}><span aria-hidden="true">◀</span>Atrás</button>
          <RecursosAzotea monedas={r.monedas} puntos={r.puntos} />
        </header>

        <div className="lg-cabeza">
          <h1 className="lg-titulo"><span>Tu vitrina</span></h1>
          {lista && (
            <div className="lg-total" aria-label={`${ganados.length} de ${visibles.length} logros`}>
              <b>{ganados.length}</b><small>de {visibles.length}</small>
              <span className="lg-barra"><i style={{ width: `${visibles.length ? Math.round((100 * ganados.length) / visibles.length) : 0}%` }} /></span>
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
          : pestana === "coleccion" ? <Repisa titulo="Todos tus logros" logros={ordenar(visibles.filter(l => l.categoria === "coleccion"))} alAbrir={setAbierto} />
          : pestana === "colectivos" ? <Repisa titulo="Con tus amigos" logros={ordenar(visibles.filter(l => l.categoria === "colectivo"))} alAbrir={setAbierto} />
          : pestana === "minijuego" ? <PorJuego logros={visibles.filter(l => l.categoria === "minijuego")} alAbrir={setAbierto} />
          : pestana === "recompensas" ? <Recompensas ganados={ganados} destacados={destacados} alAbrir={setAbierto} />
          : <Pronto pestana={pestana} />}
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
              aria-label={`${l.nombre}. ${l.ganado ? "Ganado" : `${l.va} de ${l.meta}`}. ${RAREZA_TEXTO[l.rareza]}.`}>
              <Insignia l={l} />
              <b>{l.nombre}</b>
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

function Recompensas({ ganados, destacados, alAbrir }: { ganados: FilaLogro[]; destacados: FilaLogro[]; alAbrir: (l: FilaLogro) => void }) {
  return (
    <>
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

function Pronto({ pestana }: { pestana: Pestana }) {
  const texto = pestana === "ocultos"
    ? "Logros secretos: no sabrás qué piden hasta ganarlos. Se verán como siluetas con una pista. Lo que cuenta ya se está guardando desde ahora."
    : "Objetivos del día y de la semana, con su barra y su premio. Algunos te abrirán logros permanentes.";
  return <section className="pf-bloque lg-pronto"><h2 className="pf-tit"><span>{pestana === "ocultos" ? "Ocultos" : "Objetivos"}</span><span className="pf-pronto">Próximamente</span></h2><p className="pf-suave">{texto}</p></section>;
}

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
        <h2>{l.nombre}</h2>
        <p>{l.descripcion}</p>
        {l.ganado ? <p className="lg-ganado">Ganado el {fecha(l.ganado)}</p>
          : <div className="lg-avance grande"><span className="lg-barra"><i style={{ width: `${Math.round((100 * l.va) / l.meta)}%` }} /></span><small>{l.va} de {l.meta}</small></div>}
        <p className="lg-premio">Recompensa: <b>{l.recompensa ?? "Insignia"}</b></p>
        {l.ganado && <button type="button" className="lg-boton" onClick={alDestacar}>{l.destacado ? "Quitar de destacados" : "★ Destacar en mi perfil"}</button>}
      </div>
    </div>,
    document.body,
  );
}
