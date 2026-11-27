// Nombres de equipo que pone el anfitrión (Elías, 24 nov): llegan al arranque y a la vista pública, limpios.
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { crearPartida } from "./partida";
import { armarArranque, armarGrupos, nombreGrupo } from "./nucleo";
import { vistaPublica } from "./vistas";
const gente = (n) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `J${i}` }));
describe("nombres de equipo", () => {
    it("equipos con nombre propio; sin nombre, el de siempre", () => {
        const r = armarGrupos(gente(5), { modalidad: "equipos", grupos: { j0: "a", j1: "b", j2: "c", j3: "a", j4: "b" }, nombres: { a: "Los Ninjas", c: "  " } });
        expect(r.equipos).toEqual([{ id: "a", nombre: "Los Ninjas" }, { id: "b", nombre: "Equipo B" }, { id: "c", nombre: "Equipo C" }]);
    });
    it("tres equipos disparejos (3+2+1) se pueden", () => {
        const r = armarGrupos(gente(6), { modalidad: "equipos", grupos: { j0: "a", j1: "a", j2: "a", j3: "b", j4: "b", j5: "c" } });
        expect(r?.equipos?.length).toBe(3);
    });
    it("limpia saltos y controles y corta a 20 letras", () => {
        expect(nombreGrupo({ nombres: { a: "Los\nMuy\u0007 Largos de Verdad Verdad" } }, "a")).toBe("LosMuy Largos de Ver");
        expect(nombreGrupo({ nombres: { a: "   " } }, "a")).toBeUndefined();
    });
    it("llegan a la vista pública de la partida", () => {
        const a = armarArranque(gente(4), "mas-probable", 5, 1, 3, { modalidad: "sexos", grupos: { j0: "ellas", j1: "ellos", j2: "ellas", j3: "ellos" }, nombres: { ellas: "Las Reinas" } });
        const e = crearPartida(JUEGOS.find(j => j.id === "mas-probable"), a.cfg, a.semilla, CONTENIDO, a.rondas);
        expect(vistaPublica(e).grupos?.map(g => g.nombre).sort()).toEqual(["Ellos", "Las Reinas"]);
    });
});
