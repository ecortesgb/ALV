// Copas de la noche (Maestro 6A.11 C2): al cerrar el lobby se suman los puntos de todos los juegos y se anuncia
// un ganador por categoría: 1.º, 2.º y 3.º individual, pareja ganadora, equipo ganador y bando ganador de ALVersus.
// Las parejas y los equipos se reconocen por sus integrantes: suman los puntos de los juegos que jugaron juntos.
// Puro: sin React, sin navegador y sin base. Recibe solo lo público de cada juego terminado.

export interface ResultadoJuego {
  juegoId: string;
  modalidad?: "individual" | "parejas" | "equipos" | "sexos";
  jugadores: { id: string; nombre: string }[];
  puntos: Record<string, number>;
  grupos?: { id: string; nombre: string; jugadores: string[]; puntos: number }[];
}

export interface Ganador { nombre: string; jugadores: string[]; puntos: number }
export interface LugarIndividual { id: string; nombre: string; puntos: number; lugar: number }

export interface Copas {
  /** Juegos que contaron. */
  juegos: number;
  /** Los primeros tres lugares (los empates comparten lugar; puede haber más de tres personas). */
  individual: LugarIndividual[];
  /** Ganadores por categoría. Varios si empatan; ausente si esa categoría no se jugó. */
  parejas?: Ganador[];
  equipos?: Ganador[];
  alversus?: Ganador[];
  /** Total de cada jugador en la noche (para el marcador). */
  totales: Record<string, number>;
}

const lista = (ns: string[]) => (ns.length <= 1 ? ns.join("") : ns.slice(0, -1).join(", ") + " y " + ns.at(-1));

/** Suma por grupo con una llave; devuelve los que tienen más puntos (empate: todos). */
function ganadores(rs: ResultadoJuego[], modalidad: ResultadoJuego["modalidad"], llave: (g: NonNullable<ResultadoJuego["grupos"]>[number]) => string, nombre: (g: NonNullable<ResultadoJuego["grupos"]>[number], r: ResultadoJuego) => string): Ganador[] | undefined {
  const suma = new Map<string, Ganador>();
  for (const r of rs) {
    if (r.modalidad !== modalidad) continue;
    for (const g of r.grupos ?? []) {
      const k = llave(g);
      const previo = suma.get(k);
      suma.set(k, { nombre: previo?.nombre ?? nombre(g, r), jugadores: [...g.jugadores].sort(), puntos: (previo?.puntos ?? 0) + g.puntos });
    }
  }
  if (!suma.size) return undefined;
  const max = Math.max(...[...suma.values()].map(g => g.puntos));
  return [...suma.values()].filter(g => g.puntos === max).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function calcularCopas(rs: ResultadoJuego[]): Copas {
  const totales: Record<string, number> = {}, nombres: Record<string, string> = {};
  for (const r of rs) {
    for (const j of r.jugadores) { nombres[j.id] = j.nombre; totales[j.id] = (totales[j.id] ?? 0) + (r.puntos[j.id] ?? 0); }
  }
  const orden = Object.keys(totales).sort((a, b) => totales[b]! - totales[a]! || nombres[a]!.localeCompare(nombres[b]!));
  const individual: LugarIndividual[] = [];
  let lugar = 0, previo: number | null = null;
  orden.forEach((id, i) => {
    if (totales[id] !== previo) { lugar = i + 1; previo = totales[id]!; }
    if (lugar <= 3) individual.push({ id, nombre: nombres[id]!, puntos: totales[id]!, lugar });
  });
  const porIntegrantes = (g: { jugadores: string[] }) => [...g.jugadores].sort().join("+");
  const conNombres = (g: { jugadores: string[] }) => lista(g.jugadores.map(j => nombres[j] ?? "Alguien"));
  const parejas = ganadores(rs, "parejas", porIntegrantes, g => g.nombre);
  const equipos = ganadores(rs, "equipos", porIntegrantes, g => `${g.nombre}: ${conNombres(g)}`);
  // ALVersus: el bando es el mismo aunque cambien sus integrantes (Ellas o Ellos).
  const alversus = ganadores(rs, "sexos", g => g.id, g => g.nombre);
  return { juegos: rs.length, individual, totales, ...(parejas ? { parejas } : {}), ...(equipos ? { equipos } : {}), ...(alversus ? { alversus } : {}) };
}

/** ¿Este estado público es de un juego terminado que cuenta para las copas? */
export function esResultado(x: unknown): x is ResultadoJuego {
  const r = x as ResultadoJuego | null;
  return !!r && typeof r.juegoId === "string" && r.juegoId !== "copas" && Array.isArray(r.jugadores) && !!r.puntos && typeof r.puntos === "object";
}
