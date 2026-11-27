import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// El impostor en la nave: «Opciones del juego» del configurador (Elías, 24 nov).
// Pantalla partida a la mitad (Elías): a la izquierda, arriba, un carrusel con las imágenes de 1, 2 o 3 impostores
// (se cambia con las flechas de los lados o deslizando) y abajo una rueda de categorías que se desliza: la del centro
// resalta y es la elegida. A la derecha, las reglas con interruptores. En celular se apila en ese mismo orden.
// Todo cabe en una pantalla, sin bajar.
import { useEffect, useRef, useState } from "react";
import { srcArte } from "../../pantallas/TarjetasConfig";
import { ArteCategoria, categoriasNave } from "./papelNave";
import { arteNave } from "./nave";
import "./opcionesNave.css";
/** Color propio de cada categoría (fondo de su tarjeta y brillo de la del centro). */
const COLOR_CATEGORIA = {
    azar: "#b388ff", "s-pel": "#ff5a66", "s-vid": "#7c5cff", "s-ser": "#2ee6d6", "s-can": "#ff8c42", "s-sup": "#3d7bff",
    "s-ani": "#ff6ad5", "s-cel": "#ffc21a", "s-fut": "#3ddc84", "s-adu": "#ff3d4a", "s-obj": "#9aa3b8",
};
/** Jugadores que hacen falta para x impostores (`maxImpostores(n) = ⌊(n−1)/2⌋`). */
const minimoPara = (x) => 2 * x + 1;
export function OpcionesNave(p) {
    const k = Math.min(p.impostores, p.maxImpostores);
    return (_jsxs("div", { className: "onv", style: { "--espacio": arteNave("espacio") }, children: [_jsxs("div", { className: "on-izq", children: [_jsx(CarruselImpostores, { jugadores: p.jugadores, max: p.maxImpostores, k: k, alCambiar: p.alImpostores }), _jsx(RuedaCategorias, { adulto: p.adulto, tema: p.tema, alTema: p.alTema })] }), _jsxs("section", { className: "on-bloque on-reglas-b", "aria-labelledby": "on-reglas", children: [_jsx("header", { className: "on-cab", children: _jsx("span", { id: "on-reglas", className: "on-bt dsp", children: "Reglas" }) }), _jsx(Interruptor, { icono: "\uD83E\uDD2B", titulo: "Votos secretos", valor: p.votos === "secretos", alCambiar: x => p.alVotos(x ? "secretos" : "visibles"), detalle: p.votos === "secretos" ? "Votos en gris, sin decir de quién" : "Cada voto lleva el color de quien votó" }), _jsx(Interruptor, { icono: "\uD83D\uDCE3", titulo: "Decir si era impostor", valor: p.revelar, alCambiar: p.alRevelar, detalle: p.revelar ? "Al expulsar a alguien se sabe qué era" : "Nadie sabe qué era hasta el final" }), _jsx(Interruptor, { icono: "\uD83D\uDCA1", titulo: "Pista para el impostor", valor: p.pista, alCambiar: p.alPista, detalle: p.pista ? "Ve una palabra que ayuda poquito" : "Solo ve la categoría" }), _jsx(Interruptor, { icono: p.drunk ? "🍹" : "😬", titulo: "Castigo al que pierde", valor: p.castigo, alCambiar: p.alCastigo, detalle: p.castigo ? (p.drunk ? "Un trago de lo que tengas (el agua cuenta)" : "Un castigo leve del mazo") : "Solo puntos" })] })] }));
}
/** Carrusel de 1, 2 o 3 impostores: una imagen por cuadro; flechas a los lados, deslizar o teclado.
 *  Lo que se ve es lo elegido; los que no alcanzan por jugadores se saltan y su punto lleva candado. */
function CarruselImpostores({ jugadores, max, k, alCambiar }) {
    const inicio = useRef(null);
    const ir = (x) => { if (x >= 1 && x <= Math.min(3, max) && x !== k)
        alCambiar(x); };
    const civiles = Math.max(0, jugadores - k);
    const bloqueado = [1, 2, 3].find(x => x > max);
    return (_jsxs("section", { className: "on-bloque on-imp", "aria-roledescription": "carrusel", "aria-label": "\u00BFCu\u00E1ntos impostores?", onKeyDown: e => { if (e.key === "ArrowLeft")
            ir(k - 1); if (e.key === "ArrowRight")
            ir(k + 1); }, children: [_jsxs("div", { className: "on-marco", onPointerDown: (e) => { inicio.current = e.clientX; }, onPointerUp: (e) => { const d = inicio.current == null ? 0 : e.clientX - inicio.current; inicio.current = null; if (d > 40)
                    ir(k - 1); if (d < -40)
                    ir(k + 1); }, onPointerCancel: () => { inicio.current = null; }, children: [_jsx("div", { className: "on-pista", style: { transform: `translateX(${-(k - 1) * 100}%)` }, children: [1, 2, 3].map(x => (_jsx("figure", { className: "on-cuadro" + (x > max ? " cerrado" : ""), "aria-hidden": x !== k, children: _jsx("img", { src: srcArte(`impostor/impostores-${x}.webp`), alt: `${x} ${x === 1 ? "impostor" : "impostores"}`, draggable: false }) }, x))) }), _jsx("button", { type: "button", className: "on-flecha izq", "aria-label": "Menos impostores", disabled: k <= 1, onClick: () => ir(k - 1), children: "\u2039" }), _jsx("button", { type: "button", className: "on-flecha der", "aria-label": "M\u00E1s impostores", disabled: k >= Math.min(3, max), onClick: () => ir(k + 1), children: "\u203A" }), _jsxs("div", { className: "on-barra", children: [_jsx("span", { className: "on-puntos", role: "radiogroup", "aria-label": "Impostores", children: [1, 2, 3].map(x => (_jsx("button", { type: "button", role: "radio", "aria-checked": k === x, disabled: x > max, className: k === x ? "on" : "", title: x > max ? `Desde ${minimoPara(x)} jugadores` : undefined, "aria-label": x > max ? `${x} impostores: desde ${minimoPara(x)} jugadores` : `${x} ${x === 1 ? "impostor" : "impostores"}`, onClick: () => ir(x), children: x > max ? "🔒" : x }, x))) }), _jsxs("span", { className: "on-civiles", children: ["+ ", civiles, " ", civiles === 1 ? "civil" : "civiles"] })] })] }), bloqueado && _jsxs("small", { className: "on-nota", children: ["\uD83D\uDD12 ", bloqueado, " impostores: desde ", minimoPara(bloqueado), " jugadores"] })] }));
}
/** Rueda de categorías: se desliza a los lados; la que queda al centro resalta y es la elegida.
 *  Tocar una la trae al centro; las flechas mueven una a la vez. */
function RuedaCategorias({ adulto, tema, alTema }) {
    const cats = categoriasNave(adulto);
    const elegida = Math.max(0, cats.findIndex(t => t.id === tema));
    const [centro, setCentro] = useState(elegida);
    const caja = useRef(null);
    const espera = useRef(undefined);
    const ultimo = useRef(tema);
    ultimo.current = tema;
    const llevar = (i, suave = true) => {
        const c = caja.current, el = c?.children[i];
        if (!c || !el)
            return;
        c.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - c.clientWidth / 2, behavior: suave ? "smooth" : "auto" });
    };
    // Al abrir (o si cambia la lista), la elegida ya está al centro.
    useEffect(() => { llevar(elegida, false); setCentro(elegida); }, [cats.length]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => () => clearTimeout(espera.current), []);
    const alDeslizar = () => {
        const c = caja.current;
        if (!c)
            return;
        const medio = c.scrollLeft + c.clientWidth / 2;
        let mejor = 0, dist = Infinity;
        [...c.children].forEach((n, i) => { const el = n; const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - medio); if (d < dist) {
            dist = d;
            mejor = i;
        } });
        setCentro(mejor);
        clearTimeout(espera.current);
        espera.current = setTimeout(() => { const id = cats[mejor]?.id ?? null; if (id !== ultimo.current)
            alTema(id); }, 140);
    };
    const nombre = cats[centro]?.nombre ?? "";
    return (_jsxs("section", { className: "on-bloque on-cat-b", "aria-labelledby": "on-cat", children: [_jsxs("header", { className: "on-cab", children: [_jsx("span", { id: "on-cat", className: "on-bt dsp", children: "Categor\u00EDa" }), _jsx("span", { className: "on-elegida", children: nombre })] }), _jsxs("div", { className: "on-rueda-m", children: [_jsx("div", { ref: caja, className: "on-rueda", role: "radiogroup", "aria-labelledby": "on-cat", onScroll: alDeslizar, onKeyDown: e => { if (e.key === "ArrowLeft") {
                            e.preventDefault();
                            llevar(Math.max(0, centro - 1));
                        } if (e.key === "ArrowRight") {
                            e.preventDefault();
                            llevar(Math.min(cats.length - 1, centro + 1));
                        } }, children: cats.map((t, i) => {
                            const on = i === centro;
                            return (_jsxs("button", { type: "button", role: "radio", "aria-checked": on, tabIndex: on ? 0 : -1, className: "on-cat" + (on ? " on" : ""), style: { "--cc": COLOR_CATEGORIA[t.id ?? "azar"] ?? "#5fb4ff" }, onClick: () => llevar(i), children: [_jsx("span", { className: "on-cat-arte", children: _jsx(ArteCategoria, { id: t.id }) }), _jsx("span", { className: "on-cat-nom dsp", children: t.nombre })] }, t.id ?? "azar"));
                        }) }), _jsx("button", { type: "button", className: "on-flecha izq chica", "aria-label": "Categor\u00EDa anterior", disabled: centro <= 0, onClick: () => llevar(centro - 1), children: "\u2039" }), _jsx("button", { type: "button", className: "on-flecha der chica", "aria-label": "Categor\u00EDa siguiente", disabled: centro >= cats.length - 1, onClick: () => llevar(centro + 1), children: "\u203A" })] })] }));
}
/** Una regla: icono, título, qué significa lo elegido y un interruptor. */
function Interruptor({ icono, titulo, valor, alCambiar, detalle }) {
    return (_jsxs("button", { type: "button", role: "switch", "aria-checked": valor, className: "on-regla" + (valor ? " si" : ""), onClick: () => alCambiar(!valor), children: [_jsx("span", { className: "on-regla-ico", "aria-hidden": "true", children: icono }), _jsxs("span", { className: "on-regla-txt", children: [_jsx("b", { className: "dsp", children: titulo }), _jsx("small", { children: detalle })] }), _jsx("span", { className: "on-sw", "aria-hidden": "true", children: _jsx("i", {}) })] }));
}
