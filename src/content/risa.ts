// Juegos de risa para ALV FÍSICO (Elías, 27 nov): dinámicas de programas de comedia en vivo adaptadas para jugar en
// persona, con nombre propio y castigos seguros (sin toques, golpes, comida asquerosa ni caídas).
// Todos corren en el motor «fisico»: el administrador da los puntos y la app pone en pantalla el turno, la palabra,
// la categoría o la frase y el cronómetro. Solo datos; el contenido de cada juego está en packs/risa.json.
import type { LugarId } from "../engine/types";

/** Cómo sale la carta de la ronda. */
export type MuestraRisa =
  | "tapada" // solo la ve quien tiene el turno, en su celular; se revela al terminar la ronda
  | "publica" // en la TV y en todos los celulares
  | "reves" // la TV la muestra al revés; la respuesta se destapa después
  | "mitad" // la TV muestra la primera mitad; la segunda se destapa después
  | "reloj"; // un tiempo objetivo: cada quien para su cronómetro a ciegas

export interface JuegoRisa {
  /** Qué sale en la carta («Palabra», «Tema», «Categoría»…). */
  etiqueta: string;
  muestra: MuestraRisa;
  /** Hay una persona en turno (rota cada ronda) y, si aplica, quién la acompaña (la persona que sigue). */
  turno?: { rol: string; segundo?: string };
  /** Segundos del cronómetro de este juego. */
  segundos: number;
  /** La carta trae varias líneas separadas por «|» (una lista). */
  lista?: boolean;
  pasos: string[];
  puntos: string[];
  /** Castigo de quien pierde. Exterior: alberca, bosque, campo o terraza. Lo demás (interior, fogata, asador): interior. */
  castigo: { exterior: string; interior: string };
  material: string[];
}

export const MAZO_RISA = (id: string) => `risa-${id}`;

/** Lugares donde salen los castigos con agua, harina o slime. Junto al fuego nunca (la harina en el aire se inflama). */
export const LUGARES_MOJADOS: LugarId[] = ["alberca", "bosque", "campo", "terraza"];
export const castigoRisa = (j: JuegoRisa, lugar: LugarId) => (LUGARES_MOJADOS.includes(lugar) ? j.castigo.exterior : j.castigo.interior);

const BEBE = "o bebe algo (lo que quiera)";

export const RISA: Record<string, JuegoRisa> = {
  pinzas: {
    etiqueta: "Palabra", muestra: "tapada", turno: { rol: "Describe" }, segundos: 60,
    pasos: [
      "Al que le toca ve la palabra en su celular y la describe sin decirla, sin señas y sin decir en qué letra empieza.",
      "El grupo grita la respuesta. Si la adivinan, toca «Siguiente palabra» y sigue hasta que se acabe el tiempo.",
      "Cada palabra que pase o que se le escape: se pone una pinza en la ropa (nunca en la piel).",
    ],
    puntos: ["+1 a quien describe por cada palabra adivinada", "+1 a quien la adivinó", "Gana quien acabe la noche con más puntos y menos pinzas"],
    castigo: { exterior: `El que junte más pinzas se las quita sin usar las manos, o le revientan un globo con agua en la espalda`, interior: `El que junte más pinzas se las quita sin usar las manos ${BEBE}` },
    material: ["30 pinzas de ropa de madera"],
  },
  "sin-decirla": {
    etiqueta: "Tema", muestra: "publica", turno: { rol: "Habla" }, segundos: 45,
    pasos: [
      "Al que le toca habla sin parar del tema que sale en la pantalla.",
      "No puede decir ninguna de las 3 palabras prohibidas, quedarse callado más de 3 segundos ni repetir la misma idea.",
      "Si se le escapa, el grupo grita «¡Bip!» y pierde.",
    ],
    puntos: ["Aguantar el tiempo sin «Bip»: +3", "Quien cachó el error: +1"],
    castigo: { exterior: "Mete la cara en un plato con harina y saca un dulce con la boca (ojos cerrados)", interior: `Saca un dulce de un plato con harina usando solo la boca ${BEBE}` },
    material: ["Plato hondo con harina", "Dulces envueltos"],
  },
  "ni-si-ni-no": {
    etiqueta: "Preguntas para el grupo", muestra: "publica", lista: true, turno: { rol: "Contesta" }, segundos: 45,
    pasos: [
      "Al que le toca contesta todo lo que el grupo le pregunte, rapidísimo.",
      "No puede decir «sí» ni «no» (tampoco «ajá», «nel» ni mover la cabeza).",
      "El grupo usa las preguntas de la pantalla y las que se le ocurran. El administrador marca si se le escapó.",
    ],
    puntos: ["Aguantar el tiempo: +3", "Quien lo hizo caer: +1"],
    castigo: { exterior: "Le revientan un globo con agua sobre la cabeza", interior: `Un post-it en la cara por cada vez que lo dijo ${BEBE}` },
    material: ["Globos con agua (exterior)", "Post-its"],
  },
  "para-el-reloj": {
    etiqueta: "Tiempo", muestra: "reloj", segundos: 60,
    pasos: [
      "Todos ven el tiempo en la pantalla. Cada quien toca «Empezar» en su celular y cierra los ojos.",
      "Cuenta en silencio y toca «¡Ya!» cuando crea que llegó al tiempo exacto. El celular no enseña el reloj mientras cuentas.",
      "Cuando todos terminan, la pantalla enseña quién quedó más cerca y quién más lejos.",
    ],
    puntos: ["El más cercano: +2", "El segundo: +1"],
    castigo: { exterior: "El más lejos recibe un chorro de espuma o slime en la palma y aplaude", interior: `El más lejos se pone un post-it en la frente ${BEBE}` },
    material: ["Espuma de afeitar o slime (exterior)", "Post-its"],
  },
  "dame-tres": {
    etiqueta: "Categoría", muestra: "publica", turno: { rol: "Contesta" }, segundos: 5,
    pasos: [
      "Al que le toca ve la categoría en la pantalla y tiene 5 segundos para decir tres cosas.",
      "Toca «Siguiente» para la que sigue: el cronómetro vuelve a empezar solo.",
      "No vale repetir algo que ya se dijo en la noche.",
    ],
    puntos: ["Cada categoría completa: +1"],
    castigo: { exterior: "Un post-it en la cara por cada falla; con 3 post-its, globo con agua", interior: `Un post-it en la cara por cada falla ${BEBE}` },
    material: ["Post-its", "Globos con agua (exterior)"],
  },
  "al-reves": {
    etiqueta: "Frase al revés", muestra: "reves", segundos: 20,
    pasos: [
      "La pantalla enseña una frase escrita al revés.",
      "El primero que la diga bien, al derecho, gana la ronda.",
      "El administrador toca «Mostrar respuesta» para que todos la vean.",
    ],
    puntos: ["El primero en decirla bien: +2"],
    castigo: { exterior: "El último en descifrarla recibe un globo con agua en la espalda", interior: `El último en descifrarla ${BEBE.slice(2)}` },
    material: ["Globos con agua (exterior)"],
  },
  "termina-frase": {
    etiqueta: "Frase", muestra: "mitad", segundos: 10,
    pasos: [
      "La pantalla enseña la mitad de un refrán o un dicho.",
      "El primero que la termine bien gana. Vale gritar.",
      "El administrador toca «Mostrar respuesta» para que todos la vean.",
    ],
    puntos: ["El primero en terminarla: +2", "Si nadie la sabe: 0"],
    castigo: { exterior: "Si alguien la dice mal, le toca un globo con agua", interior: `Si alguien la dice mal, se pone un post-it ${BEBE}` },
    material: ["Globos con agua (exterior)", "Post-its"],
  },
  "al-contrario": {
    etiqueta: "Orden", muestra: "publica", segundos: 60,
    pasos: [
      "El administrador lee la orden de la pantalla en voz alta (o todos la leen).",
      "Todos tienen que hacer lo contrario: si dice «levanten la mano», la bajan; si dice «siéntense», se paran.",
      "El que se equivoque o tarde sale de la ronda. El administrador toca «Siguiente orden» hasta que quede uno.",
    ],
    puntos: ["El último en pie: +3", "El penúltimo: +1"],
    castigo: { exterior: "Los que salieron primero reciben una pizca de harina en la cabeza", interior: `Los que salieron primero se ponen un post-it ${BEBE}` },
    material: ["Harina (exterior)", "Post-its"],
  },
  chisme: {
    etiqueta: "Chisme", muestra: "tapada", turno: { rol: "Empieza el chisme" }, segundos: 60,
    pasos: [
      "Al que le toca lee el chisme en su celular y se lo dice al oído al de al lado, una sola vez.",
      "Cada quien se lo pasa al siguiente sin repetirlo. El último lo dice en voz alta.",
      "Se toca «Mostrar respuesta» y la pantalla enseña cómo era el chisme original.",
    ],
    puntos: ["Si llega casi igual: +2 a todos", "Si llega cambiado: el grupo vota quién lo cambió (−1)"],
    castigo: { exterior: "El que lo cambió más recibe un globo con agua", interior: `El que lo cambió más ${BEBE.slice(2)}` },
    material: ["Nada", "Globos con agua (exterior)"],
  },
  "rima-o-paga": {
    etiqueta: "Palabra para rimar", muestra: "publica", turno: { rol: "Rima" }, segundos: 5,
    pasos: [
      "Sale una palabra en la pantalla. Al que le toca dice otra que rime antes de 5 segundos.",
      "Toca «Siguiente»: el turno pasa en círculo y cada quien rima la misma palabra sin repetir.",
      "El que se tarde o repita, paga.",
    ],
    puntos: ["Cada rima buena: +1"],
    castigo: { exterior: "Un post-it en la cara por cada falla; con 3, globo con agua", interior: `Un post-it en la cara por cada falla ${BEBE}` },
    material: ["Post-its", "Globos con agua (exterior)"],
  },
  "retrato-hablado": {
    etiqueta: "Personaje", muestra: "tapada", turno: { rol: "Describe", segundo: "Dibuja con los ojos tapados" }, segundos: 60,
    pasos: [
      "Al que le toca ve un personaje en su celular y describe su cara y su ropa sin decir quién es.",
      "La persona que sigue lo dibuja con los ojos tapados.",
      "Al terminar el tiempo, el grupo adivina quién es por el dibujo.",
    ],
    puntos: ["Si el grupo adivina: +2 a quien describe y +2 a quien dibujó", "Quien adivinó: +1"],
    castigo: { exterior: "Si nadie adivina, el dibujante se pone el dibujo en la espalda toda la ronda siguiente", interior: `Si nadie adivina, el dibujante ${BEBE.slice(2)}` },
    material: ["Hojas y plumones", "Una venda o antifaz"],
  },
  "el-taxi": {
    etiqueta: "Pasajero", muestra: "tapada", turno: { rol: "Pasajero", segundo: "Chofer" }, segundos: 60,
    pasos: [
      "Dos sillas son un taxi. El chofer maneja y el pasajero se sube.",
      "El pasajero ve en su celular quién es y lo actúa sin decirlo. El chofer tiene que imitarlo y seguirle la plática.",
      "Al terminar el tiempo, el grupo adivina el personaje.",
    ],
    puntos: ["Si el grupo adivina: +2 al pasajero y +1 al chofer", "El grupo vota al chofer que mejor imitó: +1 extra"],
    castigo: { exterior: "Si nadie adivina, el pasajero baja del taxi cantando y le revientan un globo con agua", interior: `Si nadie adivina, el pasajero ${BEBE.slice(2)}` },
    material: ["2 sillas"],
  },
  sombras: {
    etiqueta: "Figura", muestra: "tapada", turno: { rol: "Hace la sombra" }, segundos: 30,
    pasos: [
      "Se juega de noche o con poca luz. Alguien prende la linterna de su celular contra una pared.",
      "Al que le toca ve la figura en su celular y la hace con las manos frente a la luz.",
      "El grupo adivina antes de que se acabe el tiempo.",
    ],
    puntos: ["Si la adivinan: +1 a quien hizo la sombra y +1 a quien adivinó"],
    castigo: { exterior: "Si nadie adivina, quien hizo la sombra imita a la figura (sonido incluido)", interior: `Si nadie adivina, quien hizo la sombra imita a la figura ${BEBE}` },
    material: ["Linterna de un celular", "Una pared lisa"],
  },
  "sopla-y-tira": {
    etiqueta: "Reto", muestra: "publica", turno: { rol: "Sopla" }, segundos: 30,
    pasos: [
      "Al que le toca se para frente a la mesa con un popote.",
      "Soplando por el popote (sin tocar nada) tiene que tirar de la mesa lo que dice la pantalla.",
      "Se cuenta lo que tiró cuando se acaba el tiempo.",
    ],
    puntos: ["+1 por cada cosa que tiró", "Tirar todo antes del tiempo: +2 extra"],
    castigo: { exterior: "El que menos tiró de la ronda recibe un globo con agua", interior: `El que menos tiró ${BEBE.slice(2)}` },
    material: ["10 vasos de plástico", "6 pelotas de ping pong", "Popotes"],
  },
  pasala: {
    etiqueta: "Reto", muestra: "publica", turno: { rol: "Va primero" }, segundos: 60,
    pasos: [
      "Se juega en equipos o todos contra el reloj, con vasos llenos de agua.",
      "Lean el reto de la pantalla: hay que llevar o pasar el agua como dice, sin tirarla.",
      "Al acabarse el tiempo, se mide cuánta agua quedó en el vaso.",
    ],
    puntos: ["El equipo o la persona con más agua: +3", "Segundo lugar: +1"],
    castigo: { exterior: "Quien tiró más agua se echa encima lo que quedó en su vaso", interior: `Quien tiró más agua seca el piso ${BEBE}` },
    material: ["Vasos de plástico", "Agua", "Toalla", "Platos desechables"],
  },
  "el-mantel": {
    etiqueta: "Reto", muestra: "publica", turno: { rol: "Jala" }, segundos: 15,
    pasos: [
      "Pongan sobre la mesa un mantel liso y encima lo que dice la pantalla (solo vasos o cosas de plástico).",
      "Al que le toca jala el mantel de un tirón, sin que se caiga nada.",
      "Si algo se cae al suelo, falló.",
    ],
    puntos: ["Sin que se caiga nada: +2", "Si quedó todo parado: +1 extra"],
    castigo: { exterior: "Si se cayó algo, recoge todo y le revientan un globo con agua", interior: `Si se cayó algo, recoge todo ${BEBE}` },
    material: ["Mantel liso o tela sin costuras", "Vasos de plástico"],
  },
};

export const IDS_RISA = Object.keys(RISA);
export const esRisa = (juegoId: string | undefined) => !!juegoId && juegoId in RISA;
