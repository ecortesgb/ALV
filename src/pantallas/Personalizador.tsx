// Personalizador (#/personalizar y #/editor): muro de espacios → la cámara se acerca a la carta, brilla y se abre el libro.
// El 3D es el motor de siempre (public/minifig/escena.html?modo=editor), invisible: aquí solo se le mandan mensajes.
// Cada cambio se guarda al momento en la cápsula de ese espacio (HUB, sala y TV la leen de ahí).
import { useEffect, useRef, useState } from "react";
import { FotoFigura, N_CAPSULAS, escribirCapsulas, leerCapsulas, semillaDe, useCapsulas } from "../app/figura3d";
import { useSesion } from "../app/sesion";
import { sonar } from "../app/sonido";
import type { FiguraV2 } from "../content/personaje";
import { enlace } from "../servicios/enlace";
import { Cabecera, Marco, aviso } from "./comun";
import { FondoHub } from "./Hub";
import { Libro, type ModoEditor } from "./Libro";
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

// ---------- Modo Básico / Completo (uno para todo el editor, por jugador) ----------
// Se recuerda en este dispositivo y además viaja dentro de cada figura guardada (extensiones.alv.editor), así que en
// otro celular se abre igual sin tocar la base (decisión 1 del plan). Cuenta nueva: Básico.
const claveModo = (uid: string) => "alv-modo-editor-" + (uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
const modoDe = (f: FiguraV2 | undefined): ModoEditor | null => {
  const m = ((f?.extensiones as { alv?: { editor?: unknown } } | undefined)?.alv)?.editor;
  return m === "completo" || m === "basico" ? m : null;
};
function conModo(f: FiguraV2, modo: ModoEditor): FiguraV2 {
  const ext = (f.extensiones ?? {}) as Record<string, unknown>;
  return { ...f, extensiones: { ...ext, alv: { ...((ext.alv as object | undefined) ?? {}), editor: modo } } };
}
function useModoEditor(uid: string, guardadas: (FiguraV2 | undefined)[]): [ModoEditor, (m: ModoEditor) => void] {
  const leer = (): ModoEditor => {
    try { const m = localStorage.getItem(claveModo(uid)); if (m === "completo" || m === "basico") return m; } catch { /* sin almacenamiento */ }
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
const sinMovimiento = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Personalizador() {
  const { uid } = useSesion();
  const caps = useCapsulas(uid);
  const [modo, setModo] = useModoEditor(uid, caps.slots.map(c => c?.figura));
  const [fase, setFase] = useState<Fase>({ cual: "muro" });
  const [abriendo, setAbriendo] = useState(false);
  const [figura, setFigura] = useState<FiguraV2>(NUEVA);
  const [vez, setVez] = useState(0);
  const [guardado, setGuardado] = useState<string | null>(null);
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
    setVez(v => v + 1);
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
  const cambiar = (f: FiguraV2) => { setFigura(f); if (fase.cual === "libro") guardar(fase.i, f); };

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
        <Libro vez={vez} etiqueta={`Espacio ${i + 1}${c || figura.nombre !== "Mi figura" ? " · " + String(figura.nombre ?? "Mi figura") : ""}`} figura={figura} semilla={semillaDe(uid || "muestra")}
          cambiar={cambiar} soltado={setFigura} guardado={guardado} modo={modo} setModo={setModo} abriendo={abriendo}
          alCerrar={() => { sonar("clic"); setFase({ cual: "muro" }); }}
          tapa={<><span className="p-carta-tira dsp">Espacio {i + 1}</span><span className="p-carta-arte">{c ? <FotoFigura figura={c.figura} size={120} nombre={c.nombre} /> : <Silueta />}</span></>} />
      </div>
    </Marco>
  );
}
