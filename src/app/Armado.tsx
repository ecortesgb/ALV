// Armado de la partida al estilo de los menús de consola: 1 Escenario → 2 Modalidad → 3 Juego (y su herramienta).
// Al terminar se abre la pantalla de carga. Todo lo que se elige queda en los ajustes del grupo.
import { useEffect, useRef, useState } from "react";
import { ESCENARIOS, SECCIONES } from "../content/catalogo";
import { xpDePartida } from "../engine/economia";
import { juegosCompatibles } from "../engine/filtros";
import { HERRAMIENTAS } from "./Hud";
import type { DefinicionJuego, SeccionId } from "../engine/types";
import { Retrato } from "./Avatar";
import { aviso, COLOR_SECCION, configuracion } from "./comun";
import { useAura } from "./efectos";
import { acciones, generoDe, NOMBRE_EQUIPO_SEXOS, useEstado, type Modalidad } from "./estado";
import { Escenario } from "./Lobby";
import { generosSala, hayNube, type Genero } from "./nube";
import { sonar } from "./sonido";

const PASOS = ["Escenario", "Modalidad", "Juego"] as const;

const MODALIDADES: { k: Modalidad; icono: string; nombre: string; texto: string; min: number }[] = [
  { k: "individual", icono: "🧍", nombre: "Individual", texto: "Cada quien suma para sí.", min: 2 },
  { k: "parejas", icono: "💞", nombre: "Parejas", texto: "Eligen quién va con quién. Abre los juegos de pareja.", min: 2 },
  { k: "equipos", icono: "🛡️", nombre: "Equipos", texto: "De 2 a 4 equipos. Al final gana el equipo que más sume.", min: 4 },
  { k: "sexos", icono: "⚔️", nombre: "Guerra de sexos", texto: "Hombres contra mujeres, según el registro de cada quien.", min: 2 },
];

export const COLORES_EQUIPO: Record<string, string> = { A: "#FF2E88", B: "#22E1FF", C: "#C6FF3D", D: "#FFC23D" };

export function ArmadoPartida({ iniciar, cerrar, juegoInicial, seccionInicial }:
  { iniciar: (j: DefinicionJuego) => void; cerrar: () => void; juegoInicial?: string | null; seccionInicial?: SeccionId | "todas" }) {
  const s = useEstado();
  const cfg = configuracion(s);
  const esc = ESCENARIOS.find(e => e.id === cfg.escenario)!;
  useAura(esc.color);
  const [paso, setPaso] = useState(juegoInicial ? 2 : 0);
  const [juegoId, setJuegoId] = useState<string | null>(juegoInicial ?? null);
  const [seccion, setSeccion] = useState<SeccionId | "todas">(seccionInicial ?? "todas");
  const compatibles = juegosCompatibles(cfg).filter(j => j.motor);
  const juego = compatibles.find(j => j.id === juegoId) ?? null;

  const siguiente = () => { sonar("clic"); setPaso(p => Math.min(2, p + 1)); };
  const atras = () => { if (paso === 0) cerrar(); else setPaso(p => p - 1); };
  const empezar = () => {
    if (!juego) { aviso("Elige un juego."); return; }
    sonar("revelar");
    iniciar(juego);
  };

  return (
    <div className="armado">
      <header className="armado-cab">
        <button className="btn sm" onClick={atras}>{paso === 0 ? "✕ Cerrar" : "‹ Atrás"}</button>
        <ol className="armado-pasos" aria-label="Pasos">
          {PASOS.map((p, i) => (
            <li key={p} className={i === paso ? "actual" : i < paso ? "hecho" : ""} aria-current={i === paso ? "step" : undefined}>
              <button disabled={i > paso} onClick={() => setPaso(i)}><i>{i + 1}</i> {p}</button>
            </li>
          ))}
        </ol>
      </header>

      {paso === 0 && (
        <section className="pila" aria-labelledby="t-a-esc">
          <h1 id="t-a-esc" className="titulo">¿Dónde es la fiesta?</h1>
          <Escenario jugadores={s.jugadores} color={esc.color} fondo={esc.id} interactivo={false} fiesta />
          <div className="postales">
            {ESCENARIOS.filter(e => e.activo).map(e => (
              <button key={e.id} className={"postal fondo-" + e.id} aria-pressed={e.id === cfg.escenario} style={{ ["--sc" as string]: e.color }}
                onClick={() => { sonar("clic"); acciones.ajustes({ escenario: e.id }); }}>
                <span className="postal-emoji" aria-hidden="true">{e.emoji}</span>
                <b>{e.nombre}</b>
                <small>{e.ambientacion}</small>
              </button>
            ))}
          </div>
          <button className="btn principal" onClick={siguiente}>Siguiente · Modalidad</button>
        </section>
      )}

      {paso === 1 && <PasoModalidad seguir={siguiente} />}

      {paso === 2 && (
        <section className="pila" aria-labelledby="t-a-juego">
          <h1 id="t-a-juego" className="titulo">Elige el juego</h1>
          <div className="pestanas-menu" role="group" aria-label="Filtrar por sección">
            <button aria-pressed={seccion === "todas"} onClick={() => setSeccion("todas")}>Todos</button>
            {(Object.keys(SECCIONES) as SeccionId[]).filter(k => k !== "mix" && compatibles.some(j => j.seccion === k)).map(k => (
              <button key={k} style={{ ["--sc" as string]: COLOR_SECCION[k] }} aria-pressed={seccion === k} onClick={() => setSeccion(k)}>{SECCIONES[k].sigla}</button>
            ))}
          </div>
          <div className="modos carrusel-juegos">
            {compatibles.filter(j => seccion === "todas" || j.seccion === seccion).map(j => (
              <button key={j.id} className="juego modo" aria-pressed={juegoId === j.id} style={{ ["--sc" as string]: COLOR_SECCION[j.seccion] }}
                onClick={e => { setJuegoId(j.id); sonar("clic"); e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }}>
                <span className="modo-cinta">{juegoId === j.id ? "✓ Elegido" : SECCIONES[j.seccion].sigla}</span>
                <span className="icono">{j.sigla ?? SECCIONES[j.seccion].sigla}</span>
                <span className="texto"><b>{j.nombre}</b><span className="modo-meta">{SECCIONES[j.seccion].trata}</span><small>{j.descripcion}</small></span>
              </button>
            ))}
          </div>
          {juego && <FichaJuego juego={juego} />}
          {juego?.motor === "turnos-cartas" && (
            <div className="card">
              <span className="label">Herramienta · ¿cómo se elige el turno?</span>
              <div className="opciones">
                <button className="opcion" aria-pressed={(s.ajustes.turno ?? "orden") === "orden"} onClick={() => acciones.ajustes({ turno: "orden" })}>🃏 En orden</button>
                <button className="opcion" aria-pressed={s.ajustes.turno === "ruleta"} onClick={() => acciones.ajustes({ turno: "ruleta" })}>🎡 Ruleta</button>
              </div>
            </div>
          )}
          {juego && juego.motor !== "turnos-cartas" && <p className="hint">Este juego usa su propia herramienta.</p>}
          <button className="btn principal" disabled={!juego} onClick={empezar}>{juego ? `Iniciar · ${juego.nombre}` : "Elige un juego"}</button>
        </section>
      )}
    </div>
  );
}

function PasoModalidad({ seguir }: { seguir: () => void }) {
  const s = useEstado();
  const modalidad = s.modalidad ?? (s.enParejas ? "parejas" : "individual");
  const n = s.jugadores.length;

  // Guerra de sexos en línea: se pide al servidor el género de las cuentas de la sala.
  useEffect(() => {
    if (modalidad !== "sexos" || !hayNube || !s.sala) return;
    void generosSala(s.sala).then(g => { if (g) acciones.generosSala(g); });
  }, [modalidad, s.sala]);

  const listo = (() => {
    if (modalidad === "equipos") return s.jugadores.every(j => s.equipos?.[j.id]) && new Set(s.jugadores.map(j => s.equipos![j.id])).size >= 2;
    if (modalidad === "sexos") { const gs = s.jugadores.map((_, i) => generoDe(s, i)); return gs.every(Boolean) && new Set(gs).size >= 2; }
    return true;
  })();

  const repartir = (cuantos: number) => {
    const orden = [...s.jugadores].sort(() => Math.random() - 0.5);
    acciones.repartirEquipos(Object.fromEntries(orden.map((j, i) => [j.id, "ABCD"[i % cuantos]!])));
    sonar("exito");
  };

  return (
    <section className="pila" aria-labelledby="t-a-mod">
      <h1 id="t-a-mod" className="titulo">¿Cómo van a competir?</h1>
      <div className="modalidades">
        {MODALIDADES.map(m => (
          <button key={m.k} className="modalidad" aria-pressed={modalidad === m.k} disabled={n < m.min} onClick={() => { sonar("clic"); acciones.modalidad(m.k); }}>
            <span className="mj-icono" aria-hidden="true">{m.icono}</span>
            <b>{m.nombre}</b>
            <small>{n < m.min ? `Mínimo ${m.min} jugadores` : m.texto}</small>
          </button>
        ))}
      </div>

      {modalidad === "parejas" && (
        <div className="card">
          <span className="label">¿Quién va con quién?</span>
          {s.jugadores.map((j, i) => {
            const actual = s.parejas?.[j.id] ?? (i % 2 === 0 ? s.jugadores[i + 1]?.id : s.jugadores[i - 1]?.id);
            return (
              <div key={j.id} className="asignacion">
                <Retrato j={j} size={40} />
                <b>{j.nombre}</b>
                <select className="input" value={actual ?? ""} aria-label={`Pareja de ${j.nombre}`} onChange={e => acciones.pareja(j.id, e.target.value)}>
                  <option value="" disabled>Sin pareja</option>
                  {s.jugadores.filter(o => o.id !== j.id).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
            );
          })}
          {n % 2 === 1 && <p className="hint">Son impares: alguien se queda sin pareja en los juegos de parejas.</p>}
        </div>
      )}

      {modalidad === "equipos" && (
        <div className="card">
          <div className="entre"><span className="label">Arma los equipos</span>
            <span className="fila" style={{ gap: 6 }}>{[2, 3, 4].filter(k => k <= n / 2).map(k => <button key={k} className="btn sm" onClick={() => repartir(k)}>🎲 {k} al azar</button>)}</span>
          </div>
          {s.jugadores.map(j => (
            <div key={j.id} className="asignacion">
              <Retrato j={j} size={40} />
              <b>{j.nombre}</b>
              <span className="equipos-botones">
                {"ABCD".split("").slice(0, Math.max(2, Math.min(4, Math.floor(n / 2)))).map(t => (
                  <button key={t} className="eq" aria-pressed={s.equipos?.[j.id] === t} style={{ ["--eqc" as string]: COLORES_EQUIPO[t] }} onClick={() => acciones.equipoPartida(j.id, t)}>{t}</button>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}

      {modalidad === "sexos" && (
        <div className="card">
          <span className="label">Equipos por género</span>
          {s.jugadores.map((j, i) => {
            const g = generoDe(s, i);
            const deCuenta = (j.remoto && j.id.startsWith("c-")) || (i === 0 && !!s.registro);
            return (
              <div key={j.id} className="asignacion">
                <Retrato j={j} size={40} />
                <b>{j.nombre}</b>
                {deCuenta
                  ? <span className="chip cyan">{g ? NOMBRE_EQUIPO_SEXOS[g] : "Sin registro"}</span>
                  : <span className="equipos-botones">
                      {(["hombre", "mujer"] as Genero[]).map(x => <button key={x} className="eq ancho" aria-pressed={g === x} onClick={() => acciones.generoLocal(j.id, x)}>{NOMBRE_EQUIPO_SEXOS[x]}</button>)}
                    </span>}
              </div>
            );
          })}
          <p className="hint">Quien tiene cuenta usa el género de su registro. A quien juega en este celular sin cuenta, elígelo aquí.</p>
        </div>
      )}

      <button className="btn principal" disabled={!listo} onClick={seguir}>{listo ? "Siguiente · Juego" : modalidad === "equipos" ? "Pon a cada quien en un equipo (mínimo 2 equipos)" : "Falta el género de alguien"}</button>
    </section>
  );
}

/** Ficha del juego elegido: etiquetas, cómo se juega y la XP que da cada lugar con la configuración de hoy. */
function FichaJuego({ juego }: { juego: DefinicionJuego }) {
  const s = useEstado();
  const caja = useRef<HTMLElement>(null);
  useEffect(() => { caja.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [juego.id]);
  const n = s.jugadores.length, rondas = s.ajustes.rondas ?? 8;
  const xp = (lugar: number) => xpDePartida({ rondas, retosCumplidos: 0, lugar }, n);
  const h = juego.motor ? HERRAMIENTAS[juego.motor] : null;
  return (
    <section ref={caja} className="ficha-juego" key={juego.id} style={{ ["--sc" as string]: COLOR_SECCION[juego.seccion] }} aria-labelledby="t-ficha">
      <h2 id="t-ficha">{juego.nombre}</h2>
      <div className="fj-tags">
        <span className="fj-tag">👥 {juego.minJugadores}–{juego.maxJugadores}</span>
        <span className="fj-tag">{SECCIONES[juego.seccion].sigla}</span>
        {h && <span className="fj-tag">{h.icono} {h.nombre}</span>}
        <span className="fj-tag">🔁 {rondas} rondas</span>
        {juego.adulto && <span className="fj-tag">🔞 Adulto</span>}
      </div>
      <div className="pila" style={{ gap: 4 }}>
        <span className="label">Cómo se juega</span>
        <p className="hint" style={{ color: "var(--soft)" }}>{juego.descripcion}{n <= 3 && juego.modoCorto ? ` ${juego.modoCorto}` : ""}{h ? ` ${h.como}` : ""}</p>
      </div>
      <div className="pila" style={{ gap: 6 }}>
        <span className="label">Recompensas</span>
        <div className="fj-medallas">
          {([["oro", "1.º", 1, "🥇"], ["plata", "2.º", 2, "🥈"], ["bronce", "3.º", 3, "🥉"]] as const).map(([c, t, l, e]) => (
            <span key={c} className={"fj-medalla " + c}><span className="cab">{t} lugar</span><span className="hex" aria-hidden="true">{e}</span><b>+{xp(l)} XP</b></span>
          ))}
        </div>
        <small className="muted">Más XP por cada reto cumplido. Pasar no tiene castigo.</small>
      </div>
    </section>
  );
}
