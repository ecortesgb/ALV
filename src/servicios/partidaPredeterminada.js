import { cliente, cuentaActiva } from "./cliente";
const CLAVE = "alv-partida-predeterminada";
const local = () => { try {
    return JSON.parse(localStorage.getItem(`${CLAVE}-${cuentaActiva() ?? "demo"}`) ?? "null");
}
catch {
    return null;
} };
const guardarLocal = (p) => {
    try {
        const k = `${CLAVE}-${cuentaActiva() ?? "demo"}`;
        if (p)
            localStorage.setItem(k, JSON.stringify(p));
        else
            localStorage.removeItem(k);
    }
    catch { /* sin almacenamiento */ }
};
const nivel = (x) => (x === 2 || x === 3 ? x : 1);
/** Lo que devuelve la 039 convertido a una partida del configurador. */
export function desdeCuenta(d, extra) {
    if (!d || typeof d.juego !== "string")
        return null;
    const mod = d.modalidad === "parejas" || d.modalidad === "equipos" || d.modalidad === "sexos" ? d.modalidad : "individual";
    const mismo = extra?.juego === d.juego ? extra.opciones : undefined;
    return {
        juego: d.juego,
        rondas: typeof d.rondas === "number" ? d.rondas : 8,
        ejes: { temperatura: nivel(d.temperatura), voltaje: nivel(d.voltaje), drunk: d.drunk === true },
        opciones: {
            modalidad: mod,
            ...(typeof d.escenario === "string" ? { escenario: d.escenario } : {}),
            ...(typeof d.temporizador === "number" ? { temporizador: d.temporizador } : {}),
            ...(d.explicar === true ? { explicar: true } : {}),
            ...(mismo?.herramienta ? { herramienta: mismo.herramienta } : {}),
            ...(mismo?.turno ? { turno: mismo.turno } : {}),
            ...(mismo?.impostor ? { impostor: mismo.impostor } : {}),
        },
    };
}
/** Lo que se manda a `guardar_preferencias` (solo las claves que valida la 039). */
export function paraCuenta(p) {
    return {
        juego: p.juego, modalidad: p.opciones.modalidad ?? "individual", escenario: p.opciones.escenario ?? null,
        rondas: Math.round(Math.min(40, Math.max(1, p.rondas))), temporizador: p.opciones.temporizador ?? null,
        temperatura: p.ejes.temperatura, voltaje: p.ejes.voltaje, drunk: p.ejes.drunk, explicar: !!p.opciones.explicar,
    };
}
/** Lee la partida predeterminada (null si no hay). */
export async function leerPartidaPredeterminada() {
    const aqui = local();
    if (!cliente || !cuentaActiva())
        return aqui;
    try {
        const { data, error } = await cliente.from("preferencias_cuenta").select("datos").maybeSingle();
        if (error) {
            console.error("partida predeterminada", error.message);
            return aqui;
        }
        const d = data?.datos?.partida;
        return desdeCuenta(d, aqui);
    }
    catch (e) {
        console.error("partida predeterminada", e);
        return aqui;
    }
}
/** Guarda (o borra, con null) la partida predeterminada. Devuelve null si salió bien, o el motivo. */
export async function guardarPartidaPredeterminada(p) {
    if (!cliente || !cuentaActiva()) {
        guardarLocal(p);
        return null;
    }
    try {
        const { error } = await cliente.rpc("guardar_preferencias", { p: { partida: p ? paraCuenta(p) : null } });
        if (error) {
            console.error("guardar partida predeterminada", error.message);
            return error.message.includes("sin permiso") ? "Solo un administrador puede guardarla." : "No se pudo guardar. Intenta otra vez.";
        }
        guardarLocal(p);
        return null;
    }
    catch (e) {
        console.error("guardar partida predeterminada", e);
        return "No se pudo guardar. Intenta otra vez.";
    }
}
