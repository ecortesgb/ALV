import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Carta de personaje (álbum, apertura de sobres y trajes del personalizador). Estilo en carta-personaje.css.
import { NOMBRE_RAREZA } from "../content/rarezas";
import { NUMEROS_PERSONAJES } from "../content/numerosPersonajes";
import { rarezaPersonaje as rareza } from "../content/personajesTienda";
import { Icono } from "../ds";
import { nombreSaga } from "../personajes/integracion";
import "./carta-personaje.css";
export const etiquetaRareza = (t, nivel) => t.tamano === "grande" && (nivel === "comun" || nivel === "rara")
    ? "Especial" : nivel === "comun" ? "Inicial" : NOMBRE_RAREZA[nivel];
export const LOGOS = {
    marvel: "Marvel", avengers: "Avengers", "x-men": "X-Men",
    batman: "LEGO Batman", dc: "DC", "liga-justicia": "Liga de la Justicia",
    "harry-potter": "LEGO Harry Potter", "star-wars": "LEGO Star Wars",
    guardianes: "Guardianes de la Galaxia", venom: "Venom", wolverine: "Wolverine",
    daredevil: "Daredevil", "cuatro-fantasticos": "Los Cuatro Fantásticos", "villanos-marvel": "Villanos",
};
export const logo = (id) => `${import.meta.env.BASE_URL}arte/tienda/sagas/${id}.webp`;
const CUATRO_FANTASTICOS = new Set(["mr-fantastico", "mujer-invisible", "antorcha-humana", "la-mole"]);
const EMBLEMAS = {
    superman: "superman", batman: "emblema-batman", "batman-returns": "emblema-batman",
    "mujer-maravilla": "mujer-maravilla", flash: "flash",
};
export function temaDe(t) {
    if (t.saga === "marvel") {
        if (CUATRO_FANTASTICOS.has(t.id))
            return "cuatro-fantasticos";
        if (t.id === "wolverine" || t.id === "daredevil")
            return t.id;
        if (t.id === "venom" || t.id === "venom-grande")
            return "venom";
        return LOGOS[t.grupo] ? t.grupo : "marvel";
    }
    if (t.saga === "dc") {
        if (/^(batman|bruce-wayne|joker|robin)(-|$)/.test(t.id))
            return "batman";
        return t.bando === "heroe" ? "liga-justicia" : "dc";
    }
    return t.saga === "harry-potter" || t.saga === "star-wars" ? t.saga : "alv";
}
export function CartaPersonaje({ tarjeta, foto = tarjeta.foto, revelada = false, nivel = rareza(tarjeta.id), conseguida = false, precio }) {
    const tema = temaDe(tarjeta);
    const emblema = tarjeta.saga === "dc" ? EMBLEMAS[tarjeta.id] : undefined;
    const archivo = tema === "villanos-marvel" ? "villanos" : tema;
    const numero = NUMEROS_PERSONAJES[tarjeta.id];
    const bigfig = tarjeta.tamano === "grande";
    const efecto = nivel === "legendaria" ? nivel : nivel === "epica" || bigfig ? "epica" : undefined;
    return _jsxs("span", { className: "t-carta t-carta-personaje", "data-tema": tema, "data-rareza": nivel, "data-bigfig": bigfig || undefined, "data-revelado": revelada ? efecto : undefined, children: [_jsxs("span", { className: "t-personaje-cab", children: [LOGOS[tema] ? _jsx("img", { className: "t-personaje-logo", src: logo(archivo), alt: LOGOS[tema], draggable: false })
                        : _jsx("span", { className: "t-personaje-marca", children: "ALV" }), (emblema || tarjeta.saga === "marvel") && _jsx("img", { className: "t-personaje-emblema", src: logo(emblema ?? "lego"), alt: "", draggable: false })] }), _jsxs("span", { className: "t-personaje-escena", children: [_jsx("span", { className: "t-personaje-rareza", children: etiquetaRareza(tarjeta, nivel) }), foto ? _jsx("img", { className: "t-personaje-foto", src: foto, alt: "", loading: revelada ? "eager" : "lazy", draggable: false }) : _jsx(Icono, { id: "lock" })] }), _jsxs("span", { className: "t-personaje-pie", children: [_jsx("span", { className: "t-personaje-nombre", title: tarjeta.nombre, children: tarjeta.nombre }), _jsxs("span", { className: "t-personaje-edicion", children: [_jsx("span", { children: precio ? `${precio} monedas` : bigfig ? "Bigfig" : nombreSaga(tarjeta.saga) }), numero && _jsxs("b", { className: "t-personaje-numero", children: ["#", numero] }), nivel !== "comun" && !conseguida && _jsx(Icono, { id: "lock" })] })] })] });
}
