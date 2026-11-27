// ALV PARTY (Competitivo; Elías, 27 nov 2026): #/party/código. El configurador de los Mini-Juegos.
// Pasos: juego (por categoría o directo en el selector giratorio) → escenario → opciones (dónde se ve y jugadores de
// práctica) → resumen → ¡Comenzar!. Cada quien juega desde su aparato: la TV (o este aparato) muestra el juego y los
// demás entran con el QR o el código. XP y monedas las da el servidor al terminar (049) cuando el anfitrión de la sala
// tiene sesión; los logros salen de los resultados guardados.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ir } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { sonar } from "../../app/sonido";
import {
  AMBIENTES_PARTY, BOTS_PARTY, CATEGORIAS_PARTY, MAX_JUGADORES_PARTY, MINIJUEGOS, MODALIDADES_PARTY, PANTALLAS_PARTY, miniDe, motivoParty, salaParty, urlsParty,
  type ConfigParty, type ModalidadParty, type IdAmbiente, type IdCategoria, type IdMini, type IdPantalla, type Minijuego,
} from "../../content/party";
import { useSala } from "../../roles/sala";
import { Qr } from "../lobby/Cast";
import { Marco, aviso } from "../comun";
import { useRecursos } from "../Recursos";
import { RecursosAzotea } from "../azotea/Cabecera";
import { EscenarioFondo } from "../azotea/Escenario";
import { useMomentoAzotea } from "../azotea/HubAzotea";
import { escenarioActual } from "../azotea/paquetes";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "../configurar.css";
import "../configurar-az.css";
import "../vitrinas.css";
import "./party.css";

type Seccion = "juego" | "modo" | "escenario" | "opciones" | "resumen";
/** Pasos: «Modo de juego» solo si el minijuego se puede jugar solos o por equipos. */
const ordenDe = (m?: Minijuego): Seccion[] => ["juego", ...((m?.modalidades?.length ?? 0) > 1 ? ["modo" as const] : []), "escenario", "opciones", "resumen"];
const TITULO: Record<Seccion, string> = { juego: "Elige el minijuego", modo: "Modo de juego", escenario: "¿Dónde juegan?", opciones: "Opciones", resumen: "¡Todo listo!" };

/** Lo último que se configuró en este aparato (para «Otra vez»). */
const CLAVE = "alv-party-ultima";
function leerUltima(): Partial<ConfigParty> {
  try { const c = JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Partial<ConfigParty>; return c && typeof c === "object" ? c : {}; } catch { return {}; }
}
function guardarUltima(c: ConfigParty) { try { localStorage.setItem(CLAVE, JSON.stringify(c)); } catch { /* sin almacenamiento */ } }

/** Portada de un minijuego: su emoji sobre el color del juego (hasta que haya ilustración). */
function Portada({ m }: { m: Minijuego }) {
  return <span className="pt-portada" style={{ "--pc": m.color } as CSSProperties} aria-hidden="true"><span>{m.emoji}</span></span>;
}

/** Categorías, más «Todos» para ir directo al selector con los 5. */
function CategoriasParty({ alElegir }: { alElegir: (c: IdCategoria | "todos") => void }) {
  const cats = [{ id: "todos" as const, nombre: "Todos", texto: "Los 5 minijuegos en el selector.", color: "#ffcf2e" }, ...CATEGORIAS_PARTY];
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
export function ConfigurarParty({ alComenzar, alCancelar }: { alComenzar: (c: ConfigParty) => void; alCancelar: () => void }) {
  const r = useRecursos();
  const ultima = useRef(leerUltima()).current;
  const [sec, setSec] = useState<Seccion>("juego");
  const [desdeResumen, setDesdeResumen] = useState(false);
  const [filtro, setFiltro] = useState<IdCategoria | "todos" | null>(null);
  const [juego, setJuego] = useState<IdMini | undefined>(miniDe(ultima.juego ?? "")?.id);
  const [ambiente, setAmbiente] = useState<IdAmbiente>(AMBIENTES_PARTY.some(a => a.id === ultima.ambiente) ? ultima.ambiente! : "noche");
  const [pantalla, setPantalla] = useState<IdPantalla>(PANTALLAS_PARTY.some(p => p.id === ultima.pantalla) ? ultima.pantalla! : "aqui");
  const [bots, setBots] = useState<number>(BOTS_PARTY.includes(ultima.bots as 0) ? ultima.bots! : 0);
  const [modalidad, setModalidad] = useState<ModalidadParty>(ultima.modalidad === "equipos" ? "equipos" : "solos");
  const m = juego ? miniDe(juego) : undefined;
  const ORDEN = ordenDe(m);
  const k = Math.max(0, ORDEN.indexOf(sec));
  const conModo = ORDEN.includes("modo");
  const config: Partial<ConfigParty> = { juego, ambiente, pantalla, bots, ...(conModo ? { modalidad } : {}) };
  const motivo = motivoParty(config);

  const ir2 = (s: Seccion) => { setSec(s); };
  const siguiente = (orden = ORDEN) => {
    if (desdeResumen && !(sec === "juego" && orden.includes("modo"))) { setDesdeResumen(false); ir2("resumen"); return; }
    ir2(orden[Math.min(orden.length - 1, orden.indexOf(sec) + 1)]!);
  };
  const atras = () => {
    if (sec === "juego" && filtro) { setFiltro(null); return; }
    if (desdeResumen) { setDesdeResumen(false); ir2("resumen"); return; }
    if (k <= 0) alCancelar(); else ir2(ORDEN[k - 1]!);
  };
  const editar = (s: Seccion) => { if (s === "juego") setFiltro(m?.categoria ?? null); setDesdeResumen(true); ir2(s); };
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
  } else if (sec === "escenario") {
    contenido = (
      <div className="pt-ops" role="radiogroup" aria-label="Escenario">
        {AMBIENTES_PARTY.map(a => <Opcion key={a.id} nombre={a.nombre} texto={a.texto} color={a.color} elegida={ambiente === a.id}
          alTocar={() => { setAmbiente(a.id); sonar("clic"); setTimeout(() => siguiente(), 220); }}><span className={"pt-cielo pt-cielo-" + a.id} aria-hidden="true" /></Opcion>)}
      </div>
    );
  } else if (sec === "opciones") {
    contenido = <>
      <section className="pt-grupo">
        <h3 className="cfg-sub dsp ol">Dónde se ve</h3>
        <div className="pt-ops" role="radiogroup" aria-label="Dónde se ve">
          {PANTALLAS_PARTY.map(p => <Opcion key={p.id} nombre={p.nombre} texto={p.texto} elegida={pantalla === p.id} alTocar={() => setPantalla(p.id)} />)}
        </div>
      </section>
      <section className="pt-grupo">
        <h3 className="cfg-sub dsp ol">Jugadores de práctica</h3>
        <p className="pt-nota">Se mueven solos. Sirven para probar o para completar. No ganan nada.</p>
        <div className="pt-bots" role="radiogroup" aria-label="Jugadores de práctica">
          {BOTS_PARTY.map(b => <button key={b} type="button" className={"pt-bot" + (bots === b ? " on" : "")} aria-pressed={bots === b} onClick={() => setBots(b)}>{b === 0 ? "Ninguno" : b}</button>)}
        </div>
      </section>
    </>;
  } else {
    const amb = AMBIENTES_PARTY.find(a => a.id === ambiente)!;
    const pan = PANTALLAS_PARTY.find(p => p.id === pantalla)!;
    contenido = (
      <div className="pt-resumen">
        <button type="button" className="cfg-casilla rz-juego" onClick={() => editar("juego")} aria-label={`Minijuego: ${m?.nombre ?? "sin elegir"}. Cambiar`}>
          <span className="cfg-casilla-t dsp">Minijuego</span>
          <span className="cfg-casilla-img">{m ? <Portada m={m} /> : null}</span>
          <b className="dsp ol">{m?.nombre ?? "Elige uno"}</b>
          {m && <small>{m.descripcion}</small>}
          <span className="cfg-cambiar">Cambiar</span>
        </button>
        <button type="button" className="cfg-casilla" onClick={() => editar("escenario")} aria-label={`Escenario: ${amb.nombre}. Cambiar`}>
          <span className="cfg-casilla-t dsp">Escenario</span>
          <span className="cfg-casilla-img"><span className={"pt-cielo pt-cielo-" + amb.id} aria-hidden="true" /></span>
          <b className="dsp ol">{amb.nombre}</b>
          <span className="cfg-cambiar">Cambiar</span>
        </button>
        <button type="button" className="cfg-casilla" onClick={() => editar("opciones")} aria-label={`Opciones: ${pan.nombre}. Cambiar`}>
          <span className="cfg-casilla-t dsp">Opciones</span>
          <b className="dsp ol">{pan.nombre}</b>
          <small>{conModo ? `${MODALIDADES_PARTY.find(x => x.id === modalidad)!.nombre} · ` : ""}{bots ? `${bots} de práctica` : "Sin jugadores de práctica"}</small>
          <span className="cfg-cambiar">Cambiar</span>
        </button>
        <p className="pt-nota pt-premio">Gana XP, monedas y logros cada quien con su cuenta. El anfitrión de la sala necesita sesión iniciada.</p>
      </div>
    );
  }

  const soloTocar = sec === "juego" || sec === "escenario" || sec === "modo";
  return (
    <div className="cfg pt">
      <header className="cfg-cab">
        <div className="cfg-cab-fila">
          <button type="button" className="pf-atras cfg-volver" onClick={atras}><span aria-hidden="true">◀</span>{desdeResumen ? "Resumen" : "Atrás"}</button>
          <span className="pt-marca dsp">ALV PARTY</span>
          <RecursosAzotea monedas={r.monedas} puntos={r.puntos} />
        </div>
        <div className="cfg-cab-titulo" hidden={sec === "resumen"}>
          <h2 className="pf-tit cfg-titulo" key={sec + (filtro ?? "")}><span><span className="cfg-tit-txt">{sec === "juego" && filtro && filtro !== "todos" ? CATEGORIAS_PARTY.find(c => c.id === filtro)!.nombre : TITULO[sec]}</span></span></h2>
          <ol className="cfg-avance" aria-label={`Paso ${k + 1} de ${ORDEN.length}`}>{ORDEN.map((s, x) => <li key={s} className={x === k ? "on" : x < k ? "hecho" : ""} />)}</ol>
        </div>
      </header>
      <div className="cfg-cuerpo" key={sec}>{contenido}</div>
      <footer className="cfg-pie">
        {sec === "resumen"
          ? <button type="button" className="cfg-sig principal" disabled={!!motivo} onClick={() => { if (!motivo) { guardarUltima(config as ConfigParty); alComenzar(config as ConfigParty); } }}>
              <span className="cfg-sig-txt"><b>¡Comenzar!</b><small>{motivo ?? m?.nombre}</small></span><span className="cfg-sig-flecha" aria-hidden="true">▶</span>
            </button>
          : soloTocar ? null
          : <button type="button" className={"cfg-sig" + (desdeResumen ? " listo" : "")} onClick={() => siguiente()}>
              <span className="cfg-sig-txt"><b>{desdeResumen ? "Listo" : "Siguiente"}</b></span><span className="cfg-sig-flecha" aria-hidden="true">▶</span>
            </button>}
      </footer>
    </div>
  );
}

/** «Proyectar»: QR y enlace del juego para abrir en la TV; este aparato sigue como mando. */
function Proyectar({ urls, sala, alMando, alVolver }: { urls: { tv: string; mando: string }; sala: string; alMando: () => void; alVolver: () => void }) {
  const copiar = async () => { try { await navigator.clipboard.writeText(urls.tv); aviso("Enlace copiado."); } catch { aviso("No se pudo copiar. Escanea el QR."); } };
  return (
    <div className="pt-proy">
      <h2 className="pf-tit"><span>Abre el juego en la otra pantalla</span></h2>
      <p className="pt-nota">Escanea el QR o abre el enlace en la TV o laptop, con tu sesión de ALV iniciada. Luego toca «Ir a mi mando».</p>
      <Qr texto={urls.tv} />
      <p className="pt-codigo">Sala <b className="dsp">{sala}</b></p>
      <div className="pt-acciones">
        <button type="button" className="pt-op" onClick={() => void copiar()}><b className="dsp">Copiar enlace</b></button>
        <button type="button" className="cfg-sig principal" onClick={alMando}><span className="cfg-sig-txt"><b>Ir a mi mando</b></span><span className="cfg-sig-flecha" aria-hidden="true">▶</span></button>
      </div>
      <button type="button" className="pf-atras" onClick={alVolver}><span aria-hidden="true">◀</span>Cambiar opciones</button>
    </div>
  );
}

/** Los que no son anfitrión: entran al minijuego con el código que sale en la pantalla. */
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
      <p className="pt-nota">Cuando aparezca el juego en la pantalla, escanea su QR o escribe aquí el código de 4 letras.</p>
      <form className="pt-unirse" onSubmit={e => { e.preventDefault(); entrar(); }}>
        <input className="pt-input dsp" value={limpio} onChange={e => setCodigo(e.target.value)} placeholder="ABCD" maxLength={4} autoCapitalize="characters" autoComplete="off" aria-label="Código del minijuego" />
        <button type="submit" className="cfg-sig principal"><span className="cfg-sig-txt"><b>Entrar</b></span><span className="cfg-sig-flecha" aria-hidden="true">▶</span></button>
      </form>
    </div>
  );
}

/** #/party/código: el anfitrión configura; los demás esperan con el campo para el código. */
export function PaginaParty({ codigo }: { codigo: string }) {
  const ses = useSesion();
  const s = useSala(codigo, ses.uid);
  const momento = useMomentoAzotea();
  const az = escenarioActual();
  const [proy, setProy] = useState<{ urls: { tv: string; mando: string }; sala: string } | null>(null);
  const soyAnfitrion = !!s.sala && s.sala.anfitrionId === ses.uid;
  const fondo = <div className="cfg-fondo"><EscenarioFondo ambiente={az.ambientes[momento]} momento={momento} velo={az.velo} /></div>;
  const base = new URL(import.meta.env.BASE_URL, location.href).href;
  const comenzar = (c: ConfigParty) => {
    const sala = salaParty();
    const urls = urlsParty(c, sala, base, ses.nombre);
    sonar("exito");
    if (c.pantalla === "aqui") { location.assign(urls.tv); return; }
    setProy({ urls, sala });
  };
  let cuerpo: ReactNode;
  if (s.error) cuerpo = <div className="pt-proy"><h2 className="pf-tit"><span>No se pudo abrir</span></h2><p className="pt-nota">{s.error}</p><button type="button" className="pf-atras" onClick={() => ir("jugar")}><span aria-hidden="true">◀</span>Volver</button></div>;
  else if (!s.sala) cuerpo = <p className="a-suave a-pulso cfg-abriendo" role="status">Preparando ALV PARTY…</p>;
  else if (!soyAnfitrion) cuerpo = <Unirse nombre={ses.nombre} />;
  else if (proy) cuerpo = <Proyectar urls={proy.urls} sala={proy.sala} alMando={() => location.assign(proy.urls.mando)} alVolver={() => setProy(null)} />;
  else cuerpo = <ConfigurarParty alComenzar={comenzar} alCancelar={() => ir("sala", codigo)} />;
  return <Marco clase={`az pf cfg-pagina m-${momento}`} fondo={fondo}>{cuerpo}</Marco>;
}
