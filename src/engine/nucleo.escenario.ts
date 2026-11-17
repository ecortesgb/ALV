// Escenario fijo para la prueba de equivalencia del núcleo (nucleo.ts) contra el motor anterior:
// El impostor, 4 jugadores, semilla 777, 5 rondas. Las filas no dependen del estado, así que siempre son las mismas.
// Recorre pistas, votos, revelar, pausa y reanudar, una acción repetida, un control de quien no tiene el control,
// «esperar», «seguir sin» y el cierre. Sin React, sin navegador, sin vitest: también lo usa la prueba de Deno.
import type { FilaAccion } from "./nucleo";

export const A = "a0000000-0000-4000-8000-000000000001";
export const B = "b0000000-0000-4000-8000-000000000002";
export const C = "c0000000-0000-4000-8000-000000000003";
export const D = "d0000000-0000-4000-8000-000000000004";
export const PARTIDA = "p0000000-0000-4000-8000-000000000099";
export const SEMILLA = 777;
export const RONDAS = 5;
const JUGADORES = [{ id: A, nombre: "Ana" }, { id: B, nombre: "Beto" }, { id: C, nombre: "Caro" }, { id: D, nombre: "Dani" }];
const IDS = [A, B, C, D];
export const CFG = { jugadores: JUGADORES, lugar: "cualquiera", intensidad: 2, dificultad: 2, adulto: false, drunk: true, turno: "orden" };

export function filasEscenario(): FilaAccion[] {
  const filas: FilaAccion[] = [];
  let n = 0;
  const fila = (jugador: string, tipo: FilaAccion["tipo"], datos: Record<string, unknown>, id?: string): FilaAccion => {
    n++;
    const f: FilaAccion = { id: id ?? `accion-${String(n).padStart(3, "0")}`, jugador, tipo, datos, creada: new Date(Date.UTC(2026, 10, 16, 12, 0, n)).toISOString() };
    filas.push(f);
    return f;
  };
  fila(A, "control", { que: "arranque", semilla: SEMILLA, juego: "impostor", rondas: RONDAS, cfg: CFG }, `arranque-${PARTIDA}`.slice(0, 60));
  for (let r = 1; r <= RONDAS; r++) {
    IDS.forEach((j, i) => fila(j, "pista", { texto: `pista ${r}-${i}` }));
    if (r === 2) { fila(A, "control", { que: "pausar" }); fila(B, "contestar", { valor: C }); fila(A, "control", { que: "reanudar" }); }
    if (r === 3) fila(B, "control", { que: "revelar" }); // no tiene el control: no cuenta
    // Votos: en rondas impares cada quien vota al siguiente; en pares todos votan a Beto (y Beto a Caro).
    const voto = (i: number) => (r % 2 === 1 ? IDS[(i + 1) % 4]! : IDS[i] === B ? C : B);
    if (r === 4) {
      // Dani no contesta: el anfitrión espera una vez y luego sigue sin él.
      fila(A, "contestar", { valor: voto(0) }); fila(B, "contestar", { valor: voto(1) }); fila(C, "contestar", { valor: voto(2) });
      fila(A, "control", { que: "esperar" });
      fila(A, "control", { que: "seguir-sin" });
    } else {
      const votos = IDS.map((j, i) => fila(j, "contestar", { valor: voto(i) }));
      if (r === 1) filas.push({ ...votos[0]! }); // la misma fila otra vez: no cuenta dos veces
      fila(A, "control", { que: "revelar" }, `auto-rev-${PARTIDA.slice(0, 18)}-${r}-0`);
    }
    fila(A, "control", { que: "siguiente" });
  }
  return filas;
}
