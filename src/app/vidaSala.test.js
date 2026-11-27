// Vida automática compartida (etapa 3): una sola autoridad (el aparato dueño), red sin duplicados, respaldo y espaciado.
import { afterEach, describe, expect, it } from "vitest";
import { ESPACIADO, azarSembrado, crearDirector } from "./perfiles";
import { alVida, alVidaPropia, aplicarVidaRemota, emitirVidaPropia, nombreVida, reiniciarVida } from "./vidaPerfil";
import { pedirGesto, reiniciarGestos } from "./animaciones";
import { revisarVida } from "../servicios/gestosSala";
afterEach(() => { reiniciarVida(); reiniciarGestos(); });
const accion = (x = {}) => ({ cual: "lib:gesture_wave", lib: "lib:gesture_wave", respaldo: "saludar", prio: 0.5, vel: 1.1, int: 1.05, ...x });
const ev = (x = {}) => ({ jugador: "ana", n: 100, a: "lib:gesture_wave", r: "saludar", vel: 1, int: 1, ...x });
describe("autoridad del dueño", () => {
    it("emitirVidaPropia llega a las escenas de este aparato y a la red, con n creciente", () => {
        const escenas = [], red = [];
        const a = alVida(e => escenas.push(e)), b = alVidaPropia(e => red.push(e));
        const e1 = emitirVidaPropia("ana", accion(), 1_000_000);
        const e2 = emitirVidaPropia("ana", accion({ lib: undefined, cual: "baile", respaldo: "baile" }), 1_000_000);
        a();
        b();
        expect(escenas).toHaveLength(2);
        expect(red).toHaveLength(2);
        expect(e2.n).toBeGreaterThan(e1.n);
        expect(e1).toMatchObject({ a: "lib:gesture_wave", r: "saludar" });
        expect(e2).toMatchObject({ a: "baile", r: "baile" });
    });
    it("si el jugador tiene un gesto sonando, la vida no sale", () => {
        const red = [];
        const b = alVidaPropia(e => red.push(e));
        const ahora = Date.now();
        expect(pedirGesto("ana", "victoria", null, ahora)).toBe(true);
        expect(emitirVidaPropia("ana", accion(), ahora + 500)).toBeNull();
        b();
        expect(red).toHaveLength(0);
    });
});
describe("red: los demás solo reproducen", () => {
    it("descarta repetidos y viejos (mismo n o menor)", () => {
        const vistos = [];
        const a = alVida(e => vistos.push(e.n));
        expect(aplicarVidaRemota(ev({ n: 200 }))).toBe(true);
        expect(aplicarVidaRemota(ev({ n: 200 }))).toBe(false);
        expect(aplicarVidaRemota(ev({ n: 150 }))).toBe(false);
        expect(aplicarVidaRemota(ev({ n: 201 }))).toBe(true);
        expect(aplicarVidaRemota(ev({ jugador: "beto", n: 5 }))).toBe(true); // cada jugador lleva su cuenta
        a();
        expect(vistos).toEqual([200, 201, 5]);
    });
    it("no reproduce vida de un jugador que está haciendo un gesto", () => {
        const ahora = Date.now();
        pedirGesto("ana", "derrota", null, ahora);
        expect(aplicarVidaRemota(ev({ n: Math.floor(ahora / 100) + 5 }), ahora + 300)).toBe(false);
    });
    it("revisarVida: solo miembros, nunca el eco propio, nombres y números válidos", () => {
        const m = new Set(["ana", "beto"]);
        const ok = { j: "ana", n: 10, a: "lib:gesture_wave", r: "saludar", vel: 1.1, int: 0.9, dur: 3 };
        expect(revisarVida(ok, m, "beto")).toEqual({ jugador: "ana", n: 10, a: "lib:gesture_wave", r: "saludar", vel: 1.1, int: 0.9, dur: 3 });
        expect(revisarVida(ok, m, "ana")).toBeNull(); // eco propio
        expect(revisarVida({ ...ok, j: "intruso" }, m, "beto")).toBeNull(); // no es de la sala
        expect(revisarVida({ ...ok, a: "lib:<script>" }, m, "beto")).toBeNull();
        expect(revisarVida({ ...ok, r: "lib:gesture_wave" }, m, "beto")).toBeNull(); // el respaldo nunca es de la biblioteca
        expect(revisarVida({ ...ok, vel: 9 }, m, "beto")).toBeNull();
        expect(revisarVida({ ...ok, int: "1" }, m, "beto")).toBeNull();
        expect(revisarVida({ ...ok, dur: 99 }, m, "beto")).toBeNull();
        expect(revisarVida({ ...ok, n: 1.5 }, m, "beto")).toBeNull();
        const sinDur = revisarVida({ ...ok, dur: undefined }, m, "beto");
        expect(sinDur && "dur" in sinDur).toBe(false);
    });
});
describe("lo que decide el dueño siempre pasa la revisión de la red", () => {
    it("velocidad e intensidad dentro de los topes en los seis perfiles (cómico llegaba a 1.42 y la red lo descartaba)", () => {
        const m = new Set(["ana"]);
        for (const p of ["alegre", "heroico", "comico", "timido", "agresivo", "elegante"]) {
            const d = crearDirector(p, azarSembrado(21), () => true);
            for (let i = 0; i < 400; i++) {
                const a = d.decidir();
                if (!a)
                    continue;
                const v = { j: "ana", n: 10 + i, a: a.lib ?? a.cual, r: a.respaldo, vel: a.vel, int: a.int, ...(a.dur ? { dur: a.dur } : {}) };
                expect(revisarVida(v, m, "beto"), `${p} ${JSON.stringify(v)}`).not.toBeNull();
            }
        }
    });
});
describe("respaldo y espaciado", () => {
    it("cada aparato toca la de la biblioteca si la tiene; si no, el respaldo de ALV", () => {
        expect(nombreVida(ev(), n => n === "lib:gesture_wave")).toBe("lib:gesture_wave");
        expect(nombreVida(ev(), () => false)).toBe("saludar");
        expect(nombreVida(ev({ a: "baile", r: "baile" }), () => false)).toBe("baile");
    });
    it("el director da el id de la biblioteca y el respaldo para la red", () => {
        const d = crearDirector("alegre", azarSembrado(9), () => true);
        for (let i = 0; i < 60; i++) {
            const a = d.decidir();
            if (a) {
                expect(a.respaldo.startsWith("lib:")).toBe(false);
                if (a.cual.startsWith("lib:"))
                    expect(a.lib).toBe(a.cual);
            }
        }
    });
    it("en el lobby actúa más espaciado que en el HUB, y el perfil conserva su orden", () => {
        const porMin = (p, esp) => {
            const d = crearDirector(p, azarSembrado(4), () => true, esp);
            let t = 0, n = 0;
            while (t < 30 * 60000) {
                t += d.espera();
                if (d.decidir())
                    n++;
            }
            return n / 30;
        };
        expect(ESPACIADO.lobby).toBeGreaterThan(ESPACIADO.hub);
        expect(porMin("comico", ESPACIADO.lobby)).toBeLessThan(porMin("comico", ESPACIADO.hub));
        expect(porMin("comico", ESPACIADO.lobby)).toBeGreaterThan(porMin("timido", ESPACIADO.lobby) * 3);
    });
});
