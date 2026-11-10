// Economía de XP (Entregable 5). Una sola moneda con tres saldos:
// acumulada (nunca baja, da el nivel), disponible (acumulada menos lo gastado)
// y del evento (lo disponible que se ganó en el evento abierto: lo único que compra cartas de poder).
// En producción esto lo calcula el servidor; aquí vive la regla para que ambos lados la compartan.

export const XP = {
  terminarPartida: 20,
  porRonda: 2,
  maxRondas: 20,
  retoCumplido: 3,
  lugar: [15, 10, 5] as const,
  misionValidada: 25,
  premioCeremonia: 30,
  cerrarEvento: 50,
  topeDiario: 600,
  minRondasParaContar: 5,
} as const;

export const PRECIO_CARTAS = [40, 60, 80] as const; // 1.ª, 2.ª y 3.ª carta comprada en una partida
export const MAX_CARTAS_COMPRADAS = 3;
export const MAX_CARTAS_EN_MANO = 3;

/** XP que cuesta subir del nivel n al siguiente. */
export const costoNivel = (n: number) => 100 + 20 * (n - 1);

export function nivelPorXp(xpAcumulada: number): number {
  let nivel = 1, resto = xpAcumulada;
  while (resto >= costoNivel(nivel)) { resto -= costoNivel(nivel); nivel++; }
  return nivel;
}

export function xpParaNivel(nivel: number): number {
  let total = 0;
  for (let n = 1; n < nivel; n++) total += costoNivel(n);
  return total;
}

const TITULOS: [number, string][] = [[20, "ALV Legendario"], [15, "Alma de la fiesta"], [10, "Leyenda local"], [5, "Fiestero"], [1, "Novato"]];
export const tituloPorNivel = (nivel: number) => TITULOS.find(([n]) => nivel >= n)?.[1] ?? "Novato";

/** Cuántos lugares premia la partida: con 2 solo 1.º, con 4+ también 2.º, con 6+ también 3.º. */
export function lugaresPremiados(jugadores: number): number {
  if (jugadores >= 6) return 3;
  if (jugadores >= 4) return 2;
  return 1;
}

export interface ResultadoJugador { rondas: number; retosCumplidos: number; lugar: number /* 1 = primero */ }

/** XP de una partida terminada. Devuelve 0 si la partida no cuenta (menos de 5 rondas). */
export function xpDePartida(r: ResultadoJugador, jugadores: number): number {
  if (r.rondas < XP.minRondasParaContar) return 0;
  let xp = XP.terminarPartida + XP.porRonda * Math.min(r.rondas, XP.maxRondas / XP.porRonda) + XP.retoCumplido * r.retosCumplidos;
  if (r.lugar >= 1 && r.lugar <= lugaresPremiados(jugadores)) xp += XP.lugar[r.lugar - 1] ?? 0;
  return xp;
}

export type Movimiento =
  | { tipo: "ganada"; xp: number; eventoId: string }
  | { tipo: "accesorio"; xp: number }
  | { tipo: "carta"; xp: number; eventoId: string };

export interface Saldos { acumulada: number; disponible: number; delEvento: number }

/**
 * Saldos a partir de la lista de movimientos, en orden.
 * Regla: un accesorio gasta primero la XP de eventos pasados (o cerrados), para no gastar sin querer la del evento.
 */
export function saldos(movs: Movimiento[], eventoAbierto: string | null): Saldos {
  let acumulada = 0, otros = 0, evento = 0;
  for (const m of movs) {
    if (m.tipo === "ganada") {
      acumulada += m.xp;
      if (m.eventoId === eventoAbierto) evento += m.xp; else otros += m.xp;
    } else if (m.tipo === "accesorio") {
      const deOtros = Math.min(otros, m.xp);
      otros -= deOtros;
      evento -= m.xp - deOtros;
    } else {
      evento -= m.xp;
    }
  }
  return { acumulada, disponible: otros + evento, delEvento: m0(evento) };
}
const m0 = (n: number) => Math.max(0, n);

export type MotivoRechazo = "saldo" | "tope-partida" | "mano-llena" | "evento-cerrado" | "nivel";

export function puedeComprarCarta(s: Saldos, compradasEnPartida: number, enMano: number, eventoAbierto: boolean):
  { ok: true; precio: number } | { ok: false; motivo: MotivoRechazo } {
  if (!eventoAbierto) return { ok: false, motivo: "evento-cerrado" };
  if (compradasEnPartida >= MAX_CARTAS_COMPRADAS) return { ok: false, motivo: "tope-partida" };
  if (enMano >= MAX_CARTAS_EN_MANO) return { ok: false, motivo: "mano-llena" };
  const precio = PRECIO_CARTAS[compradasEnPartida] as number;
  if (s.delEvento < precio) return { ok: false, motivo: "saldo" };
  return { ok: true, precio };
}

export function puedeComprarAccesorio(s: Saldos, precio: number, nivelMinimo: number):
  { ok: true } | { ok: false; motivo: MotivoRechazo } {
  if (nivelPorXp(s.acumulada) < nivelMinimo) return { ok: false, motivo: "nivel" };
  if (s.disponible < precio) return { ok: false, motivo: "saldo" };
  return { ok: true };
}
// Los precios de la tienda viven en src/content/personaje.ts (y en la tabla articulos_tienda del servidor).
