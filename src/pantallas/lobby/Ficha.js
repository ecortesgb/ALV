import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { claveArchivo, varsColor } from "../../app/colorJugador";
import { apodoDe, semillaDe, useFoto } from "../../app/figura3d";
import { urlArte } from "../comun";
import { carpetaLobby } from "./version";
/** Fondo de la ficha: la cabina del color (sin color, la vacía). */
export const cabinaDe = (c) => urlArte(`${carpetaLobby}/cabina-${c ? claveArchivo(c) : "vacia"}.webp`);
export function FichaJugador({ id, figura, nombre, color, tamano = 64, className = "", yo, soloCara, children }) {
    const foto = useFoto(figura ?? null, figura ? undefined : semillaDe(id), "busto");
    const apodo = apodoDe(figura ?? null);
    return (_jsxs("span", { className: "fj" + (yo ? " yo" : "") + (className ? " " + className : ""), style: { ...varsColor(color), "--fj-t": `${tamano}px`, "--fj-cab": cabinaDe(color) }, children: [_jsxs("span", { className: "fj-cab", "aria-hidden": "true", children: [foto ? _jsx("img", { src: foto, alt: "", draggable: false }) : _jsx("span", { className: "fj-cargando" }), color && _jsx("b", { className: "fj-pn", children: color.etiqueta })] }), soloCara ? _jsx("span", { className: "a-oculto", children: apodo ?? nombre }) : _jsxs("span", { className: "fj-txt", children: [_jsx("span", { className: "fj-nom", children: apodo ?? nombre }), children] })] }));
}
