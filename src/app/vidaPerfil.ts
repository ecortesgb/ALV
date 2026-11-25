// Vida automática de una figura según su perfil (ALV_PLAN_ANIMATION_LIBRARY.md, etapa 2).
// El director (perfiles.ts) decide; este hook solo lleva el reloj y manda «momento» con prioridad 0.5 al motor.
// Reglas: nunca en partida ni en resultados; nunca mientras suena un gesto del jugador (ni en los segundos que
// el jugador está probando algo); si la pestaña está oculta, espera. El motor además rechaza la vida si algo más
// importante suena (misma regla de prioridades de siempre).
import { useEffect, useRef } from "react";
import { crearDirector, vidaPermitida, type Accion, type Contexto, type Perfil } from "./perfiles";
import { estadoGesto } from "./animaciones";

export interface OpcionesVida {
  activo: boolean;
  perfil: Perfil | null;
  contexto: Contexto;
  /** id de la figura en el motor */
  id: string;
  /** jugador (para respetar sus gestos de la tienda global); opcional */
  jugador?: string;
  enviar: (m: object) => void;
  /** ¿el motor tiene esta animación? (las «lib:» dependen de la biblioteca) */
  hay: (n: string) => boolean;
  /** Hasta cuándo (ms, Date.now) no actuar: lo sube quien prueba un momento a mano. */
  ocupadoHasta?: { current: number };
  /** Para observar lo que hace (comparador, pruebas). */
  alActuar?: (a: Accion) => void;
}

export function useVidaPerfil(o: OpcionesVida) {
  const vivo = useRef(o);
  vivo.current = o;
  const { activo, perfil, contexto } = o;
  useEffect(() => {
    if (!activo || !perfil || !vidaPermitida(contexto)) return;
    const dir = crearDirector(perfil, Math.random, n => vivo.current.hay(n));
    let reloj: ReturnType<typeof setTimeout>;
    const turno = () => {
      const v = vivo.current, ahora = Date.now();
      const ocupado = (v.ocupadoHasta?.current ?? 0) > ahora || (v.jugador ? estadoGesto(v.jugador).hasta > ahora : false);
      if (!ocupado && typeof document !== "undefined" && !document.hidden) {
        const a = dir.decidir();
        if (a) {
          v.enviar({ tipo: "momento", id: v.id, cual: a.cual, prio: a.prio, vel: a.vel, int: a.int, ...(a.dur ? { dur: a.dur } : {}) });
          v.alActuar?.(a);
        }
      }
      reloj = setTimeout(turno, dir.espera());
    };
    reloj = setTimeout(turno, dir.espera());
    return () => clearTimeout(reloj);
  }, [activo, perfil, contexto]);
}
