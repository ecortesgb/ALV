// Enrutador propio con «#» (GitHub Pages no sabe de rutas). Sin librerías.
// El papel del aparato lo da la ruta, no la cuenta: #/tv/código es la Pantalla, #/sala/código un celular.
import { useEffect, useState } from "react";

export type Ruta =
  | "inicio" | "modos" | "jugar" | "catalogo" | "juego" | "sala" | "tv" | "configurar" | "personalizar" | "editor"
  | "tienda" | "ranking" | "logros" | "perfil" | "ajustes" | "admin" | "ds";
const RUTAS: Ruta[] = ["inicio", "modos", "jugar", "catalogo", "juego", "sala", "tv", "configurar", "personalizar", "editor", "tienda", "ranking", "logros", "perfil", "ajustes", "admin", "ds"];
/** Nombres viejos o alternos que siguen funcionando (enlaces guardados y QR ya impresos). */
const ALIAS: Record<string, Ruta> = {
  hub: "inicio", "hub-prototipo": "inicio", s: "sala", unirse: "sala", mesa: "sala", proyectar: "jugar", lobby: "jugar", juegos: "catalogo",
  figura: "editor", coleccion: "personalizar", historial: "ranking", grupo: "jugar", fisico: "jugar",
};
const CON_CODIGO = new Set<Ruta>(["sala", "tv", "configurar"]);

/** Código de sala: 6 letras o números, en mayúsculas. Cualquier otra cosa se descarta. */
const codigo = (a?: string) => {
  const c = (a ?? "").toUpperCase();
  return /^[A-Z0-9]{6}$/.test(c) ? c : undefined;
};

export interface Destino { ruta: Ruta; arg?: string }

/** Lee una dirección («#/tv/K7PQ2M») y dice qué pantalla abrir. Lo desconocido va al inicio. */
export function leerRuta(hash: string): Destino {
  const [r = "", crudo] = hash.replace(/^#\/?/, "").split("?")[0]!.split("/");
  let arg: string | undefined;
  try { arg = crudo ? decodeURIComponent(crudo) : undefined; } catch { arg = undefined; }
  const ruta = (RUTAS as string[]).includes(r) ? (r as Ruta) : ALIAS[r];
  if (!ruta) return { ruta: "inicio" };
  if (CON_CODIGO.has(ruta)) { const c = codigo(arg); return c ? { ruta, arg: c } : { ruta: "jugar" }; }
  if (ruta === "juego") return arg && /^[a-z0-9-]{1,40}$/.test(arg) ? { ruta, arg } : { ruta: "catalogo" };
  // Configuración: la categoría abierta (en celular, sin categoría se ve la lista).
  if (ruta === "ajustes") return arg && /^(cuenta|experiencia|admin|acerca)$/.test(arg) ? { ruta, arg } : { ruta };
  return { ruta };
}

/** Dirección de una pantalla. */
export const href = (r: Ruta, arg?: string) => `#/${r}${arg ? `/${encodeURIComponent(arg)}` : ""}`;
/** Va a una pantalla. */
export const ir = (r: Ruta, arg?: string) => { location.hash = href(r, arg).slice(1); };
/** Regresa a la pantalla anterior; si no hay, al inicio. */
export const atras = () => { if (history.length > 1) history.back(); else ir("inicio"); };

/** La ruta actual; cambia al cambiar el «#». */
export function useRuta(): Destino {
  const [d, setD] = useState(() => leerRuta(location.hash));
  useEffect(() => {
    const f = () => setD(leerRuta(location.hash));
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return d;
}
