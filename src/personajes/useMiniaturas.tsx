// Miniaturas de piezas sueltas, sacadas en vivo por el estudio (tools/personajes/estudio.html) con el motor real: la
// pieza sola y encuadrada (la cara sobre su cabeza lisa, sin pelo ni casco). Se guardan solo en memoria mientras la
// página está abierta: salen de modelos privados y no van a disco, al repo ni al build.
import { useEffect, useRef, useState } from "react";
import type { PiezaCons } from "./constructorDatos";
import { deCatalogo } from "./figura";
import { resolver, type Catalogo } from "./plano";
import type { Plano } from "./tipos";

/** Todas las ranuras de una minifigura (foto de la figura entera). */
const RANURAS_FIGURA = ["head", "face", "hair", "headgear", "neck", "torso", "arms", "hands", "hips", "legs", "accessory"];

const fotos = new Map<string, string | null>(); // id de pieza → url de la foto, o null si no se pudo
/** Ranuras que se ven en la foto: la de la pieza y, para la cara, la cabeza que la sostiene. */
export const ranurasFoto = (pz: Pick<PiezaCons, "parte" | "ranuras">): string[] => (pz.parte === "cara" ? [...pz.ranuras, "head"] : [...pz.ranuras]);

export function useMiniaturas(url: string | null, catalogo: Catalogo) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [listo, setListo] = useState(false);
  const [, setVersion] = useState(0);
  const pedidas = useRef(new Set<string>());
  // Si el estudio no dice «listo» en 10 s, o una foto no llega en 8 s, se usa la foto del donante (Codex, cierre-r1):
  // nada se queda esperando para siempre.
  const [caido, setCaido] = useState(false);
  useEffect(() => { if (!url || listo) return; const t = setTimeout(() => setCaido(true), 10000); return () => clearTimeout(t); }, [url, listo]);
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
    setTimeout(() => { if (!fotos.has(pz.id)) { fotos.set(pz.id, null); setVersion(v => v + 1); } }, 8000);
    ref.current?.contentWindow?.postMessage({ origen: "alv", tipo: "foto", clave: pz.id, plano, ver: ranurasFoto(pz), tam: 192, pose: "union" }, location.origin);
  };
  /** Foto de la figura completa (los nichos de «Mi colección»): todas las ranuras, del mismo tamaño y en un cuadro de su movimiento especial. */
  const pedirFigura = (clave: string, plano: Plano, pose: "especial" | "reposo" = "especial") => {
    if (!url || !listo || fotos.has(clave) || pedidas.current.has(clave)) return;
    pedidas.current.add(clave);
    setTimeout(() => { if (!fotos.has(clave)) { fotos.set(clave, null); setVersion(v => v + 1); } }, 12000);
    ref.current?.contentWindow?.postMessage({ origen: "alv", tipo: "foto", clave, plano, ver: RANURAS_FIGURA, tam: 384, pose }, location.origin);
  };
  const fotoDe = (clave: string): string | null | undefined => (!url || (caido && !listo) ? fotos.get(clave) ?? null : fotos.get(clave));
  /** url lista, null si falló (usar la foto del donante) o undefined si aún no llega. */
  const foto = (pz: PiezaCons): string | null | undefined => (!url || (caido && !listo) ? fotos.get(pz.id) ?? null : fotos.get(pz.id));
  const marco = url ? (
    <iframe ref={ref} src={url} title="Estudio de miniaturas" aria-hidden="true" tabIndex={-1}
      style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, opacity: 0, border: 0, pointerEvents: "none" }} />
  ) : null;
  (window as unknown as { __miniaturas?: unknown }).__miniaturas = fotos; // para revisar las fotos en la página de prueba
  return { marco, pedir, foto, listo, pedirFigura, fotoDe };
}
