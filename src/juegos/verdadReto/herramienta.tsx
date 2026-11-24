// La herramienta de Verdad o reto, dibujada con lo público de la ronda: dados, cartas de póker, reloj, ruleta o en orden.
// Decide quién pregunta y quién responde; no cambia el juego (Maestro 6A.3). La usan el celular y la TV.
import { useEffect, useState, type CSSProperties } from "react";
import { colorDe, varsColor } from "../../app/colorJugador";
import { nombreDe, type Publico } from "../general/texto";

interface Sel { herramienta: string; pregunta: string; responde: string; dados?: Record<string, number>; cartas?: Record<string, { v: number; p: number }> }

const CARA = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const VALOR = (v: number) => (v <= 10 ? String(v) : ["J", "Q", "K", "A"][v - 11]!);
const PALO = ["♣", "♦", "♥", "♠"]; // de menor a mayor
export const NOMBRE_HERRAMIENTA: Record<string, string> = { orden: "En orden", ruleta: "Ruleta", reloj: "Reloj", dados: "Dados", poker: "Cartas de póker" };

const ACCION: Record<string, string> = { dados: "🎲 ¡Lanzar dados!", poker: "🃏 Voltear cartas", reloj: "🕐 ¡Girar el reloj!", ruleta: "🎡 ¡Girar la ruleta!" };
const RUEDA_MS = 1300;

/**
 * La herramienta se usa (Elías, 24 nov): en el celular hay que tocar para lanzar los dados, voltear las cartas o girar;
 * en la TV pasa sola. El resultado ya lo decidió el motor: aquí solo se anima hasta mostrarlo. Si la ronda ya avanzó,
 * se muestra directo.
 */
export function Herramienta({ v, chica, interactiva }: { v: Publico; chica?: boolean; interactiva?: boolean }) {
  const s = v.seleccion as unknown as Sel | undefined;
  const clave = `${v.ronda}-${s?.herramienta ?? ""}`;
  const [hecho, setHecho] = useState<string | null>(null);
  const [rodando, setRodando] = useState(false);
  const [cara, setCara] = useState(1);
  const yaAvanzo = !!v.verdadReto && v.verdadReto.etapa !== "elegir";
  const usa = !!s && s.herramienta !== "orden";
  const listo = !usa || yaAvanzo || hecho === clave;
  const usar = () => {
    if (!s || listo || rodando) return;
    if (s.herramienta === "reloj" || s.herramienta === "ruleta") { setHecho(clave); return; } // el giro ya es la animación
    setRodando(true);
    setTimeout(() => { setRodando(false); setHecho(clave); }, RUEDA_MS);
  };
  // TV (o sin toque): pasa sola un momento después de empezar la ronda.
  useEffect(() => { if (!interactiva && usa && !listo) { const t = setTimeout(usar, 700); return () => clearTimeout(t); } }, [clave, interactiva]); // eslint-disable-line react-hooks/exhaustive-deps
  // Mientras ruedan los dados, las caras cambian rápido.
  useEffect(() => { if (!rodando) return; const t = setInterval(() => setCara(1 + Math.floor(Math.random() * 6)), 80); return () => clearInterval(t); }, [rodando]);
  if (!s?.herramienta) return null;
  if (!listo) {
    const n = v.jugadores.length;
    return (
      <div className={"vr-herr vr-usar" + (chica ? " chica" : "") + (rodando ? " rodando" : "")}>
        <span className="vr-herr-t dsp">{NOMBRE_HERRAMIENTA[s.herramienta] ?? s.herramienta}</span>
        <div className="vr-tapados" aria-hidden="true">
          {s.herramienta === "dados" ? Array.from({ length: Math.min(n, 8) }, (_, i) => <span key={i} className="vr-dado" style={{ "--i": i } as CSSProperties}>{CARA[rodando ? ((cara + i) % 6) + 1 : 6]}</span>)
            : s.herramienta === "poker" ? Array.from({ length: Math.min(n, 8) }, (_, i) => <span key={i} className="vr-naipe dorso" style={{ "--i": i } as CSSProperties} />)
            : <span className="vr-giro-ico">{s.herramienta === "reloj" ? "🕐" : "🎡"}</span>}
        </div>
        {interactiva ? <button type="button" className="vr-usar-btn" onClick={usar} disabled={rodando}>{rodando ? "…" : ACCION[s.herramienta]}</button>
          : <small className="vr-usar-nota">{rodando ? "…" : ""}</small>}
      </div>
    );
  }
  const ids = v.jugadores.map(j => j.id);
  const marca = (id: string) => (id === s.pregunta ? "pregunta" : id === s.responde ? "responde" : "");
  const etiqueta = (id: string) => (id === s.pregunta ? "Pregunta" : id === s.responde ? "Responde" : "");
  const clase = "vr-herr" + (chica ? " chica" : "");
  const titulo = <span className="vr-herr-t dsp">{NOMBRE_HERRAMIENTA[s.herramienta] ?? s.herramienta}</span>;

  if (s.herramienta === "dados" && s.dados) {
    return (
      <div className={clase} key={`d${v.ronda}`}>{titulo}
        <ul className="vr-tiros">{ids.map((id, i) => (
          <li key={id} className={marca(id)} style={{ ...varsColor(colorDe(id, ids)), "--i": i } as CSSProperties}>
            <span className="vr-dado" aria-label={`${nombreDe(v, id)} sacó ${s.dados![id]}`}>{CARA[s.dados![id] ?? 1]}</span>
            <small>{nombreDe(v, id)}</small>{etiqueta(id) && <b className="dsp">{etiqueta(id)}</b>}
          </li>
        ))}</ul>
      </div>
    );
  }
  if (s.herramienta === "poker" && s.cartas) {
    return (
      <div className={clase} key={`p${v.ronda}`}>{titulo}
        <ul className="vr-tiros">{ids.map((id, i) => {
          const c = s.cartas![id]!, rojo = c.p === 1 || c.p === 2;
          return (
            <li key={id} className={marca(id)} style={{ ...varsColor(colorDe(id, ids)), "--i": i } as CSSProperties}>
              <span className={"vr-naipe" + (rojo ? " rojo" : "")} aria-label={`${nombreDe(v, id)}: ${VALOR(c.v)} de ${PALO[c.p]}`}><b>{VALOR(c.v)}</b><span>{PALO[c.p]}</span></span>
              <small>{nombreDe(v, id)}</small>{etiqueta(id) && <b className="dsp">{etiqueta(id)}</b>}
            </li>
          );
        })}</ul>
      </div>
    );
  }
  if (s.herramienta === "reloj" || s.herramienta === "ruleta") {
    // Los jugadores alrededor de un círculo. Reloj: manecilla chica a quien pregunta y grande a quien responde.
    // Ruleta: la rueda gira y la flecha queda en quien responde.
    const n = ids.length, ang = (id: string) => (ids.indexOf(id) / n) * 360;
    const punto = (a: number, r: number) => [50 + r * Math.sin((a * Math.PI) / 180), 50 - r * Math.cos((a * Math.PI) / 180)] as const;
    const esReloj = s.herramienta === "reloj";
    return (
      <div className={clase} key={`c${v.ronda}`}>{titulo}
        <svg className={"vr-circulo" + (esReloj ? " reloj" : " ruleta")} viewBox="0 0 100 100" role="img" aria-label={`${NOMBRE_HERRAMIENTA[s.herramienta]}: pregunta ${nombreDe(v, s.pregunta)}, responde ${nombreDe(v, s.responde)}`}>
          <circle cx="50" cy="50" r="46" className="vr-esfera" />
          {!esReloj && ids.map((id, i) => {
            const a1 = (i / n) * 360 - 180 / n, a2 = a1 + 360 / n, [x1, y1] = punto(a1, 44), [x2, y2] = punto(a2, 44);
            return <path key={id} d={`M50 50 L${x1} ${y1} A44 44 0 0 1 ${x2} ${y2} Z`} fill={colorDe(id, ids)?.base} opacity={id === s.responde ? 1 : 0.55} />;
          })}
          {ids.map(id => {
            const [x, y] = punto(ang(id), 36);
            return <g key={id} className={marca(id)}><circle cx={x} cy={y} r="7.5" fill={colorDe(id, ids)?.base} className="vr-silla" /><text x={x} y={y + 2.6} textAnchor="middle" className="vr-silla-t">{colorDe(id, ids)?.etiqueta}</text></g>;
          })}
          {esReloj ? <>
            <line x1="50" y1="50" x2="50" y2="30" className="vr-mano chica" style={{ "--a": `${ang(s.pregunta) + 720}deg` } as CSSProperties} />
            <line x1="50" y1="50" x2="50" y2="20" className="vr-mano grande" style={{ "--a": `${ang(s.responde) + 1080}deg` } as CSSProperties} />
          </> : <line x1="50" y1="50" x2="50" y2="18" className="vr-mano grande" style={{ "--a": `${ang(s.responde) + 1440}deg` } as CSSProperties} />}
          <circle cx="50" cy="50" r="4" className="vr-centro" />
        </svg>
        {esReloj && <p className="vr-leyenda"><span>Chica: <b>{nombreDe(v, s.pregunta)}</b> pregunta</span><span>Grande: <b>{nombreDe(v, s.responde)}</b> responde</span></p>}
      </div>
    );
  }
  return <div className={clase}>{titulo}<p className="vr-leyenda"><span>Le toca a <b>{nombreDe(v, s.responde)}</b>; pregunta <b>{nombreDe(v, s.pregunta)}</b></span></p></div>;
}
