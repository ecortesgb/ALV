import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Rueda de fecha (Día / Mes / Año): se gira con el dedo, la rueda del ratón, las flechas de arriba y abajo o el teclado.
// La fila del centro es la elegida. Cada giro avisa al momento con AAAA-MM-DD; «Listo» cierra.
import { useEffect, useRef, useState } from "react";
import { diasDelMes, dos, hoy } from "../app/fecha";
const ALTO = 40; // alto de cada fila (px); también en alv.css (.a-rueda)
const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
function Columna({ etiqueta, opciones, valor, alCambiar }) {
    const lista = useRef(null), reloj = useRef(), montada = useRef(false);
    const ultimo = useRef(valor);
    ultimo.current = valor;
    // Destino del desplazamiento que hace la rueda sola (para seguir lo elegido): mientras va hacia allá no elige nada.
    // Si la persona toca o gira en medio, se suelta y manda la persona.
    const auto = useRef(null);
    const idx = Math.max(0, opciones.findIndex(o => o.v === valor));
    // Lleva la fila elegida al centro (sin animar la primera vez).
    useEffect(() => {
        const el = lista.current;
        if (!el || Math.round(el.scrollTop / ALTO) === idx)
            return;
        clearTimeout(reloj.current);
        auto.current = idx * ALTO;
        el.scrollTo({ top: idx * ALTO, behavior: montada.current ? "smooth" : "auto" });
        montada.current = true;
    }, [idx]);
    useEffect(() => { montada.current = true; return () => clearTimeout(reloj.current); }, []);
    // Al dejar de girar, la fila del centro queda elegida.
    const alGirar = () => {
        const el0 = lista.current;
        if (auto.current !== null) {
            if (el0 && Math.abs(el0.scrollTop - auto.current) < 2)
                auto.current = null;
            return;
        }
        clearTimeout(reloj.current);
        reloj.current = setTimeout(() => {
            const el = lista.current;
            if (!el)
                return;
            const i = Math.min(opciones.length - 1, Math.max(0, Math.round(el.scrollTop / ALTO)));
            if (opciones[i] && opciones[i].v !== ultimo.current)
                alCambiar(opciones[i].v);
        }, 110);
    };
    const soltar = () => { auto.current = null; };
    const mover = (d) => { const o = opciones[Math.min(opciones.length - 1, Math.max(0, idx + d))]; if (o)
        alCambiar(o.v); };
    const tecla = (e) => {
        const d = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[e.key];
        if (d) {
            e.preventDefault();
            mover(d);
        }
    };
    return (_jsxs("div", { className: "a-rueda-col", children: [_jsx("span", { className: "a-rueda-et", children: etiqueta }), _jsx("button", { type: "button", className: "a-rueda-flecha", onClick: () => mover(-1), "aria-label": `${etiqueta}: anterior`, tabIndex: -1, children: _jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: "M6 15l6-6 6 6" }) }) }), _jsx("div", { ref: lista, className: "a-rueda-lista", role: "listbox", "aria-label": etiqueta, tabIndex: 0, onScroll: alGirar, onKeyDown: tecla, onWheel: soltar, onTouchStart: soltar, onPointerDown: soltar, children: opciones.map(o => (_jsx("div", { role: "option", "aria-selected": o.v === valor, className: o.v === valor ? "on" : "", onClick: () => alCambiar(o.v), children: o.t }, o.v))) }), _jsx("button", { type: "button", className: "a-rueda-flecha", onClick: () => mover(1), "aria-label": `${etiqueta}: siguiente`, tabIndex: -1, children: _jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: "M6 9l6 6 6-6" }) }) })] }));
}
/** Panel con las tres ruedas. `valor`: AAAA-MM-DD o "" (empieza en 01 ENE 2000). */
export function RuedaFecha({ valor, alCambiar, alCerrar }) {
    const tope = hoy().getFullYear() - 18;
    const leer = (v) => { const [a, m, d] = v ? v.split("-").map(Number) : [2000, 1, 1]; return { d: d, m: m, a: a }; };
    const [f, setF] = useState(() => leer(valor));
    const caja = useRef(null);
    // Si se escribe una fecha válida a mano con la rueda abierta, la rueda la sigue.
    useEffect(() => { if (valor)
        setF(leer(valor)); }, [valor]);
    useEffect(() => { caja.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, []);
    const fijar = (n) => {
        const d = Math.min(n.d, diasDelMes(n.a, n.m)); // 31 de abril → 30
        setF({ d, m: n.m, a: n.a });
        alCambiar(`${n.a}-${dos(n.m)}-${dos(d)}`);
    };
    const dias = Array.from({ length: diasDelMes(f.a, f.m) }, (_, i) => ({ v: i + 1, t: dos(i + 1) }));
    const meses = MESES.map((t, i) => ({ v: i + 1, t }));
    const anios = Array.from({ length: tope - 1919 }, (_, i) => ({ v: 1920 + i, t: String(1920 + i) }));
    return (_jsxs("div", { ref: caja, className: "a-rueda", role: "group", "aria-label": "Elegir fecha de nacimiento", onKeyDown: e => { if (e.key === "Escape") {
            e.stopPropagation();
            alCerrar();
        } }, children: [_jsxs("div", { className: "a-rueda-cols", children: [_jsx("div", { className: "a-rueda-banda", "aria-hidden": "true" }), _jsx(Columna, { etiqueta: "D\u00EDa", opciones: dias, valor: f.d, alCambiar: d => fijar({ ...f, d }) }), _jsx(Columna, { etiqueta: "Mes", opciones: meses, valor: f.m, alCambiar: m => fijar({ ...f, m }) }), _jsx(Columna, { etiqueta: "A\u00F1o", opciones: anios, valor: f.a, alCambiar: a => fijar({ ...f, a }) })] }), _jsx("button", { type: "button", className: "a-rueda-listo", onClick: () => { fijar(f); alCerrar(); }, children: "Listo" })] }));
}
