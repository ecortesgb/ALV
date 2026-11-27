import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// Fondos pintados de ALV (18 nov): la ciudad cambia con la hora (día, atardecer, noche) y en partida va el escenario.
// Las imágenes viven en public/arte con dos tamaños: -1920 (computadora y TV) y -1100 (celular).
import { useEffect, useState } from "react";
import { figuraActiva, useCapsulas } from "../app/figura3d";
import { useSesion } from "../app/sesion";
import { useFondoTema } from "../app/temas";
import { FONDO_ESCENARIO } from "../content/arteJuegos";
import { useMomentoDia } from "../app/horaDelDia";
// Url absoluta (igual que urlArte en comun.tsx; aquí aparte para no importar comun y evitar un ciclo).
const url = (nombre) => `url("${new URL(`${import.meta.env.BASE_URL}arte/${nombre}`, document.baseURI).href}")`;
const arte = (base) => ({ "--arte-g": url(`${base}-1920.webp`), "--arte-c": url(`${base}-1100.webp`) });
const BRILLOS = [[12, 18, 0], [34, 9, 1.2], [58, 22, 2.1], [71, 7, .6], [88, 30, 1.7], [22, 36, 2.6], [47, 4, 3.1]];
/** Ciudad según la hora local. Al pasar un corte la imagen nueva aparece encima con un fundido. */
export function FondoALV() {
    const m = useMomentoDia();
    const [capas, setCapas] = useState([m]);
    useEffect(() => {
        setCapas(c => { const ult = c[c.length - 1]; return ult === m || !ult ? [m] : [ult, m]; });
        const t = setTimeout(() => setCapas([m]), 2500);
        return () => clearTimeout(t);
    }, [m]);
    return (_jsxs("div", { className: `d-bg a-fondo-alv m-${m}`, "aria-hidden": "true", "data-momento": m, children: [capas.map(c => _jsx("div", { className: "a-fa-capa" + (capas.length > 1 && c === m ? " nueva" : ""), style: arte(`ciudad-${c}`) }, c)), m === "noche" && _jsxs(_Fragment, { children: [_jsx("div", { className: "a-fh-luna" }), BRILLOS.map(([x, y, d], i) => _jsx("i", { className: "a-fh-brillo", style: { left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` } }, i))] }), m === "dia" && _jsx("div", { className: "a-fa-sol" }), m === "atardecer" && _jsx("div", { className: "a-fa-calor" })] }));
}
/** Fondo de la partida: la imagen del escenario elegido, o la ciudad según la hora si ese escenario no tiene imagen. */
export function FondoEscenario({ escenario }) {
    const base = escenario ? FONDO_ESCENARIO[escenario] : undefined;
    if (!base)
        return _jsx(FondoALV, {});
    return _jsx("div", { className: `d-bg a-fondo-alv a-fondo-esc esc-${escenario}`, "aria-hidden": "true", "data-escenario": escenario, children: _jsx("div", { className: "a-fa-capa", style: arte(base) }) });
}
/** Fondo del tema de TU personaje activo (temas.ts) en el taller y la colección; sin tema, el fondo de siempre. */
export function FondoMiTema({ children }) {
    const s = useSesion();
    const t = useFondoTema(figuraActiva(useCapsulas(s.uid)));
    if (!t.css)
        return _jsx(_Fragment, { children: children });
    return _jsx("div", { className: "d-bg a-fondo-alv a-fondo-tema", "aria-hidden": "true", children: _jsx("div", { className: "a-fa-capa", style: { "--arte-g": t.css, "--arte-c": t.css } }) });
}
