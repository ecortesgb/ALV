// Familias de cuerpo (§12.1 del formato). La escala convierte unidades del GLB del juego a unidades de la escena de ALV
// (una minifigura de ALV mide ~2.6 de alto con pelo). Se mide con Iron Man en la página de prueba.
import type { Familia, Id } from "./tipos";

// Capitán América del juego mide 0.3848 (ficha de producción) → 2.6 / 0.3848 ≈ 6.75. Comprobar con «medir» en
// tools/personajes/prueba.html cuando haya más personajes.
const ESCALA_JUEGO = 6.75;

export const FAMILIAS: Record<Id, Familia> = {
  minifig: {
    id: "minifig", nombre: "Minifigura", rig: "esqueleto", escala: ESCALA_JUEGO, crear: true,
    mapa: { reposo: "Idle" },
    respaldo: { entrada: "saludo", saludo: "victoria", especial: "victoria", victoria: "reposo", derrota: "reposo" },
  },
  bigfig: {
    id: "bigfig", nombre: "Grande", rig: "esqueleto", escala: ESCALA_JUEGO, crear: false,
    mapa: { reposo: "Idle" },
    respaldo: { entrada: "saludo", saludo: "victoria", especial: "victoria", victoria: "reposo", derrota: "reposo" },
  },
  corta: {
    id: "corta", nombre: "Corta", rig: "esqueleto", escala: ESCALA_JUEGO, crear: false,
    mapa: { reposo: "Idle" },
    respaldo: { entrada: "saludo", saludo: "victoria", especial: "victoria", victoria: "reposo", derrota: "reposo" },
  },
  droide: {
    id: "droide", nombre: "Droide", rig: "esqueleto", escala: ESCALA_JUEGO, crear: false,
    mapa: { reposo: "Idle" },
    respaldo: { entrada: "saludo", saludo: "victoria", especial: "victoria", victoria: "reposo", derrota: "reposo" },
  },
};

export const familia = (id: Id): Familia | null => (Object.hasOwn(FAMILIAS, id) ? FAMILIAS[id]! : null);
