// Lo que cualquier aparato puede decir de la partida usando solo la vista pública.
import { JUEGOS } from "../../content/catalogo";
import { VR_PUNTOS } from "../../engine/partida";
export const esPublico = (e) => !!e && typeof e.juegoId === "string" && Array.isArray(e.jugadores) && typeof e.fase === "string";
export const nombreJuego = (id) => (id === "copas" ? "Copas de la noche" : JUEGOS.find(j => j.id === id)?.nombre ?? "Partida");
export const nombreDe = (v, id) => v.jugadores.find(j => j.id === id)?.nombre ?? "Alguien";
const lista = (ns) => (ns.length <= 1 ? ns.join("") : ns.slice(0, -1).join(", ") + " y " + ns.at(-1));
/** Qué se le pide a la mesa en esta ronda. */
export function instruccion(v) {
    const turno = nombreDe(v, v.turnoDe);
    switch (v.motor) {
        case "turnos-cartas": {
            const vr = v.verdadReto;
            if (vr) {
                const r = nombreDe(v, vr.responde), p = nombreDe(v, vr.pregunta);
                if (vr.etapa === "elegir")
                    return `${r} elige: ¿verdad o reto?`;
                if (vr.etapa === "fuente")
                    return `${p} prepara ${vr.eleccion === "reto" ? "el reto" : "la pregunta"} para ${r}`;
                if (vr.etapa === "calificar")
                    return `${r}: ${vr.eleccion === "reto" ? "haz el reto" : "responde"} o toma. ${p} califica`;
                return `${r} pasó con un comodín`;
            }
            return `Turno de ${turno}: ${v.carta?.tipo === "reto" ? "reto" : "verdad"}`;
        }
        case "botella": return `${nombreDe(v, v.seleccion?.pregunta)} le pregunta a ${turno}`;
        case "ruleta": return `La ruleta eligió a ${turno}`;
        case "dados": return `Tiran los dados: ${turno} y ${nombreDe(v, v.seleccion?.a)}`;
        case "votacion": return "Elijan en secreto en su celular";
        case "rol-secreto":
            if (v.impostor)
                return v.impostor.etapa === "votar" ? "¡A votar! ¿Quién es el impostor?" : `Le toca a ${turno}: dila y escríbela`;
            return "Digan una pista por turno y voten al impostor";
        case "pareja": return "Cada pareja contesta en secreto";
        case "conteo": return `Turno de ${turno}`;
        case "confesion": return "Yo nunca… ¿o sí? Contesten en su celular";
        case "senalar": return "Señalen a alguien en su celular";
        case "competencia": return "Compitan. El anfitrión marca quién ganó";
        case "fisico": return "Hagan el reto en persona. El administrador da los puntos";
    }
}
/** Juego físico: «+2 Ana · −1 Beto» con lo que se dio en la ronda (lo más alto primero). */
export function resumenDeltas(v, deltas) {
    const xs = Object.entries(deltas ?? {}).filter(([, d]) => d !== 0).sort((a, b) => b[1] - a[1]);
    return xs.map(([j, d]) => `${d > 0 ? "+" : "−"}${Math.abs(d)} ${nombreDe(v, j)}`).join("  ·  ");
}
/** Lo que pasó en la ronda, ya revelada. Titular y detalle. */
export function desenlace(v) {
    const r = (v.revelado ?? {});
    if (r.saltada)
        return { titular: "Ronda saltada", detalle: "Nadie suma puntos." };
    switch (v.motor) {
        case "turnos-cartas":
        case "botella":
        case "ruleta":
        case "dados":
            if (v.verdadReto && typeof r.resultado === "string") {
                const quien = nombreDe(v, r.jugador), reto = r.eleccion === "reto";
                if (r.resultado === "cumplio")
                    return { titular: reto ? `¡${quien} cumplió el reto!` : `¡${quien} respondió!`, detalle: `+${reto ? VR_PUNTOS.reto : VR_PUNTOS.verdad} ${reto ? "puntos" : "punto"}` };
                if (r.resultado === "tomo")
                    return { titular: `${quien} tomó`, detalle: `+${VR_PUNTOS.tomar} ${VR_PUNTOS.tomar === 1 ? "punto" : "puntos"}` };
                if (r.resultado === "tiempo")
                    return { titular: `Se le acabó el tiempo a ${quien}`, detalle: "Pierde el turno: sin puntos." };
                return { titular: `${quien} pasó con un comodín`, detalle: "Sin puntos esta vez." };
            }
            return r.cumplio ? { titular: `¡${nombreDe(v, r.jugador)} cumplió!` } : { titular: `${nombreDe(v, r.jugador)} no cumplió`, detalle: "Sin puntos esta vez." };
        case "votacion": {
            const c = r.cuenta;
            if (!c)
                return { titular: "¡Se revelan las elecciones!" };
            return r.mayoria ? { titular: `Gana ${r.mayoria === "a" ? v.carta?.texto : v.carta?.opcionB}`, detalle: `${c.a} contra ${c.b}` } : { titular: "Empate", detalle: `${c.a} contra ${c.b}. Nadie suma.` };
        }
        case "rol-secreto":
            if (v.impostor)
                return desenlaceImpostor(v);
            return { titular: r.atrapado ? `¡Atraparon a ${nombreDe(v, r.impostor)}!` : `${nombreDe(v, r.impostor)} era el impostor y escapó`, detalle: `La palabra era «${String(r.palabra ?? "")}»` };
        case "pareja": {
            const res = (r.resultados ?? []);
            const ok = res.filter(x => x.coinciden).map(x => `${nombreDe(v, x.pareja[0])} y ${nombreDe(v, x.pareja[1])}`);
            return ok.length ? { titular: "¡Coincidieron!", detalle: lista(ok) } : { titular: "Nadie coincidió" };
        }
        case "conteo": return { titular: `${nombreDe(v, r.jugador)} logró ${String(r.logro ?? 0)}` };
        case "confesion": {
            const c = (r.confesaron ?? []).map(j => nombreDe(v, j));
            return c.length ? { titular: "Confesaron", detalle: lista(c) } : { titular: "Nadie lo ha hecho" };
        }
        case "senalar": return { titular: lista((r.elegidos ?? []).map(j => nombreDe(v, j))), detalle: "La mesa los señaló" };
        case "competencia": return { titular: `¡Ganó ${nombreDe(v, r.ganador)}!`, detalle: "+3 puntos" };
        case "fisico": {
            const txt = resumenDeltas(v, r.deltas);
            return txt ? { titular: "¡Ronda terminada!", detalle: txt } : { titular: "Ronda terminada", detalle: "Nadie sumó ni perdió puntos." };
        }
    }
}
/** Marcador de mayor a menor, con el lugar (los empates comparten lugar). */
export function marcador(v) {
    const orden = [...v.jugadores].sort((a, b) => (v.puntos[b.id] ?? 0) - (v.puntos[a.id] ?? 0));
    let lugar = 0, previo = null;
    return orden.map((j, i) => { const p = v.puntos[j.id] ?? 0; if (p !== previo) {
        lugar = i + 1;
        previo = p;
    } return { id: j.id, nombre: j.nombre, puntos: p, lugar }; });
}
/** Segundos que le quedan al reloj de la ronda (0 si no hay). */
export const quedan = (v, ahora = Date.now()) => (v.reloj ? Math.max(0, (v.reloj.fin - ahora) / 1000) : 0);
/** El impostor con eliminación: qué pasó en la votación de esta vuelta (y quién ganó, si se acabó). */
export function desenlaceImpostor(v) {
    const r = (v.revelado ?? {});
    if (r.saltada)
        return { titular: "Votación saltada", detalle: "Nadie sale en esta vuelta." };
    const palabra = r.palabra ? `La palabra era «${r.palabra}». ` : "";
    const quienes = lista((r.impostores ?? []).map(j => nombreDe(v, j)));
    const varios = (r.impostores ?? []).length > 1;
    if (v.impostor?.nave)
        return desenlaceNave(v, palabra, quienes, varios);
    if (r.fin === "civiles")
        return { titular: "¡Ganan los civiles!", detalle: `${palabra}${varios ? "Los impostores eran" : "El impostor era"} ${quienes}.` };
    if (r.fin === "impostores") {
        const sale = r.eliminado ? `${nombreDe(v, r.eliminado)} salió y ` : "";
        return { titular: varios ? "¡Ganan los impostores!" : "¡Gana el impostor!", detalle: `${sale}${varios ? "los impostores eran" : "el impostor era"} ${quienes}. ${palabra}`.trim() };
    }
    if (!r.eliminado)
        return { titular: "¡Empate!", detalle: "Nadie sale. Otra vuelta." };
    const nombre = nombreDe(v, r.eliminado);
    if (r.eraImpostor)
        return { titular: `¡${nombre} era impostor!`, detalle: r.quedan === 1 ? "Queda uno más. Otra vuelta." : `Quedan ${r.quedan ?? 0}. Otra vuelta.` };
    return { titular: `${nombre} no era el impostor`, detalle: "Sale de escena. El impostor sigue entre ustedes." };
}
/** El impostor en la nave (Elías, 24 nov): textos propios de la nave; con «Guardar el secreto» no se dice si era impostor. */
function desenlaceNave(v, palabra, quienes, varios) {
    const r = (v.revelado ?? {});
    const quienEra = `${varios ? "Los impostores eran" : "El impostor era"} ${quienes}.`;
    if (r.fin === "civiles")
        return { titular: "¡La nave está a salvo!", detalle: `${palabra}${quienEra}` };
    if (r.fin === "impostores")
        return { titular: varios ? "¡Los impostores se quedaron con la nave!" : "¡El impostor se quedó con la nave!", detalle: `${palabra}${quienEra}` };
    if (!r.eliminado)
        return { titular: "Nadie sale esta vez", detalle: r.empate && (r.saltos ?? 0) > 0 && !Object.values(v.revelado.votos ?? {}).some(n => n > (r.saltos ?? 0)) ? "Ganó «Nadie». Otra vuelta." : r.empate ? "Hubo empate. Otra vuelta." : "Nadie votó. Otra vuelta." };
    const nombre = nombreDe(v, r.eliminado);
    if (r.secreto)
        return { titular: `¡${nombre} salió volando!`, detalle: "Si era impostor, se sabrá al final. Otra vuelta." };
    if (r.eraImpostor)
        return { titular: `¡${nombre} salió volando y era impostor!`, detalle: r.quedan === 1 ? "Queda 1 impostor a bordo. Otra vuelta." : `Quedan ${r.quedan ?? 0} impostores a bordo. Otra vuelta.` };
    return { titular: `¡${nombre} salió volando!`, detalle: `Era civil. ${r.quedan === 1 ? "Queda 1 impostor" : `Quedan ${r.quedan ?? 0} impostores`} a bordo.` };
}
