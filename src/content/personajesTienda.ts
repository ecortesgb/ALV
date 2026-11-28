import type { Rareza } from "./rarezas";
import type { RarezaSobre } from "./tienda";

export const PRECIO_POR_CARTA_PERSONAJE = 80;
export const CARTAS_POR_SOBRE_PERSONAJES = 3;
export const PRECIO_PERSONAJE = { rara: 260, epica: 360, legendaria: 520 } as const;
export const PESO_PERSONAJE = { rara: 100, epica: 30, legendaria: 8 } as const;
export const SUPLEMENTO_BIGFIG = 40;
export const PRECIO_ACCESORIO = { rara: 90, epica: 130, legendaria: 180 } as const;

// Generado del catálogo v3 (28 nov, Maestro v1.73). Igual que supabase/migrations/058_tienda_v2.sql.
// Solo los básicos quedan libres; los demás se venden. Lo que no está en la lista es raro.
const INICIALES = new Set([
  "batman", "bugs-bunny", "capitan-america-clasico", "ciclope", "cristiano-ronaldo", "darth-vader", "harry-potter",
  "hermione-granger", "homero-simpson", "hulk", "iron-man-clasico", "lionel-messi", "luke-skywalker", "mickey-mouse",
  "mujer-maravilla", "peter-parker", "ron-weasley", "spider-man", "superman", "thor", "tormenta", "wolverine",
  "yoda",
]);
const LEGENDARIOS = new Set([
  "batman-logo-dorado", "cristiano-ronaldo-madrid-2018", "darth-maul", "doctor-doom", "elsa", "emperador-palpatine",
  "fenix-oscura", "ghost-rider", "homelander", "hulkbuster", "iron-man-mk42", "jack-sparrow",
  "joker-caballero-oscuro", "mace-windu", "magneto", "omni-man", "silver-surfer", "sonic", "superman-ojos-rojos",
  "thanos", "venom-grande", "voldemort",
]);
const EPICOS = new Set([
  "abominacion", "anakin-skywalker", "batman-excalibur", "batman-gris-claro", "batman-gris-oscuro",
  "batman-logo-amarillo", "batman-returns", "baymax", "bellatrix-lestrange", "black-panther", "bruja-malvada",
  "c-3po", "carnage", "coloso", "cristiano-ronaldo-united-2008", "darth-vader-minifig", "deadpool", "doc-brown",
  "doctor-strange", "duende-verde-ultimate", "edna-moda", "et", "fenix", "gamora", "gizmo", "groot", "han-solo",
  "harley-quinn", "harry-potter-chamarra-abierta", "harry-potter-chamarra-azul", "harry-potter-dimensions",
  "harry-potter-quidditch", "hermione-chamarra", "hulk-rojo", "iron-man-mk42-minifig", "iron-man-mk6", "iron-spider",
  "jango-fett", "joker-clasico", "juggernaut", "kingpin", "krusty", "kylian-mbappe", "la-mole", "lagarto", "loki",
  "loki-minifig", "mandaloriano", "marceline", "marty-mcfly", "marvin-marciano", "miles-morales",
  "monstruo-galletas", "mr-increible", "mujer-maravilla-clasica", "rino", "robin-dimensions", "rocket",
  "sheldon-cooper", "soldado-del-invierno-minifig", "spider-gwen", "spider-man-minifig", "spider-man-negro",
  "spider-man-simbionte", "star-lord", "taz", "thor-minifig", "tormenta-minifig", "vampiro", "venom",
  "vinicius-junior", "voldemort-dimensions", "wolverine-mascara",
]);

export const rarezaPersonaje = (id: string): Rareza => INICIALES.has(id) ? "comun" : LEGENDARIOS.has(id) ? "legendaria" : EPICOS.has(id) ? "epica" : "rara";
export interface PersonajeEnVenta { id: string; saga: string; rareza: RarezaSobre; precio: number }

export function precioSobrePersonajes(restantes: number) {
  return Math.min(CARTAS_POR_SOBRE_PERSONAJES, restantes) * PRECIO_POR_CARTA_PERSONAJE;
}

export function ofertasPersonajes(tarjetas: readonly { id: string; saga: string; tamano: string }[]): PersonajeEnVenta[] {
  return tarjetas.flatMap(({ id, saga, tamano }) => {
    const rareza = rarezaPersonaje(id);
    return rareza === "comun" ? [] : [{ id, saga, rareza, precio: PRECIO_PERSONAJE[rareza] + (tamano === "grande" ? SUPLEMENTO_BIGFIG : 0) }];
  });
}
