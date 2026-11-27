// Animación especial al usar un comodín (Elías, 27 nov, Maestro v1.72): la figura de quien lo usó hace su movimiento
// especial (su poder) y en la TV sale la carta con su nombre. Es de adorno: no cambia puntos ni turnos.
import { useEffect, useRef, useState } from "react";
import { aplicarGestoRemoto, personajeDe } from "../../app/animaciones";
import { comodinPorId } from "../../content/tienda";
import { TEXTO_SUERTE } from "../../content/comodinesPartida";
import type { Miembro } from "../../servicios/enlace";
import { nombreDe, type Publico } from "./texto";
import "./comodines.css";

const DURA_MS = 3600;

export function ComodinTv({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  const u = v.cartaUsada;
  const clave = u ? `${u.ronda}-${u.n ?? 0}-${u.jugador}-${u.carta}` : "";
  const visto = useRef<string | null>(null);
  const [activo, setActivo] = useState<NonNullable<Publico["cartaUsada"]> | null>(null);
  useEffect(() => {
    // La primera vista (al abrir o recargar la TV) no repite el último comodín.
    if (visto.current === null) { visto.current = clave; return; }
    if (!u || clave === visto.current || u.ronda !== v.ronda) return;
    visto.current = clave;
    const figura = miembros.find(m => m.id === u.jugador)?.figura;
    // Solo en este aparato: la figura hace su especial (no se manda a la sala como gesto del jugador).
    aplicarGestoRemoto(u.jugador, "especial", Math.floor(Date.now() / 100), personajeDe(figura));
    setActivo(u);
    const t = setTimeout(() => setActivo(null), DURA_MS);
    return () => clearTimeout(t);
  }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!activo) return null;
  const c = comodinPorId(activo.carta);
  return (
    <div className="cm-tv" role="status" aria-live="polite">
      <div className="cm-tv-carta">
        {c?.arte ? <img src={`${import.meta.env.BASE_URL}arte/tienda/${c.arte}`} alt="" /> : <span className="cm-tv-ico" aria-hidden="true">{c?.icono ?? "⚡"}</span>}
      </div>
      <p className="cm-tv-texto dsp ol"><b>{nombreDe(v, activo.jugador)}</b> usó {c?.nombre ?? "un comodín"}</p>
      {activo.suerte && <p className="cm-tv-suerte dsp">{TEXTO_SUERTE[activo.suerte]}{activo.suerte === "pasa" && v.efectos?.pasoA ? ` Le toca a ${nombreDe(v, v.efectos.pasoA)}.` : ""}</p>}
    </div>
  );
}
