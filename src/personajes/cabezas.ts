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
]);

/** Personajes cuyas piezas no se ofrecen: su cabeza gigante va en el torso y se encima con la cabeza normal. */
export const DONANTES_FUERA: ReadonlySet<Id> = new Set(["modok"]);

/** Versión minifigura de una figura grande: al cambiarle una pieza, la figura pasa a ser esa (Hulk → Bruce Banner). */
export const VERSION_MINIFIG: Readonly<Record<Id, Id>> = { hulk: "bruce-banner" };
