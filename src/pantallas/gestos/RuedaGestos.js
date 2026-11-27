import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Rueda de gestos: aparece al tocar al personaje (referencia de Elías: menú radial de 4 gajos con la cabeza al centro;
// 2ª referencia, 26 nov: anillo de vidrio gris casi transparente, íconos blancos y el nombre del gesto al centro).
// Chica y semitransparente para no tapar la figura; el gajo señalado toma su color. Abre con rebote. Se cierra al elegir, al
// tocar fuera o con Esc. Con teclado: flechas para moverse, Enter para elegir.
import { useEffect, useRef, useState } from "react";
import { LogoALV } from "../Logo";
import "./rueda-gestos.css";
/** Gajo de anillo de a0 a a1 grados (0 = derecha, sentido del reloj en pantalla), radios r0 y r1. */
function gajo(a0, a1, r0, r1) {
    const p = (a, r) => { const t = (a * Math.PI) / 180; return `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`; };
    const g = a1 - a0 > 180 ? 1 : 0;
    return `M ${p(a0, r1)} A ${r1} ${r1} 0 ${g} 1 ${p(a1, r1)} L ${p(a1, r0)} A ${r0} ${r0} 0 ${g} 0 ${p(a0, r0)} Z`;
}
const R0 = 34, R1 = 96, HUECO = 3;
/** Centro de cada gajo en grados: izquierda, arriba, derecha, abajo (como la referencia). */
const ANGULOS = [180, 270, 0, 90];
/** Con «Transformar» (5 gajos): los 4 de siempre corridos hacia arriba y el quinto abajo. */
const ANGULOS_5 = [198, 270, 342, 54, 126];
/** Cualquier otro número (poderes): repartidos desde arriba; con 2, izquierda y derecha. Con 4 y 5 da los mismos de arriba. */
const angulos = (n) => (n === 4 ? ANGULOS : n === 5 ? ANGULOS_5 : n === 2 ? [180, 0] : Array.from({ length: n }, (_, i) => (270 + ((i - 1) * 360) / n + 360) % 360));
/** Íconos ilustrados que no cargaron (se usa el dibujo de respaldo). */
const sinImg = new Set();
const ICONOS = `${import.meta.env.BASE_URL}arte/ui/gestos/`;
export function RuedaGestos({ gestos, x, y, centro, onElegir, onCerrar }) {
    const [sale, setSale] = useState(null); // gesto elegido: animación de salida antes de cerrar
    const [foco, setFoco] = useState(0);
    // Gesto señalado (cursor, foco o elegido): su nombre sale al centro, como la referencia.
    const [senal, setSenal] = useState(null);
    const [, forzar] = useState(0);
    const caja = useRef(null);
    const botones = useRef([]);
    useEffect(() => { botones.current[0]?.focus({ preventScroll: true }); }, []);
    useEffect(() => {
        const fuera = (e) => { if (!caja.current?.contains(e.target))
            onCerrar("fuera"); };
        const tecla = (e) => { if (e.key === "Escape")
            onCerrar("tecla"); };
        const t = setTimeout(() => addEventListener("pointerdown", fuera, true), 0);
        addEventListener("keydown", tecla);
        return () => { clearTimeout(t); removeEventListener("pointerdown", fuera, true); removeEventListener("keydown", tecla); };
    }, [onCerrar]);
    // Avisa la elección al momento (quien la usa decide cuándo empieza el gesto); late 100 ms y se cierra en 120 ms.
    const elegir = (cual) => { if (sale)
        return; setSale(cual); onElegir(cual); setTimeout(() => onCerrar("elegir"), 220); };
    // Si el foco sale de la rueda (Tab, Mayús+Tab), se cierra sin moverlo (Codex, cierre-r1).
    const salioFoco = (e) => { if (!sale && !caja.current?.contains(e.relatedTarget) && e.relatedTarget)
        onCerrar("fuera"); };
    const mover = (e, i) => {
        const n = Math.min(8, gestos.length);
        const sig = n === 4 ? { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 }[e.key]
            : e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i + n - 1) % n : undefined;
        if (sig !== undefined) {
            e.preventDefault();
            setFoco(sig);
            setSenal(gestos[sig]?.cual ?? null);
            botones.current[sig]?.focus();
        }
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            elegir(gestos[i].cual);
        }
    };
    const nombre = gestos.find(g => g.cual === (sale ?? senal))?.txt;
    return (_jsxs("div", { ref: caja, className: "rg" + (sale ? " rg-sale" : ""), style: { left: x, top: y }, role: "menu", "aria-label": "Animaciones de tu personaje", onBlur: salioFoco, children: [_jsx("span", { className: "rg-vidrio", "aria-hidden": "true" }), _jsxs("svg", { viewBox: "-100 -100 200 200", className: "rg-svg", children: [gestos.slice(0, 8).map((g, i, todos) => {
                        const ang = angulos(todos.length), medio = 180 / ang.length;
                        const a = ang[i], d = gajo(a - medio + HUECO / 2, a + medio - HUECO / 2, R0, R1);
                        const t = (a * Math.PI) / 180, cx = 66 * Math.cos(t), cy = 66 * Math.sin(t);
                        return (_jsxs("g", { ref: el => { botones.current[i] = el; }, className: "rg-gajo" + (sale === g.cual ? " on" : ""), role: "menuitem", tabIndex: foco === i ? 0 : -1, "aria-label": g.txt, onClick: () => elegir(g.cual), onKeyDown: e => mover(e, i), onPointerEnter: () => setSenal(g.cual), onPointerLeave: () => setSenal(x => (x === g.cual ? null : x)), style: { "--c1": g.c1, "--c2": g.c2, "--i": i, "--dx": `${(Math.cos(t) * 6).toFixed(1)}px`, "--dy": `${(Math.sin(t) * 6).toFixed(1)}px` }, children: [_jsx("path", { d: d, className: "rg-forma" }), g.img && !sinImg.has(g.img)
                                    ? _jsx("image", { href: g.img, x: cx - 29, y: cy - 29, width: 58, height: 58, className: "rg-img", onError: () => { sinImg.add(g.img); forzar(n => n + 1); } })
                                    : _jsx("svg", { x: cx - 20, y: cy - 20, width: "40", height: "40", viewBox: "0 0 24 24", className: "rg-ico", "aria-hidden": "true", children: g.dibujo })] }, g.cual));
                    }), _jsx("circle", { r: R0 - 3, className: "rg-centro" }), nombre ? _jsx(NombreCentro, { txt: nombre })
                        : centro && _jsx("image", { href: centro, x: -27, y: -27, width: 54, height: 54, className: "rg-cara" })] }), !centro && !nombre && _jsx("span", { className: "rg-logo", "aria-hidden": "true", children: _jsx(LogoALV, { ruleta: false }) })] }));
}
/** Nombre al centro; los largos («Volverse invisible») en dos renglones y más chicos para caber en el círculo. */
function NombreCentro({ txt }) {
    if (txt.length <= 9)
        return _jsx("text", { y: 6, className: "rg-nombre", children: txt });
    const p = txt.split(" ");
    let mejor = [txt, ""], dif = Infinity;
    for (let i = 1; i < p.length; i++) {
        const a = p.slice(0, i).join(" "), b = p.slice(i).join(" "), d = Math.abs(a.length - b.length);
        if (d < dif) {
            dif = d;
            mejor = [a, b];
        }
    }
    const largo = Math.max(mejor[0].length, mejor[1].length), tam = largo > 9 ? 8.5 : 10;
    return mejor[1] ? _jsxs("text", { y: -1, className: "rg-nombre", style: { fontSize: tam }, children: [_jsx("tspan", { x: 0, children: mejor[0] }), _jsx("tspan", { x: 0, dy: tam + 1, children: mejor[1] })] })
        : _jsx("text", { y: 4, className: "rg-nombre", style: { fontSize: tam }, children: txt });
}
const TINTA = "#1a1440";
function Minifig({ bi, bd, cabeza = 0, baja = 0, pi = 0, pd = 0, extra }) {
    const c = { fill: "#fff", stroke: TINTA, strokeWidth: 0.9, strokeLinejoin: "round", paintOrder: "stroke" };
    // Brazo con su mano de pinza: nace en el hombro y apunta hacia abajo; `a` lo gira (sentido del reloj, en grados).
    const brazo = (x, a) => (_jsxs("g", { transform: `translate(${x} 8.3) rotate(${a})`, children: [_jsx("rect", { ...c, x: -1.05, y: -0.6, width: 2.1, height: 5, rx: 1 }), _jsx("path", { ...c, d: "M-1.3 4.6a1.3 1.3 0 1 0 2.6 0", fill: "none", strokeWidth: 1.7, stroke: "#fff" })] }));
    const pierna = (x, a) => _jsx("rect", { ...c, x: x, y: 15.2, width: 4.6, height: 6.6, rx: 0.6, transform: `rotate(${a} ${x + 2.3} 15.2)` });
    return (_jsxs("g", { children: [pierna(7.1, pi), pierna(12.3, pd), brazo(7.6, bi), brazo(16.4, bd), _jsx("path", { ...c, d: "M8 7.3h8l.9 6.5H7.1Z" }), _jsx("rect", { ...c, x: 7, y: 13.6, width: 10, height: 1.9, rx: 0.4 }), _jsxs("g", { transform: `translate(0 ${baja}) rotate(${cabeza} 12 6.6)`, children: [_jsx("rect", { ...c, x: 10.9, y: 0.9, width: 2.2, height: 1.3, rx: 0.3 }), _jsx("rect", { ...c, x: 9.1, y: 1.9, width: 5.8, height: 4.9, rx: 1.7 })] }), extra] }));
}
const trazo = { fill: "none", stroke: "#fff", strokeWidth: 1.1, strokeLinecap: "round" };
export function TrazosGesto({ cual }) {
    // Saludar: un brazo arriba con dos rayitas de movimiento junto a la mano.
    if (cual === "saludar")
        return _jsx(Minifig, { bi: 12, bd: -152, cabeza: -6, extra: _jsx(_Fragment, { children: _jsx("path", { ...trazo, d: "M20.6 1.4l1.4-.6M21.3 3.6l1.6.1" }) }) });
    // Ganar: los dos brazos arriba, de brinco (piernas abiertas) y chispas.
    if (cual === "victoria")
        return _jsx(Minifig, { bi: 148, bd: -148, pi: 8, pd: -8, extra: _jsx(_Fragment, { children: _jsx("path", { ...trazo, d: "M2.2 4.2l1.3.8M1.6 7.4h1.5M21.8 4.2l-1.3.8M22.4 7.4h-1.5" }) }) });
    // Perder: cabeza abajo, brazos colgados y una gota de sudor.
    if (cual === "derrota")
        return _jsx(Minifig, { bi: 4, bd: -4, cabeza: 14, baja: 0.9, extra: _jsx("path", { fill: "#fff", stroke: TINTA, strokeWidth: 0.7, d: "M18.4 2.2c.9 1.3 1.4 2.1 1.4 2.8a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.5 1.4-2.8Z" }) });
    // Transformar: la figura entre dos flechas que dan la vuelta (cambia de forma).
    if (cual === "transformar")
        return _jsx(Minifig, { bi: 20, bd: -20, extra: _jsxs(_Fragment, { children: [_jsx("path", { ...trazo, d: "M3.4 9.2a8.6 8.6 0 0 1 4-6.4M2.4 5.4l1 3.9 3.6-1.6" }), _jsx("path", { ...trazo, d: "M20.6 14.8a8.6 8.6 0 0 1-4 6.4M21.6 18.6l-1-3.9-3.6 1.6" })] }) });
    // Poderes: brazos al frente y una estrella de energía.
    if (cual === "poderes" || cual.startsWith("poder:"))
        return _jsx(Minifig, { bi: 70, bd: -70, cabeza: -4, extra: _jsx("path", { fill: "#fff", stroke: TINTA, strokeWidth: 0.7, strokeLinejoin: "round", d: "M12 .3l1 2.2 2.4.2-1.8 1.6.6 2.3L12 5.4 9.8 6.6l.6-2.3L8.6 2.7l2.4-.2Z" }) });
    // Especial: golpe al frente con un rayo saliendo del puño.
    return _jsx(Minifig, { bi: 58, bd: -96, cabeza: -4, pi: 6, pd: -4, extra: _jsx("path", { fill: "#fff", stroke: TINTA, strokeWidth: 0.7, strokeLinejoin: "round", d: "M21.2 5.2l2.4.2-1.6 2.3 1.6.1-3.2 3.6.9-2.6-1.5-.1Z" }) });
}
/** Rueda que sale al tocar al personaje (referencia de Elías: distribución y colores): izquierda, arriba, derecha, abajo.
 *  Nombres como en el HUB (decidió Codex, encargo 2026-11-26-rueda-gestos-r1, E3). */
export const RUEDA = [
    { cual: "saludar", txt: "Saludar", c1: "#9be04a", c2: "#4fa81f", dibujo: _jsx(TrazosGesto, { cual: "saludar" }), img: `${ICONOS}gesto-saludar.webp` },
    { cual: "victoria", txt: "Ganar", c1: "#ffd84a", c2: "#e0a400", dibujo: _jsx(TrazosGesto, { cual: "victoria" }), img: `${ICONOS}gesto-victoria.webp` },
    { cual: "especial", txt: "Especial", c1: "#ff9a3a", c2: "#e8560f", dibujo: _jsx(TrazosGesto, { cual: "especial" }), img: `${ICONOS}gesto-especial.webp` },
    { cual: "derrota", txt: "Perder", c1: "#4f86e8", c2: "#1f4fb0", dibujo: _jsx(TrazosGesto, { cual: "derrota" }), img: `${ICONOS}gesto-derrota.webp` },
];
/** Quinto gajo, solo en personajes que se transforman (Banner ↔ Hulk, Tony / Iron Man, Peter ↔ Spider-Man; Elías, 27 nov). */
export const GAJO_PODERES = { cual: "poderes", txt: "Poderes", c1: "#4fd8ff", c2: "#1479c9", dibujo: _jsx(TrazosGesto, { cual: "poderes" }) };
const COLORES_PODER = [["#4fd8ff", "#1479c9"], ["#ff7a59", "#d0341a"], ["#b7f04a", "#4f9f12"], ["#ffd84a", "#e0a400"]];
/** Un gajo por poder del personaje (segunda rueda de «Poderes»). */
export const gajosPoder = (lista) => lista.slice(0, 8).map((p, i) => {
    const [c1, c2] = COLORES_PODER[i % COLORES_PODER.length];
    return { cual: "poder:" + p.id, txt: p.nombre, c1, c2, dibujo: _jsx(TrazosGesto, { cual: "poder:" }) };
});
export const GAJO_TRANSFORMAR = { cual: "transformar", txt: "Transformar", c1: "#c77dff", c2: "#7b2cbf", dibujo: _jsx(TrazosGesto, { cual: "transformar" }) };
