// La mesa de la partida (Elías, 24 nov): la tarjeta y la herramienta al centro, los personajes a los lados en sus fichas.
// Por equipos, parejas o bandos, cada grupo va de un lado con su nombre y sus puntos. Las fichas reaccionan con lo que
// pasa en la ronda (solo con la vista pública): brillan cuando es su turno, piensan mientras faltan, saltan al contestar,
// festejan si sumaron al revelar y se lamentan si no. La usan el celular (modo celulares) y la TV.
import type { CSSProperties, ReactNode } from "react";
import { colorDe } from "../app/colorJugador";
import type { FiguraV2 } from "../content/personaje";
import type { Publico } from "../juegos/general/texto";
import { FichaJugador } from "./lobby/Ficha";
import { useGesto, type Gesto } from "../app/animaciones";
import { MenuGestos } from "./gestos/MenuGestos";
import "./mesa.css";

type Reaccion = "festeja" | "lamenta";
/** Puntos y quiénes debían contestar al empezar cada ronda (clave: jugadores, juego y ronda). */
const ANTES = new Map<string, { puntos: Record<string, number>; esperados: string[] }>();
interface MiembroMesa { id: string; figura?: FiguraV2 | null }

/** Quiénes tienen el turno ahora (verdad o reto: quien pregunta y quien responde; turnos: el del turno). */
export function turnoDe(v: Publico): string[] {
  if (v.fase !== "contestando") return [];
  if (v.verdadReto) return [v.verdadReto.responde, v.verdadReto.pregunta];
  return v.turnoDe ? [v.turnoDe] : [];
}

/** Reparte a los jugadores en dos lados: por grupo (pares a la izquierda, nones a la derecha) o alternando. */
export function lados(v: Publico): { izq: { titulo?: string; puntos?: number; ids: string[] }[]; der: { titulo?: string; puntos?: number; ids: string[] }[] } {
  const ids = v.jugadores.map(j => j.id);
  if (v.grupos?.length) {
    const gs = [...v.grupos].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map(g => ({ titulo: g.nombre, puntos: g.puntos, ids: g.jugadores }));
    return { izq: gs.filter((_, i) => i % 2 === 0), der: gs.filter((_, i) => i % 2 === 1) };
  }
  return { izq: [{ ids: ids.filter((_, i) => i % 2 === 0) }], der: [{ ids: ids.filter((_, i) => i % 2 === 1) }] };
}

export function MesaJuego({ v, miembros, yo, modo, children }: { v: Publico; miembros: MiembroMesa[]; yo?: string; modo: "tv" | "celular"; children: ReactNode }) {
  const ids = v.jugadores.map(j => j.id);
  const turno = turnoDe(v);
  // Reacciones al revelar: puntos de cuando empezó la ronda contra los de después. Se guardan fuera del componente
  // (por partida y ronda) para que sobrevivan si la mesa se vuelve a montar (en Local, al pasar el teléfono).
  const clave = `${ids.join(",")}|${v.juegoId}|${v.ronda}`;
  if (v.fase === "contestando") {
    const a = ANTES.get(clave);
    if (!a) { ANTES.set(clave, { puntos: { ...v.puntos }, esperados: [...v.esperados] }); if (ANTES.size > 40) ANTES.delete(ANTES.keys().next().value!); }
    else for (const e of v.esperados) if (!a.esperados.includes(e)) a.esperados.push(e);
  }
  const a = v.fase === "revelada" ? ANTES.get(clave) : undefined;
  const reac: Record<string, { tipo: Reaccion; delta: number }> = {};
  if (a) for (const id of ids) {
    const delta = (v.puntos[id] ?? 0) - (a.puntos[id] ?? 0);
    if (delta > 0) reac[id] = { tipo: "festeja", delta };
    // Se lamenta quien podía sumar y no sumó (en Verdad o reto, solo quien respondió: quien pregunta no juega puntos).
    else if (v.verdadReto ? id === v.verdadReto.responde : a.esperados.includes(id)) reac[id] = { tipo: "lamenta", delta };
  }
  const eliminados = v.impostor?.eliminados ?? [];
  const anchaPantalla = typeof matchMedia !== "undefined" && matchMedia("(min-width: 900px)").matches;
  const t = modo === "tv" ? (v.jugadores.length > 6 ? 84 : 104) : anchaPantalla ? (v.jugadores.length > 6 ? 56 : 66) : v.jugadores.length > 6 ? 44 : 52;

  const ficha = (id: string) => {
    const nombre = v.jugadores.find(j => j.id === id)?.nombre ?? "";
    const r = reac[id];
    const estado = eliminados.includes(id) ? "fuera"
      : r ? r.tipo
      : turno.includes(id) ? "turno"
      : v.fase === "contestando" && v.contestaron.includes(id) ? "listo"
      : v.fase === "contestando" && v.esperados.length > 1 && v.esperados.includes(id) ? "pensando" : "";
    const insignia = { festeja: "🎉", lamenta: "😅", turno: "⭐", listo: "✓", pensando: "💭", fuera: "✖", "": "" }[estado];
    return (
      <li key={id} className={"ms-ficha" + (estado ? " " + estado : "") + (id === yo ? " yo" : "")} style={{ "--ms-t": `${t}px` } as CSSProperties} aria-label={`${nombre}: ${v.puntos[id] ?? 0} puntos`}>
        <span className="ms-cuerpo" key={`${id}-${estado}-${v.ronda}`}>
          <FichaJugador id={id} figura={miembros.find(m => m.id === id)?.figura} nombre={nombre} color={colorDe(id, ids)} tamano={t} soloCara />
          {insignia && <span className="ms-insignia" aria-hidden="true">{insignia}</span>}
          <GestoFicha id={id} />
          {r && r.delta !== 0 && <span className={"ms-delta" + (r.delta < 0 ? " menos" : "")} aria-hidden="true">{r.delta > 0 ? "+" : "−"}{Math.abs(r.delta)}</span>}
        </span>
        <span className="ms-nom">{nombre}</span>
        <b className="ms-pts">{v.puntos[id] ?? 0}{(v.cartasEnMano[id] ?? 0) > 0 && <small className="ms-cartas" title="Comodines">⚡{v.cartasEnMano[id]}</small>}</b>
      </li>
    );
  };
  const lado = (gs: ReturnType<typeof lados>["izq"], cual: "izq" | "der") => (
    <aside className={"ms-lado " + cual}>
      {gs.map((g, i) => (
        <section key={i} className={"ms-grupo" + (g.titulo ? " titulado" : "")}>
          {g.titulo && <header className="ms-grupo-cab"><b>{g.titulo}</b><span>{g.puntos ?? 0}</span></header>}
          <ul>{g.ids.map(ficha)}</ul>
        </section>
      ))}
    </aside>
  );
  const l = lados(v);
  return (
    <div className={`ms ms-${modo}`}>
      {lado(l.izq, "izq")}
      <div className="ms-centro" key={`c${v.ronda}`}>{children}</div>
      {modo === "celular" && yo && miembros.some(m => m.id === yo) && <MenuGestos jugador={yo} figura={miembros.find(m => m.id === yo)?.figura} plegable className="ms-gestos" />}
      {lado(l.der, "der")}
    </div>
  );
}

const SIMBOLO: Record<Gesto, string> = { saludar: "👋", victoria: "🏆", derrota: "💀", especial: "✨" };
/** Gesto que lanzó este jugador (MenuGestos, aquí o en otro aparato): la ficha reacciona y sale su símbolo. */
function GestoFicha({ id }: { id: string }) {
  const { gesto, n } = useGesto(id);
  return gesto ? <span key={n} className={"ms-gesto g-" + gesto} aria-hidden="true">{SIMBOLO[gesto]}</span> : null;
}
