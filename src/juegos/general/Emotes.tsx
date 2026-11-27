// Emotes al revelar (Elías, 27 nov). En el celular, una fila de reacciones mientras se ve el resultado;
// en la TV, las que llegan suben flotando con el color de quien la mandó. Solo visual.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { EMOTES, alEmote, lanzarEmote } from "../../app/emotes";
import { colorDe } from "../../app/colorJugador";
import { nombreDe, type Publico } from "./texto";
import "./emotes.css";

/** Fila de emotes del celular. Cada toque brinca para que se note que salió. */
export function BarraEmotes({ yo }: { yo: string }) {
  const [salio, setSalio] = useState<{ k: number; n: number } | null>(null);
  return (
    <div className="em-barra" role="group" aria-label="Reacciona en la TV">
      {EMOTES.map((e, k) => (
        <button key={`${k}-${salio?.k === k ? salio.n : 0}`} type="button" className={"em-btn" + (salio?.k === k ? " salio" : "")} aria-label={`Mandar ${e}`}
          onClick={() => { if (lanzarEmote(yo, k)) setSalio(s => ({ k, n: (s?.n ?? 0) + 1 })); }}>{e}</button>
      ))}
    </div>
  );
}

interface Volando { id: number; k: number; x: number; nombre: string; color: string }

/** Capa de la TV: los emotes que llegan suben y desaparecen (máximo 24 a la vez). */
export function EmotesVolando({ v }: { v: Publico | null }) {
  const [lista, setLista] = useState<Volando[]>([]);
  const vista = useRef(v);
  vista.current = v;
  useEffect(() => {
    let id = 0;
    const relojes = new Set<ReturnType<typeof setTimeout>>();
    const fuera = alEmote(e => {
      const v = vista.current;
      const ids = v?.jugadores.map(j => j.id) ?? [];
      if (!v || !ids.includes(e.jugador)) return;
      const nuevo: Volando = { id: ++id, k: e.k, x: 8 + Math.random() * 84, nombre: nombreDe(v, e.jugador), color: colorDe(e.jugador, ids)?.base ?? "#7cc0ff" };
      setLista(l => [...l.slice(-23), nuevo]);
      const t = setTimeout(() => { relojes.delete(t); setLista(l => l.filter(x => x.id !== nuevo.id)); }, 2600);
      relojes.add(t);
    });
    return () => { fuera(); relojes.forEach(clearTimeout); };
  }, []);
  if (!lista.length) return null;
  return (
    <div className="em-capa" aria-hidden="true">
      {lista.map(x => <span key={x.id} className="em-vuela" style={{ left: `${x.x}%`, "--em": x.color } as CSSProperties}><b>{EMOTES[x.k]}</b><small>{x.nombre}</small></span>)}
    </div>
  );
}
