// ¡Al vacío! (Elías, 27 nov 2026): el cuarto libre se vuelve minijuego. Al iniciar se quitan las paredes y queda una
// plataforma en lo alto de un edificio; los personajes se empujan y se golpean para tirarse. Gana la ronda el último en
// pie (o el último equipo); la plataforma se encoge con el tiempo para que ninguna ronda se alargue.
// Lógica pura (sin DOM ni 3D): el cuerpo de cada personaje lo mueve cuarto.ts; aquí van rondas, quién cayó, puntos y podio.

export type Modalidad = "solos" | "equipos";

export interface ConfigPlataforma {
  rondas: number;
  /** Radio al empezar la ronda y radio mínimo. */
  radio: number; radioMin: number;
  /** Desde qué segundo se encoge y en qué segundo llega al mínimo. */
  encogeDesde: number; encogeHasta: number;
  /** Un golpe recibido hasta estos ms antes de caer cuenta como «te tiró». */
  creditoMs: number;
  /** Puntos: por ganar la ronda (cada miembro del equipo ganador) y por cada rival que tiras. */
  ptsRonda: number; ptsTirar: number;
  /** Pausa entre rondas (ms). */
  pausaMs: number;
}

export const CONFIG_PLATAFORMA: ConfigPlataforma = {
  rondas: 3, radio: 7.5, radioMin: 2.4, encogeDesde: 20, encogeHasta: 60,
  creditoMs: 3000, ptsRonda: 3, ptsTirar: 1, pausaMs: 3500,
};

export interface PartidaPlataforma {
  cfg: ConfigPlataforma;
  modalidad: Modalidad;
  ids: string[];
  /** Equipo de cada quien (0 o 1); en solos, todos 0. */
  equipo: Record<string, 0 | 1>;
  puntos: Record<string, number>;
  ronda: number;
  fase: "ronda" | "pausa" | "fin";
  vivos: Set<string>;
  /** ms en que empezó la ronda o la pausa (reloj de la TV). */
  desde: number;
  golpes: Record<string, { de: string; t: number }>;
}

export type EventoPlataforma =
  | { tipo: "ronda"; n: number }
  | { tipo: "fuera"; id: string; por: string | null }
  | { tipo: "ganaRonda"; ids: string[]; equipo: 0 | 1 | null }
  | { tipo: "fin"; ranking: { id: string; lugar: number; puntos: number }[] };

/** Arma la partida con quienes están (2 a 8). En equipos se reparten alternados por orden de llegada. */
export function crearPlataforma(ids: readonly string[], modalidad: Modalidad, t: number, cfg: Partial<ConfigPlataforma> = {}): PartidaPlataforma | null {
  const lista = [...new Set(ids)].slice(0, 8);
  if (lista.length < 2) return null;
  const m: Modalidad = modalidad === "equipos" && lista.length >= 2 ? "equipos" : "solos";
  const equipo: Record<string, 0 | 1> = {}, puntos: Record<string, number> = {};
  lista.forEach((id, i) => { equipo[id] = m === "equipos" ? ((i % 2) as 0 | 1) : 0; puntos[id] = 0; });
  return { cfg: { ...CONFIG_PLATAFORMA, ...cfg }, modalidad: m, ids: lista, equipo, puntos, ronda: 0, fase: "pausa", vivos: new Set(), desde: t, golpes: {} };
}

/** Empieza la siguiente ronda: todos vivos. */
export function iniciarRonda(p: PartidaPlataforma, t: number): EventoPlataforma[] {
  p.ronda += 1; p.fase = "ronda"; p.desde = t; p.vivos = new Set(p.ids); p.golpes = {};
  return [{ tipo: "ronda", n: p.ronda }];
}

/** Radio de la plataforma en el ms t (se encoge entre encogeDesde y encogeHasta). */
export function radioEn(p: PartidaPlataforma, t: number): number {
  const c = p.cfg, s = p.fase === "ronda" ? (t - p.desde) / 1000 : 0;
  const k = Math.max(0, Math.min(1, (s - c.encogeDesde) / (c.encogeHasta - c.encogeDesde)));
  return c.radio - (c.radio - c.radioMin) * k;
}

/** Alguien le pegó a alguien (de cuarto.ts): queda anotado por si cae pronto. */
export function anotarGolpe(p: PartidaPlataforma, de: string, a: string, t: number) {
  if (p.fase === "ronda" && p.vivos.has(a) && p.ids.includes(de)) p.golpes[a] = { de, t };
}

/** Cayó de la plataforma. Da el punto a quien lo tiró (si fue rival) y revisa si la ronda terminó. */
export function alCaer(p: PartidaPlataforma, id: string, t: number): EventoPlataforma[] {
  if (p.fase !== "ronda" || !p.vivos.has(id)) return [];
  p.vivos.delete(id);
  const g = p.golpes[id];
  const por = g && t - g.t <= p.cfg.creditoMs && g.de !== id && !(p.modalidad === "equipos" && p.equipo[g.de] === p.equipo[id]) ? g.de : null;
  if (por) p.puntos[por] = (p.puntos[por] ?? 0) + p.cfg.ptsTirar;
  return [{ tipo: "fuera", id, por }, ...revisar(p, t)];
}

/** ¿Terminó la ronda? (queda uno o un solo equipo; o no queda nadie). */
function revisar(p: PartidaPlataforma, t: number): EventoPlataforma[] {
  const vivos = [...p.vivos];
  const equipos = new Set(vivos.map(id => p.equipo[id]));
  const termina = p.modalidad === "equipos" ? equipos.size <= 1 : vivos.length <= 1;
  if (!termina) return [];
  p.fase = "pausa"; p.desde = t;
  if (!vivos.length) return [{ tipo: "ganaRonda", ids: [], equipo: null }];
  const eq = p.modalidad === "equipos" ? p.equipo[vivos[0]!]! : null;
  const ganan = eq === null ? vivos : p.ids.filter(id => p.equipo[id] === eq);
  ganan.forEach(id => { p.puntos[id] = (p.puntos[id] ?? 0) + p.cfg.ptsRonda; });
  return [{ tipo: "ganaRonda", ids: ganan, equipo: eq }];
}

/** Quien se va a media ronda cuenta como fuera (sin punto para nadie). */
export function salioDePartida(p: PartidaPlataforma, id: string, t: number): EventoPlataforma[] {
  if (p.fase !== "ronda" || !p.vivos.has(id)) return [];
  p.vivos.delete(id); delete p.golpes[id];
  return revisar(p, t);
}

/** Después de la pausa: siguiente ronda o fin con el podio. */
export function avanzarPlataforma(p: PartidaPlataforma, t: number): EventoPlataforma[] {
  if (p.fase !== "pausa" || t - p.desde < (p.ronda ? p.cfg.pausaMs : 0)) return [];
  if (p.ronda >= p.cfg.rondas) { p.fase = "fin"; return [{ tipo: "fin", ranking: rankingPlataforma(p) }]; }
  return iniciarRonda(p, t);
}

/** Podio por puntos; empates comparten lugar (1, 1, 3...). */
export function rankingPlataforma(p: PartidaPlataforma): { id: string; lugar: number; puntos: number }[] {
  const orden = [...p.ids].sort((a, b) => (p.puntos[b] ?? 0) - (p.puntos[a] ?? 0));
  return orden.map((id, i) => {
    const pts = p.puntos[id] ?? 0;
    const lugar = orden.findIndex(o => (p.puntos[o] ?? 0) === pts) + 1;
    return { id, lugar: i === 0 ? 1 : lugar, puntos: pts };
  });
}
