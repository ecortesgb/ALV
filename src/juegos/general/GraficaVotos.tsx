// Gráfica de votos en la TV (idea de Rea-games aprobada por Elías, 27 nov): al revelar ¿Quién es más probable?,
// una barra por jugador con su figura que crece según sus votos. Con votos a la vista, abajo de cada barra sale
// quién votó por esa persona; con voto secreto, solo el número. Recibe solo la vista pública.
import type { CSSProperties } from "react";
import { Burbuja } from "../../pantallas/Identidad";
import { colorDe } from "../../app/colorJugador";
import type { Miembro } from "../../servicios/enlace";
import { nombreDe, type Publico } from "./texto";
import "./grafica-votos.css";

/** Columnas de la gráfica: votos de cada jugador y quién votó por él (vacío si los votos son secretos). */
export function columnasVotos(v: Publico) {
  const r = (v.revelado ?? {}) as { votos?: Record<string, number>; elegidos?: string[] };
  const votos = r.votos ?? {};
  const max = Math.max(1, ...Object.values(votos));
  return v.jugadores.map(j => ({
    id: j.id, nombre: j.nombre, votos: votos[j.id] ?? 0, alto: (votos[j.id] ?? 0) / max,
    gana: (r.elegidos ?? []).includes(j.id),
    quienes: v.votosDe ? Object.entries(v.votosDe).filter(([, a]) => a === j.id).map(([de]) => nombreDe(v, de)) : [],
  }));
}

export function GraficaVotos({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  const cols = columnasVotos(v);
  const ids = v.jugadores.map(j => j.id);
  return (
    <div className="gv" style={{ "--n": cols.length } as CSSProperties} role="img"
      aria-label={cols.map(c => `${c.nombre}: ${c.votos} ${c.votos === 1 ? "voto" : "votos"}`).join(", ")}>
      {cols.map((c, i) => {
        const color = colorDe(c.id, ids);
        return (
          <div key={c.id} className={"gv-col" + (c.gana ? " gana" : "")} style={{ "--i": i, "--alto": c.alto, "--gv": color?.base ?? "#7cc0ff", "--gv-txt": color?.texto ?? "#fff" } as CSSProperties}>
            <Burbuja p={{ id: c.id, nombre: c.nombre, figura: miembros.find(m => m.id === c.id)?.figura, color }} tamano="3.4em" conNombre />
            {!v.votoSecreto && <small className="gv-quien">{c.quienes.join(", ") || " "}</small>}
            <div className="gv-barra"><b className="dsp ol">{c.votos}</b></div>
          </div>
        );
      })}
    </div>
  );
}
