import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Escena de El impostor en la Pantalla de TV: pared de estaturas, figuras en fila con placa numerada,
 * evidencia de cada uno, un reflector sobre quien habla y otro que barre a todos.
 * Recibe solo datos públicos: nunca la palabra ni quién es el impostor antes de revelar.
 */
export function RuedaSospechosos({ personas, habla, alto = 290, style }) {
    const i = personas.findIndex(p => p.id === habla);
    const x = i >= 0 ? `${(((i + 0.5) / personas.length) * 100).toFixed(1)}%` : null;
    const cubre = { top: 0, bottom: 0 };
    return (_jsxs("div", { className: "d-rueda", style: { height: alto, ...style }, children: [_jsx("div", { className: "d-wall", style: cubre }), _jsx("div", { className: "d-search", style: cubre }), x && _jsx("div", { className: "d-spotc", style: { ...cubre, "--x": x } }), _jsx("div", { className: "d-lineup", style: { left: "1em", right: "1em", bottom: "1em" }, children: personas.map((p, n) => {
                    const on = p.id === habla;
                    const ev = on ? "Habla" : p.evidencia || "·";
                    return (_jsxs("div", { className: "d-p" + (on ? " on" : ""), children: [p.votos != null && _jsx("span", { className: "votos", "aria-label": `${p.votos} votos`, children: p.votos }), _jsx("span", { className: "ev" + (on ? " pensando" : p.evidencia ? "" : " vacio"), children: ev }), p.figura, _jsxs("span", { className: "pl", children: [String(n + 1).padStart(2, "0"), " \u00B7 ", p.nombre] })] }, p.id));
                }) })] }));
}
