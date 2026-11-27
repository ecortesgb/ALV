// Qué puede ver cada interfaz. La Pantalla (TV) y el Anfitrión reciben la vista pública;
// cada celular recibe además solo lo suyo. En producción el servidor arma estas vistas
// y la base de datos (RLS) impide leer lo privado de otro; esto define exactamente qué sale.
import { conEliminacion, conPapeles, enNave, conVerdadReto, etapaImpostor, etapaVR, seleccionVR, porGrupos, puntosPorEquipo, quienesContestan } from "./partida";
export function vistaPublica(e) {
    return {
        version: e.version,
        juegoId: e.juegoId,
        motor: e.motor,
        mazo: e.mazo,
        ronda: e.ronda,
        totalRondas: e.totalRondas,
        fase: e.fase,
        turnoDe: e.turnoDe,
        carta: e.carta,
        seleccion: e.seleccion,
        segundos: e.segundos,
        contestaron: Object.keys(e.respuestas),
        revelado: e.fase === "contestando" ? undefined : e.revelado,
        puntos: { ...e.puntos },
        cartasEnMano: Object.fromEntries(Object.entries(e.manos).map(([j, m]) => [j, m.length])),
        cartaUsada: e.cartaUsada,
        jugadores: e.cfg.jugadores.map(j => ({ id: j.id, nombre: j.nombre })),
        pausada: !!e.pausada,
        pistas: { ...(e.pistas ?? {}) },
        xpReto: { ...(e.xpReto ?? {}) },
        ruleta: e.ruletaExtra,
        control: e.control,
        esperados: quienesContestan(e),
        ausentes: [...(e.ausentes ?? [])],
        esperas: e.esperas ?? 0,
        // Nave con votos secretos: al revelar solo sale el conteo, nunca quién votó a quién.
        votosDe: e.fase !== "contestando" && (e.motor === "rol-secreto" || e.motor === "senalar") && !e.revelado?.saltada
            && !(enNave(e) && e.cfg.impostor?.votos === "secretos")
            ? Object.fromEntries(Object.entries(e.respuestas).map(([j, v]) => [j, String(v)])) : undefined,
        ...(e.cfg.escenario ? { escenario: e.cfg.escenario } : {}),
        ...(e.cfg.modalidad ? { modalidad: e.cfg.modalidad } : {}),
        // La pantalla de carga se quita en todos los aparatos cuando el anfitrión toca «¡Iniciar!».
        ...(e.cfg.explicar && !e.comenzada ? { explicar: true } : {}),
        // Temporizador por turno: solo en partidas que lo eligieron (las guardadas antes salen igual).
        ...(e.cfg.temporizador ? { temporizador: e.cfg.temporizador } : {}),
        ...(conVerdadReto(e) ? { verdadReto: {
                herramienta: seleccionVR(e).herramienta, pregunta: seleccionVR(e).pregunta, responde: seleccionVR(e).responde, etapa: etapaVR(e),
                ...(e.vr?.eleccion ? { eleccion: e.vr.eleccion } : {}), ...(e.vr?.fuente ? { fuente: e.vr.fuente } : {}), verdadUsada: [...(e.verdadUsada ?? [])],
            } } : {}),
        ...(porGrupos(e) ? { grupos: puntosPorEquipo(e).map(g => ({ ...g, nombre: e.cfg.equipos?.find(x => x.id === g.equipo)?.nombre ?? g.equipo, id: g.equipo })).map(({ equipo: _, ...g }) => g) } : {}),
        ...(conEliminacion(e) ? { impostor: {
                // Cuántos impostores hay es público (lo eligió el anfitrión, ya ajustado al número de jugadores); quiénes, no.
                total: Object.values(e.privado).filter(p => p.rol === "impostor").length,
                eliminados: [...(e.eliminados ?? [])], etapa: etapaImpostor(e), orden: [...(e.seleccion?.orden ?? [])],
                ...(enNave(e) ? {
                    nave: { votos: e.cfg.impostor?.votos === "secretos" ? "secretos" : "visibles", revelar: e.cfg.impostor?.revelar !== false, castigo: !!e.cfg.impostor?.castigo },
                    ...(e.cfg.impostor?.votos !== "secretos" && e.fase === "contestando" && etapaImpostor(e) === "votar"
                        ? { votosEnVivo: Object.fromEntries(Object.entries(e.respuestas).map(([j, v]) => [j, String(v)])) } : {}),
                } : {}),
                ...(conPapeles(e) ? {
                    ...(e.naveEtapa === "papeles" ? { vistos: [...(e.vistos ?? [])] } : {}),
                    // Vueltas cerradas + la palabra de esta vuelta (si ya la dijo).
                    palabras: Object.fromEntries(e.cfg.jugadores.map(x => x.id).map(j => [j, [...(e.palabrasVueltas?.[j] ?? []), ...(e.pistas?.[j] && !e.naveEtapa ? [e.pistas[j]] : [])]]).filter(([, l]) => l.length > 0)),
                } : {}),
            } } : {}),
    };
}
export function vistaJugador(e, jugadorId) {
    return { ...vistaPublica(e), yo: jugadorId, mio: e.privado[jugadorId], miRespuesta: e.respuestas[jugadorId], miMano: [...(e.manos[jugadorId] ?? [])] };
}
