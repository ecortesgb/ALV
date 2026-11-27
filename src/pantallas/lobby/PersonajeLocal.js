import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Modo Local: el anfitrión agrega personajes sin cuenta (nombre, género para el color y figura) o les cambia la figura.
// La figura sale de los personajes ya armados (trajes-figura.json) o al azar. Nada se guarda en la nube.
// Estilo del lobby (Elías, 24 nov): vidrio oscuro, la cabina del color de fondo y la figura completa (sin el círculo viejo).
import { useEffect, useState } from "react";
import { PALETA_SALA, varsColor } from "../../app/colorJugador";
import { semillaDe, useFoto } from "../../app/figura3d";
import { cabinaDe } from "./Ficha";
let cargados = null;
function useTrajes() {
    const [t, setT] = useState(cargados);
    useEffect(() => {
        if (t)
            return;
        let vivo = true;
        void import("../../content/trajes-figura.json").then(m => { cargados = m.default.trajes; if (vivo)
            setT(cargados); });
        return () => { vivo = false; };
    }, [t]);
    return t;
}
const BASE = import.meta.env.BASE_URL;
const GENEROS = [{ id: "mujer", texto: "Mujer" }, { id: "hombre", texto: "Hombre" }, { id: "otro", texto: "Prefiero no decirlo" }];
/** Color de la vista previa: el primero del grupo de cada género (el real lo asigna el lobby al entrar). */
const COLOR_VISTA = { mujer: "rosa", hombre: "azul", otro: "amarillo" };
const colorVista = (g) => ({ ...PALETA_SALA[COLOR_VISTA[g]], n: 0, etiqueta: "" });
/** `soloFigura`: cambiar la figura de alguien que ya está (sin nombre ni género). `color`: el suyo, si ya tiene. */
export function PersonajeLocal({ titulo, inicial, soloFigura, color, alListo, alCerrar }) {
    const trajes = useTrajes();
    const [nombre, setNombre] = useState(inicial?.nombre ?? "");
    const [genero, setGenero] = useState(inicial?.genero ?? "otro");
    const [figura, setFigura] = useState(inicial?.figura ?? null);
    const [elegido, setElegido] = useState(null);
    const limpio = nombre.replace(/\s+/g, " ").trim();
    const valido = soloFigura || (limpio.length >= 2 && limpio.length <= 20);
    const azar = () => { if (!trajes?.length)
        return; const t = trajes[Math.floor(Math.random() * trajes.length)]; setFigura(t.figura); setElegido(t.id); };
    const c = color ?? colorVista(genero);
    const foto = useFoto(figura, figura ? undefined : semillaDe(elegido ?? (limpio || "nuevo")), "busto");
    // Escape cierra.
    useEffect(() => { const f = (e) => { if (e.key === "Escape")
        alCerrar(); }; addEventListener("keydown", f); return () => removeEventListener("keydown", f); }, [alCerrar]);
    return (_jsx("div", { className: "pl-velo", role: "dialog", "aria-modal": "true", "aria-label": titulo, onClick: alCerrar, children: _jsxs("div", { className: "pl-modal", onClick: e => e.stopPropagation(), style: varsColor(c), children: [_jsxs("header", { className: "pl-top", children: [_jsx("h2", { className: "pl-tit", children: _jsx("span", { children: titulo }) }), _jsx("button", { type: "button", className: "pl-cerrar", onClick: alCerrar, "aria-label": "Cerrar", children: "\u2715" })] }), _jsxs("div", { className: "pl-cuerpo", children: [_jsxs("div", { className: "pl-vista", children: [_jsx("span", { className: "pl-cabina", style: { "--fj-cab": cabinaDe(c) }, "aria-hidden": "true", children: foto ? _jsx("img", { src: foto, alt: "", draggable: false }, foto) : _jsx("span", { className: "fj-cargando" }) }), _jsx("b", { className: "pl-nombre", children: soloFigura ? inicial?.nombre ?? "" : limpio || "Nuevo jugador" }), _jsx("button", { type: "button", className: "pl-azar", onClick: azar, disabled: !trajes?.length, children: "\uD83C\uDFB2 Al azar" })] }), _jsxs("div", { className: "pl-datos", children: [!soloFigura && _jsxs(_Fragment, { children: [_jsxs("label", { className: "pl-campo", children: [_jsx("span", { children: "Nombre" }), _jsx("input", { value: nombre, onChange: e => setNombre(e.target.value.slice(0, 20)), maxLength: 20, autoComplete: "off", autoFocus: true, placeholder: "C\u00F3mo le dicen" })] }), _jsx("div", { className: "pl-chips", role: "group", "aria-label": "G\u00E9nero (para el color)", children: GENEROS.map(g => _jsx("button", { type: "button", className: "pl-chip" + (genero === g.id ? " si" : ""), "aria-pressed": genero === g.id, onClick: () => setGenero(g.id), children: g.texto }, g.id)) })] }), _jsx("span", { className: "pl-sub", children: "Elige su figura" }), _jsx("div", { className: "pl-trajes", "aria-label": "Elige su figura", children: trajes ? trajes.map(t => (_jsx("button", { type: "button", className: "pl-traje" + (elegido === t.id ? " si" : ""), onClick: () => { setFigura(t.figura); setElegido(t.id); }, "aria-pressed": elegido === t.id, title: t.nombre, children: _jsx("img", { src: `${BASE}arte/piezas/${t.mini}.webp`, alt: t.nombre, loading: "lazy", draggable: false }) }, t.id))) : _jsx("p", { className: "pl-espera", children: "Cargando figuras\u2026" }) })] })] }), _jsx("button", { type: "button", className: "pl-listo", disabled: !valido, onClick: () => alListo({ nombre: limpio, genero, figura }), children: soloFigura ? "Usar esta figura" : "Agregar al lobby" })] }) }));
}
