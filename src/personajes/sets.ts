// Sets de movimientos compartidos (Elías, 27 nov 2026: «si hay un personaje que camina como soldado y otro también, lo
// apliquemos; movimiento de varita y lo usarían todos los de Harry Potter, golpe con espada jedi para casi todos los Jedi
// y Sith…, para que todos los personajes tengan su set de movimientos generales»).
// Los clips salen del juego (laboratorio entregar_sets.py) y viven en el GLB «<anfitrión>-set-<set>.glb» de un personaje
// del catálogo. Todos los minifig comparten el esqueleto, así que cualquier minifig los puede usar. Aquí solo hay datos:
// qué movimientos tiene cada set, cómo se llaman, cuáles salen en la rueda y qué personaje usa qué sets.
import type { Id } from "./tipos";

export interface MovDef { nombre: string; /** Sale en la rueda (los de andar son para minijuegos y vida). */ rueda?: boolean }
export interface SetDef { /** Cómo se llama en la rueda. */ nombre: string; anfitrion: Id; movs: Readonly<Record<string, MovDef>> }

export const SETS: Readonly<Record<string, SetDef>> = {
  base: { nombre: "Bailes y burlas", anfitrion: "viper", movs: {
    bailar: { nombre: "Breakdance", rueda: true }, bailar2: { nombre: "Bailecito", rueda: true }, bailar3: { nombre: "Baile Parker", rueda: true },
    burla: { nombre: "Burla", rueda: true }, burla2: { nombre: "Presumir", rueda: true }, burla3: { nombre: "Provocar", rueda: true },
    voltereta: { nombre: "Voltereta", rueda: true }, combo: { nombre: "Combo de golpes" }, salto: { nombre: "Salto" },
    nervios: { nombre: "Nervios", rueda: true },
    caminar: { nombre: "Caminar" }, correr: { nombre: "Correr" }, sprint: { nombre: "Correr rápido" }, pasear: { nombre: "Pasear" },
  } },
  espada: { nombre: "Espada", anfitrion: "sif", movs: {
    combo: { nombre: "Combo de espada", rueda: true }, estocada: { nombre: "Estocada", rueda: true }, desenvainar: { nombre: "Desenvainar", rueda: true },
    guardia: { nombre: "En guardia" }, caminar: { nombre: "Caminar armado" }, correr: { nombre: "Correr armado" },
  } },
  magia: { nombre: "Magia", anfitrion: "doctor-strange", movs: {
    hechizo: { nombre: "Lanzar hechizo", rueda: true }, conjuro: { nombre: "Conjuro", rueda: true }, levantar: { nombre: "Levitar objeto", rueda: true },
    escudo: { nombre: "Escudo mágico", rueda: true }, baston: { nombre: "Golpe de bastón", rueda: true },
  } },
  pistola: { nombre: "Pistola", anfitrion: "viper", movs: {
    disparar: { nombre: "Disparar", rueda: true }, sacar: { nombre: "Desenfundar", rueda: true },
    guardia: { nombre: "En guardia" }, caminar: { nombre: "Caminar armado" }, correr: { nombre: "Correr armado" },
  } },
  dospistolas: { nombre: "Dos pistolas", anfitrion: "star-lord", movs: {
    disparar: { nombre: "Doble disparo", rueda: true }, sacar: { nombre: "Desenfundar", rueda: true },
    caminar: { nombre: "Caminar armado" }, correr: { nombre: "Correr armado" },
  } },
  rifle: { nombre: "Rifle", anfitrion: "punisher", movs: {
    disparar: { nombre: "Disparar rifle", rueda: true }, combo: { nombre: "Culatazo", rueda: true },
    guardia: { nombre: "En guardia" }, caminar: { nombre: "Patrullar" }, correr: { nombre: "Correr armado" },
  } },
  arco: { nombre: "Arco", anfitrion: "hawkeye", movs: {
    disparar: { nombre: "Flechazo", rueda: true }, guardia: { nombre: "En guardia" }, caminar: { nombre: "Caminar con arco" }, correr: { nombre: "Correr con arco" },
  } },
  garras: { nombre: "Garras", anfitrion: "wolverine", movs: {
    voltereta: { nombre: "Salto felino", rueda: true }, guardia: { nombre: "En guardia" }, caminar: { nombre: "Acechar" }, correr: { nombre: "Correr" },
  } },
  vuelo: { nombre: "Vuelo", anfitrion: "war-machine", movs: {
    despegar: { nombre: "Despegar", rueda: true },
    flotar: { nombre: "Flotar" }, volar: { nombre: "Volar" }, "volar-rapido": { nombre: "Volar rápido" }, izquierda: { nombre: "Volar a la izquierda" },
    derecha: { nombre: "Volar a la derecha" }, subir: { nombre: "Subir" }, bajar: { nombre: "Bajar" },
  } },
  // Segunda tanda (27 nov: «en cuanto los tengas los publicamos y adaptamos a los personajes que les queden»).
  pelea: { nombre: "Pelea", anfitrion: "daredevil", movs: {
    golpe1: { nombre: "Gancho", rueda: true }, golpe2: { nombre: "Patada", rueda: true }, golpe3: { nombre: "Uno-dos", rueda: true },
    golpe4: { nombre: "Golpe final", rueda: true }, golpe5: { nombre: "Combo largo", rueda: true }, estocada: { nombre: "Embestida", rueda: true },
    rebote: { nombre: "Rebote" },
  } },
  gestos: { nombre: "Festejos", anfitrion: "rescue", movs: {
    festejo: { nombre: "Festejar", rueda: true }, festejo2: { nombre: "Gran festejo", rueda: true },
    sigilo: { nombre: "De puntitas", rueda: true }, deslizarse: { nombre: "Barrerse", rueda: true },
  } },
  reacciones: { nombre: "Reacciones", anfitrion: "whiplash", movs: {
    golpeado: { nombre: "Recibir golpe", rueda: true }, golpeado2: { nombre: "Tambalearse", rueda: true },
    aturdido: { nombre: "Mareado", rueda: true }, "al-suelo": { nombre: "Caer al suelo", rueda: true }, aplastado: { nombre: "Aplastado", rueda: true },
  } },
  fuerza: { nombre: "Superfuerza", anfitrion: "she-hulk", movs: {
    levantar: { nombre: "Levantar", rueda: true }, arrancar: { nombre: "Arrancar", rueda: true }, "golpe-muro": { nombre: "Romper muro", rueda: true },
    agarrar: { nombre: "Agarrar", rueda: true }, azotar: { nombre: "Azotar", rueda: true },
  } },
  mente: { nombre: "Mente", anfitrion: "stan-lee", movs: {
    control: { nombre: "Control mental", rueda: true }, levitar: { nombre: "Levitar", rueda: true }, sentido: { nombre: "Presentir peligro", rueda: true },
  } },
  acrobacia: { nombre: "Acrobacias", anfitrion: "superior-spider-man", movs: {
    barra: { nombre: "Giro en barra", rueda: true }, columpio: { nombre: "Columpio", rueda: true }, "salto-pared": { nombre: "Salto de pared", rueda: true },
    impulso: { nombre: "Impulso", rueda: true }, trepar: { nombre: "Trepar" },
  } },
  tecno: { nombre: "Tecnología", anfitrion: "tony-stark", movs: { gadget: { nombre: "Usar gadget", rueda: true } } },
};

const usan = (set: string, ids: string): [string, string][] => ids.trim().split(/\s+/).map(id => [id, set]);

/** Sets propios de cada personaje, además de «base» (que tienen todos los minifig). El primero manda en andar. */
export const SETS_DE: Readonly<Record<Id, readonly string[]>> = (() => {
  const m: Record<Id, string[]> = {};
  for (const [id, s] of [
    ...usan("espada", `darth-vader darth-maul luke-skywalker anakin-skywalker yoda blade deadpool elektra gamora mujer-maravilla sif
      heimdall psylocke malekith`),
    ...usan("magia", `harry-potter hermione-granger ron-weasley voldemort doctor-strange loki jean-grey fenix fenix-oscura mysterio
      emma-frost profesor-x magneto polaris doctor-doom mandarin yoda`),
    ...usan("dospistolas", `star-lord nick-fury black-widow mistica deadpool jango-fett`),
    ...usan("pistola", `coulson maria-hill craneo-rojo union-jack rocket viper bullseye buitre taskmaster`),
    ...usan("rifle", `punisher soldado-del-invierno mandaloriano`),
    ...usan("arco", `hawkeye taskmaster`),
    ...usan("garras", `wolverine black-panther dientes-de-sable kraven gata-negra`),
    ...usan("vuelo", `iron-man iron-man-clasico iron-man-mk42 iron-patriot war-machine rescue thor superman tormenta falcon nova
      silver-surfer capitan-britania antorcha-humana magneto polaris doctor-strange arcangel buitre duende-verde jean-grey fenix
      fenix-oscura mandaloriano jango-fett`),
    ...usan("fuerza", `superman mujer-maravilla thor jane-foster she-hulk super-skrull capitan-britania coloso juggernaut la-mole
      aquaman odin ronan thanos rino`),
    ...usan("mente", `profesor-x jean-grey fenix fenix-oscura emma-frost psylocke magneto polaris doctor-strange loki mysterio
      yoda luke-skywalker anakin-skywalker darth-vader darth-maul harry-potter hermione-granger ron-weasley voldemort
      spider-man iron-spider superior-spider-man spider-woman spider-man-negro peter-parker stan-lee`),
    ...usan("acrobacia", `spider-man iron-spider superior-spider-man spider-woman spider-man-negro peter-parker gwen-stacy
      black-widow black-panther daredevil batman batman-returns robin robin-lego-batman elektra gamora deadpool
      capitan-america capitan-america-clasico gata-negra moon-knight iron-fist psylocke mistica taskmaster bullseye
      luke-skywalker anakin-skywalker darth-maul yoda ms-marvel chica-ardilla avispa ant-man gambito soldado-del-invierno
      kraven union-jack`),
    ...usan("tecno", `tony-stark iron-man iron-man-clasico iron-man-mk42 iron-patriot war-machine rescue batman batman-returns
      bruce-wayne black-widow maria-hill pepper-potts coulson nick-fury rocket star-lord robin robin-lego-batman
      ant-man avispa mr-fantastico doctor-octopus arnim-zola mandaloriano`),
  ] as [string, string][]) (m[id] ??= []).push(s);
  return m;
})();

/** Sets que tienen todos los minifig, después de los propios. «base» va primero de estos: manda en andar. */
export const SETS_TODOS = ["base", "pelea", "gestos", "reacciones"] as const;

/** Los sets que usa un personaje, en orden (los propios primero; luego los de todos). */
export const setsDe = (id: Id): string[] => [...(SETS_DE[id] ?? []), ...SETS_TODOS];
