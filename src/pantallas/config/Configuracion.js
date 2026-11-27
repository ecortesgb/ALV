import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Configuración (ALV_PLAN_CONFIGURACION.md, etapa 1, aprobada por Elías el 2026-11-22) con el lenguaje del HUB «La Azotea».
// Mi cuenta · Mi experiencia · Administración (solo administradores; el servidor valida cada función) · Acerca de ALV.
// Las preferencias se aplican al momento en este aparato (app/preferencias.ts) y, con sesión, se guardan en la cuenta
// (migración 039, servicios/preferencias.ts). Nombre visible y borrar cuentas también son de la 039. Sin botones que no hagan nada.
import { useEffect, useState } from "react";
import { figuraActiva, apodoDe, semillaDe, useCapsulas, useFoto } from "../../app/figura3d";
import { cambiarPreferencias, hayVibracion, usePreferencias } from "../../app/preferencias";
import { atras, href, ir, useRuta } from "../../app/rutas";
import { refrescarSesion, salirDemo, useSesion } from "../../app/sesion";
import { fijarEfectos, fijarVolumenEfectos } from "../../app/sonido";
import { CREDITOS, SECCIONES_TERMINOS, TERMINOS_ACTUALIZADOS } from "../../content/terminos";
import { tituloPorNivel } from "../../engine/economia";
import { hayMusica } from "../../app/musica";
import { adminAjustarXp, adminBorrarCuenta, adminBorrarInvitados, adminJugadores, restablecerClave } from "../../servicios/admin";
import { hayNube } from "../../servicios/cliente";
import { cambiarClaveConActual, salir, salirDeTodos, ultimoInicio } from "../../servicios/cuenta";
import { borrarMiCuenta, cambiarNombreVisible, nombreDeUsuario } from "../../servicios/preferencias";
import { Marco, aviso, confirmar, useAncho } from "../comun";
import { useRecursos } from "../Recursos";
import { RecursosAzotea, arteHub } from "../azotea/Cabecera";
import { EscenarioFondo } from "../azotea/Escenario";
import { useMomentoAzotea } from "../azotea/HubAzotea";
import { escenarioActual } from "../azotea/paquetes";
import { Deslizador, Fila, Interruptor, Segmentado } from "./controles";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import "./config.css";
const BASE = import.meta.env.BASE_URL;
export function Configuracion({ forzar }) {
    const s = useSesion();
    const r = useRecursos();
    const ancho = useAncho();
    const ruta = useRuta();
    const momento = useMomentoAzotea();
    const esc = escenarioActual();
    const categorias = [
        { id: "cuenta", titulo: "Mi cuenta", sub: "Perfil, contraseña y seguridad", arte: "cfg-cuenta", alterno: arteHub("icono-personalizar") },
        { id: "experiencia", titulo: "Mi experiencia", sub: "Sonido, vibración, animaciones y pantalla", arte: "cfg-experiencia", alterno: arteHub("ajustes") },
        ...(s.admin ? [{ id: "admin", titulo: "Administración", sub: "Cuentas, XP y contraseñas", arte: "cfg-juego", alterno: `${BASE}arte/lobby/ico-corona.webp` }] : []),
        { id: "acerca", titulo: "Acerca de ALV", sub: "Versión, términos y privacidad", arte: "cfg-acerca" },
    ];
    const pedida = (forzar ?? ruta.arg);
    const valida = categorias.some(c => c.id === pedida) ? pedida : undefined;
    // En computadora siempre hay una categoría abierta; en celular, sin categoría se ve la lista.
    const abierta = valida ?? (ancho ? "cuenta" : undefined);
    const info = categorias.find(c => c.id === abierta);
    // Cambiar de categoría reemplaza la página en el historial: «Atrás» regresa de una vez a donde estabas (no recorre cada toque).
    const abrir = (c) => location.replace(href("ajustes", c));
    const volver = () => { if (!ancho && abierta && !forzar)
        abrir();
    else
        atras(); };
    return (_jsx(Marco, { clase: `az pf cf m-${momento}`, fondo: _jsx("div", { className: "cf-fondo", children: _jsx(EscenarioFondo, { ambiente: esc.ambientes[momento], momento: momento, velo: esc.velo }) }), children: _jsxs("div", { className: "cf-caja", children: [_jsxs("header", { className: "pf-top cf-top", children: [_jsxs("button", { type: "button", className: "pf-atras", onClick: volver, children: [_jsx("span", { "aria-hidden": "true", children: "\u25C0" }), "Atr\u00E1s"] }), _jsx(RecursosAzotea, { monedas: r.monedas, puntos: r.puntos })] }), _jsx("h1", { className: "pf-tit cf-titulo", children: _jsx("span", { children: !ancho && info ? info.titulo : "Configuración" }) }), _jsxs("div", { className: "cf-cuerpo" + (ancho ? " dos" : ""), children: [(ancho || !abierta) && (_jsx("nav", { className: "cf-nav", "aria-label": "Categor\u00EDas", children: categorias.map(c => (_jsxs("button", { type: "button", className: "cf-cat" + (c.id === abierta && ancho ? " on" : ""), "aria-current": c.id === abierta && ancho ? "page" : undefined, onClick: () => abrir(c.id), children: [_jsx("span", { className: "cf-cat-ico", children: _jsx(Arte, { nombre: c.arte, alterno: c.alterno }) }), _jsxs("span", { className: "cf-cat-txt", children: [_jsx("b", { children: c.titulo }), _jsx("small", { children: c.sub })] }), _jsx("span", { className: "cf-cat-flecha", "aria-hidden": "true", children: "\u203A" })] }, c.id))) })), abierta && (_jsxs("section", { className: "cf-panel", "aria-label": info?.titulo, children: [abierta === "cuenta" && _jsx(PanelCuenta, {}), abierta === "experiencia" && _jsx(PanelExperiencia, {}), abierta === "admin" && _jsx(PanelAdmin, {}), abierta === "acerca" && _jsx(PanelAcerca, {})] }, abierta))] })] }) }));
}
// ---------- Piezas comunes ----------
/** Iconos: primero el arte de Elías (public/arte/ui/config/<nombre>.webp); mientras no llega, el alterno o nada. */
const faltan = new Set();
function Arte({ nombre, alterno }) {
    const [falta, setFalta] = useState(() => faltan.has(nombre));
    if (falta && !alterno)
        return null;
    return _jsx("img", { src: falta ? alterno : `${BASE}arte/ui/config/${nombre}.webp`, alt: "", draggable: false, onError: () => { if (!falta) {
            faltan.add(nombre);
            setFalta(true);
        } } });
}
function RetratoCuenta() {
    const s = useSesion();
    const f = figuraActiva(useCapsulas(s.uid));
    const foto = useFoto(f, f ? undefined : semillaDe(s.uid), "busto");
    return foto ? _jsx("img", { className: "cf-retrato", src: foto, alt: "", draggable: false }) : _jsx("span", { className: "cf-retrato vacio" });
}
function Bloque({ titulo, children, nota }) {
    return (_jsxs("section", { className: "pf-bloque cf-bloque", "aria-label": titulo, children: [_jsx("h2", { className: "pf-tit", children: _jsx("span", { children: titulo }) }), children, nota && _jsx("p", { className: "pf-suave cf-nota", children: nota })] }));
}
function Boton({ children, onClick, tipo = "normal", desactivado, submit }) {
    return _jsx("button", { type: submit ? "submit" : "button", className: `cf-boton ${tipo}`, onClick: onClick, disabled: desactivado, children: children });
}
function CampoClave({ etiqueta, valor, alCambiar, auto }) {
    const [ver, setVer] = useState(false);
    return (_jsxs("label", { className: "cf-campo", children: [_jsx("span", { children: etiqueta }), _jsxs("span", { className: "cf-campo-caja", children: [_jsx("input", { type: ver ? "text" : "password", value: valor, onChange: e => alCambiar(e.target.value), autoComplete: auto, maxLength: 72 }), _jsx("button", { type: "button", className: "cf-ojo", onClick: () => setVer(!ver), "aria-label": ver ? "Ocultar contraseña" : "Ver contraseña", "aria-pressed": ver, children: ver ? "Ocultar" : "Ver" })] })] }));
}
const fecha = (iso) => new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
// ---------- Mi cuenta ----------
function PanelCuenta() {
    const s = useSesion();
    const r = useRecursos();
    const f = figuraActiva(useCapsulas(s.uid));
    const apodo = apodoDe(f);
    const [ultimo, setUltimo] = useState(null);
    useEffect(() => { if (hayNube && !s.invitado)
        void ultimoInicio().then(setUltimo); }, [s.invitado]);
    const cerrar = async () => {
        if (s.invitado && hayNube && !(await confirmar({ titulo: "¿Salir de la prueba?", texto: "Entraste sin cuenta: al salir no podrás volver a este apodo ni a su XP.", si: "Salir", peligro: true })))
            return;
        if (hayNube) {
            await salir();
            await refrescarSesion();
        }
        else
            salirDemo();
        ir("inicio");
    };
    const cerrarTodos = async () => {
        if (!(await confirmar({ titulo: "¿Cerrar sesión en todos tus aparatos?", texto: "Se cierra aquí y en cualquier celular, tablet o TV donde hayas entrado con esta cuenta.", si: "Cerrar en todos", peligro: true })))
            return;
        if (!(await salirDeTodos())) {
            aviso("No se pudo cerrar. Intenta otra vez.");
            return;
        }
        await refrescarSesion();
        ir("inicio");
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "cf-perfil", children: [_jsx("span", { className: "cf-perfil-foto", children: _jsx(RetratoCuenta, {}) }), _jsxs("span", { className: "cf-perfil-txt", children: [_jsx("b", { children: apodo ?? s.nombre }), _jsxs("small", { children: ["@", s.nombre, " \u00B7 Nivel ", r.nivel, " \u00B7 ", tituloPorNivel(r.nivel), s.invitado ? " · Prueba" : ""] })] }), _jsx(Boton, { onClick: () => ir("perfil"), children: "Ver perfil" })] }), !hayNube ? (_jsx(Bloque, { titulo: "Cuenta", children: _jsx("p", { className: "pf-suave", children: "Est\u00E1s en modo demostraci\u00F3n: no hay cuenta en la nube." }) })) : s.invitado ? (_jsx(Bloque, { titulo: "Cuenta", children: _jsx("p", { className: "pf-suave", children: "Entraste de prueba: tu XP y tu figura se borran cuando terminen las pruebas. Para conservarlas, crea una cuenta." }) })) : (_jsxs(_Fragment, { children: [_jsxs(Bloque, { titulo: "Datos de la cuenta", children: [_jsx(Fila, { titulo: "Nombre de usuario", ayuda: "Con este nombre entras a ALV. No se puede cambiar.", control: _jsxs("span", { className: "cf-dato", children: ["@", nombreDeUsuario() ?? s.nombre] }) }), _jsx(Fila, { titulo: "Correo", ayuda: s.admin ? "Tu cuenta no usa correo. Si olvidas tu contraseña, se cambia desde el panel de Supabase." : "Tu cuenta no usa correo. Si olvidas tu contraseña, pídele una nueva al administrador.", control: _jsx("span", { className: "cf-dato suave", children: "Sin correo" }) })] }), _jsx(FormNombre, {}), _jsx(FormClave, {}), _jsxs(Bloque, { titulo: "Seguridad", children: [_jsx(Fila, { titulo: "\u00DAltimo inicio de sesi\u00F3n", control: _jsx("span", { className: "cf-dato", children: ultimo ? fecha(ultimo) : "…" }) }), _jsx(Fila, { titulo: "Todos tus aparatos", ayuda: "Cierra tu sesi\u00F3n en cualquier aparato donde hayas entrado, tambi\u00E9n en este.", control: _jsx(Boton, { tipo: "peligro", onClick: () => void cerrarTodos(), children: "Cerrar en todos" }) })] }), _jsx(BorrarCuenta, {})] })), _jsx(Boton, { tipo: "peligro", onClick: () => void cerrar(), children: s.invitado ? "Salir de la prueba" : "Cerrar sesión" })] }));
}
function FormNombre() {
    const s = useSesion();
    const [nombre, setNombre] = useState(s.nombre), [ocupado, setOcupado] = useState(false);
    useEffect(() => setNombre(s.nombre), [s.nombre]);
    const limpio = nombre.replace(/\s+/g, " ").trim();
    const listo = limpio.length >= 2 && limpio.length <= 20 && limpio !== s.nombre && !ocupado;
    const enviar = async (e) => {
        e?.preventDefault();
        if (!listo)
            return;
        setOcupado(true);
        const r = await cambiarNombreVisible(limpio);
        setOcupado(false);
        if (r.error) {
            aviso(r.error);
            return;
        }
        aviso("Nombre cambiado");
        await refrescarSesion();
    };
    return (_jsx(Bloque, { titulo: "Nombre visible", nota: "Es el nombre que ven los dem\u00E1s en la sala, el ranking y la TV. No cambia el nombre con el que entras.", children: _jsxs("form", { className: "cf-form cf-form-linea", onSubmit: e => void enviar(e), children: [_jsxs("label", { className: "cf-campo", children: [_jsx("span", { children: "Tu nombre" }), _jsx("span", { className: "cf-campo-caja", children: _jsx("input", { value: nombre, onChange: e => setNombre(e.target.value), maxLength: 20, autoComplete: "nickname" }) })] }), _jsx(Boton, { tipo: "principal", submit: true, desactivado: !listo, children: ocupado ? "Guardando…" : "Guardar" })] }) }));
}
function BorrarCuenta() {
    const s = useSesion();
    const usuario = nombreDeUsuario() ?? "";
    const [abierto, setAbierto] = useState(false), [texto, setTexto] = useState(""), [ocupado, setOcupado] = useState(false);
    const coincide = !!usuario && texto.trim().toLowerCase() === usuario.toLowerCase();
    const borrar = async (e) => {
        e?.preventDefault();
        if (!coincide || ocupado)
            return;
        if (!(await confirmar({ titulo: "¿Borrar tu cuenta para siempre?", texto: "Se borran tus figuras, tu XP, tus monedas, tus piezas y tu lugar en las partidas. No se puede deshacer.", si: "Borrar mi cuenta", peligro: true })))
            return;
        setOcupado(true);
        const r = await borrarMiCuenta(texto.trim());
        setOcupado(false);
        if (r) {
            aviso(r);
            return;
        }
        await salir();
        await refrescarSesion();
        aviso("Tu cuenta se borró");
        ir("inicio");
    };
    return (_jsxs(Bloque, { titulo: "Eliminar cuenta", children: [_jsxs("p", { className: "pf-suave", children: ["Se borra todo: figuras, XP, monedas, piezas, preferencias y tu lugar en salas y partidas. No se puede deshacer.", s.admin ? " Si eres el único administrador, no se puede borrar." : ""] }), !abierto ? _jsx(Boton, { tipo: "peligro", onClick: () => setAbierto(true), children: "Eliminar mi cuenta" }) : (_jsxs("form", { className: "cf-form", onSubmit: e => void borrar(e), children: [_jsxs("label", { className: "cf-campo", children: [_jsxs("span", { children: ["Para confirmar, escribe tu nombre de usuario: ", _jsx("b", { children: usuario })] }), _jsx("span", { className: "cf-campo-caja", children: _jsx("input", { value: texto, onChange: e => setTexto(e.target.value), maxLength: 30, autoComplete: "off", autoCapitalize: "none", spellCheck: false }) })] }), _jsxs("div", { className: "cf-legal", children: [_jsx(Boton, { tipo: "peligro", submit: true, desactivado: !coincide || ocupado, children: ocupado ? "Borrando…" : "Borrar para siempre" }), _jsx(Boton, { onClick: () => { setAbierto(false); setTexto(""); }, children: "Cancelar" })] })] }))] }));
}
function FormClave() {
    const [actual, setActual] = useState(""), [nueva, setNueva] = useState(""), [otra, setOtra] = useState(""), [ocupado, setOcupado] = useState(false);
    const error = nueva && nueva.length < 8 ? "La contraseña nueva lleva 8 o más caracteres." : otra && otra !== nueva ? "Las dos contraseñas nuevas no son iguales." : null;
    const listo = actual.length > 0 && nueva.length >= 8 && otra === nueva && !ocupado;
    const enviar = async (e) => {
        e?.preventDefault();
        if (!listo)
            return;
        setOcupado(true);
        const r = await cambiarClaveConActual(actual, nueva);
        setOcupado(false);
        aviso(r ?? "Contraseña cambiada");
        if (!r) {
            setActual("");
            setNueva("");
            setOtra("");
        }
    };
    return (_jsx(Bloque, { titulo: "Contrase\u00F1a", children: _jsxs("form", { className: "cf-form", onSubmit: e => void enviar(e), children: [_jsx(CampoClave, { etiqueta: "Contrase\u00F1a actual", valor: actual, alCambiar: setActual, auto: "current-password" }), _jsx(CampoClave, { etiqueta: "Contrase\u00F1a nueva (8 o m\u00E1s)", valor: nueva, alCambiar: setNueva, auto: "new-password" }), _jsx(CampoClave, { etiqueta: "Repite la contrase\u00F1a nueva", valor: otra, alCambiar: setOtra, auto: "new-password" }), error && _jsx("p", { className: "cf-error", role: "alert", children: error }), _jsx(Boton, { tipo: "principal", submit: true, desactivado: !listo, children: ocupado ? "Cambiando…" : "Cambiar contraseña" })] }) }));
}
// ---------- Mi experiencia ----------
const CALIDADES = [{ id: "auto", texto: "Auto" }, { id: "alta", texto: "Alta" }, { id: "media", texto: "Media" }, { id: "baja", texto: "Baja" }];
const LETRAS = [{ id: "normal", texto: "Normal" }, { id: "grande", texto: "Grande" }];
function PanelExperiencia() {
    const p = usePreferencias();
    const [vol, setVol] = useState(p.volumenEfectos);
    useEffect(() => setVol(p.volumenEfectos), [p.volumenEfectos]);
    const [volM, setVolM] = useState(p.volumenMusica);
    useEffect(() => setVolM(p.volumenMusica), [p.volumenMusica]);
    const s = useSesion();
    const enCuenta = hayNube && s.fase === "dentro";
    const sistemaQuieto = useSistemaQuieto();
    const completa = usePantallaCompleta();
    return (_jsxs(_Fragment, { children: [_jsxs(Bloque, { titulo: "Sonido", children: [_jsx(Fila, { titulo: "Efectos de sonido", ayuda: "Clics, cartas, tiempo y premios.", control: _jsx(Interruptor, { valor: p.efectos, alCambiar: fijarEfectos, etiqueta: "Efectos de sonido" }) }), _jsx(Fila, { titulo: "Volumen de efectos", control: _jsx(Deslizador, { valor: vol, desactivado: !p.efectos, etiqueta: "Volumen de efectos", alCambiar: setVol, alSoltar: fijarVolumenEfectos }) }), hayMusica && _jsxs(_Fragment, { children: [_jsx(Fila, { titulo: "M\u00FAsica de fondo", ayuda: "Pantalla de carga, HUB y men\u00FAs.", control: _jsx(Interruptor, { valor: p.musica, alCambiar: v => cambiarPreferencias({ musica: v }), etiqueta: "M\u00FAsica de fondo" }) }), _jsx(Fila, { titulo: "Volumen de m\u00FAsica", control: _jsx(Deslizador, { valor: volM, desactivado: !p.musica, etiqueta: "Volumen de m\u00FAsica", alCambiar: v => { setVolM(v); cambiarPreferencias({ volumenMusica: v }); } }) })] })] }), hayVibracion() && (_jsx(Bloque, { titulo: "Vibraci\u00F3n", children: _jsx(Fila, { titulo: "Vibrar", ayuda: "En tu turno, al revelar, cuando se acaba el tiempo y al abrir sobres.", control: _jsx(Interruptor, { valor: p.vibracion, alCambiar: v => cambiarPreferencias({ vibracion: v }), etiqueta: "Vibraci\u00F3n" }) }) })), _jsxs(Bloque, { titulo: "Movimiento y gr\u00E1ficos", children: [_jsx(Fila, { titulo: "Animaciones", ayuda: sistemaQuieto ? "Tu aparato pide menos movimiento: se reducen aunque esto esté encendido." : "Apágalas si te marean o para ahorrar batería.", control: _jsx(Interruptor, { valor: p.animaciones, alCambiar: v => cambiarPreferencias({ animaciones: v }), etiqueta: "Animaciones" }) }), _jsx(Fila, { titulo: "Calidad gr\u00E1fica", ayuda: "Figura del inicio y del perfil. Auto la baja sola si el aparato va lento; Baja gasta menos bater\u00EDa.", control: _jsx(Segmentado, { valor: p.calidad, opciones: CALIDADES, alCambiar: v => cambiarPreferencias({ calidad: v }), etiqueta: "Calidad gr\u00E1fica" }) })] }), _jsxs(Bloque, { titulo: "Pantalla", nota: enCuenta ? "Se guarda en tu cuenta y vuelve al iniciar sesión en otro aparato. La calidad gráfica y la pantalla completa son de cada aparato." : "Todo esto se guarda en este aparato.", children: [completa.puede && _jsx(Fila, { titulo: "Pantalla completa", control: _jsx(Interruptor, { valor: completa.activa, alCambiar: completa.cambiar, etiqueta: "Pantalla completa" }) }), _jsx(Fila, { titulo: "Tama\u00F1o de letra", control: _jsx(Segmentado, { valor: p.letra, opciones: LETRAS, alCambiar: v => cambiarPreferencias({ letra: v }), etiqueta: "Tama\u00F1o de letra" }) }), _jsx(Fila, { titulo: "Modo TV", ayuda: "Agranda textos y botones cuando este aparato es la pantalla de la sala.", control: _jsx(Interruptor, { valor: p.modoTV, alCambiar: v => cambiarPreferencias({ modoTV: v }), etiqueta: "Modo TV" }) })] })] }));
}
function useSistemaQuieto() {
    const [q, setQ] = useState(false);
    useEffect(() => {
        // Se pregunta al sistema con la consulta original (sin el interruptor de la app): por eso se compara con «no-preference».
        const m = matchMedia("(prefers-reduced-motion: no-preference)");
        const f = () => setQ(!m.matches);
        f();
        m.addEventListener("change", f);
        return () => m.removeEventListener("change", f);
    }, []);
    return q;
}
function usePantallaCompleta() {
    const [activa, setActiva] = useState(() => !!document.fullscreenElement);
    useEffect(() => {
        const f = () => setActiva(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", f);
        return () => document.removeEventListener("fullscreenchange", f);
    }, []);
    const cambiar = (v) => {
        if (!v) {
            if (document.fullscreenElement)
                void document.exitFullscreen();
            return;
        }
        void document.documentElement.requestFullscreen?.().catch(() => aviso("Este navegador no deja usar pantalla completa."));
    };
    return { activa, cambiar, puede: !!document.fullscreenEnabled };
}
// ---------- Administración ----------
function PanelAdmin() {
    const s = useSesion();
    const [cuentas, setCuentas] = useState(undefined);
    const [abierta, setAbierta] = useState(null), [clave, setClave] = useState(""), [busca, setBusca] = useState("");
    const leer = () => void adminJugadores().then(setCuentas);
    useEffect(() => { if (s.admin)
        leer(); }, [s.admin]);
    if (!s.admin)
        return _jsx(Bloque, { titulo: "Administraci\u00F3n", children: _jsx("p", { className: "pf-suave", children: "Tu cuenta no tiene este permiso." }) });
    const xp = async (c, n) => {
        if (!(await confirmar({ titulo: `${n > 0 ? "Dar" : "Quitar"} ${Math.abs(n)} XP a ${c.nombre}`, si: "Confirmar", peligro: n < 0 })))
            return;
        const r = await adminAjustarXp(c.id, n, "ajuste de administrador");
        aviso(r ?? "XP ajustada");
        leer();
    };
    const poner = async (c, e) => {
        e?.preventDefault();
        if (clave.length < 8)
            return;
        if (!(await confirmar({ titulo: `¿Cambiar la contraseña de ${c.nombre}?`, texto: "La anterior deja de servir.", si: "Cambiar", peligro: true })))
            return;
        const r = await restablecerClave(c.id, clave);
        aviso(r ?? "Contraseña cambiada");
        if (!r) {
            setClave("");
            setAbierta(null);
        }
    };
    const borrarCuenta = async (c) => {
        if (!(await confirmar({ titulo: `¿Borrar la cuenta de ${c.nombre}?`, texto: "Se borran sus figuras, su XP, sus monedas, sus piezas y su lugar en las partidas. Las salas que abrió también. No se puede deshacer.", si: "Borrar cuenta", peligro: true })))
            return;
        const r = await adminBorrarCuenta(c.id);
        aviso(r ?? `Se borró la cuenta de ${c.nombre}`);
        leer();
    };
    const borrarInvitados = async () => {
        if (!(await confirmar({ titulo: "¿Borrar a todos los invitados?", texto: "Se borran sus cuentas, su XP, sus figuras y las salas que abrieron. No se puede deshacer. Las cuentas normales no se tocan.", si: "Borrar invitados", peligro: true })))
            return;
        const n = await adminBorrarInvitados();
        aviso(n === null ? "No se pudo borrar." : n === 0 ? "No había invitados." : `Se borraron ${n} invitados`);
        leer();
    };
    const lista = (cuentas ?? []).filter(c => c.nombre.toLowerCase().includes(busca.trim().toLowerCase()));
    return (_jsxs(_Fragment, { children: [_jsx(Bloque, { titulo: cuentas ? `Cuentas · ${cuentas.length}` : "Cuentas", children: cuentas === undefined ? _jsx("p", { className: "pf-suave", role: "status", children: "Leyendo cuentas\u2026" }) : cuentas === null ? _jsx("p", { className: "pf-suave", children: "No se pudo leer. Revisa la conexi\u00F3n." }) : _jsxs(_Fragment, { children: [_jsxs("label", { className: "cf-campo", children: [_jsx("span", { children: "Buscar cuenta" }), _jsx("span", { className: "cf-campo-caja", children: _jsx("input", { value: busca, onChange: e => setBusca(e.target.value), maxLength: 30 }) })] }), _jsx("ul", { className: "cf-cuentas", children: lista.map(c => (_jsxs("li", { className: "cf-cuenta", children: [_jsxs("div", { className: "cf-cuenta-top", children: [_jsx("b", { children: c.nombre }), _jsxs("small", { children: [c.acumulada.toLocaleString("es-MX"), " XP \u00B7 ", c.disponible.toLocaleString("es-MX"), " para gastar"] })] }), _jsxs("div", { className: "cf-chips", children: [_jsx("button", { type: "button", className: "cf-chip", onClick: () => void xp(c, 50), children: "+50 XP" }), _jsx("button", { type: "button", className: "cf-chip", onClick: () => void xp(c, 100), children: "+100 XP" }), _jsx("button", { type: "button", className: "cf-chip", onClick: () => void xp(c, -50), children: "\u221250 XP" }), _jsx("button", { type: "button", className: "cf-chip" + (abierta === c.id ? " on" : ""), "aria-expanded": abierta === c.id, onClick: () => { setAbierta(abierta === c.id ? null : c.id); setClave(""); }, children: "Contrase\u00F1a" }), c.id !== s.uid && _jsx("button", { type: "button", className: "cf-chip peligro", onClick: () => void borrarCuenta(c), children: "Borrar cuenta" })] }), abierta === c.id && _jsxs("form", { className: "cf-form", onSubmit: e => void poner(c, e), children: [_jsx(CampoClave, { etiqueta: "Contrase\u00F1a nueva (8 o m\u00E1s)", valor: clave, alCambiar: setClave, auto: "new-password" }), _jsx(Boton, { tipo: "peligro", submit: true, desactivado: clave.length < 8, children: "Poner contrase\u00F1a" })] })] }, c.id))) })] }) }), _jsxs(Bloque, { titulo: "Invitados de prueba", children: [_jsx("p", { className: "pf-suave", children: "Quien entra sin cuenta deja una cuenta desechable. B\u00F3rralas al terminar las pruebas." }), _jsx(Boton, { tipo: "peligro", onClick: () => void borrarInvitados(), children: "Borrar invitados" })] })] }));
}
// ---------- Acerca de ALV ----------
function PanelAcerca() {
    const [ver, setVer] = useState(null);
    const v = __ALV_VERSION__;
    const secciones = ver === "privacidad" ? SECCIONES_TERMINOS.filter(x => /^(2|3)\./.test(x.titulo)) : SECCIONES_TERMINOS;
    return (_jsxs(_Fragment, { children: [_jsxs(Bloque, { titulo: "Versi\u00F3n", children: [_jsx(Fila, { titulo: "ALV", ayuda: "Amigos Legendarios Verdaderos", control: _jsxs("span", { className: "cf-dato", children: ["v", v.v] }) }), _jsx(Fila, { titulo: "Publicada", control: _jsxs("span", { className: "cf-dato", children: [v.dia, v.commit ? ` · ${v.commit}` : ""] }) })] }), _jsxs(Bloque, { titulo: "Legal", children: [_jsxs("div", { className: "cf-legal", children: [_jsx(Boton, { onClick: () => setVer(ver === "terminos" ? null : "terminos"), children: ver === "terminos" ? "Ocultar términos" : "Términos y condiciones" }), _jsx(Boton, { onClick: () => setVer(ver === "privacidad" ? null : "privacidad"), children: ver === "privacidad" ? "Ocultar privacidad" : "Política de privacidad" })] }), ver && (_jsxs("article", { className: "cf-terminos", children: [secciones.map(sec => _jsxs("section", { children: [_jsx("h3", { children: sec.titulo }), sec.parrafos.map(t => _jsx("p", { children: t }, t))] }, sec.titulo)), _jsxs("p", { className: "pf-suave", children: ["Actualizados el ", TERMINOS_ACTUALIZADOS, "."] })] }))] }), _jsxs(Bloque, { titulo: "Cr\u00E9ditos", children: [_jsxs("p", { className: "cf-creditos", children: [_jsx("b", { children: CREDITOS.titulo }), CREDITOS.texto] }), _jsx("p", { className: "pf-suave", children: CREDITOS.derechos })] })] }));
}
