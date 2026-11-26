// Torneos, versión simple (migración 041; Maestro v1.54, T13). Los abre el administrador con nombre, modalidad y fechas;
// la tabla suma los Puntos ALV de las partidas dentro de esas fechas. Al vencer, el servidor guarda a los campeones.
// El «Torneo de la noche» no pasa por aquí: sale de las copas de la sala (engine/copas.ts).
// Sin nube (modo demostración) hay un torneo de muestra.
import { cliente, hayNube } from "./cliente";
import { sesionAhora } from "../app/sesion";
import type { FiguraV2 } from "../content/personaje";
import { conFiguras } from "../personajes/integracion";

export type ModalidadTorneo = "todas" | "individual" | "parejas" | "equipos";
export interface Torneo {
  id: string; nombre: string; modalidad: ModalidadTorneo; inicio: string; fin: string; premio: string | null;
  estado: "proximo" | "activo" | "terminado"; participantes: number; campeones: string[] | null;
}
export interface FilaTorneo { posicion: number; id: string; nombre: string; nivel: number; figura: FiguraV2 | null; puntos_alv: number; victorias: number; partidas: number }

// ===== Demostración =====
const dias = (n: number) => new Date(Date.now() + n * 86400e3).toISOString();
const DEMO_T: Torneo[] = [
  { id: "demo-1", nombre: "ALV Champions", modalidad: "todas", inicio: dias(-3), fin: dias(2.4), premio: "Insignia de campeón", estado: "activo", participantes: 7, campeones: null },
  { id: "demo-2", nombre: "Copa de parejas", modalidad: "parejas", inicio: dias(-10), fin: dias(-2), premio: null, estado: "terminado", participantes: 6, campeones: ["Ana", "Beto"] },
];
function demoTabla(): FilaTorneo[] {
  const s = sesionAhora();
  const base = ["Ana", "Beto", "Cata", "Dani", "Fer", "Gael"].map((nombre, i) => ({ id: `demo-${i}`, nombre, nivel: 10 - i, figura: null, puntos_alv: 22 - i * 3, victorias: 7 - i, partidas: 12 }));
  const filas = [...base, { id: s.uid || "demo-yo", nombre: s.nombre || "Tú", nivel: s.nivel, figura: null, puntos_alv: 14, victorias: 4, partidas: 9 }]
    .sort((a, b) => b.puntos_alv - a.puntos_alv);
  return filas.map((f, i) => ({ ...f, posicion: i + 1 }));
}

// ===== Servidor =====
const falta = (m: string) => /Could not find the function|PGRST202/.test(m);

export async function torneosVigentes(): Promise<Torneo[] | null> {
  if (!hayNube) return [...DEMO_T];
  try {
    const { data, error } = await cliente!.rpc("torneos_vigentes");
    if (error) { if (falta(error.message + (error.code ?? ""))) return []; console.error("torneosVigentes", error.message); return null; }
    return (data ?? []) as Torneo[];
  } catch (e) { console.error("torneosVigentes", e); return null; }
}

export async function tablaTorneo(id: string): Promise<FilaTorneo[] | null> {
  if (!hayNube) return demoTabla();
  try {
    const { data, error } = await cliente!.rpc("tabla_torneo", { p_torneo: id });
    if (error) { console.error("tablaTorneo", error.message); return null; }
    return conFiguras((data ?? []) as FilaTorneo[]);
  } catch (e) { console.error("tablaTorneo", e); return null; }
}

/** Solo el administrador. Devuelve null si salió bien, o el motivo en palabras simples. */
export async function crearTorneo(nombre: string, modalidad: ModalidadTorneo, inicio: Date, fin: Date, premio: string): Promise<string | null> {
  if (!hayNube) {
    DEMO_T.unshift({ id: `demo-${Date.now()}`, nombre, modalidad, inicio: inicio.toISOString(), fin: fin.toISOString(), premio: premio || null, estado: inicio > new Date() ? "proximo" : "activo", participantes: 0, campeones: null });
    return null;
  }
  try {
    const { error } = await cliente!.rpc("admin_crear_torneo", { p_nombre: nombre, p_modalidad: modalidad, p_inicio: inicio.toISOString(), p_fin: fin.toISOString(), p_premio: premio || null });
    if (!error) return null;
    console.error("crearTorneo", error.message);
    if (/nombre/.test(error.message)) return "El nombre debe tener de 3 a 60 letras.";
    if (/fechas|terminado/.test(error.message)) return "Revisa las fechas: el fin debe ser después de hoy y durar máximo 62 días.";
    return "No se pudo abrir el torneo.";
  } catch (e) { console.error("crearTorneo", e); return "No se pudo abrir el torneo."; }
}

export async function cancelarTorneo(id: string): Promise<boolean> {
  if (!hayNube) { const i = DEMO_T.findIndex(t => t.id === id); if (i >= 0) DEMO_T.splice(i, 1); return true; }
  try {
    const { error } = await cliente!.rpc("admin_cancelar_torneo", { p_torneo: id });
    if (error) { console.error("cancelarTorneo", error.message); return false; }
    return true;
  } catch (e) { console.error("cancelarTorneo", e); return false; }
}

/** «Termina en 2 d 5 h», «Termina en 3 h 10 min», «Empieza en…». */
export function cuentaRegresiva(t: Pick<Torneo, "inicio" | "fin" | "estado">, ahora = Date.now()): string {
  if (t.estado === "terminado") return "Terminado";
  const hacia = t.estado === "proximo" ? Date.parse(t.inicio) : Date.parse(t.fin);
  const ms = Math.max(0, hacia - ahora), d = Math.floor(ms / 86400e3), h = Math.floor((ms % 86400e3) / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
  const txt = d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${Math.max(1, m)} min`;
  return t.estado === "proximo" ? `Empieza en ${txt}` : `Termina en ${txt}`;
}
