import type { CSSProperties, ReactNode } from "react";
import "./tokens.css";
import "./componentes.css";
import "./extra.css";

/**
 * Raíz del Design System: todo componente de ds/ va dentro de una. Los tokens viven en la clase .D,
 * así no tocan los estilos de las pantallas de hoy. `ancho` = laptop o TV (clase .wide de la fuente).
 */
export function RaizDS({ children, ancho = false, className = "", style }: { children: ReactNode; ancho?: boolean; className?: string; style?: CSSProperties }) {
  return <div className={`D raiz${ancho ? " wide" : ""} ${className}`.trim()} style={style}>{children}</div>;
}
