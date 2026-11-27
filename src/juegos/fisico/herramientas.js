import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Juego físico: lo que salió de la última herramienta del administrador (dados, ruleta, carta, orden o cronómetro).
// Solo usa la vista pública: la ven la TV y todos los celulares.
import { useEffect, useState } from "react";
import { colorDe, varsColor } from "../../app/colorJugador";
import { ArteCfg } from "../../pantallas/TarjetasConfig";
import { Burbuja } from "../../pantallas/Identidad";
import { nombreDe } from "../general/texto";
const CARA = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const VALOR = (v) => (v <= 10 ? String(v) : ["J", "Q", "K", "A"][v - 11]);
const PALO = ["♣", "♦", "♥", "♠"];
/** Nombre e icono (arte de Elías en `ui/configurar/`) de cada herramienta. */
export const HERR_FISICO = {
    dados: { nombre: "Dados", icono: "herr-dados" },
    ruleta: { nombre: "Ruleta", icono: "herr-ruleta" },
    carta: { nombre: "Carta", icono: "herr-poker" },
    orden: { nombre: "Orden", icono: "herr-orden" },
    cronometro: { nombre: "Cronómetro", icono: "herr-tiempo" },
};
export const selFisico = (v) => (v.seleccion ?? { deltas: {} });
/** Cuenta regresiva del cronómetro. Arranca cuando este aparato lo ve (cada uso tiene su número `n`). */
function Cronometro({ segundos, n }) {
    const [fin] = useState(() => Date.now() + segundos * 1000);
    const [ahora, setAhora] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 250); return () => clearInterval(t); }, [n]);
    const quedan = Math.max(0, Math.ceil((fin - ahora) / 1000));
    const m = Math.floor(quedan / 60), s = quedan % 60;
    return (_jsxs("div", { className: "fi-crono" + (quedan === 0 ? " fin" : quedan <= 5 ? " ya" : ""), role: "timer", "aria-live": "off", children: [_jsx("b", { children: quedan === 0 ? "¡Tiempo!" : `${m}:${String(s).padStart(2, "0")}` }), _jsx("span", { className: "fi-crono-barra", style: { "--p": `${(quedan / segundos) * 100}%` } })] }));
}
/** Los dados ruedan un momento y caen en el resultado (que ya decidió el motor). */
function DadosRuedan({ dados }) {
    const [listo, setListo] = useState(false);
    const [c, setC] = useState(1);
    useEffect(() => {
        const t = setInterval(() => setC(1 + Math.floor(Math.random() * 6)), 80);
        const f = setTimeout(() => { clearInterval(t); setListo(true); }, 1100);
        return () => { clearInterval(t); clearTimeout(f); };
    }, []);
    return (_jsxs("div", { className: "fi-dados" + (listo ? " listo" : " rodando"), "aria-label": listo ? `Dados: ${dados[0]} y ${dados[1]}` : "Rodando los dados", children: [_jsx("span", { children: CARA[listo ? dados[0] : c] }), _jsx("span", { children: CARA[listo ? dados[1] : (c % 6) + 1] }), listo && _jsxs("b", { className: "fi-suma", children: ["= ", dados[0] + dados[1]] })] }));
}
/** Resultado de la última herramienta. `grande` para la TV. */
export function ResultadoHerramienta({ v, miembros, grande }) {
    const h = selFisico(v).herr;
    if (!h)
        return null;
    const ids = v.jugadores.map(j => j.id);
    const info = HERR_FISICO[h.tipo];
    let cuerpo = null;
    if (h.tipo === "dados" && h.dados) {
        cuerpo = _jsx(DadosRuedan, { dados: h.dados }, h.n);
    }
    else if (h.tipo === "ruleta" && h.jugador) {
        const c = colorDe(h.jugador, ids);
        cuerpo = _jsxs("div", { className: "fi-ruleta", style: varsColor(c), children: [_jsx(Burbuja, { p: { id: h.jugador, nombre: nombreDe(v, h.jugador), figura: miembros.find(m => m.id === h.jugador)?.figura, color: c }, tamano: grande ? "6em" : 64, seleccionada: true }), _jsx("b", { children: nombreDe(v, h.jugador) })] });
    }
    else if (h.tipo === "carta" && h.carta) {
        const rojo = h.carta.p === 1 || h.carta.p === 2;
        cuerpo = _jsxs("span", { className: "fi-naipe" + (rojo ? " rojo" : ""), "aria-label": `${VALOR(h.carta.v)} de ${PALO[h.carta.p]}`, children: [_jsx("b", { children: VALOR(h.carta.v) }), _jsx("span", { children: PALO[h.carta.p] })] });
    }
    else if (h.tipo === "orden" && h.orden) {
        cuerpo = _jsx("ol", { className: "fi-orden", children: h.orden.map((id, i) => _jsxs("li", { style: varsColor(colorDe(id, ids)), children: [_jsx("i", { children: i + 1 }), nombreDe(v, id)] }, id)) });
    }
    else if (h.tipo === "cronometro" && h.segundos) {
        cuerpo = _jsx(Cronometro, { segundos: h.segundos, n: h.n }, h.n);
    }
    return (_jsxs("div", { className: "fi-res" + (grande ? " grande" : ""), children: [_jsxs("span", { className: "fi-res-t", children: [_jsx(ArteCfg, { nombre: info.icono, className: "fi-res-ico" }), info.nombre] }), cuerpo] }, h.n));
}
