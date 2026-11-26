// Una figura en 3D (iframe tools/personajes/escena.html): recibe el plano ya resuelto, gira arrastrando y hace
// `alLlegar` (saludo por omisión) cada vez que cambia. Lo usan la galería y el constructor.
import { useEffect, useRef, useState } from "react";
import "./vista-3d.css";

const quieto = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
import type { Plano } from "./tipos";

export function Vista3D({ url, plano, alLlegar = "saludo", className = "gal-vista", momento, onArmado, onToque, correr, onPresion, giro }: { url: string; plano: Plano | null; alLlegar?: string | null; className?: string;
  /** Cada vez que cambia `n`, la figura hace `cual` (gestos Saludar, Ganar, Perder, Especial). */
  momento?: { cual: string; n: number } | null;
  /** Resultado de armar el ÚLTIMO plano mandado: ok, o los errores (pieza que no encaja). La escena conserva la figura
   *  anterior. Las respuestas a planos viejos se descartan. */
  onArmado?: (ok: boolean, errores: string[]) => void;
  /** Se tocó la figura sin arrastrar; x/y de 0 a 1 dentro de la vista. */
  onToque?: (x: number, y: number) => void;
  /** Recorre la cámara de lado (fracción del ancho; + = la figura se ve más a la izquierda) en `ms` milisegundos. */
  correr?: { x: number; ms: number };
  /** Empezó un toque en la escena (para cerrar menús abiertos: la página no ve los toques del iframe). */
  onPresion?: () => void;
  /** Cada vez que cambia `n`, la figura gira `cuanto` radianes (girar con teclado). */
  giro?: { n: number; cuanto: number } | null }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const llegar = useRef(alLlegar);
  llegar.current = alLlegar;
  const avisar = useRef(onArmado);
  avisar.current = onArmado;
  const tocado = useRef(onToque);
  tocado.current = onToque;
  const presion = useRef(onPresion);
  presion.current = onPresion;
  // Error visible con reintento (Codex, cierre-r1): la escena avisa {tipo:"error"}, no dice «listo» en 12 s, o un plano
  // no se pudo armar y no hay figura.
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (listo) return;
    const t = setTimeout(() => setError("La escena no cargó."), 12000);
    return () => clearTimeout(t);
  }, [listo, intento]);
  const reintentar = () => { setError(null); setListo(false); setIntento(n => n + 1); };
  const rev = useRef(0);
  const enviar = (m: object) => ref.current?.contentWindow?.postMessage({ origen: "alv", ...m }, location.origin);
  useEffect(() => {
    const f = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== ref.current?.contentWindow || e.data?.origen !== "minifig") return;
      if (e.data.tipo === "listo") { setListo(true); setError(null); }
      if (e.data.tipo === "error") setError("No se pudo preparar el 3D.");
      if (e.data.tipo === "presion") presion.current?.();
      if (e.data.tipo === "toque" && typeof e.data.x === "number" && typeof e.data.y === "number")
        tocado.current?.(Math.max(0, Math.min(1, e.data.x)), Math.max(0, Math.min(1, e.data.y)));
      if (e.data.tipo === "armadas") {
        // Solo cuenta la respuesta al último plano mandado (Codex O2): una vieja no confirma la figura de ahora.
        if (e.data.rev !== rev.current) return;
        setCargando(false);
        const errores = Array.isArray(e.data.errores) ? e.data.errores.filter((x: unknown): x is string => typeof x === "string") : [];
        avisar.current?.(errores.length === 0, errores);
        // Una respuesta vigente sin errores limpia el aviso de un personaje anterior que falló (Codex, cierre-verif).
        if (errores.length && !(Array.isArray(e.data.ids) && e.data.ids.length)) setError("No se pudo cargar este personaje.");
        else if (!errores.length) setError(null);
        // Con «reducir movimiento» no hay animación de llegada; los gestos que se piden sí se ven (Codex, cierre-r1).
        if (llegar.current && !quieto && Array.isArray(e.data.ids) && e.data.ids[0]) enviar({ tipo: "momento", id: e.data.ids[0], cual: llegar.current });
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
  useEffect(() => { if (listo && giro && giro.n > 0) enviar({ tipo: "girar", cuanto: giro.cuanto }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [listo, giro?.n]);
  useEffect(() => { if (listo && correr) enviar({ tipo: "correr", x: correr.x, ms: correr.ms }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [listo, correr?.x, correr?.ms]);
  return (
    <div className={className}>
      <iframe key={intento} ref={ref} src={url} title="Personaje en 3D: arrastra para girarlo" />
      {cargando && !error && <span className="gal-cargando" aria-live="polite">Cargando…</span>}
      {error && (
        <div className="v3d-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={reintentar}>Reintentar</button>
        </div>
      )}
    </div>
  );
}
