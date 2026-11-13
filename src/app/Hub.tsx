// Pantalla principal tipo «hub» de juego de fiesta: tu personaje vivo al centro, menú a la izquierda,
// nivel y ajustes arriba, ¡JUGAR! abajo a la derecha. Y la pantalla de modos con tarjetas deslizables.
import { useEffect, useRef, useState } from "react";
import { ESCENARIOS } from "../content/catalogo";
import { equipoDe, porraEquipo } from "../content/equipos";
import { TIENDA } from "../content/personaje";
import { crearAzar } from "../engine/azar";
import { nivelPorXp, xpParaNivel } from "../engine/economia";
import { sorprendeme } from "../engine/filtros";
import { Avatar, Retrato, tipoCartaPorNivel } from "./Avatar";
import { aviso, configuracion, Icono } from "./comun";
import { useAura } from "./efectos";
import { saldosDe, useEstado } from "./estado";
import { hayNube } from "./nube";
import { sonar } from "./sonido";

type Emote = "saludar" | "bailar" | "festejar" | null;
const FRASES = ["¿Listos para la fiesta?", "¡Hoy se arma!", "Pasar no tiene castigo… ¿o sí?", "¿Quién se lleva la corona?", "¡Vamos a jugar!"];

/** Tamaño del personaje según la pantalla. */
function useTamano() {
  const calc = () => Math.round(Math.min(330, Math.max(170, Math.min(innerWidth * 0.5, innerHeight * 0.32))));
  const [t, setT] = useState(calc);
  useEffect(() => { const f = () => setT(calc()); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
  return t;
}

export function Hub({ abrirNovedades }: { abrirNovedades: () => void }) {
  const s = useEstado();
  const yo = s.jugadores[0]!;
  const sal = saldosDe(yo);
  const nivel = nivelPorXp(sal.acumulada);
  const avance = ((sal.acumulada - xpParaNivel(nivel)) / (xpParaNivel(nivel + 1) - xpParaNivel(nivel))) * 100;
  const esc = ESCENARIOS.find(e => e.id === configuracion(s).escenario)!;
  useAura(esc.color);
  const eq = equipoDe(yo.personaje.equipo?.id ?? yo.equipo);
  const tam = useTamano();

  // El personaje está vivo: cada tanto hace algo solo; al tocarlo, responde.
  const [emote, setEmote] = useState<{ k: Emote; clave: number }>({ k: null, clave: 0 });
  const [frase, setFrase] = useState<string | null>(null);
  const hacer = (k: Emote, hablar = false) => {
    setEmote({ k, clave: Date.now() });
    if (hablar) setFrase(Math.random() < 0.5 ? porraEquipo(eq?.id) ?? FRASES[0]! : FRASES[Math.floor(Math.random() * FRASES.length)]!);
  };
  useEffect(() => {
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => hacer((["saludar", "bailar", "festejar"] as const)[Math.floor(Math.random() * 3)]!), 7000);
    const primera = window.setTimeout(() => hacer("saludar", true), 900);
    return () => { window.clearInterval(t); window.clearTimeout(primera); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (!frase) return; const t = setTimeout(() => setFrase(null), 3200); return () => clearTimeout(t); }, [frase]);
  const tocar = () => { sonar("clic"); const sig = emote.k === "saludar" ? "bailar" : emote.k === "bailar" ? "festejar" : "saludar"; hacer(sig, true); };

  // Sorpréndeme: la ruleta gira y abre el lobby con un juego al azar.
  const [girando, setGirando] = useState(false);
  const sorpresa = () => {
    if (girando) return;
    const r = sorprendeme(configuracion(s), crearAzar(Date.now() % 1e6));
    if (!r) { aviso("No hay juegos para esta configuración."); return; }
    setGirando(true); sonar("revelar");
    window.setTimeout(() => { setGirando(false); sonar("exito"); location.hash = `/lobby/j-${r.juego.id}`; }, 1300);
  };

  const nuevos = (() => { try { const v = localStorage.getItem("alv.vistos.tienda"); return v === null ? 0 : TIENDA.filter(a => !v.split(",").includes(a.id)).length; } catch { return 0; } })();
  const desbloqueados = TIENDA.filter(a => a.nivel <= nivel && !yo.tiene.includes(a.id)).length;

  return (
    <div className={"hub fondo-" + esc.id} style={{ ["--sc" as string]: esc.color }}>
      <div className="hub-paisaje paisaje" aria-hidden="true" />

      <header className="hub-arriba">
        <a className="hub-nivel" href="#/perfil" aria-label={`Tu perfil, nivel ${nivel}`}>
          <span className={"hub-insignia t-" + tipoCartaPorNivel(nivel)}><b>{nivel}</b></span>
          <span className="pila" style={{ gap: 3, minWidth: 0 }}>
            <b className="hub-nombre">{yo.nombre}{eq ? ` · ${eq.icono}` : ""}</b>
            <span className="barra"><span style={{ width: `${avance}%` }} /></span>
            <small>{sal.acumulada - xpParaNivel(nivel)} / {xpParaNivel(nivel + 1) - xpParaNivel(nivel)} XP</small>
          </span>
        </a>
        <span className="hub-derecha">
          <span className="hub-moneda" title="XP disponible para la tienda"><i aria-hidden="true">✦</i>{sal.disponible}</span>
          <a className="hub-icono" href="#/ajustes" aria-label="Ajustes">{Icono.ajustes}</a>
        </span>
      </header>

      <nav className="hub-menu" aria-label="Menú">
        <a href="#/tienda" className="hub-ficha">{Icono.tienda}<span>Tienda</span>{(nuevos > 0 || desbloqueados > 0) && <i className="punto" aria-label="Novedades">!</i>}</a>
        <a href="#/perfil" className="hub-ficha">{Icono.perfil}<span>Personaje</span></a>
        <a href="#/ranking" className="hub-ficha">{Icono.ranking}<span>Ranking</span></a>
        <button className="hub-ficha" onClick={abrirNovedades}>{Icono.historial}<span>Novedades</span></button>
        <a href="#/lobby" className="hub-ficha">{Icono.lobby}<span>Lobby</span></a>
      </nav>

      <div className="hub-escena">
        {frase && <span className="hub-globo" key={frase} role="status">{frase}</span>}
        <button className="hub-personaje" onClick={tocar} aria-label="Toca a tu personaje">
          <span key={emote.clave} className={"emote" + (emote.k ? " e-" + emote.k : "")}>
            <span className="hub-respira"><Avatar p={yo.personaje} size={tam} nombre={yo.nombre} /></span>
          </span>
        </button>
        <span className="hub-pedestal" aria-hidden="true" style={eq ? { ["--eq1" as string]: eq.c1, ["--eq2" as string]: eq.c2 } : undefined} />
      </div>

      <aside className="hub-lado">
        <button className="hub-tarjeta sorpresa" onClick={sorpresa} aria-label="Sorpréndeme: un juego al azar">
          <span className={"mini-ruleta" + (girando ? " gira" : "")} aria-hidden="true" />
          <span className="pila" style={{ gap: 2 }}><b>¡Sorpréndeme!</b><small>Un juego al azar</small></span>
        </button>
        <span className="hub-tarjeta grupo">
          <span className="hub-caras">{s.jugadores.slice(0, 4).map(j => <Retrato key={j.id} j={j} size={30} />)}</span>
          <small>{s.sala ? `Sala ${s.sala.codigo} · ${s.miembros?.length ?? 1} conectados` : `${s.jugadores.length} jugadores en este celular`}</small>
        </span>
        <a className="hub-jugar" href="#/jugar" onClick={() => sonar("revelar")}>¡JUGAR!</a>
      </aside>
    </div>
  );
}

interface Modo { id: "local" | "linea" | "fisico"; nombre: string; color: string; tags: string[]; texto: string; ir: string }

/** Pantalla de modos: pestañas arriba y tarjetas grandes deslizables con una escena de cada modo. */
export function PantallaModos() {
  const s = useEstado();
  const modos: Modo[] = [
    { id: "local", nombre: "Juego local", color: "#FF2E88", tags: [`${s.jugadores.length} jugadores`, "1 celular", "Pásalo"], texto: "Todos en un solo celular: lo van pasando en cada turno. Ideal para empezar rápido.", ir: "#/lobby" },
    { id: "linea", nombre: "En línea", color: "#22E1FF", tags: ["Hasta 8", "Cada quien su celular", "QR o código"], texto: hayNube ? "Abre una sala o entra con código. Todos se ven en el lobby, se saludan y dan «listo»." : "Necesita conexión con el servidor.", ir: s.sala ? "#/lobby" : "#/unirse" },
    { id: "fisico", nombre: "Juego físico", color: "#C6FF3D", tags: ["Retos en vivo", "XP a mano", "Sin pantalla"], texto: "Carreras, fuerzas, baile: compiten fuera de la pantalla y tú repartes la XP.", ir: "#/fisico" },
  ];
  const [i, setI] = useState(0);
  const pista = useRef<HTMLDivElement>(null);
  const ir = (n: number) => {
    setI(n);
    const el = pista.current?.children[n] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  // Al deslizar con el dedo, la pestaña sigue a la tarjeta que quedó al centro.
  const alDeslizar = () => {
    const p = pista.current; if (!p) return;
    const centro = p.scrollLeft + p.clientWidth / 2;
    let mejor = 0, dist = Infinity;
    [...p.children].forEach((c, k) => { const el = c as HTMLElement; const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - centro); if (d < dist) { dist = d; mejor = k; } });
    if (mejor !== i) setI(mejor);
  };
  const m = modos[i]!;
  const elegir = (x: Modo) => { if (x.id === "linea" && !hayNube) { aviso("El juego en línea necesita conexión."); return; } sonar("revelar"); location.hash = x.ir.slice(1); };

  return (
    <div className="modos-pantalla" style={{ ["--sc" as string]: m.color }}>
      <header className="mp-arriba">
        <a className="btn sm" href="#/inicio">‹ Atrás</a>
        <div className="pestanas-menu mp-pestanas" role="tablist" aria-label="Modos">
          {modos.map((x, k) => <button key={x.id} role="tab" aria-selected={k === i} style={{ ["--sc" as string]: x.color }} onClick={() => ir(k)}>{x.nombre}</button>)}
        </div>
      </header>
      <div className="mp-titulo">
        <span className="label">Modo</span>
        <h1>{m.nombre}</h1>
        <div className="mp-tags">{m.tags.map(t => <span key={t} className="mp-tag">{t}</span>)}</div>
        <p>{m.texto}</p>
      </div>
      <div className="mp-pista" ref={pista} onScroll={alDeslizar}>
        {modos.map((x, k) => (
          <button key={x.id} className={"mp-carta m-" + x.id + (k === i ? " activa" : "")} style={{ ["--sc" as string]: x.color }}
            onClick={() => (k === i ? elegir(x) : ir(k))} aria-label={k === i ? `Jugar ${x.nombre}` : `Ver ${x.nombre}`}>
            <span className="mp-cinta">{x.nombre}</span>
            <EscenaModo modo={x.id} />
          </button>
        ))}
      </div>
      <div className="mp-abajo">
        <span className="mp-puntos" aria-hidden="true">{modos.map((x, k) => <i key={x.id} className={k === i ? "on" : ""} />)}</span>
        <button className="hub-jugar mp-elegir" onClick={() => elegir(m)}>¡Vamos! ›</button>
      </div>
    </div>
  );
}

/** Escena dibujada de cada modo, con los personajes del grupo. */
function EscenaModo({ modo }: { modo: Modo["id"] }) {
  const s = useEstado();
  const js = s.jugadores.slice(0, 4);
  if (modo === "local") {
    return (
      <span className="escena-modo">
        <span className="em-celular" aria-hidden="true"><i /></span>
        {js.map((j, k) => <span key={j.id} className="em-actor" style={{ ["--k" as string]: k, left: `${12 + k * 22}%` }}><Avatar p={j.personaje} size={62} nombre={j.nombre} /></span>)}
      </span>
    );
  }
  if (modo === "linea") {
    return (
      <span className="escena-modo">
        {js.map((j, k) => (
          <span key={j.id} className="em-tel" style={{ ["--k" as string]: k, left: `${8 + k * 23}%` }}>
            <span className="em-pantallita"><Retrato j={j} size={44} /></span>
          </span>
        ))}
        <span className="em-ondas" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="escena-modo">
      <span className="em-meta" aria-hidden="true">🏁</span>
      <span className="em-reloj" aria-hidden="true">⏱️</span>
      {js.map((j, k) => <span key={j.id} className="em-actor corre" style={{ ["--k" as string]: k, left: `${6 + k * 20}%` }}><Avatar p={j.personaje} size={58} nombre={j.nombre} /></span>)}
    </span>
  );
}

/** Encabezado de las pantallas del menú: volver a la principal, título grande y lo que vaya a la derecha. */
export function CabeceraJuego({ titulo, color, derecha }: { titulo: string; color?: string; derecha?: React.ReactNode }) {
  return (
    <header className="cabecera-juego" style={color ? { ["--sc" as string]: color } : undefined}>
      <a className="hub-icono volver" href="#/inicio" aria-label="Volver a la pantalla principal">‹</a>
      <h1>{titulo}</h1>
      <span className="cabecera-derecha">{derecha}</span>
    </header>
  );
}
