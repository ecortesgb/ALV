// Tienda nueva (Maestro v1.48, enfoque A).
// - Demostración sin nube: monedas, comodines y racha viven en este navegador y la tirada se hace aquí, solo para ver la tienda.
// - Con nube: las monedas, la tirada y lo ganado son del servidor (migración 036). Sin la 036 aplicada no se puede comprar.
import { useSyncExternalStore } from "react";
import { escribirCapsulas, leerCapsulas } from "../app/figura3d";
import { ponerPieza } from "../app/equiparPieza";
import { sesionAhora } from "../app/sesion";
import { COMODINES, MONEDAS_DEMO, sobrePorId } from "../content/tienda";
import { crearAzar } from "../engine/azar";
import { RACHA_CERO, abrirSobre } from "../engine/sobresTienda";
import { cliente, hayNube } from "./cliente";
import { agregarPiezasDemo, cargarPiezas, piezasAhora } from "./piezas";
let estado = { activa: !hayNube, demo: !hayNube, monedas: 0, comodines: {}, preciosReposicion: {}, racha: RACHA_CERO, nuevas: new Set() };
const oyentes = new Set();
const fijar = (e) => { estado = { ...estado, ...e }; oyentes.forEach(f => f()); };
export const useTienda = () => useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => estado);
const CLAVE = (uid) => "alv-tienda-demo-" + (uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
function leerDemo(uid) {
    try {
        const d = JSON.parse(localStorage.getItem(CLAVE(uid)) ?? "null");
        if (d && typeof d.monedas === "number")
            return { monedas: d.monedas, comodines: d.comodines ?? {}, racha: d.racha ?? RACHA_CERO, nuevas: d.nuevas ?? [] };
    }
    catch { /* nada */ }
    return { monedas: MONEDAS_DEMO, comodines: {}, racha: RACHA_CERO, nuevas: [] };
}
function escribirDemo(uid, d) { try {
    localStorage.setItem(CLAVE(uid), JSON.stringify(d));
}
catch { /* sin espacio */ } }
const desdeDemo = (d) => ({ monedas: d.monedas, comodines: d.comodines, racha: d.racha, nuevas: new Set(d.nuevas) });
/** Lee el saldo y lo ganado. Llamar al abrir la tienda. */
export async function cargarTienda() {
    await cargarPiezas();
    if (!hayNube) {
        fijar({ activa: true, demo: true, preciosReposicion: Object.fromEntries(COMODINES.map(c => [c.id, c.reposicion])), ...desdeDemo(leerDemo(sesionAhora().uid)) });
        return;
    }
    try {
        const { data, error } = await cliente.rpc("estado_tienda");
        if (error) {
            fijar({ activa: false, demo: false, preciosReposicion: {} });
            return;
        }
        const fila = data?.[0];
        fijar({
            activa: true, demo: false, monedas: fila?.monedas ?? 0, comodines: fila?.comodines ?? {},
            racha: { sinEpica: fila?.sin_epica ?? 0, sinLegendaria: fila?.sin_legendaria ?? 0 },
        });
        const { data: precios } = await cliente.from("comodines_tienda").select().eq("activo", true);
        fijar({ preciosReposicion: Object.fromEntries((precios ?? []).flatMap(c => typeof c.precio_reposicion === "number" ? [[c.id, c.precio_reposicion]] : [])) });
    }
    catch (e) {
        console.error("cargarTienda", e);
        fijar({ activa: false, demo: false, preciosReposicion: {} });
    }
}
export async function reponerComodin(id) {
    const precio = estado.preciosReposicion[id];
    if (!precio)
        return "Esta carta todavía no está disponible.";
    if (estado.demo) {
        const uid = sesionAhora().uid, d = leerDemo(uid);
        if (d.comodines[id] === undefined)
            return "Primero consigue la carta en un sobre.";
        if (d.comodines[id] !== 0)
            return "Todavía tienes copias de esta carta.";
        if (d.monedas < precio)
            return `Te faltan ${precio - d.monedas} monedas.`;
        const nuevo = { ...d, monedas: d.monedas - precio, comodines: { ...d.comodines, [id]: 1 } };
        escribirDemo(uid, nuevo);
        fijar(desdeDemo(nuevo));
        return null;
    }
    const pedido = crypto.randomUUID();
    const parametros = { p_comodin: id, p_pedido: pedido };
    let r = await cliente.rpc("reponer_comodin", parametros);
    if (r.error && /fetch|network|failed/i.test(r.error.message))
        r = await cliente.rpc("reponer_comodin", parametros);
    if (r.error) {
        const m = r.error.message;
        if (m.includes("saldo"))
            return "No te alcanzan las monedas.";
        if (m.includes("copias"))
            return "Todavía tienes copias de esta carta.";
        if (m.includes("sobre"))
            return "Primero consigue la carta en un sobre.";
        return "No se pudo reponer la carta. Intenta otra vez.";
    }
    const d = r.data;
    fijar({ monedas: d.monedas, comodines: { ...estado.comodines, [id]: d.cantidad } });
    return null;
}
/** Nube: el servidor cobra, tira y entrega (abrir_sobre de la 036). Un reintento con el mismo pedido no cobra dos veces. */
async function abrirEnNube(id) {
    const pedido = crypto.randomUUID();
    let r = await cliente.rpc("abrir_sobre", { p_sobre: id, p_pedido: pedido });
    if (r.error && /fetch|network|Failed/i.test(r.error.message))
        r = await cliente.rpc("abrir_sobre", { p_sobre: id, p_pedido: pedido });
    if (r.error) {
        console.error("abrir_sobre", r.error.message);
        const m = r.error.message;
        return m.includes("saldo") ? "No te alcanzan las monedas." : m.includes("ya tienes todo") ? "¡Ya tienes todo lo de este sobre!" : "No se pudo abrir el sobre. Intenta otra vez.";
    }
    const d = r.data;
    const piezas = d.cartas.filter((c) => c.tipo === "pieza").map(c => c.id);
    const comodines = { ...estado.comodines };
    for (const c of d.cartas)
        if (c.tipo === "comodin")
            comodines[c.id] = (comodines[c.id] ?? 0) + 1;
    fijar({ monedas: d.monedas, racha: d.racha, comodines, nuevas: new Set([...estado.nuevas, ...piezas]) });
    await cargarPiezas(); // el personalizador ya las ve desbloqueadas
    return { cartas: d.cartas, mejor: d.mejor, racha: d.racha };
}
/** Abre un sobre. Devuelve lo que salió o el motivo para mostrar. */
export async function abrir(id) {
    const s = sobrePorId(id);
    if (!s)
        return "Ese sobre no existe.";
    if (!estado.activa)
        return "La tienda abre pronto.";
    if (estado.monedas < s.precio)
        return `Te faltan ${s.precio - estado.monedas} monedas.`;
    if (!estado.demo)
        return abrirEnNube(id);
    const uid = sesionAhora().uid, d = leerDemo(uid);
    const azar = crearAzar((Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0);
    const a = abrirSobre(s, piezasAhora().tengo, d.comodines, d.racha, azar);
    if (!a)
        return "¡Ya tienes todo lo de este sobre!";
    const piezas = [];
    const comodines = { ...d.comodines };
    let monedas = d.monedas - s.precio;
    for (const c of a.cartas) {
        if (c.tipo === "pieza")
            piezas.push(c.id);
        else if (c.tipo === "comodin")
            comodines[c.id] = (comodines[c.id] ?? 0) + 1;
        else
            monedas += c.cantidad;
    }
    const nuevo = { monedas, comodines, racha: a.racha, nuevas: [...new Set([...d.nuevas, ...piezas])] };
    escribirDemo(uid, nuevo);
    agregarPiezasDemo(piezas);
    fijar(desdeDemo(nuevo));
    return a;
}
/** Quita el punto azul de las piezas ya vistas en la colección. */
export function marcarVistas() {
    if (!estado.nuevas.size)
        return;
    const uid = sesionAhora().uid;
    if (estado.demo) {
        const d = leerDemo(uid);
        d.nuevas = [];
        escribirDemo(uid, d);
    }
    fijar({ nuevas: new Set() });
}
/** «Ponérmelo»: pone la pieza en la figura que está en juego (o en el primer espacio). Devuelve el número de espacio o null. */
export function ponermelo(id) {
    const uid = sesionAhora().uid, e = leerCapsulas(uid);
    const k = e.activa ?? 0;
    const figura = ponerPieza(e.slots[k]?.figura, id);
    if (!figura)
        return null;
    const slots = e.slots.slice();
    slots[k] = { nombre: slots[k]?.nombre ?? "Mi figura", figura, actualizado: new Date().toISOString() };
    escribirCapsulas(uid, { ...e, slots, activa: e.activa ?? k });
    return k + 1;
}
