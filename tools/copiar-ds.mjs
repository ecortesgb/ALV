// Copia el Design System aprobado («ALV Cine Cómic Nocturno», Maestro v1.16) dentro de src/ds/.
// Uso: node tools/copiar-ds.mjs [carpeta alv2]
// Los valores no se escriben a mano: salen de la fuente aprobada, que vive fuera del repo
// (alv2/fase3-design-system/project/tokens.json y components/bundle.css; los iconos, de alv2/fase2.html).
// Escribe src/ds/tokens.css, src/ds/componentes.css y src/ds/iconos.ts. No los edites: vuelve a correr esto.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raizApp = resolve(aqui, "..");
const alv2 = resolve(process.argv[2] ?? join(raizApp, "..", "alv2"));
const ds = join(alv2, "fase3-design-system", "project");
const destino = join(raizApp, "src", "ds");

const fTokens = join(ds, "tokens.json"), fCss = join(ds, "components", "bundle.css"), fIconos = join(alv2, "fase2.html");
for (const f of [fTokens, fCss, fIconos]) if (!existsSync(f)) { console.error(`No encuentro ${f}`); process.exit(1); }
mkdirSync(destino, { recursive: true });

const AVISO = "Generado por tools/copiar-ds.mjs desde la fuente aprobada del Design System. No editar a mano.";

/* ---------- tokens.css ---------- */
// Van dentro de .D (la raíz del Design System) y no en :root, para no chocar con los estilos de hoy.
const t = JSON.parse(readFileSync(fTokens, "utf8"));
const lineas = [];
const grupo = (titulo, tokens) => { lineas.push(`  /* ${titulo} */`); for (const k of tokens) lineas.push(`  --${k.name}: ${k.value};`); };
grupo("Color", t.color.tokens);
lineas.push("  /* Letra */");
lineas.push(`  --letra-display: ${t.type.families.display};`);
lineas.push(`  --letra-cuerpo: ${t.type.families.body};`);
lineas.push(`  --letra-sfx: ${t.type.families.sfx};`);
for (const g of t.type.groups) for (const s of g.styles) {
  const alto = typeof s.lineHeight === "number" ? s.lineHeight : s.lineHeight;
  lineas.push(`  --${s.name}: ${s.fontStyle === "italic" ? "italic " : ""}${s.fontWeight} ${s.fontSize}/${alto} var(--letra-${g.family === "body" ? "cuerpo" : g.family});`);
}
grupo("Espacios", t.spacing.tokens);
grupo("Radios", t.radius.tokens);
grupo("Sombras", t.shadow.tokens);
grupo("Inclinación", t.inclinacion.tokens);
grupo("Tiempos", t.tiempo.tokens);
writeFileSync(join(destino, "tokens.css"), `/* ${AVISO} */\n/* ${t.name} · versión ${t.version} */\n.D {\n${lineas.join("\n")}\n}\n`);

/* ---------- componentes.css ---------- */
writeFileSync(join(destino, "componentes.css"), readFileSync(fCss, "utf8").replace(/^(@import[^\n]*\n)?/, m => `${m}/* ${AVISO} */\n`));

/* ---------- iconos.ts ---------- */
const html = readFileSync(fIconos, "utf8");
const m = html.match(/const ICONOS = \{([\s\S]*?)\n\};/);
if (!m) { console.error("No encuentro ICONOS en fase2.html"); process.exit(1); }
const iconos = Object.fromEntries([...m[1].matchAll(/^\s*([a-z]+):'([^']+)'/gm)].map(x => [x[1], x[2]]));
writeFileSync(join(destino, "iconos.ts"),
  `// ${AVISO}\n// Trazos de 24×24 de los iconos del Design System.\nexport const ICONOS = ${JSON.stringify(iconos, null, 2)} as const;\n\nexport type IconoId = keyof typeof ICONOS;\n`);

console.log(`ok: ${t.color.tokens.length} colores, ${Object.keys(iconos).length} iconos → src/ds/`);
