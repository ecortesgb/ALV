// Perfiles de personalidad (etapa 2): conducta distinta por perfil, reglas de convivencia con apariencia y paquetes.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CON_VIDA, DATOS, PERFILES, PRIORIDAD_VIDA, animPerfil, azarSembrado, crearDirector, esPerfil, perfilDe, perfilEfectivo, ponerPersonalidad, soloApariencia, vidaPermitida, } from "./perfiles";
import { completar, figuraNueva, ponerMomentos, MOMENTOS_NORMALES } from "./editarFigura";
import { huella } from "./figura3d";
import catalogo from "../content/catalogo-figura.json";
const todo = () => true;
function simular(p, minutos = 30, semilla = 11) {
    const d = crearDirector(p, azarSembrado(semilla), todo);
    let t = 0, acciones = 0;
    const vistas = [], vel = [], int = [];
    while (t < minutos * 60000) {
        t += d.espera();
        const a = d.decidir();
        if (a) {
            acciones++;
            vistas.push(a.cual);
            vel.push(a.vel);
            int.push(a.int);
        }
    }
    return { porMin: acciones / minutos, vistas, vel, int };
}
describe("datos de los perfiles", () => {
    it("son seis, con parámetros dentro de rango", () => {
        expect([...PERFILES].sort()).toEqual(["agresivo", "alegre", "comico", "elegante", "heroico", "timido"]);
        for (const p of PERFILES) {
            const d = DATOS[p];
            expect(d.intervalo[0]).toBeGreaterThan(2);
            expect(d.intervalo[1]).toBeGreaterThan(d.intervalo[0]);
            expect(d.actuar).toBeGreaterThan(0);
            expect(d.actuar).toBeLessThanOrEqual(1);
            expect(d.velocidad).toBeGreaterThanOrEqual(0.6);
            expect(d.velocidad).toBeLessThanOrEqual(1.5);
            expect(d.intensidad).toBeGreaterThanOrEqual(0.4);
            expect(d.intensidad).toBeLessThanOrEqual(1.4);
            expect(d.preferencias.length).toBeGreaterThanOrEqual(3);
            // toda opción de la biblioteca tiene respaldo de ALV (si la biblioteca no está, igual se mueve)
            for (const o of d.preferencias)
                expect(o.anim || o.respaldo, p).toBeTruthy();
            expect(d.espera.respaldo).toBeTruthy();
        }
    });
    it("las animaciones de respaldo y de ALV existen en el motor (momentos.js o gestos.js)", () => {
        const motor = readFileSync("public/minifig/nucleo/momentos.js", "utf8") + readFileSync("tools/minifig/gestos.js", "utf8");
        const nombres = new Set(PERFILES.flatMap(p => [DATOS[p].espera.respaldo, ...DATOS[p].preferencias.map(o => o.anim ?? o.respaldo)]));
        nombres.delete("saludar"); // «saludar» lo hace el motor directamente (escena.js)
        for (const n of nombres)
            expect(motor.includes(`"${n}"`), n).toBe(true);
    });
    it("las de la biblioteca son de las 7 A", () => {
        const A = ["personality_idle", "personality_look_around", "personality_restless", "celebration_arms_up", "celebration_joyful", "gesture_wave", "reaction_confused"].map(x => "lib:" + x);
        for (const p of PERFILES)
            for (const n of [DATOS[p].espera.lib, ...DATOS[p].preferencias.map(o => o.lib)])
                if (n)
                    expect(A, `${p}: ${n}`).toContain(n);
    });
});
describe("director: conducta distinta por perfil", () => {
    const S = Object.fromEntries(PERFILES.map(p => [p, simular(p)]));
    it("frecuencia: cómico > alegre > agresivo > heroico > elegante > tímido", () => {
        const orden = [...PERFILES].sort((a, b) => S[b].porMin - S[a].porMin);
        expect(orden).toEqual(["comico", "alegre", "agresivo", "heroico", "elegante", "timido"]);
        expect(S.comico.porMin).toBeGreaterThan(S.timido.porMin * 4);
    });
    it("velocidad e intensidad: cada uno en su margen, con variación controlada", () => {
        for (const p of PERFILES) {
            const d = DATOS[p];
            for (const v of S[p].vel) {
                expect(v).toBeGreaterThanOrEqual(d.velocidad * (1 - d.variacion) - 1e-3);
                expect(v).toBeLessThanOrEqual(d.velocidad * (1 + d.variacion) + 1e-3);
            }
            for (const v of S[p].int) {
                expect(v).toBeGreaterThanOrEqual(d.intensidad * (1 - d.variacion) - 1e-3);
                expect(v).toBeLessThanOrEqual(d.intensidad * (1 + d.variacion) + 1e-3);
            }
            expect(new Set(S[p].vel).size).toBeGreaterThan(1); // no siempre igual
        }
        expect(Math.max(...S.timido.int)).toBeLessThan(Math.min(...S.comico.int));
        expect(Math.max(...S.elegante.vel)).toBeLessThan(Math.min(...S.agresivo.vel));
    });
    it("preferencias: lo de más peso sale más y nunca la misma dos veces seguidas", () => {
        for (const p of PERFILES) {
            const v = S[p].vistas;
            for (let i = 1; i < v.length; i++)
                expect(v[i], `${p} #${i}`).not.toBe(v[i - 1]);
        }
        const cuenta = (p, n) => S[p].vistas.filter(x => x === n).length;
        expect(cuenta("alegre", "lib:gesture_wave")).toBeGreaterThan(cuenta("alegre", "baile"));
        expect(cuenta("agresivo", "flexionar")).toBeGreaterThan(cuenta("agresivo", "pisoton"));
    });
    it("siempre con prioridad de vida (0.5) y duración solo en las de bucle", () => {
        const d = crearDirector("heroico", azarSembrado(3), todo);
        for (let i = 0; i < 200; i++) {
            const a = d.decidir();
            if (a) {
                expect(a.prio).toBe(PRIORIDAD_VIDA);
                if (a.dur)
                    expect(a.dur).toBeGreaterThan(0);
            }
        }
    });
    it("sin biblioteca usa el respaldo de ALV", () => {
        const d = crearDirector("alegre", azarSembrado(5), () => false);
        for (let i = 0; i < 100; i++) {
            const a = d.decidir();
            if (a)
                expect(a.cual.startsWith("lib:")).toBe(false);
        }
    });
});
describe("contextos", () => {
    it("nunca en partida ni en resultados", () => {
        expect(vidaPermitida("partida")).toBe(false);
        expect(vidaPermitida("resultado")).toBe(false);
        expect(CON_VIDA).toContain("editor");
    });
});
describe("personalidad separada de la apariencia y de los paquetes", () => {
    it("ponerPersonalidad solo toca extensiones.alv.personalidad", () => {
        const f = completar({ ...figuraNueva(), extensiones: { alv: { personaje: "hulk" }, modo: "basico" } });
        const g = ponerPersonalidad(f, "comico");
        expect(perfilDe(g)).toBe("comico");
        expect({ ...g, extensiones: {} }).toEqual({ ...f, extensiones: {} });
        expect(g.extensiones.alv.personaje).toBe("hulk");
        expect(g.extensiones.modo).toBe("basico");
        expect(perfilDe(ponerPersonalidad(g, null))).toBeNull();
        expect(esPerfil("raro")).toBe(false);
        expect(perfilDe({ version: 2, extensiones: { alv: { personalidad: { perfil: "malo" } } } })).toBeNull();
    });
    it("al motor va la misma apariencia con cualquier perfil (no se rearma la figura)", () => {
        const f = figuraNueva();
        const huellas = new Set([null, ...PERFILES].map(p => huella(soloApariencia(ponerPersonalidad(f, p)))));
        expect(huellas.size).toBe(1);
    });
    it("la espera del perfil solo si el paquete es «Normal»: lo comprado manda", () => {
        const con = ponerPersonalidad(figuraNueva(), "timido");
        expect(animPerfil(con).espera).toBe("respirar");
        expect(animPerfil(con, todo).espera).toBe("lib:personality_idle");
        const paquete = catalogo.paquetes[0];
        const comprado = ponerPersonalidad(ponerMomentos(figuraNueva(), { ...paquete }), "timido");
        const a = animPerfil(comprado, todo);
        expect(a.espera).toBeUndefined(); // la espera del paquete se queda
        expect(a.vel).toBe(DATOS.timido.velocidad); // la conducta sí aplica
        expect(comprado.momentos).toEqual(ponerMomentos(figuraNueva(), { ...paquete }).momentos);
        expect(animPerfil(ponerMomentos(con, MOMENTOS_NORMALES), todo).espera).toBe("lib:personality_idle");
        expect(animPerfil(figuraNueva(), todo)).toEqual({}); // sin perfil: como siempre
    });
});
describe("personalidad por defecto del personaje (27 nov)", () => {
    const conPersonaje = (personaje, extra = {}) => ({ version: 2, extensiones: { alv: { ...extra, v3: {
                    version: 3, familia: "minifig", origen: { tipo: "catalogo", personaje, version: "base", revision: 1 }, piezas: {},
                    momentos: { paquete: null, espera: "respirar", victoria: "festejo", derrota: "tristeza", punto: "saltito" }, extensiones: {}
                } } } });
    it("sin perfil elegido usa el del personaje; el elegido manda; sin personaje conocido no hay", () => {
        expect(perfilEfectivo(conPersonaje("deadpool"))).toBe("comico");
        expect(perfilEfectivo(conPersonaje("hulk"))).toBe("agresivo");
        expect(perfilDe(conPersonaje("deadpool"))).toBeNull();
        expect(perfilEfectivo(conPersonaje("deadpool", { personalidad: { perfil: "timido" } }))).toBe("timido");
        expect(perfilEfectivo(conPersonaje("no-existe"))).toBeNull();
        expect(perfilEfectivo(null)).toBeNull();
    });
});
