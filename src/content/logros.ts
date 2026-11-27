// Logros de la etapa 1 (ALV_PLAN_RANKING_LOGROS.md §8.1; Maestro v1.54, 14.3). La fuente de verdad es la tabla
// public.logros de las migraciones 042 y 041 («Campeón»); esta copia sirve para el modo demostración y una prueba la compara con la 042.
// Los logros NO dan XP ni monedas (D0): la recompensa es la insignia.
export type Rareza = "comun" | "rara" | "epica" | "legendaria";
export type CategoriaLogro = "coleccion" | "minijuego" | "colectivo" | "oculto" | "progresion";

export interface DefLogro {
  clave: string; categoria: CategoriaLogro; juego: string | null; rareza: Rareza; nombre: string; descripcion: string;
  meta: number; recompensa: string; orden: number; oculto?: boolean; pista?: string;
}

export const LOGROS_ETAPA1: DefLogro[] = [
  { clave: "primeros-pasos", categoria: "coleccion", juego: null, rareza: "comun", nombre: "Primeros pasos", descripcion: "Termina tu primera partida.", meta: 1, recompensa: "Insignia común", orden: 10 },
  { clave: "primera-victoria", categoria: "coleccion", juego: null, rareza: "comun", nombre: "Primera sangre", descripcion: "Gana tu primera partida.", meta: 1, recompensa: "Insignia común", orden: 20 },
  { clave: "noche-completa", categoria: "coleccion", juego: null, rareza: "comun", nombre: "Noche completa", descripcion: "Juega 5 partidas en una misma noche.", meta: 5, recompensa: "Insignia común", orden: 30 },
  { clave: "polifacetico", categoria: "coleccion", juego: null, rareza: "rara", nombre: "Polifacético", descripcion: "Prueba 10 juegos distintos.", meta: 10, recompensa: "Insignia rara", orden: 40 },
  { clave: "estratega", categoria: "coleccion", juego: null, rareza: "rara", nombre: "El estratega", descripcion: "Gana 10 partidas de deducción.", meta: 10, recompensa: "Insignia rara", orden: 50 },
  { clave: "suertudo", categoria: "coleccion", juego: null, rareza: "rara", nombre: "Hijo de la suerte", descripcion: "Gana 10 partidas de azar.", meta: 10, recompensa: "Insignia rara", orden: 60 },
  { clave: "mvp", categoria: "coleccion", juego: null, rareza: "rara", nombre: "MVP", descripcion: "Sé el MVP de 5 partidas.", meta: 5, recompensa: "Insignia rara", orden: 70 },
  { clave: "imparable", categoria: "coleccion", juego: null, rareza: "epica", nombre: "Imparable", descripcion: "Gana 5 partidas seguidas.", meta: 5, recompensa: "Insignia épica", orden: 80 },
  { clave: "veterano", categoria: "coleccion", juego: null, rareza: "epica", nombre: "El veterano", descripcion: "Termina 100 partidas.", meta: 100, recompensa: "Insignia épica", orden: 90 },
  { clave: "ya-eres-parte", categoria: "colectivo", juego: null, rareza: "comun", nombre: "Ya eres parte", descripcion: "Juega con 5 personas distintas.", meta: 5, recompensa: "Insignia común", orden: 110 },
  { clave: "casa-llena", categoria: "colectivo", juego: null, rareza: "rara", nombre: "Casa llena", descripcion: "Termina una partida con 8 jugadores.", meta: 1, recompensa: "Insignia rara", orden: 120 },
  { clave: "popular", categoria: "colectivo", juego: null, rareza: "epica", nombre: "Popular", descripcion: "Juega con 15 personas distintas.", meta: 15, recompensa: "Insignia épica", orden: 130 },
  { clave: "dupla", categoria: "colectivo", juego: null, rareza: "rara", nombre: "La dupla perfecta", descripcion: "Gana 5 partidas con la misma pareja.", meta: 5, recompensa: "Insignia rara", orden: 140 },
  { clave: "los-de-siempre", categoria: "colectivo", juego: null, rareza: "epica", nombre: "Los de siempre", descripcion: "Juega 20 partidas con el mismo equipo.", meta: 20, recompensa: "Insignia épica", orden: 150 },
  { clave: "campeon-noche", categoria: "colectivo", juego: null, rareza: "rara", nombre: "Campeón de la noche", descripcion: "Gana la copa individual de una noche.", meta: 1, recompensa: "Insignia rara", orden: 160 },
  { clave: "campeon", categoria: "colectivo", juego: null, rareza: "legendaria", nombre: "Campeón", descripcion: "Gana un torneo.", meta: 1, recompensa: "Insignia legendaria", orden: 170 },
  { clave: "cara-de-poker", categoria: "minijuego", juego: "impostor", rareza: "rara", nombre: "Cara de póker", descripcion: "Gana una partida siendo el impostor.", meta: 1, recompensa: "Insignia rara", orden: 210 },
  { clave: "detective", categoria: "minijuego", juego: "impostor", rareza: "comun", nombre: "Detective", descripcion: "Vota por el impostor 5 veces.", meta: 5, recompensa: "Insignia común", orden: 220 },
  { clave: "valiente", categoria: "minijuego", juego: "verdad-reto", rareza: "comun", nombre: "Valiente", descripcion: "Elige reto 10 veces en Verdad o reto.", meta: 10, recompensa: "Insignia común", orden: 230 },
  // Etapa 2 (migración 043): ocultos y de progresión.
  { clave: "remontada", categoria: "oculto", juego: null, rareza: "epica", oculto: true, nombre: "¿Y tú qué haces aquí?", descripcion: "Gana una partida después de ir en último lugar.", pista: "Nunca te des por vencido.", meta: 1, recompensa: "Insignia épica", orden: 310 },
  { clave: "sospechoso", categoria: "oculto", juego: "impostor", rareza: "rara", oculto: true, nombre: "El sospechoso habitual", descripcion: "Recibe votos de impostor en 5 partidas sin serlo.", pista: "Algo en tu cara no convence.", meta: 5, recompensa: "Insignia rara", orden: 320 },
  { clave: "intocable", categoria: "oculto", juego: "impostor", rareza: "epica", oculto: true, nombre: "El intocable", descripcion: "Gana 3 partidas siendo el impostor.", pista: "Mentir se te da muy bien.", meta: 3, recompensa: "Insignia épica", orden: 330 },
  { clave: "noctambulo", categoria: "oculto", juego: null, rareza: "rara", oculto: true, nombre: "El noctámbulo", descripcion: "Termina una partida entre las 3:00 y las 5:00.", pista: "La fiesta no se acaba.", meta: 1, recompensa: "Insignia rara", orden: 340 },
  { clave: "caos", categoria: "oculto", juego: null, rareza: "legendaria", oculto: true, nombre: "Caos absoluto", descripcion: "En una misma noche gana una de azar, una de deducción y una por equipos.", pista: "Hazlo todo en una sola noche.", meta: 1, recompensa: "Insignia legendaria", orden: 350 },
  { clave: "leyenda-local", categoria: "progresion", juego: null, rareza: "rara", nombre: "Leyenda local", descripcion: "Llega al nivel 10.", meta: 10, recompensa: "Insignia rara", orden: 410 },
  { clave: "alv-legendario", categoria: "progresion", juego: null, rareza: "legendaria", nombre: "ALV Legendario", descripcion: "Llega al nivel 20.", meta: 20, recompensa: "Insignia legendaria", orden: 420 },
  { clave: "campeon-temporada", categoria: "progresion", juego: null, rareza: "legendaria", nombre: "Campeón de temporada", descripcion: "Termina un mes en primer lugar por Puntos ALV.", meta: 1, recompensa: "Insignia legendaria", orden: 440 },
  { clave: "constante", categoria: "progresion", juego: null, rareza: "rara", nombre: "Constante", descripcion: "Completa 10 objetivos.", meta: 10, recompensa: "Insignia rara", orden: 430 },
  // ALV PARTY (migración 055, pendiente de aplicar).
  { clave: "pistolero", categoria: "minijuego", juego: "mj-desenfunda", rareza: "comun", nombre: "Pistolero", descripcion: "Gana 3 veces ¡Desenfunda!.", meta: 3, recompensa: "Insignia común", orden: 510 },
  { clave: "a-prueba-de-balas", categoria: "minijuego", juego: "mj-bala", rareza: "comun", nombre: "A prueba de balas", descripcion: "Gana 3 veces Esquiva la bala.", meta: 3, recompensa: "Insignia común", orden: 520 },
  { clave: "mano-de-piedra", categoria: "minijuego", juego: "mj-martillazo", rareza: "comun", nombre: "Mano de piedra", descripcion: "Gana 3 veces Martillazo.", meta: 3, recompensa: "Insignia común", orden: 530 },
  { clave: "aterrizaje-perfecto", categoria: "minijuego", juego: "mj-paracaidas", rareza: "comun", nombre: "Aterrizaje perfecto", descripcion: "Gana 3 veces Paracaídas.", meta: 3, recompensa: "Insignia común", orden: 540 },
  { clave: "sangre-fria", categoria: "minijuego", juego: "mj-alto-total", rareza: "comun", nombre: "Sangre fría", descripcion: "Gana 3 veces Alto total.", meta: 3, recompensa: "Insignia común", orden: 550 },
  { clave: "alma-de-la-party", categoria: "coleccion", juego: null, rareza: "rara", nombre: "Alma de la party", descripcion: "Juega los 5 minijuegos de ALV PARTY.", meta: 5, recompensa: "Insignia rara", orden: 560 },
];

export const RAREZA_TEXTO: Record<Rareza, string> = { comun: "Común", rara: "Rara", epica: "Épica", legendaria: "Legendaria" };
export const ORDEN_RAREZA: Record<Rareza, number> = { comun: 0, rara: 1, epica: 2, legendaria: 3 };
