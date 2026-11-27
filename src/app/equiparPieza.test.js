import { describe, expect, it } from "vitest";
import { ponerPieza } from "./equiparPieza";
import { PIEZAS_COLECCION } from "../content/tienda";
import { completar } from "./editarFigura";
describe("Ponérmelo", () => {
    it("toda pieza de la colección sabe dónde va", () => {
        for (const p of PIEZAS_COLECCION)
            expect(ponerPieza(null, p.id), p.id).not.toBeNull();
    });
    it("cada pieza queda puesta en su lugar", () => {
        expect(completar(ponerPieza(null, "HAIR_010")).identidad.cabello?.id).toBe("HAIR_010");
        expect(completar(ponerPieza(null, "HELM_005")).accesorios.cabeza?.id).toBe("HELM_005");
        expect(completar(ponerPieza(null, "PRINT_013")).ropa.torso.estampado).toBe("PRINT_013");
        expect(completar(ponerPieza(null, "ACC_002")).accesorios.mano_der?.id).toBe("ACC_002");
        expect(completar(ponerPieza(null, "MOM_fuego")).momentos.paquete).toBe("fuego");
        expect(completar(ponerPieza(null, "DETAIL_004")).identidad.detalles).toContain("DETAIL_004");
    });
    it("pieza desconocida: null", () => {
        expect(ponerPieza(null, "NADA_999")).toBeNull();
    });
});
