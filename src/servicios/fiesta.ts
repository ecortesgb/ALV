// Modo Fiesta (Elías, 27 nov): varios celulares y la TV conectados a una laptop, sin internet.
// La laptop corre tools/fiesta/servidor.mjs: sirve la app y guarda UNA copia de las salas (la misma forma que la
// demostración guarda en localStorage). Cada aparato tiene su copia en memoria y la cambia con «compara y guarda»:
// manda el cambio con la versión que conoce; si alguien se adelantó, recibe la copia nueva y vuelve a aplicar sus
// cambios pendientes encima. Así dos votos al mismo tiempo no se pisan.
// Sin cuentas, sin XP y sin nube: es la demostración repartida por la red de la laptop.

/** La app se armó para la fiesta (tools/fiesta/armar.mjs). */
export const esFiesta = import.meta.env.VITE_ALV_FIESTA === "1";

type Todo = Record<string, unknown>;
type Cambio = (t: Todo) => void;

const yo = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const clonar = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

let confirmado: Todo = {};
let ver = -1;
let vista: Todo = {};
let pendientes: Cambio[] = [];
/** Cuántos de `pendientes` van en el envío en curso, y su número. */
let enVuelo = 0, seqVuelo = 0, seq = 0;
const oyentesEstado = new Set<() => void>();
const oyentesDif = new Set<(n: string, e: string, d: Record<string, unknown>, de: string) => void>();
let fuente: EventSource | null = null;

const avisar = () => oyentesEstado.forEach(f => { try { f(); } catch (e) { console.error("fiesta", e); } });
const recalcular = () => {
  vista = clonar(confirmado);
  for (const f of pendientes) { try { f(vista); } catch (e) { console.error("fiesta: cambio", e); } }
};

function aceptado(s: number, v: number, todo: Todo) {
  if (enVuelo === 0 || s !== seqVuelo) return; // ya atendido (llegó antes por el canal o por la respuesta)
  confirmado = todo; ver = v;
  pendientes = pendientes.slice(enVuelo); enVuelo = 0;
  recalcular(); avisar(); enviar();
}

function enviar() {
  if (enVuelo > 0 || ver < 0 || !pendientes.length) return;
  enVuelo = pendientes.length; seqVuelo = ++seq;
  const s = seqVuelo, todo = clonar(vista);
  fetch("/fiesta/cambiar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ base: ver, de: yo, seq: s, todo }) })
    .then(r => r.json() as Promise<{ ok: boolean; ver: number; todo?: Todo }>)
    .then(r => {
      if (r.ok) return aceptado(s, r.ver, todo);
      if (s !== seqVuelo) return;
      enVuelo = 0;
      if (r.todo && r.ver > ver) { confirmado = r.todo; ver = r.ver; }
      recalcular(); avisar(); enviar();
    })
    .catch(e => { console.error("fiesta: envío", e); if (s === seqVuelo) { enVuelo = 0; setTimeout(enviar, 1000); } });
}

function conectar() {
  if (fuente || typeof EventSource === "undefined") return;
  fuente = new EventSource("/fiesta/eventos");
  fuente.addEventListener("estado", ev => {
    let m: { ver: number; todo: Todo; de?: string; seq?: number };
    try { m = JSON.parse((ev as MessageEvent).data as string); } catch { return; }
    if (typeof m?.ver !== "number" || !m.todo || typeof m.todo !== "object") return;
    if (m.de === yo && m.seq === seqVuelo && enVuelo > 0) return aceptado(m.seq, m.ver, m.todo);
    if (m.ver <= ver) return;
    confirmado = m.todo; ver = m.ver;
    // Si había un envío en curso, el servidor lo va a rechazar (su versión quedó vieja): se reenvía al recibir la respuesta.
    recalcular(); avisar(); if (enVuelo === 0) enviar();
  });
  fuente.addEventListener("dif", ev => {
    let m: { n: string; e: string; d: Record<string, unknown>; de: string };
    try { m = JSON.parse((ev as MessageEvent).data as string); } catch { return; }
    if (typeof m?.n !== "string" || typeof m.e !== "string") return;
    oyentesDif.forEach(f => f(m.n, m.e, m.d && typeof m.d === "object" ? m.d : {}, String(m.de ?? "")));
  });
}

/** Almacén de la sala compartido por la laptop (lo usa el respaldo de la demostración en enlace.ts). */
export const almacenFiesta = {
  leer(): Todo { conectar(); return clonar(vista); },
  cambiar(f: Cambio) { conectar(); f(vista); pendientes.push(f); avisar(); enviar(); },
  oir(f: () => void) { conectar(); oyentesEstado.add(f); return () => { oyentesEstado.delete(f); }; },
};

/** Avisos entre aparatos (lo que sin nube hace BroadcastChannel), repartidos por la laptop. */
export function difusionFiesta(nombre: string, alMensaje?: (evento: string, datos: Record<string, unknown>) => void) {
  conectar();
  const mio = yo + "-" + Math.random().toString(36).slice(2, 8);
  const oir = (n: string, e: string, d: Record<string, unknown>, de: string) => { if (n === nombre && de !== mio && alMensaje) alMensaje(e, d); };
  oyentesDif.add(oir);
  return {
    enviar: (e: string, d: Record<string, unknown> = {}) => {
      void fetch("/fiesta/difusion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ n: nombre, e, d, de: mio }) }).catch(() => { /* aviso visual: se pierde */ });
    },
    cerrar: () => { oyentesDif.delete(oir); },
  };
}
