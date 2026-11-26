// Una figura en 3D (iframe tools/personajes/escena.html): recibe el plano ya resuelto, gira arrastrando y hace
// `alLlegar` (saludo por omisión) cada vez que cambia. Lo usan la galería y el constructor.
import { useEffect, useRef, useState } from "react";
import type { Plano } from "./tipos";

export function Vista3D({ url, plano, alLlegar = "saludo", className = "gal-vista", momento, onArmado, onToque }: { url: string; plano: Plano | null; alLlegar?: string | null; className?: string;
  /** Cada vez que cambia `n`, la figura hace `cual` (gestos Saludar, Ganar, Perder, Especial). */
  momento?: { cual: string; n: number } | null;
  /** Resultado de armar el ÚLTIMO plano mandado: ok, o los errores (pieza que no encaja). La escena conserva la figura
   *  anterior. Las respuestas a planos viejos se descartan. */
  onArmado?: (ok: boolean, errores: string[]) => void;
  /** Se tocó la figura sin arrastrar; x/y de 0 a 1 dentro de la vista. */
  onToque?: (x: number, y: number) => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const llegar = useRef(alLlegar);
  llegar.current = alLlegar;
  const avisar = useRef(onArmado);
  avisar.current = onArmado;
  const tocado = useRef(onToque);
  tocado.current = onToque;
  const rev = useRef(0);
  const enviar = (m: object) => ref.current?.contentWindow?.postMessage({ origen: "alv", ...m }, location.origin);
  useEffect(() => {
    const f = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== ref.current?.contentWindow || e.data?.origen !== "minifig") return;
      if (e.data.tipo === "listo") setListo(true);
      if (e.data.tipo === "toque" && typeof e.data.x === "number" && typeof e.data.y === "number")
        tocado.current?.(Math.max(0, Math.min(1, e.data.x)), Math.max(0, Math.min(1, e.data.y)));
      if (e.data.tipo === "armadas") {
        // Solo cuenta la respuesta al último plano mandado (Codex O2): una vieja no confirma la figura de ahora.
        if (e.data.rev !== rev.current) return;
        setCargando(false);
        const errores = Array.isArray(e.data.errores) ? e.data.errores.filter((x: unknown): x is string => typeof x === "string") : [];
        avisar.current?.(errores.length === 0, errores);
        if (llegar.current && Array.isArray(e.data.ids) && e.data.ids[0]) enviar({ tipo: "momento", id: e.data.ids[0], cual: llegar.current });
      }
    };
    addEventListener("message", f);
    return () => removeEventListener("message", f);
  }, []);
  const firma = plano ? JSON.stringify(plano) : "";
  useEffect(() => {
    if (!listo) return;
    setCargando(!!plano);
    rev.current += 1;
    enviar({ tipo: "planos", lista: plano ? [plano] : [], rev: rev.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, firma]);
  useEffect(() => {
    if (listo && plano && momento && momento.n > 0) enviar({ tipo: "momento", id: plano.id, cual: momento.cual });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, momento?.n]);
  return (
    <div className={className}>
      <iframe ref={ref} src={url} title="Personaje en 3D: arrastra para girarlo" />
      {cargando && <span className="gal-cargando" aria-live="polite">Cargando…</span>}
    </div>
  );
}
