// Genera las miniaturas de piezas del personalizador (se corre a mano, una vez, cuando cambian las piezas).
// Uso: node tools/miniaturas/servidor.mjs   y abrir http://localhost:4190/gen/  (la página hace todo y avisa al terminar)
// Sirve public/ en / y esta carpeta en /gen/. Solo acepta guardar en public/arte/piezas/*.webp y en
// src/content/catalogo-figura.json. Solo escucha en 127.0.0.1.
import { createServer } from "node:http";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "..", "..");
const publico = join(raiz, "public");
const destino = join(publico, "arte", "piezas");
const catalogo = join(raiz, "src", "content", "catalogo-figura.json");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".css": "text/css" };

function dentro(base, ruta) { const p = normalize(join(base, ruta)); return p.startsWith(base) ? p : null; }
const leerCuerpo = req => new Promise((ok, mal) => { const t = []; req.on("data", c => t.push(c)); req.on("end", () => ok(Buffer.concat(t).toString("utf8"))); req.on("error", mal); });

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "POST" && url.pathname === "/guardar") {
      const id = url.searchParams.get("id") ?? "";
      if (!/^[a-z0-9-]{1,40}$/.test(id)) { res.writeHead(400).end("id"); return; }
      const datos = await leerCuerpo(req);
      const m = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(datos);
      if (!m) { res.writeHead(400).end("imagen"); return; }
      mkdirSync(destino, { recursive: true });
      writeFileSync(join(destino, id + ".webp"), Buffer.from(m[1], "base64"));
      res.writeHead(200).end("ok"); return;
    }
    if (req.method === "POST" && url.pathname === "/catalogo") {
      const json = JSON.parse(await leerCuerpo(req));
      writeFileSync(catalogo, JSON.stringify(json, null, 1) + "\n");
      console.log("Catálogo guardado en src/content/catalogo-figura.json");
      res.writeHead(200).end("ok"); return;
    }
    const enGen = url.pathname.startsWith("/gen/");
    let p = enGen ? dentro(aqui, url.pathname.slice(5) || "index.html") : dentro(publico, decodeURIComponent(url.pathname));
    if (p && statSync(p, { throwIfNoEntry: false })?.isDirectory()) p = join(p, "index.html");
    if (!p || !statSync(p, { throwIfNoEntry: false })) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": TIPOS[extname(p)] ?? "application/octet-stream" }).end(readFileSync(p));
  } catch (e) { console.error(e); res.writeHead(500).end(); }
}).listen(4190, "127.0.0.1", () => console.log("Miniaturas: http://localhost:4190/gen/"));
