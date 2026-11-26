// Formato de personajes v3 (ALV_FORMATO_PERSONAJES_V3.md, con los ajustes de la sección 12).
// Solo tipos y constantes: sin 3D, sin DOM.

export type Id = string;
export const ID = /^[a-z0-9][a-z0-9-]{1,59}$/;
export const esId = (x: unknown): x is Id => typeof x === "string" && ID.test(x);

/** Las seis animaciones que todo personaje sabe hacer (§12.2). */
export const LOGICAS = ["reposo", "entrada", "saludo", "victoria", "derrota", "especial"] as const;
export type Logica = (typeof LOGICAS)[number];
export const esLogica = (x: unknown): x is Logica => typeof x === "string" && (LOGICAS as readonly string[]).includes(x);

export type Rig = "esqueleto" | "rigido";
export type Bando = "heroe" | "villano" | "otro";

/** Partes lógicas del cuerpo que se mapean a huesos (contrato de entrega, §3). */
export const HUESOS_LOGICOS = ["raiz", "cadera", "torso", "cuello", "cabeza", "mano_der", "mano_izq"] as const;
export type HuesoLogico = (typeof HUESOS_LOGICOS)[number];

export interface Familia {
  id: Id;
  nombre: string;
  rig: Rig;
  /** Unidades de la escena por unidad del GLB (la misma para todas las familias que salen del mismo juego). */
  escala: number;
  /** Si «Crear mi personaje» puede empezar con esta familia. */
  crear: boolean;
  /** Mapa por omisión de lógicas a clips (cada personaje lo puede pisar). */
  mapa: Partial<Record<Logica, string>>;
  /** Si falta una lógica, cuál usar en su lugar. */
  respaldo: Partial<Record<Logica, Logica>>;
}

/** Ajustes que el cargador hace al abrir un GLB del juego que no pasó por Blender. */
export interface Carga { colores_srgb: boolean; rugosidad: number | null; metal: string[] }

/** Ficha de un personaje entregado por producción (personajes-privado/CONTRATO-ENTREGA.md, §3). */
export interface Ficha {
  id: Id;
  nombre: string;
  saga: Id;
  grupo: Id;
  bando: Bando;
  familia: Id;
  rig: Rig;
  /** Ruta del GLB relativa a la carpeta de la ficha. */
  glb: string;
  fotos: { tarjeta: string; busto: string };
  huesos: Partial<Record<HuesoLogico, string>>;
  animaciones: {
    mapa: Partial<Record<Logica, string>>;
    respaldo: Partial<Record<Logica, Logica>>;
    vida: string[];
    sentado: string | null;
  };
  medidas: { altura: number; pies_en_cero: boolean; frente: "+Z" };
  carga: Carga;
  origen: { fuente: "juego" | "ldraw" | "propia"; juego?: string; personaje_juego?: string; herramienta?: string };
  publica: boolean;
  calidad: { estado: "borrador" | "jugable" | "revision" | "aprobado"; notas?: string };
}

/** Pieza puesta en la figura del jugador. `tintes`: material → id de color de su paleta. */
export interface PiezaPuesta { id: Id; var?: Id; tintes?: Record<string, Id> }

/** Figura del jugador, versión 3 (§5 del formato). Solo ids. */
export interface FiguraV3 {
  version: 3;
  familia: Id;
  origen: { tipo: "catalogo"; personaje: Id; version: Id; revision: number } | { tipo: "creado" };
  piezas: Record<string, PiezaPuesta>;
  momentos: { paquete: string | null; espera: string; victoria: string; derrota: string; punto: string };
  extensiones: { alv?: { apodo?: string; personalidad?: { perfil?: string }; animaciones?: { propias?: Record<string, string> }; editor?: "basico" | "avanzado" } } & Record<string, unknown>;
}

/** Pieza del catálogo (§3 del formato, solo lo que usan las reglas por ahora). */
export interface Pieza {
  id: Id;
  nombre: string;
  familia: Id;
  parte: Parte;
  /** Hueso lógico donde se pega (extras) o parte del cuerpo que reemplaza. */
  anclaje?: HuesoLogico;
  glb: string;
  clase: string[];
  ocupa: string[];
  requiere: string[];
  excluye: string[];
  basico: boolean;
  publica: boolean;
  tintes?: { material: string; paleta: Id }[];
}

/** Partes del constructor. El básico las muestra en 4 pestañas: Cabeza (cabeza, cara, cabello), Torso,
 *  Brazos y manos (brazos, manos) y Piernas (cadera, piernas). CONTRATO-ENTREGA.md §6. */
export const PARTES_BASICO = ["cabeza", "cara", "cabello", "torso", "brazos", "manos", "cadera", "piernas"] as const;
export const PESTANAS_BASICO: Record<"cabeza" | "torso" | "brazos" | "piernas", readonly (typeof PARTES_BASICO)[number][]> = {
  cabeza: ["cabeza", "cara", "cabello"], torso: ["torso"], brazos: ["brazos", "manos"], piernas: ["cadera", "piernas"],
};
export const PARTES_AVANZADO = ["sombrero", "mascara", "capa", "mochila", "armadura", "accesorio", "arma", "efecto"] as const;
export type Parte = (typeof PARTES_BASICO)[number] | (typeof PARTES_AVANZADO)[number];
export const esParte = (x: unknown): x is Parte =>
  typeof x === "string" && ((PARTES_BASICO as readonly string[]).includes(x) || (PARTES_AVANZADO as readonly string[]).includes(x));

/** Lo que la app le manda al motor (iframe). El motor no ve la figura ni el catálogo (§7). */
export interface Plano {
  id: string;
  familia: Id;
  rig: Rig;
  /** URL ya resuelta del GLB del cuerpo o del personaje completo. */
  glb: string;
  escala: number;
  huesos: Partial<Record<HuesoLogico, string>>;
  /** Cada lógica ya resuelta a un clip del GLB (con su respaldo aplicado). Sin clip: no está. */
  clips: Partial<Record<Logica, string>>;
  vida: string[];
  sentado: string | null;
  carga: Carga;
  /** Piezas que cambian ranuras del cuerpo base: de `glb` se toman solo las mallas de esas `ranuras` y se pegan al
   *  esqueleto del base (mismos nombres de hueso); las mallas del base en esas ranuras se esconden. */
  piezas: PiezaPlano[];
}

/** Cómo se tiñe una pieza: `material` = nombre de material (o "*" = todos los de la pieza); `hex` ya resuelto. */
export interface TintePlano { material: string; hex: string }
export interface PiezaPlano { glb: string; ranuras: string[]; tintes: TintePlano[] }
