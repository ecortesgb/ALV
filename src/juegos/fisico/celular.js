import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Juego físico en el celular. El administrador (quien tiene el control) da y quita puntos, usa herramientas,
// cambia el reto sugerido y termina la ronda. Los demás ven el reto, la herramienta y sus puntos.
import { useState } from "react";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Burbuja } from "../../pantallas/Identidad";
import { ArteCfg } from "../../pantallas/TarjetasConfig";
import { desenlace, instruccion, nombreDe, resumenDeltas } from "../general/texto";
import { HERR_FISICO, ResultadoHerramienta, selFisico } from "./herramientas";
import "./fisico.css";
const PASOS = [-1, 1, 2, 3];
const TIEMPOS = [30, 60, 120];
export function CelularFisico({ v, mi, miembros, mandar }) {
    const yo = mi.yo;
    const soyAdmin = v.esperados.includes(yo);
    const ids = v.jugadores.map(j => j.id);
    const s = selFisico(v);
    const [cerrando, setCerrando] = useState(false);
    const enviar = (valor) => mandar("contestar", { valor });
    const figura = (id) => miembros.find(m => m.id === id)?.figura;
    const reto = (_jsxs("div", { className: "fi-reto", children: [_jsx("span", { className: "fi-kick", children: "Reto sugerido" }), _jsx("b", { className: "fi-reto-t", children: v.carta?.texto ?? "Inventen el reto de esta ronda" }), v.carta?.tipo && _jsx("p", { children: v.carta.tipo }), soyAdmin && v.fase === "contestando" && _jsx("button", { type: "button", className: "fi-chip", onClick: () => void enviar({ otro: true }), children: "Otro reto" })] }));
    if (v.fase === "revelada") {
        const d = desenlace(v);
        return (_jsxs("section", { className: "fi fi-cel a-entra", children: [_jsxs("span", { className: "fi-kick", children: ["Resultado de la ronda ", v.ronda] }), _jsx("b", { className: "fi-titular", children: d.titular }), d.detalle && _jsx("p", { className: "fi-detalle", children: d.detalle }), _jsxs("p", { className: "fi-nota", children: ["Llevas ", v.puntos[yo] ?? 0, " ", (v.puntos[yo] ?? 0) === 1 ? "punto" : "puntos", ".", soyAdmin ? " Toca «Siguiente ronda» para seguir." : ""] })] }));
    }
    if (v.pausada)
        return _jsxs("section", { className: "fi fi-cel", children: [_jsx("b", { className: "fi-titular", children: "En pausa" }), _jsx("p", { className: "fi-nota", children: "El administrador detuvo la partida un momento." })] });
    if (!soyAdmin) {
        const mio = s.deltas[yo] ?? 0;
        return (_jsxs("section", { className: "fi fi-cel a-entra", children: [_jsx("span", { className: "fi-kick", children: instruccion(v) }), reto, _jsx(ResultadoHerramienta, { v: v, miembros: miembros }), _jsxs("div", { className: "fi-mio", children: [_jsx("span", { children: "Tus puntos" }), _jsx("b", { children: v.puntos[yo] ?? 0 }), mio !== 0 && _jsxs("i", { className: mio > 0 ? "sube" : "baja", children: [mio > 0 ? "+" : "−", Math.abs(mio), " esta ronda"] })] })] }));
    }
    // Administrador: herramientas, puntos por jugador (o por grupo) y terminar la ronda.
    const Fila = ({ id }) => {
        const c = colorDe(id, ids), d = s.deltas[id] ?? 0;
        return (_jsxs("li", { className: "fi-fila", style: varsColor(c), children: [_jsx(Burbuja, { p: { id, nombre: nombreDe(v, id), figura: figura(id), color: c }, tamano: 40 }), _jsxs("span", { className: "fi-nom", children: [nombreDe(v, id), _jsxs("small", { children: [v.puntos[id] ?? 0, " pts", d !== 0 && _jsxs("i", { className: d > 0 ? "sube" : "baja", children: [" ", d > 0 ? "+" : "−", Math.abs(d)] })] })] }), _jsx("span", { className: "fi-pasos", children: PASOS.map(x => (_jsx("button", { type: "button", className: "fi-paso" + (x < 0 ? " menos" : ""), onClick: () => void enviar({ puntos: { jugador: id, delta: x } }), "aria-label": `${x > 0 ? "Dar" : "Quitar"} ${Math.abs(x)} a ${nombreDe(v, id)}`, children: x > 0 ? `+${x}` : `−${-x}` }, x))) })] }));
    };
    // Orden fijo (A, B… o p1, p2…): si se ordenaran por puntos, los botones saltarían mientras el administrador toca.
    const grupos = v.grupos?.length ? [...v.grupos].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })) : null;
    const herramienta = (tipo, segundos) => void enviar({ herramienta: tipo, ...(segundos ? { segundos } : {}) });
    const resumen = resumenDeltas(v, s.deltas);
    return (_jsxs("section", { className: "fi fi-cel fi-admin a-entra", children: [_jsxs("span", { className: "fi-kick", children: ["Ronda ", v.ronda, " de ", v.totalRondas, " \u00B7 t\u00FA das los puntos"] }), reto, _jsxs("div", { className: "fi-herrs", role: "group", "aria-label": "Herramientas", children: [["dados", "ruleta", "carta", "orden"].map(t => (_jsxs("button", { type: "button", className: "fi-herr", onClick: () => herramienta(t), children: [_jsx(ArteCfg, { nombre: HERR_FISICO[t].icono, className: "fi-herr-ico" }), _jsx("span", { children: HERR_FISICO[t].nombre })] }, t))), _jsxs("div", { className: "fi-herr fi-herr-crono", children: [_jsx(ArteCfg, { nombre: "herr-tiempo", className: "fi-herr-ico" }), _jsx("span", { className: "fi-crono-ops", children: TIEMPOS.map(t => (_jsx("button", { type: "button", onClick: () => herramienta("cronometro", t), "aria-label": `Cronómetro de ${t} segundos`, children: t < 60 ? `${t} s` : `${t / 60} min` }, t))) })] })] }), _jsx(ResultadoHerramienta, { v: v, miembros: miembros }), grupos ? grupos.map(g => (_jsxs("div", { className: "fi-grupo", style: { "--n": g.jugadores.length }, children: [_jsxs("div", { className: "fi-grupo-cab", children: [_jsx("b", { children: g.nombre }), _jsxs("span", { children: [g.puntos, " pts"] }), _jsx("button", { type: "button", className: "fi-chip", onClick: () => { for (const j of g.jugadores)
                                    void enviar({ puntos: { jugador: j, delta: 1 } }); }, children: "+1 a cada quien" })] }), _jsx("ul", { className: "fi-lista", children: g.jugadores.map(id => _jsx(Fila, { id: id }, id)) })] }, g.id))) : _jsx("ul", { className: "fi-lista", children: ids.map(id => _jsx(Fila, { id: id }, id)) }), _jsxs("button", { type: "button", className: "fi-terminar", disabled: cerrando, onClick: async () => { setCerrando(true); if (!(await enviar("listo")))
                    setCerrando(false); }, children: [_jsx("b", { children: cerrando ? "Cerrando…" : "Terminar ronda" }), _jsx("small", { children: resumen || "Nadie lleva puntos en esta ronda" })] })] }));
}
