// Service worker de los personajes privados (ALV_PLAN_PERSONAJES_PRIVADOS.md, fuera del repo; acordado con Codex en
// los encargos 2026-11-26-personajes-privados-r1…r7).
// Atiende SOLO <alcance>privado/<sello>/… del mismo origen; lo demás de la app no pasa por aquí.
// - privado/<sello>/indice.json → `indices/<sello>.json` del bucket privado (inmutable).
// - privado/<sello>/<ruta lógica> (p. ej. catalogo/hulk/hulk.glb) → su SHA256 en `huellas` de ese índice →
//   `objetos/<sha256>.<ext>`, desde la caché del aparato o desde el bucket. La huella se comprueba antes de guardar.
// - Antes de servir CUALQUIER cosa (también desde la caché) el permiso se confirma en el servidor
//   (`puedo_ver_personajes`); la confirmación vale 2 minutos. Sin confirmación válida no se sirve nada.
// - La caché es de UNA cuenta. Cambiar de cuenta, cerrar sesión o perder el permiso sube la «generación» y borra la
//   caché; una descarga empezada en una generación anterior se descarta (no responde ni guarda).
// El JWT lo manda la página (src/servicios/personajesPrivados.ts) y vive solo en memoria. Una sola sesión por
// navegador: supabase-js guarda la sesión por origen (localStorage), así que todas las pestañas e iframes de la app
// son la misma cuenta. Si el service worker despierta sin sesión, se la pide a las ventanas abiertas.
/* global self, caches */
const CACHE = "alv-privados-v1";
const BUCKET = "personajes-privados";
const LLAVE_CUENTA = "/__alv__/cuenta";
const VIGENCIA_PERMISO = 120000;
const SHA = /^[0-9a-f]{64}$/;
const SELLO = /^[0-9]{8}T[0-9]{6}Z$/;
const RUTA = /^[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9._-]*){0,4}$/;
const TIPOS = { glb: "model/gltf-binary", webp: "image/webp", json: "application/json" };

let sesion = null;     // { url, llave, token, cuenta }
let gen = 0;           // sube con cada cambio de cuenta o salida: descarta descargas y lecturas en curso
let ver = 0;           // sube con CUALQUIER cambio de sesión (también al renovar el token): la confirmación
                       // de permiso vale solo para la versión con la que se pidió (Codex r3, O1)
let permiso = null;    // { ver, hasta, ok }
let revisando = null;  // { ver, p }: revisión de permiso en curso (se agrupan solo las de la misma versión)
let pidiendo = null;   // promesa de sesión pedida a las ventanas
const indices = new Map(); // sello → { huellas }

// Cuenta dueña de la caché. Se lee UNA vez al despertar; desde ahí todo cambio de sesión es síncrono en memoria, así
// que ninguna petición puede colarse entre «llegó otra cuenta» y «se invalidó la anterior» (Codex r6, O2).
// Invariante: la caché solo guarda modelos si tiene la marca de su cuenta. Una caché sin marca (p. ej. el service
// worker se cerró a medio cambio) se borra entera al despertar (Codex r7b, D2).
let cuentaGuardada = null;
let salidas = 0; // sube solo al salir: descarta las sesiones recibidas ANTES de esa salida (Codex r7b, O2)
const listo = (async () => {
  try {
    const r = await (await caches.open(CACHE)).match(LLAVE_CUENTA);
    cuentaGuardada = r ? await r.text() : null;
    if (!r) await caches.delete(CACHE);
  } catch { cuentaGuardada = null; }
})();

const prefijo = () => new URL("privado/", self.registration.scope).pathname;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("message", e => {
  const d = e.data;
  if (!d || typeof d !== "object" || !e.source) return; // solo de ventanas o iframes de la app
  // Una sesión recibida antes de una salida no se aplica después; pero un cambio de cuenta NO descarta las sesiones
  // que llegaron detrás (se aplican en orden y gana la última) (Codex r4 y r7b, O2).
  if (d.tipo === "sesion") { const s0 = salidas; e.waitUntil(listo.then(() => { if (s0 === salidas) aplicarSesion(d); })); }
  else if (d.tipo === "salir") { salidas++; invalidar(); cuentaGuardada = null; e.waitUntil(borrarCache(gen)); } // al instante
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin || !u.pathname.startsWith(prefijo())) return;
  e.respondWith(atender(u.pathname.slice(prefijo().length)));
});

function valida(s) {
  return !!s && typeof s.url === "string" && /^(https:\/\/[a-z0-9-]+\.supabase\.co|http:\/\/(127\.0\.0\.1|localhost):\d+)$/.test(s.url)
    && typeof s.llave === "string" && s.llave.length < 300 && typeof s.token === "string" && s.token.length < 5000
    && typeof s.cuenta === "string" && /^[0-9a-f-]{36}$/.test(s.cuenta);
}

// Lo único asíncrono son los borrados y la marca de cuenta en disco; van en fila y se descartan si cambió la generación.
let fila = Promise.resolve();
const enFila = f => (fila = fila.then(f, f));
const borrarCache = g => enFila(async () => { if (g === gen) await caches.delete(CACHE); });
const marcarCuenta = (g, cuenta) => enFila(async () => {
  if (g !== gen) return;
  const c = await caches.open(CACHE);
  if (g === gen) await c.put(LLAVE_CUENTA, new Response(cuenta)); // si se borró en medio, queda en una caché huérfana
});

/** Corta todo al instante: lo que esté en curso ve otra generación y se descarta (Codex r3, O2). */
function invalidar() { gen++; ver++; sesion = null; permiso = null; revisando = null; indices.clear(); }

/** Aplica una sesión, SÍNCRONA (después de `listo`). `v0`: versión con la que se pidió; si llegó otra sesión en medio,
 *  la respuesta atrasada no la reemplaza (Codex r6, O9). */
function aplicarSesion(d, v0) {
  if (!valida(d)) return false;
  if (v0 !== undefined && v0 !== ver) return false;
  const otra = (cuentaGuardada !== null && cuentaGuardada !== d.cuenta) || (sesion !== null && sesion.cuenta !== d.cuenta);
  if (otra) { invalidar(); borrarCache(gen); }
  if (otra || cuentaGuardada !== d.cuenta) marcarCuenta(gen, d.cuenta);
  cuentaGuardada = d.cuenta;
  if (!sesion || sesion.token !== d.token) { ver++; permiso = null; revisando = null; } // se confirma otra vez
  sesion = { url: d.url, llave: d.llave, token: d.token, cuenta: d.cuenta };
  return true;
}

function pedirSesion() {
  if (pidiendo) return pidiendo;
  pidiendo = (async () => {
    await listo;
    const g0 = gen, v0 = ver;
    const ventanas = await self.clients.matchAll({ type: "window" });
    const r = await Promise.race([
      ...ventanas.map(v => new Promise(fin => {
        const canal = new MessageChannel();
        canal.port1.onmessage = ev => fin(ev.data);
        v.postMessage({ tipo: "pide-sesion" }, [canal.port2]);
      })),
      new Promise(fin => setTimeout(() => fin(null), 3000)),
    ]);
    if (r && r.tipo === "sesion" && g0 === gen) aplicarSesion(r, v0);
    return sesion;
  })().finally(() => { pidiendo = null; });
  return pidiendo;
}

// El motivo (sin datos de la cuenta) ayuda a diagnosticar: sin-sesion, sin-permiso, sin-confirmar, no-existe, huella…
const nada = (estado, motivo = "") => new Response(null, { status: estado, headers: { "Cache-Control": "no-store", "X-ALV-Motivo": motivo } });
let ultimoMotivo = "";

/** ¿El servidor confirma el permiso de ESTA versión de sesión? Agrupa revisiones de la misma versión; vale
 *  VIGENCIA_PERMISO. Si la sesión cambia mientras se revisa, el resultado se tira y se revisa con la nueva. */
async function autorizado(forzar = false, intento = 0) {
  const s = sesion ?? await pedirSesion();
  if (!s) { ultimoMotivo = "sin-sesion"; return false; }
  const v = ver, g = gen;
  if (!forzar && permiso && permiso.ver === v && permiso.hasta > Date.now()) return permiso.ok;
  if (revisando && revisando.ver === v) return revisando.p;
  const p = (async () => {
    try {
      const r = await fetch(`${s.url}/rest/v1/rpc/puedo_ver_personajes`, { method: "POST", cache: "no-store", credentials: "omit",
        headers: { apikey: s.llave, Authorization: `Bearer ${s.token}`, "Content-Type": "application/json" }, body: "{}" });
      if (v !== ver || g !== gen) return intento < 2 && g === gen ? autorizado(true, intento + 1) : false; // sesión cambió
      if (r.status === 401) { // token vencido: se pide uno nuevo a la página y se intenta una vez más
        if (intento >= 1) { ultimoMotivo = "sin-confirmar-401"; return false; }
        sesion = null;
        return autorizado(true, intento + 1);
      }
      if (!r.ok) { ultimoMotivo = "sin-confirmar-" + r.status; return false; } // sin confirmación no se sirve (no se borra por un error de red)
      const ok = (await r.json()) === true;
      if (v !== ver || g !== gen) return intento < 2 && g === gen ? autorizado(true, intento + 1) : false;
      if (!ok) { ultimoMotivo = "sin-permiso"; invalidar(); cuentaGuardada = null; await borrarCache(gen); return false; } // la marca se va con la caché (r7b, D2)
      permiso = { ver: v, hasta: Date.now() + VIGENCIA_PERMISO, ok };
      return true;
    } catch (e) { ultimoMotivo = "sin-red:" + String(e && e.message).replace(/[^ -~]/g, "").slice(0, 120); return false; }
  })();
  revisando = { ver: v, p };
  p.finally(() => { if (revisando && revisando.p === p) revisando = null; });
  return p;
}

async function remoto(ruta) {
  const s = sesion ?? await pedirSesion();
  if (!s) return null;
  let r = await fetch(`${s.url}/storage/v1/object/authenticated/${BUCKET}/${ruta}`, {
    headers: { apikey: s.llave, Authorization: `Bearer ${s.token}` }, cache: "no-store", credentials: "omit" });
  if (r.status === 401) {
    // Solo se descarta la sesión con la que se pidió: si ya llegó una más nueva, se usa esa.
    if (sesion && sesion.token === s.token) { sesion = null; ver++; permiso = null; revisando = null; }
    const n = sesion ?? await pedirSesion();
    if (!n) return r;
    r = await fetch(`${n.url}/storage/v1/object/authenticated/${BUCKET}/${ruta}`, {
      headers: { apikey: n.llave, Authorization: `Bearer ${n.token}` }, cache: "no-store", credentials: "omit" });
  }
  return r;
}

async function sha256(buf) {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function leerIndice(texto) {
  const d = JSON.parse(texto);
  const huellas = {};
  for (const [k, v] of Object.entries(d && typeof d.huellas === "object" && d.huellas ? d.huellas : {}))
    if (RUTA.test(k) && !k.includes("..") && typeof v === "string" && SHA.test(v)) huellas[k] = v;
  return { huellas };
}

/** Bytes de un archivo inmutable: caché del aparato o bucket. Devuelve Response o un código de error. */
async function inmutable(llave, rutaRemota, tipo, g, comprobar) {
  const c = await caches.open(CACHE);
  const visto = await c.match(llave);
  if (g !== gen) return 403; // salió o cambió de cuenta mientras se leía la caché (Codex r3, O2)
  if (visto) return visto;
  const r = await remoto(rutaRemota);
  if (!r) return 401;
  if (!r.ok) {
    // Storage esconde lo que no se puede ver como «no existe» (400/404): se vuelve a preguntar por el permiso.
    if (!(await autorizado(true))) return 403;
    return 404;
  }
  const datos = await r.arrayBuffer();
  if (g !== gen) return 403; // la sesión cambió mientras bajaba: se descarta
  if (comprobar && await sha256(datos) !== comprobar) return 502;
  const resp = new Response(datos, { headers: { "Content-Type": tipo, "Cache-Control": "no-store" } });
  if (g !== gen) return 403;
  await c.put(llave, resp.clone()); // la misma caché de antes: si una salida la borró, lo guardado queda huérfano
  return resp;
}

async function indiceDe(sello, g) {
  if (indices.has(sello)) return indices.get(sello);
  const r = await inmutable(`/__alv__/indices/${sello}`, `indices/${sello}.json`, TIPOS.json, g, null);
  if (typeof r === "number") return r;
  try { const i = leerIndice(await r.clone().text()); if (g === gen) indices.set(sello, i); return { ...i, respuesta: r }; }
  catch { return 502; }
}

async function atender(resto) {
  await listo;
  const g = gen;
  try {
    const partes = decodeURIComponent(resto).split("/");
    const sello = partes.shift();
    const ruta = partes.join("/");
    if (!SELLO.test(sello ?? "")) return nada(404);
    if (!(await autorizado())) return nada(403, ultimoMotivo);
    if (g !== gen) return nada(403);
    // Antes de entregar algo: misma generación, y si la sesión cambió (token renovado) se confirma con la nueva
    // (Codex r4, O1).
    const v = ver;
    const sigue = async () => g === gen && (v === ver || (await autorizado()) && g === gen);
    const ind = await indiceDe(sello, g);
    if (typeof ind === "number") return nada(ind, "indice-" + ind);
    if (ruta === "indice.json") {
      const r = ind.respuesta ?? await (await caches.open(CACHE)).match(`/__alv__/indices/${sello}`);
      if (!(await sigue())) return nada(403, "salio");
      return r ?? nada(404);
    }
    if (!RUTA.test(ruta) || ruta.includes("..")) return nada(404);
    const sha = ind.huellas[ruta];
    const ext = ruta.slice(ruta.lastIndexOf(".") + 1);
    if (!sha || !TIPOS[ext] || ext === "json") return nada(404);
    const r = await inmutable(`/__alv__/objetos/${sha}`, `objetos/${sha}.${ext}`, TIPOS[ext], g, sha);
    if (!(await sigue())) return nada(403, "salio");
    return typeof r === "number" ? nada(r, r === 502 ? "huella" : "objeto-" + r) : r;
  } catch {
    return nada(503);
  }
}
