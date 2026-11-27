import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Logros «vitrina de colección» (ALV_PLAN_RANKING_LOGROS.md v2, etapa 1; Maestro v1.54, 14.3).
// Mismo lenguaje que el HUB «La Azotea» y el Perfil, con otro diseño que el Ranking: repisas, insignias y avance.
// Datos: mi_progreso_logros (042). Los logros no dan XP (D0): la recompensa es la insignia.
// Insignias y dibujos son imágenes de Elías (public/arte/ui/logros/*.webp); mientras no llegan, el icono de Logros del HUB.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { atras } from "../../app/rutas";
import { refrescarSesion, useSesion } from "../../app/sesion";
import { JUEGOS } from "../../content/catalogo";
import { ORDEN_RAREZA, RAREZA_TEXTO } from "../../content/logros";
import { destacarLogro, miProgresoLogros, misObjetivos, reclamarObjetivo, usarTitulo } from "../../servicios/logros";
import { Marco, aviso } from "../comun";
import { useRecursos } from "../Recursos";
import { RecursosAzotea, arteHub } from "../azotea/Cabecera";
import { FondoSeccion } from "../FondoSeccion";
import { useMomentoAzotea } from "../azotea/HubAzotea";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "./logros.css";
const BASE = import.meta.env.BASE_URL;
const fecha = (iso) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });
const PESTANAS = [
    { id: "coleccion", titulo: "Mi colección" }, { id: "ocultos", titulo: "Ocultos" }, { id: "minijuego", titulo: "Por minijuego" },
    { id: "colectivos", titulo: "Colectivos" }, { id: "objetivos", titulo: "Objetivos" }, { id: "recompensas", titulo: "Recompensas" },
];
const faltan = new Set();
function Arte({ nombre, alterno, className = "" }) {
    const [falta, setFalta] = useState(() => faltan.has(nombre));
    if (falta && !alterno)
        return null;
    return _jsx("img", { className: className, src: falta ? alterno : `${BASE}arte/ui/logros/${nombre}.webp`, alt: "", draggable: false, onError: () => { if (!falta) {
            faltan.add(nombre);
            setFalta(true);
        } } });
}
/** La insignia: marco por rareza (o bloqueado) y el dibujo del logro encima. */
// Fondos del salón de logros (Elías, 2026-11-23). PRUEBA: ?fondo=galeria | muro para comparar; el salón con vitrinas quedó por omisión.
const FONDOS_LOGROS = [
    { clave: "salon", archivo: "lg-salon", foco: "50% 45%" },
    { clave: "galeria", archivo: "lg-galeria", foco: "60% 50%" },
    { clave: "muro", archivo: "lg-muro", foco: "50% 40%" },
];
export function Insignia({ l, grande }) {
    const ganado = !!l.ganado, secreto = !!l.oculto && !ganado;
    return (_jsxs("span", { className: `lg-insignia r-${l.rareza}` + (ganado ? " ganado" : " bloqueado") + (secreto ? " secreto" : "") + (grande ? " grande" : ""), "aria-hidden": "true", children: [_jsx(Arte, { nombre: ganado ? `insignia-${l.rareza}` : secreto ? "insignia-oculta" : "insignia-bloqueada", className: "lg-marco" }), secreto ? _jsx("span", { className: "lg-interroga", children: "?" }) : _jsx(Arte, { nombre: `logro-${l.clave}`, alterno: arteHub("icono-logros"), className: "lg-dibujo" })] }));
}
export function Logros() {
    const s = useSesion();
    const r = useRecursos();
    const momento = useMomentoAzotea();
    const [pestana, setPestana] = useState("coleccion");
    const [lista, setLista] = useState(undefined);
    const [abierto, setAbierto] = useState(null);
    const cargar = () => miProgresoLogros().then(setLista);
    useEffect(() => { void cargar(); }, [s.uid]);
    const visibles = useMemo(() => (lista ?? []).filter(l => !l.oculto || l.ganado), [lista]);
    const todos = lista ?? [];
    const ganados = visibles.filter(l => l.ganado);
    const destacados = visibles.filter(l => l.destacado);
    const destacar = async (l) => {
        const si = !l.destacado;
        if (si && destacados.length >= 3) {
            aviso("Ya tienes 3 destacados. Quita uno primero.");
            return;
        }
        const n = await destacarLogro(l.clave, si);
        if (n == null) {
            aviso("No se pudo. Intenta de nuevo.");
            return;
        }
        aviso(si ? `«${l.nombre}» destacado en tu perfil.` : "Lo quitaste de tus destacados.");
        setAbierto(a => (a ? { ...a, destacado: si } : a));
        void cargar();
    };
    return (_jsxs(Marco, { clase: `az pf lg m-${momento}`, fondo: _jsx(FondoSeccion, { opciones: FONDOS_LOGROS, velo: .5 }), children: [_jsxs("div", { className: "lg-caja", children: [_jsxs("header", { className: "pf-top lg-top", children: [_jsxs("button", { type: "button", className: "pf-atras", onClick: atras, children: [_jsx("span", { "aria-hidden": "true", children: "\u25C0" }), "Atr\u00E1s"] }), _jsx(RecursosAzotea, { monedas: r.monedas, puntos: r.puntos })] }), _jsxs("div", { className: "lg-cabeza", children: [_jsx("h1", { className: "lg-titulo", children: _jsx("span", { children: "Tu vitrina" }) }), lista && (_jsxs("div", { className: "lg-total", "aria-label": `${ganados.length} de ${todos.length} logros`, children: [_jsx("b", { children: ganados.length }), _jsxs("small", { children: ["de ", todos.length] }), _jsx("span", { className: "lg-barra", children: _jsx("i", { style: { width: `${todos.length ? Math.round((100 * ganados.length) / todos.length) : 0}%` } }) })] }))] }), _jsx("nav", { className: "lg-pestanas", "aria-label": "Secciones de logros", children: PESTANAS.map(p => (_jsxs("button", { type: "button", className: "lg-pest" + (pestana === p.id ? " si" : "") + (p.pronto ? " pronto" : ""), "aria-pressed": pestana === p.id, onClick: () => setPestana(p.id), children: [_jsx(Arte, { nombre: `tab-${p.id}`, className: "lg-pest-ico" }), _jsx("span", { children: p.titulo }), p.pronto && _jsx("small", { children: "Pr\u00F3ximamente" })] }, p.id))) }), lista === undefined ? _jsx("p", { className: "lg-cargando", role: "status", children: "Abriendo la vitrina\u2026" })
                        : lista === null ? _jsx("p", { className: "lg-cargando", role: "status", children: "No se pudo leer tu colecci\u00F3n. Revisa tu conexi\u00F3n." })
                            : pestana === "coleccion" ? _jsxs(_Fragment, { children: [_jsx(Repisa, { titulo: "Todos tus logros", logros: ordenar(visibles.filter(l => l.categoria === "coleccion")), alAbrir: setAbierto }), _jsx(Repisa, { titulo: "Tu camino", logros: ordenar(visibles.filter(l => l.categoria === "progresion")), alAbrir: setAbierto })] })
                                : pestana === "ocultos" ? _jsx(Repisa, { titulo: "Secretos", logros: ordenar(todos.filter(l => l.categoria === "oculto")), alAbrir: setAbierto })
                                    : pestana === "objetivos" ? _jsx(Objetivos, {})
                                        : pestana === "colectivos" ? _jsx(Repisa, { titulo: "Con tus amigos", logros: ordenar(visibles.filter(l => l.categoria === "colectivo")), alAbrir: setAbierto })
                                            : pestana === "minijuego" ? _jsx(PorJuego, { logros: visibles.filter(l => l.categoria === "minijuego"), alAbrir: setAbierto })
                                                : pestana === "recompensas" ? _jsx(Recompensas, { ganados: ganados, destacados: destacados, alAbrir: setAbierto, alTitulo: async (c) => { if (await usarTitulo(c)) {
                                                        aviso(c ? "Título puesto." : "Quitaste tu título.");
                                                        void cargar();
                                                    }
                                                    else
                                                        aviso("No se pudo cambiar."); } })
                                                    : null] }), abierto && _jsx(Detalle, { l: abierto, alCerrar: () => setAbierto(null), alDestacar: () => void destacar(abierto) })] }));
}
/** Ganados primero (los más recientes arriba); luego los que van más avanzados. */
function ordenar(ls) {
    return [...ls].sort((a, b) => (b.ganado ? 1 : 0) - (a.ganado ? 1 : 0) || (b.ganado ?? "").localeCompare(a.ganado ?? "")
        || b.va / b.meta - a.va / a.meta || ORDEN_RAREZA[a.rareza] - ORDEN_RAREZA[b.rareza] || a.orden - b.orden);
}
function Repisa({ titulo, logros, alAbrir }) {
    const ganados = logros.filter(l => l.ganado).length;
    return (_jsxs("section", { className: "lg-repisa", "aria-label": titulo, children: [_jsxs("h2", { className: "pf-tit", children: [_jsx("span", { children: titulo }), _jsxs("small", { className: "lg-cuenta", children: [ganados, "/", logros.length] })] }), _jsx("ul", { className: "lg-rejilla", children: logros.map((l, i) => (_jsx("li", { style: { "--i": i }, children: _jsxs("button", { type: "button", className: "lg-carta" + (l.ganado ? " ganado" : ""), onClick: () => alAbrir(l), "aria-label": `${l.nombre ?? "Logro secreto"}. ${l.ganado ? "Ganado" : `${l.va} de ${l.meta}`}. ${RAREZA_TEXTO[l.rareza]}.`, children: [_jsx(Insignia, { l: l }), _jsx("b", { children: l.nombre ?? "???" }), !l.nombre && l.pista && _jsx("small", { className: "lg-pista", children: l.pista }), l.ganado ? _jsx("small", { className: "lg-fecha", children: fecha(l.ganado) })
                                : _jsxs("span", { className: "lg-avance", children: [_jsx("span", { className: "lg-barra chica", children: _jsx("i", { style: { width: `${Math.round((100 * l.va) / l.meta)}%` } }) }), _jsxs("small", { children: [l.va, "/", l.meta] })] }), l.destacado && _jsx("em", { className: "lg-estrella", "aria-hidden": "true", children: "\u2605" })] }) }, l.clave))) })] }));
}
function PorJuego({ logros, alAbrir }) {
    const juegos = [...new Set(logros.map(l => l.juego ?? ""))];
    return _jsx(_Fragment, { children: juegos.map(j => _jsx(Repisa, { titulo: JUEGOS.find(x => x.id === j)?.nombre ?? j, logros: ordenar(logros.filter(l => (l.juego ?? "") === j)), alAbrir: alAbrir }, j)) });
}
function Recompensas({ ganados, destacados, alAbrir, alTitulo }) {
    const actual = ganados.find(l => l.en_uso);
    return (_jsxs(_Fragment, { children: [_jsxs("section", { className: "pf-bloque lg-titulos", "aria-label": "Tu t\u00EDtulo", children: [_jsx("h2", { className: "pf-tit", children: _jsx("span", { children: "Tu t\u00EDtulo y marco" }) }), _jsx("p", { className: "pf-suave", children: "Elige un logro ganado: su nombre sale bajo tu apodo en el Ranking y su marco toma el color de su rareza." }), ganados.length === 0 ? _jsx("p", { className: "pf-suave", children: "Gana tu primer logro para tener un t\u00EDtulo." }) : (_jsxs("div", { className: "lg-chips", role: "group", "aria-label": "T\u00EDtulos", children: [_jsx("button", { type: "button", className: "lg-chip" + (!actual ? " si" : ""), "aria-pressed": !actual, onClick: () => alTitulo(null), children: "Sin t\u00EDtulo" }), ganados.map(l => _jsx("button", { type: "button", className: `lg-chip r-${l.rareza}` + (l.en_uso ? " si" : ""), "aria-pressed": !!l.en_uso, onClick: () => alTitulo(l.clave), children: l.nombre }, l.clave))] }))] }), _jsxs("section", { className: "pf-bloque lg-destacados", "aria-label": "Destacados", children: [_jsxs("h2", { className: "pf-tit", children: [_jsx("span", { children: "Destacados en tu perfil" }), _jsxs("small", { className: "lg-cuenta", children: [destacados.length, "/3"] })] }), _jsx("div", { className: "lg-pedestales", children: [0, 1, 2].map(i => {
                            const l = destacados[i];
                            return l ? _jsxs("button", { type: "button", className: "lg-pedestal", onClick: () => alAbrir(l), children: [_jsx(Insignia, { l: l, grande: true }), _jsx("b", { children: l.nombre })] }, l.clave)
                                : _jsxs("span", { className: "lg-pedestal vacio", children: [_jsx("span", { className: "lg-hueco" }), _jsx("small", { children: "Toca un logro ganado y elige \u00ABDestacar\u00BB" })] }, i);
                        }) })] }), _jsxs("section", { className: "pf-bloque", "aria-label": "Lo que puedes ganar", children: [_jsx("h2", { className: "pf-tit", children: _jsx("span", { children: "Lo que ganas" }) }), _jsx("p", { className: "pf-suave", children: "Cada logro te da su insignia para tu vitrina y tu perfil. Los logros no dan XP: la XP sale de jugar. T\u00EDtulos, marcos, poses y efectos de entrada llegan en las siguientes etapas." }), ganados.length === 0 && _jsx("p", { className: "pf-suave", children: "Todav\u00EDa no tienes insignias. Termina tu primera partida y gana \u00ABPrimeros pasos\u00BB." })] })] }));
}
/** Objetivos del día y de la semana (043): avance real, cobrar la XP una vez. */
function Objetivos() {
    const [lista, setLista] = useState(undefined);
    const [cobrando, setCobrando] = useState(null);
    const cargar = () => misObjetivos().then(setLista);
    useEffect(() => { void cargar(); }, []);
    const cobrar = async (o) => {
        setCobrando(o.clave);
        const xp = await reclamarObjetivo(o.clave);
        setCobrando(null);
        if (xp == null) {
            aviso("No se pudo cobrar. Intenta de nuevo.");
            return;
        }
        dispatchEvent(new CustomEvent("alv-logro", { detail: { tipo: "objetivo", nombre: o.nombre, rareza: "rara", recompensa: xp > 0 ? `+${xp} XP` : "Ya llegaste al tope de XP de hoy" } }));
        void refrescarSesion();
        void cargar();
    };
    if (lista === undefined)
        return _jsx("p", { className: "lg-cargando", role: "status", children: "Leyendo tus objetivos\u2026" });
    if (lista === null)
        return _jsx("p", { className: "lg-cargando", role: "status", children: "No se pudieron leer tus objetivos." });
    const grupo = (periodo, titulo) => {
        const xs = lista.filter(o => o.periodo === periodo);
        if (!xs.length)
            return null;
        return (_jsxs("section", { className: "pf-bloque lg-objetivos", "aria-label": titulo, children: [_jsxs("h2", { className: "pf-tit", children: [_jsx("span", { children: titulo }), _jsxs("small", { className: "lg-cuenta", children: ["Se renuevan en ", restante(xs[0].termina)] })] }), _jsx("ul", { className: "lg-obj-lista", children: xs.map(o => {
                        const listo = o.va >= o.meta;
                        return (_jsxs("li", { className: "lg-obj" + (o.reclamado ? " cobrado" : listo ? " listo" : ""), children: [_jsxs("span", { className: "lg-obj-txt", children: [_jsx("b", { children: o.nombre }), _jsxs("span", { className: "lg-avance", children: [_jsx("span", { className: "lg-barra", children: _jsx("i", { style: { width: `${Math.round((100 * o.va) / o.meta)}%` } }) }), _jsxs("small", { children: [o.va, "/", o.meta] })] })] }), _jsxs("span", { className: "lg-obj-xp", children: ["+", o.xp, " XP"] }), o.reclamado ? _jsx("span", { className: "lg-obj-ok", children: "\u2713 Cobrado" })
                                    : _jsx("button", { type: "button", className: "lg-obj-cobrar", disabled: !listo || cobrando === o.clave, onClick: () => void cobrar(o), children: cobrando === o.clave ? "…" : "Cobrar" })] }, o.clave));
                    }) })] }));
    };
    return _jsxs(_Fragment, { children: [grupo("dia", "Objetivos de hoy"), grupo("semana", "Objetivos de la semana"), _jsx("p", { className: "lg-nota", children: "La XP de los objetivos cuenta dentro del tope de 600 XP al d\u00EDa. Completar 10 objetivos te da el logro \u00ABConstante\u00BB." })] });
}
const restante = (iso) => {
    const ms = Math.max(0, Date.parse(iso) - Date.now()), d = Math.floor(ms / 86400e3), h = Math.floor((ms % 86400e3) / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
    return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${Math.max(1, m)} min`;
};
function Detalle({ l, alCerrar, alDestacar }) {
    useEffect(() => {
        const f = (e) => { if (e.key === "Escape")
            alCerrar(); };
        addEventListener("keydown", f);
        return () => removeEventListener("keydown", f);
    }, [alCerrar]);
    return createPortal(_jsx("div", { className: "D az lg-capa", role: "dialog", "aria-modal": "true", "aria-label": l.nombre ?? "Logro", onClick: alCerrar, children: _jsxs("div", { className: `lg-detalle r-${l.rareza}`, onClick: e => e.stopPropagation(), children: [_jsx("button", { type: "button", className: "lg-cerrar", onClick: alCerrar, "aria-label": "Cerrar", children: "\u2715" }), _jsx(Insignia, { l: l, grande: true }), _jsx("span", { className: `lg-rareza r-${l.rareza}`, children: RAREZA_TEXTO[l.rareza] }), _jsx("h2", { children: l.nombre ?? "Logro secreto" }), _jsx("p", { children: l.descripcion ?? `Pista: ${l.pista ?? "descúbrelo jugando."}` }), l.ganado ? _jsxs("p", { className: "lg-ganado", children: ["Ganado el ", fecha(l.ganado)] })
                    : _jsxs("div", { className: "lg-avance grande", children: [_jsx("span", { className: "lg-barra", children: _jsx("i", { style: { width: `${Math.round((100 * l.va) / l.meta)}%` } }) }), _jsxs("small", { children: [l.va, " de ", l.meta] })] }), _jsxs("p", { className: "lg-premio", children: ["Recompensa: ", _jsx("b", { children: l.recompensa ?? "Insignia" })] }), l.ganado && _jsx("button", { type: "button", className: "lg-boton", onClick: alDestacar, children: l.destacado ? "Quitar de destacados" : "★ Destacar en mi perfil" })] }) }), document.body);
}
