import { ICONOS, type IconoId } from "./iconos";

/** Icono de trazo del Design System. Hereda el color del texto. */
export function Icono({ id, className = "" }: { id: IconoId; className?: string }) {
  return (
    <svg className={`ic ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONOS[id]} />
    </svg>
  );
}

export type { IconoId };
