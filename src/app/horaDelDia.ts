// Momento del día para el fondo de ciudad (día, atardecer o noche), con la hora local del aparato.
// Cortes con horas promedio de México (PROPUESTA, 18 nov): amanecer 6:00–7:00 usa la imagen del atardecer,
// día 7:00–18:00, atardecer 18:00–19:30, noche 19:30–6:00.
import { useEffect, useState } from "react";

export type MomentoDia = "dia" | "atardecer" | "noche";

/** Cortes en minutos desde la medianoche: [desde, momento]. Ordenados. */
export const CORTES: readonly (readonly [number, MomentoDia])[] = [
  [0, "noche"], [6 * 60, "atardecer"], [7 * 60, "dia"], [18 * 60, "atardecer"], [19 * 60 + 30, "noche"],
];

export function momentoDeMinutos(min: number): MomentoDia {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  let r: MomentoDia = "noche";
  for (const [desde, cual] of CORTES) if (m >= desde) r = cual;
  return r;
}

/** Minutos que faltan para el siguiente corte (siempre ≥ 1). */
export function minutosAlSiguienteCorte(min: number): number {
  const m = ((min % 1440) + 1440) % 1440;
  const sig = CORTES.map(([d]) => d).find(d => d > m) ?? 1440;
  return Math.max(1, sig - m);
}

/** Hora de prueba en la URL: `?hora=19`, `?hora=19.5` o `?hora=18:45`. Solo para revisar los fondos. */
export function horaDePrueba(busqueda: string): number | null {
  const h = new URLSearchParams(busqueda).get("hora");
  if (!h) return null;
  const m = /^(\d{1,2})(?::(\d{2})|\.(\d+))?$/.exec(h.trim());
  if (!m) return null;
  const horas = Number(m[1]), min = m[2] ? Number(m[2]) : m[3] ? Number("0." + m[3]) * 60 : 0;
  if (horas > 23 || min > 59) return null;
  return horas * 60 + min;
}

const ahoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };

/** Momento del día que cambia solo al pasar el corte, sin recargar. */
export function useMomentoDia(): MomentoDia {
  const prueba = typeof location !== "undefined" ? horaDePrueba(location.search) : null;
  const [m, setM] = useState<MomentoDia>(() => momentoDeMinutos(prueba ?? ahoraMin()));
  useEffect(() => {
    if (prueba !== null) { setM(momentoDeMinutos(prueba)); return; }
    let t = 0;
    const revisar = () => {
      clearTimeout(t);
      const min = ahoraMin();
      setM(momentoDeMinutos(min));
      // Un segundo después del corte; los relojes de pestañas ocultas se atrasan, por eso también al volver a la pestaña.
      t = window.setTimeout(revisar, minutosAlSiguienteCorte(min) * 60_000 + 1000);
    };
    revisar();
    const alVolver = () => { if (document.visibilityState === "visible") revisar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", alVolver); };
  }, [prueba]);
  return m;
}
