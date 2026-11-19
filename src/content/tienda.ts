// Tienda de ALV (Maestro v1.48, enfoque A; valores aprobados por Elías en v1.49). Precios y probabilidades
// se pueden ajustar después de probar con jugadores. Plan completo en ALV_PLAN_TIENDA.md (fuera del repo).
// Cuando exista la migración de la tienda, sus datos se generan de aquí y una prueba compara las dos.
import { RAREZA, type Rareza } from "./rarezas";

export type IdSobre = "basico" | "accesorios" | "comodines" | "mixto" | "epico";
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

export type Seccion = "pelo" | "casco" | "rostro" | "detalle" | "cuello" | "torso" | "objeto" | "momentos";

export const SOBRES: Sobre[] = [
  { id: "basico", nombre: "Sobre básico", precio: 50, arte: "sobre-basico.webp", piezas: 2, comodines: 0,
    pesos: { rara: 88, epica: 11, legendaria: 1 }, color: "#3fb6ff", frase: "Dos piezas para empezar tu colección." },
  { id: "accesorios", nombre: "Sobre de accesorios", precio: 120, arte: "sobre-accesorios.webp", piezas: 3, comodines: 0,
    pesos: { rara: 65, epica: 28, legendaria: 7 }, secciones: ["casco", "detalle", "cuello", "objeto"], color: "#2ee6c5",
    frase: "Cascos, lentes, cuellos, capas y objetos." },
  { id: "comodines", nombre: "Sobre de comodines", precio: 150, arte: "sobre-comodines.webp", piezas: 0, comodines: 3,
    pesos: { rara: 0, epica: 0, legendaria: 0 }, color: "#ff3fb4", frase: "Tres comodines para salvarte en la partida." },
  { id: "mixto", nombre: "Sobre mixto", precio: 180, arte: "sobre-mixto.webp", piezas: 2, comodines: 2,
    pesos: { rara: 60, epica: 32, legendaria: 8 }, color: "#b06bff", frase: "Dos piezas y dos comodines." },
  { id: "epico", nombre: "Sobre épico", precio: 200, arte: "sobre-epico.webp", piezas: 3, comodines: 0,
    pesos: { rara: 40, epica: 45, legendaria: 15 }, minimo: "epica", color: "#ffb21f", frase: "Tres piezas, mínimo una épica." },
];
export const sobrePorId = (id: string) => SOBRES.find(s => s.id === id) ?? null;

/** Garantía anti-mala-racha: al sobre número N sin esa rareza, una pieza sale de esa rareza o mejor. */
export const GARANTIA = { epica: 8, legendaria: 25 } as const;

// ---------- Comodines ----------
export interface ComodinTienda { id: string; nombre: string; efecto: string; especial: boolean; icono: string; porConfirmar?: boolean }
/** Comodines a la venta (Maestro v1.49: solo los de efecto definido en 6A.4). Ids iguales a CARTAS_PODER de catalogo.ts.
 *  Escudo y los especiales entran cuando Elías los confirme; mientras, el sobre de comodines trae solo básicos. */
export const COMODINES: ComodinTienda[] = [
  { id: "turno", nombre: "Pasa turno", efecto: "Tu turno pasa al siguiente jugador.", especial: false, icono: "⏭️" },
  { id: "cambio", nombre: "Cambio de pregunta", efecto: "Cambia la carta que te tocó por otra.", especial: false, icono: "🔄" },
];
export const comodinPorId = (id: string) => COMODINES.find(c => c.id === id) ?? null;
/** Probabilidad de que un comodín salga especial (0 mientras no haya especiales a la venta). */
export const PESO_ESPECIAL = 0;
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
