// Enlace con la sala: lo único que usan las pantallas de sala y partida para hablar con el servidor.
// Con Supabase configurado usa la nube; sin él (desarrollo o demostración) usa un respaldo local que
// comparte la sala entre pestañas del mismo navegador, para probar TV + celulares sin cuentas.
import type { FiguraV2 } from "../content/personaje";
import { desdeBase } from "../personajes/integracion";
import { cliente, hayNube, uidActual } from "./cliente";
import { anunciarLobby, buscarLobby, escucharSala, vigilarPantalla, type EstadoRed, type PresenciaPantalla } from "./tiempoReal";
import { vigilarPantallaSinNube } from "./difusion";
import { almacenFiesta, esFiesta } from "./fiesta";
import { NOMBRE_ESPEJO, sostenidos, type Espejo } from "./aparato";

export type ModoSala = "tv" | "mesa";
export interface SalaV { id: string; codigo: string; modo: ModoSala; anfitrionId: string }
/** Gestos del lobby (migración 010). Chocar y empujar llevan a otro miembro y todavía no se usan. */
export type Gesto = "saludar" | "bailar";
export const GESTOS: readonly Gesto[] = ["saludar", "bailar"];
export interface Miembro { id: string; nombre: string; figura: FiguraV2 | null; anfitrion: boolean; listo: boolean;
  /** Último gesto y su contador: cuando sube el contador, la figura lo hace. */
  gesto?: string | null; gestoN?: number }
export interface PartidaPub { id: string; juego: string; version: number; estado: Record<string, unknown>; terminada: boolean }
export type TipoFila = "contestar" | "carta" | "pista" | "control" | "comodin";
export interface FilaAccion { id: string; jugador: string; tipo: TipoFila; datos: Record<string, unknown>; creada: string }
/** `puntos` y `datos` van a `resultados_partida` (migración 040); el servidor recalcula lugar, Puntos ALV y MVP. */
export interface ResultadoFinal { jugador: string; rondas: number; retos: number; lugar: number; puntos?: number; datos?: Record<string, unknown> }
/** Ganadores de la noche para `guardar_copas` (040). */
export interface CopasParaGuardar {
  individual: { id: string; lugar: number; puntos: number }[];
  parejas?: { nombre: string; jugadores: string[]; puntos: number }[];
  equipos?: { nombre: string; jugadores: string[]; puntos: number }[];
  alversus?: { nombre: string; jugadores: string[]; puntos: number }[];
}

export interface Enlace {
  abrir(modo: ModoSala): Promise<SalaV | string>;
  unirse(codigo: string): Promise<SalaV | string>;
  /** La sala abierta más reciente en la que está la cuenta. */
  miSala(): Promise<SalaV | null>;
  miembros(sala: SalaV): Promise<Miembro[] | null>;
  marcarListo(sala: SalaV, listo: boolean): Promise<void>;
  gesto(sala: SalaV, g: Gesto): Promise<void>;
  salir(sala: SalaV): Promise<void>;
  cerrar(sala: SalaV): Promise<void>;
  partida(sala: SalaV): Promise<PartidaPub | null>;
  /** Lo público de los juegos terminados de la sala, del más viejo al más nuevo (para las copas de la noche). */
  historial(sala: SalaV): Promise<Record<string, unknown>[]>;
  secreto(partida: string): Promise<Record<string, unknown> | null>;
  crearPartida(sala: SalaV, juego: string): Promise<string | null>;
  enviar(partida: string, id: string, tipo: TipoFila, datos: Record<string, unknown>): Promise<boolean>;
  acciones(partida: string): Promise<FilaAccion[]>;
  /** true si quedó publicada (o ya había una más nueva); false si falló y hay que reintentar. */
  publicar(partida: string, version: number, estado: unknown, privados: Record<string, unknown>): Promise<boolean>;
  terminar(partida: string, juego: string, jugadores: number, resultados: ResultadoFinal[]): Promise<void>;
  /** Guarda los ganadores de la noche y termina la partida «copas» (sin XP ni monedas). */
  guardarCopas(partida: string, copas: CopasParaGuardar): Promise<void>;
  darXp(sala: SalaV, jugador: string, xp: number): Promise<boolean>;
  /** Comodín de la colección que el motor no aceptó: el servidor devuelve la copia o las monedas (solo el anfitrión, una vez). */
  devolverComodin(accion: string): Promise<void>;
  activarCapsula(n: number): Promise<void>;
  escuchar(sala: SalaV, alCambiar: () => void, alEstado?: (e: EstadoRed) => void): () => void;
  /** Dice si la Pantalla de la sala está conectada. Si `soyPantalla`, este aparato se anota como la Pantalla. */
  vigilarPantalla(sala: SalaV, soyPantalla: boolean, alEstado: (p: PresenciaPantalla) => void): () => void;
  /** El anfitrión anuncia su lobby abierto para que los demás entren sin código. */
  anunciarLobby(sala: SalaV): () => void;
  /** Código del lobby abierto que se está anunciando (null si no hay). */
  buscarLobby(alCodigo: (codigo: string | null) => void): () => void;
  /** Lobby abierto del administrador y cuántos hay dentro (038). undefined si el servidor aún no tiene la función. */
  lobbyAbierto(): Promise<{ codigo: string; miembros: number } | null | undefined>;
  /** El anfitrión saca a alguien del lobby (038). */
  expulsar(sala: SalaV, jugador: string): Promise<boolean>;
  /** El anfitrión marca «listo» a otro jugador (038). */
  listoDe(sala: SalaV, jugador: string, listo: boolean): Promise<boolean>;
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
      // La sala espejo de un aparato (053) no es un lobby al que se entre desde otro celular.
      const { data, error } = await cliente!.from("eventos").select("id, codigo, nombre, anfitrion").eq("cerrado", false).neq("nombre", NOMBRE_ESPEJO).order("inicia", { ascending: false }).limit(1);
      const e = data?.[0];
      return error || !e ? null : { id: e.id, codigo: e.codigo, modo: MODOS[e.nombre as string] ?? "mesa", anfitrionId: e.anfitrion };
    } catch (e) { log("miSala", e); return null; }
  },
  async miembros(sala) {
    try {
      const ev = await cliente!.from("eventos").select("anfitrion, cerrado").eq("id", sala.id).maybeSingle();
      if (ev.error) return [];
      if (!ev.data || ev.data.cerrado) return null;
      const m = await cliente!.from("miembros_evento").select("jugador, unido, listo, gesto, gesto_n").eq("evento", sala.id).order("unido");
      const ids = (m.data ?? []).map(x => x.jugador as string);
      if (m.error || !ids.length) return [];
      const [perf, figs] = await Promise.all([
        cliente!.from("perfiles").select("id, nombre").in("id", ids),
        cliente!.from("figuras_jugador").select("jugador, figura").eq("activa", true).in("jugador", ids),
      ]);
      const nombre = new Map((perf.data ?? []).map(x => [x.id as string, x.nombre as string]));
      const figura = new Map((figs.data ?? []).map(x => [x.jugador as string, desdeBase(x.figura) as FiguraV2 | null])); // frontera v3 (fase 5)
      return (m.data ?? []).map(x => ({
        id: x.jugador as string, nombre: nombre.get(x.jugador as string) ?? "Jugador", figura: figura.get(x.jugador as string) ?? null,
        anfitrion: x.jugador === ev.data!.anfitrion, listo: !!x.listo,
        gesto: (x.gesto as string | null) ?? null, gestoN: Number(x.gesto_n ?? 0),
      }));
    } catch (e) { log("miembros", e); return []; }
  },
  async marcarListo(sala, listo) {
    try { const r = await cliente!.rpc("marcar_en_sala", { p_evento: sala.id, p_listo: listo, p_gesto: null, p_a: null }); if (r.error) log("marcarListo", r.error); } catch (e) { log("marcarListo", e); }
  },
  async gesto(sala, g) {
    if (!GESTOS.includes(g)) return;
    try { const r = await cliente!.rpc("marcar_en_sala", { p_evento: sala.id, p_listo: null, p_gesto: g, p_a: null }); if (r.error) log("gesto", r.error); } catch (e) { log("gesto", e); }
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
  async historial(sala) {
    try {
      const { data, error } = await cliente!.from("partidas").select("estado_publico").eq("evento", sala.id).not("terminada", "is", null).order("creada", { ascending: true }).limit(200);
      if (error) { log("historial", error); return []; }
      return (data ?? []).map(p => (p.estado_publico ?? {}) as Record<string, unknown>);
    } catch (e) { log("historial", e); return []; }
  },
  async secreto(partida) {
    try {
      // Si el celular del anfitrión lo tiene un personaje que juega aquí, su secreto se lee con SU sesión.
      const otro = sostenidos.enMano(), c = (otro && sostenidos.cliente(otro)) || cliente!;
      const uid = otro && c !== cliente ? otro : await uidActual();
      const { data, error } = await c.from("datos_privados").select("datos").eq("partida", partida).eq("jugador", uid ?? "").maybeSingle();
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
      // Jugada de un personaje que juega en este celular: va con su sesión. El control siempre es del anfitrión.
      const otro = tipo === "control" ? "" : sostenidos.enMano(), c = (otro && sostenidos.cliente(otro)) || cliente!;
      const uid = otro && c !== cliente ? otro : await uidActual();
      if (!uid) return false;
      const r = await c.from("acciones").insert({ id, partida, jugador: uid, tipo, datos });
      if (!r.error || r.error.code === "23505") return true;
      if (esFalta(r.error) && (tipo === "control" || tipo === "pista")) {
        // Servidor sin la migración 018: mismas acciones con un tipo que ya acepta. El motor revisa quién la manda.
        const v = await c.from("acciones").insert({ id, partida, jugador: uid, tipo: "carta", datos: { ...datos, _tipo: tipo } });
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
    try { const r = await cliente!.rpc("publicar_partida", { p_partida: partida, p_version: version, p_estado: estado, p_privados: privados }); if (r.error) { log("publicar", r.error); return false; } return true; } catch (e) { log("publicar", e); return false; }
  },
  async terminar(partida, juego, jugadores, resultados) {
    try { const r = await cliente!.rpc("terminar_partida_sala", { p_partida: partida, p_juego: juego, p_jugadores: jugadores, p_resultados: resultados }); if (r.error) log("terminar", r.error); } catch (e) { log("terminar", e); }
  },
  async guardarCopas(partida, copas) {
    try {
      const r = await cliente!.rpc("guardar_copas", { p_partida: partida, p_copas: copas });
      if (r.error && !esFalta(r.error)) log("guardarCopas", r.error);
    } catch (e) { log("guardarCopas", e); }
  },
  async devolverComodin(accion) {
    try { const r = await cliente!.rpc("devolver_comodin", { p_accion: accion }); if (r.error) log("devolverComodin", r.error); } catch (e) { log("devolverComodin", e); }
  },
  async darXp(sala, jugador, xp) {
    try { const r = await cliente!.rpc("dar_xp_reto", { p_evento: sala.id, p_jugador: jugador, p_xp: xp }); if (r.error) log("darXp", r.error); return !r.error; } catch (e) { log("darXp", e); return false; }
  },
  async activarCapsula(n) {
    try { const r = await cliente!.rpc("activar_capsula", { p_capsula: n }); if (r.error) log("activarCapsula", r.error); } catch (e) { log("activarCapsula", e); }
  },
  escuchar: (sala, alCambiar, alEstado) => escucharSala(sala.id, alCambiar, alEstado),
  vigilarPantalla: (sala, soyPantalla, alEstado) => vigilarPantalla(sala.id, soyPantalla, alEstado),
  anunciarLobby: sala => anunciarLobby(sala.codigo),
  buscarLobby,
  async lobbyAbierto() {
    try {
      const { data, error } = await cliente!.rpc("lobby_abierto");
      if (error) { if (!esFalta(error)) log("lobbyAbierto", error); return esFalta(error) ? undefined : null; }
      const f = (data as { codigo: string; miembros: number }[] | null)?.[0];
      return f ? { codigo: f.codigo, miembros: Number(f.miembros) || 0 } : null;
    } catch (e) { log("lobbyAbierto", e); return undefined; }
  },
  async expulsar(sala, jugador) {
    try { const r = await cliente!.rpc("expulsar_de_sala", { p_evento: sala.id, p_jugador: jugador }); if (r.error) log("expulsar", r.error); return !r.error; } catch (e) { log("expulsar", e); return false; }
  },
  async listoDe(sala, jugador, listo) {
    try { const r = await cliente!.rpc("marcar_listo_de", { p_evento: sala.id, p_jugador: jugador, p_listo: listo }); if (r.error) log("listoDe", r.error); return !r.error; } catch (e) { log("listoDe", e); return false; }
  },
};

// ---------- Respaldo local (sin servidor): la sala vive en este navegador ----------
// Dos usos con el mismo código: la DEMOSTRACIÓN (sin Supabase; se comparte entre pestañas) y el MODO LOCAL
// (Elías, 22 nov: un solo teléfono, personajes sin cuenta, nada se guarda en la nube; dura hasta «Terminar sesión»).
interface PartidaLocal extends PartidaPub { privados: Record<string, Record<string, unknown>>; acciones: FilaAccion[] }
export interface MiembroLocal { id: string; nombre: string; listo: boolean; gesto?: string | null; gestoN?: number; figura?: FiguraV2 | null; genero?: "mujer" | "hombre" | "otro";
  /** 053: cuenta real que juega en este aparato (su id es el de la cuenta y gana sus puntos). */
  cuenta?: "registrada" | "rapida" }
/** `nube`: la sala espejo de la nube (053) donde están las cuentas, para que el servidor les dé sus puntos. */
interface SalaLocal { sala: SalaV; cerrada: boolean; miembros: MiembroLocal[]; partidas: PartidaLocal[]; nube?: Espejo | null }
/** Quién soy en el respaldo local: lo fija la sesión de demostración. */
export const yoLocal = { id: "", nombre: "" };
const azarCodigo = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

interface Respaldo extends Enlace {
  leer(): Record<string, SalaLocal>;
  cambiar(f: (todo: Record<string, SalaLocal>) => void): void;
}
/**
 * `quien`: la persona que juega en este aparato (en la demostración, la sesión; en Local, el jugador que tiene el
 * teléfono). Las acciones de control siempre salen a nombre del anfitrión, que es quien tiene el control de la partida.
 */
function crearRespaldo(clave: string, canal: string | null, quien: () => { id: string; nombre: string }, prefijo: string, enLaptop = false): Respaldo {
  const oyentes = new Set<() => void>();
  let leer: () => Record<string, SalaLocal>, cambiar: (f: (todo: Record<string, SalaLocal>) => void) => void;
  if (enLaptop) {
    // Modo Fiesta: la copia vive en la laptop y se reparte a todos los aparatos de su red (fiesta.ts).
    leer = () => almacenFiesta.leer() as Record<string, SalaLocal>;
    cambiar = f => almacenFiesta.cambiar(t => f(t as Record<string, SalaLocal>));
    almacenFiesta.oir(() => oyentes.forEach(f => f()));
  } else {
    leer = () => { try { return JSON.parse(localStorage.getItem(clave) ?? "{}") as Record<string, SalaLocal>; } catch { return {}; } };
    const radio = canal && typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(canal) : null;
    if (radio) radio.onmessage = () => oyentes.forEach(f => f());
    const guardar = (todo: Record<string, SalaLocal>) => {
      try { localStorage.setItem(clave, JSON.stringify(todo)); } catch { /* sin espacio */ }
      radio?.postMessage(1);
      oyentes.forEach(f => f());
    };
    cambiar = f => { const todo = leer(); f(todo); guardar(todo); };
  }
  const porPartida = (todo: Record<string, SalaLocal>, id: string) => {
    for (const s of Object.values(todo)) { const p = s.partidas.find(x => x.id === id); if (p) return { p, s }; }
    return undefined;
  };
  return {
    leer, cambiar,
    async abrir(modo) {
      const yo = quien();
      const sala: SalaV = { id: prefijo + "sala-" + azarCodigo(), codigo: azarCodigo(), modo, anfitrionId: yo.id };
      cambiar(t => { t[sala.codigo] = { sala, cerrada: false, miembros: [{ id: yo.id, nombre: yo.nombre, listo: false }], partidas: [] }; });
      return sala;
    },
    async unirse(codigo) {
      const c = codigo.trim().toUpperCase(), yo = quien();
      const s = leer()[c];
      if (!CODIGO.test(c) || !s || s.cerrada) return "No encontramos esa sala o ya se cerró.";
      if (!s.miembros.some(m => m.id === yo.id)) {
        if (s.miembros.length >= 8) return "La sala está llena (8).";
        cambiar(t => { t[c]!.miembros.push({ id: yo.id, nombre: yo.nombre, listo: false }); });
      }
      return s.sala;
    },
    async miSala() { const yo = quien(); return Object.values(leer()).reverse().find(s => !s.cerrada && s.miembros.some(m => m.id === yo.id))?.sala ?? null; },
    async miembros(sala) {
      const s = leer()[sala.codigo];
      if (!s || s.cerrada) return null;
      return s.miembros.map(m => ({ id: m.id, nombre: m.nombre, listo: m.listo, gesto: m.gesto, gestoN: m.gestoN, figura: m.figura ?? null, anfitrion: m.id === s.sala.anfitrionId }));
    },
    async marcarListo(sala, listo) { const yo = quien(); cambiar(t => { const m = t[sala.codigo]?.miembros.find(x => x.id === yo.id); if (m) m.listo = listo; }); },
    async gesto(sala, g) { const yo = quien(); cambiar(t => { const m = t[sala.codigo]?.miembros.find(x => x.id === yo.id); if (m && GESTOS.includes(g)) { m.gesto = g; m.gestoN = (m.gestoN ?? 0) + 1; } }); },
    async salir(sala) { const yo = quien(); cambiar(t => { const s = t[sala.codigo]; if (s) s.miembros = s.miembros.filter(m => m.id !== yo.id); }); },
    async cerrar(sala) { cambiar(t => { const s = t[sala.codigo]; if (s) s.cerrada = true; }); },
    async partida(sala) {
      const p = leer()[sala.codigo]?.partidas.at(-1);
      return p ? { id: p.id, juego: p.juego, version: p.version, estado: p.estado, terminada: p.terminada } : null;
    },
    async secreto(partida) { return porPartida(leer(), partida)?.p.privados[quien().id] ?? null; },
    async historial(sala) { return (leer()[sala.codigo]?.partidas ?? []).filter(p => p.terminada).map(p => p.estado); },
    async crearPartida(sala, juego) {
      const id = prefijo + "partida-" + Date.now().toString(36) + azarCodigo();
      cambiar(t => { const s = t[sala.codigo]; if (!s) return; s.partidas.forEach(p => { p.terminada = true; }); s.partidas = [...s.partidas.slice(-30), { id, juego, version: 1, estado: {}, terminada: false, privados: {}, acciones: [] }]; });
      return id;
    },
    async enviar(partida, id, tipo, datos) {
      let ok = false;
      cambiar(t => {
        const x = porPartida(t, partida); if (!x || x.p.terminada) return; ok = true;
        const jugador = tipo === "control" ? x.s.sala.anfitrionId : quien().id;
        if (!x.p.acciones.some(a => a.id === id)) x.p.acciones.push({ id, jugador, tipo, datos, creada: new Date().toISOString() });
      });
      return ok;
    },
    async acciones(partida) { return porPartida(leer(), partida)?.p.acciones ?? []; },
    async publicar(partida, version, estado, privados) {
      cambiar(t => { const x = porPartida(t, partida); if (!x || x.p.version > version) return; x.p.version = version; x.p.estado = estado as Record<string, unknown>; x.p.privados = privados as PartidaLocal["privados"]; });
      return true;
    },
    async terminar(partida) { cambiar(t => { const x = porPartida(t, partida); if (x) x.p.terminada = true; }); },
    async guardarCopas() { /* sin servidor las copas solo se ven en la ceremonia */ },
    async darXp() { return true; },
    async devolverComodin() { /* sin servidor no hay colección en la nube que devolver */ },
    async activarCapsula() { /* sin servidor no hay cápsulas en la nube */ },
    escuchar(_sala, alCambiar, alEstado) {
      oyentes.add(alCambiar); alEstado?.("vivo"); queueMicrotask(alCambiar);
      return () => { oyentes.delete(alCambiar); };
    },
    /** Sin servidor: latido entre pestañas del mismo navegador (demostración y Local en el mismo aparato). */
    vigilarPantalla: (sala, soyPantalla, alEstado) => vigilarPantallaSinNube(sala.id, soyPantalla, alEstado),
    /** Sin servidor el anuncio es la misma lista del navegador: el lobby abierto más reciente. */
    anunciarLobby: () => () => { /* nada */ },
    buscarLobby(alCodigo) {
      const f = () => alCodigo(Object.values(leer()).reverse().find(s => !s.cerrada)?.sala.codigo ?? null);
      oyentes.add(f); queueMicrotask(f);
      return () => { oyentes.delete(f); };
    },
    async lobbyAbierto() {
      const s = Object.values(leer()).reverse().find(x => !x.cerrada);
      return s ? { codigo: s.sala.codigo, miembros: s.miembros.length } : null;
    },
    async expulsar(sala, jugador) {
      let ok = false;
      const yo = quien();
      cambiar(t => { const s = t[sala.codigo]; if (s && s.sala.anfitrionId === yo.id && jugador !== yo.id) { s.miembros = s.miembros.filter(m => m.id !== jugador); ok = true; } });
      return ok;
    },
    async listoDe(sala, jugador, listo) {
      let ok = false;
      const yo = quien();
      cambiar(t => { const s = t[sala.codigo]; const m = s?.miembros.find(x => x.id === jugador); if (s && m && s.sala.anfitrionId === yo.id) { m.listo = listo; ok = true; } });
      return ok;
    },
  };
}

const demo = crearRespaldo("alv.demo.v1", "alv-demo", () => yoLocal, "", esFiesta);

/** Sin nube (demostración y Modo Fiesta): la figura activa de este aparato se copia a sus lugares en las salas abiertas, para
 *  que los demás aparatos la vean (con nube la figura viaja desde la base). Solo escribe si cambió. */
export function figuraEnSalasSinNube(jugador: string, figura: FiguraV2 | null) {
  if (hayNube || !jugador) return;
  const igual = (m: MiembroLocal) => JSON.stringify(m.figura ?? null) === JSON.stringify(figura ?? null);
  const falta = Object.values(demo.leer()).some(s => !s.cerrada && s.miembros.some(m => m.id === jugador && !igual(m)));
  if (falta) demo.cambiar(t => { for (const s of Object.values(t)) if (!s.cerrada) for (const m of s.miembros) if (m.id === jugador && !igual(m)) m.figura = figura; });
}

// ---------- Modo Local (un solo teléfono) ----------
// La sala y sus personajes viven en el localStorage de este teléfono (clave «alv.local.v1»): sobreviven a una recarga y
// se borran con «Terminar sesión». Nada llega a Supabase: ni miembros, ni partidas, ni XP, ni monedas. Sus ids llevan
// el prefijo «loc-», así el enlace sabe que van aquí y no a la nube.
export const PREFIJO_LOCAL = "loc-";
const anfitrionLocal = { id: "", nombre: "" };
/** Jugador que tiene el teléfono en este momento (el que contesta). Vacío = el anfitrión. */
let activoLocal = "";
const quienLocal = () => {
  if (!activoLocal) return anfitrionLocal;
  for (const s of Object.values(localApp.leer())) { const m = s.miembros.find(x => x.id === activoLocal); if (m) return { id: m.id, nombre: m.nombre }; }
  return anfitrionLocal;
};
const localApp = crearRespaldo("alv.local.v1", null, quienLocal, PREFIJO_LOCAL);
export const esLocal = (id: string | null | undefined) => !!id && id.startsWith(PREFIJO_LOCAL);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** La sala espejo como sala de la nube (para crear la partida y reportar el podio). */
const salaEspejo = (s: SalaLocal): SalaV | null => (s.nube ? { id: s.nube.id, codigo: s.nube.codigo, modo: "mesa", anfitrionId: s.sala.anfitrionId } : null);
const salaLocalDePartida = (partida: string) => Object.values(localApp.leer()).find(s => s.partidas.some(p => p.id === partida)) ?? null;

/**
 * 053: al terminar una partida local, el podio de las cuentas va a la nube. El anfitrión crea la partida en la sala espejo y
 * la termina con terminar_partida_sala: el servidor calcula la XP y las monedas y solo se las da a quien es miembro.
 * Los personajes sin cuenta no cuentan para XP, pero sí para el número de jugadores (los lugares no cambian).
 */
async function terminarEnNube(partida: string, juego: string, jugadores: number, resultados: ResultadoFinal[]) {
  if (!hayNube) return;
  const s = salaLocalDePartida(partida), espejo = s && salaEspejo(s);
  if (!espejo || juego === "copas") return;
  const deCuentas = resultados.filter(r => UUID.test(r.jugador));
  if (!deCuentas.length) return;
  const id = await nube.crearPartida(espejo, juego);
  if (id) await nube.terminar(id, juego, jugadores, deCuentas);
}

export const modoLocal = {
  /** El lobby local abierto de este teléfono (o null). */
  abierto(): SalaV | null { return Object.values(localApp.leer()).reverse().find(s => !s.cerrada)?.sala ?? null; },
  /** Abre el lobby local con el anfitrión (cuenta abierta o demostración) como P1. */
  abrir(anfitrion: { id: string; nombre: string; figura: FiguraV2 | null }): SalaV {
    const ya = modoLocal.abierto(); if (ya) return ya;
    anfitrionLocal.id = anfitrion.id; anfitrionLocal.nombre = anfitrion.nombre; activoLocal = "";
    const sala: SalaV = { id: PREFIJO_LOCAL + "sala-" + azarCodigo(), codigo: azarCodigo(), modo: "mesa", anfitrionId: anfitrion.id };
    localApp.cambiar(t => { t[sala.codigo] = { sala, cerrada: false, miembros: [{ id: anfitrion.id, nombre: anfitrion.nombre, listo: false, figura: anfitrion.figura }], partidas: [] }; });
    return sala;
  },
  /** Agrega un personaje sin cuenta (máximo 8 en la sala). */
  agregar(sala: SalaV, p: { nombre: string; figura: FiguraV2 | null; genero?: MiembroLocal["genero"] }): string | null {
    const nombre = p.nombre.replace(/\s+/g, " ").trim().slice(0, 20);
    if (nombre.length < 2) return null;
    const id = PREFIJO_LOCAL + "j-" + azarCodigo().toLowerCase();
    let ok = false;
    localApp.cambiar(t => { const s = t[sala.codigo]; if (!s || s.miembros.length >= 8) return; s.miembros.push({ id, nombre, listo: true, figura: p.figura, genero: p.genero }); ok = true; });
    return ok ? id : null;
  },
  /** 053: agrega una cuenta real (registrada o personaje rápido) que ya entró a la sala espejo. */
  agregarCuenta(sala: SalaV, c: { id: string; nombre: string; figura: FiguraV2 | null; cuenta: "registrada" | "rapida"; genero?: MiembroLocal["genero"] }): boolean {
    let ok = false;
    localApp.cambiar(t => { const s = t[sala.codigo]; if (!s || s.miembros.length >= 8 || s.miembros.some(m => m.id === c.id)) return; s.miembros.push({ id: c.id, nombre: c.nombre.slice(0, 20), listo: true, figura: c.figura, cuenta: c.cuenta, ...(c.genero ? { genero: c.genero } : {}) }); ok = true; });
    return ok;
  },
  /** 053: la sala espejo de la nube de este lobby local (o null si no hay). */
  espejo(sala: SalaV): Espejo | null { return localApp.leer()[sala.codigo]?.nube ?? null; },
  fijarEspejo(sala: SalaV, e: Espejo) { localApp.cambiar(t => { const s = t[sala.codigo]; if (s) s.nube = e; }); },
  /** 053: ¿este miembro es una cuenta real? (el anfitrión con sesión también lo es). */
  esCuenta(id: string): boolean { return UUID.test(id); },
  /** Cambia la figura de un personaje (o la del anfitrión en esta sesión local). */
  figura(sala: SalaV, jugador: string, figura: FiguraV2 | null) { localApp.cambiar(t => { const m = t[sala.codigo]?.miembros.find(x => x.id === jugador); if (m) m.figura = figura; }); },
  generos(sala: SalaV): Record<string, "mujer" | "hombre" | "otro"> {
    const s = localApp.leer()[sala.codigo];
    return Object.fromEntries((s?.miembros ?? []).filter(m => m.genero).map(m => [m.id, m.genero!]));
  },
  /** El teléfono pasa a manos de `jugador` (o regresa al anfitrión con ""). */
  pasarA(jugador: string) { activoLocal = jugador; },
  activo(): string { return activoLocal || anfitrionLocal.id; },
  /** Termina la sesión local: borra la sala, los personajes y sus partidas de este teléfono. */
  terminar() { activoLocal = ""; try { localStorage.removeItem("alv.local.v1"); } catch { /* sin almacenamiento */ } },
  /** Recupera el anfitrión tras recargar la página (la sala sigue en localStorage). */
  recuperar(sala: SalaV) { if (!anfitrionLocal.id) { const s = localApp.leer()[sala.codigo]; const h = s?.miembros.find(m => m.id === sala.anfitrionId); if (h) { anfitrionLocal.id = h.id; anfitrionLocal.nombre = h.nombre; } } },
};

const base: Enlace = hayNube ? nube : demo;
const porSala = (sala: SalaV): Enlace => (esLocal(sala.id) ? localApp : base);
const porPartida = (partida: string): Enlace => (esLocal(partida) ? localApp : base);
/** El enlace que usa toda la app: las salas y partidas locales van al teléfono; el resto, a la nube (o la demostración). */
export const enlace: Enlace = {
  abrir: modo => base.abrir(modo),
  async unirse(codigo) {
    const c = codigo.trim().toUpperCase(), s = localApp.leer()[c];
    if (s && !s.cerrada) { modoLocal.recuperar(s.sala); return s.sala; }
    return base.unirse(codigo);
  },
  miSala: () => base.miSala(),
  miembros: sala => porSala(sala).miembros(sala),
  marcarListo: (sala, l) => porSala(sala).marcarListo(sala, l),
  gesto: (sala, g) => porSala(sala).gesto(sala, g),
  salir: sala => porSala(sala).salir(sala),
  cerrar: async sala => {
    // 053: al terminar la sesión local también se cierra su sala espejo: las cuentas del aparato quedan fuera.
    const espejo = esLocal(sala.id) && hayNube ? modoLocal.espejo(sala) : null;
    await porSala(sala).cerrar(sala);
    if (espejo) await nube.cerrar({ id: espejo.id, codigo: espejo.codigo, modo: "mesa", anfitrionId: sala.anfitrionId });
    if (esLocal(sala.id)) modoLocal.terminar();
    // Las sesiones que este aparato guardaba (en línea o en un solo aparato) se cierran con la sala.
    await sostenidos.soltarTodos();
  },
  partida: sala => porSala(sala).partida(sala),
  historial: sala => porSala(sala).historial(sala),
  secreto: partida => porPartida(partida).secreto(partida),
  crearPartida: (sala, juego) => porSala(sala).crearPartida(sala, juego),
  enviar: (partida, id, tipo, datos) => porPartida(partida).enviar(partida, id, tipo, datos),
  acciones: partida => porPartida(partida).acciones(partida),
  publicar: (partida, v, e, p) => porPartida(partida).publicar(partida, v, e, p),
  terminar: async (partida, j, n, r) => {
    await porPartida(partida).terminar(partida, j, n, r);
    if (esLocal(partida)) await terminarEnNube(partida, j, n, r);
  },
  guardarCopas: (partida, c) => porPartida(partida).guardarCopas(partida, c),
  darXp: async (sala, j, x) => {
    // 053: en la sala local, la XP por reto en vivo de una cuenta va a la nube por su sala espejo.
    const espejo = esLocal(sala.id) && hayNube && UUID.test(j) ? modoLocal.espejo(sala) : null;
    if (espejo) return nube.darXp({ id: espejo.id, codigo: espejo.codigo, modo: "mesa", anfitrionId: sala.anfitrionId }, j, x);
    return porSala(sala).darXp(sala, j, x);
  },
  devolverComodin: accion => base.devolverComodin(accion),
  activarCapsula: n => base.activarCapsula(n),
  escuchar: (sala, f, e) => porSala(sala).escuchar(sala, f, e),
  vigilarPantalla: (sala, yo, f) => porSala(sala).vigilarPantalla(sala, yo, f),
  anunciarLobby: sala => porSala(sala).anunciarLobby(sala),
  buscarLobby: f => base.buscarLobby(f),
  lobbyAbierto: () => base.lobbyAbierto(),
  expulsar: async (sala, j) => {
    const ok = await porSala(sala).expulsar(sala, j);
    if (ok) await sostenidos.soltar(j);
    // 053: quitar a una cuenta del lobby local también la saca de la sala espejo (deja de ganar puntos aquí).
    const espejo = ok && esLocal(sala.id) && hayNube && UUID.test(j) ? modoLocal.espejo(sala) : null;
    if (espejo) await nube.expulsar({ id: espejo.id, codigo: espejo.codigo, modo: "mesa", anfitrionId: sala.anfitrionId }, j);
    return ok;
  },
  listoDe: (sala, j, l) => porSala(sala).listoDe(sala, j, l),
};
/** Dirección que el QR abre: deja a la persona dentro de la sala. */
export const enlaceSala = (codigo: string) => `${location.origin}${location.pathname}#/s/${codigo}`;
