// «Crear mi personaje» (constructor básico) con el diseño A2 aprobado por Elías (ALV_DISENO_PERSONALIZADOR.md §0):
// mismas piezas que el HUB y el lobby (losas .az-losa, ¡Guardar! como .az-jugar, «Atrás» .pf-atras, panel .lb-panel,
// gestos redondos .mg-b). 4 losas: Cabeza (cara, pelo, piel), Torso, Brazos (brazos, manos), Piernas (cadera, piernas).
// Va dentro de <RaizDS className="az">. Escenario elegido por Elías (ALV_ESCENARIOS_PERSONALIZADOR.md): página de cómic.
// La figura va en la viñeta grande (líneas de acción y trama); las losas, el panel y ¡Guardar! en la de al lado. Entrada:
// la página del HUB se voltea; «Atrás»: se voltea de regreso y luego sale. Arte final de Elías en arte/personalizar/; sin
// él queda el boceto en CSS.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PE } from "react";
import { PALETAS, PALETA_DE_PARTE, piezasDe, planoConstructor, ponerPieza, teñir, type PiezaCons, type Piezas } from "./constructorDatos";
import { caben, paginas } from "./galeriaDatos";
import type { Catalogo } from "./plano";
import { PESTANAS_BASICO, type FiguraV3, type Parte } from "./tipos";
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

const GESTOS = [
  { cual: "saludar", txt: "Saludar", c1: "#5ad1ff", c2: "#1d6fd6" },
  { cual: "victoria", txt: "Ganar", c1: "#ffd84a", c2: "#e08a00" },
  { cual: "derrota", txt: "Perder", c1: "#b9a7ff", c2: "#5a3fc0" },
  { cual: "especial", txt: "Especial", c1: "#ff7ad9", c2: "#c21d8f" },
] as const;
// Mismos trazos que el menú de gestos del HUB (pantallas/gestos/MenuGestos.tsx).
function DibujoGesto({ cual }: { cual: string }) {
  const c = { fill: "#fff", stroke: "#1a1440", strokeWidth: 1.6, strokeLinejoin: "round" as const };
  if (cual === "saludar") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M8 21c-2.6-1.6-4-4.2-4-7.2V8.4a1.4 1.4 0 0 1 2.8 0V12h.6V4.8a1.4 1.4 0 0 1 2.8 0V11h.6V3.6a1.4 1.4 0 0 1 2.8 0V11h.6V5a1.4 1.4 0 0 1 2.8 0v8.4c0 4.3-2.7 8.1-7 8.1-.7 0-1.4-.2-2-.5Z" /></svg>;
  if (cual === "victoria") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M7 3h10v3h3.5c0 3.6-1.9 5.8-4.6 6.2A5 5 0 0 1 13 15v2.5h3V21H8v-3.5h3V15a5 5 0 0 1-2.9-2.8C5.4 11.8 3.5 9.6 3.5 6H7Z" /></svg>;
  if (cual === "derrota") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M12 2.5c4.7 0 8 3.2 8 7.6 0 2.6-1.2 4.4-3 5.4V19a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19v-3.5c-1.8-1-3-2.8-3-5.4 0-4.4 3.3-7.6 8-7.6Z" /><circle cx="9" cy="11" r="1.9" fill="#1a1440" /><circle cx="15" cy="11" r="1.9" fill="#1a1440" /><path d="M10 20.4v-2.6M14 20.4v-2.6" stroke="#1a1440" strokeWidth="1.4" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...c} d="M12 1.8 14.3 9.7 22.2 12 14.3 14.3 12 22.2 9.7 14.3 1.8 12 9.7 9.7Z" /><path {...c} d="M19 2.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" /></svg>;
}

export interface ConstructorProps {
  catalogo: Catalogo;
  piezas: Piezas;
  inicial: FiguraV3;
  escenaUrl: string;
  onGuardar: (figura: FiguraV3) => void;
  onSalir?: () => void;
  /** Imagen de la página que se voltea al entrar y al salir (el HUB). null = sin volteo. */
  paginaAnterior?: string | null;
}

const sinMovimiento = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Constructor({ catalogo, piezas, inicial, escenaUrl, onGuardar, onSalir, paginaAnterior = `${ARTE}azotea-pedestal-noche-1920.webp` }: ConstructorProps) {
  const [figura, setFigura] = useState(inicial);
  const [historia, setHistoria] = useState<FiguraV3[]>([]);
  const [pestana, setPestana] = useState<Pestana>("cabeza");
  const [parte, setParte] = useState<Parte>("cara");
  const [pagina, setPagina] = useState(0);
  const [caja, setCaja] = useState({ columnas: 4, filas: 2 });
  const [guardado, setGuardado] = useState(false);
  const [momento, setMomento] = useState<{ cual: string; n: number } | null>(null);
  /** El último plano se armó bien (si no, no se deja guardar). null = armando. */
  const [armado, setArmado] = useState<boolean | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const rejilla = useRef<HTMLDivElement>(null);
  /** Volteo de página: "entra" (el HUB se va), "sale" (el HUB regresa y luego onSalir), null = quieto. */
  const [volteo, setVolteo] = useState<"entra" | "sale" | null>(() => (paginaAnterior && !sinMovimiento() ? "entra" : null));
  /** La primera figura entra con su saltito; las demás no hacen nada al cambiar una pieza. */
  const [llego, setLlego] = useState(false);
  const salir = () => { if (!onSalir) return; if (!paginaAnterior || sinMovimiento()) onSalir(); else setVolteo("sale"); };
  const finVolteo = () => { if (volteo === "sale") onSalir?.(); else setVolteo(null); };

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
  const lista = useMemo(() => piezasDe(piezas, parte, figura.familia), [piezas, parte, figura.familia]);
  const pags = useMemo(() => paginas(lista, caja.columnas * caja.filas), [lista, caja]);
  const p = Math.min(pagina, pags.length - 1);
  const puesta = figura.piezas[parte]?.id ?? null;
  const paleta = PALETA_DE_PARTE[parte];
  const tinte = paleta ? figura.piezas[parte]?.tintes?.[paleta] ?? null : null;
  const base = figura.origen.tipo === "catalogo" ? figura.origen.personaje : null;
  const visible = (pz: PiezaCons) => pz.id === puesta || (!puesta && pz.donante === base);
  const losa = LOSAS.find(l => l.id === pestana)!;

  const cambiar = (nueva: FiguraV3) => { setHistoria(h => [...h.slice(-29), figura]); setFigura(nueva); setGuardado(false); setArmado(null); };
  // Si una pieza no encaja, la escena conserva la figura anterior: aquí se regresa ese paso y se avisa (Codex O2).
  const alArmar = (ok: boolean, errores: string[]) => {
    setLlego(true);
    if (ok) { setArmado(true); return; }
    setAviso("Esa pieza no le queda a tu figura.");
    console.warn("pieza rechazada:", errores);
    setHistoria(h => { if (h.length) setFigura(h[h.length - 1]!); return h.slice(0, -1); });
    setArmado(true);
  };
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 2600); return () => clearTimeout(t); }, [aviso]);
  const elegirLosa = (t: Pestana) => { setPestana(t); setParte(SUBPARTES[t][0]!); setPagina(0); };
  const elegirParte = (x: Parte) => { setParte(x); setPagina(0); };
  const regresar = () => setHistoria(h => { if (!h.length) return h; setFigura(h[h.length - 1]!); setGuardado(false); return h.slice(0, -1); });
  const gesto = (cual: string) => setMomento(m => ({ cual, n: (m?.n ?? 0) + 1 }));

  // Pasar de página deslizando de lado (como el carrusel del lobby).
  const toque = useRef<{ x: number; y: number } | null>(null);
  const bajar = (e: PE) => { toque.current = { x: e.clientX, y: e.clientY }; };
  const subir = (e: PE) => {
    const s = toque.current; toque.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) setPagina(Math.max(0, Math.min(pags.length - 1, p + (dx < 0 ? 1 : -1))));
  };

  return (
    <div className="pz">
      <div className="pz-fondo" aria-hidden="true" />
      <div className="pz-vin pz-vin-accion" aria-hidden="true" style={{ "--arte-h": `url(${ARTE}personalizar/comic-accion-horizontal.webp)`, "--arte-v": `url(${ARTE}personalizar/comic-accion-vertical.webp)` } as CSSProperties} />
      <div className="pz-vin pz-vin-piezas" aria-hidden="true" />
      <header className="pz-top">
        {onSalir && <button type="button" className="pf-atras" onClick={salir}><span aria-hidden="true">◀</span>Atrás</button>}
        <div className="pz-placa">Crear mi personaje</div>
      </header>

      <div className="pz-escena">
        <p className="pz-cartela" aria-hidden="true">Mientras tanto, en el vestidor…</p>
        <Vista3D url={escenaUrl} plano={plano} alLlegar={llego ? null : "entrada"} className="pz-vista" momento={momento} onArmado={alArmar} />
        {aviso && <div className="pz-aviso" role="status">{aviso}</div>}
        <div className="mg mg-fila pz-gestos" role="group" aria-label="Probar tu figura">
          {GESTOS.map(g => (
            <button key={g.cual} type="button" className="mg-b" style={{ "--c1": g.c1, "--c2": g.c2 } as CSSProperties} onClick={() => gesto(g.cual)}>
              <span className="mg-ico"><DibujoGesto cual={g.cual} /></span><span className="mg-txt dsp">{g.txt}</span>
            </button>
          ))}
        </div>
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
        <div className="pz-rejilla" ref={rejilla} onPointerDown={bajar} onPointerUp={subir}
          style={{ gridTemplateColumns: `repeat(${caja.columnas}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${caja.filas}, minmax(0, 1fr))` }}>
          {pags[p]!.map(pz => (
            <button key={pz.id} type="button" className={"pz-pieza" + (visible(pz) ? " on" : "")} aria-pressed={visible(pz)} onClick={() => cambiar(ponerPieza(figura, pz))}>
              {pz.foto ? <img src={pz.foto} alt="" draggable={false} loading="lazy" /> : <span className="pz-sin" aria-hidden="true">—</span>}
              <span>{pz.glb ? pz.nombre : "Ninguno"}</span>
            </button>
          ))}
          {!lista.length && <p className="pz-vacio">Todavía no hay piezas de este tipo.</p>}
        </div>
        <div className="pz-paginas">
          <button type="button" className="pz-flecha" onClick={() => setPagina(Math.max(0, p - 1))} disabled={p === 0} aria-label="Página anterior">‹</button>
          <span className="pz-puntos" aria-label={`Página ${p + 1} de ${pags.length}`}>{pags.map((_, i) => <i key={i} className={i === p ? "on" : ""} />)}</span>
          <button type="button" className="pz-flecha" onClick={() => setPagina(Math.min(pags.length - 1, p + 1))} disabled={p >= pags.length - 1} aria-label="Página siguiente">›</button>
        </div>
      </section>

      <div className="pz-acciones">
        <button type="button" className="az-losa pz-regresar" onClick={regresar} disabled={!historia.length} style={{ "--c1": "#6fb6ff", "--c2": "#1f5fd6", "--lab": "#123e9c" } as CSSProperties}>
          <span className="az-losa-txt"><b>↶ Regresar</b></span>
        </button>
        <button type="button" className="az-losa az-jugar pz-guardar" disabled={armado !== true} onClick={() => { if (armado === true) { onGuardar(figura); setGuardado(true); } }}>
          <span className="az-losa-txt"><b>{guardado ? "¡Guardado!" : "¡Guardar!"}</b></span>
        </button>
      </div>
      {volteo && paginaAnterior && (
        <div className={"pz-volteo " + volteo} aria-hidden="true" onAnimationEnd={finVolteo}>
          <div className="pz-hoja" style={{ backgroundImage: `url(${paginaAnterior})` }} />
        </div>
      )}
    </div>
  );
}
