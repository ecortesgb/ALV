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
}

export function useSala(codigo: string | undefined, yo: string): EstadoSala {
  const [sala, setSala] = useState<SalaV | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cerrada, setCerrada] = useState(false);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [red, setRed] = useState<EstadoRed>("conectando");
  const [partida, setPartida] = useState<PartidaPub | null>(null);
  const [secreto, setSecreto] = useState<Record<string, unknown> | null>(null);
  const [tic, setTic] = useState(0);
  const ocupado = useRef(false), otra = useRef(false), ultima = useRef<{ id: string; version: number } | null>(null);

  useEffect(() => {
    let vivo = true;
    setSala(null); setError(null); setCerrada(false); setMiembros([]); setPartida(null); setSecreto(null); ultima.current = null;
    if (!codigo || !yo) { setError(codigo ? null : "Falta el código de la sala."); return; }
    void enlace.unirse(codigo).then(r => { if (!vivo) return; if (typeof r === "string") setError(r); else setSala(r); });
    return () => { vivo = false; };
  }, [codigo, yo]);

  const refrescar = useCallback(() => {
    if (!sala) return;
    if (ocupado.current) { otra.current = true; return; }
    ocupado.current = true;
    void (async () => {
      try {
        const [ms, p] = await Promise.all([enlace.miembros(sala), enlace.partida(sala)]);
        if (ms === null) { setCerrada(true); return; }
        setMiembros(prev => (JSON.stringify(prev) === JSON.stringify(ms) ? prev : ms));
        const u = ultima.current;
        if (p && (!u || u.id !== p.id || p.version >= u.version)) {
          const s = p.terminada ? null : await enlace.secreto(p.id);
          ultima.current = { id: p.id, version: p.version };
          setPartida(prev => (prev && prev.id === p.id && prev.version === p.version && prev.terminada === p.terminada && Object.keys(prev.estado).length === Object.keys(p.estado).length ? prev : p));
          setSecreto(prev => (JSON.stringify(prev) === JSON.stringify(s) ? prev : s));
        } else if (!p) setPartida(null);
        setTic(t => t + 1);
      } finally {
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

  return { sala, error, cerrada, miembros, red, partida, secreto, tic, refrescar };
}
