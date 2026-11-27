import { COMODINES, GARANTIA, MONEDAS_SI_TOPE, TOPE_COMODIN, piezasDeSobre } from "../content/tienda";
export const ORDEN = ["rara", "epica", "legendaria"];
const nivel = (r) => ORDEN.indexOf(r);
export const RACHA_CERO = { sinEpica: 0, sinLegendaria: 0 };
/** Tira una rareza según los pesos. */
export function tirarRareza(pesos, azar) {
    const total = ORDEN.reduce((s, r) => s + Math.max(0, pesos[r]), 0);
    if (total <= 0)
        return "rara";
    let t = azar.siguiente() * total;
    for (const r of ORDEN) {
        t -= Math.max(0, pesos[r]);
        if (t < 0)
            return r;
    }
    return "legendaria";
}
/** ¿Este sobre todavía trae algo nuevo? Un sobre de piezas sin piezas nuevas no se vende. */
export const sobreDisponible = (s, tengo) => s.piezas === 0 || piezasDeSobre(s).some(p => !tengo.has(p.id));
/** Cuántos sobres de piezas faltan para la garantía (1 = el siguiente). */
export const faltanParaGarantia = (racha) => ({
    epica: Math.max(1, GARANTIA.epica - racha.sinEpica),
    legendaria: Math.max(1, GARANTIA.legendaria - racha.sinLegendaria),
});
function rarezasIntentadas(pedida, s, racha, ultima, mejor) {
    if (ultima) {
        const sube = (r) => {
            if (nivel(pedida) < nivel(r) && (!mejor || nivel(mejor) < nivel(r)))
                pedida = r;
        };
        if (s.minimo)
            sube(s.minimo);
        if (racha.sinEpica + 1 >= GARANTIA.epica)
            sube("epica");
        if (racha.sinLegendaria + 1 >= GARANTIA.legendaria)
            sube("legendaria");
    }
    return [...ORDEN.slice(nivel(pedida)), ...ORDEN.slice(0, nivel(pedida)).reverse()];
}
/** Cada pieza es única. Dentro de una rareza, todas tienen la misma probabilidad de salir. */
export function probabilidadPiezas(s, tengo, racha) {
    const elegibles = s.piezas > 0 ? piezasDeSobre(s).filter(p => !tengo.has(p.id)) : [];
    const inicial = ORDEN.map(r => elegibles.filter(p => p.rareza === r).length);
    const pesos = ORDEN.map(r => Math.max(0, s.pesos[r]));
    const total = pesos.reduce((a, b) => a + b, 0);
    const esperadas = [0, 0, 0];
    // Solo importa cuántas quedan en cada rareza. Se combinan los caminos que llegan al mismo conteo.
    let estados = new Map([[inicial.join(","), 1]]);
    for (let i = 0; i < Math.min(s.piezas, elegibles.length); i++) {
        const siguientes = new Map();
        for (const [estado, prob] of estados) {
            const quedan = estado.split(",").map(Number);
            const mejor = [...ORDEN].reverse().find(r => quedan[nivel(r)] < inicial[nivel(r)]) ?? null;
            const ultima = i === s.piezas - 1 || elegibles.length - i === 1;
            ORDEN.forEach((r, k) => {
                const peso = total ? pesos[k] / total : Number(k === 0);
                if (!peso)
                    return;
                const elegida = rarezasIntentadas(r, s, racha, ultima, mejor).find(x => quedan[nivel(x)] > 0);
                if (!elegida)
                    return;
                const j = nivel(elegida), nuevos = [...quedan];
                nuevos[j] = nuevos[j] - 1;
                const clave = nuevos.join(","), camino = prob * peso;
                esperadas[j] = esperadas[j] + camino;
                siguientes.set(clave, (siguientes.get(clave) ?? 0) + camino);
            });
        }
        estados = siguientes;
    }
    return {
        rara: inicial[0] ? esperadas[0] / inicial[0] : 0,
        epica: inicial[1] ? esperadas[1] / inicial[1] : 0,
        legendaria: inicial[2] ? esperadas[2] / inicial[2] : 0,
    };
}
export function probabilidadComodines(s, tengo) {
    return COMODINES.map(c => {
        const porCarta = 1 / COMODINES.length;
        const alTope = (tengo[c.id] ?? 0) >= TOPE_COMODIN;
        return { ...c, porCarta, alTope, enSobre: 1 - (1 - porCarta) ** s.comodines };
    }).filter(c => s.comodines > 0 && c.porCarta > 0);
}
/**
 * Abre un sobre. Devuelve null si es de piezas y ya no queda ninguna nueva.
 * Reglas: piezas sin repetidas; si una rareza se acaba, sube y luego baja; garantía de épica y legendaria;
 * comodines repetibles hasta TOPE_COMODIN (después se cambian por monedas). La mejor carta va al final.
 */
export function abrirSobre(s, tengo, comodines, racha, azar) {
    if (!sobreDisponible(s, tengo))
        return null;
    const pool = piezasDeSobre(s).filter(p => !tengo.has(p.id));
    const piezas = [];
    const mejorDe = () => piezas.reduce((m, p) => (m && nivel(m) >= nivel(p.rareza) ? m : p.rareza), null);
    for (let i = 0; i < s.piezas && pool.length > 0; i++) {
        const pedida = tirarRareza(s.pesos, azar);
        const ultima = i === s.piezas - 1 || pool.length === 1;
        const intento = rarezasIntentadas(pedida, s, racha, ultima, mejorDe());
        for (const r of intento) {
            const opciones = pool.filter(p => p.rareza === r);
            if (!opciones.length)
                continue;
            const elegida = azar.elegir(opciones);
            pool.splice(pool.indexOf(elegida), 1);
            piezas.push({ tipo: "pieza", id: elegida.id, rareza: r });
            break;
        }
    }
    let nueva = racha;
    if (s.piezas > 0) {
        const m = mejorDe();
        nueva = {
            sinEpica: m && nivel(m) >= nivel("epica") ? 0 : racha.sinEpica + 1,
            sinLegendaria: m === "legendaria" ? 0 : racha.sinLegendaria + 1,
        };
    }
    const cuenta = { ...comodines };
    const extras = [];
    for (let j = 0; j < s.comodines; j++) {
        const c = azar.elegir(COMODINES);
        if ((cuenta[c.id] ?? 0) >= TOPE_COMODIN) {
            extras.push({ tipo: "monedas", cantidad: MONEDAS_SI_TOPE, comodin: c.id });
            continue;
        }
        cuenta[c.id] = (cuenta[c.id] ?? 0) + 1;
        extras.push({ tipo: "comodin", id: c.id, especial: c.especial });
    }
    const peso = (c) => (c.tipo === "pieza" ? 10 + nivel(c.rareza) : c.tipo === "comodin" ? (c.especial ? 2 : 1) : 0);
    const cartas = [...extras, ...piezas].sort((a, b) => peso(a) - peso(b));
    const m = mejorDe();
    const mejor = m ?? (extras.some(c => c.tipo === "comodin" && c.especial) ? "epica" : "rara");
    return { cartas, racha: nueva, mejor };
}
