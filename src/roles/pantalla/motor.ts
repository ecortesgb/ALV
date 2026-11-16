// El motor de la sala. Es el ÚNICO archivo fuera de src/engine que llama a `aplicar` (Maestro §22.1).
// Corre en el aparato que hace de Pantalla: la TV o laptop, o el celular del anfitrión si juegan sin pantalla.
// Lee las acciones guardadas en orden, las aplica y publica la vista pública y lo privado de cada celular.
// Si el aparato se recarga, repite arranque + acciones y queda igual (las acciones repetidas no cuentan dos veces).
import { useEffect, useRef } from "react";
import { CONTENIDO } from "../../content";
import { JUEGOS } from "../../content/catalogo";
import { aplicar, crearPartida, resultados, type Accion, type EstadoPartida } from "../../engine/partida";
import type { Configuracion } from "../../engine/types";
import { vistaJugador, vistaPublica } from "../../engine/vistas";
import { enlace, type FilaAccion, type Miembro, type PartidaPub, type SalaV } from "../../servicios/enlace";

export interface Arranque { semilla: number; juego: string; rondas: number; cfg: Configuracion }
export const SUSPENSO_MS = 2000;
const CONTROL_SIMPLE = new Set(["pausar", "reanudar", "saltar", "revelar", "siguiente", "terminar", "ruleta"]);
const nuevoId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);

/** Parejas por orden de llegada (1 con 2, 3 con 4…). Solo si son pares. */
export function conParejas(miembros: { id: string; nombre: string }[]) {
  return miembros.map((m, i) => ({ id: m.id, nombre: m.nombre, ...(miembros.length % 2 === 0 ? { parejaDe: miembros[i % 2 === 0 ? i + 1 : i - 1]!.id } : {}) }));
}

/** El anfitrión arranca una partida: crea la fila y guarda el arranque como primera acción (solo la lee quien tiene el control). */
export async function iniciarPartida(sala: SalaV, miembros: Miembro[], juego: string, rondas: number, intensidad: 1 | 2 | 3 | 4): Promise<boolean> {
  const def = JUEGOS.find(j => j.id === juego);
  if (!def?.motor || miembros.length < def.minJugadores) return false;
  const id = await enlace.crearPartida(sala, juego);
  if (!id) return false;
  const cfg: Configuracion = {
    jugadores: conParejas(miembros), lugar: "cualquiera", intensidad: Math.max(def.intensidadMin, Math.min(def.intensidadMax, intensidad)) as 1 | 2 | 3 | 4,
    dificultad: 2, adulto: intensidad >= 3 || !!def.adulto, drunk: intensidad >= 2, turno: "orden",
  };
  const arranque: Arranque = { semilla: 1 + Math.floor(Math.random() * 2000000000), juego, rondas: Math.max(3, Math.min(20, rondas)), cfg };
  return enlace.enviar(id, `arranque-${id}`.slice(0, 60), "control", { que: "arranque", ...arranque });
}

/** Traduce una fila guardada a una acción del motor. Lo de control solo vale si lo mandó quien tiene el control. */
export function aAccion(f: FilaAccion, controlan: string[]): Accion | null {
  const d = f.datos, id = f.id;
  if (f.tipo === "contestar") return { id, tipo: "contestar", jugador: f.jugador, valor: d.valor };
  if (f.tipo === "carta" && typeof d.carta === "string") return { id, tipo: "usar-carta", jugador: f.jugador, carta: d.carta };
  if (f.tipo === "pista" && typeof d.texto === "string") return { id, tipo: "pista", jugador: f.jugador, texto: d.texto };
  if (f.tipo !== "control" || !controlan.includes(f.jugador)) return null;
  const que = String(d.que ?? "");
  if (CONTROL_SIMPLE.has(que)) return { id, tipo: que } as Accion;
  if (que === "xp-reto" && typeof d.jugador === "string" && typeof d.xp === "number") return { id, tipo: "xp-reto", jugador: d.jugador, xp: d.xp };
  if (que === "pasar-control" && typeof d.jugador === "string") return { id, tipo: "pasar-control", jugador: d.jugador };
  return null;
}

/** Reconstruye la partida con su arranque y sus acciones en orden. Sin arranque válido devuelve null. */
export function reconstruir(filas: FilaAccion[], anfitrion: string): EstadoPartida | null {
  const a = filas.find(f => f.tipo === "control" && f.jugador === anfitrion && f.datos.que === "arranque");
  if (!a) return null;
  const d = a.datos as unknown as Arranque & { que: string };
  const def = JUEGOS.find(j => j.id === d.juego);
  if (!def?.motor || typeof d.semilla !== "number" || !Array.isArray(d.cfg?.jugadores)) return null;
  let e: EstadoPartida = { ...crearPartida(def, d.cfg, d.semilla, CONTENIDO, d.rondas), control: anfitrion };
  for (const f of filas) {
    if (f === a) continue;
    const acc = aAccion(f, [anfitrion, e.control ?? anfitrion]);
    if (acc) e = aplicar(e, acc, CONTENIDO);
  }
  return e;
}

/** Lo que se publica: la vista pública (con el reloj) y, por jugador, solo lo suyo. */
export function paraPublicar(e: EstadoPartida, relojFin: number | null) {
  const publico = { ...vistaPublica(e), reloj: relojFin && e.segundos ? { fin: relojFin, total: e.segundos } : null };
  const privados: Record<string, unknown> = {};
  for (const j of e.cfg.jugadores) { const v = vistaJugador(e, j.id); privados[j.id] = { mio: v.mio ?? null, miRespuesta: v.miRespuesta ?? null, miMano: v.miMano }; }
  return { publico, privados };
}

/**
 * Corre el motor mientras `activo`. `tic` cambia con cada aviso del servidor: ahí se leen y aplican las acciones nuevas.
 * `alTerminar` avisa una vez por partida (para refrescar la XP).
 */
export function useMotor(sala: SalaV | null, partida: PartidaPub | null, activo: boolean, tic: number, alTerminar?: () => void) {
  const ref = useRef<{ id: string; publicada: number; reloj: { clave: string; fin: number } | null; cerrada: boolean; suspenso?: ReturnType<typeof setTimeout> }>({ id: "", publicada: 0, reloj: null, cerrada: false });
  const ocupado = useRef(false), repetir = useRef(false);
  useEffect(() => {
    if (!activo || !sala || !partida || partida.terminada) return;
    const paso = async () => {
      if (ocupado.current) { repetir.current = true; return; }
      ocupado.current = true;
      try {
        const m = ref.current;
        if (m.id !== partida.id) { clearTimeout(m.suspenso); ref.current = { id: partida.id, publicada: 0, reloj: null, cerrada: false }; }
        const yo = ref.current;
        const e = reconstruir(await enlace.acciones(partida.id), sala.anfitrionId);
        if (!e || yo.cerrada) return;
        const claveReloj = `${e.ronda}-${e.cambios}`;
        if (e.segundos && e.fase === "contestando" && yo.reloj?.clave !== claveReloj) { yo.reloj = { clave: claveReloj, fin: Date.now() + e.segundos * 1000 }; yo.publicada = 0; }
        if (e.version > yo.publicada || partida.version < e.version) {
          const { publico, privados } = paraPublicar(e, e.fase === "contestando" ? yo.reloj?.fin ?? null : null);
          await enlace.publicar(partida.id, e.version, publico, privados);
          yo.publicada = e.version;
        }
        // Todos contestaron: 2 s de suspenso y la revelación sale sola (decisión 1 de §21.4).
        const listos = e.fase === "contestando" && !e.pausada && vistaPublica(e).esperados.every(j => vistaPublica(e).contestaron.includes(j));
        clearTimeout(yo.suspenso);
        if (listos) yo.suspenso = setTimeout(() => { void enlace.enviar(partida.id, `auto-rev-${partida.id.slice(0, 18)}-${e.ronda}-${e.cambios}`, "control", { que: "revelar" }); }, SUSPENSO_MS);
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
