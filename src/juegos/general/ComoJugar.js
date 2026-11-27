import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Pantalla de carga (Elías, 24 nov; referencias: pantallas de carga de Fall Guys, Fortnite, LEGO Party).
// Siempre al iniciar una partida: una tarjeta del juego (de qué se trata y cómo se gana) y luego una por herramienta,
// temporizador y escenario. Pasan solas cada pocos segundos y vuelven a empezar hasta que cada quien toca «¡Iniciar!».
// Solo usa la vista pública (TV y celular). Celular: tocar a la derecha o izquierda cambia de tarjeta, deslizar también,
// «Omitir» entra ya. TV: pasan solas y se quita en cuanto la partida arranca.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tarjetasCarga } from "../../content/comoJugar";
import { ARTE_JUEGOS } from "../../content/arteJuegos";
import { colorDe } from "../../pantallas/Catalogo";
import { SinArte, srcArte } from "../../pantallas/TarjetasConfig";
import { nombreJuego } from "./texto";
import "./carga.css";
/** ¿Toca mostrar la carga? Solo al inicio de la primera ronda, antes de que nadie haga nada. */
export const tocaExplicar = (v) => !!v.explicar && v.ronda === 1 && v.fase === "contestando" && v.contestaron.length === 0 && Object.keys(v.pistas).length === 0;
/** Segundos por tarjeta y lo que tarda en «cargar» antes de habilitar «¡Iniciar!». */
const SEG = 6;
const CARGA_MS = 2600;
const ETIQUETA = { juego: "Cómo se juega", herramienta: "Herramienta", escenario: "Escenario" };
export function ComoJugar({ v, modo, alCerrar }) {
    const tarjetas = tarjetasCarga({ juegoId: v.juegoId, modalidad: v.modalidad, herramienta: v.verdadReto?.herramienta, temporizador: v.temporizador, escenario: v.escenario, nave: v.impostor?.nave });
    const total = tarjetas.length;
    const [i, setI] = useState(0);
    const [vuelta, setVuelta] = useState(0); // reinicia la barra de la tarjeta actual
    const [cargado, setCargado] = useState(false);
    const [sinImagen, setSinImagen] = useState({});
    // Se dibuja en la raíz de la pantalla (.D) para quedar encima de todo, también del marcador de la TV.
    const ancla = useRef(null);
    const [raiz, setRaiz] = useState(null);
    useEffect(() => { setRaiz(ancla.current?.closest(".D") ?? null); }, []);
    useEffect(() => { const t = setTimeout(() => setCargado(true), CARGA_MS); return () => clearTimeout(t); }, []);
    const ir = (k) => { if (!total)
        return; setI(((k % total) + total) % total); setVuelta(x => x + 1); };
    // Pasan solas y vuelven a empezar.
    useEffect(() => {
        if (total < 2)
            return;
        const t = setTimeout(() => ir(i + 1), SEG * 1000);
        return () => clearTimeout(t);
    }, [i, vuelta, total]); // eslint-disable-line react-hooks/exhaustive-deps
    // Celular: flechas del teclado, Enter para iniciar y Escape para omitir.
    useEffect(() => {
        if (modo !== "celular")
            return;
        const f = (e) => {
            if (e.key === "ArrowRight") {
                e.preventDefault();
                ir(i + 1);
            }
            else if (e.key === "ArrowLeft") {
                e.preventDefault();
                ir(i - 1);
            }
            else if (e.key === "Escape" || (e.key === "Enter" && cargado))
                alCerrar?.();
        };
        addEventListener("keydown", f);
        return () => removeEventListener("keydown", f);
    });
    const toque = useRef(null);
    if (!total)
        return null;
    if (!raiz)
        return _jsx("span", { ref: ancla, hidden: true });
    const l = tarjetas[Math.min(i, total - 1)];
    const arteJuego = ARTE_JUEGOS[v.juegoId];
    const src = l.imagen && !sinImagen[i] ? srcArte(l.imagen) : arteJuego ? srcArte(arteJuego) : null;
    const tocar = (x, ancho) => { if (modo === "celular")
        ir(x > ancho * 0.4 ? i + 1 : i - 1); };
    return createPortal(_jsxs("div", { className: `cg cg-${modo} cg-${l.grupo}`, role: "dialog", "aria-modal": "true", "aria-label": `Cargando ${nombreJuego(v.juegoId)}`, style: { "--tc": colorDe(v.juegoId), "--seg": `${SEG}s` }, children: [_jsx("div", { className: "cg-fondo", "aria-hidden": "true", style: src ? { backgroundImage: `url("${src}")` } : undefined }, `f${i}`), _jsx("div", { className: "cg-velo", "aria-hidden": "true" }), _jsx("div", { className: "cg-barras", "aria-hidden": "true", children: tarjetas.map((_, k) => _jsx("span", { className: k < i ? "llena" : k === i ? "on" : "", children: k === i && _jsx("i", {}, `${i}-${vuelta}`) }, k)) }), _jsxs("header", { className: "cg-cab", children: [_jsxs("span", { className: "cg-juego", children: [_jsx("b", { children: nombreJuego(v.juegoId) }), _jsx("small", { children: cargado ? "Partida lista" : "Cargando partida…" })] }), modo === "celular" && _jsxs("button", { type: "button", className: "cg-omitir", onClick: alCerrar, children: ["Omitir ", _jsx("span", { "aria-hidden": "true", children: "\u25B6\u25B6" })] })] }), _jsxs("div", { className: "cg-cuerpo", onPointerDown: e => { toque.current = { x: e.clientX, t: Date.now() }; }, onPointerUp: e => {
                    const t = toque.current;
                    toque.current = null;
                    if (!t || modo !== "celular")
                        return;
                    const dx = e.clientX - t.x;
                    if (Math.abs(dx) > 50)
                        ir(dx < 0 ? i + 1 : i - 1);
                    else if (Date.now() - t.t < 400) {
                        const r = e.currentTarget.getBoundingClientRect();
                        tocar(e.clientX - r.left, r.width);
                    }
                }, children: [_jsx("figure", { className: "cg-ilus", children: src ? _jsx("img", { src: src, alt: "", draggable: false, onError: () => setSinImagen(s => ({ ...s, [i]: true })) }) : _jsx(SinArte, {}) }, `i${i}`), _jsxs("div", { className: "cg-texto", children: [_jsx("span", { className: "cg-etq", children: ETIQUETA[l.grupo] }), _jsx("h2", { className: "cg-titulo", children: l.titulo }), _jsx("p", { children: l.texto }), l.consejo && _jsxs("p", { className: "cg-consejo", children: [_jsx("span", { "aria-hidden": "true", children: "\u2605" }), l.consejo] })] }, `t${i}`)] }), _jsx("footer", { className: "cg-pie", children: modo === "celular" ? _jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "cg-sig", onClick: () => ir(i + 1), "aria-label": "Siguiente tarjeta", children: ["Siguiente ", _jsx("span", { "aria-hidden": "true", children: "\u25B6" })] }), _jsx("button", { type: "button", className: "cg-iniciar" + (cargado ? " listo" : ""), disabled: !cargado, onClick: alCerrar, children: cargado ? _jsxs(_Fragment, { children: [_jsx("span", { "aria-hidden": "true", children: "\u25B6" }), " \u00A1Iniciar!"] }) : _jsxs(_Fragment, { children: [_jsx("i", { className: "cg-giro", "aria-hidden": "true" }), " Cargando\u2026"] }) })] }) : _jsx("p", { className: "cg-nota", children: cargado ? "La partida empieza en cuanto alguien juegue en su celular." : "Cargando partida…" }) })] }), raiz);
}
