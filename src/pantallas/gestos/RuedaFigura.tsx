// Rueda de gestos al tocar tu figura en el HUB y en el Perfil (la misma del constructor, RuedaGestos.tsx).
// Pide el gesto a la tienda global como el menú de botones: «Especial» toca el movimiento especial que elegiste.
// Va en una capa fija porque la figura del HUB puede estar anclada al pedestal (position: fixed).
import { useCallback, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { pedirGesto, type Gesto } from "../../app/animaciones";
import { sonar } from "../../app/sonido";
import type { FiguraV2 } from "../../content/personaje";
import { RUEDA, RuedaGestos } from "./RuedaGestos";

const CABEZA = `${import.meta.env.BASE_URL}arte/ui/personalizar/ico-cabeza.webp`;

export interface MandoRueda {
  /** Abre la rueda junto al punto tocado (coordenadas de la ventana). */
  abrir(x: number, y: number): void;
}

export const RuedaFigura = forwardRef<MandoRueda, { jugador: string; figura?: FiguraV2 | null }>(function RuedaFigura({ jugador, figura }, mando) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
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
    },
  }), []);

  const elegir = (cual: string) => {
    const g = cual as Gesto;
    // Igual que los botones: el gesto empieza cuando la rueda ya se cerró (late 100 ms y cierra en 120 ms).
    setTimeout(() => { const ok = pedirGesto(jugador, g, figura); sonar(ok ? (g === "especial" ? "poder" : "clic") : "tic"); }, 220);
  };
  const cerrar = useCallback(() => { cerro.current = performance.now(); setPos(null); }, []);

  if (!pos) return null;
  return (
    <div className="rg-capa">
      <RuedaGestos gestos={RUEDA} x={pos.x} y={pos.y} centro={CABEZA} onElegir={elegir} onCerrar={cerrar} />
    </div>
  );
});
