// Una figura en 3D (iframe tools/personajes/escena.html): recibe el plano ya resuelto, gira arrastrando y hace
// `alLlegar` (saludo por omisión) cada vez que cambia. Lo usan la galería y el constructor.
import { useEffect, useRef, useState } from "react";
import type { Plano } from "./tipos";

export function Vista3D({ url, plano, alLlegar = "saludo", className = "gal-vista" }: { url: string; plano: Plano | null; alLlegar?: string | null; className?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const llegar = useRef(alLlegar);
  llegar.current = alLlegar;
  const enviar = (m: object) => ref.current?.contentWindow?.postMessage({ origen: "alv", ...m }, location.origin);
  useEffect(() => {
    const f = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== ref.current?.contentWindow || e.data?.origen !== "minifig") return;
      if (e.data.tipo === "listo") setListo(true);
      if (e.data.tipo === "armadas") {
        setCargando(false);
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
    enviar({ tipo: "planos", lista: plano ? [plano] : [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, firma]);
  return (
    <div className={className}>
      <iframe ref={ref} src={url} title="Personaje en 3D: arrastra para girarlo" />
      {cargando && <span className="gal-cargando" aria-live="polite">Cargando…</span>}
    </div>
  );
}
