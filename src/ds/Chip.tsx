import { Icono, type IconoId } from "./Icono";

/**
 * Píldora chica para datos de contexto (jugadores, tiempo, intensidad). Con `onClick` sirve de filtro
 * y `seleccionado` lo marca en amarillo. Máximo 3 palabras.
 */
export function Chip({ texto, icono, seleccionado, onClick }: { texto: string; icono?: IconoId; seleccionado?: boolean; onClick?: () => void }) {
  const cls = "d-chip" + (seleccionado ? " on" : "");
  const dentro = <>{icono && <Icono id={icono} />}{texto}</>;
  return onClick
    ? <button type="button" className={cls} aria-pressed={!!seleccionado} onClick={onClick}>{dentro}</button>
    : <span className={cls}>{dentro}</span>;
}
