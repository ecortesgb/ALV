// Tienda y recompensas ALV (Maestro v1.48, enfoque A; dirección visual: mockups de Elías del 18 nov).
// Etapa 1: pestañas Sobres y Colección y la apertura completa, en la demostración sin nube.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icono } from "../ds";
import { sonar } from "../app/sonido";
import { ir } from "../app/rutas";
import { COMODINES, MONEDAS_SI_TOPE, NOMBRE_SECCION, ORDEN_SECCIONES, PIEZAS_COLECCION, SOBRES, TOPE_COMODIN, piezasDeSobre, type Sobre } from "../content/tienda";
import { NOMBRE_RAREZA } from "../content/rarezas";
import { ORDEN, faltanParaGarantia, probabilidadComodines, probabilidadPiezas, sobreDisponible, type Apertura } from "../engine/sobresTienda";
import { usePiezas } from "../servicios/piezas";
import { abrir, cargarTienda, marcarVistas, useTienda } from "../servicios/tienda";
import { Apertura as VistaApertura, CartaFrente } from "./Apertura";
import { aviso, confirmar, Marco, urlArte } from "./comun";
import { infoPieza } from "./Desbloqueo";
import { miniatura } from "./Libro";
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
  const [pestana, setPestana] = useState<Pestana>("sobres");
  const [abierto, setAbierto] = useState<{ sobre: Sobre; apertura: Apertura } | null>(null);
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
          {pestana === "sobres" && <Sobres alAbrir={(sobre, apertura) => setAbierto({ sobre, apertura })} />}
          {pestana === "coleccion" && <Coleccion />}
        </section>
        {t.demo && <p className="t-demo">Prueba local con monedas de demostración.</p>}
      </div>
      {abierto && <VistaApertura sobre={abierto.sobre} apertura={abierto.apertura} fondo={fondo}
        alOtro={() => setAbierto(null)} alColeccion={() => { setAbierto(null); setPestana("coleccion"); }} />}
    </Marco>
  );
}

// ---------- Sobres ----------
function Sobres({ alAbrir }: { alAbrir: (s: Sobre, a: Apertura) => void }) {
  const t = useTienda(), p = usePiezas();
  // Con las piezas libres (037, Maestro v1.50) los sobres de piezas no tienen qué dar: solo se venden los de comodines.
  const lista = p.activo ? SOBRES : SOBRES.filter(x => x.piezas === 0);
  const [i0, setI] = useState(4);
  const i = Math.min(i0, lista.length - 1);
  const [ocupado, setOcupado] = useState(false);
  const s = lista[i]!;
  const [especial, setEspecial] = useState(false);
  const conPortadas = s.id === "comodines";
  const portada = conPortadas && especial ? "sobre-comodines-especial.webp" : s.arte;
  const omitirClic = useRef(false);
  const disponible = sobreDisponible(s, p.tengo);
  const alcanza = t.monedas >= s.precio;
  const falta = faltanParaGarantia(t.racha);
  const mover = (d: number) => {
    if (lista.length === 1 && conPortadas) setEspecial(v => !v);
    else { setEspecial(false); setI(x => (Math.min(x, lista.length - 1) + d + lista.length) % lista.length); }
    sonar("tic");
  };

  // Deslizar el sobre para cambiar.
  const toque = useRef<number | null>(null);

  const piezasPosibles = useMemo(() => {
    const tasas = probabilidadPiezas(s, p.tengo, t.racha);
    return (s.piezas > 0 ? piezasDeSobre(s) : [])
      .filter(x => !p.tengo.has(x.id) && tasas[x.rareza] > 0)
      .sort((a, b) => ORDEN.indexOf(a.rareza) - ORDEN.indexOf(b.rareza))
      .map(x => ({ ...x, ...infoPieza(x.id), chance: tasas[x.rareza] }));
  }, [s, p.tengo, t.racha]);
  const comodinesPosibles = probabilidadComodines(s, t.comodines, t.demo);

  const comprar = async () => {
    if (!disponible || ocupado) return;
    if (!alcanza) { sonar("error"); aviso(`Te faltan ${s.precio - t.monedas} monedas. Gánalas jugando.`); return; }
    setOcupado(true);
    try {
      const ok = await confirmar({ titulo: "¿Abrir " + s.nombre.toLowerCase() + "?", texto: "Cuesta " + s.precio + " monedas. Te quedan " + (t.monedas - s.precio) + ".", si: "¡Comprar!", no: "Ahora no" });
      if (!ok) return;
      const r = await abrir(s.id);
      if (typeof r === "string") { sonar("error"); aviso(r); return; }
      alAbrir({ ...s, arte: portada }, r);
    } catch {
      sonar("error");
      aviso("No se pudo abrir el sobre. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="t-sobres" style={{ ["--c" as string]: s.color }}>
      <div className="t-escaparate">
        {lista.length > 1 && <button type="button" className="t-flecha t-izq" onClick={() => mover(-1)} aria-label="Sobre anterior">‹</button>}
        <button type="button" className="t-sobre-zona t-sobre-elige" disabled={ocupado || !disponible}
          aria-label={(conPortadas ? (especial ? "Portada especial" : "Portada normal") + ". " : "") + "Comprar " + s.nombre + " por " + s.precio + " monedas"}
          onClick={e => { if (e.detail === 0 || !omitirClic.current) void comprar(); omitirClic.current = false; }}
          onKeyDown={e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); mover(e.key === "ArrowLeft" ? -1 : 1); } }}
          onPointerDown={e => { toque.current = e.clientX; omitirClic.current = false; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerCancel={() => { toque.current = null; }}
          onPointerUp={e => { if (toque.current == null) return; const dx = e.clientX - toque.current; toque.current = null; if (Math.abs(dx) > 40) { omitirClic.current = true; mover(dx < 0 ? 1 : -1); } }}>
          <img key={portada} className="t-sobre-img" src={srcArte("tienda/" + portada)} alt="" draggable={false} />
          {!disponible && <span className="t-sello">¡Completo!</span>}
        </button>
        {conPortadas && <button type="button" className="t-portada-lateral" disabled={ocupado} aria-label={especial ? "Elegir portada normal" : "Elegir portada especial"} onClick={() => { sonar("tic"); setEspecial(v => !v); }}>
          <img src={srcArte("tienda/" + (especial ? s.arte : "sobre-comodines-especial.webp"))} alt="" draggable={false} />
        </button>}
        {lista.length > 1 && <button type="button" className="t-flecha t-der" onClick={() => mover(1)} aria-label="Sobre siguiente">›</button>}
      </div>

      <div className="t-lado">
        <div className="t-contenido">
          <h2>{s.nombre}</h2>
          <p className="t-frase">{s.frase}</p>
          {conPortadas && <p className="t-edicion">{especial ? "Portada especial · Ilusionista" : "Portada normal"} · Desliza para cambiar</p>}
          <h3 className="t-contenido-titulo">Contenido posible</h3>
          <p className="t-tasas-nota">Probabilidad de obtener cada carta al menos una vez en este sobre.</p>
          <ul className="t-tasas" aria-label="Cartas y probabilidades">
            {comodinesPosibles.map(c => (
              <li key={c.id}>
                {c.arte ? <img src={srcArte("tienda/" + c.arte)} alt="" /> : <ComodinIcono id={c.id} alterno={c.icono} />}
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
          {s.piezas > 0 && (
            <p className="t-garantia">
              {falta.legendaria <= 3 ? <>Legendaria asegurada {cuando(falta.legendaria)}</> : <>Épica asegurada {cuando(falta.epica)}</>}
            </p>
          )}
        </div>
        <p className="t-precio-toque">{ocupado ? "Un momento…" : disponible ? <>Toca el sobre para comprar · {s.precio} {MONEDA}<span className="t-solo-lector"> monedas</span></> : "Ya lo tienes todo"}</p>
        {disponible && !alcanza && <p className="t-faltan">Te faltan {s.precio - t.monedas} monedas.</p>}
      </div>

      {!p.activo && <p className="t-aviso-libres">Por ahora todas las piezas son libres: úsalas en el personalizador. Los sobres de piezas regresan después.</p>}
      {lista.length > 1 && <div className="t-tira" role="group" aria-label="Sobres">
        {lista.map((x, k) => (
          <button key={x.id} type="button" aria-label={x.nombre + ", " + x.precio + " monedas"} aria-pressed={k === i} className={"t-tira-s" + (k === i ? " t-on" : "")}
            style={{ ["--c" as string]: x.color }} onClick={() => { sonar("tic"); setI(k); }}>
            <img src={srcArte("tienda/" + x.arte)} alt="" draggable={false} />
            <span>{MONEDA}{x.precio}</span>
          </button>
        ))}
      </div>}
    </div>
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
function Coleccion() {
  const p = usePiezas(), t = useTienda();
  const [seleccion, setSeleccion] = useState<(typeof COMODINES)[number] | null>(null);
  const detalle = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (seleccion && !detalle.current?.open) detalle.current?.showModal();
  }, [seleccion]);
  const distintos = COMODINES.filter(c => (t.comodines[c.id] ?? 0) > 0).length;
  const tengo = PIEZAS_COLECCION.filter(x => p.tengo.has(x.id)).length;
  return (
    <div className="t-coleccion">
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
            const copias = t.comodines[c.id] ?? 0;
            return (
              <li key={c.id} className="t-album-ranura">
                {copias ? (
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
      {seleccion && <dialog ref={detalle} className="t-album-detalle" aria-label={seleccion.nombre}
        onClose={() => setSeleccion(null)} onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
        <div className="t-album-carta">
          <CartaFrente c={{ tipo: "comodin", id: seleccion.id, especial: seleccion.especial }} />
          <span className="t-album-copias" aria-label={(t.comodines[seleccion.id] ?? 0) + " copias"}>×{t.comodines[seleccion.id] ?? 0}</span>
        </div>
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
    </div>
  );
}
