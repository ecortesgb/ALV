// Enlace con la sala: lo único que usan las pantallas de sala y partida para hablar con el servidor.
// Con Supabase configurado usa la nube; sin él (desarrollo o demostración) usa un respaldo local que
// comparte la sala entre pestañas del mismo navegador, para probar TV + celulares sin cuentas.
import type { FiguraV2 } from "../content/personaje";
import { cliente, hayNube, uidActual } from "./cliente";
import { escucharSala, vigilarPantalla, type EstadoRed, type PresenciaPantalla } from "./tiempoReal";

export type ModoSala = "tv" | "mesa";
export interface SalaV { id: string; codigo: string; modo: ModoSala; anfitrionId: string }
export interface Miembro { id: string; nombre: string; figura: FiguraV2 | null; anfitrion: boolean; listo: boolean }
export interface PartidaPub { id: string; juego: string; version: number; estado: Record<string, unknown>; terminada: boolean }
export type TipoFila = "contestar" | "carta" | "pista" | "control";
export interface FilaAccion { id: string; jugador: string; tipo: TipoFila; datos: Record<string, unknown>; creada: string }
export interface ResultadoFinal { jugador: string; rondas: number; retos: number; lugar: number }

export interface Enlace {
  abrir(modo: ModoSala): Promise<SalaV | string>;
  unirse(codigo: string): Promise<SalaV | string>;
  /** La sala abierta más reciente en la que está la cuenta. */
  miSala(): Promise<SalaV | null>;
  miembros(sala: SalaV): Promise<Miembro[] | null>;
  marcarListo(sala: SalaV, listo: boolean): Promise<void>;
  salir(sala: SalaV): Promise<void>;
  cerrar(sala: SalaV): Promise<void>;
  partida(sala: SalaV): Promise<PartidaPub | null>;
  secreto(partida: string): Promise<Record<string, unknown> | null>;
  crearPartida(sala: SalaV, juego: string): Promise<string | null>;
  enviar(partida: string, id: string, tipo: TipoFila, datos: Record<string, unknown>): Promise<boolean>;
  acciones(partida: string): Promise<FilaAccion[]>;
  publicar(partida: string, version: number, estado: unknown, privados: Record<string, unknown>): Promise<void>;
  terminar(partida: string, juego: string, jugadores: number, resultados: ResultadoFinal[]): Promise<void>;
  darXp(sala: SalaV, jugador: string, xp: number): Promise<boolean>;
  activarCapsula(n: number): Promise<void>;
  escuchar(sala: SalaV, alCambiar: () => void, alEstado?: (e: EstadoRed) => void): () => void;
  /** Dice si la Pantalla de la sala está conectada. Si `soyPantalla`, este aparato se anota como la Pantalla. */
  vigilarPantalla(sala: SalaV, soyPantalla: boolean, alEstado: (p: PresenciaPantalla) => void): () => void;
}

const CODIGO = /^[A-Z0-9]{6}$/;
const MODOS: Record<string, ModoSala> = { "ALV con pantalla": "tv", "ALV sin pantalla": "mesa" };
const NOMBRE_MODO: Record<ModoSala, string> = { tv: "ALV con pantalla", mesa: "ALV sin pantalla" };
const log = (donde: string, e: unknown) => console.error(donde, e instanceof Error ? e.message : e);
/** El servidor todavía no tiene la función o el tipo nuevo (migraciones 017 y 018 sin aplicar). */
const esFalta = (e: { code?: string; message?: string } | null) => !!e && (e.code === "PGRST202" || e.code === "42883" || e.code === "23514" || /check constraint|Could not find the function/.test(e.message ?? ""));

// ---------- Nube ----------
const nube: Enlace = {
  async abrir(modo) {
    try {
      const { data, error } = await cliente!.rpc("crear_evento", { p_nombre: NOMBRE_MODO[modo], p_adulto: true, p_drunk: true });
      const fila = (data as { id: string; codigo: string }[] | null)?.[0];
      if (error || !fila) { log("abrir", error); return error?.message.includes("mayores") ? "ALV es solo para mayores de 18." : "No se pudo abrir la sala."; }
      return { id: fila.id, codigo: fila.codigo, modo, anfitrionId: (await uidActual()) ?? "" };
    } catch (e) { log("abrir", e); return "No se pudo abrir la sala."; }
  },
  async unirse(codigo) {
    const c = codigo.trim().toUpperCase();
    if (!CODIGO.test(c)) return "El código tiene 6 letras o números.";
    try {
      const { data, error } = await cliente!.rpc("unirse_evento", { p_codigo: c });
      if (error) {
        log("unirse", error);
        return error.message.includes("llena") ? "La sala está llena (8)." : error.message.includes("mayores") ? "ALV es solo para mayores de 18." : "No encontramos esa sala o ya se cerró.";
      }
      const ev = await cliente!.from("eventos").select("id, codigo, nombre, anfitrion, cerrado").eq("id", data as string).maybeSingle();
      if (ev.error || !ev.data || ev.data.cerrado) return "No se pudo entrar a la sala.";
      return { id: ev.data.id, codigo: ev.data.codigo, modo: MODOS[ev.data.nombre as string] ?? "mesa", anfitrionId: ev.data.anfitrion };
    } catch (e) { log("unirse", e); return "No se pudo entrar a la sala."; }
  },
  async miSala() {
    try {
      const { data, error } = await cliente!.from("eventos").select("id, codigo, nombre, anfitrion").eq("cerrado", false).order("inicia", { ascending: false }).limit(1);
      const e = data?.[0];
      return error || !e ? null : { id: e.id, codigo: e.codigo, modo: MODOS[e.nombre as string] ?? "mesa", anfitrionId: e.anfitrion };
    } catch (e) { log("miSala", e); return null; }
  },
  async miembros(sala) {
    try {
      const ev = await cliente!.from("eventos").select("anfitrion, cerrado").eq("id", sala.id).maybeSingle();
      if (ev.error) return [];
      if (!ev.data || ev.data.cerrado) return null;
      const m = await cliente!.from("miembros_evento").select("jugador, unido, listo").eq("evento", sala.id).order("unido");
      const ids = (m.data ?? []).map(x => x.jugador as string);
      if (m.error || !ids.length) return [];
      const [perf, figs] = await Promise.all([
        cliente!.from("perfiles").select("id, nombre").in("id", ids),
        cliente!.from("figuras_jugador").select("jugador, figura").eq("activa", true).in("jugador", ids),
      ]);
      const nombre = new Map((perf.data ?? []).map(x => [x.id as string, x.nombre as string]));
      const figura = new Map((figs.data ?? []).map(x => [x.jugador as string, x.figura as FiguraV2]));
      return (m.data ?? []).map(x => ({
        id: x.jugador as string, nombre: nombre.get(x.jugador as string) ?? "Jugador", figura: figura.get(x.jugador as string) ?? null,
        anfitrion: x.jugador === ev.data!.anfitrion, listo: !!x.listo,
      }));
    } catch (e) { log("miembros", e); return []; }
  },
  async marcarListo(sala, listo) {
    try { const r = await cliente!.rpc("marcar_en_sala", { p_evento: sala.id, p_listo: listo, p_gesto: null, p_a: null }); if (r.error) log("marcarListo", r.error); } catch (e) { log("marcarListo", e); }
  },
  async salir(sala) { try { await cliente!.rpc("salir_evento", { p_evento: sala.id }); } catch (e) { log("salir", e); } },
  async cerrar(sala) { try { await cliente!.rpc("cerrar_evento", { p_evento: sala.id }); } catch (e) { log("cerrar", e); } },
  async partida(sala) {
    try {
      const { data, error } = await cliente!.from("partidas").select("id, juego, version, estado_publico, terminada").eq("evento", sala.id).order("creada", { ascending: false }).limit(1);
      const p = data?.[0];
      if (error || !p) return null;
      return { id: p.id, juego: p.juego, version: p.version, estado: (p.estado_publico ?? {}) as Record<string, unknown>, terminada: !!p.terminada };
    } catch (e) { log("partida", e); return null; }
  },
  async secreto(partida) {
    try {
      const uid = await uidActual();
      const { data, error } = await cliente!.from("datos_privados").select("datos").eq("partida", partida).eq("jugador", uid ?? "").maybeSingle();
      return error ? null : ((data?.datos as Record<string, unknown>) ?? null);
    } catch (e) { log("secreto", e); return null; }
  },
  async crearPartida(sala, juego) {
    try {
      // La semilla real nunca va a la tabla partidas: viaja en la acción de arranque, que solo lee quien tiene el control.
      const r = await cliente!.rpc("crear_partida_sala", { p_evento: sala.id, p_juego: juego, p_semilla: 1, p_config: {} });
      if (!r.error) return r.data as string;
      if (!esFalta(r.error)) { log("crearPartida", r.error); return null; }
      const viejo = await cliente!.from("partidas").insert({ evento: sala.id, juego, semilla: 0 }).select("id").single();
      if (viejo.error) { log("crearPartida", viejo.error); return null; }
      return viejo.data.id as string;
    } catch (e) { log("crearPartida", e); return null; }
  },
  async enviar(partida, id, tipo, datos) {
    try {
      const uid = await uidActual();
      if (!uid) return false;
      const r = await cliente!.from("acciones").insert({ id, partida, jugador: uid, tipo, datos });
      if (!r.error || r.error.code === "23505") return true;
      if (esFalta(r.error) && (tipo === "control" || tipo === "pista")) {
        // Servidor sin la migración 018: mismas acciones con un tipo que ya acepta. El motor revisa quién la manda.
        const v = await cliente!.from("acciones").insert({ id, partida, jugador: uid, tipo: "carta", datos: { ...datos, _tipo: tipo } });
        if (!v.error || v.error.code === "23505") return true;
        log("enviar", v.error); return false;
      }
      log("enviar", r.error); return false;
    } catch (e) { log("enviar", e); return false; }
  },
  async acciones(partida) {
    try {
      const { data, error } = await cliente!.from("acciones").select("id, jugador, tipo, datos, creada").eq("partida", partida).order("creada").order("id");
      if (error) { log("acciones", error); return []; }
      return (data ?? []).map(f => {
        const d = (f.datos ?? {}) as Record<string, unknown>;
        return { id: f.id, jugador: f.jugador, tipo: (typeof d._tipo === "string" ? d._tipo : f.tipo) as TipoFila, datos: d, creada: f.creada };
      });
    } catch (e) { log("acciones", e); return []; }
  },
  async publicar(partida, version, estado, privados) {
    try { const r = await cliente!.rpc("publicar_partida", { p_partida: partida, p_version: version, p_estado: estado, p_privados: privados }); if (r.error) log("publicar", r.error); } catch (e) { log("publicar", e); }
  },
  async terminar(partida, juego, jugadores, resultados) {
    try { const r = await cliente!.rpc("terminar_partida_sala", { p_partida: partida, p_juego: juego, p_jugadores: jugadores, p_resultados: resultados }); if (r.error) log("terminar", r.error); } catch (e) { log("terminar", e); }
  },
  async darXp(sala, jugador, xp) {
    try { const r = await cliente!.rpc("dar_xp_reto", { p_evento: sala.id, p_jugador: jugador, p_xp: xp }); if (r.error) log("darXp", r.error); return !r.error; } catch (e) { log("darXp", e); return false; }
  },
  async activarCapsula(n) {
    try { const r = await cliente!.rpc("activar_capsula", { p_capsula: n }); if (r.error) log("activarCapsula", r.error); } catch (e) { log("activarCapsula", e); }
  },
  escuchar: (sala, alCambiar, alEstado) => escucharSala(sala.id, alCambiar, alEstado),
  vigilarPantalla: (sala, soyPantalla, alEstado) => vigilarPantalla(sala.id, soyPantalla, alEstado),
};

// ---------- Respaldo local (sin servidor): la sala vive en este navegador y se comparte entre pestañas ----------
interface PartidaLocal extends PartidaPub { privados: Record<string, Record<string, unknown>>; acciones: FilaAccion[] }
interface SalaLocal { sala: SalaV; cerrada: boolean; miembros: { id: string; nombre: string; listo: boolean }[]; partidas: PartidaLocal[] }
const CLAVE = "alv.demo.v1";
const leer = (): Record<string, SalaLocal> => { try { return JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Record<string, SalaLocal>; } catch { return {}; } };
const oyentes = new Set<() => void>();
const radio = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("alv-demo") : null;
if (radio) radio.onmessage = () => oyentes.forEach(f => f());
function guardar(todo: Record<string, SalaLocal>) {
  try { localStorage.setItem(CLAVE, JSON.stringify(todo)); } catch { /* sin espacio */ }
  radio?.postMessage(1);
  oyentes.forEach(f => f());
}
/** Quién soy en el respaldo local: lo fija la sesión de demostración. */
export const yoLocal = { id: "", nombre: "" };
const porPartida = (todo: Record<string, SalaLocal>, id: string) => {
  for (const s of Object.values(todo)) { const p = s.partidas.find(x => x.id === id); if (p) return p; }
  return undefined;
};
const cambiar = (f: (todo: Record<string, SalaLocal>) => void) => { const todo = leer(); f(todo); guardar(todo); };
const azarCodigo = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

const local: Enlace = {
  async abrir(modo) {
    const sala: SalaV = { id: "sala-" + azarCodigo(), codigo: azarCodigo(), modo, anfitrionId: yoLocal.id };
    cambiar(t => { t[sala.codigo] = { sala, cerrada: false, miembros: [{ id: yoLocal.id, nombre: yoLocal.nombre, listo: false }], partidas: [] }; });
    return sala;
  },
  async unirse(codigo) {
    const c = codigo.trim().toUpperCase();
    const s = leer()[c];
    if (!CODIGO.test(c) || !s || s.cerrada) return "No encontramos esa sala o ya se cerró.";
    if (!s.miembros.some(m => m.id === yoLocal.id)) {
      if (s.miembros.length >= 8) return "La sala está llena (8).";
      cambiar(t => { t[c]!.miembros.push({ id: yoLocal.id, nombre: yoLocal.nombre, listo: false }); });
    }
    return s.sala;
  },
  async miSala() { return Object.values(leer()).reverse().find(s => !s.cerrada && s.miembros.some(m => m.id === yoLocal.id))?.sala ?? null; },
  async miembros(sala) {
    const s = leer()[sala.codigo];
    if (!s || s.cerrada) return null;
    return s.miembros.map(m => ({ ...m, figura: null, anfitrion: m.id === s.sala.anfitrionId }));
  },
  async marcarListo(sala, listo) { cambiar(t => { const m = t[sala.codigo]?.miembros.find(x => x.id === yoLocal.id); if (m) m.listo = listo; }); },
  async salir(sala) { cambiar(t => { const s = t[sala.codigo]; if (s) s.miembros = s.miembros.filter(m => m.id !== yoLocal.id); }); },
  async cerrar(sala) { cambiar(t => { const s = t[sala.codigo]; if (s) s.cerrada = true; }); },
  async partida(sala) {
    const p = leer()[sala.codigo]?.partidas.at(-1);
    return p ? { id: p.id, juego: p.juego, version: p.version, estado: p.estado, terminada: p.terminada } : null;
  },
  async secreto(partida) { return porPartida(leer(), partida)?.privados[yoLocal.id] ?? null; },
  async crearPartida(sala, juego) {
    const id = "partida-" + Date.now().toString(36) + azarCodigo();
    cambiar(t => { const s = t[sala.codigo]; if (!s) return; s.partidas.forEach(p => { p.terminada = true; }); s.partidas = [...s.partidas.slice(-2), { id, juego, version: 1, estado: {}, terminada: false, privados: {}, acciones: [] }]; });
    return id;
  },
  async enviar(partida, id, tipo, datos) {
    let ok = false;
    cambiar(t => { const p = porPartida(t, partida); if (!p || p.terminada) return; ok = true; if (!p.acciones.some(a => a.id === id)) p.acciones.push({ id, jugador: yoLocal.id, tipo, datos, creada: new Date().toISOString() }); });
    return ok;
  },
  async acciones(partida) { return porPartida(leer(), partida)?.acciones ?? []; },
  async publicar(partida, version, estado, privados) {
    cambiar(t => { const p = porPartida(t, partida); if (!p || p.version > version) return; p.version = version; p.estado = estado as Record<string, unknown>; p.privados = privados as PartidaLocal["privados"]; });
  },
  async terminar(partida) { cambiar(t => { const p = porPartida(t, partida); if (p) p.terminada = true; }); },
  async darXp() { return true; },
  async activarCapsula() { /* sin servidor no hay cápsulas en la nube */ },
  escuchar(_sala, alCambiar, alEstado) {
    oyentes.add(alCambiar); alEstado?.("vivo"); queueMicrotask(alCambiar);
    return () => { oyentes.delete(alCambiar); };
  },
  /** Sin servidor no hay presencia: no se sabe y no se avisa. */
  vigilarPantalla: () => () => { /* nada */ },
};

export const enlace: Enlace = hayNube ? nube : local;
/** Dirección que el QR abre: deja a la persona dentro de la sala. */
export const enlaceSala = (codigo: string) => `${location.origin}${location.pathname}#/s/${codigo}`;
