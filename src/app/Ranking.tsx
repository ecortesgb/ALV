// Ranking: lugares de la sesión (los que ordenan el podio), histórico, parejas e historial de partidas.
import { useState } from "react";
import { Avatar, Retrato } from "./Avatar";
import { CabeceraJuego } from "./Hub";
import { useEstado } from "./estado";
import { tabla, type Fila, type Tabla } from "./puntos-sesion";

const TABS: [Tabla | "historial", string, string][] = [
  ["sesion", "Sesión", "XP ganada en esta sesión. Es la que ordena el podio y el TOP."],
  ["historico", "Histórico", "XP acumulada de siempre. Define el nivel; nunca baja."],
  ["parejas", "Parejas", "Suma de la XP de la sesión de cada pareja."],
  ["historial", "Historial", "Partidas terminadas y XP extra."],
];

export function Ranking() {
  const s = useEstado();
  const [tab, setTab] = useState<Tabla | "historial">("sesion");
  const info = TABS.find(t => t[0] === tab)!;
  const filas = tab === "historial" ? [] : tabla(s, tab);
  const todosEnCero = filas.length > 0 && filas.every(f => f.valor === 0);

  return (
    <>
      <CabeceraJuego titulo="Ranking" color="#FFC23D" />
      <div className="pagina-dividida">
      <div className="pd-izq">
        <div className="pestanas-menu" role="tablist" aria-label="Tipo de ranking">
          {TABS.map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{n}</button>)}
        </div>
        <p className="hint">{info[2]}</p>
        {tab !== "historial" && !todosEnCero && filas.length > 0 && <PodioRanking key={tab} filas={filas.slice(0, 3)} />}
      </div>
      <div className="pd-der pd-desliza">
      {tab === "historial" ? <Historial /> : (
        <>
          {tab === "parejas" && filas.length === 0 && <p className="hint">Elige la modalidad «Parejas» al armar la partida para ver este ranking.</p>}
          {todosEnCero && <p className="hint">{tab === "sesion" ? "Todavía nadie suma XP en esta sesión" : "Todavía nadie suma XP"}. Jueguen una partida.</p>}
          <ol className="tabla-ranking">
            {filas.filter(f => todosEnCero || f.lugar > 3).map(f => (
              <li key={f.id} className={"fila-ranking" + (f.lugar <= 3 && !todosEnCero ? ` top${f.lugar}` : "")}>
                <span className="puesto-n">{todosEnCero ? "–" : f.lugar}</span>
                <span className="caras">{f.jugadores.map(j => <span key={j.id} className="cara"><Retrato p={j.personaje} nombre={j.nombre} size={36} /></span>)}</span>
                <b className="nombre-r">{f.nombre}</b>
                <span className="valor-r">{f.valor} XP</span>
              </li>
            ))}
          </ol>
        </>
      )}
      </div>
      </div>
    </>
  );
}

function Historial() {
  const s = useEstado();
  return (
    <div className="pila">
      {s.historial.length === 0 && <p className="hint">Aquí aparecen las partidas que terminen.</p>}
      {s.historial.map((p, i) => (
        <div key={i} className="card">
          <div className="entre"><b>{p.extra ? `XP extra · ${p.extra}` : p.juego}</b><small className="muted">{new Date(p.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</small></div>
          {p.resultados.map((r, k) => <div key={k} className="entre"><span>{p.extra ? `${r.nombre} · la dio el administrador` : `${k + 1}. ${r.nombre} · ${r.puntos} pts`}</span><span className="chip lime">+{r.xp} XP</span></div>)}
        </div>
      ))}
    </div>
  );
}

/** Los 3 primeros de cuerpo entero sobre su escalón; el 1.º con corona. */
function PodioRanking({ filas }: { filas: Fila[] }) {
  const orden = [filas[1], filas[0], filas[2]];
  return (
    <div className="podio podio-ranking">
      {orden.map((f, i) => f ? (
        <div key={f.id} className={"puesto p" + [2, 1, 3][i]}>
          <span className="sube podio-gente">
            {f.jugadores.map((j, k) => <Avatar key={j.id} p={j.personaje} size={(i === 1 ? 84 : 66) - (f.jugadores.length > 1 ? 18 : 0)} nombre={j.nombre} lider={i === 1 && k === 0} />)}
          </span>
          <b className="podio-nombre">{f.nombre}</b>
          <small className="podio-xp">{f.valor} XP</small>
          <div className="escalon">{f.lugar}</div>
        </div>
      ) : <div key={i} />)}
    </div>
  );
}
