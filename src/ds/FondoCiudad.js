import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from "react";
/** Azar fijo para que la ciudad no cambie entre visitas (el mismo generador de la fuente aprobada). */
function rng(semilla) {
    let s = semilla;
    return () => {
        s |= 0;
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/** Siluetas de la ciudad gótica: capa lejana y capa cercana, con agujas, antenas y ventanas encendidas. */
export function ciudadGotica(semilla) {
    const r = rng(semilla), W = 480, H = 200, out = [];
    const f = (n) => Number(n.toFixed(1));
    const capa = (base, ventana, prob, minH, maxH) => {
        let x = -10;
        while (x < W) {
            const bw = 18 + r() * 30, bh = minH + r() * (maxH - minH), top = H - bh, t = r();
            out.push({ t: "r", x: f(x), y: f(top), w: f(bw), h: f(bh), c: base });
            if (t < 0.3)
                out.push({ t: "p", p: `${f(x)},${f(top)} ${f(x + bw / 2)},${f(top - bw * 0.95)} ${f(x + bw)},${f(top)}`, c: base });
            else if (t < 0.52) {
                out.push({ t: "r", x: f(x + bw * 0.2), y: f(top - 14), w: f(bw * 0.6), h: 14, c: base });
                out.push({ t: "r", x: f(x + bw * 0.38), y: f(top - 26), w: f(bw * 0.24), h: 12, c: base });
            }
            else if (t < 0.68)
                out.push({ t: "r", x: f(x + bw / 2 - 1), y: f(top - 22), w: 2, h: 22, c: base });
            for (let wy = top + 7; wy < H - 5; wy += 9)
                for (let wx = x + 4; wx < x + bw - 5; wx += 6.5)
                    if (r() < prob)
                        out.push({ t: "r", x: f(wx), y: f(wy), w: 2.6, h: 4, c: ventana });
            x += bw + 2;
        }
    };
    capa("var(--edificio-lejos)", "rgba(255,214,120,.55)", 0.18, 70, 170);
    capa("var(--edificio-cerca)", "var(--amarillo)", 0.24, 40, 120);
    return out;
}
/** Fondo de ciudad de noche detrás de hub, catálogo, celular y la franja superior de la TV. Ocupa toda su caja. */
export function FondoCiudad({ semilla = 21 }) {
    const figuras = useMemo(() => ciudadGotica(semilla), [semilla]);
    return (_jsx("div", { className: "d-bg", "aria-hidden": "true", children: _jsx("svg", { viewBox: "0 0 480 200", preserveAspectRatio: "xMidYMax slice", children: figuras.map((g, i) => g.t === "r"
                ? _jsx("rect", { x: g.x, y: g.y, width: g.w, height: g.h, fill: g.c }, i)
                : _jsx("polygon", { points: g.p, fill: g.c }, i)) }) }));
}
