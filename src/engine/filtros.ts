// Qué juegos y qué cartas se pueden usar con la configuración del anfitrión.
import { EJE_DE_MAZO, ESCENARIOS, JUEGOS, LUGARES } from "../content/catalogo";
import type { Carta, Configuracion, DefinicionJuego, EjesPartida, Esfuerzo } from "./types";
import type { Azar } from "./azar";

const ORDEN_ESFUERZO: Record<Esfuerzo, number> = { ninguno: 0, bajo: 1, alto: 2 };

export function hayParejas(cfg: Configuracion): boolean {
  return cfg.jugadores.some(j => j.parejaDe && cfg.jugadores.some(o => o.id === j.parejaDe));
}

/** Juegos que se pueden jugar con esta configuración. Incluye los que el motor aún no corre. */
export function juegosCompatibles(cfg: Configuracion, juegos: DefinicionJuego[] = JUEGOS): DefinicionJuego[] {
  const n = cfg.jugadores.length;
  return juegos.filter(j =>
    n >= j.minJugadores && n <= j.maxJugadores &&
    (j.lugares.length === 0 || j.lugares.includes(cfg.lugar)) &&
    cfg.intensidad >= j.intensidadMin &&
    (!j.adulto || cfg.adulto) &&
    (!j.soloParejas || hayParejas(cfg)),
  );
}

/** Cartas que pasan todos los filtros: escenario, intensidad, lugar, adulto, Drunk y jugadores. */
export function cartasPermitidas(cfg: Configuracion, cartas: Carta[], mazos: string[]): Carta[] {
  if (cfg.ejes) return cartasPorEjes(cfg, cfg.ejes, cartas, mazos);
  const lugar = LUGARES.find(l => l.id === cfg.lugar);
  if (!lugar) return [];
  const n = cfg.jugadores.length;
  const parejas = hayParejas(cfg);
  return cartas.filter(c =>
    !c.soloEjes &&
    mazos.includes(c.mazo) &&
    (c.escenario === null || c.escenario === cfg.escenario) &&
    c.intensidad <= cfg.intensidad &&
    c.dificultad <= cfg.dificultad &&
    ORDEN_ESFUERZO[c.esfuerzo] <= ORDEN_ESFUERZO[lugar.esfuerzoMax] &&
    (!c.adulto || (cfg.adulto && parejas)) &&
    (!c.drunk || cfg.drunk) &&
    (!c.pidePareja || parejas) &&
    n >= c.minJugadores,
  );
}

/**
 * Temperatura + Voltaje (Maestro v1.52 y v1.53): cada nivel solo saca cartas de ese nivel. Una pregunta sale si su nivel
 * es la Temperatura elegida; un reto, si es el Voltaje elegido. Los mazos sin eje (palabras, listas) no se filtran por nivel.
 * Lo adulto ya vive en el nivel 3; el lugar, Drunk, las parejas y el mínimo de jugadores siguen mandando igual.
 */
function cartasPorEjes(cfg: Configuracion, ejes: EjesPartida, cartas: Carta[], mazos: string[]): Carta[] {
  const lugar = LUGARES.find(l => l.id === cfg.lugar);
  if (!lugar) return [];
  const n = cfg.jugadores.length;
  const parejas = hayParejas(cfg);
  return cartas.filter(c => {
    const eje = EJE_DE_MAZO[c.mazo];
    return mazos.includes(c.mazo) &&
      (c.escenario === null || c.escenario === cfg.escenario) &&
      (!eje || c.nivel === ejes[eje]) &&
      c.dificultad <= cfg.dificultad &&
      ORDEN_ESFUERZO[c.esfuerzo] <= ORDEN_ESFUERZO[lugar.esfuerzoMax] &&
      (!c.drunk || cfg.drunk) &&
      (!c.pidePareja || parejas) &&
      n >= c.minJugadores;
  });
}

/** Lo adulto de fuera de las cartas (temas del impostor, escenarios adultos) se abre con Extremo o Sobrecarga. */
export const adultoPorEjes = (ejes: EjesPartida) => ejes.temperatura === 3 || ejes.voltaje === 3;

/** El lugar natural de cada escenario (ALVerca → Alberca, ALVumbre → Fogata…). */
export function lugarDeEscenario(id: string) {
  return ESCENARIOS.find(e => e.id === id)?.lugar;
}

/**
 * ¡Sorpréndeme!: elige al azar un juego que el motor ya corre y que sirve con esta configuración.
 * Nunca enciende contenido adulto ni Drunk, aunque estén disponibles.
 */
export function sorprendeme(cfg: Configuracion, azar: Azar): { juego: DefinicionJuego; cfg: Configuracion } | null {
  const segura: Configuracion = { ...cfg, adulto: false, drunk: false };
  const opciones = juegosCompatibles(segura).filter(j => j.motor && j.seccion !== "mix");
  if (opciones.length === 0) return null;
  return { juego: azar.elegir(opciones), cfg: segura };
}
