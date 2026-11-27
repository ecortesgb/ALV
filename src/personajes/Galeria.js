import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Galería «Elegir personaje» (ALV_PLAN_PERSONAJES_NUEVO.md §2.2 y wireframes). Va dentro de <RaizDS>.
// Lista a la izquierda (páginas que se pasan de lado, sin bajar) y ficha con el personaje en 3D a la derecha; en
// celular la ficha sube desde abajo. El 3D es el iframe de tools/personajes/escena.html: aquí solo se le mandan planos.
import { useEffect, useMemo, useRef, useState } from "react";
import { Boton, Chip, Icono } from "../ds";
import { deCatalogo } from "./figura";
import { SIN_FILTRO, caben, categorias, filtrar, guardarFavoritos, leerFavoritos, nombreSaga, paginas, tarjetas } from "./galeriaDatos";
import { resolver } from "./plano";
import { Vista3D } from "./Vista3D";
import "./galeria.css";
const iniciales = (n) => n.split(/\s+/).map(p => p[0]).join("").slice(0, 2).toUpperCase();
export function Galeria({ catalogo, pruebas, jugador, escenaUrl, actual, onUsar, onPersonalizar, personalizable, onSalir }) {
    const todas = useMemo(() => tarjetas(catalogo, { conBorradores: !!pruebas?.size, pruebas }), [catalogo, pruebas]);
    const [favs, setFavs] = useState(() => leerFavoritos(jugador));
    const [filtro, setFiltro] = useState(SIN_FILTRO);
    const [elegido, setElegido] = useState(actual ?? null);
    const [abierta, setAbierta] = useState(false); // ficha en celular
    const [pagina, setPagina] = useState(0);
    const [hecho, setHecho] = useState(null);
    const [caja, setCaja] = useState({ columnas: 3, filas: 2 });
    const rejilla = useRef(null);
    useEffect(() => {
        const el = rejilla.current;
        if (!el)
            return;
        // En celular tarjetas más chicas (3 columnas); en pantallas anchas, más grandes.
        const medir = () => setCaja(caben(el.clientWidth, el.clientHeight, { min: el.clientWidth < 520 ? 98 : 124, proporcion: 1.28, hueco: 10 }));
        medir();
        const ro = new ResizeObserver(medir);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const cats = useMemo(() => categorias(todas, favs), [todas, favs]);
    const lista = useMemo(() => filtrar(todas, filtro, favs), [todas, filtro, favs]);
    const pags = useMemo(() => paginas(lista, caja.columnas * caja.filas), [lista, caja]);
    const p = Math.min(pagina, pags.length - 1);
    useEffect(() => { setPagina(0); }, [filtro]);
    useEffect(() => { if (!elegido && lista[0])
        setElegido(lista[0].id); }, [lista, elegido]);
    const t = todas.find(x => x.id === elegido) ?? null;
    const planoFicha = useMemo(() => { const en = elegido ? catalogo.get(elegido) : null; return en ? resolver("ficha", deCatalogo(en.ficha), catalogo) : null; }, [elegido, catalogo]);
    const alternarFav = (id) => setFavs(prev => {
        const s = new Set(prev);
        if (s.has(id))
            s.delete(id);
        else
            s.add(id);
        guardarFavoritos(jugador, s);
        return s;
    });
    // Celular: la ficha sube desde abajo. Cerrada queda fuera del teclado y de los lectores de pantalla (inert); abierta
    // recibe el foco, lo de atrás queda inerte y Escape la cierra devolviendo el foco a la tarjeta (Codex, cierre-r1).
    const [celular, setCelular] = useState(() => typeof matchMedia === "function" && matchMedia("(max-width: 859px)").matches);
    useEffect(() => {
        if (typeof matchMedia !== "function")
            return;
        const m = matchMedia("(max-width: 859px)"), f = () => setCelular(m.matches);
        m.addEventListener("change", f);
        return () => m.removeEventListener("change", f);
    }, []);
    const ficha = useRef(null), atras = useRef(null), cerrar = useRef(null);
    const deDonde = useRef(null);
    useEffect(() => {
        const fichaOculta = celular && !abierta, fondoInerte = celular && abierta;
        ficha.current?.toggleAttribute("inert", fichaOculta);
        ficha.current?.setAttribute("aria-hidden", String(fichaOculta));
        atras.current?.toggleAttribute("inert", fondoInerte);
        if (fondoInerte)
            cerrar.current?.focus({ preventScroll: true });
    }, [celular, abierta]);
    const cerrarFicha = () => { setAbierta(false); setTimeout(() => deDonde.current?.focus({ preventScroll: true }), 0); };
    useEffect(() => {
        if (!(celular && abierta))
            return;
        const f = (e) => { if (e.key === "Escape")
            cerrarFicha(); };
        addEventListener("keydown", f);
        return () => removeEventListener("keydown", f);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [celular, abierta]);
    const elegir = (id, de) => { setElegido(id); setAbierta(true); setHecho(null); if (de)
        deDonde.current = de; };
    const usar = () => {
        if (!t)
            return;
        const en = catalogo.get(t.id);
        if (!en)
            return;
        onUsar(deCatalogo(en.ficha), t);
        setHecho(t.id);
    };
    // Pasar de página deslizando de lado.
    const toque = useRef(null);
    const bajar = (e) => { toque.current = { x: e.clientX, y: e.clientY }; };
    const subir = (e) => {
        const s = toque.current;
        toque.current = null;
        if (!s)
            return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y))
            setPagina(Math.max(0, Math.min(pags.length - 1, p + (dx < 0 ? 1 : -1))));
    };
    return (_jsxs("div", { className: "gal" + (abierta ? " gal-ficha-abierta" : ""), children: [_jsxs("div", { className: "gal-atrasde", ref: atras, children: [_jsxs("header", { className: "gal-top", children: [onSalir && _jsx("button", { type: "button", className: "gal-atras", onClick: onSalir, "aria-label": "Regresar", children: _jsx(Icono, { id: "back" }) }), _jsx("h1", { className: "dsp ol gal-titulo", children: "Elegir personaje" }), _jsxs("span", { className: "gal-cuenta", children: [lista.length, " de ", todas.length] })] }), _jsxs("nav", { className: "gal-filtros", "aria-label": "Filtros", children: [_jsx("div", { className: "gal-fila", children: cats.map(c => _jsx(Chip, { texto: c.id === "favoritos" ? `★ ${c.nombre}` : c.nombre, seleccionado: filtro.categoria === c.id, onClick: () => setFiltro(f => ({ ...f, categoria: c.id })) }, c.id)) }), _jsxs("div", { className: "gal-fila", children: [_jsx(Chip, { texto: "H\u00E9roes", seleccionado: filtro.bando === "heroe", onClick: () => setFiltro(f => ({ ...f, bando: f.bando === "heroe" ? null : "heroe" })) }), _jsx(Chip, { texto: "Villanos", seleccionado: filtro.bando === "villano", onClick: () => setFiltro(f => ({ ...f, bando: f.bando === "villano" ? null : "villano" })) }), _jsx("span", { className: "gal-sep", "aria-hidden": "true" }), _jsx(Chip, { texto: "Normal", seleccionado: filtro.tamano === "normal", onClick: () => setFiltro(f => ({ ...f, tamano: f.tamano === "normal" ? null : "normal" })) }), _jsx(Chip, { texto: "Grande", seleccionado: filtro.tamano === "grande", onClick: () => setFiltro(f => ({ ...f, tamano: f.tamano === "grande" ? null : "grande" })) })] })] }), _jsxs("section", { className: "gal-lista", "aria-label": "Personajes", children: [_jsxs("div", { className: "gal-rejilla", ref: rejilla, onPointerDown: bajar, onPointerUp: subir, style: { gridTemplateColumns: `repeat(${caja.columnas}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${caja.filas}, minmax(0, 1fr))` }, children: [pags[p].map(x => (_jsxs("div", { className: "gal-tarj" + (x.id === elegido ? " on" : "") + (x.id === actual ? " usado" : ""), children: [_jsxs("button", { type: "button", className: "gal-tarj-boton", onClick: e => elegir(x.id, e.currentTarget), "aria-pressed": x.id === elegido, children: [_jsx("span", { className: "gal-foto", children: x.foto ? _jsx("img", { src: x.foto, alt: "", draggable: false, loading: "lazy" }) : _jsx("span", { className: "gal-ini dsp", children: iniciales(x.nombre) }) }), _jsx("span", { className: "gal-nombre dsp", children: x.nombre }), x.prueba && _jsx("span", { className: "gal-prueba", children: "prueba" })] }), _jsx("button", { type: "button", className: "gal-estrella" + (favs.has(x.id) ? " on" : ""), onClick: () => alternarFav(x.id), "aria-label": (favs.has(x.id) ? "Quitar de favoritos: " : "Agregar a favoritos: ") + x.nombre, "aria-pressed": favs.has(x.id), children: _jsx(Icono, { id: "star" }) })] }, x.id))), !lista.length && _jsx("p", { className: "gal-vacio", children: "No hay personajes con estos filtros." })] }), _jsxs("div", { className: "gal-paginas", children: [_jsx("button", { type: "button", className: "gal-flecha", onClick: () => setPagina(Math.max(0, p - 1)), disabled: p === 0, "aria-label": "P\u00E1gina anterior", children: _jsx(Icono, { id: "back" }) }), _jsx("span", { className: "gal-puntos", "aria-label": `Página ${p + 1} de ${pags.length}`, children: pags.map((_, i) => _jsx("i", { className: i === p ? "on" : "" }, i)) }), _jsx("button", { type: "button", className: "gal-flecha der", onClick: () => setPagina(Math.min(pags.length - 1, p + 1)), disabled: p >= pags.length - 1, "aria-label": "P\u00E1gina siguiente", children: _jsx(Icono, { id: "back" }) })] })] })] }), _jsxs("section", { className: "d-pnl gal-ficha", ref: ficha, "aria-label": t ? "Ficha de " + t.nombre : "Ficha", children: [_jsx("button", { type: "button", className: "gal-cerrar", ref: cerrar, onClick: cerrarFicha, "aria-label": "Cerrar ficha", children: _jsx(Icono, { id: "back" }) }), _jsx(Vista3D, { url: escenaUrl, plano: planoFicha }), t ? (_jsxs("div", { className: "gal-datos", children: [_jsxs("div", { className: "gal-cabeza", children: [_jsxs("div", { children: [_jsx("h2", { className: "dsp ol", children: t.nombre }), _jsxs("p", { children: [nombreSaga(t.saga), " \u00B7 ", t.tamano === "grande" ? "Grande" : "Minifigura", t.bando === "villano" ? " · Villano" : ""] })] }), _jsx("button", { type: "button", className: "gal-estrella grande" + (favs.has(t.id) ? " on" : ""), onClick: () => alternarFav(t.id), "aria-label": favs.has(t.id) ? "Quitar de favoritos" : "Agregar a favoritos", "aria-pressed": favs.has(t.id), children: _jsx(Icono, { id: "star" }) })] }), _jsxs("div", { className: "gal-acciones", children: [_jsx(Boton, { color: "amarillo", texto: hecho === t.id || actual === t.id ? "¡Es tu personaje!" : "Usar", icono: "play", onClick: usar }), onPersonalizar && (!personalizable || personalizable(t.familia)
                                        ? _jsx(Boton, { color: "azul", texto: "Personalizar", icono: "shirt", onClick: () => { const en = catalogo.get(t.id); if (en)
                                                onPersonalizar(deCatalogo(en.ficha), t); } })
                                        : _jsxs("span", { className: "gal-nota", children: [t.nombre, " todav\u00EDa no se puede personalizar: a\u00FAn no hay piezas de su tama\u00F1o."] }))] })] })) : _jsx("p", { className: "gal-vacio", children: "Elige un personaje." })] })] }));
}
