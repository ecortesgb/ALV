// «¡Desenfunda!»: reglas puras, con la TV como autoridad y horas en su reloj.
// El plan de amagos y la hora del YA son privados: nunca forman parte de «ronda».
import { azarCon, CONFIG_BALA } from "./bala";
export const CONFIG_DESENFUNDA = {
    rondasMax: 5, pausaMs: CONFIG_BALA.pausaMs, yaMinMs: 1500, yaMaxMs: 4000,
    amagoMinMs: 700, amagoMaxMs: 1400, margenMs: CONFIG_BALA.margenMs,
    esperaJuicioMs: CONFIG_BALA.esperaJuicioMs, sinToqueMs: 3000,
};
export function crearPartida(jugadores, cfg = {}, semilla = Date.now()) {
    return {
        cfg: { ...CONFIG_DESENFUNDA, ...cfg }, jugadores: jugadores.map(j => ({ id: j.id })),
        azar: typeof semilla === "function" ? semilla : azarCon(semilla),
        fase: "espera", ronda: 0, inicioRonda: 0, ya: 0, dioYa: false, finFase: 0,
        amagos: [], toques: new Map(), adelantados: new Set(),
        puntos: new Map(jugadores.map(j => [j.id, 0])), juicio: null,
    };
}
const textos = ["¡Ya…!", "¡Yaaa…ck!", "¡Ya… casi!"];
function abrirRonda(e, ahora) {
    const c = e.cfg;
    e.ronda++;
    e.fase = "ronda";
    e.inicioRonda = ahora;
    e.ya = ahora + c.yaMinMs + e.azar() * (c.yaMaxMs - c.yaMinMs);
    e.dioYa = false;
    e.juicio = null;
    e.toques.clear();
    e.adelantados.clear();
    e.amagos = [];
    // Solo caben los amagos que respetan el intervalo mínimo antes del YA.
    const max = Math.min(3, Math.max(1, Math.floor((e.ya - ahora - 1) / c.amagoMinMs)));
    const cuantos = 1 + Math.floor(e.azar() * max);
    let t = ahora;
    for (let i = 0; i < cuantos; i++) {
        const tope = Math.min(c.amagoMaxMs, e.ya - t - 1 - (cuantos - i - 1) * c.amagoMinMs);
        t += c.amagoMinMs + e.azar() * (tope - c.amagoMinMs);
        e.amagos.push({ t, texto: textos[i] });
    }
    return { tipo: "ronda", ronda: e.ronda };
}
export function empezar(e, ahora) {
    return e.fase === "espera" ? [abrirRonda(e, ahora)] : [];
}
export function ranking(e) {
    const filas = e.jugadores.map(j => ({ id: j.id, rondas: e.puntos.get(j.id) ?? 0 }));
    filas.sort((a, b) => b.rondas - a.rondas);
    return filas.map(f => ({ ...f, lugar: 1 + filas.filter(o => o.rondas > f.rondas).length }));
}
function cerrarRonda(e, ahora) {
    const validos = [...e.toques].filter(([id]) => !e.adelantados.has(id));
    const mejor = Math.min(...validos.map(([, s]) => Math.max(e.ya, s)));
    const ids = validos.filter(([, s]) => Math.max(e.ya, s) === mejor).map(([id]) => id);
    ids.forEach(id => e.puntos.set(id, (e.puntos.get(id) ?? 0) + 1));
    const ev = ids.length
        ? [{ tipo: "gana", ronda: e.ronda, ids, reaccionMs: mejor - e.ya }]
        : [{ tipo: "sinGanador", ronda: e.ronda }];
    if (e.ronda >= e.cfg.rondasMax) {
        e.fase = "fin";
        ev.push({ tipo: "fin", ranking: ranking(e) });
    }
    else {
        e.fase = "pausa";
        e.finFase = ahora + e.cfg.pausaMs;
    }
    return ev;
}
/** Avanza con el reloj de la TV. El YA se fecha cuando la TV lo emite, incluso si se atrasó su temporizador. */
export function avanzar(e, ahora) {
    if (e.fase === "pausa" && ahora >= e.finFase)
        return [abrirRonda(e, ahora)];
    if (e.fase !== "ronda")
        return [];
    const ev = [];
    while (e.amagos.length && e.amagos[0].t <= ahora && ahora < e.ya) {
        ev.push({ tipo: "amago", ronda: e.ronda, texto: e.amagos.shift().texto });
    }
    if (!e.dioYa && ahora >= e.ya) {
        e.ya = ahora;
        e.dioYa = true;
        e.amagos = [];
        // Un toque en el margen anterior al YA solo compite cuando se mostró el letrero.
        for (const [id, s] of e.toques)
            if (!e.adelantados.has(id) && s < e.ya - e.cfg.margenMs) {
                e.adelantados.add(id);
                ev.push({ tipo: "adelantado", ronda: e.ronda, id });
            }
        if ([...e.toques.keys()].some(id => !e.adelantados.has(id)))
            e.juicio = ahora + e.cfg.esperaJuicioMs;
        ev.push({ tipo: "ya", ronda: e.ronda, t: ahora });
    }
    if (e.dioYa && ((e.juicio !== null && ahora >= e.juicio) || ahora >= e.ya + e.cfg.sinToqueMs)) {
        // Si hubo toque justo al límite de 3 s, se respeta completa su espera de juicio.
        if (e.juicio === null || ahora >= e.juicio)
            ev.push(...cerrarRonda(e, ahora));
    }
    return ev;
}
/** Un solo toque por ronda; llegada abre la ventana de juicio, s decide el orden (no el orden de la red). */
export function tocar(e, id, s, llegada = s) {
    if (!Number.isFinite(s) || !Number.isFinite(llegada))
        return [];
    const ev = avanzar(e, llegada);
    if (e.fase !== "ronda" || !e.puntos.has(id) || e.toques.has(id) || s < e.inicioRonda ||
        (e.dioYa && s > e.ya + e.cfg.sinToqueMs))
        return ev;
    e.toques.set(id, s);
    if (s < e.ya - e.cfg.margenMs) {
        e.adelantados.add(id);
        ev.push({ tipo: "adelantado", ronda: e.ronda, id });
    }
    else if (e.dioYa && e.juicio === null)
        e.juicio = llegada + e.cfg.esperaJuicioMs;
    return ev;
}
