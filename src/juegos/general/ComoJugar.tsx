// «Cómo jugar» (Maestro v1.44): láminas con las reglas antes de la primera ronda, si el anfitrión lo pidió.
// Estilo pantalla «How to play» de juego de fiesta: nombre del juego en cinta, ilustración grande a un lado,
// lámina al otro y barra abajo con anterior, puntos y siguiente. Solo usa la vista pública (TV y celular).
// Celular: cada quien avanza (botones, deslizar o flechas del teclado) o toca «Omitir»; la última dice «¡A jugar!».
// TV: las láminas pasan solas con una barra de tiempo. Se quita en cuanto la partida arranca.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { laminas } from "../../content/comoJugar";
import { ARTE_JUEGOS, EMOJI_JUEGO } from "../../content/arteJuegos";
import { colorDe } from "../../pantallas/Catalogo";
import { srcArte } from "../../pantallas/TarjetasConfig";
import { nombreJuego, type Publico } from "./texto";
import "./comoJugar.css";

/** ¿Toca mostrar «Cómo jugar»? Solo al inicio de la primera ronda, antes de que nadie haga nada. */
export const tocaExplicar = (v: Publico) =>
  !!v.explicar && v.ronda === 1 && v.fase === "contestando" && v.contestaron.length === 0 && Object.keys(v.pistas).length === 0;

const SEG_TV = 8;

export function ComoJugar({ v, modo, alCerrar }: { v: Publico; modo: "tv" | "celular"; alCerrar?: () => void }) {
  const lams = laminas(v.juegoId, v.modalidad);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  // Se dibuja en la raíz de la pantalla (.D) para quedar encima de todo, también del marcador de la TV.
  const ancla = useRef<HTMLSpanElement>(null);
  const [raiz, setRaiz] = useState<Element | null>(null);
  useEffect(() => { setRaiz(ancla.current?.closest(".D") ?? null); }, []);
  const total = lams.length, ultima = i >= total - 1;
  const ir = (k: number) => { if (k < 0 || k >= total) return; setDir(k >= i ? 1 : -1); setI(k); };
  const sig = () => (ultima ? alCerrar?.() : ir(i + 1));
  // TV: pasan solas y vuelven a empezar.
  useEffect(() => {
    if (modo !== "tv" || total < 2) return;
    const t = setTimeout(() => { setDir(1); setI(x => (x + 1) % total); }, SEG_TV * 1000);
    return () => clearTimeout(t);
  }, [modo, total, i]);
  // Celular: flechas del teclado y Escape para omitir.
  useEffect(() => {
    if (modo !== "celular") return;
    const f = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); sig(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); ir(i - 1); }
      else if (e.key === "Escape") alCerrar?.();
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  });
  // Deslizar con el dedo.
  const toque = useRef<number | null>(null);
  if (!total) return null;
  if (!raiz) return <span ref={ancla} hidden />;
  const l = lams[Math.min(i, total - 1)]!;
  const arte = ARTE_JUEGOS[v.juegoId];
  return createPortal(
    <div className={"cj cj-" + modo} role="dialog" aria-modal="true" aria-label={`Cómo jugar ${nombreJuego(v.juegoId)}`} style={{ "--tc": colorDe(v.juegoId) } as CSSProperties}
      onPointerDown={e => { toque.current = e.clientX; }}
      onPointerUp={e => { if (modo !== "celular" || toque.current == null) return; const dx = e.clientX - toque.current; toque.current = null; if (dx < -50) sig(); else if (dx > 50) ir(i - 1); }}>
      <div className="cj-cab">
        <span className="cj-cinta dsp ol">{nombreJuego(v.juegoId)}</span>
        <span className="cj-cuenta dsp" aria-live="polite">{i + 1} / {total}</span>
        {modo === "celular" && <button type="button" className="cj-omitir" onClick={alCerrar}>Omitir <span aria-hidden="true">⏭</span></button>}
      </div>
      <div className="cj-cuerpo">
        <div className="cj-ilus">
          {arte ? <img src={srcArte(arte)} alt="" draggable={false} /> : <span className="cj-sinarte" aria-hidden="true"><span>{EMOJI_JUEGO[v.juegoId] ?? "🎲"}</span></span>}
          <span className="cj-insignia" key={i} aria-hidden="true">{l.icono}</span>
        </div>
        <div className="cj-texto" key={i} style={{ "--dir": dir } as CSSProperties}>
          <span className="cj-como dsp ol">Cómo jugar</span>
          <b className="cj-titulo dsp ol">{l.titulo}</b>
          <p>{l.texto}</p>
        </div>
      </div>
      <div className="cj-barra">
        {modo === "celular" && <button type="button" className="cj-flecha atras" onClick={() => ir(i - 1)} disabled={i === 0} aria-label="Lámina anterior">‹</button>}
        <div className="cj-puntos" role="tablist" aria-label="Láminas">
          {lams.map((x, k) => <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={x.titulo} className={k === i ? "on" : k < i ? "visto" : ""} onClick={() => ir(k)} />)}
        </div>
        {modo === "celular"
          ? <button type="button" className={"cj-flecha sig" + (ultima ? " final" : "")} onClick={sig} aria-label={ultima ? "¡A jugar!" : "Siguiente lámina"}>{ultima ? <span className="dsp">¡A jugar!</span> : "›"}</button>
          : <span className="cj-tiempo" key={i} style={{ "--seg": `${SEG_TV}s` } as CSSProperties} aria-hidden="true" />}
      </div>
      {modo === "tv" && <p className="cj-nota">La partida empieza en cuanto alguien juegue en su celular.</p>}
    </div>,
    raiz,
  );
}
