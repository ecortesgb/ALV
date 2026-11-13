// El administrador da XP extra a un jugador por algo fuera del juego.
import { useEffect, useRef, useState } from "react";
import { XP_EXTRA } from "../engine/economia";
import { aviso } from "./comun";
import { acciones, type JugadorLocal } from "./estado";
import { sonar } from "./sonido";
import { fraseEquipo } from "../content/equipos";

/** El administrador da XP extra a un jugador por algo fuera del juego. Queda en el historial con su motivo. */
export function XpExtra({ j, cerrar }: { j: JugadorLocal; cerrar: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [xp, setXp] = useState<number>(XP_EXTRA.opciones[1]);
  const [motivo, setMotivo] = useState("");
  useEffect(() => { if (dlg.current && !dlg.current.open) dlg.current.showModal(); }, []);
  const dar = () => {
    const error = acciones.darXpExtra(j.id, xp, motivo);
    if (error) { sonar("error"); aviso(error); return; }
    sonar("exito");
    aviso(fraseEquipo(j.equipo, xp) ?? `+${xp} XP extra para ${j.nombre}`);
    cerrar();
  };
  return (
    <dialog ref={dlg} className="modal" aria-labelledby="xp-extra-titulo" onCancel={e => { e.preventDefault(); cerrar(); }} onClick={e => { if (e.target === dlg.current) cerrar(); }}>
      <form className="modal-caja" onSubmit={e => { e.preventDefault(); dar(); }}>
        <h2 id="xp-extra-titulo">XP extra para {j.nombre}</h2>
        <p className="hint">Un plus por algo fuera del juego. Cuenta para su nivel y su saldo, y queda en el historial.</p>
        <div className="opciones" role="group" aria-label="Cuánta XP">
          {XP_EXTRA.opciones.map(n => <button type="button" key={n} className="opcion" aria-pressed={xp === n} onClick={() => setXp(n)}>+{n}</button>)}
        </div>
        <input className="input" value={motivo} maxLength={XP_EXTRA.motivoMax} onChange={e => setMotivo(e.target.value)} placeholder="Motivo (ej. ganó el concurso de clavados de panza)" aria-label="Motivo" />
        <div className="modal-botones">
          <button type="submit" className="btn lime" data-sin-clic disabled={!motivo.trim()}>Dar +{xp} XP</button>
          <button type="button" className="btn" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </dialog>
  );
}
