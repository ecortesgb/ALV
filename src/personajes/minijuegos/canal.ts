// Canal entre la TV y los celulares del prototipo de Mini-Juegos (zona aparte).
// Dos transportes con el mismo contrato:
// - WebSocket a la PC (Codex D8, herramientas-locales/sala-ws.mjs): por omisión; es el que sirve para celulares y TV
//   reales. El servidor pone el remitente, asigna al anfitrión y entrega lo que va «para» alguien solo a esa conexión.
// - Pestañas (BroadcastChannel, ?canal=pestanas): solo para pruebas en un mismo navegador; aquí el remitente lo pone
//   el propio mensaje, así que NO sirve para nada que deba ser secreto ni para saber quién es el anfitrión.
// Ambos aceptan latencia simulada al mandar (?lat=ms&jit=ms&perdida=0..1). Lo que llega de otro aparato no es confiable: `leer` revisa el sobre y `validar` el contrato de cada tipo;
// lo inválido se descarta sin lanzar excepciones (Codex O3).

export interface Mensaje { de: string; tipo: string; d: Record<string, unknown> }
export interface Canal {
  enviar: (tipo: string, d?: Record<string, unknown>) => void;
  cerrar: () => void;
  /** Quién soy: en WebSocket lo dice el servidor al conectar («bienvenida»); en pestañas, el id local. */
  yo: () => string;
  tipo: "ws" | "pestanas";
}
export interface Red { lat: number; jit: number; perdida: number }

export const TV = "tv";
export const ahora = () => performance.timeOrigin + performance.now();

export function redDeUrl(q: URLSearchParams): Red {
  const n = (k: string, def: number, max: number) => Math.max(0, Math.min(max, Number(q.get(k) ?? def) || 0));
  return { lat: n("lat", 0, 2000), jit: n("jit", 0, 1000), perdida: n("perdida", 0, 0.9) };
}

/** Revisa el sobre: remitente y tipo cortos, datos objeto plano y sin textos enormes. Nunca lanza. */
export function leer(crudo: unknown): Mensaje | null {
  try {
    if (!crudo || typeof crudo !== "object") return null;
    const m = crudo as { de?: unknown; tipo?: unknown; d?: unknown };
    if (typeof m.de !== "string" || !m.de || m.de.length > 40 || typeof m.tipo !== "string" || m.tipo.length > 20) return null;
    const d = m.d && typeof m.d === "object" && !Array.isArray(m.d) ? (m.d as Record<string, unknown>) : {};
    if (JSON.stringify(d).length > 20000) return null; // también falla (y se descarta) con datos circulares o BigInt
    return { de: m.de, tipo: m.tipo, d };
  } catch { return null; }
}

// ---------- Contrato de cada tipo ----------
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const ent = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 1e9 ? v : null);
const txt = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : null);
const BOTONES = new Set(["saltar", "golpe", "festejo"]);
const ACCIONES = new Set(["ronda", "revelar", "ocultar", "perdio", "puntos", "castigo", "reto", "escenario"]);
const GESTOS = new Set(["saludo", "festejo", "derrota", "especial"]);
const id40 = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : null);

/**
 * Lo que manda un celular a la TV, ya limpio, o null si no cumple. Todos llevan `n` (número creciente por celular).
 * - hola {nombre, personaje} · ping {t0} · adios · empezar · otra
 * - salto {pid, s, inc}: pid = partida; s = hora del toque en el reloj de la TV; inc = incertidumbre del reloj (ms)
 * - mando {x, z} en [-1, 1] · boton {b}
 * - Sala de Físico: fx {a, id?, n?, c?} (acción del anfitrión; la TV revisa que sea el anfitrión) · gesto {g} (anima a
 *   su propio personaje) · acepta {si} (respuesta a un castigo o reto de contacto)
 */
export function validarDeCelular(m: Mensaje): Record<string, unknown> | null {
  if (m.de === TV) return null;
  const d = m.d, n = ent(d.n);
  if (n === null) return null;
  switch (m.tipo) {
    case "hola": { const nombre = txt(d.nombre, 40), personaje = txt(d.personaje, 40); return nombre !== null && personaje !== null ? { n, nombre, personaje } : null; }
    case "ping": { const t0 = num(d.t0); return t0 !== null ? { n, t0 } : null; }
    case "adios": case "empezar": case "otra": return { n };
    case "salto": {
      const pid = txt(d.pid, 20), s = num(d.s), inc = num(d.inc);
      return pid && s !== null && inc !== null && inc >= 0 ? { n, pid, s, inc } : null;
    }
    case "mando": {
      const x = num(d.x), z = num(d.z);
      return x !== null && z !== null && Math.abs(x) <= 1.5 && Math.abs(z) <= 1.5 ? { n, x, z } : null;
    }
    case "boton": { const b = txt(d.b, 10); return b && BOTONES.has(b) ? { n, b } : null; }
    case "fx": {
      const a = txt(d.a, 12);
      if (!a || !ACCIONES.has(a)) return null;
      const fuera: Record<string, unknown> = { n, a };
      if (d.id !== undefined) { const id = id40(d.id); if (!id) return null; fuera.id = id; }
      if (d.n2 !== undefined) { const v = num(d.n2); if (v === null || !Number.isInteger(v) || Math.abs(v) > 10) return null; fuera.n2 = v; }
      if (d.c !== undefined) { const c = id40(d.c); if (!c) return null; fuera.c = c; }
      return fuera;
    }
    case "gesto": { const g = txt(d.g, 12); return g && GESTOS.has(g) ? { n, g } : null; }
    case "acepta": return typeof d.si === "boolean" ? { n, si: d.si } : null;
    default: return null;
  }
}

/** El celular solo le cree a la TV: cualquier otro remitente se ignora. */
export function deLaTv(m: Mensaje): boolean { return m.de === TV; }

/** Descarta repetidos y atrasados: por remitente, solo pasa un `n` mayor que el último visto. */
export function crearSecuencias() {
  const ultimo = new Map<string, number>();
  return {
    nueva(de: string, n: number): boolean {
      const u = ultimo.get(de);
      if (u !== undefined && n <= u) return false;
      ultimo.set(de, n);
      return true;
    },
    /** Borra lo de ese remitente con todos sus tipos (`de` y `de|tipo`): un celular recargado empieza en 1 (Codex W2). */
    olvidar(de: string) { for (const k of [...ultimo.keys()]) if (k === de || k.startsWith(de + "|")) ultimo.delete(k); },
  };
}

/** Abre el canal de la sala. La latencia simulada se aplica al mandar (cada lado la suya). */
export function abrirCanal(sala: string, yo: string, alMensaje: (m: Mensaje) => void, red: Red = { lat: 0, jit: 0, perdida: 0 }): Canal {
  const bc = new BroadcastChannel(`alv-minijuegos-${sala}`);
  bc.onmessage = ev => { const m = leer(ev.data); if (m && m.de !== yo) alMensaje(m); };
  let cerrado = false, n = 0;
  return {
    enviar: (tipo, d = {}) => {
      if (cerrado) return;
      const msj: Mensaje = { de: yo, tipo, d: { ...d, n: ++n } };
      if (red.perdida && Math.random() < red.perdida) return;
      const espera = red.lat + (red.jit ? (Math.random() * 2 - 1) * red.jit : 0);
      if (espera <= 0) bc.postMessage(msj);
      else setTimeout(() => { if (!cerrado) bc.postMessage(msj); }, espera);
    },
    cerrar: () => { cerrado = true; bc.close(); },
    yo: () => yo, tipo: "pestanas",
  };
}

/** Mensaje del servidor de sala (no de la TV ni de un celular). */
export const SERVIDOR = "servidor";

/**
 * Canal por WebSocket al servidor de sala. Se reconecta solo (cada 1.5 s) y guarda hasta 50 mensajes mientras tanto.
 * `llave` (solo celulares): secreto local con el que el servidor le da siempre el mismo id a ese celular.
 */
export function abrirCanalWs(url: string, alMensaje: (m: Mensaje) => void, red: Red = { lat: 0, jit: 0, perdida: 0 },
  alConexion?: (abierto: boolean, motivo?: string) => void): Canal {
  let ws: WebSocket | null = null, cerrado = false, n = 0, yo = "";
  const cola: string[] = [];
  const conectar = () => {
    if (cerrado) return;
    ws = new WebSocket(url);
    ws.onopen = () => { alConexion?.(true); for (const x of cola.splice(0)) ws!.send(x); };
    ws.onmessage = ev => {
      let crudo: unknown;
      try { crudo = JSON.parse(String(ev.data)); } catch { return; }
      const m = leer(crudo);
      if (!m) return;
      if (m.de === SERVIDOR && m.tipo === "bienvenida" && typeof m.d.yo === "string") yo = m.d.yo;
      alMensaje(m);
    };
    ws.onclose = ev => { alConexion?.(false, ev.reason || String(ev.code)); if (!cerrado && ev.code < 4000) setTimeout(conectar, 1500); };
  };
  conectar();
  const salir = (texto: string) => {
    if (ws && ws.readyState === 1) ws.send(texto);
    else if (cola.length < 50) cola.push(texto);
  };
  return {
    enviar: (tipo, d = {}) => {
      if (cerrado) return;
      const texto = JSON.stringify({ tipo, d: { ...d, n: ++n } });
      if (red.perdida && Math.random() < red.perdida) return;
      const espera = red.lat + (red.jit ? (Math.random() * 2 - 1) * red.jit : 0);
      if (espera <= 0) salir(texto); else setTimeout(() => { if (!cerrado) salir(texto); }, espera);
    },
    cerrar: () => { cerrado = true; ws?.close(); },
    yo: () => yo, tipo: "ws",
  };
}

/** Dirección del servidor de sala para esta página: el mismo aparato que sirvió la página, puerto 4200 (o ?ws=puerto). */
export function urlSala(q: URLSearchParams, sala: string, rol: "tv" | "cel", llave = ""): string {
  const puerto = /^\d{2,5}$/.test(q.get("ws") || "") ? q.get("ws") : "4200";
  const p = new URLSearchParams({ sala, rol, ...(llave ? { llave } : {}) });
  return `ws://${location.hostname}:${puerto}/?${p.toString()}`;
}

/** Número de sala corto para el prototipo (4 letras sin las que se confunden). */
export function salaNueva(azar = Math.random): string {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () => L[Math.floor(azar() * L.length)]).join("");
}
