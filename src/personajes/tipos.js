export const ID = /^[a-z0-9][a-z0-9-]{1,59}$/;
export const esId = (x) => typeof x === "string" && ID.test(x);
/** Las seis animaciones que todo personaje sabe hacer (§12.2). */
export const LOGICAS = ["reposo", "entrada", "saludo", "victoria", "derrota", "especial"];
export const esLogica = (x) => typeof x === "string" && LOGICAS.includes(x);
/** Partes lógicas del cuerpo que se mapean a huesos (contrato de entrega, §3). */
export const HUESOS_LOGICOS = ["raiz", "cadera", "torso", "cuello", "cabeza", "mano_der", "mano_izq"];
/** Acciones de los minijuegos (bloque `juego` de la ficha). */
export const ACCIONES_JUEGO = ["caminar", "correr", "saltar", "caer", "aterrizar", "golpe", "herido", "ko", "eliminado", "nervios"];
/** Partes del constructor. El básico las muestra en 4 pestañas: Cabeza (cabeza, cara, cabello), Torso,
 *  Brazos y manos (brazos, manos) y Piernas (cadera, piernas). CONTRATO-ENTREGA.md §6. */
export const PARTES_BASICO = ["cabeza", "cara", "cabello", "torso", "brazos", "manos", "cadera", "piernas"];
export const PESTANAS_BASICO = {
    cabeza: ["cabeza", "cara", "cabello"], torso: ["torso"], brazos: ["brazos", "manos"], piernas: ["cadera", "piernas"],
};
export const PARTES_AVANZADO = ["sombrero", "mascara", "capa", "mochila", "armadura", "accesorio", "arma", "efecto"];
export const esParte = (x) => typeof x === "string" && (PARTES_BASICO.includes(x) || PARTES_AVANZADO.includes(x));
