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
  // Mesero (Maestro v1.74): queda a la vista en la TV hasta que acaba el juego.
  const mesero = v.duraderos?.mesero && v.fase !== "terminada" && <p className="cm-tv-mesero dsp">🍹 Mesero: <b>{nombreDe(v, v.duraderos.mesero.jugador)}</b></p>;
  if (!activo) return mesero || null;
  // Pista extra en El impostor sale como «secreto»: nadie sabe qué carta fue.
  const c = activo.carta === "secreto" ? null : comodinPorId(activo.carta);
  const ayuda = activo.carta === "salvavidas" || activo.carta === "mano-amiga";
  return (<>{mesero}
    <div className="cm-tv" role="status" aria-live="polite">
      <div className="cm-tv-carta">
        {c?.arte ? <img src={`${import.meta.env.BASE_URL}arte/tienda/${c.arte}`} alt="" /> : <span className="cm-tv-ico" aria-hidden="true">{c?.icono ?? "⚡"}</span>}
      </div>
      <p className="cm-tv-texto dsp ol"><b>{nombreDe(v, activo.jugador)}</b> usó {c?.nombre ?? (activo.carta === "secreto" ? "un comodín secreto" : "un comodín")}{activo.a ? <> {ayuda ? "con" : "contra"} <b>{nombreDe(v, activo.a)}</b></> : null}</p>
      {v.efectos?.bloqueo && v.efectos.bloqueo.de === activo.jugador && <p className="cm-tv-suerte dsp">¡El candado de {nombreDe(v, v.efectos.bloqueo.a)} lo paró!</p>}
      {activo.carta === "duelo-dados" && v.efectos?.duelo && <p className="cm-tv-suerte dsp">{v.efectos.duelo.dados[0]} contra {v.efectos.duelo.dados[1]}: lo cumple {nombreDe(v, v.efectos.duelo.pierde)}</p>}
      {activo.suerte && <p className="cm-tv-suerte dsp">{TEXTO_SUERTE[activo.suerte]}{activo.suerte === "pasa" && v.efectos?.pasoA ? ` Le toca a ${nombreDe(v, v.efectos.pasoA)}.` : ""}</p>}
    </div>
  </>);
}
