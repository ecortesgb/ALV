import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Elegir juego (Elías, 24 nov; referencias: vitrinas en estante y en plataforma giratoria).
// Primero tarjetas de categoría con un abanico de portadas; al tocar una, sus juegos en vitrinas de cristal que giran
// sobre una plataforma: la del centro crece y brilla, las de los lados quedan atrás. Cada imagen se ve completa (contain).
// Girar: flechas, deslizar, teclado o tocar una vitrina de lado. Tocar la del centro la elige (y el paso sigue solo).
import { useEffect, useRef, useState } from "react";
import { JUEGOS } from "../content/catalogo";
import { ARTE_JUEGOS, EMOJI_JUEGO } from "../content/arteJuegos";
import { FILAS, duracion, gente } from "./Catalogo";
import { srcArte } from "./TarjetasConfig";
import { aviso } from "./comun";
import "./vitrinas.css";
const defJuego = (id) => JUEGOS.find(j => j.id === id);
/** Portada de un juego: su ilustración completa o, si no tiene, su emoji sobre un resplandor. */
function Portada({ id, className = "" }) {
    const arte = ARTE_JUEGOS[id];
    return arte ? _jsx("img", { className: "vt-img " + className, src: srcArte(arte), alt: "", draggable: false, loading: "lazy" })
        : _jsx("span", { className: "vt-sinarte " + className, "aria-hidden": "true", children: EMOJI_JUEGO[id] ?? "🎲" });
}
/** Categorías con al menos un juego configurable. */
export function categoriasDe(configurables) {
    return FILAS.map(f => ({ ...f, juegos: f.juegos.filter(configurables) })).filter(f => f.juegos.length > 0);
}
/** Tarjetas de categoría: color, nombre, cuántos juegos y un abanico con sus portadas. */
export function Categorias({ categorias, actual, alElegir }) {
    return (_jsx("div", { className: "vt-cats", role: "list", children: categorias.map((c, i) => (_jsxs("button", { type: "button", role: "listitem", className: "vt-cat" + (actual === c.id ? " on" : ""), style: { "--vc": c.color, "--i": i }, onClick: () => alElegir(c.id), "aria-label": `${c.nombre}: ${c.juegos.length} ${c.juegos.length === 1 ? "juego" : "juegos"}`, children: [_jsx("span", { className: "vt-cat-fan", "aria-hidden": "true", children: c.juegos.slice(0, 3).map((id, k, xs) => _jsx("span", { className: "vt-cat-carta", style: { "--k": k - (xs.length - 1) / 2, zIndex: 3 - Math.abs(k - (xs.length - 1) / 2) * 2 }, children: _jsx(Portada, { id: id }) }, id)) }), _jsxs("span", { className: "vt-cat-txt", children: [_jsx("b", { children: c.nombre }), _jsxs("small", { children: [c.juegos.length, " ", c.juegos.length === 1 ? "juego" : "juegos"] })] })] }, c.id))) }));
}
/** Vitrinas giratorias de una categoría. `candado` dice por qué un juego no se puede (o null). */
export function Vitrinas({ categoria, elegido, candado, alElegir }) {
    const ids = categoria.juegos;
    const n = ids.length;
    const [i, setI] = useState(() => Math.max(0, ids.indexOf(elegido)));
    useEffect(() => { setI(Math.max(0, ids.indexOf(elegido))); }, [categoria.id]); // eslint-disable-line react-hooks/exhaustive-deps
    const girar = (k) => setI(x => (((x + k) % n) + n) % n);
    // Teclado: flechas giran, Enter elige.
    useEffect(() => {
        const f = (e) => {
            if (e.key === "ArrowRight") {
                e.preventDefault();
                girar(1);
            }
            else if (e.key === "ArrowLeft") {
                e.preventDefault();
                girar(-1);
            }
            else if (e.key === "Enter") {
                e.preventDefault();
                elegir(ids[i]);
            }
        };
        addEventListener("keydown", f);
        return () => removeEventListener("keydown", f);
    });
    const toque = useRef(null);
    const movido = useRef(false);
    const elegir = (id) => {
        const d = defJuego(id);
        if (!d)
            return;
        const c = candado(d);
        if (c) {
            aviso(`${d.nombre}: ${c}`);
            return;
        }
        alElegir(id);
    };
    const actual = defJuego(ids[i]);
    const cActual = actual ? candado(actual) : null;
    return (_jsxs("div", { className: "vt", style: { "--vc": categoria.color }, children: [_jsxs("div", { className: "vt-cab", "aria-live": "polite", children: [_jsx("b", { className: "vt-nombre", children: actual?.nombre }), actual && _jsxs("span", { className: "vt-datos", children: [_jsxs("span", { children: [gente(actual), " jugadores"] }), _jsx("span", { children: duracion(actual) }), actual.sigla && _jsx("span", { children: actual.sigla })] }), actual && _jsx("p", { className: "vt-desc", children: cActual ? `🔒 ${cActual}` : actual.descripcion })] }, ids[i]), _jsxs("div", { className: "vt-escena", onPointerDown: e => { toque.current = e.clientX; movido.current = false; }, onPointerMove: e => { if (toque.current !== null && Math.abs(e.clientX - toque.current) > 12)
                    movido.current = true; }, onPointerUp: e => { const x = toque.current; toque.current = null; if (x === null)
                    return; const dx = e.clientX - x; if (Math.abs(dx) > 40)
                    girar(dx < 0 ? 1 : -1); }, children: [_jsx("span", { className: "vt-plataforma", "aria-hidden": "true" }), ids.map((id, k) => {
                        // Distancia más corta al centro (la plataforma da la vuelta).
                        let d = k - i;
                        if (d > n / 2)
                            d -= n;
                        if (d < -n / 2)
                            d += n;
                        const lejos = Math.abs(d) > 2;
                        const def = defJuego(id);
                        const c = def ? candado(def) : null;
                        return (_jsxs("button", { type: "button", tabIndex: d === 0 ? 0 : -1, "aria-hidden": d !== 0, className: "vt-caja" + (d === 0 ? " centro" : "") + (id === elegido ? " elegida" : "") + (c ? " cerrada" : "") + (lejos ? " lejos" : ""), style: { "--d": d, "--ad": Math.abs(d) }, onClick: () => { if (movido.current)
                                return; if (d === 0)
                                elegir(id);
                            else
                                girar(d); }, "aria-label": d === 0 ? `Elegir ${def?.nombre ?? id}${c ? `. Bloqueado: ${c}` : ""}` : `Ver ${def?.nombre ?? id}`, children: [_jsxs("span", { className: "vt-cristal", children: [_jsx(Portada, { id: id }), _jsx("span", { className: "vt-brillo", "aria-hidden": "true" })] }), _jsx("span", { className: "vt-placa", children: def?.nombre }), c && _jsx("span", { className: "vt-candado", "aria-hidden": "true", children: "\uD83D\uDD12" })] }, id));
                    })] }), _jsxs("div", { className: "vt-mando", children: [_jsx("button", { type: "button", className: "vt-flecha", onClick: () => girar(-1), "aria-label": "Juego anterior", disabled: n < 2, children: "\u25C0" }), _jsx("button", { type: "button", className: "vt-elegir" + (cActual ? " cerrada" : ""), onClick: () => elegir(ids[i]), children: cActual ? "Bloqueado" : ids[i] === elegido ? "¡Jugar este!" : "¡Elegir!" }), _jsx("button", { type: "button", className: "vt-flecha", onClick: () => girar(1), "aria-label": "Siguiente juego", disabled: n < 2, children: "\u25B6" })] }), _jsx("div", { className: "vt-puntos", "aria-hidden": "true", children: ids.map((id, k) => _jsx("i", { className: k === i ? "on" : "" }, id)) })] }));
}
