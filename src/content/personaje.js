// Personaje de bloques: las capas del armador del Centro de Mando (sin piezas GB ni Movistar).
// Capas de 400×520 que se apilan: piernas, piel, torso, rostro (o facial), cabello y lo que lleva en la mano.
import piezas from "./piezas.json";
import piezasEquipo from "./piezas-equipo.json";
import migracion from "./piezas-migracion.json";
export const PIEZAS = piezas;
export const PIEZAS_EQUIPO = piezasEquipo;
export const piezaEquipo = (id) => (id ? PIEZAS_EQUIPO.find(p => p.id === id) : undefined);
for (const p of PIEZAS_EQUIPO)
    if (p.paso !== "mano" && !PIEZAS[p.paso].some(x => x.id === p.id))
        PIEZAS[p.paso].push({ id: p.id, nombre: p.nombre });
export const PASOS = [
    { k: "piel", nombre: "Piel", titulo: "Tono de piel" },
    { k: "rostro", nombre: "Rostro", titulo: "Expresiones" },
    { k: "facial", nombre: "Facial", titulo: "Lentes, barbas y bigotes", opcional: true, nota: "Cada uno trae su propia expresión: reemplaza la del paso anterior." },
    { k: "cabello", nombre: "Cabello", titulo: "Peinados y sombreros", opcional: true },
    { k: "torso", nombre: "Torso", titulo: "Playeras, chamarras y jerseys" },
    { k: "piernas", nombre: "Piernas", titulo: "Color de piernas" },
];
const PRECIO_MANO = { "acc-tablet": 120, "acc-smartphone": 120, "acc-microfono": 120, "acc-estrella": 120, "acc-medalla": 160, "acc-trofeo": 160 };
export const TIENDA = [
    ...PIEZAS.accesorio.map(a => ({ id: a.id, nombre: a.nombre === "Medalla" ? "Medalla en mano" : a.nombre, zona: "mano", precio: PRECIO_MANO[a.id] ?? 80, nivel: 1, pieza: true })),
    { id: "corona-carton", nombre: "Corona de cartón", zona: "cabeza", precio: 160, nivel: 1 },
    { id: "medallas", nombre: "Medallas de adorno", zona: "pecho", precio: 200, nivel: 3 },
    { id: "collar", nombre: "Collar de oro", zona: "cuello", precio: 280, nivel: 5 },
    { id: "capa", nombre: "Capa de campeón", zona: "espalda", precio: 400, nivel: 10 },
    { id: "corona-neon", nombre: "Corona neón", zona: "cabeza", precio: 480, nivel: 15 },
];
export const ZONAS = [["mano", "En la mano"], ["cabeza", "Cabeza"], ["cuello", "Cuello"], ["pecho", "Pecho"], ["espalda", "Espalda"]];
const ids = (k) => PIEZAS[k].map(p => p.id);
const en = (lista, i) => lista[((i % lista.length) + lista.length) % lista.length];
/** Un personaje distinto para cada lugar del grupo, para que nadie empiece igual. */
export function personajeInicial(i) {
    return {
        piel: en(ids("piel"), [2, 1, 4, 3, 7, 1, 5, 3][i % 8]),
        rostro: en(ids("rostro"), i),
        facial: null,
        cabello: en(ids("cabello"), [0, 35, 25, 65, 5, 45, 15, 55][i % 8]),
        torso: en(ids("torso"), i + 3),
        piernas: en(ids("piernas"), i + 1),
        puesto: {},
    };
}
export function personajeAlAzar(p, azar) {
    const r = (k) => azar.elegir(ids(k).filter(id => !piezaEquipo(id)));
    return { ...p, piel: r("piel"), rostro: r("rostro"), facial: azar.siguiente() < 0.25 ? r("facial") : null,
        cabello: azar.siguiente() < 0.92 ? r("cabello") : null, torso: r("torso"), piernas: r("piernas") };
}
/** Revisa un cambio que llega de un celular: solo piezas que existen y adornos que el jugador ya tiene. */
export function cambioValido(cambio, tiene) {
    for (const paso of PASOS) {
        if (!(paso.k in cambio))
            continue;
        const v = cambio[paso.k];
        if (v === null && paso.opcional)
            continue;
        if (typeof v !== "string" || !ids(paso.k).includes(v))
            return false;
    }
    for (const [zona, v] of Object.entries(cambio.puesto ?? {})) {
        if (v == null)
            continue;
        const art = TIENDA.find(a => a.id === v);
        if (!art || art.zona !== zona || !tiene.includes(v))
            return false;
    }
    return true;
}
/**
 * Las piezas se renombraron (2026-11-12). Esta tabla lleva los personajes y accesorios ya guardados
 * a los nombres nuevos: la llave es una huella del nombre viejo, no el nombre.
 */
const MIGRACION = migracion;
function huella(s) {
    let h = 0x811c9dc5;
    for (const c of new TextEncoder().encode(s))
        h = Math.imul(h ^ c, 0x01000193) >>> 0;
    return h.toString(16);
}
export const idActual = (id) => MIGRACION[huella(id)] ?? id;
export const idActualONulo = (id) => (id ? idActual(id) : null);
/** Personaje guardado con nombres viejos de piezas, pasado a los actuales. */
export function migrarPersonaje(p) {
    const puesto = {};
    for (const [zona, v] of Object.entries(p.puesto ?? {}))
        puesto[zona] = idActualONulo(v);
    return { ...p, piel: idActual(p.piel), rostro: idActual(p.rostro), facial: idActualONulo(p.facial), cabello: idActualONulo(p.cabello),
        torso: idActual(p.torso), piernas: idActual(p.piernas), puesto };
}
export const rutaPieza = (id, mini = false) => `${import.meta.env.BASE_URL}piezas/${id}${mini ? "_m" : ""}.webp`;
