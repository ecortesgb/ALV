// Tienda de ALV (Maestro v1.48, enfoque A; valores aprobados por Elías en v1.49). Precios y probabilidades
// se pueden ajustar después de probar con jugadores. Plan completo en ALV_PLAN_TIENDA.md (fuera del repo).
// Cuando exista la migración de la tienda, sus datos se generan de aquí y una prueba compara las dos.
import { RAREZA, type Rareza } from "./rarezas";

export type IdSobre = "basico" | "accesorios" | "comodines" | "mixto" | "epico";
export const DORSO_SOBRE = "sobre-dorso-alv.webp";
/** Rarezas que salen en sobres de piezas (lo común ya es libre en el personalizador). */
export type RarezaSobre = Exclude<Rareza, "comun">;

export interface Sobre {
  id: IdSobre;
  nombre: string;
  precio: number;
  /** Imagen en public/arte/tienda/. */
  arte: string;
  /** Cuántas piezas y cuántos comodines trae. */
  piezas: number;
  comodines: number;
  /** Pesos por rareza de cada pieza (se normalizan). */
  pesos: Record<RarezaSobre, number>;
  /** Solo piezas de estas secciones (sin lista = todas). */
  secciones?: Seccion[];
  /** Al menos una pieza de esta rareza o mejor. */
  minimo?: RarezaSobre;
  /** Color de su luz y su brillo. */
  color: string;
  frase: string;
}

export type SobreVisual = Pick<Sobre, "nombre" | "arte" | "color">;

export type Seccion = "pelo" | "casco" | "rostro" | "detalle" | "cuello" | "torso" | "objeto" | "momentos";

export const SOBRES: Sobre[] = [
  { id: "basico", nombre: "Sobre básico", precio: 50, arte: "sobre-basico.webp", piezas: 2, comodines: 0,
    pesos: { rara: 88, epica: 11, legendaria: 1 }, color: "#3fb6ff", frase: "Dos piezas para empezar tu colección." },
  { id: "accesorios", nombre: "Sobre de accesorios", precio: 120, arte: "sobre-accesorios-v2.webp", piezas: 3, comodines: 0,
    pesos: { rara: 65, epica: 28, legendaria: 7 }, secciones: ["casco", "detalle", "cuello", "objeto"], color: "#2ee6c5",
    frase: "Cascos, lentes, cuellos, capas y objetos." },
  { id: "comodines", nombre: "Sobre de comodines", precio: 150, arte: "sobre-comodines-v2.webp", piezas: 0, comodines: 3,
    pesos: { rara: 0, epica: 0, legendaria: 0 }, color: "#ff3fb4", frase: "Tres comodines para salvarte en la partida." },
  { id: "mixto", nombre: "Sobre mixto", precio: 180, arte: "sobre-mixto.webp", piezas: 2, comodines: 2,
    pesos: { rara: 60, epica: 32, legendaria: 8 }, color: "#b06bff", frase: "Dos piezas y dos comodines." },
  { id: "epico", nombre: "Sobre épico", precio: 200, arte: "sobre-epico-v2.webp", piezas: 3, comodines: 0,
    pesos: { rara: 40, epica: 45, legendaria: 15 }, minimo: "epica", color: "#ffb21f", frase: "Tres piezas, mínimo una épica." },
];
export const sobrePorId = (id: string) => SOBRES.find(s => s.id === id) ?? null;

/** Portadas del sobre de personajes (v1.73: todas traen personajes de cualquier saga; solo cambia la portada). */
export const SOBRES_PERSONAJES = [
  { id: "marvel", nombre: "Personajes · Marvel", arte: "sobre-personajes-marvel.webp", color: "#fc694e", frase: "Héroes, villanos y Bigfig de Marvel." },
  { id: "dc", nombre: "Personajes · DC", arte: "sobre-personajes-dc.webp", color: "#7abaff", frase: "Figuras de DC para el álbum de personajes." },
  { id: "star-wars", nombre: "Personajes · Star Wars", arte: "sobre-personajes-star-wars.webp", color: "#42d4e8", frase: "Figuras de Star Wars para el álbum de personajes." },
  { id: "harry-potter", nombre: "Personajes · Harry Potter", arte: "sobre-personajes-harry-potter.webp", color: "#d996e8", frase: "Figuras de Harry Potter para el álbum de personajes." },
];

/**
 * Sobres de la tienda v2 (Maestro v1.73, 28 nov). Igual que privado.sobres_alv en 058_tienda_v2.sql (una prueba compara).
 * Todos traen personajes de cualquier saga: la portada de saga es solo una variante visual del sobre de personajes.
 * Cada ranura es una carta: «cualquiera» sale personaje 40 %, accesorio 35 % o comodín 25 %. Nada se repite con lo que ya tienes;
 * si ya no quedan personajes nuevos sale un accesorio, y si tampoco, un comodín.
 */
export type IdSobreAlv = "basico" | "accesorios" | "comodines" | "personajes" | "mixto" | "epico";
export type RanuraSobre = "personaje" | "accesorio" | "comodin" | "cualquiera";
export interface SobreAlv {
  id: IdSobreAlv; nombre: string; precio: number; arte: string; color: string; frase: string;
  ranuras: RanuraSobre[];
  /** Pesos por rareza de cada personaje o accesorio. */
  pesos: Record<RarezaSobre, number>;
  /** La última carta asegura esta rareza si no salió antes. */
  minimo?: RarezaSobre;
}
export const PROB_CUALQUIERA = { personaje: 0.4, accesorio: 0.35, comodin: 0.25 } as const;
export const SOBRES_ALV: SobreAlv[] = [
  { id: "basico", nombre: "Sobre básico", precio: 60, arte: "sobre-basico.webp", color: "#3fb6ff", ranuras: ["cualquiera"],
    pesos: { rara: 80, epica: 17, legendaria: 3 }, frase: "Una carta al azar: personaje, accesorio o comodín." },
  { id: "accesorios", nombre: "Sobre de accesorios", precio: 120, arte: "sobre-accesorios-v2.webp", color: "#2ee6c5", ranuras: ["accesorio", "accesorio"],
    pesos: { rara: 75, epica: 20, legendaria: 5 }, frase: "Dos piezas sueltas de trajes especiales para tu personaje." },
  { id: "comodines", nombre: "Sobre de comodines", precio: 150, arte: "sobre-comodines-v2.webp", color: "#ff3fb4", ranuras: ["comodin", "comodin", "comodin"],
    pesos: { rara: 100, epica: 0, legendaria: 0 }, frase: "Tres comodines para salvarte en la partida." },
  { id: "personajes", nombre: "Sobre de personajes", precio: 180, arte: "sobre-personajes-marvel.webp", color: "#fc694e", ranuras: ["personaje", "personaje"],
    pesos: { rara: 75, epica: 20, legendaria: 5 }, frase: "Dos personajes de cualquier saga." },
  { id: "mixto", nombre: "Sobre mixto", precio: 200, arte: "sobre-mixto.webp", color: "#b06bff", ranuras: ["personaje", "accesorio", "comodin"],
    pesos: { rara: 70, epica: 24, legendaria: 6 }, frase: "Un personaje, un accesorio y un comodín." },
  { id: "epico", nombre: "Sobre épico", precio: 380, arte: "sobre-epico-v2.webp", color: "#ffb21f", ranuras: ["personaje", "personaje", "personaje"],
    pesos: { rara: 50, epica: 38, legendaria: 12 }, minimo: "epica", frase: "Tres personajes, mínimo uno épico." },
];
export const sobreAlvPorId = (id: string) => SOBRES_ALV.find(s => s.id === id) ?? null;

/** Garantía anti-mala-racha: al sobre número N sin esa rareza, una pieza sale de esa rareza o mejor. */
export const GARANTIA = { epica: 8, legendaria: 25 } as const;

// ---------- Comodines ----------
export interface ComodinTienda { id: string; nombre: string; efecto: string; especial: boolean; icono: string; arte?: string; trampa?: boolean; reposicion: number }
const BASICOS: ComodinTienda[] = [
  { id: "turno", nombre: "Pasa turno", efecto: "Tu turno pasa al siguiente jugador.", especial: false, icono: "⏭️", arte: "carta-pasa-turno.webp", reposicion: 65 },
  { id: "cambio", nombre: "Cambio de pregunta", efecto: "Cambia la carta que te tocó por otra.", especial: false, icono: "🔄", arte: "carta-cambio-pregunta.webp", reposicion: 75 },
];

const cartaEnPreparacion = (id: string, nombre: string, efecto: string, icono: string, reposicion: number, familia: "normal" | "especial" | "trampa" = "normal"): ComodinTienda =>
  ({ id, nombre, efecto, icono, reposicion, especial: familia !== "normal", trampa: familia === "trampa", arte: "carta-" + id + ".webp" });

const NUEVOS = [
  cartaEnPreparacion("escudo", "Escudo", "Cancela un castigo que ya te asignaron.", "🛡️", 85),
  cartaEnPreparacion("salvavidas", "Salvavidas", "Cancela el castigo de otra persona o líbrala de ser mesero.", "◉", 95, "especial"),
  cartaEnPreparacion("relevo", "Relevo", "Elige a otra persona para que cumpla tu castigo.", "⇢", 100, "especial"),
  cartaEnPreparacion("doble-castigo", "Doble castigo", "El siguiente castigo compatible de la persona que elijas se cumple dos veces.", "×2", 115, "trampa"),
  cartaEnPreparacion("mesero", "Cambio de mesero", "Pasa el delantal de mesero a otra persona.", "♢", 85, "especial"),
  cartaEnPreparacion("suerte", "¿Voy a tener suerte?", "Al azar, tu reto o castigo se suaviza, se duplica, se anula, pasa a otra persona o lo cumple toda la mesa.", "✦", 130, "especial"),
  cartaEnPreparacion("prorroga", "Prórroga", "Añade tiempo a tu reto antes de que venza el reloj.", "⌛", 65),
  cartaEnPreparacion("segundo-intento", "Segundo intento", "Repite una vez un reto compatible antes de registrar el fallo.", "↶", 75),
  cartaEnPreparacion("rebaja", "Rebaja", "Reduce a la mitad el tiempo o las repeticiones de tu reto o castigo.", "½", 80),
  cartaEnPreparacion("dos-caminos", "Dos caminos", "La app te muestra dos retos compatibles. Elige cuál cumplir.", "⑂", 95, "especial"),
  cartaEnPreparacion("mano-amiga", "Mano amiga", "Invita a otra persona a ayudarte en un reto que admita parejas.", "✦", 90, "especial"),
  cartaEnPreparacion("rebote", "Rebote", "Devuelve una carta dirigida contra ti si su efecto admite ese objetivo.", "↪", 120, "trampa"),
  cartaEnPreparacion("contrarreloj", "Contrarreloj", "Reduce el tiempo del próximo reto compatible de la persona que elijas.", "◷", 95, "trampa"),
  cartaEnPreparacion("candado", "Candado", "Bloquea el próximo comodín dirigido contra ti durante esta ronda.", "🔒", 105, "trampa"),
  cartaEnPreparacion("pista-extra", "Pista extra", "Revela una pista de tu pregunta si hay una disponible.", "⌕", 65),
  cartaEnPreparacion("duelo-dados", "Duelo de dados", "Reta a otra persona a tirar los dados. Quien pierda cumple el reto que mostró la app.", "⚄", 110, "especial"),
];
/** Comodines a la venta y en sobres: los 18 (Elías, 27 nov, Maestro v1.67). Igual que las migraciones 036 y 052.
 *  En el sobre todos salen con la misma probabilidad, como en el servidor. */
export const COMODINES: ComodinTienda[] = [...BASICOS, ...NUEVOS];
export const comodinPorId = (id: string) => COMODINES.find(c => c.id === id) ?? null;
/** Máximo por tipo; si ya lo tienes, esa carta se cambia por monedas. */
export const TOPE_COMODIN = 9;
export const MONEDAS_SI_TOPE = 10;

// ---------- Monedas ----------
/** Por juego terminado: participar + bono por lugar con la regla de podio de la XP. Tope diario y regalo de bienvenida. */
export const MONEDAS = { participar: 10, lugar: [8, 5, 3], topeDia: 300, bienvenida: 150 } as const;
/** Saldo con que arranca la demostración (sin nube). */
export const MONEDAS_DEMO = 600;

// ---------- Piezas que pueden salir ----------
/** Sección de cada pieza bloqueada, para filtrar sobres y armar la colección. */
export function seccionDe(id: string): Seccion {
  if (id.startsWith("MOM_")) return "momentos";
  if (id.startsWith("HAIR_")) return "pelo";
  if (id.startsWith("HELM_") || /^FACE_01[2-5]$/.test(id)) return "casco";
  if (id.startsWith("FACE_")) return "rostro";
  if (id.startsWith("DETAIL_")) return "detalle";
  if (id.startsWith("NECK_") || id.startsWith("CAPE_")) return "cuello";
  if (id.startsWith("PRINT_")) return "torso";
  return "objeto";
}
export const NOMBRE_SECCION: Record<Seccion, string> = {
  pelo: "Pelo", casco: "Cascos y máscaras", rostro: "Rostros", detalle: "Detalles", cuello: "Cuello y capa",
  torso: "Torsos", objeto: "Objetos", momentos: "Momentos",
};
export const ORDEN_SECCIONES: Seccion[] = ["pelo", "casco", "rostro", "detalle", "cuello", "torso", "objeto", "momentos"];

/** Todas las piezas que se coleccionan (las bloqueadas de rarezas.ts). */
export const PIEZAS_COLECCION: { id: string; rareza: RarezaSobre; seccion: Seccion }[] = Object.entries(RAREZA)
  .filter((e): e is [string, RarezaSobre] => e[1] !== "comun")
  .map(([id, rareza]) => ({ id, rareza, seccion: seccionDe(id) }));

/** Piezas que puede traer un sobre. */
export const piezasDeSobre = (s: Sobre) => PIEZAS_COLECCION.filter(p => !s.secciones || s.secciones.includes(p.seccion));
