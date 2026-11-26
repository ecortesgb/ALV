// Lee y valida la ficha de un personaje que entrega producción (CONTRATO-ENTREGA.md §3).
// Lo que llega de un servidor no es confiable: se revisa campo por campo y se rechaza lo que no cuadra.
import { familia } from "./familias";
import { HUESOS_LOGICOS, LOGICAS, esId, esLogica, type Ficha, type HuesoLogico, type Logica } from "./tipos";

const texto = (x: unknown, max = 80): x is string => typeof x === "string" && x.length > 0 && x.length <= max;
/** Ruta relativa sin salir hacia arriba ni ser una dirección completa. */
const ruta = (x: unknown): x is string =>
  typeof x === "string" && x.length > 0 && x.length <= 200 && !/^[a-z]+:|^\/|\\|(^|\/)\.\.(\/|$)/i.test(x) && /^[\w./-]+$/.test(x);
const clip = (x: unknown): x is string => typeof x === "string" && /^[\w .:-]{1,80}$/.test(x);

export type Resultado = { ok: true; ficha: Ficha } | { ok: false; errores: string[] };

export function leerFicha(x: unknown, opciones: { rutasLibres?: boolean } = {}): Resultado {
  const e: string[] = [];
  const f = (x ?? {}) as Record<string, unknown>;
  const okRuta = (r: unknown) => ruta(r) || (opciones.rutasLibres === true && typeof r === "string" && /^(\.\.\/)*[\w./-]+$/.test(r));
  if (!esId(f.id)) e.push("id");
  if (!texto(f.nombre, 40)) e.push("nombre");
  if (!esId(f.saga)) e.push("saga");
  if (!esId(f.grupo)) e.push("grupo");
  if (!["heroe", "villano", "otro"].includes(f.bando as string)) e.push("bando");
  const fam = esId(f.familia) ? familia(f.familia) : null;
  if (!fam) e.push("familia");
  if (f.rig !== "esqueleto" && f.rig !== "rigido") e.push("rig");
  else if (fam && fam.rig !== f.rig) e.push("rig distinto al de su familia");
  if (!okRuta(f.glb) || !/\.glb$/i.test(String(f.glb))) e.push("glb");
  const fotos = (f.fotos ?? {}) as Record<string, unknown>;
  if (!okRuta(fotos.tarjeta) || !okRuta(fotos.busto)) e.push("fotos");

  const huesos: Partial<Record<HuesoLogico, string>> = {};
  for (const [k, v] of Object.entries((f.huesos ?? {}) as Record<string, unknown>)) {
    if (!(HUESOS_LOGICOS as readonly string[]).includes(k) || !clip(v)) { e.push("huesos." + k); continue; }
    huesos[k as HuesoLogico] = v;
  }
  if (!huesos.cabeza) e.push("huesos.cabeza");

  const an = (f.animaciones ?? {}) as Record<string, unknown>;
  const mapa: Partial<Record<Logica, string>> = {};
  for (const [k, v] of Object.entries((an.mapa ?? {}) as Record<string, unknown>)) {
    if (!esLogica(k) || !clip(v)) { e.push("animaciones.mapa." + k); continue; }
    mapa[k] = v;
  }
  if (!mapa.reposo) e.push("animaciones.mapa.reposo");
  const respaldo: Partial<Record<Logica, Logica>> = {};
  for (const [k, v] of Object.entries((an.respaldo ?? {}) as Record<string, unknown>)) {
    if (!esLogica(k) || !esLogica(v) || k === v) { e.push("animaciones.respaldo." + k); continue; }
    respaldo[k] = v;
  }
  const vida = Array.isArray(an.vida) ? an.vida : [];
  if (vida.length > 6 || !vida.every(clip)) e.push("animaciones.vida");
  const sentado = an.sentado == null ? null : an.sentado;
  if (sentado !== null && !clip(sentado)) e.push("animaciones.sentado");

  const med = (f.medidas ?? {}) as Record<string, unknown>;
  if (typeof med.altura !== "number" || !(med.altura > 0) || med.altura > 1000) e.push("medidas.altura");
  const carga = (f.carga ?? {}) as Record<string, unknown>;
  const rug = carga.rugosidad == null ? null : carga.rugosidad;
  if (typeof carga.colores_srgb !== "boolean") e.push("carga.colores_srgb");
  if (rug !== null && (typeof rug !== "number" || rug < 0 || rug > 1)) e.push("carga.rugosidad");
  const metal = Array.isArray(carga.metal) ? carga.metal : [];
  if (!metal.every(clip)) e.push("carga.metal");

  const origen = (f.origen ?? {}) as Record<string, unknown>;
  if (!["juego", "ldraw", "propia"].includes(origen.fuente as string)) e.push("origen.fuente");
  if (typeof f.publica !== "boolean") e.push("publica");
  else if (f.publica && origen.fuente === "juego") e.push("publica: lo de un juego nunca es público");
  const cal = (f.calidad ?? {}) as Record<string, unknown>;
  if (!["borrador", "jugable", "revision", "aprobado"].includes(cal.estado as string)) e.push("calidad.estado");

  if (e.length) return { ok: false, errores: e };
  return {
    ok: true,
    ficha: {
      id: f.id as string, nombre: f.nombre as string, saga: f.saga as string, grupo: f.grupo as string, bando: f.bando as Ficha["bando"],
      familia: f.familia as string, rig: f.rig as Ficha["rig"], glb: f.glb as string,
      fotos: { tarjeta: fotos.tarjeta as string, busto: fotos.busto as string },
      huesos, animaciones: { mapa, respaldo, vida: vida as string[], sentado: sentado as string | null },
      medidas: { altura: med.altura as number, pies_en_cero: med.pies_en_cero !== false, frente: "+Z" },
      carga: { colores_srgb: carga.colores_srgb as boolean, rugosidad: rug as number | null, metal: metal as string[] },
      origen: { fuente: origen.fuente as Ficha["origen"]["fuente"], juego: origen.juego as string | undefined,
        personaje_juego: origen.personaje_juego as string | undefined, herramienta: origen.herramienta as string | undefined },
      publica: f.publica as boolean,
      calidad: { estado: cal.estado as Ficha["calidad"]["estado"], notas: typeof cal.notas === "string" ? cal.notas.slice(0, 300) : undefined },
    },
  };
}

/** Las lógicas que faltan en el mapa (para avisar a producción, no es error). */
export const logicasQueFaltan = (f: Ficha): Logica[] => LOGICAS.filter(l => !f.animaciones.mapa[l]);
