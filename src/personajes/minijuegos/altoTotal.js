// Alto total: solo la TV juzga; todas las horas y duraciones están en milisegundos.
import { azarCon } from "./bala";
export const CONFIG_ALTO_TOTAL = {
    verdeMinMs: 1500, verdeMaxMs: 4000, rojoMinMs: 2000, rojoMaxMs: 3500,
    graciaMs: 300, margenMs: 70, esperaJuicioMs: 250,
    sinLatidoMs: 600, koMs: 1000, metaMs: 7000, limiteMs: 60000,
};
export function crearPartida(jugadores, cfg = {}, semilla = Date.now()) {
    return {
        cfg: { ...CONFIG_ALTO_TOTAL, ...cfg }, azar: typeof semilla === "function" ? semilla : azarCon(semilla),
        jugadores: jugadores.map(j => ({ id: j.id, entradas: [], desde: 0, koHasta: 0, exigeSoltar: false, cruce: null })),
        fase: "espera", inicio: 0, hora: 0, fin: Infinity, tramos: [], color: "verde",
    };
}
function abrir(e, inicio, color) {
    const c = e.cfg, min = color === "verde" ? c.verdeMinMs : c.rojoMinMs;
    const max = color === "verde" ? c.verdeMaxMs : c.rojoMaxMs;
    e.tramos.push({ color, inicio, fin: inicio + Math.max(1, min + e.azar() * (max - min)) });
    e.color = color;
    return { tipo: "luz", color };
}
export function empezar(e, horaTv) {
    if (e.fase !== "espera" || !Number.isFinite(horaTv))
        return [];
    e.fase = "juego";
    e.inicio = e.hora = horaTv;
    e.jugadores.forEach(j => { j.desde = horaTv; });
    return [abrir(e, horaTv, "verde")];
}
/** Reconstrucción ordenada por s: una suelta atrasada recorta incluso un intervalo ya dibujado.
 * Sin mensajes durante 600 ms el extremo es el ÚLTIMO latido/aprieta, nunca el vencimiento.
 * Para juzgar solo usamos tiempo respaldado por mensajes, no la prolongación visual provisional.
 */
function intervalos(e, j, hasta, provisional = false) {
    const fuera = [];
    let inicio = null, ultimo = 0, llegada = 0;
    // Tras un KO: si seguía apretado, primero tiene que soltar (cualquier suelta llegada después del KO, aunque sea
    // durante él); y siempre vuelve a correr solo con una aprieta nueva hecha cuando ya acabó el KO.
    let bloqueado = j.exigeSoltar, requiereAprieta = j.koHasta > 0;
    const cerrar = (fin) => {
        if (inicio !== null)
            fuera.push({ inicio, fin });
        inicio = null;
    };
    for (const x of [...j.entradas].sort((a, b) => a.s - b.s || Number(a.a === "suelta") - Number(b.a === "suelta"))) {
        if (x.s > hasta)
            continue;
        if (bloqueado) {
            // Las entradas se borran al dar el KO: toda suelta que hay aquí llegó después de él.
            if (x.a === "suelta")
                bloqueado = false;
            continue;
        }
        if (x.s < j.desde)
            continue;
        if (requiereAprieta && (x.a !== "aprieta" || x.s < j.koHasta))
            continue;
        if (x.a === "aprieta")
            requiereAprieta = false;
        if (inicio !== null && x.s - ultimo > e.cfg.sinLatidoMs)
            cerrar(ultimo);
        if (x.a === "suelta")
            cerrar(x.s);
        else if (x.a === "aprieta" || inicio !== null) {
            if (inicio === null)
                inicio = x.s;
            ultimo = x.s;
            llegada = x.llegada;
        }
        else
            fuera.push({ inicio: x.s, fin: x.s }); // latido aislado: prueba puntual, no inventa una aprieta
    }
    if (inicio !== null)
        cerrar(provisional && hasta - llegada < e.cfg.sinLatidoMs ? hasta : ultimo);
    return fuera;
}
function verdes(e, j, hasta, provisional = false, reloj = hasta) {
    const partes = [];
    for (const { inicio: a, fin: b } of intervalos(e, j, reloj, provisional))
        for (const t of e.tramos) {
            const s = Math.max(a, t.inicio), fin = Math.min(b, t.fin, hasta);
            if (t.color === "verde" && fin > s)
                partes.push([s, fin]);
        }
    return partes.sort((a, b) => a[0] - b[0]);
}
/** Posición en segundos de carrera verde: misma velocidad para todas las figuras. */
export function posicion(e, id, horaTv) {
    const j = e.jugadores.find(x => x.id === id);
    if (!j || e.fase === "espera")
        return 0;
    const reloj = e.fase === "fin" ? e.hora : horaTv;
    return Math.min(e.cfg.metaMs, verdes(e, j, Math.min(reloj, e.fin, e.inicio + e.cfg.limiteMs), true, reloj)
        .reduce((n, [a, b]) => n + b - a, 0)) / 1000;
}
function cruce(e, j, hasta, reloj = hasta) {
    let falta = e.cfg.metaMs;
    for (const [a, b] of verdes(e, j, hasta, false, reloj)) {
        if (b - a >= falta)
            return a + falta;
        falta -= b - a;
    }
    return Infinity;
}
function infraccion(e, j, hasta, reloj = hasta) {
    let primera = Infinity;
    for (const { inicio: a, fin: b } of intervalos(e, j, reloj))
        for (const t of e.tramos) {
            if (t.color !== "rojo")
                continue;
            const s = Math.max(a, t.inicio + e.cfg.graciaMs + e.cfg.margenMs);
            // Umbral inclusivo: el intervalo empezó antes y NO terminó antes de rojo + 370.
            // finRojo es exclusivo, también para una aprieta o un latido justo en ese borde.
            if (s < Math.min(t.fin, hasta) && s <= b)
                primera = Math.min(primera, s);
        }
    return primera;
}
export function ranking(e) {
    const filas = e.jugadores.map(j => ({ id: j.id, cruce: j.cruce, distancia: posicion(e, j.id, e.hora) }));
    const comparar = (a, b) => a.cruce !== null ? b.cruce !== null ? a.cruce - b.cruce : -1 : b.cruce !== null ? 1 : b.distancia - a.distancia;
    filas.sort(comparar);
    return filas.map(f => ({ ...f, lugar: 1 + filas.filter(o => comparar(o, f) < 0).length }));
}
export function avanzar(e, horaTv) {
    if (e.fase !== "juego" || !Number.isFinite(horaTv))
        return [];
    e.hora = Math.max(e.hora, horaTv);
    const ev = [], limite = e.inicio + e.cfg.limiteMs;
    while (e.tramos.at(-1).fin <= Math.min(horaTv, limite)) {
        const t = e.tramos.at(-1);
        if (t.fin >= limite)
            break;
        ev.push(abrir(e, t.fin, t.color === "verde" ? "rojo" : "verde"));
    }
    const hasta = Math.min(horaTv, limite);
    const juicios = e.jugadores.map(j => ({ j, falta: infraccion(e, j, hasta, horaTv), meta: cruce(e, j, hasta, horaTv) }));
    const primero = Math.min(...juicios.filter(x => x.meta < x.falta && x.meta + e.cfg.esperaJuicioMs <= horaTv).map(x => x.meta));
    const cierre = Math.min(limite, primero + e.cfg.esperaJuicioMs);
    for (const { j, falta, meta } of juicios) {
        if (falta <= meta && falta <= cierre && falta + e.cfg.esperaJuicioMs <= horaTv) {
            // Si ya había soltado (lo normal: se da cuenta y suelta antes de que pasen los 250 ms del juicio), no se le
            // exige otra suelta; solo una aprieta nueva al acabar el KO.
            const ultima = [...j.entradas].sort((a, b) => a.s - b.s).at(-1);
            j.desde = horaTv;
            j.koHasta = horaTv + e.cfg.koMs;
            j.exigeSoltar = ultima?.a !== "suelta";
            j.entradas = [];
            ev.push({ tipo: "atrapado", id: j.id });
        }
        if (meta < falta && meta <= cierre && meta + e.cfg.esperaJuicioMs <= horaTv) {
            j.cruce = meta;
            ev.push({ tipo: "cruza", id: j.id });
        }
    }
    if (Number.isFinite(primero) || horaTv >= limite + e.cfg.esperaJuicioMs) {
        e.fin = cierre;
        e.fase = "fin";
        ev.push({ tipo: "fin", ranking: ranking(e), porTiempo: !Number.isFinite(primero) });
    }
    return ev;
}
export function recibir(e, id, entrada, llegada) {
    const j = e.jugadores.find(x => x.id === id);
    if (e.fase !== "juego" || !j || !Number.isFinite(entrada.s) || !Number.isFinite(llegada) ||
        entrada.s < e.inicio || entrada.s > llegada || !["aprieta", "suelta", "latido"].includes(entrada.a))
        return [];
    // Se incorpora ANTES de resolver los juicios de esta llegada (incluido el borde de 250 ms).
    j.entradas.push({ ...entrada, llegada });
    return avanzar(e, llegada);
}
