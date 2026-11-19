// Libro de cómic del personalizador: página izquierda con la figura viva; página derecha con viñetas.
// Elegir una viñeta pasa la página (animación de hoja); «Atrás» la regresa.
// Tres modos sobre la misma figura (plan de 3 modos, 2026-11-19): la primera página son las 3 tarjetas (Básico,
// Personaje original, Avanzado) y los separadores del canto cambian de modo en cualquier momento.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icono } from "../ds";
import { FiguraViva, apodoDe, type MandoFigura, type ZonaFigura } from "../app/figura3d";
import { sonar } from "../app/sonido";
import type { FiguraV2 } from "../content/personaje";
import { PaginaExtra } from "./Extras";
import { PanelDesbloqueo } from "./Desbloqueo";
import { usePiezas } from "../servicios/piezas";
import { PaginaSeccion } from "./Secciones";
import { PaginaModos, PasosBasico, Separadores } from "./Modos";
import { PaginaOriginal, tituloOriginal, type PaginaCatalogo } from "./Originales";

const nada = () => {};
const sinMando = { current: null };

export type ModoEditor = "basico" | "original" | "avanzado";
export type Seccion = "pelo" | "casco" | "cabeza" | "cuello" | "torso" | "brazos" | "manos" | "capa" | "cadera" | "piernas" | "botas";
export type Pagina = "modos" | "basico" | "avanzado" | "apariencia" | Seccion | "objetos" | "momentos" | "nombre" | "aleatorio" | "retos" | PaginaCatalogo;
/** Cada cambio de la figura pasa por aquí. `sinAviso`: cambios al azar, que no preguntan. */
export type Cambiar = (f: FiguraV2, op?: { sinAviso?: boolean }) => void;
/** Página donde empieza cada modo. */
export const RAIZ: Record<ModoEditor, Pagina> = { basico: "basico", original: "original", avanzado: "avanzado" };

export const miniatura = (mini: string) => `${import.meta.env.BASE_URL}arte/piezas/${mini}.webp`;

/** Viñetas de Apariencia. `basico`: nombre en modo Básico (si no está, la viñeta solo sale en Completo). */
export const APARIENCIA: { k: Seccion; nombre: string; basico?: string; zona: ZonaFigura; img: string }[] = [
  { k: "pelo", nombre: "Pelo", basico: "Pelo", zona: "pelo", img: "hair-012" },
  { k: "casco", nombre: "Casco", zona: "casco", img: "helm-011" },
  { k: "cabeza", nombre: "Cabeza", basico: "Cabeza", zona: "cabeza", img: "face-007" },
  { k: "cuello", nombre: "Cuello y capa", basico: "Accesorio", zona: "cuello_frente", img: "neck-002" },
  { k: "torso", nombre: "Torso", basico: "Torso completo", zona: "torso", img: "print-010" },
  { k: "brazos", nombre: "Brazos", zona: "brazos", img: "print-019" },
  { k: "manos", nombre: "Manos", zona: "manos", img: "sin-objeto" },
  { k: "cadera", nombre: "Cadera", zona: "cadera", img: "piernas-normal" },
  { k: "piernas", nombre: "Piernas", basico: "Piernas completas", zona: "piernas", img: "piernas-cortas" },
  { k: "botas", nombre: "Botas", zona: "botas", img: "con-botas" },
];
const TITULO: Record<string, string> = { modos: "¿Cómo la armas?", basico: "Básico", avanzado: "Avanzado", apariencia: "Piezas comunes", objetos: "Objetos", momentos: "Momentos", nombre: "Nombre", aleatorio: "Aleatorio", retos: "Retos" };
export function tituloDe(p: Pagina): string {
  const a = APARIENCIA.find(x => x.k === p);
  return a ? a.nombre : TITULO[p] ?? tituloOriginal(p as PaginaCatalogo);
}
export function zonaDe(p: Pagina): ZonaFigura {
  const a = APARIENCIA.find(x => x.k === p);
  return a ? (a.k === "torso" ? "torso" : a.zona) : p === "objetos" ? "objeto" : "completa";
}

// ---------- Viñetas ----------

export function Vineta({ titulo, img, dibujo, ancha, alta, onClick }: { titulo: string; img?: string | string[]; dibujo?: ReactNode; ancha?: boolean; alta?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={"p-vineta" + (ancha ? " ancha" : "") + (alta ? " alta" : "")} onClick={onClick}>
      <span className={"p-vineta-arte" + (Array.isArray(img) ? " tira" : "")} aria-hidden="true">
        {img ? [img].flat().map(m => <img key={m} src={miniatura(m)} alt="" draggable={false} />) : dibujo}
      </span>
      <span className="p-vineta-cap dsp">{titulo}</span>
    </button>
  );
}

/** Dibujos propios para las viñetas sin pieza: momentos, nombre y aleatorio. */
export const DibujoMomentos = () => (
  <svg viewBox="0 0 120 90"><path d="M60 6l9 20 22-8-10 20 24 6-22 10 14 18-23-4-4 22-12-18-14 16-2-22-23 2 15-17-20-12 23-4-8-21 21 9z" fill="#ffd23f" stroke="#0a1030" strokeWidth="3.5" strokeLinejoin="round" />
    <text x="60" y="54" textAnchor="middle" fontFamily="Bangers, Impact, sans-serif" fontSize="22" fill="#c91a09" stroke="#0a1030" strokeWidth="1">¡POW!</text></svg>
);
export const DibujoNombre = () => (
  <svg viewBox="0 0 120 90"><rect x="12" y="24" width="96" height="42" rx="6" fill="#fff" stroke="#0a1030" strokeWidth="3.5" transform="rotate(-4 60 45)" />
    <text x="60" y="56" textAnchor="middle" fontFamily="Bangers, Impact, sans-serif" fontSize="28" fill="#0a1030" transform="rotate(-4 60 45)">ABC</text></svg>
);
export const DibujoReto = () => (
  <svg viewBox="0 0 240 90"><g transform="rotate(-6 120 45)"><path d="M120 8l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z" fill="#ffd23f" stroke="#0a1030" strokeWidth="3.5" strokeLinejoin="round" />
    <text x="120" y="86" textAnchor="middle" fontFamily="Bangers, Impact, sans-serif" fontSize="17" fill="#0a1030">¡GANA PIEZAS!</text></g>
    <rect x="22" y="26" width="38" height="38" rx="6" fill="#fff" stroke="#0a1030" strokeWidth="3" transform="rotate(-10 41 45)" /><text x="41" y="53" textAnchor="middle" fontSize="20" transform="rotate(-10 41 45)">🔒</text>
    <rect x="180" y="26" width="38" height="38" rx="6" fill="#fff" stroke="#0a1030" strokeWidth="3" transform="rotate(8 199 45)" /><text x="199" y="53" textAnchor="middle" fontSize="20" transform="rotate(8 199 45)">★</text></svg>
);
export const DibujoDado = () => (
  <svg viewBox="0 0 120 90"><g transform="rotate(-12 60 45)"><rect x="32" y="17" width="56" height="56" rx="10" fill="#fff" stroke="#0a1030" strokeWidth="3.5" />
    {[[46, 31], [74, 31], [60, 45], [46, 59], [74, 59]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5.5" fill="#0a1030" />)}</g></svg>
);

// ---------- Contenido de cada página ----------

type Props = { pag: Pagina; modo: ModoEditor; figura: FiguraV2; ir: (p: Pagina) => void; elegirModo: (m: ModoEditor) => void; cambiar: Cambiar; setZona: (z: ZonaFigura | null) => void; mando: { current: MandoFigura | null }; capsula: number };
function Contenido({ pag, modo, figura, ir, elegirModo, cambiar, setZona, mando, capsula }: Props) {
  if (pag === "modos") return <PaginaModos modo={modo} elegir={elegirModo} ir={ir} />;
  if (pag === "basico") return <PasosBasico figura={figura} cambiar={cambiar} setZona={setZona} />;
  if (pag === "avanzado") return (
    <div className="p-vinetas p-vinetas-indice">
      <Vineta ancha alta titulo="Piezas comunes" img={["hair-021", "face-009", "print-019", "con-botas"]} onClick={() => ir("apariencia")} />
      <Vineta ancha alta titulo="Piezas originales" img={["traje-batman", "traje-spider-man", "traje-capitan-america", "traje-harry-potter"]} onClick={() => ir("originales")} />
      <Vineta titulo="Objetos" img="acc-002" onClick={() => ir("objetos")} />
      <Vineta titulo="Momentos" dibujo={<DibujoMomentos />} onClick={() => ir("momentos")} />
    </div>
  );
  if (pag === "apariencia") return (
    <div className="p-vinetas p-vinetas-completo">
      {APARIENCIA.map(a => <Vineta key={a.k} titulo={a.nombre} img={a.img} onClick={() => ir(a.k)} />)}
    </div>
  );
  if (APARIENCIA.some(a => a.k === pag)) return <PaginaSeccion k={pag as Seccion} modo="completo" figura={figura} cambiar={cambiar} setZona={setZona} />;
  if (["objetos", "momentos", "nombre", "aleatorio", "retos"].includes(pag)) return <PaginaExtra pag={pag as "objetos" | "momentos" | "nombre" | "aleatorio" | "retos"} figura={figura} cambiar={cambiar} mando={mando} capsula={capsula} />;
  return <PaginaOriginal pag={pag as PaginaCatalogo} figura={figura} cambiar={cambiar} ir={ir} />;
}

// ---------- Hoja que da vuelta ----------

const DURA = 620; // ms; igual que .p-hoja en personalizador.css
type Hoja = { arriba: Pagina; abajo: Pagina; dir: "ida" | "vuelta"; n: number };
const sinMovimiento = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Una cara de la página derecha: título de la sección y su contenido. */
function Cara({ viva, alVolver, ...props }: Props & { viva: boolean; alVolver: () => void }) {
  const { pag } = props;
  const h = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (viva) h.current?.focus({ preventScroll: true }); }, [viva, pag]);
  return (
    <div className="p-cara">
      <div className="p-cara-cab">
        <button type="button" className="p-atras" onClick={alVolver} aria-label={pag === "modos" ? "Cerrar el libro" : "Atrás"} tabIndex={viva ? 0 : -1}><Icono id="back" /></button>
        <h2 ref={h} tabIndex={-1} className="p-cara-titulo dsp">{tituloDe(pag)}</h2>
      </div>
      <div className="p-cara-cuerpo"><Contenido {...props} /></div>
    </div>
  );
}

// ---------- Libro ----------

export function Libro({ vez, capsula, etiqueta, figura, semilla, cambiar, soltado, guardado, modo, setModo, alCerrar, abriendo, tapa, regresar, pasos }: {
  vez: number; /** Espacio que se edita (1 a 3). */ capsula: number; etiqueta: string; figura: FiguraV2; semilla?: number; cambiar: Cambiar;
  /** Deshace el último paso (null si no hay a dónde regresar). */ regresar: (() => void) | null; /** Pasos guardados para regresar. */ pasos: number;
  /** La figura sin su traje de personaje (se ve igual; no cuenta como cambio del jugador). */ soltado: (f: FiguraV2) => void;
  /** Texto del último guardado («Guardado»), o null. */ guardado: string | null;
  modo: ModoEditor; setModo: (m: ModoEditor) => void; alCerrar: () => void; abriendo: boolean; tapa: ReactNode;
}) {
  const [pila, setPila] = useState<Pagina[]>(["modos"]);
  const [hoja, setHoja] = useState<Hoja | null>(null);
  const mando = useRef<MandoFigura | null>(null);
  const [zonaLado, setZonaLado] = useState<ZonaFigura | null>(null);
  // Figuras hechas con el taller anterior pueden traer un traje de personaje encima: se suelta (se ve igual) para que su
  // ropa se pueda editar.
  const tieneTraje = !!(figura.traje as { id?: string | null } | undefined)?.id;
  useEffect(() => {
    if (!tieneTraje) return;
    let vivo = true;
    void mando.current?.pedir("soltar", { figura }).then(g => { if (vivo && g) soltado(g); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tieneTraje, vez]);
  const top = pila[pila.length - 1]!;
  const n = useRef(0);
  useEffect(() => { setPila(["modos"]); setHoja(null); }, [vez]);
  useEffect(() => { if (!hoja) return; const t = setTimeout(() => setHoja(null), DURA); return () => clearTimeout(t); }, [hoja]);
  const ir = (p: Pagina) => {
    if (hoja) return;
    sonar("clic");
    if (!sinMovimiento()) setHoja({ arriba: top, abajo: p, dir: "ida", n: ++n.current });
    setPila(s => [...s, p]);
  };
  /** Elegir un modo (tarjeta o separador): la hoja da vuelta hacia el inicio de ese modo. */
  const elegirModo = (m: ModoEditor) => {
    if (hoja) return;
    sonar("clic"); setModo(m);
    const destino = RAIZ[m];
    if (top === destino) return;
    if (!sinMovimiento()) setHoja({ arriba: top, abajo: destino, dir: "ida", n: ++n.current });
    setPila(["modos", destino]);
  };
  const volver = () => {
    if (hoja) return;
    if (pila.length <= 1) { alCerrar(); return; }
    sonar("clic");
    const antes = pila[pila.length - 2]!;
    if (!sinMovimiento()) setHoja({ arriba: antes, abajo: top, dir: "vuelta", n: ++n.current });
    setPila(s => s.slice(0, -1));
  };
  // Botón Pose: la figura hace sus momentos por turnos (ganar, anotar, esperar), según el estilo que lleva.
  const nPose = useRef(0);
  const pose = () => {
    const m = (figura.momentos ?? {}) as { victoria?: string; punto?: string; espera?: string };
    const lista = [m.victoria ?? "salto-puno", m.punto ?? "puno-arriba", m.espera ?? "respirar"];
    sonar("poder"); mando.current?.probar(lista[nPose.current++ % lista.length]!);
  };
  const apodo = apodoDe(figura);
  const piezas = usePiezas();
  // Mientras la hoja de regreso viaja, abajo se sigue viendo la página que se deja.
  const base = hoja ? hoja.abajo : top;
  const zona = zonaLado ?? zonaDe(top);
  return (
    <div className={"p-libro" + (abriendo ? " abriendo" : "")}>
      <PanelDesbloqueo alIrARetos={() => ir("retos")} />
      <div className="p-libro-barra">
        {/* En celular la página derecha queda abajo: este «Atrás» siempre está a la vista. */}
        <button type="button" className="p-atras p-atras-barra" onClick={volver} aria-label={top === "modos" ? "Cerrar el libro" : "Atrás"}><Icono id="back" /></button>
        {guardado && <span className="p-guardado" role="status">✓ {guardado}</span>}
        {piezas.activo && <span className="p-xp" title={piezas.demo ? "XP de demostración" : "XP para gastar"}>★ {piezas.xp.toLocaleString("es-MX")} XP</span>}
        <button type="button" className="p-regresar" onClick={() => { if (regresar) { sonar("clic"); regresar(); } }} disabled={!regresar}
          aria-label={`Regresar al paso anterior${pasos ? ` (${pasos})` : ""}`} title="Deshace el último cambio">↶ Regresar{pasos ? <small>{pasos}</small> : null}</button>
      </div>
      <div className="p-hojas">
        <section className="p-pag p-pag-izq" aria-label="Tu figura">
          <span className="p-pag-etiqueta dsp">{etiqueta}</span>
          <FiguraViva figura={figura} semilla={semilla} zona={zona} mando={mando} />
          <div className="p-mandos" role="group" aria-label="Mover la figura">
            <button type="button" onClick={() => mando.current?.girar(-0.8)} aria-label="Girar a la izquierda">⟲</button>
            <button type="button" onClick={() => mando.current?.acercar(0.8)} aria-label="Alejar">−</button>
            <button type="button" onClick={() => mando.current?.acercar(1.25)} aria-label="Acercar">+</button>
            <button type="button" onClick={() => mando.current?.girar(0.8)} aria-label="Girar a la derecha">⟳</button>
            <button type="button" className="p-pose" onClick={pose} aria-label="Hacer una pose">¡Pose!</button>
          </div>
          {apodo && <span className="p-placa p-sfx" aria-label={`Apodo: ${apodo}`}>{apodo}</span>}
          <span className="p-pista">Arrastra para girar · pellizca o usa la rueda para acercar</span>
        </section>
        <section className="p-pag p-pag-der" aria-live="polite">
          <Separadores modo={top === "modos" ? null : modo} elegir={elegirModo} />
          <Cara pag={base} modo={modo} figura={figura} ir={ir} elegirModo={elegirModo} cambiar={cambiar} setZona={setZonaLado} mando={mando} capsula={capsula} viva={!hoja || hoja.dir === "ida"} alVolver={volver} />
          {hoja && (
            <div key={hoja.n} className={"p-hoja " + hoja.dir} aria-hidden="true" {...{ inert: "" }}>
              <div className="p-hoja-frente"><Cara pag={hoja.arriba} modo={modo} figura={figura} ir={nada} elegirModo={nada} cambiar={nada} setZona={nada} mando={sinMando} capsula={capsula} viva={false} alVolver={nada} /></div>
              <div className="p-hoja-reverso" />
            </div>
          )}
          {abriendo && <div className="p-tapa" aria-hidden="true">{tapa}</div>}
        </section>
      </div>
    </div>
  );
}
