import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Ranking «salón de campeones» (ALV_PLAN_RANKING_LOGROS.md v2, etapa 1; Maestro v1.54, 14.3).
// Mismo lenguaje que el HUB «La Azotea» y el Perfil: fondo de la azotea por hora, Atrás, recursos, vidrio oscuro.
// Datos: ranking_jugadores y ranking_grupos (040). Los Puntos ALV los calcula el servidor.
// Trofeos, medallas y podio son imágenes de Elías (public/arte/ui/ranking/*.webp); mientras no llegan se usa el icono
// de puntos del HUB y el podio va sin ilustración. Posiciones, nombres y números son interfaz.
import { useEffect, useMemo, useState } from "react";
import { apodoDe, semillaDe, useFoto } from "../../app/figura3d";
import { atras } from "../../app/rutas";
import { useSesion } from "../../app/sesion";
import { tituloPorNivel } from "../../engine/economia";
import { CATEGORIAS, RECORDS, VOTOS, fijarOcultarBebidas, leerOcultarBebidas, records, salonDeLaFama, misGrupos, nombrarGrupo, rankingReconocimientos, fijarRankingGlobal, leerRankingGlobal, ordenarPor, rankingGrupos, rankingJugadores, cargarMisPuntos } from "../../servicios/ranking";
import { hayNube } from "../../servicios/cliente";
import { Marco, aviso, useAncho } from "../comun";
import { useRecursos } from "../Recursos";
import { RecursosAzotea, arteHub } from "../azotea/Cabecera";
import { FondoSeccion } from "../FondoSeccion";
import { useMomentoAzotea } from "../azotea/HubAzotea";
import "../azotea/azotea.css";
import "../perfil/perfil.css";
import { Torneos } from "./Torneos";
import "./ranking.css";
const BASE = import.meta.env.BASE_URL;
const num = (n) => Math.max(0, Math.round(n)).toLocaleString("es-MX");
const MES = () => new Date().toLocaleDateString("es-MX", { month: "long", timeZone: "America/Mexico_City" });
const PESTANAS = [
    { id: "general", titulo: "General" }, { id: "individual", titulo: "Individual" }, { id: "parejas", titulo: "Parejas" },
    { id: "equipos", titulo: "Equipos" }, { id: "torneos", titulo: "Torneos" }, { id: "records", titulo: "Récords" }, { id: "salon", titulo: "Salón de la Fama" },
];
// Arte de Elías con respaldo: si la imagen no existe, se usa la otra (o nada).
const faltan = new Set();
// Fondo de ceremonia (Elías, 2026-11-23). PRUEBA: ?fondo=publico muestra la versión con público.
const FONDOS_RANKING = [
    { clave: "ceremonia", archivo: "rk-ceremonia", foco: "50% 40%" },
    { clave: "publico", archivo: "rk-ceremonia-publico", foco: "50% 35%" },
];
export function Arte({ nombre, alterno, className = "" }) {
    const [falta, setFalta] = useState(() => faltan.has(nombre));
    if (falta && !alterno)
        return null;
    return _jsx("img", { className: className, src: falta ? alterno : `${BASE}arte/ui/ranking/${nombre}.webp`, alt: "", draggable: false, onError: () => { if (!falta) {
            faltan.add(nombre);
            setFalta(true);
        } } });
}
export const MEDALLA = ["medalla-oro", "medalla-plata", "medalla-bronce"];
// Flechas de subida o bajada: comparan con la última vez que se abrió esta vista en el aparato.
const claveVista = (uid, v) => `alv-ranking-${uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)}-${v}`;
function leerPrevias(clave) {
    try {
        return JSON.parse(localStorage.getItem(clave) ?? "{}");
    }
    catch {
        return {};
    }
}
function guardarPrevias(clave, pos) { try {
    localStorage.setItem(clave, JSON.stringify(pos));
}
catch { /* sin almacenamiento */ } }
export function Ranking() {
    const s = useSesion();
    const r = useRecursos();
    const ancho = useAncho();
    const momento = useMomentoAzotea();
    const [pestana, setPestana] = useState("general");
    const [filtro, setFiltro] = useState("amigos");
    const [temporada, setTemporada] = useState(true);
    const [cat, setCat] = useState("puntos");
    const [voto, setVoto] = useState(null);
    const [jugadores, setJugadores] = useState(undefined);
    const [grupos, setGrupos] = useState(undefined);
    const [enGlobal, setEnGlobal] = useState(null);
    useEffect(() => { void leerRankingGlobal().then(setEnGlobal); }, [s.uid]);
    useEffect(() => {
        if (pestana !== "general" && pestana !== "individual")
            return;
        let vivo = true;
        setJugadores(undefined);
        void rankingJugadores(filtro, temporada).then(f => { if (vivo)
            setJugadores(f); });
        return () => { vivo = false; };
    }, [pestana === "general" || pestana === "individual", filtro, temporada]);
    useEffect(() => {
        if (pestana !== "parejas" && pestana !== "equipos")
            return;
        let vivo = true;
        setGrupos(undefined);
        void rankingGrupos(pestana, filtro, temporada).then(f => { if (vivo)
            setGrupos(f); });
        return () => { vivo = false; };
    }, [pestana, filtro, temporada]);
    useEffect(() => { void cargarMisPuntos(); }, []);
    const alternarGlobal = async () => {
        const nuevo = !(enGlobal ?? true);
        if (await fijarRankingGlobal(nuevo)) {
            setEnGlobal(nuevo);
            aviso(nuevo ? "Ya apareces en el ranking Global." : "Ya no apareces en el Global. Tus amigos te siguen viendo.");
        }
        else
            aviso("No se pudo cambiar. Intenta de nuevo.");
    };
    const etiquetaTemporada = temporada ? `Temporada de ${MES()}` : "Histórico";
    return (_jsx(Marco, { clase: `az pf rk m-${momento}`, fondo: _jsx(FondoSeccion, { opciones: FONDOS_RANKING, velo: .5 }), children: _jsxs("div", { className: "rk-caja", children: [_jsxs("header", { className: "pf-top rk-top", children: [_jsxs("button", { type: "button", className: "pf-atras", onClick: atras, children: [_jsx("span", { "aria-hidden": "true", children: "\u25C0" }), "Atr\u00E1s"] }), _jsx(RecursosAzotea, { monedas: r.monedas, puntos: r.puntos })] }), _jsx("h1", { className: "rk-titulo", children: _jsx("span", { children: "Sal\u00F3n de campeones" }) }), _jsx("nav", { className: "rk-pestanas", "aria-label": "Secciones del ranking", children: PESTANAS.map(p => (_jsxs("button", { type: "button", className: "rk-pest" + (pestana === p.id ? " si" : "") + (p.pronto ? " pronto" : ""), "aria-pressed": pestana === p.id, onClick: () => setPestana(p.id), children: [_jsx(Arte, { nombre: `tab-${p.id}`, className: "rk-pest-ico" }), _jsx("span", { children: p.titulo }), p.pronto && _jsx("small", { children: p.pronto })] }, p.id))) }), !PESTANAS.find(p => p.id === pestana).pronto && pestana !== "torneos" && pestana !== "salon" && (_jsxs("div", { className: "rk-filtros", children: [_jsxs("div", { className: "rk-seg", role: "group", "aria-label": "Con qui\u00E9n comparar", children: [_jsx("button", { type: "button", className: filtro === "amigos" ? "si" : "", "aria-pressed": filtro === "amigos", onClick: () => setFiltro("amigos"), children: "Amigos Legendarios Verdaderos" }), _jsx("button", { type: "button", className: filtro === "global" ? "si" : "", "aria-pressed": filtro === "global", onClick: () => setFiltro("global"), children: "Global" })] }), pestana !== "records" && _jsxs("div", { className: "rk-seg", role: "group", "aria-label": "Periodo", children: [_jsx("button", { type: "button", className: temporada ? "si" : "", "aria-pressed": temporada, onClick: () => setTemporada(true), children: "Temporada" }), _jsx("button", { type: "button", className: !temporada ? "si" : "", "aria-pressed": !temporada, onClick: () => setTemporada(false), children: "Hist\u00F3rico" })] })] })), pestana === "individual" && (_jsx("div", { className: "rk-cats rk-votos", role: "group", "aria-label": "Reconocimientos de los amigos", children: VOTOS.map(v => _jsxs("button", { type: "button", className: voto === v.id ? "si" : "", "aria-pressed": voto === v.id, onClick: () => setVoto(x => (x === v.id ? null : v.id)), children: [v.emoji, " ", v.titulo] }, v.id)) })), pestana === "individual" && voto && _jsx(Reconocimientos, { categoria: voto, filtro: filtro, temporada: temporada, yo: s.uid, etiqueta: etiquetaTemporada }), (pestana === "general" || (pestana === "individual" && !voto)) && (_jsx(Jugadores, { filas: jugadores, cat: pestana === "general" ? "puntos" : cat, conCategorias: pestana === "individual", alCat: c => { setCat(c); setVoto(null); }, yo: s.uid, vista: `${pestana}-${pestana === "general" ? "puntos" : cat}-${filtro}-${temporada ? "t" : "h"}`, etiqueta: etiquetaTemporada, ancho: ancho })), (pestana === "parejas" || pestana === "equipos") && _jsxs(_Fragment, { children: [_jsx(Grupos, { filas: grupos, modalidad: pestana, yo: s.uid, etiqueta: etiquetaTemporada }), _jsx(MisGrupos, { modalidad: pestana, alGuardar: () => void rankingGrupos(pestana, filtro, temporada).then(setGrupos) })] }), pestana === "torneos" && (_jsx(Torneos, { yo: s.uid, admin: s.admin || !hayNube })), pestana === "records" && _jsx(Records, { filtro: filtro, yo: s.uid }), pestana === "salon" && _jsx(Salon, {}), filtro === "global" && enGlobal !== null && !PESTANAS.find(p => p.id === pestana).pronto && pestana !== "torneos" && pestana !== "salon" && (_jsxs("p", { className: "rk-privacidad", children: [enGlobal ? "Apareces en el ranking Global." : "No apareces en el Global; solo te ven tus Amigos Legendarios Verdaderos.", _jsx("button", { type: "button", onClick: () => void alternarGlobal(), children: enGlobal ? "Ocultarme" : "Aparecer" })] }))] }) }));
}
/** Ranking individual: podio con los tres primeros y la tabla. */
function Jugadores({ filas, cat, conCategorias, alCat, yo, vista, etiqueta, ancho }) {
    const orden = useMemo(() => (filas ? ordenarPor(filas, cat) : []), [filas, cat]);
    const def = CATEGORIAS.find(c => c.id === cat);
    const clave = claveVista(yo, vista);
    const [previas] = useState(() => leerPrevias(clave));
    useEffect(() => { if (orden.length)
        guardarPrevias(clave, Object.fromEntries(orden.map(f => [f.id, f.lugar]))); }, [orden, clave]);
    const conValor = orden.filter(f => f.valor > 0);
    const mia = orden.find(f => f.id === yo);
    const visibles = orden.slice(0, ancho ? 20 : 15);
    const miaFuera = mia && !visibles.some(f => f.id === yo);
    return (_jsxs(_Fragment, { children: [conCategorias && (_jsx("div", { className: "rk-cats", role: "group", "aria-label": "Categor\u00EDa", children: CATEGORIAS.map(c => _jsx("button", { type: "button", className: c.id === cat ? "si" : "", "aria-pressed": c.id === cat, onClick: () => alCat(c.id), children: c.titulo }, c.id)) })), filas === undefined ? _jsx("p", { className: "rk-cargando", role: "status", children: "Leyendo el ranking\u2026" })
                : filas === null ? _jsx("p", { className: "rk-cargando", role: "status", children: "No se pudo leer el ranking. Revisa tu conexi\u00F3n." })
                    : !conValor.length ? (_jsx("section", { className: "pf-bloque rk-vacio", children: _jsxs("p", { className: "pf-suave", children: ["Todav\u00EDa nadie suma en \u00AB", def.titulo, "\u00BB (", etiqueta.toLowerCase(), "). El primer lugar est\u00E1 libre: termina una partida."] }) })) : (_jsxs(_Fragment, { children: [_jsx(Podio, { filas: conValor.slice(0, 3), unidad: def.unidad, yo: yo }), _jsxs("section", { className: "pf-bloque rk-tabla-caja", "aria-label": `${def.titulo}, ${etiqueta}`, children: [_jsxs("h2", { className: "pf-tit", children: [_jsx("span", { children: def.titulo }), _jsx("small", { className: "rk-periodo", children: etiqueta })] }), _jsxs("ol", { className: "rk-tabla", children: [visibles.map(f => _jsx(Fila, { f: f, unidad: def.unidad, yo: yo, antes: previas[f.id] }, f.id)), miaFuera && _jsxs(_Fragment, { children: [_jsx("li", { className: "rk-salto", "aria-hidden": "true", children: "\u00B7\u00B7\u00B7" }), _jsx(Fila, { f: mia, unidad: def.unidad, yo: yo, antes: previas[mia.id] })] })] })] })] }))] }));
}
function Retrato({ f, grande }) {
    const url = useFoto(f.figura, f.figura ? undefined : semillaDe(f.id), grande ? "cuerpo" : "busto");
    return _jsx("span", { className: grande ? "rk-cuerpo" : "rk-retrato", children: url ? _jsx("img", { src: url, alt: "", draggable: false }) : _jsx("span", { className: "rk-sin-foto" }) });
}
export function Podio({ filas, unidad, yo }) {
    // Orden visual: 2.º, 1.º, 3.º
    const lugares = [filas[1], filas[0], filas[2]];
    return (_jsxs("section", { className: "rk-podio", "aria-label": "Podio", children: [_jsx(Arte, { nombre: "podio", className: "rk-podio-img" }), lugares.map((f, i) => {
                const puesto = i === 1 ? 1 : i === 0 ? 2 : 3;
                if (!f)
                    return _jsx("span", { className: `rk-escalon p${puesto} vacio` }, i);
                return (_jsxs("div", { className: `rk-escalon p${puesto}` + (f.id === yo ? " yo" : ""), style: { "--i": i }, children: [puesto === 1 && _jsx("span", { className: "rk-rayos", "aria-hidden": "true" }), _jsx(Retrato, { f: f, grande: true }), _jsxs("div", { className: "rk-placa", children: [_jsx(Arte, { nombre: MEDALLA[f.lugar - 1] ?? "medalla-bronce", alterno: arteHub("puntos"), className: "rk-medalla" }), _jsx("b", { children: apodoDe(f.figura) ?? f.nombre }), _jsxs("small", { children: [num(f.valor), " ", unidad] })] })] }, f.id));
            })] }));
}
export function Fila({ f, unidad, yo, antes }) {
    const cambio = antes == null ? 0 : antes - f.lugar;
    const apodo = apodoDe(f.figura);
    return (_jsxs("li", { className: "rk-fila" + (f.id === yo ? " yo" : "") + (f.lugar <= 3 && f.valor > 0 ? ` top${f.lugar}` : ""), children: [_jsxs("span", { className: "rk-pos", children: [f.lugar <= 3 && f.valor > 0 ? _jsx(Arte, { nombre: MEDALLA[f.lugar - 1], alterno: arteHub("puntos"), className: "rk-medalla-chica" }) : null, _jsx("b", { children: f.lugar })] }), _jsx("span", { className: "rk-marco" + (f.rareza_titulo ? ` r-${f.rareza_titulo}` : ""), children: _jsx(Retrato, { f: f }) }), _jsxs("span", { className: "rk-nombre", children: [_jsxs("b", { children: [apodo ?? f.nombre, f.id === yo && _jsx("em", { children: "T\u00FA" })] }), _jsxs("small", { children: [apodo ? `@${f.nombre} · ` : "", "Niv. ", f.nivel, " \u00B7 ", f.titulo ? _jsx("i", { className: `rk-tlogro r-${f.rareza_titulo ?? "comun"}`, children: f.titulo }) : tituloPorNivel(f.nivel)] })] }), cambio !== 0 && _jsxs("span", { className: "rk-cambio " + (cambio > 0 ? "sube" : "baja"), "aria-label": cambio > 0 ? `Subió ${cambio}` : `Bajó ${-cambio}`, children: [_jsx(Arte, { nombre: cambio > 0 ? "flecha-sube" : "flecha-baja", className: "rk-flecha" }), _jsxs("span", { "aria-hidden": "true", children: [cambio > 0 ? "▲" : "▼", Math.abs(cambio)] })] }), _jsxs("span", { className: "rk-valor", children: [_jsx("b", { children: num(f.valor) }), _jsx("small", { children: unidad })] })] }));
}
function Grupos({ filas, modalidad, yo, etiqueta }) {
    if (filas === undefined)
        return _jsx("p", { className: "rk-cargando", role: "status", children: "Leyendo el ranking\u2026" });
    if (filas === null)
        return _jsx("p", { className: "rk-cargando", role: "status", children: "No se pudo leer el ranking. Revisa tu conexi\u00F3n." });
    const titulo = modalidad === "parejas" ? "Mejores parejas" : "Mejores equipos";
    if (!filas.length)
        return _jsx("section", { className: "pf-bloque rk-vacio", children: _jsxs("p", { className: "pf-suave", children: ["Todav\u00EDa no hay ", modalidad, " con partidas (", etiqueta.toLowerCase(), "). Jueguen una partida ", modalidad === "parejas" ? "en parejas" : "por equipos", " para estrenar esta tabla."] }) });
    return (_jsxs("section", { className: "pf-bloque rk-tabla-caja", "aria-label": `${titulo}, ${etiqueta}`, children: [_jsxs("h2", { className: "pf-tit", children: [_jsx("span", { children: titulo }), _jsx("small", { className: "rk-periodo", children: etiqueta })] }), _jsx("ol", { className: "rk-tabla", children: filas.map(g => (_jsxs("li", { className: "rk-fila grupo" + (g.integrantes.includes(yo) ? " yo" : "") + (g.posicion <= 3 ? ` top${g.posicion}` : ""), children: [_jsxs("span", { className: "rk-pos", children: [g.posicion <= 3 ? _jsx(Arte, { nombre: MEDALLA[g.posicion - 1], alterno: arteHub("puntos"), className: "rk-medalla-chica" }) : null, _jsx("b", { children: g.posicion })] }), g.emoji ? _jsx("span", { className: "rk-emoji", style: { borderColor: g.color ?? undefined }, "aria-hidden": "true", children: g.emoji }) : null, _jsxs("span", { className: "rk-nombre", children: [_jsx("b", { style: g.color ? { color: g.color } : undefined, children: g.nombre_grupo ?? g.nombres.join(" + ") }), g.nombre_grupo && _jsx("small", { children: g.nombres.join(" + ") }), _jsxs("small", { children: [g.victorias, " ", g.victorias === 1 ? "victoria" : "victorias", " \u00B7 ", g.partidas, " ", g.partidas === 1 ? "partida" : "partidas", " \u00B7 ", g.porcentaje, "%", g.racha > 1 ? ` · racha de ${g.racha}` : ""] })] }), _jsxs("span", { className: "rk-valor", children: [_jsx("b", { children: num(g.puntos_alv) }), _jsx("small", { children: "PA" })] })] }, g.integrantes.join("+")))) })] }));
}
/** Ranking por votos de la noche (043, D6). */
function Reconocimientos({ categoria, filtro, temporada, yo, etiqueta }) {
    const [filas, setFilas] = useState(undefined);
    useEffect(() => { let v = true; setFilas(undefined); void rankingReconocimientos(filtro, categoria, temporada).then(f => { if (v)
        setFilas(f); }); return () => { v = false; }; }, [categoria, filtro, temporada]);
    const def = VOTOS.find(v => v.id === categoria);
    if (filas === undefined)
        return _jsx("p", { className: "rk-cargando", role: "status", children: "Contando votos\u2026" });
    if (filas === null)
        return _jsx("p", { className: "rk-cargando", role: "status", children: "No se pudo leer. Revisa tu conexi\u00F3n." });
    if (!filas.length)
        return _jsx("section", { className: "pf-bloque rk-vacio", children: _jsxs("p", { className: "pf-suave", children: ["Todav\u00EDa nadie recibe votos de \u00AB", def.titulo, "\u00BB. Se vota al final de cada noche, en la pesta\u00F1a Torneos."] }) });
    const conLugar = filas.map(f => ({ ...f, lugar: f.posicion, valor: f.votos, puntos_alv: 0, victorias: 0, partidas: 0, mvp: 0, racha: 0, juegos: 0, victorias_azar: 0, victorias_deduccion: 0 }));
    return (_jsxs("section", { className: "pf-bloque rk-tabla-caja", "aria-label": `${def.titulo}, ${etiqueta}`, children: [_jsxs("h2", { className: "pf-tit", children: [_jsxs("span", { children: [def.emoji, " ", def.titulo] }), _jsx("small", { className: "rk-periodo", children: etiqueta })] }), _jsx("ol", { className: "rk-tabla", children: conLugar.map(f => _jsx(Fila, { f: f, unidad: f.votos === 1 ? "voto" : "votos", yo: yo }, f.id)) })] }));
}
const COLORES = ["#ff3b6b", "#ffc21a", "#2ee6d6", "#4f8dff", "#a35cff", "#7ff7a0", "#ff8a1f", "#ffffff"];
const EMOJIS = ["👑", "🔥", "⚡", "🦁", "🐍", "🦄", "💀", "🎯", "🍕", "🚀", "🌮", "🎉"];
/** Ponle nombre, color y emoji a tus parejas y equipos (043, D4). */
function MisGrupos({ modalidad, alGuardar }) {
    const [lista, setLista] = useState(null);
    const [editando, setEditando] = useState(null);
    const [nombre, setNombre] = useState("");
    const [color, setColor] = useState(COLORES[0]);
    const [emoji, setEmoji] = useState(EMOJIS[0]);
    useEffect(() => { void misGrupos().then(setLista); }, []);
    const mios = (lista ?? []).filter(g => g.modalidad === modalidad);
    if (!mios.length)
        return null;
    const abrir = (g) => { setEditando(g.grupo); setNombre(g.nombre ?? ""); setColor(g.color ?? COLORES[0]); setEmoji(g.emoji ?? EMOJIS[0]); };
    const guardar = async (g) => {
        const error = await nombrarGrupo(g.grupo, nombre.trim(), color, emoji);
        if (error) {
            aviso(error);
            return;
        }
        aviso("Guardado.");
        setEditando(null);
        void misGrupos().then(setLista);
        alGuardar();
    };
    return (_jsxs("section", { className: "pf-bloque rk-misgrupos", "aria-label": `Tus ${modalidad}`, children: [_jsx("h2", { className: "pf-tit", children: _jsxs("span", { children: ["Tus ", modalidad] }) }), _jsx("ul", { className: "rk-misgrupos-lista", children: mios.map(g => (_jsx("li", { children: editando === g.grupo ? (_jsxs("div", { className: "rk-grupo-editor", children: [_jsx("input", { value: nombre, maxLength: 30, onChange: e => setNombre(e.target.value), placeholder: "Nombre", "aria-label": "Nombre" }), _jsx("div", { className: "rk-paleta", role: "group", "aria-label": "Color", children: COLORES.map(c => _jsx("button", { type: "button", className: c === color ? "si" : "", style: { background: c }, "aria-label": c, onClick: () => setColor(c) }, c)) }), _jsx("div", { className: "rk-paleta emojis", role: "group", "aria-label": "Emoji", children: EMOJIS.map(e => _jsx("button", { type: "button", className: e === emoji ? "si" : "", onClick: () => setEmoji(e), children: e }, e)) }), _jsxs("div", { className: "rk-nuevo-acciones", children: [_jsx("button", { type: "button", className: "rk-cancelar", onClick: () => setEditando(null), children: "Cancelar" }), _jsx("button", { type: "button", className: "rk-abrir", disabled: nombre.trim().length < 2, onClick: () => void guardar(g), children: "Guardar" })] })] })) : (_jsxs("button", { type: "button", className: "rk-migrupo", onClick: () => abrir(g), children: [_jsx("span", { className: "rk-emoji", style: { borderColor: g.color ?? undefined }, "aria-hidden": "true", children: g.emoji ?? "＋" }), _jsxs("span", { className: "rk-nombre", children: [_jsx("b", { style: g.color ? { color: g.color } : undefined, children: g.nombre ?? "Sin nombre" }), _jsxs("small", { children: [g.integrantes.join(" + "), " \u00B7 ", g.partidas, " partidas"] })] }), _jsx("span", { className: "rk-editar", children: "\u270E" })] })) }, g.grupo))) })] }));
}
/** Récords históricos (044). El fiestero solo cuenta partidas con Drunk y nunca da puntos ni XP (D7). */
function Records({ filtro, yo }) {
    const [lista, setLista] = useState(undefined);
    const [oculto, setOculto] = useState(null);
    const cargar = () => records(filtro).then(setLista);
    useEffect(() => { setLista(undefined); void cargar(); }, [filtro]);
    useEffect(() => { void leerOcultarBebidas().then(setOculto); }, []);
    const alternar = async () => {
        const nuevo = !oculto;
        if (await fijarOcultarBebidas(nuevo)) {
            setOculto(nuevo);
            aviso(nuevo ? "Tu estadística de bebidas ya no se muestra." : "Tu estadística de bebidas se vuelve a mostrar.");
            void cargar();
        }
        else
            aviso("No se pudo cambiar.");
    };
    if (lista === undefined)
        return _jsx("p", { className: "rk-cargando", role: "status", children: "Buscando r\u00E9cords\u2026" });
    if (lista === null)
        return _jsx("p", { className: "rk-cargando", role: "status", children: "No se pudieron leer los r\u00E9cords." });
    return (_jsxs(_Fragment, { children: [_jsx("ul", { className: "rk-records", children: RECORDS.map((d, i) => {
                    const r = lista.find(x => x.clave === d.clave);
                    return (_jsxs("li", { className: "rk-record" + (r?.id === yo ? " yo" : "") + (r ? "" : " libre"), style: { "--i": i }, children: [_jsx("span", { className: "rk-record-emoji", "aria-hidden": "true", children: d.emoji }), _jsx("b", { className: "rk-record-tit", children: d.titulo }), _jsx("small", { className: "rk-record-txt", children: d.texto }), r ? _jsxs("span", { className: "rk-record-quien", children: [_jsx(Retrato, { f: r }), _jsxs("span", { children: [_jsxs("b", { children: [r.nombre, r.id === yo && _jsx("em", { children: "T\u00FA" })] }), _jsxs("small", { children: [num(r.valor), " ", d.unidad] })] })] })
                                : _jsx("span", { className: "rk-record-quien vacio", children: "Nadie todav\u00EDa. \u00A1Es tuyo si lo quieres!" }), r && r.id !== yo && r.mio > 0 && _jsxs("small", { className: "rk-record-mio", children: ["T\u00FA: ", num(r.mio)] })] }, d.clave));
                }) }), oculto !== null && _jsxs("p", { className: "rk-privacidad", children: [oculto ? "Tu estadística de bebidas está oculta." : "Tu estadística de bebidas se muestra en «El fiestero».", _jsx("button", { type: "button", onClick: () => void alternar(), children: oculto ? "Mostrarla" : "Ocultarla" })] })] }));
}
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesTexto = (e) => { const [a, m] = e.split("-"); return `${MESES[Number(m) - 1] ?? ""} ${a}`; };
/** Salón de la Fama (044): fotos fijas de campeones de temporada, parejas, equipos y torneos. */
function Salon() {
    const [lista, setLista] = useState(undefined);
    useEffect(() => { void salonDeLaFama().then(setLista); }, []);
    if (lista === undefined)
        return _jsx("p", { className: "rk-cargando", role: "status", children: "Abriendo el Sal\u00F3n de la Fama\u2026" });
    if (lista === null)
        return _jsx("p", { className: "rk-cargando", role: "status", children: "No se pudo leer el Sal\u00F3n de la Fama." });
    if (!lista.length)
        return _jsx("section", { className: "pf-bloque rk-vacio", children: _jsx("p", { className: "pf-suave", children: "El Sal\u00F3n de la Fama se llena al cerrar cada mes y cada torneo. El primer campe\u00F3n de temporada se corona el d\u00EDa 1 del pr\u00F3ximo mes." }) });
    const meses = [...new Set(lista.filter(x => x.tipo !== "torneo").map(x => x.etiqueta))];
    const torneos = lista.filter(x => x.tipo === "torneo");
    return (_jsxs(_Fragment, { children: [meses.map(m => {
                const xs = lista.filter(x => x.etiqueta === m && x.tipo !== "torneo");
                const podio = xs.filter(x => x.tipo === "temporada");
                const grupos = xs.filter(x => x.tipo !== "temporada");
                return (_jsxs("section", { className: "pf-bloque rk-salon", "aria-label": `Temporada de ${mesTexto(m)}`, children: [_jsx("h2", { className: "pf-tit", children: _jsxs("span", { children: ["Temporada de ", mesTexto(m)] }) }), podio.length > 0 && _jsx(Podio, { filas: podio.map((x, i) => ({ posicion: x.posicion, lugar: x.posicion, valor: x.valor, id: `${m}-${i}`, nombre: x.nombres[0] ?? "", nivel: 1, figura: x.figura,
                                puntos_alv: x.valor, victorias: 0, partidas: 0, mvp: 0, racha: 0, juegos: 0, victorias_azar: 0, victorias_deduccion: 0 })), unidad: "PA", yo: "" }), grupos.length > 0 && _jsx("ul", { className: "rk-salon-grupos", children: grupos.map((g, i) => (_jsxs("li", { children: [_jsx("span", { "aria-hidden": "true", children: g.tipo === "pareja" ? "💞" : "🛡️" }), _jsx("b", { children: g.tipo === "pareja" ? "Mejor pareja" : "Mejor equipo" }), _jsxs("small", { children: [g.nombres.join(" + "), " \u00B7 ", num(g.valor), " PA"] })] }, i))) })] }, m));
            }), torneos.length > 0 && (_jsxs("section", { className: "pf-bloque rk-salon", "aria-label": "Campeones de torneos", children: [_jsx("h2", { className: "pf-tit", children: _jsx("span", { children: "Campeones de torneos" }) }), _jsx("ul", { className: "rk-salon-grupos", children: torneos.map((t, i) => (_jsxs("li", { children: [_jsx("span", { "aria-hidden": "true", children: "\uD83C\uDFC6" }), _jsx("b", { children: t.etiqueta }), _jsxs("small", { children: [t.nombres.join(", "), " \u00B7 ", num(t.valor), " PA"] })] }, i))) })] }))] }));
}
