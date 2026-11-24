// Modo Local: el anfitrión agrega personajes sin cuenta (nombre, género para el color y figura) o les cambia la figura.
// La figura sale de los personajes ya armados (trajes-figura.json) o al azar. Nada se guarda en la nube.
import { useEffect, useState } from "react";
import type { FiguraV2 } from "../../content/personaje";
import { Retrato } from "../comun";

interface Traje { id: string; nombre: string; mini: string; figura: FiguraV2 }
let cargados: Traje[] | null = null;
function useTrajes(): Traje[] | null {
  const [t, setT] = useState(cargados);
  useEffect(() => {
    if (t) return;
    let vivo = true;
    void import("../../content/trajes-figura.json").then(m => { cargados = m.default.trajes as unknown as Traje[]; if (vivo) setT(cargados); });
    return () => { vivo = false; };
  }, [t]);
  return t;
}
const BASE = import.meta.env.BASE_URL;
type Genero = "mujer" | "hombre" | "otro";
const GENEROS: { id: Genero; texto: string }[] = [{ id: "mujer", texto: "Mujer" }, { id: "hombre", texto: "Hombre" }, { id: "otro", texto: "Prefiero no decirlo" }];

export interface DatosPersonaje { nombre: string; genero: Genero; figura: FiguraV2 | null }

/** `soloFigura`: cambiar la figura de alguien que ya está (sin nombre ni género). */
export function PersonajeLocal({ titulo, inicial, soloFigura, alListo, alCerrar }: {
  titulo: string; inicial?: Partial<DatosPersonaje>; soloFigura?: boolean; alListo: (d: DatosPersonaje) => void; alCerrar: () => void;
}) {
  const trajes = useTrajes();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [genero, setGenero] = useState<Genero>(inicial?.genero ?? "otro");
  const [figura, setFigura] = useState<FiguraV2 | null>(inicial?.figura ?? null);
  const [elegido, setElegido] = useState<string | null>(null);
  const limpio = nombre.replace(/\s+/g, " ").trim();
  const valido = soloFigura || (limpio.length >= 2 && limpio.length <= 20);
  const azar = () => { if (!trajes?.length) return; const t = trajes[Math.floor(Math.random() * trajes.length)]!; setFigura(t.figura); setElegido(t.id); };
  return (
    <div className="lb-velo" role="dialog" aria-modal="true" aria-label={titulo} onClick={alCerrar}>
      <div className="lb-modal" onClick={e => e.stopPropagation()}>
        <header className="lb-modal-top"><b>{titulo}</b><button type="button" className="lb-mini" onClick={alCerrar} aria-label="Cerrar">✕</button></header>
        {!soloFigura && <>
          <label className="lb-campo"><span>Nombre</span>
            <input value={nombre} onChange={e => setNombre(e.target.value.slice(0, 20))} maxLength={20} autoComplete="off" autoFocus placeholder="Cómo le dicen" />
          </label>
          <div className="lb-chips" role="group" aria-label="Género (para el color)">
            {GENEROS.map(g => <button key={g.id} type="button" className={"lb-chip" + (genero === g.id ? " si" : "")} aria-pressed={genero === g.id} onClick={() => setGenero(g.id)}>{g.texto}</button>)}
          </div>
        </>}
        <div className="lb-modal-fig">
          <span className="lb-modal-retrato"><Retrato id={elegido ?? limpio ?? "nuevo"} figura={figura} nombre={limpio || "Nuevo"} size={88} /></span>
          <button type="button" className="lb-sec" onClick={azar}>🎲 Al azar</button>
        </div>
        <div className="lb-trajes" aria-label="Elige su figura">
          {trajes ? trajes.map(t => (
            <button key={t.id} type="button" className={"lb-traje" + (elegido === t.id ? " si" : "")} onClick={() => { setFigura(t.figura); setElegido(t.id); }} aria-pressed={elegido === t.id} title={t.nombre}>
              <img src={`${BASE}arte/piezas/${t.mini}.webp`} alt={t.nombre} loading="lazy" draggable={false} />
            </button>
          )) : <p className="lb-espera">Cargando figuras…</p>}
        </div>
        <button type="button" className="lb-listo" disabled={!valido} onClick={() => alListo({ nombre: limpio, genero, figura })}>{soloFigura ? "Usar esta figura" : "Agregar al lobby"}</button>
      </div>
    </div>
  );
}
