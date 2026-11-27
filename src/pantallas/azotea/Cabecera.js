import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Encabezado del prototipo «La Azotea», versión profesional (2026-11-21) con el arte de Elías (public/arte/ui/hub/):
// medallón (marco + foto «busto» de la figura + estrella de nivel), placa de vidrio con apodo, rango y barra de XP,
// y pastillas de monedas y puntos con su icono 3D. Los textos y números son interfaz real; solo los objetos son imagen.
// Mismos datos que el HUB (useRecursos, apodo de la figura). La moneda gira cuando sube el saldo.
import { useEffect, useRef, useState } from "react";
import { apodoDe, semillaDe, useFoto } from "../../app/figura3d";
import { ir } from "../../app/rutas";
import { tituloPorNivel } from "../../engine/economia";
const num = (n) => Math.max(0, Math.round(n)).toLocaleString("es-MX");
// Ojo: dentro de una variable CSS la url relativa se resolvería desde assets/ en el sitio (base "./"); ahí va absoluta.
export const arteHub = (n) => `${import.meta.env.BASE_URL}arte/ui/hub/${n}.webp`;
export function CabeceraJugador({ id, nombre, figura, nivel, xp, costo, compacta }) {
    const foto = useFoto(figura, figura ? undefined : semillaDe(id), "busto");
    const apodo = apodoDe(figura);
    const titulo = tituloPorNivel(nivel);
    return (_jsxs("button", { type: "button", className: "azc" + (compacta ? " compacta" : ""), onClick: () => ir("perfil"), "aria-label": `${apodo ? apodo + ", " : ""}${nombre}, nivel ${nivel}, ${titulo}. XP ${num(xp)} de ${num(costo)}. Ver mi perfil`, children: [_jsxs("span", { className: "azc-medallon", "aria-hidden": "true", children: [_jsx("span", { className: "azc-fondo" }), foto ? _jsx("span", { className: "azc-dentro", children: _jsx("img", { className: "azc-foto", src: foto, alt: "", draggable: false }) }) : _jsx("span", { className: "azc-cargando" }), _jsx("img", { className: "azc-marco", src: arteHub("marco-avatar"), alt: "", draggable: false }), foto && _jsx("span", { className: "azc-asoma", children: _jsx("img", { className: "azc-foto", src: foto, alt: "", draggable: false }) }), _jsxs("span", { className: "azc-nivel", children: [_jsx("img", { src: arteHub("insignia-nivel"), alt: "", draggable: false }), _jsx("b", { children: nivel })] }), _jsx("i", { className: "azc-punto" })] }), _jsxs("span", { className: "azc-placa", children: [_jsxs("span", { className: "azc-nombres", children: [_jsx("b", { className: "azc-apodo", children: apodo ?? nombre }), _jsxs("small", { className: "azc-sub", children: [apodo && _jsxs("span", { className: "azc-cuenta", children: ["@", nombre] }), _jsx("span", { className: "azc-rango", children: titulo })] })] }), _jsx(BarraXPAzotea, { xp: xp, costo: costo, nivel: nivel })] })] }));
}
/**
 * El medallón del HUB para cualquier jugador (Elías, 25 nov): marco, busto de su figura que asoma sobre el aro, la
 * estrella (con su número de jugador o su nivel) y el punto verde. `--pj` tiñe el fondo del círculo.
 */
export function MedallonJugador({ id, figura, estrella, tamano = 120, className = "", style }) {
    const foto = useFoto(figura ?? null, figura ? undefined : semillaDe(id), "busto");
    return (_jsxs("span", { className: "azc-medallon azm " + className, "aria-hidden": "true", style: { "--m": typeof tamano === "number" ? `${tamano}px` : tamano, ...style }, children: [_jsx("span", { className: "azc-fondo" }), foto ? _jsx("span", { className: "azc-dentro", children: _jsx("img", { className: "azc-foto", src: foto, alt: "", draggable: false }) }) : _jsx("span", { className: "azc-cargando" }), _jsx("img", { className: "azc-marco", src: arteHub("marco-avatar"), alt: "", draggable: false }), foto && _jsx("span", { className: "azc-asoma", children: _jsx("img", { className: "azc-foto", src: foto, alt: "", draggable: false }) }), estrella != null && _jsxs("span", { className: "azc-nivel", children: [_jsx("img", { src: arteHub("insignia-nivel"), alt: "", draggable: false }), _jsx("b", { children: estrella })] }), _jsx("i", { className: "azc-punto" })] }));
}
/** Barra de XP fina: rayo 3D, riel de vidrio, relleno turquesa con brillo y la cifra encima a la derecha. */
export function BarraXPAzotea({ xp, costo, nivel }) {
    const pct = costo > 0 ? Math.max(0, Math.min(1, xp / costo)) : 0;
    const [visto, setVisto] = useState(0);
    const primera = useRef(true);
    useEffect(() => { const t = setTimeout(() => setVisto(pct), primera.current ? 450 : 0); primera.current = false; return () => clearTimeout(t); }, [pct]);
    return (_jsxs("span", { className: "azc-xp", children: [_jsx("img", { className: "azc-xp-ico", src: arteHub("xp"), alt: "", draggable: false }), _jsxs("span", { className: "azc-xp-cuerpo", children: [_jsxs("span", { className: "azc-xp-datos", children: [_jsxs("small", { children: ["Nivel ", nivel] }), _jsxs("span", { children: [_jsx("b", { children: num(xp) }), " / ", num(costo), " XP"] })] }), _jsx("span", { className: "azc-tubo", role: "progressbar", "aria-label": `XP del nivel ${nivel}`, "aria-valuemin": 0, "aria-valuemax": costo, "aria-valuenow": xp, children: _jsx("span", { className: "azc-relleno", style: { "--p": visto } }) })] }), _jsxs("span", { className: "azc-sig", title: `Siguiente: nivel ${nivel + 1}`, children: [_jsx("img", { src: arteHub("insignia-nivel"), alt: "", draggable: false }), _jsx("b", { children: nivel + 1 })] })] }));
}
/** Monedas (con «+» a la tienda), puntos (al ranking) y ajustes. La moneda gira cuando sube el saldo o al tocarla. */
export function RecursosAzotea({ monedas, puntos, enTienda = false }) {
    const [gira, setGira] = useState(0);
    const antes = useRef(monedas);
    useEffect(() => { if (monedas > antes.current)
        setGira(g => g + 1); antes.current = monedas; }, [monedas]);
    const saldo = _jsxs(_Fragment, { children: [_jsx("span", { className: "azr-ico azr-moneda" + (gira ? " gira" : ""), style: { "--sprite": `url("${new URL(arteHub("moneda-giro"), document.baseURI).href}")` }, "aria-hidden": "true" }, gira), _jsx("b", { children: num(monedas) })] });
    return (_jsxs("div", { className: "azr", children: [_jsx("span", { className: "azr-pildora azr-monedas", children: enTienda ? _jsxs("span", { className: "azr-cuerpo", children: [saldo, _jsx("span", { className: "t-solo-lector", children: " monedas" })] }) : _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "azr-cuerpo", onClick: () => ir("tienda"), "aria-label": `${num(monedas)} monedas. Abrir la tienda`, onPointerEnter: e => { if (e.pointerType === "mouse")
                                setGira(g => g + 1); }, children: saldo }), _jsx("button", { type: "button", className: "azr-mas", onClick: () => ir("tienda"), "aria-label": "Conseguir monedas en la tienda", children: _jsx("span", { "aria-hidden": "true", children: "+" }) })] }) }), _jsxs("button", { type: "button", className: "azr-pildora azr-puntos azr-cuerpo", onClick: () => ir("ranking"), "aria-label": `${num(puntos)} puntos. Ver el ranking`, children: [_jsx("img", { className: "azr-ico", src: arteHub("puntos"), alt: "", draggable: false }), _jsx("b", { children: num(puntos) }), _jsx("small", { children: "PTS" })] }), !enTienda && _jsx("button", { type: "button", className: "azr-ajustes", onClick: () => ir("ajustes"), "aria-label": "Ajustes", children: _jsx("img", { src: arteHub("ajustes"), alt: "", draggable: false }) })] }));
}
