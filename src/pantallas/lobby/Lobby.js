import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Lobby estilo fiesta (pedido de Elías del 2026-11-22, referencia LEGO Party): cada quien en su columna de color con su
// figura en el pedestal. El administrador (anfitrión) siempre es P1 rojo; los demás por orden de entrada y género.
// Cada jugador solo elige con cuál de sus 3 figuras juega y da «Listo». El administrador además puede sacar a alguien,
// dar listo por alguien y «Continuar» a la configuración de la partida. Fondo y botones del HUB «La Azotea».
import { useEffect, useRef, useState } from "react";
import { escribirCapsulas, leerCapsulas, apodoDe, useCapsulas, useFoto, N_CAPSULAS } from "../../app/figura3d";
import { ir } from "../../app/rutas";
import { enlace, esLocal, modoLocal } from "../../servicios/enlace";
import { PersonajeLocal } from "./PersonajeLocal";
import { colorDe, varsColor } from "../../app/colorJugador";
import { BotonCast } from "./Cast";
import { ConfigEnVivo, useConfigEnVivo } from "../ConfigEnVivo";
import { nombreJuego } from "../../juegos/general/texto";
import { PodioJuego } from "../../juegos/general/Copas";
import { Marco, aviso, confirmar, useAncho } from "../comun";
import { CUPO_LOBBY, Pedestales, lugaresSala, preparados } from "../SalaEspera";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "./lobby.css";
import { FondoCuarto } from "./Cuarto";
import { claseLobby, LOBBY_NUEVO } from "./version";
import { RuedaFigura } from "../gestos/RuedaFigura";
import { useVidaPropia } from "../../app/vidaPerfil";
import { Confeti, NumeroLetrero, useCelebracion } from "../LetreroVivo";
/** Cabinas por color con pedestal (Elías aprobó el 22 nov; las cápsulas viejas se quitaron el 23 nov). */
const PRUEBA_ESCENARIOS = true;
export function Lobby({ sala, miembros, yo, soyAnfitrion, final, red, refrescar, alSalir, alCopas, copando, pantalla = "desconocida" }) {
    const ancho = useAncho();
    const p = preparados(miembros);
    const fiesta = useCelebracion(miembros.length ? p.todos : null);
    // Vida automática de TU figura (etapa 3): solo este aparato la decide y la manda a la sala; las demás llegan por la red.
    useVidaPropia({ activo: true, jugador: yo, figura: miembros.find(m => m.id === yo)?.figura ?? null, contexto: "lobby" });
    // Tocar tu figura abre la rueda de gestos (reemplaza al botón «Gestos»; Elías, 26 nov).
    const rueda = useRef(null);
    const tocarFigura = (_m, x, y) => rueda.current?.abrir(x, y);
    const hayAdmin = miembros.some(m => m.anfitrion);
    // Modo Local: un solo teléfono; el anfitrión agrega personajes sin cuenta y les cambia la figura.
    const local = esLocal(sala.id);
    const [editar, setEditar] = useState(null);
    const [verResultados, setVerResultados] = useState(true);
    // En línea: «Cambiar figura» abre tus figuras guardadas en un aviso de caja de bloques (igual que en Local, Elías 26 nov).
    const [verFiguras, setVerFiguras] = useState(false);
    // En celulares (sin pantalla), los demás ven en vivo lo que el anfitrión va armando.
    const vivo = useConfigEnVivo(!soyAnfitrion && !local ? sala.id : undefined, pantalla !== "presente");
    const [vivoMin, setVivoMin] = useState(false);
    const listo = (m) => {
        if (m.id === yo)
            void enlace.marcarListo(sala, !m.listo).then(refrescar);
        else
            void enlace.listoDe(sala, m.id, !m.listo).then(ok => { if (!ok)
                aviso("Falta activar esto en el servidor (038)."); refrescar(); });
    };
    const expulsar = async (m) => {
        if (!(await confirmar({ titulo: `¿Sacar a ${m.nombre} del lobby?`, si: "Sacar", peligro: true, ...(LOBBY_NUEVO ? { lobby: colorDe(m.id, miembros.map(x => x.id)) } : {}) })))
            return;
        const ok = await enlace.expulsar(sala, m.id);
        if (!ok)
            aviso("Falta activar esto en el servidor (038).");
        refrescar();
    };
    const ico = (n) => `${import.meta.env.BASE_URL}arte/lobby/${n}.webp`;
    // Botones redondos del administrador sobre la cápsula de cada jugador (como X / Y de la referencia).
    const botonesAdmin = (m) => soyAnfitrion && m.id !== yo ? (local ? _jsxs("span", { className: "lb-redondos", children: [_jsx("button", { type: "button", className: "lb-redondo", onClick: () => setEditar({ tipo: "figura", m }), "aria-label": `Cambiar la figura de ${m.nombre}`, title: "Cambiar figura", children: _jsx("img", { src: ico("ico-cambiar-figura"), alt: "" }) }), _jsx("button", { type: "button", className: "lb-redondo peligro", onClick: () => void expulsar(m), "aria-label": `Quitar a ${m.nombre}`, title: "Quitar", children: _jsx("img", { src: ico("ico-sacar"), alt: "" }) })] }) :
        _jsxs("span", { className: "lb-redondos", children: [_jsx("button", { type: "button", className: "lb-redondo" + (m.listo ? " activo" : ""), onClick: () => listo(m), "aria-label": m.listo ? `Quitar el listo a ${m.nombre}` : `Dar listo por ${m.nombre}`, title: m.listo ? "Quitar listo" : "Dar listo", children: _jsx("img", { src: ico("ico-dar-listo"), alt: "" }) }), _jsx("button", { type: "button", className: "lb-redondo peligro", onClick: () => void expulsar(m), "aria-label": `Sacar a ${m.nombre} del lobby`, title: "Sacar del lobby", children: _jsx("img", { src: ico("ico-sacar"), alt: "" }) })] })) : null;
    // Tu selector dentro de tu cápsula: figura y «¡Listo!». Al administrador, además, opciones a un lado y «Continuar»
    // cuando todos están listos.
    const miPanel = (m) => m.id !== yo ? null : (_jsxs("div", { className: "lb-panel", children: [soyAnfitrion && p.todos ? (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "lb-continuar", onClick: () => ir("configurar", sala.codigo), children: [_jsx("span", { children: "Continuar" }), _jsx("small", { children: "Todos listos: arma la partida" })] }), _jsx("button", { type: "button", className: "lb-mini lb-quitar-listo", onClick: () => listo(m), children: "Ya no estoy listo" })] })) : (_jsxs(_Fragment, { children: [local ? _jsx("button", { type: "button", className: "lb-mini", onClick: () => setEditar({ tipo: "figura", m }), children: "Cambiar figura" })
                        : _jsx("button", { type: "button", className: "lb-mini", onClick: () => setVerFiguras(true), children: "Cambiar figura" }), _jsxs("button", { type: "button", className: "lb-listo" + (m.listo ? " quitar" : ""), onClick: () => listo(m), children: [!m.listo && _jsx("img", { src: ico("ico-listo"), alt: "" }), m.listo ? "Ya no estoy listo" : "¡Listo!"] })] })), soyAnfitrion && _jsx(OpcionesAdmin, { copando: copando, alCopas: alCopas, alCerrar: alSalir })] }));
    // Local: «Agregar jugador» en el primer lugar libre (hasta 8).
    const libreLocal = local && soyAnfitrion ? (i) => (i === miembros.length && miembros.length < CUPO_LOBBY
        ? _jsx("button", { type: "button", className: "lb-agregar", onClick: () => setEditar({ tipo: "nuevo" }), children: _jsxs("b", { children: [_jsx("span", { children: "\uFF0B" }), "Agregar jugador"] }) }) : null) : undefined;
    const guardarPersonaje = (d) => {
        if (editar?.tipo === "nuevo") {
            if (!modoLocal.agregar(sala, d))
                aviso("No se pudo agregar (máximo 8).");
        }
        else if (editar?.tipo === "figura")
            modoLocal.figura(sala, editar.m.id, d.figura);
        setEditar(null);
        refrescar();
    };
    return (_jsxs(Marco, { clase: "az lb" + claseLobby, fondo: _jsx(FondoCuarto, {}), children: [_jsxs("div", { className: "lb-caja", children: [_jsxs("header", { className: "lb-top", children: [_jsxs("button", { type: "button", className: "pf-atras" + (soyAnfitrion ? " lb-atras-anf" : ""), onClick: alSalir, children: [_jsx("span", { "aria-hidden": "true", children: "\u25C0" }), local ? "Terminar" : soyAnfitrion ? "Cerrar" : "Salir"] }), _jsxs("div", { className: "lb-banner" + (p.todos ? " todos" : "") + (fiesta ? " mov-celebra" : ""), role: "status", "aria-live": "polite", children: [_jsxs(NumeroLetrero, { valor: miembros.length, children: [miembros.length, "/", CUPO_LOBBY] }), _jsx("span", { className: "lb-banner-t", children: p.todos ? "¡Todos listos!" : `${p.listos} listo${p.listos === 1 ? "" : "s"}` }), local && _jsx("small", { className: "lb-banner-s", children: "Modo local \u00B7 un solo tel\u00E9fono" }), !soyAnfitrion && _jsx("small", { className: "lb-banner-s", children: !hayAdmin ? "Esperando al administrador" : p.todos ? "El administrador arma la partida" : "Elige tu figura y da ¡Listo!" })] }), fiesta && _jsx(Confeti, {}), _jsx("span", { className: "lb-red", children: red === "vivo" ? "" : red === "respaldo" ? "Reconectando…" : "Conectando…" }), soyAnfitrion && !local && _jsx(BotonCast, { sala: sala, pantalla: pantalla, className: "lb-cast" })] }), final && verResultados && (_jsxs("section", { className: "lb-resultados", "aria-label": "Resultados de la partida anterior", children: [_jsxs("div", { className: "lb-res-tit", children: [_jsxs("b", { children: ["Resultados \u00B7 ", nombreJuego(final.juegoId)] }), _jsx("button", { type: "button", className: "lb-mini", onClick: () => setVerResultados(false), children: "Ocultar" })] }), _jsx(PodioJuego, { v: final, miembros: miembros, modo: "celular" })] })), ancho ? (_jsx("section", { className: "lb-escenario", style: { "--lugares": lugaresSala(miembros.length, local) }, children: _jsx(Pedestales, { miembros: miembros, yo: yo, className: "lb-pedestales", fiesta: { arriba: botonesAdmin, abajo: miPanel, escenarios: PRUEBA_ESCENARIOS, libre: libreLocal, tocar: tocarFigura }, vida: "lobby" }) })) : (_jsx(Carrusel, { lugares: lugaresSala(miembros.length, local), ids: miembros.map(m => m.id), yo: yo, children: _jsx(Pedestales, { miembros: miembros, yo: yo, className: "lb-pedestales", fiesta: { arriba: botonesAdmin, abajo: miPanel, escenarios: PRUEBA_ESCENARIOS, libre: libreLocal, tocar: tocarFigura }, vida: "lobby" }) }))] }), _jsx(RuedaFigura, { ref: rueda, jugador: yo, figura: miembros.find(m => m.id === yo)?.figura, pistaSobre: ".lb-rot.yo .lb-toca" }), vivo && _jsx("div", { className: "cv-lobby" + (vivoMin ? " min" : ""), role: "button", tabIndex: 0, "aria-expanded": !vivoMin, onClick: () => setVivoMin(x => !x), onKeyDown: e => { if (e.key === "Enter" || e.key === " ")
                    setVivoMin(x => !x); }, children: _jsx(ConfigEnVivo, { e: vivo }) }), verFiguras && (_jsx("div", { className: "a-velo", onClick: () => setVerFiguras(false), children: _jsxs("div", { className: "d-pnl a-dialogo lbn-dlg lb-figs-dlg", style: varsColor(colorDe(yo, miembros.map(x => x.id))), role: "dialog", "aria-modal": "true", "aria-label": "Tu figura", onClick: e => e.stopPropagation(), children: [_jsx("span", { className: "dsp ol a-t2", children: "Tu figura" }), _jsx(ElegirFigura, { uid: yo, alCambiar: refrescar, bloqueado: !!miembros.find(x => x.id === yo)?.listo }), _jsxs("div", { className: "a-fila", children: [_jsx("button", { type: "button", className: "a-plano", onClick: () => ir("personalizar"), children: "Personalizar" }), _jsx("button", { type: "button", className: "d-btn k-yel", autoFocus: true, onClick: () => setVerFiguras(false), children: _jsx("span", { className: "dsp", children: "Cerrar" }) })] })] }) })), editar && _jsx(PersonajeLocal, { titulo: editar.tipo === "nuevo" ? "Nuevo jugador" : `Figura de ${editar.m.nombre}`, soloFigura: editar.tipo === "figura", inicial: editar.tipo === "figura" ? { figura: editar.m.figura, nombre: editar.m.nombre } : undefined, color: editar.tipo === "figura" ? colorDe(editar.m.id, miembros.map(x => x.id)) : undefined, alListo: guardarPersonaje, alCerrar: () => setEditar(null) })] }));
}
/** Celular: las cabinas en fila, una por pantalla; arranca en la tuya y muestra puntos de posición. */
function Carrusel({ lugares, ids, yo, children }) {
    const ref = useRef(null);
    const [actual, setActual] = useState(Math.max(0, ids.indexOf(yo)));
    const mio = ids.indexOf(yo);
    useEffect(() => { const el = ref.current; if (el && mio >= 0)
        el.scrollLeft = mio * el.clientWidth; }, [mio]);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const f = () => setActual(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        el.addEventListener("scroll", f, { passive: true });
        return () => el.removeEventListener("scroll", f);
    }, []);
    return (_jsxs(_Fragment, { children: [_jsx("section", { ref: ref, className: "lb-escenario lb-carrusel", "aria-label": "Cabinas del lobby: desliza para ver a los dem\u00E1s", children: _jsx("div", { className: "lb-pista", style: { "--lugares": lugares }, children: children }) }), _jsx("div", { className: "lb-puntos-cel", "aria-hidden": "true", children: Array.from({ length: lugares }, (_, i) => _jsx("i", { className: i === actual ? "si" : "" }, i)) })] }));
}
/** Opciones del administrador a un lado de su selector: finalizar la sesión con copas y cerrar el lobby (proyectar ya es el botón «cast» de arriba). */
function OpcionesAdmin({ copando, alCopas, alCerrar }) {
    const [abierto, setAbierto] = useState(false);
    return (_jsxs("div", { className: "lb-opciones" + (abierto ? " abierto" : ""), children: [_jsx("button", { type: "button", className: "lb-opc-tab", onClick: () => setAbierto(a => !a), "aria-expanded": abierto, children: abierto ? "Cerrar ›" : "‹ Opciones" }), abierto && _jsxs("div", { className: "lb-opc-lista", children: [_jsxs("button", { type: "button", className: "lb-sec", disabled: copando, onClick: alCopas, children: [copando ? "Entregando…" : "Finalizar sesión", _jsx("small", { children: "Entrega las copas" })] }), _jsx("button", { type: "button", className: "lb-sec peligro", onClick: alCerrar, children: "Cerrar lobby" })] })] }));
}
/** Tus 3 figuras guardadas en carrusel con flechas: la elegida es con la que juegas (la misma que en Personalizar). */
function ElegirFigura({ uid, alCambiar, bloqueado }) {
    const caps = useCapsulas(uid);
    const llenas = caps.slots.map((c, i) => ({ c, i })).filter(x => x.c);
    const pos = Math.max(0, llenas.findIndex(x => x.i === caps.activa));
    const elegir = (i) => {
        if (bloqueado || i === caps.activa || !caps.slots[i])
            return;
        escribirCapsulas(uid, { ...leerCapsulas(uid), activa: i });
        void enlace.activarCapsula(i + 1).then(alCambiar);
    };
    const paso = (d) => { if (llenas.length > 1)
        elegir(llenas[(pos + d + llenas.length) % llenas.length].i); };
    if (!llenas.length)
        return _jsx("button", { type: "button", className: "lb-mini", onClick: () => ir("personalizar"), children: "Crear tu figura" });
    return (_jsxs("div", { className: "lb-figs" + (bloqueado ? " bloqueado" : ""), role: "group", "aria-label": "Elige tu figura", children: [_jsxs("small", { children: ["Tu figura (", llenas.length, "/", N_CAPSULAS, ")"] }), _jsxs("div", { className: "lb-figs-fila", children: [_jsx("button", { type: "button", className: "lb-flecha", onClick: () => paso(-1), disabled: bloqueado || llenas.length < 2, "aria-label": "Figura anterior", children: "\u2039" }), caps.slots.map((c, i) => c && _jsx(Miniatura, { figura: c.figura, activa: caps.activa === i, nombre: apodoDe(c.figura) ?? (c.nombre || `Figura ${i + 1}`), onClick: () => elegir(i), bloqueado: bloqueado }, i)), _jsx("button", { type: "button", className: "lb-flecha", onClick: () => paso(1), disabled: bloqueado || llenas.length < 2, "aria-label": "Figura siguiente", children: "\u203A" })] })] }));
}
function Miniatura({ figura, activa, nombre, onClick, bloqueado }) {
    const foto = useFoto(figura, undefined, "busto");
    return (_jsx("button", { type: "button", className: "lb-mini-fig" + (activa ? " activa" : ""), onClick: onClick, disabled: bloqueado && !activa, "aria-pressed": activa, "aria-label": activa ? `${nombre}, con la que juegas` : `Jugar con ${nombre}`, children: foto ? _jsx("img", { src: foto, alt: "", draggable: false }) : _jsx("span", { className: "lb-cargando" }) }));
}
