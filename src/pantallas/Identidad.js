import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Identificadores de jugador con estilo de videojuego (referencia de Elías, 2026-11-18):
// - TarjetaEsquina: círculo con anillo del color del jugador, la figura sale por arriba (hombros y cabeza)
//   y al lado una placa con apodo, nombre y datos (XP, monedas, puntos…). Para el HUB y los marcadores.
// - Burbuja: círculo con la cabeza completa centrada. La seleccionada crece y su anillo brilla.
// - AnilloBurbujas: burbujas acomodadas en círculo alrededor de un centro (elegir, votar, turnos).
// Las fotos salen del motor 3D con el encuadre «busto» (tools/minifig/escena.js, ZONAS.busto), fondo transparente.
import { useEffect, useState } from "react";
import { cabinaDe } from "./lobby/Ficha";
import { Boton } from "../ds";
import { apodoDe, semillaDe, useFoto } from "../app/figura3d";
import { varsColor } from "../app/colorJugador";
import "./identidad.css";
function Busto({ id, figura }) {
    const url = useFoto(figura ?? null, figura ? undefined : semillaDe(id), "busto");
    return url ? _jsx("img", { src: url, alt: "", draggable: false }) : _jsx("span", { className: "ide-cargando", "aria-hidden": "true" });
}
/** Tarjeta de esquina. `tamano` = diámetro del círculo en px (o en em si se pasa como texto, p. ej. "3.4em"). */
export function TarjetaEsquina({ id, figura, nombre, color, lado = "izq", tamano = 72, datos = [], barra, onClick, etiqueta, className = "", children }) {
    const apodo = apodoDe(figura);
    const pct = barra && barra.max > 0 ? Math.max(0, Math.min(1, barra.valor / barra.max)) : 0;
    const estilo = { ...varsColor(color ?? null), "--ide": typeof tamano === "number" ? `${tamano}px` : tamano };
    const cuerpo = (_jsxs(_Fragment, { children: [_jsxs("span", { className: "ide-circulo", "aria-hidden": "true", children: [_jsx("span", { className: "ide-disco" }), _jsx("span", { className: "ide-busto", children: _jsx(Busto, { id: id, figura: figura }) }), _jsx("span", { className: "ide-arco" }), color && _jsx("span", { className: "ide-pn dsp", children: color.etiqueta })] }), _jsxs("span", { className: "ide-placa", children: [apodo && _jsx("small", { className: "ide-apodo", children: apodo }), _jsx("span", { className: "ide-nombre dsp ol", children: nombre }), barra && _jsxs("span", { className: "ide-nivel", children: [barra.texto && _jsx("em", { className: "dsp", children: barra.texto }), _jsx("span", { className: "ide-barra", role: "progressbar", "aria-label": barra.texto ?? "Progreso", "aria-valuemin": 0, "aria-valuemax": barra.max, "aria-valuenow": barra.valor, children: _jsx("i", { style: { width: `${Math.round(pct * 100)}%` } }) })] }), datos.length > 0 && _jsx("span", { className: "ide-datos", children: datos.map((d, i) => _jsxs("span", { className: "ide-dato", title: d.titulo, children: [_jsx("span", { className: "ide-ico", "aria-hidden": "true", children: d.icono }), _jsx("b", { className: "dsp", children: d.valor }), d.titulo && _jsx("span", { className: "ide-sr", children: d.titulo })] }, i)) }), children] })] }));
    const clase = `ide-tarjeta${lado === "der" ? " der" : ""}${color ? "" : " sin-color"} ${className}`;
    return onClick
        ? _jsx("button", { type: "button", className: clase, style: estilo, onClick: onClick, "aria-label": etiqueta ?? `Perfil de ${nombre}`, children: cuerpo })
        : _jsx("div", { className: clase, style: estilo, children: cuerpo });
}
/** Burbuja con la cabeza completa. `tamano` en px o como texto («4em», «22%»). */
export function Burbuja({ p, tamano = 64, seleccionada, conNombre, onClick, desactivada, className = "", style }) {
    // Con el arte del lobby (Elías, 23 nov): la cabina del color de fondo en lugar del círculo con anillo.
    const estilo = { ...varsColor(p.color ?? null), "--b": typeof tamano === "number" ? `${tamano}px` : tamano, "--fj-cab": cabinaDe(p.color ?? null), ...style };
    const clase = `ide-burbuja${seleccionada ? " sel" : ""}${p.apagada ? " apagada" : ""}${p.color ? "" : " sin-color"} ${className}`;
    const apodo = apodoDe(p.figura);
    const cuerpo = (_jsxs(_Fragment, { children: [_jsx("span", { className: "ide-b-circ", "aria-hidden": "true", children: _jsx("span", { className: "ide-b-img", children: _jsx(Busto, { id: p.id, figura: p.figura }) }) }), p.color && _jsx("span", { className: "ide-b-pn dsp", "aria-hidden": "true", children: p.color.etiqueta }), p.insignia != null && _jsx("span", { className: "ide-b-ins dsp", children: p.insignia }), conNombre && _jsxs("span", { className: "ide-b-nom", children: [apodo && _jsx("small", { children: apodo }), _jsx("span", { className: "dsp", children: p.nombre }), p.nota && _jsxs("em", { children: ["\u00AB", p.nota, "\u00BB"] })] })] }));
    return onClick
        ? _jsx("button", { type: "button", className: clase, style: estilo, onClick: onClick, disabled: desactivada, "aria-pressed": seleccionada, "aria-label": p.nombre, children: cuerpo })
        : _jsx("span", { className: clase, style: estilo, role: "img", "aria-label": p.nombre, children: cuerpo });
}
/** Fila de burbujas (marcadores, quién ya contestó). */
export function FilaBurbujas({ gente, tamano = 48, seleccionada, conNombre, className = "" }) {
    return _jsx("div", { className: "ide-fila " + className, children: gente.map(p => _jsx(Burbuja, { p: p, tamano: tamano, seleccionada: p.id === seleccionada, conNombre: conNombre }, p.id)) });
}
/** Burbujas en anillo alrededor de `centro`. El tamaño se adapta al ancho del contenedor (hasta `ancho` px). */
export function AnilloBurbujas({ gente, centro, seleccionada, alElegir, ancho = 420, conNombre = true, etiqueta, className = "" }) {
    const n = Math.max(1, gente.length);
    // Burbuja en % del anillo: más chica con más gente, para que no se encimen.
    const b = n <= 3 ? 27 : n <= 5 ? 24 : n <= 6 ? 22 : 19;
    const r = 50 - b / 2 - (conNombre ? 6 : 2);
    return (_jsxs("div", { className: "ide-anillo " + className, style: { "--ancho": `${ancho}px` }, role: alElegir ? "group" : undefined, "aria-label": etiqueta, children: [_jsx("span", { className: "ide-anillo-guia", "aria-hidden": "true", style: { inset: `${50 - r}%` } }), centro != null && _jsx("div", { className: "ide-anillo-centro", style: { inset: `${50 - r + b / 2 + 2}%` }, children: centro }), gente.map((p, i) => {
                const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
                return _jsx(Burbuja, { p: p, tamano: `${b}%`, seleccionada: p.id === seleccionada, conNombre: conNombre, className: "ide-en-anillo", style: { left: `${50 + Math.cos(a) * r}%`, top: `${50 + Math.sin(a) * r}%` }, onClick: alElegir ? () => alElegir(p.id) : undefined, desactivada: p.apagada }, p.id);
            })] }));
}
/** Elegir a una persona en anillo: un toque la marca (crece y brilla) y el botón de abajo confirma.
 *  Así un toque por error no manda el voto. `clave` reinicia la selección (p. ej. al cambiar de ronda). */
export function ElegirEnAnillo({ gente, titulo, confirmar = "Elegir", alElegir, clave, ancho = 400 }) {
    const [sel, setSel] = useState(null);
    useEffect(() => setSel(null), [clave]);
    const elegida = gente.find(p => p.id === sel);
    return (_jsxs("div", { className: "ide-elegir", children: [_jsx(AnilloBurbujas, { gente: gente, seleccionada: sel, alElegir: setSel, ancho: ancho, etiqueta: typeof titulo === "string" ? titulo : undefined, centro: _jsx("span", { className: "ide-centro-txt", children: elegida ? _jsxs(_Fragment, { children: [_jsx("small", { children: "Elegiste a" }), _jsx("b", { className: "dsp ol", children: elegida.nombre })] }) : titulo }) }), _jsx(Boton, { color: "amarillo", texto: elegida ? `${confirmar}: ${elegida.nombre}` : "Toca a alguien", icono: "play", desactivado: !elegida, onClick: () => { if (elegida)
                    alElegir(elegida.id); } })] }));
}
