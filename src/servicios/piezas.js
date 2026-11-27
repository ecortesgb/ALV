// Piezas desbloqueadas y retos del personalizador (migración 033).
// - Con nube y la 033 aplicada: lo dice el servidor (piezas_jugador, retos_jugador) y las compras/retos son funciones RPC.
// - Con nube SIN la 033 (todavía no autorizada): el sistema queda apagado y todo está libre, como antes.
// - Sin nube (demostración): por ahora todo libre (D5 del plan de 3 modos, 2026-11-19: Elías dará el catálogo de qué va
//   bloqueado). Con `LIBRE_EN_DEMO = false` vuelve la simulación con 1 000 XP de mentira.
//   Con nube manda la base: la 033 sigue aplicada y su guardián rechaza figuras con piezas bloqueadas.
import { useSyncExternalStore } from "react";
import { leerCapsulas } from "../app/figura3d";
import { refrescarSesion, sesionAhora } from "../app/sesion";
import { cumple } from "../app/retos";
import { PRECIO, RETOS, XP_SI_YA_LA_TIENES, hoyMexico, rarezaDe, retoDelDia } from "../content/rarezas";
import { cliente, hayNube } from "./cliente";
import { guardarCapsulasNube } from "./cuenta";
let estado = { activo: false, tengo: new Set(), reclamados: new Set(), xp: 0, demo: !hayNube, bloqueables: null };
const oyentes = new Set();
const fijar = (e) => { estado = { ...estado, ...e }; oyentes.forEach(f => f()); };
export const usePiezas = () => useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => estado);
export const piezasAhora = () => estado;
// ---------- Demostración (sin nube) ----------
const LIBRE_EN_DEMO = true;
const CLAVE_DEMO = (uid) => "alv-piezas-demo-" + (uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
function leerDemo(uid) {
    try {
        const d = JSON.parse(localStorage.getItem(CLAVE_DEMO(uid)) ?? "null");
        if (d && Array.isArray(d.tengo))
            return d;
    }
    catch { /* nada */ }
    return { tengo: [], reclamados: [], xp: 1000 };
}
function escribirDemo(uid, d) { try {
    localStorage.setItem(CLAVE_DEMO(uid), JSON.stringify(d));
}
catch { /* sin espacio */ } }
/** Lee lo desbloqueado. Llamar al abrir el personalizador. */
export async function cargarPiezas() {
    const s = sesionAhora();
    if (!hayNube) {
        const d = leerDemo(s.uid);
        fijar({ activo: !LIBRE_EN_DEMO, demo: true, tengo: new Set(d.tengo), reclamados: new Set(d.reclamados), xp: d.xp });
        return;
    }
    try {
        const [p, r, b] = await Promise.all([
            cliente.from("piezas_jugador").select("pieza"),
            cliente.from("retos_jugador").select("reto, dia"),
            cliente.from("piezas_figura").select("id").eq("activo", true),
        ]);
        if (p.error || r.error || b.error) {
            fijar({ activo: false, demo: false, xp: s.disponible });
            return;
        } // sin la 033: todo libre
        // Con la 037 ninguna pieza queda activa: el sistema se apaga y todo es libre (Maestro v1.50). Cuando Elías reactive
        // piezas de su catálogo, solo esas vuelven a pedir desbloqueo.
        const bloqueables = new Set((b.data ?? []).map(x => String(x.id)));
        fijar({
            activo: bloqueables.size > 0, demo: false, xp: s.disponible, bloqueables,
            tengo: new Set((p.data ?? []).map(x => String(x.pieza))),
            reclamados: new Set((r.data ?? []).map(x => (String(x.dia) === "2000-01-01" ? String(x.reto) : `${x.reto}@${x.dia}`))),
        });
    }
    catch (e) {
        console.error("cargarPiezas", e);
        fijar({ activo: false });
    }
}
/** ¿Esta pieza se puede usar ya? */
export const libre = (id, e = estado) => !e.activo || !id || (e.bloqueables ? !e.bloqueables.has(id) : rarezaDe(id) === "comun") || e.tengo.has(id);
/** Desbloquea con XP. Devuelve null si salió bien o el motivo para mostrar. */
export async function desbloquear(id) {
    const precio = PRECIO[rarezaDe(id)];
    if (!precio || estado.tengo.has(id))
        return null;
    if (estado.xp < precio)
        return `Te faltan ${precio - estado.xp} XP.`;
    if (estado.demo) {
        const uid = sesionAhora().uid, d = leerDemo(uid);
        d.tengo = [...new Set([...d.tengo, id])];
        d.xp -= precio;
        escribirDemo(uid, d);
        fijar({ tengo: new Set(d.tengo), xp: d.xp });
        return null;
    }
    const { error } = await cliente.rpc("desbloquear_pieza", { p_pieza: id });
    if (error) {
        console.error("desbloquear_pieza", error.message);
        return error.message.includes("saldo") ? "No te alcanza la XP." : "No se pudo desbloquear. Intenta otra vez.";
    }
    await refrescarSesion();
    fijar({ tengo: new Set([...estado.tengo, id]), xp: sesionAhora().disponible });
    return null;
}
/** Demostración sin nube: piezas ganadas en un sobre de la tienda quedan desbloqueadas en el personalizador. */
export function agregarPiezasDemo(ids) {
    if (!ids.length)
        return;
    const uid = sesionAhora().uid, d = leerDemo(uid);
    d.tengo = [...new Set([...d.tengo, ...ids])];
    escribirDemo(uid, d);
    if (estado.demo)
        fijar({ tengo: new Set(d.tengo) });
}
export const claveReto = (id, tipo, dia = hoyMexico()) => (tipo === "diario" ? `${id}@${dia}` : id);
/** Reclama un reto con la figura del espacio `capsula` (1 a 3). Devuelve lo ganado o el motivo. */
export async function reclamar(id, capsula) {
    const reto = RETOS.find(r => r.id === id);
    if (!reto)
        return "Reto no válido.";
    if (reto.tipo === "diario" && retoDelDia(hoyMexico()).id !== id)
        return "Ese no es el reto de hoy.";
    const clave = claveReto(id, reto.tipo);
    if (estado.reclamados.has(clave))
        return "Ya lo reclamaste.";
    const uid = sesionAhora().uid, figura = leerCapsulas(uid).slots[capsula - 1]?.figura;
    if (!cumple(figura, reto.condicion))
        return "Tu figura todavía no cumple el reto.";
    if (estado.demo) {
        const d = leerDemo(uid), ya = d.tengo.includes(reto.premio);
        if (!ya)
            d.tengo.push(reto.premio);
        else
            d.xp += XP_SI_YA_LA_TIENES;
        d.reclamados.push(clave);
        escribirDemo(uid, d);
        fijar({ tengo: new Set(d.tengo), reclamados: new Set(d.reclamados), xp: d.xp });
        return { pieza: ya ? null : reto.premio, xp: ya ? XP_SI_YA_LA_TIENES : 0 };
    }
    // El servidor revisa la figura guardada en la nube: primero se sube la de este celular.
    if (!(await guardarCapsulasNube(leerCapsulas(uid))))
        return "No se pudo guardar tu figura. Revisa tu conexión.";
    const { data, error } = await cliente.rpc("reclamar_reto", { p_reto: id, p_capsula: capsula });
    if (error) {
        console.error("reclamar_reto", error.message);
        return error.message.includes("cumple") ? "Tu figura todavía no cumple el reto." : "No se pudo reclamar. Intenta otra vez.";
    }
    const fila = data?.[0] ?? { pieza: null, xp: 0 };
    await refrescarSesion();
    fijar({ tengo: fila.pieza ? new Set([...estado.tengo, fila.pieza]) : estado.tengo, reclamados: new Set([...estado.reclamados, clave]), xp: sesionAhora().disponible });
    return fila;
}
/**
 * Premios por nivel (migración 052, Maestro v1.67): el servidor regala un personaje por cada nivel nuevo y los devuelve.
 * Sin la 052, sin acceso a personajes o en demostración devuelve [] (no se inventa nada).
 */
export async function reclamarPremiosNivel() {
    if (!hayNube)
        return [];
    try {
        const { data, error } = await cliente.rpc("reclamar_premios_nivel");
        if (error) {
            console.error("reclamar_premios_nivel", error.message);
            return [];
        }
        const nuevos = (data ?? []).map(x => ({ personaje: String(x.personaje), nivel: Number(x.nivel), rareza: String(x.rareza) }));
        if (nuevos.length) {
            const { cargarPersonajesTienda } = await import("./tienda");
            await cargarPersonajesTienda();
        }
        return nuevos;
    }
    catch (e) {
        console.error("reclamarPremiosNivel", e);
        return [];
    }
}
