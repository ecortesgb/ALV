// Logros de la etapa 1 (ALV_PLAN_RANKING_LOGROS.md §8.1; Maestro v1.54, 14.3). La fuente de verdad es la tabla
// public.logros de la migración 042; esta copia sirve para el modo demostración y una prueba la compara con la 042.
// Los logros NO dan XP ni monedas (D0): la recompensa es la insignia.
export type Rareza = "comun" | "rara" | "epica" | "legendaria";
export type CategoriaLogro = "coleccion" | "minijuego" | "colectivo" | "oculto" | "progresion";

export interface DefLogro {
  clave: string; categoria: CategoriaLogro; juego: string | null; rareza: Rareza; nombre: string; descripcion: string;
  meta: number; recompensa: string; orden: number;
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
  { clave: "cara-de-poker", categoria: "minijuego", juego: "impostor", rareza: "rara", nombre: "Cara de póker", descripcion: "Gana una partida siendo el impostor.", meta: 1, recompensa: "Insignia rara", orden: 210 },
  { clave: "detective", categoria: "minijuego", juego: "impostor", rareza: "comun", nombre: "Detective", descripcion: "Vota por el impostor 5 veces.", meta: 5, recompensa: "Insignia común", orden: 220 },
  { clave: "valiente", categoria: "minijuego", juego: "verdad-reto", rareza: "comun", nombre: "Valiente", descripcion: "Elige reto 10 veces en Verdad o reto.", meta: 10, recompensa: "Insignia común", orden: 230 },
];

export const RAREZA_TEXTO: Record<Rareza, string> = { comun: "Común", rara: "Rara", epica: "Épica", legendaria: "Legendaria" };
export const ORDEN_RAREZA: Record<Rareza, number> = { comun: 0, rara: 1, epica: 2, legendaria: 3 };
