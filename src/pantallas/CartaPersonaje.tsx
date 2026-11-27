// Carta de personaje (álbum, apertura de sobres y trajes del personalizador). Estilo en carta-personaje.css.
import { NOMBRE_RAREZA, type Rareza } from "../content/rarezas";
import { NUMEROS_PERSONAJES } from "../content/numerosPersonajes";
import { rarezaPersonaje as rareza } from "../content/personajesTienda";
import { Icono } from "../ds";
import { nombreSaga, type Tarjeta } from "../personajes/integracion";
import "./carta-personaje.css";

export const etiquetaRareza = (t: Tarjeta, nivel: Rareza) => t.tamano === "grande" && (nivel === "comun" || nivel === "rara")
  ? "Especial" : nivel === "comun" ? "Inicial" : NOMBRE_RAREZA[nivel];
export const LOGOS: Record<string, string> = {
  marvel: "Marvel", avengers: "Avengers", "x-men": "X-Men",
  batman: "LEGO Batman", dc: "DC", "liga-justicia": "Liga de la Justicia",
  "harry-potter": "LEGO Harry Potter", "star-wars": "LEGO Star Wars",
  guardianes: "Guardianes de la Galaxia", venom: "Venom", wolverine: "Wolverine",
  daredevil: "Daredevil", "cuatro-fantasticos": "Los Cuatro Fantásticos", "villanos-marvel": "Villanos",
  // Sagas de los personajes nuevos (logos de Elías, 2026-11-27).
  disney: "Disney", increibles: "Los Increíbles", "looney-tunes": "Looney Tunes", simpsons: "Los Simpson",
  "plaza-sesamo": "Plaza Sésamo", muppets: "Los Muppets", "hora-de-aventura": "Hora de Aventura",
  "chicas-superpoderosas": "Las Chicas Superpoderosas",
};
export const logo = (id: string) => `${import.meta.env.BASE_URL}arte/tienda/sagas/${id}.webp`;
const CUATRO_FANTASTICOS = new Set(["mr-fantastico", "mujer-invisible", "antorcha-humana", "la-mole"]);
const EMBLEMAS: Record<string, string> = {
  superman: "superman", batman: "emblema-batman", "batman-returns": "emblema-batman",
  "mujer-maravilla": "mujer-maravilla", flash: "flash",
};

export function temaDe(t: Tarjeta) {
  if (t.saga === "marvel") {
    if (CUATRO_FANTASTICOS.has(t.id)) return "cuatro-fantasticos";
    if (t.id === "wolverine" || t.id === "daredevil") return t.id;
    if (t.id === "venom" || t.id === "venom-grande") return "venom";
    return LOGOS[t.grupo] ? t.grupo : "marvel";
  }
  if (t.saga === "dc") {
    if (/^(batman|bruce-wayne|joker|robin)(-|$)/.test(t.id)) return "batman";
    return t.bando === "heroe" ? "liga-justicia" : "dc";
  }
  if (t.saga === "disney" && LOGOS[t.grupo]) return t.grupo; // Los Increíbles llevan su logo; el resto, el de Disney
  return t.saga === "harry-potter" || t.saga === "star-wars" || LOGOS[t.saga] ? t.saga : "alv";
}

export function CartaPersonaje({ tarjeta, foto = tarjeta.foto, revelada = false, nivel = rareza(tarjeta.id), conseguida = false, precio }: {
  tarjeta: Tarjeta; foto?: string | null; revelada?: boolean; nivel?: Rareza; conseguida?: boolean; precio?: number;
}) {
  const tema = temaDe(tarjeta);
  const emblema = tarjeta.saga === "dc" ? EMBLEMAS[tarjeta.id] : undefined;
  const archivo = tema === "villanos-marvel" ? "villanos" : tema;
  const numero = NUMEROS_PERSONAJES[tarjeta.id];
  const bigfig = tarjeta.tamano === "grande";
  const efecto = nivel === "legendaria" ? nivel : nivel === "epica" || bigfig ? "epica" : undefined;
  return <span className="t-carta t-carta-personaje" data-tema={tema} data-rareza={nivel}
    data-bigfig={bigfig || undefined} data-revelado={revelada ? efecto : undefined}>
    <span className="t-personaje-cab">
      {LOGOS[tema] ? <img className="t-personaje-logo" src={logo(archivo)} alt={LOGOS[tema]} draggable={false} />
        : <span className="t-personaje-marca">ALV</span>}
      {(emblema || tarjeta.saga === "marvel") && <img className="t-personaje-emblema" src={logo(emblema ?? "lego")} alt="" draggable={false} />}
    </span>
    <span className="t-personaje-escena">
      <span className="t-personaje-rareza">{etiquetaRareza(tarjeta, nivel)}</span>
      {foto ? <img className="t-personaje-foto" src={foto} alt="" loading={revelada ? "eager" : "lazy"} draggable={false} /> : <Icono id="lock" />}
    </span>
    <span className="t-personaje-pie">
      <span className="t-personaje-nombre" title={tarjeta.nombre}>{tarjeta.nombre}</span>
      <span className="t-personaje-edicion">
        <span>{precio ? `${precio} monedas` : bigfig ? "Bigfig" : nombreSaga(tarjeta.saga)}</span>
        {numero && <b className="t-personaje-numero">#{numero}</b>}
        {nivel !== "comun" && !conseguida && <Icono id="lock" />}
      </span>
    </span>
  </span>;
}
