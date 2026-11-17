// Prueba del núcleo del motor en Deno (T4 parcial del plan del motor en el servidor): sin npm y sin vitest.
// Carga src/engine/nucleo.ts tal cual (con el JSON del contenido) y compara con la referencia del motor anterior.
// Correr desde app/:  deno test --sloppy-imports --allow-read=. tools/deno/nucleo_test.ts
// (--sloppy-imports porque el código usa imports sin extensión, como pide Vite; en Deno anterior a 2.4: --unstable-sloppy-imports)
import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { idAutoRevelar, paraPublicar, reconstruir, relojLogico, SUSPENSO_MS, ESPERA_MS } from "../../src/engine/nucleo.ts";
import { resultados } from "../../src/engine/partida.ts";
import { A, PARTIDA, filasEscenario } from "../../src/engine/nucleo.escenario.ts";

const golden = JSON.parse(Deno.readTextFileSync(new URL("../../src/engine/nucleo.golden.json", import.meta.url))) as {
  filas: unknown[];
  pasos: { k: number; tiempos: Record<string, unknown>; estado: unknown; publicar: unknown }[];
  resultados: unknown;
};
const json = (x: unknown) => JSON.parse(JSON.stringify(x)) as unknown;

Deno.test("núcleo en Deno: constantes del suspenso y la espera", () => {
  strictEqual(SUSPENSO_MS, 2000);
  strictEqual(ESPERA_MS, 20000);
});

Deno.test("núcleo en Deno: El impostor, 4 jugadores, semilla 777, 5 rondas, igual que el motor anterior", () => {
  const filas = filasEscenario();
  deepStrictEqual(json(filas), golden.filas);
  for (const p of golden.pasos) {
    const e = reconstruir(filas.slice(0, p.k), A)!;
    const t = relojLogico(e);
    deepStrictEqual(json(e), p.estado, `estado en el paso ${p.k}`);
    deepStrictEqual(json(paraPublicar(e, e.fase === "contestando" ? 1000 : null, t.hayEspera ? 2000 : null)), p.publicar, `publicado en el paso ${p.k}`);
    deepStrictEqual({ ...t, autoRev: t.listos ? idAutoRevelar(PARTIDA, e) : null }, p.tiempos, `reloj en el paso ${p.k}`);
  }
  const final = reconstruir(filas, A)!;
  strictEqual(final.fase, "terminada");
  deepStrictEqual(json(resultados(final)), golden.resultados);
});
