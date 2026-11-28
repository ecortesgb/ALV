// Álbum de cartas de accesorio (tienda v2, Maestro v1.73): la pieza de cabeza o el objeto de cada traje bloqueado.
// Se ven todas; las que faltan, con candado y su precio. Tener la carta desbloquea esa pieza en el personalizador.
import { useEffect, useMemo, useRef, useState } from "react";
import type { AccesorioTienda } from "../content/accesoriosTienda";
import { NOMBRE_PARTE } from "../content/accesoriosTienda";
import { NOMBRE_RAREZA } from "../content/rarezas";
import { nombreSaga, paginas, type Tarjeta } from "../personajes/integracion";
import { comprarAccesorio, useTienda } from "../servicios/tienda";
import { LogoSeccion } from "./AlbumPersonajes";
import { CartaPersonaje } from "./CartaPersonaje";
import { aviso, confirmar } from "./comun";
import "./album-personajes.css";

const POR_PAGINA = 12;

export function AlbumAccesorios({ personajes }: { personajes: ReadonlyMap<string, Tarjeta> }) {
  const t = useTienda();
  const todos = useMemo(() => (t.catalogoAccesorios ?? []).filter(a => personajes.has(a.donante)), [t.catalogoAccesorios, personajes]);
  const sagas = useMemo(() => [...new Set(todos.map(a => personajes.get(a.donante)!.saga))], [todos, personajes]);
  const [sagaElegida, setSaga] = useState<string>();
  const [pagina, setPagina] = useState(0);
  const [elegido, setElegido] = useState<AccesorioTienda | null>(null);
  const comprando = useRef(false);
  const saga = sagas.includes(sagaElegida ?? "") ? sagaElegida! : sagas[0];
  if (!t.catalogoAccesorios) return <section className="t-album"><h2>Álbum de accesorios</h2><p className="t-frase">Las cartas de accesorio llegan pronto.</p></section>;
  if (!saga) return <section className="t-album"><h2>Álbum de accesorios</h2><p className="t-frase">Cargando personajes…</p></section>;
  const tiene = (a: AccesorioTienda) => t.accesorios.has(a.id) || t.personajes.has(a.donante);
  const lista = todos.filter(a => personajes.get(a.donante)!.saga === saga);
  const hojas = paginas(lista, POR_PAGINA);
  const hoja = Math.min(pagina, hojas.length - 1);
  const comprar = async (a: AccesorioTienda) => {
    if (comprando.current) return;
    comprando.current = true;
    try {
      const nombre = `${NOMBRE_PARTE[a.parte]} de ${personajes.get(a.donante)?.nombre ?? a.donante}`;
      if (!await confirmar({ titulo: `¿Comprar ${nombre}?`, texto: `Cuesta ${a.precio} monedas. La pieza se desbloquea en el personalizador.`, si: "Comprar", no: "Ahora no" })) return;
      const r = await comprarAccesorio(a);
      aviso(r ?? "¡Listo! Ya puedes usarla en el personalizador.");
    } catch {
      aviso("No se pudo completar la compra. Revisa tu conexión.");
    } finally {
      comprando.current = false;
    }
  };
  return <section className="t-album" aria-labelledby="t-album-accesorios">
    <h2 id="t-album-accesorios">Álbum de accesorios</h2>
    {sagas.length > 1 && <nav className="t-album-nav t-album-sagas" aria-label="Sagas">
      {sagas.map(s => <button key={s} type="button" aria-pressed={saga === s}
        onClick={() => { setSaga(s); setPagina(0); }}><LogoSeccion id={s} nombre={nombreSaga(s)} /></button>)}
    </nav>}
    <div className="t-album-cab">
      <h3>{nombreSaga(saga)}</h3>
      <p>{lista.filter(tiene).length} de {lista.length} conseguidas</p>
    </div>
    <ul className="t-album-rejilla">
      {hojas[hoja]!.map(a => {
        const tarjeta = personajes.get(a.donante)!, mia = tiene(a);
        return <li className="t-album-ranura" key={a.id}>
          <button type="button" className="t-album-carta" onClick={() => setElegido(a)}
            aria-label={`${NOMBRE_PARTE[a.parte]} de ${tarjeta.nombre}, ${NOMBRE_RAREZA[a.rareza]}${mia ? "" : `, ${a.precio} monedas`}. Ver carta`}>
            <CartaPersonaje tarjeta={tarjeta} nivel={a.rareza} accesorio={a.parte} conseguida={mia} precio={mia ? undefined : a.precio} />
          </button>
        </li>;
      })}
    </ul>
    {hojas.length > 1 && <nav className="t-album-nav t-album-paginacion" aria-label="Páginas de accesorios">
      <button type="button" disabled={hoja === 0} onClick={() => setPagina(hoja - 1)}>Anterior</button>
      <span aria-live="polite">{hoja + 1} / {hojas.length}</span>
      <button type="button" disabled={hoja === hojas.length - 1} onClick={() => setPagina(hoja + 1)}>Siguiente</button>
    </nav>}
    {elegido && <Detalle key={elegido.id} a={elegido} tarjeta={personajes.get(elegido.donante)!} mia={tiene(elegido)}
      alComprar={comprar} alCerrar={() => setElegido(null)} />}
  </section>;
}

function Detalle({ a, tarjeta, mia, alComprar, alCerrar }: {
  a: AccesorioTienda; tarjeta: Tarjeta; mia: boolean; alComprar: (a: AccesorioTienda) => void; alCerrar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialogo.current?.showModal(); }, []);
  return <dialog ref={dialogo} className="t-album-detalle" aria-label={`${NOMBRE_PARTE[a.parte]} de ${tarjeta.nombre}`}
    onClose={alCerrar} onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
    <div className="t-album-carta">
      <CartaPersonaje tarjeta={tarjeta} nivel={a.rareza} accesorio={a.parte} conseguida={mia} revelada />
    </div>
    {!mia && <button type="button" className="t-ap-todas" onClick={() => { dialogo.current?.close(); alComprar(a); }}>Comprar · {a.precio} monedas</button>}
    <button type="button" className="t-ap-todas" onClick={() => dialogo.current?.close()}>Cerrar carta</button>
  </dialog>;
}
