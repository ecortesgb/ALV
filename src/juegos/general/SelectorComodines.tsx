import type { ReactNode } from "react";

export function SelectorComodines({ cantidad, children }: { cantidad: number; children: ReactNode }) {
  return <details className="a-selector-comodines">
    <summary>⚡ Comodines ({cantidad})</summary>
    <div className="a-mano" aria-label="Tus comodines">{children}</div>
  </details>;
}
