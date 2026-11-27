// El núcleo del motor (nucleo.ts): da lo mismo que el motor anterior y no depende de React ni del navegador.
// La referencia `nucleo.golden.json` se generó con roles/pantalla/motor.ts ANTES de extraer el núcleo (16 nov 2026),
// incluida una copia exacta de la lógica de reloj, espera y revelación automática que estaba en línea en useMotor.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JUEGOS } from "../content/catalogo";
import { resultados } from "./partida";
import * as nucleo from "./nucleo";
import * as motorNavegador from "../roles/pantalla/motor";
import { A, B, C, D, CFG, PARTIDA, filasEscenario } from "./nucleo.escenario";
const aqui = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(join(aqui, "nucleo.golden.json"), "utf8"));
/** Igual que guardarlo en JSON (así se comparan `undefined` y propiedades vacías como en la referencia). */
const json = (x) => JSON.parse(JSON.stringify(x));
describe("equivalencia con el motor anterior: El impostor, 4 jugadores, semilla 777, 5 rondas", () => {
    const filas = filasEscenario();
    it("las filas del escenario son las mismas que en la referencia", () => {
        expect(json(filas)).toEqual(golden.filas);
        expect(golden.pasos.length).toBe(filas.length);
    });
    it("en cada paso: mismo estado, misma vista pública, mismas vistas por jugador y mismo reloj lógico", () => {
        for (const p of golden.pasos) {
            const e = nucleo.reconstruir(filas.slice(0, p.k), A);
            const t = nucleo.relojLogico(e);
            expect(json(e), `estado en el paso ${p.k}`).toEqual(p.estado);
            expect(json(nucleo.paraPublicar(e, e.fase === "contestando" ? 1000 : null, t.hayEspera ? 2000 : null)), `publicado en el paso ${p.k}`).toEqual(p.publicar);
            expect({ ...t, autoRev: t.listos ? nucleo.idAutoRevelar(PARTIDA, e) : null }, `reloj en el paso ${p.k}`).toEqual(p.tiempos);
        }
    });
    it("el final es el mismo: 5 rondas reveladas, terminada, mismo ranking y misma XP", () => {
        const e = nucleo.reconstruir(filas, A);
        expect(e.fase).toBe("terminada");
        expect(e.bitacora.filter(b => b.tipo === "revelada").length).toBe(5);
        expect(json(resultados(e))).toEqual(golden.resultados);
    });
    it("el motor del navegador usa el mismo núcleo (reexporta, no copia)", () => {
        expect(motorNavegador.reconstruir).toBe(nucleo.reconstruir);
        expect(motorNavegador.aAccion).toBe(nucleo.aAccion);
        expect(motorNavegador.paraPublicar).toBe(nucleo.paraPublicar);
        expect(motorNavegador.conParejas).toBe(nucleo.conParejas);
        expect(motorNavegador.SUSPENSO_MS).toBe(2000);
        expect(motorNavegador.ESPERA_MS).toBe(20000);
    });
});
describe("equivalencia del arranque en cada juego con motor (semilla 4242, 4 jugadores, 5 rondas)", () => {
    const cfg4 = { ...CFG, jugadores: [A, B, C, D].map((id, i) => ({ id, nombre: `J${i}` })) };
    // Juegos agregados después de la referencia: no existían en el motor anterior, así que no tienen con qué compararse.
    const NUEVOS = ["fisico"];
    const conMotor = JUEGOS.filter(j => j.motor && !NUEVOS.includes(j.id));
    it("son los mismos juegos que en la referencia (más los nuevos declarados)", () => {
        expect(conMotor.map(j => j.id).sort()).toEqual(Object.keys(golden.juegos).sort());
        for (const id of NUEVOS)
            expect(JUEGOS.find(j => j.id === id)?.motor, id).toBeTruthy();
    });
    for (const j of conMotor) {
        it(j.id, () => {
            const e = nucleo.reconstruir([{ id: "arr", jugador: A, tipo: "control", datos: { que: "arranque", semilla: 4242, juego: j.id, rondas: 5, cfg: cfg4 }, creada: "2026-11-16T00:00:00.000Z" }], A);
            expect(json(e ? { estado: e, publicar: nucleo.paraPublicar(e, null) } : null)).toEqual(golden.juegos[j.id]);
        });
    }
});
describe("armarArranque da la misma configuración que antes daba iniciarPartida", () => {
    it("límites de rondas e intensidad, parejas y banderas", () => {
        const m = [{ id: A, nombre: "Ana" }, { id: B, nombre: "Beto" }, { id: C, nombre: "Caro" }, { id: D, nombre: "Dani" }];
        // El impostor ya no sirve aquí: desde v1.44 arranca con eliminación (lo prueba impostor.test.ts).
        const a = nucleo.armarArranque(m, "mas-probable", 99, 3, 5);
        const def = JUEGOS.find(j => j.id === "mas-probable");
        expect(a).toEqual({
            semilla: 5, juego: "mas-probable", rondas: 20,
            cfg: { jugadores: nucleo.conParejas(m), lugar: "cualquiera", intensidad: Math.max(def.intensidadMin, Math.min(def.intensidadMax, 3)), dificultad: 2, adulto: true, drunk: true, turno: "orden" },
        });
        expect(nucleo.armarArranque(m, "mas-probable", 1, 1, 5).rondas).toBe(3);
        expect(nucleo.armarArranque(m, "no-existe", 5, 1, 5)).toBeNull();
        expect(nucleo.armarArranque(m.slice(0, 1), "impostor", 5, 1, 5)).toBeNull();
    });
});
// ---------- Pureza: el núcleo y todo lo que importa no tocan React, el navegador ni Supabase ----------
const IMPURO = [
    ["react", /from\s+["'](react|react-dom)(\/[^"']*)?["']/],
    ["servicios", /from\s+["'][^"']*servicios[^"']*["']/],
    ["supabase", /supabase/],
    ["roles o pantallas", /from\s+["'][^"']*(roles|pantallas|juegos|app|ds)\/[^"']*["']/],
    ["window", /\bwindow\b/],
    ["document", /\bdocument\b/],
    ["localStorage", /\b(localStorage|sessionStorage|indexedDB)\b/],
    ["navigator", /\bnavigator\b/],
    ["location", /\blocation\b/],
    ["timers", /\b(setTimeout|setInterval|clearTimeout|clearInterval|requestAnimationFrame|queueMicrotask)\b/],
    ["BroadcastChannel", /\bBroadcastChannel\b/],
    ["fetch", /\bfetch\(/],
    ["import.meta", /import\.meta/],
    ["hora o azar del aparato", /\b(Date\.now|Math\.random|crypto\.)/],
];
const sinComentarios = (c) => c.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
/** Recorre los imports relativos desde nucleo.ts (sin pruebas) y devuelve cada archivo con su código. */
function grafo(inicio) {
    const vistos = new Map();
    const pendientes = [inicio];
    while (pendientes.length) {
        const f = pendientes.pop();
        if (vistos.has(f))
            continue;
        const codigo = readFileSync(f, "utf8");
        vistos.set(f, codigo);
        for (const m of sinComentarios(codigo).matchAll(/(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/g)) {
            const ruta = m[1];
            if (!ruta.startsWith(".")) {
                vistos.set(`externo:${ruta}`, "");
                continue;
            }
            if (ruta.endsWith(".json"))
                continue;
            const base = resolve(dirname(f), ruta);
            pendientes.push(base.endsWith(".ts") ? base : existsSync(`${base}.ts`) ? `${base}.ts` : join(base, "index.ts"));
        }
    }
    return vistos;
}
describe("el núcleo es puro", () => {
    const archivos = grafo(join(aqui, "nucleo.ts"));
    it("recorre el núcleo, el motor de reglas y el contenido", () => {
        const nombres = [...archivos.keys()].map(f => f.replace(/\\/g, "/"));
        for (const esperado of ["engine/nucleo.ts", "engine/partida.ts", "engine/vistas.ts", "engine/azar.ts", "content/index.ts", "content/catalogo.ts"]) {
            expect(nombres.some(n => n.endsWith(esperado)), esperado).toBe(true);
        }
    });
    it("no importa nada de npm (ni react, ni supabase)", () => {
        expect([...archivos.keys()].filter(f => f.startsWith("externo:"))).toEqual([]);
    });
    for (const [archivo, codigo] of [...archivos].filter(([f]) => !f.startsWith("externo:"))) {
        it(`${archivo.replace(/\\/g, "/").replace(/^.*\/src\//, "src/")} no usa React ni APIs del navegador`, () => {
            const limpio = sinComentarios(codigo);
            expect(IMPURO.filter(([, re]) => re.test(limpio)).map(([n]) => n)).toEqual([]);
        });
    }
    it("el detector sí encuentra lo prohibido", () => {
        const malo = `import { useEffect } from "react";\nconst x = window.localStorage; setTimeout(() => 0); Date.now();`;
        expect(IMPURO.filter(([, re]) => re.test(malo)).map(([n]) => n)).toEqual(["react", "window", "localStorage", "timers", "hora o azar del aparato"]);
    });
    it("el JSON del contenido se importa con atributo (lo pide Deno)", () => {
        expect(readFileSync(join(aqui, "../content/index.ts"), "utf8")).toMatch(/from\s+"\.\/packs\/base\.json"\s+with\s+\{\s*type:\s*"json"\s*\}/);
    });
});
