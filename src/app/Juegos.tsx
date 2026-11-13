// Juegos: ilustración con tus personajes jugando, tarjetas por categoría, y la ventana de reglas
// (quién gana, cuántos puntos y cuánta XP) que se ve con «Reglas» y antes de empezar.
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { SECCIONES } from "../content/catalogo";
import { personajeInicial } from "../content/personaje";
import { REGLAS, REGLAS_XP } from "../content/reglas";
import { xpDePartida } from "../engine/economia";
import type { DefinicionJuego, SeccionId } from "../engine/types";
import { Avatar } from "./Avatar";
import { COLOR_SECCION } from "./comun";
import { useEstado } from "./estado";
import { HERRAMIENTAS } from "./Hud";

/** Cuántos personajes salen en la ilustración según la mecánica. */
const CUANTOS: Partial<Record<NonNullable<DefinicionJuego["motor"]>, number>> = { votacion: 3, senalar: 3, "rol-secreto": 3, confesion: 3, conteo: 1 };

/** Escena del juego con los personajes del grupo, frente a frente, y la herramienta al centro. */
export function IlustracionJuego({ juego, grande = false }: { juego: DefinicionJuego; grande?: boolean }) {
  const s = useEstado();
  const n = juego.motor ? CUANTOS[juego.motor] ?? 2 : 2;
  const js = [...s.jugadores.filter(j => !j.remoto), ...s.jugadores].slice(0, n);
  while (js.length < n) js.push({ id: `x${js.length}`, nombre: "", personaje: personajeInicial(js.length + 2), movimientos: [], tiene: [] });
  const h = juego.motor ? HERRAMIENTAS[juego.motor] : null;
  const tam = grande ? 92 : 56;
  return (
    <span className={"ilustracion-juego" + (grande ? " grande" : "")} style={{ ["--sc" as string]: COLOR_SECCION[juego.seccion] }} aria-hidden="true">
      <span className="ij-luz" />
      <span className="ij-gente">
        {js.map((j, i) => (
          <span key={j.id + i} className={"ij-actor" + (n === 2 && i === 1 ? " espejo" : "")} style={{ ["--k" as string]: i }}>
            <Avatar p={j.personaje} size={tam} nombre={j.nombre} />
          </span>
        ))}
      </span>
      {h && <span className="ij-herramienta">{h.icono}</span>}
    </span>
  );
}

/** Tarjeta de un juego: ilustración, título, descripción corta, etiquetas y botón de reglas. */
export function CartaJuego({ juego, elegido, elegir, verReglas }: { juego: DefinicionJuego; elegido: boolean; elegir: () => void; verReglas: () => void }) {
  const h = juego.motor ? HERRAMIENTAS[juego.motor] : null;
  return (
    <div className={"carta-juego" + (elegido ? " elegida" : "")} style={{ ["--sc" as string]: COLOR_SECCION[juego.seccion] }}
      role="button" tabIndex={0} aria-pressed={elegido} onClick={e => { if (!(e.target as HTMLElement).closest(".cj-info")) elegir(); }}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(); } }}>
      <IlustracionJuego juego={juego} />
      {elegido && <span className="cj-elegido">✓ Elegido</span>}
      <span className="cj-cuerpo">
        <b className="cj-titulo">{juego.nombre}</b>
        <small className="cj-desc">{juego.descripcion}</small>
        <span className="cj-tags">
          <span>👥 {juego.minJugadores}–{juego.maxJugadores}</span>
          {h && <span>{h.icono} {h.nombre}</span>}
        </span>
      </span>
      <button className="cj-info" onClick={verReglas} aria-label={`Reglas de ${juego.nombre}`}>ⓘ Reglas</button>
    </div>
  );
}

/** Juegos agrupados por categoría, cada una en su carrusel. */
export function JuegosPorCategoria({ juegos, elegido, elegir, verReglas }:
  { juegos: DefinicionJuego[]; elegido: string | null; elegir: (j: DefinicionJuego) => void; verReglas: (j: DefinicionJuego) => void }) {
  const secciones = (Object.keys(SECCIONES) as SeccionId[]).filter(k => juegos.some(j => j.seccion === k));
  return (
    <div className="juegos-categorias">
      {secciones.map(k => (
        <section key={k} className="categoria-juegos" style={{ ["--sc" as string]: COLOR_SECCION[k] }} aria-label={SECCIONES[k].trata}>
          <header className="cat-cab"><span className="cat-sigla">{SECCIONES[k].sigla}</span><b>{SECCIONES[k].trata}</b></header>
          <div className="cat-carrusel">
            {juegos.filter(j => j.seccion === k).map(j => <CartaJuego key={j.id} juego={j} elegido={elegido === j.id} elegir={() => elegir(j)} verReglas={() => verReglas(j)} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Ventana de reglas: cómo se juega, cuántos puntos, quién gana y la XP por lugar con la configuración de hoy.
 * `iniciar` la convierte en la ventana previa a la partida (botón «¡Iniciar!»).
 */
export function VentanaReglas({ juego, cerrar, iniciar, elegir }: { juego: DefinicionJuego; cerrar: () => void; iniciar?: () => void; elegir?: () => void }) {
  const s = useEstado();
  const reglas = juego.motor ? REGLAS[juego.motor] : null;
  const n = s.jugadores.length, rondas = s.ajustes.rondas ?? 8;
  const xp = (lugar: number) => xpDePartida({ rondas, retosCumplidos: 0, lugar }, n);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape" && !iniciar) cerrar(); };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [cerrar, iniciar]);
  return createPortal(
    <div className="ventana-reglas" role="dialog" aria-modal="true" aria-labelledby="t-reglas" style={{ ["--sc" as string]: COLOR_SECCION[juego.seccion] }}
      onClick={e => { if (e.target === e.currentTarget && !iniciar) cerrar(); }}>
      <div className="vr-caja">
        <IlustracionJuego juego={juego} grande />
        <span className="label">{SECCIONES[juego.seccion].trata}{iniciar ? " · ¡Todo listo!" : ""}</span>
        <h2 id="t-reglas">{juego.nombre}</h2>
        {reglas && (
          <>
            <p className="vr-objetivo">{reglas.objetivo}</p>
            <div className="vr-bloque"><b>Puntos</b><ul>{reglas.puntos.map(p => <li key={p}>{p}</li>)}</ul></div>
            <div className="vr-bloque gana"><b>🏆 Quién gana</b><p>{reglas.gana}</p></div>
          </>
        )}
        <div className="vr-bloque"><b>Recompensas con {rondas} rondas</b>
          <div className="fj-medallas">
            {([["oro", "1.º", 1, "🥇"], ["plata", "2.º", 2, "🥈"], ["bronce", "3.º", 3, "🥉"]] as const).map(([c, t, l, e]) => (
              <span key={c} className={"fj-medalla " + c}><span className="cab">{t}</span><span className="hex" aria-hidden="true">{e}</span><b>+{xp(l)} XP</b></span>
            ))}
          </div>
          <ul className="vr-xp">{REGLAS_XP.map(r => <li key={r}>{r}</li>)}</ul>
        </div>
        <p className="hint">Pasar nunca tiene castigo. Si alguien no quiere, pasa y ya.</p>
        <div className="vr-botones">
          {iniciar
            ? <><button className="btn" onClick={cerrar}>Cambiar juego</button><button className="hub-jugar vr-iniciar" autoFocus onClick={iniciar}>¡Iniciar!</button></>
            : <><button className="btn" onClick={cerrar}>Cerrar</button>{elegir && <button className="btn principal" onClick={() => { elegir(); cerrar(); }}>Elegir este juego</button>}</>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
