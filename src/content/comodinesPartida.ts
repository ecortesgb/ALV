// Comodines de la colección en la partida (Elías, 27 nov, Maestro v1.72; los 18 desde v1.74, 28 nov).
// Primera tanda (v1.72): 8 comodines de turno para Verdad o reto, Dados HOT y los juegos por turno.
// Segunda tanda (v1.74): los 10 de castigo, mesero, trampa y pista. Los que se lanzan contra otra persona los puede usar
// cualquiera de la mesa, en cualquier juego. Los comodines solo salen de sobres o de la colección (no se ganan).
import type { Motor } from "../engine/types";

export type IdComodinPartida =
  | "turno" | "escudo" | "cambio" | "dos-caminos" | "rebaja" | "segundo-intento" | "prorroga" | "suerte"
  | "salvavidas" | "relevo" | "doble-castigo" | "mesero" | "mano-amiga" | "rebote" | "contrarreloj" | "candado" | "pista-extra" | "duelo-dados";

/** Qué hace cada uno en la partida (texto corto para el botón del celular). */
export const EFECTO_EN_PARTIDA: Record<IdComodinPartida, string> = {
  turno: "Pasas sin cumplir ni tomar. 0 puntos.",
  escudo: "Te salvas de cumplir o tomar (0 puntos), o cancelas tu castigo.",
  cambio: "La app te da otra carta.",
  "dos-caminos": "La app te muestra dos cartas y tú eliges una.",
  rebaja: "Tu reto se hace a la mitad: la mitad del tiempo o de las repeticiones.",
  "segundo-intento": "Si no lo cumples, lo intentas una vez más.",
  prorroga: "Tu turno tiene 30 segundos más.",
  suerte: "Al azar: tu reto se suaviza, se duplica, se anula, pasa a otra persona o lo hace toda la mesa.",
  salvavidas: "Le quitas a otra persona su castigo o el delantal de mesero.",
  relevo: "Otra persona cumple tu castigo.",
  "doble-castigo": "El siguiente castigo de quien elijas se cumple dos veces.",
  mesero: "Quien elijas sirve de beber a todos hasta que acabe este juego (lo que cada quien pida, agua vale).",
  "mano-amiga": "Alguien hace tu reto contigo. Los puntos son tuyos.",
  rebote: "Le regresas a quien te lo lanzó el último comodín que te tocó.",
  contrarreloj: "El siguiente turno de quien elijas tiene la mitad del tiempo.",
  candado: "En esta ronda, el siguiente comodín que te lancen no hace nada.",
  "pista-extra": "Si eres el impostor, ves una pista de la palabra. En la TV sale como comodín secreto.",
  "duelo-dados": "Retas a alguien a tirar un dado: quien saque menos cumple la carta.",
};

export const COMODINES_PARTIDA = Object.keys(EFECTO_EN_PARTIDA) as IdComodinPartida[];

/** Comodines en los que quien lo usa elige a otra persona antes de pagarlo. */
export const CON_OBJETIVO: IdComodinPartida[] = ["salvavidas", "relevo", "doble-castigo", "mesero", "mano-amiga", "contrarreloj", "duelo-dados"];
/** Los que van contra la persona elegida: el Candado los para (Salvavidas y Mano amiga no, porque ayudan). */
export const CONTRA_OTRO: IdComodinPartida[] = ["relevo", "doble-castigo", "mesero", "contrarreloj", "duelo-dados", "rebote"];

/** Juegos por turno con carta: ahí sirven los 8 comodines de turno, Mano amiga y Duelo de dados. En Dados HOT todo es de
 * contacto entre la pareja: la suerte nunca lo pasa a otra persona ni a toda la mesa, y no hay ayuda ni duelo. */
export const MOTORES_DE_TURNO: Motor[] = ["turnos-cartas", "botella", "ruleta", "dados"];
/** Juegos donde se pueden usar comodines (v1.74: todos). Mesero, castigos y trampas sirven en cualquiera. */
export const MOTORES_CON_COMODINES: Motor[] = [...MOTORES_DE_TURNO, "votacion", "rol-secreto", "pareja", "conteo", "confesion", "senalar", "competencia", "fisico"];

/** Segundos que agrega la Prórroga. */
export const PRORROGA_S = 30;

/** Resultados del sorteo de ¿Voy a tener suerte?, todos con la misma probabilidad. */
export type Suerte = "suaviza" | "duplica" | "anula" | "pasa" | "mesa";
export const SUERTES: Suerte[] = ["suaviza", "duplica", "anula", "pasa", "mesa"];
export const TEXTO_SUERTE: Record<Suerte, string> = {
  suaviza: "¡Se suaviza! Se hace a la mitad.",
  duplica: "¡Se duplica! Se hace dos veces y vale el doble.",
  anula: "¡Se anula! Pasas sin cumplir ni tomar.",
  pasa: "¡Pasa a otra persona!",
  mesa: "¡Lo hace toda la mesa!",
};

export const esComodinPartida = (id: unknown): id is IdComodinPartida => typeof id === "string" && (COMODINES_PARTIDA as string[]).includes(id);
