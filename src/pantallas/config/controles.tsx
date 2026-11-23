// Controles de Configuración con el lenguaje de La Azotea: interruptor, deslizador y selector segmentado.
// Accesibles con teclado y lector de pantalla; sin animación cuando se pide menos movimiento (lo hace el CSS).
import { useId, type CSSProperties, type ReactNode } from "react";

/** Una fila: texto a la izquierda (con ayuda opcional) y el control a la derecha. */
export function Fila({ titulo, ayuda, control, id }: { titulo: string; ayuda?: ReactNode; control: ReactNode; id?: string }) {
  return (
    <div className="cf-fila">
      <span className="cf-fila-txt">
        <span className="cf-fila-tit" id={id}>{titulo}</span>
        {ayuda && <small className="cf-fila-ayuda">{ayuda}</small>}
      </span>
      <span className="cf-fila-ctl">{control}</span>
    </div>
  );
}

export function Interruptor({ valor, alCambiar, etiqueta, desactivado }: { valor: boolean; alCambiar: (v: boolean) => void; etiqueta: string; desactivado?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={valor} aria-label={etiqueta} disabled={desactivado}
      className={"cf-switch" + (valor ? " on" : "")} onClick={() => alCambiar(!valor)}>
      <span className="cf-switch-riel" aria-hidden="true"><span className="cf-switch-bola" /></span>
      <span className="cf-switch-txt" aria-hidden="true">{valor ? "Sí" : "No"}</span>
    </button>
  );
}

/** Deslizador de 0 a 100. Avisa al soltar (alSoltar) para no sonar 50 veces mientras se arrastra. */
export function Deslizador({ valor, alCambiar, alSoltar, etiqueta, desactivado }: {
  valor: number; alCambiar: (v: number) => void; alSoltar?: (v: number) => void; etiqueta: string; desactivado?: boolean;
}) {
  return (
    <span className={"cf-desl" + (desactivado ? " off" : "")} style={{ "--v": `${valor}%` } as CSSProperties}>
      <input type="range" min={0} max={100} step={5} value={valor} disabled={desactivado} aria-label={etiqueta} aria-valuetext={`${valor} %`}
        onChange={e => alCambiar(Number(e.target.value))}
        onPointerUp={e => alSoltar?.(Number((e.target as HTMLInputElement).value))}
        onKeyUp={e => alSoltar?.(Number((e.target as HTMLInputElement).value))} />
      <b aria-hidden="true">{valor}</b>
    </span>
  );
}

/** Selector de opciones (una sola). */
export function Segmentado<T extends string>({ valor, opciones, alCambiar, etiqueta }: {
  valor: T; opciones: { id: T; texto: string }[]; alCambiar: (v: T) => void; etiqueta: string;
}) {
  const nombre = useId();
  return (
    <span className="cf-seg" role="radiogroup" aria-label={etiqueta} style={{ "--n": opciones.length, "--i": Math.max(0, opciones.findIndex(o => o.id === valor)) } as CSSProperties}>
      <span className="cf-seg-marca" aria-hidden="true" />
      {opciones.map(o => (
        <label key={o.id} className={"cf-seg-op" + (o.id === valor ? " on" : "")}>
          <input type="radio" name={nombre} value={o.id} checked={o.id === valor} onChange={() => alCambiar(o.id)} />
          <span>{o.texto}</span>
        </label>
      ))}
    </span>
  );
}
