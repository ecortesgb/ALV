// Cabezas que traen la cara o una máscara impresa (Elías, 2026-11-27: en Piel solo cabezas lisas y su color; las máscaras
// van aparte). Sale de revisar los GLB del catálogo: textura de la cabeza mayor a 8×8 (las lisas son de un color) o
// figura armada con LDraw (la cara va impresa en la cabeza). Lista generada el 27 nov 2026 con
// personajes-privado/clasificacion-cabezas.json; al entregar personajes nuevos, agregarlos aquí.
import type { Id } from "./tipos";

export const CABEZAS_CON_CARA: ReadonlySet<Id> = new Set([
  "anakin-skywalker", "aquaman", "arcangel", "batman", "batman-returns", "blade", "bruce-wayne", "capitan-america",
  "capitan-america-clasico", "carnage", "ciclope", "coulson", "darth-maul", "darth-vader", "dientes-de-sable",
  "doctor-doom", "flash", "gambito", "harry-potter", "havok", "hermione-granger", "iron-fist", "iron-man-clasico",
  "jango-fett", "jean-grey", "joker", "joker-caballero-oscuro", "loki", "luke-skywalker", "malekith", "mandaloriano",
  "mujer-maravilla", "nick-fury", "robin", "robin-lego-batman", "ron-weasley", "ronan", "shocker", "spider-man",
  "superior-spider-man", "superman", "taskmaster", "voldemort", "yoda",
  // Tanda 2 (27 nov 2026): todas armadas con LDraw y cara impresa.
  "mickey-mouse", "minnie-mouse", "c-3po", "wolverine-mascara", "soldado-del-invierno-minifig", "harry-potter-quidditch",
  "baymax", "edna-moda", "thor-minifig", "spider-gwen", "batgirl", "bellatrix-lestrange", "pedro-picapiedra",
  "sheldon-cooper", "miles-morales", "han-solo", "emperador-palpatine", "mace-windu", "jack-sparrow", "elsa", "moana",
  "mr-increible", "loki-minifig", "tormenta-minifig", "lionel-messi", "cristiano-ronaldo", "kylian-mbappe",
  "vinicius-junior", "batman-excalibur", "batman-logo-dorado", "batman-gris-oscuro", "batman-gris-claro",
  "batman-logo-amarillo", "iron-man-mk42-minifig", "iron-man-mk6", "spider-man-simbionte", "spider-man-minifig",
  "harry-potter-chamarra-abierta", "harry-potter-chamarra-azul", "darth-vader-minifig", "joker-clasico",
  "cristiano-ronaldo-united-2008", "cristiano-ronaldo-madrid-2018", "omni-man", "homelander",
]);

/** Personajes ocultos en todo (taller, álbum, tienda, sobres). Nova: su modelo no trae la cara (Elías, 28 nov: «ocultarla
 *  hasta arreglarla»). Quien ya la tiene puesta la sigue viendo. En la base se apagó con 060_ocultar_nova.sql. */
export const PERSONAJES_OCULTOS: ReadonlySet<Id> = new Set(["nova"]);

/** Personajes cuyas piezas no se ofrecen: MODOK (su cabeza gigante va en el torso y se encima con la normal) y los ocultos. */
export const DONANTES_FUERA: ReadonlySet<Id> = new Set(["modok", ...PERSONAJES_OCULTOS]);

/** Versión minifigura de una figura grande: al cambiarle una pieza, la figura pasa a ser esa (Hulk → Bruce Banner). */
export const VERSION_MINIFIG: Readonly<Record<Id, Id>> = { hulk: "bruce-banner" };
