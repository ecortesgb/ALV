import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Armar equipos, parejas o bandos (Elías, 24 nov; referencia: «Armado de equipos» con banca y placas de bloques).
// Cada jugador es una ficha (cabina de su color con su busto). Se arrastra a la placa de un equipo, o se toca la ficha y
// luego la placa. En parejas, soltar sobre alguien los intercambia. Cada equipo lleva un nombre editable.
// Solo cambia `grupos`, `cuantos` y `nombres`; la validez la revisa el configurador.
import { useEffect, useRef, useState } from "react";
import { GRUPOS_EQUIPOS, GRUPOS_SEXOS } from "../engine/nucleo";
import { FichaJugador } from "./lobby/Ficha";
import "./equipos.css";
/** Colores de las placas: equipos A–D, bandos y parejas (en ciclo). */
const COLOR_GRUPO = { a: "#2f7cf0", b: "#ff8a1f", c: "#2fbf4f", d: "#9a4cf0", ellas: "#ff4fa8", ellos: "#2f7cf0" };
const COLOR_PAREJA = ["#ff4fa8", "#2f7cf0", "#ffcf2e", "#2fbf4f", "#ff8a1f", "#9a4cf0", "#1fc7c1", "#e8343a"];
/** Nombres sugeridos (🎲). PROPUESTA: se pueden cambiar aquí. */
export const NOMBRES_SUGERIDOS = ["Los Legendarios", "Las Leyendas", "Los Bloques", "Los Ninjas", "Las Estrellas", "Los Tiburones", "Los Cohetes",
    "Las Panteras", "Los Piratas", "Los Dragones", "Los Mapaches", "Las Águilas", "Los Tacos", "Los Rayos", "Los Volcanes", "Los Fantasmas"];
const mezclar = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
} return a; };
/** Grupos a mostrar según el tipo. */
export function gruposDe(tipo, n, cuantos) {
    if (tipo === "sexos")
        return GRUPOS_SEXOS.map(g => ({ ...g, color: COLOR_GRUPO[g.id] }));
    if (tipo === "parejas")
        return Array.from({ length: Math.floor(n / 2) }, (_, i) => ({ id: `p${i + 1}`, nombre: `Pareja ${i + 1}`, color: COLOR_PAREJA[i % COLOR_PAREJA.length] }));
    return GRUPOS_EQUIPOS.slice(0, cuantos).map(g => ({ ...g, color: COLOR_GRUPO[g.id] }));
}
/** Reparto al azar en `cuantos` grupos (equipos) o en parejas. */
export function repartoAzar(tipo, ids, cuantos) {
    const xs = mezclar(ids);
    if (tipo === "parejas")
        return Object.fromEntries(xs.map((id, i) => [id, `p${Math.floor(i / 2) + 1}`]));
    if (tipo === "sexos")
        return Object.fromEntries(xs.map((id, i) => [id, i % 2 === 0 ? "ellas" : "ellos"]));
    return Object.fromEntries(xs.map((id, i) => [id, GRUPOS_EQUIPOS[i % cuantos].id]));
}
export function ArmarEquipos({ tipo, miembros, grupos, alGrupos, cuantos, alCuantos, nombres, alNombres, color }) {
    const n = miembros.length;
    const lista = gruposDe(tipo, n, cuantos);
    const validos = new Set(lista.map(g => g.id));
    const banca = miembros.filter(m => !validos.has(grupos[m.id] ?? ""));
    const de = (g) => miembros.filter(m => grupos[m.id] === g);
    const [sel, setSel] = useState(null);
    const [arr, setArr] = useState(null);
    const [sobre, setSobre] = useState(null);
    const inicio = useRef(null);
    /** Mueve a `id` al grupo `g` ("" = banca). En parejas, si la placa está llena, intercambia con quien no es él. */
    const mover = (id, g, conQuien) => {
        const actual = grupos[id] ?? "";
        if (actual === g && !conQuien)
            return;
        if (tipo === "parejas") {
            const otro = conQuien ?? de(g).find(m => m.id !== id)?.id;
            if (!otro || otro === id)
                return;
            alGrupos({ ...grupos, [id]: grupos[otro], [otro]: actual });
            return;
        }
        const nuevo = { ...grupos };
        if (g)
            nuevo[id] = g;
        else
            delete nuevo[id];
        alGrupos(nuevo);
    };
    /** Qué hay bajo el dedo: una ficha (para intercambiar) o una placa/banca. */
    const objetivo = (x, y) => {
        const el = document.elementFromPoint(x, y)?.closest("[data-grupo]");
        if (!el)
            return null;
        const f = document.elementFromPoint(x, y)?.closest("[data-ficha]");
        return { g: el.dataset.grupo ?? "", ficha: f?.dataset.ficha };
    };
    const soltar = (id, x, y) => {
        const o = objetivo(x, y);
        if (!o)
            return;
        if (tipo === "parejas" && o.ficha && o.ficha !== id)
            mover(id, o.g, o.ficha);
        else
            mover(id, o.g);
    };
    // Escape cancela la selección.
    useEffect(() => { const f = (e) => { if (e.key === "Escape")
        setSel(null); }; addEventListener("keydown", f); return () => removeEventListener("keydown", f); }, []);
    const abajo = (id) => (e) => { inicio.current = { id, x: e.clientX, y: e.clientY }; try {
        e.currentTarget.setPointerCapture(e.pointerId);
    }
    catch { /* sin captura, el arrastre sigue con los eventos del botón */ } };
    const mueve = (e) => {
        const i = inicio.current;
        if (!i)
            return;
        if (!arr && Math.hypot(e.clientX - i.x, e.clientY - i.y) < 8)
            return;
        setArr({ id: i.id, x: e.clientX, y: e.clientY });
        setSobre(objetivo(e.clientX, e.clientY)?.g ?? null);
    };
    const arriba = (id) => (e) => {
        const i = inicio.current;
        inicio.current = null;
        if (arr) {
            soltar(arr.id, e.clientX, e.clientY);
            setArr(null);
            setSobre(null);
            setSel(null);
            return;
        }
        if (!i)
            return;
        // Toque sin arrastre: la primera ficha queda elegida; tocar otra en parejas las intercambia, en equipos la mueve a ese equipo.
        if (sel && sel !== id) {
            tipo === "parejas" ? mover(sel, grupos[id] ?? "", id) : mover(sel, grupos[id] ?? "");
            setSel(null);
        }
        else
            setSel(sel === id ? null : id);
    };
    const tocarPlaca = (g) => { if (sel) {
        mover(sel, g);
        setSel(null);
    } };
    // Función (no componente): así la ficha no se vuelve a montar a media arrastrada y no pierde el puntero.
    const ficha = (m) => (_jsxs("button", { type: "button", "data-ficha": m.id, className: "eq-ficha" + (sel === m.id ? " sel" : "") + (arr?.id === m.id ? " fantasma" : ""), onPointerDown: abajo(m.id), onPointerMove: mueve, onPointerUp: arriba(m.id), onPointerCancel: () => { inicio.current = null; setArr(null); setSobre(null); }, "aria-pressed": sel === m.id, "aria-label": `${m.nombre}${sel === m.id ? ", elegido: toca un equipo" : ""}`, children: [_jsx(FichaJugador, { id: m.id, figura: m.figura, nombre: m.nombre, color: color(m.id), tamano: 54, soloCara: true }), _jsx("span", { className: "eq-nom", children: m.nombre })] }, m.id));
    const arrastrado = arr ? miembros.find(m => m.id === arr.id) : null;
    const nombreDe = (g) => nombres[g.id] ?? "";
    const sugerir = (gid) => {
        const usados = new Set(Object.values(nombres));
        const libres = NOMBRES_SUGERIDOS.filter(x => !usados.has(x));
        alNombres({ ...nombres, [gid]: (libres.length ? libres : NOMBRES_SUGERIDOS)[Math.floor(Math.random() * (libres.length || NOMBRES_SUGERIDOS.length))] });
    };
    // De 2 a 4 equipos, mínimo una persona por equipo.
    const repartos = [2, 3, 4].filter(t => t <= n);
    return (_jsxs("div", { className: "eq eq-" + tipo + (arr ? " arrastrando" : ""), children: [_jsxs("div", { className: "eq-barra", children: [_jsx("span", { className: "eq-ayuda", children: sel ? `Ahora toca el equipo para ${miembros.find(m => m.id === sel)?.nombre ?? ""}` : tipo === "parejas" ? "Arrastra a alguien sobre otra persona para cambiarlos de pareja" : "Arrastra cada ficha a su equipo (o tócala y luego toca el equipo)" }), _jsxs("div", { className: "eq-acciones", children: [tipo === "equipos" && repartos.map(t => (_jsxs("button", { type: "button", className: "eq-chip" + (cuantos === t ? " on" : ""), "aria-pressed": cuantos === t, onClick: () => alCuantos(t), children: [t, " equipos", _jsx("small", { children: n % t === 0 ? `de ${n / t}` : Array.from({ length: t }, (_, i) => Math.floor(n / t) + (i < n % t ? 1 : 0)).join("+") })] }, t))), _jsx("button", { type: "button", className: "eq-chip azar", onClick: () => alGrupos(repartoAzar(tipo, miembros.map(m => m.id), cuantos)), children: "\uD83C\uDFB2 Aleatorio" })] })] }), banca.length > 0 && (_jsxs("section", { className: "eq-banca" + (sobre === "" ? " sobre" : ""), "data-grupo": "", onClick: () => tocarPlaca(""), "aria-label": "Banca de jugadores", children: [_jsx("b", { className: "eq-banca-t", children: "Banca de jugadores" }), _jsx("div", { className: "eq-fichas", children: banca.map(ficha) })] })), _jsx("div", { className: "eq-placas", style: { "--cols": Math.min(lista.length, 4) }, children: lista.map(g => (_jsxs("section", { className: "eq-placa" + (sobre === g.id ? " sobre" : "") + (sel ? " destino" : ""), "data-grupo": g.id, style: { "--eqc": g.color }, onClick: e => { if (!e.target.closest("input,button"))
                        tocarPlaca(g.id); }, children: [_jsxs("header", { className: "eq-placa-cab", children: [_jsx("input", { className: "eq-nombre", value: nombreDe(g), maxLength: 20, placeholder: tipo === "parejas" && de(g.id).length === 2 ? de(g.id).map(m => m.nombre).join(" y ") : g.nombre, "aria-label": `Nombre de ${g.nombre}`, onChange: e => alNombres({ ...nombres, [g.id]: e.target.value.slice(0, 20) }) }), _jsx("button", { type: "button", className: "eq-dado", onClick: () => sugerir(g.id), "aria-label": `Sugerir nombre para ${g.nombre}`, title: "Sugerir nombre", children: "\uD83C\uDFB2" }), _jsx("span", { className: "eq-cuenta", children: de(g.id).length })] }), _jsxs("div", { className: "eq-base", children: [_jsx("div", { className: "eq-fichas", children: de(g.id).map(ficha) }), de(g.id).length === 0 && _jsx("span", { className: "eq-vacio", children: "Suelta aqu\u00ED" })] })] }, g.id))) }), arr && arrastrado && (_jsx("div", { className: "eq-flota", style: { left: arr.x, top: arr.y }, "aria-hidden": "true", children: _jsx(FichaJugador, { id: arrastrado.id, figura: arrastrado.figura, nombre: arrastrado.nombre, color: color(arrastrado.id), tamano: 60, soloCara: true }) }))] }));
}
