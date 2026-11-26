// «Crear mi personaje» (constructor básico, ALV_PLAN_PERSONAJES_NUEVO.md §2.3): 4 pestañas (Cabeza, Torso, Brazos y
// manos, Piernas), miniaturas que se ponen al tocarlas, colores de paletas cortas, «Regresar», «Guardar» y salir.
// Sin sliders ni ajustes técnicos. La figura se ve en 3D al lado (arriba en celular). Va dentro de <RaizDS>.
import { useEffect, useMemo, useRef, useState, type PointerEvent as PE } from "react";
import { Boton, Chip, Icono, Panel, Pestanas } from "../ds";
import { PALETAS, PALETA_DE_PARTE, piezasDe, planoConstructor, ponerPieza, teñir, type PiezaCons, type Piezas } from "./constructorDatos";
import { caben, paginas } from "./galeriaDatos";
import type { Catalogo } from "./plano";
import { PESTANAS_BASICO, type FiguraV3, type Parte } from "./tipos";
import { Vista3D } from "./Vista3D";
import "./galeria.css";
import "./constructor.css";

type Pestana = keyof typeof PESTANAS_BASICO;
const NOMBRE_PESTANA: Record<Pestana, string> = { cabeza: "Cabeza", torso: "Torso", brazos: "Brazos y manos", piernas: "Piernas" };
const NOMBRE_PARTE: Partial<Record<Parte, string>> = { cabeza: "Cabeza", cara: "Cara", cabello: "Pelo", torso: "Torso", brazos: "Brazos", manos: "Manos", cadera: "Cadera", piernas: "Piernas" };
const NOMBRE_PALETA = { piel: "Tono de piel", pelo: "Color de pelo", ropa: "Color" } as const;

export interface ConstructorProps {
  catalogo: Catalogo;
  piezas: Piezas;
  /** Figura con la que se abre (la del espacio, o una nueva desde la galería). */
  inicial: FiguraV3;
  escenaUrl: string;
  onGuardar: (figura: FiguraV3) => void;
  onSalir?: () => void;
}

export function Constructor({ catalogo, piezas, inicial, escenaUrl, onGuardar, onSalir }: ConstructorProps) {
  const [figura, setFigura] = useState(inicial);
  const [historia, setHistoria] = useState<FiguraV3[]>([]);
  const [pestana, setPestana] = useState<Pestana>("cabeza");
  const [parte, setParte] = useState<Parte>("cara");
  const [pagina, setPagina] = useState(0);
  const [caja, setCaja] = useState({ columnas: 3, filas: 2 });
  const [guardado, setGuardado] = useState(false);
  const rejilla = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rejilla.current;
    if (!el) return;
    const medir = () => setCaja(caben(el.clientWidth, el.clientHeight, { min: el.clientWidth < 520 ? 84 : 104, proporcion: 1.05, hueco: 8 }));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plano = useMemo(() => planoConstructor("yo", figura, catalogo, piezas), [figura, catalogo, piezas]);
  const lista = useMemo(() => piezasDe(piezas, parte), [piezas, parte]);
  const pags = useMemo(() => paginas(lista, caja.columnas * caja.filas), [lista, caja]);
  const p = Math.min(pagina, pags.length - 1);
  const puesta = figura.piezas[parte]?.id ?? null;
  const paleta = PALETA_DE_PARTE[parte];
  const tinte = paleta ? figura.piezas[parte]?.tintes?.[paleta] ?? null : null;
  const base = figura.origen.tipo === "catalogo" ? figura.origen.personaje : null;
  /** La pieza que se ve en esa parte: la elegida o, si no hay, la del personaje base. */
  const visible = (pz: PiezaCons) => pz.id === puesta || (!puesta && pz.donante === base);

  const cambiar = (nueva: FiguraV3) => {
    setHistoria(h => [...h.slice(-29), figura]);
    setFigura(nueva);
    setGuardado(false);
  };
  const elegirPestana = (id: string) => { const t = id as Pestana; setPestana(t); setParte(PESTANAS_BASICO[t][0]!); setPagina(0); };
  const elegirParte = (x: Parte) => { setParte(x); setPagina(0); };
  const regresar = () => setHistoria(h => { if (!h.length) return h; setFigura(h[h.length - 1]!); setGuardado(false); return h.slice(0, -1); });

  // Pasar de página deslizando de lado.
  const toque = useRef<{ x: number; y: number } | null>(null);
  const bajar = (e: PE) => { toque.current = { x: e.clientX, y: e.clientY }; };
  const subir = (e: PE) => {
    const s = toque.current; toque.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) setPagina(Math.max(0, Math.min(pags.length - 1, p + (dx < 0 ? 1 : -1))));
  };

  return (
    <div className="cons">
      <header className="gal-top cons-top">
        {onSalir && <button type="button" className="gal-atras" onClick={onSalir} aria-label="Salir"><Icono id="back" /></button>}
        <h1 className="dsp ol gal-titulo">Crear mi personaje</h1>
      </header>

      <Panel className="cons-vista">
        <Vista3D url={escenaUrl} plano={plano} alLlegar={null} className="gal-vista" />
      </Panel>

      <section className="cons-panel" aria-label="Piezas">
        <Pestanas nombre="Partes del personaje" activa={pestana} onCambio={elegirPestana}
          pestanas={(Object.keys(PESTANAS_BASICO) as Pestana[]).map(id => ({ id, texto: NOMBRE_PESTANA[id] }))} />
        {PESTANAS_BASICO[pestana].length > 1 && (
          <div className="gal-fila cons-partes">
            {PESTANAS_BASICO[pestana].map(x => <Chip key={x} texto={NOMBRE_PARTE[x] ?? x} seleccionado={parte === x} onClick={() => elegirParte(x)} />)}
          </div>
        )}
        {paleta && (
          <div className="cons-colores" role="group" aria-label={NOMBRE_PALETA[paleta]}>
            <span>{NOMBRE_PALETA[paleta]}</span>
            {PALETAS[paleta].map(c => (
              <button key={c.id} type="button" className={"cons-color" + (tinte === c.id ? " on" : "")} style={{ background: c.hex }}
                aria-label={c.nombre} aria-pressed={tinte === c.id} title={c.nombre} onClick={() => cambiar(teñir(figura, parte, paleta, c.id))} />
            ))}
          </div>
        )}
        <div className="gal-rejilla cons-rejilla" ref={rejilla} onPointerDown={bajar} onPointerUp={subir}
          style={{ gridTemplateColumns: `repeat(${caja.columnas}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${caja.filas}, minmax(0, 1fr))` }}>
          {pags[p]!.map(pz => (
            <div key={pz.id} className={"gal-tarj" + (visible(pz) ? " on" : "")}>
              <button type="button" className="gal-tarj-boton cons-pieza" onClick={() => cambiar(ponerPieza(figura, pz))} aria-pressed={visible(pz)}>
                <span className="gal-foto">
                  {pz.foto ? <img src={pz.foto} alt="" draggable={false} loading="lazy" /> : <span className="gal-ini dsp">{pz.glb ? pz.nombre.slice(0, 2).toUpperCase() : "—"}</span>}
                </span>
                <span className="gal-nombre dsp">{pz.glb ? pz.nombre : "Ninguno"}</span>
              </button>
            </div>
          ))}
          {!lista.length && <p className="gal-vacio">Todavía no hay piezas de este tipo.</p>}
        </div>
        <div className="gal-paginas">
          <button type="button" className="gal-flecha" onClick={() => setPagina(Math.max(0, p - 1))} disabled={p === 0} aria-label="Página anterior"><Icono id="back" /></button>
          <span className="gal-puntos" aria-label={`Página ${p + 1} de ${pags.length}`}>{pags.map((_, i) => <i key={i} className={i === p ? "on" : ""} />)}</span>
          <button type="button" className="gal-flecha der" onClick={() => setPagina(Math.min(pags.length - 1, p + 1))} disabled={p >= pags.length - 1} aria-label="Página siguiente"><Icono id="back" /></button>
        </div>
        <div className="cons-acciones">
          <Boton color="azul" texto="Regresar" icono="back" onClick={regresar} desactivado={!historia.length} />
          <Boton color="amarillo" texto={guardado ? "¡Guardado!" : "Guardar"} icono="play" onClick={() => { onGuardar(figura); setGuardado(true); }} />
        </div>
      </section>
    </div>
  );
}
