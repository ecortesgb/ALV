import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Tienda y recompensas ALV (Maestro v1.48, enfoque A; dirección visual: mockups de Elías del 18 nov).
// Etapa 1: pestañas Sobres y Colección y la apertura completa, en la demostración sin nube.
import { useEffect, useMemo, useRef, useState } from "react";
import { Icono } from "../ds";
import { sonar } from "../app/sonido";
import { movimientoReducido } from "../app/preferencias";
import { ir } from "../app/rutas";
import { COMODINES, DORSO_SOBRE, MONEDAS_SI_TOPE, NOMBRE_SECCION, ORDEN_SECCIONES, PIEZAS_COLECCION, SOBRES, SOBRES_PERSONAJES, TOPE_COMODIN, piezasDeSobre } from "../content/tienda";
import { CARTAS_POR_SOBRE_PERSONAJES, PESO_PERSONAJE, ofertasPersonajes, precioSobrePersonajes } from "../content/personajesTienda";
import { tarjetas, useCatalogoV3 } from "../personajes/integracion";
import { NOMBRE_RAREZA } from "../content/rarezas";
import { ORDEN, faltanParaGarantia, probabilidadComodines, probabilidadPiezas, sobreDisponible } from "../engine/sobresTienda";
import { usePiezas } from "../servicios/piezas";
import { abrir, cargarTienda, comprarPersonajes, marcarVistas, reponerComodin, useTienda } from "../servicios/tienda";
import { Apertura as VistaApertura, CartaFrente } from "./Apertura";
import { aviso, confirmar, Marco, urlArte } from "./comun";
import { infoPieza } from "./Desbloqueo";
import { miniatura } from "./Libro";
import { AlbumPersonajes } from "./AlbumPersonajes";
import { useRecursos } from "./Recursos";
import { arteHub, RecursosAzotea } from "./azotea/Cabecera";
import { useMomentoAzotea } from "./azotea/HubAzotea";
import "./perfil/perfil.css";
import "./tienda.css";
const PESTANAS = [
    { id: "sobres", nombre: "Sobres" }, { id: "coleccion", nombre: "Colección" },
];
export const srcArte = (n) => `${import.meta.env.BASE_URL}arte/${n}`;
const MONEDA = _jsx("img", { className: "t-moneda", src: arteHub("moneda"), alt: "" });
export function Tienda() {
    const { puntos } = useRecursos();
    const momento = useMomentoAzotea();
    const fondo = urlArte("tienda/tienda-" + momento + ".webp");
    const t = useTienda();
    const catalogo = useCatalogoV3();
    const personajes = useMemo(() => new Map((catalogo ? tarjetas(catalogo.catalogo) : []).map(x => [x.id, x])), [catalogo]);
    const ofertasDemo = useMemo(() => ofertasPersonajes([...personajes.values()]), [personajes]);
    const mercado = catalogo ? (t.demo ? ofertasDemo : t.catalogoPersonajes) : null;
    const [pestana, setPestana] = useState("sobres");
    const [album, setAlbum] = useState("Cartas");
    const [abierto, setAbierto] = useState(null);
    const contenido = useRef(null);
    useEffect(() => { void cargarTienda(); }, []);
    useEffect(() => {
        if (contenido.current)
            contenido.current.inert = !!abierto;
    }, [abierto]);
    const cambiar = (p) => { if (pestana === "coleccion")
        marcarVistas(); sonar("clic"); setPestana(p); };
    return (_jsxs(Marco, { clase: "az t-tienda", fondo: _jsx("div", { className: "t-fondo", "aria-hidden": "true", style: { "--t-fondo": fondo } }), children: [_jsxs("div", { className: "t-raiz", ref: contenido, style: { "--t-fondo": fondo }, children: [_jsxs("header", { className: "t-cab", children: [_jsxs("button", { type: "button", className: "pf-atras t-atras", onClick: () => ir("inicio"), "aria-label": "Regresar al HUB", children: [_jsx("span", { "aria-hidden": "true", children: "\u25C0" }), "Atr\u00E1s"] }), _jsx("h1", { className: "t-titulo", children: "Tienda" }), _jsx(RecursosAzotea, { monedas: t.monedas, puntos: puntos, enTienda: true })] }), _jsx("nav", { className: "t-pestanas", "aria-label": "Secciones de la tienda", children: PESTANAS.map(p => (_jsxs("button", { type: "button", "aria-pressed": pestana === p.id, className: "t-pestana" + (pestana === p.id ? " t-on" : ""), onClick: () => cambiar(p.id), children: [p.nombre, p.id === "coleccion" && t.nuevas.size > 0 && _jsx("i", { className: "t-punto", "aria-label": "nuevo" })] }, p.id))) }), _jsxs("section", { className: "t-panel", children: [pestana === "sobres" && _jsx(Sobres, { mercado: mercado, personajes: personajes, alAbrir: (sobre, apertura, deEspaldas) => setAbierto({ sobre, apertura, deEspaldas }) }), pestana === "coleccion" && _jsx(Coleccion, { mercado: mercado, album: album, setAlbum: setAlbum })] }), t.demo && _jsx("p", { className: "t-demo", children: "Prueba local con monedas de demostraci\u00F3n." })] }), abierto && _jsx(VistaApertura, { sobre: abierto.sobre, apertura: abierto.apertura, fondo: fondo, deEspaldas: abierto.deEspaldas, personajes: personajes, alOtro: () => setAbierto(null), alColeccion: () => {
                    setAlbum(abierto.apertura.cartas.some(c => c.tipo === "personaje") ? "Personajes" : "Cartas");
                    setAbierto(null);
                    setPestana("coleccion");
                } })] }));
}
// ---------- Sobres ----------
const CATEGORIAS = ["Normales", "Especiales", "Accesorios", "Personajes"];
const COMODINES_NORMAL = SOBRES.find(x => x.id === "comodines");
function Sobres({ mercado, personajes, alAbrir }) {
    const t = useTienda(), p = usePiezas();
    const [categoria, setCategoria] = useState("Normales");
    const [i0, setI] = useState(0);
    const [ocupado, setOcupado] = useState(false);
    const lista = {
        Normales: [COMODINES_NORMAL, ...SOBRES.filter(x => p.activo && (x.id === "basico" || x.id === "mixto"))],
        Especiales: SOBRES.filter(x => x.id === "comodines" || x.id === "epico"),
        Accesorios: SOBRES.filter(x => x.id === "accesorios"),
        Personajes: SOBRES_PERSONAJES,
    }[categoria];
    const i = Math.min(i0, lista.length - 1);
    const s = lista[i];
    const ilusionista = categoria === "Especiales" && s.id === "comodines";
    const portada = ilusionista ? "sobre-comodines-especial.webp" : s.arte;
    const nombre = ilusionista ? "Comodines · Ilusionista" : s.nombre;
    const venta = "precio" in s ? s : null;
    const candidatos = !venta && mercado ? mercado.filter(x => x.saga === s.id && !t.personajes.has(x.id)) : [];
    const ventaSaga = !venta && mercado !== null && candidatos.every(x => personajes.has(x.id));
    const prototipo = venta ? venta.piezas > 0 && !p.activo : !ventaSaga;
    const precio = venta?.precio ?? precioSobrePersonajes(candidatos.length);
    const [giro, setGiro] = useState(0);
    const deEspaldas = giro % 360 !== 0;
    const caras = useRef(null);
    const toque = useRef(null);
    const omitirClic = useRef(false);
    const disponible = venta ? sobreDisponible(venta, p.tengo) : precio > 0;
    const alcanza = t.monedas >= precio;
    const falta = faltanParaGarantia(t.racha);
    const elegir = (siguiente, indice) => {
        sonar("tic");
        setCategoria(siguiente);
        setI(indice);
        setGiro(0);
    };
    const mover = (d) => elegir(categoria, (i + d + lista.length) % lista.length);
    const voltear = (d = 1) => {
        sonar("voltear");
        setGiro(v => v + d * 180);
    };
    const soltar = () => {
        toque.current = null;
        caras.current?.removeAttribute("data-arrastre");
        caras.current?.style.removeProperty("--arrastre-sobre");
    };
    const piezasPosibles = useMemo(() => {
        if (prototipo || !venta?.piezas)
            return [];
        const tasas = probabilidadPiezas(venta, p.tengo, t.racha);
        return piezasDeSobre(venta)
            .filter(x => !p.tengo.has(x.id) && tasas[x.rareza] > 0)
            .sort((a, b) => ORDEN.indexOf(a.rareza) - ORDEN.indexOf(b.rareza))
            .map(x => ({ ...x, ...infoPieza(x.id), chance: tasas[x.rareza] }));
    }, [venta, p.tengo, t.racha, prototipo]);
    const comodinesPosibles = venta ? probabilidadComodines(venta, t.comodines) : [];
    const comprar = async () => {
        if (prototipo || !disponible || ocupado || !t.activa)
            return;
        if (!alcanza) {
            sonar("error");
            aviso(`Te faltan ${precio - t.monedas} monedas. Gánalas jugando.`);
            return;
        }
        setOcupado(true);
        try {
            const ok = await confirmar({ titulo: "¿Comprar " + nombre + "?", texto: "Cuesta " + precio + " monedas. Te quedan " + (t.monedas - precio) + ".", si: "¡Comprar!", no: "Ahora no" });
            if (!ok)
                return;
            const r = venta ? await abrir(venta.id) : await comprarPersonajes("sobre", s.id, precio, mercado ?? []);
            if (typeof r === "string") {
                sonar("error");
                aviso(r);
                return;
            }
            alAbrir({ color: s.color, nombre, arte: portada }, r, deEspaldas);
        }
        catch {
            sonar("error");
            aviso("No se pudo abrir el sobre. Revisa tu conexión.");
        }
        finally {
            setOcupado(false);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("nav", { className: "t-categorias", "aria-label": "Tipos de sobres", children: CATEGORIAS.map(c => _jsx("button", { type: "button", disabled: ocupado, "aria-pressed": c === categoria, onClick: () => elegir(c, 0), children: c }, c)) }), _jsxs("div", { className: "t-sobres", style: { ["--c"]: s.color }, children: [_jsx("div", { className: "t-escaparate", children: _jsxs("div", { className: "t-sobre-zona", children: [!prototipo && disponible && t.activa ? (_jsxs("button", { type: "button", className: "t-precio t-precio-comprar", disabled: ocupado, "aria-label": `Comprar ${nombre} por ${precio} monedas`, onClick: () => void comprar(), children: ["Comprar ", _jsxs("span", { children: [MONEDA, " ", precio] })] })) : (_jsx("p", { className: "t-precio", children: prototipo ? "Vista previa" : t.activa ? "Colección completa" : "Compra no disponible" })), _jsx("button", { type: "button", className: "t-sobre-elige", disabled: ocupado, "aria-label": `Girar ${nombre} ${deEspaldas ? "al frente" : "al reverso"}`, onClick: e => {
                                        if (e.detail !== 0 && omitirClic.current)
                                            return;
                                        voltear();
                                    }, onPointerDown: e => {
                                        if (!e.isPrimary || e.button !== 0)
                                            return;
                                        omitirClic.current = false;
                                        toque.current = { id: e.pointerId, x: e.clientX };
                                        e.currentTarget.setPointerCapture(e.pointerId);
                                    }, onPointerMove: e => {
                                        if (toque.current?.id !== e.pointerId)
                                            return;
                                        const dx = e.clientX - toque.current.x;
                                        omitirClic.current ||= Math.abs(dx) > 8;
                                        if (!omitirClic.current || movimientoReducido())
                                            return;
                                        caras.current?.setAttribute("data-arrastre", "");
                                        caras.current?.style.setProperty("--arrastre-sobre", Math.max(-155, Math.min(155, dx * 2)) + "deg");
                                    }, onPointerUp: e => {
                                        if (toque.current?.id !== e.pointerId)
                                            return;
                                        const dx = e.clientX - toque.current.x;
                                        omitirClic.current ||= Math.abs(dx) > 8;
                                        if (Math.abs(dx) >= 44)
                                            voltear(Math.sign(dx));
                                        soltar();
                                    }, onLostPointerCapture: e => { if (toque.current?.id === e.pointerId)
                                        soltar(); }, children: _jsx("span", { className: "t-portada", children: _jsxs("span", { ref: caras, className: "t-sobre-caras t-giro-exhibidor", style: { "--giro-sobre": giro + "deg" }, children: [_jsxs("span", { className: "t-sobre-cara", children: [_jsx("img", { className: "t-sobre-img", src: srcArte("tienda/" + portada), alt: "", draggable: false }), !venta && s.id !== "dc" && _jsx("span", { className: "t-sobre-identidad", children: _jsx("img", { src: srcArte(`tienda/sagas/${s.id}.webp`), alt: "", draggable: false }) })] }), _jsx("img", { className: "t-sobre-img t-sobre-cara t-sobre-dorso", src: srcArte("tienda/" + DORSO_SOBRE), alt: "", draggable: false })] }) }, portada) }), lista.length > 1 && _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "t-flecha t-izq", disabled: ocupado, onClick: () => mover(-1), "aria-label": "Sobre anterior", children: "\u2039" }), _jsx("button", { type: "button", className: "t-flecha t-der", disabled: ocupado, onClick: () => mover(1), "aria-label": "Sobre siguiente", children: "\u203A" })] })] }) }), _jsxs("div", { className: "t-lado", children: [_jsxs("div", { className: "t-contenido", children: [_jsx("h2", { children: nombre }), _jsx("p", { className: "t-frase", children: s.frase }), ilusionista && _jsx("p", { className: "t-edicion", children: "Mismas cartas y probabilidades que el sobre normal." })] }), _jsxs("p", { className: "t-edicion", children: ["Toca o arrastra el sobre para girarlo", lista.length > 1 && ` · ${i + 1} de ${lista.length}`] }), prototipo && _jsx("p", { className: "t-precio-toque", children: "Pr\u00F3ximamente" }), ocupado && _jsx("p", { className: "t-precio-toque", role: "status", children: "Un momento\u2026" }), !prototipo && disponible && t.activa && !ocupado && !alcanza &&
                                _jsxs("p", { className: "t-precio-toque", children: ["Te faltan ", precio - t.monedas, " monedas"] }), ventaSaga && candidatos.length > 0 && _jsx(ProbabilidadesPersonajes, { candidatos: candidatos, personajes: personajes }), venta && !prototipo && _jsxs("details", { className: "t-contenido-posible", children: [_jsx("summary", { children: "Contenido posible y probabilidades" }), _jsx("p", { className: "t-tasas-nota", children: "Probabilidad de obtener cada carta al menos una vez en este sobre." }), _jsxs("ul", { className: "t-tasas", "aria-label": "Cartas y probabilidades", children: [comodinesPosibles.map(c => (_jsxs("li", { children: [c.arte ? _jsx("img", { src: srcArte("tienda/" + c.arte), alt: "", loading: "lazy" }) : _jsx(ComodinIcono, { id: c.id, alterno: c.icono }), _jsxs("span", { children: [_jsx("b", { children: c.nombre }), _jsx("small", { children: c.alTope
                                                                    ? porcentaje(c.enSobre) + " de que se sortee y se convierta en monedas"
                                                                    : porcentaje(c.porCarta) + " en cada extracción" })] }), _jsx("strong", { children: porcentaje(c.alTope ? 0 : c.enSobre) })] }, c.id))), piezasPosibles.map(x => (_jsxs("li", { children: [x.mini ? _jsx("img", { src: miniatura(x.mini), alt: "", loading: "lazy" }) : _jsx(Momento, {}), _jsxs("span", { children: [_jsx("b", { children: x.nombre }), _jsx("small", { children: NOMBRE_RAREZA[x.rareza] })] }), _jsx("strong", { children: porcentaje(x.chance) })] }, x.id)))] }), !comodinesPosibles.length && !piezasPosibles.length && _jsx("p", { className: "t-tasas-nota", children: "Ya tienes todas las piezas de este sobre." }), !!comodinesPosibles.length && _jsxs("p", { className: "t-tasas-nota", children: ["Puedes recibir repetidas. Desde ", TOPE_COMODIN, " copias, otra igual se cambia por ", MONEDAS_SI_TOPE, " monedas."] }), venta.piezas > 0 && (_jsx("p", { className: "t-garantia", children: falta.legendaria <= 3 ? _jsxs(_Fragment, { children: ["Legendaria asegurada ", cuando(falta.legendaria)] }) : _jsxs(_Fragment, { children: ["\u00C9pica asegurada ", cuando(falta.epica)] }) }))] }, categoria + venta.id)] })] })] }));
}
/** Paquete de momentos (no tiene miniatura). */
export const Momento = () => _jsxs("span", { className: "t-mom", children: [_jsx("span", { className: "t-mini-ico", children: "\uD83D\uDCA5" }), _jsx("small", { children: "Momentos" })] });
export const ComodinIcono = ({ id, alterno }) => _jsx("span", { className: "t-mini-ico t-ico-" + id, "aria-hidden": "true", children: id === "turno" ? _jsx(Icono, { id: "skip" }) : id === "cambio" ? "↻" : alterno });
const formatoTasa = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 2 });
const porcentaje = (p) => p > 0 && p < 0.0001 ? "< 0.01 %" : formatoTasa.format(Math.min(1, Math.max(0, p)));
const cuando = (n) => (n <= 1 ? "en el siguiente sobre" : `en ${n} sobres`);
// ---------- Colección ----------
function ProbabilidadesPersonajes({ candidatos, personajes }) {
    const peso = candidatos.reduce((s, c) => s + PESO_PERSONAJE[c.rareza], 0);
    return _jsxs("details", { className: "t-contenido-posible", children: [_jsx("summary", { children: "Personajes y probabilidades" }), _jsxs("p", { className: "t-tasas-nota", children: [Math.min(CARTAS_POR_SOBRE_PERSONAJES, candidatos.length), " cartas sin repetir. Las probabilidades son de la primera extracci\u00F3n y cambian al sacar cada carta."] }), _jsx("ul", { className: "t-tasas", "aria-label": "Personajes y probabilidades", children: candidatos.map(c => {
                    const t = personajes.get(c.id);
                    return _jsxs("li", { children: [t?.foto ? _jsx("img", { src: t.foto, alt: "", loading: "lazy" }) : _jsx(Icono, { id: "lock" }), _jsxs("span", { children: [_jsx("b", { children: t?.nombre ?? c.id }), _jsx("small", { children: NOMBRE_RAREZA[c.rareza] })] }), _jsx("strong", { children: porcentaje(PESO_PERSONAJE[c.rareza] / peso) })] }, c.id);
                }) })] });
}
function Coleccion({ mercado, album, setAlbum }) {
    return _jsxs("div", { className: "t-coleccion", children: [_jsx("nav", { className: "t-album-nav", "aria-label": "\u00C1lbumes de colecci\u00F3n", children: ["Cartas", "Personajes"].map(nombre => _jsx("button", { type: "button", "aria-pressed": album === nombre, onClick: () => { sonar("tic"); setAlbum(nombre); }, children: nombre }, nombre)) }), album === "Cartas" ? _jsx(AlbumCartas, {}) : _jsx(AlbumPersonajes, { mercado: mercado })] });
}
function AlbumCartas() {
    const p = usePiezas(), t = useTienda();
    const [seleccion, setSeleccion] = useState(null);
    const detalle = useRef(null);
    const [reponiendo, setReponiendo] = useState(false);
    const precioReposicion = seleccion && t.comodines[seleccion.id] === 0 ? t.preciosReposicion[seleccion.id] : undefined;
    const reponer = async (carta, precio) => {
        if (reponiendo)
            return;
        detalle.current?.close();
        setReponiendo(true);
        try {
            if (!await confirmar({ titulo: "¿Reponer " + carta.nombre + "?", texto: `Una copia cuesta ${precio} monedas.`, si: "Reponer", no: "Ahora no" }))
                return;
            const error = await reponerComodin(carta.id);
            if (error)
                aviso(error);
            else
                setSeleccion(carta);
        }
        catch {
            aviso("No se pudo reponer la carta. Revisa tu conexión.");
        }
        finally {
            setReponiendo(false);
        }
    };
    useEffect(() => {
        if (seleccion && !detalle.current?.open)
            detalle.current?.showModal();
    }, [seleccion]);
    const distintos = COMODINES.filter(c => t.comodines[c.id] !== undefined).length;
    const tengo = PIEZAS_COLECCION.filter(x => p.tengo.has(x.id)).length;
    return (_jsxs(_Fragment, { children: [p.activo && _jsxs("div", { className: "t-total", children: [_jsx("span", { className: "t-sfx", children: tengo }), _jsxs("small", { children: ["/ ", PIEZAS_COLECCION.length] }), _jsx("div", { className: "t-barras", children: ORDEN.map(r => {
                            const todas = PIEZAS_COLECCION.filter(x => x.rareza === r), mias = todas.filter(x => p.tengo.has(x.id)).length;
                            return _jsxs("div", { className: "t-prob r-" + r, children: [_jsx("span", { children: NOMBRE_RAREZA[r] }), _jsx("i", { style: { width: `${(mias / todas.length) * 100}%` } }), _jsxs("b", { children: [mias, "/", todas.length] })] }, r);
                        }) })] }), _jsxs("section", { className: "t-album", "aria-labelledby": "titulo-album", children: [_jsx("h2", { id: "titulo-album", children: "\u00C1lbum de cartas" }), _jsxs("div", { className: "t-album-cab", children: [_jsx("h3", { children: "Comodines" }), _jsxs("p", { children: [distintos, " de ", COMODINES.length, " conseguidos"] })] }), _jsx("ul", { className: "t-album-rejilla", children: COMODINES.map(c => {
                            const copias = t.comodines[c.id];
                            return (_jsx("li", { className: "t-album-ranura", children: copias !== undefined ? (_jsxs("button", { type: "button", className: "t-album-carta", onClick: () => setSeleccion(c), "aria-label": c.nombre + ", " + copias + (copias === 1 ? " copia" : " copias") + ". Ver carta", children: [_jsx(CartaFrente, { c: { tipo: "comodin", id: c.id, especial: c.especial } }), _jsxs("span", { className: "t-album-copias", "aria-hidden": "true", children: ["\u00D7", copias] })] })) : (_jsxs("div", { className: "t-album-vacia", children: [_jsx("span", { "aria-hidden": "true", children: "\u25C7" }), _jsx("b", { children: c.nombre }), _jsx("small", { children: "Por conseguir" })] })) }, c.id));
                        }) })] }), seleccion && _jsxs("dialog", { ref: detalle, className: "t-album-detalle", "aria-label": seleccion.nombre, onClose: () => setSeleccion(null), onClick: e => { if (e.target === e.currentTarget)
                    e.currentTarget.close(); }, children: [_jsxs("div", { className: "t-album-carta", children: [_jsx(CartaFrente, { c: { tipo: "comodin", id: seleccion.id, especial: seleccion.especial } }), _jsxs("span", { className: "t-album-copias", "aria-label": (t.comodines[seleccion.id] ?? 0) + " copias", children: ["\u00D7", t.comodines[seleccion.id] ?? 0] })] }), precioReposicion && _jsxs("button", { type: "button", className: "t-ap-todas", disabled: reponiendo, onClick: () => void reponer(seleccion, precioReposicion), children: ["Reponer \u00B7 ", precioReposicion, " ", MONEDA, _jsx("span", { className: "t-solo-lector", children: " monedas" })] }), _jsx("button", { type: "button", className: "t-ap-todas", onClick: () => detalle.current?.close(), children: "Cerrar carta" })] }), !p.activo && _jsx("p", { className: "t-frase", children: "Las piezas est\u00E1n disponibles en el personalizador." }), p.activo && ORDEN_SECCIONES.map(sec => {
                const lista = PIEZAS_COLECCION.filter(x => x.seccion === sec).sort((a, b) => ORDEN.indexOf(a.rareza) - ORDEN.indexOf(b.rareza));
                if (!lista.length)
                    return null;
                const mias = lista.filter(x => p.tengo.has(x.id)).length;
                return (_jsxs("div", { className: "t-seccion", children: [_jsxs("h3", { children: [NOMBRE_SECCION[sec], " ", _jsxs("small", { children: [mias, "/", lista.length] })] }), _jsx("div", { className: "t-rejilla t-rejilla-col", children: lista.map(x => {
                                const info = infoPieza(x.id), mia = p.tengo.has(x.id);
                                return (_jsxs("div", { className: "t-mini r-" + x.rareza + (mia ? "" : " t-falta"), title: mia ? info.nombre : `${info.nombre}: sale en sobres`, children: [info.mini ? _jsx("img", { src: miniatura(info.mini), alt: "", loading: "lazy" }) : _jsx(Momento, {}), !mia && _jsx("span", { className: "t-candado", "aria-label": "Te falta", children: "\uD83D\uDD12" }), t.nuevas.has(x.id) && _jsx("i", { className: "t-punto", "aria-label": "nuevo" })] }, x.id));
                            }) })] }, sec));
            })] }));
}
