// Personajes privados en la app publicada (ALV_PLAN_PERSONAJES_PRIVADOS.md, fuera del repo).
// Registra `sw-privados.js`, le pasa la sesión del jugador (el JWT solo viaja por mensaje, nunca en una URL) y entrega
// la «fuente» para `cargarIndice` del sistema nuevo de personajes: `<base>privado/<sello de la entrega>/`, con la que
// `indice.ts`, `plano.ts` y el motor siguen armando sus rutas como siempre. El sello cambia con cada entrega, así que
// una entrega nueva nunca se mezcla con modelos ya cargados en memoria (Codex O5).
// Devuelve null (y la app sigue con los personajes públicos) si: no hay nube, no hay sesión, la cuenta no tiene
// permiso, el aparato no tiene service worker o la página no es segura (http en la red de la casa).
import type { Session, SupabaseClient } from "@supabase/supabase-js";

export interface Entorno {
  cliente: SupabaseClient | null;
  url?: string;
  llave?: string;
  sw?: ServiceWorkerContainer | null;
  seguro?: boolean;
  base?: string;
  espera?: number;
}

export type Mensaje =
  | { tipo: "sesion"; url: string; llave: string; token: string; cuenta: string }
  | { tipo: "salir" };

/** Mensaje de sesión para el service worker, o null si falta algo. */
export function mensajeSesion(s: Session | null, url: string, llave: string): Mensaje | null {
  if (!s?.access_token || !s.user?.id || !url || !llave) return null;
  return { tipo: "sesion", url: url.replace(/\/+$/, ""), llave, token: s.access_token, cuenta: s.user.id };
}

const SELLO = /^[0-9]{8}T[0-9]{6}Z$/;

/** Base que se le da a `cargarIndice`: del mismo origen, bajo el alcance del service worker, fija por entrega. */
export function basePrivada(base: string, sello: string): string | null {
  return SELLO.test(sello) ? new URL(`privado/${sello}/`, base).href : null;
}

let activo: Promise<string | null> | null = null;

/** Prepara la entrega privada una vez por página. */
export function fuentePrivada(e: Entorno): Promise<string | null> {
  return (activo ??= preparar(e).catch(err => { console.warn("personajes privados:", err); activo = null; return null; }));
}

async function preparar(e: Entorno): Promise<string | null> {
  const { cliente } = e;
  const url = e.url ?? (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const llave = e.llave ?? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? "";
  const sw = e.sw === undefined ? (typeof navigator !== "undefined" ? navigator.serviceWorker ?? null : null) : e.sw;
  const seguro = e.seguro ?? (typeof isSecureContext !== "undefined" && isSecureContext);
  const base = e.base ?? document.baseURI;
  if (!cliente || !url || !llave || !sw || !seguro) return null;

  const { data } = await cliente.auth.getSession();
  let actual = data.session;
  if (!actual) return null;
  // Una sola llamada confirma el permiso y da la entrega vigente (null = sin permiso o sin entrega).
  const { data: sello, error } = await cliente.rpc("entrega_personajes");
  if (error || typeof sello !== "string" || !SELLO.test(sello)) return null;

  await sw.register(new URL("sw-privados.js", base).href, { scope: new URL("./", base).href });
  await sw.ready;
  if (!sw.controller) {
    // Primera visita: el service worker toma la página con clients.claim(); se espera ese cambio.
    await new Promise<void>(listo => {
      const t = setTimeout(listo, e.espera ?? 4000);
      sw.addEventListener("controllerchange", () => { clearTimeout(t); listo(); }, { once: true });
    });
    if (!sw.controller) return null;
  }
  const mandar = (m: Mensaje | null) => { if (m) sw.controller?.postMessage(m); };
  mandar(mensajeSesion(actual, url, llave));

  // El service worker pide la sesión cuando despierta sin ella.
  sw.addEventListener("message", ev => {
    if ((ev.data as { tipo?: string } | null)?.tipo !== "pide-sesion" || !ev.ports[0]) return;
    ev.ports[0].postMessage(mensajeSesion(actual, url, llave) ?? { tipo: "nada" });
  });
  cliente.auth.onAuthStateChange((evento, s) => {
    actual = s;
    if (evento === "SIGNED_OUT" || !s) mandar({ tipo: "salir" });
    else mandar(mensajeSesion(s, url, llave));
  });
  return basePrivada(base, sello);
}
