// Ilustraciones de los juegos y escenarios para las tarjetas del configurador (archivos en `public/arte/`).
// Un juego sin ilustración se dibuja con rayos de cómic y su emoji. Solo datos.
/** Juego → archivo dentro de `public/arte/`. Se agregan conforme se generan. Las de Elías (18 nov) traen el nombre dibujado abajo. */
export const ARTE_JUEGOS = {
    impostor: "juegos/impostor.webp",
    "verdad-reto": "juegos/verdad-reto.webp",
    mimica: "juegos/mimica.webp",
    "que-prefieres": "juegos/que-prefieres.webp",
    "mas-probable": "juegos/mas-probable.webp",
    "yo-nunca": "juegos/yo-nunca.webp",
    conoces: "juegos/conoces.webp",
    // Trivia ALV todavía no está en el catálogo del motor (Maestro 16.8, 6A): la imagen queda lista para cuando se construya.
    trivia: "juegos/trivia.webp",
};
/** Tipo de partida → ilustración (las 4 de Elías, recortadas dentro de su marco; el marco lo dibuja la app). */
export const ARTE_TIPOS = {
    individual: "tipos/individual.webp", parejas: "tipos/parejas.webp", equipos: "tipos/equipos.webp", sexos: "tipos/sexos.webp",
};
/** Escenario → archivo dentro de `public/arte/` (tarjeta del configurador). */
export const ARTE_ESCENARIOS = {
    ciudad: "ciudad-noche-1100.webp",
    alverca: "escenario-alberca-1100.webp",
    fogata: "escenario-patio-fogata-1100.webp",
    parque: "escenario-cancha-1100.webp",
};
/** Escenario → nombre base del fondo de pantalla (`-1920.webp` y `-1100.webp`). Sin imagen = ciudad según la hora. */
export const FONDO_ESCENARIO = {
    alverca: "escenario-alberca",
    fogata: "escenario-patio-fogata",
    parque: "escenario-cancha",
};
export const EMOJI_JUEGO = {
    bienvenida: "👋", "verdad-reto": "🔥", conoces: "💞", mimica: "🎭", prohibida: "🤐", impostor: "🕵️",
    "reto-lugar": "🏅", lista: "⚡", reloj: "🍾", "yo-nunca": "🙊", "mas-probable": "👉", "que-prefieres": "🤔",
    ruleta: "🎡", "dados-hot": "🎲", fisico: "💪",
};
