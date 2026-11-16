import type { CSSProperties, ReactNode } from "react";

export interface Sospechoso {
  id: string;
  nombre: string;
  /** Figura de cuerpo entero (en la app, la del 3D). */
  figura: ReactNode;
  /** Palabra que ya dijo (etiqueta de evidencia). */
  evidencia?: string;
  /** Votos que recibió: solo se pasan al revelar. */
  votos?: number;
}

/**
 * Escena de El impostor en la Pantalla de TV: pared de estaturas, figuras en fila con placa numerada,
 * evidencia de cada uno, un reflector sobre quien habla y otro que barre a todos.
 * Recibe solo datos públicos: nunca la palabra ni quién es el impostor antes de revelar.
 */
export function RuedaSospechosos({ personas, habla, alto = 290, style }: { personas: Sospechoso[]; habla?: string; alto?: number; style?: CSSProperties }) {
  const i = personas.findIndex(p => p.id === habla);
  const x = i >= 0 ? `${(((i + 0.5) / personas.length) * 100).toFixed(1)}%` : null;
  const cubre: CSSProperties = { top: 0, bottom: 0 };
  return (
    <div className="d-rueda" style={{ height: alto, ...style }}>
      <div className="d-wall" style={cubre} />
      <div className="d-search" style={cubre} />
      {x && <div className="d-spotc" style={{ ...cubre, "--x": x } as CSSProperties} />}
      <div className="d-lineup" style={{ left: "1em", right: "1em", bottom: "1em" }}>
        {personas.map((p, n) => {
          const on = p.id === habla;
          const ev = on ? "Habla" : p.evidencia || "·";
          return (
            <div key={p.id} className={"d-p" + (on ? " on" : "")}>
              {p.votos != null && <span className="votos" aria-label={`${p.votos} votos`}>{p.votos}</span>}
              <span className={"ev" + (on ? " pensando" : p.evidencia ? "" : " vacio")}>{ev}</span>
              {p.figura}
              <span className="pl">{String(n + 1).padStart(2, "0")} · {p.nombre}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
