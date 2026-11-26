// Miniaturas de piezas sueltas, sacadas en vivo por el estudio (tools/personajes/estudio.html) con el motor real: la
// pieza sola y encuadrada (la cara sobre su cabeza lisa, sin pelo ni casco). Se guardan solo en memoria mientras la
// página está abierta: salen de modelos privados y no van a disco, al repo ni al build.
import { useEffect, useRef, useState } from "react";
import type { PiezaCons } from "./constructorDatos";
import { deCatalogo } from "./figura";
import { resolver, type Catalogo } from "./plano";

const fotos = new Map<string, string | null>(); // id de pieza → url de la foto, o null si no se pudo
/** Ranuras que se ven en la foto: la de la pieza y, para la cara, la cabeza que la sostiene. */
export const ranurasFoto = (pz: Pick<PiezaCons, "parte" | "ranuras">): string[] => (pz.parte === "cara" ? [...pz.ranuras, "head"] : [...pz.ranuras]);

export function useMiniaturas(url: string | null, catalogo: Catalogo) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [listo, setListo] = useState(false);
  const [, setVersion] = useState(0);
  const pedidas = useRef(new Set<string>());
  useEffect(() => {
    const f = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== ref.current?.contentWindow || e.data?.origen !== "minifig") return;
      if (e.data.tipo === "listo") setListo(true);
      if (e.data.tipo === "foto" && typeof e.data.clave === "string") {
        const u = typeof e.data.url === "string" && e.data.url.startsWith("data:image/") ? e.data.url : null;
        if (!u) console.warn("miniatura no disponible:", e.data.clave, e.data.error);
        fotos.set(e.data.clave, u);
        setVersion(v => v + 1);
      }
    };
    addEventListener("message", f);
    return () => removeEventListener("message", f);
  }, []);
  const pedir = (pz: PiezaCons) => {
    if (!url || !listo || !pz.glb || !pz.donante || fotos.has(pz.id) || pedidas.current.has(pz.id)) return;
    const en = catalogo.get(pz.donante);
    const plano = en ? resolver("foto", deCatalogo(en.ficha), catalogo) : null;
    if (!plano) { fotos.set(pz.id, null); return; }
    pedidas.current.add(pz.id);
    ref.current?.contentWindow?.postMessage({ origen: "alv", tipo: "foto", clave: pz.id, plano, ver: ranurasFoto(pz), tam: 192 }, location.origin);
  };
  /** url lista, null si falló (usar la foto del donante) o undefined si aún no llega. */
  const foto = (pz: PiezaCons): string | null | undefined => (url ? fotos.get(pz.id) : null);
  const marco = url ? (
    <iframe ref={ref} src={url} title="Estudio de miniaturas" aria-hidden="true" tabIndex={-1}
      style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, opacity: 0, border: 0, pointerEvents: "none" }} />
  ) : null;
  (window as unknown as { __miniaturas?: unknown }).__miniaturas = fotos; // para revisar las fotos en la página de prueba
  return { marco, pedir, foto, listo };
}
