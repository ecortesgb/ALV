// Enrutador propio con «#» (GitHub Pages no sabe de rutas). Sin librerías.
// El papel del aparato lo da la ruta, no la cuenta: #/tv/código es la Pantalla, #/sala/código un celular.
// Las rutas de hoy siguen igual; las nuevas de ALV 2.0 apuntan a una pantalla actual o a un esqueleto
// mientras llegan los pasos siguientes de la Fase 6 (Maestro §22.1).
import { useEffect, useState } from "react";

/** Pantallas de la app de hoy. */
export type RutaActual = "inicio" | "lobby" | "tienda" | "ranking" | "perfil" | "unirse" | "fisico" | "ajustes" | "jugar" | "figura";
/** Aparatos de ALV 2.0 que aún no tienen pantalla propia, y la página interna del Design System. */
export type RutaNueva = "tv" | "mesa" | "proyectar" | "ds";
export type Ruta = RutaActual | RutaNueva;

const ACTUALES: RutaActual[] = ["inicio", "lobby", "tienda", "ranking", "perfil", "unirse", "fisico", "ajustes", "jugar", "figura"];
const NUEVAS: RutaNueva[] = ["tv", "mesa", "proyectar", "ds"];

/** Otros nombres que llevan a una pantalla de hoy: viejos guardados y los de ALV 2.0 que ya tienen equivalente. */
const ALIAS: Record<string, { ruta: RutaActual; arg?: (a?: string) => string | undefined }> = {
  // Viejos (siguen funcionando si alguien los tenía guardados).
  juegos: { ruta: "lobby", arg: a => (a ? `s-${a}` : undefined) },
  grupo: { ruta: "lobby" },
  historial: { ruta: "ranking" },
  // ALV 2.0: el QR deja dentro de la sala; mientras, ambos abren la sala de hoy con el código escrito.
  s: { ruta: "unirse", arg: a => a },
  sala: { ruta: "unirse", arg: a => a },
  hub: { ruta: "inicio" },
  catalogo: { ruta: "lobby" },
  juego: { ruta: "lobby", arg: a => (a ? `j-${a}` : undefined) },
  personalizar: { ruta: "perfil" },
  coleccion: { ruta: "perfil", arg: () => "cosas" },
  logros: { ruta: "perfil" },
  admin: { ruta: "ajustes" },
};

/** Código de sala: 6 letras o números, en mayúsculas. Cualquier otra cosa se descarta. */
const codigo = (a?: string) => {
  const c = (a ?? "").toUpperCase();
  return /^[A-Z0-9]{6}$/.test(c) ? c : undefined;
};

export interface Destino { ruta: Ruta; arg?: string }

/** Lee una dirección («#/tv/K7PQ2M») y dice qué pantalla abrir. Lo desconocido va al inicio. */
export function leerRuta(hash: string): Destino {
  const [r = "", crudo] = hash.replace(/^#\/?/, "").split("/");
  let arg: string | undefined;
  try { arg = crudo ? decodeURIComponent(crudo) : undefined; } catch { arg = undefined; }
  const alias = ALIAS[r];
  if (alias) {
    const a = r === "s" || r === "sala" ? codigo(arg) : alias.arg ? alias.arg(arg) : undefined;
    return a ? { ruta: alias.ruta, arg: a } : { ruta: alias.ruta };
  }
  if ((NUEVAS as string[]).includes(r)) {
    const a = r === "tv" || r === "mesa" ? codigo(arg) : undefined;
    return a ? { ruta: r as RutaNueva, arg: a } : { ruta: r as RutaNueva };
  }
  if ((ACTUALES as string[]).includes(r)) return arg ? { ruta: r as RutaActual, arg } : { ruta: r as RutaActual };
  return { ruta: "inicio" };
}

/** Dirección de una pantalla. */
export const href = (r: Ruta, arg?: string) => `#/${r}${arg ? `/${encodeURIComponent(arg)}` : ""}`;

/** Va a una pantalla. */
export const ir = (r: Ruta, arg?: string) => { location.hash = href(r, arg).slice(1); };

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
