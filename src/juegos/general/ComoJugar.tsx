// Pantalla de carga (Elías, 24 nov; referencias: pantallas de carga de Fall Guys, Fortnite, LEGO Party).
// Siempre al iniciar una partida: una tarjeta del juego (de qué se trata y cómo se gana) y luego una por herramienta,
// temporizador y escenario. Pasan solas cada pocos segundos y vuelven a empezar hasta que cada quien toca «¡Iniciar!».
// Solo usa la vista pública (TV y celular). Celular: tocar a la derecha o izquierda cambia de tarjeta, deslizar también,
// «Omitir» entra ya. TV: pasan solas y se quita en cuanto la partida arranca.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { tarjetasCarga, type GrupoTarjeta, type Tarjeta } from "../../content/comoJugar";
import { ARTE_JUEGOS } from "../../content/arteJuegos";
import { colorDe } from "../../pantallas/Catalogo";
import { SinArte, srcArte } from "../../pantallas/TarjetasConfig";
import { nombreJuego, type Publico } from "./texto";
import "./carga.css";

/** ¿Toca mostrar la carga? Solo al inicio de la primera ronda, antes de que nadie haga nada. */
export const tocaExplicar = (v: Publico) =>
  !!v.explicar && v.ronda === 1 && v.fase === "contestando" && v.contestaron.length === 0 && Object.keys(v.pistas).length === 0;

/** Segundos por tarjeta y lo que tarda en «cargar» antes de habilitar «¡Iniciar!». */
const SEG = 6;
const CARGA_MS = 2600;
const ETIQUETA: Record<GrupoTarjeta, string> = { juego: "Cómo se juega", herramienta: "Herramienta", escenario: "Escenario" };

/** `menu`: el ☰ de la partida (salir o terminar), para que la pantalla de carga no deje a nadie sin salida. */
export function ComoJugar({ v, modo, alCerrar, menu }: { v: Publico; modo: "tv" | "celular"; alCerrar?: () => void; menu?: ReactNode }) {
  const tarjetas = tarjetasCarga({ juegoId: v.juegoId, modalidad: v.modalidad, herramienta: v.verdadReto?.herramienta, temporizador: v.temporizador, escenario: v.escenario, nave: v.impostor?.nave });
  const arte = ARTE_JUEGOS[v.juegoId];
  return <PantallaCarga nombre={nombreJuego(v.juegoId)} color={colorDe(v.juegoId)} tarjetas={tarjetas} arte={arte} modo={modo} alCerrar={alCerrar} menu={menu} />;
}

/** Tarjeta de carga con los botones del mando que usa (ALV PARTY). */
export type TarjetaCarga = Tarjeta & { botones?: { src: string; nombre: string }[] };

/**
 * La pantalla de carga en sí: la usan los juegos de mesa (ComoJugar) y ALV PARTY (pantallas/party/CargaParty.tsx).
 * `arte`: ilustración de respaldo (dentro de public/arte/). `notaTv`: el texto de abajo en la TV.
 * `alVuelta`: se llama cuando ya pasaron todas las tarjetas una vez.
 */
export function PantallaCarga({ nombre, color, tarjetas, arte, modo, alCerrar, menu, notaTv, alVuelta }: {
  nombre: string; color: string; tarjetas: TarjetaCarga[]; arte?: string; modo: "tv" | "celular"; alCerrar?: () => void; menu?: ReactNode;
  notaTv?: string; alVuelta?: () => void;
}) {
  const total = tarjetas.length;
  const [i, setI] = useState(0);
  const [vuelta, setVuelta] = useState(0); // reinicia la barra de la tarjeta actual
  const [cargado, setCargado] = useState(false);
  const [sinImagen, setSinImagen] = useState<Record<number, true>>({});
  // Se dibuja en la raíz de la pantalla (.D) para quedar encima de todo, también del marcador de la TV.
  const ancla = useRef<HTMLSpanElement>(null);
  const [raiz, setRaiz] = useState<Element | null>(null);
  useEffect(() => { setRaiz(ancla.current?.closest(".D") ?? null); }, []);
  useEffect(() => { const t = setTimeout(() => setCargado(true), CARGA_MS); return () => clearTimeout(t); }, []);
  const ir = (k: number) => { if (!total) return; setI(((k % total) + total) % total); setVuelta(x => x + 1); };
  // Pasan solas y vuelven a empezar.
  useEffect(() => {
    if (total < 2 && !alVuelta) return;
    const t = setTimeout(() => { if (i === total - 1) alVuelta?.(); if (total > 1) ir(i + 1); }, SEG * 1000);
    return () => clearTimeout(t);
  }, [i, vuelta, total]); // eslint-disable-line react-hooks/exhaustive-deps
  // Celular: flechas del teclado, Enter para iniciar y Escape para omitir.
  useEffect(() => {
    if (modo !== "celular") return;
    const f = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); ir(i + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); ir(i - 1); }
      else if (e.key === "Escape" || (e.key === "Enter" && cargado)) alCerrar?.();
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  });
  const toque = useRef<{ x: number; t: number } | null>(null);
  if (!total) return null;
  if (!raiz) return <span ref={ancla} hidden />;
  const l = tarjetas[Math.min(i, total - 1)]!;
  const src = l.imagen && !sinImagen[i] ? srcArte(l.imagen) : arte ? srcArte(arte) : null;
  const tocar = (x: number, ancho: number) => { if (modo === "celular") ir(x > ancho * 0.4 ? i + 1 : i - 1); };

  return createPortal(
    <div className={`cg cg-${modo} cg-${l.grupo}`} role="dialog" aria-modal="true" aria-label={`Cargando ${nombre}`} style={{ "--tc": color, "--seg": `${SEG}s` } as CSSProperties}>
      {/* Fondo: la misma imagen desenfocada y oscurecida. */}
      <div className="cg-fondo" key={`f${i}`} aria-hidden="true" style={src ? { backgroundImage: `url("${src}")` } : undefined} />
      <div className="cg-velo" aria-hidden="true" />

      <div className="cg-barras" aria-hidden="true">
        {tarjetas.map((_, k) => <span key={k} className={k < i ? "llena" : k === i ? "on" : ""}>{k === i && <i key={`${i}-${vuelta}`} />}</span>)}
      </div>

      <header className="cg-cab">
        {modo === "celular" && menu}
        <span className="cg-juego"><b>{nombre}</b><small>{cargado ? "Partida lista" : "Cargando partida…"}</small></span>
        {modo === "celular" && <button type="button" className="cg-omitir" onClick={alCerrar}>Omitir <span aria-hidden="true">▶▶</span></button>}
      </header>

      <div className="cg-cuerpo"
        onPointerDown={e => { toque.current = { x: e.clientX, t: Date.now() }; }}
        onPointerUp={e => {
          const t = toque.current; toque.current = null;
          if (!t || modo !== "celular") return;
          const dx = e.clientX - t.x;
          if (Math.abs(dx) > 50) ir(dx < 0 ? i + 1 : i - 1);
          else if (Date.now() - t.t < 400) { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); tocar(e.clientX - r.left, r.width); }
        }}>
        <figure className="cg-ilus" key={`i${i}`}>
          {src ? <img src={src} alt="" draggable={false} onError={() => setSinImagen(s => ({ ...s, [i]: true }))} /> : <SinArte />}
        </figure>
        <div className="cg-texto" key={`t${i}`}>
          <span className="cg-etq">{ETIQUETA[l.grupo]}</span>
          <h2 className="cg-titulo">{l.titulo}</h2>
          <p>{l.texto}</p>
          {l.consejo && <p className="cg-consejo"><span aria-hidden="true">★</span>{l.consejo}</p>}
          {"botones" in l && l.botones?.length ? <span className="cg-botones">{l.botones.map(b => <img key={b.src} src={b.src} alt={b.nombre} draggable={false} />)}</span> : null}
        </div>
      </div>

      <footer className="cg-pie">
        {modo === "celular" ? <>
          <button type="button" className="cg-sig" onClick={() => ir(i + 1)} aria-label="Siguiente tarjeta">Siguiente <span aria-hidden="true">▶</span></button>
          <button type="button" className={"cg-iniciar" + (cargado ? " listo" : "")} disabled={!cargado} onClick={alCerrar}>
            {cargado ? <><span aria-hidden="true">▶</span> ¡Iniciar!</> : <><i className="cg-giro" aria-hidden="true" /> Cargando…</>}
          </button>
        </> : <p className="cg-nota">{cargado ? notaTv ?? "La partida empieza en cuanto alguien juegue en su celular." : "Cargando partida…"}</p>}
      </footer>
    </div>,
    raiz,
  );
}
