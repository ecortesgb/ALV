// El impostor en la nave (Elías, 24 nov): piezas que comparten la TV y el celular.
// Tablero de votos (tarjetas con la figura de cada quien y un bloque del color de quien votó), la expulsión (la figura
// sale volando al espacio) y el final con ganadores y castigos. Solo usan la vista pública.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Burbuja } from "../../pantallas/Identidad";
import { Escena3D, enEscena } from "../../app/figura3d";
import { urlArte } from "../../pantallas/comun";
import type { Miembro } from "../../servicios/enlace";
import { SALTAR_VOTO } from "../../engine/partida";
import { desenlaceImpostor, nombreDe, type Publico } from "../general/texto";
import "./nave.css";

export interface RevNave {
  votos?: Record<string, number>; saltos?: number; eliminado?: string | null; eraImpostor?: boolean; secreto?: boolean; empate?: boolean;
  quedan?: number; fin?: "civiles" | "impostores" | null; palabra?: string; impostores?: string[]; castigos?: Record<string, { texto: string; trago: boolean }>;
}
export const revNave = (v: Publico) => (v.revelado ?? {}) as RevNave;
export const esNave = (v: Publico) => !!v.impostor?.nave;
/** Cuánto dura la expulsión en pantalla (ms). Después queda el resultado o el final. */
export const DURA_EXPULSION = 8200;

/** Arte de la nave (PNG de Elías pasados a WebP). Si todavía no existe, el CSS pone su respaldo. */
export const arteNave = (nombre: string) => urlArte(`impostor/${nombre}.webp`);

/** Quién votó a quién en esta vuelta: en vivo con votos a la vista, al revelar si no son secretos. */
export function votosVisibles(v: Publico): Record<string, string> | null {
  if (v.fase === "contestando") return v.impostor?.votosEnVivo ?? null;
  return v.votosDe ?? null;
}

const persona = (v: Publico, miembros: Miembro[], id: string) => ({
  id, nombre: nombreDe(v, id), figura: miembros.find(m => m.id === id)?.figura, color: colorDe(id, v.jugadores.map(j => j.id)),
});

/**
 * Tablero de la asamblea: una tarjeta por quien sigue a bordo (y quien acaba de salir), más «Nadie».
 * Votos a la vista: cada voto es un bloque del color de quien votó. Secretos: solo una palomita en quien ya votó y, al revelar, el conteo.
 */
export function TableroVotos({ v, miembros, compacto, yo, elegir }: { v: Publico; miembros: Miembro[]; compacto?: boolean; yo?: string;
  /** Votar tocando el tablero (papeles en la mesa): la tarjeta elegida se marca. */ elegir?: { sel: string | null; alElegir: (id: string) => void } }) {
  const im = v.impostor!;
  const r = revNave(v);
  const revelada = v.fase === "revelada";
  const visibles = votosVisibles(v);
  // Papeles en la mesa (Elías, 24 nov): todos en el tablero (los que salieron, en gris), la palabra a la derecha de cada
  // quien y «Nadie» solo al votar. Sin papeles, como antes.
  const sala = !!im.palabras;
  const a = v.jugadores.map(j => j.id).filter(id => sala || !im.eliminados.includes(id) || (revelada && r.eliminado === id));
  const conNadie = !sala || im.etapa === "votar" || revelada;
  const bloques = (destino: string) => {
    if (visibles) return Object.entries(visibles).filter(([, x]) => x === destino).map(([de]) => ({ de, c: colorDe(de, v.jugadores.map(j => j.id)) }));
    // Secretos: al revelar, bloques grises por cada voto.
    if (!revelada) return [];
    const n = destino === SALTAR_VOTO ? r.saltos ?? 0 : r.votos?.[destino] ?? 0;
    return Array.from({ length: n }, (_, i) => ({ de: `${destino}-${i}`, c: null }));
  };
  const tarjeta = (id: string, cuerpo: ReactNode, cuantos: { de: string; c: ReturnType<typeof colorDe> }[], extra = "", puede = false) => (
    <li key={id} className={"nv-tj" + extra + (puede ? " elegible" : "") + (puede && elegir?.sel === id ? " sel" : "")} style={id === SALTAR_VOTO ? undefined : varsColor(colorDe(id, v.jugadores.map(j => j.id)))}
      {...(puede && elegir ? { role: "radio", tabIndex: 0, "aria-checked": elegir.sel === id, onClick: () => elegir.alElegir(id),
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); elegir.alElegir(id); } } } : {})}>
      {cuerpo}
      <span className="nv-bloques" aria-label={`${cuantos.length} ${cuantos.length === 1 ? "voto" : "votos"}`}>
        {cuantos.map((b, i) => <i key={b.de} className={"nv-bloque" + (b.c ? "" : " gris")} style={{ ...(b.c ? varsColor(b.c) : {}), "--i": i } as CSSProperties} title={b.c ? nombreDe(v, b.de) : undefined} />)}
      </span>
      {revelada && cuantos.length > 0 && <b className="nv-cuenta dsp ol">{cuantos.length}</b>}
    </li>
  );
  return (
    <ol className={"nv-tablero" + (compacto ? " compacto" : "") + (a.length > 6 ? " muchos" : "") + (sala ? " con-palabras" : "") + (elegir ? " eligiendo" : "")}
      aria-label="Palabras y votos de la asamblea" role={elegir ? "radiogroup" : undefined}>
      {a.map(id => {
        const p = persona(v, miembros, id);
        const voto = v.contestaron.includes(id) && v.fase === "contestando" && im.etapa === "votar";
        const sale = revelada && r.eliminado === id;
        const fuera = sala && im.eliminados.includes(id) && !sale;
        const turno = sala && !revelada && im.etapa === "pistas" && v.turnoDe === id;
        const actual = v.pistas[id];
        const antes = (im.palabras?.[id] ?? []).slice(0, actual ? -1 : undefined);
        return tarjeta(id, sala ? <>
          <Burbuja p={{ ...p, insignia: voto ? "✓" : undefined, apagada: fuera }} tamano={compacto ? "2.6em" : "3.8em"} />
          <span className="nv-tj-txt">
            <span className="nv-tj-nom dsp">{p.nombre}{id === yo && <small> (tú)</small>}</span>
            <b className="nv-tj-palabra dsp" key={actual ?? "-"}>{actual ?? (turno ? "hablando…" : fuera ? "fuera" : "")}</b>
            {antes.length > 0 && <small className="nv-tj-antes">{antes.join(" · ")}</small>}
          </span>
        </> : <>
          <Burbuja p={{ ...p, insignia: voto ? "✓" : undefined }} tamano={compacto ? "2.9em" : "4.6em"} />
          <span className="nv-tj-nom dsp">{p.nombre}{id === yo && <small> (tú)</small>}</span>
        </>, fuera ? [] : bloques(id), (sale ? " sale" : "") + (id === yo ? " yo" : "") + (sala ? " ancha" : "") + (turno ? " turno" : "") + (fuera ? " fuera" : ""), !!elegir && id !== yo && !im.eliminados.includes(id));
      })}
      {conNadie && tarjeta(SALTAR_VOTO, <>
        <span className="nv-nadie" aria-hidden="true" style={{ "--arte": arteNave("boton-saltar") } as CSSProperties} />
        <span className="nv-tj-nom dsp">Nadie</span>
      </>, bloques(SALTAR_VOTO), " nadie", !!elegir)}
    </ol>
  );
}

/** Momento de la revelación: «vuela» mientras dura la expulsión; «listo» después. Se reinicia en cada vuelta. */
export type PasoExpulsion = "nada" | "vuela" | "victoria" | "listo";
/** Con papeles, si la partida acabó, después de la expulsión va la pantalla de Victoria (se puede saltar tocándola). */
export const DURA_VICTORIA = 6500;
export function usePasoExpulsion(v: Publico): [PasoExpulsion, () => void] {
  const [paso, setPaso] = useState<PasoExpulsion>("nada");
  useEffect(() => {
    if (v.fase !== "revelada" || !esNave(v)) { setPaso("nada"); return; }
    setPaso("vuela");
    const victoria = !!v.impostor?.palabras && !!revNave(v).fin;
    const t1 = setTimeout(() => setPaso(victoria ? "victoria" : "listo"), DURA_EXPULSION);
    const t2 = victoria ? setTimeout(() => setPaso(p => (p === "victoria" ? "listo" : p)), DURA_EXPULSION + DURA_VICTORIA) : undefined;
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [v.fase, v.ronda]); // eslint-disable-line react-hooks/exhaustive-deps
  return [paso, () => setPaso(p => (p === "victoria" ? "listo" : p))];
}

/** La expulsión: se abre la compuerta y la figura sale girando al espacio. Sin expulsado, la compuerta no se abre. */
export function ExpulsionNave({ v, miembros, modo }: { v: Publico; miembros: Miembro[]; modo: "tv" | "celular" }) {
  // En el celular va sobre toda la pantalla: se dibuja en la raíz .D (dentro de un panel quedaba recortada).
  const ancla = useRef<HTMLSpanElement>(null);
  const [raiz, setRaiz] = useState<Element | null>(null);
  useEffect(() => { if (modo === "celular") setRaiz(ancla.current?.closest(".D") ?? null); }, [modo]);
  const capa = <CapaExpulsion v={v} miembros={miembros} modo={modo} />;
  if (modo === "tv") return capa;
  return <span ref={ancla} hidden>{raiz && createPortal(capa, raiz)}</span>;
}

function CapaExpulsion({ v, miembros, modo }: { v: Publico; miembros: Miembro[]; modo: "tv" | "celular" }) {
  if (v.impostor?.palabras) return <ExpulsionEspacio v={v} miembros={miembros} modo={modo} />;
  const r = revNave(v);
  const d = desenlaceImpostor(v);
  const p = r.eliminado ? persona(v, miembros, r.eliminado) : null;
  const marca = !r.eliminado ? null : r.secreto ? "¿?" : r.eraImpostor ? "Impostor" : "Civil";
  return (
    <div className={`nv-exp ${modo}` + (p ? "" : " cerrada")} role="status" aria-live="polite">
      <div className="nv-espacio" style={{ "--arte": arteNave("nave-espacio") } as CSSProperties} aria-hidden="true"><i /><i /><i /></div>
      <div className="nv-compuerta" style={{ "--arte": arteNave("nave-compuerta") } as CSSProperties} aria-hidden="true" />
      {/* La figura 3D completa sale girando (Elías, 24 nov); sin papeles, la burbuja de antes. */}
      {p && (v.impostor?.palabras
        ? <div className="nv-vuela tres" aria-hidden="true"><Escena3D modo="vuelo" figuras={[{ ...enEscena(p.id, p.figura ?? null), color: p.color?.base }]} className="nv-vuela-3d" /></div>
        : <div className="nv-vuela" style={varsColor(p.color)} aria-hidden="true"><Burbuja p={p} tamano={modo === "tv" ? "11em" : "7em"} /></div>)}
      <div className="nv-exp-txt">
        <span className="nv-exp-t dsp ol">{d.titular}</span>
        {marca && <span className={"nv-marca dsp" + (r.eraImpostor && !r.secreto ? " imp" : "")}>{marca}</span>}
        {d.detalle && !r.fin && <p>{d.detalle}</p>}
      </div>
    </div>
  );
}

/** Final de la nave: ganadores al frente, la palabra, quiénes eran y el castigo de cada perdedor. */
export function FinNave({ v, miembros, modo, yo, sinCastigos }: { v: Publico; miembros: Miembro[]; modo: "tv" | "celular"; yo?: string; /** El celular con papeles los muestra en su propia página. */ sinCastigos?: boolean }) {
  const r = revNave(v);
  const imps = r.impostores ?? [];
  const ganan = v.jugadores.map(j => j.id).filter(id => imps.includes(id) === (r.fin === "impostores"));
  const d = desenlaceImpostor(v);
  const tam = modo === "tv" ? (ganan.length > 5 ? "6em" : "7.5em") : "3.6em";
  return (
    <section className={`nv-fin ${modo} ` + (r.fin === "impostores" ? "rojo" : "salva")} aria-label="Final de la partida">
      <span className="nv-fin-arte" style={{ "--arte": arteNave(r.fin === "impostores" ? "nave-ganan-impostores" : "nave-ganan-civiles") } as CSSProperties} aria-hidden="true" />
      <span className="nv-fin-t dsp ol">{d.titular}</span>
      <ul className="nv-fin-ganan" aria-label="Ganadores">
        {ganan.map(id => <li key={id}><Burbuja p={persona(v, miembros, id)} tamano={tam} conNombre seleccionada={id === yo} /></li>)}
      </ul>
      <p className="nv-fin-det">{d.detalle}</p>
      {!sinCastigos && <CastigosNave v={v} miembros={miembros} modo={modo} yo={yo} />}
    </section>
  );
}

/** Castigo de cada perdedor (si se eligió castigo): en el final de la TV y en su página del celular. */
export function CastigosNave({ v, miembros, modo, yo }: { v: Publico; miembros: Miembro[]; modo: "tv" | "celular"; yo?: string }) {
  const r = revNave(v);
  const imps = r.impostores ?? [];
  const castigos = Object.entries(r.castigos ?? {});
  if (!castigos.length) return null;
  return (
        <div className="nv-castigos">
          <span className="nv-castigos-t dsp">Castigo para {r.fin === "impostores" ? "los civiles" : imps.length > 1 ? "los impostores" : "el impostor"}</span>
          <ul>
            {castigos.map(([id, { texto, trago }]) => {
              const p = persona(v, miembros, id);
              return (
                <li key={id} className={id === yo ? "yo" : ""} style={varsColor(p.color)}>
                  <Burbuja p={p} tamano={modo === "tv" ? "3.4em" : "2.6em"} />
                  <span><b className="dsp">{p.nombre}</b><small>{texto}</small></span>
                  <span className="nv-castigo-ico" style={{ "--arte": arteNave(trago ? "castigo-trago" : "castigo-leve") } as CSSProperties} aria-hidden="true" />
                </li>
              );
            })}
          </ul>
          <small className="nv-castigos-nota">No da ni quita puntos. Quien no quiera hacerlo, no lo hace.</small>
        </div>
  );
}

/** Curva del vuelo (igual a `uVuelo` de public/minifig/escena.js): fracción del ancho donde va el centro de la figura. */
const uVuelo = (d: number) => -0.18 + 1.36 * (0.55 * d + 0.45 * (1 - Math.pow(1 - d, 2)));
const DUR_VUELO = 5000;

/**
 * Expulsión con papeles (Elías, 24 nov, con cuadros de referencia): espacio negro con estrellas; la figura, chica, sale
 * disparada desde la izquierda a la altura del texto, gira y se pierde a la derecha. A su paso quedan escritas las
 * letras «Laura no era el impostor.» (blanco) o «Laura era el impostor.» con «impostor» en rojo. Luego, a máquina,
 * «Quedan N impostores.». Sin expulsado o con secreto, el texto se escribe solo.
 */
function ExpulsionEspacio({ v, miembros, modo }: { v: Publico; miembros: Miembro[]; modo: "tv" | "celular" }) {
  const r = revNave(v);
  const p = r.eliminado ? persona(v, miembros, r.eliminado) : null;
  const varios = (v.impostor?.total ?? 1) > 1;
  // Partes de la frase: la palabra «impostor» va en rojo cuando sí lo era.
  const partes: { t: string; rojo?: boolean }[] = !p ? [{ t: "Nadie salió de la nave." }]
    : r.secreto ? [{ t: `${p.nombre} salió de la nave.` }]
    : [{ t: `${p.nombre} ${r.eraImpostor ? "era" : "no era"} ${varios ? "un" : "el"} ` }, { t: "impostor", rojo: !!r.eraImpostor }, { t: "." }];
  const frase = partes.map(x => x.t).join("");
  const quedan = !p || r.secreto || r.quedan == null ? null : r.quedan === 1 ? "Queda 1 impostor." : `Quedan ${r.quedan} impostores.`;
  const caja = useRef<HTMLDivElement>(null);
  const linea1 = useRef<HTMLSpanElement>(null), linea2 = useRef<HTMLSpanElement>(null);
  // Avance real de la figura (lo manda la escena 3D en cada cuadro). Si no llega en 2.6 s, las letras van por tiempo.
  const avance = useRef<number | null>(null);
  useEffect(() => {
    const t0 = performance.now();
    let id = 0, fin1: number | null = null, respaldo: number | null = null;
    const paso = () => {
      const c = caja.current, l1 = linea1.current, l2 = linea2.current;
      if (!c || !l1) return;
      const ahora = performance.now();
      if (p && avance.current == null && respaldo == null && ahora - t0 > 2600) respaldo = ahora;
      const x0 = c.getBoundingClientRect().left;
      // Con figura: la letra aparece cuando el centro de la figura ya pasó sobre ella. Sin figura: una cada 55 ms.
      const d = avance.current ?? (respaldo != null ? Math.min(1, (ahora - respaldo) / DUR_VUELO) : null);
      const borde = !p ? null : d == null ? -1 : uVuelo(d) * c.clientWidth;
      let todas = true;
      l1.querySelectorAll<HTMLElement>("i").forEach((el, n) => {
        const b = el.getBoundingClientRect();
        const ver = borde != null ? b.left + b.width / 2 - x0 < borde : ahora - t0 > 500 + n * 55;
        if (ver) el.classList.add("on"); else todas = false;
      });
      if (todas && fin1 == null) fin1 = ahora;
      // Segunda línea, a máquina, cuando termina la primera.
      let todas2 = true;
      if (l2) l2.querySelectorAll<HTMLElement>("i").forEach((el, n) => { if (fin1 != null && ahora - fin1 > 350 + n * 45) el.classList.add("on"); else todas2 = false; });
      if (todas && todas2) return;
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [p]);
  const letras = (t: string, clase?: string) => [...t].map((ch, n) => <i key={n} className={clase}>{ch === " " ? " " : ch}</i>);
  return (
    <div ref={caja} className={`nv-xe ${modo}`} role="status" aria-live="polite" aria-label={frase + (quedan ? " " + quedan : "")}>
      <div className="nv-xe-cielo" aria-hidden="true"><b /><b /></div>
      <p className="nv-xe-txt" aria-hidden="true">
        <span ref={linea1}>{partes.map((x, n) => <span key={n} className={x.rojo ? "rojo" : undefined}>{letras(x.t)}</span>)}</span>
        {quedan && <><br /><span ref={linea2}>{letras(quedan)}</span></>}
      </p>
      {p && <div className="nv-xe-fig" aria-hidden="true"><Escena3D modo="vuelo" figuras={[{ ...enEscena(p.id, p.figura ?? null), color: p.color?.base }]} className="nv-xe-3d" alVolar={d => { avance.current = d; }} /></div>}
    </div>
  );
}

/**
 * Victoria (Elías, 24 nov): justo después de la expulsión que acaba la partida. Letrero «Victoria» arriba y, abajo, los
 * ganadores como minifiguras quietas de frente, en formación sobre un piso que brilla (turquesa civiles, rojo impostores).
 */
export function VictoriaNave({ v, miembros, modo, alSaltar }: { v: Publico; miembros: Miembro[]; modo: "tv" | "celular"; alSaltar?: () => void }) {
  const r = revNave(v);
  const imps = r.impostores ?? [];
  const ganan = v.jugadores.map(j => j.id).filter(id => imps.includes(id) === (r.fin === "impostores"));
  const rojo = r.fin === "impostores";
  const quien = rojo ? (imps.length > 1 ? "de los impostores" : "del impostor") : "de los civiles";
  const capa = (
    <div className={`nv-vic ${modo}` + (rojo ? " rojo" : "")} role="status" aria-live="assertive" aria-label={`Victoria ${quien}`} onClick={alSaltar}>
      <div className="nv-xe-cielo" aria-hidden="true"><b /><b /></div>
      <div className="nv-vic-t">
        <b className="dsp">Victoria</b>
        <small>{quien}</small>
      </div>
      <div className="nv-vic-figs" aria-hidden="true">
        <span className="nv-vic-piso" />
        <Escena3D figuras={ganan.map(id => ({ ...enEscena(id, miembros.find(m => m.id === id)?.figura ?? null) }))} sinPedestal className="nv-vic-3d" />
      </div>
      <ul className="nv-vic-nombres" aria-label="Ganadores">
        {ganan.map(id => <li key={id} style={varsColor(colorDe(id, v.jugadores.map(j => j.id)))}>{nombreDe(v, id)}</li>)}
      </ul>
      {alSaltar && <small className="nv-vic-toca">Toca para continuar</small>}
    </div>
  );
  return modo === "tv" ? capa : <EnRaiz>{capa}</EnRaiz>;
}

/** En el celular, las capas de pantalla completa se dibujan en la raíz .D (dentro de un panel quedaban recortadas). */
function EnRaiz({ children }: { children: ReactNode }) {
  const ancla = useRef<HTMLSpanElement>(null);
  const [raiz, setRaiz] = useState<Element | null>(null);
  useEffect(() => { setRaiz(ancla.current?.closest(".D") ?? null); }, []);
  return <span ref={ancla} hidden>{raiz && createPortal(children, raiz)}</span>;
}
