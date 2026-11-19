// Personalizador (#/personalizar y #/editor): muro de espacios → la cámara se acerca a la carta, brilla y se abre el libro.
// El 3D es el motor de siempre (public/minifig/escena.html?modo=editor), invisible: aquí solo se le mandan mensajes.
// Cada cambio se guarda al momento en la cápsula de ese espacio (HUB, sala y TV la leen de ahí).
import { useEffect, useRef, useState } from "react";
import { FotoFigura, N_CAPSULAS, escribirCapsulas, leerCapsulas, semillaDe, useCapsulas } from "../app/figura3d";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import type { FiguraV2 } from "../content/personaje";
import { enlace } from "../servicios/enlace";
import { cargarPiezas } from "../servicios/piezas";
import { Cabecera, Marco, aviso } from "./comun";
import { FondoHub } from "./Hub";
import { Libro, type Cambiar, type ModoEditor } from "./Libro";
import { cambiosEntre, pideAviso, type Cambio } from "../app/cambiosFigura";
import { createPortal } from "react-dom";
import "./personalizador.css";

/** Figura de partida para un espacio vacío (misma forma que MinifigCore.nueva()). */
const NUEVA: FiguraV2 = {
  version: 2, nombre: "Mi figura",
  identidad: { piel: "#f2cd37", cabeza: null, rostro: "FACE_001", detalles: [], cabello: { id: "HAIR_001", color: "#582a12" }, estilo: "neutro" },
  ropa: { torso: { id: null, color: "#c91a09", estampado: null, colores: ["#ffffff", "#1b2a34", "#6b4a2b"], texto: "", imagen: null },
    mangas: null, brazos: null, guantes: null, cadera: { id: null, color: "#0055bf", cinturon: null }, piernas: { tipo: "normal", id: null, color: "#0055bf", botas: null } },
  traje: { id: null, encima: true, usar: { pelo: false, rostro: false }, quitar: [] }, manual: {},
  accesorios: { cabeza: null, cara: null, espalda: null, mano_der: null, mano_izq: null },
  momentos: { paquete: null, espera: "respirar", victoria: "salto-puno", derrota: "cabeza-baja", punto: "puno-arriba" }, extensiones: {},
};

// ---------- Modo Básico / Personaje original / Avanzado (uno para todo el editor, por jugador) ----------
// Se recuerda en este dispositivo y además viaja dentro de cada figura guardada (extensiones.alv.editor), así que en
// otro celular se abre igual sin tocar la base. Cuenta nueva: Básico. Las figuras con el modo viejo «completo» se
// leen como Avanzado.
const claveModo = (uid: string) => "alv-modo-editor-" + (uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
const MODOS_VALIDOS: ModoEditor[] = ["basico", "original", "avanzado"];
export const leerModo = (m: unknown): ModoEditor | null =>
  m === "completo" ? "avanzado" : MODOS_VALIDOS.includes(m as ModoEditor) ? (m as ModoEditor) : null;
const modoDe = (f: FiguraV2 | undefined): ModoEditor | null => leerModo(((f?.extensiones as { alv?: { editor?: unknown } } | undefined)?.alv)?.editor);
function conModo(f: FiguraV2, modo: ModoEditor): FiguraV2 {
  const ext = (f.extensiones ?? {}) as Record<string, unknown>;
  return { ...f, extensiones: { ...ext, alv: { ...((ext.alv as object | undefined) ?? {}), editor: modo } } };
}
function useModoEditor(uid: string, guardadas: (FiguraV2 | undefined)[]): [ModoEditor, (m: ModoEditor) => void] {
  const leer = (): ModoEditor => {
    try { const m = leerModo(localStorage.getItem(claveModo(uid))); if (m) return m; } catch { /* sin almacenamiento */ }
    return guardadas.map(modoDe).find(Boolean) ?? "basico";
  };
  const [modo, setModo] = useState<ModoEditor>(leer);
  useEffect(() => { setModo(leer()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [uid]);
  return [modo, m => { setModo(m); try { localStorage.setItem(claveModo(uid), m); } catch { /* sin almacenamiento */ } }];
}

/** Silueta de figura de bloques (dibujo propio) para las cartas vacías. */
const Silueta = () => (
  <svg className="p-silueta" viewBox="0 0 100 160" aria-hidden="true">
    <path d="M44 4h12v7H44zM34 11h32a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6V17a6 6 0 0 1 6-6zM42 43h16v4H42zM31 47h38l7 45H24zM29 50l-10 9-6 27 9 2 8-22zM71 50l10 9 6 27-9 2-8-22zM10 88a7 7 0 1 0 14 0 7 7 0 1 0-14 0zM76 88a7 7 0 1 0 14 0 7 7 0 1 0-14 0zM24 92h52v9H24zM25 101h23v52a3 3 0 0 1-3 3H28a3 3 0 0 1-3-3zM52 101h23v52a3 3 0 0 1-3 3H55a3 3 0 0 1-3-3z" />
  </svg>
);

type Fase = { cual: "muro" } | { cual: "acercando" | "libro"; i: number };
const ACERCAR_MS = 820, ABRIR_MS = 760;
const MAX_PASOS = 30;

/** Aviso antes de reemplazar o quitar: dice qué se va y qué llega. */
function Confirmar({ cambios, si, no }: { cambios: Cambio[]; si: (noPreguntar: boolean) => void; no: () => void }) {
  const [nunca, setNunca] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => { boton.current?.focus(); const k = (e: KeyboardEvent) => { if (e.key === "Escape") no(); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [no]);
  const quita = cambios.every(c => c.despues == null);
  return createPortal(
    <div className="p-confirmar-fondo" onClick={no}>
      <div className="p-confirmar" role="alertdialog" aria-modal="true" aria-labelledby="p-confirmar-t" onClick={e => e.stopPropagation()}>
        <h2 id="p-confirmar-t" className="p-sfx">{quita ? "¿Lo quito?" : "¿Lo cambio?"}</h2>
        <ul className="p-confirmar-lista">
          {cambios.map(c => (
            <li key={c.parte}><b>{c.parte}</b>
              <span>{c.antes ? <s>{c.antes}</s> : <i>nada</i>} → {c.despues ?? <i>nada</i>}</span></li>
          ))}
        </ul>
        <label className="p-confirmar-nunca"><input type="checkbox" checked={nunca} onChange={e => setNunca(e.target.checked)} /> No preguntar otra vez en esta visita</label>
        <div className="p-confirmar-botones">
          <button type="button" className="p-opcion" onClick={no}>No</button>
          <button ref={boton} type="button" className="p-opcion on" onClick={() => si(nunca)}>{quita ? "Quitar" : "Cambiar"}</button>
        </div>
        <p className="p-nota">Si no te gusta, «Regresar» lo deshace.</p>
      </div>
    </div>, document.body);
}
const sinMovimiento = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Personalizador() {
  const { uid } = useSesion();
  const caps = useCapsulas(uid);
  const [modo, setModo] = useModoEditor(uid, caps.slots.map(c => c?.figura));
  const [fase, setFase] = useState<Fase>({ cual: "muro" });
  const [abriendo, setAbriendo] = useState(false);
  const [figura, setFigura] = useState<FiguraV2>(NUEVA);
  const [vez, setVez] = useState(0);
  // Piezas raras y retos: se leen al abrir el personalizador y al cambiar de cuenta.
  useEffect(() => { void cargarPiezas(); }, [uid]);
  const [guardado, setGuardado] = useState<string | null>(null);
  // «Regresar»: pasos anteriores de la figura de este espacio (se vacía al abrir otro espacio).
  const [pasos, setPasos] = useState<FiguraV2[]>([]);
  const ultimoPaso = useRef(0);
  const [pendiente, setPendiente] = useState<{ f: FiguraV2; cambios: Cambio[] } | null>(null);
  const noPreguntar = useRef(false);
  const [origen, setOrigen] = useState("50% 50%");
  // Carrusel del celular: qué carta está al centro, y al entrar se centra la que está en juego.
  const muroRef = useRef<HTMLDivElement>(null);
  const [centro, setCentro] = useState(0);
  const alDeslizar = () => {
    const m = muroRef.current; if (!m) return;
    const mitad = m.scrollLeft + m.clientWidth / 2;
    const cartas = [...m.querySelectorAll<HTMLElement>(".p-ranura")];
    let mejor = 0, d = Infinity;
    cartas.forEach((c, k) => { const x = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mitad); if (x < d) { d = x; mejor = k; } });
    setCentro(mejor);
  };
  useEffect(() => {
    if (fase.cual !== "muro") return;
    const m = muroRef.current, c = m?.querySelectorAll<HTMLElement>(".p-ranura")[caps.activa ?? 0];
    if (m && c && m.scrollWidth > m.clientWidth) { m.scrollLeft = c.offsetLeft + c.offsetWidth / 2 - m.clientWidth / 2; alDeslizar(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase.cual]);
  useEffect(() => { if (!guardado) return; const t = setTimeout(() => setGuardado(null), 2200); return () => clearTimeout(t); }, [guardado]);

  const elegir = (i: number) => {
    if (fase.cual !== "muro") return;
    sonar("exito");
    const c = caps.slots[i];
    // El nombre de la cápsula manda: es el apodo de la figura.
    setFigura(c ? { ...c.figura, nombre: c.nombre || "Mi figura" } : NUEVA);
    setVez(v => v + 1); setPasos([]); setPendiente(null);
    if (sinMovimiento()) { setFase({ cual: "libro", i }); return; }
    // La cámara se acerca a la carta elegida, esté en fila (computadora) o una debajo de otra (celular).
    const muro = muroRef.current, carta = muro?.querySelectorAll<HTMLElement>(".p-carta")[i];
    if (muro && carta) {
      const m = muro.getBoundingClientRect(), c = carta.getBoundingClientRect();
      setOrigen(`${((c.left + c.width / 2 - m.left) / m.width) * 100}% ${((c.top + c.height / 2 - m.top) / m.height) * 100}%`);
    }
    setFase({ cual: "acercando", i });
  };
  useEffect(() => {
    if (fase.cual !== "acercando") return;
    const t = setTimeout(() => { setFase({ cual: "libro", i: fase.i }); setAbriendo(true); }, ACERCAR_MS);
    return () => clearTimeout(t);
  }, [fase]);
  useEffect(() => { if (!abriendo) return; const t = setTimeout(() => setAbriendo(false), ABRIR_MS); return () => clearTimeout(t); }, [abriendo]);

  /** Cada cambio se guarda en su espacio al momento; SincroCapsulas lo sube a la nube. */
  const guardar = (k: number, f: FiguraV2) => {
    const e = leerCapsulas(uid), slots = e.slots.slice();
    const nombre = String(f.nombre ?? "").trim() || "Mi figura";
    slots[k] = { nombre, figura: conModo(f, modo), actualizado: new Date().toISOString() };
    const primera = e.activa == null;
    escribirCapsulas(uid, { ...e, slots, activa: primera ? k : e.activa });
    if (primera) void enlace.activarCapsula(k + 1);
    setGuardado(`Guardado en el espacio ${k + 1}`);
  };
  const aplicar = (f: FiguraV2) => {
    // Cambios seguidos muy rápidos (escribir el apodo, probar colores) cuentan como un solo paso.
    const ahora = Date.now();
    if (ahora - ultimoPaso.current > 700) setPasos(p => [...p.slice(-(MAX_PASOS - 1)), figura]);
    ultimoPaso.current = ahora;
    setFigura(f); if (fase.cual === "libro") guardar(fase.i, f);
  };
  /** Todo cambio pasa por aquí: si reemplaza o quita algo, primero se pregunta. */
  const cambiar: Cambiar = (f, op) => {
    const cs = cambiosEntre(figura, f);
    if (!op?.sinAviso && !noPreguntar.current && pideAviso(cs)) { sonar("clic"); setPendiente({ f, cambios: cs }); return; }
    aplicar(f);
  };
  const regresar = () => {
    const antes = pasos[pasos.length - 1]; if (!antes) return;
    setPasos(p => p.slice(0, -1)); ultimoPaso.current = 0;
    setFigura(antes); if (fase.cual === "libro") guardar(fase.i, antes);
    setGuardado("Regresé un paso");
  };

  const usar = (i: number) => {
    const c = caps.slots[i];
    if (!c || caps.activa === i) return;
    sonar("exito");
    escribirCapsulas(uid, { ...leerCapsulas(uid), activa: i });
    void enlace.activarCapsula(i + 1);
    aviso(`En juego: ${c.nombre || "espacio " + (i + 1)}`);
  };

  const i = fase.cual === "muro" ? -1 : fase.i;
  const c = i >= 0 ? caps.slots[i] : null;
  return (
    <Marco clase={"p-taller p-fase-" + fase.cual} fondo={<FondoHub />}>
      {fase.cual !== "libro" && (
        <div className="p-muro-caja">
          <Cabecera titulo="Personalizar" icono="shirt" />
          <p className="p-muro-titulo dsp">Elige un espacio</p>
          <div className="p-muro" ref={muroRef} onScroll={alDeslizar} style={{ transformOrigin: origen }}>
            {Array.from({ length: N_CAPSULAS }, (_, k) => {
              const s = caps.slots[k], activa = caps.activa === k;
              return (
                <div key={k} className={"p-ranura" + (k === i ? " elegida" : i >= 0 ? " atenuada" : "")}>
                  <span className="p-carta-rayos" aria-hidden="true" />
                  <button type="button" className={"p-carta" + (s ? " llena" : "")} onClick={() => elegir(k)}
                    aria-label={s ? `Editar ${s.nombre || "espacio " + (k + 1)}${activa ? ", en juego" : ""}` : `Espacio ${k + 1} vacío: crear figura`}>
                    <span className="p-carta-tira dsp">Espacio {k + 1}</span>
                    <span className="p-carta-arte">{s ? <FotoFigura figura={s.figura} size={96} nombre={s.nombre} /> : <Silueta />}</span>
                    <span className="p-carta-nombre">{s ? s.nombre || "Mi figura" : "Crear"}</span>
                    {activa && <span className="p-carta-sello dsp">En juego</span>}
                  </button>
                  {s && !activa && <button type="button" className="p-usar" onClick={() => usar(k)}>Jugar con esta</button>}
                </div>
              );
            })}
          </div>
          <div className="p-puntos" aria-hidden="true">{Array.from({ length: N_CAPSULAS }, (_, k) => <i key={k} className={k === centro ? "on" : ""} />)}</div>
        </div>
      )}
      {/* El libro (y su motor 3D) se monta desde el principio, escondido, para que la figura ya esté lista al abrir. */}
      <div className="p-libro-caja" hidden={fase.cual !== "libro"}>
        <Libro vez={vez} capsula={Math.max(1, i + 1)} etiqueta={`Espacio ${i + 1}${c || figura.nombre !== "Mi figura" ? " · " + String(figura.nombre ?? "Mi figura") : ""}`} figura={figura} semilla={semillaDe(uid || "muestra")}
          cambiar={cambiar} soltado={setFigura} guardado={guardado} modo={modo} setModo={setModo} abriendo={abriendo}
          regresar={pasos.length ? regresar : null} pasos={pasos.length}
          alCerrar={() => { sonar("clic"); setFase({ cual: "muro" }); }}
          tapa={<><span className="p-carta-tira dsp">Espacio {i + 1}</span><span className="p-carta-arte">{c ? <FotoFigura figura={c.figura} size={120} nombre={c.nombre} /> : <Silueta />}</span></>} />
      </div>
      {pendiente && <Confirmar cambios={pendiente.cambios} no={() => { sonar("clic"); setPendiente(null); }}
        si={nunca => { noPreguntar.current = nunca; const f = pendiente.f; setPendiente(null); aplicar(f); }} />}
    </Marco>
  );
}
