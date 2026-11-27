// Comodines en la partida (Elías, 27 nov, Maestro v1.72): un botón abre tu colección con los comodines que sirven en
// este juego y en este momento. Si tienes copias, «Usar»; si ya gastaste todas pero la descubriste, «Comprar y usar» al
// precio de reposición; si nunca te salió en un sobre, no se puede. El servidor descuenta o cobra y la jugada llega a la TV.
import { useEffect, useState, type ReactNode } from "react";
import { comodinPorId } from "../../content/tienda";
import { EFECTO_EN_PARTIDA, TEXTO_SUERTE, esComodinPartida } from "../../content/comodinesPartida";
import { cargarTienda, usarComodin, useTienda } from "../../servicios/tienda";
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

export function SelectorComodines({ v, mi }: { v: Publico; mi: MiVista }) {
  const t = useTienda();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => { if (!cargada && mi.cuenta) { cargada = true; void cargarTienda(); } }, [mi.cuenta]);
  const usables = (mi.misComodines ?? []).filter(esComodinPartida);
  // Al cambiar de momento (otra etapa, otra ronda) se cierra y se limpia el aviso.
  const clave = `${v.ronda}-${usables.join(",")}`;
  useEffect(() => { setAviso(null); if (!usables.length) setAbierto(false); }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!v.comodines || !mi.cuenta || !mi.partida || !usables.length) return null;

  const usar = async (id: string, comprar: boolean) => {
    setEnviando(id); setAviso(null);
    const r = await usarComodin(mi.partida!, id, comprar);
    setEnviando(null);
    if (r) setAviso(r); else setAbierto(false);
  };

  return (
    <div className="cm-caja">
      <button type="button" className="cm-boton dsp" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>⚡ Comodines</button>
      {abierto && (
        <div className="cm-lista" role="list" aria-label="Comodines de tu colección que sirven ahora">
          {usables.map(id => {
            const c = comodinPorId(id), tengo = t.comodines[id], precio = t.preciosReposicion[id] ?? c?.reposicion ?? 0;
            const descubierta = tengo !== undefined, quedan = tengo ?? 0, falta = Math.max(0, precio - t.monedas);
            return (
              <div key={id} className="cm-item" role="listitem">
                {c?.arte ? <img className="cm-arte" src={arte(c.arte)} alt="" loading="lazy" /> : <span className="cm-arte cm-ico" aria-hidden="true">{c?.icono}</span>}
                <span className="cm-texto">
                  <b>{c?.nombre ?? id}</b>
                  <small>{EFECTO_EN_PARTIDA[id]}</small>
                  <small className="cm-cuantas">{descubierta ? `Tienes ${quedan}` : "No la tienes"}</small>
                </span>
                {quedan > 0 ? <button type="button" className="cm-usar" disabled={!!enviando} onClick={() => void usar(id, false)}>{enviando === id ? "…" : "Usar"}</button>
                  : descubierta ? <button type="button" className="cm-usar cm-comprar" disabled={!!enviando || falta > 0} onClick={() => void usar(id, true)}>
                      {enviando === id ? "…" : <>Comprar y usar<small>{falta > 0 ? `Te faltan ${falta}` : `${precio} monedas`}</small></>}
                    </button>
                  : <span className="cm-nota">Sale en sobres</span>}
              </div>
            );
          })}
          {aviso && <p className="cm-aviso" role="alert">{aviso}</p>}
          <p className="cm-pie">Uno por turno. Tienes {t.monedas} monedas.</p>
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
