import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
// Lobby con pedestales (referencia: LEGO Party, ALV_REFERENCIA_LEGO_PARTY.md §1 y §2).
// La usan el celular (Sala.tsx) y la Pantalla (roles/pantalla/Pantalla.tsx). Solo lee lo público de la sala:
// nombre, figura, anfitrión, «listo» y el último gesto de cada miembro. El color de cada quien sale del orden de entrada.
import { useRef } from "react";
import { useFondosTema } from "../app/temas";
import { GESTOS } from "../servicios/enlace";
import { claveArchivo, colorDe, colorJugador, coloresLibres, varsColor } from "../app/colorJugador";
import { Escena3D, enEscena } from "../app/figura3d";
import { Boton } from "../ds";
import { NombreJugador, urlArte } from "./comun";
import { carpetaLobby, LOBBY_NUEVO, VARIANTE_LOBBY } from "./lobby/version";
/** Cupo del lobby en esta fase de prueba (también lo valida el servidor en `unirse_evento`). */
export const CUPO_LOBBY = 8;
/** Lugares que se dibujan: 4 como mínimo (los vacíos con «+»); con más, uno por cada quien. */
/** Lugares a dibujar: mínimo 4. Con `conLibre` (Local, donde se agrega desde un lugar vacío) siempre queda uno libre hasta llenar el cupo. */
export const lugaresSala = (n, conLibre = false) => Math.min(CUPO_LOBBY, Math.max(4, conLibre ? n + 1 : n));
/** Cuántos marcaron «¡Listo!». `todos` pide al menos dos personas en la sala. */
export function preparados(miembros) {
    const listos = miembros.filter(m => m.listo).length, total = miembros.length;
    return { listos, total, todos: total >= 2 && listos === total };
}
/**
 * Lo que hace cada figura: festeja al pasar a «listo» y repite el gesto que su dueño mandó (saludar, bailar).
 * Solo cuenta los cambios que se ven desde que se abrió la pantalla: al entrar no se repiten gestos viejos.
 */
function useMomentos(miembros) {
    const visto = useRef(new Map());
    const cuenta = useRef(new Map());
    const sube = (k) => cuenta.current.set(k, (cuenta.current.get(k) ?? 0) + 1);
    for (const m of miembros) {
        const antes = visto.current.get(m.id), n = m.gestoN ?? 0;
        if (antes) {
            if (m.listo && !antes.listo)
                sube(`${m.id}:victoria`);
            if (n > antes.gestoN && GESTOS.includes(m.gesto))
                sube(`${m.id}:${m.gesto}`);
        }
        visto.current.set(m.id, { listo: m.listo, gestoN: n });
    }
    return miembros.flatMap(m => ["victoria", ...GESTOS].map(cual => ({ id: m.id, cual, n: cuenta.current.get(`${m.id}:${cual}`) ?? 0 })));
}
/** «2/4 LISTOS». */
export function ContadorListos({ miembros, className = "" }) {
    const p = preparados(miembros);
    return (_jsxs("div", { className: "a-sala-contador" + (p.todos ? " todos" : "") + (className ? " " + className : ""), role: "status", "aria-live": "polite", children: [_jsxs("b", { className: "dsp ol", children: [p.listos, "/", p.total || 0] }), _jsx("span", { className: "dsp ol", children: "listos" })] }));
}
/** «5/8 en el lobby». */
export function Cupo({ miembros }) {
    return _jsxs("span", { className: "a-sala-cupo", children: [_jsxs("b", { children: [miembros.length, "/", CUPO_LOBBY] }), " en el lobby"] });
}
/** Fondo propio del lobby: un estudio de TV con pantalla de bloques, reflectores de colores y piso brillante. */
export function FondoLobby() {
    return (_jsxs("div", { className: "d-bg a-fondo-lobby", "aria-hidden": "true", children: [_jsx("div", { className: "a-fl-pared" }), _jsx("div", { className: "a-fl-letrero", children: _jsx("span", { children: "ALV" }) }), ["#e8343a", "#2f7cf0", "#ffcf2e", "#2fbf4f"].map((c, i) => _jsx("i", { className: `a-fl-haz h${i}`, style: { "--haz": c } }, i)), _jsx("div", { className: "a-fl-truss" }), _jsx("div", { className: "a-fl-piso" })] }));
}
/** Cabina pintada de cada color (arte de Elías en public/arte/lobby/cabina-<color>.webp). */
const artePara = (nombre) => ({ "--pj-arte": urlArte(`${carpetaLobby}/cabina-${claveArchivo({ nombre })}.webp`) });
/** PRUEBA ?lobby=2 y ?lobby=a: la cabina va por piezas (pared, figura hundida y, en la A, base de color) para que
 *  la pared coincida con el zoclo del cuarto y la figura quede a la altura de la cabeza. */
const piezasCabina = (k) => VARIANTE_LOBBY === "2" || VARIANTE_LOBBY === "a" ? {
    "--pj-pared": urlArte(`${carpetaLobby}/pared-${k ?? "vacia"}.webp`),
    "--pj-forma": k ? urlArte(`${carpetaLobby}/forma-${k}.webp`) : "none",
    ...(VARIANTE_LOBBY === "a" ? { "--pj-base": urlArte(`${carpetaLobby}/base-${k ?? "vacia"}.webp`) } : {}),
} : {};
const arteLobby = (n) => `${import.meta.env.BASE_URL}arte/lobby/${n}.webp`;
export function Pedestales({ miembros, yo, className = "", fiesta, vida }) {
    const lugares = lugaresSala(miembros.length, !!fiesta?.libre);
    const momentos = useMomentos(miembros);
    const ids = miembros.map(m => m.id);
    const colorEn = (i) => (miembros[i] ? colorDe(miembros[i].id, ids) : null) ?? colorJugador(i);
    const figuras = miembros.map((m, i) => ({ ...enEscena(m.id, m.figura), color: colorEn(i).base, columna: i }));
    // Pared de cada cabina con el fondo del tema de su personaje (temas.ts); sin tema, la pared de color de siempre.
    const temas = useFondosTema(miembros.map(m => m.figura), "c");
    const pared = (i) => { const css = temas[i]?.css; return css ? { "--pj-pared": css, "--pj-forma": "none" } : {}; };
    // Lobby nuevo: cada lugar libre ya sale con el color que tomaría el siguiente en entrar.
    const libres = LOBBY_NUEVO ? coloresLibres(miembros.map((_, i) => colorEn(i)), miembros.length) : [];
    const cols = Array.from({ length: lugares }, (_, i) => ({ i, m: miembros[i], c: (i >= miembros.length ? libres[i - miembros.length] : undefined) ?? colorEn(i) }));
    const estilo = { "--lugares": lugares };
    return (_jsxs("div", { className: "a-sala-escenario" + (lugares > 4 ? " muchos" : "") + (fiesta ? " fiesta" : "") + (className ? " " + className : ""), style: estilo, children: [_jsx("div", { className: "a-sala-cols", "aria-hidden": "true", children: cols.map(({ i, m, c }) => fiesta?.escenarios
                    ? _jsxs("div", { className: "a-sala-col lb-cab" + (m ? "" : " vacia") + (m?.listo ? " listo" : ""), style: { ...varsColor(c), "--pj-arte": urlArte(`${carpetaLobby}/cabina-${m || LOBBY_NUEVO ? claveArchivo(c) : "vacia"}.webp`), ...piezasCabina(m || LOBBY_NUEVO ? claveArchivo(c) : null), ...(m ? pared(i) : {}) }, children: [m && _jsx("img", { className: "lb-ped", src: LOBBY_NUEVO ? arteLobby(`plataforma/ped-${claveArchivo(c)}`) : arteLobby(`pedestal-${claveArchivo(c)}`), alt: "", draggable: false }, "p" + m.id), !m && LOBBY_NUEVO && _jsxs(_Fragment, { children: [_jsx("span", { className: "lb-haz", "aria-hidden": "true" }), _jsx("span", { className: "lb-haz-abajo", "aria-hidden": "true" }), _jsx("img", { className: "lb-ped lb-tapa", src: arteLobby(`plataforma/tapa-${claveArchivo(c)}`), alt: "", draggable: false }), _jsx("span", { className: "lb-cruz", "aria-hidden": "true", style: { "--cruz": urlArte("lobby/cruz.webp") } })] }), m && LOBBY_NUEVO && _jsxs("span", { className: "lb-jn", "aria-hidden": "true", children: [_jsx("i", {}), c.etiqueta.replace("P", "J")] }), m && _jsx("span", { className: "lb-tele", "aria-hidden": "true" }, "t" + m.id + (m.figura ? JSON.stringify(m.figura).length : 0)), m?.listo && _jsx("span", { className: "lb-luz", "aria-hidden": "true" })] }, i)
                    : _jsx("div", { className: "a-sala-col" + (m ? "" : " vacia") + (m?.listo ? " listo" : ""), style: { ...varsColor(m ? c : null), ...(m ? artePara(c.nombre) : {}) } }, i)) }), _jsx(Escena3D, { modo: "sala", figuras: figuras, columnas: lugares, momentos: momentos, className: "a-sala-3d", sinPedestal: !!fiesta?.escenarios, vida: vida }), _jsx("ul", { className: "a-sala-rotulos", "aria-label": "Jugadores en el lobby", children: cols.map(({ i, m, c }) => (fiesta ? (_jsxs("li", { className: "a-sala-rot lb-rot" + (m ? "" : " vacia") + (m?.listo ? " listo" : "") + (m && m.id === yo ? " yo" : ""), style: varsColor(m || LOBBY_NUEVO ? c : null), children: [_jsxs("span", { className: "lb-etq", children: [_jsx("b", { children: c.etiqueta }), m?.anfitrion && _jsx("img", { src: arteLobby("ico-corona"), alt: "Administrador", className: "lb-corona" }), _jsx("span", { className: "lb-etq-nom", children: m ? _jsx(NombreJugador, { nombre: m.nombre, figura: m.figura }) : "Libre" })] }), m && LOBBY_NUEVO && _jsxs("span", { className: "lb-barra", children: [m.anfitrion && _jsx("img", { src: arteLobby("ico-corona"), alt: "Administrador" }), _jsx("i", {}), _jsx("b", { children: c.etiqueta.replace("P", "J") }), _jsx("span", { className: "lb-barra-sep", children: "\u00B7" }), _jsx("span", { className: "lb-barra-nom", children: _jsx(NombreJugador, { nombre: m.nombre, figura: m.figura }) })] }), m && fiesta.tocar && m.id === yo && _jsx("button", { type: "button", className: "lb-toca", "aria-label": "Gestos de tu figura", onClick: e => fiesta.tocar(m, e.clientX, e.clientY) }), m && fiesta.arriba && _jsx("span", { className: "lb-arriba", children: fiesta.arriba(m) }), m?.listo && _jsxs("span", { className: "lb-sello", children: [_jsx("img", { src: arteLobby("ico-listo"), alt: "" }), _jsx("span", { children: LOBBY_NUEVO ? "¡Todo listo!" : "¡Listo!" })] }), !m && !fiesta.escenarios && _jsx("img", { className: "lb-libre", src: arteLobby("lugar-libre"), alt: "" }), m && !m.listo && _jsx("span", { className: "lb-aun", children: "A\u00FAn no" }), m && fiesta.abajo && _jsx("span", { className: "lb-abajo", children: fiesta.abajo(m) }), !m && fiesta.libre && _jsx("span", { className: "lb-abajo lb-libre-acc", children: fiesta.libre(i) }), _jsx("span", { className: "a-oculto", children: m ? (m.listo ? "listo" : "esperando") : "lugar libre" })] }, i)) : (_jsxs("li", { className: "a-sala-rot" + (m ? "" : " vacia") + (m?.listo ? " listo" : "") + (m && m.id === yo ? " yo" : ""), style: varsColor(m ? c : null), children: [_jsx("span", { className: "a-sala-pn dsp", children: c.etiqueta }), m?.listo && _jsx("span", { className: "a-sala-listo dsp ol", children: "\u00A1Listo!" }), !m && _jsx("span", { className: "a-sala-mas dsp", "aria-hidden": "true", children: "+" }), _jsxs("span", { className: "a-sala-nombre", children: [m ? _jsx(NombreJugador, { nombre: m.nombre, figura: m.figura }) : _jsx("span", { className: "dsp", children: "Libre" }), m?.anfitrion && _jsx("small", { className: "a-sala-anf", children: "Anfitri\u00F3n" })] }), _jsx("span", { className: "a-oculto", children: m ? (m.listo ? "listo" : "esperando") : "lugar libre" })] }, i)))) })] }));
}
/** Celular: solo tu figura, en tu pedestal de color. */
export function MiPedestal({ miembros, yo }) {
    const i = miembros.findIndex(m => m.id === yo), m = miembros[i];
    const momentos = useMomentos(m ? [m] : []);
    if (!m)
        return null;
    const c = colorDe(m.id, miembros.map(x => x.id)) ?? colorJugador(i);
    return (_jsxs("div", { className: "a-sala-mio" + (m.listo ? " listo" : ""), style: { ...varsColor(c), "--pj-arte": urlArte(`${carpetaLobby}/cabina-${claveArchivo(c)}.webp`) }, children: [_jsx("span", { className: "a-sala-pn dsp", children: c.etiqueta }), _jsx("span", { className: "a-sala-color", children: c.nombre }), m.listo && _jsx("span", { className: "a-sala-listo dsp ol", children: "\u00A1Listo!" }), _jsx(Escena3D, { modo: "sala", figuras: [{ ...enEscena(m.id, m.figura), color: c.base, columna: 0 }], columnas: 1, momentos: momentos, className: "a-sala-3d" }), _jsx("span", { className: "a-sala-nombre", children: _jsx(NombreJugador, { nombre: m.nombre, figura: m.figura }) })] }));
}
/** Celular: los demás en fila, cada uno con su color y si ya está listo. */
export function FilaSala({ miembros, yo }) {
    return (_jsx("ul", { className: "a-sala-fila", "aria-label": "Qui\u00E9n est\u00E1 en el lobby", children: miembros.map((m, i) => {
            const c = colorDe(m.id, miembros.map(x => x.id)) ?? colorJugador(i);
            return (_jsxs("li", { className: (m.listo ? "listo" : "") + (m.id === yo ? " yo" : ""), style: varsColor(c), children: [_jsx("span", { className: "a-sala-pn dsp", children: c.etiqueta }), _jsx(NombreJugador, { nombre: m.nombre, figura: m.figura, clase: "" }), _jsx("small", { children: m.listo ? "¡Listo!" : "Esperando" })] }, m.id));
        }) }));
}
const TEXTO_GESTO = { saludar: "Saludar", bailar: "Bailar" };
/** Botones para que tu figura salude o baile en el lobby (todos la ven). */
export function Gestos({ alGesto }) {
    return (_jsx("div", { className: "a-sala-gestos", role: "group", "aria-label": "Gestos de tu figura", children: GESTOS.map(g => _jsx(Boton, { color: g === "saludar" ? "azul" : "morado", texto: TEXTO_GESTO[g], onClick: () => alGesto(g) }, g)) }));
}
/** Franja «¡TODOS LISTOS!» cuando todos confirmaron: el anfitrión arma la partida y la inicia. */
export function TodosListos({ miembros, texto = "El anfitrión prepara la partida" }) {
    if (!preparados(miembros).todos)
        return null;
    return (_jsxs("div", { className: "a-sala-todos", role: "status", children: [_jsx("span", { className: "dsp ol a-sala-todos-t", children: "\u00A1Todos listos!" }), _jsx("span", { className: "a-sala-todos-s", children: texto })] }));
}
