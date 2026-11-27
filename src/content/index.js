// Contenido cargado: paquete base migrado de la Edición Fin de Semana más los retos nuevos por escenario.
// Atributo `with { type: "json" }`: lo exige Deno (motor en el servidor) y lo aceptan TypeScript, Vite y vitest. El contenido no cambia.
import base from "./packs/base.json" with { type: "json" };
export const CONTENIDO = {
    cartas: base.cartas,
    temas: base.impostor,
};
