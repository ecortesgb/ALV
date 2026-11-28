// Servidor de la fiesta (Modo Fiesta, Elías 27 nov): corre en la laptop, sin internet.
// Sirve la app armada (dist-fiesta, ver armar.mjs) a los celulares y la TV de su red, guarda la copia única de las
// salas y reparte cada cambio. Sin dependencias: solo Node.
//   node tools/fiesta/servidor.mjs            (puerto 8080)
//   node tools/fiesta/servidor.mjs 9000       (otro puerto)
//   node tools/fiesta/servidor.mjs 8080 --personajes "C:\ruta\personajes-privado"
// Personajes: sirve en /privados-fiesta/ SOLO catalogo/ y piezas/ de la carpeta privada (por omisión ..\personajes-privado,
// junto a la carpeta de la app) y arma /privados-fiesta/indice.json como herramientas-locales/servir-personajes.py.
// Esa carpeta nunca entra al repo ni a dist-fiesta: solo se lee en la laptop y se entrega a los aparatos de su red.
// La copia se guarda en fiesta-datos.json (junto a dist-fiesta) para que sobreviva si la laptop se reinicia.
import { createServer, request as pedirHttp } from "node:http";
import { connect } from "node:net";
import { readFileSync, writeFileSync, existsSync, statSync, renameSync, readdirSync, realpathSync, openSync, readSync, closeSync } from "node:fs";
import { join, normalize, extname, dirname, relative, isAbsolute } from "node:path";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITIO = join(RAIZ, "dist-fiesta");
const DATOS = join(RAIZ, "fiesta-datos.json");
const argumentos = process.argv.slice(2);
const iP = argumentos.indexOf("--personajes");
const PUERTO = Number(argumentos.find((a, i) => /^\d+$/.test(a) && i !== iP + 1)) || 8080;
const PRIVADOS = iP >= 0 && argumentos[iP + 1] ? argumentos[iP + 1] : join(RAIZ, "..", "personajes-privado");
let RAICES = [];
try { RAICES = ["catalogo", "piezas"].map(d => join(PRIVADOS, d)).filter(existsSync).map(d => realpathSync(d)); } catch { /* sin personajes */ }
const MAX_CUERPO = 8 * 1024 * 1024;

if (!existsSync(join(SITIO, "index.html"))) {
  console.error("Falta armar la app. Corre primero (con internet):  npm run fiesta:armar");
  process.exit(1);
}

let ver = 0, todo = {};
try { const g = JSON.parse(readFileSync(DATOS, "utf8")); if (g && typeof g.todo === "object" && typeof g.ver === "number") ({ ver, todo } = g); } catch { /* fiesta nueva */ }

let guardado = null;
const guardar = () => {
  if (guardado) return;
  guardado = setTimeout(() => {
    guardado = null;
    try { writeFileSync(DATOS + ".tmp", JSON.stringify({ ver, todo })); renameSync(DATOS + ".tmp", DATOS); } catch (e) { console.error("No se pudo guardar la copia:", e.message); }
  }, 500);
};

const clientes = new Set();
const mandar = (evento, datos) => { const txt = `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`; for (const r of clientes) r.write(txt); };
setInterval(() => { for (const r of clientes) r.write(": latido\n\n"); }, 15000);

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".gif": "image/gif", ".ico": "image/x-icon", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".glb": "model/gltf-binary", ".dat": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8" };

function leerCuerpo(req) {
  return new Promise((ok, mal) => {
    let n = 0; const partes = [];
    req.on("data", c => { n += c.length; if (n > MAX_CUERPO) { mal(new Error("grande")); req.destroy(); } else partes.push(c); });
    req.on("end", () => { try { ok(JSON.parse(Buffer.concat(partes).toString("utf8"))); } catch (e) { mal(e); } });
    req.on("error", mal);
  });
}
const json = (res, cod, d) => { res.writeHead(cod, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(d)); };
const esObjeto = x => !!x && typeof x === "object" && !Array.isArray(x);
const texto = (x, max) => typeof x === "string" && x.length > 0 && x.length <= max;

/** ¿La ruta real (ya resuelta) está dentro de catalogo/ o piezas/? */
const dentro = real => RAICES.some(r => { const x = relative(r, real); return x === "" || (!!x && !x.startsWith("..") && !isAbsolute(x)); });
const cacheRanuras = new Map();
function ranuras(glb) {
  try {
    const real = realpathSync(glb); if (!dentro(real)) return [];
    const mt = statSync(real).mtimeMs, c = cacheRanuras.get(real);
    if (c && c.mt === mt) return c.r;
    const fd = openSync(real, "r");
    try {
      const cab = Buffer.alloc(20); readSync(fd, cab, 0, 20, 0);
      if (cab.toString("latin1", 0, 4) !== "glTF") return [];
      const largo = cab.readUInt32LE(12), js = Buffer.alloc(largo); readSync(fd, js, 0, largo, 20);
      const datos = JSON.parse(js.toString("utf8"));
      const r = [...new Set((datos.nodes ?? []).filter(n => "mesh" in n).map(n => n.extras?.slot).filter(x => x != null))].sort();
      cacheRanuras.set(real, { mt, r }); return r;
    } finally { closeSync(fd); }
  } catch { return []; }
}
let indiceGuardado = null;
function indice() {
  if (indiceGuardado) return indiceGuardado;
  const fuera = [], base = join(PRIVADOS, "catalogo");
  if (existsSync(base)) for (const pid of readdirSync(base).sort()) {
    try {
      const ruta = realpathSync(join(base, pid, pid + ".json"));
      if (!dentro(ruta)) continue;
      const ficha = JSON.parse(readFileSync(ruta, "utf8"));
      fuera.push({ id: pid, ruta: `catalogo/${pid}/`, prueba: false, ficha, ranuras: ranuras(join(base, pid, String(ficha.glb ?? ""))) });
    } catch { /* sin ficha válida */ }
  }
  return (indiceGuardado = { version: 1, personajes: fuera });
}

// Supabase local (tools/fiesta/supabase-local.mjs): los aparatos lo alcanzan por /supabase/ en este mismo puerto, así no
// hace falta abrir el 54321 en el firewall ni lidiar con CORS. La laptop lo reenvía a 127.0.0.1:54321 (HTTP y Realtime).
const SUPABASE = { host: "127.0.0.1", port: 54321 };
const PREFIJO_SB = "/supabase";
function reenviarSupabase(req, res) {
  const destino = pedirHttp({ ...SUPABASE, method: req.method, path: (req.url ?? "/").slice(PREFIJO_SB.length) || "/", headers: { ...req.headers, host: `${SUPABASE.host}:${SUPABASE.port}` } }, r => {
    res.writeHead(r.statusCode ?? 502, r.headers); r.pipe(res);
  });
  destino.on("error", () => { if (!res.headersSent) json(res, 502, { ok: false, error: "Supabase local apagado" }); else res.end(); });
  req.pipe(destino);
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://fiesta");
  if (url.pathname === PREFIJO_SB || url.pathname.startsWith(PREFIJO_SB + "/")) return reenviarSupabase(req, res);
  try {
    if (url.pathname === "/fiesta/eventos" && req.method === "GET") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write(`retry: 1500\nevent: estado\ndata: ${JSON.stringify({ ver, todo })}\n\n`);
      clientes.add(res);
      req.on("close", () => clientes.delete(res));
      return;
    }
    if (url.pathname === "/fiesta/cambiar" && req.method === "POST") {
      const c = await leerCuerpo(req);
      if (!esObjeto(c) || typeof c.base !== "number" || !esObjeto(c.todo) || !texto(c.de, 40) || typeof c.seq !== "number") return json(res, 400, { ok: false });
      if (c.base !== ver) return json(res, 200, { ok: false, ver, todo });
      ver += 1; todo = c.todo; guardar();
      mandar("estado", { ver, todo, de: c.de, seq: c.seq });
      return json(res, 200, { ok: true, ver });
    }
    if (url.pathname === "/fiesta/difusion" && req.method === "POST") {
      const c = await leerCuerpo(req);
      if (!esObjeto(c) || !texto(c.n, 120) || !texto(c.e, 40) || !texto(c.de, 60)) return json(res, 400, { ok: false });
      mandar("dif", { n: c.n, e: c.e, d: esObjeto(c.d) ? c.d : {}, de: c.de });
      return json(res, 200, { ok: true });
    }
    if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { ok: false });
    if (url.pathname === "/privados-fiesta/indice.json") return json(res, 200, indice());
    if (url.pathname.startsWith("/privados-fiesta/")) {
      let real;
      try { real = realpathSync(join(PRIVADOS, decodeURIComponent(url.pathname.slice("/privados-fiesta/".length)))); } catch { real = null; }
      if (!real || !dentro(real) || !statSync(real).isFile()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": TIPOS[extname(real).toLowerCase()] ?? "application/octet-stream", "cache-control": "public, max-age=86400" });
      if (req.method === "HEAD") return res.end();
      return res.end(readFileSync(real));
    }
    // Archivos de la app.
    let ruta = decodeURIComponent(url.pathname);
    if (ruta.endsWith("/")) ruta += "index.html";
    const archivo = normalize(join(SITIO, ruta));
    if (!archivo.startsWith(SITIO)) return json(res, 403, { ok: false });
    if (!existsSync(archivo) || !statSync(archivo).isFile()) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); return res.end("No existe"); }
    const ext = extname(archivo).toLowerCase();
    res.writeHead(200, { "content-type": TIPOS[ext] ?? "application/octet-stream", "cache-control": ext === ".html" ? "no-store" : "public, max-age=3600" });
    if (req.method === "HEAD") return res.end();
    res.end(readFileSync(archivo));
  } catch (e) {
    console.error(req.method, url.pathname, e.message);
    if (!res.headersSent) json(res, 400, { ok: false });
  }
});

// Realtime de Supabase (WebSocket): se reenvía la conexión tal cual.
servidor.on("upgrade", (req, socket, cabeza) => {
  if (!(req.url ?? "").startsWith(PREFIJO_SB + "/")) return socket.destroy();
  const destino = connect(SUPABASE.port, SUPABASE.host, () => {
    const lineas = [`${req.method} ${(req.url ?? "/").slice(PREFIJO_SB.length)} HTTP/${req.httpVersion}`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) lineas.push(`${req.rawHeaders[i]}: ${/^host$/i.test(req.rawHeaders[i]) ? `${SUPABASE.host}:${SUPABASE.port}` : req.rawHeaders[i + 1]}`);
    destino.write(lineas.join("\r\n") + "\r\n\r\n");
    if (cabeza?.length) destino.write(cabeza);
    destino.pipe(socket); socket.pipe(destino);
  });
  destino.on("error", () => socket.destroy()); socket.on("error", () => destino.destroy());
});

servidor.listen(PUERTO, "0.0.0.0", () => {
  const ips = Object.values(networkInterfaces()).flat().filter(i => i && i.family === "IPv4" && !i.internal).map(i => i.address);
  console.log("\n  ALV · Modo Fiesta (sin internet)\n");
  const n = indice().personajes.length;
  console.log(n ? `  Personajes: ${n} (de ${PRIVADOS})` : `  Sin personajes: no encontré ${join(PRIVADOS, "catalogo")}. Usa --personajes "ruta".`);
  const sb = connect(SUPABASE.port, SUPABASE.host);
  sb.on("connect", () => { console.log("  Supabase local: encendido (cuentas, XP y tienda)."); sb.destroy(); });
  sb.on("error", () => console.log("  Supabase local: apagado. Sin él no entran las cuentas (npm run fiesta:supabase)."));
  if (!ips.length) console.log("  No hay red. Conecta la laptop al router o al hotspot y vuelve a correr esto.");
  for (const ip of ips) console.log(`  Abre en la laptop y en los celulares:  http://${ip}:${PUERTO}/`);
  console.log("\n  Deja esta ventana abierta durante la fiesta. Para cerrar: Ctrl+C.\n");
});
