// Posiciones del grupo. La de la sesión usa la XP de la sesión (hoy: la del evento abierto), nunca la histórica.
import { saldosDe, parejaDe, type EstadoLocal, type JugadorLocal } from "./estado";

export interface Fila { id: string; nombre: string; valor: number; lugar: number; jugadores: JugadorLocal[] }
export type Tabla = "sesion" | "historico" | "parejas";

/** Ordena de mayor a menor; los empates comparten lugar (1, 1, 3…). */
function ordenar(filas: Omit<Fila, "lugar">[], desempate: (f: Omit<Fila, "lugar">) => number): Fila[] {
  const orden = [...filas].sort((a, b) => b.valor - a.valor || desempate(b) - desempate(a) || a.nombre.localeCompare(b.nombre));
  let lugar = 0, previo = Number.NaN;
  return orden.map((f, i) => {
    if (f.valor !== previo) { lugar = i + 1; previo = f.valor; }
    return { ...f, lugar };
  });
}

const acumulada = (js: JugadorLocal[]) => js.reduce((t, j) => t + saldosDe(j).acumulada, 0);

export function tabla(s: EstadoLocal, tipo: Tabla): Fila[] {
  if (tipo === "parejas") {
    const vistas = new Set<string>();
    const filas: Omit<Fila, "lugar">[] = [];
    s.jugadores.forEach((j, i) => {
      const otro = s.jugadores.find(x => x.id === parejaDe(i, s));
      if (!otro || vistas.has(j.id)) return;
      vistas.add(j.id); vistas.add(otro.id);
      const js = [j, otro];
      filas.push({ id: `${j.id}+${otro.id}`, nombre: `${j.nombre} y ${otro.nombre}`, valor: js.reduce((t, x) => t + saldosDe(x).delEvento, 0), jugadores: js });
    });
    return ordenar(filas, f => acumulada(f.jugadores));
  }
  const filas = s.jugadores.map(j => ({
    id: j.id, nombre: j.nombre, jugadores: [j],
    valor: tipo === "sesion" ? saldosDe(j).delEvento : saldosDe(j).acumulada,
  }));
  return ordenar(filas, f => acumulada(f.jugadores));
}

/** Lugar de cada jugador en la sesión, para el indicador sobre su personaje. */
export function lugaresDeSesion(s: EstadoLocal): Record<string, number> {
  return Object.fromEntries(tabla(s, "sesion").map(f => [f.id, f.lugar]));
}
