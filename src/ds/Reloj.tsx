import type { CSSProperties } from "react";

/** Anillo de cuenta regresiva: amarillo mientras hay tiempo, rojo en los últimos 10 segundos. */
export function Reloj({ segundos, total, pausado, style }: { segundos: number; total: number; pausado?: boolean; style?: CSSProperties }) {
  const s = Math.max(0, Math.ceil(segundos));
  const pct = total > 0 ? Math.max(0, Math.min(1, segundos / total)) : 0;
  const r = 44, c = 2 * Math.PI * r;
  const color = s <= 10 ? "var(--rojo-fbi)" : "var(--amarillo)";
  return (
    <div className={"d-ring" + (pausado ? " pausa" : "")} style={{ position: "relative", inset: "auto", ...style }} role="timer"
      aria-label={pausado ? `En pausa, quedan ${s} segundos` : `Quedan ${s} segundos`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(233,236,245,.14)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={c.toFixed(1)} strokeDashoffset={(c * (1 - pct)).toFixed(1)} />
      </svg>
      <b>{s}</b>
    </div>
  );
}
