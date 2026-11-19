// Catálogo de personajes originales del personalizador (plan de 3 modos, decisión de Elías del 2026-11-19).
// saga → grupo → personaje → versión. Cada versión con figura apunta a un traje de `trajes-figura.json` (ahí vive la
// figura completa, que se carga aparte). Las versiones sin `traje` todavía no tienen piezas: salen como «Próximamente» (desde la etapa 5 todas lo tienen).
// Los personajes que no están aquí (oficios, Loki, Dumbledore…) siguen en la biblioteca, pero no se muestran (D4).

export interface Version { id: string; nombre: string; /** id en trajes-figura.json; sin él, «Próximamente». */ traje?: string }
export interface Personaje { id: string; nombre: string; versiones: Version[] }
export interface Grupo { id: string; nombre: string; personajes: Personaje[] }
export interface Saga { id: string; nombre: string; color: string; grupos: Grupo[] }

const p = (id: string, nombre: string, ...versiones: Version[]): Personaje => ({ id, nombre, versiones });
const v = (id: string, nombre: string, traje?: string): Version => ({ id, nombre, traje });

export const SAGAS: Saga[] = [
  { id: "marvel", nombre: "Marvel", color: "#c91a09", grupos: [
    { id: "avengers", nombre: "Avengers", personajes: [
      p("iron-man", "Iron Man", v("iron-man", "Clásico", "iron-man"), v("iron-man-mark-7", "Mark 7", "iron-man-mark-7-armor-red-panels-013393")),
      p("capitan-america", "Capitán América", v("capitan-america", "Clásico", "capitan-america"), v("capitan-america-casco", "Con casco", "captain-america-with-dark-blue-suit-helm-013390")),
      p("thor", "Thor", v("thor", "Clásico", "thor"), v("thor-capa-roja", "Capa roja", "thor-tan-hair-black-armor-red-cape-012329")),
      p("hulk", "Hulk", v("hulk", "Clásico", "hulk")),
      p("spider-man", "Spider-Man", v("spider-man", "Clásico de cómic", "spider-man"), v("iron-spider", "Iron Spider", "iron-spider"), v("spider-man-pelicula", "Película", "spider-man-pelicula")),
    ] },
    { id: "x-men", nombre: "X-Men", personajes: [
      p("wolverine", "Wolverine", v("wolverine", "Clásico", "wolverine")),
      p("ciclope", "Cíclope", v("ciclope", "Clásico", "ciclope")),
      p("gambito", "Gambito", v("gambito", "Clásico", "gambito")),
      p("magneto", "Magneto", v("magneto", "Clásico", "magneto")),
      p("tormenta", "Tormenta", v("tormenta", "Clásico", "tormenta")),
    ] },
  ] },
  { id: "dc", nombre: "DC Comics", color: "#1d3f8f", grupos: [
    { id: "dc", nombre: "DC Comics", personajes: [
      p("batman", "Batman", v("batman", "Dark Knight", "batman"), v("the-batman", "The Batman", "the-batman")),
      p("superman", "Superman", v("superman", "Clásico", "superman")),
      p("wonder-woman", "Wonder Woman", v("wonder-woman", "Clásico", "mujer-maravilla")),
      p("flash", "Flash", v("flash", "Clásico", "flash")),
      p("joker", "Joker", v("joker", "Clásico", "joker")),
    ] },
  ] },
  { id: "star-wars", nombre: "Star Wars", color: "#1b2a34", grupos: [
    { id: "star-wars", nombre: "Star Wars", personajes: [
      p("darth-vader", "Darth Vader", v("darth-vader", "Clásico", "darth-vader")),
      p("luke", "Luke Skywalker", v("luke", "Clásico", "luke")),
      p("yoda", "Yoda", v("yoda", "Clásico", "yoda")),
      p("mandalorian", "Mandalorian", v("mandalorian", "Clásico", "mandalorian")),
      p("boba-fett", "Boba Fett", v("boba-fett", "Clásico", "boba-fett")),
    ] },
  ] },
  { id: "harry-potter", nombre: "Harry Potter", color: "#7a1f2b", grupos: [
    { id: "harry-potter", nombre: "Harry Potter", personajes: [
      p("harry", "Harry", v("harry", "Clásico", "harry-potter")),
      p("hermione", "Hermione", v("hermione", "Clásico", "hermione-granger")),
      p("ron", "Ron", v("ron", "Clásico", "ron-weasley")),
      p("voldemort", "Voldemort", v("voldemort", "Clásico", "voldemort")),
      p("snape", "Snape", v("snape", "Clásico", "severus-snape")),
    ] },
  ] },
];

export const listo = (x: Version) => !!x.traje;
/** Versiones que ya se pueden poner. */
export const versionesListas = (pj: Personaje) => pj.versiones.filter(listo);
/** Todos los ids de trajes que usa el catálogo (una prueba revisa que existan en trajes-figura.json). */
export const trajesUsados = () => SAGAS.flatMap(s => s.grupos.flatMap(g => g.personajes.flatMap(pj => pj.versiones.flatMap(x => (x.traje ? [x.traje] : [])))));

/**
 * Piezas «originales» (de personaje): en Avanzado van en su repisa y no en «Piezas comunes», y en Básico no salen.
 * Torsos con dibujo de personaje, máscaras, cascos de personaje y el escudo del Capitán.
 */
export const PIEZAS_ORIGINALES = new Set([
  "PRINT_001", "PRINT_002", "PRINT_003", "PRINT_004", "PRINT_005", "PRINT_006", "PRINT_007", "PRINT_008", "PRINT_009", "PRINT_011",
  "PRINT_021", "PRINT_022", "PRINT_023",
  "FACE_012", "FACE_013", "FACE_014", "FACE_015",
  "HELM_012", "HELM_015",
  "ACC_004",
  // Personajes nuevos (2026-11-19): sus torsos, rostros, cascos, la cabeza de Yoda y el sable de luz
  "PRINT_024", "PRINT_025", "PRINT_026", "PRINT_027", "PRINT_028", "PRINT_029", "PRINT_030", "PRINT_031", "PRINT_032", "PRINT_033",
  "PRINT_034", "PRINT_035", "PRINT_036", "PRINT_037",
  "FACE_016", "FACE_017", "FACE_018", "FACE_019",
  "HELM_016", "HELM_017", "HELM_018", "HELM_019", "HEAD_003", "ACC_013",
]);
export const esOriginal = (id: string | null | undefined) => !!id && PIEZAS_ORIGINALES.has(id);
