// Tienda y recompensas ALV (Maestro v1.48, enfoque A; dirección visual: mockups de Elías del 18 nov).
// Etapa 1: pestañas Sobres y Colección y la apertura completa, en la demostración sin nube.
import { useEffect, useMemo, useRef, useState } from "react";
import { sonar } from "../app/sonido";
import { ir } from "../app/rutas";
import { COMODINES, NOMBRE_SECCION, ORDEN_SECCIONES, PESO_ESPECIAL, PIEZAS_COLECCION, SOBRES, piezasDeSobre, type Sobre } from "../content/tienda";
import { NOMBRE_RAREZA } from "../content/rarezas";
import { ORDEN, faltanParaGarantia, sobreDisponible, type Apertura } from "../engine/sobresTienda";
import { usePiezas } from "../servicios/piezas";
import { abrir, cargarTienda, marcarVistas, useTienda } from "../servicios/tienda";
import { Apertura as VistaApertura } from "./Apertura";
import { aviso, confirmar, Marco } from "./comun";
import { infoPieza } from "./Desbloqueo";
import { miniatura } from "./Libro";
import { PildoraMonedas, PildoraPuntos } from "./Recursos";
import { useSesion } from "../app/sesion";
import "./tienda.css";

type Pestana = "sobres" | "personajes" | "accesorios" | "coleccion" | "ofertas";
const PESTANAS: { id: Pestana; nombre: string; pronto?: boolean }[] = [
  { id: "sobres", nombre: "Sobres" }, { id: "personajes", nombre: "Personajes", pronto: true },
  { id: "accesorios", nombre: "Accesorios", pronto: true }, { id: "coleccion", nombre: "Colección" },
  { id: "ofertas", nombre: "Ofertas", pronto: true },
];

export const srcArte = (n: string) => `${import.meta.env.BASE_URL}arte/${n}`;
const MONEDA = <span className="t-moneda" aria-hidden="true" />;

export function Tienda() {
  const sesion = useSesion();
  const t = useTienda();
  const [pestana, setPestana] = useState<Pestana>("sobres");
  const [abierto, setAbierto] = useState<{ sobre: Sobre; apertura: Apertura } | null>(null);
  useEffect(() => { void cargarTienda(); }, []);
  const cambiar = (p: Pestana) => { if (pestana === "coleccion") marcarVistas(); sonar("clic"); setPestana(p); };

  return (
    <Marco clase="t-tienda">
      <div className="t-raiz">
        <header className="t-cab">
          <button type="button" className="t-atras" onClick={() => ir("inicio")} aria-label="Regresar al HUB">‹</button>
          <h1 className="t-titulo"><span>Tienda y recompensas ALV</span></h1>
          <div className="t-recursos rc-compacta"><PildoraMonedas monedas={t.monedas} conMas={false} /><PildoraPuntos puntos={sesion.acumulada} /></div>
        </header>
        {t.demo && <p className="t-demo">Demostración: monedas de mentira, solo en este aparato.</p>}

        <nav className="t-pestanas" role="tablist">
          {PESTANAS.map(p => (
            <button key={p.id} type="button" role="tab" aria-selected={pestana === p.id}
              className={"t-pestana" + (pestana === p.id ? " t-on" : "")} onClick={() => cambiar(p.id)}>
              {p.nombre}{p.id === "coleccion" && t.nuevas.size > 0 && <i className="t-punto" aria-label="nuevo" />}
            </button>
          ))}
        </nav>

        <section className="t-panel">
          <div className="t-confeti" aria-hidden="true" />
          {pestana === "sobres" && <Sobres alAbrir={(sobre, apertura) => setAbierto({ sobre, apertura })} />}
          {pestana === "coleccion" && <Coleccion />}
          {PESTANAS.find(p => p.id === pestana)?.pronto && (
            <div className="t-pronto">
              <span className="t-sfx">¡Pronto!</span>
              <p>{pestana === "personajes" ? "Personajes completos para comprar de un jalón." : pestana === "accesorios" ? "Piezas sueltas y comodines a la carta." : "Tres ofertas al día que cambian a medianoche."}</p>
            </div>
          )}
        </section>
      </div>
      {abierto && <VistaApertura sobre={abierto.sobre} apertura={abierto.apertura}
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
  const [probs, setProbs] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const s = lista[i]!;
  const disponible = sobreDisponible(s, p.tengo);
  const alcanza = t.monedas >= s.precio;
  const falta = faltanParaGarantia(t.racha);
  const mover = (d: number) => { sonar("tic"); setProbs(false); setI(x => (Math.min(x, lista.length - 1) + d + lista.length) % lista.length); };

  // Deslizar el sobre para cambiar.
  const toque = useRef<number | null>(null);

  const posibles = useMemo(() => {
    // Una de cada sección por vuelta (la de mayor rareza primero), para que se vea variado.
    const cupo = s.comodines ? 6 - Math.min(3, s.comodines) : 6;
    const porSeccion = new Map<string, ReturnType<typeof piezasDeSobre>>();
    for (const x of piezasDeSobre(s).filter(x => !p.tengo.has(x.id)).sort((a, b) => ORDEN.indexOf(b.rareza) - ORDEN.indexOf(a.rareza)))
      porSeccion.set(x.seccion, [...(porSeccion.get(x.seccion) ?? []), x]);
    const piezas: ReturnType<typeof piezasDeSobre> = [];
    for (let vuelta = 0; piezas.length < cupo && [...porSeccion.values()].some(l => l.length > vuelta); vuelta++)
      for (const l of porSeccion.values()) if (l[vuelta] && piezas.length < cupo) piezas.push(l[vuelta]!);
    return [
      ...piezas.map(x => ({ clave: x.id, tipo: "pieza" as const, rareza: x.rareza, ...infoPieza(x.id) })),
      ...(s.comodines ? COMODINES.slice(0, 6 - piezas.length).map(c => ({ clave: c.id, tipo: "comodin" as const, rareza: c.especial ? "epica" as const : "rara" as const, nombre: c.nombre, mini: null, icono: c.icono })) : []),
    ];
  }, [s, p.tengo]);

  const comprar = async () => {
    if (!disponible) return;
    if (!alcanza) { sonar("error"); aviso(`Te faltan ${s.precio - t.monedas} monedas. Gánalas jugando.`); return; }
    const ok = await confirmar({ titulo: `¿Abrir ${s.nombre.toLowerCase()}?`, texto: `Cuesta ${s.precio} monedas. Te quedan ${t.monedas - s.precio}.`, si: "¡Comprar!", no: "Ahora no" });
    if (!ok) return;
    setOcupado(true);
    const r = await abrir(s.id);
    setOcupado(false);
    if (typeof r === "string") { sonar("error"); aviso(r); return; }
    alAbrir(s, r);
  };

  return (
    <div className="t-sobres" style={{ ["--c" as string]: s.color }}>
      <div className="t-escaparate">
        <button type="button" className="t-flecha t-izq" onClick={() => mover(-1)} aria-label="Sobre anterior">‹</button>
        <div className="t-sobre-zona"
          onPointerDown={e => { toque.current = e.clientX; }}
          onPointerUp={e => { if (toque.current == null) return; const dx = e.clientX - toque.current; toque.current = null; if (Math.abs(dx) > 40) mover(dx < 0 ? 1 : -1); }}>
          <div className="t-rayos" aria-hidden="true" />
          <img key={s.id} className="t-sobre-img" src={srcArte("tienda/" + s.arte)} alt={s.nombre} draggable={false} />
          {!disponible && <span className="t-sello">¡Completo!</span>}
        </div>
        <button type="button" className="t-flecha t-der" onClick={() => mover(1)} aria-label="Sobre siguiente">›</button>
        <div className="t-precio">{MONEDA}<b>{s.precio}</b></div>
      </div>

      <div className="t-lado">
        <div className="t-contenido">
          <div className="t-contenido-cab">
            <h2>Contenido posible:</h2>
            <button type="button" className="t-info" onClick={() => { sonar("clic"); setProbs(v => !v); }} aria-expanded={probs} aria-label="Probabilidades">?</button>
          </div>
          {probs ? (
            <div className="t-probs">
              {s.piezas > 0 && <p>{s.piezas} {s.piezas === 1 ? "pieza" : "piezas"} que todavía no tienes:</p>}
              {s.piezas > 0 && ORDEN.map(r => (
                <div key={r} className={"t-prob r-" + r}><span>{NOMBRE_RAREZA[r]}</span><i style={{ width: `${pct(s, r)}%` }} /><b>{pct(s, r)} %</b></div>
              ))}
              {s.minimo && <p>Mínimo una {NOMBRE_RAREZA[s.minimo].toLowerCase()} en cada sobre.</p>}
              {s.comodines > 0 && <p>{s.comodines} comodines{PESO_ESPECIAL > 0 ? `: especial ${Math.round(PESO_ESPECIAL * 100)} %, básico ${100 - Math.round(PESO_ESPECIAL * 100)} %` : `, al azar entre ${COMODINES.map(c => c.nombre).join(" y ")}`}.</p>}
              {s.piezas > 0 && <p className="t-suave">Nunca salen piezas repetidas.</p>}
            </div>
          ) : (
            <div className="t-rejilla">
              {posibles.map(x => (
                <div key={x.clave} className={"t-mini r-" + x.rareza} title={x.nombre}>
                  {x.mini ? <img src={miniatura(x.mini)} alt="" loading="lazy" /> : "icono" in x ? <span className="t-mini-ico">{x.icono}</span> : <Momento />}
                </div>
              ))}
            </div>
          )}
          <p className="t-frase">{s.frase}</p>
          {s.piezas > 0 && (
            <p className="t-garantia">
              {falta.legendaria <= 3 ? <>Legendaria asegurada {cuando(falta.legendaria)}</> : <>Épica asegurada {cuando(falta.epica)}</>}
            </p>
          )}
        </div>
        <button type="button" className="t-comprar" disabled={!disponible || ocupado} onClick={() => void comprar()}>
          {disponible ? "¡Comprar!" : "Ya lo tienes todo"}
        </button>
      </div>

      {!p.activo && <p className="t-aviso-libres">Por ahora todas las piezas son libres: úsalas en el personalizador. Los sobres de piezas regresan después.</p>}
      <div className="t-tira" role="tablist" aria-label="Sobres">
        {lista.map((x, k) => (
          <button key={x.id} type="button" role="tab" aria-selected={k === i} className={"t-tira-s" + (k === i ? " t-on" : "")}
            style={{ ["--c" as string]: x.color }} onClick={() => { sonar("tic"); setProbs(false); setI(k); }}>
            <img src={srcArte("tienda/" + x.arte)} alt="" draggable={false} />
            <span>{MONEDA}{x.precio}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
/** Paquete de momentos (no tiene miniatura). */
export const Momento = () => <span className="t-mom"><span className="t-mini-ico">💥</span><small>Momentos</small></span>;
const pct = (s: Sobre, r: (typeof ORDEN)[number]) => Math.round((s.pesos[r] / ORDEN.reduce((a, x) => a + s.pesos[x], 0)) * 100);
const cuando = (n: number) => (n <= 1 ? "en el siguiente sobre" : `en ${n} sobres`);

// ---------- Colección ----------
function Coleccion() {
  const p = usePiezas(), t = useTienda();
  const tengo = PIEZAS_COLECCION.filter(x => p.tengo.has(x.id)).length;
  return (
    <div className="t-coleccion">
      <div className="t-total">
        <span className="t-sfx">{tengo}</span><small>/ {PIEZAS_COLECCION.length}</small>
        <div className="t-barras">
          {ORDEN.map(r => {
            const todas = PIEZAS_COLECCION.filter(x => x.rareza === r), mias = todas.filter(x => p.tengo.has(x.id)).length;
            return <div key={r} className={"t-prob r-" + r}><span>{NOMBRE_RAREZA[r]}</span><i style={{ width: `${(mias / todas.length) * 100}%` }} /><b>{mias}/{todas.length}</b></div>;
          })}
        </div>
      </div>

      <div className="t-comodines">
        <h3>Comodines</h3>
        <div className="t-comodines-fila">
          {COMODINES.map(c => (
            <div key={c.id} className={"t-comodin" + (c.especial ? " t-especial" : "")} title={c.efecto}>
              <span className="t-mini-ico">{c.icono}</span><b>{c.nombre}</b><span className="t-cuenta">×{t.comodines[c.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {ORDEN_SECCIONES.map(sec => {
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
