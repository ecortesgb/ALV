// Sets de movimientos compartidos (Elías, 27 nov 2026: «si hay un personaje que camina como soldado y otro también, lo
// apliquemos; movimiento de varita y lo usarían todos los de Harry Potter, golpe con espada jedi para casi todos los Jedi
// y Sith…, para que todos los personajes tengan su set de movimientos generales»).
// Los clips salen del juego (laboratorio entregar_sets.py) y viven en el GLB «<anfitrión>-set-<set>.glb» de un personaje
// del catálogo. Todos los minifig comparten el esqueleto, así que cualquier minifig los puede usar. Aquí solo hay datos:
// qué movimientos tiene cada set, cómo se llaman, cuáles salen en la rueda y qué personaje usa qué sets.
import type { Id } from "./tipos";

export interface MovDef { nombre: string; /** Sale en la rueda (los de andar son para minijuegos y vida). */ rueda?: boolean }
export interface SetDef { anfitrion: Id; movs: Readonly<Record<string, MovDef>> }

export const SETS: Readonly<Record<string, SetDef>> = {
  base: { anfitrion: "viper", movs: {
    bailar: { nombre: "Breakdance", rueda: true }, bailar2: { nombre: "Bailecito", rueda: true }, bailar3: { nombre: "Baile Parker", rueda: true },
    burla: { nombre: "Burla", rueda: true }, burla2: { nombre: "Presumir", rueda: true }, burla3: { nombre: "Provocar", rueda: true },
    voltereta: { nombre: "Voltereta", rueda: true }, combo: { nombre: "Combo de golpes", rueda: true }, salto: { nombre: "Salto", rueda: true },
    nervios: { nombre: "Nervios", rueda: true },
    caminar: { nombre: "Caminar" }, correr: { nombre: "Correr" }, sprint: { nombre: "Correr rápido" }, pasear: { nombre: "Pasear" },
  } },
  espada: { anfitrion: "sif", movs: {
    combo: { nombre: "Combo de espada", rueda: true }, estocada: { nombre: "Estocada", rueda: true }, desenvainar: { nombre: "Desenvainar", rueda: true },
    guardia: { nombre: "En guardia" }, caminar: { nombre: "Caminar armado" }, correr: { nombre: "Correr armado" },
  } },
  magia: { anfitrion: "doctor-strange", movs: {
    hechizo: { nombre: "Lanzar hechizo", rueda: true }, conjuro: { nombre: "Conjuro", rueda: true }, levantar: { nombre: "Levitar objeto", rueda: true },
    escudo: { nombre: "Escudo mágico", rueda: true }, baston: { nombre: "Golpe de bastón", rueda: true },
  } },
  pistola: { anfitrion: "viper", movs: {
    disparar: { nombre: "Disparar", rueda: true }, sacar: { nombre: "Desenfundar", rueda: true },
    guardia: { nombre: "En guardia" }, caminar: { nombre: "Caminar armado" }, correr: { nombre: "Correr armado" },
  } },
  dospistolas: { anfitrion: "star-lord", movs: {
    disparar: { nombre: "Doble disparo", rueda: true }, sacar: { nombre: "Desenfundar", rueda: true },
    caminar: { nombre: "Caminar armado" }, correr: { nombre: "Correr armado" },
  } },
  rifle: { anfitrion: "punisher", movs: {
    disparar: { nombre: "Disparar rifle", rueda: true }, combo: { nombre: "Culatazo", rueda: true },
    guardia: { nombre: "En guardia" }, caminar: { nombre: "Patrullar" }, correr: { nombre: "Correr armado" },
  } },
  arco: { anfitrion: "hawkeye", movs: {
    disparar: { nombre: "Flechazo", rueda: true }, guardia: { nombre: "En guardia" }, caminar: { nombre: "Caminar con arco" }, correr: { nombre: "Correr con arco" },
  } },
  garras: { anfitrion: "wolverine", movs: {
    voltereta: { nombre: "Salto felino", rueda: true }, guardia: { nombre: "En guardia" }, caminar: { nombre: "Acechar" }, correr: { nombre: "Correr" },
  } },
  vuelo: { anfitrion: "war-machine", movs: {
    despegar: { nombre: "Despegar", rueda: true },
    flotar: { nombre: "Flotar" }, volar: { nombre: "Volar" }, "volar-rapido": { nombre: "Volar rápido" }, izquierda: { nombre: "Volar a la izquierda" },
    derecha: { nombre: "Volar a la derecha" }, subir: { nombre: "Subir" }, bajar: { nombre: "Bajar" },
  } },
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
  ] as [string, string][]) (m[id] ??= []).push(s);
  return m;
})();

/** Los sets que usa un personaje, en orden (los propios primero; «base» al final). */
export const setsDe = (id: Id): string[] => [...(SETS_DE[id] ?? []), "base"];
