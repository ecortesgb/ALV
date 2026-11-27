// Premios por nivel (Maestro 6A.11 C1: «con cada nivel se pueden desbloquear cosas del personalizador»).
// PROPUESTA: qué pieza da cada nivel la decide Elías; se cambia aquí y en la migración 035 (una prueba compara las dos).
// Son piezas con rareza de content/rarezas.ts: subir de nivel las regala (origen «nivel»), sin gastar XP ni monedas.
import { rarezaDe } from "./rarezas";
export const PREMIOS_NIVEL = {
    2: ["HAIR_010"],
    3: ["MOM_velocidad"],
    4: ["NECK_001"],
    5: ["HELM_005"],
    6: ["PRINT_013"],
    7: ["ACC_002"],
    8: ["HAIR_017"],
    10: ["MOM_fuego"],
    12: ["PRINT_003"],
    15: ["HELM_012"],
    20: ["PRINT_001"],
};
/** Premios que se ganan al pasar del nivel `antes` al nivel `ahora` (sin incluir `antes`). */
export function premiosEntre(antes, ahora) {
    const r = [];
    for (let n = antes + 1; n <= ahora; n++)
        for (const pieza of PREMIOS_NIVEL[n] ?? [])
            r.push({ nivel: n, pieza });
    return r;
}
/** El siguiente premio después del nivel `nivel` (para mostrarlo con candado en la barra). */
export function siguientePremio(nivel) {
    const n = Object.keys(PREMIOS_NIVEL).map(Number).sort((a, b) => a - b).find(x => x > nivel);
    return n ? { nivel: n, pieza: PREMIOS_NIVEL[n][0] } : null;
}
/** Todas las piezas de premio deben ser bloqueables (si no, regalarlas no tendría sentido). */
export const premiosValidos = () => Object.values(PREMIOS_NIVEL).flat().every(id => rarezaDe(id) !== "comun");
