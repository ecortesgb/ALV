// Rueda de gestos al tocar tu figura en el HUB, el Perfil, el lobby y la mesa (la misma del constructor, RuedaGestos.tsx).
// Pide el gesto a la tienda global como el menú de botones: «Especial» toca el movimiento especial que elegiste.
// Va en una capa fija porque la figura del HUB puede estar anclada al pedestal (position: fixed).
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { pedirGesto, type Gesto } from "../../app/animaciones";
import { sonar } from "../../app/sonido";
import { tocarVoz } from "../../app/musica";
import { prepararVoz, urlObjeto, vozDe } from "../../app/temas";
import type { FiguraV2 } from "../../content/personaje";
import { RUEDA, RuedaGestos } from "./RuedaGestos";

/** Aviso de primera vez: se queda hasta que abras la rueda una vez en este aparato (Elías, 26 nov). */
const VISTA = "alv-pista-rueda-juego";
const pistaVista = () => { try { return localStorage.getItem(VISTA) === "vista"; } catch { return false; } };
const marcarVista = () => { try { localStorage.setItem(VISTA, "vista"); } catch { /* sin almacenamiento */ } };

export interface MandoRueda {
  /** Abre la rueda junto al punto tocado (coordenadas de la ventana). */
  abrir(x: number, y: number): void;
}

export const RuedaFigura = forwardRef<MandoRueda, { jugador: string; figura?: FiguraV2 | null;
  /** Selector de lo que se toca (tu figura): el aviso de primera vez sale sobre su parte de abajo. Sin él, no hay aviso. */
  pistaSobre?: string }>(function RuedaFigura({ jugador, figura, pistaSobre }, mando) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [pista, setPista] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!pistaSobre || pistaVista()) return;
    const medir = () => {
      const r = document.querySelector(pistaSobre)?.getBoundingClientRect();
      setPista(r && r.width > 20 && r.height > 20 ? { x: Math.max(130, Math.min(innerWidth - 130, r.left + r.width / 2)), y: r.top + r.height * 0.72 } : null);
    };
    // Se mide otra vez un rato: la figura del HUB se acomoda en el pedestal cuando su escena carga.
    const t0 = setTimeout(medir, 1200), t1 = setInterval(medir, 1500);
    addEventListener("resize", medir);
    return () => { clearTimeout(t0); clearInterval(t1); removeEventListener("resize", medir); };
  }, [pistaSobre]);
  // Voz del personaje al hacer «Especial» (temas.ts, Elías 27 nov): se baja antes para que suene al instante.
  useEffect(() => { prepararVoz(figura, "especial"); }, [figura]);
  // El toque que cierra la rueda por fuera también suelta sobre la figura: sin esto se volvería a abrir.
  const cerro = useRef(0);

  useImperativeHandle(mando, () => ({
    abrir(x, y) {
      if (performance.now() - cerro.current < 350) return;
      const radio = Math.min(168, Math.max(136, innerWidth * 0.15)) / 2, borde = radio + 16;
      // Computadora: a un lado de la figura, hacia donde hay más espacio, sin taparla. Celular: no cabe al lado; se pega
      // al borde derecho (o izquierdo si tocaste a la derecha) a la altura del toque y tapa solo media figura.
      const ancho = innerWidth >= 860, haciaDerecha = x < innerWidth / 2;
      const cx = ancho ? x + (haciaDerecha ? 1 : -1) * (radio + 80) : haciaDerecha ? innerWidth - borde : borde;
      const cy = y;
      setPos({ x: Math.max(borde, Math.min(innerWidth - borde, cx)), y: Math.max(borde, Math.min(innerHeight - borde, cy)) });
      sonar("clic");
      setPista(null); marcarVista();
    },
  }), []);

  const elegir = (cual: string) => {
    const g = cual as Gesto;
    // Igual que los botones: el gesto empieza cuando la rueda ya se cerró (late 100 ms y cierra en 120 ms).
    const voz = vozDe(figura, g);
    setTimeout(() => {
      const ok = pedirGesto(jugador, g, figura);
      if (ok && voz) { void urlObjeto(voz).then(u => { if (!u || !tocarVoz(u)) sonar("poder"); }); return; }
      sonar(ok ? (g === "especial" ? "poder" : "clic") : "tic");
    }, 220);
  };
  const cerrar = useCallback(() => { cerro.current = performance.now(); setPos(null); }, []);

  if (!pos && !pista) return null;
  return (
    <div className="rg-capa">
      {pos && <RuedaGestos gestos={RUEDA} x={pos.x} y={pos.y} onElegir={elegir} onCerrar={cerrar} />}
      {!pos && pista && <p className="rg-pista" style={{ left: pista.x, top: pista.y }} aria-hidden="true">Toca a tu personaje para animarlo</p>}
    </div>
  );
});
