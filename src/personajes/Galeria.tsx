// Galería «Elegir personaje» (ALV_PLAN_PERSONAJES_NUEVO.md §2.2 y wireframes). Va dentro de <RaizDS>.
// Lista a la izquierda (páginas que se pasan de lado, sin bajar) y ficha con el personaje en 3D a la derecha; en
// celular la ficha sube desde abajo. El 3D es el iframe de tools/personajes/escena.html: aquí solo se le mandan planos.
import { useEffect, useMemo, useRef, useState, type PointerEvent as PE } from "react";
import { Boton, Chip, Icono, Panel } from "../ds";
import { deCatalogo } from "./figura";
import { SIN_FILTRO, caben, categorias, filtrar, guardarFavoritos, leerFavoritos, nombreSaga, paginas, tarjetas, type Filtro, type Tarjeta } from "./galeriaDatos";
import { resolver, type Catalogo } from "./plano";
import { Vista3D } from "./Vista3D";
import type { FiguraV3, Id } from "./tipos";
import "./galeria.css";

export interface GaleriaProps {
  catalogo: Catalogo;
  /** Ids que vienen de fichas de prueba (se marcan). */
  pruebas?: ReadonlySet<Id>;
  jugador: string;
  /** URL de la escena 3D de personajes. */
  escenaUrl: string;
  /** Personaje que ya usa el jugador (se marca en la lista). */
  actual?: Id | null;
  onUsar: (figura: FiguraV3, t: Tarjeta) => void;
  onPersonalizar?: (figura: FiguraV3, t: Tarjeta) => void;
  /** Qué familias se pueden personalizar (las que tienen piezas). Sin esto, todas. */
  personalizable?: (familia: Id) => boolean;
  onSalir?: () => void;
}

const iniciales = (n: string) => n.split(/\s+/).map(p => p[0]).join("").slice(0, 2).toUpperCase();

export function Galeria({ catalogo, pruebas, jugador, escenaUrl, actual, onUsar, onPersonalizar, personalizable, onSalir }: GaleriaProps) {
  const todas = useMemo(() => tarjetas(catalogo, { conBorradores: !!pruebas?.size, pruebas }), [catalogo, pruebas]);
  const [favs, setFavs] = useState(() => leerFavoritos(jugador));
  const [filtro, setFiltro] = useState<Filtro>(SIN_FILTRO);
  const [elegido, setElegido] = useState<Id | null>(actual ?? null);
  const [abierta, setAbierta] = useState(false); // ficha en celular
  const [pagina, setPagina] = useState(0);
  const [hecho, setHecho] = useState<Id | null>(null);
  const [caja, setCaja] = useState({ columnas: 3, filas: 2 });
  const rejilla = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rejilla.current;
    if (!el) return;
    // En celular tarjetas más chicas (3 columnas); en pantallas anchas, más grandes.
    const medir = () => setCaja(caben(el.clientWidth, el.clientHeight, { min: el.clientWidth < 520 ? 98 : 124, proporcion: 1.28, hueco: 10 }));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cats = useMemo(() => categorias(todas, favs), [todas, favs]);
  const lista = useMemo(() => filtrar(todas, filtro, favs), [todas, filtro, favs]);
  const pags = useMemo(() => paginas(lista, caja.columnas * caja.filas), [lista, caja]);
  const p = Math.min(pagina, pags.length - 1);
  useEffect(() => { setPagina(0); }, [filtro]);
  useEffect(() => { if (!elegido && lista[0]) setElegido(lista[0].id); }, [lista, elegido]);
  const t = todas.find(x => x.id === elegido) ?? null;
  const planoFicha = useMemo(() => { const en = elegido ? catalogo.get(elegido) : null; return en ? resolver("ficha", deCatalogo(en.ficha), catalogo) : null; }, [elegido, catalogo]);

  const alternarFav = (id: Id) => setFavs(prev => {
    const s = new Set(prev);
    if (s.has(id)) s.delete(id); else s.add(id);
    guardarFavoritos(jugador, s);
    return s;
  });
  const elegir = (id: Id) => { setElegido(id); setAbierta(true); setHecho(null); };
  const usar = () => {
    if (!t) return;
    const en = catalogo.get(t.id);
    if (!en) return;
    onUsar(deCatalogo(en.ficha), t);
    setHecho(t.id);
  };

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
    <div className={"gal" + (abierta ? " gal-ficha-abierta" : "")}>
      <header className="gal-top">
        {onSalir && <button type="button" className="gal-atras" onClick={onSalir} aria-label="Regresar"><Icono id="back" /></button>}
        <h1 className="dsp ol gal-titulo">Elegir personaje</h1>
        <span className="gal-cuenta">{lista.length} de {todas.length}</span>
      </header>

      <nav className="gal-filtros" aria-label="Filtros">
        <div className="gal-fila">
          {cats.map(c => <Chip key={c.id} texto={c.id === "favoritos" ? `★ ${c.nombre}` : c.nombre} seleccionado={filtro.categoria === c.id} onClick={() => setFiltro(f => ({ ...f, categoria: c.id }))} />)}
        </div>
        <div className="gal-fila">
          <Chip texto="Héroes" seleccionado={filtro.bando === "heroe"} onClick={() => setFiltro(f => ({ ...f, bando: f.bando === "heroe" ? null : "heroe" }))} />
          <Chip texto="Villanos" seleccionado={filtro.bando === "villano"} onClick={() => setFiltro(f => ({ ...f, bando: f.bando === "villano" ? null : "villano" }))} />
          <span className="gal-sep" aria-hidden="true" />
          <Chip texto="Normal" seleccionado={filtro.tamano === "normal"} onClick={() => setFiltro(f => ({ ...f, tamano: f.tamano === "normal" ? null : "normal" }))} />
          <Chip texto="Grande" seleccionado={filtro.tamano === "grande"} onClick={() => setFiltro(f => ({ ...f, tamano: f.tamano === "grande" ? null : "grande" }))} />
        </div>
      </nav>

      <section className="gal-lista" aria-label="Personajes">
        <div className="gal-rejilla" ref={rejilla} onPointerDown={bajar} onPointerUp={subir}
          style={{ gridTemplateColumns: `repeat(${caja.columnas}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${caja.filas}, minmax(0, 1fr))` }}>
          {pags[p]!.map(x => (
            <div key={x.id} className={"gal-tarj" + (x.id === elegido ? " on" : "") + (x.id === actual ? " usado" : "")}>
              <button type="button" className="gal-tarj-boton" onClick={() => elegir(x.id)} aria-pressed={x.id === elegido}>
                <span className="gal-foto">
                  {x.foto ? <img src={x.foto} alt="" draggable={false} loading="lazy" /> : <span className="gal-ini dsp">{iniciales(x.nombre)}</span>}
                </span>
                <span className="gal-nombre dsp">{x.nombre}</span>
                {x.prueba && <span className="gal-prueba">prueba</span>}
              </button>
              <button type="button" className={"gal-estrella" + (favs.has(x.id) ? " on" : "")} onClick={() => alternarFav(x.id)}
                aria-label={(favs.has(x.id) ? "Quitar de favoritos: " : "Agregar a favoritos: ") + x.nombre} aria-pressed={favs.has(x.id)}>
                <Icono id="star" />
              </button>
            </div>
          ))}
          {!lista.length && <p className="gal-vacio">No hay personajes con estos filtros.</p>}
        </div>
        <div className="gal-paginas">
          <button type="button" className="gal-flecha" onClick={() => setPagina(Math.max(0, p - 1))} disabled={p === 0} aria-label="Página anterior"><Icono id="back" /></button>
          <span className="gal-puntos" aria-label={`Página ${p + 1} de ${pags.length}`}>
            {pags.map((_, i) => <i key={i} className={i === p ? "on" : ""} />)}
          </span>
          <button type="button" className="gal-flecha der" onClick={() => setPagina(Math.min(pags.length - 1, p + 1))} disabled={p >= pags.length - 1} aria-label="Página siguiente"><Icono id="back" /></button>
        </div>
      </section>

      <Panel className="gal-ficha" como="section">
        <button type="button" className="gal-cerrar" onClick={() => setAbierta(false)} aria-label="Cerrar ficha"><Icono id="back" /></button>
        <Vista3D url={escenaUrl} plano={planoFicha} />
        {t ? (
          <div className="gal-datos">
            <div className="gal-cabeza">
              <div>
                <h2 className="dsp ol">{t.nombre}</h2>
                <p>{nombreSaga(t.saga)} · {t.tamano === "grande" ? "Grande" : "Minifigura"}{t.bando === "villano" ? " · Villano" : ""}</p>
              </div>
              <button type="button" className={"gal-estrella grande" + (favs.has(t.id) ? " on" : "")} onClick={() => alternarFav(t.id)}
                aria-label={favs.has(t.id) ? "Quitar de favoritos" : "Agregar a favoritos"} aria-pressed={favs.has(t.id)}><Icono id="star" /></button>
            </div>
            <div className="gal-acciones">
              <Boton color="amarillo" texto={hecho === t.id || actual === t.id ? "¡Es tu personaje!" : "Usar"} icono="play" onClick={usar} />
              {onPersonalizar && (!personalizable || personalizable(t.familia)
                ? <Boton color="azul" texto="Personalizar" icono="shirt" onClick={() => { const en = catalogo.get(t.id); if (en) onPersonalizar(deCatalogo(en.ficha), t); }} />
                : <span className="gal-nota">{t.nombre} todavía no se puede personalizar: aún no hay piezas de su tamaño.</span>)}
            </div>
          </div>
        ) : <p className="gal-vacio">Elige un personaje.</p>}
      </Panel>
    </div>
  );
}
