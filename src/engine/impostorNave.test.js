// El impostor en la nave (Elías, 24 nov): saltar voto, puntos +5/+3, votos visibles o secretos, revelar o no, castigo.
// Sin `nave`, todo como en v1.44 (lo cubre impostor.test.ts y la equivalencia del núcleo).
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aplicar, crearPartida, SALTAR_VOTO } from "./partida";
import { armarArranque, reconstruir } from "./nucleo";
import { vistaJugador, vistaPublica } from "./vistas";
const impostorDef = JUEGOS.find(j => j.id === "impostor");
const gente = (n) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
let k = 0;
const juega = (e, a) => aplicar(e, { ...a, id: `n${++k}` }, CONTENIDO);
function partida(n, semilla, nave = {}, extra = {}) {
    const a = armarArranque(gente(n), "impostor", 8, 2, semilla, { ...extra, impostor: { cantidad: 1, tema: null, nave: true, ...nave } });
    return crearPartida(impostorDef, a.cfg, a.semilla, CONTENIDO, a.rondas);
}
const impostores = (e) => Object.entries(e.privado).filter(([, p]) => p.rol === "impostor").map(([j]) => j);
const hablan = (e) => {
    for (const j of vistaPublica(e).impostor.orden)
        e = juega(e, { tipo: "pista", jugador: j, texto: `palabra de ${j}` });
    return e;
};
/** Cada quien vota lo que diga `voto(j)`; luego se revela. */
function votan(e, voto) {
    for (const j of vistaPublica(e).esperados)
        e = juega(e, { tipo: "contestar", jugador: j, valor: voto(j) });
    return juega(e, { tipo: "revelar" });
}
describe("arranque con las reglas de la nave", () => {
    it("guarda las opciones con sus valores por defecto", () => {
        const a = armarArranque(gente(5), "impostor", 8, 2, 1, { impostor: { cantidad: 1, tema: null, nave: true } });
        expect(a.cfg.impostor).toEqual({ cantidad: 1, tema: null, nave: true, votos: "visibles", revelar: true, castigo: true });
        const b = armarArranque(gente(5), "impostor", 8, 2, 1, { impostor: { cantidad: 1, tema: null, nave: true, votos: "secretos", revelar: false, castigo: false } });
        expect(b.cfg.impostor).toMatchObject({ votos: "secretos", revelar: false, castigo: false });
    });
    it("sin nave no se agrega nada (partidas de antes iguales)", () => {
        const a = armarArranque(gente(5), "impostor", 8, 2, 1, { impostor: { cantidad: 1, tema: null, votos: "secretos" } });
        expect(a.cfg.impostor).toEqual({ cantidad: 1, tema: null });
        expect(vistaPublica(crearPartida(impostorDef, a.cfg, a.semilla, CONTENIDO, a.rondas)).impostor.nave).toBeUndefined();
    });
});
describe("saltar el voto", () => {
    it("«Nadie» es un voto válido solo en la nave", () => {
        let e = hablan(partida(4, 7));
        const j = vistaPublica(e).esperados[0];
        e = juega(e, { tipo: "contestar", jugador: j, valor: SALTAR_VOTO });
        expect(e.respuestas[j]).toBe(SALTAR_VOTO);
        const a = armarArranque(gente(4), "impostor", 8, 2, 7, { impostor: { cantidad: 1, tema: null } });
        let viejo = hablan(crearPartida(impostorDef, a.cfg, a.semilla, CONTENIDO, a.rondas));
        viejo = juega(viejo, { tipo: "contestar", jugador: j, valor: SALTAR_VOTO });
        expect(viejo.respuestas[j]).toBeUndefined();
    });
    it("si «Nadie» gana o empata con el más votado, nadie sale y saltar no da puntos", () => {
        let e = hablan(partida(4, 9));
        const imp = impostores(e)[0];
        // 2 saltan, 2 votan por el impostor: empate con «Nadie».
        const quienes = vistaPublica(e).esperados;
        e = votan(e, j => (quienes.indexOf(j) < 2 ? SALTAR_VOTO : j === imp ? quienes.find(x => x !== imp) : imp));
        const r = e.revelado;
        expect(r.eliminado).toBeNull();
        expect(r.empate).toBe(true);
        expect(r.saltos).toBe(2);
        for (const j of quienes)
            if (e.respuestas[j] === SALTAR_VOTO && j !== imp)
                expect(e.puntos[j]).toBe(0);
    });
    it("con más votos que «Nadie», el más votado sale", () => {
        let e = hablan(partida(5, 13));
        const imp = impostores(e)[0];
        const civiles = vistaPublica(e).esperados.filter(j => j !== imp);
        // 3 civiles votan al impostor, 1 civil salta, el impostor vota a un civil.
        e = votan(e, j => (j === imp ? civiles[0] : j === civiles[3] ? SALTAR_VOTO : imp));
        expect(e.revelado).toMatchObject({ eliminado: imp, fin: "civiles", saltos: 1 });
    });
});
describe("puntos y castigos de la nave", () => {
    it("ganan los civiles: +1 por votar bien y +3 al final; castigo solo al impostor", () => {
        let e = hablan(partida(4, 31));
        const imp = impostores(e)[0];
        const otro = ["j0", "j1", "j2", "j3"].find(j => j !== imp);
        e = votan(e, j => (j === imp ? otro : imp));
        expect(e.puntos[otro]).toBe(1 + 3);
        expect(e.puntos[imp]).toBe(0);
        const r = e.revelado;
        expect(Object.keys(r.castigos)).toEqual([imp]);
    });
    it("ganan los impostores: +1 por sobrevivir cada votación y +5 al final; castigo a todos los civiles, también a los expulsados", () => {
        let e = hablan(partida(4, 51));
        const imp = impostores(e)[0];
        const civiles = ["j0", "j1", "j2", "j3"].filter(j => j !== imp);
        e = juega(votan(e, j => (j === civiles[0] ? imp : civiles[0])), { tipo: "siguiente" });
        e = votan(hablan(e), j => (j === civiles[1] ? imp : civiles[1]));
        expect(e.revelado).toMatchObject({ fin: "impostores" });
        expect(e.puntos[imp]).toBe(1 + 1 + 5);
        expect(Object.keys(e.revelado.castigos).sort()).toEqual([...civiles].sort());
    });
    it("sin Drunk, castigos sin trago; con Drunk, de trago y ninguno exige alcohol", () => {
        const fin = (drunk) => {
            let e = partida(4, 31, {}, { ejes: { temperatura: 1, voltaje: 1, drunk } });
            e = hablan(e);
            const imp = impostores(e)[0];
            e = votan(e, j => (j === imp ? ["j0", "j1", "j2", "j3"].find(x => x !== imp) : imp));
            return Object.values(e.revelado.castigos)[0].texto;
        };
        const nave = CONTENIDO.cartas.filter(c => c.mazo === "castigo-nave");
        expect(nave.find(c => c.texto === fin(false))?.drunk).toBe(false);
        expect(nave.find(c => c.texto === fin(true))?.drunk).toBe(true);
        for (const c of nave.filter(x => x.drunk))
            expect(c.texto).toMatch(/lo que (tengas|estés tomando|haya)|con o sin alcohol|agua/i);
        for (const c of nave)
            expect(c.contacto ?? false).toBe(false);
    });
    it("el Voltaje sube los castigos: cada nivel saca los suyos (Elías, 25 nov)", () => {
        const nivelDe = (voltaje, drunk) => {
            let e = partida(4, 31, {}, { ejes: { temperatura: 1, voltaje, drunk } });
            e = hablan(e);
            const imp = impostores(e)[0];
            e = votan(e, j => (j === imp ? ["j0", "j1", "j2", "j3"].find(x => x !== imp) : imp));
            const texto = Object.values(e.revelado.castigos)[0].texto;
            return CONTENIDO.cartas.find(c => c.mazo === "castigo-nave" && c.texto === texto).nivel;
        };
        for (const v of [1, 2, 3])
            for (const d of [false, true])
                expect(nivelDe(v, d), `voltaje ${v} drunk ${d}`).toBe(v);
    });
    it("sin castigo no se reparte nada", () => {
        let e = hablan(partida(4, 31, { castigo: false }));
        const imp = impostores(e)[0];
        e = votan(e, j => (j === imp ? ["j0", "j1", "j2", "j3"].find(x => x !== imp) : imp));
        expect(e.revelado.castigos).toBeUndefined();
    });
});
describe("Temperatura de las palabras (Elías, 25 nov)", () => {
    const palabra = (e) => Object.values(e.privado).map(p => p.palabra).find(Boolean);
    const temaDe = (e) => CONTENIDO.temas.find(t => `tema-${t.id}` === e.carta?.id);
    it("en Frío solo salen las de siempre; en Extremo también las de nivel 2 y 3", () => {
        const vistas = { 1: new Set(), 3: new Set() };
        for (const temp of [1, 3])
            for (let s = 1; s <= 400; s++) {
                const e = partida(4, s, { papeles: true, tema: "s-pel" }, { ejes: { temperatura: temp, voltaje: 1, drunk: false } });
                vistas[temp].add(palabra(e));
            }
        const pel = CONTENIDO.temas.find(t => t.id === "s-pel");
        for (const p of vistas[1])
            expect(pel.palabras).toContain(p);
        expect([...vistas[3]].some(p => pel.porNivel[2].includes(p))).toBe(true);
        expect([...vistas[3]].some(p => pel.porNivel[3].includes(p))).toBe(true);
    });
    it("la categoría Adultos la abre la Temperatura en Extremo, no el Voltaje", () => {
        const con = (temperatura, voltaje) => temaDe(partida(4, 9, { papeles: true, tema: "s-adu" }, { ejes: { temperatura, voltaje, drunk: false } })).id;
        expect(con(3, 1)).toBe("s-adu");
        expect(con(1, 3)).not.toBe("s-adu");
    });
});
describe("cómo se ven los votos", () => {
    it("a la vista: quién vota a quién en vivo y al revelar", () => {
        let e = hablan(partida(4, 7));
        const [a, b] = vistaPublica(e).esperados;
        expect(vistaPublica(e).impostor.votosEnVivo).toEqual({});
        e = juega(e, { tipo: "contestar", jugador: a, valor: b });
        expect(vistaPublica(e).impostor.votosEnVivo).toEqual({ [a]: b });
        expect(vistaPublica(e).impostor.nave).toEqual({ votos: "visibles", revelar: true, castigo: true });
    });
    it("secretos: ni en vivo ni al revelar, solo el conteo", () => {
        let e = hablan(partida(4, 7, { votos: "secretos" }));
        const [a, b] = vistaPublica(e).esperados;
        e = juega(e, { tipo: "contestar", jugador: a, valor: b });
        expect(vistaPublica(e).impostor.votosEnVivo).toBeUndefined();
        expect(vistaPublica(e).contestaron).toEqual([a]);
        e = votan(e, j => (j === b ? a : b));
        expect(vistaPublica(e).votosDe).toBeUndefined();
        expect(vistaPublica(e).revelado.votos[b]).toBeGreaterThan(0);
    });
});
describe("no revelar hasta descubrir a todos", () => {
    it("al expulsar no se dice si era impostor ni cuántos quedan; al final sí", () => {
        let e = hablan(partida(6, 41, { cantidad: 2, revelar: false }));
        const [i1, i2] = impostores(e);
        e = votan(e, j => (j === i1 ? i2 : i1));
        const v = vistaPublica(e);
        expect(v.revelado).toMatchObject({ eliminado: i1, secreto: true, fin: null });
        expect(JSON.stringify(v.revelado)).not.toContain("eraImpostor");
        expect(JSON.stringify(v.revelado)).not.toContain("quedan");
        // El expulsado (y cualquiera que no sea impostor) no sabe quiénes son.
        const civil = ["j0", "j1", "j2", "j3", "j4", "j5"].find(j => j !== i1 && j !== i2);
        expect(JSON.stringify(vistaJugador(e, civil))).not.toContain(`"impostores"`);
        e = juega(e, { tipo: "siguiente" });
        expect(e.fase).toBe("contestando");
        e = votan(hablan(e), j => (j === i2 ? civil : i2));
        expect(vistaPublica(e).revelado).toMatchObject({ fin: "civiles", impostores: [i1, i2].sort((x, y) => x.localeCompare(y)) });
    });
});
describe("reconstrucción", () => {
    it("la partida con las reglas de la nave se reconstruye igual desde sus acciones", () => {
        const a = armarArranque(gente(5), "impostor", 8, 2, 77, { impostor: { cantidad: 2, tema: null, nave: true, revelar: false } });
        const filas = [{ id: "a0", tipo: "control", jugador: "j0", datos: { que: "arranque", ...a }, creada: "" }];
        let e = { ...crearPartida(impostorDef, a.cfg, a.semilla, CONTENIDO, a.rondas), control: "j0" };
        const mandar = (f, acc) => { filas.push({ ...f, creada: "" }); e = aplicar(e, { ...acc, id: f.id }, CONTENIDO); };
        let n = 0;
        for (const j of vistaPublica(e).impostor.orden)
            mandar({ id: `p${++n}`, tipo: "pista", jugador: j, datos: { texto: "x" } }, { tipo: "pista", jugador: j, texto: "x" });
        for (const j of vistaPublica(e).esperados)
            mandar({ id: `v${++n}`, tipo: "contestar", jugador: j, datos: { valor: SALTAR_VOTO } }, { tipo: "contestar", jugador: j, valor: SALTAR_VOTO });
        mandar({ id: `r${++n}`, tipo: "control", jugador: "j0", datos: { que: "revelar" } }, { tipo: "revelar" });
        const r = reconstruir(filas, "j0");
        expect(r.revelado).toEqual(e.revelado);
        expect(r.puntos).toEqual(e.puntos);
    });
});
