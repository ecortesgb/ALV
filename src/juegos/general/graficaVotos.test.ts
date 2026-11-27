import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../../content";
import { JUEGOS } from "../../content/catalogo";
import { aplicar, crearPartida, type Accion, type AccionSinId, type EstadoPartida } from "../../engine/partida";
import { vistaPublica } from "../../engine/vistas";
import { columnasVotos } from "./GraficaVotos";
import type { Publico } from "./texto";
import type { Configuracion } from "../../engine/types";

const jugadores = ["Ana", "Beto", "Caro"].map((nombre, i) => ({ id: `j${i}`, nombre }));
let n = 0;
const juega = (e: EstadoPartida, a: AccionSinId) => aplicar(e, { ...a, id: `g${++n}` } as Accion, CONTENIDO);
function revelar(extra: Partial<Configuracion> = {}) {
  let e = crearPartida(JUEGOS.find(j => j.id === "mas-probable")!, { jugadores, lugar: "interior", intensidad: 2, dificultad: 1, adulto: false, drunk: false, ...extra }, 3, CONTENIDO, 2);
  for (const [j, a] of [["j0", "j2"], ["j1", "j2"], ["j2", "j0"]] as const) e = juega(e, { tipo: "contestar", jugador: j, valor: a });
  return { ...vistaPublica(juega(e, { tipo: "revelar" })), reloj: null } as Publico;
}

describe("Gráfica de votos en la TV", () => {
  it("una columna por jugador, con sus votos y quién votó", () => {
    const c = columnasVotos(revelar());
    expect(c.map(x => [x.id, x.votos, x.alto, x.gana])).toEqual([["j0", 1, 0.5, false], ["j1", 0, 0, false], ["j2", 2, 1, true]]);
    expect(c.find(x => x.id === "j2")!.quienes).toEqual(["Ana", "Beto"]);
  });
  it("con voto secreto no dice quién votó", () => {
    const c = columnasVotos(revelar({ votoSecreto: true }));
    expect(c.find(x => x.id === "j2")!.votos).toBe(2);
    expect(c.every(x => x.quienes.length === 0)).toBe(true);
  });
});
