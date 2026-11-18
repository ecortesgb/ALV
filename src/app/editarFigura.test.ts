import { describe, expect, it } from "vitest";
import {
  alternarDetalle, capaDe, colorDeLado, colorPiernas, completar, cuelloDe, figuraNueva, ponerBrazos, ponerCapa, ponerCuello, ponerManos,
  ponerPelo, ponerRostro, ponerMascara, colorEstampado, tipoPiernas,
} from "./editarFigura";

const ocupa = (id: string) => ({ DETAIL_001: "ojos", DETAIL_003: "ojos", DETAIL_005: "barba" } as Record<string, string>)[id] ?? null;

describe("editarFigura", () => {
  it("no modifica la figura original", () => {
    const f = figuraNueva(), copia = structuredClone(f);
    ponerPelo(f, "HAIR_009"); ponerBrazos(f, "der", "#123456");
    expect(f).toEqual(copia);
  });
  it("completa figuras viejas o incompletas sin perder lo que traen", () => {
    const g = completar({ version: 2, identidad: { piel: "#aa7d55" } } as never);
    expect(g.identidad.piel).toBe("#aa7d55");
    expect(g.ropa.piernas.tipo).toBe("normal");
    expect(g.accesorios.mano_der).toBeNull();
  });
  it("pelo: cambiar de peinado conserva el color; sin pelo es null", () => {
    let f = completar({ ...figuraNueva(), identidad: { ...figuraNueva().identidad, cabello: { id: "HAIR_001", color: "#e4cd9e" } } });
    f = ponerPelo(f, "HAIR_014");
    expect(f.identidad.cabello).toEqual({ id: "HAIR_014", color: "#e4cd9e" });
    expect(ponerPelo(f, null).identidad.cabello).toBeNull();
  });
  it("detalles: dos lentes no van juntos; barba y lentes sí", () => {
    let f = alternarDetalle(figuraNueva(), "DETAIL_001", ocupa);
    f = alternarDetalle(f, "DETAIL_005", ocupa);
    f = alternarDetalle(f, "DETAIL_003", ocupa);
    expect(f.identidad.detalles.sort()).toEqual(["DETAIL_003", "DETAIL_005"]);
    expect(alternarDetalle(f, "DETAIL_005", ocupa).identidad.detalles).toEqual(["DETAIL_003"]);
    expect(alternarDetalle(f, null, ocupa).identidad.detalles).toEqual([]);
  });
  it("elegir un rostro quita la máscara", () => {
    const f = ponerRostro(ponerMascara(figuraNueva(), "FACE_012"), "FACE_005");
    expect(f.accesorios.cara).toBeNull();
    expect(f.identidad.rostro).toBe("FACE_005");
  });
  it("capa y cuello conviven y ninguno borra al otro", () => {
    let f = ponerCuello(figuraNueva(), { id: "NECK_002", color: "#237841" });
    f = ponerCapa(f, { id: "CAPE_001", color: "#c91a09" });
    expect(capaDe(f)?.id).toBe("CAPE_001");
    expect(cuelloDe(f)?.id).toBe("NECK_002");
    f = ponerCuello(f, { id: "NECK_005", color: "#6c6e68" });
    expect(cuelloDe(f)?.id).toBe("NECK_005");
    f = ponerCapa(f, null);
    expect(capaDe(f)).toBeNull();
    expect(f.accesorios.espalda?.id).toBe("NECK_005");
    expect(f.manual._cuelloExtra).toBeUndefined();
  });
  it("pintar solo la pierna derecha deja la izquierda como estaba", () => {
    const f = colorPiernas(figuraNueva(), "der", "#c91a09");
    expect(colorDeLado(f, "pierna", "der")).toBe("#c91a09");
    expect(colorDeLado(f, "pierna", "izq")).toBe("#0055bf");
    expect(f.manual.pierna_izq?.color).toBe("#0055bf");
  });
  it("«ambas» unifica los dos lados; Básico (con cadera) conserva los lados personalizados", () => {
    const f = colorPiernas(figuraNueva(), "izq", "#f2cd37");
    const basico = colorPiernas(f, "ambos", "#1b2a34", true);
    expect(basico.ropa.cadera.color).toBe("#1b2a34");
    expect(basico.manual.pierna_izq?.color).toBe("#f2cd37");
    const completo = colorPiernas(f, "ambos", "#1b2a34");
    expect(completo.manual.pierna_izq).toBeUndefined();
  });
  it("brazos: piel = sin mangas; un lado no toca el otro", () => {
    let f = ponerBrazos(figuraNueva(), "ambos", "piel");
    expect(f.ropa.mangas).toBe("sin");
    expect(colorDeLado(f, "brazo", "ambos")).toBe("piel");
    f = ponerBrazos(figuraNueva(), "der", "#0055bf");
    expect(colorDeLado(f, "brazo", "izq")).toBe("#c91a09");
    expect(colorDeLado(f, "brazo", "der")).toBe("#0055bf");
  });
  it("manos: guantes de un lado", () => {
    const f = ponerManos(figuraNueva(), "der", "#1b2a34");
    expect(colorDeLado(f, "mano", "der")).toBe("#1b2a34");
    expect(colorDeLado(f, "mano", "izq")).toBe("#f2cd37");
  });
  it("colores del estampado siempre son tres", () => {
    const f = colorEstampado(completar({ ...figuraNueva(), ropa: { ...figuraNueva().ropa, torso: { ...figuraNueva().ropa.torso, colores: [] } } }), 2, "#000000");
    expect(f.ropa.torso.colores).toEqual(["#ffffff", "#1b2a34", "#000000"]);
  });
  it("piernas cortas quita la pieza especial elegida", () => {
    expect(tipoPiernas(figuraNueva(), "cortas").ropa.piernas).toMatchObject({ tipo: "cortas", id: null });
  });
});

import { MOMENTOS_NORMALES, limpiarApodo, ponerApodo, ponerMomentos, quitarDetalles } from "./editarFigura";
describe("editarFigura · etapa 4", () => {
  it("quitar un grupo de detalles deja los demás", () => {
    let f = alternarDetalle(figuraNueva(), "DETAIL_003", ocupa);
    f = alternarDetalle(f, "DETAIL_005", ocupa);
    f = alternarDetalle(f, "DETAIL_008", ocupa);
    expect(quitarDetalles(f, ocupa, "ojos").identidad.detalles.sort()).toEqual(["DETAIL_005", "DETAIL_008"]);
    expect(quitarDetalles(f, ocupa, null).identidad.detalles.sort()).toEqual(["DETAIL_003", "DETAIL_005"]);
  });
  it("momentos: un paquete llena los cuatro; normal vuelve a los de siempre", () => {
    const p = { id: "fuego", espera: "flama-manos", victoria: "explosion-fuego", derrota: "humo", punto: "bola-fuego" };
    expect(ponerMomentos(figuraNueva(), p).momentos).toEqual({ paquete: "fuego", espera: "flama-manos", victoria: "explosion-fuego", derrota: "humo", punto: "bola-fuego" });
    expect(ponerMomentos(ponerMomentos(figuraNueva(), p), MOMENTOS_NORMALES).momentos.paquete).toBeNull();
  });
  it("apodo: sin etiquetas ni saltos, máximo 24, vacío = Mi figura", () => {
    expect(limpiarApodo("<b>El\n  Rayo</b>")).toBe("bEl Rayo/b");
    expect(limpiarApodo("x".repeat(40))).toHaveLength(24);
    expect(ponerApodo(figuraNueva(), "   ").nombre).toBe("Mi figura");
  });
});

import { apodoDe, conApodo } from "./figura3d";
describe("apodo visible para los demás", () => {
  it("solo hay apodo si el jugador lo escribió (no el nombre de un personaje viejo)", () => {
    expect(apodoDe({ version: 2, nombre: "Spider-Man" })).toBeNull();
    const f = ponerApodo(figuraNueva(), "El Rayo") as never;
    expect(apodoDe(f)).toBe("El Rayo");
    expect(conApodo("Elias", f)).toBe("El Rayo (Elias)");
    expect(apodoDe(ponerApodo(f, "") as never)).toBeNull();
  });
});
