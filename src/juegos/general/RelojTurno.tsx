// Cuenta regresiva del turno (temporizador, Maestro 6A.11 C6). Solo usa la vista pública: `turnoReloj`.
// Si el anfitrión no eligió temporizador, no se dibuja nada.
import { useEffect, useRef, useState } from "react";
import { Reloj } from "../../ds";
import type { Publico } from "./texto";

export function RelojTurno({ v, size = "3.6em", className = "" }: { v: Publico; size?: string; className?: string }) {
  const r = v.turnoReloj;
  const activo = !!r && v.fase === "contestando" && !v.pausada;
  const [, set] = useState(0);
  useEffect(() => { if (!activo) return; const t = setInterval(() => set(x => x + 1), 250); return () => clearInterval(t); }, [activo]);
  // En pausa se ve congelado en lo que quedaba (antes desaparecía).
  const ultimo = useRef<number | null>(null);
  if (!r || v.fase !== "contestando" || (!activo && ultimo.current === null)) { ultimo.current = null; return null; }
  if (activo) ultimo.current = Math.max(0, (r.fin - Date.now()) / 1000);
  const quedan = ultimo.current!;
  return (
    <div className={"rt " + className} title="Tiempo del turno">
      <Reloj segundos={quedan} total={r.total} pausado={v.pausada} style={{ width: size, height: size }} />
    </div>
  );
}
