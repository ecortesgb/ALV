// El motor de la sala: arranque + acciones guardadas → partida. Repetir da lo mismo, solo el control controla
// y lo publicado para la TV no lleva secretos.
import { describe, expect, it } from "vitest";
import type { FilaAccion } from "../../servicios/enlace";
import { aAccion, conParejas, paraPublicar, reconstruir } from "./motor";

const A = "a0000000-0000-4000-8000-000000000001", B = "b0000000-0000-4000-8000-000000000002", C = "c0000000-0000-4000-8000-000000000003";
const jugadores = [{ id: A, nombre: "Ana" }, { id: B, nombre: "Beto" }, { id: C, nombre: "Caro" }];
const cfg = { jugadores, lugar: "cualquiera", intensidad: 2, dificultad: 2, adulto: false, drunk: false, turno: "orden" };
let n = 0;
const fila = (jugador: string, tipo: FilaAccion["tipo"], datos: Record<string, unknown>): FilaAccion => ({ id: `accion-${++n}`, jugador, tipo, datos, creada: new Date(2026, 0, 1, 0, 0, n).toISOString() });
const arranque = (juego = "impostor") => fila(A, "control", { que: "arranque", semilla: 4242, juego, rondas: 3, cfg });

describe("motor de la sala", () => {
  it("sin arranque no hay partida, y el arranque de quien no tiene el control no cuenta", () => {
    expect(reconstruir([], A)).toBeNull();
    expect(reconstruir([{ ...arranque(), jugador: B }], A)).toBeNull();
  });
  it("reconstruye El impostor y repetir las mismas filas da el mismo estado", () => {
    const filas = [arranque(), fila(B, "pista", { texto: "redonda" }), fila(A, "contestar", { valor: B }), fila(B, "contestar", { valor: C }), fila(C, "contestar", { valor: B }), fila(A, "control", { que: "revelar" })];
    const e1 = reconstruir(filas, A)!, e2 = reconstruir([...filas, ...filas.slice(1)], A)!;
    expect(e1.fase).toBe("revelada");
    expect(e1.pistas).toEqual({ [B]: "redonda" });
    expect(e2).toEqual(e1);
    expect(reconstruir(filas.slice(0, 3), A)!.fase).toBe("contestando");
  });
  it("solo quien tiene el control pausa, salta, revela o pasa de ronda", () => {
    const base = [arranque("mas-probable")];
    const intruso = reconstruir([...base, fila(B, "control", { que: "pausar" }), fila(B, "control", { que: "saltar" })], A)!;
    expect(intruso.pausada).toBeFalsy();
    expect(intruso.fase).toBe("contestando");
    const dueno = reconstruir([...base, fila(A, "control", { que: "pausar" })], A)!;
    expect(dueno.pausada).toBe(true);
    // En pausa nadie contesta; al reanudar sí.
    const enPausa = reconstruir([...base, fila(A, "control", { que: "pausar" }), fila(B, "contestar", { valor: C })], A)!;
    expect(Object.keys(enPausa.respuestas)).toEqual([]);
    const saltada = reconstruir([...base, fila(A, "control", { que: "saltar" }), fila(A, "control", { que: "siguiente" })], A)!;
    expect(saltada.ronda).toBe(2);
    expect(Object.values(saltada.puntos).every(p => p === 0)).toBe(true);
  });
  it("nadie contesta por otro: la acción lleva la cuenta que la mandó", () => {
    const acc = aAccion(fila(B, "contestar", { valor: C, jugador: A }), [A]);
    expect(acc).toMatchObject({ tipo: "contestar", jugador: B });
    expect(aAccion(fila(B, "control", { que: "xp-reto", jugador: B, xp: 100 }), [A])).toBeNull();
    expect(aAccion(fila(A, "control", { que: "borrar-todo" }), [A])).toBeNull();
  });
  it("xp por reto, ruleta y pasar el control quedan en la partida", () => {
    const e = reconstruir([arranque("verdad-reto"), fila(A, "control", { que: "xp-reto", jugador: B, xp: 25 }), fila(A, "control", { que: "xp-reto", jugador: B, xp: 9999 }), fila(A, "control", { que: "ruleta" }), fila(A, "control", { que: "pasar-control", jugador: C }), fila(C, "control", { que: "pausar" })], A)!;
    expect(e.xpReto).toEqual({ [B]: 25 });
    expect(e.ruletaExtra?.n).toBe(1);
    expect(e.control).toBe(C);
    expect(e.pausada).toBe(true);
  });
  it("lo publicado para todos no lleva palabra, papeles, votos ni semilla; lo privado va solo a su dueño", () => {
    const e = reconstruir([arranque(), fila(A, "contestar", { valor: B })], A)!;
    const { publico, privados } = paraPublicar(e, null);
    const texto = JSON.stringify(publico);
    const palabra = (Object.values(e.privado).find(p => (p as { palabra?: string }).palabra) as { palabra: string }).palabra;
    expect(texto).not.toContain(palabra);
    expect(texto).not.toContain("\"rol\"");
    expect(texto).not.toContain("4242");
    expect(publico.votosDe).toBeUndefined();
    expect(publico.contestaron).toEqual([A]);
    expect(Object.keys(privados).sort()).toEqual([A, B, C].sort());
    expect((privados[A] as { miRespuesta: unknown }).miRespuesta).toBe(B);
    expect((privados[B] as { miRespuesta: unknown }).miRespuesta).toBeNull();
  });
  it("al revelar una votación se publica quién votó a quién", () => {
    const e = reconstruir([arranque(), fila(A, "contestar", { valor: B }), fila(B, "contestar", { valor: C }), fila(C, "contestar", { valor: B }), fila(A, "control", { que: "revelar" })], A)!;
    expect(paraPublicar(e, null).publico.votosDe).toEqual({ [A]: B, [B]: C, [C]: B });
  });
  it("las parejas se arman por orden de llegada solo si son pares", () => {
    expect(conParejas(jugadores).some(j => "parejaDe" in j)).toBe(false);
    const cuatro = conParejas([...jugadores, { id: "d", nombre: "Dani" }]);
    expect(cuatro[0]!.parejaDe).toBe(B);
    expect(cuatro[3]!.parejaDe).toBe(C);
  });
});
