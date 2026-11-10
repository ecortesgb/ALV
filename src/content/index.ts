// Contenido cargado: paquete base migrado de la Edición Fin de Semana más los retos nuevos por escenario.
import base from "./packs/base.json";
import type { Carta, TemaImpostor } from "../engine/types";
import type { Contenido } from "../engine/partida";

export const CONTENIDO: Contenido = {
  cartas: base.cartas as Carta[],
  temas: base.impostor as TemaImpostor[],
};
