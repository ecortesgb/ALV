// El impostor con eliminación en la Pantalla (TV o laptop). Recibe SOLO la vista pública:
// los personajes de quienes siguen en juego, cada uno con su color, y la palabra que dijo en la vuelta.
// Quien tiene el turno pasa al frente. Al votar, quien sale se queda con su sello y en la vuelta siguiente ya no está.
import { type CSSProperties } from "react";
import { Cartel, Onomatopeya } from "../../ds";
import { colorDe, varsColor } from "../../app/colorJugador";
import { Escena3D, enEscena, type EnEscena, type Momento } from "../../app/figura3d";
import { NombreJugador } from "../../pantallas/comun";
import type { Miembro } from "../../servicios/enlace";
import { desenlaceImpostor, nombreDe, nombreJuego, type Publico } from "../general/texto";
import { RelojTurno } from "../general/RelojTurno";
import "./impostor.css";

const COLOR_ESCENARIO: Record<string, string> = { alverca: "#22E1FF", fogata: "#FFC23D", parque: "#C6FF3D" };

export function TvImpostor({ v, miembros }: { v: Publico; miembros: Miembro[] }) {
  const im = v.impostor!;
  const ids = v.jugadores.map(j => j.id);
  const revelada = v.fase === "revelada";
  const r = (v.revelado ?? {}) as { eliminado?: string | null; eraImpostor?: boolean; votos?: Record<string, number>; fin?: string | null; impostores?: string[] };
  // En escena: quienes siguen. Al revelar, el eliminado todavía se ve (con su sello) hasta la vuelta siguiente.
  const enEscena_ = ids.filter(id => !im.eliminados.includes(id) || (revelada && r.eliminado === id));
  const habla = !revelada && im.etapa === "pistas" ? v.turnoDe : undefined;
  const figuras: EnEscena[] = enEscena_.map((id, i) => ({ ...enEscena(id, miembros.find(m => m.id === id)?.figura), color: colorDe(id, ids)?.base, columna: i, foco: id === habla }));
  const momentos: { id: string; cual: Momento; n: number }[] = revelada
    ? enEscena_.map(id => ({ id, n: v.ronda, cual: (r.fin ? (r.impostores ?? []).includes(id) === (r.fin === "impostores") : id !== r.eliminado) ? "victoria" : "derrota" }))
    : [];
  const d = revelada ? desenlaceImpostor(v) : null;
  const sub = revelada ? d!.titular : im.etapa === "votar" ? "¡A votar en su celular!" : `Le toca a ${nombreDe(v, v.turnoDe)}`;
  const estilo = { "--lugares": enEscena_.length, "--esc": COLOR_ESCENARIO[v.escenario ?? ""] ?? "#5fb4ff" } as CSSProperties;

  return (
    <div className={"im-tv" + (v.escenario ? ` esc-${v.escenario}` : "")} style={estilo}>
      <div className="im-tv-cab">
        <Cartel titulo={nombreJuego(v.juegoId)} sub={sub} />
        <div className="im-tv-datos"><span className="dsp ol">Vuelta {v.ronda}</span><small>Tema: {v.carta?.texto ?? ""} · {im.total} {im.total === 1 ? "impostor" : "impostores"}</small><RelojTurno v={v} size="4.5em" /></div>
      </div>
      <div className={"im-tv-escena" + (enEscena_.length > 5 ? " muchos" : "")}>
        <div className="im-tv-cols" aria-hidden="true">
          {enEscena_.map(id => <div key={id} className={"im-tv-col" + (id === habla ? " habla" : "") + (revelada && id === r.eliminado ? " sale" : "")} style={varsColor(colorDe(id, ids))} />)}
        </div>
        <Escena3D modo="sala" figuras={figuras} columnas={enEscena_.length} momentos={momentos} className="im-tv-3d" />
        <ul className="im-tv-rotulos" aria-label="Jugadores en escena">
          {enEscena_.map(id => {
            const c = colorDe(id, ids);
            const dijo = v.pistas[id];
            const voto = !revelada && im.etapa === "votar" && v.contestaron.includes(id);
            return (
              <li key={id} className={"im-tv-rot" + (id === habla ? " habla" : "") + (revelada && id === r.eliminado ? " sale" : "")} style={varsColor(c)}>
                <span className="im-pn dsp">{c?.etiqueta}</span>
                {dijo && <span className="im-globo dsp" key={dijo}>{dijo}</span>}
                {!dijo && id === habla && <span className="im-globo dsp pensando">…</span>}
                {voto && <span className="im-voto dsp" aria-label="Ya votó">✓</span>}
                {revelada && r.votos && (r.votos[id] ?? 0) > 0 && <span className="im-votos dsp ol">{r.votos[id]} {r.votos[id] === 1 ? "voto" : "votos"}</span>}
                {revelada && id === r.eliminado && <span className="im-sello dsp ol">{r.eraImpostor ? "¡Impostor!" : "Fuera"}</span>}
                <span className="im-tv-nom"><NombreJugador nombre={nombreDe(v, id)} figura={miembros.find(m => m.id === id)?.figura} /></span>
              </li>
            );
          })}
        </ul>
      </div>
      {revelada && d?.detalle && <p className="dsp ol im-tv-detalle">{d.detalle}</p>}
      {revelada && r.fin && <Onomatopeya texto={r.fin === "civiles" ? "¡ATRAPADOS!" : "¡ESCAPARON!"} color="var(--amarillo)" tamano="4em" giro={-8} style={{ position: "absolute", top: "44%", left: "50%", translate: "-50% 0", zIndex: 5, pointerEvents: "none" }} />}
      {im.eliminados.length > 0 && !(revelada && im.eliminados.length === 1 && r.eliminado) && (
        <p className="im-tv-fuera">Fuera de escena: {im.eliminados.filter(j => !(revelada && j === r.eliminado)).map(j => nombreDe(v, j)).join(", ")}</p>
      )}
      {revelada && v.votosDe && <p className="a-tv-votos">{Object.entries(v.votosDe).map(([de, a]) => `${nombreDe(v, de)} → ${nombreDe(v, a)}`).join("   ·   ")}</p>}
    </div>
  );
}
