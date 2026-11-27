import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Apertura de un sobre: rasgar, luz por rareza y revelar las cartas del mazo una por una.
// El resultado ya viene decidido (servidor o, en la demostración, la tirada local): la animación solo lo muestra.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiguraViva, figuraActiva, useCapsulas } from "../app/figura3d";
import { ponerPieza } from "../app/equiparPieza";
import { sesionAhora } from "../app/sesion";
import { movimientoReducido, vibrar } from "../app/preferencias";
import { sonar } from "../app/sonido";
import { RaizDS } from "../ds";
import { NOMBRE_RAREZA } from "../content/rarezas";
import { comodinPorId, DORSO_SOBRE } from "../content/tienda";
import { ponermelo } from "../servicios/tienda";
import { aviso } from "./comun";
import { infoPieza } from "./Desbloqueo";
import { miniatura } from "./Libro";
import { ComodinIcono, Momento, srcArte } from "./Tienda";
import { arteHub } from "./azotea/Cabecera";
const quieto = movimientoReducido;
const REVERSO = `${import.meta.env.BASE_URL}arte/tienda/carta-reverso-alv.webp`;
export function Apertura({ sobre, apertura, fondo, deEspaldas = false, alOtro, alColeccion }) {
    const [fase, setFase] = useState("rasgar");
    const [revelada, setRevelada] = useState(false);
    const [sobreDeEspaldas, setSobreDeEspaldas] = useState(deEspaldas);
    const [vistas, setVistas] = useState(0);
    const [corte, setCorte] = useState(0);
    const arrastre = useRef(null);
    const toqueCarta = useRef(null);
    const deslizoCarta = useRef(false);
    const dialogo = useRef(null);
    const n = apertura.cartas.length, mejor = apertura.mejor;
    useEffect(() => { dialogo.current?.focus(); }, [fase]);
    // El sello se separa primero. El mazo sale por detrás del cuerpo del sobre.
    useEffect(() => {
        if (fase !== "extraer")
            return;
        const reduce = quieto();
        const id = setTimeout(() => {
            setRevelada(!sobreDeEspaldas);
            setFase(n ? "cartas" : "resumen");
        }, reduce ? 0 : 1000);
        const luz = reduce ? undefined : setTimeout(() => { sonar(mejor); vibrar(40); }, 240);
        return () => { clearTimeout(id); clearTimeout(luz); };
    }, [fase, mejor, n, sobreDeEspaldas]);
    const rasgar = () => { if (fase !== "rasgar" || corte)
        return; setCorte(1); sonar("rasgar"); vibrar([30, 30, 60]); };
    useEffect(() => {
        if (fase !== "rasgar" || !corte)
            return;
        const id = setTimeout(() => setFase("extraer"), quieto() ? 0 : 280);
        return () => clearTimeout(id);
    }, [fase, corte]);
    const carta = apertura.cartas[vistas];
    const siguiente = () => {
        if (!revelada) {
            sonar("voltear");
            setRevelada(true);
            return;
        }
        if (vistas + 1 >= n)
            setFase("resumen");
        else {
            setVistas(vistas + 1);
            setRevelada(!sobreDeEspaldas);
        }
    };
    const frenteSobre = srcArte("tienda/" + sobre.arte);
    // Capa propia sobre todo (como los avisos): dentro del marco la posición fija no cubría la pantalla.
    return createPortal(_jsx(RaizDS, { className: "az a-capa t-tienda t-ap-raiz", children: _jsxs("div", { ref: dialogo, tabIndex: -1, className: `t-ap t-fase-${fase} t-luz-${mejor}`, role: "dialog", "aria-modal": "true", "aria-label": `Abriendo ${sobre.nombre}`, style: { "--c": sobre.color, "--t-fondo": fondo }, children: [_jsx("div", { className: "t-ap-rayos", "aria-hidden": "true" }), mejor === "legendaria" && fase === "extraer" && _jsx(Confeti, {}), (fase === "rasgar" || fase === "extraer") && (_jsxs("div", { className: "t-ap-centro", children: [_jsxs("div", { className: "t-ap-escenario", "data-cortado": !!corte, children: [fase === "extraer" && n > 0 && _jsx("div", { className: "t-ap-salida", "aria-hidden": "true", children: sobreDeEspaldas || !carta ? _jsx("img", { src: REVERSO, alt: "" }) : _jsx(CartaFrente, { c: carta }) }), _jsx("button", { type: "button", className: "t-ap-sobre" + (corte ? " t-rasgado" : ""), disabled: !!corte, "aria-label": sobreDeEspaldas ? "Girar sobre al frente" : "Girar sobre al reverso", onClick: () => { if (arrastre.current === null && !corte) {
                                        sonar("tic");
                                        setSobreDeEspaldas(v => !v);
                                    } }, onPointerDown: e => { arrastre.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }, onPointerMove: e => {
                                        if (arrastre.current === null)
                                            return;
                                        const distancia = e.clientX - arrastre.current;
                                        if (!quieto())
                                            e.currentTarget.style.setProperty("--t-inclinacion", `${distancia / 15}deg`);
                                        if (Math.abs(distancia) > 60) {
                                            arrastre.current = null;
                                            rasgar();
                                        }
                                    }, onLostPointerCapture: e => { arrastre.current = null; e.currentTarget.style.removeProperty("--t-inclinacion"); }, children: _jsx("span", { className: "t-sobre-caras" + (sobreDeEspaldas ? " de-espaldas" : ""), children: [frenteSobre, srcArte("tienda/" + DORSO_SOBRE)].map((arte, i) => (_jsxs("span", { className: "t-sobre-cara" + (i ? " t-sobre-dorso" : ""), children: [_jsx("img", { className: "t-ap-cuerpo", src: arte, alt: "", draggable: false }), _jsx("img", { className: "t-ap-tira", src: arte, alt: "", draggable: false })] }, arte))) }) }), !corte && _jsx("button", { type: "button", className: "t-ap-guia", "aria-label": "Rasgar sello", onClick: rasgar, onPointerDown: e => { arrastre.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }, onPointerMove: e => { if (arrastre.current !== null && Math.abs(e.clientX - arrastre.current) > 60)
                                        rasgar(); }, onLostPointerCapture: () => { arrastre.current = null; } })] }), _jsx("p", { className: "t-ap-texto t-sfx", children: !corte ? "Toca para girar · Desliza para rasgar" : "¡Sobre abierto!" }), _jsx("button", { type: "button", className: "t-ap-todas t-ap-saltar", onClick: () => setFase("resumen"), children: "Ver resultado" })] })), fase === "cartas" && carta && (_jsxs("div", { className: "t-ap-mesa", children: [_jsxs("p", { className: "t-ap-progreso", "aria-live": "polite", children: ["Carta ", vistas + 1, " de ", n, revelada ? " · " + nombreCarta(carta) : ""] }), _jsx("button", { type: "button", className: "t-mazo", "data-restantes": Math.min(3, n - vistas - 1), "aria-label": !revelada ? "Revelar carta" : vistas + 1 === n ? "Ver resultado" : "Siguiente carta", onPointerDown: e => { toqueCarta.current = e.clientX; deslizoCarta.current = false; e.currentTarget.setPointerCapture(e.pointerId); }, onPointerCancel: () => { toqueCarta.current = null; }, onPointerUp: e => {
                                if (toqueCarta.current !== null && Math.abs(e.clientX - toqueCarta.current) >= 40) {
                                    deslizoCarta.current = true;
                                    siguiente();
                                }
                                toqueCarta.current = null;
                            }, onClick: e => { if (e.detail === 0 || !deslizoCarta.current)
                                siguiente(); deslizoCarta.current = false; }, children: _jsxs("span", { className: "t-mazo-carta" + (revelada ? " t-volteada" : ""), children: [_jsx("span", { className: "t-cara t-reverso", "aria-hidden": "true", children: _jsx("img", { src: REVERSO, alt: "" }) }), _jsx("span", { className: "t-cara t-frente", "aria-hidden": !revelada, children: _jsx(CartaFrente, { c: carta }) })] }, vistas) }), _jsx("p", { className: "t-ap-instruccion", children: revelada ? "Desliza para " + (vistas + 1 === n ? "ver el resumen" : "pasar de carta") : "Toca la carta para voltearla" })] })), fase === "resumen" && _jsx(Resumen, { apertura: apertura, alOtro: alOtro, alColeccion: alColeccion })] }) }), document.body);
}
const nombreCarta = (c) => (c.tipo === "pieza" ? infoPieza(c.id).nombre : c.tipo === "comodin" ? comodinPorId(c.id)?.nombre ?? c.id : `${c.cantidad} monedas`);
export function CartaFrente({ c }) {
    if (c.tipo === "pieza") {
        const info = infoPieza(c.id);
        return (_jsxs("span", { className: "t-carta r-" + c.rareza, children: [_jsx("span", { className: "t-carta-banda", children: NOMBRE_RAREZA[c.rareza] }), _jsx("span", { className: "t-carta-arte", children: info.mini ? _jsx("img", { src: miniatura(info.mini), alt: "" }) : _jsx(Momento, {}) }), _jsx("span", { className: "t-carta-nombre", children: info.nombre }), _jsx("span", { className: "t-carta-efecto", children: "Pieza para personalizar tu figura." }), _jsx("span", { className: "t-nuevo t-sfx", children: "\u00A1Nuevo!" })] }));
    }
    if (c.tipo === "comodin") {
        const x = comodinPorId(c.id);
        if (x?.arte)
            return (_jsxs("span", { className: "t-carta t-carta-comodin ilustrada", "data-comodin": c.id, children: [_jsxs("span", { className: "t-comodin-cab", children: [_jsx("span", { className: "t-comodin-sello", children: x.trampa ? "Trampa" : c.especial ? "Especial" : "Comodín" }), _jsx("span", { className: "t-carta-nombre", children: x.nombre }), _jsx("span", { className: "t-comodin-glifo", children: _jsx(ComodinIcono, { id: c.id, alterno: x.icono }) })] }), _jsx("span", { className: "t-carta-arte", children: _jsx("img", { src: srcArte("tienda/" + x.arte), alt: "", loading: "lazy", draggable: false }) }), _jsx("span", { className: "t-carta-efecto", children: x.efecto })] }));
        return (_jsxs("span", { className: "t-carta t-carta-comodin" + (c.especial ? " t-especial" : ""), children: [_jsx("span", { className: "t-carta-banda", children: c.especial ? "Comodín especial" : "Comodín" }), _jsx("span", { className: "t-carta-arte", children: _jsx(ComodinIcono, { id: c.id, alterno: x?.icono ?? "🃏" }) }), _jsx("span", { className: "t-carta-nombre", children: x?.nombre ?? c.id }), _jsx("span", { className: "t-carta-efecto", children: x?.efecto })] }));
    }
    return (_jsxs("span", { className: "t-carta t-carta-monedas", children: [_jsx("span", { className: "t-carta-banda", children: "Ya tienes 9" }), _jsx("span", { className: "t-carta-arte", children: _jsx("img", { className: "t-moneda t-moneda-xl", src: arteHub("moneda"), alt: "" }) }), _jsxs("span", { className: "t-carta-nombre", children: ["+", c.cantidad, " monedas"] }), _jsx("span", { className: "t-carta-efecto", children: "Se agregaron a tu saldo." })] }));
}
function Resumen({ apertura, alOtro, alColeccion }) {
    const piezas = apertura.cartas.filter((c) => c.tipo === "pieza");
    const [elegida, setElegida] = useState(piezas[piezas.length - 1]?.id ?? null);
    const [puestas, setPuestas] = useState(new Set());
    const caps = useCapsulas(sesionAhora().uid || "nadie");
    const actual = figuraActiva(caps);
    const vista = useMemo(() => (elegida && !puestas.has(elegida) ? ponerPieza(actual, elegida) ?? actual : actual), [actual, elegida, puestas]);
    const poner = () => {
        if (!elegida)
            return;
        const k = ponermelo(elegida);
        if (!k) {
            aviso("No se pudo poner esa pieza.");
            return;
        }
        sonar("encaje");
        vibrar(30);
        setPuestas(s => new Set([...s, elegida]));
        aviso(`¡Listo! Ya la traes puesta (espacio ${k}).`);
    };
    return (_jsxs("div", { className: "t-ap-resumen" + (piezas.length ? "" : " sin-figura"), children: [piezas.length > 0 && (_jsxs("div", { className: "t-ap-figura", children: [_jsx(FiguraViva, { figura: vista, className: "t-ap-viva" }), _jsx("div", { className: "t-ap-pedestal", "aria-hidden": "true" })] })), _jsxs("div", { className: "t-ap-lado", children: [_jsx("h2", { className: "t-sfx", children: "\u00A1Lo que te sali\u00F3!" }), _jsx("div", { className: "t-ap-lista", children: apertura.cartas.map((c, k) => (_jsxs("button", { type: "button", disabled: c.tipo !== "pieza", className: "t-ap-item" + (c.tipo === "pieza" && c.id === elegida ? " t-on" : ""), onClick: () => { if (c.tipo === "pieza") {
                                sonar("tic");
                                setElegida(c.id);
                            } }, children: [_jsx(CartaFrente, { c: c }), c.tipo === "pieza" && puestas.has(c.id) && _jsx("span", { className: "t-puesta", children: "Puesta" })] }, k))) }), _jsxs("div", { className: "t-ap-botones", children: [elegida && _jsx("button", { type: "button", className: "t-comprar t-chico", disabled: puestas.has(elegida), onClick: poner, children: puestas.has(elegida) ? "¡Ya la traes!" : "Ponérmelo" }), _jsx("button", { type: "button", className: "t-boton-azul", onClick: alOtro, children: "Guardar y volver" }), _jsx("button", { type: "button", className: "t-boton-azul", onClick: alColeccion, children: "Ver colecci\u00F3n" })] })] })] }));
}
function Confeti() {
    const piezas = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ i, x: Math.random() * 100, d: Math.random() * 0.8, r: Math.random() * 360, c: ["#ffd23f", "#ffb21f", "#fff4c2", "#ff3fb4", "#3fb6ff"][i % 5] })), []);
    return (_jsx("div", { className: "t-ap-confeti", "aria-hidden": "true", children: piezas.map(p => _jsx("i", { style: { left: `${p.x}%`, animationDelay: `${p.d}s`, background: p.c, transform: `rotate(${p.r}deg)` } }, p.i)) }));
}
