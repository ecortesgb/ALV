import { describe, expect, it } from "vitest";
import { alternarDetalle, capaDe, colorDeLado, colorPiernas, completar, cuelloDe, figuraNueva, ponerBrazos, ponerCapa, ponerCuello, ponerManos, ponerPelo, ponerRostro, ponerMascara, colorEstampado, tipoPiernas, } from "./editarFigura";
const ocupa = (id) => ({ DETAIL_001: "ojos", DETAIL_003: "ojos", DETAIL_005: "barba" }[id] ?? null);
describe("editarFigura", () => {
    it("no modifica la figura original", () => {
        const f = figuraNueva(), copia = structuredClone(f);
        ponerPelo(f, "HAIR_009");
        ponerBrazos(f, "der", "#123456");
        expect(f).toEqual(copia);
    });
    it("completa figuras viejas o incompletas sin perder lo que traen", () => {
        const g = completar({ version: 2, identidad: { piel: "#aa7d55" } });
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
        const f = ponerApodo(figuraNueva(), "El Rayo");
        expect(apodoDe(f)).toBe("El Rayo");
        expect(conApodo("Elias", f)).toBe("El Rayo (Elias)");
        expect(apodoDe(ponerApodo(f, ""))).toBeNull();
    });
});
import { pelaTapado, ponerCascoSolo, ponerMascaraCompleta, ponerTorsoCompleto } from "./editarFigura";
describe("cabeza y torso completo", () => {
    it("casco y máscara se excluyen; ambos tapan el pelo", () => {
        let f = ponerMascaraCompleta(figuraNueva(), "FACE_012", "#c8102e");
        expect(f.accesorios.cara).toMatchObject({ id: "FACE_012", color: "#c8102e", tapaPelo: true });
        expect(pelaTapado(f)).toBe(true);
        f = ponerCascoSolo(f, "HELM_003", "#f2cd37");
        expect(f.accesorios.cara).toBeNull();
        expect(pelaTapado(f)).toBe(true);
        expect(pelaTapado(ponerCascoSolo(f, null, "#000"))).toBe(false);
    });
    it("torso de personaje: colores originales, brazos y guantes que combinan", () => {
        const f = ponerTorsoCompleto(ponerBrazos(figuraNueva(), "der", "#000000"), "PRINT_002", { color: "#b3121b", colores: ["#e3b341", "#ffffff", "#6b4a2b"], brazos: "#b3121b", manos: "#e3b341" });
        expect(f.ropa.torso).toMatchObject({ estampado: "PRINT_002", color: "#b3121b" });
        expect(f.ropa.brazos).toBeNull();
        expect(f.ropa.guantes).toBe("#e3b341");
        expect(f.manual.brazo_der).toBeUndefined();
    });
    it("torso para pintar: brazos siguen al torso y manos a la piel", () => {
        const f = ponerTorsoCompleto(ponerManos(figuraNueva(), "ambos", "#111111"), "PRINT_020");
        expect(f.ropa.guantes).toBeNull();
        expect(f.ropa.brazos).toBeNull();
    });
});
import { conservar, vestirCompleto, vestirSoloTraje } from "./editarFigura";
describe("trajes y candados", () => {
    const traje = { ...figuraNueva(), nombre: "Héroe", identidad: { ...figuraNueva().identidad, piel: "#352100", rostro: "FACE_005" },
        ropa: { ...figuraNueva().ropa, torso: { ...figuraNueva().ropa.torso, estampado: "PRINT_004", color: "#c8102e" } },
        accesorios: { ...figuraNueva().accesorios, cara: { id: "FACE_012", color: "#c8102e" }, espalda: { id: "CAPE_001", color: "#c91a09" } } };
    const mia = ponerApodo(ponerPelo(figuraNueva(), "HAIR_014"), "El Rayo");
    it("personaje completo: todas sus piezas, pero mi apodo", () => {
        const g = vestirCompleto(mia, traje);
        expect(g.identidad.rostro).toBe("FACE_005");
        expect(g.accesorios.cara?.id).toBe("FACE_012");
        expect(g.nombre).toBe("El Rayo");
        expect(g.extensiones.alv.apodo).toBe("El Rayo");
    });
    it("solo el traje: mi piel, rostro, pelo y cabeza; su ropa y capa", () => {
        const g = vestirSoloTraje(mia, traje);
        expect(g.identidad.cabello?.id).toBe("HAIR_014");
        expect(g.identidad.piel).toBe(mia.identidad.piel);
        expect(g.accesorios.cara).toBeNull();
        expect(g.ropa.torso.estampado).toBe("PRINT_004");
        expect(g.accesorios.espalda?.id).toBe("CAPE_001");
    });
    it("candados: lo anclado se queda, lo demás cambia", () => {
        const nueva = vestirCompleto(mia, traje);
        const g = conservar(nueva, mia, ["pelo", "torso"]);
        expect(g.identidad.cabello?.id).toBe("HAIR_014");
        expect(g.accesorios.cara).toBeNull();
        expect(g.ropa.torso.estampado).toBeNull();
        expect(g.identidad.rostro).toBe("FACE_005");
    });
});
import { limpiarBloqueadas, ponerObjeto } from "./editarFigura";
describe("limpiar piezas bloqueadas", () => {
    it("cambia o quita solo lo que no es libre", () => {
        let f = ponerCascoSolo(ponerPelo(figuraNueva(), "HAIR_010"), "HELM_012", "#1b2a34");
        f = ponerMomentos(ponerObjeto(f, "mano_der", { id: "ACC_010" }), { id: "fuego", espera: "a", victoria: "b", derrota: "c", punto: "d" });
        const libres = new Set(["HAIR_001", "ACC_010", "FACE_001"]);
        const g = limpiarBloqueadas(f, id => libres.has(id) || id.startsWith("X"));
        expect(g.identidad.cabello?.id).toBe("HAIR_001");
        expect(g.accesorios.cabeza).toBeNull();
        expect(g.accesorios.mano_der?.id).toBe("ACC_010");
        expect(g.momentos.paquete).toBeNull();
    });
});
