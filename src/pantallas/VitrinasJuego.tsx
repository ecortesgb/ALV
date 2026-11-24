// Elegir juego (Elías, 24 nov; referencias: vitrinas en estante y en plataforma giratoria).
// Primero tarjetas de categoría con un abanico de portadas; al tocar una, sus juegos en vitrinas de cristal que giran
// sobre una plataforma: la del centro crece y brilla, las de los lados quedan atrás. Cada imagen se ve completa (contain).
// Girar: flechas, deslizar, teclado o tocar una vitrina de lado. Tocar la del centro la elige (y el paso sigue solo).
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { JUEGOS } from "../content/catalogo";
import { ARTE_JUEGOS, EMOJI_JUEGO } from "../content/arteJuegos";
import type { DefinicionJuego } from "../engine/types";
import { FILAS, duracion, gente } from "./Catalogo";
import { srcArte } from "./TarjetasConfig";
import { aviso } from "./comun";
import "./vitrinas.css";

const defJuego = (id: string) => JUEGOS.find(j => j.id === id);

/** Portada de un juego: su ilustración completa o, si no tiene, su emoji sobre un resplandor. */
function Portada({ id, className = "" }: { id: string; className?: string }) {
  const arte = ARTE_JUEGOS[id];
  return arte ? <img className={"vt-img " + className} src={srcArte(arte)} alt="" draggable={false} loading="lazy" />
    : <span className={"vt-sinarte " + className} aria-hidden="true">{EMOJI_JUEGO[id] ?? "🎲"}</span>;
}

export interface Categoria { id: string; nombre: string; color: string; juegos: string[] }

/** Categorías con al menos un juego configurable. */
export function categoriasDe(configurables: (id: string) => boolean): Categoria[] {
  return FILAS.map(f => ({ ...f, juegos: f.juegos.filter(configurables) })).filter(f => f.juegos.length > 0);
}

/** Tarjetas de categoría: color, nombre, cuántos juegos y un abanico con sus portadas. */
export function Categorias({ categorias, actual, alElegir }: { categorias: Categoria[]; actual?: string; alElegir: (id: string) => void }) {
  return (
    <div className="vt-cats" role="list">
      {categorias.map((c, i) => (
        <button key={c.id} type="button" role="listitem" className={"vt-cat" + (actual === c.id ? " on" : "")} style={{ "--vc": c.color, "--i": i } as CSSProperties} onClick={() => alElegir(c.id)}
          aria-label={`${c.nombre}: ${c.juegos.length} ${c.juegos.length === 1 ? "juego" : "juegos"}`}>
          <span className="vt-cat-fan" aria-hidden="true">
            {c.juegos.slice(0, 3).map((id, k, xs) => <span key={id} className="vt-cat-carta" style={{ "--k": k - (xs.length - 1) / 2, zIndex: 3 - Math.abs(k - (xs.length - 1) / 2) * 2 } as CSSProperties}><Portada id={id} /></span>)}
          </span>
          <span className="vt-cat-txt"><b>{c.nombre}</b><small>{c.juegos.length} {c.juegos.length === 1 ? "juego" : "juegos"}</small></span>
        </button>
      ))}
    </div>
  );
}

/** Vitrinas giratorias de una categoría. `candado` dice por qué un juego no se puede (o null). */
export function Vitrinas({ categoria, elegido, candado, alElegir }: {
  categoria: Categoria; elegido: string; candado: (j: DefinicionJuego) => string | null; alElegir: (id: string) => void;
}) {
  const ids = categoria.juegos;
  const n = ids.length;
  const [i, setI] = useState(() => Math.max(0, ids.indexOf(elegido)));
  useEffect(() => { setI(Math.max(0, ids.indexOf(elegido))); }, [categoria.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const girar = (k: number) => setI(x => (((x + k) % n) + n) % n);
  // Teclado: flechas giran, Enter elige.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); girar(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); girar(-1); }
      else if (e.key === "Enter") { e.preventDefault(); elegir(ids[i]!); }
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  });
  const toque = useRef<number | null>(null);
  const movido = useRef(false);
  const elegir = (id: string) => {
    const d = defJuego(id); if (!d) return;
    const c = candado(d);
    if (c) { aviso(`${d.nombre}: ${c}`); return; }
    alElegir(id);
  };
  const actual = defJuego(ids[i]!);
  const cActual = actual ? candado(actual) : null;

  return (
    <div className="vt" style={{ "--vc": categoria.color } as CSSProperties}>
      <div className="vt-cab" key={ids[i]} aria-live="polite">
        <b className="vt-nombre">{actual?.nombre}</b>
        {actual && <span className="vt-datos"><span>{gente(actual)} jugadores</span><span>{duracion(actual)}</span>{actual.sigla && <span>{actual.sigla}</span>}</span>}
        {actual && <p className="vt-desc">{cActual ? `🔒 ${cActual}` : actual.descripcion}</p>}
      </div>

      <div className="vt-escena"
        onPointerDown={e => { toque.current = e.clientX; movido.current = false; }}
        onPointerMove={e => { if (toque.current !== null && Math.abs(e.clientX - toque.current) > 12) movido.current = true; }}
        onPointerUp={e => { const x = toque.current; toque.current = null; if (x === null) return; const dx = e.clientX - x; if (Math.abs(dx) > 40) girar(dx < 0 ? 1 : -1); }}>
        <span className="vt-plataforma" aria-hidden="true" />
        {ids.map((id, k) => {
          // Distancia más corta al centro (la plataforma da la vuelta).
          let d = k - i; if (d > n / 2) d -= n; if (d < -n / 2) d += n;
          const lejos = Math.abs(d) > 2;
          const def = defJuego(id);
          const c = def ? candado(def) : null;
          return (
            <button key={id} type="button" tabIndex={d === 0 ? 0 : -1} aria-hidden={d !== 0}
              className={"vt-caja" + (d === 0 ? " centro" : "") + (id === elegido ? " elegida" : "") + (c ? " cerrada" : "") + (lejos ? " lejos" : "")}
              style={{ "--d": d, "--ad": Math.abs(d) } as CSSProperties}
              onClick={() => { if (movido.current) return; if (d === 0) elegir(id); else girar(d); }}
              aria-label={d === 0 ? `Elegir ${def?.nombre ?? id}${c ? `. Bloqueado: ${c}` : ""}` : `Ver ${def?.nombre ?? id}`}>
              <span className="vt-cristal"><Portada id={id} /><span className="vt-brillo" aria-hidden="true" /></span>
              <span className="vt-placa">{def?.nombre}</span>
              {c && <span className="vt-candado" aria-hidden="true">🔒</span>}
            </button>
          );
        })}
      </div>

      <div className="vt-mando">
        <button type="button" className="vt-flecha" onClick={() => girar(-1)} aria-label="Juego anterior" disabled={n < 2}>◀</button>
        <button type="button" className={"vt-elegir" + (cActual ? " cerrada" : "")} onClick={() => elegir(ids[i]!)}>{cActual ? "Bloqueado" : ids[i] === elegido ? "¡Jugar este!" : "¡Elegir!"}</button>
        <button type="button" className="vt-flecha" onClick={() => girar(1)} aria-label="Siguiente juego" disabled={n < 2}>▶</button>
      </div>
      <div className="vt-puntos" aria-hidden="true">{ids.map((id, k) => <i key={id} className={k === i ? "on" : ""} />)}</div>
    </div>
  );
}
