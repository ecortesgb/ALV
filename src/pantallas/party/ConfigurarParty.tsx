// ALV PARTY (Competitivo; Elías, 27 nov 2026): #/party/código. El configurador de los Mini-Juegos.
// Pasos (Elías, 27 nov noche): juego (por categoría o directo en el selector giratorio) → modo (solo si el juego lo pide)
// → escenario, y empieza. Proyectar se elige en el lobby: si la sala tiene Pantalla, el juego se abre ahí y cada celular
// queda como mando; si no, este aparato muestra el juego. Antes de empezar, todos ven el mini tutorial (CargaParty).
// XP y monedas las da el servidor al terminar (049/054); los logros salen de los resultados guardados (055).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ir } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { sonar } from "../../app/sonido";
import {
  AMBIENTES_PARTY, CATEGORIAS_PARTY, MAX_JUGADORES_PARTY, MINIJUEGOS, MODALIDADES_PARTY, miniDe, motivoParty, salaParty,
  type AvisoParty, type ConfigParty, type ModalidadParty, type IdAmbiente, type IdCategoria, type IdMini, type Minijuego,
} from "../../content/party";
import { useSala } from "../../roles/sala";
import { usePantalla } from "../Sala";
import { ArteCfg, srcArte } from "../TarjetasConfig";
import { Marco, aviso } from "../comun";
import { useRecursos } from "../Recursos";
import { RecursosAzotea } from "../azotea/Cabecera";
import { EscenarioFondo } from "../azotea/Escenario";
import { useMomentoAzotea } from "../azotea/HubAzotea";
import { escenarioActual } from "../azotea/paquetes";
import { CargaParty, EscuchaParty, avisarParty } from "./CargaParty";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "../configurar.css";
import "../configurar-az.css";
import "../vitrinas.css";
import "./party.css";

type Seccion = "juego" | "modo" | "escenario";
/** Pasos: «Modo de juego» solo si el minijuego se puede jugar solos o por equipos. Al elegir escenario, empieza. */
const ordenDe = (m?: Minijuego): Seccion[] => ["juego", ...((m?.modalidades?.length ?? 0) > 1 ? ["modo" as const] : []), "escenario"];
const TITULO: Record<Seccion, string> = { juego: "Elige el minijuego", modo: "Modo de juego", escenario: "¿Dónde juegan?" };
/** Icono de cada paso: los mismos del configurador normal. */
const ICONO: Record<Seccion, string> = { juego: "sec-juego", modo: "sec-equipos", escenario: "sec-escenario" };

/** Lo último que se configuró en este aparato (para «Otra vez»). */
const CLAVE = "alv-party-ultima";
function leerUltima(): Partial<ConfigParty> {
  try { const c = JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Partial<ConfigParty>; return c && typeof c === "object" ? c : {}; } catch { return {}; }
}
function guardarUltima(c: ConfigParty) { try { localStorage.setItem(CLAVE, JSON.stringify(c)); } catch { /* sin almacenamiento */ } }

/** Portada de un minijuego (arte de Elías). */
function Portada({ m }: { m: Minijuego }) {
  return <img className="vt-img pt-img" src={srcArte(m.portada)} alt="" draggable={false} loading="lazy" />;
}

/** Categorías, más «Todos» para ir directo al selector con todos. */
function CategoriasParty({ alElegir }: { alElegir: (c: IdCategoria | "todos") => void }) {
  const cats = [{ id: "todos" as const, nombre: "Todos", texto: "Todos los minijuegos en el selector.", color: "#ffcf2e" }, ...CATEGORIAS_PARTY];
  return (
    <div className="vt-cats" role="list">
      {cats.map((c, i) => {
        const juegos = c.id === "todos" ? MINIJUEGOS : MINIJUEGOS.filter(m => m.categoria === c.id);
        return (
          <button key={c.id} type="button" role="listitem" className="vt-cat" style={{ "--vc": c.color, "--i": i } as CSSProperties} onClick={() => alElegir(c.id)}
            aria-label={`${c.nombre}: ${juegos.length} ${juegos.length === 1 ? "juego" : "juegos"}. ${c.texto}`}>
            <span className="vt-cat-fan" aria-hidden="true">
              {juegos.slice(0, 3).map((m, k, xs) => <span key={m.id} className="vt-cat-carta" style={{ "--k": k - (xs.length - 1) / 2, zIndex: 3 - Math.abs(k - (xs.length - 1) / 2) * 2 } as CSSProperties}><Portada m={m} /></span>)}
            </span>
            <span className="vt-cat-txt"><b>{c.nombre}</b><small>{juegos.length} {juegos.length === 1 ? "juego" : "juegos"}</small></span>
          </button>
        );
      })}
    </div>
  );
}

/** Selector giratorio: la vitrina del centro crece; flechas, deslizar, teclado o tocar una de lado. */
function SelectorParty({ juegos, color, elegido, alElegir }: { juegos: Minijuego[]; color: string; elegido?: IdMini; alElegir: (id: IdMini) => void }) {
  const n = juegos.length;
  const [i, setI] = useState(() => Math.max(0, juegos.findIndex(m => m.id === elegido)));
  const girar = (k: number) => { sonar("clic"); setI(x => (((x + k) % n) + n) % n); };
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); girar(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); girar(-1); }
      else if (e.key === "Enter") { e.preventDefault(); alElegir(juegos[i]!.id); }
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  });
  const toque = useRef<number | null>(null);
  const movido = useRef(false);
  const actual = juegos[i]!;
  return (
    <div className="vt" style={{ "--vc": color } as CSSProperties}>
      <div className="vt-cab" key={actual.id} aria-live="polite">
        <b className="vt-nombre">{actual.nombre}</b>
        <span className="vt-datos"><span>2 a {MAX_JUGADORES_PARTY} jugadores</span><span>{actual.duracion}</span><span>Botón: {actual.mando}</span></span>
        <p className="vt-desc">{actual.descripcion}</p>
      </div>
      <div className="vt-escena"
        onPointerDown={e => { toque.current = e.clientX; movido.current = false; }}
        onPointerMove={e => { if (toque.current !== null && Math.abs(e.clientX - toque.current) > 12) movido.current = true; }}
        onPointerUp={e => { const x = toque.current; toque.current = null; if (x === null) return; const dx = e.clientX - x; if (Math.abs(dx) > 40) girar(dx < 0 ? 1 : -1); }}>
        <span className="vt-plataforma" aria-hidden="true" />
        {juegos.map((m, k) => {
          let d = k - i; if (d > n / 2) d -= n; if (d < -n / 2) d += n;
          return (
            <button key={m.id} type="button" tabIndex={d === 0 ? 0 : -1} aria-hidden={d !== 0}
              className={"vt-caja" + (d === 0 ? " centro" : "") + (m.id === elegido ? " elegida" : "") + (Math.abs(d) > 2 ? " lejos" : "")}
              style={{ "--d": d, "--ad": Math.abs(d) } as CSSProperties}
              onClick={() => { if (movido.current) return; if (d === 0) alElegir(m.id); else girar(d); }}
              aria-label={d === 0 ? `Elegir ${m.nombre}` : `Ver ${m.nombre}`}>
              <span className="vt-cristal"><Portada m={m} /><span className="vt-brillo" aria-hidden="true" /></span>
              <span className="vt-placa">{m.nombre}</span>
            </button>
          );
        })}
      </div>
      <div className="vt-mando">
        <button type="button" className="vt-flecha" onClick={() => girar(-1)} aria-label="Minijuego anterior" disabled={n < 2}>◀</button>
        <button type="button" className="vt-elegir" onClick={() => alElegir(actual.id)}>{actual.id === elegido ? "¡Jugar este!" : "¡Elegir!"}</button>
        <button type="button" className="vt-flecha" onClick={() => girar(1)} aria-label="Siguiente minijuego" disabled={n < 2}>▶</button>
      </div>
      <div className="vt-puntos" aria-hidden="true">{juegos.map((m, k) => <i key={m.id} className={k === i ? "on" : ""} />)}</div>
    </div>
  );
}

/** Tarjeta de elección simple (escenario, dónde se ve, práctica). */
function Opcion({ nombre, texto, color, elegida, alTocar, children }: { nombre: string; texto?: string; color?: string; elegida: boolean; alTocar: () => void; children?: ReactNode }) {
  return (
    <button type="button" className={"pt-op" + (elegida ? " on" : "")} style={{ "--pc": color ?? "#ffcf2e" } as CSSProperties} aria-pressed={elegida} onClick={alTocar}>
      {children}
      <b className="dsp">{nombre}</b>
      {texto && <small>{texto}</small>}
      {elegida && <span className="tc-check" aria-hidden="true">✓</span>}
    </button>
  );
}

/** El configurador. No habla con la base: devuelve la configuración con `alComenzar`. */
export function ConfigurarParty({ alComenzar, alCancelar, aviso: nota }: { alComenzar: (c: ConfigParty) => void; alCancelar: () => void; aviso?: string }) {
  const r = useRecursos();
  const ultima = useRef(leerUltima()).current;
  const [sec, setSec] = useState<Seccion>("juego");
  const [filtro, setFiltro] = useState<IdCategoria | "todos" | null>(null);
  const [juego, setJuego] = useState<IdMini | undefined>(miniDe(ultima.juego ?? "")?.id);
  const [ambiente, setAmbiente] = useState<IdAmbiente>(AMBIENTES_PARTY.some(a => a.id === ultima.ambiente) ? ultima.ambiente! : "noche");
  const [modalidad, setModalidad] = useState<ModalidadParty>(ultima.modalidad === "equipos" ? "equipos" : "solos");
  const m = juego ? miniDe(juego) : undefined;
  const ORDEN = ordenDe(m);
  const k = Math.max(0, ORDEN.indexOf(sec));
  const conModo = ORDEN.includes("modo");

  const comenzar = (amb: IdAmbiente) => {
    const c: ConfigParty = { juego: juego!, ambiente: amb, ...(conModo ? { modalidad } : {}) };
    const motivo = motivoParty(c);
    if (motivo) { aviso(motivo); return; }
    guardarUltima(c);
    alComenzar(c);
  };
  const siguiente = (orden = ORDEN) => setSec(orden[Math.min(orden.length - 1, orden.indexOf(sec) + 1)]!);
  const atras = () => {
    if (sec === "juego" && filtro) { setFiltro(null); return; }
    if (k <= 0) alCancelar(); else setSec(ORDEN[k - 1]!);
  };
  const elegirJuego = (id: IdMini) => { setJuego(id); sonar("clic"); setTimeout(() => siguiente(ordenDe(miniDe(id))), 220); };

  let contenido: ReactNode;
  if (sec === "juego") {
    if (filtro) {
      const cat = CATEGORIAS_PARTY.find(c => c.id === filtro);
      const juegos = filtro === "todos" ? MINIJUEGOS : MINIJUEGOS.filter(x => x.categoria === filtro);
      contenido = <SelectorParty key={filtro} juegos={juegos} color={cat?.color ?? "#ffcf2e"} elegido={juego} alElegir={elegirJuego} />;
    } else contenido = <CategoriasParty alElegir={setFiltro} />;
  } else if (sec === "modo") {
    contenido = (
      <div className="pt-ops" role="radiogroup" aria-label="Modo de juego">
        {MODALIDADES_PARTY.filter(x => m?.modalidades?.includes(x.id)).map(x => <Opcion key={x.id} nombre={x.nombre} texto={x.texto} elegida={modalidad === x.id}
          alTocar={() => { setModalidad(x.id); sonar("clic"); setTimeout(() => siguiente(), 220); }} />)}
      </div>
    );
  } else {
    contenido = (
      <div className="pt-ops" role="radiogroup" aria-label="Escenario">
        {AMBIENTES_PARTY.map(a => <Opcion key={a.id} nombre={a.nombre} texto={a.texto} color={a.color} elegida={ambiente === a.id}
          alTocar={() => { setAmbiente(a.id); sonar("clic"); setTimeout(() => comenzar(a.id), 220); }}>
          <img className="pt-cielo" src={srcArte(a.arte)} alt="" draggable={false} loading="lazy" /></Opcion>)}
      </div>
    );
  }

  return (
    <div className="cfg pt">
      <header className="cfg-cab">
        <div className="cfg-cab-fila">
          <button type="button" className="pf-atras cfg-volver" onClick={atras}><span aria-hidden="true">◀</span>Atrás</button>
          <span className="pt-marca dsp">ALV PARTY</span>
          <RecursosAzotea monedas={r.monedas} puntos={r.puntos} />
        </div>
        <div className="cfg-cab-titulo">
          <h2 className="pf-tit cfg-titulo" key={sec + (filtro ?? "")}><span><ArteCfg nombre={ICONO[sec]} className="cfg-tit-ico" /><span className="cfg-tit-txt">{sec === "juego" && filtro && filtro !== "todos" ? CATEGORIAS_PARTY.find(c => c.id === filtro)!.nombre : TITULO[sec]}</span></span></h2>
          <ol className="cfg-avance" aria-label={`Paso ${k + 1} de ${ORDEN.length}`}>{ORDEN.map((s2, x) => <li key={s2} className={x === k ? "on" : x < k ? "hecho" : ""} />)}</ol>
        </div>
      </header>
      <div className="cfg-cuerpo" key={sec}>{contenido}</div>
      <footer className="cfg-pie">
        {sec === "escenario" && <p className="cfg-pie-info" aria-live="polite">{m?.nombre}{conModo ? ` · ${MODALIDADES_PARTY.find(x => x.id === modalidad)!.nombre}` : ""}{/[!?.]$/.test(m?.nombre ?? "") && !conModo ? "" : "."} {nota ?? "Toca el escenario y empieza."}</p>}
      </footer>
    </div>
  );
}

/** Los que no son anfitrión: el anfitrión elige; cuando empiece, el tutorial sale solo. Por si acaso, entrar con código. */
function Unirse({ nombre }: { nombre: string }) {
  const [codigo, setCodigo] = useState("");
  const limpio = codigo.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  const entrar = () => {
    if (limpio.length !== 4) { aviso("El código tiene 4 letras."); return; }
    const u = new URL("tools/personajes/minijuegos/control.html", new URL(import.meta.env.BASE_URL, location.href));
    u.search = new URLSearchParams({ sala: limpio, nombre: nombre.slice(0, 16) }).toString();
    location.assign(u.href);
  };
  return (
    <div className="pt-proy">
      <h2 className="pf-tit"><span>El anfitrión está eligiendo el minijuego</span></h2>
      <p className="pt-nota">Cuando empiece, aquí sale cómo se juega y tu celular se vuelve tu mando. Si no pasa, escribe el código de 4 letras que sale en la pantalla.</p>
      <form className="pt-unirse" onSubmit={e => { e.preventDefault(); entrar(); }}>
        <input className="pt-input dsp" value={limpio} onChange={e => setCodigo(e.target.value)} placeholder="ABCD" maxLength={4} autoCapitalize="characters" autoComplete="off" aria-label="Código del minijuego" />
        <button type="submit" className="cfg-sig principal"><span className="cfg-sig-txt"><b>Entrar</b></span><span className="cfg-sig-flecha" aria-hidden="true">▶</span></button>
      </form>
    </div>
  );
}

/** #/party/código: el anfitrión configura; los demás esperan y oyen el aviso de empezar. */
export function PaginaParty({ codigo }: { codigo: string }) {
  const ses = useSesion();
  const s = useSala(codigo, ses.uid);
  const momento = useMomentoAzotea();
  const az = escenarioActual();
  const soyAnfitrion = !!s.sala && s.sala.anfitrionId === ses.uid;
  // ¿Se proyecta? Lo decide el lobby: con Pantalla conectada, el juego va ahí y este aparato es mando.
  const pantalla = usePantalla(s.sala, false, !!s.sala);
  const conPantalla = pantalla === "presente";
  const [carga, setCarga] = useState<AvisoParty | null>(null);
  const fondo = <div className="cfg-fondo"><EscenarioFondo ambiente={az.ambientes[momento]} momento={momento} velo={az.velo} /></div>;
  const comenzar = (c: ConfigParty) => {
    // Mandos que se esperan: cada miembro del lobby (sin Pantalla, este aparato muestra el juego y también es mando).
    const esperados = Math.min(MAX_JUGADORES_PARTY, Math.max(1, s.miembros.length || 1));
    const a: AvisoParty = { ...c, sala: salaParty(), jugadores: esperados };
    sonar("exito");
    if (s.sala) avisarParty(s.sala.id, a);
    setCarga(a);
  };
  let cuerpo: ReactNode;
  if (s.error) cuerpo = <div className="pt-proy"><h2 className="pf-tit"><span>No se pudo abrir</span></h2><p className="pt-nota">{s.error}</p><button type="button" className="pf-atras" onClick={() => ir("jugar")}><span aria-hidden="true">◀</span>Volver</button></div>;
  else if (!s.sala) cuerpo = <p className="a-suave a-pulso cfg-abriendo" role="status">Preparando ALV PARTY…</p>;
  else if (!soyAnfitrion) cuerpo = <><Unirse nombre={ses.nombre} /><EscuchaParty salaId={s.sala.id} rol="mando" figura={s.miembros.find(m => m.id === ses.uid)?.figura} /></>;
  else cuerpo = <>
    <ConfigurarParty alComenzar={comenzar} alCancelar={() => ir("sala", codigo)}
      aviso={conPantalla ? "Se juega en la pantalla del lobby; tu celular será tu mando." : "Se juega en este aparato; los demás entran con su celular."} />
    {carga && <CargaParty aviso={carga} rol={conPantalla ? "mando" : "tv"} nombre={ses.nombre} figura={s.miembros.find(m => m.id === ses.uid)?.figura} alCancelar={() => setCarga(null)} />}
  </>;
  return <Marco clase={`az pf cfg-pagina m-${momento}`} fondo={fondo}>{cuerpo}</Marco>;
}
