// Figuras 3D (Minifig Studio, copiado en public/minifig): cápsulas por jugador, escena de varias figuras,
// fotos para las listas chicas y el editor. El 3D vive en iframes del mismo origen; aquí solo se mandan mensajes.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FiguraV2 } from "../content/personaje";

const BASE = `${import.meta.env.BASE_URL}minifig/`;
export const N_CAPSULAS = 3;

export interface Capsula { nombre: string; figura: FiguraV2; actualizado: string }
/** Mismo formato que nucleo/capsulas.js de Minifig Studio (versión 1 del contenedor; figuras versión 2). */
export interface EstadoCapsulas { version: 1; activa: number | null; slots: (Capsula | null)[] }

export const esFigura = (f: unknown): f is FiguraV2 => !!f && typeof f === "object" && (f as { version?: unknown }).version === 2;
const vacio = (): EstadoCapsulas => ({ version: 1, activa: null, slots: Array(N_CAPSULAS).fill(null) });
/** Debe coincidir con tools/minifig/alv-puente.js. */
export const claveCapsulas = (jugador: string) => "alv-capsulas-" + (jugador.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");

/** Limpia lo que venga de localStorage, del editor o de la nube. */
export function normalizar(x: unknown): EstadoCapsulas {
  const e = vacio();
  const s = x as Partial<EstadoCapsulas> | null;
  if (!s || !Array.isArray(s.slots)) return e;
  for (let i = 0; i < N_CAPSULAS; i++) {
    const c = s.slots[i];
    e.slots[i] = c && esFigura(c.figura) ? { nombre: String(c.nombre ?? "Mi figura").slice(0, 24), figura: c.figura, actualizado: String(c.actualizado ?? "") } : null;
  }
  const a = s.activa;
  e.activa = typeof a === "number" && e.slots[a] ? a : e.slots.findIndex(Boolean) >= 0 ? e.slots.findIndex(Boolean) : null;
  return e;
}

// ---------- Cápsulas guardadas en este celular (una clave por jugador) ----------

const oyentes = new Set<() => void>();
const avisarCambio = () => oyentes.forEach(f => f());
const cache = new Map<string, { crudo: string | null; estado: EstadoCapsulas }>();
if (typeof window !== "undefined") addEventListener("storage", e => { if (e.key?.startsWith("alv-capsulas-")) avisarCambio(); });

export function leerCapsulas(jugador: string): EstadoCapsulas {
  const k = claveCapsulas(jugador);
  let crudo: string | null = null;
  try { crudo = localStorage.getItem(k); } catch { /* sin almacenamiento */ }
  const c = cache.get(k);
  if (c && c.crudo === crudo) return c.estado;
  let estado = vacio();
  try { estado = normalizar(JSON.parse(crudo ?? "null")); } catch { /* roto: vacío */ }
  cache.set(k, { crudo, estado });
  return estado;
}
export function escribirCapsulas(jugador: string, e: EstadoCapsulas) {
  try { localStorage.setItem(claveCapsulas(jugador), JSON.stringify(normalizar(e))); } catch { /* sin espacio */ }
  avisarCambio();
}
export function useCapsulas(jugador: string): EstadoCapsulas {
  return useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => leerCapsulas(jugador));
}
export const figuraActiva = (e: EstadoCapsulas): FiguraV2 | null => (e.activa == null ? null : e.slots[e.activa]?.figura ?? null);

// ---------- Huella y fotos ----------

export function huella(f: unknown): string {
  const s = JSON.stringify(f);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
}

const FOTOS_CLAVE = "alv-fotos-v4"; // subir el número si cambia el encuadre de las fotos (tools/minifig/escena.js)
const fotos = new Map<string, string>(); // huella → data URL
const pedidas = new Map<string, ((url: string | null) => void)[]>();
try { for (const [k, v] of JSON.parse(localStorage.getItem(FOTOS_CLAVE) ?? "[]") as [string, string][]) fotos.set(k, v); } catch { /* nada */ }
function guardarFotos() {
  // Solo las 12 más recientes: cada foto pesa unos 20 KB.
  const ult = [...fotos].slice(-12);
  try { localStorage.setItem(FOTOS_CLAVE, JSON.stringify(ult)); } catch { /* sin espacio */ }
}

let fotografo: HTMLIFrameElement | null = null;
let fotografoListo = false;
type Modelo = { figura?: FiguraV2 | null; semilla?: number };
const colaFotos: { pid: string; m: Modelo }[] = [];
function pedirAlFotografo(pid: string, m: Modelo) {
  if (!fotografo) {
    fotografo = document.createElement("iframe");
    fotografo.src = BASE + "escena.html";
    fotografo.title = "Fotos de figuras";
    fotografo.setAttribute("aria-hidden", "true");
    fotografo.tabIndex = -1;
    fotografo.style.cssText = "position:fixed;left:-400px;top:0;width:80px;height:80px;border:0;opacity:0;pointer-events:none";
    document.body.appendChild(fotografo);
    addEventListener("message", e => {
      if (e.origin !== location.origin || e.source !== fotografo?.contentWindow || e.data?.origen !== "minifig") return;
      if (e.data.tipo === "listo") { fotografoListo = true; colaFotos.splice(0).forEach(x => enviarFoto(x.pid, x.m)); }
      if (e.data.tipo === "foto") {
        const url = typeof e.data.url === "string" && e.data.url.startsWith("data:image/") ? e.data.url as string : null;
        if (url) { fotos.set(e.data.pid, url); guardarFotos(); }
        (pedidas.get(e.data.pid) ?? []).forEach(f => f(url));
        pedidas.delete(e.data.pid);
      }
    });
  }
  if (fotografoListo) enviarFoto(pid, m); else colaFotos.push({ pid, m });
}
const enviarFoto = (pid: string, m: Modelo) => fotografo?.contentWindow?.postMessage({ origen: "alv", tipo: "foto", pid, figura: m.figura ?? null, semilla: m.semilla, ancho: 240, alto: 300 }, location.origin);

/** Número fijo sacado de un texto: la misma figura al azar para el mismo jugador. */
export const semillaDe = (texto: string) => parseInt(huella(texto), 16) % 2147483647;

/** Foto de la figura (sale del 3D la primera vez y luego se guarda). Sin figura, una al azar fija por `semilla`. */
export function useFoto(figura: FiguraV2 | null | undefined, semilla?: number): string | null {
  const h = useMemo(() => (figura ? huella(figura) : semilla != null ? "s" + semilla : null), [figura, semilla]);
  const [url, setUrl] = useState<string | null>(() => (h ? fotos.get(h) ?? null : null));
  useEffect(() => {
    if (!h) { setUrl(null); return; }
    const ya = fotos.get(h);
    if (ya) { setUrl(ya); return; }
    let vivo = true;
    const lista = pedidas.get(h);
    const f = (u: string | null) => { if (vivo) setUrl(u); };
    if (lista) lista.push(f); else { pedidas.set(h, [f]); pedirAlFotografo(h, { figura, semilla }); }
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h]);
  return url;
}

/** Figura en imagen, para tarjetas, ranking y listas. Ocupa la caja del Avatar (alto = 1.5 × ancho).
 *  `redondo`: retrato circular de cabeza y hombros (ver alv.css, «Retrato circular»). */
export function FotoFigura({ figura, semilla, size, nombre, redondo = false }: { figura?: FiguraV2 | null; semilla?: number; size: number; nombre?: string; redondo?: boolean }) {
  const url = useFoto(figura, semilla);
  const caja = redondo ? { width: size, height: size } : { width: size, height: Math.round(size * 1.5) };
  return (
    <span className={"av av-3d" + (redondo ? " av-redondo" : "")} style={caja} role="img" aria-label={`Figura de ${nombre ?? "jugador"}`}>
      {url ? <img src={url} alt="" draggable={false} /> : <span className="av-3d-cargando" aria-hidden="true" />}
    </span>
  );
}

// ---------- Escena de varias figuras ----------

export type Momento = "punto" | "victoria" | "derrota" | "espera";
/** Sin `figura`, la escena arma una al azar con `semilla` (siempre la misma). */
export interface EnEscena { id: string; figura?: FiguraV2 | null; semilla?: number; foco?: boolean }

/**
 * Una sola escena 3D con todas las figuras (de izquierda a derecha en el orden dado).
 * `momentos`: cada vez que cambia `n`, esa figura hace ese momento (al anotar, al ganar, al perder).
 */
export function Escena3D({ figuras, momentos, className, alto, modo }: { figuras: EnEscena[]; momentos?: { id: string; cual: Momento; n: number }[]; className?: string; alto?: number | string; modo?: "hub" }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [listo, setListo] = useState(false);
  const enviar = (m: object) => ref.current?.contentWindow?.postMessage({ origen: "alv", ...m }, location.origin);
  const ultimas = useRef(figuras);
  ultimas.current = figuras;
  useEffect(() => {
    const f = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== ref.current?.contentWindow || e.data?.origen !== "minifig") return;
      // También llega si la escena se recarga: se le vuelven a mandar las figuras.
      if (e.data.tipo === "listo") { setListo(true); enviar({ tipo: "figuras", lista: ultimas.current }); }
    };
    addEventListener("message", f);
    return () => removeEventListener("message", f);
  }, []);
  const firma = figuras.map(x => `${x.id}:${x.figura ? huella(x.figura) : "s" + x.semilla}:${x.foco ? 1 : 0}`).join("|");
  useEffect(() => { if (listo) enviar({ tipo: "figuras", lista: figuras }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [listo, firma]);
  const vistos = useRef(new Map<string, number>());
  useEffect(() => {
    if (!listo) return;
    for (const m of momentos ?? []) {
      const clave = `${m.id}:${m.cual}`;
      if (vistos.current.get(clave) === m.n) continue;
      const primera = !vistos.current.has(clave);
      vistos.current.set(clave, m.n);
      if (!primera || m.n > 0) enviar({ tipo: "momento", id: m.id, cual: m.cual });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, JSON.stringify(momentos ?? [])]);
  return (
    <div className={"escena3d" + (className ? " " + className : "")} style={alto ? { height: alto } : undefined}>
      <iframe ref={ref} src={BASE + "escena.html" + (modo ? `?modo=${modo}` : "")} title="Escena con las figuras" tabIndex={-1} />
      {!listo && <span className="escena3d-cargando" aria-live="polite">Armando figuras…</span>}
    </div>
  );
}

// ---------- Editor ----------

/** Editor completo de Minifig Studio para un jugador. Cada cambio en sus cápsulas llega por `alCambiar`. */
export function EditorFigura({ jugador, alCambiar }: { jugador: string; alCambiar: (e: EstadoCapsulas) => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const cb = useRef(alCambiar);
  cb.current = alCambiar;
  useEffect(() => {
    const f = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== ref.current?.contentWindow || e.data?.origen !== "minifig") return;
      if (e.data.tipo === "capsulas") { const est = normalizar(e.data.estado); avisarCambio(); cb.current(est); }
    };
    addEventListener("message", f);
    return () => removeEventListener("message", f);
  }, []);
  const src = `${BASE}index.html?app=alv&j=${encodeURIComponent(jugador)}`;
  return <iframe ref={ref} className="editor3d" src={src} title="Editor de figura" allow="fullscreen" />;
}
