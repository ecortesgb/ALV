// Estado de la sala para cualquier aparato (celular o Pantalla): quién está, la partida publicada y mi secreto.
// Un aparato ignora avisos con versión menor a la que ya tiene (Maestro §21.4).
import { useCallback, useEffect, useRef, useState } from "react";
import { enlace, type Miembro, type PartidaPub, type SalaV } from "../servicios/enlace";
import type { EstadoRed } from "../servicios/tiempoReal";

export interface EstadoSala {
  sala: SalaV | null; error: string | null; cerrada: boolean; miembros: Miembro[]; red: EstadoRed;
  partida: PartidaPub | null; secreto: Record<string, unknown> | null;
  /** Sube con cada lectura: sirve de reloj al motor. */
  tic: number; refrescar: () => void;
  /** Ya terminó la primera lectura de este montaje (antes de eso no se sabe si hay partida). */
  listo: boolean;
}

/** Lo último que se supo de cada sala en este aparato (auditoría 28 nov): al pasar del configurador a la sala, la sala
 *  abre con la partida que ya se conoce en vez de enseñar unos segundos el lobby mientras vuelve a entrar y leer. */
interface Recuerdo { yo: string; sala: SalaV; miembros: Miembro[]; partida: PartidaPub | null; secreto: Record<string, unknown> | null; en: number }
const recuerdos = new Map<string, Recuerdo>();
const VIGENCIA_MS = 10 * 60_000;
const recordado = (codigo: string | undefined, yo: string) => {
  const r = codigo ? recuerdos.get(codigo.toUpperCase()) : undefined;
  return r && r.yo === yo && Date.now() - r.en < VIGENCIA_MS ? r : undefined;
};

/** El anfitrión acaba de iniciar una partida en esta sala: la sala enseña «Empezando…» en vez del lobby hasta que llegue. */
const arranques = new Map<string, number>();
export const marcarArranque = (codigo: string) => { arranques.set(codigo.toUpperCase(), Date.now()); };
export const quitarArranque = (codigo: string) => { arranques.delete(codigo.toUpperCase()); };
/** ¿Se inició hace poco (menos de 12 s)? Pasado ese tiempo se enseña el lobby para no dejar a nadie atorado. */
export const arrancando = (codigo: string) => { const t = arranques.get(codigo.toUpperCase()); return !!t && Date.now() - t < 12_000; };

export function useSala(codigo: string | undefined, yo: string): EstadoSala {
  const inicial = recordado(codigo, yo);
  const [sala, setSala] = useState<SalaV | null>(inicial?.sala ?? null);
  const [error, setError] = useState<string | null>(null);
  const [cerrada, setCerrada] = useState(false);
  const [miembros, setMiembros] = useState<Miembro[]>(inicial?.miembros ?? []);
  const [red, setRed] = useState<EstadoRed>("conectando");
  const [partida, setPartida] = useState<PartidaPub | null>(inicial?.partida ?? null);
  const [secreto, setSecreto] = useState<Record<string, unknown> | null>(inicial?.secreto ?? null);
  const [tic, setTic] = useState(0);
  const [listo, setListo] = useState(false);
  const ocupado = useRef(false), otra = useRef(false), ultima = useRef<{ id: string; version: number } | null>(inicial?.partida ? { id: inicial.partida.id, version: inicial.partida.version } : null);

  useEffect(() => {
    let vivo = true;
    const r0 = recordado(codigo, yo);
    setError(null); setCerrada(false); setListo(false);
    if (!r0) { setSala(null); setMiembros([]); setPartida(null); setSecreto(null); ultima.current = null; }
    if (!codigo || !yo) { setError(codigo ? null : "Falta el código de la sala."); return; }
    // Ya dentro de esta sala en este aparato: no se vuelve a entrar (la lectura de miembros avisa si se cerró).
    if (r0) { setSala(prev => (prev?.id === r0.sala.id ? prev : r0.sala)); return; }
    void enlace.unirse(codigo).then(r => { if (!vivo) return; if (typeof r === "string") setError(r); else setSala(r); });
    return () => { vivo = false; };
  }, [codigo, yo]);

  // Se recuerda lo último para el siguiente montaje de la misma sala.
  useEffect(() => {
    if (!codigo || !sala) return;
    if (cerrada || error) { recuerdos.delete(codigo.toUpperCase()); return; }
    recuerdos.set(codigo.toUpperCase(), { yo, sala, miembros, partida, secreto, en: Date.now() });
  }, [codigo, yo, sala, miembros, partida, secreto, cerrada, error]);

  const refrescar = useCallback(() => {
    if (!sala) return;
    // El motor no espera a esta lectura: arranca con el aviso y lee las acciones al mismo tiempo.
    setTic(t => t + 1);
    if (ocupado.current) { otra.current = true; return; }
    ocupado.current = true;
    void (async () => {
      try {
        // La partida no espera a la lista de miembros (que son varias consultas): cada una avanza por su lado.
        const gente = enlace.miembros(sala).then(ms => {
          if (ms === null) setCerrada(true);
          else setMiembros(prev => (JSON.stringify(prev) === JSON.stringify(ms) ? prev : ms));
        });
        const p = await enlace.partida(sala);
        const u = ultima.current;
        if (p && (!u || u.id !== p.id || p.version >= u.version)) {
          const s = p.terminada ? null : await enlace.secreto(p.id);
          ultima.current = { id: p.id, version: p.version };
          setPartida(prev => (prev && prev.id === p.id && prev.version === p.version && prev.terminada === p.terminada && Object.keys(prev.estado).length === Object.keys(p.estado).length ? prev : p));
          setSecreto(prev => (JSON.stringify(prev) === JSON.stringify(s) ? prev : s));
        } else if (!p) setPartida(null);
        await gente;
        setTic(t => t + 1);
      } finally {
        setListo(true);
        ocupado.current = false;
        if (otra.current) { otra.current = false; refrescar(); }
      }
    })();
  }, [sala]);

  useEffect(() => {
    if (!sala) return;
    refrescar();
    return enlace.escuchar(sala, refrescar, setRed);
  }, [sala, refrescar]);

  return { sala, error, cerrada, miembros, red, partida, secreto, tic, refrescar, listo };
}
