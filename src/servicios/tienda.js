// Tienda nueva (Maestro v1.48, enfoque A).
// - Demostración sin nube: monedas, comodines y racha viven en este navegador y la tirada se hace aquí, solo para ver la tienda.
// - Con nube: las monedas, la tirada y lo ganado son del servidor (migración 036). Sin la 036 aplicada no se puede comprar.
import { useSyncExternalStore } from "react";
import { escribirCapsulas, leerCapsulas } from "../app/figura3d";
import { ponerPieza } from "../app/equiparPieza";
import { sesionAhora } from "../app/sesion";
import { COMODINES, MONEDAS_DEMO, sobrePorId } from "../content/tienda";
import { CARTAS_POR_SOBRE_PERSONAJES, PESO_PERSONAJE, precioSobrePersonajes } from "../content/personajesTienda";
import { crearAzar } from "../engine/azar";
import { ORDEN, RACHA_CERO, abrirSobre } from "../engine/sobresTienda";
import { cliente, hayNube } from "./cliente";
import { agregarPiezasDemo, cargarPiezas, piezasAhora } from "./piezas";
let estado = { activa: !hayNube, demo: !hayNube, monedas: 0, comodines: {}, preciosReposicion: {}, catalogoPersonajes: null,
    personajes: new Set(), racha: RACHA_CERO, nuevas: new Set() };
const oyentes = new Set();
const fijar = (e) => { estado = { ...estado, ...e }; oyentes.forEach(f => f()); };
export const useTienda = () => useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => estado);
const CLAVE = (uid) => "alv-tienda-demo-" + (uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
function leerDemo(uid) {
    try {
        const d = JSON.parse(localStorage.getItem(CLAVE(uid)) ?? "null");
        if (d && typeof d.monedas === "number")
            return { monedas: d.monedas, comodines: d.comodines ?? {}, racha: d.racha ?? RACHA_CERO,
                nuevas: d.nuevas ?? [], personajes: Array.isArray(d.personajes) ? d.personajes : [] };
    }
    catch { /* nada */ }
    return { monedas: MONEDAS_DEMO, comodines: {}, racha: RACHA_CERO, nuevas: [], personajes: [] };
}
function escribirDemo(uid, d) { try {
    localStorage.setItem(CLAVE(uid), JSON.stringify(d));
}
catch { /* sin espacio */ } }
const desdeDemo = (d) => ({ monedas: d.monedas, comodines: d.comodines, racha: d.racha, nuevas: new Set(d.nuevas), personajes: new Set(d.personajes) });
export async function cargarPersonajesTienda() {
    const uid = sesionAhora().uid;
    if (!hayNube) {
        fijar({ personajes: new Set(leerDemo(uid).personajes) });
        return;
    }
    const { data, error } = await cliente.rpc("estado_personajes_tienda");
    if (uid !== sesionAhora().uid)
        return;
    const resultado = !error && data;
    fijar({ catalogoPersonajes: resultado ? resultado.catalogo : null, personajes: new Set(resultado ? resultado.personajes : []) });
}
/** Lee el saldo y lo ganado. Llamar al abrir la tienda. */
export async function cargarTienda() {
    await Promise.all([cargarPiezas(), cargarPersonajesTienda()]);
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
export async function comprarPersonajes(modo, destino, precio, catalogoDemo) {
    const uid = sesionAhora().uid;
    let cartas;
    if (estado.demo) {
        const d = leerDemo(uid), adquiridos = new Set(d.personajes);
        const lista = catalogoDemo.filter(x => (modo === "sobre" ? x.saga === destino : x.id === destino) && !adquiridos.has(x.id));
        if (!lista.length)
            return "Ya no quedan personajes disponibles.";
        if (precio !== (modo === "sobre" ? precioSobrePersonajes(lista.length) : lista[0].precio))
            return "El precio cambió. Revisa el saldo y vuelve a intentar.";
        if (d.monedas < precio)
            return "No te alcanzan las monedas.";
        const cantidad = modo === "sobre" ? Math.min(CARTAS_POR_SOBRE_PERSONAJES, lista.length) : 1;
        cartas = Array.from({ length: cantidad }, () => {
            let tiro = Math.random() * lista.reduce((suma, c) => suma + PESO_PERSONAJE[c.rareza], 0);
            const i = lista.findIndex(c => (tiro -= PESO_PERSONAJE[c.rareza]) < 0);
            const [c] = lista.splice(i, 1);
            return { tipo: "personaje", id: c.id, rareza: c.rareza };
        });
        const nuevo = { ...d, monedas: d.monedas - precio, personajes: [...d.personajes, ...cartas.map(c => c.id)] };
        escribirDemo(uid, nuevo);
        fijar(desdeDemo(nuevo));
    }
    else {
        if (!estado.catalogoPersonajes || !cliente)
            return "La venta de personajes todavía no está activa.";
        const datos = { p_modo: modo, p_destino: destino, p_precio: precio, p_pedido: crypto.randomUUID() };
        let r = await cliente.rpc("comprar_personajes", datos);
        if (r.error && /fetch|network|failed/i.test(r.error.message))
            r = await cliente.rpc("comprar_personajes", datos);
        if (uid !== sesionAhora().uid)
            return "Cambió la sesión.";
        if (r.error) {
            if (/precio|disponibles/.test(r.error.message)) {
                await cargarPersonajesTienda();
                return "Cambió la disponibilidad. Revisa la colección.";
            }
            return r.error.message.includes("saldo") ? "No te alcanzan las monedas." : "No se pudo completar la compra.";
        }
        const compra = r.data;
        cartas = compra.cartas;
        fijar({ monedas: compra.monedas, personajes: new Set([...estado.personajes, ...cartas.map(c => c.id)]) });
    }
    cartas.sort((a, b) => ORDEN.indexOf(a.rareza) - ORDEN.indexOf(b.rareza));
    return { cartas, racha: estado.racha, mejor: cartas.at(-1).rareza };
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
        else if (c.tipo === "monedas")
            monedas += c.cantidad;
    }
    const nuevo = { ...d, monedas, comodines, racha: a.racha, nuevas: [...new Set([...d.nuevas, ...piezas])] };
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
