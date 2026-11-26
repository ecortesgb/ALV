// «Esquiva la bala» (prototipo de Mini-Juegos, zona aparte). Lógica pura: la TV es la que manda y la usa; los
// celulares solo mandan «salté a esta hora» (ya en el reloj de la TV, ver reloj.ts). Sin DOM ni 3D.
//
// Reglas (decididas por Codex, encargo 2026-11-26-minijuegos-r1, D3):
// - Los jugadores están en fila sobre el eje x. Cada ronda pasa una bala (o dos, desde la ronda 3) de un lado al otro.
// - Una bala le pega a un jugador mientras se enciman: [llegada − h/v, llegada + h/v], h = medio cuerpo + media bala.
//   El ancho del cuerpo es el mismo para todos (elegir a Hulk no debe castigar).
// - Un salto que empieza en s está en el aire en [s + despegue − margen, s + despegue + aire + margen]. El aire baja de
//   650 a 450 ms en las primeras 10 rondas: así la ventana se cierra aunque la bala vaya más rápido.
// - Se salva si algún salto cubre todo el encime. El margen absorbe lo que no se sabe del reloj (latencia).
// - No se puede volver a saltar hasta caer y recuperarse (aplastar el botón no sirve).
// - Pegado = eliminado. Gana el último en pie; si los que quedan caen en la misma ronda, empatan.
// - La partida dura como máximo 60 s desde la primera ronda: no se abre una ronda que no alcance a juzgarse antes;
//   si se acaba el tiempo, los que siguen en pie empatan.
// - Cada encime se juzga un poco después de que pasa (esperaJuicio) para que lleguen los toques atrasados por la red.

export interface ConfigBala {
  despegueMs: number; aireMs: number; aireFinalMs: number; rondasAire: number;
  recuperaMs: number; margenMs: number; esperaJuicioMs: number;
  medioCuerpo: number; medioBala: number;
  vel0: number; aumento: number; velMax: number;
  avisoMs: number; pausaMs: number; rondasMax: number; limiteMs: number; margenPista: number;
  dobleDesde: number; probDoble: number; separacionMin: number; separacionMax: number;
}

export const CONFIG_BALA: ConfigBala = {
  despegueMs: 80, aireMs: 650, aireFinalMs: 450, rondasAire: 10,
  recuperaMs: 300, margenMs: 70, esperaJuicioMs: 250,
  medioCuerpo: 0.35, medioBala: 0.35,
  vel0: 6, aumento: 0.12, velMax: 16,
  avisoMs: 1100, pausaMs: 1600, rondasMax: 15, limiteMs: 60000, margenPista: 5,
  dobleDesde: 3, probDoble: 0.4, separacionMin: 1.25, separacionMax: 1.7,
};

export interface JugadorBala { id: string; x: number }
export interface Bala { id: number; ronda: number; dir: 1 | -1; v: number; xInicio: number; t0: number }
export interface Salto { s: number; aire: number }
export type Fase = "espera" | "ronda" | "pausa" | "fin";
export type Evento =
  | { tipo: "ronda"; ronda: number; balas: Bala[]; aire: number }
  | { tipo: "salvado"; id: string; bala: number }
  | { tipo: "golpe"; id: string; bala: number }
  | { tipo: "fin"; ranking: Lugar[]; porTiempo: boolean };
export interface Lugar { id: string; lugar: number; ronda: number | null }

interface Juicio { bala: Bala; id: string; t: number; ini: number; fin: number }

export interface EstadoBala {
  cfg: ConfigBala;
  jugadores: JugadorBala[];
  vivos: Set<string>;
  eliminadoEn: Map<string, number>;
  saltos: Map<string, Salto[]>;
  ronda: number;
  balas: Bala[];
  fase: Fase;
  finFase: number;
  inicio: number;
  juicios: Juicio[];
  sigBala: number;
  azar: () => number;
}

/** Generador repetible (mulberry32): la misma semilla da la misma partida, para las pruebas. */
export function azarCon(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function crearPartida(jugadores: JugadorBala[], cfg: Partial<ConfigBala> = {}, semilla = Date.now()): EstadoBala {
  return {
    cfg: { ...CONFIG_BALA, ...cfg }, jugadores: jugadores.map(j => ({ id: j.id, x: j.x })),
    vivos: new Set(jugadores.map(j => j.id)), eliminadoEn: new Map(), saltos: new Map(jugadores.map(j => [j.id, []])),
    ronda: 0, balas: [], fase: "espera", finFase: 0, inicio: 0, juicios: [], sigBala: 1, azar: azarCon(semilla),
  };
}

/** Dónde está el centro de la bala en el instante t (unidades de la escena). */
export const posBala = (b: Bala, t: number) => b.xInicio + b.dir * b.v * ((t - b.t0) / 1000);
/** Cuándo llega el centro de la bala al centro del jugador. */
export const llegada = (b: Bala, x: number) => b.t0 + ((x - b.xInicio) * b.dir / b.v) * 1000;
const medioEncime = (cfg: ConfigBala, b: Bala) => ((cfg.medioCuerpo + cfg.medioBala) / b.v) * 1000;
const velDe = (cfg: ConfigBala, k: number) => Math.min(cfg.velMax, cfg.vel0 * (1 + cfg.aumento * (k - 1)));
/**
 * Tiempo en el aire de un salto hecho en la ronda k: 650 ms en la 1 y 450 ms desde la 10. En medio no baja en línea
 * recta: se calcula para que la ventana válida (aire + 2·margen − encime) se cierre igual en cada ronda, porque al
 * principio la bala acelera más rápido de lo que bajaría el aire y la ventana crecería (Codex O2).
 */
export function aireDe(cfg: ConfigBala, k: number): number {
  const kk = Math.max(1, k), n = Math.max(1, cfg.rondasAire);
  const encime = (r: number) => ((2 * (cfg.medioCuerpo + cfg.medioBala)) / velDe(cfg, r)) * 1000;
  const v0 = cfg.aireMs - encime(1), vf = cfg.aireFinalMs - encime(n); // ventana sin el margen, en la 1 y en la última
  const u = n <= 1 ? 1 : Math.min(1, (kk - 1) / (n - 1));
  if (kk >= n) return cfg.aireFinalMs; // después se queda en 450 (la bala sigue acelerando hasta su tope)
  return Math.round(v0 + (vf - v0) * u + encime(kk));
}
/** Cuándo sale la bala de la pista (pasó al último jugador más el margen). */
function salida(e: EstadoBala, b: Bala): number {
  const xs = e.jugadores.map(j => j.x);
  const lejos = b.dir === 1 ? Math.max(...xs) + e.cfg.margenPista : Math.min(...xs) - e.cfg.margenPista;
  return llegada(b, lejos);
}

/** ¿Algún salto cubre todo el encime [ini, fin] (con el margen)? */
export function enElAire(cfg: ConfigBala, saltos: readonly Salto[], ini: number, fin: number): boolean {
  return saltos.some(x => x.s + cfg.despegueMs - cfg.margenMs <= ini && x.s + cfg.despegueMs + x.aire + cfg.margenMs >= fin);
}

function planearRonda(e: EstadoBala, k: number, ahora: number): Bala[] {
  const c = e.cfg;
  const xs = e.jugadores.map(j => j.x);
  const dir: 1 | -1 = e.azar() < 0.5 ? 1 : -1;
  const v = velDe(c, k);
  const xInicio = dir === 1 ? Math.min(...xs) - c.margenPista : Math.max(...xs) + c.margenPista;
  const cuantas = k >= c.dobleDesde && e.azar() < c.probDoble ? 2 : 1;
  const balas: Bala[] = [];
  let t0 = ahora + c.avisoMs;
  for (let i = 0; i < cuantas; i++) {
    balas.push({ id: e.sigBala++, ronda: k, dir, v, xInicio, t0 });
    // Misma dirección y velocidad: cada jugador tiene el mismo hueco entre una y otra, y siempre alcanza a caer y saltar.
    t0 += (c.separacionMin + e.azar() * (c.separacionMax - c.separacionMin)) * 1000;
  }
  return balas;
}

function juiciosDe(e: EstadoBala, balas: Bala[]): Juicio[] {
  const fuera: Juicio[] = [];
  for (const b of balas) for (const j of e.jugadores) {
    if (!e.vivos.has(j.id)) continue;
    const t = llegada(b, j.x), m = medioEncime(e.cfg, b);
    fuera.push({ bala: b, id: j.id, ini: t - m, fin: t + m, t: t + m + e.cfg.esperaJuicioMs });
  }
  return fuera;
}

function terminar(e: EstadoBala, porTiempo: boolean): Evento {
  e.fase = "fin";
  return { tipo: "fin", ranking: ranking(e), porTiempo };
}

/** Abre la siguiente ronda; si no alcanza a juzgarse dentro del límite, termina la partida (empatan los que siguen). */
function abrirRonda(e: EstadoBala, ahora: number): Evento {
  const k = e.ronda + 1;
  const balas = planearRonda(e, k, ahora);
  const juicios = juiciosDe(e, balas);
  const fin = Math.max(...balas.map(b => salida(e, b)), ...juicios.map(j => j.t));
  if (fin - e.inicio > e.cfg.limiteMs) { e.sigBala -= balas.length; return terminar(e, true); }
  e.ronda = k; e.balas = balas; e.juicios = juicios; e.finFase = fin; e.fase = "ronda";
  return { tipo: "ronda", ronda: k, balas: balas.map(b => ({ ...b })), aire: aireDe(e.cfg, k) };
}

/** ¿Alcanza el tiempo para la pausa y una ronda más de una sola bala (lo mínimo)? Si no, se termina ya. */
function cabeOtra(e: EstadoBala, ahora: number): boolean {
  const c = e.cfg, xs = e.jugadores.map(j => j.x);
  const largo = Math.max(...xs) - Math.min(...xs) + 2 * c.margenPista;
  const minimo = c.pausaMs + c.avisoMs + (largo / velDe(c, e.ronda + 1)) * 1000;
  return ahora + minimo - e.inicio <= c.limiteMs;
}

export function empezar(e: EstadoBala, ahora: number): Evento[] {
  if (e.fase !== "espera") return [];
  e.inicio = ahora;
  return [abrirRonda(e, ahora)];
}

/**
 * Un toque de «saltar» con su hora ya en el reloj de la TV (s). Se acepta si la hora es un número, el jugador sigue
 * en pie y no está en el aire ni recuperándose. Devuelve el salto aceptado (para que la TV lo dibuje) o null.
 */
export function saltar(e: EstadoBala, id: string, s: number): Salto | null {
  if (!Number.isFinite(s) || !e.vivos.has(id) || e.fase === "fin" || e.fase === "espera") return null;
  const lista = e.saltos.get(id);
  if (!lista) return null;
  const c = e.cfg, ultimo = lista[lista.length - 1];
  if (ultimo !== undefined && s < ultimo.s + c.despegueMs + ultimo.aire + c.recuperaMs) return null;
  const salto = { s, aire: aireDe(c, Math.max(1, e.ronda)) };
  lista.push(salto);
  if (lista.length > 40) lista.splice(0, lista.length - 40);
  return salto;
}

export function ranking(e: EstadoBala): Lugar[] {
  const filas = e.jugadores.map(j => ({ id: j.id, ronda: e.vivos.has(j.id) ? null : (e.eliminadoEn.get(j.id) ?? 0) }));
  const valor = (r: number | null) => (r === null ? Infinity : r);
  filas.sort((a, b) => valor(b.ronda) - valor(a.ronda));
  return filas.map(f => ({ ...f, lugar: 1 + filas.filter(o => valor(o.ronda) > valor(f.ronda)).length }));
}

/** Avanza el reloj de la TV: juzga los encimes ya pasados, cierra rondas y decide el fin. */
export function avanzar(e: EstadoBala, ahora: number): Evento[] {
  const fuera: Evento[] = [];
  if (e.fase === "ronda") {
    const listos = e.juicios.filter(j => j.t <= ahora);
    e.juicios = e.juicios.filter(j => j.t > ahora);
    for (const j of listos) {
      if (!e.vivos.has(j.id)) continue; // ya lo tumbó la primera bala de esta ronda
      if (enElAire(e.cfg, e.saltos.get(j.id) ?? [], j.ini, j.fin)) fuera.push({ tipo: "salvado", id: j.id, bala: j.bala.id });
      else { e.vivos.delete(j.id); e.eliminadoEn.set(j.id, e.ronda); fuera.push({ tipo: "golpe", id: j.id, bala: j.bala.id }); }
    }
    if (ahora >= e.finFase && !e.juicios.length) {
      const solo = e.jugadores.length === 1;
      const termina = e.vivos.size === 0 || (!solo && e.vivos.size <= 1) || e.ronda >= e.cfg.rondasMax;
      if (termina) fuera.push(terminar(e, false));
      else if (!cabeOtra(e, ahora)) fuera.push(terminar(e, true));
      else { e.fase = "pausa"; e.finFase = ahora + e.cfg.pausaMs; }
    }
  } else if (e.fase === "pausa" && ahora >= e.finFase) {
    fuera.push(abrirRonda(e, ahora));
  }
  return fuera;
}
