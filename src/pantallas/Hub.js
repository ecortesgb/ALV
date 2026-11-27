import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Hub: todo sale de aquí. Arriba quién eres; al centro tu figura; el menú con Jugar como acción principal.
import { useEffect, useState } from "react";
import { Boton, Icono, Panel } from "../ds";
import { tituloPorNivel } from "../engine/economia";
import { hoyMexico, retoDelDia } from "../content/rarezas";
import { figuraActiva, useCapsulas } from "../app/figura3d";
import { ir } from "../app/rutas";
import { useSesion } from "../app/sesion";
import { useLobby, usePuedeAbrir } from "../app/lobby";
import { enlace } from "../servicios/enlace";
import { Campo, Cabecera, Elenco, Marco, aviso, useAncho } from "./comun";
import { TarjetaEsquina } from "./Identidad";
import { FondoALV } from "./Fondos";
import { LogoALV } from "./Logo";
import { BarraXP, PildoraMonedas, PildoraPuntos, useRecursos } from "./Recursos";
import { FranjaEnLinea } from "./Vivo";
import "./hub.css";
/** Tiempo que falta para el siguiente reto diario (medianoche en Ciudad de México), p. ej. «12h 34m». */
function faltaParaManana(ahora = new Date()) {
    const mx = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
    const min = 24 * 60 - (mx.getHours() * 60 + mx.getMinutes());
    return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
/** Tarjeta «Reto del día»: el reto diario del personalizador (rota cada día) con su premio y cuánto falta. */
function RetoDelDia() {
    const reto = retoDelDia(hoyMexico());
    const [falta, setFalta] = useState(faltaParaManana);
    useEffect(() => { const t = setInterval(() => setFalta(faltaParaManana()), 30000); return () => clearInterval(t); }, []);
    const mini = `${import.meta.env.BASE_URL}arte/piezas/${reto.premio.toLowerCase().replace(/_/g, "-")}.webp`;
    return (_jsxs("button", { type: "button", className: "hb-reto", onClick: () => ir("personalizar"), "aria-label": `Reto del día: ${reto.nombre}. ${reto.texto} Abrir el personalizador`, children: [_jsxs("span", { className: "hb-reto-regalo", "aria-hidden": "true", children: [_jsxs("svg", { viewBox: "0 0 64 64", children: [_jsx("path", { d: "M8 26h48v10H8z", fill: "#ff4fa3", stroke: "#0b1a4a", strokeWidth: "3", strokeLinejoin: "round" }), _jsx("path", { d: "M12 36h40v22H12z", fill: "#e8358a", stroke: "#0b1a4a", strokeWidth: "3", strokeLinejoin: "round" }), _jsx("path", { d: "M28 26h8v32h-8z", fill: "#ffd23f", stroke: "#0b1a4a", strokeWidth: "3", strokeLinejoin: "round" }), _jsx("path", { d: "M32 26c-6-12-18-12-16-4 1 4 10 4 16 4zm0 0c6-12 18-12 16-4-1 4-10 4-16 4z", fill: "#ffd23f", stroke: "#0b1a4a", strokeWidth: "3", strokeLinejoin: "round" })] }), _jsx("img", { src: mini, alt: "", onError: e => { e.currentTarget.hidden = true; } })] }), _jsxs("span", { className: "hb-reto-txt", children: [_jsx("small", { className: "dsp", children: "\u00A1Reto del d\u00EDa!" }), _jsx("b", { className: "dsp", children: reto.nombre }), _jsx("span", { children: reto.texto }), _jsxs("em", { className: "hb-reto-reloj", children: [_jsx(Icono, { id: "clock" }), "Cambia en ", falta] })] })] }));
}
export function Hub() {
    const s = useSesion();
    const ancho = useAncho();
    const r = useRecursos();
    const f = figuraActiva(useCapsulas(s.uid));
    const [sala, setSala] = useState(null);
    useEffect(() => { let vivo = true; void enlace.miSala().then(x => { if (vivo)
        setSala(x); }); return () => { vivo = false; }; }, [s.uid]);
    // Un toque y adentro: a tu lobby si ya estás en él, al lobby abierto si hay uno, y si no, a Jugar.
    const lobby = useLobby();
    const destino = sala?.codigo ?? lobby;
    return (_jsx(Marco, { clase: "hb", fondo: _jsx(FondoHub, {}), children: _jsxs("div", { className: "hb-caja", children: [_jsxs("header", { className: "hb-top", children: [_jsxs(TarjetaEsquina, { id: s.uid, figura: f, nombre: s.nombre, tamano: ancho ? "clamp(78px, 6vw, 112px)" : 64, onClick: () => ir("perfil"), className: "hb-yo", children: [_jsxs("span", { className: "hb-niv", children: [_jsxs("span", { className: "hb-niv-chip dsp", children: [_jsx(Icono, { id: "star" }), "Niv. ", r.nivel] }), _jsx("small", { children: tituloPorNivel(r.nivel) })] }), _jsx(BarraXP, { xp: r.xp, costo: r.costo, nivel: r.nivel, compacta: true })] }), _jsxs("div", { className: "hb-top-der", children: [_jsx(PildoraMonedas, { monedas: r.monedas }), _jsx(PildoraPuntos, { puntos: r.puntos }), _jsx("button", { type: "button", className: "hb-engrane", onClick: () => ir("ajustes"), "aria-label": "Ajustes", children: _jsx(Icono, { id: "gear" }) })] })] }), _jsxs("div", { className: "hb-izq", children: [_jsx(LogoALV, { tamano: "medio", unaVez: true, className: "hb-logo" }), _jsx(RetoDelDia, {}), _jsx(FranjaEnLinea, { className: "hb-vivo" })] }), _jsxs("div", { className: "hb-centro", children: [[[18, 70, 0], [80, 64, .9], [26, 88, 1.7], [74, 84, 2.4], [50, 60, 3]].map(([x, y, d], i) => _jsx("i", { className: "hb-chispa", "aria-hidden": "true", style: { left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` } }, i)), _jsx(Elenco, { gente: [{ id: s.uid, figura: f }], modo: "hub" })] }), _jsxs("nav", { className: "hb-menu", "aria-label": "Men\u00FA principal", children: [_jsx(Boton, { color: "amarillo", principal: true, texto: "\u00A1Jugar!", sub: sala ? "Volver al lobby" : lobby ? "Entrar al lobby" : "Juega con amigos", icono: "play", onClick: () => (destino ? ir("sala", destino) : ir("jugar")) }), _jsx(Boton, { color: "azul", texto: "Personalizar", sub: "Tu figura, a tu estilo", icono: "shirt", onClick: () => ir("personalizar") }), _jsx(Boton, { color: "morado", texto: "Tienda", sub: "Sobres y comodines", icono: "bag", onClick: () => ir("tienda") }), _jsx(Boton, { color: "verde", texto: "Ranking", sub: "T\u00FA y tus amigos", icono: "trophy", onClick: () => ir("ranking") }), _jsx(Boton, { color: "naranja", texto: "Logros", sub: "Lo que has desbloqueado", icono: "medal", onClick: () => ir("logros") })] })] }) }));
}
/** Fondo del HUB (y del taller): la ciudad según la hora. */
export const FondoHub = FondoALV;
/** Jugar: el lobby único. Entrar si está abierto; el anfitrión lo abre. El código queda como respaldo. */
export function Jugar() {
    const s = useSesion();
    const ancho = useAncho();
    const lobby = useLobby();
    const puedeAbrir = usePuedeAbrir(s.uid);
    const [codigo, setCodigo] = useState(""), [sala, setSala] = useState(null), [abriendo, setAbriendo] = useState(null), [conCodigo, setConCodigo] = useState(false);
    useEffect(() => { let vivo = true; void enlace.miSala().then(x => { if (vivo)
        setSala(x); }); return () => { vivo = false; }; }, [s.uid]);
    const abrir = async (modo) => {
        setAbriendo(modo);
        const r = await enlace.abrir(modo);
        setAbriendo(null);
        if (typeof r === "string") {
            aviso(r);
            return;
        }
        ir(modo === "tv" ? "tv" : "sala", r.codigo);
    };
    const limpio = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    const soyDelLobby = !!sala;
    return (_jsx(Marco, { children: _jsxs("div", { className: "a-ancho a-angosto a-pila", children: [_jsx(Cabecera, { titulo: "En l\u00EDnea", icono: "play", alVolver: () => ir("modos") }), _jsxs(Panel, { className: "a-pila a-entra a-jugar-lobby", como: "section", children: [_jsx("span", { className: "dsp ol a-t2", children: "Lobby ALV" }), soyDelLobby ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "a-suave", children: "Ya est\u00E1s en el lobby. Vuelve cuando quieras." }), _jsx(Boton, { color: "amarillo", principal: true, texto: "Volver al lobby", icono: "play", onClick: () => ir("sala", sala.codigo) }), sala.anfitrionId === s.uid && _jsx(Boton, { color: "azul", texto: "Proyectar aqu\u00ED", sub: "Este aparato es la pantalla", icono: "eye", onClick: () => ir("tv", sala.codigo) })] })) : lobby ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "a-suave", children: "El lobby est\u00E1 abierto. Caben hasta 8." }), _jsx(Boton, { color: "amarillo", principal: true, texto: "Entrar al lobby", icono: "play", onClick: () => ir("sala", lobby) })] })) : puedeAbrir ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "a-suave", children: ancho ? "Esta pantalla muestra el lobby y la partida; cada quien juega en su celular." : "Para proyectar, abre ALV en la laptop o la TV con tu cuenta." }), _jsx(Boton, { color: "amarillo", principal: true, texto: "Abrir el lobby", sub: "Proyectar en esta pantalla", icono: "eye", cargando: abriendo === "tv", onClick: () => void abrir("tv") }), _jsx(Boton, { color: "morado", texto: "Abrir sin pantalla", sub: "Solo celulares; el tuyo lleva la partida", icono: "users", cargando: abriendo === "mesa", onClick: () => void abrir("mesa") })] })) : (_jsx("p", { className: "a-suave a-pulso", role: "status", children: "El lobby a\u00FAn no abre. En cuanto el anfitri\u00F3n lo abra, aparece aqu\u00ED." }))] }), !soyDelLobby && (conCodigo ? (_jsx(Panel, { className: "a-pila", como: "section", children: _jsxs("form", { className: "a-pila", onSubmit: e => { e.preventDefault(); if (limpio.length === 6)
                            ir("sala", limpio); }, children: [_jsx(Campo, { etiqueta: "C\u00F3digo de 6 letras o n\u00FAmeros", value: limpio, onChange: e => setCodigo(e.target.value), inputMode: "text", autoCapitalize: "characters", autoComplete: "off", spellCheck: false, className: "a-codigo", maxLength: 6 }), _jsx(Boton, { color: "azul", texto: "Entrar con c\u00F3digo", icono: "play", desactivado: limpio.length !== 6, onClick: () => ir("sala", limpio) })] }) })) : _jsx("button", { type: "button", className: "a-plano", onClick: () => setConCodigo(true), children: "Tengo un c\u00F3digo" })), _jsx("button", { type: "button", className: "a-plano", onClick: () => ir("catalogo"), children: "Ver el cat\u00E1logo de juegos" })] }) }));
}
