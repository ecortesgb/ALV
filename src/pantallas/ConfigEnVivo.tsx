// Configuración en vivo (Elías, 24 nov): mientras el anfitrión arma la partida, los demás ven en qué paso va y qué
// eligió. Va por difusión (`config-<sala>`), sin guardar nada; el anfitrión la repite cada pocos segundos para quien
// llegue tarde y la da por terminada al salir. Es solo para ver: no decide nada del juego.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { abrirDifusion } from "../servicios/difusion";
import { ARTE_ESCENARIOS, ARTE_JUEGOS, EMOJI_JUEGO } from "../content/arteJuegos";
import { srcArte } from "./TarjetasConfig";
import "./config-vivo.css";

export interface EstadoConfig {
  quien: string; paso: string; escenario: string | null; escenarioNombre: string; juego: string; juegoNombre: string;
  modo: string; grupos: { nombre: string; jugadores: string[] }[]; herramienta: string; nivel: string;
}

const REPITE_MS = 3000, OLVIDO_MS = 9000;
const txt = (x: unknown, max = 60) => (typeof x === "string" ? x.slice(0, max) : "");

/** Revisa forma y largo de lo que llega (viene de otro aparato). */
export function leerEstadoConfig(d: Record<string, unknown>): EstadoConfig | null {
  if (typeof d.juego !== "string" || !/^[a-z0-9-]{1,40}$/.test(d.juego)) return null;
  const esc = typeof d.escenario === "string" && /^[a-z0-9-]{1,40}$/.test(d.escenario) ? d.escenario : null;
  const grupos = Array.isArray(d.grupos) ? (d.grupos as unknown[]).slice(0, 8).map(g => {
    const o = (g ?? {}) as { nombre?: unknown; jugadores?: unknown };
    return { nombre: txt(o.nombre, 24), jugadores: Array.isArray(o.jugadores) ? (o.jugadores as unknown[]).slice(0, 8).map(j => txt(j, 24)) : [] };
  }) : [];
  return { quien: txt(d.quien, 24), paso: txt(d.paso, 40), escenario: esc, escenarioNombre: txt(d.escenarioNombre), juego: d.juego, juegoNombre: txt(d.juegoNombre),
    modo: txt(d.modo, 30), grupos, herramienta: txt(d.herramienta, 40), nivel: txt(d.nivel, 60) };
}

/** Anfitrión: transmite `estado` mientras está en el configurador. */
export function useTransmitirConfig(salaId: string | undefined, estado: EstadoConfig | null) {
  const canal = useRef<ReturnType<typeof abrirDifusion> | null>(null);
  const ultimo = useRef<EstadoConfig | null>(null);
  ultimo.current = estado;
  useEffect(() => {
    if (!salaId) return;
    const c = abrirDifusion(`config-${salaId}`);
    canal.current = c;
    const t = setInterval(() => { if (ultimo.current) c.enviar("cfg", ultimo.current as unknown as Record<string, unknown>); }, REPITE_MS);
    return () => { clearInterval(t); c.enviar("fin"); setTimeout(() => c.cerrar(), 1500); canal.current = null; };
  }, [salaId]);
  const clave = JSON.stringify(estado);
  useEffect(() => { if (estado) canal.current?.enviar("cfg", estado as unknown as Record<string, unknown>); }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Los demás: lo último que transmitió el anfitrión (null si no está configurando). */
export function useConfigEnVivo(salaId: string | undefined, activo = true): EstadoConfig | null {
  const [e, setE] = useState<EstadoConfig | null>(null);
  useEffect(() => {
    setE(null);
    if (!salaId || !activo) return;
    let visto = 0;
    const c = abrirDifusion(`config-${salaId}`, (ev, d) => {
      if (ev === "fin") { setE(null); return; }
      if (ev !== "cfg") return;
      const x = leerEstadoConfig(d);
      if (x) { visto = Date.now(); setE(x); }
    });
    const t = setInterval(() => { if (visto && Date.now() - visto > OLVIDO_MS) { visto = 0; setE(null); } }, 1000);
    return () => { clearInterval(t); c.cerrar(); };
  }, [salaId, activo]);
  return e;
}

/** Tarjeta que ven los demás: paso actual y lo elegido. `grande` para la TV. */
export function ConfigEnVivo({ e, grande }: { e: EstadoConfig; grande?: boolean }) {
  const arteJ = ARTE_JUEGOS[e.juego], arteE = e.escenario ? ARTE_ESCENARIOS[e.escenario] : ARTE_ESCENARIOS.ciudad;
  return (
    <section className={"cv" + (grande ? " grande" : "")} aria-live="polite" aria-label="El anfitrión está armando la partida">
      <header className="cv-cab"><span className="cv-punto" aria-hidden="true" /><b>{e.quien || "El anfitrión"} está armando la partida</b><span className="cv-paso" key={e.paso}>{e.paso}</span></header>
      <div className="cv-fila">
        <figure className="cv-item"><span className="cv-img">{arteE ? <img src={srcArte(arteE)} alt="" /> : null}</span><figcaption><small>Dónde</small>{e.escenarioNombre}</figcaption></figure>
        <figure className="cv-item"><span className="cv-img">{arteJ ? <img src={srcArte(arteJ)} alt="" /> : <span className="cv-emoji">{EMOJI_JUEGO[e.juego] ?? "🎲"}</span>}</span><figcaption><small>Juego</small>{e.juegoNombre}</figcaption></figure>
      </div>
      <dl className="cv-datos">
        {e.modo && <div><dt>Modo</dt><dd>{e.modo}</dd></div>}
        {e.herramienta && <div><dt>Herramienta</dt><dd>{e.herramienta}</dd></div>}
        {e.nivel && <div><dt>Nivel</dt><dd>{e.nivel}</dd></div>}
      </dl>
      {e.grupos.length > 0 && <ul className="cv-grupos">{e.grupos.map((g, i) => (
        <li key={i} style={{ "--i": i } as CSSProperties}><b>{g.nombre}</b><span>{g.jugadores.join(" · ") || "—"}</span></li>
      ))}</ul>}
    </section>
  );
}
