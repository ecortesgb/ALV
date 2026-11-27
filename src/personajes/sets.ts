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
  vuelo: { nombre: "Volar", anfitrion: "war-machine", movs: {
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
    // Tanda 2 y figuras LDraw que no tenían set (Elías, 27 nov 2026: «que todos tengan movimientos que puedan ir con ellos
    // y sonidos»). Van al final para no cambiar el set que manda en andar de los que ya estaban.
    ...usan("espada", `mace-windu darth-vader-minifig emperador-palpatine jack-sparrow finn`),
    ...usan("magia", `harry-potter-quidditch harry-potter-chamarra-abierta harry-potter-chamarra-azul harry-potter-dimensions
      hermione-chamarra voldemort-dimensions bellatrix-lestrange loki-minifig emperador-palpatine elsa bruja-malvada raven
      marceline tormenta-minifig`),
    ...usan("pistola", `han-solo jack-sparrow harley-quinn marvin-marciano`),
    ...usan("rifle", `soldado-del-invierno-minifig`),
    ...usan("garras", `wolverine-mascara`),
    ...usan("vuelo", `iron-man-mk42-minifig iron-man-mk6 thor-minifig tormenta-minifig superman-ojos-rojos omni-man homelander
      starfire raven bombon burbuja bellota baymax marceline`),
    ...usan("fuerza", `omni-man homelander superman-ojos-rojos thor-minifig mujer-maravilla-clasica mr-increible baymax cyborg
      starfire bombon burbuja bellota jake`),
    ...usan("mente", `harry-potter-quidditch harry-potter-chamarra-abierta harry-potter-chamarra-azul harry-potter-dimensions
      hermione-chamarra voldemort-dimensions bellatrix-lestrange mace-windu emperador-palpatine darth-vader-minifig raven et
      miles-morales spider-gwen spider-man-minifig spider-man-simbionte`),
    ...usan("acrobacia", `miles-morales spider-gwen spider-man-minifig spider-man-simbionte batman-excalibur batman-logo-dorado
      batman-gris-oscuro batman-gris-claro batman-logo-amarillo batgirl robin-dimensions mace-windu jack-sparrow harley-quinn
      chico-bestia sonic finn mujer-maravilla-clasica bugs-bunny`),
    ...usan("tecno", `iron-man-mk42-minifig iron-man-mk6 batman-excalibur batman-logo-dorado batman-gris-oscuro batman-gris-claro
      batman-logo-amarillo batgirl cyborg doc-brown marty-mcfly sheldon-cooper edna-moda baymax c-3po`),
  ] as [string, string][]) (m[id] ??= []).push(s);
  return m;
})();

/** Sets que tienen todos los minifig, después de los propios. «base» va primero de estos: manda en andar. */
export const SETS_TODOS = ["base", "pelea", "gestos", "reacciones"] as const;

/** Los sets que usa un personaje, en orden (los propios primero; luego los de todos). */
export const setsDe = (id: Id): string[] => [...(SETS_DE[id] ?? []), ...SETS_TODOS];

// ---------- Sonidos de los movimientos (Elías, 27 nov: «al disparar, mover espada láser, volar, golpear…») ----------
// [sonido, segundo del clip en que suena]. El sonido es un nombre de src/app/sonido.ts (sintetizado, sin archivos).
// Bailes, burlas y nervios no llevan: ya se entienden sin sonido y taparían la música.
type Toque = readonly [string, number];
export const SONIDOS_MOV: Readonly<Record<string, readonly Toque[]>> = {
  "base-combo": [["zas", 0.08], ["zas", 0.28], ["zas", 0.48]], "base-voltereta": [["zas", 0.15]], "base-salto": [["salto", 0.05], ["aterrizar", 0.8]],
  "espada-combo": [["espada", 0.05], ["espada", 0.28]], "espada-estocada": [["espada", 0.25]], "espada-desenvainar": [["desenvainar", 0.4]],
  "magia-hechizo": [["hechizo", 0.6]], "magia-conjuro": [["conjuro", 0.3]], "magia-levantar": [["campo", 0.1]], "magia-escudo": [["escudo", 0.2]],
  "magia-baston": [["zas", 0.05], ["golpe-seco", 0.3]],
  "pistola-disparar": [["disparo", 0.3]], "pistola-sacar": [["enfundar", 0.4]],
  "dospistolas-disparar": [["disparo", 0.2], ["disparo", 0.45]], "dospistolas-sacar": [["enfundar", 0.4]],
  "rifle-disparar": [["rifle", 0.15]], "rifle-combo": [["zas", 0.1], ["golpe-seco", 0.3]],
  "arco-disparar": [["arco-tensar", 0.2], ["flecha", 0.75]],
  "garras-voltereta": [["garras", 0], ["zas", 0.3]],
  "vuelo-despegar": [["despegue", 0]],
  "pelea-golpe1": [["zas", 0.2], ["puno", 0.35]], "pelea-golpe2": [["zas", 0.3], ["puno", 0.5]], "pelea-golpe3": [["puno", 0.3], ["puno", 0.6]],
  "pelea-golpe4": [["puno", 0.4], ["puno", 0.8], ["golpe-fuerte", 1.3]], "pelea-golpe5": [["puno", 0.3], ["puno", 0.7], ["puno", 1.1], ["golpe-fuerte", 1.6]],
  "pelea-estocada": [["zas", 0.15]],
  "gestos-festejo": [["festejo", 0.2]], "gestos-festejo2": [["festejo", 0.2]], "gestos-sigilo": [["puntitas", 0.1], ["puntitas", 0.75]], "gestos-deslizarse": [["barrida", 0.2]],
  "reacciones-golpeado": [["recibir", 0.05]], "reacciones-golpeado2": [["recibir", 0.05]], "reacciones-aturdido": [["mareo", 0.1]],
  "reacciones-al-suelo": [["recibir", 0], ["caer", 0.6]], "reacciones-aplastado": [["aplastar", 0.15]],
  "fuerza-levantar": [["esfuerzo", 0.3], ["golpe-seco", 1.6]], "fuerza-arrancar": [["arrancar", 0.9]], "fuerza-golpe-muro": [["zas", 0.6], ["derrumbe", 0.85]],
  "fuerza-agarrar": [["zas", 0.2]], "fuerza-azotar": [["golpe-fuerte", 0.9], ["golpe-fuerte", 1.6]],
  "mente-control": [["campo", 0.3]], "mente-levitar": [["levitar", 0.1]], "mente-sentido": [["sentido", 0.1]],
  "acrobacia-barra": [["zas", 0.2], ["zas", 0.5]], "acrobacia-columpio": [["zas", 0.2]], "acrobacia-salto-pared": [["salto", 0.1], ["aterrizar", 0.7]],
  "acrobacia-impulso": [["salto", 0.1]],
  "tecno-gadget": [["gadget", 0.15]],
};

/** Personajes que suenan distinto con el mismo set: sable láser en Star Wars, bláster, varita en Harry Potter. */
const cambia = (ids: string, de: Record<string, string>): [string, Record<string, string>][] => ids.trim().split(/\s+/).map(id => [id, de]);
export const SONIDO_PROPIO: Readonly<Record<Id, Readonly<Record<string, string>>>> = Object.fromEntries([
  ...cambia("darth-vader darth-maul luke-skywalker anakin-skywalker yoda", { espada: "sable", desenvainar: "sable-encender" }),
  ...cambia("jango-fett mandaloriano", { disparo: "blaster", rifle: "blaster" }),
  ...cambia("harry-potter hermione-granger ron-weasley voldemort", { hechizo: "varita", conjuro: "varita" }),
  ...cambia("mace-windu darth-vader-minifig emperador-palpatine", { espada: "sable", desenvainar: "sable-encender" }),
  ...cambia("han-solo", { disparo: "blaster" }),
  ...cambia(`harry-potter-quidditch harry-potter-chamarra-abierta harry-potter-chamarra-azul harry-potter-dimensions
    hermione-chamarra voldemort-dimensions bellatrix-lestrange`, { hechizo: "varita", conjuro: "varita" }),
]);

/** Sonidos de un movimiento («<set>-<mov>») para un personaje, ya con sus cambios. */
export function sonidosDe(id: Id, mov: string): { cual: string; t: number }[] {
  const propio = SONIDO_PROPIO[id] ?? {};
  return (SONIDOS_MOV[mov] ?? []).map(([s, t]) => ({ cual: propio[s] ?? s, t }));
}
