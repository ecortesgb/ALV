// Catálogo por intención (Maestro §21.3): filas por lo que se antoja, y candado con su razón.
import { JUEGOS } from "../content/catalogo";
import { REGLAS } from "../content/reglas";
import type { DefinicionJuego } from "../engine/types";
import { Boton, Chip, Icono, Panel, TarjetaJuego } from "../ds";
import { ir } from "../app/rutas";
import { Cabecera, Marco } from "./comun";

export const FILAS: { id: string; nombre: string; color: string; juegos: string[] }[] = [
  { id: "empezar", nombre: "Para empezar", color: "var(--fila-empezar)", juegos: ["bienvenida", "lista", "que-prefieres"] },
  { id: "miente", nombre: "¿Quién miente?", color: "var(--fila-miente)", juegos: ["impostor", "mas-probable"] },
  { id: "secretos", nombre: "Para soltar secretos", color: "var(--fila-secretos)", juegos: ["verdad-reto", "yo-nunca", "reloj"] },
  { id: "reir", nombre: "Para reír", color: "var(--fila-reir)", juegos: ["mimica", "prohibida", "ruleta"] },
  { id: "competir", nombre: "A competir", color: "var(--fila-competir)", juegos: ["reto-lugar", "fisico"] },
  { id: "pareja", nombre: "En pareja", color: "var(--fila-pareja)", juegos: ["conoces", "dados-hot"] },
];
export const NIVELES = ["", "Tranquilo", "Picante", "Sin filtro", "Salvaje"] as const;
export const colorDe = (id: string) => FILAS.find(f => f.juegos.includes(id))?.color ?? "var(--fila-empezar)";
const def = (id: string) => JUEGOS.find(j => j.id === id)!;
export const gente = (j: DefinicionJuego) => `${j.minJugadores} a ${j.maxJugadores}`;
export const duracion = (j: DefinicionJuego) => (j.segundos ? "10 min" : j.motor === "rol-secreto" ? "15 min" : "8 min");

/** Por qué no se puede jugar ahora, o null si sí. */
export function candado(j: DefinicionJuego, jugadores: number, nivel: number): string | null {
  if (!j.motor) return "Pronto";
  if (jugadores < j.minJugadores) return `Faltan ${j.minJugadores - jugadores}`;
  if (j.soloParejas && jugadores % 2 !== 0) return "Número par";
  if (nivel < j.intensidadMin) return `Nivel ${NIVELES[j.intensidadMin]}`;
  return null;
}

/** Filas del catálogo. Con `jugadores` marca candados; `alElegir` decide qué pasa al tocar. */
export function Filas({ jugadores, nivel = 4, elegido, alElegir }: { jugadores?: number; nivel?: number; elegido?: string; alElegir: (id: string) => void }) {
  return (
    <div className="a-filas">
      {FILAS.map(f => (
        <section key={f.id} className="a-fila-cat" aria-label={f.nombre}>
          <h2 className="a-fila-t"><i style={{ background: f.color }} />{f.nombre}</h2>
          <div className="a-tira">
            {f.juegos.map((id, i) => {
              const j = def(id);
              return <TarjetaJuego key={id} nombre={j.nombre} sigla={j.sigla ?? "ALV"} jugadores={gente(j)} duracion={duracion(j)} color={f.color} indice={i}
                enfocada={elegido === id} bloqueada={jugadores != null ? candado(j, jugadores, nivel) ?? undefined : undefined} onClick={() => alElegir(id)} />;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function Catalogo() {
  return <Marco><div className="a-ancho a-pila"><Cabecera titulo="Catálogo" icono="play" /><Filas alElegir={id => ir("juego", id)} /></div></Marco>;
}

/** Reglas de un juego, tal como las puntúa el motor. */
export function Reglas({ id }: { id: string }) {
  const j = JUEGOS.find(x => x.id === id);
  if (!j?.motor) return null;
  const r = REGLAS[j.motor];
  return (
    <div className="a-pila">
      <p className="a-carta">{j.descripcion}</p>
      <div className="a-fila a-envuelve"><Chip texto={`${gente(j)} jugadores`} icono="users" /><Chip texto={duracion(j)} icono="clock" />{j.soloParejas && <Chip texto="En parejas" icono="heart" />}{j.adulto && <Chip texto="Solo Salvaje" icono="bolt" />}</div>
      <p className="a-suave">{r.objetivo}</p>
      <ul className="a-lista">{r.puntos.map(p => <li key={p}><Icono id="star" />{p}</li>)}</ul>
      <p className="a-suave"><b>Gana:</b> {r.gana}</p>
      {j.modoCorto && <p className="a-nota">{j.modoCorto}</p>}
    </div>
  );
}

export function FichaJuego({ id }: { id: string }) {
  const j = JUEGOS.find(x => x.id === id);
  if (!j) return <Catalogo />;
  return (
    <Marco>
      <div className="a-ancho a-angosto a-pila">
        <Cabecera titulo={j.sigla ?? "Juego"} icono="play" />
        <Panel className="a-pila a-entra" como="article" style={{ borderTop: `6px solid ${colorDe(id)}` }}>
          <span className="dsp ol a-t1">{j.nombre}</span>
          <Reglas id={id} />
        </Panel>
        <Boton color="amarillo" texto="Jugar" sub="Abre o entra a una sala" icono="play" onClick={() => ir("jugar")} />
      </div>
    </Marco>
  );
}
