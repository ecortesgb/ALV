// Juego físico: lo que salió de la última herramienta del administrador (dados, ruleta, carta, orden, cronómetro,
// palabra o pregunta). Solo usa la vista pública: la ven la TV y todos los celulares.
// La palabra sale tapada en cada aparato: quien la va a describir o actuar la destapa en el suyo.
// El resultado ya lo decidió el motor: las animaciones (dados 3D, carta que se voltea, botella que gira) solo lo revelan.
// Las piezas 3D (Dado3D, Naipe3D, RuedaBotella) también las usa la herramienta de Verdad o reto.
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { colorDe, varsColor } from "../../app/colorJugador";
import { ArteCfg } from "../../pantallas/TarjetasConfig";
import { Burbuja, type PersonaBurbuja } from "../../pantallas/Identidad";
import type { SeleccionFisico, HerramientaFisico } from "../../engine/partida";
import type { Miembro } from "../../servicios/enlace";
import { nombreDe, type Publico } from "../general/texto";

export const VALOR = (v: number) => (v <= 10 ? String(v) : ["J", "Q", "K", "A"][v - 11]!);
export const PALO = ["♣", "♦", "♥", "♠"];
const NOMBRE_PALO = ["tréboles", "diamantes", "corazones", "picas"];

/** Nombre e icono (arte de Elías en `ui/configurar/`) de cada herramienta. */
export const HERR_FISICO: Record<HerramientaFisico, { nombre: string; icono: string }> = {
  dados: { nombre: "Dados", icono: "herr-dados" },
  ruleta: { nombre: "Ruleta", icono: "herr-ruleta" },
  carta: { nombre: "Carta", icono: "herr-poker" },
  orden: { nombre: "Orden", icono: "herr-orden" },
  cronometro: { nombre: "Cronómetro", icono: "herr-tiempo" },
  // Sin arte propio todavía: palabra usa el de cartas y pregunta el termómetro de Temperatura.
  palabra: { nombre: "Palabra", icono: "herr-cartas" },
  pregunta: { nombre: "Pregunta", icono: "termometro-2" },
};

export const selFisico = (v: Publico) => (v.seleccion ?? { deltas: {} }) as unknown as SeleccionFisico;

// ---------- Revelar una sola vez ----------
// Cada aparato anima un resultado una vez. Si el componente se vuelve a montar (cambio de pantalla, reconexión),
// el mismo resultado sale ya quieto. Se olvida a los 10 minutos para que una partida nueva con la misma ronda y el
// mismo número de uso vuelva a animar.
const VISTO = new Map<string, number>();
const OLVIDO_MS = 10 * 60 * 1000;
const yaVisto = (clave: string) => { const t = VISTO.get(clave); return t != null && Date.now() - t < OLVIDO_MS; };
const reducido = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * `[anima, listo]`: si este montaje anima (lo decide al montar y no cambia) y si ya terminó de revelar (`ms`).
 * Con movimiento reducido, o si ya se vio, sale listo de inmediato.
 */
export function useRevelar(clave: string, ms: number, quiere = true): [boolean, boolean] {
  // El inicializador no escribe nada (StrictMode lo llama dos veces); la marca va en el efecto.
  const [anima] = useState(() => quiere && !reducido() && !yaVisto(clave));
  const [listo, setListo] = useState(!anima);
  useEffect(() => {
    VISTO.set(clave, Date.now());
    if (!anima) return;
    const t = setTimeout(() => setListo(true), ms);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [anima, listo];
}

// ---------- Dado 3D ----------
/** Giro que deja cada cara mirando al frente. Caras opuestas suman 7: 1 frente, 6 atrás, 2 derecha, 5 izquierda, 3 arriba, 4 abajo. */
const POSE: Record<number, [number, number]> = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
/** Casillas (0 a 8, en una rejilla de 3×3) con punto para cada cara. */
const PUNTOS: Record<number, number[]> = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const LUGAR_CARA: Record<number, string> = { 1: "frente", 2: "der", 3: "arriba", 4: "abajo", 5: "izq", 6: "atras" };
export const DADO_MS = 1250;

/**
 * Cubo con seis caras de puntos. Cae exactamente en `valor`: la animación arranca varias vueltas antes de la pose
 * final y termina en ella. `semilla` varía las vueltas y el sentido entre dados y usos (sin azar: el mismo uso se ve
 * igual en cada aparato). `retraso` en ms.
 */
export function Dado3D({ valor, anima, semilla = 0, retraso = 0, className = "" }: { valor: number; anima?: boolean; semilla?: number; retraso?: number; className?: string }) {
  const [x, y] = POSE[valor] ?? POSE[1]!;
  const z = ((semilla * 37) % 21) - 10; // ladeo final, de -10° a 10°
  const s = semilla % 2 ? 1 : -1;
  const vx = 2 + (semilla % 2), vy = 1 + ((semilla >> 1) % 2);
  const estilo = {
    "--x": `${x}deg`, "--y": `${y}deg`, "--z": `${z}deg`,
    "--x0": `${x - 360 * vx * s}deg`, "--y0": `${y + 360 * vy * s}deg`, "--z0": `${z - 90 * s}deg`,
    "--dx": `${-46 * s}%`, "--retraso": `${retraso}ms`,
  } as CSSProperties;
  return (
    <span className={"fi-dado" + (anima ? " anima" : "") + (className ? " " + className : "")} style={estilo} role="img" aria-label={`Dado: ${valor}`}>
      <span className="fi-dado-sombra" aria-hidden="true" />
      <span className="fi-dado-vista" aria-hidden="true">
        <span className="fi-dado-salto">
          <span className="fi-cubo">
            {[1, 2, 3, 4, 5, 6].map(c => (
              <span key={c} className={"fi-cara " + LUGAR_CARA[c]}>
                {PUNTOS[c]!.map(i => <i key={i} className={c === 1 ? "uno" : undefined} style={{ gridArea: `${Math.floor(i / 3) + 1} / ${(i % 3) + 1}` }} />)}
              </span>
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}

/** Los dos dados del juego físico: ruedan, caen en el resultado del motor y luego se ve la suma grande. */
function DadosRuedan({ dados, n, clave }: { dados: [number, number]; n: number; clave: string }) {
  const [anima, listo] = useRevelar(clave, DADO_MS + 150);
  return (
    <div className={"fi-dados" + (listo ? " listo" : "")} aria-live="polite" aria-label={listo ? `Dados: ${dados[0]} y ${dados[1]}, suman ${dados[0] + dados[1]}` : "Rodando los dados"}>
      <div className="fi-dados-par">
        <Dado3D valor={dados[0]} anima={anima} semilla={n * 3} />
        <Dado3D valor={dados[1]} anima={anima} semilla={n * 3 + 1} retraso={90} />
      </div>
      <b className="fi-suma" aria-hidden={!listo}><small>Suman</small>{dados[0] + dados[1]}</b>
    </div>
  );
}

// ---------- Carta de baraja ----------
export const CARTA_MS = 800;
/** Qué tanto se celebra la carta: el As y las figuras más; el 5 de corazones un poco. */
const momentoDe = (c: { v: number; p: number }) => (c.v >= 11 ? 2 : c.v === 5 && c.p === 2 ? 1 : 0);

/** Dorso con el diseño ALV (marco de oro, rombos y el sello al centro). */
function DorsoALV() {
  return <span className="fi-dorso"><span className="fi-dorso-sello">ALV</span></span>;
}

/**
 * Naipe que se voltea en 3D (dorso → cara). `mini` para las cartas chicas de Verdad o reto (sin índices en las
 * esquinas). `mazo` dibuja el mazo del que sale. `retraso` en ms.
 */
export function Naipe3D({ carta, anima, mini, mazo, retraso = 0, className = "" }: { carta: { v: number; p: number }; anima?: boolean; mini?: boolean; mazo?: boolean; retraso?: number; className?: string }) {
  const val = VALOR(carta.v), palo = PALO[carta.p]!, rojo = carta.p === 1 || carta.p === 2;
  const m = momentoDe(carta);
  const tipo = carta.v === 14 ? " as" : carta.v >= 11 ? " figura" : "";
  const clase = "fi-naipe3d" + (rojo ? " rojo" : "") + tipo + (m ? ` m${m}` : "") + (mini ? " mini" : "") + (anima ? " anima" : "") + (className ? " " + className : "");
  const nombre = { J: "Jota", Q: "Reina", K: "Rey", A: "As" }[val] ?? val;
  return (
    <span className={clase} style={{ "--retraso": `${retraso}ms` } as CSSProperties} role="img" aria-label={`${nombre} de ${NOMBRE_PALO[carta.p]}`}>
      {mazo && <span className="fi-mazo" aria-hidden="true"><DorsoALV /><DorsoALV /><DorsoALV /></span>}
      <span className="fi-naipe-vuelo" aria-hidden="true">
        <span className="fi-naipe-giro">
          <span className="fi-naipe-frente">
            {!mini && <span className="fi-ind arr"><b>{val}</b><span>{palo}</span></span>}
            {mini ? <span className="fi-centro"><b>{val}</b><span>{palo}</span></span>
              : carta.v === 14 ? <span className="fi-centro"><span className="fi-as-aro" /><span className="fi-as-palo">{palo}</span></span>
              : carta.v >= 11 ? <span className="fi-centro"><span className="fi-fig-marco"><b>{val}</b><span>{palo}</span></span></span>
              : <span className="fi-centro"><span className="fi-palo-grande">{palo}</span></span>}
            {!mini && <span className="fi-ind abj"><b>{val}</b><span>{palo}</span></span>}
            {m > 0 && <span className="fi-brillo" />}
          </span>
          <span className="fi-naipe-dorso"><DorsoALV /></span>
        </span>
      </span>
      {m > 0 && !mini && <span className="fi-aura" aria-hidden="true" />}
    </span>
  );
}

// ---------- Botella ----------
export const BOTELLA_MS = 1750;

/** Botella de vidrio verde con volumen (degradados), etiqueta ALV y cuello que apunta. Dibujada con el cuello arriba. */
function BotellaSvg() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg className="fi-botella-svg" viewBox="0 0 40 120" aria-hidden="true">
      <defs>
        <linearGradient id={`v${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#053a22" /><stop offset=".18" stopColor="#0f7a46" /><stop offset=".34" stopColor="#5fe0a0" />
          <stop offset=".46" stopColor="#1fa864" /><stop offset=".8" stopColor="#0b5c35" /><stop offset="1" stopColor="#032816" />
        </linearGradient>
        <linearGradient id={`e${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#b37a00" /><stop offset=".35" stopColor="#ffe680" /><stop offset=".6" stopColor="#ffc21a" /><stop offset="1" stopColor="#8a5a00" />
        </linearGradient>
      </defs>
      {/* Cuerpo, hombros y cuello en un solo trazo */}
      <path d="M15 4 h10 v4 c0 1 -1 1.5 -1 3 v20 c0 9 11 13 11 26 v52 c0 5 -3 8 -8 8 h-14 c-5 0 -8 -3 -8 -8 v-52 c0 -13 11 -17 11 -26 v-20 c0 -1.5 -1 -2 -1 -3 z" fill={`url(#v${id})`} stroke="#02160c" strokeWidth="1.4" />
      {/* Boca de la botella */}
      <rect x="14" y="2" width="12" height="5" rx="2" fill="#0d6b3e" stroke="#02160c" strokeWidth="1.2" />
      {/* Etiqueta */}
      <rect x="5.6" y="66" width="28.8" height="26" rx="2" fill={`url(#e${id})`} stroke="#5a3a00" strokeWidth=".8" />
      <text x="20" y="83.5" textAnchor="middle" className="fi-botella-alv">ALV</text>
      {/* Reflejos del vidrio */}
      <path d="M10.5 60 c0 -6 3 -10 6 -14" stroke="#fff" strokeOpacity=".55" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <rect x="9" y="95" width="3" height="16" rx="1.5" fill="#fff" opacity=".4" />
      <rect x="17.4" y="10" width="1.8" height="18" rx=".9" fill="#fff" opacity=".45" />
    </svg>
  );
}

/**
 * Los jugadores en círculo y la botella al centro: gira varias vueltas, frena y apunta a `elegido` (que ya eligió el
 * motor). Al final el elegido se resalta. `etiquetas` pone un rótulo bajo algunas burbujas ya revelado.
 */
export function RuedaBotella({ gente, elegido, clave, quiere = true, semilla = 0, etiquetas, grande, className = "" }: {
  gente: PersonaBurbuja[]; elegido: string; clave: string; quiere?: boolean; semilla?: number; etiquetas?: Record<string, string>; grande?: boolean; className?: string;
}) {
  const [anima, listo] = useRevelar(clave, BOTELLA_MS, quiere);
  const n = Math.max(1, gente.length);
  const i = Math.max(0, gente.findIndex(p => p.id === elegido));
  const fin = (i / n) * 360 + 360 * 5; // cinco vueltas y cae en el elegido
  const inicio = (semilla * 83) % 360;
  const b = n <= 3 ? 25 : n <= 5 ? 22 : n <= 6 ? 20 : 17.5; // burbuja en % de la rueda
  const r = 50 - b / 2 - 1;
  return (
    <div className={"fi-rueda" + (anima ? " anima" : "") + (listo ? " listo" : "") + (grande ? " grande" : "") + (className ? " " + className : "")}
      style={{ "--bb": `${b}%`, "--fin": `${fin}deg`, "--inicio": `${inicio}deg` } as CSSProperties}>
      <span className="fi-rueda-piso" aria-hidden="true" />
      {gente.map((p, k) => {
        const a = (k / n) * 2 * Math.PI;
        const el = p.id === elegido;
        return (
          <span key={p.id} className={"fi-silla" + (el ? " elegido" : "") + (etiquetas?.[p.id] ? " marcada" : "")} style={{ left: `${50 + r * Math.sin(a)}%`, top: `${50 - r * Math.cos(a)}%` }}>
            <Burbuja p={p} tamano="100%" seleccionada={listo && el} />
            {listo && etiquetas?.[p.id] && <em className="fi-silla-tag dsp">{etiquetas[p.id]}</em>}
          </span>
        );
      })}
      <span className="fi-botella" aria-hidden="true"><span className="fi-botella-sombra" /><BotellaSvg /></span>
    </div>
  );
}

// ---------- Cronómetro ----------
// Hora de fin de cada uso: si el componente se vuelve a montar, la cuenta sigue donde iba en lugar de empezar otra vez.
const FIN = new Map<string, number>();
const C = 2 * Math.PI * 52;

/** Cuenta regresiva con anillo. Arranca cuando este aparato lo ve; los últimos 5 segundos laten en rojo. */
function Cronometro({ segundos, clave }: { segundos: number; clave: string }) {
  const [fin] = useState(() => { const f = FIN.get(clave); return f != null && f - Date.now() < segundos * 1000 + 1000 ? f : Date.now() + segundos * 1000; });
  const quedanDe = () => Math.max(0, Math.ceil((fin - Date.now()) / 1000));
  const [quedan, setQuedan] = useState(quedanDe);
  const anillo = useRef<SVGCircleElement>(null);
  useEffect(() => {
    FIN.set(clave, fin);
    // El anillo se mueve suave cada cuadro sin volver a dibujar React; el número solo cambia cada segundo.
    let raf = 0;
    const paso = () => {
      const ms = Math.max(0, fin - Date.now());
      anillo.current?.setAttribute("stroke-dashoffset", String(C * (1 - ms / (segundos * 1000))));
      setQuedan(Math.ceil(ms / 1000));
      if (ms > 0) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [fin, segundos]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = Math.floor(quedan / 60), s = quedan % 60;
  const ms0 = Math.max(0, fin - Date.now());
  return (
    <div className={"fi-crono" + (quedan === 0 ? " fin" : quedan <= 5 ? " ya" : "")} role="timer" aria-live="off" aria-label={quedan === 0 ? "Se acabó el tiempo" : `Quedan ${quedan} segundos`}>
      {/* En los últimos 5 s el halo se vuelve a montar cada segundo: un latido por segundo, sin bucle infinito. */}
      <span key={quedan <= 5 ? `h${quedan}` : "h"} className="fi-crono-halo" aria-hidden="true" />
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="52" className="fi-crono-pista" />
        <circle ref={anillo} cx="60" cy="60" r="52" className="fi-crono-avance" strokeDasharray={C} strokeDashoffset={C * (1 - ms0 / (segundos * 1000))} />
      </svg>
      <b key={quedan <= 5 ? quedan : "n"} className={quedan <= 5 && quedan > 0 ? "late" : undefined}>{quedan === 0 ? "¡Tiempo!" : m ? `${m}:${String(s).padStart(2, "0")}` : s}</b>
      {quedan > 0 && <small>{m ? "minutos" : quedan === 1 ? "segundo" : "segundos"}</small>}
    </div>
  );
}

/** Palabra tapada: se destapa solo en este aparato. Cada palabra nueva vuelve a salir tapada. */
function PalabraTapada({ texto, prohibidas, grande }: { texto: string; prohibidas?: string[]; grande?: boolean }) {
  const [ver, setVer] = useState(false);
  if (!ver) return (
    <button type="button" className="fi-tapada" onClick={() => setVer(true)}>
      <b>Palabra lista</b><small>{grande ? "Que no la vea quien adivina. Toca para verla." : "Toca para verla (que no la vea quien adivina)"}</small>
    </button>
  );
  return (
    <div className="fi-palabra">
      <b>{texto}</b>
      {prohibidas?.length ? <p>Sin decir: {prohibidas.join(", ")}</p> : null}
      <button type="button" className="fi-chip" onClick={() => setVer(false)}>Tapar</button>
    </div>
  );
}

/** Carta del juego físico: sale del mazo, se voltea y, si es As, figura o 5 de corazones, se celebra. */
function CartaSale({ carta, clave }: { carta: { v: number; p: number }; clave: string }) {
  const [anima] = useRevelar(clave, CARTA_MS);
  return <div className="fi-carta-sale"><Naipe3D carta={carta} anima={anima} mazo /></div>;
}

/** Orden de turnos: filas grandes, una por jugador, que entran en cascada. */
function OrdenLista({ ids, todos, v, miembros, clave }: { ids: string[]; todos: string[]; v: Publico; miembros: Miembro[]; clave: string }) {
  const [anima] = useRevelar(clave, 0);
  return (
    <ol className={"fi-orden" + (anima ? " anima" : "")}>{ids.map((id, i) => {
      const c = colorDe(id, todos);
      return (
        <li key={id} style={{ ...varsColor(c), "--i": i } as CSSProperties}>
          <i className="dsp">{i + 1}</i>
          <Burbuja p={{ id, nombre: nombreDe(v, id), figura: miembros.find(m => m.id === id)?.figura, color: c }} tamano="var(--ob)" />
          <span className="fi-orden-nom">{nombreDe(v, id)}</span>
          {i === 0 && <em className="fi-orden-tag">Empieza</em>}
        </li>
      );
    })}</ol>
  );
}

/** Resultado de la última herramienta. `grande` para la TV. */
export function ResultadoHerramienta({ v, miembros, grande }: { v: Publico; miembros: Miembro[]; grande?: boolean }) {
  const h = selFisico(v).herr;
  if (!h) return null;
  const ids = v.jugadores.map(j => j.id);
  const info = HERR_FISICO[h.tipo];
  // Un uso = juego, ronda, número de uso y herramienta: así un mismo resultado se anima una sola vez en este aparato.
  const clave = `fi|${v.juegoId}|${v.ronda}|${h.n}|${h.tipo}`;
  const persona = (id: string): PersonaBurbuja => ({ id, nombre: nombreDe(v, id), figura: miembros.find(m => m.id === id)?.figura, color: colorDe(id, ids) });
  let cuerpo: JSX.Element | null = null;
  if (h.tipo === "dados" && h.dados) {
    cuerpo = <DadosRuedan key={h.n} dados={h.dados} n={h.n} clave={clave} />;
  } else if (h.tipo === "ruleta" && h.jugador) {
    const c = colorDe(h.jugador, ids);
    cuerpo = (
      <div className="fi-ruleta" style={varsColor(c)}>
        <RuedaBotella key={h.n} gente={ids.map(persona)} elegido={h.jugador} clave={clave} semilla={h.n} grande={grande} />
        <RevelaNombre clave={clave} nombre={nombreDe(v, h.jugador)} />
      </div>
    );
  } else if (h.tipo === "carta" && h.carta) {
    cuerpo = <CartaSale key={h.n} carta={h.carta} clave={clave} />;
  } else if (h.tipo === "orden" && h.orden) {
    cuerpo = <OrdenLista key={h.n} ids={h.orden} todos={ids} v={v} miembros={miembros} clave={clave} />;
  } else if (h.tipo === "palabra" && h.texto) {
    cuerpo = <PalabraTapada key={h.n} texto={h.texto.texto} prohibidas={h.texto.prohibidas} grande={grande} />;
  } else if (h.tipo === "pregunta" && h.texto) {
    const c = h.jugador ? colorDe(h.jugador, ids) : undefined;
    const largo = h.texto.texto.length > 140 ? " larga" : "";
    cuerpo = (
      <div className={"fi-pregunta" + largo} style={c ? varsColor(c) : undefined}>
        {h.jugador && <span className="fi-para"><Burbuja p={persona(h.jugador)} tamano="1.9em" />Para {nombreDe(v, h.jugador)}</span>}
        <b>{h.texto.texto}</b>
      </div>
    );
  } else if (h.tipo === "cronometro" && h.segundos) {
    cuerpo = <Cronometro key={h.n} segundos={h.segundos} clave={clave} />;
  }
  return <Marco key={h.n} clave={clave} tipo={h.tipo} grande={grande} nombre={info.nombre} icono={info.icono}>{cuerpo}</Marco>;
}

/** Caja del resultado. Entra con un pequeño salto, salvo si este resultado ya se había visto en este aparato. */
function Marco({ clave, tipo, grande, nombre, icono, children }: { clave: string; tipo: HerramientaFisico; grande?: boolean; nombre: string; icono: string; children: ReactNode }) {
  const [visto] = useState(() => yaVisto(clave));
  return (
    <div className={"fi-res fi-res-" + tipo + (grande ? " grande" : "") + (visto ? " visto" : "")}>
      <span className="fi-res-t"><ArteCfg nombre={icono} className="fi-res-ico" />{nombre}</span>
      {children}
    </div>
  );
}

/** Nombre de quien eligió la botella: aparece cuando la botella se detiene. */
function RevelaNombre({ clave, nombre }: { clave: string; nombre: string }) {
  const [, listo] = useRevelar(clave + "|nombre", BOTELLA_MS);
  return <b className={"fi-ruleta-nom" + (listo ? " listo" : "")} aria-live="polite">{listo ? <>¡Le toca a <span>{nombre}</span>!</> : "Girando…"}</b>;
}
