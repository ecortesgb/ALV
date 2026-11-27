import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Libro de cómic del personalizador: página izquierda con la figura viva; página derecha con viñetas.
// Elegir una viñeta pasa la página (animación de hoja); «Atrás» la regresa.
// Tres modos sobre la misma figura (plan de 3 modos, 2026-11-19): la primera página son las 3 tarjetas (Básico,
// Personaje original, Avanzado) y los separadores del canto cambian de modo en cualquier momento.
import { useEffect, useRef, useState } from "react";
import { Icono } from "../ds";
import { FiguraViva, apodoDe } from "../app/figura3d";
import { sonar } from "../app/sonido";
import { PaginaExtra } from "./Extras";
import { PanelDesbloqueo } from "./Desbloqueo";
import { usePiezas } from "../servicios/piezas";
import { PaginaSeccion } from "./Secciones";
import { PaginaModos, PasosBasico, Separadores } from "./Modos";
import { PaginaOriginal, tituloOriginal } from "./Originales";
const nada = () => { };
const sinMando = { current: null };
/** Página donde empieza cada modo. */
export const RAIZ = { basico: "basico", original: "original", avanzado: "avanzado" };
export const miniatura = (mini) => `${import.meta.env.BASE_URL}arte/piezas/${mini}.webp`;
/** Viñetas de Apariencia. `basico`: nombre en modo Básico (si no está, la viñeta solo sale en Completo). */
export const APARIENCIA = [
    { k: "pelo", nombre: "Pelo", basico: "Pelo", zona: "pelo", img: "hair-012" },
    { k: "casco", nombre: "Casco", zona: "casco", img: "helm-011" },
    { k: "cabeza", nombre: "Cabeza", basico: "Cabeza", zona: "cabeza", img: "face-007" },
    { k: "cuello", nombre: "Cuello y capa", basico: "Accesorio", zona: "cuello_frente", img: "neck-002" },
    { k: "torso", nombre: "Torso", basico: "Torso completo", zona: "torso", img: "print-010" },
    { k: "brazos", nombre: "Brazos", zona: "brazos", img: "print-019" },
    { k: "manos", nombre: "Manos", zona: "manos", img: "sin-objeto" },
    { k: "cadera", nombre: "Cadera", zona: "cadera", img: "piernas-normal" },
    { k: "piernas", nombre: "Piernas", basico: "Piernas completas", zona: "piernas", img: "piernas-cortas" },
    { k: "botas", nombre: "Botas", zona: "botas", img: "con-botas" },
];
const TITULO = { modos: "¿Cómo la armas?", basico: "Básico", avanzado: "Avanzado", apariencia: "Piezas comunes", objetos: "Objetos", momentos: "Momentos", nombre: "Nombre", aleatorio: "Aleatorio", retos: "Retos" };
export function tituloDe(p) {
    const a = APARIENCIA.find(x => x.k === p);
    return a ? a.nombre : TITULO[p] ?? tituloOriginal(p);
}
export function zonaDe(p) {
    const a = APARIENCIA.find(x => x.k === p);
    return a ? (a.k === "torso" ? "torso" : a.zona) : p === "objetos" ? "objeto" : "completa";
}
// ---------- Viñetas ----------
export function Vineta({ titulo, img, dibujo, ancha, alta, onClick }) {
    return (_jsxs("button", { type: "button", className: "p-vineta" + (ancha ? " ancha" : "") + (alta ? " alta" : ""), onClick: onClick, children: [_jsx("span", { className: "p-vineta-arte" + (Array.isArray(img) ? " tira" : ""), "aria-hidden": "true", children: img ? [img].flat().map(m => _jsx("img", { src: miniatura(m), alt: "", draggable: false }, m)) : dibujo }), _jsx("span", { className: "p-vineta-cap dsp", children: titulo })] }));
}
/** Dibujos propios para las viñetas sin pieza: momentos, nombre y aleatorio. */
export const DibujoMomentos = () => (_jsxs("svg", { viewBox: "0 0 120 90", children: [_jsx("path", { d: "M60 6l9 20 22-8-10 20 24 6-22 10 14 18-23-4-4 22-12-18-14 16-2-22-23 2 15-17-20-12 23-4-8-21 21 9z", fill: "#ffd23f", stroke: "#0a1030", strokeWidth: "3.5", strokeLinejoin: "round" }), _jsx("text", { x: "60", y: "54", textAnchor: "middle", fontFamily: "Bangers, Impact, sans-serif", fontSize: "22", fill: "#c91a09", stroke: "#0a1030", strokeWidth: "1", children: "\u00A1POW!" })] }));
export const DibujoNombre = () => (_jsxs("svg", { viewBox: "0 0 120 90", children: [_jsx("rect", { x: "12", y: "24", width: "96", height: "42", rx: "6", fill: "#fff", stroke: "#0a1030", strokeWidth: "3.5", transform: "rotate(-4 60 45)" }), _jsx("text", { x: "60", y: "56", textAnchor: "middle", fontFamily: "Bangers, Impact, sans-serif", fontSize: "28", fill: "#0a1030", transform: "rotate(-4 60 45)", children: "ABC" })] }));
export const DibujoReto = () => (_jsxs("svg", { viewBox: "0 0 240 90", children: [_jsxs("g", { transform: "rotate(-6 120 45)", children: [_jsx("path", { d: "M120 8l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z", fill: "#ffd23f", stroke: "#0a1030", strokeWidth: "3.5", strokeLinejoin: "round" }), _jsx("text", { x: "120", y: "86", textAnchor: "middle", fontFamily: "Bangers, Impact, sans-serif", fontSize: "17", fill: "#0a1030", children: "\u00A1GANA PIEZAS!" })] }), _jsx("rect", { x: "22", y: "26", width: "38", height: "38", rx: "6", fill: "#fff", stroke: "#0a1030", strokeWidth: "3", transform: "rotate(-10 41 45)" }), _jsx("text", { x: "41", y: "53", textAnchor: "middle", fontSize: "20", transform: "rotate(-10 41 45)", children: "\uD83D\uDD12" }), _jsx("rect", { x: "180", y: "26", width: "38", height: "38", rx: "6", fill: "#fff", stroke: "#0a1030", strokeWidth: "3", transform: "rotate(8 199 45)" }), _jsx("text", { x: "199", y: "53", textAnchor: "middle", fontSize: "20", transform: "rotate(8 199 45)", children: "\u2605" })] }));
export const DibujoDado = () => (_jsx("svg", { viewBox: "0 0 120 90", children: _jsxs("g", { transform: "rotate(-12 60 45)", children: [_jsx("rect", { x: "32", y: "17", width: "56", height: "56", rx: "10", fill: "#fff", stroke: "#0a1030", strokeWidth: "3.5" }), [[46, 31], [74, 31], [60, 45], [46, 59], [74, 59]].map(([x, y], i) => _jsx("circle", { cx: x, cy: y, r: "5.5", fill: "#0a1030" }, i))] }) }));
function Contenido({ pag, modo, figura, ir, elegirModo, cambiar, setZona, mando, capsula }) {
    if (pag === "modos")
        return _jsx(PaginaModos, { modo: modo, elegir: elegirModo, ir: ir });
    if (pag === "basico")
        return _jsx(PasosBasico, { figura: figura, cambiar: cambiar, setZona: setZona });
    if (pag === "avanzado")
        return (_jsxs("div", { className: "p-vinetas p-vinetas-indice", children: [_jsx(Vineta, { ancha: true, alta: true, titulo: "Piezas comunes", img: ["hair-021", "face-009", "print-019", "con-botas"], onClick: () => ir("apariencia") }), _jsx(Vineta, { ancha: true, alta: true, titulo: "Piezas originales", img: ["traje-batman", "traje-spider-man", "traje-capitan-america", "traje-harry-potter"], onClick: () => ir("originales") }), _jsx(Vineta, { titulo: "Objetos", img: "acc-002", onClick: () => ir("objetos") }), _jsx(Vineta, { titulo: "Momentos", dibujo: _jsx(DibujoMomentos, {}), onClick: () => ir("momentos") })] }));
    if (pag === "apariencia")
        return (_jsx("div", { className: "p-vinetas p-vinetas-completo", children: APARIENCIA.map(a => _jsx(Vineta, { titulo: a.nombre, img: a.img, onClick: () => ir(a.k) }, a.k)) }));
    if (APARIENCIA.some(a => a.k === pag))
        return _jsx(PaginaSeccion, { k: pag, modo: "completo", figura: figura, cambiar: cambiar, setZona: setZona });
    if (["objetos", "momentos", "nombre", "aleatorio", "retos"].includes(pag))
        return _jsx(PaginaExtra, { pag: pag, figura: figura, cambiar: cambiar, mando: mando, capsula: capsula });
    return _jsx(PaginaOriginal, { pag: pag, figura: figura, cambiar: cambiar, ir: ir });
}
// ---------- Hoja que da vuelta ----------
const DURA = 620; // ms; igual que .p-hoja en personalizador.css
const sinMovimiento = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Una cara de la página derecha: título de la sección y su contenido. */
function Cara({ viva, alVolver, ...props }) {
    const { pag } = props;
    const h = useRef(null);
    useEffect(() => { if (viva)
        h.current?.focus({ preventScroll: true }); }, [viva, pag]);
    return (_jsxs("div", { className: "p-cara", children: [_jsxs("div", { className: "p-cara-cab", children: [_jsx("button", { type: "button", className: "p-atras", onClick: alVolver, "aria-label": pag === "modos" ? "Cerrar el libro" : "Atrás", tabIndex: viva ? 0 : -1, children: _jsx(Icono, { id: "back" }) }), _jsx("h2", { ref: h, tabIndex: -1, className: "p-cara-titulo dsp", children: tituloDe(pag) })] }), _jsx("div", { className: "p-cara-cuerpo", children: _jsx(Contenido, { ...props }) })] }));
}
// ---------- Libro ----------
export function Libro({ vez, capsula, etiqueta, figura, semilla, cambiar, soltado, guardado, modo, setModo, alCerrar, abriendo, tapa, regresar, pasos }) {
    const [pila, setPila] = useState(["modos"]);
    const [hoja, setHoja] = useState(null);
    const mando = useRef(null);
    const [zonaLado, setZonaLado] = useState(null);
    // Figuras hechas con el taller anterior pueden traer un traje de personaje encima: se suelta (se ve igual) para que su
    // ropa se pueda editar.
    const tieneTraje = !!figura.traje?.id;
    useEffect(() => {
        if (!tieneTraje)
            return;
        let vivo = true;
        void mando.current?.pedir("soltar", { figura }).then(g => { if (vivo && g)
            soltado(g); });
        return () => { vivo = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tieneTraje, vez]);
    const top = pila[pila.length - 1];
    const n = useRef(0);
    useEffect(() => { setPila(["modos"]); setHoja(null); }, [vez]);
    useEffect(() => { if (!hoja)
        return; const t = setTimeout(() => setHoja(null), DURA); return () => clearTimeout(t); }, [hoja]);
    const ir = (p) => {
        if (hoja)
            return;
        sonar("clic");
        if (!sinMovimiento())
            setHoja({ arriba: top, abajo: p, dir: "ida", n: ++n.current });
        setPila(s => [...s, p]);
    };
    /** Elegir un modo (tarjeta o separador): la hoja da vuelta hacia el inicio de ese modo. */
    const elegirModo = (m) => {
        if (hoja)
            return;
        sonar("clic");
        setModo(m);
        const destino = RAIZ[m];
        if (top === destino)
            return;
        if (!sinMovimiento())
            setHoja({ arriba: top, abajo: destino, dir: "ida", n: ++n.current });
        setPila(["modos", destino]);
    };
    const volver = () => {
        if (hoja)
            return;
        if (pila.length <= 1) {
            alCerrar();
            return;
        }
        sonar("clic");
        const antes = pila[pila.length - 2];
        if (!sinMovimiento())
            setHoja({ arriba: antes, abajo: top, dir: "vuelta", n: ++n.current });
        setPila(s => s.slice(0, -1));
    };
    // Botón Pose: la figura hace sus momentos por turnos (ganar, anotar, esperar), según el estilo que lleva.
    const nPose = useRef(0);
    const pose = () => {
        const m = (figura.momentos ?? {});
        const lista = [m.victoria ?? "salto-puno", m.punto ?? "puno-arriba", m.espera ?? "respirar"];
        sonar("poder");
        mando.current?.probar(lista[nPose.current++ % lista.length]);
    };
    const apodo = apodoDe(figura);
    const piezas = usePiezas();
    // Mientras la hoja de regreso viaja, abajo se sigue viendo la página que se deja.
    const base = hoja ? hoja.abajo : top;
    const zona = zonaLado ?? zonaDe(top);
    return (_jsxs("div", { className: "p-libro" + (abriendo ? " abriendo" : ""), children: [_jsx(PanelDesbloqueo, { alIrARetos: () => ir("retos") }), _jsxs("div", { className: "p-libro-barra", children: [_jsx("button", { type: "button", className: "p-atras p-atras-barra", onClick: volver, "aria-label": top === "modos" ? "Cerrar el libro" : "Atrás", children: _jsx(Icono, { id: "back" }) }), guardado && _jsxs("span", { className: "p-guardado", role: "status", children: ["\u2713 ", guardado] }), piezas.activo && _jsxs("span", { className: "p-xp", title: piezas.demo ? "XP de demostración" : "XP para gastar", children: ["\u2605 ", piezas.xp.toLocaleString("es-MX"), " XP"] }), _jsxs("button", { type: "button", className: "p-regresar", onClick: () => { if (regresar) {
                            sonar("clic");
                            regresar();
                        } }, disabled: !regresar, "aria-label": `Regresar al paso anterior${pasos ? ` (${pasos})` : ""}`, title: "Deshace el \u00FAltimo cambio", children: ["\u21B6 Regresar", pasos ? _jsx("small", { children: pasos }) : null] })] }), _jsxs("div", { className: "p-hojas", children: [_jsxs("section", { className: "p-pag p-pag-izq", "aria-label": "Tu figura", children: [_jsx("span", { className: "p-pag-etiqueta dsp", children: etiqueta }), _jsx(FiguraViva, { figura: figura, semilla: semilla, zona: zona, mando: mando, vida: "editor" }), _jsxs("div", { className: "p-mandos", role: "group", "aria-label": "Mover la figura", children: [_jsx("button", { type: "button", onClick: () => mando.current?.girar(-0.8), "aria-label": "Girar a la izquierda", children: "\u27F2" }), _jsx("button", { type: "button", onClick: () => mando.current?.acercar(0.8), "aria-label": "Alejar", children: "\u2212" }), _jsx("button", { type: "button", onClick: () => mando.current?.acercar(1.25), "aria-label": "Acercar", children: "+" }), _jsx("button", { type: "button", onClick: () => mando.current?.girar(0.8), "aria-label": "Girar a la derecha", children: "\u27F3" }), _jsx("button", { type: "button", className: "p-pose", onClick: pose, "aria-label": "Hacer una pose", children: "\u00A1Pose!" })] }), apodo && _jsx("span", { className: "p-placa p-sfx", "aria-label": `Apodo: ${apodo}`, children: apodo }), _jsx("span", { className: "p-pista", children: "Arrastra para girar \u00B7 pellizca o usa la rueda para acercar" })] }), _jsxs("section", { className: "p-pag p-pag-der", "aria-live": "polite", children: [_jsx(Separadores, { modo: top === "modos" ? null : modo, elegir: elegirModo }), _jsx(Cara, { pag: base, modo: modo, figura: figura, ir: ir, elegirModo: elegirModo, cambiar: cambiar, setZona: setZonaLado, mando: mando, capsula: capsula, viva: !hoja || hoja.dir === "ida", alVolver: volver }), hoja && (_jsxs("div", { className: "p-hoja " + hoja.dir, "aria-hidden": "true", inert: "", children: [_jsx("div", { className: "p-hoja-frente", children: _jsx(Cara, { pag: hoja.arriba, modo: modo, figura: figura, ir: nada, elegirModo: nada, cambiar: nada, setZona: nada, mando: sinMando, capsula: capsula, viva: false, alVolver: nada }) }), _jsx("div", { className: "p-hoja-reverso" })] }, hoja.n)), abriendo && _jsx("div", { className: "p-tapa", "aria-hidden": "true", children: tapa })] })] })] }));
}
