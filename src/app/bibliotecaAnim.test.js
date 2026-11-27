// Biblioteca de animaciones (ALV_PLAN_ANIMATION_LIBRARY.md, etapa 1): registro en GestosALV, carga validada y
// el parámetro que la activa. Las tablas reales son privadas: aquí se usa una biblioteca falsa.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { paramBiblioteca } from "./preferencias";
function motor(extra = {}) {
    const ctx = { Math, Number, String, Object, Array, Set, Float32Array, URL, URLSearchParams, Promise, console, ...extra };
    ctx.self = ctx;
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(readFileSync("public/minifig/nucleo/momentos.js", "utf8"), ctx);
    vm.runInContext(readFileSync("tools/minifig/gestos.js", "utf8"), ctx);
    return { M: ctx.Momentos, G: ctx.GestosALV, ctx };
}
const CLAVES = ["cabeza", "brazoObj", "brazoLib", "manoObj", "manoLib", "piernaIzq", "piernaDer", "y", "z", "rotX", "rotY"];
const tabla = (n, y = 0.5) => ({ fps: 30, cuadros: n, articulaciones: Object.fromEntries(CLAVES.map(k => [k, Array.from({ length: n }, (_, i) => (k === "y" ? y : k === "brazoObj" ? -i / (n - 1) : 0))])) });
describe("gestos.js: registrar", () => {
    it("acepta solo «lib:<id>» con pose, duración y tipo válidos", () => {
        const { G, M } = motor();
        const pose = () => ({ brazoObj: -1 });
        expect(G.registrar("lib:gesture_wave", { tipo: "punto", dur: 2, pose })).toBe(true);
        expect(M.info("lib:gesture_wave")).toMatchObject({ tipo: "punto", dur: 2, bucle: false });
        expect(G.registrar("respirar", { tipo: "espera", dur: 2, pose })).toBe(false); // no pisa a Minifig Studio
        expect(G.registrar("baile", { tipo: "especial", dur: 2, pose })).toBe(false); // ni a ALV
        expect(G.registrar("lib:Mala-Id", { tipo: "punto", dur: 2, pose })).toBe(false);
        expect(G.registrar("lib:x", { tipo: "otro", dur: 2, pose })).toBe(false);
        expect(G.registrar("lib:x", { tipo: "punto", dur: 0, pose })).toBe(false);
        expect(G.registrar("lib:x", { tipo: "punto", dur: 2 })).toBe(false);
        expect(M.info("respirar")?.tipo).toBe("espera");
    });
    it("en bucle el tiempo da la vuelta; sin bucle se queda en el final", () => {
        const { G, M } = motor();
        G.registrar("lib:a", { tipo: "espera", dur: 2, bucle: true, pose: (t) => ({ cabeza: t }) });
        G.registrar("lib:b", { tipo: "punto", dur: 2, pose: (t) => ({ cabeza: t }) });
        expect(M.info("lib:a")?.bucle).toBe(true);
        expect(M.pose("lib:a", 2.5).cabeza).toBeCloseTo(0.5);
        expect(M.pose("lib:b", 2.5).cabeza).toBeCloseTo(2);
        for (const v of Object.values(M.pose("lib:a", 7)))
            expect(Number.isFinite(v)).toBe(true);
    });
});
describe("biblioteca-anim.js", () => {
    async function cargar(param, archivos) {
        const pedidos = [];
        const fetch = (u) => {
            pedidos.push(u);
            const nombre = u.replace("http://localhost:4192/", "");
            return Promise.resolve(nombre in archivos ? { ok: true, json: () => Promise.resolve(archivos[nombre]) } : { ok: false, status: 404 });
        };
        const m = motor({ fetch, location: { search: param ? "?biblioteca=" + encodeURIComponent(param) : "", href: "http://localhost:4187/minifig/escena.html" } });
        vm.runInContext(readFileSync("tools/minifig/biblioteca-anim.js", "utf8"), m.ctx);
        const estado = m.ctx.BibliotecaALV;
        for (let i = 0; i < 50 && !estado.listo; i++)
            await new Promise(r => setTimeout(r, 5));
        return { ...m, estado, pedidos };
    }
    const biblio = {
        animaciones: {
            gesture_wave: { compatibilidad: "A", categoria: "humor", loop: false, nombre: "Saludo", tabla: "tablas-alv/gesture_wave.json" },
            personality_idle: { compatibilidad: "A", categoria: "reposo", loop: true, nombre: "Reposo", tabla: "tablas-alv/personality_idle.json" },
            celebration_cheer: { compatibilidad: "B", categoria: "celebracion", loop: true, nombre: "Porra", tabla: "tablas-alv/celebration_cheer.json" },
            rota: { compatibilidad: "A", categoria: "humor", loop: false, nombre: "Rota", tabla: "tablas-alv/rota.json" },
        },
    };
    const archivos = {
        "animation-library-v1.json": biblio,
        "tablas-alv/gesture_wave.json": tabla(31),
        "tablas-alv/personality_idle.json": tabla(61),
        "tablas-alv/celebration_cheer.json": tabla(31),
        "tablas-alv/rota.json": { fps: 30, cuadros: 3, articulaciones: { cabeza: [0, "x", 0] } },
    };
    it("sin parámetro no pide nada ni registra nada", async () => {
        const { estado, pedidos } = await cargar(null, archivos);
        expect(pedidos).toEqual([]);
        expect(estado.registradas).toEqual([]);
    });
    it("registra solo las A bien formadas, con su tipo, duración, bucle y altura escalada", async () => {
        const { estado, M } = await cargar("http://localhost:4192/", archivos);
        expect(estado.registradas.sort()).toEqual(["lib:gesture_wave", "lib:personality_idle"]);
        expect(M.info("lib:celebration_cheer")).toBeNull(); // B: segunda fase
        expect(M.info("lib:rota")).toBeNull(); // tabla mal formada
        expect(M.info("lib:gesture_wave")).toMatchObject({ tipo: "punto", dur: 1, bucle: false });
        expect(M.info("lib:personality_idle")).toMatchObject({ tipo: "espera", dur: 2, bucle: true });
        const p = M.pose("lib:gesture_wave", 0.5);
        expect(p.brazoObj).toBeCloseTo(-0.5);
        expect(p.y).toBeCloseTo(0.5 * 1.591 / 1.701, 4);
    });
    it("una dirección que no es http(s) se ignora", async () => {
        const { estado, pedidos } = await cargar("javascript:alert(1)", archivos);
        expect(pedidos).toEqual([]);
        expect(estado.registradas).toEqual([]);
    });
});
describe("preferencias: paramBiblioteca", () => {
    it("solo con una dirección http(s) válida", () => {
        expect(paramBiblioteca(undefined)).toBe("");
        expect(paramBiblioteca("")).toBe("");
        expect(paramBiblioteca("javascript:alert(1)")).toBe("");
        expect(paramBiblioteca('http://x/"><script>')).toBe("");
        expect(paramBiblioteca("http://localhost:4192/")).toBe("&biblioteca=http%3A%2F%2Flocalhost%3A4192%2F");
    });
});
