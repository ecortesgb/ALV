// Estado local del dispositivo: el grupo, sus personajes, XP, compras e historial.
// Hasta que lleguen las cuentas (paso 4) todo vive aquí; después el servidor es la fuente de verdad
// y estas mismas reglas (src/engine/economia.ts) las aplica la base de datos.
import { useSyncExternalStore } from "react";
import { saldos, puedeComprarAccesorio, puedeComprarCarta, XP_EXTRA, xpExtraValida, type Movimiento } from "../engine/economia";
import { idActual, migrarPersonaje, personajeInicial, TIENDA, cambioValido, type Personaje, type Zona } from "../content/personaje";
import type { EscenarioId, Intensidad } from "../engine/types";

export interface JugadorLocal {
  id: string;
  nombre: string;
  personaje: Personaje;
  movimientos: Movimiento[];
  tiene: string[];
}

/** `extra` marca la XP que dio el administrador fuera de un juego; lleva el motivo. */
export interface Partida { fecha: string; juego: string; resultados: { id?: string; nombre: string; puntos: number; xp: number }[]; extra?: string }

export interface EstadoLocal {
  version: 2;
  jugadores: JugadorLocal[];
  enParejas: boolean;
  eventoId: string;
  ajustes: { escenario: EscenarioId; intensidad: Intensidad; adulto: boolean; drunk: boolean };
  historial: Partida[];
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
      return { ...s, jugadores: s.jugadores.map(j => ({ ...j, personaje: migrarPersonaje(j.personaje), tiene: (j.tiene ?? []).map(idActual) })) };
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

export const saldosDe = (j: JugadorLocal) => saldos(j.movimientos, estado.eventoId);

/** Pareja según el orden: 1.º con 2.º, 3.º con 4.º… */
export function parejaDe(i: number, s: EstadoLocal = estado): string | undefined {
  if (!s.enParejas) return undefined;
  const otro = i % 2 === 0 ? i + 1 : i - 1;
  return s.jugadores[otro]?.id;
}

export const acciones = {
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
  ajustes(a: Partial<EstadoLocal["ajustes"]>) { guardar({ ...estado, ajustes: { ...estado.ajustes, ...a } }); },
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
      ...x, tiene: [...x.tiene, art.id],
      movimientos: [...x.movimientos, { tipo: "accesorio", xp: art.precio }],
      personaje: { ...x.personaje, puesto: { ...x.personaje.puesto, [art.zona]: art.id } },
    }));
    return null;
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
  acreditar(juego: string, resultados: { jugador: string; nombre: string; puntos: number; xp: number }[]) {
    const porId = new Map(resultados.map(r => [r.jugador, r.xp]));
    guardar({
      ...estado,
      jugadores: estado.jugadores.map(j => {
        const xp = porId.get(j.id) ?? 0;
        return xp > 0 ? { ...j, movimientos: [...j.movimientos, { tipo: "ganada", xp, eventoId: estado.eventoId }] } : j;
      }),
      historial: [{ fecha: new Date().toISOString(), juego, resultados: resultados.map(({ jugador, nombre, puntos, xp }) => ({ id: jugador, nombre, puntos, xp })) }, ...estado.historial].slice(0, 50),
    });
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
    return null;
  },
  /** Cierra el evento: la XP que sobró ya no compra cartas, solo accesorios. */
  cerrarEvento() { guardar({ ...estado, eventoId: nuevoEvento() }); },
};
