import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// El impostor en la nave: papeles en la mesa (Elías, 24 nov). Se configura en «Modo de juego» (categorías con imagen);
// después de la carga, la partida nace con los papeles repartidos: cada quien ve el suyo con la huella y, cuando todos lo
// vieron, el administrador abre la discusión. Solo leen la vista pública y, en el papel, lo privado de cada quien.
import { useEffect, useRef, useState } from "react";
import { Icono } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { sonar } from "../../app/sonido";
import { CONTENIDO } from "../../content";
import { srcArte } from "../../pantallas/TarjetasConfig";
import { MedallonJugador } from "../../pantallas/azotea/Cabecera";
import { nombreDe } from "../general/texto";
import { arteNave } from "./nave";
import "./papelNave.css";
/** Arte de cada categoría (PNG de Elías a WebP en `arte/impostor/`). Mientras no llegue, sale su emoji. */
export const ARTE_CATEGORIA = {
    azar: { arte: "cat-azar", emoji: "🎲" }, "s-pel": { arte: "cat-peliculas", emoji: "🎬" }, "s-vid": { arte: "cat-videojuegos", emoji: "🎮" },
    "s-ser": { arte: "cat-series", emoji: "📺" }, "s-can": { arte: "cat-cantantes", emoji: "🎤" }, "s-sup": { arte: "cat-superheroes", emoji: "🦸" },
    "s-ani": { arte: "cat-animados", emoji: "🎨" }, "s-cel": { arte: "cat-celebridades", emoji: "⭐" }, "s-fut": { arte: "cat-futbol", emoji: "⚽" },
    "s-adu": { arte: "cat-adultos", emoji: "🔥" }, "s-obj": { arte: "cat-objetos", emoji: "🔑" },
};
/** Las tarjetas de categoría: «Al azar» y las de la nave (Adultos solo con Temperatura alta). */
export function categoriasNave(adulto) {
    return [{ id: null, nombre: "Al azar" }, ...CONTENIDO.temas.filter(t => t.soloNave && (!t.adulto || adulto)).map(t => ({ id: t.id, nombre: t.nombre }))];
}
export const nombreCategoria = (id) => (id === null ? "Al azar" : CONTENIDO.temas.find(t => t.id === id)?.nombre ?? "Al azar");
/** Imagen de la categoría; si el archivo todavía no existe, el emoji sobre el color de la tarjeta. */
export function ArteCategoria({ id }) {
    const a = ARTE_CATEGORIA[id ?? "azar"] ?? ARTE_CATEGORIA.azar;
    const [falla, setFalla] = useState(false);
    return falla ? _jsx("span", { className: "ns-cat-emoji", "aria-hidden": "true", children: a.emoji })
        : _jsx("img", { className: "ns-cat-img", src: srcArte(`impostor/${a.arte}.webp`), alt: "", draggable: false, onError: () => setFalla(true) });
}
const persona = (v, miembros, id) => ({
    id, nombre: nombreDe(v, id), figura: miembros.find(m => m.id === id)?.figura, color: colorDe(id, v.jugadores.map(j => j.id)),
});
/**
 * Tu papel: civil (con la palabra en la huella) o impostor (con quiénes son los otros y la pista o la categoría).
 * Después de «Ya lo vi», quién falta; el administrador abre la discusión (aunque falte alguien).
 */
export function PapelNave({ v, mio, miembros, yo, vi, alVisto, soyAnfitrion, alDiscutir, local }) {
    const im = v.impostor;
    const ids = v.jugadores.map(j => j.id);
    const vistos = im.vistos ?? [];
    const faltan = ids.filter(id => !vistos.includes(id));
    const total = im.total;
    if (vi || !mio) {
        return (_jsxs("section", { className: "ns-papel espera", "aria-label": "Papeles", children: [_jsx("span", { className: "ns-kick", children: "Papeles repartidos" }), _jsx("span", { className: "ns-t2", children: faltan.length ? "Esperando a que todos vean su papel" : "Todos vieron su papel" }), _jsx("ul", { className: "ns-vistos", "aria-label": "Qui\u00E9n ya vio su papel", children: ids.map((id, i) => {
                        const p = persona(v, miembros, id);
                        return (_jsxs("li", { className: vistos.includes(id) ? "si" : "", style: varsColor(p.color), children: [_jsx(MedallonJugador, { id: id, figura: p.figura, estrella: i + 1, tamano: "var(--ns-v)" }), _jsx("span", { className: "ns-v-nom", children: p.nombre }), vistos.includes(id) && _jsx("span", { className: "ns-v-ok", "aria-label": "Ya lo vio", children: "\u2713" })] }, id));
                    }) }), soyAnfitrion ? (_jsxs(_Fragment, { children: [faltan.length > 0 && _jsxs("small", { className: "ns-nota", children: ["Faltan: ", faltan.map(id => nombreDe(v, id)).join(", "), ". ", local ? "" : "Puedes empezar sin esperar."] }), _jsx("button", { type: "button", className: "ns-bloque ns-discutir", disabled: !!local && faltan.length > 0, onClick: alDiscutir, children: _jsx("b", { children: "\u00A1A discutir!" }) })] })) : _jsx("p", { className: "ns-espera a-pulso", role: "status", children: "El administrador abre la discusi\u00F3n en cuanto todos lo vean." })] }));
    }
    const imp = mio.rol === "impostor";
    const comp = mio.companeros ?? [];
    const yoP = persona(v, miembros, yo);
    // Como desbloquear el celular (Elías, 25 nov): tu burbuja arriba y el lector abajo. Por fuera nada dice si eres
    // impostor o civil (mismo color y brillo para todos); el papel sale solo dentro del círculo mientras mantienes el dedo.
    return (_jsxs("section", { className: "ns-papel ns-lector-pant", "aria-label": "Tu papel", style: { ...varsColor(yoP.color), "--espacio": arteNave("espacio") }, children: [_jsxs("div", { className: "ns-yo", children: [_jsx(MedallonJugador, { id: yo, figura: yoP.figura, estrella: ids.indexOf(yo) + 1, tamano: "var(--ns-b)" }), _jsx("b", { className: "ns-yo-nom", children: yoP.nombre })] }), _jsx(LectorHuella, { children: imp ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "ns-l-kick", children: "Tu papel" }), _jsx("b", { className: "ns-l-imp", children: "Impostor" }), _jsx("span", { className: "ns-l-det", children: mio.pista ? _jsxs(_Fragment, { children: ["Pista: ", _jsx("b", { children: mio.pista })] }) : _jsxs(_Fragment, { children: ["Categor\u00EDa: ", _jsx("b", { children: mio.tema })] }) }), mio.pista && _jsxs("span", { className: "ns-l-det", children: ["Categor\u00EDa: ", mio.tema] }), _jsx("span", { className: "ns-l-det chico", children: comp.length ? `Con ${comp.map(id => nombreDe(v, id)).join(" y ")}` : "Eres el único. Que no te descubran." })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "ns-l-kick", children: "Tu palabra" }), _jsx("b", { className: "ns-l-pal", style: { "--n": Math.max(5, ...(mio.palabra ?? "").split(/\s+/).map(x => x.length)) }, children: mio.palabra }), _jsxs("span", { className: "ns-l-det", children: ["Categor\u00EDa: ", _jsx("b", { children: mio.tema })] })] })) }), _jsxs("p", { className: "ns-l-ayuda", children: ["Hay ", total, " ", total === 1 ? "impostor" : "impostores", " a bordo. Que nadie m\u00E1s vea la pantalla."] }), _jsx("button", { type: "button", className: "ns-bloque", onClick: alVisto, children: _jsx("b", { children: "Ya lo vi" }) })] }));
}
/** Lector de huella redondo: el secreto (los hijos) se ve dentro del círculo solo mientras se mantiene el dedo, Espacio o Enter. */
function LectorHuella({ children }) {
    const [on, setOn] = useState(false);
    const tecla = (e, valor) => { if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setOn(valor);
    } };
    return (_jsxs("div", { className: "ns-lector-caja", children: [_jsxs("div", { className: "ns-lector" + (on ? " on" : ""), role: "button", tabIndex: 0, "aria-pressed": on, "aria-label": "Mant\u00E9n el dedo para ver tu papel", onPointerDown: () => setOn(true), onPointerUp: () => setOn(false), onPointerLeave: () => setOn(false), onPointerCancel: () => setOn(false), onContextMenu: e => e.preventDefault(), onBlur: () => setOn(false), onKeyDown: e => tecla(e, true), onKeyUp: e => tecla(e, false), children: [_jsx("span", { className: "ns-l-anillo", "aria-hidden": "true" }), _jsxs("span", { className: "ns-l-tapa", "aria-hidden": on, children: [_jsx(Icono, { id: "finger" }), _jsx("span", { className: "ns-l-raya" })] }), _jsx("span", { className: "ns-l-secreto", "aria-hidden": !on, "aria-live": "polite", children: on ? children : null })] }), _jsx("span", { className: "ns-l-pide", "aria-hidden": "true", children: on ? "Suelta para ocultar" : "Mantén el dedo para ver" })] }));
}
/** ¿Acaba de abrirse la discusión? true durante 2.4 s cuando la etapa pasa de «papeles» a la vuelta de palabras. */
export function useAnuncioDiscusion(v) {
    const antes = useRef(v?.impostor?.etapa);
    const [ver, setVer] = useState(false);
    const etapa = v?.impostor?.etapa;
    useEffect(() => {
        const prev = antes.current;
        antes.current = etapa;
        if (prev !== "papeles" || etapa !== "pistas")
            return;
        setVer(true);
        sonar("epica");
        const t = setTimeout(() => setVer(false), 2400);
        return () => clearTimeout(t);
    }, [etapa]);
    return ver;
}
/** «¡A discutir!»: el botón dorado de la mesa se hunde, destello y el aviso (TV y celulares). */
export function AnuncioDiscusion({ modo }) {
    return (_jsxs("div", { className: `ns-anuncio ${modo}`, role: "status", "aria-live": "assertive", children: [_jsx("span", { className: "ns-anuncio-boton", "aria-hidden": "true" }), _jsx("b", { className: "ns-anuncio-t dsp ol", children: "\u00A1A discutir!" }), _jsx("small", { children: "Por turnos, cada quien dice su palabra en voz alta y la escribe." })] }));
}
