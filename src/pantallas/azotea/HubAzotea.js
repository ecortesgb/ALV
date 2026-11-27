import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// HUB «La Azotea» (ALV_HUB_DIRECCION_CREATIVA.md): el HUB de ALV desde el 2026-11-21 (antes prototipo en #/hub-prototipo).
// Mismos datos y acciones que el HUB productivo (Hub.tsx), que no se toca. La figura es la escena 3D de siempre
// en su modo «azotea»; el escenario sale de un paquete (escenario.ts) para poder cambiarlo después.
import { useEffect, useRef, useState } from "react";
import { Icono } from "../../ds";
import { hoyMexico, retosDelDia } from "../../content/rarezas";
import { modoCorteV3 } from "../../personajes/integracion";
import { figuraActiva, useCapsulas } from "../../app/figura3d";
import { horaDePrueba, useMomentoDia } from "../../app/horaDelDia";
import { abrirChat, useFigurasDe, useHubVivo } from "../../app/hubVivo";
import { ir } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { useLobby } from "../../app/lobby";
import { enlace } from "../../servicios/enlace";
import { Marco, Retrato, useAncho } from "../comun";
import { LogoALV } from "../Logo";
import { useRecursos } from "../Recursos";
import { PanelChat } from "../Vivo";
import { CabeceraJugador, RecursosAzotea } from "./Cabecera";
import { EscenarioFondo } from "./Escenario";
import { useFondoTema } from "../../app/temas";
import { EscenaAzotea } from "./EscenaAzotea";
import { useVidaPropia } from "../../app/vidaPerfil";
import { RuedaFigura } from "../gestos/RuedaFigura";
import { IconoIlustrado } from "./Iconos";
import { escenarioActual } from "./paquetes";
import "./azotea.css";
const MENOS_MOV = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const CON_CURSOR = typeof matchMedia !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches;
/**
 * Momento del escenario: el de la app (día, atardecer, noche) y, dentro del día, la tarde de 15:00 a 18:00.
 * PROPUESTA de corte. Se revisa cada minuto; ?hora= sirve para probar.
 */
export function useMomentoAzotea() {
    const m = useMomentoDia();
    const minutos = () => horaDePrueba(location.search) ?? (() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); })();
    const [min, setMin] = useState(minutos);
    useEffect(() => { const t = setInterval(() => setMin(minutos()), 60000); return () => clearInterval(t); }, []);
    return m === "dia" && min >= 15 * 60 ? "tarde" : m;
}
/** Pantalla baja (celular acostado): versión compacta. */
function useBajo() {
    const q = "(max-height: 560px)";
    const [b, setB] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
    useEffect(() => { const m = matchMedia(q), f = () => setB(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
    return b;
}
function faltaParaManana(ahora = new Date()) {
    const mx = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
    const min = 24 * 60 - (mx.getHours() * 60 + mx.getMinutes());
    return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
export function HubAzotea() {
    const s = useSesion();
    const ancho = useAncho();
    const bajo = useBajo();
    const r = useRecursos();
    const f = figuraActiva(useCapsulas(s.uid));
    // Vida automática de tu figura según su personalidad (etapa 3): la decide este aparato.
    useVidaPropia({ activo: true, jugador: s.uid, figura: f, contexto: "hub" });
    const momento = useMomentoAzotea();
    const esc = escenarioActual();
    // Tema de tu personaje (temas.ts): su fondo reemplaza la azotea y la figura va sobre su plataforma (sin pedestal
    // pintado). La escena se arma cuando ya se sabe si hay tema, para no cargarla dos veces.
    const tema = useFondoTema(f);
    const ambAzotea = esc.ambientes[momento];
    const amb = tema.css ? { ...ambAzotea, pedestal: undefined } : ambAzotea;
    const mando = useRef(null);
    const raiz = useRef(null);
    const rueda = useRef(null);
    const vivo = useHubVivo();
    // Coreografía de entrada solo la primera vez de la sesión.
    // La marca se pone en un efecto: en desarrollo StrictMode corre dos veces el inicializador y la segunda ya la veía.
    const [entra] = useState(() => { try {
        return !sessionStorage.getItem("alv-azotea-entrada") && !MENOS_MOV;
    }
    catch {
        return false;
    } });
    useEffect(() => { try {
        sessionStorage.setItem("alv-azotea-entrada", "1");
    }
    catch { /* sin almacenamiento */ } }, []);
    const [sala, setSala] = useState(null);
    useEffect(() => { let v = true; void enlace.miSala().then(x => { if (v)
        setSala(x); }); return () => { v = false; }; }, [s.uid]);
    const lobby = useLobby();
    // El chat tapa el escenario: la figura deja de dibujarse mientras está abierto.
    useEffect(() => { mando.current?.pausa(vivo.abierto); }, [vivo.abierto]);
    // Paralaje de la ciudad con el cursor (solo computadora, solo transform).
    useEffect(() => {
        // Las variables van en la raíz de la pantalla: el escenario está fuera de la caja.
        const el = raiz.current?.closest(".az");
        if (!el || !CON_CURSOR || MENOS_MOV)
            return;
        let pend = 0, x = 0, y = 0;
        const mover = (e) => {
            x = e.clientX / innerWidth * 2 - 1;
            y = e.clientY / innerHeight * 2 - 1;
            if (!pend)
                pend = requestAnimationFrame(() => { pend = 0; el.style.setProperty("--px", x.toFixed(3)); el.style.setProperty("--py", y.toFixed(3)); });
        };
        addEventListener("pointermove", mover, { passive: true });
        return () => { removeEventListener("pointermove", mover); cancelAnimationFrame(pend); };
    }, []);
    const botones = [
        // «¡Jugar!» siempre abre Modos de juego (Elías, 22 nov); el lobby abierto se marca ahí sobre En línea.
        { id: "jugar", icono: "jugar", titulo: "¡Jugar!", sub: sala ? "Volver al lobby" : "Local, en línea o físico", reaccion: "listo",
            alerta: !sala && lobby ? "¡Lobby abierto!" : undefined, accion: () => ir("modos") },
        { id: "personalizar", icono: "personalizar", titulo: "Personalizar", sub: "Tu figura, a tu estilo", reaccion: "mirarse", accion: () => ir("personalizar") },
        { id: "tienda", icono: "tienda", titulo: "Tienda", sub: "Sobres y comodines", reaccion: "frotar", accion: () => ir("tienda") },
        { id: "ranking", icono: "ranking", titulo: "Ranking", sub: "Tú y tus amigos", reaccion: "flexionar", accion: () => ir("ranking") },
        { id: "logros", icono: "logros", titulo: "Logros", sub: "Lo que has desbloqueado", reaccion: "orgullo", accion: () => ir("logros") },
    ];
    return (_jsxs(Marco, { clase: `az m-${momento}`, fondo: _jsx(EscenarioFondo, { ambiente: amb, momento: momento, velo: esc.velo, tema: tema.css }), children: [_jsxs("div", { ref: raiz, className: "az-caja" + (entra ? " entra" : " vuelve"), style: { "--az-acento": esc.acento }, children: [_jsxs("header", { className: "az-top", children: [_jsx(CabeceraJugador, { id: s.uid, nombre: s.nombre, figura: f, nivel: r.nivel, xp: r.xp, costo: r.costo, compacta: !ancho || bajo }), _jsx(RecursosAzotea, { monedas: r.monedas, puntos: r.puntos })] }), _jsxs("section", { className: "az-escena", "aria-label": "Tu azotea", children: [_jsxs("div", { className: "az-letrero" + (amb.foquitos ? " encendido" : "") + (esc.letrero ? " con-arte" : " libre"), children: [!esc.letrero ? _jsx(LogoALV, { tamano: "medio", unaVez: true, className: "az-logo" }) : esc.letrero ? (_jsxs("span", { className: "az-soporte", children: [_jsx("img", { src: `${import.meta.env.BASE_URL}arte/${amb.foquitos ? esc.letrero.encendido : esc.letrero.apagado}`, alt: "", draggable: false }), _jsx(LogoALV, { tamano: "medio", unaVez: true, className: "az-logo" })] })) : null, !modoCorteV3() && _jsx(Boleto, { compacto: !ancho || bajo })] }), _jsx("span", { className: "az-reflector", "aria-hidden": "true" }), _jsx("span", { className: "az-reflector dos", "aria-hidden": "true" }), tema.listo && _jsx(EscenaAzotea, { ref: mando, id: s.uid, figura: f, ambiente: amb, plataforma: esc.plataforma, vida: "hub", onToque: (x, y) => rueda.current?.abrir(x, y) }, tema.css ? "tema" : "azotea"), _jsx(RuedaFigura, { ref: rueda, jugador: s.uid, figura: f, pistaSobre: ".az-figura" }), !ancho && _jsx(BotonChat, { mando: mando })] }), _jsx("nav", { className: "az-menu", "aria-label": "Men\u00FA principal", children: botones.map((b, i) => (_jsx(Losa, { b: b, i: i, mando: mando, onClick: b.accion }, b.id))) }), ancho && _jsx(BotonChat, { mando: mando })] }), vivo.abierto && _jsx(PanelChat, {})] }));
}
/** Botón losa: al pasar el cursor (o con el foco del teclado) la figura voltea a verlo y hace su gesto. */
function Losa({ b, i, mando, onClick }) {
    const ref = useRef(null);
    const encima = () => {
        const r = ref.current?.getBoundingClientRect();
        if (!r)
            return;
        mando.current?.mirarA({ x: r.left, y: r.top + r.height / 2 });
        mando.current?.accion(b.reaccion === "saludar" ? null : b.reaccion);
    };
    const fuera = () => { mando.current?.mirarA(null); mando.current?.accion(null); };
    return (_jsxs("button", { ref: ref, type: "button", className: `az-losa az-${b.id}`, style: { "--i": i }, onClick: onClick, onPointerEnter: e => { if (e.pointerType === "mouse")
            encima(); }, onPointerLeave: e => { if (e.pointerType === "mouse")
            fuera(); }, onFocus: e => { if (e.currentTarget.matches(":focus-visible"))
            encima(); }, onBlur: fuera, children: [_jsxs("span", { className: "az-losa-txt", children: [_jsx("b", { children: b.titulo }), _jsx("small", { children: b.sub })] }), _jsx(IconoIlustrado, { cual: b.icono }), b.alerta && _jsxs("span", { className: "az-alerta", children: [_jsx("i", {}), b.alerta] }), b.id === "jugar" && _jsx("span", { className: "az-barrido", "aria-hidden": "true" })] }));
}
/** Chat: quién está en línea (caras con punto verde) y mensajes sin leer. Abre el chat que ya existe. */
function BotonChat({ mando }) {
    const v = useHubVivo();
    const s = useSesion();
    const otros = v.enLinea.filter(p => p.id !== s.uid);
    const figs = useFigurasDe(otros.map(p => p.id));
    const caras = otros.slice(0, 3), mas = otros.length - caras.length;
    const ref = useRef(null);
    const encima = () => { const r = ref.current?.getBoundingClientRect(); if (r)
        mando.current?.mirarA({ x: r.left, y: r.top + r.height / 2 }); mando.current?.accion("saludar"); };
    return (_jsxs("button", { ref: ref, type: "button", className: "az-losa az-chat", style: { "--i": 5 }, onClick: () => abrirChat(true), onPointerEnter: e => { if (e.pointerType === "mouse")
            encima(); }, onPointerLeave: e => { if (e.pointerType === "mouse")
            mando.current?.mirarA(null); }, "aria-label": `Chat. ${v.enLinea.length} en línea${v.sinLeer ? `, ${v.sinLeer} sin leer` : ""}`, children: [_jsxs("span", { className: "az-losa-txt", children: [_jsx("b", { children: "Chat" }), _jsxs("small", { children: [v.enLinea.length, " en l\u00EDnea"] })] }), _jsxs("span", { className: "az-conteo", "aria-hidden": "true", children: [_jsx("i", {}), v.enLinea.length] }), _jsxs("span", { className: "az-caras", "aria-hidden": "true", children: [caras.map(p => _jsxs("span", { className: "az-cara", children: [figs.get(p.id) ? _jsx(Retrato, { id: p.id, figura: figs.get(p.id), nombre: p.nombre, size: 38 }) : _jsx("span", { className: "az-inicial", children: p.nombre.slice(0, 1).toUpperCase() }), _jsx("i", {})] }, p.id)), mas > 0 && _jsxs("span", { className: "az-cara az-mas", children: ["+", mas] })] }), _jsx(IconoIlustrado, { cual: "chat" }), v.sinLeer > 0 && _jsx("span", { className: "az-badge", children: v.sinLeer > 9 ? "9+" : v.sinLeer })] }));
}
/** Lo que va del día en Ciudad de México (0 a 1): llena la barra del reto. */
function avanceDelDia(ahora = new Date()) {
    const mx = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
    return (mx.getHours() * 60 + mx.getMinutes()) / 1440;
}
/**
 * Retos del día bajo el logo (de 1 a 3, `retosDelDia`): cada uno en su tarjeta, con un regalo distinto. El primero es
 * el diario (con la barra que se vacía con el día y el reloj); los demás son retos de combinación. Tocar una tarjeta
 * abre el personalizador, donde se cumplen. En celular quedan plegados (regalo, cuántos y el reloj) y se abren al tocar.
 */
function Boleto({ compacto }) {
    // ?fecha=AAAA-MM-DD solo para revisar cómo se ven otros días (1, 2 o 3 retos).
    const prueba = new URLSearchParams(location.search).get("fecha");
    const hoy = prueba && /^\d{4}-\d{2}-\d{2}$/.test(prueba) ? prueba : hoyMexico();
    const retos = retosDelDia(hoy);
    const [falta, setFalta] = useState(faltaParaManana);
    const [avance, setAvance] = useState(avanceDelDia);
    const [abierto, setAbierto] = useState(false);
    const [nuevo] = useState(() => { try {
        const k = "alv-reto-visto-" + hoy;
        if (localStorage.getItem(k))
            return false;
        localStorage.setItem(k, "1");
        return true;
    }
    catch {
        return false;
    } });
    useEffect(() => { const t = setInterval(() => { setFalta(faltaParaManana()); setAvance(avanceDelDia()); }, 30000); return () => clearInterval(t); }, []);
    // Regalo distinto por tarjeta, y que cambie de un día a otro.
    const dia = Number(hoy.replace(/-/g, "")) || 0;
    const regalo = (k) => `${import.meta.env.BASE_URL}arte/ui/hub/regalo-${((dia + k) % 6) + 1}.webp`;
    if (compacto && !abierto)
        return (_jsxs("button", { type: "button", className: "az-reto plegado", "aria-expanded": false, onClick: () => setAbierto(true), "aria-label": `${retos.length === 1 ? "Reto del día" : `${retos.length} retos de hoy`}. Ver`, children: [_jsx("span", { className: "az-reto-regalo", children: _jsx("img", { className: "az-ico az-ico-arte", src: regalo(0), alt: "", draggable: false }) }), retos.length > 1 && _jsx("span", { className: "az-reto-cuantos", children: retos.length }), _jsx("span", { className: "az-reto-pie", children: _jsxs("span", { className: "az-reloj", children: [_jsx(Icono, { id: "clock" }), falta] }) })] }));
    return (_jsxs("div", { className: "az-retos" + (compacto ? " abiertos" : ""), children: [retos.map((reto, k) => {
                const mini = `${import.meta.env.BASE_URL}arte/piezas/${reto.premio.toLowerCase().replace(/_/g, "-")}.webp`;
                const diario = k === 0;
                return (_jsxs("button", { type: "button", className: "az-reto" + (diario ? " diario" : " extra"), style: { "--k": k }, onClick: () => ir("personalizar"), "aria-label": `${diario ? "Reto del día" : "Reto"}: ${reto.nombre}. ${reto.texto} Abrir el personalizador`, children: [_jsx("span", { className: "az-reto-regalo", children: _jsx("img", { className: "az-ico az-ico-arte", src: regalo(k), alt: "", draggable: false }) }), _jsxs("span", { className: "az-reto-txt", children: [_jsxs("small", { children: [diario ? "¡Reto del día!" : "Reto extra", diario && nuevo && _jsx("em", { className: "az-nuevo", children: "Nuevo" })] }), _jsx("b", { children: reto.nombre }), _jsx("span", { children: reto.texto })] }), _jsx("span", { className: "az-reto-premio", title: "Premio", children: _jsx("img", { src: mini, alt: "", onError: e => { const c = e.currentTarget.parentElement; if (c)
                                    c.style.display = "none"; } }) }), diario && _jsxs("span", { className: "az-reto-pie", children: [_jsx("span", { className: "az-reto-barra", "aria-hidden": "true", children: _jsx("i", { style: { transform: `scaleX(${(1 - avance).toFixed(3)})` } }) }), _jsxs("span", { className: "az-reloj", children: [_jsx(Icono, { id: "clock" }), falta] })] })] }, reto.id));
            }), compacto && _jsx("button", { type: "button", className: "az-retos-cerrar", onClick: () => setAbierto(false), "aria-label": "Cerrar los retos", children: "\u00D7" })] }));
}
