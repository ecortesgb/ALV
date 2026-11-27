// Tienda y recompensas ALV (Maestro v1.48, enfoque A; dirección visual: mockups de Elías del 18 nov).
// Etapa 1: pestañas Sobres y Colección y la apertura completa, en la demostración sin nube.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icono } from "../ds";
import { sonar } from "../app/sonido";
import { movimientoReducido } from "../app/preferencias";
import { ir } from "../app/rutas";
import { COMODINES, COMODINES_EN_PREPARACION, DORSO_SOBRE, MONEDAS_SI_TOPE, NOMBRE_SECCION, ORDEN_SECCIONES, PIEZAS_COLECCION, SOBRES, SOBRES_PERSONAJES, TOPE_COMODIN, piezasDeSobre, type SobreVisual } from "../content/tienda";
import { CARTAS_POR_SOBRE_PERSONAJES, PESO_PERSONAJE, ofertasPersonajes, precioSobrePersonajes, type PersonajeEnVenta } from "../content/personajesTienda";
import { tarjetas, useCatalogoV3, type Tarjeta } from "../personajes/integracion";
import { NOMBRE_RAREZA } from "../content/rarezas";
import { ORDEN, faltanParaGarantia, probabilidadComodines, probabilidadPiezas, sobreDisponible, type Apertura } from "../engine/sobresTienda";
import { usePiezas } from "../servicios/piezas";
import { abrir, cargarTienda, comprarPersonajes, marcarVistas, reponerComodin, useTienda } from "../servicios/tienda";
import { Apertura as VistaApertura, CartaFrente } from "./Apertura";
import { aviso, confirmar, Marco, urlArte } from "./comun";
import { infoPieza } from "./Desbloqueo";
import { miniatura } from "./Libro";
import { AlbumPersonajes } from "./AlbumPersonajes";
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
  const [album, setAlbum] = useState<"Cartas" | "Personajes">("Cartas");
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
          {pestana === "sobres" && <Sobres mercado={mercado} personajes={personajes} alAbrir={(sobre, apertura, deEspaldas) => setAbierto({ sobre, apertura, deEspaldas })} />}
          {pestana === "coleccion" && <Coleccion mercado={mercado} album={album} setAlbum={setAlbum} />}
        </section>
        {t.demo && <p className="t-demo">Prueba local con monedas de demostración.</p>}
      </div>
      {abierto && <VistaApertura sobre={abierto.sobre} apertura={abierto.apertura} fondo={fondo} deEspaldas={abierto.deEspaldas} personajes={personajes}
        alOtro={() => setAbierto(null)} alColeccion={() => {
          setAlbum(abierto.apertura.cartas.some(c => c.tipo === "personaje") ? "Personajes" : "Cartas");
          setAbierto(null); setPestana("coleccion");
        }} />}
    </Marco>
  );
}

// ---------- Sobres ----------
const CATEGORIAS = ["Normales", "Especiales", "Accesorios", "Personajes"] as const;
const COMODINES_NORMAL = SOBRES.find(x => x.id === "comodines")!;

function Sobres({ mercado, personajes, alAbrir }: { mercado: readonly PersonajeEnVenta[] | null; personajes: ReadonlyMap<string, Tarjeta>;
  alAbrir: (s: SobreVisual, a: Apertura, deEspaldas: boolean) => void }) {
  const t = useTienda(), p = usePiezas();
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Normales");
  const [i0, setI] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const lista = {
    Normales: [COMODINES_NORMAL, ...SOBRES.filter(x => p.activo && (x.id === "basico" || x.id === "mixto"))],
    Especiales: SOBRES.filter(x => x.id === "comodines" || x.id === "epico"),
    Accesorios: SOBRES.filter(x => x.id === "accesorios"),
    Personajes: SOBRES_PERSONAJES,
  }[categoria];
  const i = Math.min(i0, lista.length - 1);
  const s = lista[i]!;
  const ilusionista = categoria === "Especiales" && s.id === "comodines";
  const portada = ilusionista ? "sobre-comodines-especial.webp" : s.arte;
  const nombre = ilusionista ? "Comodines · Ilusionista" : s.nombre;
  const venta = "precio" in s ? s : null;
  const candidatos = !venta && mercado ? mercado.filter(x => x.saga === s.id && !t.personajes.has(x.id)) : [];
  const ventaSaga = !venta && mercado !== null && candidatos.every(x => personajes.has(x.id));
  const prototipo = venta ? venta.piezas > 0 && !p.activo : !ventaSaga;
  const precio = venta?.precio ?? precioSobrePersonajes(candidatos.length);
  const [giro, setGiro] = useState(0);
  const deEspaldas = giro % 360 !== 0;
  const caras = useRef<HTMLSpanElement>(null);
  const toque = useRef<{ id: number; x: number } | null>(null);
  const omitirClic = useRef(false);
  const disponible = venta ? sobreDisponible(venta, p.tengo) : precio > 0;
  const alcanza = t.monedas >= precio;
  const falta = faltanParaGarantia(t.racha);
  const elegir = (siguiente: typeof categoria, indice: number) => {
    sonar("tic");
    setCategoria(siguiente);
    setI(indice);
    setGiro(0);
  };
  const mover = (d: number) => elegir(categoria, (i + d + lista.length) % lista.length);
  const voltear = (d = 1) => {
    sonar("voltear");
    setGiro(v => v + d * 180);
  };
  const soltar = () => {
    toque.current = null;
    caras.current?.removeAttribute("data-arrastre");
    caras.current?.style.removeProperty("--arrastre-sobre");
  };

  const piezasPosibles = useMemo(() => {
    if (prototipo || !venta?.piezas) return [];
    const tasas = probabilidadPiezas(venta, p.tengo, t.racha);
    return piezasDeSobre(venta)
      .filter(x => !p.tengo.has(x.id) && tasas[x.rareza] > 0)
      .sort((a, b) => ORDEN.indexOf(a.rareza) - ORDEN.indexOf(b.rareza))
      .map(x => ({ ...x, ...infoPieza(x.id), chance: tasas[x.rareza] }));
  }, [venta, p.tengo, t.racha, prototipo]);
  const comodinesPosibles = venta ? probabilidadComodines(venta, t.comodines, t.demo) : [];

  const comprar = async () => {
    if (prototipo || !disponible || ocupado || !t.activa) return;
    if (!alcanza) { sonar("error"); aviso(`Te faltan ${precio - t.monedas} monedas. Gánalas jugando.`); return; }
    setOcupado(true);
    try {
      const ok = await confirmar({ titulo: "¿Comprar " + nombre + "?", texto: "Cuesta " + precio + " monedas. Te quedan " + (t.monedas - precio) + ".", si: "¡Comprar!", no: "Ahora no" });
      if (!ok) return;
      const r = venta ? await abrir(venta.id) : await comprarPersonajes("sobre", s.id, precio, mercado ?? []);
      if (typeof r === "string") { sonar("error"); aviso(r); return; }
      alAbrir({ color: s.color, nombre, arte: portada }, r, deEspaldas);
    } catch {
      sonar("error");
      aviso("No se pudo abrir el sobre. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <>
    <nav className="t-categorias" aria-label="Tipos de sobres">
      {CATEGORIAS.map(c => <button key={c} type="button" disabled={ocupado} aria-pressed={c === categoria}
        onClick={() => elegir(c, 0)}>{c}</button>)}
    </nav>
    <div className="t-sobres" style={{ ["--c" as string]: s.color }}>
      <div className="t-escaparate">
        <div className="t-sobre-zona">
          {!prototipo && disponible && t.activa ? (
            <button type="button" className="t-precio t-precio-comprar" disabled={ocupado}
              aria-label={`Comprar ${nombre} por ${precio} monedas`} onClick={() => void comprar()}>
              Comprar <span>{MONEDA} {precio}</span>
            </button>
          ) : (
            <p className="t-precio">{prototipo ? "Vista previa" : t.activa ? "Colección completa" : "Compra no disponible"}</p>
          )}
          <button type="button" className="t-sobre-elige" disabled={ocupado}
            aria-label={`Girar ${nombre} ${deEspaldas ? "al frente" : "al reverso"}`}
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
            <span key={portada} className="t-portada">
              <span ref={caras} className="t-sobre-caras t-giro-exhibidor" style={{ "--giro-sobre": giro + "deg" } as CSSProperties}>
                <span className="t-sobre-cara">
                  <img className="t-sobre-img" src={srcArte("tienda/" + portada)} alt="" draggable={false} />
                  {!venta && s.id !== "dc" && <span className="t-sobre-identidad">
                    <img src={srcArte(`tienda/sagas/${s.id}.webp`)} alt="" draggable={false} />
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
          <h2>{nombre}</h2>
          <p className="t-frase">{s.frase}</p>
          {ilusionista && <p className="t-edicion">Mismas cartas y probabilidades que el sobre normal.</p>}
        </div>
        <p className="t-edicion">Toca o arrastra el sobre para girarlo{lista.length > 1 && ` · ${i + 1} de ${lista.length}`}</p>
        {prototipo && <p className="t-precio-toque">Próximamente</p>}
        {ocupado && <p className="t-precio-toque" role="status">Un momento…</p>}
        {!prototipo && disponible && t.activa && !ocupado && !alcanza &&
          <p className="t-precio-toque">Te faltan {precio - t.monedas} monedas</p>}
        {ventaSaga && candidatos.length > 0 && <ProbabilidadesPersonajes candidatos={candidatos} personajes={personajes} />}
        {venta && !prototipo && <details key={categoria + venta.id} className="t-contenido-posible">
          <summary>Contenido posible y probabilidades</summary>
          <p className="t-tasas-nota">Probabilidad de obtener cada carta al menos una vez en este sobre.</p>
          <ul className="t-tasas" aria-label="Cartas y probabilidades">
            {comodinesPosibles.map(c => (
              <li key={c.id}>
                {c.arte ? <img src={srcArte("tienda/" + c.arte)} alt="" loading="lazy" /> : <ComodinIcono id={c.id} alterno={c.icono} />}
                <span><b>{c.nombre}</b><small>{c.alTope
                  ? porcentaje(c.enSobre) + " de que se sortee y se convierta en monedas"
                  : porcentaje(c.porCarta) + " en cada extracción"}</small></span>
                <strong>{porcentaje(c.alTope ? 0 : c.enSobre)}</strong>
              </li>
            ))}
            {piezasPosibles.map(x => (
              <li key={x.id}>
                {x.mini ? <img src={miniatura(x.mini)} alt="" loading="lazy" /> : <Momento />}
                <span><b>{x.nombre}</b><small>{NOMBRE_RAREZA[x.rareza]}</small></span>
                <strong>{porcentaje(x.chance)}</strong>
              </li>
            ))}
          </ul>
          {!comodinesPosibles.length && !piezasPosibles.length && <p className="t-tasas-nota">Ya tienes todas las piezas de este sobre.</p>}
          {!!comodinesPosibles.length && <p className="t-tasas-nota">Puedes recibir repetidas. Desde {TOPE_COMODIN} copias, otra igual se cambia por {MONEDAS_SI_TOPE} monedas.</p>}
          {venta.piezas > 0 && (
            <p className="t-garantia">
              {falta.legendaria <= 3 ? <>Legendaria asegurada {cuando(falta.legendaria)}</> : <>Épica asegurada {cuando(falta.epica)}</>}
            </p>
          )}
        </details>}
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
const cuando = (n: number) => (n <= 1 ? "en el siguiente sobre" : `en ${n} sobres`);

// ---------- Colección ----------
function ProbabilidadesPersonajes({ candidatos, personajes }: { candidatos: PersonajeEnVenta[]; personajes: ReadonlyMap<string, Tarjeta> }) {
  const peso = candidatos.reduce((s, c) => s + PESO_PERSONAJE[c.rareza], 0);
  return <details className="t-contenido-posible">
    <summary>Personajes y probabilidades</summary>
    <p className="t-tasas-nota">{Math.min(CARTAS_POR_SOBRE_PERSONAJES, candidatos.length)} cartas sin repetir. Las probabilidades son de la primera extracción y cambian al sacar cada carta.</p>
    <ul className="t-tasas" aria-label="Personajes y probabilidades">
      {candidatos.map(c => {
        const t = personajes.get(c.id);
        return <li key={c.id}>
          {t?.foto ? <img src={t.foto} alt="" loading="lazy" /> : <Icono id="lock" />}
          <span><b>{t?.nombre ?? c.id}</b><small>{NOMBRE_RAREZA[c.rareza]}</small></span>
          <strong>{porcentaje(PESO_PERSONAJE[c.rareza] / peso)}</strong>
        </li>;
      })}
    </ul>
  </details>;
}

function Coleccion({ mercado, album, setAlbum }: { mercado: readonly PersonajeEnVenta[] | null;
  album: "Cartas" | "Personajes"; setAlbum: (a: "Cartas" | "Personajes") => void }) {
  return <div className="t-coleccion">
    <nav className="t-album-nav" aria-label="Álbumes de colección">
      {(["Cartas", "Personajes"] as const).map(nombre => <button key={nombre} type="button"
        aria-pressed={album === nombre} onClick={() => { sonar("tic"); setAlbum(nombre); }}>{nombre}</button>)}
    </nav>
    {album === "Cartas" ? <AlbumCartas /> : <AlbumPersonajes mercado={mercado} />}
  </div>;
}

function AlbumCartas() {
  const p = usePiezas(), t = useTienda();
  const [seleccion, setSeleccion] = useState<(typeof COMODINES)[number] | null>(null);
  const detalle = useRef<HTMLDialogElement>(null);
  const esAvance = seleccion != null && COMODINES_EN_PREPARACION.includes(seleccion);
  const [reponiendo, setReponiendo] = useState(false);
  const precioReposicion = seleccion && t.comodines[seleccion.id] === 0 ? t.preciosReposicion[seleccion.id] : undefined;
  const reponer = async (carta: (typeof COMODINES)[number], precio: number) => {
    if (reponiendo) return;
    detalle.current?.close();
    setReponiendo(true);
    try {
      if (!await confirmar({ titulo: "¿Reponer " + carta.nombre + "?", texto: `Una copia cuesta ${precio} monedas.`, si: "Reponer", no: "Ahora no" })) return;
      const error = await reponerComodin(carta.id);
      if (error) aviso(error);
      else setSeleccion(carta);
    } catch {
      aviso("No se pudo reponer la carta. Revisa tu conexión.");
    } finally {
      setReponiendo(false);
    }
  };
  useEffect(() => {
    if (seleccion && !detalle.current?.open) detalle.current?.showModal();
  }, [seleccion]);
  const distintos = COMODINES.filter(c => t.comodines[c.id] !== undefined).length;
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
                {copias !== undefined ? (
                  <button type="button" className="t-album-carta" onClick={() => setSeleccion(c)}
                    aria-label={c.nombre + ", " + copias + (copias === 1 ? " copia" : " copias") + ". Ver carta"}>
                    <CartaFrente c={{ tipo: "comodin", id: c.id, especial: c.especial }} />
                    <span className="t-album-copias" aria-hidden="true">×{copias}</span>
                  </button>
                ) : (
                  <div className="t-album-vacia">
                    <span aria-hidden="true">◇</span><b>{c.nombre}</b><small>Por conseguir</small>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="t-album" aria-labelledby="titulo-album-avance">
        <div className="t-album-cab">
          <h3 id="titulo-album-avance">Próximas cartas</h3>
          <p>Vista previa</p>
        </div>
        <ul className="t-album-rejilla">
          {COMODINES_EN_PREPARACION.map(c => (
            <li key={c.id} className="t-album-ranura">
              <button type="button" className="t-album-carta" onClick={() => setSeleccion(c)} aria-label={c.nombre + ". Ver vista previa"}>
                <CartaFrente c={{ tipo: "comodin", id: c.id, especial: c.especial }} />
              </button>
            </li>
          ))}
        </ul>
      </section>
      {seleccion && <dialog ref={detalle} className="t-album-detalle" aria-label={seleccion.nombre}
        onClose={() => setSeleccion(null)} onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
        <div className="t-album-carta">
          <CartaFrente c={{ tipo: "comodin", id: seleccion.id, especial: seleccion.especial }} />
          {!esAvance && <span className="t-album-copias" aria-label={(t.comodines[seleccion.id] ?? 0) + " copias"}>×{t.comodines[seleccion.id] ?? 0}</span>}
        </div>
        {precioReposicion && <button type="button" className="t-ap-todas" disabled={reponiendo} onClick={() => void reponer(seleccion, precioReposicion)}>Reponer · {precioReposicion} {MONEDA}<span className="t-solo-lector"> monedas</span></button>}
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
