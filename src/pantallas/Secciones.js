import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Páginas de Apariencia: cuadrícula de piezas (la elegida con borde amarillo), colores de esa pieza y, donde el modelo
// lo permite, ambos lados / izquierdo / derecho. Básico muestra lo esencial de cada página; Completo, todo.
// Todas las ediciones pasan por src/app/editarFigura.ts (misma figura en los dos modos).
import { useEffect, useState } from "react";
import { alternarDetalle, capaDe, colorCadera, colorCasco, colorDeLado, colorEstampado, colorPelo, colorPiernas, colorTorso, completar, cuelloDe, ladosPersonalizados, pelaTapado, ponerBotas, ponerBrazos, ponerCapa, ponerCascoSolo, ponerCinturon, ponerCuello, ponerManos, ponerMascaraCompleta, limpiarBloqueadas, ponerPelo, ponerPiel, ponerRostro, ponerTorsoCompleto, quitarDetalles, tipoPiernas, } from "../app/editarFigura";
import { sonar } from "../app/sonido";
import catalogoTodo from "../content/catalogo-figura.json";
import { esOriginal } from "../content/sagas";
import { miniatura } from "./Libro";
import { aplicar, combinan, estilosDe, ordenarPorEstilo, sugerencias } from "./look";
import { MarcaRareza, pedirDesbloqueo } from "./Desbloqueo";
import { libre, piezasAhora, usePiezas } from "../servicios/piezas";
import { rarezaDe } from "../content/rarezas";
// Estas páginas son «Piezas comunes» de Avanzado: las piezas de personaje van en su repisa (Originales.tsx).
const catalogo = { ...catalogoTodo, secciones: Object.fromEntries(Object.entries(catalogoTodo.secciones).map(([k, l]) => [k, l.filter(p => !esOriginal(p.id))])) };
const PALETA = catalogo.paleta;
const PELO = [...new Set([...catalogo.coloresPelo, ...catalogo.paleta])];
const OCUPA = new Map(catalogo.secciones.detalle.filter(d => d.id).map(d => [d.id, d.ocupa ?? null]));
const ocupa = (id) => OCUPA.get(id) ?? null;
/** Cuadrícula de piezas. Las bloqueadas muestran candado y su rareza; al tocarlas se abre el panel para desbloquearlas. */
export function Piezas({ titulo, items }) {
    const est = usePiezas();
    return (_jsxs("section", { className: "p-bloque", children: [titulo && _jsx("h3", { className: "p-bloque-titulo", children: titulo }), _jsx("div", { className: "p-rejilla", children: items.map(p => {
                    const r = est.activo ? rarezaDe(p.id) : "comun", bloq = !libre(p.id, est);
                    return (_jsxs("button", { type: "button", className: "p-pieza r-" + r + (p.on ? " on" : "") + (bloq ? " bloq" : ""), "aria-pressed": p.on, title: bloq ? `${p.nombre} (bloqueada)` : p.nombre, onClick: () => { if (bloq) {
                            pedirDesbloqueo(p.id);
                            return;
                        } sonar("encaje"); p.elegir(); }, children: [_jsx("img", { src: miniatura(p.mini), alt: "", loading: "lazy", draggable: false }), _jsx(MarcaRareza, { r: r, bloqueada: bloq }), _jsx("span", { children: p.nombre })] }, p.clave));
                }) })] }));
}
export function Colores({ titulo, actual, colores, especiales = [], nombres, sugeridos = [], elegir }) {
    const a = actual?.toLowerCase();
    const sug = sugeridos.filter(c => colores.includes(c));
    colores = [...sug, ...colores.filter(c => !sug.includes(c))];
    return (_jsxs("section", { className: "p-bloque", children: [_jsx("h3", { className: "p-bloque-titulo", children: titulo }), _jsxs("div", { className: "p-colores", role: "radiogroup", "aria-label": titulo, children: [especiales.map(e => (_jsxs("button", { type: "button", role: "radio", "aria-checked": a === e.valor, className: "p-color p-color-texto" + (a === e.valor ? " on" : ""), onClick: () => { sonar("clic"); elegir(e.valor); }, children: [_jsx("i", { style: { background: e.muestra }, "aria-hidden": "true" }), e.nombre] }, e.valor))), colores.map(c => (_jsx("button", { type: "button", role: "radio", "aria-checked": a === c.toLowerCase(), className: "p-color" + (a === c.toLowerCase() ? " on" : "") + (sug.includes(c) ? " sug" : ""), style: { background: c }, "aria-label": (nombres?.[c] ?? `Color ${c}`) + (sug.includes(c) ? ", combina con tu figura" : ""), title: sug.includes(c) ? "Combina con tu figura" : nombres?.[c], onClick: () => { sonar("clic"); elegir(c); } }, c)))] })] }));
}
// ---------- Opciones de texto (con cinturón, sin máscara…) ----------
function Opciones({ titulo, ops }) {
    return (_jsxs("section", { className: "p-bloque", children: [_jsx("h3", { className: "p-bloque-titulo", children: titulo }), _jsx("div", { className: "p-opciones", children: ops.map(o => _jsx("button", { type: "button", "aria-pressed": o.on, className: "p-opcion" + (o.on ? " on" : ""), onClick: () => { sonar("clic"); o.elegir(); }, children: o.nombre }, o.nombre)) })] }));
}
// ---------- Lados (ambas / izquierda / derecha) como tres viñetas ----------
function Lados({ lado, setLado, ambos, img, igualar }) {
    const ops = [["ambos", ambos], ["izq", "Izquierda"], ["der", "Derecha"]];
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "p-lados", role: "radiogroup", "aria-label": "Qu\u00E9 lado", children: ops.map(([l, n]) => (_jsxs("button", { type: "button", role: "radio", "aria-checked": lado === l, className: "p-lado " + l + (lado === l ? " on" : ""), onClick: () => { sonar("clic"); setLado(l); }, children: [_jsx("span", { className: "p-lado-arte", "aria-hidden": "true", children: _jsx("img", { src: miniatura(img), alt: "", draggable: false }) }), _jsx("span", { className: "p-lado-cap", children: n })] }, l))) }), lado !== "ambos" && igualar && (_jsxs("button", { type: "button", className: "p-opcion p-espejo", onClick: () => { sonar("encaje"); igualar(); }, children: ["\u21C4 Copiar ", lado === "izq" ? "la izquierda" : "la derecha", " al otro lado"] }))] }));
}
/** «Combina con tu look»: piezas de otras secciones del mismo estilo. */
function CombinaLook({ f, excluir, poner }) {
    usePiezas();
    const lista = sugerencias(f, excluir, 8).filter(x => libre(x.item.id, piezasAhora()) && !esOriginal(x.item.id)).slice(0, 4);
    if (!lista.length)
        return null;
    return (_jsxs("section", { className: "p-bloque p-look", children: [_jsx("h3", { className: "p-bloque-titulo", children: "Combina con tu look" }), _jsx("div", { className: "p-look-fila", children: lista.map(x => (_jsxs("button", { type: "button", className: "p-pieza p-look-pieza", title: x.item.nombre, onClick: () => { sonar("encaje"); poner(aplicar(f, x)); }, children: [_jsx("img", { src: miniatura(x.item.mini), alt: "", loading: "lazy", draggable: false }), _jsxs("span", { children: [_jsx("b", { children: x.etiqueta }), " ", x.item.nombre] })] }, x.seccion + x.item.mini))) })] }));
}
export const item = (p, on, elegir) => ({ id: p.id ?? null, clave: p.mini, mini: p.mini, nombre: p.nombre, on, elegir });
const GRUPOS = [
    { titulo: "Lentes y parche", ocupa: "ojos", nada: "Sin lentes" },
    { titulo: "Barba y bigote", ocupa: "barba", nada: "Sin barba" },
    { titulo: "Marcas", ocupa: null, nada: "Sin marcas" },
];
/** «Marcas» junta las sueltas (cicatriz) y las de mejillas (pecas o chapitas: una a la vez). */
const enGrupo = (id, g) => (g === null ? ocupa(id) === null || ocupa(id) === "mejillas" : ocupa(id) === g);
const uno = (xs) => xs[Math.floor(Math.random() * xs.length)];
/** El dado de cada página: cambia solo esa parte, al azar. */
function azarDe(k, f, completo) {
    const S = catalogo.secciones, color = () => uno(PALETA);
    switch (k) {
        case "pelo": return colorPelo(ponerPelo(f, uno(S.pelo.filter(p => p.id)).id), uno(PELO));
        case "casco": {
            const p = uno(S.casco);
            return ponerCascoSolo(f, p.id, p.color ?? "#6c6e68");
        }
        case "cabeza": return ponerRostro(ponerPiel(f, uno(catalogo.tonos).hex), uno(S.rostro).id);
        case "cuello": {
            const p = uno(S.cuello);
            const g = ponerCuello(f, p.id ? { id: p.id, color: color() } : null);
            return Math.random() < 0.25 ? ponerCapa(g, { id: "CAPE_001", color: color() }) : g;
        }
        case "torso": {
            const p = uno(S.torso);
            const g = ponerTorsoCompleto(f, p.id, p.original);
            return p.original ? g : colorTorso(g, color());
        }
        case "brazos": return ponerBrazos(f, "ambos", uno(["torso", "piel", color()]));
        case "manos": return ponerManos(f, "ambos", uno(["piel", "piel", color()]));
        case "capa": {
            const p = uno(S.capa);
            return ponerCapa(f, p.id ? { id: p.id, color: color() } : null);
        }
        case "cadera": return ponerCinturon(colorCadera(f, color()), Math.random() < 0.4 ? color() : null);
        case "piernas": return colorPiernas(f, "ambos", color(), !completo);
        case "botas": return ponerBotas(f, Math.random() < 0.5 ? color() : null);
    }
}
/** Contenido de una página de Apariencia. `setZona` acerca la cámara a un lado (pierna izquierda…). */
export function PaginaSeccion({ k, modo, figura, cambiar, setZona }) {
    const f = completar(figura);
    const poner = (g) => cambiar(g);
    const completo = modo === "completo";
    const [lado, setLado] = useState("ambos");
    useEffect(() => { setLado("ambos"); }, [k]);
    // Cuello: la cámara va hacia la parte principal de la pieza elegida (barba y chalecos de frente, mochilas de espaldas).
    const [vistaCuello, setVistaCuello] = useState(null);
    const cuelloActual = k === "cuello" ? cuelloDe(f) : null;
    const miraCuello = (id) => catalogo.secciones.cuello.find(x => x.id === id)?.mira === "espalda" ? "cuello" : "cuello_frente";
    useEffect(() => {
        const z = k === "piernas" && lado !== "ambos" ? (lado === "izq" ? "pierna_izq" : "pierna_der")
            : k === "cuello" ? vistaCuello ?? miraCuello(cuelloActual?.id) : null;
        setZona(z);
        return () => setZona(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [k, lado, setZona, vistaCuello]);
    useEffect(() => { setVistaCuello(null); }, [k]);
    const S = catalogo.secciones;
    const estilos = estilosDe(f);
    const sugeridos = combinan([f.ropa.torso.color, f.ropa.piernas.color], PALETA);
    const EXCLUIR = { casco: ["casco", "mascara"], cuello: ["cuello", "capa"], torso: ["torso"], cabeza: ["detalle"] };
    const conLook = ["pelo", "casco", "cabeza", "cuello", "torso"].includes(k);
    return _jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "p-dado", onClick: () => { sonar("clic"); cambiar(limpiarBloqueadas(azarDe(k, f, completo), id => libre(id)), { sinAviso: true }); }, "aria-label": "Esta parte al azar", children: [_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "4" }), _jsx("circle", { cx: "8", cy: "8", r: "1.6" }), _jsx("circle", { cx: "16", cy: "16", r: "1.6" }), _jsx("circle", { cx: "12", cy: "12", r: "1.6" }), _jsx("circle", { cx: "16", cy: "8", r: "1.6" }), _jsx("circle", { cx: "8", cy: "16", r: "1.6" })] }), "Al azar"] }), cuerpo(), conLook && _jsx(CombinaLook, { f: f, excluir: EXCLUIR[k] ?? [], poner: poner })] });
    function cuerpo() {
        switch (k) {
            case "pelo": {
                const c = f.identidad.cabello;
                const tapado = pelaTapado(f);
                return _jsxs(_Fragment, { children: [tapado && (_jsxs("div", { className: "p-aviso", role: "status", children: [_jsxs("span", { children: [f.accesorios.cara ? "La máscara" : "El casco", " tapa el pelo. Tu peinado se guarda para cuando lo quites."] }), _jsxs("button", { type: "button", className: "p-opcion", onClick: () => { sonar("clic"); poner(ponerMascaraCompleta(ponerCascoSolo(f, null, ""), null, "")); }, children: ["Quitar ", f.accesorios.cara ? "máscara" : "casco"] })] })), _jsxs("div", { className: tapado ? "p-tapado" : undefined, children: [_jsx(Piezas, { items: S.pelo.map(p => item(p, (p.id ?? null) === (c?.id ?? null), () => poner(ponerPelo(f, p.id)))) }), c && _jsx(Colores, { titulo: "Color del pelo", actual: c.color, colores: PELO, elegir: h => poner(colorPelo(f, h)) })] })] });
            }
            case "casco": {
                const c = f.accesorios.cabeza, m = f.accesorios.cara;
                const cascos = ordenarPorEstilo(S.casco, estilos), mascaras = ordenarPorEstilo(S.mascara, estilos);
                const fijo = !!cascos.find(x => x.id === c?.id)?.fijo;
                return _jsxs(_Fragment, { children: [_jsx(Piezas, { titulo: "Cascos y gorros", items: cascos.map(p => item(p, p.id ? p.id === c?.id : !c && !m, () => poner(p.id ? ponerCascoSolo(f, p.id, p.color ?? "#6c6e68") : ponerMascaraCompleta(ponerCascoSolo(f, null, ""), null, "")))) }), c && !fijo && _jsx(Colores, { titulo: "Color del casco", actual: c.color, colores: PALETA, sugeridos: sugeridos, elegir: h => poner(colorCasco(f, h)) }), completo && _jsx(Piezas, { titulo: "M\u00E1scaras", items: mascaras.map(p => item(p, p.id === m?.id, () => poner(ponerMascaraCompleta(f, p.id === m?.id ? null : p.id, p.color ?? "#c91a09")))) }), (fijo || m) && _jsx("p", { className: "p-nota", children: "Pieza de personaje: va con su color original." }), (c || m) && _jsx("p", { className: "p-nota", children: "Tapa el pelo; tu peinado se guarda para cuando lo quites." })] });
            }
            case "cabeza": {
                const mascara = f.accesorios.cara?.id ?? null;
                const nombresPiel = Object.fromEntries(catalogo.tonos.map(t => [t.hex, t.nombre]));
                return _jsxs(_Fragment, { children: [_jsx(Colores, { titulo: "Tono de piel", actual: f.identidad.piel, colores: catalogo.tonos.map(t => t.hex), nombres: nombresPiel, elegir: h => poner(ponerPiel(f, h)) }), _jsx(Piezas, { titulo: "Rostro", items: S.rostro.map(p => item(p, !mascara && p.id === f.identidad.rostro, () => poner(ponerRostro(f, p.id)))) }), GRUPOS.map(gr => {
                            const lista = S.detalle.filter(p => p.id && enGrupo(p.id, gr.ocupa));
                            const nada = !f.identidad.detalles.some(d => enGrupo(d, gr.ocupa));
                            const quitar = () => (gr.ocupa === null ? quitarDetalles(quitarDetalles(f, ocupa, null), ocupa, "mejillas") : quitarDetalles(f, ocupa, gr.ocupa));
                            return _jsx(Piezas, { titulo: gr.titulo, items: [
                                    item({ mini: "sin-detalle", nombre: gr.nada }, nada, () => poner(quitar())),
                                    ...lista.map(p => item(p, f.identidad.detalles.includes(p.id), () => poner(alternarDetalle(f, p.id, ocupa)))),
                                ] }, gr.titulo);
                        }), _jsx("p", { className: "p-nota", children: "Puedes llevar lentes, barba y marcas al mismo tiempo. Pecas y chapitas van una a la vez. Las m\u00E1scaras est\u00E1n en Casco." })] });
            }
            case "cuello": {
                const c = cuelloDe(f), capa = capaDe(f);
                return _jsxs(_Fragment, { children: [_jsx(Piezas, { titulo: "Cuello y espalda", items: ordenarPorEstilo(S.cuello, estilos).map(p => item(p, (p.id ?? null) === (c?.id ?? null), () => {
                                setVistaCuello(miraCuello(p.id));
                                poner(ponerCuello(f, p.id ? { id: p.id, color: c?.color ?? "#6c6e68" } : null));
                            })) }), c && _jsx(Colores, { titulo: "Color", actual: c.color, colores: PALETA, sugeridos: sugeridos, elegir: h => poner(ponerCuello(f, { ...c, color: h })) }), _jsx(Piezas, { titulo: "Capa", items: S.capa.map(p => item(p, (p.id ?? null) === (capa?.id ?? null), () => {
                                setVistaCuello("capa");
                                poner(ponerCapa(f, p.id ? { id: p.id, color: capa?.color ?? "#c91a09" } : null));
                            })) }), capa && _jsx(Colores, { titulo: "Color de la capa", actual: capa.color, colores: PALETA, sugeridos: sugeridos, elegir: h => { setVistaCuello("capa"); poner(ponerCapa(f, { ...capa, color: h })); } }), _jsx("p", { className: "p-nota", children: "La capa y una pieza de cuello o espalda van juntas." })] });
            }
            case "torso": {
                const t = f.ropa.torso, torsos = S.torso;
                const actual = torsos.find(x => (x.id ?? null) === (t.estampado ?? null));
                const fijo = !!actual?.original;
                const pintables = torsos.filter(x => !x.original), trajes = ordenarPorEstilo(torsos.filter(x => x.original), estilos);
                const elegirTorso = (p) => poner(ponerTorsoCompleto(f, p.id, p.original));
                return _jsxs(_Fragment, { children: [_jsx(Piezas, { titulo: "Para pintar", items: pintables.map(p => item(p, (p.id ?? null) === (t.estampado ?? null), () => elegirTorso(p))) }), !fijo && _jsx(Colores, { titulo: "Color del torso", actual: t.color, colores: PALETA, sugeridos: combinan([f.ropa.piernas.color], PALETA), elegir: h => poner(colorTorso(f, h)) }), !fijo && completo && t.estampado && [0, 1, 2].map(i => (_jsx(Colores, { titulo: `Color del dibujo ${i + 1}`, actual: t.colores[i], colores: PALETA, elegir: h => poner(colorEstampado(f, i, h)) }, i))), _jsx(Piezas, { titulo: "Uniformes", items: trajes.map(p => item(p, p.id === t.estampado, () => elegirTorso(p))) }), fijo && _jsx("p", { className: "p-nota", children: "Traje original: va con sus colores, brazos y manos." }), _jsxs("p", { className: "p-nota", children: ["Al elegir un torso, brazos y manos se ponen a juego. ", completo ? "Puedes cambiarlos en Brazos y Manos." : "En Completo puedes pintarlos aparte."] })] });
            }
            case "brazos": return _jsxs(_Fragment, { children: [_jsx(Lados, { lado: lado, setLado: setLado, ambos: "Ambos brazos", img: "print-019", igualar: () => { poner(ponerBrazos(f, "ambos", colorDeLado(f, "brazo", lado))); setLado("ambos"); } }), _jsx(Colores, { titulo: lado === "ambos" ? "Color de los brazos" : `Brazo ${lado === "izq" ? "izquierdo" : "derecho"}`, actual: colorDeLado(f, "brazo", lado), colores: PALETA, especiales: [{ valor: "torso", nombre: "Como el torso", muestra: f.ropa.torso.color }, { valor: "piel", nombre: "Sin mangas", muestra: f.identidad.piel }], sugeridos: sugeridos, elegir: v => poner(ponerBrazos(f, lado, v)) })] });
            case "manos": return _jsxs(_Fragment, { children: [_jsx(Lados, { lado: lado, setLado: setLado, ambos: "Ambas manos", img: "sin-objeto", igualar: () => { poner(ponerManos(f, "ambos", colorDeLado(f, "mano", lado))); setLado("ambos"); } }), _jsx(Colores, { titulo: lado === "ambos" ? "Color de las manos" : `Mano ${lado === "izq" ? "izquierda" : "derecha"}`, actual: colorDeLado(f, "mano", lado), colores: PALETA, especiales: [{ valor: "piel", nombre: "Sin guantes", muestra: f.identidad.piel }], sugeridos: sugeridos, elegir: v => poner(ponerManos(f, lado, v)) })] });
            case "capa": {
                const c = capaDe(f);
                return _jsxs(_Fragment, { children: [_jsx(Piezas, { items: S.capa.map(p => item(p, (p.id ?? null) === (c?.id ?? null), () => poner(ponerCapa(f, p.id ? { id: p.id, color: c?.color ?? "#c91a09" } : null)))) }), c && _jsx(Colores, { titulo: "Color de la capa", actual: c.color, colores: PALETA, elegir: h => poner(ponerCapa(f, { ...c, color: h })) })] });
            }
            case "cadera": {
                if (f.ropa.piernas.tipo === "cortas")
                    return _jsx("p", { className: "p-nota", children: "Con piernas cortas la cadera va pegada a las piernas: c\u00E1mbiala en Piernas." });
                const cin = f.ropa.cadera.cinturon;
                return _jsxs(_Fragment, { children: [_jsx(Colores, { titulo: "Color de la cadera", actual: f.ropa.cadera.color, colores: PALETA, sugeridos: sugeridos, elegir: h => poner(colorCadera(f, h)) }), _jsx(Opciones, { titulo: "Cintur\u00F3n", ops: [{ nombre: "Sin cinturón", on: !cin, elegir: () => poner(ponerCinturon(f, null)) }, { nombre: "Con cinturón", on: !!cin, elegir: () => poner(ponerCinturon(f, cin?.color ?? "#582a12")) }] }), cin && _jsx(Colores, { titulo: "Color del cintur\u00F3n", actual: cin.color, colores: PALETA, elegir: h => poner(ponerCinturon(f, h)) })] });
            }
            case "piernas": {
                const p = f.ropa.piernas, conLados = completo && p.tipo === "normal";
                const l = conLados ? lado : "ambos";
                return _jsxs(_Fragment, { children: [_jsx(Piezas, { items: S.piernas.map(x => item(x, x.tipo === p.tipo, () => poner(tipoPiernas(f, x.tipo)))) }), conLados && _jsx(Lados, { lado: lado, setLado: setLado, ambos: "Ambas piernas", img: "piernas-normal", igualar: () => { poner(colorPiernas(f, "ambos", colorDeLado(f, "pierna", lado))); setLado("ambos"); } }), _jsx(Colores, { titulo: l === "ambos" ? (completo ? "Color de las piernas" : "Color de cadera y piernas") : `Pierna ${l === "izq" ? "izquierda" : "derecha"}`, actual: colorDeLado(f, "pierna", l), colores: PALETA, sugeridos: combinan([f.ropa.torso.color], PALETA), elegir: h => poner(colorPiernas(f, l, h, !completo)) }), completo && p.tipo === "normal" && _jsx(Colores, { titulo: "Cadera (cintura y entrepierna)", actual: f.ropa.cadera.color, colores: PALETA, sugeridos: sugeridos, elegir: h => poner(colorCadera(f, h)) }), !completo && ladosPersonalizados(f, "pierna") && _jsx("p", { className: "p-nota", children: "Tienes una pierna de otro color (hecho en Completo); se conserva." })] });
            }
            case "botas": {
                const b = f.ropa.piernas.botas;
                return _jsxs(_Fragment, { children: [_jsx(Piezas, { items: S.botas.map(x => item(x, !!x.botas === !!b, () => poner(ponerBotas(f, x.botas ? b ?? "#1b2a34" : null)))) }), b && _jsx(Colores, { titulo: "Color de las botas", actual: b, colores: PALETA, sugeridos: sugeridos, elegir: h => poner(ponerBotas(f, h)) })] });
            }
        }
    }
}
