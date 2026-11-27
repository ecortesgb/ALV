import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Páginas del libro fuera de Apariencia: Objetos, Momentos, Nombre (apodo de la figura), Aleatorio y Retos.
// Los objetos de personaje (escudo del Capitán) están en «Piezas originales» de Avanzado.
import { useEffect, useRef, useState } from "react";
import { FotoFigura } from "../app/figura3d";
import { LARGO_APODO, MOMENTOS_NORMALES, completar, conservar, limpiarApodo, limpiarBloqueadas, ponerApodo, ponerMomentos, ponerObjeto, vestirCompleto, } from "../app/editarFigura";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import catalogo from "../content/catalogo-figura.json";
import { miniatura } from "./Libro";
import { esOriginal } from "../content/sagas";
import { estilosDe } from "./look";
import { MarcaRareza, infoPieza, pedirDesbloqueo } from "./Desbloqueo";
import { aviso } from "./comun";
import { DATOS as PERFIL, PERFILES, perfilDe, ponerPersonalidad } from "../app/perfiles";
import { cumple } from "../app/retos";
import { NOMBRE_RAREZA, RETOS, hoyMexico, rarezaDe, retoDelDia } from "../content/rarezas";
import { claveReto, libre, reclamar, usePiezas } from "../servicios/piezas";
const PALETA = catalogo.paleta;
export function PaginaExtra({ pag, figura, cambiar, mando, capsula }) {
    const f = completar(figura);
    const poner = (g) => cambiar(g);
    // Aleatorio es a propósito: no pregunta (para eso tiene su deshacer y está «Regresar»).
    const azar = (g) => cambiar(g, { sinAviso: true });
    if (pag === "objetos")
        return _jsx(Objetos, { f: f, poner: poner });
    if (pag === "momentos")
        return _jsx(Momentos, { f: f, poner: poner, mando: mando });
    if (pag === "nombre")
        return _jsx(Nombre, { f: f, poner: poner });
    if (pag === "retos")
        return _jsx(Retos, { f: f, capsula: capsula });
    return _jsx(Aleatorio, { f: f, poner: azar, mando: mando });
}
// ---------- Objetos: uno en cada mano ----------
function Objetos({ f, poner }) {
    const est = usePiezas();
    const [mano, setMano] = useState("mano_der");
    const actual = f.accesorios[mano];
    return _jsxs(_Fragment, { children: [_jsxs("section", { className: "p-bloque", children: [_jsx("h3", { className: "p-bloque-titulo", children: "\u00BFEn qu\u00E9 mano?" }), _jsx("div", { className: "p-opciones", role: "radiogroup", "aria-label": "Mano", children: [["mano_der", "Mano derecha"], ["mano_izq", "Mano izquierda"]].map(([m, n]) => (_jsxs("button", { type: "button", role: "radio", "aria-checked": mano === m, className: "p-opcion" + (mano === m ? " on" : ""), onClick: () => { sonar("clic"); setMano(m); }, children: [n, f.accesorios[m] ? " ✓" : ""] }, m))) })] }), _jsx("section", { className: "p-bloque", children: _jsx("div", { className: "p-rejilla", children: catalogo.secciones.objeto.filter(p => !esOriginal(p.id)).map(p => {
                        const on = (p.id ?? null) === (actual?.id ?? null), r = est.activo ? rarezaDe(p.id) : "comun", bloq = !libre(p.id, est);
                        return (_jsxs("button", { type: "button", className: "p-pieza r-" + r + (on ? " on" : "") + (bloq ? " bloq" : ""), "aria-pressed": on, title: p.nombre, onClick: () => { if (bloq) {
                                pedirDesbloqueo(p.id);
                                return;
                            } sonar("encaje"); poner(ponerObjeto(f, mano, p.id ? { id: p.id, color: p.color ?? "#a0a5a9" } : null)); }, children: [_jsx("img", { src: miniatura(p.mini), alt: "", loading: "lazy", draggable: false }), _jsx(MarcaRareza, { r: r, bloqueada: bloq }), _jsx("span", { children: p.nombre })] }, p.mini));
                    }) }) }), actual && (_jsxs("section", { className: "p-bloque", children: [_jsx("h3", { className: "p-bloque-titulo", children: "Color del objeto" }), _jsx("div", { className: "p-colores", role: "radiogroup", "aria-label": "Color del objeto", children: PALETA.map(c => (_jsx("button", { type: "button", role: "radio", "aria-checked": actual.color === c, className: "p-color" + (actual.color === c ? " on" : ""), style: { background: c }, "aria-label": `Color ${c}`, onClick: () => { sonar("clic"); poner(ponerObjeto(f, mano, { ...actual, color: c })); } }, c))) })] }))] });
}
// ---------- Momentos: cómo espera, anota, gana y pierde ----------
const PROBAR = [["espera", "Esperar"], ["punto", "Anotar"], ["victoria", "Ganar"], ["derrota", "Perder"]];
function Momentos({ f, poner, mando }) {
    const opciones = [{ ...MOMENTOS_NORMALES, nombre: "Normal" }, ...catalogo.paquetes];
    const actual = f.momentos.paquete ?? null;
    const est = usePiezas();
    return _jsxs(_Fragment, { children: [_jsx("div", { className: "p-momentos", children: opciones.map(p => {
                    const on = p.id === actual, id = p.id ? "MOM_" + p.id : null, r = est.activo ? rarezaDe(id) : "comun", bloq = !libre(id, est);
                    return (_jsxs("button", { type: "button", className: "p-momento r-" + r + (on ? " on" : "") + (bloq ? " bloq" : ""), "aria-pressed": on, onClick: () => { if (bloq) {
                            pedirDesbloqueo(id);
                            mando.current?.probar(p.victoria);
                            return;
                        } sonar("clic"); poner(ponerMomentos(f, p)); mando.current?.probar(p.victoria); }, children: [_jsx(MarcaRareza, { r: r, bloqueada: bloq }), _jsx("span", { className: "p-sfx", children: p.nombre })] }, p.id ?? "normal"));
                }) }), _jsx(Personalidad, { f: f, poner: poner }), _jsxs("section", { className: "p-bloque", children: [_jsx("h3", { className: "p-bloque-titulo", children: "Ver en la figura" }), _jsx("div", { className: "p-opciones", children: PROBAR.map(([k, n]) => _jsx("button", { type: "button", className: "p-opcion", onClick: () => { sonar("clic"); mando.current?.probar(f.momentos[k]); }, children: n }, k)) })] }), _jsx("p", { className: "p-nota", children: "As\u00ED se mueve tu figura en la sala y en la TV cuando espera, anota un punto, gana o pierde." })] });
}
// ---------- Personalidad: cómo se comporta sola (perfiles.ts); no cambia piezas ni momentos ----------
function Personalidad({ f, poner }) {
    const actual = perfilDe(f);
    const elegir = (p) => { sonar("clic"); poner(ponerPersonalidad(f, p)); };
    return (_jsxs("section", { className: "p-bloque p-personalidad", children: [_jsx("h3", { className: "p-bloque-titulo", children: "Personalidad" }), _jsxs("div", { className: "p-opciones", children: [_jsx("button", { type: "button", className: "p-opcion" + (actual === null ? " on" : ""), "aria-pressed": actual === null, onClick: () => elegir(null), children: "Ninguna" }), PERFILES.map(p => (_jsx("button", { type: "button", className: "p-opcion" + (actual === p ? " on" : ""), "aria-pressed": actual === p, onClick: () => elegir(p), children: PERFIL[p].nombre }, p)))] }), _jsx("p", { className: "p-nota", children: actual ? PERFIL[actual].descripcion + " Mírala unos segundos: se mueve sola." : "Sin personalidad tu figura solo respira. Elige una para que se mueva sola a su manera." })] }));
}
// ---------- Nombre: apodo de la figura; el nombre de la cuenta no cambia ----------
function Nombre({ f, poner }) {
    const { nombre } = useSesion();
    const [texto, setTexto] = useState(f.nombre === "Mi figura" ? "" : f.nombre);
    // Se guarda solo, un momento después de dejar de escribir (y al salir de la página si quedó algo pendiente).
    const ultimo = useRef(texto);
    const vivo = useRef({ texto, f, poner });
    vivo.current = { texto, f, poner };
    useEffect(() => () => { const v = vivo.current; if (v.texto !== ultimo.current)
        v.poner(ponerApodo(v.f, v.texto)); }, []);
    useEffect(() => {
        if (texto === ultimo.current)
            return;
        const t = setTimeout(() => { ultimo.current = texto; poner(ponerApodo(f, texto)); }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texto]);
    return _jsxs(_Fragment, { children: [_jsxs("label", { className: "p-bloque p-apodo", children: [_jsx("span", { className: "p-bloque-titulo", children: "Apodo de esta figura" }), _jsx("input", { type: "text", value: texto, maxLength: LARGO_APODO, placeholder: "Ej.: El Rayo, Do\u00F1a Fiesta\u2026", autoComplete: "off", spellCheck: false, onChange: e => setTexto(limpiarApodo(e.target.value)), onKeyDown: e => { if (e.key === "Enter")
                            e.target.blur(); } })] }), _jsx(CartaColeccion, { f: f, apodo: texto.trim() || "Mi figura", jugador: nombre || "Tu nombre" }), _jsx("p", { className: "p-nota", children: "El apodo va arriba de tu nombre y es solo de esta figura (cada espacio puede tener el suyo). Tu nombre de jugador no cambia." })] });
}
const NOMBRE_ESTILO = { heroe: "Superhéroe", medieval: "Medieval", magia: "Magia", espacio: "Espacial", trabajo: "Oficio", ciudad: "Ciudad", aventura: "Aventura", fiesta: "Fiesta" };
/** Carta tipo videojuego: la figura, su apodo, el jugador, su estilo y sus momentos. */
function CartaColeccion({ f, apodo, jugador }) {
    const estilo = estilosDe(f)[0];
    const mom = catalogo.paquetes.find(p => p.id === f.momentos.paquete)?.nombre ?? "Normal";
    return (_jsxs("figure", { className: "p-cartacol", "aria-label": `Carta de ${apodo}`, children: [_jsx("span", { className: "p-cartacol-rayos", "aria-hidden": "true" }), _jsx("span", { className: "p-cartacol-cinta p-sfx", children: estilo ? NOMBRE_ESTILO[estilo] ?? estilo : "Original" }), _jsx("span", { className: "p-cartacol-foto", children: _jsx(FotoFigura, { figura: f, size: 130, nombre: apodo }) }), _jsxs("figcaption", { children: [_jsx("span", { className: "p-cartacol-apodo p-sfx", children: apodo }), _jsx("span", { className: "p-cartacol-jugador", children: jugador }), _jsxs("span", { className: "p-cartacol-dato", children: ["Momentos: ", mom] })] })] }));
}
// ---------- Aleatorio: una figura nueva entera, con deshacer ----------
function Aleatorio({ f, poner, mando }) {
    const antes = useRef([]);
    const [hay, setHay] = useState(0);
    const [pensando, setPensando] = useState(false);
    const [candados, setCandados] = useState(() => new Set());
    const PARTES = [["pelo", "Pelo y casco"], ["cabeza", "Cara y piel"], ["torso", "Torso y brazos"], ["piernas", "Piernas"], ["cuello", "Cuello y capa"], ["objetos", "Objetos"], ["momentos", "Momentos"]];
    const sorprender = async () => {
        if (pensando)
            return;
        setPensando(true);
        sonar("exito");
        const g = await mando.current?.pedir("azar", {});
        setPensando(false);
        if (!g)
            return;
        antes.current = [...antes.current.slice(-9), f];
        setHay(antes.current.length);
        // El apodo se conserva (la figura cambia, sigue siendo «tuya») y lo que tiene candado no se toca.
        poner(limpiarBloqueadas(conservar(vestirCompleto(f, completar(g)), f, candados), id => libre(id)));
    };
    const deshacer = () => {
        const g = antes.current.pop();
        setHay(antes.current.length);
        if (g) {
            sonar("clic");
            poner(g);
        }
    };
    return _jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "p-sorpresa", onClick: sorprender, disabled: pensando, children: [_jsx("span", { className: "p-sfx", children: "\u00A1Sorpr\u00E9ndeme!" }), _jsx("small", { children: candados.size ? `Cambia todo menos ${candados.size === 1 ? "lo que tiene candado" : `las ${candados.size} partes con candado`}` : "Arma una figura completa al azar" })] }), _jsxs("button", { type: "button", className: "p-opcion p-deshacer", onClick: deshacer, disabled: !hay, children: ["Deshacer", hay ? ` (${hay})` : ""] }), _jsxs("section", { className: "p-bloque", children: [_jsx("h3", { className: "p-bloque-titulo", children: "Candados" }), _jsx("p", { className: "p-nota", children: "Pon candado a lo que te gusta: \u00AB\u00A1Sorpr\u00E9ndeme!\u00BB cambia todo lo dem\u00E1s." }), _jsx("div", { className: "p-opciones", children: PARTES.map(([k, n]) => {
                            const on = candados.has(k);
                            return (_jsxs("button", { type: "button", "aria-pressed": on, className: "p-opcion p-candado" + (on ? " on" : ""), onClick: () => { sonar("clic"); setCandados(c => { const x = new Set(c); if (x.has(k))
                                    x.delete(k);
                                else
                                    x.add(k); return x; }); }, children: [_jsx("span", { "aria-hidden": "true", children: on ? "🔒" : "🔓" }), " ", n] }, k));
                        }) })] }), _jsx("p", { className: "p-nota", children: "Cada p\u00E1gina de Apariencia tiene su dado \u00ABAl azar\u00BB para cambiar solo esa parte." })] });
}
// ---------- Retos: el del día y los de combinación; el premio es una pieza (o XP si ya la tenías) ----------
function TarjetaReto({ r, f, capsula, hecho }) {
    const [ocupado, setOcupado] = useState(false);
    const ok = cumple(f, r.condicion), premio = infoPieza(r.premio), rar = rarezaDe(r.premio);
    const tengo = !libre(r.premio) ? false : rar !== "comun";
    const piezas = r.condicion.todas ?? [];
    const pedir = async () => {
        setOcupado(true);
        const x = await reclamar(r.id, capsula);
        setOcupado(false);
        if (typeof x === "string") {
            aviso(x);
            sonar("error");
            return;
        }
        sonar("fanfarria");
        aviso(x.pieza ? `¡Ganaste ${infoPieza(x.pieza).nombre}!` : `Ya la tenías: +${x.xp} XP`);
    };
    return (_jsxs("div", { className: "p-reto" + (hecho ? " hecho" : ok ? " listo" : ""), children: [_jsx("div", { className: "p-reto-premio r-" + rar, children: premio.mini ? _jsx("img", { src: miniatura(premio.mini), alt: "" }) : _jsx("span", { className: "p-sfx", children: "\u00A1POW!" }) }), _jsxs("div", { className: "p-reto-texto", children: [_jsx("strong", { className: "p-sfx", children: r.nombre }), _jsx("span", { children: r.texto }), piezas.length > 0 && _jsxs("small", { children: [piezas.filter(id => [...(f.identidad.detalles ?? [])].includes(id) || JSON.stringify(f).includes(`"${id}"`)).length, " de ", piezas.length, " piezas puestas"] }), _jsxs("small", { children: ["Premio: ", premio.nombre, " \u00B7 ", NOMBRE_RAREZA[rar], tengo ? " (ya la tienes: +40 XP)" : ""] })] }), hecho ? _jsx("span", { className: "p-reto-sello p-sfx", children: "\u00A1Hecho!" })
                : _jsx("button", { type: "button", className: "p-opcion on", disabled: !ok || ocupado, onClick: () => void pedir(), children: ok ? "Reclamar" : "Aún no" })] }));
}
function Retos({ f, capsula }) {
    const est = usePiezas();
    const hoy = hoyMexico(), diario = retoDelDia(hoy);
    if (!est.activo)
        return _jsx("p", { className: "p-nota", children: "Los retos se activan cuando el sistema de piezas raras est\u00E9 encendido en el servidor." });
    return _jsxs(_Fragment, { children: [_jsx("p", { className: "p-nota", children: "Los retos revisan la figura de este espacio. \u00C1rmala en Apariencia y vuelve a reclamar." }), _jsxs("section", { className: "p-bloque", children: [_jsx("h3", { className: "p-bloque-titulo", children: "Reto de hoy" }), _jsx(TarjetaReto, { r: diario, f: f, capsula: capsula, hecho: est.reclamados.has(claveReto(diario.id, "diario", hoy)) })] }), _jsxs("section", { className: "p-bloque", children: [_jsx("h3", { className: "p-bloque-titulo", children: "Combinaciones" }), RETOS.filter(r => r.tipo === "combinacion").map(r => _jsx(TarjetaReto, { r: r, f: f, capsula: capsula, hecho: est.reclamados.has(r.id) }, r.id))] })] });
}
