// Contenido cargado: paquete base migrado de la Edición Fin de Semana más los retos nuevos por escenario.
// Atributo `with { type: "json" }`: lo exige Deno (motor en el servidor) y lo aceptan TypeScript, Vite y vitest. El contenido no cambia.
import base from "./packs/base.json" with { type: "json" };
import type { Carta, TemaImpostor } from "../engine/types";
import type { Contenido } from "../engine/partida";

export const CONTENIDO: Contenido = {
  cartas: base.cartas as Carta[],
  temas: base.impostor as TemaImpostor[],
};
