import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Los 3 modos del personalizador (plan de 3 modos, 2026-11-19): tarjetas grandes al abrir el libro, separadores del
// canto para cambiar de modo y el modo Básico en 5 pasos. Los tres editan la misma figura.
import { useEffect, useState } from "react";
import { alternarDetalle, capaDe, colorPelo, colorPiernas, colorTorso, completar, cuelloDe, ponerBotas, ponerCapa, ponerCascoSolo, ponerCuello, ponerMascaraCompleta, ponerObjeto, ponerPelo, ponerPiel, ponerRostro, ponerTorsoCompleto, tipoPiernas, } from "../app/editarFigura";
import { sonar } from "../app/sonido";
import catalogo from "../content/catalogo-figura.json";
import { esOriginal } from "../content/sagas";
import { infoPieza } from "./Desbloqueo";
import { DibujoDado, DibujoMomentos, DibujoNombre, Vineta } from "./Libro";
import { Colores, Piezas, item } from "./Secciones";
import { Rayos, srcArte, useInclina } from "./TarjetasConfig";
import "./configurar.css";
export const MODOS = [
    { m: "basico", nombre: "Básico", texto: "Piel, rostro, pelo, ropa y piernas. Rápido y sencillo.", color: "#f2a900", minis: ["estilo-civil", "estilo-fiesta", "estilo-espacial"] },
    { m: "original", nombre: "Personaje original", texto: "Escoge un personaje famoso ya armado.", color: "#c91a09", minis: ["traje-batman", "traje-spider-man", "traje-harry-potter"] },
    { m: "avanzado", nombre: "Avanzado", texto: "Mezcla piezas comunes y de personajes, pieza por pieza.", color: "#1d5fd1", minis: ["estilo-medieval", "traje-capitan-america", "estilo-superheroe"] },
];
const miniatura = (m) => `${import.meta.env.BASE_URL}arte/piezas/${m}.webp`;
/** Tarjeta de un modo. Usa la ilustración de Elías (`public/arte/personalizador/<modo>.webp`) cuando exista. */
function CartaModo({ m, nombre, texto, color, minis, elegida, indice, onClick }) {
    const inc = useInclina();
    const [sinArte, setSinArte] = useState(false);
    return (_jsxs("button", { type: "button", ...inc, className: "tc tc-tipo p-carta-modo" + (elegida ? " on" : ""), style: { "--i": indice, "--tc": color }, "aria-pressed": elegida, "aria-label": `${nombre}: ${texto}`, onClick: onClick, children: [!sinArte && _jsx("img", { className: "p-modo-arte", src: srcArte(`personalizador/${m}.webp`), alt: "", draggable: false, onError: () => setSinArte(true) }), sinArte && (_jsxs("span", { className: "p-modo-dibujo", "aria-hidden": "true", children: [_jsx(Rayos, { color: color }), _jsx("span", { className: "p-modo-figuras", children: minis.map(x => _jsx("img", { src: miniatura(x), alt: "", draggable: false }, x)) })] })), _jsxs("span", { className: "p-modo-pie", children: [_jsx("span", { className: "dsp p-modo-nombre", children: nombre }), _jsx("span", { className: "p-modo-texto", children: texto })] }), elegida && _jsx("span", { className: "tc-check", "aria-hidden": "true", children: "\u2713" }), _jsx("span", { className: "tc-brillo", "aria-hidden": "true" })] }));
}
/** Primera página del libro: los 3 modos y, abajo, lo que vale en cualquiera (nombre, momentos, al azar). */
export function PaginaModos({ modo, elegir, ir }) {
    return _jsxs(_Fragment, { children: [_jsx("div", { className: "p-modos", children: MODOS.map((x, i) => _jsx(CartaModo, { ...x, indice: i, elegida: modo === x.m, onClick: () => elegir(x.m) }, x.m)) }), _jsx("p", { className: "p-nota", children: "Los tres modos cambian la misma figura: lo que hagas en uno se ve en los otros." }), _jsxs("div", { className: "p-vinetas p-vinetas-mas", children: [_jsx(Vineta, { titulo: "Nombre", dibujo: _jsx(DibujoNombre, {}), onClick: () => ir("nombre") }), _jsx(Vineta, { titulo: "Momentos", dibujo: _jsx(DibujoMomentos, {}), onClick: () => ir("momentos") }), _jsx(Vineta, { titulo: "Aleatorio", dibujo: _jsx(DibujoDado, {}), onClick: () => ir("aleatorio") })] })] });
}
/** Separadores de colores en el canto del libro: cambian de modo en cualquier página. */
export function Separadores({ modo, elegir }) {
    return (_jsx("nav", { className: "p-separadores", "aria-label": "Modo", children: MODOS.map(x => (_jsx("button", { type: "button", className: "p-separador " + x.m + (modo === x.m ? " on" : ""), "aria-current": modo === x.m ? "page" : undefined, style: { "--tc": x.color }, onClick: () => { if (modo !== x.m)
                elegir(x.m); }, children: x.m === "original" ? "Original" : x.nombre }, x.m))) }));
}
// ---------- Básico: 5 pasos ----------
const PASOS = [
    { k: "piel", nombre: "Piel", zona: "cabeza" },
    { k: "rostro", nombre: "Rostro", zona: "cabeza" },
    { k: "pelo", nombre: "Pelo", zona: "pelo" },
    { k: "torso", nombre: "Torso", zona: "torso" },
    { k: "piernas", nombre: "Piernas", zona: "piernas" },
];
const S = catalogo.secciones;
const PELOS = [...new Set([...catalogo.coloresPelo, ...catalogo.paleta])];
/** Ropa normal: los torsos para pintar (sin dibujo de personaje ni uniforme). */
const ROPA = S.torso.filter(x => !x.original && !esOriginal(x.id));
export function PasosBasico({ figura, cambiar, setZona }) {
    const [i, setI] = useState(0);
    const paso = PASOS[i];
    useEffect(() => { setZona(paso.zona); return () => setZona(null); }, [paso.zona, setZona]);
    const f = completar(figura);
    const poner = (g) => cambiar(g);
    const ir = (k) => { sonar("clic"); setI(Math.max(0, Math.min(PASOS.length - 1, k))); };
    return _jsxs(_Fragment, { children: [_jsx("div", { className: "p-pasos", role: "tablist", "aria-label": "Pasos", children: PASOS.map((p, k) => (_jsxs("button", { type: "button", role: "tab", "aria-selected": k === i, className: "p-paso" + (k === i ? " on" : "") + (k < i ? " hecho" : ""), onClick: () => ir(k), children: [_jsx("i", { "aria-hidden": "true", children: k + 1 }), _jsx("span", { children: p.nombre })] }, p.k))) }), _jsx(TambienLleva, { f: f, poner: poner }), _jsx("div", { className: "p-paso-cuerpo", children: cuerpo() }), _jsxs("div", { className: "p-pasos-pie", children: [_jsx("button", { type: "button", className: "p-opcion", disabled: i === 0, onClick: () => ir(i - 1), children: "Anterior" }), i < PASOS.length - 1
                        ? _jsxs("button", { type: "button", className: "p-opcion on", onClick: () => ir(i + 1), children: ["Siguiente: ", PASOS[i + 1].nombre] })
                        : _jsx("span", { className: "p-sfx p-listo", children: "\u00A1Lista!" })] })] });
    function cuerpo() {
        switch (paso.k) {
            case "piel": {
                const nombres = Object.fromEntries(catalogo.tonos.map(t => [t.hex, t.nombre]));
                return _jsx(Colores, { titulo: "Color de piel", actual: f.identidad.piel, colores: catalogo.tonos.map(t => t.hex), nombres: nombres, elegir: h => poner(ponerPiel(f, h)) });
            }
            case "rostro": {
                const mascara = !!f.accesorios.cara;
                return _jsx(Piezas, { titulo: "Rostro", items: S.rostro.map(p => item(p, !mascara && p.id === f.identidad.rostro, () => poner(ponerRostro(f, p.id)))) });
            }
            case "pelo": {
                const c = f.identidad.cabello;
                return _jsxs(_Fragment, { children: [_jsx(Piezas, { titulo: "Peinado", items: S.pelo.map(p => item(p, (p.id ?? null) === (c?.id ?? null), () => poner(ponerPelo(f, p.id)))) }), c && _jsx(Colores, { titulo: "Color del pelo", actual: c.color, colores: PELOS, elegir: h => poner(colorPelo(f, h)) })] });
            }
            case "torso": {
                const t = f.ropa.torso;
                const deRopa = ROPA.some(x => (x.id ?? null) === (t.estampado ?? null));
                return _jsxs(_Fragment, { children: [_jsx(Piezas, { titulo: "Ropa", items: ROPA.map(p => item(p, (p.id ?? null) === (t.estampado ?? null), () => poner(ponerTorsoCompleto(f, p.id)))) }), deRopa && _jsx(Colores, { titulo: "Color", actual: t.color, colores: catalogo.paleta, elegir: h => poner(colorTorso(f, h)) })] });
            }
            case "piernas": {
                const p = f.ropa.piernas;
                return _jsxs(_Fragment, { children: [_jsx(Piezas, { titulo: "Largo", items: S.piernas.map(x => item(x, x.tipo === p.tipo, () => poner(tipoPiernas(f, x.tipo)))) }), _jsx(Colores, { titulo: "Color", actual: p.color, colores: catalogo.paleta, elegir: h => poner(colorPiernas(f, "ambos", h, true)) })] });
            }
        }
    }
}
/** Lo que la figura trae de los otros modos y Básico no edita: se ve aquí y se puede quitar (con aviso). */
function TambienLleva({ f, poner }) {
    const cosas = [];
    const casco = f.accesorios.cabeza, mascara = f.accesorios.cara, cuello = cuelloDe(f), capa = capaDe(f);
    if (casco)
        cosas.push({ nombre: infoPieza(casco.id).nombre, quitar: () => ponerCascoSolo(f, null, "") });
    if (mascara)
        cosas.push({ nombre: infoPieza(mascara.id).nombre, quitar: () => ponerMascaraCompleta(f, null, "") });
    if (f.identidad.detalles.length)
        cosas.push({ nombre: f.identidad.detalles.map(d => infoPieza(d).nombre).join(" + "), quitar: () => alternarDetalle(f, null, () => null) });
    if (cuello)
        cosas.push({ nombre: infoPieza(cuello.id).nombre, quitar: () => ponerCuello(f, null) });
    if (capa)
        cosas.push({ nombre: infoPieza(capa.id).nombre, quitar: () => ponerCapa(f, null) });
    const est = f.ropa.torso.estampado;
    if (est && !ROPA.some(x => x.id === est))
        cosas.push({ nombre: infoPieza(est).nombre, quitar: () => colorTorso(ponerTorsoCompleto(f, null), f.ropa.torso.color) });
    if (f.ropa.piernas.botas)
        cosas.push({ nombre: "Botas", quitar: () => ponerBotas(f, null) });
    for (const m of ["mano_der", "mano_izq"]) {
        const o = f.accesorios[m];
        if (o)
            cosas.push({ nombre: infoPieza(o.id).nombre, quitar: () => ponerObjeto(f, m, null) });
    }
    if (!cosas.length)
        return null;
    return (_jsxs("section", { className: "p-tambien", "aria-label": "Tambi\u00E9n lleva", children: [_jsx("span", { className: "p-tambien-titulo", children: "Tambi\u00E9n lleva" }), cosas.map(c => (_jsxs("button", { type: "button", className: "p-tambien-cosa", onClick: () => { sonar("clic"); poner(c.quitar()); }, "aria-label": `Quitar ${c.nombre}`, children: [c.nombre, " ", _jsx("b", { "aria-hidden": "true", children: "\u00D7" })] }, c.nombre)))] }));
}
