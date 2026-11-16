export interface Pestana { id: string; texto: string }

/** Pestañas inclinadas: la elegida en amarillo. En celular se deslizan de lado. */
export function Pestanas({ pestanas, activa, onCambio, nombre }: { pestanas: Pestana[]; activa: string; onCambio?: (id: string) => void; nombre: string }) {
  return (
    <div className="d-tabs" role="tablist" aria-label={nombre}>
      {pestanas.map(p => (
        <button key={p.id} type="button" role="tab" aria-selected={p.id === activa} className={"d-tab" + (p.id === activa ? " on" : "")}
          onClick={() => onCambio?.(p.id)}>{p.texto}</button>
      ))}
    </div>
  );
}
