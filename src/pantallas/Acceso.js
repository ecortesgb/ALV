import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Pantalla de carga, acceso y registro. ALV es solo para mayores de 18 (D1): la fecha la valida el servidor.
import { useEffect, useState } from "react";
import { Boton, Icono } from "../ds";
import { cargarCapsulasNube, entrar, entrarInvitado, esNickInvitado, guardarRegistro, nickValido, passValida, registrar, salir } from "../servicios/cuenta";
import { hayNube } from "../servicios/cliente";
import { entrarDemo, refrescarSesion, useSesion } from "../app/sesion";
import { ir } from "../app/rutas";
import { pantallaDeCarga } from "../app/musica";
import { sonar } from "../app/sonido";
import { Marco, urlArte } from "./comun";
import { LogoALV } from "./Logo";
import { edadDe, fechaDeTexto, formatoFecha } from "../app/fecha";
import { RuedaFecha } from "./RuedaFecha";
import { CREDITOS, SECCIONES_TERMINOS, TERMINOS_ACTUALIZADOS } from "../content/terminos";
export { edadDe, fechaDeTexto, formatoFecha };
const GENEROS = [["mujer", "Mujer"], ["hombre", "Hombre"], ["nodice", "Prefiero no decirlo"]];
const generoServidor = (g) => (g === "nodice" ? "otro" : g);
// ---------- Piezas de las pantallas de acceso (estilo tarjeta clara sobre la ciudad del cartel) ----------
/** Iconos chicos de los campos (usuario y calendario no están en el Design System). */
const ICONO_CAMPO = {
    usuario: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6z",
    candado: "M5.5 10.5h13v10h-13zM7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5h-2.4V8a2.1 2.1 0 0 0-4.2 0v2.5z",
    calendario: "M4 5.5h16v15H4zM4 9.5h16M7.5 3.5h2v4h-2zM14.5 3.5h2v4h-2z",
};
function IconoCampo({ id }) {
    return _jsx("svg", { className: "a-campo-ic", viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: ICONO_CAMPO[id] }) });
}
/** Campo con icono a la izquierda. `ver`: muestra la etiqueta arriba. `derecha`: botón dentro del campo (ojo, calendario). */
function CampoIcono({ etiqueta, icono, ver = false, derecha, placeholder, ...props }) {
    return (_jsxs("label", { className: "a-campo a-campo-ic-caja" + (ver ? "" : " a-campo-oculto") + (derecha ? " a-campo-der" : ""), children: [_jsx("span", { children: etiqueta }), _jsxs("span", { className: "a-campo-fila", children: [_jsx(IconoCampo, { id: icono }), _jsx("input", { placeholder: placeholder ?? (ver ? undefined : etiqueta), ...props }), derecha] })] }));
}
/** Ojo para mostrar u ocultar la contraseña escrita. */
function BotonOjo({ visible, alCambiar }) {
    return (_jsx("button", { type: "button", className: "a-campo-btn", onClick: alCambiar, "aria-pressed": visible, "aria-label": visible ? "Ocultar contraseña" : "Mostrar contraseña", children: _jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("path", { d: "M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" }), !visible && _jsx("path", { d: "M4 3.5l16.5 17" })] }) }));
}
function CampoClave({ nueva, ...props }) {
    const [ver, setVer] = useState(false);
    return _jsx(CampoIcono, { etiqueta: "Contrase\u00F1a", icono: "candado", type: ver ? "text" : "password", autoComplete: nueva ? "new-password" : "current-password", autoCapitalize: "none", spellCheck: false, derecha: _jsx(BotonOjo, { visible: ver, alCambiar: () => setVer(v => !v) }), ...props });
}
const ARTE_ACCESO = { "--arte-g": urlArte("cartel-inicio-1920.webp"), "--arte-c": urlArte("cartel-inicio-1100.webp") };
function FondoAcceso() { return _jsx("div", { className: "d-bg a-fondo-acceso", "aria-hidden": "true", style: ARTE_ACCESO }); }
/** Pantalla de acceso: botón de regresar (si hay a dónde), logo, lo que va bajo el logo y la tarjeta. */
function MarcoAcceso({ alVolver, bajoLogo, children }) {
    return (_jsxs(Marco, { clase: "a-centro a-acceso", fondo: _jsx(FondoAcceso, {}), children: [alVolver && _jsx("button", { type: "button", className: "a-volver", onClick: alVolver, "aria-label": "Regresar", children: _jsx(Icono, { id: "back" }) }), _jsx(LogoALV, { tamano: "medio", ruleta: false, className: "a-acceso-logo" }), bajoLogo, children] }));
}
/** Tarjeta clara con pestañas de carpeta arriba (o un solo título). */
function Tarjeta({ pestanas, activa, onCambio, children }) {
    return (_jsxs("section", { className: "a-tarjeta", children: [_jsx("div", { className: "a-tarjeta-tabs" + (pestanas.length === 1 ? " a-una" : ""), role: "tablist", "aria-label": "Acceso", children: pestanas.map(p => (_jsx("button", { type: "button", role: "tab", "aria-selected": p.id === activa, className: p.id === activa ? "on" : "", onClick: () => onCambio?.(p.id), children: p.texto }, p.id))) }), _jsx("div", { className: "a-tarjeta-cuerpo", children: children })] }));
}
const ARTE_INICIO = { "--arte-g": urlArte("cartel-inicio-1920.webp"), "--arte-c": urlArte("cartel-inicio-1100.webp") };
/** Tiempo mínimo de la barra antes de «Presiona para iniciar» (la ruleta sigue girando mientras). */
const CARGA_MS = 3000;
/**
 * Pantalla de inicio (carga y portada en una): cartel ilustrado con figuras fijas personalizadas (imagen, no 3D en vivo)
 * y el logo con su ruleta de títulos. Mientras `listo` es falso corre la barra; después aparece «Presiona para iniciar».
 * Es un solo componente para que la ruleta no se reinicie al pasar de cargar a la portada.
 */
function PantallaInicio({ listo, texto, onIniciar }) {
    return (_jsx(Marco, { clase: "a-inicio", fondo: _jsx("div", { className: "d-bg a-fondo-inicio", "aria-hidden": "true", style: ARTE_INICIO }), children: _jsxs("div", { className: "a-inicio-caja", children: [_jsx("div", { className: "a-inicio-logo", children: _jsx(LogoALV, {}) }), _jsx("div", { className: "a-inicio-hueco", "aria-hidden": "true" }), _jsx("div", { className: "a-inicio-lluvia", "aria-hidden": "true" }), _jsxs("div", { className: "a-inicio-pie", children: [listo && onIniciar
                            ? _jsx(Boton, { color: "amarillo", principal: true, className: "a-inicio-boton", texto: "Presiona para iniciar", sub: "Un juego para jugar con tus amigos", icono: "play", onClick: () => { sonar("clic"); onIniciar(); } })
                            : _jsxs(_Fragment, { children: [_jsx("div", { className: "a-barra a-inicio-barra", "aria-hidden": "true", children: _jsx("i", {}) }), _jsx("p", { className: "a-inicio-estado", role: "status", children: texto })] }), _jsx("small", { className: "a-inicio-legal", children: "\u00A9 2026 ALV \u00B7 Solo para mayores de 18" })] })] }) }));
}
/** Carga: mientras se lee la sesión (con sesión ya abierta pasa directo al HUB). */
export function Carga({ texto = "Entrando…" }) {
    return _jsx(PantallaInicio, { listo: false, texto: texto });
}
/**
 * Inicio: se ve en CADA carga o recarga de ALV (App la quita al terminar). Primero la barra (mínimo CARGA_MS y hasta
 * saber si hay sesión); luego «Presiona para iniciar»: con sesión lleva al HUB, sin sesión a crear cuenta o entrar.
 */
export function Inicio({ fase, alTerminar }) {
    const [tiempo, setTiempo] = useState(false), [acceso, setAcceso] = useState(false);
    useEffect(() => { const t = setTimeout(() => setTiempo(true), CARGA_MS); return () => clearTimeout(t); }, []);
    // Mientras se ve la pantalla de carga suena su pista (al primer toque: antes el navegador no deja).
    useEffect(() => { pantallaDeCarga(true); return () => pantallaDeCarga(false); }, []);
    // Entró o creó cuenta desde Acceso: se quita el inicio y manda la ruta (Acceso ya lleva a Personalizar si es nueva).
    useEffect(() => { if (acceso && fase !== "fuera" && fase !== "cargando")
        alTerminar(); }, [acceso, fase, alTerminar]);
    if (acceso && fase === "fuera")
        return _jsx(Acceso, { alVolver: () => setAcceso(false) });
    const iniciar = () => { if (fase === "fuera")
        setAcceso(true);
    else {
        ir("inicio");
        alTerminar();
    } };
    return _jsx(PantallaInicio, { listo: tiempo && fase !== "cargando", texto: fase === "cargando" ? "Entrando…" : "Cargando…", onIniciar: iniciar });
}
/** Cuenta nueva: a personalizar, salvo que ya tenga figura guardada en la nube. Si no se pudo leer, va al HUB. */
async function irAPersonalizarSiNueva() {
    const nube = await cargarCapsulasNube();
    if (nube && !nube.slots.some(Boolean))
        ir("personalizar");
}
/**
 * Fecha de nacimiento: se escribe DD/MM/AAAA (teclado de números en celular) o se elige con la rueda Día / Mes / Año
 * que abre el calendario de la derecha. Solo con una fecha que existe se entrega AAAA-MM-DD (si no, ""); la edad la
 * validan `edadDe` y el servidor.
 */
export function FechaNacimiento({ valor, alCambiar }) {
    const [texto, setTexto] = useState(() => (valor ? valor.split("-").reverse().join("/") : ""));
    const [rueda, setRueda] = useState(false);
    const escribir = (t) => { const f = formatoFecha(t); setTexto(f); alCambiar(fechaDeTexto(f)); };
    const completa = texto.replace(/\D/g, "").length === 8, mala = completa && !fechaDeTexto(texto);
    return (_jsxs("div", { className: "a-fecha", children: [_jsx(CampoIcono, { etiqueta: "Fecha de nacimiento", icono: "calendario", ver: true, placeholder: "DD/MM/AAAA", inputMode: "numeric", autoComplete: "bday", maxLength: 10, value: texto, onChange: e => escribir(e.target.value), "aria-invalid": mala || undefined, required: true, derecha: _jsx("button", { type: "button", className: "a-campo-btn" + (rueda ? " on" : ""), onClick: () => setRueda(r => !r), "aria-expanded": rueda, "aria-label": rueda ? "Cerrar la rueda de fecha" : "Elegir girando día, mes y año", children: _jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("path", { d: "M4 5.5h16v15H4zM4 9.5h16M8 3.5v4M16 3.5v4" }), _jsx("path", { d: "M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" })] }) }) }), mala && _jsx("small", { className: "a-fecha-aviso", role: "alert", children: "Esa fecha no existe. Usa DD/MM/AAAA." }), rueda && _jsx(RuedaFecha, { valor: fechaDeTexto(texto), alCambiar: iso => escribir(iso.split("-").reverse().join("")), alCerrar: () => setRueda(false) })] }));
}
function DatosEdad({ nac, setNac, genero, setGenero }) {
    return (_jsxs(_Fragment, { children: [_jsx(FechaNacimiento, { valor: nac, alCambiar: setNac }), _jsxs("div", { className: "a-campo", children: [_jsx("span", { children: "G\u00E9nero (solo para armar equipos)" }), _jsx("div", { className: "a-generos", role: "radiogroup", "aria-label": "G\u00E9nero", children: GENEROS.map(([g, t]) => _jsx("button", { type: "button", role: "radio", "aria-checked": genero === g, className: "a-pildora" + (genero === g ? " on" : ""), onClick: () => setGenero(g), children: t }, g)) })] })] }));
}
/** Términos y Condiciones y Política de Privacidad, con los créditos de Elías arriba. Fondo del cartel difuminado. */
function Terminos({ alVolver }) {
    useEffect(() => { document.querySelector(".a-acceso .a-scroll")?.scrollTo({ top: 0 }); }, []);
    return (_jsx(MarcoAcceso, { alVolver: alVolver, children: _jsx(Tarjeta, { pestanas: [{ id: "terminos", texto: "Términos y Privacidad" }], activa: "terminos", children: _jsxs("article", { className: "a-terminos", children: [_jsxs("header", { className: "a-creditos", children: [_jsx("span", { className: "a-creditos-titulo", children: CREDITOS.titulo }), _jsx("p", { children: CREDITOS.texto }), _jsx("small", { children: CREDITOS.derechos })] }), SECCIONES_TERMINOS.map(sec => (_jsxs("section", { children: [_jsx("h2", { children: sec.titulo }), sec.parrafos.map(t => _jsx("p", { children: t }, t))] }, sec.titulo))), _jsxs("p", { className: "a-terminos-fecha", children: ["Actualizados el ", TERMINOS_ACTUALIZADOS, "."] }), _jsx(Boton, { color: "amarillo", className: "a-tarjeta-boton", texto: "Entendido", icono: "back", onClick: alVolver })] }) }) }));
}
/** Entrar sin cuenta, solo para probar: apodo y confirmar mayoría de edad. No pide fecha ni contraseña. */
function Invitado({ volver }) {
    const [apodo, setApodo] = useState(""), [mayor, setMayor] = useState(false), [error, setError] = useState(null), [ocupado, setOcupado] = useState(false);
    const enviar = async (e) => {
        e?.preventDefault();
        if (ocupado)
            return;
        if (apodo.trim().length < 2) {
            setError("Escribe un apodo de 2 a 20 letras.");
            return;
        }
        if (!mayor) {
            setError("ALV es solo para mayores de 18 años.");
            return;
        }
        setOcupado(true);
        setError(null);
        const fallo = await entrarInvitado(apodo);
        setOcupado(false);
        if (fallo) {
            setError(fallo);
            return;
        }
        await irAPersonalizarSiNueva();
        await refrescarSesion();
    };
    return (_jsx(MarcoAcceso, { alVolver: volver, children: _jsx(Tarjeta, { pestanas: [{ id: "prueba", texto: "Entrar de prueba" }], activa: "prueba", children: _jsxs("form", { onSubmit: e => void enviar(e), className: "a-pila", children: [_jsx("p", { className: "a-suave", children: "Juegas sin crear cuenta. Es una entrada de prueba: lo que ganes se borra cuando terminen las pruebas." }), _jsx(CampoIcono, { etiqueta: "Tu apodo", icono: "usuario", value: apodo, maxLength: 20, onChange: e => setApodo(e.target.value), autoComplete: "off", autoFocus: true, required: true }), _jsxs("label", { className: "a-check", children: [_jsx("input", { type: "checkbox", checked: mayor, onChange: e => setMayor(e.target.checked) }), _jsx("span", { children: "Soy mayor de 18 y acepto jugar con respeto: nadie est\u00E1 obligado a tomar ni a cumplir un reto." })] }), error && _jsx("p", { className: "a-error", role: "alert", children: error }), _jsx(Boton, { color: "amarillo", texto: "Entrar de prueba", icono: "play", cargando: ocupado, onClick: () => void enviar() }), _jsx("button", { type: "submit", hidden: true }), _jsx("button", { type: "button", className: "a-tarjeta-pie", onClick: volver, children: "Tengo cuenta o quiero crear una" })] }) }) }));
}
/** Entrar o crear cuenta. `alVolver`: regresa a la pantalla de inicio (si se llegó desde ahí). */
export function Acceso({ alVolver } = {}) {
    const [tab, setTab] = useState("entrar");
    const [invitado, setInvitado] = useState(false), [terminos, setTerminos] = useState(false);
    const [nick, setNick] = useState(""), [pass, setPass] = useState(""), [nac, setNac] = useState(""), [genero, setGenero] = useState("");
    const [acepto, setAcepto] = useState(false), [mayor, setMayor] = useState(false), [error, setError] = useState(null), [ocupado, setOcupado] = useState(false);
    if (!hayNube) {
        return (_jsx(MarcoAcceso, { alVolver: alVolver, children: _jsx(Tarjeta, { pestanas: [{ id: "demo", texto: "Modo de prueba" }], activa: "demo", children: _jsxs("form", { onSubmit: e => { e.preventDefault(); entrarDemo(nick); }, className: "a-pila", children: [_jsx("p", { className: "a-suave", children: "Sin servidor: todo se queda en este navegador." }), _jsx(CampoIcono, { etiqueta: "Tu apodo", icono: "usuario", value: nick, maxLength: 20, onChange: e => setNick(e.target.value), autoFocus: true, required: true }), _jsx(Boton, { color: "amarillo", className: "a-tarjeta-boton", texto: "Entrar", icono: "play", onClick: () => entrarDemo(nick) })] }) }) }));
    }
    if (invitado)
        return _jsx(Invitado, { volver: () => setInvitado(false) });
    // Los términos se ven encima del formulario: al volver sigue lo que ya se había llenado.
    if (terminos)
        return _jsx(Terminos, { alVolver: () => setTerminos(false) });
    const verTerminos = (e) => { e.preventDefault(); setTerminos(true); };
    const enviar = async (e) => {
        e?.preventDefault();
        if (ocupado)
            return;
        setError(null);
        if (tab === "crear" && esNickInvitado(nick)) {
            setError("Ese apodo no se puede usar. Prueba con otro.");
            return;
        }
        if (!nickValido(nick) || !passValida(pass)) {
            setError("Apodo de 3 a 20 letras, números o guion bajo. Contraseña de 8 o más.");
            return;
        }
        if (tab === "crear") {
            if (!nac || !genero) {
                setError("Falta tu fecha de nacimiento o tu género.");
                return;
            }
            if (edadDe(nac) < 18) {
                setError("ALV es solo para mayores de 18 años.");
                return;
            }
            if (!acepto) {
                setError("Falta aceptar los Términos y Condiciones.");
                return;
            }
            if (!mayor) {
                setError("Falta confirmar que eres mayor de 18 años.");
                return;
            }
        }
        setOcupado(true);
        const fallo = tab === "crear" ? await registrar(nick, pass) : await entrar(nick, pass);
        if (!fallo && tab === "crear" && genero)
            await guardarRegistro(nac, generoServidor(genero));
        setOcupado(false);
        if (fallo) {
            setError(tab === "crear" ? "No se pudo crear. Puede que ese apodo ya exista." : "Apodo o contraseña incorrectos.");
            return;
        }
        if (tab === "crear")
            await irAPersonalizarSiNueva();
        await refrescarSesion();
    };
    const cambiar = (t) => { setTab(t); setError(null); };
    return (_jsxs(MarcoAcceso, { alVolver: alVolver, bajoLogo: tab === "crear" && _jsxs("button", { type: "button", className: "a-bajo-logo", onClick: () => cambiar("entrar"), children: ["\u00BFYa tienes cuenta? ", _jsx("b", { children: "Inicia sesi\u00F3n" })] }), children: [_jsx(Tarjeta, { activa: tab, onCambio: t => cambiar(t), pestanas: [{ id: "entrar", texto: "Iniciar sesión" }, { id: "crear", texto: "Registrarse" }], children: _jsxs("form", { onSubmit: e => void enviar(e), className: "a-pila", children: [_jsx(CampoIcono, { etiqueta: "Usuario", icono: "usuario", value: nick, onChange: e => setNick(e.target.value), autoComplete: "username", autoCapitalize: "none", spellCheck: false, maxLength: 20, required: true }), _jsx(CampoClave, { nueva: tab === "crear", value: pass, onChange: e => setPass(e.target.value), maxLength: 72, required: true }), tab === "crear" && _jsxs(_Fragment, { children: [_jsx(DatosEdad, { nac: nac, setNac: setNac, genero: genero, setGenero: setGenero }), _jsxs("label", { className: "a-check", children: [_jsx("input", { type: "checkbox", checked: acepto, onChange: e => setAcepto(e.target.checked) }), _jsxs("span", { children: ["Acepto los ", _jsx("button", { type: "button", className: "a-enlace", onClick: verTerminos, children: "T\u00E9rminos y Condiciones" }), " y ", _jsx("button", { type: "button", className: "a-enlace", onClick: verTerminos, children: "Pol\u00EDtica de Privacidad" })] })] }), _jsxs("label", { className: "a-check", children: [_jsx("input", { type: "checkbox", checked: mayor, onChange: e => setMayor(e.target.checked) }), _jsx("span", { children: "Confirmo que soy mayor de 18 a\u00F1os y jugar\u00E9 con respeto." })] })] }), error && _jsx("p", { className: "a-error", role: "alert", children: error }), _jsx(Boton, { color: "amarillo", className: "a-tarjeta-boton" + (tab === "crear" ? " a-boton-registro" : ""), texto: tab === "crear" ? "Registrarme" : "Entrar", icono: "play", cargando: ocupado, onClick: () => void enviar() }), _jsx("button", { type: "submit", hidden: true }), tab === "entrar" && _jsx("p", { className: "a-nota", children: "\u00BFOlvidaste tu contrase\u00F1a? P\u00EDdele a El\u00EDas que te ponga una nueva." }), _jsx("button", { type: "button", className: "a-tarjeta-pie", onClick: () => cambiar(tab === "crear" ? "entrar" : "crear"), children: tab === "crear" ? _jsxs(_Fragment, { children: ["\u00BFYa tienes cuenta? ", _jsx("b", { children: "Inicia sesi\u00F3n" })] }) : _jsxs(_Fragment, { children: ["\u00BFNo tienes cuenta? ", _jsx("b", { children: "Reg\u00EDstrate" })] }) })] }) }), _jsx("button", { type: "button", className: "a-plano", onClick: () => setInvitado(true), children: "Solo quiero probar: entrar sin cuenta" })] }));
}
/** La cuenta existe pero no tiene fecha de nacimiento: se pide antes de entrar. */
export function CompletarRegistro() {
    const [nac, setNac] = useState(""), [genero, setGenero] = useState(""), [error, setError] = useState(null), [ocupado, setOcupado] = useState(false);
    const guardar = async () => {
        if (!nac || !genero) {
            setError("Falta tu fecha de nacimiento o tu género.");
            return;
        }
        setOcupado(true);
        const r = await guardarRegistro(nac, generoServidor(genero));
        setOcupado(false);
        if (r === null) {
            setError("No se pudo guardar. Revisa la fecha.");
            return;
        }
        await refrescarSesion();
    };
    return (_jsx(MarcoAcceso, { children: _jsx(Tarjeta, { pestanas: [{ id: "dato", texto: "Un dato antes de jugar" }], activa: "dato", children: _jsxs("div", { className: "a-pila", children: [_jsx("p", { className: "a-suave", children: "La fecha se guarda una sola vez y nadie m\u00E1s la ve." }), _jsx(DatosEdad, { nac: nac, setNac: setNac, genero: genero, setGenero: setGenero }), error && _jsx("p", { className: "a-error", role: "alert", children: error }), _jsx(Boton, { color: "amarillo", texto: "Guardar y entrar", icono: "play", cargando: ocupado, onClick: () => void guardar() }), _jsx("button", { type: "button", className: "a-tarjeta-pie", onClick: () => void salir().then(refrescarSesion), children: "Salir de la cuenta" })] }) }) }));
}
/** Cuenta con fecha de menor de edad: no entra. Solo un administrador puede corregir la fecha. */
export function SoloMayores() {
    const s = useSesion();
    return (_jsx(MarcoAcceso, { children: _jsx(Tarjeta, { pestanas: [{ id: "mayores", texto: "Solo mayores de 18" }], activa: "mayores", children: _jsxs("div", { className: "a-pila", children: [_jsxs("p", { className: "a-suave", children: [s.nombre, ", tu fecha de nacimiento dice que eres menor de edad y ALV es solo para adultos. Si la fecha est\u00E1 mal, p\u00EDdele a El\u00EDas que la corrija."] }), _jsx(Boton, { color: "rojo", texto: "Salir de la cuenta", icono: "back", onClick: () => void salir().then(refrescarSesion) })] }) }) }));
}
