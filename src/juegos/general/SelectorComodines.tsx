// Comodines en la partida (Elías, 27 nov, Maestro v1.72): un botón abre tu colección con los comodines que sirven en
// este juego y en este momento. Si tienes copias, «Usar»; si ya gastaste todas pero la descubriste, «Comprar y usar» al
// precio de reposición; si nunca te salió en un sobre, no se puede. El servidor descuenta o cobra y la jugada llega a la TV.
import { useEffect, useState, type ReactNode } from "react";
import { comodinPorId } from "../../content/tienda";
import { CON_OBJETIVO, EFECTO_EN_PARTIDA, TEXTO_SUERTE, esComodinPartida } from "../../content/comodinesPartida";
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

type MandarCarta = (tipo: "carta", datos: Record<string, unknown>) => Promise<boolean>;

export function SelectorComodines({ v, mi, mandar }: { v: Publico; mi: MiVista; /** Para decir a quién va un comodín dirigido. */ mandar?: MandarCarta }) {
  const { inv, fijar } = useInventario(mi);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Comodín dirigido (Maestro v1.74): primero se elige a quién va y luego se paga.
  const [eligiendo, setEligiendo] = useState<{ id: string; comprar: boolean } | null>(null);
  const usables = (mi.misComodines ?? []).filter(esComodinPartida);
  // Al cambiar de momento (otra etapa, otra ronda, otra persona con el teléfono) se cierra y se limpia el aviso.
  const clave = `${v.ronda}-${mi.yo}-${usables.join(",")}`;
  useEffect(() => { setAviso(null); setEligiendo(null); if (!usables.length) setAbierto(false); }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!v.comodines || !mi.cuenta || !mi.partida || !usables.length || !inv) return null;
  // Sin forma de decir a quién va, los dirigidos no se ofrecen.
  const lista = usables.filter(id => !CON_OBJETIVO.includes(id) || (!!mandar && (mi.misObjetivos?.[id]?.length ?? 0) > 0));
  if (!lista.length) return null;

  const usar = async (id: string, comprar: boolean, a?: string) => {
    if (CON_OBJETIVO.includes(id as never) && !a) { setEligiendo({ id, comprar }); return; }
    setEnviando(id); setAviso(null);
    if (a && !(await mandar!("carta", { que: "apunta", a }))) { setEnviando(null); setAviso("No se pudo usar. Intenta otra vez."); return; }
    const r = await usarComodin({ partida: mi.partida!, cliente: mi.cliente, espejo: mi.espejo }, id, comprar);
    setEnviando(null); setEligiendo(null);
    if (typeof r === "string") setAviso(r); else { fijar(id, r.monedas, r.cantidad); setAbierto(false); }
  };

  if (abierto && eligiendo) {
    const c = comodinPorId(eligiendo.id);
    return (
      <div className="cm-caja">
        <div className="cm-lista" role="group" aria-label={`${c?.nombre ?? "Comodín"}: elige a quién`}>
          <span className="cm-texto"><b>{c?.nombre} · ¿a quién?</b><small>{EFECTO_EN_PARTIDA[eligiendo.id as keyof typeof EFECTO_EN_PARTIDA]}</small></span>
          <div className="cm-gente">
            {(mi.misObjetivos?.[eligiendo.id] ?? []).map(j => (
              <button key={j} type="button" className="cm-persona" disabled={!!enviando} onClick={() => void usar(eligiendo.id, eligiendo.comprar, j)}>{enviando ? "…" : nombreDe(v, j)}</button>
            ))}
          </div>
          {aviso && <p className="cm-aviso" role="alert">{aviso}</p>}
          <button type="button" className="cm-volver" disabled={!!enviando} onClick={() => setEligiendo(null)}>Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cm-caja">
      <button type="button" className="cm-boton dsp" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>⚡ Comodines</button>
      {abierto && (
        <div className="cm-lista" role="list" aria-label="Comodines de tu colección que sirven ahora">
          {lista.map(id => {
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
          <p className="cm-pie">Uno por ronda. Tienes {inv.monedas} monedas.</p>
        </div>
      )}
    </div>
  );
}

/** Lo que dejaron los comodines en esta ronda: chips para todos y, a quien usó Dos caminos, las dos cartas para elegir. */
export function EfectosComodines({ v, yo, alElegir }: { v: Publico; yo: string; alElegir: (i: 0 | 1) => void }) {
  const ef = v.efectos;
  const duran = avisosDuraderos(v, yo);
  if (!ef || v.fase !== "contestando") return duran.length ? <ul className="cm-efectos" aria-label="Comodines en juego">{duran.map(c => <li key={c}>{c}</li>)}</ul> : null;
  const objetivo = v.verdadReto ? v.verdadReto.responde : v.turnoDe;
  const chips: string[] = [...duran];
  if (ef.suerte) chips.push("✦ " + TEXTO_SUERTE[ef.suerte] + (ef.suerte === "pasa" && ef.pasoA ? ` Ahora le toca a ${nombreDe(v, ef.pasoA)}.` : ""));
  if (ef.rebaja && ef.suerte !== "suaviza") chips.push("½ Rebaja: se hace a la mitad.");
  if (ef.segundo === "listo") chips.push("↶ Tiene segundo intento.");
  if (ef.segundo === "usado") chips.push("↶ Segundo intento: ¡otra vez!");
  if (ef.extra) chips.push(`⌛ +${ef.extra} s`);
  if (ef.contrarreloj) chips.push("◷ Contrarreloj: este turno tiene la mitad del tiempo.");
  if (ef.ayuda) chips.push(`✦ Mano amiga: ${nombreDe(v, ef.ayuda)} lo hace con ${nombreDe(v, objetivo)}.`);
  if (ef.duelo) chips.push(`⚄ Duelo: ${nombreDe(v, ef.duelo.reta)} sacó ${ef.duelo.dados[0]} y ${nombreDe(v, ef.duelo.rival)} sacó ${ef.duelo.dados[1]}. Lo cumple ${nombreDe(v, ef.duelo.pierde)}.`);
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

/** Lo que sigue vivo entre rondas o en la ronda, para todos: mesero, castigos tocados por comodines, trampas contra ti y candados. */
export function avisosDuraderos(v: Publico, yo: string): string[] {
  const d = v.duraderos, ef = v.efectos, l: string[] = [];
  if (d?.mesero) l.push(d.mesero.jugador === yo
    ? "🍹 Eres el mesero: sirves de beber a todos hasta que acabe este juego (lo que cada quien pida, agua vale)."
    : `🍹 ${nombreDe(v, d.mesero.jugador)} es el mesero hasta que acabe este juego.`);
  for (const t of d?.trampas ?? []) if (t.a === yo) l.push(t.carta === "doble-castigo"
    ? `×2 ${nombreDe(v, t.de)} te lanzó Doble castigo: tu siguiente castigo va doble.`
    : `◷ ${nombreDe(v, t.de)} te lanzó Contrarreloj: tu siguiente turno tiene la mitad del tiempo.`);
  if (d?.candados?.some(c => c.jugador === yo && c.ronda === v.ronda)) l.push("🔒 Tienes candado en esta ronda.");
  if (ef?.bloqueo) l.push(`🔒 El candado de ${nombreDe(v, ef.bloqueo.a)} paró el ${comodinPorId(ef.bloqueo.carta)?.nombre ?? "comodín"} de ${nombreDe(v, ef.bloqueo.de)}.`);
  const r = v.ruleta;
  if (r && r.ronda === v.ronda) {
    if (r.anulado) l.push(`◉ Castigo de ${nombreDe(v, r.jugador)} cancelado.`);
    else {
      if (r.de) l.push(`⇢ ${nombreDe(v, r.de)} pasó su castigo a ${nombreDe(v, r.jugador)}: ${r.texto}`);
      if (r.doble) l.push(`×2 El castigo de ${nombreDe(v, r.jugador)} va doble.`);
    }
  }
  return l;
}

/** El botón y los avisos juntos, para las pantallas que no los traían (El impostor, ALV FÍSICO). */
export function BloqueComodines({ v, mi, mandar }: { v: Publico; mi: MiVista; mandar: MandarCarta }) {
  return <div className="cm-bloque">
    <EfectosComodines v={v} yo={mi.yo} alElegir={i => void mandar("carta", { que: "camino", i })} />
    <SelectorComodines v={v} mi={mi} mandar={mandar} />
  </div>;
}
