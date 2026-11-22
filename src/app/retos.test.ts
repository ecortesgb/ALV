import { describe, expect, it } from "vitest";
import { RETOS, RAREZA, retoDelDia, retosDelDia, hoyMexico } from "../content/rarezas";
import catalogo from "../content/catalogo-figura.json";
import { alternarDetalle, figuraNueva, ponerCascoSolo, ponerObjeto, ponerTorsoCompleto, ponerMomentos, colorTorso, colorPiernas } from "./editarFigura";
import { bloqueadasEn, coloresDe, cumple, idsDe } from "./retos";

const ocupa = (id: string) => (id.startsWith("DETAIL_00") && ["1", "2", "3"].includes(id.at(-1)!) ? "ojos" : ["DETAIL_005", "DETAIL_006", "DETAIL_007"].includes(id) ? "barba" : null);
const reto = (id: string) => RETOS.find(r => r.id === id)!;

describe("retos", () => {
  it("lee piezas y colores de la figura (con momentos como MOM_)", () => {
    const f = ponerMomentos(ponerCascoSolo(figuraNueva(), "HELM_004", "#f4f4f4"), { id: "fuego", espera: "a", victoria: "b", derrota: "c", punto: "d" });
    expect(idsDe(f)).toEqual(expect.objectContaining({}));
    expect([...idsDe(f)]).toEqual(expect.arrayContaining(["HELM_004", "HAIR_001", "FACE_001", "MOM_fuego"]));
    expect([...coloresDe(f)]).toEqual(expect.arrayContaining(["#f4f4f4", "#c91a09", "#0055bf", "#f2cd37"]));
  });
  it("chef completo: necesita las tres piezas", () => {
    let f = ponerCascoSolo(ponerTorsoCompleto(figuraNueva(), "PRINT_014"), "HELM_004", "#f4f4f4");
    expect(cumple(f, reto("combo-chef").condicion)).toBe(false);
    f = ponerObjeto(f, "mano_der", { id: "ACC_011", color: "#1b2a34" });
    expect(cumple(f, reto("combo-chef").condicion)).toBe(true);
  });
  it("colores, torso/piernas, alguna y dos objetos", () => {
    const base = figuraNueva(); // torso rojo, piernas azules
    expect(cumple(base, reto("dia-rojo-verde").condicion)).toBe(false);
    expect(cumple(colorPiernas(base, "ambos", "#237841"), reto("dia-rojo-verde").condicion)).toBe(true);
    expect(cumple(colorPiernas(colorTorso(base, "#0055bf"), "ambos", "#0a3463"), reto("dia-azul").condicion)).toBe(true);
    const lb = alternarDetalle(alternarDetalle(base, "DETAIL_003", ocupa), "DETAIL_007", ocupa);
    expect(cumple(lb, reto("dia-barba-lentes").condicion)).toBe(true);
    const dos = ponerObjeto(ponerObjeto(base, "mano_der", { id: "ACC_010" }), "mano_izq", { id: "ACC_001" });
    expect(cumple(dos, reto("dia-dos-manos").condicion)).toBe(true);
  });
  it("bloqueadas: solo las no comunes que no tengo", () => {
    const f = ponerTorsoCompleto(ponerCascoSolo(figuraNueva(), "HELM_012", "#1b2a34"), "PRINT_020");
    expect(bloqueadasEn(f, new Set())).toEqual(["HELM_012"]);
    expect(bloqueadasEn(f, new Set(["HELM_012"]))).toEqual([]);
  });
  it("el reto del día rota entre los diarios y no depende de la hora", () => {
    const a = retoDelDia("2026-11-17"), b = retoDelDia("2026-11-18");
    expect(a.tipo).toBe("diario"); expect(a.id).not.toBe(b.id);
    expect(retoDelDia(hoyMexico(new Date("2026-11-18T05:30:00Z"))).id).toBe(a.id); // 23:30 del 17 en CDMX
  });
  it("las rarezas y premios usan piezas que existen en el catálogo", () => {
    const todas = new Set(Object.values(catalogo.secciones).flat().map(x => (x as { id?: string | null }).id).filter(Boolean) as string[]);
    catalogo.paquetes.forEach(p => todas.add("MOM_" + p.id));
    for (const id of Object.keys(RAREZA)) expect(todas.has(id), id).toBe(true);
    for (const r of RETOS) expect(todas.has(r.premio), r.premio).toBe(true);
  });
});

import { readFileSync } from "node:fs";
import { PRECIO, XP_SI_YA_LA_TIENES } from "../content/rarezas";
describe("la migración 033 coincide con rarezas.ts", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/033_piezas_rareza_y_retos.sql", import.meta.url), "utf8");
  it("cada pieza con su rareza y precio, y cada reto con su premio", () => {
    for (const [id, r] of Object.entries(RAREZA)) expect(sql, id).toContain(`('${id}', '${r}', ${PRECIO[r]})`);
    for (const r of RETOS) expect(sql, r.id).toContain(`('${r.id}', '${r.tipo}'`);
    expect(sql).toContain(`'ganada', ${XP_SI_YA_LA_TIENES}`);
  });
});

describe("retosDelDia", () => {
  it("da de 1 a 3 retos distintos y el primero es el diario", () => {
    const vistos = new Set<number>();
    for (let i = 0; i < 30; i++) {
      const f = new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10), r = retosDelDia(f);
      expect(r.length).toBeGreaterThanOrEqual(1); expect(r.length).toBeLessThanOrEqual(3);
      expect(r[0]!.id).toBe(retoDelDia(f).id);
      expect(new Set(r.map(x => x.id)).size).toBe(r.length);
      expect(r.slice(1).every(x => x.tipo === "combinacion")).toBe(true);
      vistos.add(r.length);
    }
    expect(vistos.size).toBe(3); // en un mes salen días con 1, 2 y 3
  });
});
