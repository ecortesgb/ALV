// Datos por jugador que viajan al servidor al terminar la partida (migración 040, `resultados_partida.datos`).
// Puro: solo lee el estado final y su bitácora. El servidor guarda únicamente las claves que conoce y valida los rangos.
// Lo que el estado final no guarda (quién votó a quién en cada ronda, el lugar ronda por ronda) sale de repetir las
// acciones guardadas paso a paso (`datosDeRepeticion`), sin cambiar el motor ni su prueba de equivalencia.
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { aAccion } from "./nucleo";
import { aplicar, conEliminacion, crearPartida, resultados } from "./partida";
const rol = (e, j) => e.privado[j]?.rol;
const reveladas = (e) => e.bitacora.filter(b => b.tipo === "revelada").map(b => (b.datos ?? {}));
export function datosPorJugador(e) {
    const out = {};
    const ids = e.cfg.jugadores.map(j => j.id);
    if (e.motor === "rol-secreto") {
        const rondas = reveladas(e).filter(r => !r.saltada);
        for (const j of ids) {
            const d = { impostor: false, atrapado: false, votosRecibidos: 0 };
            if (conEliminacion(e)) {
                // Los papeles no cambian en toda la partida.
                d.impostor = rol(e, j) === "impostor";
                d.atrapado = d.impostor && (e.eliminados ?? []).includes(j);
                if (!d.impostor)
                    for (const r of rondas)
                        d.votosRecibidos += Number(r.votos?.[j] ?? 0);
            }
            else {
                // Modo clásico: cada ronda tiene su impostor.
                for (const r of rondas) {
                    if (r.impostor === j) {
                        d.impostor = true;
                        if (r.atrapado)
                            d.atrapado = true;
                    }
                    else
                        d.votosRecibidos += Number(r.votos?.[j] ?? 0);
                }
            }
            out[j] = d;
        }
    }
    if (e.juegoId === "verdad-reto") {
        for (const j of ids) {
            const reto = e.bitacora.filter(b => b.tipo === "elige" && b.jugador === j && b.datos?.opcion === "reto").length;
            const tomo = reveladas(e).filter(r => r.jugador === j && r.resultado === "tomo").length;
            out[j] = { ...out[j], reto, tomo };
        }
    }
    return out;
}
/**
 * Repite la partida acción por acción (igual que `reconstruir`) y mira el estado justo antes de cada revelación:
 * cuántas veces votó cada quien por un impostor y el peor lugar que tuvo después de cada ronda.
 */
export function datosDeRepeticion(filas, anfitrion) {
    const a = filas.find(f => f.tipo === "control" && f.jugador === anfitrion && f.datos.que === "arranque");
    if (!a)
        return {};
    const d = a.datos;
    const def = JUEGOS.find(j => j.id === d.juego);
    if (!def?.motor || typeof d.semilla !== "number" || !Array.isArray(d.cfg?.jugadores))
        return {};
    let e = { ...crearPartida(def, d.cfg, d.semilla, CONTENIDO, d.rondas), control: anfitrion };
    const out = {};
    const de = (j) => (out[j] ??= {});
    for (const f of filas) {
        if (f === a)
            continue;
        const acc = aAccion(f, [anfitrion, e.control ?? anfitrion]);
        if (!acc)
            continue;
        const antes = e;
        e = aplicar(e, acc, CONTENIDO);
        if (antes.fase !== "revelada" && e.fase === "revelada" && e.bitacora.length > antes.bitacora.length && !e.revelado?.saltada) {
            if (e.motor === "rol-secreto") {
                for (const [j, v] of Object.entries(antes.respuestas)) {
                    if (typeof v === "string" && rol(antes, v) === "impostor" && rol(antes, j) !== "impostor")
                        de(j).votoImpostor = (de(j).votoImpostor ?? 0) + 1;
                }
            }
            for (const r of resultados(e))
                de(r.jugador).peorLugar = Math.max(de(r.jugador).peorLugar ?? 1, r.lugar);
        }
    }
    if (e.motor !== "rol-secreto")
        for (const j of Object.keys(out))
            delete out[j].votoImpostor;
    return out;
}
