// Tienda nueva (Maestro v1.48, enfoque A).
// - Demostración sin nube: monedas, comodines y racha viven en este navegador y la tirada se hace aquí, solo para ver la tienda.
// - Con nube: las monedas, la tirada y lo ganado son del servidor (migración 036). Sin la 036 aplicada no se puede comprar.
import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { escribirCapsulas, leerCapsulas } from "../app/figura3d";
import { ponerPieza } from "../app/equiparPieza";
import { sesionAhora } from "../app/sesion";
import { COMODINES, MONEDAS_DEMO, MONEDAS_SI_TOPE, PROB_CUALQUIERA, TOPE_COMODIN, sobreAlvPorId, sobrePorId } from "../content/tienda";
import { ACCESORIOS, type AccesorioTienda } from "../content/accesoriosTienda";
import { CARTAS_POR_SOBRE_PERSONAJES, PESO_PERSONAJE, precioSobrePersonajes, type PersonajeEnVenta } from "../content/personajesTienda";
import { crearAzar } from "../engine/azar";
import { ORDEN, RACHA_CERO, abrirSobre, type Apertura, type Carta, type Racha } from "../engine/sobresTienda";
import { cliente, hayNube } from "./cliente";
import { agregarPiezasDemo, cargarPiezas, piezasAhora } from "./piezas";
import { enlace } from "./enlace";

export interface EstadoTienda {
  /** Se puede comprar (en demostración sí; en la nube cuando exista la migración). */ activa: boolean;
  demo: boolean;
  monedas: number;
  comodines: Record<string, number>;
  preciosReposicion: Record<string, number>;
  catalogoPersonajes: PersonajeEnVenta[] | null;
  personajes: ReadonlySet<string>;
  /** Cartas de accesorio a la venta (058) y las que ya tiene (desbloquean esa pieza en el personalizador). */
  catalogoAccesorios: AccesorioTienda[] | null;
  accesorios: ReadonlySet<string>;
  racha: Racha;
  /** Piezas ganadas que todavía no se ven en la colección (punto azul). */ nuevas: Set<string>;
}
let estado: EstadoTienda = { activa: !hayNube, demo: !hayNube, monedas: 0, comodines: {}, preciosReposicion: {}, catalogoPersonajes: null,
  personajes: new Set(), catalogoAccesorios: null, accesorios: new Set(), racha: RACHA_CERO, nuevas: new Set() };
const oyentes = new Set<() => void>();
const fijar = (e: Partial<EstadoTienda>) => { estado = { ...estado, ...e }; oyentes.forEach(f => f()); };
export const useTienda = () => useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => estado);

// ---------- Demostración ----------
type Demo = { monedas: number; comodines: Record<string, number>; racha: Racha; nuevas: string[]; personajes: string[]; accesorios: string[] };
const CLAVE = (uid: string) => "alv-tienda-demo-" + (uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
function leerDemo(uid: string): Demo {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE(uid)) ?? "null") as Demo | null;
    if (d && typeof d.monedas === "number") return { monedas: d.monedas, comodines: d.comodines ?? {}, racha: d.racha ?? RACHA_CERO,
      nuevas: d.nuevas ?? [], personajes: Array.isArray(d.personajes) ? d.personajes : [],
      accesorios: Array.isArray(d.accesorios) ? d.accesorios : [] };
  } catch { /* nada */ }
  return { monedas: MONEDAS_DEMO, comodines: {}, racha: RACHA_CERO, nuevas: [], personajes: [], accesorios: [] };
}
function escribirDemo(uid: string, d: Demo) { try { localStorage.setItem(CLAVE(uid), JSON.stringify(d)); } catch { /* sin espacio */ } }
const desdeDemo = (d: Demo): Partial<EstadoTienda> => ({ monedas: d.monedas, comodines: d.comodines, racha: d.racha, nuevas: new Set(d.nuevas), personajes: new Set(d.personajes), accesorios: new Set(d.accesorios) });

export async function cargarPersonajesTienda() {
  const uid = sesionAhora().uid;
  if (!hayNube) { const d = leerDemo(uid); fijar({ personajes: new Set(d.personajes), catalogoAccesorios: [...ACCESORIOS], accesorios: new Set(d.accesorios) }); return; }
  const { data, error } = await cliente!.rpc("estado_personajes_tienda");
  if (uid !== sesionAhora().uid) return;
  const resultado = !error && data as { catalogo: PersonajeEnVenta[]; personajes: string[]; accesorios?: AccesorioTienda[]; mis_accesorios?: string[] } | null;
  fijar({ catalogoPersonajes: resultado ? resultado.catalogo : null, personajes: new Set(resultado ? resultado.personajes : []),
    // Sin la 058 no vienen: la venta de accesorios y los sobres nuevos no se muestran.
    catalogoAccesorios: resultado && resultado.accesorios ? resultado.accesorios : null, accesorios: new Set(resultado ? resultado.mis_accesorios ?? [] : []) });
}

/** Lee el saldo y lo ganado. Llamar al abrir la tienda. */
export async function cargarTienda(): Promise<void> {
  await Promise.all([cargarPiezas(), cargarPersonajesTienda()]);
  if (!hayNube) {
    fijar({ activa: true, demo: true, preciosReposicion: Object.fromEntries(COMODINES.map(c => [c.id, c.reposicion])), ...desdeDemo(leerDemo(sesionAhora().uid)) });
    return;
  }
  try {
    const { data, error } = await cliente!.rpc("estado_tienda");
    if (error) { fijar({ activa: false, demo: false, preciosReposicion: {} }); return; }
    const fila = (data as { monedas: number; sin_epica: number; sin_legendaria: number; comodines: Record<string, number> }[] | null)?.[0];
    fijar({
      activa: true, demo: false, monedas: fila?.monedas ?? 0, comodines: fila?.comodines ?? {},
      racha: { sinEpica: fila?.sin_epica ?? 0, sinLegendaria: fila?.sin_legendaria ?? 0 },
    });
    const { data: precios } = await cliente!.from("comodines_tienda").select().eq("activo", true);
    fijar({ preciosReposicion: Object.fromEntries((precios ?? []).flatMap(c =>
      typeof c.precio_reposicion === "number" ? [[c.id, c.precio_reposicion]] : [])) });
  } catch (e) { console.error("cargarTienda", e); fijar({ activa: false, demo: false, preciosReposicion: {} }); }
}

export async function comprarPersonajes(modo: "sobre" | "carta", destino: string, precio: number,
  catalogoDemo: readonly PersonajeEnVenta[]): Promise<Apertura | string> {
  const uid = sesionAhora().uid;
  let cartas: Extract<Carta, { tipo: "personaje" }>[];
  if (estado.demo) {
    const d = leerDemo(uid), adquiridos = new Set(d.personajes);
    const lista = catalogoDemo.filter(x => (modo === "sobre" ? x.saga === destino : x.id === destino) && !adquiridos.has(x.id));
    if (!lista.length) return "Ya no quedan personajes disponibles.";
    if (precio !== (modo === "sobre" ? precioSobrePersonajes(lista.length) : lista[0]!.precio)) return "El precio cambió. Revisa el saldo y vuelve a intentar.";
    if (d.monedas < precio) return "No te alcanzan las monedas.";
    const cantidad = modo === "sobre" ? Math.min(CARTAS_POR_SOBRE_PERSONAJES, lista.length) : 1;
    cartas = Array.from({ length: cantidad }, () => {
      let tiro = Math.random() * lista.reduce((suma, c) => suma + PESO_PERSONAJE[c.rareza], 0);
      const i = lista.findIndex(c => (tiro -= PESO_PERSONAJE[c.rareza]) < 0);
      const [c] = lista.splice(i, 1);
      return { tipo: "personaje", id: c!.id, rareza: c!.rareza };
    });
    const nuevo = { ...d, monedas: d.monedas - precio, personajes: [...d.personajes, ...cartas.map(c => c.id)] };
    escribirDemo(uid, nuevo);
    fijar(desdeDemo(nuevo));
  } else {
    if (!estado.catalogoPersonajes || !cliente) return "La venta de personajes todavía no está activa.";
    const datos = { p_modo: modo, p_destino: destino, p_precio: precio, p_pedido: crypto.randomUUID() };
    let r = await cliente.rpc("comprar_personajes", datos);
    if (r.error && /fetch|network|failed/i.test(r.error.message)) r = await cliente.rpc("comprar_personajes", datos);
    if (uid !== sesionAhora().uid) return "Cambió la sesión.";
    if (r.error) {
      if (/precio|disponibles/.test(r.error.message)) { await cargarPersonajesTienda(); return "Cambió la disponibilidad. Revisa la colección."; }
      return r.error.message.includes("saldo") ? "No te alcanzan las monedas." : "No se pudo completar la compra.";
    }
    const compra = r.data as { cartas: typeof cartas; monedas: number };
    cartas = compra.cartas;
    fijar({ monedas: compra.monedas, personajes: new Set([...estado.personajes, ...cartas.map(c => c.id)]) });
  }
  cartas.sort((a, b) => ORDEN.indexOf(a.rareza) - ORDEN.indexOf(b.rareza));
  return { cartas, racha: estado.racha, mejor: cartas.at(-1)!.rareza };
}

export async function reponerComodin(id: string): Promise<string | null> {
  const precio = estado.preciosReposicion[id];
  if (!precio) return "Esta carta todavía no está disponible.";
  if (estado.demo) {
    const uid = sesionAhora().uid, d = leerDemo(uid);
    if ((d.comodines[id] ?? 0) >= TOPE_COMODIN) return `Ya tienes ${TOPE_COMODIN} copias, el máximo.`;
    if (d.monedas < precio) return `Te faltan ${precio - d.monedas} monedas.`;
    const nuevo = { ...d, monedas: d.monedas - precio, comodines: { ...d.comodines, [id]: (d.comodines[id] ?? 0) + 1 } };
    escribirDemo(uid, nuevo);
    fijar(desdeDemo(nuevo));
    return null;
  }
  const pedido = crypto.randomUUID();
  const parametros = { p_comodin: id, p_pedido: pedido };
  let r = await cliente!.rpc("reponer_comodin", parametros);
  if (r.error && /fetch|network|failed/i.test(r.error.message)) r = await cliente!.rpc("reponer_comodin", parametros);
  if (r.error) {
    const m = r.error.message;
    if (m.includes("saldo")) return "No te alcanzan las monedas.";
    if (m.includes("tope")) return `Ya tienes ${TOPE_COMODIN} copias, el máximo.`;
    if (m.includes("copias")) return "Todavía tienes copias de esta carta."; // sin la 058
    if (m.includes("sobre")) return "Primero consigue la carta en un sobre."; // sin la 058
    return "No se pudo comprar la carta. Intenta otra vez.";
  }
  const d = r.data as { monedas: number; cantidad: number };
  fijar({ monedas: d.monedas, comodines: { ...estado.comodines, [id]: d.cantidad } });
  return null;
}

/** Dónde y con qué cuenta se usa el comodín. Sin `cliente`, la sesión de este aparato. `espejo`: lobby de un solo aparato. */
export interface DondeComodin { partida: string; cliente?: SupabaseClient | null; espejo?: string | null }
export interface Inventario { monedas: number; comodines: Record<string, number>; precios: Record<string, number> }

/** Colección y monedas de otra cuenta que juega en este aparato (su propia sesión). */
export async function inventarioDe(c: SupabaseClient): Promise<Inventario | null> {
  try {
    const [{ data, error }, { data: precios }] = await Promise.all([c.rpc("estado_tienda"), c.from("comodines_tienda").select().eq("activo", true)]);
    if (error) return null;
    const fila = (data as { monedas: number; comodines: Record<string, number> }[] | null)?.[0];
    return { monedas: fila?.monedas ?? 0, comodines: fila?.comodines ?? {},
      precios: Object.fromEntries((precios ?? []).flatMap(x => typeof x.precio_reposicion === "number" ? [[x.id, x.precio_reposicion]] : [])) };
  } catch (e) { console.error("inventarioDe", e); return null; }
}

/**
 * Usa un comodín de la colección en la partida (Maestro v1.72). Si no quedan copias y `comprar`, lo paga con monedas
 * al precio de reposición y se usa de una vez, aunque nunca haya salido en un sobre. En línea, el servidor descuenta o
 * cobra y escribe la jugada en un solo paso; en un solo aparato descuenta o cobra y la jugada la escribe el teléfono.
 * Devuelve el inventario nuevo de esa carta, o el mensaje para el jugador.
 */
export async function usarComodin(d: DondeComodin, comodin: string, comprar: boolean): Promise<{ monedas: number; cantidad: number } | string> {
  const accion = crypto.randomUUID();
  if (estado.demo && !d.cliente) {
    const uid = sesionAhora().uid, x = leerDemo(uid), tengo = x.comodines[comodin];
    const precio = estado.preciosReposicion[comodin] ?? 0;
    let nuevo: Demo;
    if (tengo && tengo > 0) nuevo = { ...x, comodines: { ...x.comodines, [comodin]: tengo - 1 } };
    else if (!comprar) return "Ya no te quedan copias.";
    else if (x.monedas < precio) return `Te faltan ${precio - x.monedas} monedas.`;
    else nuevo = { ...x, monedas: x.monedas - precio, comodines: { ...x.comodines, [comodin]: 0 } };
    if (!(await enlace.enviar(d.partida, accion, "comodin", { carta: comodin }))) return "No se pudo usar. Intenta otra vez.";
    escribirDemo(uid, nuevo);
    fijar(desdeDemo(nuevo));
    return { monedas: nuevo.monedas, cantidad: nuevo.comodines[comodin] ?? 0 };
  }
  const c = d.cliente ?? cliente;
  if (!c) return "No se pudo usar. Intenta otra vez.";
  const [fn, parametros] = d.espejo
    ? ["usar_comodin_aparato", { p_espejo: d.espejo, p_accion: accion, p_comodin: comodin, p_comprar: comprar }] as const
    : ["usar_comodin", { p_partida: d.partida, p_accion: accion, p_comodin: comodin, p_comprar: comprar }] as const;
  let r = await c.rpc(fn, parametros);
  if (r.error && /fetch|network|failed/i.test(r.error.message)) r = await c.rpc(fn, parametros);
  if (r.error) {
    const m = r.error.message;
    console.warn("[tienda] usarComodin", r.error);
    if (m.includes("saldo")) return "No te alcanzan las monedas.";
    if (m.includes("copias")) return "Ya no te quedan copias.";
    return "No se pudo usar. Intenta otra vez.";
  }
  const res = r.data as { monedas: number; cantidad: number };
  // Un solo aparato: ya se pagó; la jugada va a la partida del teléfono.
  if (d.espejo && !(await enlace.enviar(d.partida, accion, "comodin", { carta: comodin }))) return "No se pudo usar. Intenta otra vez.";
  if (c === cliente) fijar({ monedas: res.monedas, comodines: { ...estado.comodines, [comodin]: res.cantidad } });
  return res;
}

/** Nube: el servidor cobra, tira y entrega (abrir_sobre de la 036). Un reintento con el mismo pedido no cobra dos veces. */
async function abrirEnNube(id: string): Promise<Apertura | string> {
  const pedido = crypto.randomUUID();
  let r = await cliente!.rpc("abrir_sobre", { p_sobre: id, p_pedido: pedido });
  if (r.error && /fetch|network|Failed/i.test(r.error.message)) r = await cliente!.rpc("abrir_sobre", { p_sobre: id, p_pedido: pedido });
  if (r.error) {
    console.error("abrir_sobre", r.error.message);
    const m = r.error.message;
    return m.includes("saldo") ? "No te alcanzan las monedas." : m.includes("ya tienes todo") ? "¡Ya tienes todo lo de este sobre!" : "No se pudo abrir el sobre. Intenta otra vez.";
  }
  const d = r.data as { cartas: Carta[]; mejor: Apertura["mejor"]; racha: Racha; monedas: number };
  const piezas = d.cartas.filter((c): c is Extract<Carta, { tipo: "pieza" }> => c.tipo === "pieza").map(c => c.id);
  const comodines = { ...estado.comodines };
  for (const c of d.cartas) if (c.tipo === "comodin") comodines[c.id] = (comodines[c.id] ?? 0) + 1;
  fijar({ monedas: d.monedas, racha: d.racha, comodines, nuevas: new Set([...estado.nuevas, ...piezas]) });
  await cargarPiezas(); // el personalizador ya las ve desbloqueadas
  return { cartas: d.cartas, mejor: d.mejor, racha: d.racha };
}

/** Abre un sobre. Devuelve lo que salió o el motivo para mostrar. */
export async function abrir(id: string): Promise<Apertura | string> {
  const s = sobrePorId(id);
  if (!s) return "Ese sobre no existe.";
  if (!estado.activa) return "La tienda abre pronto.";
  if (estado.monedas < s.precio) return `Te faltan ${s.precio - estado.monedas} monedas.`;
  if (!estado.demo) return abrirEnNube(id);
  const uid = sesionAhora().uid, d = leerDemo(uid);
  const azar = crearAzar((Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0);
  const a = abrirSobre(s, piezasAhora().tengo, d.comodines, d.racha, azar);
  if (!a) return "¡Ya tienes todo lo de este sobre!";
  const piezas: string[] = [];
  const comodines = { ...d.comodines };
  let monedas = d.monedas - s.precio;
  for (const c of a.cartas) {
    if (c.tipo === "pieza") piezas.push(c.id);
    else if (c.tipo === "comodin") comodines[c.id] = (comodines[c.id] ?? 0) + 1;
    else if (c.tipo === "monedas") monedas += c.cantidad;
  }
  const nuevo: Demo = { ...d, monedas, comodines, racha: a.racha, nuevas: [...new Set([...d.nuevas, ...piezas])] };
  escribirDemo(uid, nuevo);
  agregarPiezasDemo(piezas);
  fijar(desdeDemo(nuevo));
  return a;
}

// ---------- Tienda v2 (058): sobres de cualquier saga y cartas de accesorio ----------
type CartaAlv = Extract<Carta, { tipo: "personaje" | "accesorio" | "comodin" | "monedas" }>;
const nivelR = (r: string) => ORDEN.indexOf(r as never);

/** Tirada local (solo demostración). Mismas reglas que abrir_sobre_alv en el servidor. */
function tirarAlv(id: string, d: Demo, personajes: readonly PersonajeEnVenta[]): { cartas: CartaAlv[]; comodines: Record<string, number>; extra: number } {
  const s = sobreAlvPorId(id)!;
  const tomados = new Set<string>(), comodines = { ...d.comodines }, cartas: CartaAlv[] = [];
  let mejor = -1, extra = 0;
  const elegir = <T extends { id: string; rareza: string }>(lista: T[], rar: string) => {
    if (!lista.length) return null;
    const dist = (x: T) => Math.abs(nivelR(x.rareza) - nivelR(rar));
    const min = Math.min(...lista.map(dist)), mejores = lista.filter(x => dist(x) === min);
    return mejores[Math.floor(Math.random() * mejores.length)]!;
  };
  s.ranuras.forEach((ranura, k) => {
    let tipo: string = ranura;
    if (tipo === "cualquiera") { const t = Math.random(); tipo = t < PROB_CUALQUIERA.personaje ? "personaje" : t < PROB_CUALQUIERA.personaje + PROB_CUALQUIERA.accesorio ? "accesorio" : "comodin"; }
    const total = s.pesos.rara + s.pesos.epica + s.pesos.legendaria;
    let t = Math.random() * total;
    let rar = t < s.pesos.rara ? "rara" : (t -= s.pesos.rara) < s.pesos.epica ? "epica" : "legendaria";
    if (s.minimo && k === s.ranuras.length - 1 && mejor < nivelR(s.minimo) && nivelR(rar) < nivelR(s.minimo)) rar = s.minimo;
    let hecho = false;
    if (tipo === "personaje") {
      const x = elegir(personajes.filter(p => !tomados.has(p.id) && !d.personajes.includes(p.id)), rar);
      if (x) { cartas.push({ tipo: "personaje", id: x.id, rareza: x.rareza }); tomados.add(x.id); mejor = Math.max(mejor, nivelR(x.rareza)); hecho = true; }
      else tipo = "accesorio";
    }
    if (!hecho && tipo === "accesorio") {
      const x = elegir(ACCESORIOS.filter(a => !tomados.has(a.id) && !tomados.has(a.donante) && !d.accesorios.includes(a.id) && !d.personajes.includes(a.donante)), rar);
      if (x) { cartas.push({ tipo: "accesorio", id: x.id, rareza: x.rareza }); tomados.add(x.id); mejor = Math.max(mejor, nivelR(x.rareza)); hecho = true; }
    }
    if (!hecho) {
      const c = COMODINES[Math.floor(Math.random() * COMODINES.length)]!;
      if ((comodines[c.id] ?? 0) >= TOPE_COMODIN) { cartas.push({ tipo: "monedas", cantidad: MONEDAS_SI_TOPE, comodin: c.id }); extra += MONEDAS_SI_TOPE; }
      else { comodines[c.id] = (comodines[c.id] ?? 0) + 1; cartas.push({ tipo: "comodin", id: c.id, especial: c.especial }); }
      mejor = Math.max(mejor, 0);
    }
  });
  return { cartas, comodines, extra };
}

/** Lo mejor al final y la luz de esa carta. */
function comoApertura(cartas: CartaAlv[]): Apertura {
  const nivel = (c: CartaAlv) => "rareza" in c ? nivelR(c.rareza) + 1 : 0;
  const orden = cartas.slice().sort((a, b) => nivel(a) - nivel(b));
  const ult = orden.at(-1);
  return { cartas: orden, racha: estado.racha, mejor: ult && "rareza" in ult ? ult.rareza : "rara" };
}

/** Abre un sobre de la tienda v2. El servidor cobra, tira y entrega; un reintento con el mismo pedido no cobra dos veces. */
export async function abrirAlv(id: string, catalogoDemo: readonly PersonajeEnVenta[]): Promise<Apertura | string> {
  const s = sobreAlvPorId(id);
  if (!s) return "Ese sobre no existe.";
  if (!estado.activa) return "La tienda abre pronto.";
  if (estado.monedas < s.precio) return `Te faltan ${s.precio - estado.monedas} monedas.`;
  const uid = sesionAhora().uid;
  if (estado.demo) {
    const d = leerDemo(uid);
    const r = tirarAlv(id, d, catalogoDemo);
    const nuevo: Demo = { ...d, monedas: d.monedas - s.precio + r.extra, comodines: r.comodines,
      personajes: [...d.personajes, ...r.cartas.flatMap(c => c.tipo === "personaje" ? [c.id] : [])],
      accesorios: [...d.accesorios, ...r.cartas.flatMap(c => c.tipo === "accesorio" ? [c.id] : [])] };
    escribirDemo(uid, nuevo);
    fijar(desdeDemo(nuevo));
    return comoApertura(r.cartas);
  }
  if (!cliente || !estado.catalogoAccesorios) return "Los sobres nuevos todavía no están activos.";
  const datos = { p_sobre: id, p_precio: s.precio, p_pedido: crypto.randomUUID() };
  let r = await cliente.rpc("abrir_sobre_alv", datos);
  if (r.error && /fetch|network|failed/i.test(r.error.message)) r = await cliente.rpc("abrir_sobre_alv", datos);
  if (uid !== sesionAhora().uid) return "Cambió la sesión.";
  if (r.error) {
    console.error("abrir_sobre_alv", r.error.message);
    const m = r.error.message;
    if (m.includes("precio")) return "El precio cambió. Vuelve a abrir la tienda.";
    return m.includes("saldo") ? "No te alcanzan las monedas." : "No se pudo abrir el sobre. Intenta otra vez.";
  }
  const res = r.data as { cartas: CartaAlv[]; monedas: number };
  const comodines = { ...estado.comodines };
  for (const c of res.cartas) if (c.tipo === "comodin") comodines[c.id] = (comodines[c.id] ?? 0) + 1;
  fijar({ monedas: res.monedas, comodines,
    personajes: new Set([...estado.personajes, ...res.cartas.flatMap(c => c.tipo === "personaje" ? [c.id] : [])]),
    accesorios: new Set([...estado.accesorios, ...res.cartas.flatMap(c => c.tipo === "accesorio" ? [c.id] : [])]) });
  return comoApertura(res.cartas);
}

/** Compra directa de una carta de accesorio. Devuelve null si salió bien o el mensaje para el jugador. */
export async function comprarAccesorio(a: AccesorioTienda): Promise<string | null> {
  const uid = sesionAhora().uid;
  if (estado.accesorios.has(a.id) || estado.personajes.has(a.donante)) return "Ya tienes esta pieza.";
  if (estado.monedas < a.precio) return `Te faltan ${a.precio - estado.monedas} monedas.`;
  if (estado.demo) {
    const d = leerDemo(uid), nuevo = { ...d, monedas: d.monedas - a.precio, accesorios: [...d.accesorios, a.id] };
    escribirDemo(uid, nuevo);
    fijar(desdeDemo(nuevo));
    return null;
  }
  if (!cliente) return "No se pudo completar la compra.";
  const datos = { p_pieza: a.id, p_precio: a.precio, p_pedido: crypto.randomUUID() };
  let r = await cliente.rpc("comprar_accesorio", datos);
  if (r.error && /fetch|network|failed/i.test(r.error.message)) r = await cliente.rpc("comprar_accesorio", datos);
  if (uid !== sesionAhora().uid) return "Cambió la sesión.";
  if (r.error) {
    const m = r.error.message;
    if (/precio|disponibles/.test(m)) { await cargarPersonajesTienda(); return "Cambió la disponibilidad. Revisa la colección."; }
    return m.includes("saldo") ? "No te alcanzan las monedas." : "No se pudo completar la compra.";
  }
  fijar({ monedas: (r.data as { monedas: number }).monedas, accesorios: new Set([...estado.accesorios, a.id]) });
  return null;
}

/** Quita el punto azul de las piezas ya vistas en la colección. */
export function marcarVistas() {
  if (!estado.nuevas.size) return;
  const uid = sesionAhora().uid;
  if (estado.demo) { const d = leerDemo(uid); d.nuevas = []; escribirDemo(uid, d); }
  fijar({ nuevas: new Set() });
}

/** «Ponérmelo»: pone la pieza en la figura que está en juego (o en el primer espacio). Devuelve el número de espacio o null. */
export function ponermelo(id: string): number | null {
  const uid = sesionAhora().uid, e = leerCapsulas(uid);
  const k = e.activa ?? 0;
  const figura = ponerPieza(e.slots[k]?.figura, id);
  if (!figura) return null;
  const slots = e.slots.slice();
  slots[k] = { nombre: slots[k]?.nombre ?? "Mi figura", figura, actualizado: new Date().toISOString() };
  escribirCapsulas(uid, { ...e, slots, activa: e.activa ?? k });
  return k + 1;
}
