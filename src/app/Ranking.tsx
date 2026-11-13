// Ranking: lugares de la sesión (los que ordenan el podio), histórico, parejas e historial de partidas.
import { useState } from "react";
import { Retrato } from "./Avatar";
import { useEstado } from "./estado";
import { tabla, type Tabla } from "./puntos-sesion";

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
      <h1 className="titulo">Ranking</h1>
      <div className="chips" role="tablist" aria-label="Tipo de ranking">
        {TABS.map(([k, n]) => <button key={k} role="tab" className="opcion" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>{n}</button>)}
      </div>
      <p className="hint">{info[2]}</p>

      {tab === "historial" ? <Historial /> : (
        <>
          {tab === "parejas" && filas.length === 0 && <p className="hint">Activa «Juegan en parejas» en el Lobby para ver este ranking.</p>}
          {todosEnCero && <p className="hint">{tab === "sesion" ? "Todavía nadie suma XP en esta sesión" : "Todavía nadie suma XP"}. Jueguen una partida.</p>}
          <ol className="tabla-ranking">
            {filas.map(f => (
              <li key={f.id} className={"fila-ranking" + (f.lugar <= 3 && !todosEnCero ? ` top${f.lugar}` : "")}>
                <span className="puesto-n">{todosEnCero ? "–" : f.lugar}</span>
                <span className="caras">{f.jugadores.map(j => <span key={j.id} className="cara"><Retrato p={j.personaje} nombre={j.nombre} size={36} /></span>)}</span>
                <b className="nombre-r">{f.nombre}</b>
                <span className="valor-r">{f.valor} XP</span>
              </li>
            ))}
          </ol>
          {tab === "parejas" || <p className="hint">Equipos: aparece cuando exista el modo por equipos.</p>}
        </>
      )}
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
