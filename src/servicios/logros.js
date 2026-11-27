// Logros (migración 042; Maestro v1.54, 14.3). El servidor decide cuándo se gana un logro; aquí solo se lee.
// Sin nube (modo demostración) se usa el catálogo de content/logros.ts con un avance de muestra fijo.
// Los logros NO dan XP ni monedas (D0).
import { cliente, hayNube } from "./cliente";
import { LOGROS_ETAPA1 } from "../content/logros";
// ===== Demostración =====
const DEMO_VA = { remontada: 1, sospechoso: 2, intocable: 0, noctambulo: 0, caos: 0, "leyenda-local": 4, "alv-legendario": 4, constante: 3, "primeros-pasos": 1, "primera-victoria": 1, "noche-completa": 3, polifacetico: 10, estratega: 4, suertudo: 7, mvp: 5, imparable: 2,
    veterano: 21, "ya-eres-parte": 5, "casa-llena": 0, popular: 8, dupla: 2, "los-de-siempre": 6, "campeon-noche": 1, "cara-de-poker": 0, detective: 3, valiente: 10 };
const CLAVE_DEST = "alv-logros-destacados-demo";
const CLAVE_TIT = "alv-titulo-demo";
const tituloDemo = () => { try {
    return localStorage.getItem(CLAVE_TIT);
}
catch {
    return null;
} };
const destacadosDemo = () => { try {
    return JSON.parse(localStorage.getItem(CLAVE_DEST) ?? "[]");
}
catch {
    return [];
} };
export function logrosDemo() {
    const dest = destacadosDemo();
    return LOGROS_ETAPA1.map(l => {
        const va = Math.min(DEMO_VA[l.clave] ?? 0, l.meta);
        const ganado = va >= l.meta;
        const tapado = !!l.oculto && !ganado;
        return { ...l, oculto: !!l.oculto, nombre: tapado ? null : l.nombre, descripcion: tapado ? null : l.descripcion, pista: l.pista ?? null, va,
            ganado: ganado ? "2026-11-20T22:00:00Z" : null, destacado: dest.includes(l.clave), en_uso: tituloDemo() === l.clave };
    });
}
// ===== Servidor =====
export async function miProgresoLogros() {
    if (!hayNube)
        return logrosDemo();
    try {
        const { data, error } = await cliente.rpc("mi_progreso_logros");
        if (error) {
            console.error("miProgresoLogros", error.message);
            return null;
        }
        return (data ?? []);
    }
    catch (e) {
        console.error("miProgresoLogros", e);
        return null;
    }
}
/** Logros que la cuenta ganó y todavía no vio. El servidor los marca vistos al entregarlos. */
export async function logrosNuevos() {
    if (!hayNube)
        return [];
    try {
        const { data, error } = await cliente.rpc("mis_logros_nuevos");
        if (error) {
            if (!/Could not find the function|PGRST202/.test(error.message + (error.code ?? "")))
                console.error("logrosNuevos", error.message);
            return [];
        }
        return (data ?? []);
    }
    catch (e) {
        console.error("logrosNuevos", e);
        return [];
    }
}
/** Marca o quita un logro destacado (hasta 3). Devuelve cuántos destacados quedan, o null si no se pudo. */
export async function destacarLogro(clave, si) {
    if (!hayNube) {
        const d = destacadosDemo().filter(c => c !== clave);
        if (si) {
            if (d.length >= 3)
                return null;
            d.push(clave);
        }
        try {
            localStorage.setItem(CLAVE_DEST, JSON.stringify(d));
        }
        catch { /* sin almacenamiento */ }
        return d.length;
    }
    try {
        const { data, error } = await cliente.rpc("destacar_logro", { p_clave: clave, p_si: si });
        if (error) {
            console.error("destacarLogro", error.message);
            return null;
        }
        return data;
    }
    catch (e) {
        console.error("destacarLogro", e);
        return null;
    }
}
/** Usa el nombre de un logro ganado como título (y su marco). null lo quita. */
export async function usarTitulo(clave) {
    if (!hayNube) {
        try {
            if (clave)
                localStorage.setItem(CLAVE_TIT, clave);
            else
                localStorage.removeItem(CLAVE_TIT);
        }
        catch { /* nada */ }
        return true;
    }
    try {
        const { error } = await cliente.rpc("usar_titulo", { p_clave: clave });
        if (error) {
            console.error("usarTitulo", error.message);
            return false;
        }
        return true;
    }
    catch (e) {
        console.error("usarTitulo", e);
        return false;
    }
}
const finDia = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.toISOString(); };
const finSemana = () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); d.setHours(0, 0, 0, 0); return d.toISOString(); };
let demoObj = [
    { clave: "dia-partidas", periodo: "dia", nombre: "Juega 3 partidas", meta: 3, va: 2, xp: 100, reclamado: false, termina: finDia(), orden: 10 },
    { clave: "dia-victoria", periodo: "dia", nombre: "Gana una partida", meta: 1, va: 1, xp: 100, reclamado: false, termina: finDia(), orden: 20 },
    { clave: "dia-juego-nuevo", periodo: "dia", nombre: "Prueba un juego que no conocías", meta: 1, va: 0, xp: 150, reclamado: false, termina: finDia(), orden: 30 },
    { clave: "dia-personas", periodo: "dia", nombre: "Juega con 3 personas", meta: 3, va: 3, xp: 200, reclamado: true, termina: finDia(), orden: 40 },
    { clave: "sem-victorias", periodo: "semana", nombre: "Gana 5 partidas", meta: 5, va: 3, xp: 300, reclamado: false, termina: finSemana(), orden: 110 },
    { clave: "sem-partidas", periodo: "semana", nombre: "Juega 15 partidas", meta: 15, va: 9, xp: 300, reclamado: false, termina: finSemana(), orden: 120 },
    { clave: "sem-mvp", periodo: "semana", nombre: "Sé el MVP 3 veces", meta: 3, va: 1, xp: 250, reclamado: false, termina: finSemana(), orden: 130 },
];
export async function misObjetivos() {
    if (!hayNube)
        return demoObj.map(o => ({ ...o }));
    try {
        const { data, error } = await cliente.rpc("mis_objetivos");
        if (error) {
            console.error("misObjetivos", error.message);
            return null;
        }
        return (data ?? []);
    }
    catch (e) {
        console.error("misObjetivos", e);
        return null;
    }
}
/** Cobra un objetivo cumplido. Devuelve la XP que dio, o null si no se pudo. */
export async function reclamarObjetivo(clave) {
    if (!hayNube) {
        const o = demoObj.find(x => x.clave === clave);
        if (!o || o.reclamado || o.va < o.meta)
            return null;
        demoObj = demoObj.map(x => (x === o ? { ...x, reclamado: true } : x));
        return o.xp;
    }
    try {
        const { data, error } = await cliente.rpc("reclamar_objetivo", { p_clave: clave });
        if (error) {
            console.error("reclamarObjetivo", error.message);
            return null;
        }
        return data;
    }
    catch (e) {
        console.error("reclamarObjetivo", e);
        return null;
    }
}
export async function logrosRecientesSala(evento) {
    if (!hayNube || !/^[0-9a-f-]{36}$/i.test(evento))
        return [];
    try {
        const { data, error } = await cliente.rpc("logros_recientes_sala", { p_evento: evento });
        if (error) {
            if (!/Could not find the function|PGRST202/.test(error.message + (error.code ?? "")))
                console.error("logrosRecientesSala", error.message);
            return [];
        }
        return (data ?? []);
    }
    catch (e) {
        console.error("logrosRecientesSala", e);
        return [];
    }
}
