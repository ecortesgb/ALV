// Candados de la zona del sistema de personajes nuevo (src/personajes/LEEME.md, fase 1 del plan).
// 1) La app todavía no la usa. 2) No depende del sistema viejo. 3) Ningún modelo 3D sin licencia pública en el repo.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import permitidos from "./archivos-3d.json";
const RAIZ = process.cwd();
const IGNORAR = new Set(["node_modules", "dist", ".git"]);
const rel = (p) => relative(RAIZ, p).split(sep).join("/");
function archivos(dir, fuera = []) {
    if (!existsSync(dir))
        return fuera;
    for (const n of readdirSync(dir)) {
        if (IGNORAR.has(n))
            continue;
        const r = join(dir, n);
        if (statSync(r).isDirectory())
            archivos(r, fuera);
        else
            fuera.push(r);
    }
    return fuera;
}
const CODIGO = /\.(ts|tsx|js|mjs|cjs|html)$/;
const importaciones = (texto) => [...texto.matchAll(/(?:import\s[^"'`]*?from\s*|import\s*\(\s*|import\s+|require\s*\(\s*|src\s*=\s*)["'`]([^"'`]+)["'`]/g)].map(m => m[1]);
const ZONA = ["src/personajes", "tools/personajes", "public/personajes"].map(d => join(RAIZ, d));
const enZona = (p) => ZONA.some(z => p === z || p.startsWith(z + sep));
describe("zona del sistema de personajes nuevo", () => {
    // Fase 5 (Codex, encargo 2026-11-26-fase5-r1, ajuste 8): la app solo entra por los puntos de integración acordados —
    // `personajes/integracion` (bandera, fuente, puente v2↔v3, resolución), la pantalla «Mi personaje» en carga diferida y,
    // en la escena vieja, los scripts del motor nuevo. Nada más de la zona se importa desde fuera.
    const PUNTOS = [/personajes\/integracion(\.ts)?$/, /personajes\/MiPersonaje(\.tsx)?$/, /personajes\/(motor-personajes|logicas)\.js$/];
    it("fuera de la zona solo se usan los puntos de integración de la fase 5", () => {
        const malos = archivos(join(RAIZ, "src")).concat(archivos(join(RAIZ, "tools")))
            .filter(p => CODIGO.test(p) && !enZona(p))
            .flatMap(p => importaciones(readFileSync(p, "utf8"))
            .filter(i => /(^|\/)personajes(\/|$)/.test(i) && !/content\/personajes?\b/.test(i) && !/audio-personajes/.test(i) && !PUNTOS.some(r => r.test(i)))
            .map(i => `${rel(p)} → ${i}`));
        expect(malos).toEqual([]);
    });
    it("la zona no depende del sistema viejo", () => {
        const VIEJO = [/figura3d/, /editarFigura/, /cambiosFigura/, /equiparPieza/, /content\/personaje(\.ts)?$/, /\/sagas(\.ts)?$/,
            /catalogo-figura/, /trajes-figura/, /minifig-core/, /(^|\/)minifig\//, /05-estampados/, /07-construccion/];
        const malos = ZONA.flatMap(z => archivos(z)).filter(p => CODIGO.test(p))
            .flatMap(p => importaciones(readFileSync(p, "utf8")).filter(i => VIEJO.some(r => r.test(i))).map(i => `${rel(p)} → ${i}`));
        expect(malos).toEqual([]);
    });
    it("ningún módulo de la zona se llama igual que otro salvo mayúsculas (en Windows chocan: Galeria.tsx y galeria.ts)", () => {
        const modulos = ZONA.flatMap(z => archivos(z)).filter(p => /\.(ts|tsx|js)$/.test(p) && !/\.test\.ts$/.test(p))
            .map(p => rel(p).replace(/\.(ts|tsx|js)$/, ""));
        const vistos = new Map(), choques = [];
        for (const m of modulos) {
            const k = m.toLowerCase();
            if (vistos.has(k) && vistos.get(k) !== m)
                choques.push(`${vistos.get(k)} / ${m}`);
            vistos.set(k, m);
        }
        expect(choques).toEqual([]);
    });
    it("ningún modelo 3D en el repo sin origen y licencia pública", () => {
        const MODELO = /\.(glb|gltf|fbx|blend|blend1|obj|dae|ktx2|ghg|gsc)$/i;
        const lista = new Map(permitidos.archivos.map((a) => [a.ruta, a]));
        const encontrados = archivos(RAIZ).filter(p => MODELO.test(p)).map(rel);
        expect(encontrados.filter(r => !lista.has(r))).toEqual([]);
    });
    it("la lista de modelos permitidos solo acepta licencias públicas", () => {
        const malas = permitidos.archivos
            .filter(a => !a.ruta || !a.origen || !permitidos.licencias.includes(a.licencia ?? "") || /juego|figure.?forge|tt ?games|privad/i.test(a.origen));
        expect(malas).toEqual([]);
    });
});
