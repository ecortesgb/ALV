import type { CSSProperties, ReactNode } from "react";

/** Superficie base de toda caja: degradado azul, borde de tinta, borde interior claro y sombra dura. */
export function Panel({ children, className = "", style, como: Etiq = "div" }: { children: ReactNode; className?: string; style?: CSSProperties; como?: "div" | "section" | "article" }) {
  return <Etiq className={`d-pnl ${className}`.trim()} style={style}>{children}</Etiq>;
}
