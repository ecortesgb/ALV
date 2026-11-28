// Tienda y recompensas ALV (Maestro v1.48, enfoque A; dirección visual: mockups de Elías del 18 nov).
// Etapa 1: pestañas Sobres y Colección y la apertura completa, en la demostración sin nube.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icono } from "../ds";
import { sonar } from "../app/sonido";
import { movimientoReducido } from "../app/preferencias";
import { ir } from "../app/rutas";
import { COMODINES, DORSO_SOBRE, MONEDAS_SI_TOPE, NOMBRE_SECCION, ORDEN_SECCIONES, PIEZAS_COLECCION, PROB_CUALQUIERA, SOBRES_ALV, SOBRES_PERSONAJES, TOPE_COMODIN,
  type RanuraSobre, type SobreAlv, type SobreVisual } from "../content/tienda";
import { ofertasPersonajes, type PersonajeEnVenta } from "../content/personajesTienda";
import { tarjetas, useCatalogoV3, type Tarjeta } from "../personajes/integracion";
import { NOMBRE_RAREZA } from "../content/rarezas";
import { ORDEN, type Apertura } from "../engine/sobresTienda";
import { usePiezas } from "../servicios/piezas";
import { abrirAlv, cargarTienda, marcarVistas, reponerComodin, useTienda } from "../servicios/tienda";
import { Apertura as VistaApertura, CartaFrente } from "./Apertura";
import { aviso, confirmar, Marco, urlArte } from "./comun";
import { infoPieza } from "./Desbloqueo";
import { miniatura } from "./Libro";
import { AlbumPersonajes } from "./AlbumPersonajes";
import { AlbumAccesorios } from "./AlbumAccesorios";
import { useRecursos } from "./Recursos";
import { arteHub, RecursosAzotea } from "./azotea/Cabecera";
import { useMomentoAzotea } from "./azotea/HubAzotea";
import "./perfil/perfil.css";
import "./tienda.css";

type Pestana = "sobres" | "coleccion";
const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: "sobres", nombre: "Sobres" }, { id: "coleccion", nombre: "Colección" },
];
export const srcArte = (n: string) => `${import.meta.env.BASE_URL}arte/${n}`;
const MONEDA = <img className="t-moneda" src={arteHub("moneda")} alt="" />;

export function Tienda() {
  const { puntos } = useRecursos();
  const momento = useMomentoAzotea();
  const fondo = urlArte("tienda/tienda-" + momento + ".webp");
  const t = useTienda();
  const catalogo = useCatalogoV3();
  const personajes = useMemo(() => new Map((catalogo ? tarjetas(catalogo.catalogo) : []).map(x => [x.id, x])), [catalogo]);
  const ofertasDemo = useMemo(() => ofertasPersonajes([...personajes.values()]), [personajes]);
  const mercado = catalogo ? (t.demo ? ofertasDemo : t.catalogoPersonajes) : null;
  const [pestana, setPestana] = useState<Pestana>("sobres");
  const [album, setAlbum] = useState<Album>("Cartas");
  const [abierto, setAbierto] = useState<{ sobre: SobreVisual; apertura: Apertura; deEspaldas: boolean } | null>(null);
  const contenido = useRef<HTMLDivElement>(null);
  useEffect(() => { void cargarTienda(); }, []);
  useEffect(() => {
    if (contenido.current) contenido.current.inert = !!abierto;
  }, [abierto]);
  const cambiar = (p: Pestana) => { if (pestana === "coleccion") marcarVistas(); sonar("clic"); setPestana(p); };

  return (
    <Marco clase="az t-tienda" fondo={<div className="t-fondo" aria-hidden="true" style={{ "--t-fondo": fondo } as CSSProperties} />}>
      <div className="t-raiz" ref={contenido} style={{ "--t-fondo": fondo } as CSSProperties}>
        <header className="t-cab">
          <button type="button" className="pf-atras t-atras" onClick={() => ir("inicio")} aria-label="Regresar al HUB"><span aria-hidden="true">◀</span>Atrás</button>
          <h1 className="t-titulo">Tienda</h1>
          <RecursosAzotea monedas={t.monedas} puntos={puntos} enTienda />
        </header>
        <nav className="t-pestanas" aria-label="Secciones de la tienda">
          {PESTANAS.map(p => (
            <button key={p.id} type="button" aria-pressed={pestana === p.id}
              className={"t-pestana" + (pestana === p.id ? " t-on" : "")} onClick={() => cambiar(p.id)}>
              {p.nombre}{p.id === "coleccion" && t.nuevas.size > 0 && <i className="t-punto" aria-label="nuevo" />}
            </button>
          ))}
        </nav>

        <section className="t-panel">
          {pestana === "sobres" && <Sobres mercado={mercado} alAbrir={(sobre, apertura, deEspaldas) => setAbierto({ sobre, apertura, deEspaldas })} />}
          {pestana === "coleccion" && <Coleccion mercado={mercado} personajes={personajes} album={album} setAlbum={setAlbum} />}
        </section>
        {t.demo && <p className="t-demo">Prueba local con monedas de demostración.</p>}
      </div>
      {abierto && <VistaApertura sobre={abierto.sobre} apertura={abierto.apertura} fondo={fondo} deEspaldas={abierto.deEspaldas} personajes={personajes}
        alOtro={() => setAbierto(null)} alColeccion={() => {
          const tipos = abierto.apertura.cartas.map(c => c.tipo);
          setAlbum(tipos.includes("personaje") ? "Personajes" : tipos.includes("accesorio") ? "Accesorios" : "Cartas");
          setAbierto(null); setPestana("coleccion");
        }} />}
    </Marco>
  );
}

// ---------- Sobres ----------
// Tienda v2 (Maestro v1.73): todos los sobres traen cualquier personaje; la portada de saga solo cambia el arte.
const CATEGORIAS = ["Normales", "Especiales", "Accesorios", "Personajes"] as const;
interface Vitrina { sobre: SobreAlv; nombre: string; arte: string; color: string; frase: string; logo?: string }
const vitrina = (id: string, cambios: Partial<Vitrina> = {}): Vitrina => {
  const s = SOBRES_ALV.find(x => x.id === id)!;
  return { sobre: s, nombre: s.nombre, arte: s.arte, color: s.color, frase: s.frase, ...cambios };
};
const VITRINAS: Record<(typeof CATEGORIAS)[number], Vitrina[]> = {
  Normales: [vitrina("basico"), vitrina("mixto"), vitrina("comodines")],
  Especiales: [vitrina("epico"), vitrina("comodines", { nombre: "Comodines · Ilusionista", arte: "sobre-comodines-especial.webp",
    frase: "Mismas cartas y probabilidades que el sobre de comodines." })],
  Accesorios: [vitrina("accesorios")],
  Personajes: SOBRES_PERSONAJES.map(p => vitrina("personajes", { nombre: p.nombre, arte: p.arte, color: p.color,
    frase: "Dos personajes de cualquier saga. La portada es de colección.", logo: p.id === "dc" ? undefined : p.id })),
};
const NOMBRE_RANURA: Record<RanuraSobre, string> = { personaje: "Personaje", accesorio: "Accesorio", comodin: "Comodín", cualquiera: "Al azar" };

function Sobres({ mercado, alAbrir }: { mercado: readonly PersonajeEnVenta[] | null;
  alAbrir: (s: SobreVisual, a: Apertura, deEspaldas: boolean) => void }) {
  const t = useTienda();
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Normales");
  const [i0, setI] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const lista = VITRINAS[categoria];
  const i = Math.min(i0, lista.length - 1);
  const v = lista[i]!, s = v.sobre;
  const precio = s.precio;
  const prototipo = !t.demo && (!t.catalogoAccesorios || !mercado);
  const [giro, setGiro] = useState(0);
  const deEspaldas = giro % 360 !== 0;
  const caras = useRef<HTMLSpanElement>(null);
  const toque = useRef<{ id: number; x: number } | null>(null);
  const omitirClic = useRef(false);
  const alcanza = t.monedas >= precio;
  const elegir = (siguiente: typeof categoria, indice: number) => {
    sonar("tic");
    setCategoria(siguiente);
    setI(indice);
    setGiro(0);
  };
  const mover = (d: number) => elegir(categoria, (i + d + lista.length) % lista.length);
  const voltear = (d = 1) => {
    sonar("voltear");
    setGiro(x => x + d * 180);
  };
  const soltar = () => {
    toque.current = null;
    caras.current?.removeAttribute("data-arrastre");
    caras.current?.style.removeProperty("--arrastre-sobre");
  };
  const quedan = useMemo(() => ({
    personajes: (mercado ?? []).filter(x => !t.personajes.has(x.id)).length,
    accesorios: (t.catalogoAccesorios ?? []).filter(x => !t.accesorios.has(x.id) && !t.personajes.has(x.donante)).length,
  }), [mercado, t.personajes, t.accesorios, t.catalogoAccesorios]);

  const comprar = async () => {
    if (prototipo || ocupado || !t.activa) return;
    if (!alcanza) { sonar("error"); aviso(`Te faltan ${precio - t.monedas} monedas. Gánalas jugando.`); return; }
    setOcupado(true);
    try {
      const ok = await confirmar({ titulo: "¿Comprar " + v.nombre + "?", texto: "Cuesta " + precio + " monedas. Te quedan " + (t.monedas - precio) + ".", si: "¡Comprar!", no: "Ahora no" });
      if (!ok) return;
      const r = await abrirAlv(s.id, mercado ?? []);
      if (typeof r === "string") { sonar("error"); aviso(r); return; }
      alAbrir({ color: v.color, nombre: v.nombre, arte: v.arte }, r, deEspaldas);
    } catch {
      sonar("error");
      aviso("No se pudo abrir el sobre. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  };
  const total = s.pesos.rara + s.pesos.epica + s.pesos.legendaria;
  const conRareza = s.ranuras.some(r => r !== "comodin");

  return (
    <>
    <nav className="t-categorias" aria-label="Tipos de sobres">
      {CATEGORIAS.map(c => <button key={c} type="button" disabled={ocupado} aria-pressed={c === categoria}
        onClick={() => elegir(c, 0)}>{c}</button>)}
    </nav>
    <div className="t-sobres" style={{ ["--c" as string]: v.color }}>
      <div className="t-escaparate">
        <div className="t-sobre-zona">
          {!prototipo && t.activa ? (
            <button type="button" className="t-precio t-precio-comprar" disabled={ocupado}
              aria-label={`Comprar ${v.nombre} por ${precio} monedas`} onClick={() => void comprar()}>
              Comprar <span>{MONEDA} {precio}</span>
            </button>
          ) : (
            <p className="t-precio">{prototipo ? "Vista previa" : "Compra no disponible"}</p>
          )}
          <button type="button" className="t-sobre-elige" disabled={ocupado}
            aria-label={`Girar ${v.nombre} ${deEspaldas ? "al frente" : "al reverso"}`}
            onClick={e => {
              if (e.detail !== 0 && omitirClic.current) return;
              voltear();
            }}
            onPointerDown={e => {
              if (!e.isPrimary || e.button !== 0) return;
              omitirClic.current = false;
              toque.current = { id: e.pointerId, x: e.clientX };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={e => {
              if (toque.current?.id !== e.pointerId) return;
              const dx = e.clientX - toque.current.x;
              omitirClic.current ||= Math.abs(dx) > 8;
              if (!omitirClic.current || movimientoReducido()) return;
              caras.current?.setAttribute("data-arrastre", "");
              caras.current?.style.setProperty("--arrastre-sobre", Math.max(-155, Math.min(155, dx * 2)) + "deg");
            }}
            onPointerUp={e => {
              if (toque.current?.id !== e.pointerId) return;
              const dx = e.clientX - toque.current.x;
              omitirClic.current ||= Math.abs(dx) > 8;
              if (Math.abs(dx) >= 44) voltear(Math.sign(dx));
              soltar();
            }}
            onLostPointerCapture={e => { if (toque.current?.id === e.pointerId) soltar(); }}>
            <span key={v.arte} className="t-portada">
              <span ref={caras} className="t-sobre-caras t-giro-exhibidor" style={{ "--giro-sobre": giro + "deg" } as CSSProperties}>
                <span className="t-sobre-cara">
                  <img className="t-sobre-img" src={srcArte("tienda/" + v.arte)} alt="" draggable={false} />
                  {v.logo && <span className="t-sobre-identidad">
                    <img src={srcArte(`tienda/sagas/${v.logo}.webp`)} alt="" draggable={false} />
                  </span>}
                </span>
                <img className="t-sobre-img t-sobre-cara t-sobre-dorso" src={srcArte("tienda/" + DORSO_SOBRE)} alt="" draggable={false} />
              </span>
            </span>
          </button>
          {lista.length > 1 && <>
            <button type="button" className="t-flecha t-izq" disabled={ocupado} onClick={() => mover(-1)} aria-label="Sobre anterior">‹</button>
            <button type="button" className="t-flecha t-der" disabled={ocupado} onClick={() => mover(1)} aria-label="Sobre siguiente">›</button>
          </>}
        </div>
      </div>

      <div className="t-lado">
        <div className="t-contenido">
          <h2>{v.nombre}</h2>
          <p className="t-frase">{v.frase}</p>
          <p className="t-edicion">{s.ranuras.length === 1 ? "1 carta" : s.ranuras.length + " cartas"}: {s.ranuras.map(r => NOMBRE_RANURA[r]).join(" + ")}</p>
        </div>
        <p className="t-edicion">Toca o arrastra el sobre para girarlo{lista.length > 1 && ` · ${i + 1} de ${lista.length}`}</p>
        {prototipo && <p className="t-precio-toque">Próximamente</p>}
        {ocupado && <p className="t-precio-toque" role="status">Un momento…</p>}
        {!prototipo && t.activa && !ocupado && !alcanza && <p className="t-precio-toque">Te faltan {precio - t.monedas} monedas</p>}
        <details key={categoria + i} className="t-contenido-posible">
          <summary>Contenido posible y probabilidades</summary>
          <ul className="t-tasas" aria-label="Probabilidades">
            {s.ranuras.includes("cualquiera") && <li><span><b>Tipo de carta</b><small>Cada carta al azar</small></span>
              <strong>Personaje {porcentaje(PROB_CUALQUIERA.personaje)} · Accesorio {porcentaje(PROB_CUALQUIERA.accesorio)} · Comodín {porcentaje(PROB_CUALQUIERA.comodin)}</strong></li>}
            {conRareza && ORDEN.map(r => <li key={r}><span><b>{NOMBRE_RAREZA[r]}</b><small>En cada personaje o accesorio</small></span>
              <strong>{porcentaje(s.pesos[r] / total)}</strong></li>)}
            {s.ranuras.some(r => r === "comodin" || r === "cualquiera") && <li><span><b>Cada comodín</b><small>{COMODINES.length} distintos</small></span>
              <strong>{porcentaje(1 / COMODINES.length)}</strong></li>}
          </ul>
          {s.minimo && <p className="t-garantia">Al menos una carta {NOMBRE_RAREZA[s.minimo].toLowerCase()} o mejor.</p>}
          <p className="t-tasas-nota">Personajes de todas las sagas. Nunca te sale un personaje o accesorio que ya tienes; si ya no quedan, sale el siguiente tipo de carta.
            {!prototipo && ` Te faltan ${quedan.personajes} personajes y ${quedan.accesorios} accesorios.`}</p>
          <p className="t-tasas-nota">Comodines: puedes recibir repetidos. Desde {TOPE_COMODIN} copias, otro igual se cambia por {MONEDAS_SI_TOPE} monedas.</p>
        </details>
      </div>
    </div>
    </>
  );
}
/** Paquete de momentos (no tiene miniatura). */
export const Momento = () => <span className="t-mom"><span className="t-mini-ico">💥</span><small>Momentos</small></span>;
export const ComodinIcono = ({ id, alterno }: { id: string; alterno: string }) =>
  <span className={"t-mini-ico t-ico-" + id} aria-hidden="true">{id === "turno" ? <Icono id="skip" /> : id === "cambio" ? "↻" : alterno}</span>;
const formatoTasa = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 2 });
const porcentaje = (p: number) => p > 0 && p < 0.0001 ? "< 0.01 %" : formatoTasa.format(Math.min(1, Math.max(0, p)));

// ---------- Colección ----------
type Album = "Cartas" | "Personajes" | "Accesorios";
function Coleccion({ mercado, personajes, album, setAlbum }: { mercado: readonly PersonajeEnVenta[] | null; personajes: ReadonlyMap<string, Tarjeta>;
  album: Album; setAlbum: (a: Album) => void }) {
  return <div className="t-coleccion">
    <nav className="t-album-nav" aria-label="Álbumes de colección">
      {(["Cartas", "Personajes", "Accesorios"] as const).map(nombre => <button key={nombre} type="button"
        aria-pressed={album === nombre} onClick={() => { sonar("tic"); setAlbum(nombre); }}>{nombre}</button>)}
    </nav>
    {album === "Cartas" ? <AlbumCartas /> : album === "Personajes" ? <AlbumPersonajes mercado={mercado} /> : <AlbumAccesorios personajes={personajes} />}
  </div>;
}

function AlbumCartas() {
  const p = usePiezas(), t = useTienda();
  const [seleccion, setSeleccion] = useState<(typeof COMODINES)[number] | null>(null);
  const detalle = useRef<HTMLDialogElement>(null);
  const [reponiendo, setReponiendo] = useState(false);
  // Tienda v2: cualquier comodín se compra directo, aunque nunca haya salido en un sobre (tope de copias).
  const precioReposicion = seleccion && (t.comodines[seleccion.id] ?? 0) < TOPE_COMODIN ? t.preciosReposicion[seleccion.id] : undefined;
  const reponer = async (carta: (typeof COMODINES)[number], precio: number) => {
    if (reponiendo) return;
    detalle.current?.close();
    setReponiendo(true);
    try {
      if (!await confirmar({ titulo: "¿Comprar " + carta.nombre + "?", texto: `Una copia cuesta ${precio} monedas.`, si: "Comprar", no: "Ahora no" })) return;
      const error = await reponerComodin(carta.id);
      if (error) aviso(error);
      else setSeleccion(carta);
    } catch {
      aviso("No se pudo comprar la carta. Revisa tu conexión.");
    } finally {
      setReponiendo(false);
    }
  };
  useEffect(() => {
    if (seleccion && !detalle.current?.open) detalle.current?.showModal();
  }, [seleccion]);
  const distintos = COMODINES.filter(c => (t.comodines[c.id] ?? 0) > 0).length;
  const tengo = PIEZAS_COLECCION.filter(x => p.tengo.has(x.id)).length;
  return (
    <>
      {p.activo && <div className="t-total">
        <span className="t-sfx">{tengo}</span><small>/ {PIEZAS_COLECCION.length}</small>
        <div className="t-barras">
          {ORDEN.map(r => {
            const todas = PIEZAS_COLECCION.filter(x => x.rareza === r), mias = todas.filter(x => p.tengo.has(x.id)).length;
            return <div key={r} className={"t-prob r-" + r}><span>{NOMBRE_RAREZA[r]}</span><i style={{ width: `${(mias / todas.length) * 100}%` }} /><b>{mias}/{todas.length}</b></div>;
          })}
        </div>
      </div>}

      <section className="t-album" aria-labelledby="titulo-album">
        <h2 id="titulo-album">Álbum de cartas</h2>
        <div className="t-album-cab">
          <h3>Comodines</h3>
          <p>{distintos} de {COMODINES.length} conseguidos</p>
        </div>
        <ul className="t-album-rejilla">
          {COMODINES.map(c => {
            const copias = t.comodines[c.id];
            return (
              <li key={c.id} className="t-album-ranura">
                <button type="button" className={"t-album-carta" + (copias ? "" : " t-bloqueada")} onClick={() => setSeleccion(c)}
                  aria-label={c.nombre + (copias ? ", " + copias + (copias === 1 ? " copia" : " copias") : ", por conseguir") + ". Ver carta"}>
                  <CartaFrente c={{ tipo: "comodin", id: c.id, especial: c.especial }} />
                  {copias ? <span className="t-album-copias" aria-hidden="true">×{copias}</span>
                    : <span className="t-album-candado" aria-hidden="true">🔒{t.preciosReposicion[c.id] ? ` ${t.preciosReposicion[c.id]}` : ""}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      {seleccion && <dialog ref={detalle} className="t-album-detalle" aria-label={seleccion.nombre}
        onClose={() => setSeleccion(null)} onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
        <div className={"t-album-carta" + (t.comodines[seleccion.id] ? "" : " t-bloqueada")}>
          <CartaFrente c={{ tipo: "comodin", id: seleccion.id, especial: seleccion.especial }} />
          {<span className="t-album-copias" aria-label={(t.comodines[seleccion.id] ?? 0) + " copias"}>×{t.comodines[seleccion.id] ?? 0}</span>}
        </div>
        {precioReposicion && <button type="button" className="t-ap-todas" disabled={reponiendo} onClick={() => void reponer(seleccion, precioReposicion)}>Comprar · {precioReposicion} {MONEDA}<span className="t-solo-lector"> monedas</span></button>}
        <button type="button" className="t-ap-todas" onClick={() => detalle.current?.close()}>Cerrar carta</button>
      </dialog>}

      {!p.activo && <p className="t-frase">Las piezas están disponibles en el personalizador.</p>}
      {p.activo && ORDEN_SECCIONES.map(sec => {
        const lista = PIEZAS_COLECCION.filter(x => x.seccion === sec).sort((a, b) => ORDEN.indexOf(a.rareza) - ORDEN.indexOf(b.rareza));
        if (!lista.length) return null;
        const mias = lista.filter(x => p.tengo.has(x.id)).length;
        return (
          <div key={sec} className="t-seccion">
            <h3>{NOMBRE_SECCION[sec]} <small>{mias}/{lista.length}</small></h3>
            <div className="t-rejilla t-rejilla-col">
              {lista.map(x => {
                const info = infoPieza(x.id), mia = p.tengo.has(x.id);
                return (
                  <div key={x.id} className={"t-mini r-" + x.rareza + (mia ? "" : " t-falta")} title={mia ? info.nombre : `${info.nombre}: sale en sobres`}>
                    {info.mini ? <img src={miniatura(info.mini)} alt="" loading="lazy" /> : <Momento />}
                    {!mia && <span className="t-candado" aria-label="Te falta">🔒</span>}
                    {t.nuevas.has(x.id) && <i className="t-punto" aria-label="nuevo" />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
