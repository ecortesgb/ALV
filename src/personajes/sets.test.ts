import { describe, expect, it } from "vitest";
import { leerFicha } from "./ficha";
import { movimientosDeFicha } from "./plano";
import { SETS, SETS_DE, SETS_TODOS, setsDe } from "./sets";
import { PERFIL_PERSONAJE } from "./caracter";
import type { Ficha } from "./tipos";

const FICHA = {
  id: "sif", nombre: "Sif", saga: "marvel", grupo: "asgard", bando: "heroe", familia: "minifig", rig: "esqueleto",
  glb: "sif.glb", fotos: { tarjeta: "sif-tarjeta.webp", busto: "sif-busto.webp" },
  huesos: { cabeza: "Head", mano_der: "RightHand" },
  animaciones: { mapa: { reposo: "Idle" }, respaldo: {}, vida: [], sentado: null },
  medidas: { altura: 0.4, pies_en_cero: true, frente: "+Z" }, carga: { colores_srgb: true, rugosidad: null, metal: [] },
  origen: { fuente: "juego" }, publica: false, calidad: { estado: "jugable" },
};
const leer = (cambio: Record<string, unknown>) => { const r = leerFicha({ ...structuredClone(FICHA), ...cambio }); if (!r.ok) throw new Error(r.errores.join()); return r.ficha as Ficha; };

describe("sets de movimientos", () => {
  it("la ficha acepta el bloque sets y rechaza lo mal formado", () => {
    expect(leer({ sets: { espada: { glb: "sif-set-espada.glb", clips: { combo: "SWORDCOMBO" } } } }).sets).toEqual({ espada: { glb: "sif-set-espada.glb", clips: { combo: "SWORDCOMBO" } } });
    for (const malo of [{ espada: { glb: "otro-set-espada.glb", clips: { combo: "X" } } }, { espada: { glb: "sif-set-espada.glb", clips: {} } },
      { "../x": { glb: "sif-set-../x.glb", clips: { a: "X" } } }, { espada: { glb: "sif-set-espada.glb", clips: { combo: "<b>" } } }, {}]) {
      expect(leerFicha({ ...structuredClone(FICHA), sets: malo }).ok, JSON.stringify(malo)).toBe(false);
    }
  });
  it("un personaje toma los movimientos de sus sets y luego los de base, del GLB del anfitrión", () => {
    const sif = leer({ sets: { espada: { glb: "sif-set-espada.glb", clips: { combo: "SWORDCOMBO", caminar: "SWORD_WALK" } } } });
    const viper = leer({ id: "viper", glb: "viper.glb", fotos: { tarjeta: "viper-tarjeta.webp", busto: "viper-busto.webp" },
      sets: { base: { glb: "viper-set-base.glb", clips: { bailar: "BREAKDANCE_1" } } } });
    const vader = leer({ id: "darth-vader", glb: "darth-vader.glb", fotos: { tarjeta: "darth-vader-tarjeta.webp", busto: "darth-vader-busto.webp" } });
    const cat = new Map([["sif", { ficha: sif, base: "https://x/sif/" }], ["viper", { ficha: viper, base: "https://x/viper/" }]]);
    const m = movimientosDeFicha(vader, cat);
    expect(m.map(x => x.id)).toEqual(["espada-combo", "espada-caminar", "base-bailar"]);
    expect(m[0]).toMatchObject({ glb: "https://x/sif/sif-set-espada.glb", clip: "SWORDCOMBO", nombre: "Combo de espada", efectos: [] });
    expect(movimientosDeFicha({ ...vader, familia: "bigfig" }, cat)).toEqual([]);
  });
  it("cada set de la tabla existe, sus ids caben en un evento de poder y todo personaje conocido tiene base", () => {
    for (const [id, sets] of Object.entries(SETS_DE)) for (const s of sets) expect(SETS[s], `${id}: ${s}`).toBeTruthy();
    for (const [sid, d] of Object.entries(SETS)) for (const mid of Object.keys(d.movs)) expect(`${sid}-${mid}`).toMatch(/^[a-z][a-z0-9-]{0,23}$/);
    for (const id of Object.keys(PERFIL_PERSONAJE)) expect(setsDe(id).slice(-SETS_TODOS.length)).toEqual([...SETS_TODOS]);
  });
  it("ningún personaje pasa de 8 sets ni de 64 movimientos, y cada set cabe en una rueda", () => {
    for (const id of Object.keys(PERFIL_PERSONAJE)) {
      const sets = setsDe(id);
      expect(sets.length, id).toBeLessThanOrEqual(8);
      expect(new Set(sets).size, id).toBe(sets.length);
      expect(sets.reduce((n, s) => n + Object.keys(SETS[s]!.movs).length, 0), id).toBeLessThanOrEqual(64);
    }
    for (const [sid, d] of Object.entries(SETS)) expect(Object.values(d.movs).filter(m => m.rueda).length, sid).toBeLessThanOrEqual(8);
  });
});
