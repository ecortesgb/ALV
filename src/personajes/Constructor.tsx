// «Crear mi personaje» (constructor básico) con el diseño A2 aprobado por Elías (ALV_DISENO_PERSONALIZADOR.md §0):
// mismas piezas que el HUB y el lobby (losas .az-losa, ¡Guardar! como .az-jugar, «Atrás» .pf-atras, panel .lb-panel,
// gestos redondos .mg-b). 4 losas: Cabeza (cara, pelo, piel), Torso, Brazos (brazos, manos), Piernas (cadera, piernas).
// Va dentro de <RaizDS className="az">. Escenario elegido por Elías (ALV_ESCENARIOS_PERSONALIZADOR.md): página de cómic.
// La figura va en la viñeta grande (líneas de acción y trama); las losas, el panel y ¡Guardar! en la de al lado. Entrada:
// la página del HUB se voltea; «Atrás»: se voltea de regreso y luego sale. Arte final de Elías en arte/personalizar/; sin
// él queda el boceto en CSS.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PE } from "react";
import { PALETAS, PALETA_DE_PARTE, piezasDe, planoConstructor, ponerPieza, teñir, type PiezaCons, type Piezas } from "./constructorDatos";
import { caben, paginas } from "./galeriaDatos";
import type { Catalogo } from "./plano";
import { PESTANAS_BASICO, type FiguraV3, type Parte } from "./tipos";
import { RuedaGestos, type GestoRueda } from "./RuedaGestos";
import { useMiniaturas } from "./useMiniaturas";
import { Vista3D } from "./Vista3D";
import "../pantallas/azotea/azotea.css";
import "../pantallas/perfil/perfil.css";
import "../pantallas/lobby/lobby.css";
import "../pantallas/gestos/menu-gestos.css";
import "./constructor.css";

type Pestana = keyof typeof PESTANAS_BASICO;
const ARTE = `${import.meta.env.BASE_URL}arte/`;
const LOSAS: { id: Pestana; titulo: string; sub: string; c1: string; c2: string; lab: string; ico: string }[] = [
  { id: "cabeza", titulo: "Cabeza", sub: "Cara, pelo y piel", c1: "#6fb6ff", c2: "#1f5fd6", lab: "#123e9c", ico: "ico-cabeza" },
  { id: "torso", titulo: "Torso", sub: "Playeras y trajes", c1: "#c08bff", c2: "#6f2fd6", lab: "#4a1c9c", ico: "ico-torso" },
  { id: "brazos", titulo: "Brazos", sub: "Brazos y manos", c1: "#7bea92", c2: "#1fa84a", lab: "#137033", ico: "ico-brazos" },
  { id: "piernas", titulo: "Piernas", sub: "Cadera y piernas", c1: "#ffb866", c2: "#f06a12", lab: "#a8420a", ico: "ico-piernas" },
];
const NOMBRE_PARTE: Partial<Record<Parte, string>> = { cabeza: "Piel", cara: "Cara", cabello: "Pelo", torso: "Torso", brazos: "Brazos", manos: "Manos", cadera: "Cadera", piernas: "Piernas" };
const NOMBRE_PALETA = { piel: "Piel", pelo: "Pelo", ropa: "Color" } as const;
/** Sub-partes de cada losa, en el orden en que salen (la cabeza empieza por la cara). */
const SUBPARTES: Record<Pestana, Parte[]> = { cabeza: ["cara", "cabello", "cabeza"], torso: ["torso"], brazos: ["brazos", "manos"], piernas: ["piernas", "cadera"] };

/** Ícono ilustrado de Elías (arte/ui/personalizar/<id>.webp); mientras no exista, su lugar queda vacío. */
const faltan = new Set<string>();
function IconoLosa({ id }: { id: string }) {
  const [falta, setFalta] = useState(() => faltan.has(id));
  if (falta) return <span className="az-ico pz-ico-vacio" aria-hidden="true" />;
  return <img className="az-ico" src={`${ARTE}ui/personalizar/${id}.webp`} alt="" draggable={false} onError={() => { faltan.add(id); setFalta(true); }} />;
}

// Mismos trazos que el menú de gestos del HUB (pantallas/gestos/MenuGestos.tsx).
function TrazosGesto({ cual }: { cual: string }) {
  const c = { fill: "#fff", stroke: "#1a1440", strokeWidth: 1.6, strokeLinejoin: "round" as const };
  if (cual === "saludar") return <path {...c} d="M8 21c-2.6-1.6-4-4.2-4-7.2V8.4a1.4 1.4 0 0 1 2.8 0V12h.6V4.8a1.4 1.4 0 0 1 2.8 0V11h.6V3.6a1.4 1.4 0 0 1 2.8 0V11h.6V5a1.4 1.4 0 0 1 2.8 0v8.4c0 4.3-2.7 8.1-7 8.1-.7 0-1.4-.2-2-.5Z" />;
  if (cual === "victoria") return <path {...c} d="M7 3h10v3h3.5c0 3.6-1.9 5.8-4.6 6.2A5 5 0 0 1 13 15v2.5h3V21H8v-3.5h3V15a5 5 0 0 1-2.9-2.8C5.4 11.8 3.5 9.6 3.5 6H7Z" />;
  if (cual === "derrota") return <><path {...c} d="M12 2.5c4.7 0 8 3.2 8 7.6 0 2.6-1.2 4.4-3 5.4V19a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19v-3.5c-1.8-1-3-2.8-3-5.4 0-4.4 3.3-7.6 8-7.6Z" /><circle cx="9" cy="11" r="1.9" fill="#1a1440" /><circle cx="15" cy="11" r="1.9" fill="#1a1440" /><path d="M10 20.4v-2.6M14 20.4v-2.6" stroke="#1a1440" strokeWidth="1.4" /></>;
  return <><path {...c} d="M12 1.8 14.3 9.7 22.2 12 14.3 14.3 12 22.2 9.7 14.3 1.8 12 9.7 9.7Z" /><path {...c} d="M19 2.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" /></>;
}
/** Rueda que sale al tocar al personaje (referencia de Elías: distribución y colores): izquierda, arriba, derecha, abajo.
 *  Nombres como en el HUB (decidió Codex, encargo 2026-11-26-rueda-gestos-r1, E3). */
const RUEDA: GestoRueda[] = [
  { cual: "saludar", txt: "Saludar", c1: "#9be04a", c2: "#4fa81f", dibujo: <TrazosGesto cual="saludar" /> },
  { cual: "victoria", txt: "Ganar", c1: "#ffd84a", c2: "#e0a400", dibujo: <TrazosGesto cual="victoria" /> },
  { cual: "especial", txt: "Especial", c1: "#ff9a3a", c2: "#e8560f", dibujo: <TrazosGesto cual="especial" /> },
  { cual: "derrota", txt: "Perder", c1: "#4f86e8", c2: "#1f4fb0", dibujo: <TrazosGesto cual="derrota" /> },
];

export interface ConstructorProps {
  catalogo: Catalogo;
  piezas: Piezas;
  inicial: FiguraV3;
  escenaUrl: string;
  onGuardar: (figura: FiguraV3) => void;
  onSalir?: () => void;
  /** Imagen de la página que se voltea al entrar y al salir (el HUB). null = sin volteo. */
  paginaAnterior?: string | null;
  /** Estudio de miniaturas de piezas sueltas; null = usar la foto del personaje que dona la pieza. */
  estudioUrl?: string | null;
  /** Encuadre más cerrado de la figura (la figura se ve más grande en la viñeta). */
  figuraCerca?: boolean;
  /** Grados máximos que el cuerpo se aparta del frente en reposo (0 = como venga el clip). Decidió Codex: 10° (encargo
   *  2026-11-25-constructor-diseno-r5). */
  frente?: number;
}

const sinMovimiento = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Constructor({ catalogo, piezas, inicial, escenaUrl, onGuardar, onSalir, paginaAnterior = `${ARTE}azotea-pedestal-noche-1920.webp`,
  estudioUrl = escenaUrl.replace(/escena\.html.*$/, "estudio.html"), figuraCerca = true, frente = 10 }: ConstructorProps) {
  const mini = useMiniaturas(estudioUrl, catalogo);
  const [figura, setFigura] = useState(inicial);
  const [historia, setHistoria] = useState<FiguraV3[]>([]);
  const [pestana, setPestana] = useState<Pestana>("cabeza");
  const [parte, setParte] = useState<Parte>("cara");
  const [pagina, setPagina] = useState(0);
  const [caja, setCaja] = useState({ columnas: 4, filas: 2 });
  const [guardado, setGuardado] = useState(false);
  const [momento, setMomento] = useState<{ cual: string; n: number } | null>(null);
  /** Firma del último plano que la escena armó bien. Solo se guarda si el plano de ahora es ese (Codex O2). */
  const [confirmada, setConfirmada] = useState<string | null>(null);
  /** Última figura que la escena confirmó; si una pieza no encaja, se vuelve a ella. */
  const valida = useRef<FiguraV3 | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const rejilla = useRef<HTMLDivElement>(null);
  /** Volteo de página: "entra" (el HUB se va), "sale" (el HUB regresa y luego onSalir), null = quieto. */
  const [volteo, setVolteo] = useState<"entra" | "sale" | null>(() => (paginaAnterior && !sinMovimiento() ? "entra" : null));
  /** La primera figura entra con su saltito; las demás no hacen nada al cambiar una pieza. */
  const [llego, setLlego] = useState(false);
  const salio = useRef(false);
  const salir = () => { if (!onSalir || volteo === "sale") return; if (!paginaAnterior || sinMovimiento()) onSalir(); else setVolteo("sale"); };
  const finVolteo = () => {
    if (volteo === "sale") { if (!salio.current) { salio.current = true; onSalir?.(); } } else setVolteo(null);
  };
  // Si la animación no termina (se canceló o se pidió reducir movimiento a medias), el volteo se cierra igual (Codex O10).
  useEffect(() => { if (!volteo) return; const t = setTimeout(finVolteo, volteo === "entra" ? 1100 : 1000); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [volteo]);

  useEffect(() => {
    const el = rejilla.current;
    if (!el) return;
    const medir = () => setCaja(caben(el.clientWidth, el.clientHeight, { min: el.clientWidth < 520 ? 70 : 96, proporcion: 1.05, hueco: 8 }));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plano = useMemo(() => planoConstructor("yo", figura, catalogo, piezas), [figura, catalogo, piezas]);
  const firma = plano ? JSON.stringify(plano) : "";
  const sePuedeGuardar = !!plano && firma === confirmada;
  const lista = useMemo(() => piezasDe(piezas, parte, figura.familia), [piezas, parte, figura.familia]);
  const pags = useMemo(() => paginas(lista, caja.columnas * caja.filas), [lista, caja]);
  const p = Math.min(pagina, pags.length - 1);
  const puesta = figura.piezas[parte]?.id ?? null;
  const paleta = PALETA_DE_PARTE[parte];
  const tinte = paleta ? figura.piezas[parte]?.tintes?.[paleta] ?? null : null;
  const base = figura.origen.tipo === "catalogo" ? figura.origen.personaje : null;
  const visible = (pz: PiezaCons) => pz.id === puesta || (!puesta && pz.donante === base);
  const losa = LOSAS.find(l => l.id === pestana)!;
  // Pide las fotos de las piezas de la página que se ve (las demás, cuando se llegue a ellas).
  useEffect(() => { pags[p]?.forEach(mini.pedir); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mini.listo, pags, p]);

  const cambiar = (nueva: FiguraV3) => { setHistoria(h => [...h.slice(-29), figura]); setFigura(nueva); setGuardado(false); };
  // Respuesta de la escena al plano de la figura actual (las viejas ya las descartó Vista3D). Si una pieza no encaja,
  // se vuelve a la última figura confirmada y se espera a que la escena la confirme otra vez; sin ninguna confirmada,
  // ¡Guardar! queda apagado (Codex O2).
  const alArmar = (ok: boolean, errores: string[]) => {
    setLlego(true);
    if (ok) { valida.current = figura; setConfirmada(firma); return; }
    setAviso("Esa pieza no le queda a tu figura.");
    console.warn("pieza rechazada:", errores);
    const v = valida.current;
    if (v && v !== figura) { setFigura(v); setHistoria(h => h.slice(0, -1)); }
  };
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 2600); return () => clearTimeout(t); }, [aviso]);
  // Dirección del último cambio de página, para que la rejilla entre por ese lado (Codex E5.2).
  const [pasa, setPasa] = useState<"sig" | "ant" | null>(null);
  const [guarda, setGuarda] = useState(false);
  const elegirLosa = (t: Pestana) => { setPestana(t); setParte(SUBPARTES[t][0]!); setPagina(0); setPasa(null); };
  const elegirParte = (x: Parte) => { setParte(x); setPagina(0); setPasa(null); };
  const regresar = () => setHistoria(h => { if (!h.length) return h; setFigura(h[h.length - 1]!); setGuardado(false); return h.slice(0, -1); });
  const gesto = (cual: string) => setMomento(m => ({ cual, n: (m?.n ?? 0) + 1 }));
  // Rueda de gestos al tocar al personaje (reemplaza a los 4 botones). Decidió Codex (encargo 2026-11-26-rueda-gestos-r1):
  // en computadora sale a un lado del toque, hacia donde hay más espacio y sin tapar la cara; en celular, fija en la
  // esquina de abajo a la derecha; siempre a 16 px o más de los bordes de la viñeta.
  const escena = useRef<HTMLDivElement>(null);
  const [rueda, setRueda] = useState<{ x: number; y: number } | null>(null);
  const [pista, setPista] = useState(() => { try { return localStorage.getItem("alv-pista-rueda") !== "vista"; } catch { return true; } });
  const tocar = (nx: number, ny: number) => {
    const e = escena.current, v = e?.querySelector<HTMLElement>(".pz-vista");
    if (!e || !v) return;
    const re = e.getBoundingClientRect(), rv = v.getBoundingClientRect();
    const radio = Math.min(230, Math.max(176, innerWidth * 0.22)) / 2, borde = radio + 16;
    let x: number, y: number;
    if (innerWidth >= 860) {
      x = rv.left - re.left + nx * rv.width + (nx < 0.5 ? 1 : -1) * radio * 1.15;
      y = Math.max(rv.top - re.top + ny * rv.height, rv.top - re.top + rv.height * 0.5); // de la cintura para abajo: libre la cara
    } else { x = re.width - borde; y = rv.bottom - re.top - borde; setCorrer({ x: 0.24, ms: 220 }); } // celular: la figura se hace a la izquierda (Codex r2, C)
    setRueda({ x: Math.max(borde, Math.min(re.width - borde, x)), y: Math.max(borde, Math.min(re.height - borde, y)) });
    if (pista) { setPista(false); try { localStorage.setItem("alv-pista-rueda", "vista"); } catch { /* sin almacenamiento */ } }
  };
  // Celular: mientras la rueda está abierta la cámara corre la figura a la izquierda. Al elegir: late 100 ms, la figura
  // regresa al centro en 180 ms mientras la rueda se cierra, y el gesto empieza cuando ya regresó (Codex r2).
  const [correr, setCorrer] = useState<{ x: number; ms: number } | undefined>(undefined);
  const corrida = useRef(false);
  corrida.current = !!correr && correr.x !== 0;
  const cerrarRueda = useCallback(() => { setRueda(null); if (corrida.current) setCorrer({ x: 0, ms: 180 }); }, []);
  const elegirGesto = (cual: string) => {
    if (corrida.current) { setTimeout(() => setCorrer({ x: 0, ms: 180 }), 100); setTimeout(() => gesto(cual), 280); }
    else setTimeout(() => gesto(cual), 220);
  };
  const teclaFigura = (ev: { key: string; preventDefault: () => void }) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tocar(0.5, 0.45); } };

  // Pasar de página deslizando de lado (como el carrusel del lobby).
  const toque = useRef<{ x: number; y: number } | null>(null);
  const bajar = (e: PE) => { toque.current = { x: e.clientX, y: e.clientY }; };
  const subir = (e: PE) => {
    const s = toque.current; toque.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) irA(p + (dx < 0 ? 1 : -1));
  };
  function irA(n: number) { const m = Math.max(0, Math.min(pags.length - 1, n)); if (m === p) return; setPasa(m > p ? "sig" : "ant"); setPagina(m); }

  return (
    <div className="pz">
      <div className="pz-fondo" aria-hidden="true" />
      <div className="pz-vin pz-vin-accion" aria-hidden="true" style={{ "--arte-h": `url(${ARTE}personalizar/comic-accion-horizontal.webp)`, "--arte-v": `url(${ARTE}personalizar/comic-accion-vertical.webp)` } as CSSProperties} />
      <div className="pz-vin pz-vin-piezas" aria-hidden="true" />
      <header className="pz-top">
        {onSalir && <button type="button" className="pf-atras" onClick={salir}><span aria-hidden="true">◀</span>Atrás</button>}
        <div className="pz-placa">Crear mi personaje</div>
      </header>

      <div className="pz-escena" ref={escena}>
        <p className="pz-cartela" aria-hidden="true">Mientras tanto, en el vestidor…</p>
        <div className="pz-toca" tabIndex={0} role="button" aria-label="Tu personaje: Enter para elegir una animación" onKeyDown={teclaFigura}>
        <Vista3D url={escenaUrl + (escenaUrl.includes("?") ? "&" : "?") + [figuraCerca ? "cerca=1" : "", frente ? "frente=" + frente : ""].filter(Boolean).join("&")} plano={plano} alLlegar={llego ? null : "entrada"} className="pz-vista" momento={momento} onArmado={alArmar} onToque={tocar} correr={correr} />
        </div>
        {pista && !rueda && <p className="pz-pista" aria-hidden="true">Toca a tu personaje</p>}
        {rueda && <RuedaGestos gestos={RUEDA} x={rueda.x} y={rueda.y} centro={`${ARTE}ui/personalizar/ico-cabeza.webp`} onElegir={elegirGesto} onCerrar={cerrarRueda} />}
        {aviso && <div className="pz-aviso" role="status">{aviso}</div>}
      </div>

      <nav className="pz-losas" aria-label="Partes del personaje">
        {LOSAS.map(l => (
          <button key={l.id} type="button" className={"az-losa pz-losa" + (pestana === l.id ? " on" : "")} aria-pressed={pestana === l.id}
            style={{ "--c1": l.c1, "--c2": l.c2, "--lab": l.lab } as CSSProperties} onClick={() => elegirLosa(l.id)}>
            <IconoLosa id={l.ico} />
            <span className="az-losa-txt"><b>{l.titulo}</b><small>{l.sub}</small></span>
          </button>
        ))}
      </nav>

      <section className="lb-panel pz-panel" style={{ "--pj": losa.c2 } as CSSProperties} aria-label="Piezas">
        {SUBPARTES[pestana].length > 1 && (
          <div className="pz-pills">
            {SUBPARTES[pestana].map(x => <button key={x} type="button" className={"pz-pill" + (parte === x ? " on" : "")} aria-pressed={parte === x} onClick={() => elegirParte(x)}>{NOMBRE_PARTE[x]}</button>)}
          </div>
        )}
        {paleta && (
          <div className="pz-colores" role="group" aria-label={NOMBRE_PALETA[paleta]}>
            <span>{NOMBRE_PALETA[paleta]}</span>
            {PALETAS[paleta].map(c => (
              <button key={c.id} type="button" className={"pz-color" + (tinte === c.id ? " on" : "")} style={{ background: c.hex }} aria-label={c.nombre} aria-pressed={tinte === c.id}
                title={c.nombre} onClick={() => cambiar(teñir(figura, parte, paleta, c.id))} />
            ))}
          </div>
        )}
        <div className={"pz-rejilla" + (pasa ? " pasa-" + pasa : "")} ref={rejilla} onPointerDown={bajar} onPointerUp={subir}
          style={{ gridTemplateColumns: `repeat(${caja.columnas}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${caja.filas}, minmax(0, 1fr))` }}>
          {pags[p]!.map(pz => (
            <button key={pz.id} type="button" className={"pz-pieza" + (visible(pz) ? " on" : "")} aria-pressed={visible(pz)} onClick={() => cambiar(ponerPieza(figura, pz))}>
              {(() => {
                if (!pz.glb) return <span className="pz-sin" aria-hidden="true">—</span>;
                const m = mini.foto(pz);
                if (m) return <img src={m} alt="" draggable={false} />;
                if (m === undefined) return <span className="pz-espera" aria-hidden="true" />;
                return pz.foto ? <img src={pz.foto} alt="" draggable={false} loading="lazy" /> : <span className="pz-sin" aria-hidden="true">—</span>;
              })()}
              <span>{pz.glb ? pz.nombre : "Ninguno"}</span>
            </button>
          ))}
          {!lista.length && <p className="pz-vacio">Todavía no hay piezas de este tipo.</p>}
        </div>
        <div className="pz-paginas">
          <button type="button" className="pz-flecha" onClick={() => irA(p - 1)} disabled={p === 0} aria-label="Página anterior">‹</button>
          <span className="pz-puntos" aria-label={`Página ${p + 1} de ${pags.length}`}>{pags.map((_, i) => <i key={i} className={i === p ? "on" : ""} />)}</span>
          <button type="button" className="pz-flecha" onClick={() => irA(p + 1)} disabled={p >= pags.length - 1} aria-label="Página siguiente">›</button>
        </div>
      </section>

      <div className="pz-acciones">
        <button type="button" className="az-losa pz-regresar" onClick={regresar} disabled={!historia.length} title={historia.length ? "Deshacer el último cambio" : "Aún no hay cambios que regresar"}>
          <span className="az-losa-txt"><b>↶ Regresar</b></span>
        </button>
        <button type="button" className={"az-losa az-jugar pz-guardar" + (guarda ? " guarda" : "")} disabled={!sePuedeGuardar} onAnimationEnd={() => setGuarda(false)}
          onClick={() => { if (sePuedeGuardar) { onGuardar(figura); setGuardado(true); setGuarda(true); } }}>
          <span className="az-losa-txt"><b>{guardado ? "¡Guardado!" : "¡Guardar!"}</b></span>
        </button>
      </div>
      {mini.marco}
      {volteo && paginaAnterior && (
        <div className={"pz-volteo " + volteo} aria-hidden="true" onAnimationEnd={finVolteo}>
          <div className="pz-hoja" style={{ backgroundImage: `url(${paginaAnterior})` }} />
        </div>
      )}
    </div>
  );
}
