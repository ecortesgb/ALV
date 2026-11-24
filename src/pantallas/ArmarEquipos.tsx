// Armar equipos, parejas o bandos (Elías, 24 nov; referencia: «Armado de equipos» con banca y placas de bloques).
// Cada jugador es una ficha (cabina de su color con su busto). Se arrastra a la placa de un equipo, o se toca la ficha y
// luego la placa. En parejas, soltar sobre alguien los intercambia. Cada equipo lleva un nombre editable.
// Solo cambia `grupos`, `cuantos` y `nombres`; la validez la revisa el configurador.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as EventoPuntero } from "react";
import { GRUPOS_EQUIPOS, GRUPOS_SEXOS } from "../engine/nucleo";
import type { ColorJugador } from "../app/colorJugador";
import type { FiguraV2 } from "../content/personaje";
import { FichaJugador } from "./lobby/Ficha";
import "./equipos.css";

export interface MiembroEq { id: string; nombre: string; figura?: FiguraV2 | null }
type Tipo = "equipos" | "parejas" | "sexos";

/** Colores de las placas: equipos A–D, bandos y parejas (en ciclo). */
const COLOR_GRUPO: Record<string, string> = { a: "#2f7cf0", b: "#ff8a1f", c: "#2fbf4f", d: "#9a4cf0", ellas: "#ff4fa8", ellos: "#2f7cf0" };
const COLOR_PAREJA = ["#ff4fa8", "#2f7cf0", "#ffcf2e", "#2fbf4f", "#ff8a1f", "#9a4cf0", "#1fc7c1", "#e8343a"];
/** Nombres sugeridos (🎲). PROPUESTA: se pueden cambiar aquí. */
export const NOMBRES_SUGERIDOS = ["Los Legendarios", "Las Leyendas", "Los Bloques", "Los Ninjas", "Las Estrellas", "Los Tiburones", "Los Cohetes",
  "Las Panteras", "Los Piratas", "Los Dragones", "Los Mapaches", "Las Águilas", "Los Tacos", "Los Rayos", "Los Volcanes", "Los Fantasmas"];

const mezclar = <T,>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a; };

/** Grupos a mostrar según el tipo. */
export function gruposDe(tipo: Tipo, n: number, cuantos: number): { id: string; nombre: string; color: string }[] {
  if (tipo === "sexos") return GRUPOS_SEXOS.map(g => ({ ...g, color: COLOR_GRUPO[g.id]! }));
  if (tipo === "parejas") return Array.from({ length: Math.floor(n / 2) }, (_, i) => ({ id: `p${i + 1}`, nombre: `Pareja ${i + 1}`, color: COLOR_PAREJA[i % COLOR_PAREJA.length]! }));
  return GRUPOS_EQUIPOS.slice(0, cuantos).map(g => ({ ...g, color: COLOR_GRUPO[g.id]! }));
}

/** Reparto al azar en `cuantos` grupos (equipos) o en parejas. */
export function repartoAzar(tipo: Tipo, ids: string[], cuantos: number): Record<string, string> {
  const xs = mezclar(ids);
  if (tipo === "parejas") return Object.fromEntries(xs.map((id, i) => [id, `p${Math.floor(i / 2) + 1}`]));
  if (tipo === "sexos") return Object.fromEntries(xs.map((id, i) => [id, i % 2 === 0 ? "ellas" : "ellos"]));
  return Object.fromEntries(xs.map((id, i) => [id, GRUPOS_EQUIPOS[i % cuantos]!.id]));
}

export function ArmarEquipos({ tipo, miembros, grupos, alGrupos, cuantos, alCuantos, nombres, alNombres, color }: {
  tipo: Tipo; miembros: MiembroEq[]; grupos: Record<string, string>; alGrupos: (g: Record<string, string>) => void;
  cuantos: number; alCuantos: (n: number) => void; nombres: Record<string, string>; alNombres: (n: Record<string, string>) => void;
  color: (id: string) => ColorJugador;
}) {
  const n = miembros.length;
  const lista = gruposDe(tipo, n, cuantos);
  const validos = new Set(lista.map(g => g.id));
  const banca = miembros.filter(m => !validos.has(grupos[m.id] ?? ""));
  const de = (g: string) => miembros.filter(m => grupos[m.id] === g);
  const [sel, setSel] = useState<string | null>(null);
  const [arr, setArr] = useState<{ id: string; x: number; y: number } | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const inicio = useRef<{ id: string; x: number; y: number } | null>(null);

  /** Mueve a `id` al grupo `g` ("" = banca). En parejas, si la placa está llena, intercambia con quien no es él. */
  const mover = (id: string, g: string, conQuien?: string) => {
    const actual = grupos[id] ?? "";
    if (actual === g && !conQuien) return;
    if (tipo === "parejas") {
      const otro = conQuien ?? de(g).find(m => m.id !== id)?.id;
      if (!otro || otro === id) return;
      alGrupos({ ...grupos, [id]: grupos[otro]!, [otro]: actual });
      return;
    }
    const nuevo = { ...grupos };
    if (g) nuevo[id] = g; else delete nuevo[id];
    alGrupos(nuevo);
  };
  /** Qué hay bajo el dedo: una ficha (para intercambiar) o una placa/banca. */
  const objetivo = (x: number, y: number): { g: string; ficha?: string } | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-grupo]");
    if (!el) return null;
    const f = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-ficha]");
    return { g: el.dataset.grupo ?? "", ficha: f?.dataset.ficha };
  };
  const soltar = (id: string, x: number, y: number) => {
    const o = objetivo(x, y);
    if (!o) return;
    if (tipo === "parejas" && o.ficha && o.ficha !== id) mover(id, o.g, o.ficha);
    else mover(id, o.g);
  };
  // Escape cancela la selección.
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); }; addEventListener("keydown", f); return () => removeEventListener("keydown", f); }, []);

  const abajo = (id: string) => (e: EventoPuntero<HTMLButtonElement>) => { inicio.current = { id, x: e.clientX, y: e.clientY }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sin captura, el arrastre sigue con los eventos del botón */ } };
  const mueve = (e: EventoPuntero<HTMLButtonElement>) => {
    const i = inicio.current; if (!i) return;
    if (!arr && Math.hypot(e.clientX - i.x, e.clientY - i.y) < 8) return;
    setArr({ id: i.id, x: e.clientX, y: e.clientY });
    setSobre(objetivo(e.clientX, e.clientY)?.g ?? null);
  };
  const arriba = (id: string) => (e: EventoPuntero<HTMLButtonElement>) => {
    const i = inicio.current; inicio.current = null;
    if (arr) { soltar(arr.id, e.clientX, e.clientY); setArr(null); setSobre(null); setSel(null); return; }
    if (!i) return;
    // Toque sin arrastre: la primera ficha queda elegida; tocar otra en parejas las intercambia, en equipos la mueve a ese equipo.
    if (sel && sel !== id) { tipo === "parejas" ? mover(sel, grupos[id] ?? "", id) : mover(sel, grupos[id] ?? ""); setSel(null); }
    else setSel(sel === id ? null : id);
  };
  const tocarPlaca = (g: string) => { if (sel) { mover(sel, g); setSel(null); } };

  // Función (no componente): así la ficha no se vuelve a montar a media arrastrada y no pierde el puntero.
  const ficha = (m: MiembroEq) => (
    <button key={m.id} type="button" data-ficha={m.id} className={"eq-ficha" + (sel === m.id ? " sel" : "") + (arr?.id === m.id ? " fantasma" : "")}
      onPointerDown={abajo(m.id)} onPointerMove={mueve} onPointerUp={arriba(m.id)} onPointerCancel={() => { inicio.current = null; setArr(null); setSobre(null); }}
      aria-pressed={sel === m.id} aria-label={`${m.nombre}${sel === m.id ? ", elegido: toca un equipo" : ""}`}>
      <FichaJugador id={m.id} figura={m.figura} nombre={m.nombre} color={color(m.id)} tamano={54} soloCara />
      <span className="eq-nom">{m.nombre}</span>
    </button>
  );
  const arrastrado = arr ? miembros.find(m => m.id === arr.id) : null;
  const nombreDe = (g: { id: string; nombre: string }) => nombres[g.id] ?? "";
  const sugerir = (gid: string) => {
    const usados = new Set(Object.values(nombres));
    const libres = NOMBRES_SUGERIDOS.filter(x => !usados.has(x));
    alNombres({ ...nombres, [gid]: (libres.length ? libres : NOMBRES_SUGERIDOS)[Math.floor(Math.random() * (libres.length || NOMBRES_SUGERIDOS.length))]! });
  };
  // De 2 a 4 equipos, mínimo una persona por equipo.
  const repartos = [2, 3, 4].filter(t => t <= n);

  return (
    <div className={"eq eq-" + tipo + (arr ? " arrastrando" : "")}>
      <div className="eq-barra">
        <span className="eq-ayuda">{sel ? `Ahora toca el equipo para ${miembros.find(m => m.id === sel)?.nombre ?? ""}` : tipo === "parejas" ? "Arrastra a alguien sobre otra persona para cambiarlos de pareja" : "Arrastra cada ficha a su equipo (o tócala y luego toca el equipo)"}</span>
        <div className="eq-acciones">
          {tipo === "equipos" && repartos.map(t => (
            <button key={t} type="button" className={"eq-chip" + (cuantos === t ? " on" : "")} aria-pressed={cuantos === t} onClick={() => alCuantos(t)}>
              {t} equipos<small>{n % t === 0 ? `de ${n / t}` : Array.from({ length: t }, (_, i) => Math.floor(n / t) + (i < n % t ? 1 : 0)).join("+")}</small>
            </button>
          ))}
          <button type="button" className="eq-chip azar" onClick={() => alGrupos(repartoAzar(tipo, miembros.map(m => m.id), cuantos))}>🎲 Aleatorio</button>
        </div>
      </div>

      {banca.length > 0 && (
        <section className={"eq-banca" + (sobre === "" ? " sobre" : "")} data-grupo="" onClick={() => tocarPlaca("")} aria-label="Banca de jugadores">
          <b className="eq-banca-t">Banca de jugadores</b>
          <div className="eq-fichas">{banca.map(ficha)}</div>
        </section>
      )}

      <div className="eq-placas" style={{ "--cols": Math.min(lista.length, 4) } as CSSProperties}>
        {lista.map(g => (
          <section key={g.id} className={"eq-placa" + (sobre === g.id ? " sobre" : "") + (sel ? " destino" : "")} data-grupo={g.id} style={{ "--eqc": g.color } as CSSProperties}
            onClick={e => { if (!(e.target as HTMLElement).closest("input,button")) tocarPlaca(g.id); }}>
            <header className="eq-placa-cab">
              <input className="eq-nombre" value={nombreDe(g)} maxLength={20} placeholder={tipo === "parejas" && de(g.id).length === 2 ? de(g.id).map(m => m.nombre).join(" y ") : g.nombre} aria-label={`Nombre de ${g.nombre}`}
                onChange={e => alNombres({ ...nombres, [g.id]: e.target.value.slice(0, 20) })} />
              <button type="button" className="eq-dado" onClick={() => sugerir(g.id)} aria-label={`Sugerir nombre para ${g.nombre}`} title="Sugerir nombre">🎲</button>
              <span className="eq-cuenta">{de(g.id).length}</span>
            </header>
            <div className="eq-base">
              <div className="eq-fichas">{de(g.id).map(ficha)}</div>
              {de(g.id).length === 0 && <span className="eq-vacio">Suelta aquí</span>}
            </div>
          </section>
        ))}
      </div>

      {arr && arrastrado && (
        <div className="eq-flota" style={{ left: arr.x, top: arr.y }} aria-hidden="true">
          <FichaJugador id={arrastrado.id} figura={arrastrado.figura} nombre={arrastrado.nombre} color={color(arrastrado.id)} tamano={60} soloCara />
        </div>
      )}
    </div>
  );
}
