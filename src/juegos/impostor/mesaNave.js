import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// El impostor en la nave, celular (Elías, 24 nov): la mesa 3D con las minifiguras sentadas discutiendo y la palabra de
// cada quien sobre su cabeza; la pizarra para votar, que se abre solo cuando toca votar; y las palabras de las vueltas
// anteriores para comparar y no repetir. Solo leen la vista pública.
import { useState } from "react";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Escena3D, enEscena } from "../../app/figura3d";
import { SALTAR_VOTO } from "../../engine/partida";
import { Burbuja } from "../../pantallas/Identidad";
import { nombreDe } from "../general/texto";
import { votosVisibles } from "./nave";
import "./mesaNave.css";
const persona = (v, miembros, id) => ({
    id, nombre: nombreDe(v, id), figura: miembros.find(m => m.id === id)?.figura, color: colorDe(id, v.jugadores.map(j => j.id)),
});
/** La mesa: minifiguras sentadas (sillas del color de cada quien; la de quien salió, vacía) y su palabra sobre la cabeza. */
export function MesaPalabras({ v, miembros, yo, tv, enMesa: enMesaDada, momentos, expulsar, golpe }) {
    const im = v.impostor;
    const ids = v.jugadores.map(j => j.id);
    const enMesa = enMesaDada ?? ids.filter(id => !im.eliminados.includes(id));
    const [cabezas, setCabezas] = useState({});
    const votando = im.etapa === "votar" && v.fase !== "revelada";
    const habla = im.etapa === "pistas" && v.fase !== "revelada" ? v.turnoDe : undefined;
    const figuras = enMesa.map(id => ({ ...enEscena(id, miembros.find(m => m.id === id)?.figura ?? null), color: colorDe(id, ids)?.base, columna: ids.indexOf(id), foco: !!tv && id === habla }));
    return (_jsxs("div", { className: "nm-mesa" + (tv ? " tv" : ""), children: [_jsx(Escena3D, { modo: "nave", figuras: figuras, columnas: ids.length, asientos: ids.map(id => colorDe(id, ids)?.base ?? "#4a5687"), boton: votando ? "votar" : golpe ? "golpe" : "quieto", expulsar: expulsar, momentos: momentos, className: "nm-3d", alCabezas: setCabezas }), _jsx("ul", { className: "nm-globos", "aria-label": "Palabra de cada quien", children: enMesa.map(id => {
                    const pos = cabezas[id];
                    if (!pos)
                        return null;
                    const dijo = v.pistas[id];
                    const turno = habla === id;
                    if (!dijo && !turno)
                        return null;
                    return (_jsxs("li", { className: "nm-globo" + (turno ? " turno" : "") + (id === yo ? " yo" : ""), style: { ...varsColor(colorDe(id, ids)), left: `${pos[0] * 100}%`, top: `${pos[1] * 100}%` }, children: [_jsx("b", { className: "dsp", children: dijo ?? "…" }, dijo ?? "-"), _jsx("small", { children: nombreDe(v, id) })] }, id));
                }) })] }));
}
/**
 * Pizarra para votar: dos columnas con cada quien (su figura, su nombre y su palabra; las de antes, en chico), «✓ Votó»
 * en quien ya votó, los que salieron tachados y «Nadie» abajo. Un toque marca y el botón confirma.
 */
export function PizarraVotos({ v, miembros, yo, sel, alElegir, alVotar, puedo, miVoto, titulo, pie, tv }) {
    const im = v.impostor;
    const ids = v.jugadores.map(j => j.id);
    const vivos = ids.filter(id => !im.eliminados.includes(id));
    const visibles = votosVisibles(v);
    const faltan = vivos.filter(j => !v.contestaron.includes(j)).length;
    const fila = (id) => {
        const p = persona(v, miembros, id);
        const fuera = im.eliminados.includes(id);
        const puede = puedo && !fuera && id !== yo;
        const voto = v.contestaron.includes(id) && !fuera;
        const actual = v.pistas[id];
        const antes = (im.palabras?.[id] ?? []).slice(0, actual ? -1 : undefined);
        const recibidos = visibles ? Object.entries(visibles).filter(([, x]) => x === id).map(([de]) => de) : [];
        return (_jsxs("li", { className: "nm-fila" + (fuera ? " fuera" : "") + (id === yo ? " yo" : "") + (sel === id ? " sel" : "") + (puede ? " elegible" : ""), style: varsColor(p.color), ...(puede ? { role: "radio", tabIndex: 0, "aria-checked": sel === id, onClick: () => alElegir(id),
                onKeyDown: (e) => { if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    alElegir(id);
                } } } : {}), children: [_jsxs("span", { className: "nm-cara", children: [_jsx(Burbuja, { p: { ...p, apagada: fuera }, tamano: "2.5em" }), voto && _jsx("span", { className: "nm-sello dsp", children: "Vot\u00F3" })] }), _jsxs("span", { className: "nm-txt", children: [_jsxs("span", { className: "nm-nom", children: [p.nombre, id === yo && _jsx("small", { children: " (t\u00FA)" })] }), _jsx("b", { className: "nm-palabra dsp", children: fuera ? "fuera" : actual ?? "—" }), antes.length > 0 && !fuera && _jsx("small", { className: "nm-antes", children: antes.join(" · ") })] }), recibidos.length > 0 && _jsx("span", { className: "nm-votos", "aria-label": `${recibidos.length} votos`, children: recibidos.map(de => _jsx("i", { style: varsColor(colorDe(de, ids)) }, de)) })] }, id));
    };
    const nadieVotos = visibles ? Object.values(visibles).filter(x => x === SALTAR_VOTO).length : 0;
    const nombreSel = sel === SALTAR_VOTO ? "Nadie" : sel ? nombreDe(v, sel) : null;
    return (_jsx("section", { className: "nm-pizarra" + (tv ? " tv" : ""), "aria-label": "Votaci\u00F3n", children: _jsxs("div", { className: "nm-piz-marco", children: [_jsx("span", { className: "nm-piz-t dsp", children: titulo ?? "¿Quién es el impostor?" }), _jsxs("ul", { className: "nm-filas", role: puedo ? "radiogroup" : undefined, children: [ids.map(fila), _jsxs("li", { className: "nm-fila nadie" + (sel === SALTAR_VOTO ? " sel" : "") + (puedo ? " elegible" : ""), ...(puedo ? { role: "radio", tabIndex: 0, "aria-checked": sel === SALTAR_VOTO, onClick: () => alElegir(SALTAR_VOTO),
                                onKeyDown: (e) => { if (e.key === " " || e.key === "Enter") {
                                    e.preventDefault();
                                    alElegir(SALTAR_VOTO);
                                } } } : {}), children: [_jsx("span", { className: "nm-nadie-ico", "aria-hidden": "true", children: "\u23ED" }), _jsx("span", { className: "nm-txt", children: _jsx("span", { className: "nm-nom", children: "Nadie, todav\u00EDa" }) }), nadieVotos > 0 && _jsx("span", { className: "nm-votos", children: _jsx("b", { children: nadieVotos }) })] })] }), pie !== undefined ? pie : puedo ? (_jsx("button", { type: "button", className: "nm-votar dsp" + (sel ? " listo" : ""), disabled: !sel, onClick: alVotar, children: nombreSel ? `Votar: ${nombreSel}` : "Toca a alguien para votar" })) : (_jsxs("p", { className: "nm-estado", children: [miVoto ? _jsxs(_Fragment, { children: ["Tu voto: ", _jsx("b", { children: miVoto === SALTAR_VOTO ? "Nadie" : nombreDe(v, miVoto) }), " \u00B7 "] }) : im.eliminados.includes(yo) ? "Ya no votas · " : "", "faltan ", faltan, " por votar"] }))] }) }));
}
/** Palabras de todas las vueltas, por jugador: para comparar y no repetir. */
export function HistorialPalabras({ v, miembros, alCerrar }) {
    const im = v.impostor;
    const ids = v.jugadores.map(j => j.id);
    const vueltas = Math.max(1, ...ids.map(id => im.palabras?.[id]?.length ?? 0));
    return (_jsx("div", { className: "nm-hist", role: "dialog", "aria-label": "Palabras de cada vuelta", onClick: alCerrar, children: _jsxs("div", { className: "nm-hist-caja", onClick: e => e.stopPropagation(), children: [_jsxs("header", { children: [_jsx("b", { className: "dsp", children: "Palabras de cada vuelta" }), _jsx("button", { type: "button", className: "nm-hist-x", "aria-label": "Cerrar", onClick: alCerrar, children: "\u2715" })] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", {}), Array.from({ length: vueltas }, (_, n) => _jsxs("th", { children: ["V", n + 1] }, n))] }) }), _jsx("tbody", { children: ids.map(id => {
                                const p = persona(v, miembros, id);
                                const pal = im.palabras?.[id] ?? [];
                                return (_jsxs("tr", { className: im.eliminados.includes(id) ? "fuera" : "", style: varsColor(p.color), children: [_jsxs("th", { scope: "row", children: [_jsx(Burbuja, { p: p, tamano: "1.8em" }), _jsx("span", { children: p.nombre })] }), Array.from({ length: vueltas }, (_, n) => _jsx("td", { children: pal[n] ?? "—" }, n))] }, id));
                            }) })] })] }) }));
}
