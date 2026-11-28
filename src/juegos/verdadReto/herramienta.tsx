// La herramienta de Verdad o reto, dibujada con lo público de la ronda: dados, cartas de póker, reloj, ruleta o en orden.
// Decide quién pregunta y quién responde; no cambia el juego (Maestro 6A.3). La usan el celular y la TV.
// Dados 3D, naipes que se voltean y la botella son las mismas piezas del juego físico (fisico/herramientas.tsx).
import { useEffect, useState, type CSSProperties } from "react";
import { colorDe, varsColor } from "../../app/colorJugador";
import { nombreDe, type Publico } from "../general/texto";
import { BOTELLA_MS, CARTA_MS, DADO_MS, Dado3D, Naipe3D, PALO, RuedaBotella, VALOR, useRevelar } from "../fisico/herramientas";
import "../fisico/fisico.css";
import "./herramienta.css";

interface Sel { herramienta: string; pregunta: string; responde: string; dados?: Record<string, number>; cartas?: Record<string, { v: number; p: number }> }

export const NOMBRE_HERRAMIENTA: Record<string, string> = { orden: "En orden", ruleta: "Ruleta", reloj: "Reloj", dados: "Dados", poker: "Cartas de póker" };

const ACCION: Record<string, string> = { dados: "🎲 ¡Lanzar dados!", poker: "🃏 Voltear cartas", reloj: "🕐 ¡Girar el reloj!", ruleta: "🍾 ¡Girar la botella!" };
/** Entre dado y dado (o carta y carta) para que caigan en cascada. Con 8 jugadores todo termina antes de 2 s. */
const ESCALON_MS = 80;
const RELOJ_MS = 1800;

/**
 * La herramienta se usa (Elías, 24 nov): en el celular hay que tocar para lanzar los dados, voltear las cartas o girar;
 * en la TV pasa sola. El resultado ya lo decidió el motor: aquí solo se anima hasta mostrarlo. Si la ronda ya avanzó,
 * se muestra directo.
 */
export function Herramienta({ v, chica, interactiva }: { v: Publico; chica?: boolean; interactiva?: boolean }) {
  const s = v.seleccion as unknown as Sel | undefined;
  const clave = `${v.ronda}-${s?.herramienta ?? ""}`;
  const [hecho, setHecho] = useState<string | null>(null);
  const yaAvanzo = !!v.verdadReto && v.verdadReto.etapa !== "elegir";
  const usa = !!s && s.herramienta !== "orden";
  const listo = !usa || yaAvanzo || hecho === clave;
  // Tocar ya es lanzar: los dados ruedan, las cartas se voltean o la botella gira al mostrar el resultado.
  const usar = () => { if (s && !listo) setHecho(clave); };
  // TV (o sin toque): pasa sola un momento después de empezar la ronda.
  useEffect(() => { if (!interactiva && usa && !listo) { const t = setTimeout(usar, 700); return () => clearTimeout(t); } }, [clave, interactiva]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s?.herramienta) return null;
  if (!listo) {
    const n = Math.min(v.jugadores.length, 8);
    return (
      <div className={"vr-herr vr-usar" + (chica ? " chica" : "")}>
        <span className="vr-herr-t dsp">{NOMBRE_HERRAMIENTA[s.herramienta] ?? s.herramienta}</span>
        <div className="vr-tapados" aria-hidden="true">
          {s.herramienta === "dados" ? Array.from({ length: n }, (_, i) => <span key={i} className="vr-espera" style={{ "--i": i } as CSSProperties}><Dado3D valor={6} semilla={i} /></span>)
            : s.herramienta === "poker" ? Array.from({ length: n }, (_, i) => <span key={i} className="vr-espera" style={{ "--i": i } as CSSProperties}><Naipe3D carta={{ v: 14, p: 3 }} mini className="tapado" /></span>)
            : <span className="vr-giro-ico">{s.herramienta === "reloj" ? "🕐" : "🍾"}</span>}
        </div>
        {interactiva ? <button type="button" className="vr-usar-btn" onClick={usar}>{ACCION[s.herramienta]}</button> : <small className="vr-usar-nota" />}
      </div>
    );
  }
  // Anima solo si este aparato acaba de usarla (tocar o la TV sola); si la ronda ya avanzó, sale quieta.
  return <Resultado key={`${s.herramienta}${v.ronda}`} v={v} s={s} chica={chica} quiere={hecho === clave && !yaAvanzo} />;
}

function Resultado({ v, s, chica, quiere }: { v: Publico; s: Sel; chica?: boolean; quiere: boolean }) {
  const ids = v.jugadores.map(j => j.id);
  const n = ids.length;
  const ms = s.herramienta === "dados" ? DADO_MS + ESCALON_MS * (n - 1) + 100
    : s.herramienta === "poker" ? CARTA_MS + ESCALON_MS * (n - 1) + 100
    : s.herramienta === "ruleta" ? BOTELLA_MS : s.herramienta === "reloj" ? RELOJ_MS : 0;
  const [anima, listo] = useRevelar(`vr|${v.juegoId}|${v.ronda}|${s.herramienta}|${s.pregunta}|${s.responde}`, ms, quiere);
  // Quién pregunta y quién responde se marca cuando el dado o la carta ya cayó, no antes (no se adelanta el resultado).
  const marca = (id: string) => (!listo ? "" : id === s.pregunta ? "pregunta" : id === s.responde ? "responde" : "");
  const etiqueta = (id: string) => (!listo ? "" : id === s.pregunta ? "Pregunta" : id === s.responde ? "Responde" : "");
  const clase = "vr-herr vr-herr3d" + (chica ? " chica" : "");
  const titulo = <span className="vr-herr-t dsp">{NOMBRE_HERRAMIENTA[s.herramienta] ?? s.herramienta}</span>;

  if (s.herramienta === "dados" && s.dados) {
    return (
      <div className={clase}>{titulo}
        <ul className="vr-tiros">{ids.map((id, i) => (
          <li key={id} className={marca(id)} style={{ ...varsColor(colorDe(id, ids)), "--i": i } as CSSProperties}>
            <span className="vr-dado3d" aria-label={`${nombreDe(v, id)} sacó ${s.dados![id] ?? 1}`}><Dado3D valor={s.dados![id] ?? 1} anima={anima} semilla={v.ronda * 8 + i} retraso={i * ESCALON_MS} /></span>
            <small>{nombreDe(v, id)}</small>{etiqueta(id) && <b className="dsp">{etiqueta(id)}</b>}
          </li>
        ))}</ul>
      </div>
    );
  }
  if (s.herramienta === "poker" && s.cartas) {
    return (
      <div className={clase}>{titulo}
        <ul className="vr-tiros">{ids.map((id, i) => {
          const c = s.cartas![id]!;
          return (
            <li key={id} className={marca(id)} style={{ ...varsColor(colorDe(id, ids)), "--i": i } as CSSProperties}>
              <span className="vr-naipe3d" aria-label={`${nombreDe(v, id)}: ${VALOR(c.v)} de ${PALO[c.p]}`}><Naipe3D carta={c} mini anima={anima} retraso={i * ESCALON_MS} /></span>
              <small>{nombreDe(v, id)}</small>{etiqueta(id) && <b className="dsp">{etiqueta(id)}</b>}
            </li>
          );
        })}</ul>
      </div>
    );
  }
  if (s.herramienta === "ruleta") {
    // La botella gira al centro y apunta a quien responde; quien pregunta lleva su rótulo.
    const gente = ids.map(id => ({ id, nombre: nombreDe(v, id), color: colorDe(id, ids) }));
    return (
      <div className={clase} role="img" aria-label={listo ? `Botella: pregunta ${nombreDe(v, s.pregunta)}, responde ${nombreDe(v, s.responde)}` : "Girando la botella"}>{titulo}
        <RuedaBotella gente={gente} elegido={s.responde} clave={`vr-botella|${v.juegoId}|${v.ronda}|${s.responde}`} quiere={anima} semilla={v.ronda}
          etiquetas={{ [s.pregunta]: "Pregunta", [s.responde]: "Responde" }} className="vr-rueda" />
      </div>
    );
  }
  if (s.herramienta === "reloj") {
    // Los jugadores alrededor de un reloj: manecilla chica a quien pregunta y grande a quien responde.
    const ang = (id: string) => (ids.indexOf(id) / n) * 360;
    const punto = (a: number, r: number) => [50 + r * Math.sin((a * Math.PI) / 180), 50 - r * Math.cos((a * Math.PI) / 180)] as const;
    return (
      <div className={clase}>{titulo}
        <svg className={"vr-circulo reloj" + (anima ? " anima" : "")} viewBox="0 0 100 100" role="img" aria-label={`${NOMBRE_HERRAMIENTA.reloj}: pregunta ${nombreDe(v, s.pregunta)}, responde ${nombreDe(v, s.responde)}`}>
          <circle cx="50" cy="50" r="46" className="vr-esfera" />
          {ids.map(id => {
            const [x, y] = punto(ang(id), 36);
            return <g key={id} className={marca(id)}><circle cx={x} cy={y} r="7.5" fill={colorDe(id, ids)?.base} className="vr-silla" /><text x={x} y={y + 2.6} textAnchor="middle" className="vr-silla-t">{colorDe(id, ids)?.etiqueta}</text></g>;
          })}
          <line x1="50" y1="50" x2="50" y2="30" className="vr-mano chica" style={{ "--a": `${ang(s.pregunta) + 720}deg` } as CSSProperties} />
          <line x1="50" y1="50" x2="50" y2="20" className="vr-mano grande" style={{ "--a": `${ang(s.responde) + 1080}deg` } as CSSProperties} />
          <circle cx="50" cy="50" r="4" className="vr-centro" />
        </svg>
        <p className={"vr-leyenda" + (listo ? "" : " oculta")}><span>Chica: <b>{nombreDe(v, s.pregunta)}</b> pregunta</span><span>Grande: <b>{nombreDe(v, s.responde)}</b> responde</span></p>
      </div>
    );
  }
  return <div className={clase}>{titulo}<p className="vr-leyenda"><span>Le toca a <b>{nombreDe(v, s.responde)}</b>; pregunta <b>{nombreDe(v, s.pregunta)}</b></span></p></div>;
}
