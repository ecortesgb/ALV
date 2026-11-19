// Tienda nueva (Maestro v1.48, enfoque A).
// - Demostración sin nube: monedas, comodines y racha viven en este navegador y la tirada se hace aquí, solo para ver la tienda.
// - Con nube: las monedas, la tirada y lo ganado son del servidor (migración 036). Sin la 036 aplicada no se puede comprar.
import { useSyncExternalStore } from "react";
import { escribirCapsulas, leerCapsulas } from "../app/figura3d";
import { ponerPieza } from "../app/equiparPieza";
import { sesionAhora } from "../app/sesion";
import { MONEDAS_DEMO, sobrePorId } from "../content/tienda";
import { crearAzar } from "../engine/azar";
import { RACHA_CERO, abrirSobre, type Apertura, type Carta, type Racha } from "../engine/sobresTienda";
import { cliente, hayNube } from "./cliente";
import { agregarPiezasDemo, cargarPiezas, piezasAhora } from "./piezas";

export interface EstadoTienda {
  /** Se puede comprar (en demostración sí; en la nube cuando exista la migración). */ activa: boolean;
  demo: boolean;
  monedas: number;
  comodines: Record<string, number>;
  racha: Racha;
  /** Piezas ganadas que todavía no se ven en la colección (punto azul). */ nuevas: Set<string>;
}
let estado: EstadoTienda = { activa: !hayNube, demo: !hayNube, monedas: 0, comodines: {}, racha: RACHA_CERO, nuevas: new Set() };
const oyentes = new Set<() => void>();
const fijar = (e: Partial<EstadoTienda>) => { estado = { ...estado, ...e }; oyentes.forEach(f => f()); };
export const useTienda = () => useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => estado);

// ---------- Demostración ----------
type Demo = { monedas: number; comodines: Record<string, number>; racha: Racha; nuevas: string[] };
const CLAVE = (uid: string) => "alv-tienda-demo-" + (uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "local");
function leerDemo(uid: string): Demo {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE(uid)) ?? "null") as Demo | null;
    if (d && typeof d.monedas === "number") return { monedas: d.monedas, comodines: d.comodines ?? {}, racha: d.racha ?? RACHA_CERO, nuevas: d.nuevas ?? [] };
  } catch { /* nada */ }
  return { monedas: MONEDAS_DEMO, comodines: {}, racha: RACHA_CERO, nuevas: [] };
}
function escribirDemo(uid: string, d: Demo) { try { localStorage.setItem(CLAVE(uid), JSON.stringify(d)); } catch { /* sin espacio */ } }
const desdeDemo = (d: Demo): Partial<EstadoTienda> => ({ monedas: d.monedas, comodines: d.comodines, racha: d.racha, nuevas: new Set(d.nuevas) });

/** Lee el saldo y lo ganado. Llamar al abrir la tienda. */
export async function cargarTienda(): Promise<void> {
  await cargarPiezas();
  if (!hayNube) { fijar({ activa: true, demo: true, ...desdeDemo(leerDemo(sesionAhora().uid)) }); return; }
  try {
    const { data, error } = await cliente!.rpc("estado_tienda");
    if (error) { fijar({ activa: false, demo: false }); return; } // sin la 036: la tienda sigue cerrada
    const fila = (data as { monedas: number; sin_epica: number; sin_legendaria: number; comodines: Record<string, number> }[] | null)?.[0];
    fijar({
      activa: true, demo: false, monedas: fila?.monedas ?? 0, comodines: fila?.comodines ?? {},
      racha: { sinEpica: fila?.sin_epica ?? 0, sinLegendaria: fila?.sin_legendaria ?? 0 },
    });
  } catch (e) { console.error("cargarTienda", e); fijar({ activa: false, demo: false }); }
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
    else monedas += c.cantidad;
  }
  const nuevo: Demo = { monedas, comodines, racha: a.racha, nuevas: [...new Set([...d.nuevas, ...piezas])] };
  escribirDemo(uid, nuevo);
  agregarPiezasDemo(piezas);
  fijar(desdeDemo(nuevo));
  return a;
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
