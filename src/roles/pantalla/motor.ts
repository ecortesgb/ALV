// El motor de la sala. Es el ÚNICO archivo fuera de src/engine que llama a `aplicar` (Maestro §22.1).
// Corre en el aparato que hace de Pantalla: la TV o laptop, o el celular del anfitrión si juegan sin pantalla.
// Lee las acciones guardadas en orden, las aplica y publica la vista pública y lo privado de cada celular.
// Si el aparato se recarga, repite arranque + acciones y queda igual (las acciones repetidas no cuentan dos veces).
// La lógica pura (reconstruir, aAccion, paraPublicar, reloj lógico) vive en engine/nucleo.ts, sin React ni navegador,
// para poder correrla también en el servidor. Aquí quedan los timers, la hora del aparato y el enlace con la base.
import { useEffect, useRef } from "react";
import { resultados } from "../../engine/partida";
import { armarArranque, ESPERA_MS, idAutoRevelar, idTiempo, paraPublicar, reconstruir, relojLogico, SUSPENSO_MS } from "../../engine/nucleo";
import { enlace, type Miembro, type PartidaPub, type SalaV } from "../../servicios/enlace";
import type { OpcionesPartida } from "../../engine/types";
import { calcularCopas, esResultado } from "../../engine/copas";

export { aAccion, conParejas, ESPERA_MS, paraPublicar, reconstruir, SUSPENSO_MS, type Arranque } from "../../engine/nucleo";
const nuevoId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);

/**
 * El anfitrión arranca una partida: crea la fila y guarda el arranque como primera acción (solo la lee quien tiene el control).
 * `op`: lo que eligió en el configurador (tipo de partida, escenario, instrumento y opciones del juego).
 */
export async function iniciarPartida(sala: SalaV, miembros: Miembro[], juego: string, rondas: number, intensidad: 1 | 2 | 3 | 4, op: OpcionesPartida = {}): Promise<boolean> {
  const arranque = armarArranque(miembros, juego, rondas, intensidad, 1 + Math.floor(Math.random() * 2000000000), op);
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
  const ref = useRef<{ id: string; publicada: number; reloj: { clave: string; fin: number } | null; espera: { clave: string; fin: number } | null; turno?: { clave: string; fin: number } | null; cerrada: boolean; suspenso?: ReturnType<typeof setTimeout>; tiempo?: ReturnType<typeof setTimeout> }>({ id: "", publicada: 0, reloj: null, espera: null, cerrada: false });
  const ocupado = useRef(false), repetir = useRef(false);
  useEffect(() => {
    if (!activo || !sala || !partida || partida.terminada) return;
    const paso = async () => {
      if (ocupado.current) { repetir.current = true; return; }
      ocupado.current = true;
      try {
        const m = ref.current;
        if (m.id !== partida.id) { clearTimeout(m.suspenso); clearTimeout(m.tiempo); ref.current = { id: partida.id, publicada: 0, reloj: null, espera: null, cerrada: false }; }
        const yo = ref.current;
        const e = reconstruir(await enlace.acciones(partida.id), sala.anfitrionId);
        if (!e || yo.cerrada) return;
        const { claveReloj, conReloj, listos, hayEspera, claveEspera, claveTurno } = relojLogico(e);
        // Temporizador por turno: cuando cambia el turno se rearma; al vencer se manda «tiempo» (el mismo id en cada aparato).
        if (!claveTurno) yo.turno = null;
        else if (yo.turno?.clave !== claveTurno) { yo.turno = { clave: claveTurno, fin: Date.now() + (e.cfg.temporizador ?? 0) * 1000 }; yo.publicada = 0; }
        clearTimeout(yo.tiempo);
        if (yo.turno) { const t = yo.turno; yo.tiempo = setTimeout(() => { void enlace.enviar(partida.id, idTiempo(partida.id, t.clave), "control", { que: "tiempo" }); }, Math.max(0, t.fin - Date.now())); }
        if (conReloj && yo.reloj?.clave !== claveReloj) { yo.reloj = { clave: claveReloj, fin: Date.now() + e.segundos! * 1000 }; yo.publicada = 0; }
        // P-03: ya contestó alguien pero no todos. Desde ese momento corren 20 s; pasados, el celular del anfitrión ofrece esperar o seguir sin el ausente.
        if (!hayEspera) yo.espera = null;
        else if (yo.espera?.clave !== claveEspera) yo.espera = { clave: claveEspera, fin: Date.now() + ESPERA_MS };
        if (e.version > yo.publicada || partida.version < e.version) {
          const { publico, privados } = paraPublicar(e, e.fase === "contestando" ? yo.reloj?.fin ?? null : null, yo.espera?.fin ?? null, yo.turno?.fin ?? null);
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
  useEffect(() => () => { clearTimeout(ref.current.suspenso); clearTimeout(ref.current.tiempo); }, []);
}

/** Manda una acción de control (solo sirve si la cuenta tiene el control). */
export const control = (partida: string, que: string, extra: Record<string, unknown> = {}) => enlace.enviar(partida, nuevoId(), "control", { que, ...extra });
/** Manda una acción de jugador. */
export const jugada = (partida: string, tipo: "contestar" | "carta" | "pista", datos: Record<string, unknown>) => enlace.enviar(partida, nuevoId(), tipo, datos);

/**
 * Copas de la noche (Maestro 6A.11 C2): suma lo público de todos los juegos terminados de la sala y publica la ceremonia
 * como una partida especial «copas» que ven la Pantalla y todos los celulares. La entrega el anfitrión antes de cerrar.
 */
export async function entregarCopas(sala: SalaV, miembros: Miembro[]): Promise<boolean> {
  const copas = calcularCopas(((await enlace.historial(sala)) as unknown[]).filter(esResultado));
  const id = await enlace.crearPartida(sala, "copas");
  if (!id) return false;
  const jugadores = miembros.map(m => ({ id: m.id, nombre: m.nombre }));
  // Con la forma de una vista pública ya revelada, para que la sala y la Pantalla la dibujen como cualquier partida.
  const estado = {
    version: 1, juegoId: "copas", motor: "copas", ronda: 1, totalRondas: 1, fase: "revelada", jugadores,
    puntos: Object.fromEntries(jugadores.map(j => [j.id, copas.totales[j.id] ?? 0])),
    contestaron: [], esperados: [], cartasEnMano: {}, pistas: {}, xpReto: {}, ausentes: [], esperas: 0, pausada: false, copas,
  };
  await enlace.publicar(id, 1, estado, {});
  return true;
}
