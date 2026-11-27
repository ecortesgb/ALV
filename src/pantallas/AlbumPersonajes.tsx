import { useEffect, useMemo, useRef, useState } from "react";
import { NUMEROS_PERSONAJES } from "../content/numerosPersonajes";
import { rarezaPersonaje as rareza, type PersonajeEnVenta } from "../content/personajesTienda";
import { banderaV3, categorias, deCatalogo, nombreSaga, paginas, resolverFigura, tarjetas, useEstadoCatalogoV3, useMiniaturas, type CatalogoV3, type Tarjeta } from "../personajes/integracion";
import { comprarPersonajes, useTienda } from "../servicios/tienda";
import { aviso, confirmar } from "./comun";
import { CartaPersonaje, etiquetaRareza, LOGOS, logo } from "./CartaPersonaje";
import "./album-personajes.css";

const SIN_FAVORITOS = new Set<string>();
const POR_PAGINA = 12;
const GRUPOS_MARVEL = new Map([
  ["avengers", "Avengers"], ["x-men", "X-Men"], ["guardianes", "Guardianes"],
  ["villanos-marvel", "Villanos"], ["otros-marvel", "Otros"],
]);

function LogoSeccion({ id, nombre }: { id: string; nombre: string }) {
  const archivo = id === "guardianes" ? "guardianes-plata" : id === "villanos-marvel" ? "villanos" : id;
  return LOGOS[id] ? <img src={logo(archivo)} alt={nombre} draggable={false} /> : <>{nombre}</>;
}

export function AlbumPersonajes({ mercado }: { mercado: readonly PersonajeEnVenta[] | null }) {
  const { catalogo, estado, reintentar } = useEstadoCatalogoV3();
  return <section className="t-album" aria-labelledby="t-album-figuras">
    <h2 id="t-album-figuras">Álbum de personajes</h2>
    {catalogo ? <Figuras catalogo={catalogo} mercado={mercado} /> : estado === "cargando"
      ? <p role="status">Cargando personajes…</p>
      : <div className="t-album-vacio">
        <p>El catálogo de personajes todavía no está disponible en esta sesión.</p>
        {banderaV3() && <button type="button" className="t-ap-todas" onClick={reintentar}>Reintentar</button>}
      </div>}
  </section>;
}

function Figuras({ catalogo, mercado }: { catalogo: CatalogoV3; mercado: readonly PersonajeEnVenta[] | null }) {
  const { personajes } = useTienda();
  const todas = useMemo(() => tarjetas(catalogo.catalogo), [catalogo]);
  const sagas = useMemo(() => categorias(todas, SIN_FAVORITOS).slice(1), [todas]);
  const [sagaElegida, setSaga] = useState<string>();
  const [grupoElegido, setGrupo] = useState<string>();
  const [elegida, setElegida] = useState<Tarjeta | null>(null);
  const comprando = useRef(false);
  const ofertas = useMemo(() => new Map((mercado ?? []).map(c => [c.id, c])), [mercado]);
  const saga = sagas.find(s => s.id === sagaElegida) ?? sagas[0];
  if (!saga) return <p>El catálogo todavía no tiene personajes listos para el álbum.</p>;

  const deSaga = todas.filter(t => t.saga === saga.id);
  const idsGrupo = new Set(deSaga.map(t => t.grupo));
  const gruposConocidos = saga.id === "marvel" ? [...GRUPOS_MARVEL.keys()].filter(id => idsGrupo.delete(id)) : [];
  const grupos = [...gruposConocidos, ...idsGrupo].map(id => ({
    id, nombre: (saga.id === "marvel" ? GRUPOS_MARVEL.get(id) : undefined) ?? nombreSaga(id),
  }));
  const grupo = grupos.find(g => g.id === grupoElegido) ?? grupos[0]!;
  const lista = deSaga.filter(t => t.grupo === grupo.id);
  const comprar = async (tarjeta: Tarjeta, oferta: PersonajeEnVenta) => {
    if (comprando.current) return;
    comprando.current = true;
    try {
      if (!await confirmar({ titulo: `¿Comprar a ${tarjeta.nombre}?`, texto: `Esta carta cuesta ${oferta.precio} monedas y se añade a tu colección.`, si: "Comprar", no: "Ahora no" })) return;
      const r = await comprarPersonajes("carta", tarjeta.id, oferta.precio, mercado ?? []);
      aviso(typeof r === "string" ? r : `¡${tarjeta.nombre} se añadió a tu colección!`);
    } catch {
      aviso("No se pudo completar la compra. Revisa tu conexión.");
    } finally {
      comprando.current = false;
    }
  };

  return <>
    {sagas.length > 1 && <nav className="t-album-nav t-album-sagas" aria-label="Sagas de personajes">
      {sagas.map(s => <button key={s.id} type="button" aria-pressed={saga.id === s.id}
        onClick={() => { if (s.id !== saga.id) { setSaga(s.id); setGrupo(undefined); } }}><LogoSeccion id={s.id} nombre={s.nombre} /></button>)}
    </nav>}
    {grupos.length > 1 && <nav className="t-album-nav t-album-grupos" aria-label={`Colecciones de ${saga.nombre}`}>
      {grupos.map(g => <button key={g.id} type="button" aria-pressed={grupo.id === g.id}
        onClick={() => setGrupo(g.id)}><LogoSeccion id={g.id} nombre={g.nombre} /></button>)}
    </nav>}
    <div className="t-album-cab">
      <h3>{grupo.nombre === saga.nombre ? saga.nombre : `${saga.nombre} · ${grupo.nombre}`}</h3>
      <p>{mercado ? `${lista.filter(t => rareza(t.id) === "comun" || personajes.has(t.id)).length} de ${lista.length} conseguidas` : `${lista.length} cartas · Vista previa`}</p>
    </div>
    <FormatosGrupo key={`${saga.id}/${grupo.id}`} lista={lista} alElegir={setElegida} ofertas={ofertas} adquiridos={personajes} />
    {elegida && <DetallePersonaje key={elegida.id} tarjeta={elegida} catalogo={catalogo}
      oferta={personajes.has(elegida.id) ? undefined : ofertas.get(elegida.id)} conseguida={personajes.has(elegida.id)}
      alComprar={comprar} alCerrar={() => setElegida(null)} />}
  </>;
}

type ListaFiguras = { lista: Tarjeta[]; alElegir: (t: Tarjeta) => void; ofertas: ReadonlyMap<string, PersonajeEnVenta>; adquiridos: ReadonlySet<string> };

function FormatosGrupo({ lista, ...resto }: ListaFiguras) {
  const [formato, setFormato] = useState<"Minifiguras" | "Bigfig">("Minifiguras");
  const formatos = (["Minifiguras", "Bigfig"] as const).map(titulo => ({
    titulo, cartas: lista.filter(t => t.tamano === (titulo === "Bigfig" ? "grande" : "normal")),
  })).filter(f => f.cartas.length > 0);
  const activo = formatos.find(f => f.titulo === formato) ?? formatos[0];
  if (!activo) return null;
  return <>
    {formatos.length > 1 && <nav className="t-album-nav t-album-tamanos" aria-label="Tamaño de figura">
      {formatos.map(f => <button key={f.titulo} type="button" aria-pressed={activo.titulo === f.titulo}
        onClick={() => setFormato(f.titulo)}>{f.titulo} <span>{f.cartas.length}</span></button>)}
    </nav>}
    <GrupoFiguras key={activo.titulo} titulo={activo.titulo} lista={activo.cartas} {...resto} />
  </>;
}

function GrupoFiguras({ titulo, lista, alElegir, ofertas, adquiridos }: ListaFiguras & { titulo: string }) {
  const [pagina, setPagina] = useState(0);
  const hojas = paginas(lista, POR_PAGINA);
  const hoja = Math.min(pagina, hojas.length - 1);
  return <section className="t-album-formato" aria-label={titulo}>
    <h4>{titulo}</h4>
    <ul className="t-album-rejilla">
      {hojas[hoja]!.map(t => <li className="t-album-ranura" key={t.id}>
        <button type="button" className="t-album-carta" onClick={() => alElegir(t)}
          aria-label={`${t.nombre}, ${etiquetaRareza(t, rareza(t.id))}${t.tamano === "grande" ? ", Bigfig" : ""}${NUMEROS_PERSONAJES[t.id] ? `, número ${NUMEROS_PERSONAJES[t.id]}` : ""}. Ver carta`}>
          <CartaPersonaje tarjeta={t} nivel={ofertas.get(t.id)?.rareza} conseguida={adquiridos.has(t.id)}
            precio={adquiridos.has(t.id) ? undefined : ofertas.get(t.id)?.precio} />
        </button>
      </li>)}
    </ul>
    {hojas.length > 1 && <nav className="t-album-nav t-album-paginacion" aria-label={`Páginas de ${titulo}`}>
      <button type="button" disabled={hoja === 0} onClick={() => setPagina(hoja - 1)}>Anterior</button>
      <span aria-live="polite">{hoja + 1} / {hojas.length}</span>
      <button type="button" disabled={hoja === hojas.length - 1} onClick={() => setPagina(hoja + 1)}>Siguiente</button>
    </nav>}
  </section>;
}

function DetallePersonaje({ tarjeta, catalogo, oferta, conseguida, alComprar, alCerrar }: {
  tarjeta: Tarjeta; catalogo: CatalogoV3; oferta?: PersonajeEnVenta; conseguida: boolean;
  alComprar: (t: Tarjeta, o: PersonajeEnVenta) => void; alCerrar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const mini = useMiniaturas(`${import.meta.env.BASE_URL}personajes/estudio.html`, catalogo.catalogo);
  const plano = useMemo(() => {
    const entrada = catalogo.catalogo.get(tarjeta.id);
    return entrada && resolverFigura("album", deCatalogo(entrada.ficha), catalogo.catalogo, catalogo.piezas, catalogo.base);
  }, [tarjeta.id, catalogo]);
  const clave = plano ? "album:" + JSON.stringify(plano) : null;
  useEffect(() => { dialogo.current?.showModal(); }, []);
  useEffect(() => {
    if (clave && plano && mini.listo) mini.pedirFigura(clave, plano);
    // El estudio mantiene la cola y evita pedidos duplicados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, plano, mini.listo]);
  return <dialog ref={dialogo} className="t-album-detalle" aria-label={tarjeta.nombre}
    onClose={alCerrar} onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
    {mini.marco}
    <div className="t-album-carta">
      <CartaPersonaje tarjeta={tarjeta} foto={(clave && mini.fotoDe(clave)) || tarjeta.foto} revelada
        nivel={oferta?.rareza} precio={oferta?.precio} conseguida={conseguida} />
    </div>
    {oferta && <button type="button" className="t-ap-todas" onClick={() => {
      dialogo.current?.close();
      alComprar(tarjeta, oferta);
    }}>Comprar · {oferta.precio} monedas</button>}
    <button type="button" className="t-ap-todas" onClick={() => dialogo.current?.close()}>Cerrar carta</button>
  </dialog>;
}
