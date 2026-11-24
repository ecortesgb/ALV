// Tipos del motor. El motor no sabe de pantallas: Anfitrión, Jugador y Pantalla solo leen lo que devuelve.

export type Intensidad = 1 | 2 | 3 | 4; // Tranquilo · Picante · Sin filtro · Salvaje
export type Dificultad = 1 | 2 | 3 | 4; // Fácil · Media · Difícil · Experto
export type Esfuerzo = "ninguno" | "bajo" | "alto";
/** Temperatura + Voltaje (Maestro v1.52): dos ejes de 3 niveles. Temperatura para preguntas, Voltaje para retos. */
export type Eje = "temperatura" | "voltaje";
export type NivelEje = 1 | 2 | 3; // Temperatura: Frío · Caliente · Extremo. Voltaje: Bajo voltaje · Alto voltaje · Sobrecarga

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
  /** Nivel 1 a 3 en el eje de su mazo (`EJE_DE_MAZO`). Los mazos sin eje (palabras, listas…) van en 1. */
  nivel: NivelEje;
  /** Tiene contacto físico con otra persona (consentimiento en los Términos; siempre se puede decir que no). */
  contacto?: boolean;
  /** Carta nueva de Temperatura + Voltaje: el filtro de 4 niveles la ignora, así las partidas guardadas salen igual. */
  soloEjes?: boolean;
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
  /** Tema agregado para el configurador (Maestro v1.44): el modo clásico no lo sortea, así las partidas guardadas se reconstruyen igual. */
  soloConfig?: boolean;
}

/** Tipo de partida: solo cambia cómo se suman los puntos y quién gana (una persona, una pareja o un equipo). */
export type Modalidad = "individual" | "parejas" | "equipos" | "sexos";

/** Opciones de El impostor (Maestro v1.44): cuántos impostores y de qué tema son las palabras. */
export interface OpcionesImpostor {
  cantidad: number;
  /** Id del tema, «escenario» (el tema del escenario elegido) o null (al azar). */
  tema: string | null;
}

/** Lo que devuelve el configurador de partida, además del juego, las rondas y el nivel. */
export interface OpcionesPartida {
  modalidad?: Modalidad;
  /** Equipos y guerra de sexos: id del jugador → id de su grupo. Parejas: p1, p2… si el anfitrión las eligió; sin esto, por orden de llegada. */
  grupos?: Record<string, string>;
  escenario?: EscenarioId;
  turno?: "orden" | "ruleta";
  /** Verdad o reto: herramienta que decide quién pregunta y quién responde (orden, ruleta, reloj, dados o póker). */
  herramienta?: string;
  /** Temporizador (herramienta opcional, Maestro 6A.11 C6): segundos por turno. Sin él no hay tiempo por turno. */
  temporizador?: number;
  impostor?: OpcionesImpostor;
  /** «Cómo jugar»: explicar las reglas antes de la primera ronda. */
  explicar?: boolean;
  /** Temperatura + Voltaje (Maestro v1.52): nivel general de la partida y el interruptor Drunk. */
  ejes?: EjesPartida & { drunk: boolean };
}

/** Nivel general de la partida en cada eje (Maestro v1.52). */
export interface EjesPartida { temperatura: NivelEje; voltaje: NivelEje }

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
  | "botella" | "ruleta" | "dados" | "conteo" | "confesion" | "senalar" | "competencia"
  /** Juego físico (modos de juego, D5 y D6): retos en persona; el administrador da y quita puntos y usa herramientas. */
  | "fisico";

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
  /** Tipo de partida. Sin él (o «individual») gana una persona. */
  modalidad?: Modalidad;
  /** Nombre de cada grupo (`Jugador.equipo`) en parejas, equipos o guerra de sexos. */
  equipos?: { id: string; nombre: string }[];
  /** El impostor con eliminación por voto (Maestro v1.44). Sin esto corre el modo clásico de rondas sueltas. */
  impostor?: OpcionesImpostor;
  /** «Cómo jugar» antes de la primera ronda (Maestro v1.44). */
  explicar?: boolean;
  /** Verdad o reto con elección, una sola Verdad, tomar y herramienta (Maestro 6A.6 B). Sin esto corre el modo anterior. */
  verdadReto?: { herramienta: "orden" | "ruleta" | "reloj" | "dados" | "poker" };
  /** Temporizador por turno, en segundos (Maestro 6A.11 C6). */
  temporizador?: number;
  /** Temperatura + Voltaje (Maestro v1.52): con esto se filtra por eje y nivel 1 a 3. Sin esto, el filtro de 4 niveles de siempre. */
  ejes?: EjesPartida;
}
