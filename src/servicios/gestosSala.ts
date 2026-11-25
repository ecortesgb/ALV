// Gestos entre los aparatos de una sala (ALV_PLAN_ANIMACIONES.md): canal `gestos-<sala>` de difusión, sin tablas.
// Este aparato manda solo los gestos de su jugador; los de los demás llegan, se revisan y van a la tienda global.
// La figura nunca viaja: cada aparato la toma de su lista de miembros. Solo es aviso visual: nunca decide nada del juego.
import { useEffect, useRef } from "react";
import { ENFRIAR_MS, alGestoPropio, aplicarGestoRemoto, esGesto, type Gesto } from "../app/animaciones";
import { abrirDifusion } from "./difusion";

export interface MensajeGesto { g: Gesto; j: string; p: string | null; n: number }

/**
 * Revisa un aviso de gesto: que sea de un miembro de la sala (y no de este aparato), un gesto conocido, en orden
 * (`n` mayor al último de ese jugador) y no más seguido que el enfriamiento. Devuelve el mensaje limpio o null.
 */
export function revisarGesto(d: Record<string, unknown>, miembros: ReadonlySet<string>, yo: string,
  ultimo: Map<string, { n: number; t: number }>, ahora: number): MensajeGesto | null {
  const j = d.j, g = d.g, n = d.n, p = d.p;
  if (typeof j !== "string" || j.length > 64 || !miembros.has(j) || j === yo) return null;
  if (!esGesto(g) || typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 1e13) return null;
  const u = ultimo.get(j);
  if (u && (n <= u.n || ahora - u.t < ENFRIAR_MS - 150)) return null;
  ultimo.set(j, { n, t: ahora });
  return { g, j, n, p: typeof p === "string" && /^[a-z0-9-]{1,64}$/.test(p) ? p : null };
}

/** Abre el canal de gestos de la sala mientras la pantalla está montada. `yo` vacío (la TV): solo escucha. */
export function useGestosSala(salaId: string | null | undefined, yo: string, miembros: readonly { id: string }[]) {
  const ids = useRef<Set<string>>(new Set());
  ids.current = new Set(miembros.map(m => m.id));
  useEffect(() => {
    if (!salaId) return;
    const ultimo = new Map<string, { n: number; t: number }>();
    const canal = abrirDifusion(`gestos-${salaId}`, (evento, d) => {
      if (evento !== "g") return;
      const m = revisarGesto(d, ids.current, yo, ultimo, Date.now());
      if (m) aplicarGestoRemoto(m.j, m.g, m.n, m.p);
    });
    const fuera = yo ? alGestoPropio(e => { if (e.jugador === yo && ids.current.has(yo)) canal.enviar("g", { g: e.gesto, j: e.jugador, p: e.personaje, n: e.n }); }) : () => {};
    return () => { fuera(); canal.cerrar(); };
  }, [salaId, yo]);
}
