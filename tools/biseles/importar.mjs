// Fase B del estilo cine: convierte los OBJ biselados por Blender al formato compacto que carga la escena
// (tools/minifig/piezas-biseladas.js → window.LDRAW_BISELADO). Mismo sistema que ldraw_piezas.js: LDU × 64 en Int16,
// más normales en Int8 (Blender las calcula para que las caras planas sigan planas).
// Uso: node tools/biseles/importar.mjs <carpeta con los .obj biselados>
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const entrada = resolve(process.argv[2] ?? join(aqui, "obj-bisel"));
const destino = join(aqui, "..", "minifig", "piezas-biseladas.js");
const original = (() => { const w = {}; new Function("window", readFileSync(join(aqui, "..", "..", "public", "minifig", "biblioteca", "geometria", "ldraw_piezas.js"), "utf8"))(w); return w.LDRAW_PIEZAS; })();

const salida = {};
for (const f of readdirSync(entrada).filter(f => f.endsWith(".obj")).sort()) {
  const id = f.slice(0, -4), V = [], N = [], claves = new Map(), pos = [], nor = [], idx = [];
  for (const l of readFileSync(join(entrada, f), "utf8").split(/\r?\n/)) {
    const p = l.trim().split(/\s+/);
    if (p[0] === "v") V.push(p.slice(1, 4).map(Number));
    else if (p[0] === "vn") N.push(p.slice(1, 4).map(Number));
    else if (p[0] === "f") {
      if (p.length !== 4) throw new Error(`${f}: cara no triangular`);
      for (const r of p.slice(1)) {
        const [vi, , ni] = r.split("/").map(x => (x ? Number(x) - 1 : -1));
        // Un vértice por posición y normal ya cuantizada (Blender repite normales casi iguales en cada esquina).
        const n0 = ni >= 0 ? N[ni] : [0, 1, 0], l = Math.hypot(...n0) || 1, nq = n0.map(c => Math.round((c / l) * 127));
        const k = vi + "/" + nq.join(",");
        let i = claves.get(k);
        if (i === undefined) {
          i = pos.length / 3; claves.set(k, i);
          for (const c of V[vi]) { const q = Math.round(c * 64); if (q < -32768 || q > 32767) throw new Error(`${f}: fuera de rango`); pos.push(q); }
          nor.push(...nq);
        }
        idx.push(i);
      }
    }
  }
  const nv = pos.length / 3, i32 = nv > 65535;
  const col = original[id].g.length === 1 ? original[id].g[0][2] : "16";
  const b64 = a => Buffer.from(a.buffer).toString("base64");
  salida[id] = { p: b64(Int16Array.from(pos)), n: b64(Int8Array.from(nor)), i: b64(i32 ? Uint32Array.from(idx) : Uint16Array.from(idx)), i32, g: [[0, idx.length, col]] };
  console.log(id, "vértices", nv, "triángulos", idx.length / 3);
}
const txt = "// Piezas base de la minifigura con biseles (fase B del estilo cine, ALV_PLAN_LEGO_CINE.md).\n" +
  "// Geometría de LDraw.org (CC BY 4.0) biselada con tools/biseles/biselar.py; no editar a mano: regenerar con tools/biseles/.\n" +
  "window.LDRAW_BISELADO=" + JSON.stringify(salida) + ";\n";
writeFileSync(destino, txt);
console.log("Escrito", destino, (txt.length / 1024).toFixed(0) + " KB");
