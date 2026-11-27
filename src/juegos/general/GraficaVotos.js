import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Burbuja } from "../../pantallas/Identidad";
import { colorDe } from "../../app/colorJugador";
import { nombreDe } from "./texto";
import "./grafica-votos.css";
/** Columnas de la gráfica: votos de cada jugador y quién votó por él (vacío si los votos son secretos). */
export function columnasVotos(v) {
    const r = (v.revelado ?? {});
    const votos = r.votos ?? {};
    const max = Math.max(1, ...Object.values(votos));
    return v.jugadores.map(j => ({
        id: j.id, nombre: j.nombre, votos: votos[j.id] ?? 0, alto: (votos[j.id] ?? 0) / max,
        gana: (r.elegidos ?? []).includes(j.id),
        quienes: v.votosDe ? Object.entries(v.votosDe).filter(([, a]) => a === j.id).map(([de]) => nombreDe(v, de)) : [],
    }));
}
export function GraficaVotos({ v, miembros }) {
    const cols = columnasVotos(v);
    const ids = v.jugadores.map(j => j.id);
    return (_jsx("div", { className: "gv", style: { "--n": cols.length }, role: "img", "aria-label": cols.map(c => `${c.nombre}: ${c.votos} ${c.votos === 1 ? "voto" : "votos"}`).join(", "), children: cols.map((c, i) => {
            const color = colorDe(c.id, ids);
            return (_jsxs("div", { className: "gv-col" + (c.gana ? " gana" : ""), style: { "--i": i, "--alto": c.alto, "--gv": color?.base ?? "#7cc0ff", "--gv-txt": color?.texto ?? "#fff" }, children: [_jsx(Burbuja, { p: { id: c.id, nombre: c.nombre, figura: miembros.find(m => m.id === c.id)?.figura, color }, tamano: "3.4em", conNombre: true }), !v.votoSecreto && _jsx("small", { className: "gv-quien", children: c.quienes.join(", ") || " " }), _jsx("div", { className: "gv-barra", children: _jsx("b", { className: "dsp ol", children: c.votos }) })] }, c.id));
        }) }));
}
