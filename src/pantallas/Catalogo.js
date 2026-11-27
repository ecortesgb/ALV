import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Catálogo por intención (Maestro §21.3): filas por lo que se antoja, y candado con su razón.
import { JUEGOS } from "../content/catalogo";
import { REGLAS } from "../content/reglas";
import { Boton, Chip, Icono, Panel, TarjetaJuego } from "../ds";
import { ir } from "../app/rutas";
import { Cabecera, Marco } from "./comun";
export const FILAS = [
    { id: "empezar", nombre: "Para empezar", color: "var(--fila-empezar)", juegos: ["bienvenida", "lista", "que-prefieres"] },
    { id: "miente", nombre: "¿Quién miente?", color: "var(--fila-miente)", juegos: ["impostor", "mas-probable"] },
    { id: "secretos", nombre: "Para soltar secretos", color: "var(--fila-secretos)", juegos: ["verdad-reto", "yo-nunca", "reloj"] },
    { id: "reir", nombre: "Para reír", color: "var(--fila-reir)", juegos: ["mimica", "prohibida", "ruleta"] },
    { id: "competir", nombre: "A competir", color: "var(--fila-competir)", juegos: ["reto-lugar", "fisico"] },
    { id: "pareja", nombre: "En pareja", color: "var(--fila-pareja)", juegos: ["conoces", "dados-hot"] },
];
export const NIVELES = ["", "Tranquilo", "Picante", "Sin filtro", "Salvaje"];
export const colorDe = (id) => FILAS.find(f => f.juegos.includes(id))?.color ?? "var(--fila-empezar)";
const def = (id) => JUEGOS.find(j => j.id === id);
export const gente = (j) => `${j.minJugadores} a ${j.maxJugadores}`;
export const duracion = (j) => (j.segundos ? "10 min" : j.motor === "rol-secreto" ? "15 min" : "8 min");
/** Por qué no se puede jugar ahora, o null si sí. */
export function candado(j, jugadores, nivel) {
    if (!j.motor)
        return "Pronto";
    if (jugadores < j.minJugadores)
        return `Faltan ${j.minJugadores - jugadores}`;
    if (j.soloParejas && jugadores % 2 !== 0)
        return "Número par";
    if (nivel < j.intensidadMin)
        return `Nivel ${NIVELES[j.intensidadMin]}`;
    return null;
}
/** Filas del catálogo. Con `jugadores` marca candados; `alElegir` decide qué pasa al tocar. */
export function Filas({ jugadores, nivel = 4, elegido, alElegir }) {
    return (_jsx("div", { className: "a-filas", children: FILAS.map(f => (_jsxs("section", { className: "a-fila-cat", "aria-label": f.nombre, children: [_jsxs("h2", { className: "a-fila-t", children: [_jsx("i", { style: { background: f.color } }), f.nombre] }), _jsx("div", { className: "a-tira", children: f.juegos.map((id, i) => {
                        const j = def(id);
                        return _jsx(TarjetaJuego, { nombre: j.nombre, sigla: j.sigla ?? "ALV", jugadores: gente(j), duracion: duracion(j), color: f.color, indice: i, enfocada: elegido === id, bloqueada: jugadores != null ? candado(j, jugadores, nivel) ?? undefined : undefined, onClick: () => alElegir(id) }, id);
                    }) })] }, f.id))) }));
}
export function Catalogo() {
    return _jsx(Marco, { children: _jsxs("div", { className: "a-ancho a-pila", children: [_jsx(Cabecera, { titulo: "Cat\u00E1logo", icono: "play" }), _jsx(Filas, { alElegir: id => ir("juego", id) })] }) });
}
/** Reglas de un juego, tal como las puntúa el motor. */
export function Reglas({ id }) {
    const j = JUEGOS.find(x => x.id === id);
    if (!j?.motor)
        return null;
    const r = REGLAS[j.motor];
    return (_jsxs("div", { className: "a-pila", children: [_jsx("p", { className: "a-carta", children: j.descripcion }), _jsxs("div", { className: "a-fila a-envuelve", children: [_jsx(Chip, { texto: `${gente(j)} jugadores`, icono: "users" }), _jsx(Chip, { texto: duracion(j), icono: "clock" }), j.soloParejas && _jsx(Chip, { texto: "En parejas", icono: "heart" }), j.adulto && _jsx(Chip, { texto: "Solo Salvaje", icono: "bolt" })] }), _jsx("p", { className: "a-suave", children: r.objetivo }), _jsx("ul", { className: "a-lista", children: r.puntos.map(p => _jsxs("li", { children: [_jsx(Icono, { id: "star" }), p] }, p)) }), _jsxs("p", { className: "a-suave", children: [_jsx("b", { children: "Gana:" }), " ", r.gana] }), j.modoCorto && _jsx("p", { className: "a-nota", children: j.modoCorto })] }));
}
export function FichaJuego({ id }) {
    const j = JUEGOS.find(x => x.id === id);
    if (!j)
        return _jsx(Catalogo, {});
    return (_jsx(Marco, { children: _jsxs("div", { className: "a-ancho a-angosto a-pila", children: [_jsx(Cabecera, { titulo: j.sigla ?? "Juego", icono: "play" }), _jsxs(Panel, { className: "a-pila a-entra", como: "article", style: { borderTop: `6px solid ${colorDe(id)}` }, children: [_jsx("span", { className: "dsp ol a-t1", children: j.nombre }), _jsx(Reglas, { id: id })] }), _jsx(Boton, { color: "amarillo", texto: "Jugar", sub: "Abre o entra a una sala", icono: "play", onClick: () => ir("jugar") })] }) }));
}
