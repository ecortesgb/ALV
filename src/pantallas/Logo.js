import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Logotipo ALV y su «ruleta de títulos»: ALV no tiene un solo significado. Al entrar, el letrero de abajo gira
// entre varios y se detiene en «Amigos Legendarios Verdaderos». Todo es CSS; sin animación si el aparato la reduce.
import { createElement, useEffect, useId, useMemo, useState } from "react";
export const TITULO_FINAL = "Amigos Legendarios Verdaderos";
/** Otros significados de ALV que pasan por la ruleta (siempre A, L, V). */
export const TITULOS = [
    "Amistades, Locuras y Verdades",
    "Aventuras Locas y Valientes",
    "A La Victoria",
    "Ahora Le Vale",
    "Apuestas, Líos y Venganzas",
    "Amor, Licor y Vergüenza",
    "Aquí Llega la Vibra",
    "Al Límite y Valientes",
    "Anfitrión, Ladrón y Villano",
];
const CLAVE_VISTA = "alv-ruleta-vista";
const sinMovimiento = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Lista que pasa por la ventana: `cuantas` títulos distintos en orden revuelto (cambia cada vez) y al final el verdadero. */
export function tirada(cuantas, azar = Math.random) {
    const t = [...TITULOS];
    for (let i = t.length - 1; i > 0; i--) {
        const j = Math.floor(azar() * (i + 1));
        [t[i], t[j]] = [t[j], t[i]];
    }
    return [...t.slice(0, Math.min(cuantas, t.length)), TITULO_FINAL];
}
/** Cuánto se queda cada frase en la cinta (se alcanza a leer) y cuántas pasan antes de la verdadera. */
export const PASO_MS = 1000;
export const FRASES_POR_GIRO = 5;
/**
 * Ruleta paso a paso: cada frase se queda PASO_MS y la cinta salta a la siguiente; la última es la verdadera.
 * `unaVez`: el giro automático solo la primera vez de la sesión (HUB). `girar()` vuelve a girar (al tocar el logo).
 */
function useRuleta(activa, unaVez, retraso) {
    const quieta = useMemo(() => {
        if (!activa || sinMovimiento())
            return true;
        if (!unaVez)
            return false;
        try {
            return sessionStorage.getItem(CLAVE_VISTA) === "1";
        }
        catch {
            return false;
        }
    }, [activa, unaVez]);
    const [tiro, setTiro] = useState(() => ({ n: 0, lista: quieta ? [TITULO_FINAL] : tirada(FRASES_POR_GIRO) }));
    const [paso, setPaso] = useState(0);
    useEffect(() => {
        if (tiro.lista.length <= 1)
            return;
        try {
            sessionStorage.setItem(CLAVE_VISTA, "1");
        }
        catch { /* sin almacenamiento */ }
        setPaso(0);
        const ult = tiro.lista.length - 1, relojes = [];
        for (let k = 1; k <= ult; k++)
            relojes.push(setTimeout(() => setPaso(k), (tiro.n === 0 ? retraso : 150) + k * PASO_MS));
        return () => relojes.forEach(clearTimeout);
    }, [tiro, retraso]);
    const girar = () => { if (!sinMovimiento())
        setTiro(t => ({ n: t.n + 1, lista: tirada(FRASES_POR_GIRO) })); };
    const fin = paso >= tiro.lista.length - 1;
    return { lista: tiro.lista, n: tiro.n, paso, fase: fin ? "fin" : "gira", girar };
}
// ---------- Dibujo del logo (SVG, 600 × 440) ----------
// Capas de atrás hacia adelante: líneas de velocidad y fragmentos, estallido con tramado, letras (extrusión azul y
// cara amarilla), colas de la cinta, cinta curva y su texto. Cada capa proyecta sombra sobre la de atrás.
const TINTA = "#0b1a4a";
/** Estallido de cómic: picos irregulares (fijos, no al azar) alrededor de (300, 190). */
const ESTALLIDO = (() => {
    const picos = [1, .78, .95, .72, 1.05, .8, .9, .7, 1, .76, .97, .74, 1.08, .79, .92, .71, 1, .77];
    const n = picos.length, pts = [];
    for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 === 0 ? 205 * picos[i / 2] : 132 + (i % 4 === 1 ? 8 : -6);
        pts.push(`${(300 + Math.cos(a) * r * 1.38).toFixed(1)},${(190 + Math.sin(a) * r).toFixed(1)}`);
    }
    return pts.join(" ");
})();
const LINEAS = [[40, 120, 92, 140], [28, 200, 84, 204], [46, 282, 98, 266], [560, 118, 508, 140], [574, 205, 518, 206], [552, 290, 502, 270], [150, 22, 176, 62], [452, 22, 428, 62]];
const PEDAZOS = [[70, 95, 0], [520, 70, 30], [545, 335, 60], [62, 330, 15], [118, 40, 45], [488, 380, 20]];
const PASOS = 13; // capas de la extrusión
const CINTA = "M78,322 Q300,286 522,322 L516,386 Q300,350 84,386 Z";
const CURVA = "M70,366 Q300,330 530,366";
function Letras({ id }) {
    const t = (extra, clave) => _jsx("text", { x: 300, y: 262, textAnchor: "middle", ...extra, children: "ALV" }, clave);
    return (_jsxs("g", { className: "a-logo-letras", filter: `url(#${id}-sombra)`, fontFamily: "Bangers, Impact, sans-serif", fontSize: 250, letterSpacing: 6, children: [t({ transform: `translate(${PASOS * .9},${PASOS * 1.3})`, fill: TINTA, stroke: TINTA, strokeWidth: 14, strokeLinejoin: "round" }), Array.from({ length: PASOS }, (_, k) => {
                const i = PASOS - k;
                return t({ transform: `translate(${i * .9},${i * 1.3})`, fill: `url(#${id}-canto)`, stroke: `url(#${id}-canto)`, strokeWidth: 6, strokeLinejoin: "round" }, i);
            }), t({ fill: TINTA, stroke: TINTA, strokeWidth: 13, strokeLinejoin: "round" }), t({ fill: "#7fb0ff", stroke: "#7fb0ff", strokeWidth: 5, strokeLinejoin: "round" }), t({ fill: `url(#${id}-amarillo)`, stroke: TINTA, strokeWidth: 1.6 }), t({ fill: `url(#${id}-brillo)` })] }));
}
/** Logo ALV con la ruleta de títulos en la cinta (las frases siguen la curva y la cinta las recorta). */
export function LogoALV({ tamano = "grande", ruleta = true, unaVez = false, className = "" }) {
    const id = "alv" + useId().replace(/[^a-zA-Z0-9]/g, "");
    const r = useRuleta(ruleta, unaVez, 500);
    const lista = ruleta ? r.lista : [TITULO_FINAL], paso = ruleta ? r.paso : 0, fase = ruleta ? r.fase : "fin";
    const H = 70, n = lista.length - 1;
    const clase = `a-logo a-logo-${tamano} a-ruleta-${fase}${ruleta ? " a-logo-toca" : ""} ${className}`.trim();
    const etiqueta = `ALV, ${TITULO_FINAL}`;
    // Con ruleta el logo es un botón: tocarlo la vuelve a girar. (createElement: el tipo no cambia entre renders.)
    const raiz = ruleta
        ? { type: "button", className: clase, onClick: r.girar, "aria-label": `${etiqueta}. Toca para ver otros significados` }
        : { className: clase, role: "img", "aria-label": etiqueta };
    return createElement(ruleta ? "button" : "div", raiz, _jsxs("svg", { viewBox: "0 0 600 440", "aria-hidden": "true", focusable: "false", children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: `${id}-amarillo`, x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0", stopColor: "#fff6b8" }), _jsx("stop", { offset: ".35", stopColor: "#ffe24a" }), _jsx("stop", { offset: ".7", stopColor: "#ffc21a" }), _jsx("stop", { offset: "1", stopColor: "#ff9500" })] }), _jsxs("linearGradient", { id: `${id}-brillo`, x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0", stopColor: "#fff", stopOpacity: ".75" }), _jsx("stop", { offset: ".32", stopColor: "#fff", stopOpacity: "0" })] }), _jsxs("linearGradient", { id: `${id}-canto`, x1: "0", y1: "0", x2: "1", y2: "1", children: [_jsx("stop", { offset: "0", stopColor: "#6d9cff" }), _jsx("stop", { offset: ".55", stopColor: "#3f73e0" }), _jsx("stop", { offset: "1", stopColor: "#2a55b8" })] }), _jsxs("radialGradient", { id: `${id}-centro`, cx: ".5", cy: ".5", r: ".55", children: [_jsx("stop", { offset: "0", stopColor: "#ffffff" }), _jsx("stop", { offset: ".45", stopColor: "#fff6c4" }), _jsx("stop", { offset: ".75", stopColor: "#ffe14a" }), _jsx("stop", { offset: "1", stopColor: "#ffc21a" })] }), _jsxs("radialGradient", { id: `${id}-tramado-m`, cx: ".5", cy: ".5", r: ".5", children: [_jsx("stop", { offset: ".45", stopColor: "#000" }), _jsx("stop", { offset: "1", stopColor: "#fff" })] }), _jsx("mask", { id: `${id}-tramado-mask`, children: _jsx("rect", { width: "600", height: "440", fill: `url(#${id}-tramado-m)` }) }), _jsx("pattern", { id: `${id}-puntos`, width: "11", height: "11", patternUnits: "userSpaceOnUse", patternTransform: "rotate(20)", children: _jsx("circle", { cx: "5.5", cy: "5.5", r: "2.6", fill: "#ff9d00" }) }), _jsxs("linearGradient", { id: `${id}-cinta`, x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0", stopColor: "#7aa6ff" }), _jsx("stop", { offset: ".45", stopColor: "#4c80ec" }), _jsx("stop", { offset: "1", stopColor: "#2f5fc8" })] }), _jsx("clipPath", { id: `${id}-recorte`, children: _jsx("path", { d: CINTA }) }), _jsx("path", { id: `${id}-curva`, d: CURVA }), _jsx("filter", { id: `${id}-sombra`, x: "-20%", y: "-20%", width: "140%", height: "150%", children: _jsx("feDropShadow", { dx: "2", dy: "9", stdDeviation: "5", floodColor: "#04082a", floodOpacity: ".55" }) }), _jsx("filter", { id: `${id}-sombra-chica`, x: "-10%", y: "-30%", width: "120%", height: "170%", children: _jsx("feDropShadow", { dx: "0", dy: "6", stdDeviation: "4", floodColor: "#04082a", floodOpacity: ".6" }) })] }), _jsxs("g", { className: "a-logo-estallido", children: [LINEAS.map(([x1, y1, x2, y2], i) => _jsx("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: TINTA, strokeWidth: 5, strokeLinecap: "round" }, i)), PEDAZOS.map(([x, y, r], i) => _jsx("path", { d: "M-9,-7 L8,-9 L10,6 L-6,9 Z", transform: `translate(${x},${y}) rotate(${r})`, fill: "#ffd21f", stroke: TINTA, strokeWidth: 3, strokeLinejoin: "round" }, i)), _jsx("polygon", { points: ESTALLIDO, fill: `url(#${id}-centro)`, stroke: TINTA, strokeWidth: 7, strokeLinejoin: "round" }), _jsx("polygon", { points: ESTALLIDO, fill: `url(#${id}-puntos)`, mask: `url(#${id}-tramado-mask)`, opacity: ".55" })] }), _jsx(Letras, { id: id }), _jsxs("g", { className: "a-logo-cinta", filter: `url(#${id}-sombra-chica)`, children: [_jsx("path", { d: "M84,334 L22,346 L46,372 L20,402 L92,396 Z", fill: "#2a52ad", stroke: TINTA, strokeWidth: 5, strokeLinejoin: "round" }), _jsx("path", { d: "M516,334 L578,346 L554,372 L580,402 L508,396 Z", fill: "#2a52ad", stroke: TINTA, strokeWidth: 5, strokeLinejoin: "round" }), _jsx("path", { d: "M84,386 L92,396 L104,384 Z", fill: TINTA }), _jsx("path", { d: "M516,386 L508,396 L496,384 Z", fill: TINTA }), _jsx("path", { d: CINTA, fill: `url(#${id}-cinta)`, stroke: TINTA, strokeWidth: 6, strokeLinejoin: "round" }), _jsx("path", { d: "M92,330 Q300,296 508,330", fill: "none", stroke: "#b9d2ff", strokeWidth: 3, strokeLinecap: "round", opacity: ".8" }), _jsx("g", { clipPath: `url(#${id}-recorte)`, children: _jsx("g", { className: "a-ruleta-col", style: { transform: `translateY(${-paso * H}px)` }, children: lista.map((frase, i) => (_jsx("text", { className: "a-ruleta-t" + (i === n ? " a-ruleta-ult" : ""), transform: `translate(0,${i * H})`, fontFamily: "Bangers, Impact, sans-serif", fontSize: 30, letterSpacing: 1.5, fill: "#ffd93a", stroke: TINTA, strokeWidth: 6, strokeLinejoin: "round", paintOrder: "stroke", dy: 0, children: _jsx("textPath", { href: `#${id}-curva`, startOffset: "50%", textAnchor: "middle", children: frase.toUpperCase() }) }, i))) }, ruleta ? r.n : 0) })] })] }));
}
