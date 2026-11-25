// El impostor en la nave: «Opciones del juego» del configurador (Elías, 24 nov).
// Pantalla partida a la mitad (Elías): a la izquierda, arriba, un carrusel con las imágenes de 1, 2 o 3 impostores
// (se cambia con las flechas de los lados o deslizando) y abajo una rueda de categorías que se desliza: la del centro
// resalta y es la elegida. A la derecha, las reglas con interruptores. En celular se apila en ese mismo orden.
// Todo cabe en una pantalla, sin bajar.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as PE } from "react";
import { srcArte } from "../../pantallas/TarjetasConfig";
import { ArteCategoria, categoriasNave } from "./papelNave";
import { arteNave } from "./nave";
import "./opcionesNave.css";

/** Color propio de cada categoría (fondo de su tarjeta y brillo de la del centro). */
const COLOR_CATEGORIA: Record<string, string> = {
  azar: "#b388ff", "s-pel": "#ff5a66", "s-vid": "#7c5cff", "s-ser": "#2ee6d6", "s-can": "#ff8c42", "s-sup": "#3d7bff",
  "s-ani": "#ff6ad5", "s-cel": "#ffc21a", "s-fut": "#3ddc84", "s-adu": "#ff3d4a", "s-obj": "#9aa3b8",
};
/** Jugadores que hacen falta para x impostores (`maxImpostores(n) = ⌊(n−1)/2⌋`). */
const minimoPara = (x: number) => 2 * x + 1;

export interface OpcionesNaveProps {
  jugadores: number; maxImpostores: number; adulto: boolean; drunk: boolean;
  impostores: number; alImpostores: (n: number) => void;
  tema: string | null; alTema: (t: string | null) => void;
  votos: "visibles" | "secretos"; alVotos: (v: "visibles" | "secretos") => void;
  revelar: boolean; alRevelar: (v: boolean) => void;
  pista: boolean; alPista: (v: boolean) => void;
  castigo: boolean; alCastigo: (v: boolean) => void;
}

export function OpcionesNave(p: OpcionesNaveProps) {
  const k = Math.min(p.impostores, p.maxImpostores);
  return (
    <div className="onv" style={{ "--espacio": arteNave("espacio") } as CSSProperties}>
      <div className="on-izq">
        <CarruselImpostores jugadores={p.jugadores} max={p.maxImpostores} k={k} alCambiar={p.alImpostores} />
        <RuedaCategorias adulto={p.adulto} tema={p.tema} alTema={p.alTema} />
      </div>

      <section className="on-bloque on-reglas-b" aria-labelledby="on-reglas">
        <header className="on-cab"><span id="on-reglas" className="on-bt dsp">Reglas</span></header>
        <Interruptor icono="🤫" titulo="Votos secretos" valor={p.votos === "secretos"} alCambiar={x => p.alVotos(x ? "secretos" : "visibles")}
          detalle={p.votos === "secretos" ? "Votos en gris, sin decir de quién" : "Cada voto lleva el color de quien votó"} />
        <Interruptor icono="📣" titulo="Decir si era impostor" valor={p.revelar} alCambiar={p.alRevelar}
          detalle={p.revelar ? "Al expulsar a alguien se sabe qué era" : "Nadie sabe qué era hasta el final"} />
        <Interruptor icono="💡" titulo="Pista para el impostor" valor={p.pista} alCambiar={p.alPista}
          detalle={p.pista ? "Ve una palabra que ayuda poquito" : "Solo ve la categoría"} />
        <Interruptor icono={p.drunk ? "🍹" : "😬"} titulo="Castigo al que pierde" valor={p.castigo} alCambiar={p.alCastigo}
          detalle={p.castigo ? (p.drunk ? "Un trago de lo que tengas (el agua cuenta)" : "Un castigo leve del mazo") : "Solo puntos"} />
      </section>
    </div>
  );
}

/** Carrusel de 1, 2 o 3 impostores: una imagen por cuadro; flechas a los lados, deslizar o teclado.
 *  Lo que se ve es lo elegido; los que no alcanzan por jugadores se saltan y su punto lleva candado. */
function CarruselImpostores({ jugadores, max, k, alCambiar }: { jugadores: number; max: number; k: number; alCambiar: (n: number) => void }) {
  const inicio = useRef<number | null>(null);
  const ir = (x: number) => { if (x >= 1 && x <= Math.min(3, max) && x !== k) alCambiar(x); };
  const civiles = Math.max(0, jugadores - k);
  const bloqueado = [1, 2, 3].find(x => x > max);
  return (
    <section className="on-bloque on-imp" aria-roledescription="carrusel" aria-label="¿Cuántos impostores?"
      onKeyDown={e => { if (e.key === "ArrowLeft") ir(k - 1); if (e.key === "ArrowRight") ir(k + 1); }}>
      <div className="on-marco"
        onPointerDown={(e: PE) => { inicio.current = e.clientX; }}
        onPointerUp={(e: PE) => { const d = inicio.current == null ? 0 : e.clientX - inicio.current; inicio.current = null; if (d > 40) ir(k - 1); if (d < -40) ir(k + 1); }}
        onPointerCancel={() => { inicio.current = null; }}>
        <div className="on-pista" style={{ transform: `translateX(${-(k - 1) * 100}%)` }}>
          {[1, 2, 3].map(x => (
            <figure key={x} className={"on-cuadro" + (x > max ? " cerrado" : "")} aria-hidden={x !== k}>
              <img src={srcArte(`impostor/impostores-${x}.webp`)} alt={`${x} ${x === 1 ? "impostor" : "impostores"}`} draggable={false} />
            </figure>
          ))}
        </div>
        <button type="button" className="on-flecha izq" aria-label="Menos impostores" disabled={k <= 1} onClick={() => ir(k - 1)}>‹</button>
        <button type="button" className="on-flecha der" aria-label="Más impostores" disabled={k >= Math.min(3, max)} onClick={() => ir(k + 1)}>›</button>
        <div className="on-barra">
          <span className="on-puntos" role="radiogroup" aria-label="Impostores">
            {[1, 2, 3].map(x => (
              <button key={x} type="button" role="radio" aria-checked={k === x} disabled={x > max} className={k === x ? "on" : ""}
                title={x > max ? `Desde ${minimoPara(x)} jugadores` : undefined}
                aria-label={x > max ? `${x} impostores: desde ${minimoPara(x)} jugadores` : `${x} ${x === 1 ? "impostor" : "impostores"}`} onClick={() => ir(x)}>
                {x > max ? "🔒" : x}
              </button>
            ))}
          </span>
          <span className="on-civiles">+ {civiles} {civiles === 1 ? "civil" : "civiles"}</span>
        </div>
      </div>
      {bloqueado && <small className="on-nota">🔒 {bloqueado} impostores: desde {minimoPara(bloqueado)} jugadores</small>}
    </section>
  );
}

/** Rueda de categorías: se desliza a los lados; la que queda al centro resalta y es la elegida.
 *  Tocar una la trae al centro; las flechas mueven una a la vez. */
function RuedaCategorias({ adulto, tema, alTema }: { adulto: boolean; tema: string | null; alTema: (t: string | null) => void }) {
  const cats = categoriasNave(adulto);
  const elegida = Math.max(0, cats.findIndex(t => t.id === tema));
  const [centro, setCentro] = useState(elegida);
  const caja = useRef<HTMLDivElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ultimo = useRef(tema);
  ultimo.current = tema;

  const llevar = (i: number, suave = true) => {
    const c = caja.current, el = c?.children[i] as HTMLElement | undefined;
    if (!c || !el) return;
    c.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - c.clientWidth / 2, behavior: suave ? "smooth" : "auto" });
  };
  // Al abrir (o si cambia la lista), la elegida ya está al centro.
  useEffect(() => { llevar(elegida, false); setCentro(elegida); }, [cats.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(espera.current), []);

  const alDeslizar = () => {
    const c = caja.current; if (!c) return;
    const medio = c.scrollLeft + c.clientWidth / 2;
    let mejor = 0, dist = Infinity;
    [...c.children].forEach((n, i) => { const el = n as HTMLElement; const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - medio); if (d < dist) { dist = d; mejor = i; } });
    setCentro(mejor);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => { const id = cats[mejor]?.id ?? null; if (id !== ultimo.current) alTema(id); }, 140);
  };

  const nombre = cats[centro]?.nombre ?? "";
  return (
    <section className="on-bloque on-cat-b" aria-labelledby="on-cat">
      <header className="on-cab">
        <span id="on-cat" className="on-bt dsp">Categoría</span>
        <span className="on-elegida">{nombre}</span>
      </header>
      <div className="on-rueda-m">
        <div ref={caja} className="on-rueda" role="radiogroup" aria-labelledby="on-cat" onScroll={alDeslizar}
          onKeyDown={e => { if (e.key === "ArrowLeft") { e.preventDefault(); llevar(Math.max(0, centro - 1)); } if (e.key === "ArrowRight") { e.preventDefault(); llevar(Math.min(cats.length - 1, centro + 1)); } }}>
          {cats.map((t, i) => {
            const on = i === centro;
            return (
              <button key={t.id ?? "azar"} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} className={"on-cat" + (on ? " on" : "")}
                style={{ "--cc": COLOR_CATEGORIA[t.id ?? "azar"] ?? "#5fb4ff" } as CSSProperties} onClick={() => llevar(i)}>
                <span className="on-cat-arte"><ArteCategoria id={t.id} /></span>
                <span className="on-cat-nom dsp">{t.nombre}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="on-flecha izq chica" aria-label="Categoría anterior" disabled={centro <= 0} onClick={() => llevar(centro - 1)}>‹</button>
        <button type="button" className="on-flecha der chica" aria-label="Categoría siguiente" disabled={centro >= cats.length - 1} onClick={() => llevar(centro + 1)}>›</button>
      </div>
    </section>
  );
}

/** Una regla: icono, título, qué significa lo elegido y un interruptor. */
function Interruptor({ icono, titulo, valor, alCambiar, detalle }: { icono: string; titulo: string; valor: boolean; alCambiar: (v: boolean) => void; detalle: string }) {
  return (
    <button type="button" role="switch" aria-checked={valor} className={"on-regla" + (valor ? " si" : "")} onClick={() => alCambiar(!valor)}>
      <span className="on-regla-ico" aria-hidden="true">{icono}</span>
      <span className="on-regla-txt"><b className="dsp">{titulo}</b><small>{detalle}</small></span>
      <span className="on-sw" aria-hidden="true"><i /></span>
    </button>
  );
}
