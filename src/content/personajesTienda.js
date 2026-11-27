export const PRECIO_POR_CARTA_PERSONAJE = 80;
export const CARTAS_POR_SOBRE_PERSONAJES = 3;
export const PRECIO_PERSONAJE = { rara: 260, epica: 360, legendaria: 520 };
export const PESO_PERSONAJE = { rara: 100, epica: 30, legendaria: 8 };
export const SUPLEMENTO_BIGFIG = 40;
const INICIALES = new Set([
    "iron-man-clasico", "capitan-america-clasico", "thor", "hulk", "spider-man",
    "wolverine", "ciclope", "tormenta", "batman", "superman", "mujer-maravilla",
    "darth-vader", "luke-skywalker", "yoda", "harry-potter", "hermione-granger", "ron-weasley", "peter-parker",
]);
const LEGENDARIOS = new Set(["hulkbuster", "fenix-oscura", "thanos", "venom-grande", "darth-maul", "voldemort"]);
const EPICOS = new Set(["iron-man-mk42", "iron-spider", "spider-man-negro", "magneto", "fenix", "batman-returns",
    "joker-caballero-oscuro", "mandaloriano", "jango-fett"]);
export const rarezaPersonaje = (id) => INICIALES.has(id) ? "comun" : LEGENDARIOS.has(id) ? "legendaria" : EPICOS.has(id) ? "epica" : "rara";
export function precioSobrePersonajes(restantes) {
    return Math.min(CARTAS_POR_SOBRE_PERSONAJES, restantes) * PRECIO_POR_CARTA_PERSONAJE;
}
export function ofertasPersonajes(tarjetas) {
    return tarjetas.flatMap(({ id, saga, tamano }) => {
        const rareza = rarezaPersonaje(id);
        return rareza === "comun" ? [] : [{ id, saga, rareza, precio: PRECIO_PERSONAJE[rareza] + (tamano === "grande" ? SUPLEMENTO_BIGFIG : 0) }];
    });
}
