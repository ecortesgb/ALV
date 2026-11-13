// Estado local del dispositivo: el grupo, sus personajes, XP, compras e historial.
// Hasta que lleguen las cuentas (paso 4) todo vive aquí; después el servidor es la fuente de verdad
// y estas mismas reglas (src/engine/economia.ts) las aplica la base de datos.
import { useSyncExternalStore } from "react";
import { nivelPorXp, saldos, puedeComprarAccesorio, puedeComprarCarta, XP_EXTRA, xpExtraValida, type Movimiento } from "../engine/economia";
import { abrirSobre, SOBRES, type CartaSobre, type Rareza, type TipoSobre } from "../engine/sobres";
import type { Azar } from "../engine/azar";
import { type Genero, type MiembroSala, type Registro, type Sala, comprarAccesorioNube, comprarSobreNube, cuentaActiva, leerCuenta, registrarPartidaNube, registrarXpExtraNube, type DatosCuenta } from "./nube";
import { idActual, migrarPersonaje, personajeInicial, piezaEquipo, TIENDA, cambioValido, type Personaje, type Zona } from "../content/personaje";
import type { EscenarioId, Intensidad } from "../engine/types";
import { EQUIPOS, puedePonerse, type AdornoEquipo } from "../content/equipos";

export interface JugadorLocal {
  id: string;
  /** Equipo o casa elegido (content/equipos.ts): color de su carta y frases. Se puede cambiar cuando quiera. */
  equipo?: string;
  /** Jugador que entró desde su propio celular con su cuenta. Su nombre y personaje vienen del servidor. */
  remoto?: boolean;
  nombre: string;
  personaje: Personaje;
  movimientos: Movimiento[];
  tiene: string[];
  /** Artículos recién comprados o sacados de un sobre que todavía no ha visto. */
  nuevos?: string[];
}

/** `extra` marca la XP que dio el administrador fuera de un juego; lleva el motivo. */
export interface Partida { fecha: string; juego: string; resultados: { id?: string; nombre: string; puntos: number; xp: number }[]; extra?: string }

export type Modalidad = "individual" | "parejas" | "equipos" | "sexos";
export type ModoJuego = "local" | "linea" | "fisico";

/** Neón sofisticado (por defecto) o Midnight Lounge, como alternativa para comparar en pantalla. */
export type Paleta = "neon" | "lounge";

export interface EstadoLocal {
  version: 2;
  jugadores: JugadorLocal[];
  enParejas: boolean;
  eventoId: string;
  ajustes: { escenario: EscenarioId; intensidad: Intensidad; adulto: boolean; drunk: boolean; paleta?: Paleta;
    /** Rondas por partida y segundos para responder (Ajustes). */
    rondas?: number; segundos?: number;
    /** Cómo se elige el turno en los juegos de cartas por turno. */
    turno?: "orden" | "ruleta";
    /** Modo elegido en la pantalla de modos: local (un celular), en línea (cuentas reales) o físico. */
    modo?: ModoJuego };
  historial: Partida[];
  /** Jugador de este celular con cuenta abierta: su saldo y su inventario vienen del servidor. */
  cuenta?: { jugador: string; acumulada: number; disponible: number; delEvento: number };
  /** Fecha de nacimiento y género de la cuenta abierta (se vuelven a leer del servidor en cada visita). */
  registro?: Registro;
  /** Cómo se juega la partida: cada quien, en parejas elegidas, en equipos o guerra de sexos. */
  modalidad?: Modalidad;
  /** Parejas elegidas a mano (las dos direcciones). Si falta alguna, se usa el orden 1.º con 2.º… */
  parejas?: Record<string, string>;
  /** Equipo de cada jugador en la modalidad equipos. */
  equipos?: Record<string, string>;
  /** Género puesto a mano para quien juega en este celular sin cuenta (guerra de sexos). */
  generosLocales?: Record<string, Genero>;
  /** Género de las cuentas de la sala (lo da el servidor solo a los de la misma sala). */
  generosSala?: Record<string, Genero>;
  /** Sala en línea abierta en este celular (como anfitrión o como invitado). */
  sala?: Sala;
  /** Quién está en la sala, según el servidor. */
  miembros?: MiembroSala[];
}

const CLAVE = "alv-local-v2";
const NOMBRES = ["Tú", "Jugador 2", "Jugador 3", "Jugador 4", "Jugador 5", "Jugador 6", "Jugador 7", "Jugador 8"];
const nuevoEvento = () => `local-${Date.now().toString(36)}`;
const nuevoJugador = (i: number): JugadorLocal => ({ id: `j${Date.now().toString(36)}${i}`, nombre: NOMBRES[i] ?? `Jugador ${i + 1}`, personaje: personajeInicial(i), movimientos: [], tiene: [] });

function inicial(): EstadoLocal {
  return {
    version: 2,
    jugadores: [0, 1, 2, 3].map(nuevoJugador),
    enParejas: true,
    eventoId: nuevoEvento(),
    ajustes: { escenario: "alverca", intensidad: 2, adulto: false, drunk: false },
    historial: [],
  };
}

function leer(): EstadoLocal {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as EstadoLocal | null;
    if (s && s.version === 2 && Array.isArray(s.jugadores) && s.jugadores.length >= 2) {
      // La cuenta se vuelve a leer del servidor en cada visita: no se confía en la copia guardada.
      return { ...s, cuenta: undefined, registro: undefined, sala: undefined, miembros: undefined, jugadores: s.jugadores.map(j => ({ ...j, personaje: migrarPersonaje(j.personaje), tiene: (j.tiene ?? []).map(idActual) })) };
    }
  } catch { /* sin almacenamiento: se usa el inicial */ }
  return inicial();
}

let estado: EstadoLocal = leer();
const oyentes = new Set<() => void>();
function guardar(nuevo: EstadoLocal) {
  estado = nuevo;
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* modo privado: sigue en memoria */ }
  oyentes.forEach(f => f());
}

export function useEstado(): EstadoLocal {
  return useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => estado);
}

const cambiaJugador = (id: string, f: (j: JugadorLocal) => JugadorLocal) =>
  guardar({ ...estado, jugadores: estado.jugadores.map(j => (j.id === id ? f(j) : j)) });

export const saldosDe = (j: JugadorLocal) => {
  const c = estado.cuenta;
  if (c && c.jugador === j.id) return { acumulada: c.acumulada, disponible: c.disponible, delEvento: c.delEvento };
  return saldos(j.movimientos, estado.eventoId);
};
/** El jugador tiene la cuenta abierta en este celular: compras y XP van al servidor. */
export const esCuenta = (id: string) => !!cuentaActiva() && estado.cuenta?.jugador === id;

/** Vuelve a leer saldo e inventario del servidor y los deja en el jugador de la cuenta. */
export async function refrescarCuenta(): Promise<void> {
  const id = estado.cuenta?.jugador;
  if (!id) return;
  const d = await leerCuenta();
  if (d) acciones.sincronizarCuenta(id, d);
}

/** Pareja según el orden: 1.º con 2.º, 3.º con 4.º… */
export function parejaDe(i: number, s: EstadoLocal = estado): string | undefined {
  const id = s.jugadores[i]?.id;
  if (s.modalidad && s.modalidad !== "parejas") return undefined;
  if (s.modalidad === "parejas" && id && s.parejas?.[id] && s.jugadores.some(j => j.id === s.parejas![id])) return s.parejas[id];
  if (!s.enParejas && s.modalidad !== "parejas") return undefined;
  const otro = i % 2 === 0 ? i + 1 : i - 1;
  return s.jugadores[otro]?.id;
}

export const acciones = {
  /** Deja el saldo y el inventario de la cuenta en este jugador. Quita lo puesto que la cuenta no tiene. */
  sincronizarCuenta(id: string, d: DatosCuenta) {
    if (!estado.jugadores.some(x => x.id === id)) return;
    const tiene = d.tiene.map(idActual);
    guardar({
      ...estado,
      cuenta: { jugador: id, acumulada: d.acumulada, disponible: d.disponible, delEvento: d.delEvento },
      jugadores: estado.jugadores.map(x => x.id !== id ? x : {
        ...x, tiene,
        personaje: { ...x.personaje, puesto: Object.fromEntries(Object.entries(x.personaje.puesto ?? {}).map(([z, v]) => [z, v && tiene.includes(v) ? v : null])) },
      }),
    });
  },
  /** Al salir de la cuenta, el jugador vuelve a usar su saldo de este celular. */
  registro(r: Registro | undefined) { guardar({ ...estado, registro: r }); },
  olvidarCuenta() { if (estado.cuenta || estado.sala || estado.registro) guardar({ ...estado, cuenta: undefined, registro: undefined, sala: undefined, miembros: undefined, jugadores: estado.jugadores.filter(j => !j.remoto) }); },
  /** Entra o sale de una sala. Al salir se quitan del grupo los jugadores que venían de otros celulares. */
  sala(sala: Sala | undefined) {
    guardar({ ...estado, sala, miembros: sala ? estado.miembros : undefined, jugadores: sala ? estado.jugadores : estado.jugadores.filter(j => !j.remoto) });
  },
  /**
   * Pone en el grupo a quienes entraron desde su celular (solo en la pantalla del anfitrión).
   * El anfitrión mismo ya es el jugador de la cuenta. Nunca se pasa de 8.
   */
  miembrosSala(miembros: MiembroSala[]) {
    const locales = estado.jugadores.filter(j => !j.remoto);
    let remotos: JugadorLocal[] = [];
    if (estado.sala?.anfitrion) {
      remotos = miembros.filter(m => !m.anfitrion).map((m, i) => {
        const id = `c-${m.id}`;
        const antes = estado.jugadores.find(j => j.id === id);
        return { id, remoto: true, nombre: m.nombre, personaje: m.personaje ? migrarPersonaje({ ...personajeInicial(i + 4), ...m.personaje }) : personajeInicial(i + 4), movimientos: antes?.movimientos ?? [], tiene: [] };
      }).slice(0, Math.max(0, 8 - locales.length));
    }
    guardar({ ...estado, miembros, jugadores: [...locales, ...remotos] });
  },
  /** Marca artículos como nuevos (los que llegan de la cuenta tras comprar). */
  marcarNuevos(id: string, ids: string[]) {
    if (!ids.length) return;
    cambiaJugador(id, j => ({ ...j, nuevos: [...new Set([...(j.nuevos ?? []), ...ids])] }));
  },
  /** Ya los vio: deja de resaltarlos. Sin lista, todos. */
  verNuevos(id: string, ids?: string[]) {
    cambiaJugador(id, j => ({ ...j, nuevos: ids ? (j.nuevos ?? []).filter(x => !ids.includes(x)) : [] }));
  },
  equipo(id: string, equipo: string | undefined) {
    if (equipo !== undefined && !EQUIPOS.some(e => e.id === equipo)) return;
    cambiaJugador(id, j => {
      const { equipo: _antes, ...resto } = j.personaje;
      // Las recompensas ya puestas se quedan al cambiar de equipo: se pintan con los colores del nuevo.
      const personaje = equipo ? { ...resto, equipo: { id: equipo, adornos: j.personaje.equipo?.adornos ?? [] } } : resto;
      return { ...j, equipo, personaje };
    });
  },
  /** Pone o quita lo de la mano de su equipo (varita, escudo…). Solo si es de ese equipo y tiene el nivel. */
  manoEquipo(id: string, pieza: string | undefined) {
    cambiaJugador(id, j => {
      const eq = j.personaje.equipo ?? (j.equipo ? { id: j.equipo } : undefined);
      if (!eq) return j;
      if (pieza) {
        const pe = piezaEquipo(pieza);
        if (!pe || pe.paso !== "mano" || pe.equipo !== eq.id || nivelPorXp(saldosDe(j).acumulada) < pe.nivel) return j;
      }
      return { ...j, personaje: { ...j.personaje, equipo: { ...eq, mano: pieza } } };
    });
  },
  /** Pone o quita una recompensa de equipo. Solo si ya llegó al nivel y tiene equipo. */
  adornoEquipo(id: string, adorno: AdornoEquipo, poner: boolean) {
    cambiaJugador(id, j => {
      const eq = j.personaje.equipo ?? (j.equipo ? { id: j.equipo } : undefined);
      if (!eq) return j;
      if (poner && !puedePonerse(adorno, nivelPorXp(saldosDe(j).acumulada), eq.id)) return j;
      const adornos = new Set(eq.adornos ?? []);
      if (poner) adornos.add(adorno); else adornos.delete(adorno);
      return { ...j, personaje: { ...j.personaje, equipo: { id: eq.id, adornos: [...adornos] } } };
    });
  },
  renombrar(id: string, nombre: string) {
    const limpio = nombre.replace(/\s+/g, " ").slice(0, 30);
    cambiaJugador(id, j => ({ ...j, nombre: limpio }));
  },
  agregar() {
    if (estado.jugadores.length >= 8) return;
    guardar({ ...estado, jugadores: [...estado.jugadores, nuevoJugador(estado.jugadores.length)] });
  },
  quitar(id: string) {
    if (estado.jugadores.length <= 2) return;
    guardar({ ...estado, jugadores: estado.jugadores.filter(j => j.id !== id) });
  },
  enParejas(v: boolean) { guardar({ ...estado, enParejas: v }); },
  modalidad(m: Modalidad) { guardar({ ...estado, modalidad: m, enParejas: m === "parejas" }); },
  /** Junta a dos como pareja; a quienes eran sus parejas los deja libres. */
  pareja(a: string, b: string) {
    if (a === b) return;
    const p = { ...(estado.parejas ?? {}) };
    for (const x of [a, b]) { const antes = p[x]; if (antes) delete p[antes]; delete p[x]; }
    p[a] = b; p[b] = a;
    guardar({ ...estado, parejas: p });
  },
  equipoPartida(id: string, equipo: string) { guardar({ ...estado, equipos: { ...(estado.equipos ?? {}), [id]: equipo } }); },
  repartirEquipos(equipos: Record<string, string>) { guardar({ ...estado, equipos }); },
  generoLocal(id: string, g: Genero) { guardar({ ...estado, generosLocales: { ...(estado.generosLocales ?? {}), [id]: g } }); },
  generosSala(g: Record<string, Genero>) { guardar({ ...estado, generosSala: g }); },
  ajustes(a: Partial<EstadoLocal["ajustes"]>) { guardar({ ...estado, ajustes: { ...estado.ajustes, ...a } }); },
  /** Reemplaza el personaje con el que está guardado en la cuenta. */
  personajeDeNube(id: string, p: Personaje) {
    if (!estado.jugadores.some(x => x.id === id)) return;
    cambiaJugador(id, x => ({ ...x, personaje: migrarPersonaje(p) }));
  },
  personaje(id: string, cambio: Partial<Personaje>) {
    const j = estado.jugadores.find(x => x.id === id);
    if (!j || !cambioValido(cambio, j.tiene)) return;
    cambiaJugador(id, x => ({ ...x, personaje: { ...x.personaje, ...cambio, puesto: { ...x.personaje.puesto, ...(cambio.puesto ?? {}) } } }));
  },
  /** Devuelve el motivo si no se pudo. */
  comprarAccesorio(id: string, articulo: string): string | null {
    const j = estado.jugadores.find(x => x.id === id);
    const art = TIENDA.find(a => a.id === articulo);
    if (!j || !art) return "Ese artículo no existe.";
    if (j.tiene.includes(art.id)) return "Ya lo tienes.";
    const r = puedeComprarAccesorio(saldosDe(j), art.precio, art.nivel);
    if (!r.ok) return r.motivo === "nivel" ? `Se desbloquea en el nivel ${art.nivel}.` : "No te alcanza la XP disponible.";
    cambiaJugador(id, x => ({
      ...x, tiene: [...x.tiene, art.id], nuevos: [...new Set([...(x.nuevos ?? []), art.id])],
      movimientos: [...x.movimientos, { tipo: "accesorio", xp: art.precio }],
      personaje: { ...x.personaje, puesto: { ...x.personaje.puesto, [art.zona]: art.id } },
    }));
    return null;
  },
  /** Abre un sobre: cobra la XP disponible y guarda las cartas. Devuelve las cartas o el motivo. */
  comprarSobre(id: string, tipo: TipoSobre, azar: Azar): { ok: true; cartas: CartaSobre[] } | { ok: false; motivo: string } {
    const j = estado.jugadores.find(x => x.id === id);
    const def = SOBRES.find(x => x.id === tipo);
    if (!j || !def) return { ok: false, motivo: "Ese sobre no existe." };
    const s = saldosDe(j), nivel = nivelPorXp(s.acumulada);
    const r = puedeComprarAccesorio(s, def.precio, def.nivel);
    if (!r.ok) return { ok: false, motivo: r.motivo === "nivel" ? `Se desbloquea en el nivel ${def.nivel}.` : "No te alcanza la XP disponible." };
    const disponibles = TIENDA.filter(a => !j.tiene.includes(a.id) && a.nivel <= nivel).map(a => ({ id: a.id, precio: a.precio }));
    if (disponibles.length === 0) return { ok: false, motivo: "Ya tienes todo lo que puede dar este sobre." };
    const cartas = abrirSobre(def, azar, disponibles);
    cambiaJugador(id, x => ({
      ...x,
      tiene: [...x.tiene, ...cartas.map(c => c.id)], nuevos: [...new Set([...(x.nuevos ?? []), ...cartas.map(c => c.id)])],
      movimientos: [...x.movimientos, { tipo: "accesorio", xp: def.precio }],
    }));
    return { ok: true, cartas };
  },
  ponerse(id: string, articulo: string) {
    const j = estado.jugadores.find(x => x.id === id);
    const art = TIENDA.find(a => a.id === articulo);
    if (!j || !art || !j.tiene.includes(art.id)) return;
    const zona: Zona = art.zona;
    const ya = j.personaje.puesto[zona] === art.id;
    cambiaJugador(id, x => ({ ...x, personaje: { ...x.personaje, puesto: { ...x.personaje.puesto, [zona]: ya ? null : art.id } } }));
  },
  /** Cobra una carta de poder con XP del evento. Devuelve el precio o el motivo del rechazo. */
  comprarCarta(id: string, compradasEnPartida: number, enMano: number): { ok: true; precio: number } | { ok: false; motivo: string } {
    const j = estado.jugadores.find(x => x.id === id);
    if (!j) return { ok: false, motivo: "Jugador no encontrado." };
    const r = puedeComprarCarta(saldosDe(j), compradasEnPartida, enMano, true);
    if (!r.ok) {
      const m = { saldo: "No te alcanza la XP de este evento.", "tope-partida": "Ya compraste 3 cartas en esta partida.", "mano-llena": "Tu mano está llena (3).", "evento-cerrado": "El evento está cerrado.", nivel: "" }[r.motivo];
      return { ok: false, motivo: m };
    }
    cambiaJugador(id, x => ({ ...x, movimientos: [...x.movimientos, { tipo: "carta", xp: r.precio, eventoId: estado.eventoId }] }));
    return r;
  },
  /** Suma la XP de una partida terminada y la guarda en el historial. */
  acreditar(juego: string, resultados: { jugador: string; nombre: string; puntos: number; xp: number; lugar?: number; rondas?: number; retos?: number }[],
    hechos?: { juegoId: string; jugadores: number }) {
    const porId = new Map(resultados.map(r => [r.jugador, r.xp]));
    guardar({
      ...estado,
      jugadores: estado.jugadores.map(j => {
        const xp = porId.get(j.id) ?? 0;
        return xp > 0 ? { ...j, movimientos: [...j.movimientos, { tipo: "ganada", xp, eventoId: estado.eventoId }] } : j;
      }),
      historial: [{ fecha: new Date().toISOString(), juego, resultados: resultados.map(({ jugador, nombre, puntos, xp }) => ({ id: jugador, nombre, puntos, xp })) }, ...estado.historial].slice(0, 50),
    });
    // Si alguien del grupo tiene la cuenta abierta en este celular, el servidor recalcula y guarda su XP.
    const idCuenta = estado.cuenta?.jugador;
    const mio = resultados.find(r => r.jugador === idCuenta);
    if (idCuenta && esCuenta(idCuenta) && mio && hechos && mio.lugar && mio.rondas !== undefined) {
      void registrarPartidaNube({ juego: hechos.juegoId, rondas: mio.rondas, retos: mio.retos ?? 0, lugar: mio.lugar, jugadores: hechos.jugadores })
        .then(refrescarCuenta);
    }
  },
  /** XP extra del administrador por algo fuera del juego. Queda en el historial con su motivo. Devuelve el motivo si no se pudo. */
  darXpExtra(id: string, xp: number, motivo: string): string | null {
    const j = estado.jugadores.find(x => x.id === id);
    if (!j) return "Jugador no encontrado.";
    if (!xpExtraValida(xp)) return `La XP extra va de ${XP_EXTRA.min} a ${XP_EXTRA.max}.`;
    const limpio = motivo.replace(/\s+/g, " ").trim().slice(0, XP_EXTRA.motivoMax) || "Sin motivo";
    guardar({
      ...estado,
      jugadores: estado.jugadores.map(x => (x.id === id ? { ...x, movimientos: [...x.movimientos, { tipo: "ganada", xp, eventoId: estado.eventoId }] } : x)),
      historial: [{ fecha: new Date().toISOString(), juego: "XP extra", extra: limpio, resultados: [{ nombre: j.nombre, puntos: 0, xp }] }, ...estado.historial].slice(0, 50),
    });
    if (esCuenta(id)) void registrarXpExtraNube(xp, limpio).then(refrescarCuenta);
    return null;
  },
  /**
   * Ajuste manual del anfitrión a un jugador de este celular (sin cuenta): suma o resta XP.
   * Las cuentas se ajustan en el servidor, desde Ajustes → Administración.
   */
  ajustarXpLocal(id: string, delta: number, motivo: string): string | null {
    const j = estado.jugadores.find(x => x.id === id);
    if (!j || esCuenta(id) || j.remoto) return "Este jugador se ajusta desde su cuenta.";
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1000) return "El ajuste va de -1000 a 1000 XP.";
    const limpio = motivo.replace(/\s+/g, " ").trim().slice(0, 50) || "Ajuste del anfitrión";
    const mov = delta > 0
      ? { tipo: "ganada" as const, xp: delta, eventoId: estado.eventoId }
      : { tipo: "quitada" as const, xp: -delta, eventoId: estado.eventoId };
    guardar({
      ...estado,
      jugadores: estado.jugadores.map(x => (x.id === id ? { ...x, movimientos: [...x.movimientos, mov] } : x)),
      historial: [{ fecha: new Date().toISOString(), juego: "Ajuste de XP", extra: limpio, resultados: [{ nombre: j.nombre, puntos: 0, xp: delta }] }, ...estado.historial].slice(0, 50),
    });
    return null;
  },
  /** Cierra el evento: la XP que sobró ya no compra cartas, solo accesorios. */
  cerrarEvento() { guardar({ ...estado, eventoId: nuevoEvento() }); },
};

/** Compra un accesorio: en la cuenta si está abierta, si no en este celular. Devuelve el motivo si no se pudo. */
export async function comprarAccesorio(id: string, articulo: string): Promise<string | null> {
  if (!esCuenta(id)) return acciones.comprarAccesorio(id, articulo);
  const art = TIENDA.find(a => a.id === articulo);
  if (!art) return "Ese artículo no existe.";
  const m = await comprarAccesorioNube(articulo);
  if (m) return m;
  await refrescarCuenta();
  acciones.marcarNuevos(id, [articulo]);
  acciones.ponerse(id, articulo);
  return null;
}

/** Abre un sobre: en la cuenta el servidor elige las cartas; si no, se sortean aquí. */
export async function comprarSobre(id: string, tipo: TipoSobre, azar: Azar): Promise<{ ok: true; cartas: CartaSobre[] } | { ok: false; motivo: string }> {
  if (!esCuenta(id)) return acciones.comprarSobre(id, tipo, azar);
  const r = await comprarSobreNube(tipo);
  if (!r.ok) return r;
  await refrescarCuenta();
  const cartas = r.cartas.map(c => ({ id: idActual(c.id), rareza: c.rareza as Rareza }));
  acciones.marcarNuevos(id, cartas.map(c => c.id));
  return { ok: true, cartas };
}

/** Años cumplidos a hoy con una fecha AAAA-MM-DD. */
export function edadDe(nacimiento: string, hoy = new Date()): number {
  const [a, m, d] = nacimiento.split("-").map(Number) as [number, number, number];
  let edad = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
  return edad;
}
/** La cuenta abierta es de un menor de 18. Sin cuenta o sin fecha no se sabe: devuelve false. */
export const esMenorConCuenta = (s: EstadoLocal) => !!s.registro && edadDe(s.registro.nacimiento) < 18;

/** Género conocido de un jugador: su cuenta (este celular), la sala, o el que se puso a mano. */
export function generoDe(s: EstadoLocal, i: number): Genero | undefined {
  const j = s.jugadores[i];
  if (!j) return undefined;
  if (j.remoto && j.id.startsWith("c-")) return s.generosSala?.[j.id.slice(2)];
  if (i === 0 && s.registro) return s.registro.genero;
  return s.generosLocales?.[j.id];
}

export const NOMBRE_EQUIPO_SEXOS: Record<Genero, string> = { hombre: "Hombres", mujer: "Mujeres", otro: "Libres" };

/** Equipo de la partida según la modalidad (undefined = individual o parejas). */
export function equipoPartidaDe(s: EstadoLocal, i: number): string | undefined {
  const j = s.jugadores[i];
  if (!j) return undefined;
  if (s.modalidad === "equipos") return s.equipos?.[j.id];
  if (s.modalidad === "sexos") { const g = generoDe(s, i); return g ? NOMBRE_EQUIPO_SEXOS[g] : undefined; }
  return undefined;
}

/**
 * Quién juega según el modo. Local y físico: los jugadores creados en este celular (nunca los de la sala).
 * En línea: solo cuentas reales — la tuya y las que entraron a tu sala desde su celular.
 */
export function jugadoresDelModo(s: EstadoLocal): JugadorLocal[] {
  const locales = s.jugadores.filter(j => !j.remoto);
  if (s.ajustes.modo !== "linea" || !s.sala) return locales;
  const mia = s.jugadores.find(j => j.id === s.cuenta?.jugador) ?? s.jugadores[0]!;
  return [mia, ...s.jugadores.filter(j => j.remoto)];
}
