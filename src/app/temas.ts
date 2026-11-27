// Temas de personaje (Elías, 26 nov 2026): fondo y canción por saga, con excepciones por personaje.
// La música tiene derechos de terceros: nada de esto vive en el repo ni en GitHub Pages. Todo sale del bucket PRIVADO
// `temas-privados` (migración 047) y solo lo baja quien puede ver personajes privados (`puedo_ver_personajes`).
//   manifiesto.json → {version, temas:{tema:{fondo:{g,c}, musica:[…]}}, personajes:{id de personaje: tema}}
//   objetos/<sha256>.webp|mp3 → cada archivo; se guarda en la caché del aparato (no cambia nunca: va por contenido).
// Lo sube Elías con juegos-fiesta\audio-personajes\subir-temas.mjs. Sin nube, sin sesión, sin permiso o sin
// manifiesto, todo sigue como siempre (fondos de la app y música del HUB).
// Momentos: HUB, taller y colección en tu celular (fondo y canción de tu personaje); paredes de las cabinas del lobby
// (fondo de cada quien, sin canción); resultados en la TV (fondo y ~8 s de canción del ganador).
import { useEffect, useState } from "react";
import { cliente } from "../servicios/cliente";
import { leerV3 } from "../personajes/integracion";

export interface Tema { fondo: { g: string; c: string }; musica: string[] }
export interface Manifiesto { temas: Record<string, Tema>; personajes: Record<string, string> }

const BUCKET = "temas-privados";
const CACHE = "alv-temas-v1";
const OBJETO = /^[0-9a-f]{64}\.(webp|mp3)$/;
const CLAVE = /^[a-z0-9][a-z0-9_-]{0,40}$/;
/** Solo en desarrollo: `?temas=<carpeta servida aparte>` lee manifiesto y objetos de ahí, sin nube (pruebas). */
const PRUEBA = import.meta.env.DEV && typeof location !== "undefined" ? new URLSearchParams(location.search).get("temas") : null;

/** Valida el manifiesto (viene de la nube: no es confiable). null si no sirve. */
export function leerManifiesto(x: unknown): Manifiesto | null {
  if (!x || typeof x !== "object") return null;
  const { temas, personajes } = x as { temas?: unknown; personajes?: unknown };
  if (!temas || typeof temas !== "object" || !personajes || typeof personajes !== "object") return null;
  const t: Record<string, Tema> = {};
  for (const [k, v] of Object.entries(temas as Record<string, unknown>)) {
    const f = (v as { fondo?: { g?: unknown; c?: unknown } } | null)?.fondo;
    const m = (v as { musica?: unknown } | null)?.musica;
    if (!CLAVE.test(k) || typeof f?.g !== "string" || typeof f.c !== "string" || !OBJETO.test(f.g) || !OBJETO.test(f.c)) continue;
    const musica = Array.isArray(m) ? m.filter((s): s is string => typeof s === "string" && OBJETO.test(s) && s.endsWith(".mp3")).slice(0, 8) : [];
    t[k] = { fondo: { g: f.g, c: f.c }, musica };
  }
  const p: Record<string, string> = {};
  for (const [k, v] of Object.entries(personajes as Record<string, unknown>)) if (CLAVE.test(k) && typeof v === "string" && t[v]) p[k] = v;
  return { temas: t, personajes: p };
}

/** Personaje del catálogo que lleva la figura (v3 dentro de la v2). null para lo creado desde cero o sin v3. */
export function personajeDe(figura: unknown): string | null {
  const v3 = leerV3(figura);
  return v3 && v3.origen.tipo === "catalogo" ? v3.origen.personaje : null;
}

/** Tema de un personaje, o null. */
export function temaDe(m: Manifiesto | null, personaje: string | null): Tema | null {
  const k = personaje ? m?.personajes[personaje] : undefined;
  return k ? m!.temas[k] ?? null : null;
}

// ---------- Descarga ----------
let manifiesto: Promise<Manifiesto | null> | null = null;
let escuchando = false;

/** El manifiesto vigente (una vez por sesión). Un null no se guarda: el siguiente llamado vuelve a intentar. */
export function cargarManifiesto(): Promise<Manifiesto | null> {
  if (PRUEBA) return manifiesto ??= fetch(new URL("manifiesto.json", PRUEBA)).then(r => r.json()).then(leerManifiesto).catch(() => null);
  if (!cliente) return Promise.resolve(null);
  if (!escuchando) { escuchando = true; cliente.auth.onAuthStateChange(ev => { if (ev === "SIGNED_OUT" || ev === "SIGNED_IN") { manifiesto = null; urls.clear(); } }); }
  const p = manifiesto ?? (manifiesto = (async () => {
    const { data: s } = await cliente!.auth.getSession();
    if (!s.session) return null;
    const { data, error } = await cliente!.storage.from(BUCKET).download("manifiesto.json");
    if (error || !data) return null;
    return leerManifiesto(JSON.parse(await data.text()));
  })().catch(e => { console.warn("temas:", e); return null; }).then(m => { if (!m && manifiesto === p) manifiesto = null; return m; }));
  return p;
}

const urls = new Map<string, Promise<string | null>>();

async function bajar(nombre: string): Promise<Blob | null> {
  const llave = new URL(`/__alv_temas__/${nombre}`, location.origin).href;
  let cache: Cache | null = null;
  try { cache = await caches.open(CACHE); const r = await cache.match(llave); if (r) return await r.blob(); } catch { cache = null; }
  if (PRUEBA) return (await fetch(new URL(`objetos/${nombre}`, PRUEBA))).blob();
  const { data, error } = await cliente!.storage.from(BUCKET).download(`objetos/${nombre}`);
  if (error || !data) return null;
  try { await cache?.put(llave, new Response(data, { headers: { "Content-Type": data.type } })); } catch { /* caché llena o no disponible */ }
  return data;
}

/** URL local (blob:) de un archivo del tema, o null si no se pudo. */
export function urlObjeto(nombre: string): Promise<string | null> {
  if ((!cliente && !PRUEBA) || !OBJETO.test(nombre)) return Promise.resolve(null);
  let p = urls.get(nombre);
  if (!p) {
    p = bajar(nombre).then(b => (b ? URL.createObjectURL(b) : null)).catch(e => { console.warn("temas:", e); return null; });
    p.then(u => { if (!u) urls.delete(nombre); });
    urls.set(nombre, p);
  }
  return p;
}

// ---------- Hooks ----------
const esAncho = () => typeof matchMedia !== "undefined" && matchMedia("(min-width: 900px)").matches;

export interface EstadoFondo {
  /** false mientras se averigua si hay tema (para no armar la escena dos veces). */ listo: boolean;
  /** url() lista para CSS, o null (sin tema: se usa el fondo de siempre). */ css: string | null;
}

/** Fondo del tema de cada figura. `tamano`: «c» vertical (celular y cabinas), «g» horizontal, «auto» según la pantalla.
 *  Espera como mucho `espera` ms: si tarda más, sigue sin tema y lo pone cuando llegue. */
export function useFondosTema(figuras: readonly unknown[], tamano: "c" | "g" | "auto" = "auto", espera = 1500): EstadoFondo[] {
  const ids = figuras.map(personajeDe);
  const clave = ids.join("|") + tamano;
  const [estado, setEstado] = useState<{ clave: string; v: EstadoFondo[] }>(() => ({ clave: "", v: ids.map(() => ({ listo: false, css: null })) }));
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(() => { if (vivo) setEstado(e => e.clave === clave ? e : { clave, v: ids.map(() => ({ listo: true, css: null })) }); }, espera);
    void cargarManifiesto().then(async m => {
      const v = await Promise.all(ids.map(async id => {
        const tema = temaDe(m, id);
        if (!tema) return { listo: true, css: null };
        const cual = tamano === "auto" ? (esAncho() ? "g" : "c") : tamano;
        const u = await urlObjeto(tema.fondo[cual]);
        return { listo: true, css: u ? `url("${u}")` : null };
      }));
      if (vivo) { clearTimeout(t); setEstado({ clave, v }); }
    });
    return () => { vivo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  // Mientras carga una lista nueva (alguien entró al lobby) cada lugar conserva lo que ya tenía.
  return estado.clave === clave ? estado.v : ids.map((_, i) => estado.v[i] ?? { listo: false, css: null });
}

export function useFondoTema(figura: unknown, tamano: "c" | "g" | "auto" = "auto", espera?: number): EstadoFondo {
  return useFondosTema([figura], tamano, espera)[0]!;
}

/** Canciones del tema de una figura, ya como URL local. Lista vacía si no tiene. */
export async function cancionesDe(figura: unknown): Promise<string[]> {
  const tema = temaDe(await cargarManifiesto(), personajeDe(figura));
  if (!tema) return [];
  const u = await Promise.all(tema.musica.map(urlObjeto));
  return u.filter((x): x is string => !!x);
}
