// Podio de fin de juego y ceremonia de copas de la noche (Maestro 6A.11 C2). Solo usan la vista pública.
// - PodioJuego: al terminar cada juego, 1.º, 2.º y 3.º por puntos y, si se jugó por grupos, el grupo ganador.
// - CeremoniaCopas: al cerrar el lobby, copa individual (oro, plata y bronce), copa parejas, copa equipos y copa ALVersus.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { colorDe, varsColor } from "../../app/colorJugador";
import type { Copas, Ganador } from "../../engine/copas";
import { NombreJugador, Retrato } from "../../pantallas/comun";
import type { Miembro } from "../../servicios/enlace";
import { marcador, nombreDe, nombreJuego, type Publico } from "./texto";
import "./copas.css";

type Tono = "oro" | "plata" | "bronce" | "parejas" | "equipos" | "alversus";
const TONOS: Record<Tono, [string, string, string]> = {
  oro: ["#fff09a", "#ffc83d", "#b37a00"], plata: ["#ffffff", "#c9d3e6", "#6f7b96"], bronce: ["#ffd2a8", "#d9833d", "#7d3f0f"],
  parejas: ["#ffc6e4", "#ff4fa8", "#a01860"], equipos: ["#bfe0ff", "#2f7cf0", "#123f99"], alversus: ["#e2c8ff", "#9a4cf0", "#53198f"],
};

/** Trofeo dibujado: copa con asas, pie y placa. */
export function Copa({ tono, texto, size = 90 }: { tono: Tono; texto?: string; size?: number }) {
  const [c1, c2, c3] = TONOS[tono], g = `g-${tono}`;
  return (
    <svg className="cp-copa" width={size} height={size * 1.15} viewBox="0 0 100 115" role="img" aria-label={`Copa ${texto ?? tono}`}>
      <defs><linearGradient id={g} x1="0" x2="1"><stop offset="0" stopColor={c3} /><stop offset=".35" stopColor={c1} /><stop offset=".6" stopColor={c2} /><stop offset="1" stopColor={c3} /></linearGradient></defs>
      <path d="M22 18 C4 18 4 46 28 50 M78 18 C96 18 96 46 72 50" fill="none" stroke={c3} strokeWidth="7" strokeLinecap="round" />
      <path d="M22 10 H78 V30 C78 52 64 62 50 64 C36 62 22 52 22 30 Z" fill={`url(#${g})`} stroke="#0a1030" strokeWidth="3" />
      <path d="M30 16 C30 34 34 46 42 52" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round" />
      <rect x="44" y="63" width="12" height="16" fill={c2} stroke="#0a1030" strokeWidth="3" />
      <path d="M30 79 H70 L74 92 H26 Z" fill={`url(#${g})`} stroke="#0a1030" strokeWidth="3" />
      <rect x="20" y="92" width="60" height="16" rx="3" fill="#2b2f3a" stroke="#0a1030" strokeWidth="3" />
      {texto && <text x="50" y="104" textAnchor="middle" className="cp-copa-t">{texto}</text>}
      <path d="M50 22 l3.5 7 7.5 1 -5.5 5 1.5 7.5 -7 -3.8 -7 3.8 1.5 -7.5 -5.5 -5 7.5 -1 z" fill="#fff" fillOpacity=".85" />
    </svg>
  );
}

/** ¿Es la revelación final del juego (para mostrar su podio)? */
export function esFinalDeJuego(v: Publico): boolean {
  if (v.fase !== "revelada" || v.juegoId === "copas") return false;
  if (v.impostor) return !!(v.revelado as { fin?: unknown } | undefined)?.fin;
  return v.ronda >= v.totalRondas;
}

/** Dibuja la capa sobre toda la pantalla (raíz .D), encima del marcador. */
function useRaiz() {
  const ancla = useRef<HTMLSpanElement>(null);
  const [raiz, setRaiz] = useState<Element | null>(null);
  useEffect(() => { setRaiz(ancla.current?.closest(".D") ?? null); }, []);
  return { ancla, raiz };
}

const ORDINAL = (n: number) => `${n}.º`;

/** Tabla de posiciones: lugar en un bloque del color del jugador, retrato, P# y nombre, y puntos. */
export function Posiciones({ v, miembros, puntos, grande }: { v: Publico; miembros: Miembro[]; puntos?: Record<string, number>; grande?: boolean }) {
  const ids = v.jugadores.map(j => j.id);
  const figura = (id: string) => miembros.find(m => m.id === id)?.figura;
  const m = marcador(puntos ? { ...v, puntos } : v);
  return (
    <ol className={"pos" + (grande ? " grande" : "")} aria-label="Posiciones">
      {m.map((j, i) => {
        const c = colorDe(j.id, ids);
        return (
          <li key={j.id} style={{ ...varsColor(c), "--i": i } as CSSProperties}>
            <span className="pos-lugar dsp ol">{ORDINAL(j.lugar)}</span>
            <span className="pos-cara"><Retrato id={j.id} figura={figura(j.id)} nombre={j.nombre} size={grande ? 56 : 40} /></span>
            <span className="pos-nom"><small className="dsp">{c?.etiqueta}</small><NombreJugador nombre={j.nombre} figura={figura(j.id)} clase="" /></span>
            <b className="pos-pts dsp ol">{j.puntos}<small> pts</small></b>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Podio de fin de juego. TV: a la izquierda los puntos y a la derecha un bloque del color de cada jugador, más alto
 * cuanto mejor quedó, con su figura encima; aparece sobre la escena unos segundos después del resultado.
 * Celular: tabla de posiciones abajo del resultado.
 */
export function PodioJuego({ v, miembros, modo }: { v: Publico; miembros: Miembro[]; modo: "tv" | "celular" }) {
  const ids = v.jugadores.map(j => j.id);
  const figura = (id: string) => miembros.find(m => m.id === id)?.figura;
  const m = marcador(v);
  const lugarDe = (id: string) => m.find(x => x.id === id)?.lugar ?? m.length;
  const grupo = v.grupos?.[0];
  const empateGrupo = !!v.grupos && v.grupos.length > 1 && v.grupos[1]!.puntos === grupo?.puntos;
  const [ver, setVer] = useState(modo === "celular");
  useEffect(() => { if (modo !== "tv") return; const t = setTimeout(() => setVer(true), 3500); return () => clearTimeout(t); }, [modo]);
  const { ancla, raiz } = useRaiz();
  const banda = grupo && <p className="pj-grupo dsp ol">{empateGrupo ? "¡Empate entre grupos!" : `¡Gana ${grupo.nombre}!`} <small>{grupo.puntos} pts</small></p>;
  if (modo === "celular") {
    return <section className="pj pj-celular" aria-label={`Podio de ${nombreJuego(v.juegoId)}`}><span className="pj-t dsp ol">Posiciones</span>{banda}<Posiciones v={v} miembros={miembros} /></section>;
  }
  if (!raiz) return <span ref={ancla} hidden />;
  const alto = (id: string) => { const l = lugarDe(id), n = Math.max(2, m.length); return 30 + Math.round(((n - l) / (n - 1)) * 55); };
  return ver ? createPortal(
    <div className="pj-capa" onClick={() => setVer(false)}>
      <section className="pj pj-tv" aria-label={`Podio de ${nombreJuego(v.juegoId)}`}>
        <span className="pj-cartel dsp ol">{nombreJuego(v.juegoId)}</span>
        {banda}
        <div className="pj-cuerpo">
          <Posiciones v={v} miembros={miembros} grande />
          <div className="pj-bloques" style={{ "--n": ids.length } as CSSProperties}>
            {ids.map((id, i) => {
              const c = colorDe(id, ids), l = lugarDe(id);
              return (
                <div key={id} className={"pj-col" + (l === 1 ? " gana" : "")} style={{ ...varsColor(c), "--alto": `${alto(id)}%`, "--i": i } as CSSProperties}>
                  {l === 1 && <span className="pj-corona" aria-hidden="true">👑</span>}
                  <Retrato id={id} figura={figura(id)} nombre={nombreDe(v, id)} size={l === 1 ? 104 : 84} />
                  <span className="pj-bloque"><b className="dsp ol">{ORDINAL(l)}</b></span>
                  <span className="pj-pn dsp">{c?.etiqueta}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="pj-nota">Los puntos se suman para las copas de la noche · toca para cerrar</p>
      </section>
    </div>, raiz) : null;
}

/** En el resumen final, el oro primero. */
const ORDEN_COPA: Tono[] = ["oro", "plata", "bronce", "parejas", "equipos", "alversus"];

interface Momento { titulo: string; copa: Tono; texto: string; gente: { nombre: string; jugadores: string[]; puntos: number }[] }

/** Los momentos de la ceremonia, en orden: bronce, plata, oro y luego las copas de grupo que se jugaron. */
export function momentosCeremonia(c: Copas): Momento[] {
  const lugar = (n: number) => c.individual.filter(x => x.lugar === n).map(x => ({ nombre: x.nombre, jugadores: [x.id], puntos: x.puntos }));
  const grupo = (g: Ganador[] | undefined, titulo: string, copa: Tono, texto: string): Momento[] => (g ? [{ titulo, copa, texto, gente: g }] : []);
  return [
    ...(lugar(3).length ? [{ titulo: "Tercer lugar", copa: "bronce" as Tono, texto: "3.º", gente: lugar(3) }] : []),
    ...(lugar(2).length ? [{ titulo: "Segundo lugar", copa: "plata" as Tono, texto: "2.º", gente: lugar(2) }] : []),
    ...(lugar(1).length ? [{ titulo: "Copa individual", copa: "oro" as Tono, texto: "1.º", gente: lugar(1) }] : []),
    ...grupo(c.parejas, "Copa parejas", "parejas", "PAREJAS"),
    ...grupo(c.equipos, "Copa equipos", "equipos", "EQUIPOS"),
    ...grupo(c.alversus, "Copa ALVersus", "alversus", "ALVERSUS"),
  ];
}

/** Ceremonia de copas. TV: un momento a la vez con su copa y al final todas juntas. Celular: todas en lista. */
export function CeremoniaCopas({ v, miembros, modo }: { v: Publico; miembros: Miembro[]; modo: "tv" | "celular" }) {
  const c = v.copas;
  const ids = v.jugadores.map(j => j.id);
  const figura = (id: string) => miembros.find(m => m.id === id)?.figura;
  const momentos = c ? momentosCeremonia(c) : [];
  const [k, setK] = useState(modo === "tv" ? 0 : momentos.length);
  useEffect(() => {
    if (modo !== "tv" || k >= momentos.length) return;
    const t = setTimeout(() => setK(x => x + 1), 5000);
    return () => clearTimeout(t);
  }, [modo, k, momentos.length]);
  if (!c || c.juegos === 0) return <div className="cc cc-vacia"><Copa tono="oro" size={120} /><span className="dsp ol cc-t">Copas de la noche</span><p>Todavía no se terminó ningún juego.</p></div>;
  const Gente = ({ g }: { g: Momento["gente"][number] }) => (
    <span className="cc-gente">{g.jugadores.map(id => (
      <span key={id} className="cc-persona" style={varsColor(colorDe(id, ids))}><Retrato id={id} figura={figura(id)} nombre={nombreDe(v, id)} size={modo === "tv" ? 110 : 44} /><NombreJugador nombre={nombreDe(v, id)} figura={figura(id)} clase="" /></span>
    ))}</span>
  );
  if (modo === "tv" && k < momentos.length) {
    const m = momentos[k]!;
    return (
      <div className="cc cc-tv" key={k}>
        <span className="cc-sub dsp ol">Copas de la noche · {c.juegos} {c.juegos === 1 ? "juego" : "juegos"}</span>
        <span className="cc-t dsp ol">{m.titulo}</span>
        <div className="cc-copa-grande"><Copa tono={m.copa} texto={m.texto} size={200} /></div>
        {m.gente.map(g => <div key={g.nombre} className="cc-ganador"><Gente g={g} />{g.jugadores.length > 1 && <b className="dsp ol">{g.nombre}</b>}<small>{g.puntos} puntos</small></div>)}
        {m.gente.length > 1 && <p className="cc-empate dsp ol">¡Empate!</p>}
      </div>
    );
  }
  return (
    <div className={"cc cc-todas cc-" + modo}>
      <span className="cc-t dsp ol">Copas de la noche</span>
      <ul className="cc-lista">{[...momentos].sort((x, y) => ORDEN_COPA.indexOf(x.copa) - ORDEN_COPA.indexOf(y.copa)).map(m => (
        <li key={m.titulo}><Copa tono={m.copa} texto={m.texto} size={modo === "tv" ? 110 : 64} />
          <div><b className="dsp">{m.titulo}</b>{m.gente.map(g => <span key={g.nombre} className="cc-linea">{g.jugadores.length > 1 ? g.nombre : nombreDe(v, g.jugadores[0])} · {g.puntos} pts</span>)}</div>
        </li>
      ))}</ul>
      <span className="cc-sub dsp ol">Puntos de la noche</span>
      <Posiciones v={v} miembros={miembros} puntos={c.totales} grande={modo === "tv"} />
      <p className="cc-gracias dsp ol">¡Gracias por jugar!</p>
    </div>
  );
}
