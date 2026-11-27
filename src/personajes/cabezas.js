export const CABEZAS_CON_CARA = new Set([
    "anakin-skywalker", "aquaman", "arcangel", "batman", "batman-returns", "blade", "bruce-wayne", "capitan-america",
    "capitan-america-clasico", "carnage", "ciclope", "coulson", "darth-maul", "darth-vader", "dientes-de-sable",
    "doctor-doom", "flash", "gambito", "harry-potter", "havok", "hermione-granger", "iron-fist", "iron-man-clasico",
    "jango-fett", "jean-grey", "joker", "joker-caballero-oscuro", "loki", "luke-skywalker", "malekith", "mandaloriano",
    "mujer-maravilla", "nick-fury", "robin", "robin-lego-batman", "ron-weasley", "ronan", "shocker", "spider-man",
    "superior-spider-man", "superman", "taskmaster", "voldemort", "yoda",
]);
/** Personajes cuyas piezas no se ofrecen: su cabeza gigante va en el torso y se encima con la cabeza normal. */
export const DONANTES_FUERA = new Set(["modok"]);
/** Versión minifigura de una figura grande: al cambiarle una pieza, la figura pasa a ser esa (Hulk → Bruce Banner). */
export const VERSION_MINIFIG = { hulk: "bruce-banner" };
