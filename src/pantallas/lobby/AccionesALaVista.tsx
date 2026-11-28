// Auditoría 28 nov: en celular, los botones fijos de abajo (Herramientas y Comodines) tapaban «¡Respondió!» / «Tomó»
// y otros botones de decisión que quedan al final de la pantalla. Cuando aparecen botones nuevos y el último queda
// debajo de esa franja, la pantalla se recorre lo justo para dejarlo a la vista. No hace nada si ya se ve.
import { useEffect, useRef } from "react";

const FRANJA = 84;
const MENOS_MOV = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** `clave` cambia con cada momento del juego (ronda, fase, carta): por momento se acomoda una sola vez, así no pelea con
 *  quien se recorre a mano. */
export function AccionesALaVista({ clave }: { clave: string }) {
  const firma = useRef("");
  useEffect(() => {
    // Después del reparto de la carta (560 ms), para medir ya en su lugar.
    const t = setTimeout(() => {
      const caja = document.querySelector(".pt-caja");
      if (!caja) return;
      // El botón de más abajo que quede (aunque sea en parte) debajo de la franja de botones fijos.
      const tapado = [...caja.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")].filter(b => {
        const r = b.getBoundingClientRect();
        return r.height > 0 && r.top < innerHeight && r.bottom > innerHeight - FRANJA;
      }).at(-1);
      const ahora = tapado ? `${clave}|${tapado.textContent}` : "";
      if (!tapado || ahora === firma.current) return;
      firma.current = ahora;
      // scrollIntoView sirve aunque quien se recorre sea el marco y no la ventana.
      tapado.style.scrollMarginBottom = `${FRANJA + 8}px`;
      tapado.scrollIntoView({ block: "end", behavior: MENOS_MOV ? "auto" : "smooth" });
    }, 650);
    return () => clearTimeout(t);
  });
  return null;
}
