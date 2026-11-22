// Fase B del estilo cine (ALV_PLAN_LEGO_CINE.md): saca las piezas base de la geometría LDraw de la app a OBJ,
// para biselarlas en Blender (tools/biseles/biselar.py). Coordenadas LDraw tal cual (LDU, Y hacia abajo, frente en −Z).
// Uso: node tools/biseles/exportar-obj.mjs <carpeta de salida>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// La cabeza 3626c no va: la escena la arma girando su perfil (cabezaTorno en tools/minifig/escena.js).
export const PIEZAS_BASE = ["973", "3818", "3819", "3820", "3815", "3816", "3817", "41879a"];

const aqui = dirname(fileURLToPath(import.meta.url));
const salida = resolve(process.argv[2] ?? join(aqui, "obj"));
mkdirSync(salida, { recursive: true });

const fuente = readFileSync(join(aqui, "..", "..", "public", "minifig", "biblioteca", "geometria", "ldraw_piezas.js"), "utf8");
const window = {};
new Function("window", fuente)(window);

for (const id of PIEZAS_BASE) {
  const d = window.LDRAW_PIEZAS[id];
  if (!d) { console.error("No existe la pieza", id); process.exit(1); }
  const pb = Buffer.from(d.p, "base64"), ib = Buffer.from(d.i, "base64");
  const P = new Int16Array(pb.buffer, pb.byteOffset, pb.byteLength / 2);
  const I = d.i32 ? new Uint32Array(ib.buffer.slice(ib.byteOffset, ib.byteOffset + ib.byteLength)) : new Uint16Array(ib.buffer.slice(ib.byteOffset, ib.byteOffset + ib.byteLength));
  const L = [`# ${id} · LDraw.org CC BY 4.0 · LDU`, `o p${id}`];
  for (let k = 0; k < P.length / 3; k++) L.push(`v ${P[k * 3] / 64} ${P[k * 3 + 1] / 64} ${P[k * 3 + 2] / 64}`);
  // Grupos por color LDraw: [inicio, cuántos índices, color]
  for (const [st, n, col] of d.g) {
    L.push(`usemtl c${col}`);
    for (let t = st; t < st + n; t += 3) L.push(`f ${I[t] + 1} ${I[t + 1] + 1} ${I[t + 2] + 1}`);
  }
  writeFileSync(join(salida, id + ".obj"), L.join("\n") + "\n");
  console.log(id, "vértices", P.length / 3, "triángulos", I.length / 3, "colores", d.g.map(g => g[2]).join(","));
}
