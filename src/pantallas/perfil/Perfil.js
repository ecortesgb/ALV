import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Perfil «ficha del jugador» con el lenguaje del HUB «La Azotea» (ALV_PERFIL_PROPUESTA.md, aprobado 2026-11-21).
// La figura 3D en vivo sobre la plataforma giratoria (la misma escena del HUB, sin pedestal pintado), identidad a la
// izquierda y paneles de vidrio a la derecha. Solo datos que ya existen; facción, tarjeta compartible y amigos son
// espacios reservados («Próximamente»), sin lógica. Contraseña y cerrar sesión viven en Ajustes.
import { useRef, useState } from "react";
import { escribirCapsulas, figuraActiva, leerCapsulas, apodoDe, semillaDe, useCapsulas, useFoto, N_CAPSULAS } from "../../app/figura3d";
import { atras, ir } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { tituloPorNivel } from "../../engine/economia";
import { enlace } from "../../servicios/enlace";
import { useTienda } from "../../servicios/tienda";
import { Marco, aviso, useAncho } from "../comun";
import { useRecursos } from "../Recursos";
import { logrosDeCuenta, useMovimientos } from "../Social";
import { BarraXPAzotea, RecursosAzotea, arteHub } from "../azotea/Cabecera";
import { EscenaAzotea } from "../azotea/EscenaAzotea";
import { RuedaFigura } from "../gestos/RuedaFigura";
import { AZOTEA } from "../azotea/paquetes";
import "../azotea/azotea.css";
import "./perfil.css";
const num = (n) => Math.max(0, Math.round(n)).toLocaleString("es-MX");
const BASE = import.meta.env.BASE_URL;
// La plataforma 3D de la escena (sin pedestal pintado) con la luz de noche: queda bien en la sala oscura.
const SALA = { ...AZOTEA.ambientes.noche, fondo: undefined, pedestal: undefined };
// Iconos del Perfil: primero el arte de Elías (public/arte/ui/perfil/<nombre>.webp); mientras no llega, el del HUB.
const faltan = new Set();
function Arte({ nombre, alterno, className = "" }) {
    const [falta, setFalta] = useState(() => faltan.has(nombre));
    if (falta && !alterno)
        return null;
    const src = falta ? alterno : `${BASE}arte/ui/perfil/${nombre}.webp`;
    return _jsx("img", { className: className, src: src, alt: "", draggable: false, onError: () => { if (!falta) {
            faltan.add(nombre);
            setFalta(true);
        } } });
}
export function Perfil() {
    const s = useSesion();
    const r = useRecursos();
    const t = useTienda();
    const ancho = useAncho();
    const caps = useCapsulas(s.uid);
    const f = figuraActiva(caps);
    const rueda = useRef(null);
    const movs = useMovimientos();
    const apodo = apodoDe(f);
    const titulo = tituloPorNivel(r.nivel);
    const logros = movs ? logrosDeCuenta(r.nivel, movs) : null;
    const ganados = logros?.filter(l => l.va >= l.meta) ?? [];
    const partidas = movs?.filter(m => m.tipo === "ganada" && m.motivo.startsWith("partida:")).length;
    const guardadas = caps.slots.filter(Boolean).length;
    const comodines = Object.values(t.comodines).reduce((a, n) => a + (n || 0), 0);
    return (_jsx(Marco, { clase: "az pf", fondo: _jsx(SalaExhibicion, {}), children: _jsxs("div", { className: "pf-caja", children: [_jsxs("header", { className: "pf-top", children: [_jsxs("button", { type: "button", className: "pf-atras", onClick: atras, children: [_jsx("span", { "aria-hidden": "true", children: "\u25C0" }), "Atr\u00E1s"] }), _jsx(RecursosAzotea, { monedas: r.monedas, puntos: r.puntos })] }), _jsxs("section", { className: "pf-id", "aria-label": "Tu personaje", children: [_jsx("h1", { className: "pf-tit", children: _jsx("span", { children: "Tu personaje" }) }), _jsxs("div", { className: "pf-escena", children: [_jsx("span", { className: "pf-foco", "aria-hidden": "true" }), _jsx(EscenaAzotea, { id: s.uid, figura: f, ambiente: SALA, plataforma: AZOTEA.plataforma, llegada: false, className: "pf-figura", onToque: (x, y) => rueda.current?.abrir(x, y) }), _jsx(RuedaFigura, { ref: rueda, jugador: s.uid, figura: f, pistaSobre: ".pf-figura" }), _jsx("span", { className: "pf-pista", "aria-hidden": "true", children: "\u21BA Arrastra para girar" })] }), _jsxs("div", { className: "pf-placa", children: [_jsxs("span", { className: "pf-nivel", "aria-label": `Nivel ${r.nivel}`, children: [_jsx("img", { src: arteHub("insignia-nivel"), alt: "", draggable: false }), _jsx("b", { children: r.nivel })] }), _jsxs("span", { className: "pf-nombres", children: [_jsx("b", { className: "pf-apodo", children: apodo ?? s.nombre }), _jsxs("small", { className: "pf-cuenta", children: ["ID ", _jsxs("span", { children: ["@", s.nombre] })] }), _jsxs("span", { className: "pf-rango", children: [titulo, s.invitado && _jsx("em", { children: "Prueba" })] })] }), _jsxs("span", { className: "pf-faccion", title: "Las facciones llegan pronto", children: [_jsx(Arte, { nombre: "faccion-vacia", className: "pf-faccion-img" }), _jsx("span", { className: "pf-escudo", "aria-hidden": "true" }), _jsxs("small", { children: ["Facci\u00F3n", _jsx("br", {}), _jsx("i", { children: "Pr\u00F3ximamente" })] })] })] }), _jsx(TarjetaVista, { foto: f, id: s.uid, nombre: apodo ?? s.nombre, nivel: r.nivel, titulo: titulo })] }), _jsxs("div", { className: "pf-info", children: [_jsxs(Bloque, { titulo: "Tu XP", children: [_jsx("div", { className: "pf-xp-top", children: _jsxs("span", { className: "pf-xp-falta", children: ["Faltan ", _jsxs("b", { children: [num(r.costo - r.xp), " XP"] }), " para el nivel ", r.nivel + 1] }) }), _jsx("div", { className: "pf-xp-barra", children: _jsx(BarraXPAzotea, { xp: r.xp, costo: r.costo, nivel: r.nivel }) }), _jsxs("div", { className: "pf-cifras", children: [_jsxs("span", { children: [_jsx("b", { children: num(s.acumulada) }), _jsx("small", { children: "XP acumulada" })] }), _jsxs("span", { children: [_jsx("b", { children: num(s.disponible) }), _jsx("small", { children: "XP para gastar" })] })] }), movs && movs.length > 0 && _jsx("ul", { className: "pf-movs", children: movs.slice(0, ancho ? 4 : 3).map((m, i) => (_jsxs("li", { children: [_jsx("span", { children: m.motivo.replace("partida:", "Partida · ") }), _jsxs("b", { className: m.tipo === "ganada" ? "mas" : "menos", children: [m.tipo === "ganada" ? "+" : "−", num(m.xp)] })] }, i))) }), movs && movs.length === 0 && _jsx("p", { className: "pf-suave", children: "Tu primera XP llega al terminar tu primera partida." })] }), _jsx(Bloque, { titulo: "Estad\u00EDsticas", children: _jsxs("ul", { className: "pf-stats", children: [_jsx(Stat, { arte: "stat-partidas", alterno: arteHub("icono-jugar"), valor: partidas == null ? "…" : partidas >= 500 ? "500+" : num(partidas), texto: "Partidas jugadas" }), _jsx(Stat, { arte: "stat-logros", alterno: arteHub("icono-logros"), valor: logros ? `${ganados.length}/${logros.length}` : "…", texto: "Logros" }), _jsx(Stat, { arte: "stat-figuras", alterno: arteHub("icono-personalizar"), valor: `${guardadas}/${N_CAPSULAS}`, texto: "Figuras guardadas" }), _jsx(Stat, { arte: "stat-comodines", alterno: arteHub("icono-tienda"), valor: num(comodines), texto: "Comodines" })] }) }), _jsx(Bloque, { titulo: "Colecci\u00F3n", children: _jsxs("div", { className: "pf-col", children: [_jsxs("div", { className: "pf-col-grupo", children: [_jsxs("h3", { children: ["Personajes favoritos ", _jsx("small", { children: "Toca uno para jugar con \u00E9l" })] }), _jsx("div", { className: "pf-favs", children: caps.slots.map((c, i) => _jsx(Favorito, { i: i, c: c, uid: s.uid, activa: caps.activa === i }, i)) })] }), _jsxs("div", { className: "pf-col-grupo", children: [_jsxs("h3", { children: ["Logros destacados ", _jsx("small", { children: "Tus primeros 3 logros" })] }), _jsx("div", { className: "pf-logros", children: [0, 1, 2].map(i => {
                                                    const l = ganados[i];
                                                    return _jsxs("span", { className: "pf-logro" + (l ? "" : " vacio"), title: l?.descripcion, children: [l ? _jsx("img", { src: arteHub("icono-logros"), alt: "", draggable: false }) : _jsx("span", { className: "pf-candado", "aria-hidden": "true", children: _jsxs("svg", { viewBox: "0 0 30 36", children: [_jsx("path", { d: "M8 15v-5a7 7 0 0 1 14 0v5" }), _jsx("rect", { x: "4", y: "15", width: "22", height: "18", rx: "4" }), _jsx("path", { d: "M15 22v5" })] }) }), _jsx("small", { children: l ? l.nombre : "Por ganar" })] }, i);
                                                }) }), _jsx("button", { type: "button", className: "pf-enlace", onClick: () => ir("logros"), children: "Ver todos los logros \u203A" })] })] }) }), _jsx(Bloque, { titulo: "Social", extra: _jsx("span", { className: "pf-pronto", children: "Pr\u00F3ximamente" }), children: _jsxs("div", { className: "pf-social", children: [_jsx(Arte, { nombre: "social-amigos", alterno: arteHub("icono-chat"), className: "pf-social-ico" }), _jsxs("div", { className: "pf-amigos", "aria-hidden": "true", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }), _jsx("p", { className: "pf-suave", children: "Aqu\u00ED ver\u00E1s a tus amigos, si est\u00E1n en l\u00EDnea y su nivel." }), _jsxs("div", { className: "pf-social-bot", children: [_jsx("button", { type: "button", className: "pf-boton", disabled: true, children: "Agregar amigo" }), _jsx("button", { type: "button", className: "pf-boton", disabled: true, children: "Compartir perfil" })] })] }) })] })] }) }));
}
/** Panel de vidrio con su título en franja diagonal. */
function Bloque({ titulo, extra, children }) {
    return (_jsxs("section", { className: "pf-bloque", "aria-label": titulo, children: [_jsxs("h2", { className: "pf-tit", children: [_jsx("span", { children: titulo }), extra] }), children] }));
}
function Stat({ arte, alterno, valor, texto }) {
    return _jsxs("li", { className: "pf-stat", children: [_jsx(Arte, { nombre: arte, alterno: alterno, className: "pf-stat-ico" }), _jsx("b", { children: valor }), _jsx("small", { children: texto })] });
}
/** Una de las 3 figuras guardadas. Tocarla la vuelve la predeterminada (la que juega); vacía, abre el taller. */
function Favorito({ i, c, uid, activa }) {
    const foto = useFoto(c?.figura ?? null, undefined, "busto");
    const nombre = c ? apodoDe(c.figura) ?? (c.nombre || `Figura ${i + 1}`) : "Vacío";
    const usar = () => {
        if (!c) {
            ir("personalizar");
            return;
        }
        if (activa)
            return;
        escribirCapsulas(uid, { ...leerCapsulas(uid), activa: i });
        void enlace.activarCapsula(i + 1);
        aviso(`Ahora juegas con ${nombre}`);
    };
    return (_jsxs("button", { type: "button", className: "pf-fav" + (activa ? " activa" : "") + (c ? "" : " vacio"), onClick: usar, "aria-pressed": c ? activa : undefined, "aria-label": c ? (activa ? `${nombre}, la figura con la que juegas` : `Jugar con ${nombre}`) : `Espacio ${i + 1} vacío. Crear figura`, children: [_jsx("span", { className: "pf-fav-foto", children: c ? (foto ? _jsx("img", { src: foto, alt: "", draggable: false }) : _jsx("span", { className: "pf-cargando" })) : _jsx("span", { className: "pf-mas", children: "+" }) }), _jsx("small", { children: c ? nombre : "Crear" }), activa && _jsx("em", { className: "pf-sello", children: "En juego" })] }));
}
/** Vista previa de la tarjeta de jugador. Descargarla y compartirla llega después. */
function TarjetaVista({ foto, id, nombre, nivel, titulo }) {
    const url = useFoto(foto, foto ? undefined : semillaDe(id));
    return (_jsxs("div", { className: "pf-tarjeta", children: [_jsxs("span", { className: "pf-carta", "aria-hidden": "true", children: [_jsx("span", { className: "pf-carta-foto", children: url && _jsx("img", { src: url, alt: "", draggable: false }) }), _jsxs("span", { className: "pf-carta-pie", children: [_jsx("b", { children: nombre }), _jsxs("small", { children: ["Niv. ", nivel, " \u00B7 ", titulo] })] })] }), _jsxs("span", { className: "pf-tarjeta-txt", children: [_jsx("b", { children: "Tu tarjeta de jugador" }), _jsx("small", { children: "Pronto podr\u00E1s elegir su fondo, descargarla y compartirla." }), _jsx("span", { className: "pf-pronto", children: "Pr\u00F3ximamente" })] })] }));
}
/** Sala de exhibición: otra habitación, oscura, con focos. PROVISIONAL en CSS hasta la imagen de Elías (perfil-fondo). */
function SalaExhibicion() {
    return (_jsxs("div", { className: "pf-sala", "aria-hidden": "true", children: [_jsx("span", { className: "pf-sala-img" }), _jsx("span", { className: "pf-sala-haz" }), _jsx("span", { className: "pf-sala-haz dos" }), _jsx("span", { className: "pf-sala-piso" })] }));
}
