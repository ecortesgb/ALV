// Lobby con pedestales (referencia: LEGO Party, ALV_REFERENCIA_LEGO_PARTY.md §1 y §2).
// La usan el celular (Sala.tsx) y la Pantalla (roles/pantalla/Pantalla.tsx). Solo lee lo público de la sala:
// nombre, figura, anfitrión, «listo» y el último gesto de cada miembro. El color de cada quien sale del orden de entrada.
import { useRef, type CSSProperties, type ReactNode } from "react";
import { GESTOS, type Gesto, type Miembro } from "../servicios/enlace";
import { claveArchivo, colorDe, colorJugador, varsColor } from "../app/colorJugador";
import { Escena3D, enEscena, type EnEscena, type Momento } from "../app/figura3d";
import { Boton } from "../ds";
import { NombreJugador, urlArte } from "./comun";

/** Cupo del lobby en esta fase de prueba (también lo valida el servidor en `unirse_evento`). */
export const CUPO_LOBBY = 8;
/** Lugares que se dibujan: 4 como mínimo (los vacíos con «+»); con más, uno por cada quien. */
export const lugaresSala = (n: number) => Math.max(4, n);

export interface Preparados { listos: number; total: number; todos: boolean }
/** Cuántos marcaron «¡Listo!». `todos` pide al menos dos personas en la sala. */
export function preparados(miembros: readonly Miembro[]): Preparados {
  const listos = miembros.filter(m => m.listo).length, total = miembros.length;
  return { listos, total, todos: total >= 2 && listos === total };
}

/**
 * Lo que hace cada figura: festeja al pasar a «listo» y repite el gesto que su dueño mandó (saludar, bailar).
 * Solo cuenta los cambios que se ven desde que se abrió la pantalla: al entrar no se repiten gestos viejos.
 */
function useMomentos(miembros: readonly Miembro[]) {
  const visto = useRef(new Map<string, { listo: boolean; gestoN: number }>());
  const cuenta = useRef(new Map<string, number>());
  const sube = (k: string) => cuenta.current.set(k, (cuenta.current.get(k) ?? 0) + 1);
  for (const m of miembros) {
    const antes = visto.current.get(m.id), n = m.gestoN ?? 0;
    if (antes) {
      if (m.listo && !antes.listo) sube(`${m.id}:victoria`);
      if (n > antes.gestoN && GESTOS.includes(m.gesto as Gesto)) sube(`${m.id}:${m.gesto}`);
    }
    visto.current.set(m.id, { listo: m.listo, gestoN: n });
  }
  return miembros.flatMap(m => (["victoria", ...GESTOS] as Momento[]).map(cual => ({ id: m.id, cual, n: cuenta.current.get(`${m.id}:${cual}`) ?? 0 })));
}

/** «2/4 LISTOS». */
export function ContadorListos({ miembros, className = "" }: { miembros: readonly Miembro[]; className?: string }) {
  const p = preparados(miembros);
  return (
    <div className={"a-sala-contador" + (p.todos ? " todos" : "") + (className ? " " + className : "")} role="status" aria-live="polite">
      <b className="dsp ol">{p.listos}/{p.total || 0}</b><span className="dsp ol">listos</span>
    </div>
  );
}

/** «5/8 en el lobby». */
export function Cupo({ miembros }: { miembros: readonly Miembro[] }) {
  return <span className="a-sala-cupo"><b>{miembros.length}/{CUPO_LOBBY}</b> en el lobby</span>;
}

/** Fondo propio del lobby: un estudio de TV con pantalla de bloques, reflectores de colores y piso brillante. */
export function FondoLobby() {
  return (
    <div className="d-bg a-fondo-lobby" aria-hidden="true">
      <div className="a-fl-pared" />
      <div className="a-fl-letrero"><span>ALV</span></div>
      {["#e8343a", "#2f7cf0", "#ffcf2e", "#2fbf4f"].map((c, i) => <i key={i} className={`a-fl-haz h${i}`} style={{ "--haz": c } as CSSProperties} />)}
      <div className="a-fl-truss" />
      <div className="a-fl-piso" />
    </div>
  );
}

/** Cápsula pintada de cada color (arte de Elías en public/arte/lobby/capsula-<color>.webp). Si aún no existe, no se pinta y queda la columna de color. */
const artePara = (nombre: string) => ({ "--pj-arte": urlArte(`lobby/capsula-${nombre.toLowerCase()}.webp`) }) as CSSProperties;

/** Columna de color por lugar, figura en su pedestal bajo un foco, «+» en los vacíos y «¡LISTO!» encima de quien confirmó. */
/** Variante «fiesta» del lobby: nombre arriba junto al P1, sello con palomita, cruceta en lugares libres y controles dentro. */
export interface Fiesta { arriba?: (m: Miembro) => ReactNode; abajo?: (m: Miembro) => ReactNode;
  /** PRUEBA (Elías, 22 nov): cápsulas con el pedestal pintado; la escena no dibuja el suyo. */
  escenarios?: boolean }
const arteLobby = (n: string) => `${import.meta.env.BASE_URL}arte/lobby/${n}.webp`;

export function Pedestales({ miembros, yo, className = "", fiesta }: { miembros: readonly Miembro[]; yo?: string; className?: string; fiesta?: Fiesta }) {
  const lugares = lugaresSala(miembros.length);
  const momentos = useMomentos(miembros);
  const ids = miembros.map(m => m.id);
  const colorEn = (i: number) => (miembros[i] ? colorDe(miembros[i]!.id, ids) : null) ?? colorJugador(i);
  const figuras: EnEscena[] = miembros.map((m, i) => ({ ...enEscena(m.id, m.figura), color: colorEn(i).base, columna: i }));
  const cols = Array.from({ length: lugares }, (_, i) => ({ i, m: miembros[i], c: colorEn(i) }));
  const estilo = { "--lugares": lugares } as CSSProperties;
  return (
    <div className={"a-sala-escenario" + (lugares > 4 ? " muchos" : "") + (fiesta ? " fiesta" : "") + (className ? " " + className : "")} style={estilo}>
      <div className="a-sala-cols" aria-hidden="true">
        {cols.map(({ i, m, c }) => fiesta?.escenarios
          ? <div key={i} className={"a-sala-col lb-cab" + (m ? "" : " vacia") + (m?.listo ? " listo" : "")} style={{ ...varsColor(c), "--pj-arte": urlArte(`lobby/cabina-${m ? claveArchivo(c) : "vacia"}.webp`) } as CSSProperties}>
              {m && <img key={"p" + m.id} className="lb-ped" src={arteLobby(`pedestal-${claveArchivo(c)}`)} alt="" draggable={false} />}
              {m && <span key={"t" + m.id + (m.figura ? JSON.stringify(m.figura).length : 0)} className="lb-tele" aria-hidden="true" />}
              {m?.listo && <span className="lb-luz" aria-hidden="true" />}
            </div>
          : <div key={i} className={"a-sala-col" + (m ? "" : " vacia") + (m?.listo ? " listo" : "")} style={{ ...varsColor(m ? c : null), ...(m ? artePara(c.nombre) : {}) }} />)}
      </div>
      <Escena3D modo="sala" figuras={figuras} columnas={lugares} momentos={momentos} className="a-sala-3d" sinPedestal={!!fiesta?.escenarios} />
      <ul className="a-sala-rotulos" aria-label="Jugadores en el lobby">
        {cols.map(({ i, m, c }) => (
          fiesta ? (
          <li key={i} className={"a-sala-rot lb-rot" + (m ? "" : " vacia") + (m?.listo ? " listo" : "") + (m && m.id === yo ? " yo" : "")} style={varsColor(m ? c : null)}>
            <span className="lb-etq"><b>{c.etiqueta}</b>{m?.anfitrion && <img src={arteLobby("ico-corona")} alt="Administrador" className="lb-corona" />}<span className="lb-etq-nom">{m ? <NombreJugador nombre={m.nombre} figura={m.figura} /> : "Libre"}</span></span>
            {m && fiesta.arriba && <span className="lb-arriba">{fiesta.arriba(m)}</span>}
            {m?.listo && <span className="lb-sello"><img src={arteLobby("ico-listo")} alt="" /><span>¡Listo!</span></span>}
            {!m && !fiesta.escenarios && <img className="lb-libre" src={arteLobby("lugar-libre")} alt="" />}
            {m && !m.listo && <span className="lb-aun">Aún no</span>}
            {m && fiesta.abajo && <span className="lb-abajo">{fiesta.abajo(m)}</span>}
            <span className="a-oculto">{m ? (m.listo ? "listo" : "esperando") : "lugar libre"}</span>
          </li>) : (
          <li key={i} className={"a-sala-rot" + (m ? "" : " vacia") + (m?.listo ? " listo" : "") + (m && m.id === yo ? " yo" : "")} style={varsColor(m ? c : null)}>
            <span className="a-sala-pn dsp">{c.etiqueta}</span>
            {m?.listo && <span className="a-sala-listo dsp ol">¡Listo!</span>}
            {!m && <span className="a-sala-mas dsp" aria-hidden="true">+</span>}
            <span className="a-sala-nombre">{m ? <NombreJugador nombre={m.nombre} figura={m.figura} /> : <span className="dsp">Libre</span>}
              {m?.anfitrion && <small className="a-sala-anf">Anfitrión</small>}</span>
            <span className="a-oculto">{m ? (m.listo ? "listo" : "esperando") : "lugar libre"}</span>
          </li>)
        ))}
      </ul>
    </div>
  );
}

/** Celular: solo tu figura, en tu pedestal de color. */
export function MiPedestal({ miembros, yo }: { miembros: readonly Miembro[]; yo: string }) {
  const i = miembros.findIndex(m => m.id === yo), m = miembros[i];
  const momentos = useMomentos(m ? [m] : []);
  if (!m) return null;
  const c = colorDe(m.id, miembros.map(x => x.id)) ?? colorJugador(i);
  return (
    <div className={"a-sala-mio" + (m.listo ? " listo" : "")} style={{ ...varsColor(c), "--pj-arte": urlArte(`lobby/cabina-${claveArchivo(c)}.webp`) } as CSSProperties}>
      <span className="a-sala-pn dsp">{c.etiqueta}</span>
      <span className="a-sala-color">{c.nombre}</span>
      {m.listo && <span className="a-sala-listo dsp ol">¡Listo!</span>}
      <Escena3D modo="sala" figuras={[{ ...enEscena(m.id, m.figura), color: c.base, columna: 0 }]} columnas={1} momentos={momentos} className="a-sala-3d" />
      <span className="a-sala-nombre"><NombreJugador nombre={m.nombre} figura={m.figura} /></span>
    </div>
  );
}

/** Celular: los demás en fila, cada uno con su color y si ya está listo. */
export function FilaSala({ miembros, yo }: { miembros: readonly Miembro[]; yo: string }) {
  return (
    <ul className="a-sala-fila" aria-label="Quién está en el lobby">
      {miembros.map((m, i) => {
        const c = colorDe(m.id, miembros.map(x => x.id)) ?? colorJugador(i);
        return (
          <li key={m.id} className={(m.listo ? "listo" : "") + (m.id === yo ? " yo" : "")} style={varsColor(c)}>
            <span className="a-sala-pn dsp">{c.etiqueta}</span>
            <NombreJugador nombre={m.nombre} figura={m.figura} clase="" />
            <small>{m.listo ? "¡Listo!" : "Esperando"}</small>
          </li>
        );
      })}
    </ul>
  );
}

const TEXTO_GESTO: Record<Gesto, string> = { saludar: "Saludar", bailar: "Bailar" };
/** Botones para que tu figura salude o baile en el lobby (todos la ven). */
export function Gestos({ alGesto }: { alGesto: (g: Gesto) => void }) {
  return (
    <div className="a-sala-gestos" role="group" aria-label="Gestos de tu figura">
      {GESTOS.map(g => <Boton key={g} color={g === "saludar" ? "azul" : "morado"} texto={TEXTO_GESTO[g]} onClick={() => alGesto(g)} />)}
    </div>
  );
}

/** Franja «¡TODOS LISTOS!» cuando todos confirmaron: el anfitrión arma la partida y la inicia. */
export function TodosListos({ miembros, texto = "El anfitrión prepara la partida" }: { miembros: readonly Miembro[]; texto?: string }) {
  if (!preparados(miembros).todos) return null;
  return (
    <div className="a-sala-todos" role="status">
      <span className="dsp ol a-sala-todos-t">¡Todos listos!</span>
      <span className="a-sala-todos-s">{texto}</span>
    </div>
  );
}
