// «Ponérmelo»: pone en la figura una pieza recién ganada en la tienda, con las mismas reglas del personalizador.
import catalogo from "../content/catalogo-figura.json";
import type { FiguraV2 } from "../content/personaje";
import {
  alternarDetalle, completar, cuelloDe, ponerCapa, ponerCascoSolo, ponerCuello, ponerMascaraCompleta, ponerMomentos,
  ponerObjeto, ponerPelo, ponerRostro, ponerTorsoCompleto, type TrajeOriginal,
} from "./editarFigura";

type Item = { id?: string | null; color?: string; ocupa?: string | null; original?: TrajeOriginal };
const SECCIONES = catalogo.secciones as unknown as Record<string, Item[]>;
const OCUPA = new Map(SECCIONES.detalle!.filter(d => d.id).map(d => [d.id as string, d.ocupa ?? null]));

/** Sección del catálogo donde vive la pieza y su ficha. */
export function buscarEnCatalogo(id: string): { seccion: string; item: Item } | null {
  for (const [seccion, lista] of Object.entries(SECCIONES)) {
    const item = lista.find(p => p.id === id);
    if (item) return { seccion, item };
  }
  return null;
}

/** Devuelve la figura con la pieza puesta, o null si no se sabe dónde va. */
export function ponerPieza(figura: FiguraV2 | null | undefined, id: string): FiguraV2 | null {
  const f = completar(figura);
  let g;
  if (id.startsWith("MOM_")) {
    const p = catalogo.paquetes.find(x => x.id === id.slice(4));
    if (!p) return null;
    g = ponerMomentos(f, { id: p.id, espera: p.espera, victoria: p.victoria, derrota: p.derrota, punto: p.punto });
  } else {
    const hallado = buscarEnCatalogo(id);
    if (!hallado) return null;
    const { seccion, item } = hallado;
    switch (seccion) {
      case "pelo": g = ponerPelo(ponerCascoSolo(f, null, ""), id); break;
      case "casco": g = ponerCascoSolo(f, id, item.color ?? "#6c6e68"); break;
      case "mascara": g = ponerMascaraCompleta(f, id, item.color ?? "#c91a09"); break;
      case "rostro": g = ponerRostro(f, id); break;
      case "detalle": g = f.identidad.detalles.includes(id) ? f : alternarDetalle(f, id, x => OCUPA.get(x) ?? null); break;
      case "cuello": g = ponerCuello(f, { id, color: cuelloDe(f)?.color ?? "#6c6e68" }); break;
      case "capa": g = ponerCapa(f, { id, color: "#c91a09" }); break;
      case "torso": g = ponerTorsoCompleto(f, id, item.original); break;
      case "objeto": g = ponerObjeto(f, "mano_der", { id, color: item.color ?? "#a0a5a9" }); break;
      default: return null;
    }
  }
  return g as unknown as FiguraV2;
}
