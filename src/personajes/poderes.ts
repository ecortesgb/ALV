// Poderes de personaje (Elías, 27 nov 2026): el movimiento sale del GLB «poderes» del juego (bloque `poderes` de la ficha,
// laboratorio-iron-man/herramientas/entregar_poderes.py) y las luces y elementos los dibuja tools/personajes/efectos.js.
// Aquí solo hay datos: qué poderes se ofrecen, en qué orden, con qué nombre y con qué efecto. Agregar uno no cambia el motor.
// Un poder que la ficha no trae (o que aquí no tiene efecto) no se ofrece.
import type { Id } from "./tipos";

export type TipoEfecto = "rayo" | "electrico" | "fuego" | "telarana" | "escudo" | "invisible" | "encoger" | "golpe" | "onda" | "campo"
  | "hechizo" | "volar" | "estirar" | "hielo" | "hormigas";
export interface Efecto {
  tipo: TipoEfecto;
  /** Hueso lógico de donde sale (cabeza, mano_der, mano_izq, torso). */
  desde?: "cabeza" | "mano_der" | "mano_izq" | "torso";
  color?: string;
  color2?: string;
  /** Segundos desde que empieza el clip hasta que sale el efecto. */
  retraso?: number;
  /** Segundos que dura el efecto. */
  dura?: number;
  /** Rayo que baja del cielo (Tormenta, Thor). */
  cielo?: boolean;
  /** fuego: "cuerpo" (se enciende entero) o bola; telaraña: "arriba" (columpio); rayo: "fino". */
  modo?: "cuerpo" | "arriba" | "fino";
  /** encoger: tamaño al que llega; volar: altura en altos de figura. */
  a?: number;
}
export interface PoderDef { nombre: string; efecto: Efecto; efectos?: Efecto[];
  /** Corta el clip del juego en este segundo (cuando su final se ve mal) y vuelve a reposo. */
  hasta?: number;
  /** Repite el clip este tiempo (s) y luego vuelve a reposo (volar: flotar parado). */
  bucle?: number }

const AZUL = "#7fd8ff", ROJO = "#ff3b30", FUEGO = "#ff6a1a", AMARILLO = "#ffd23a", ELECTRICO = "#bfe3ff", VERDE = "#62ff6e";

/** Por personaje, en el orden en que se ofrecen (el primero es el poder principal: RT del mando). */
export const PODERES: Readonly<Record<Id, Readonly<Record<string, PoderDef>>>> = {
  "capitan-america": {
    escudo: { nombre: "Lanzar escudo", efecto: { tipo: "escudo", desde: "mano_der", color: "#ffffff", retraso: 0.35, dura: 1.4 } },
  },
  "mr-fantastico": {
    // El final de ARMZIP_STRETCH despega la cabeza (espera mallas del juego): se corta antes.
    estirar: { nombre: "Estirarse", hasta: 1.8, efecto: { tipo: "estirar", retraso: 0.1, dura: 1.6 } },
    forma: { nombre: "Cambiar de forma", efecto: { tipo: "estirar", retraso: 0, dura: 1.2 } },
  },
  "mujer-invisible": {
    invisible: { nombre: "Volverse invisible", efecto: { tipo: "invisible", color: "#9fd6ff", retraso: 0.2, dura: 3 } },
    campo: { nombre: "Campo de fuerza", efecto: { tipo: "campo", color: "#7fc8ff", retraso: 0.2, dura: 2.2 } },
  },
  "antorcha-humana": {
    encender: { nombre: "¡Llamas!", efecto: { tipo: "fuego", modo: "cuerpo", color: FUEGO, color2: AMARILLO, retraso: 0.2, dura: 2.6 } },
    fuego: { nombre: "Bola de fuego", efecto: { tipo: "fuego", desde: "mano_der", color: FUEGO, color2: AMARILLO, retraso: 0.25, dura: 1 } },
    volar: { nombre: "Volar", bucle: 3, efecto: { tipo: "volar", color: FUEGO, color2: AMARILLO, dura: 3 },
      efectos: [{ tipo: "fuego", modo: "cuerpo", color: FUEGO, color2: AMARILLO, dura: 3 }] },
  },
  "la-mole": {
    golpe: { nombre: "Golpe al piso", efecto: { tipo: "golpe", color: "#ffb347", retraso: 0.6, dura: 0.8 } },
    aplauso: { nombre: "Aplauso de trueno", efecto: { tipo: "onda", desde: "mano_der", color: "#ffffff", retraso: 0.45, dura: 0.7 } },
  },
  ciclope: {
    rayo: { nombre: "Rayo óptico", efecto: { tipo: "rayo", desde: "cabeza", color: ROJO, retraso: 0.15, dura: 1.4 } },
  },
  "ant-man": {
    // El clip SHRINK del juego ya encoge y regresa: el efecto solo pone las chispas al encoger y al crecer.
    encoger: { nombre: "Encogerse", efecto: { tipo: "encoger", color: "#ff5a5a", a: 1, dura: 1.6 } },
    hormigas: { nombre: "Llamar hormigas", efecto: { tipo: "hormigas", retraso: 0.3, dura: 3 } },
  },
  thor: {
    rayo: { nombre: "Rayo", efecto: { tipo: "electrico", desde: "mano_der", color: ELECTRICO, cielo: true, retraso: 0.3, dura: 1.6 } },
    martillo: { nombre: "Martillazo", efecto: { tipo: "golpe", color: ELECTRICO, retraso: 0.55, dura: 0.8 },
      efectos: [{ tipo: "electrico", desde: "mano_der", color: ELECTRICO, cielo: true, retraso: 0.45, dura: 0.6 }] },
    volar: { nombre: "Volar", bucle: 3, efecto: { tipo: "volar", color: "#ffffff", color2: ELECTRICO, dura: 3 } },
  },
  tormenta: {
    rayo: { nombre: "Rayos", efecto: { tipo: "electrico", desde: "mano_der", color: ELECTRICO, cielo: true, retraso: 0.2, dura: 1.8 } },
    volar: { nombre: "Volar", bucle: 3, efecto: { tipo: "volar", color: "#ffffff", color2: "#cfe8ff", dura: 3 } },
  },
  iceman: {
    hielo: { nombre: "Rayo de hielo", efecto: { tipo: "hielo", desde: "mano_der", color: "#4fc3ff", retraso: 0.2, dura: 1.6 } },
  },
  "spider-man": {
    telarana: { nombre: "Telaraña", efecto: { tipo: "telarana", desde: "mano_der", retraso: 0.15, dura: 1.6 } },
    columpio: { nombre: "Columpiarse", efecto: { tipo: "telarana", desde: "mano_der", modo: "arriba", retraso: 0, dura: 2 } },
  },
  hulk: {
    golpe: { nombre: "Golpe al piso", efecto: { tipo: "golpe", color: VERDE, retraso: 0.7, dura: 0.9 } },
    aplauso: { nombre: "Aplauso de trueno", efecto: { tipo: "onda", desde: "mano_der", color: "#ffffff", retraso: 0.5, dura: 0.8 } },
  },
  "iron-man": {
    repulsor: { nombre: "Repulsor", efecto: { tipo: "rayo", desde: "mano_der", color: AZUL, modo: "fino", retraso: 0.2, dura: 0.7 } },
    pecho: { nombre: "Rayo del pecho", efecto: { tipo: "rayo", desde: "torso", color: "#dff6ff", retraso: 0.5, dura: 1.2 } },
    volar: { nombre: "Volar", bucle: 3, efecto: { tipo: "volar", color: "#9fe2ff", color2: "#ffffff", dura: 3 } },
  },
  "iron-man-clasico": {
    repulsor: { nombre: "Repulsor", efecto: { tipo: "rayo", desde: "mano_der", color: AZUL, modo: "fino", retraso: 0.2, dura: 0.7 } },
    pecho: { nombre: "Rayo del pecho", efecto: { tipo: "rayo", desde: "torso", color: "#dff6ff", retraso: 0.5, dura: 1.2 } },
    volar: { nombre: "Volar", bucle: 3, efecto: { tipo: "volar", color: "#9fe2ff", color2: "#ffffff", dura: 3 } },
  },
  "doctor-strange": {
    hechizo: { nombre: "Hechizo", efecto: { tipo: "hechizo", desde: "mano_der", color: "#ffae3a", retraso: 0.1, dura: 1.8 } },
    levitar: { nombre: "Levitar", bucle: 3, efecto: { tipo: "volar", a: 0.3, color: "#ffae3a", color2: "#ffd27a", dura: 3 } },
  },
};

/** Un poder listo para la escena: el GLB y el clip (null si se dibuja solo el efecto), y sus efectos. */
export interface PoderPlano { id: string; nombre: string; glb: string; clip: string; efectos: Efecto[]; hasta?: number; bucle?: number }
