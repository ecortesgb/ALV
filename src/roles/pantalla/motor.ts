// El motor de la sala. Es el ÚNICO archivo fuera de src/engine que llama a `aplicar` (Maestro §22.1).
// Corre en el aparato que hace de Pantalla: la TV o laptop, o el celular del anfitrión si juegan sin pantalla.
// Lee las acciones guardadas en orden, las aplica y publica la vista pública y lo privado de cada celular.
// Si el aparato se recarga, repite arranque + acciones y queda igual (las acciones repetidas no cuentan dos veces).
// La lógica pura (reconstruir, aAccion, paraPublicar, reloj lógico) vive en engine/nucleo.ts, sin React ni navegador,
// para poder correrla también en el servidor. Aquí quedan los timers, la hora del aparato y el enlace con la base.
import { useEffect, useRef } from "react";
import { resultados } from "../../engine/partida";
import { armarArranque, ESPERA_MS, idAutoRevelar, paraPublicar, reconstruir, relojLogico, SUSPENSO_MS } from "../../engine/nucleo";
import { enlace, type Miembro, type PartidaPub, type SalaV } from "../../servicios/enlace";

export { aAccion, conParejas, ESPERA_MS, paraPublicar, reconstruir, SUSPENSO_MS, type Arranque } from "../../engine/nucleo";
const nuevoId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);

/** El anfitrión arranca una partida: crea la fila y guarda el arranque como primera acción (solo la lee quien tiene el control). */
export async function iniciarPartida(sala: SalaV, miembros: Miembro[], juego: string, rondas: number, intensidad: 1 | 2 | 3 | 4): Promise<boolean> {
  const arranque = armarArranque(miembros, juego, rondas, intensidad, 1 + Math.floor(Math.random() * 2000000000));
  if (!arranque) return false;
  const id = await enlace.crearPartida(sala, juego);
  if (!id) return false;
  return enlace.enviar(id, `arranque-${id}`.slice(0, 60), "control", { que: "arranque", ...arranque });
}

/**
 * Corre el motor mientras `activo`. `tic` cambia con cada aviso del servidor: ahí se leen y aplican las acciones nuevas.
 * `alTerminar` avisa una vez por partida (para refrescar la XP).
 */
export function useMotor(sala: SalaV | null, partida: PartidaPub | null, activo: boolean, tic: number, alTerminar?: () => void) {
  const ref = useRef<{ id: string; publicada: number; reloj: { clave: string; fin: number } | null; espera: { clave: string; fin: number } | null; cerrada: boolean; suspenso?: ReturnType<typeof setTimeout> }>({ id: "", publicada: 0, reloj: null, espera: null, cerrada: false });
  const ocupado = useRef(false), repetir = useRef(false);
  useEffect(() => {
    if (!activo || !sala || !partida || partida.terminada) return;
    const paso = async () => {
      if (ocupado.current) { repetir.current = true; return; }
      ocupado.current = true;
      try {
        const m = ref.current;
        if (m.id !== partida.id) { clearTimeout(m.suspenso); ref.current = { id: partida.id, publicada: 0, reloj: null, espera: null, cerrada: false }; }
        const yo = ref.current;
        const e = reconstruir(await enlace.acciones(partida.id), sala.anfitrionId);
        if (!e || yo.cerrada) return;
        const { claveReloj, conReloj, listos, hayEspera, claveEspera } = relojLogico(e);
        if (conReloj && yo.reloj?.clave !== claveReloj) { yo.reloj = { clave: claveReloj, fin: Date.now() + e.segundos! * 1000 }; yo.publicada = 0; }
        // P-03: ya contestó alguien pero no todos. Desde ese momento corren 20 s; pasados, el celular del anfitrión ofrece esperar o seguir sin el ausente.
        if (!hayEspera) yo.espera = null;
        else if (yo.espera?.clave !== claveEspera) yo.espera = { clave: claveEspera, fin: Date.now() + ESPERA_MS };
        if (e.version > yo.publicada || partida.version < e.version) {
          const { publico, privados } = paraPublicar(e, e.fase === "contestando" ? yo.reloj?.fin ?? null : null, yo.espera?.fin ?? null);
          await enlace.publicar(partida.id, e.version, publico, privados);
          yo.publicada = e.version;
        }
        // Todos contestaron: 2 s de suspenso y la revelación sale sola (decisión 1 de §21.4).
        clearTimeout(yo.suspenso);
        if (listos) yo.suspenso = setTimeout(() => { void enlace.enviar(partida.id, idAutoRevelar(partida.id, e), "control", { que: "revelar" }); }, SUSPENSO_MS);
        if (e.fase === "terminada") {
          yo.cerrada = true;
          await enlace.terminar(partida.id, e.juegoId, e.cfg.jugadores.length, resultados(e).map(r => ({ jugador: r.jugador, rondas: r.rondas, retos: r.retos, lugar: r.lugar })));
          alTerminar?.();
        }
      } finally {
        ocupado.current = false;
        if (repetir.current) { repetir.current = false; void paso(); }
      }
    };
    void paso();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, sala?.id, partida?.id, partida?.terminada, tic]);
  useEffect(() => () => clearTimeout(ref.current.suspenso), []);
}

/** Manda una acción de control (solo sirve si la cuenta tiene el control). */
export const control = (partida: string, que: string, extra: Record<string, unknown> = {}) => enlace.enviar(partida, nuevoId(), "control", { que, ...extra });
/** Manda una acción de jugador. */
export const jugada = (partida: string, tipo: "contestar" | "carta" | "pista", datos: Record<string, unknown>) => enlace.enviar(partida, nuevoId(), tipo, datos);
