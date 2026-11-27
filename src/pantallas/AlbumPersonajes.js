import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { NUMEROS_PERSONAJES } from "../content/numerosPersonajes";
import { rarezaPersonaje as rareza } from "../content/personajesTienda";
import { banderaV3, categorias, deCatalogo, nombreSaga, paginas, resolverFigura, tarjetas, useEstadoCatalogoV3, useMiniaturas } from "../personajes/integracion";
import { comprarPersonajes, useTienda } from "../servicios/tienda";
import { aviso, confirmar } from "./comun";
import { CartaPersonaje, etiquetaRareza, LOGOS, logo } from "./CartaPersonaje";
import "./album-personajes.css";
const SIN_FAVORITOS = new Set();
const POR_PAGINA = 12;
const GRUPOS_MARVEL = new Map([
    ["avengers", "Avengers"], ["x-men", "X-Men"], ["guardianes", "Guardianes"],
    ["villanos-marvel", "Villanos"], ["otros-marvel", "Otros"],
]);
function LogoSeccion({ id, nombre }) {
    const archivo = id === "guardianes" ? "guardianes-plata" : id === "villanos-marvel" ? "villanos" : id;
    return LOGOS[id] ? _jsx("img", { src: logo(archivo), alt: nombre, draggable: false }) : _jsx(_Fragment, { children: nombre });
}
export function AlbumPersonajes({ mercado }) {
    const { catalogo, estado, reintentar } = useEstadoCatalogoV3();
    return _jsxs("section", { className: "t-album", "aria-labelledby": "t-album-figuras", children: [_jsx("h2", { id: "t-album-figuras", children: "\u00C1lbum de personajes" }), catalogo ? _jsx(Figuras, { catalogo: catalogo, mercado: mercado }) : estado === "cargando"
                ? _jsx("p", { role: "status", children: "Cargando personajes\u2026" })
                : _jsxs("div", { className: "t-album-vacio", children: [_jsx("p", { children: "El cat\u00E1logo de personajes todav\u00EDa no est\u00E1 disponible en esta sesi\u00F3n." }), banderaV3() && _jsx("button", { type: "button", className: "t-ap-todas", onClick: reintentar, children: "Reintentar" })] })] });
}
function Figuras({ catalogo, mercado }) {
    const { personajes } = useTienda();
    const todas = useMemo(() => tarjetas(catalogo.catalogo), [catalogo]);
    const sagas = useMemo(() => categorias(todas, SIN_FAVORITOS).slice(1), [todas]);
    const [sagaElegida, setSaga] = useState();
    const [grupoElegido, setGrupo] = useState();
    const [elegida, setElegida] = useState(null);
    const comprando = useRef(false);
    const ofertas = useMemo(() => new Map((mercado ?? []).map(c => [c.id, c])), [mercado]);
    const saga = sagas.find(s => s.id === sagaElegida) ?? sagas[0];
    if (!saga)
        return _jsx("p", { children: "El cat\u00E1logo todav\u00EDa no tiene personajes listos para el \u00E1lbum." });
    const deSaga = todas.filter(t => t.saga === saga.id);
    const idsGrupo = new Set(deSaga.map(t => t.grupo));
    const gruposConocidos = saga.id === "marvel" ? [...GRUPOS_MARVEL.keys()].filter(id => idsGrupo.delete(id)) : [];
    const grupos = [...gruposConocidos, ...idsGrupo].map(id => ({
        id, nombre: (saga.id === "marvel" ? GRUPOS_MARVEL.get(id) : undefined) ?? nombreSaga(id),
    }));
    const grupo = grupos.find(g => g.id === grupoElegido) ?? grupos[0];
    const lista = deSaga.filter(t => t.grupo === grupo.id);
    const comprar = async (tarjeta, oferta) => {
        if (comprando.current)
            return;
        comprando.current = true;
        try {
            if (!await confirmar({ titulo: `¿Comprar a ${tarjeta.nombre}?`, texto: `Esta carta cuesta ${oferta.precio} monedas y se añade a tu colección.`, si: "Comprar", no: "Ahora no" }))
                return;
            const r = await comprarPersonajes("carta", tarjeta.id, oferta.precio, mercado ?? []);
            aviso(typeof r === "string" ? r : `¡${tarjeta.nombre} se añadió a tu colección!`);
        }
        catch {
            aviso("No se pudo completar la compra. Revisa tu conexión.");
        }
        finally {
            comprando.current = false;
        }
    };
    return _jsxs(_Fragment, { children: [sagas.length > 1 && _jsx("nav", { className: "t-album-nav t-album-sagas", "aria-label": "Sagas de personajes", children: sagas.map(s => _jsx("button", { type: "button", "aria-pressed": saga.id === s.id, onClick: () => { if (s.id !== saga.id) {
                        setSaga(s.id);
                        setGrupo(undefined);
                    } }, children: _jsx(LogoSeccion, { id: s.id, nombre: s.nombre }) }, s.id)) }), grupos.length > 1 && _jsx("nav", { className: "t-album-nav t-album-grupos", "aria-label": `Colecciones de ${saga.nombre}`, children: grupos.map(g => _jsx("button", { type: "button", "aria-pressed": grupo.id === g.id, onClick: () => setGrupo(g.id), children: _jsx(LogoSeccion, { id: g.id, nombre: g.nombre }) }, g.id)) }), _jsxs("div", { className: "t-album-cab", children: [_jsx("h3", { children: grupo.nombre === saga.nombre ? saga.nombre : `${saga.nombre} · ${grupo.nombre}` }), _jsx("p", { children: mercado ? `${lista.filter(t => rareza(t.id) === "comun" || personajes.has(t.id)).length} de ${lista.length} conseguidas` : `${lista.length} cartas · Vista previa` })] }), _jsx(FormatosGrupo, { lista: lista, alElegir: setElegida, ofertas: ofertas, adquiridos: personajes }, `${saga.id}/${grupo.id}`), elegida && _jsx(DetallePersonaje, { tarjeta: elegida, catalogo: catalogo, oferta: personajes.has(elegida.id) ? undefined : ofertas.get(elegida.id), conseguida: personajes.has(elegida.id), alComprar: comprar, alCerrar: () => setElegida(null) }, elegida.id)] });
}
function FormatosGrupo({ lista, ...resto }) {
    const [formato, setFormato] = useState("Minifiguras");
    const formatos = ["Minifiguras", "Bigfig"].map(titulo => ({
        titulo, cartas: lista.filter(t => t.tamano === (titulo === "Bigfig" ? "grande" : "normal")),
    })).filter(f => f.cartas.length > 0);
    const activo = formatos.find(f => f.titulo === formato) ?? formatos[0];
    if (!activo)
        return null;
    return _jsxs(_Fragment, { children: [formatos.length > 1 && _jsx("nav", { className: "t-album-nav t-album-tamanos", "aria-label": "Tama\u00F1o de figura", children: formatos.map(f => _jsxs("button", { type: "button", "aria-pressed": activo.titulo === f.titulo, onClick: () => setFormato(f.titulo), children: [f.titulo, " ", _jsx("span", { children: f.cartas.length })] }, f.titulo)) }), _jsx(GrupoFiguras, { titulo: activo.titulo, lista: activo.cartas, ...resto }, activo.titulo)] });
}
function GrupoFiguras({ titulo, lista, alElegir, ofertas, adquiridos }) {
    const [pagina, setPagina] = useState(0);
    const hojas = paginas(lista, POR_PAGINA);
    const hoja = Math.min(pagina, hojas.length - 1);
    return _jsxs("section", { className: "t-album-formato", "aria-label": titulo, children: [_jsx("h4", { children: titulo }), _jsx("ul", { className: "t-album-rejilla", children: hojas[hoja].map(t => _jsx("li", { className: "t-album-ranura", children: _jsx("button", { type: "button", className: "t-album-carta", onClick: () => alElegir(t), "aria-label": `${t.nombre}, ${etiquetaRareza(t, rareza(t.id))}${t.tamano === "grande" ? ", Bigfig" : ""}${NUMEROS_PERSONAJES[t.id] ? `, número ${NUMEROS_PERSONAJES[t.id]}` : ""}. Ver carta`, children: _jsx(CartaPersonaje, { tarjeta: t, nivel: ofertas.get(t.id)?.rareza, conseguida: adquiridos.has(t.id), precio: adquiridos.has(t.id) ? undefined : ofertas.get(t.id)?.precio }) }) }, t.id)) }), hojas.length > 1 && _jsxs("nav", { className: "t-album-nav t-album-paginacion", "aria-label": `Páginas de ${titulo}`, children: [_jsx("button", { type: "button", disabled: hoja === 0, onClick: () => setPagina(hoja - 1), children: "Anterior" }), _jsxs("span", { "aria-live": "polite", children: [hoja + 1, " / ", hojas.length] }), _jsx("button", { type: "button", disabled: hoja === hojas.length - 1, onClick: () => setPagina(hoja + 1), children: "Siguiente" })] })] });
}
function DetallePersonaje({ tarjeta, catalogo, oferta, conseguida, alComprar, alCerrar }) {
    const dialogo = useRef(null);
    const mini = useMiniaturas(`${import.meta.env.BASE_URL}personajes/estudio.html`, catalogo.catalogo);
    const plano = useMemo(() => {
        const entrada = catalogo.catalogo.get(tarjeta.id);
        return entrada && resolverFigura("album", deCatalogo(entrada.ficha), catalogo.catalogo, catalogo.piezas, catalogo.base);
    }, [tarjeta.id, catalogo]);
    const clave = plano ? "album:" + JSON.stringify(plano) : null;
    useEffect(() => { dialogo.current?.showModal(); }, []);
    useEffect(() => {
        if (clave && plano && mini.listo)
            mini.pedirFigura(clave, plano);
        // El estudio mantiene la cola y evita pedidos duplicados.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave, plano, mini.listo]);
    return _jsxs("dialog", { ref: dialogo, className: "t-album-detalle", "aria-label": tarjeta.nombre, onClose: alCerrar, onClick: e => { if (e.target === e.currentTarget)
            e.currentTarget.close(); }, children: [mini.marco, _jsx("div", { className: "t-album-carta", children: _jsx(CartaPersonaje, { tarjeta: tarjeta, foto: (clave && mini.fotoDe(clave)) || tarjeta.foto, revelada: true, nivel: oferta?.rareza, precio: oferta?.precio, conseguida: conseguida }) }), oferta && _jsxs("button", { type: "button", className: "t-ap-todas", onClick: () => {
                    dialogo.current?.close();
                    alComprar(tarjeta, oferta);
                }, children: ["Comprar \u00B7 ", oferta.precio, " monedas"] }), _jsx("button", { type: "button", className: "t-ap-todas", onClick: () => dialogo.current?.close(), children: "Cerrar carta" })] });
}
