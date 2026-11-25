// Temperatura + Voltaje en el configurador (Maestro v1.52): termómetro para las preguntas, voltímetro para los retos
// e interruptor de Drunk. El nivel es general para toda la partida y lo pone el anfitrión.
// Diseño tomado de la página aprobada (alv2/intensidad.html), con los tokens de .D.
import { useState, type CSSProperties } from "react";
import { EJE_DE_MAZO, JUEGOS, NIVELES_EJE } from "../content/catalogo";
import type { Eje, NivelEje } from "../engine/types";
import "./intensidad.css";

const NIVELES: NivelEje[] = [1, 2, 3];

/** Qué es cada nivel (palabras de Elías, Maestro v1.52). */
export const DESCRIPCION_NIVEL: Record<Eje, Record<NivelEje, string>> = {
  temperatura: {
    1: "Rompehielos, gustos, personalidad, anécdotas y opiniones.",
    2: "Confesiones, secretos, relaciones y preguntas atrevidas.",
    3: "Muy personales, provocadoras, de máxima exposición.",
  },
  voltaje: {
    1: "Imitaciones, actuaciones y retos sencillos y creativos.",
    2: "Exposición, improvisación, retos atrevidos y vergonzosos.",
    3: "Retos extremos de atrevimiento y exposición.",
  },
};

/** El impostor (Elías, 25 nov): la Temperatura sube las palabras de cada categoría y el Voltaje, los castigos al que pierde. */
export const DESCRIPCION_IMPOSTOR: Record<Eje, Record<NivelEje, string>> = {
  temperatura: {
    1: "Palabras para todo público en cada categoría.",
    2: "Se suman palabras subidas de tono: películas, series y canciones para mayores.",
    3: "Se suman palabras para adultos (películas clasificación R y más) y se abre la categoría Adultos.",
  },
  voltaje: {
    1: "Castigos leves y chistosos para quien pierde.",
    2: "Castigos vergonzosos: imitar, actuar, exponerse un poco.",
    3: "Castigos fuertes de atrevimiento y exposición. Sin contacto con nadie.",
  },
};

/** Qué ejes usa un juego: los de sus mazos. El impostor usa los dos (palabras y castigos); Dados HOT, Voltaje. */
export function ejesDeJuego(juego: string): Eje[] {
  const def = JUEGOS.find(j => j.id === juego);
  if (!def) return [];
  if (def.motor === "rol-secreto") return ["temperatura", "voltaje"];
  if (def.motor === "dados") return ["voltaje"];
  const ejes = new Set((def.mazo ?? "").split("+").map(m => EJE_DE_MAZO[m]).filter((x): x is Eje => !!x));
  return (["temperatura", "voltaje"] as const).filter(e => ejes.has(e));
}

/** Nivel mínimo de un eje para que el juego se pueda jugar (Dados HOT solo en Sobrecarga). */
export function nivelMinimo(juego: string, eje: Eje): NivelEje {
  const def = JUEGOS.find(j => j.id === juego);
  return def && def.intensidadMin >= 4 && ejesDeJuego(juego).includes(eje) ? 3 : 1;
}

/**
 * Instrumento del nivel: la imagen de Elías (`public/arte/ui/configurar/termometro-N.webp` o `voltimetro-N.webp`).
 * Mientras no llega, una barra de vidrio de tres segmentos (interfaz, no dibujo), como la barra de XP del HUB.
 */
function Instrumento({ eje, nivel }: { eje: Eje; nivel: NivelEje }) {
  const base = eje === "temperatura" ? "termometro" : "voltimetro";
  const [sinImagen, setSinImagen] = useState(false);
  if (!sinImagen) {
    return (
      <span className="in-img">
        {NIVELES.map(n => <img key={n} className={n === nivel ? "on" : ""} src={`${import.meta.env.BASE_URL}arte/ui/configurar/${base}-${n}.webp`} alt="" draggable={false}
          onError={() => setSinImagen(true)} />)}
      </span>
    );
  }
  return <span className="in-barra">{[3, 2, 1].map(n => <i key={n} className={n <= nivel ? "on" : ""} style={{ "--m": n } as CSSProperties} />)}</span>;
}

function Medidor({ eje, nivel, alCambiar, apagado, minimo, impostor, sinUso }: { eje: Eje; nivel: NivelEje; alCambiar: (n: NivelEje) => void; apagado?: boolean; minimo: NivelEje;
  /** El impostor: palabras y castigos en vez de preguntas y retos. */ impostor?: boolean; /** Por qué no se usa (si `apagado`). */ sinUso?: string }) {
  const termo = eje === "temperatura";
  const que = impostor ? (termo ? "palabras" : "castigos") : termo ? "preguntas" : "retos";
  return (
    <section className={`in-medidor in-${eje} in-n${nivel}` + (apagado ? " apagado" : "")} aria-label={termo ? `Temperatura de las ${que}` : `Voltaje de los ${que}`}>
      <div className="in-instrumento" aria-hidden="true">
        <Instrumento eje={eje} nivel={nivel} />
      </div>
      <div className="in-info">
        <span className="in-eje">{termo ? "Temperatura" : "Voltaje"} · {que}</span>
        <b className="in-nombre">{NIVELES_EJE[eje][nivel]}</b>
        <span className="in-num">Nivel {nivel} de 3</span>
        <p className="in-desc">{apagado ? sinUso ?? `Este juego no usa ${que}.` : (impostor ? DESCRIPCION_IMPOSTOR : DESCRIPCION_NIVEL)[eje][nivel]}</p>
      </div>
      <div className="in-pasos" role="radiogroup" aria-label={termo ? "Temperatura" : "Voltaje"}>
        {NIVELES.map(n => (
          <button key={n} type="button" role="radio" aria-checked={nivel === n} className={nivel === n ? "on" : ""} disabled={apagado || n < minimo}
            onClick={() => alCambiar(n)}>{NIVELES_EJE[eje][n]}</button>
        ))}
      </div>
    </section>
  );
}

/** Interruptor grande (Drunk y, más adelante, eventos sorpresa y ¿Voy a tener suerte?). */
export function Interruptor({ titulo, texto, icono, encendido, alCambiar }: { titulo: string; texto: string; /** Nombre del icono en `public/arte/ui/configurar/` (si no existe, no se dibuja). */ icono: string; encendido: boolean; alCambiar: (v: boolean) => void }) {
  const [sinIcono, setSinIcono] = useState(false);
  return (
    <button type="button" role="switch" aria-checked={encendido} className={"in-switch" + (encendido ? " on" : "")} onClick={() => alCambiar(!encendido)}>
      {!sinIcono && <img className="in-switch-ico" src={`${import.meta.env.BASE_URL}arte/ui/configurar/${icono}.webp`} alt="" draggable={false} onError={() => setSinIcono(true)} />}
      <span className="in-switch-txt"><b className="dsp">{titulo}</b><small>{texto}</small></span>
      <span className="in-switch-pista" aria-hidden="true"><span /></span>
    </button>
  );
}

export interface ValorIntensidad { temperatura: NivelEje; voltaje: NivelEje; drunk: boolean }

/** Sección «¿Hasta dónde quieren llegar?» del configurador. `cuenta` dice cuántas cartas hay con lo elegido. */
export function SeccionIntensidad({ juego, valor, alCambiar, cuenta, sinCastigo }: {
  juego: string; valor: ValorIntensidad; alCambiar: (v: ValorIntensidad) => void; cuenta?: { preguntas: number; retos: number };
  /** El impostor sin «Castigo al que pierde»: el Voltaje no se usa. */ sinCastigo?: boolean;
}) {
  const impostor = JUEGOS.find(j => j.id === juego)?.motor === "rol-secreto";
  const usa = ejesDeJuego(juego).filter(e => !(impostor && sinCastigo && e === "voltaje"));
  const fijar = (eje: Eje) => (n: NivelEje) => alCambiar({ ...valor, [eje]: n });
  return (
    <div className="in-seccion">
      <p className="in-lead">El nivel es para toda la partida. Nadie está obligado: quien no quiera, usa un comodín o, con Drunk, toma algo.</p>
      <div className="in-medidores">
        <Medidor eje="temperatura" nivel={valor.temperatura} alCambiar={fijar("temperatura")} apagado={!usa.includes("temperatura")} minimo={nivelMinimo(juego, "temperatura")} impostor={impostor} />
        <Medidor eje="voltaje" nivel={valor.voltaje} alCambiar={fijar("voltaje")} apagado={!usa.includes("voltaje")} minimo={nivelMinimo(juego, "voltaje")} impostor={impostor}
          sinUso={impostor ? "Sin «Castigo al que pierde»: el voltaje no se usa. Enciéndelo en Opciones del juego." : undefined} />
      </div>
      <Interruptor titulo="Modo Drunk" icono="drunk" encendido={valor.drunk} alCambiar={drunk => alCambiar({ ...valor, drunk })}
        texto={valor.drunk ? "Hay cartas con trago y quien no quiera hacer algo puede tomar. Agua o refresco cuentan." : "Sin cartas de trago. Quien no quiera hacer algo usa un comodín."} />
      {cuenta && usa.length > 0 && !impostor && (
        <p className="in-cuenta" aria-live="polite">
          Hay {usa.includes("temperatura") ? `${cuenta.preguntas} preguntas` : ""}{usa.length === 2 ? " y " : ""}{usa.includes("voltaje") ? `${cuenta.retos} retos` : ""} para esta partida.
        </p>
      )}
    </div>
  );
}
