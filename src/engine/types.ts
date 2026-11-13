// Tipos del motor. El motor no sabe de pantallas: Anfitrión, Jugador y Pantalla solo leen lo que devuelve.

export type Intensidad = 1 | 2 | 3 | 4; // Tranquilo · Picante · Sin filtro · Salvaje
export type Dificultad = 1 | 2 | 3 | 4; // Fácil · Media · Difícil · Experto
export type Esfuerzo = "ninguno" | "bajo" | "alto";

export type EscenarioId =
  | "alverca" | "fogata" | "parque" // activos
  | "campamento" | "bar" | "casa" | "terraza" | "fiesta" | "arena"
  | "sala-juegos" | "eliminacion" | "cuarto-secreto" | "habitacion" | "emergencia" | "escenario-principal";
export type LugarId = "alberca" | "fogata" | "asador" | "bosque" | "campo" | "terraza" | "interior" | "cualquiera";
export type SeccionId = "mix" | "ptm" | "hdspm" | "qpm" | "ntp" | "parejas" | "pvt" | "gdlv";
export type MecanicaId =
  | "botella" | "ruleta" | "dados" | "cartas" | "turnos" | "votacion"
  | "rol-secreto" | "duelo" | "temporizador" | "tablero" | "azar";

export interface Carta {
  id: string;
  mazo: string;
  escenario: EscenarioId | null; // null = sirve en cualquier escenario
  intensidad: Intensidad;
  dificultad: Dificultad;
  texto: string;
  adulto: boolean;
  drunk: boolean;
  esfuerzo: Esfuerzo;
  pidePareja: boolean;
  minJugadores: number;
  opcionB?: string;
  prohibidas?: string[];
  descripcion?: string;
  formato?: "ind" | "par";
}

export interface TemaImpostor {
  id: string;
  nombre: string;
  adulto: boolean;
  escenario: EscenarioId | null;
  palabras: string[];
}

export interface Lugar {
  id: LugarId;
  nombre: string;
  /** Esfuerzo físico máximo permitido en este lugar. */
  esfuerzoMax: Esfuerzo;
  /** Si después de tomar se bloquean los retos de este lugar. */
  bloqueaTrasTomar: boolean;
  nuncaSePermite: string[];
}

export interface Escenario {
  id: EscenarioId;
  /** Nombre con sigla, por ejemplo «FBI: Fogata Bajo Investigación». */
  nombre: string;
  sigla: string;
  /** Lugar real que decide las reglas de seguridad. */
  lugar: LugarId;
  emoji: string;
  color: string;
  ambientacion: string;
  /** Solo los activos se pueden elegir en el configurador. */
  activo: boolean;
  /** Si pide tener encendido el contenido adulto. */
  adulto?: boolean;
}

export type Motor =
  | "turnos-cartas" | "votacion" | "rol-secreto" | "pareja"
  | "botella" | "ruleta" | "dados" | "conteo" | "confesion" | "senalar" | "competencia";

export interface DefinicionJuego {
  id: string;
  seccion: SeccionId;
  nombre: string;
  sigla?: string;
  descripcion: string;
  mecanicas: MecanicaId[];
  /** Mecánica del motor que lo corre. Si falta, todavía no se puede jugar en la plataforma. */
  motor?: Motor;
  /** Segundos del temporizador, cuando el juego usa uno. */
  segundos?: number;
  minJugadores: number;
  maxJugadores: number;
  soloParejas?: boolean;
  /** Lugares donde se puede jugar. Vacío = cualquiera. */
  lugares: LugarId[];
  intensidadMin: Intensidad;
  intensidadMax: Intensidad;
  adulto?: boolean;
  mazo?: string;
  /** Qué cambia con 2 o 3 jugadores, cuando aplica. */
  modoCorto?: string;
}

export interface Jugador {
  id: string;
  nombre: string;
  parejaDe?: string;
  /** Equipo de la partida (modalidad equipos o guerra de sexos). Los puntos siguen siendo de cada quien. */
  equipo?: string;
}

/** Lo que elige el anfitrión en el configurador. */
export interface Configuracion {
  jugadores: Jugador[];
  lugar: LugarId;
  escenario?: EscenarioId;
  intensidad: Intensidad;
  dificultad: Dificultad;
  adulto: boolean;
  drunk: boolean;
  /** Herramienta para elegir de quién es el turno en los juegos de cartas por turno: en orden o con ruleta. */
  turno?: "orden" | "ruleta";
}
