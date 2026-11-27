// Comodines en la partida (Elías, 27 nov, Maestro v1.72): un botón abre tu colección con los comodines que sirven en
// este juego y en este momento. Si tienes copias, «Usar»; si ya gastaste todas pero la descubriste, «Comprar y usar» al
// precio de reposición; si nunca te salió en un sobre, no se puede. El servidor descuenta o cobra y la jugada llega a la TV.
import { useEffect, useState, type ReactNode } from "react";
import { comodinPorId } from "../../content/tienda";
import { EFECTO_EN_PARTIDA, TEXTO_SUERTE, esComodinPartida } from "../../content/comodinesPartida";
import { cargarTienda, inventarioDe, usarComodin, useTienda, type Inventario } from "../../servicios/tienda";
import type { MiVista } from "./celular";
import { nombreDe, type Publico } from "./texto";
import "./comodines.css";

const arte = (n: string) => `${import.meta.env.BASE_URL}arte/tienda/${n}`;

/** Lista vieja (mano de la partida): solo la usan partidas guardadas antes de la v1.72. */
export function SelectorComodinesMano({ cantidad, children }: { cantidad: number; children: ReactNode }) {
  return <details className="a-selector-comodines">
    <summary>⚡ Comodines ({cantidad})</summary>
    <div className="a-mano" aria-label="Tus comodines">{children}</div>
  </details>;
}

let cargada = false;

/** Colección de quien tiene el turno: la de esta sesión (tienda) o la de otra cuenta que juega en este aparato. */
function useInventario(mi: MiVista): { inv: Inventario | null; fijar: (id: string, monedas: number, cantidad: number) => void } {
  const t = useTienda();
  const propio = !mi.cliente;
  const [otro, setOtro] = useState<{ yo: string; inv: Inventario } | null>(null);
  useEffect(() => {
    if (propio) { if (!cargada && mi.cuenta) { cargada = true; void cargarTienda(); } return; }
    let vivo = true;
    void inventarioDe(mi.cliente!).then(inv => { if (vivo && inv) setOtro({ yo: mi.yo, inv }); });
    return () => { vivo = false; };
  }, [propio, mi.yo, mi.cuenta]); // eslint-disable-line react-hooks/exhaustive-deps
  if (propio) return { inv: { monedas: t.monedas, comodines: t.comodines, precios: t.preciosReposicion }, fijar: () => { /* la tienda ya se actualizó */ } };
  const inv = otro?.yo === mi.yo ? otro.inv : null;
  return { inv, fijar: (id, monedas, cantidad) => setOtro(o => o && { ...o, inv: { ...o.inv, monedas, comodines: { ...o.inv.comodines, [id]: cantidad } } }) };
}

export function SelectorComodines({ v, mi }: { v: Publico; mi: MiVista }) {
  const { inv, fijar } = useInventario(mi);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const usables = (mi.misComodines ?? []).filter(esComodinPartida);
  // Al cambiar de momento (otra etapa, otra ronda, otra persona con el teléfono) se cierra y se limpia el aviso.
  const clave = `${v.ronda}-${mi.yo}-${usables.join(",")}`;
  useEffect(() => { setAviso(null); if (!usables.length) setAbierto(false); }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!v.comodines || !mi.cuenta || !mi.partida || !usables.length || !inv) return null;

  const usar = async (id: string, comprar: boolean) => {
    setEnviando(id); setAviso(null);
    const r = await usarComodin({ partida: mi.partida!, cliente: mi.cliente, espejo: mi.espejo }, id, comprar);
    setEnviando(null);
    if (typeof r === "string") setAviso(r); else { fijar(id, r.monedas, r.cantidad); setAbierto(false); }
  };

  return (
    <div className="cm-caja">
      <button type="button" className="cm-boton dsp" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>⚡ Comodines</button>
      {abierto && (
        <div className="cm-lista" role="list" aria-label="Comodines de tu colección que sirven ahora">
          {usables.map(id => {
            const c = comodinPorId(id), quedan = inv.comodines[id] ?? 0, precio = inv.precios[id] ?? c?.reposicion ?? 0;
            const falta = Math.max(0, precio - inv.monedas);
            return (
              <div key={id} className="cm-item" role="listitem">
                {c?.arte ? <img className="cm-arte" src={arte(c.arte)} alt="" loading="lazy" /> : <span className="cm-arte cm-ico" aria-hidden="true">{c?.icono}</span>}
                <span className="cm-texto">
                  <b>{c?.nombre ?? id}</b>
                  <small>{EFECTO_EN_PARTIDA[id]}</small>
                  <small className="cm-cuantas">{quedan > 0 ? `Tienes ${quedan}` : "No tienes"}</small>
                </span>
                {quedan > 0 ? <button type="button" className="cm-usar" disabled={!!enviando} onClick={() => void usar(id, false)}>{enviando === id ? "…" : "Usar"}</button>
                  : <button type="button" className="cm-usar cm-comprar" disabled={!!enviando || falta > 0} onClick={() => void usar(id, true)}>
                      {enviando === id ? "…" : <>Comprar y usar<small>{falta > 0 ? `Te faltan ${falta}` : `${precio} monedas`}</small></>}
                    </button>}
              </div>
            );
          })}
          {aviso && <p className="cm-aviso" role="alert">{aviso}</p>}
          <p className="cm-pie">Uno por turno. Tienes {inv.monedas} monedas.</p>
        </div>
      )}
    </div>
  );
}

/** Lo que dejaron los comodines en esta ronda: chips para todos y, a quien usó Dos caminos, las dos cartas para elegir. */
export function EfectosComodines({ v, yo, alElegir }: { v: Publico; yo: string; alElegir: (i: 0 | 1) => void }) {
  const ef = v.efectos;
  if (!ef || v.fase !== "contestando") return null;
  const objetivo = v.verdadReto ? v.verdadReto.responde : v.turnoDe;
  const chips: string[] = [];
  if (ef.suerte) chips.push("✦ " + TEXTO_SUERTE[ef.suerte] + (ef.suerte === "pasa" && ef.pasoA ? ` Ahora le toca a ${nombreDe(v, ef.pasoA)}.` : ""));
  if (ef.rebaja && ef.suerte !== "suaviza") chips.push("½ Rebaja: se hace a la mitad.");
  if (ef.segundo === "listo") chips.push("↶ Tiene segundo intento.");
  if (ef.segundo === "usado") chips.push("↶ Segundo intento: ¡otra vez!");
  if (ef.extra) chips.push(`⌛ +${ef.extra} s`);
  return (
    <>
      {chips.length > 0 && <ul className="cm-efectos" aria-label="Comodines de esta ronda">{chips.map(c => <li key={c}>{c}</li>)}</ul>}
      {ef.caminos && (objetivo === yo ? (
        <section className="cm-caminos" aria-label="Dos caminos: elige una carta">
          <span className="a-kick">Dos caminos · elige una</span>
          {ef.caminos.map((c, i) => <button key={c.id} type="button" className="cm-camino" onClick={() => alElegir(i as 0 | 1)}>{c.texto}</button>)}
        </section>
      ) : <p className="a-suave">{nombreDe(v, objetivo)} está eligiendo entre dos cartas…</p>)}
    </>
  );
}
