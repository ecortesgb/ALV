// Sala en línea (evento): abrir, entrar, quién está, listo y gestos.
import type { FiguraV2, Personaje } from "../content/personaje";
import { esFigura } from "../app/figura3d";
import { cliente, cuentaActiva, uidActual } from "./cliente";
import type { Genero } from "./cuenta";

export interface Sala { id: string; codigo: string; nombre: string; anfitrion: boolean }
export type GestoSala = "saludar" | "bailar" | "chocar" | "empujar" | "festejar" | "aplaudir" | "robot" | "caminar" | "mirar";
export interface MiembroSala {
  id: string; nombre: string; personaje: Personaje | null; anfitrion: boolean;
  /** Figura 3D de su cápsula activa. */
  figura?: FiguraV2 | null;
  /** Dio «listo» en el lobby. */
  listo: boolean;
  /** Último gesto, a quién (chocar o empujar) y contador: sube con cada gesto nuevo. */
  gesto: GestoSala | null; gestoA: string | null; gestoN: number;
}

/** Abre una sala nueva; quien la abre es el anfitrión. */
export async function abrirSala(nombre: string, adulto: boolean, drunk: boolean): Promise<Sala | null> {
  if (!cliente || !cuentaActiva()) return null;
  try {
    const { data, error } = await cliente.rpc("crear_evento", { p_nombre: nombre.slice(0, 60) || "Sala ALV", p_adulto: adulto, p_drunk: drunk });
    if (error) { console.error("abrirSala", error.message); return null; }
    const fila = (data as { id: string; codigo: string }[] | null)?.[0];
    return fila ? { id: fila.id, codigo: fila.codigo, nombre, anfitrion: true } : null;
  } catch (e) { console.error("abrirSala", e); return null; }
}

/** Entra a una sala con su código. Devuelve la sala o un motivo. */
export async function unirseSala(codigo: string): Promise<Sala | string> {
  if (!cliente || !cuentaActiva()) return "Primero entra a tu cuenta.";
  const limpio = codigo.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(limpio)) return "El código tiene 6 letras o números.";
  try {
    const { data, error } = await cliente.rpc("unirse_evento", { p_codigo: limpio });
    if (error) { console.error("unirseSala", error.message); return error.message.includes("llena") ? "La sala está llena (8)." : "No encontramos esa sala o ya se cerró."; }
    const sala = await leerSala(data as string);
    return sala ?? "No se pudo entrar a la sala.";
  } catch (e) { console.error("unirseSala", e); return "No se pudo entrar a la sala."; }
}

async function leerSala(id: string): Promise<Sala | null> {
  if (!cliente) return null;
  const uid = await uidActual();
  const { data, error } = await cliente.from("eventos").select("id, codigo, nombre, anfitrion, cerrado").eq("id", id).maybeSingle();
  if (error || !data || data.cerrado) return null;
  return { id: data.id, codigo: data.codigo, nombre: data.nombre, anfitrion: data.anfitrion === uid };
}

/** La sala abierta más reciente en la que está la cuenta (para volver después de recargar). */
export async function miSalaAbierta(): Promise<Sala | null> {
  if (!cliente || !cuentaActiva()) return null;
  try {
    const uid = await uidActual();
    const { data, error } = await cliente.from("eventos").select("id, codigo, nombre, anfitrion").eq("cerrado", false).order("inicia", { ascending: false }).limit(1);
    if (error || !data?.[0]) return null;
    const e = data[0];
    return { id: e.id, codigo: e.codigo, nombre: e.nombre, anfitrion: e.anfitrion === uid };
  } catch (e) { console.error("miSalaAbierta", e); return null; }
}

/** Quién está en la sala, con su personaje. Devuelve null si la sala ya no existe o se cerró. */
export async function miembrosSala(sala: Sala): Promise<MiembroSala[] | null> {
  if (!cliente || !cuentaActiva()) return null;
  try {
    const ev = await cliente.from("eventos").select("anfitrion, cerrado").eq("id", sala.id).maybeSingle();
    if (ev.error || !ev.data || ev.data.cerrado) return null;
    const m = await cliente.from("miembros_evento").select("jugador, unido, listo, gesto, gesto_a, gesto_n").eq("evento", sala.id).order("unido");
    if (m.error) return null;
    const ids = (m.data ?? []).map(x => x.jugador as string);
    if (ids.length === 0) return [];
    const [perf, pers, figs] = await Promise.all([
      cliente.from("perfiles").select("id, nombre").in("id", ids),
      cliente.from("personajes").select("jugador, piezas").in("jugador", ids),
      cliente.from("figuras_jugador").select("jugador, figura").eq("activa", true).in("jugador", ids),
    ]);
    const figuras = new Map((figs.data ?? []).filter(x => esFigura(x.figura)).map(x => [x.jugador as string, x.figura as FiguraV2]));
    const nombre = new Map((perf.data ?? []).map(x => [x.id as string, x.nombre as string]));
    // Una cuenta recién creada guarda su personaje un segundo después: mientras, va el de inicio.
    const piezas = new Map((pers.data ?? []).filter(x => (x.piezas as Partial<Personaje>)?.piel).map(x => [x.jugador as string, x.piezas as Personaje]));
    const fila = new Map((m.data ?? []).map(x => [x.jugador as string, x]));
    return ids.map(id => {
      const f = fila.get(id)!;
      return {
        id, nombre: nombre.get(id) ?? "Jugador", personaje: piezas.get(id) ?? null, figura: figuras.get(id) ?? null, anfitrion: id === ev.data!.anfitrion,
        listo: !!f.listo, gesto: (f.gesto as GestoSala | null) ?? null, gestoA: (f.gesto_a as string | null) ?? null, gestoN: Number(f.gesto_n ?? 0),
      };
    });
  } catch (e) { console.error("miembrosSala", e); return null; }
}

/** Cambia mi estado en la sala: listo y/o un gesto (chocar y empujar llevan a otro miembro). */
export async function marcarEnSala(sala: Sala, cambio: { listo?: boolean; gesto?: GestoSala; a?: string }): Promise<boolean> {
  if (!cliente || !cuentaActiva()) return false;
  try {
    const { error } = await cliente.rpc("marcar_en_sala", { p_evento: sala.id, p_listo: cambio.listo ?? null, p_gesto: cambio.gesto ?? null, p_a: cambio.a ?? null });
    if (error) { console.error("marcarEnSala", error.message); return false; }
    return true;
  } catch (e) { console.error("marcarEnSala", e); return false; }
}

/** Género de las cuentas de mi sala (solo para guerra de sexos). Nunca trae la fecha de nacimiento. */
export async function generosSala(sala: Sala): Promise<Record<string, Genero> | null> {
  if (!cliente || !cuentaActiva()) return null;
  try {
    const { data, error } = await cliente.rpc("generos_sala", { p_evento: sala.id });
    if (error) { console.error("generosSala", error.message); return null; }
    return Object.fromEntries(((data ?? []) as { jugador: string; genero: Genero }[]).map(x => [x.jugador, x.genero]));
  } catch (e) { console.error("generosSala", e); return null; }
}

export async function cerrarSala(sala: Sala): Promise<void> {
  try { const r = await cliente?.rpc("cerrar_evento", { p_evento: sala.id }); if (r?.error) console.error("cerrarSala", r.error.message); }
  catch (e) { console.error("cerrarSala", e); }
}

export async function salirDeSala(sala: Sala): Promise<void> {
  try { const r = await cliente?.rpc("salir_evento", { p_evento: sala.id }); if (r?.error) console.error("salirDeSala", r.error.message); }
  catch (e) { console.error("salirDeSala", e); }
}

/** Enlace que abre la app directo en la pantalla para unirse. */
export const enlaceSala = (codigo: string) => `${location.origin}${location.pathname}#/unirse/${codigo}`;
