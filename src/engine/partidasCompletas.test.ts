// Auditoría de la fiesta (28 nov): partidas completas de cada juego que se puede elegir (MODALIDADES_JUEGO), con 2, 4 y
// 8 personas, por el mismo camino que la app (armarArranque → crearPartida → aplicar). Un «bot» contesta lo que pide cada
// etapa y, al azar, la mesa usa comodines, pausa, salta, sigue sin alguien o termina antes. En cada paso se revisa que la
// partida no se trabe y que las vistas no suelten lo privado; al final, que el marcador y los lugares cuadren.
import { describe, expect, it } from "vitest";
import { CONTENIDO } from "../content";
import { JUEGOS } from "../content/catalogo";
import { MODALIDADES_JUEGO } from "../content/configurar";
import { CON_OBJETIVO } from "../content/comodinesPartida";
import { crearAzar, type Azar } from "./azar";
import { armarArranque, relojLogico } from "./nucleo";
import { cartasPermitidas } from "./filtros";
import {
  aplicar, comodinesUsables, conEliminacion, conVerdadReto, crearPartida, enCarga, etapaImpostor, etapaPareja, etapaVR,
  objetivosComodin, parejasPorDecidir, porGrupos, puntosPorEquipo, quienesContestan, resultados, seleccionVR, vivos,
  adminFisico, anfitrionDe, SALTAR_VOTO, type AccionSinId, type EstadoPartida,
} from "./partida";
import { vistaJugador, vistaPublica } from "./vistas";
import type { EjesPartida, OpcionesPartida } from "./types";

const ACTIVOS = Object.keys(MODALIDADES_JUEGO);
const def = (id: string) => JUEGOS.find(j => j.id === id)!;
const gente = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, nombre: `Persona ${i}` }));

let k = 0;
function juega(e: EstadoPartida, a: AccionSinId): EstadoPartida {
  return aplicar(e, { ...a, id: `pc-${++k}` } as never, CONTENIDO);
}

interface Caos { comodines: number; pausas: number; saltos: number; ausentes: number; terminarEn?: number }

/** Lo que contesta el bot a quien le toca, según el juego y la etapa. */
function respuesta(e: EstadoPartida, j: string, az: Azar): AccionSinId | null {
  const js = e.cfg.jugadores.map(x => x.id), otros = js.filter(x => x !== j);
  if (conVerdadReto(e)) {
    const s = seleccionVR(e), et = etapaVR(e);
    if (et === "elegir" && j === s.responde) return { tipo: "contestar", jugador: j, valor: { elige: (e.verdadUsada ?? []).includes(j) || az.siguiente() < 0.5 ? "reto" : "verdad" } };
    if (et === "fuente" && j === s.pregunta) return { tipo: "contestar", jugador: j, valor: { fuente: az.siguiente() < 0.8 ? "app" : "voz" } };
    if (et === "calificar" && j === s.pregunta) return { tipo: "contestar", jugador: j, valor: az.siguiente() < 0.7 ? "cumplio" : "tomo" };
    return null;
  }
  if (conEliminacion(e)) {
    if (etapaImpostor(e) === "pistas") return j === e.turnoDe ? { tipo: "pista", jugador: j, texto: `pista ${j}` } : null;
    const candidatos = vivos(e).filter(x => x !== j);
    return { tipo: "contestar", jugador: j, valor: az.siguiente() < 0.1 && e.cfg.impostor?.nave ? SALTAR_VOTO : az.elegir(candidatos) };
  }
  switch (e.motor) {
    case "pareja":
      return { tipo: "contestar", jugador: j, valor: etapaPareja(e) === "calificar" ? (az.siguiente() < 0.6 ? "si" : "no") : az.elegir(["Tacos", "Pizza", "Playa"]) };
    case "conteo": {
      if (e.mazo === "palabra") {
        const tope = ((e.privado[j] as { palabras?: unknown[] })?.palabras?.length ?? 0);
        const n = az.entero(tope + 1);
        return { tipo: "contestar", jugador: j, valor: { adivinos: Array.from({ length: n }, () => az.elegir(otros)), tachadas: e.juegoId === "prohibida" && n < tope ? 1 : 0 } };
      }
      return { tipo: "contestar", jugador: j, valor: az.entero(12) };
    }
    case "votacion":
      return { tipo: "contestar", jugador: j, valor: js.length === 2 ? { eleccion: az.elegir(["a", "b"]), prediccion: az.elegir(["a", "b"]) } : az.elegir(["a", "b"]) };
    case "senalar": return { tipo: "contestar", jugador: j, valor: az.elegir(js) };
    case "confesion": return { tipo: "contestar", jugador: j, valor: az.elegir(["si", "no"]) };
    case "dados": return { tipo: "contestar", jugador: j, valor: az.elegir(e.cfg.drunk ? ["cumplio", "paso", "tomo"] : ["cumplio", "paso"]) };
    case "competencia": {
      const r = az.siguiente();
      return { tipo: "contestar", jugador: j, valor: r < 0.15 ? "nadie" : r < 0.3 ? js.slice(0, 2) : az.elegir(js) };
    }
    default: return { tipo: "contestar", jugador: j, valor: az.elegir(["cumplio", "paso"]) };
  }
}

/** Revisa lo que debe valer siempre. */
function revisar(e: EstadoPartida, etiqueta: string) {
  const js = e.cfg.jugadores.map(x => x.id);
  expect(e.ronda, etiqueta).toBeGreaterThanOrEqual(1);
  expect(e.ronda, etiqueta).toBeLessThanOrEqual(e.totalRondas);
  for (const [j, p] of Object.entries(e.puntos)) {
    expect(js, `${etiqueta}: puntos de alguien que no juega`).toContain(j);
    expect(Number.isFinite(p), `${etiqueta}: puntos no numéricos de ${j}`).toBe(true);
  }
  const vp = vistaPublica(e);
  for (const j of vp.esperados) expect(js, `${etiqueta}: se espera a alguien que no juega`).toContain(j);
  if (e.turnoDe !== undefined) expect(js, `${etiqueta}: turno de alguien que no juega`).toContain(e.turnoDe);
  // La TV nunca recibe lo privado mientras se juega la ronda.
  if (e.fase === "contestando") {
    const tv = JSON.stringify(vp);
    for (const p of Object.values(e.privado)) {
      const x = p as { palabra?: string; secreto?: string; respuesta?: string; palabras?: { palabra: string }[] };
      if (x?.palabra) expect(tv.includes(`"${x.palabra}"`), `${etiqueta}: la palabra del impostor en la TV`).toBe(false);
      if (x?.secreto) expect(tv.includes(`"${x.secreto}"`), `${etiqueta}: el secreto en la TV`).toBe(false);
    }
    // Lo privado de otro no llega a mi celular.
    for (const j of js) {
      const v = vistaJugador(e, j);
      for (const o of js) if (o !== j && e.privado[o] !== undefined && JSON.stringify(e.privado[o]) !== JSON.stringify(e.privado[j])) {
        const x = e.privado[o] as { palabra?: string; rol?: string };
        if (x?.rol === "civil" && (e.privado[j] as { rol?: string })?.rol === "impostor") expect(JSON.stringify(v).includes(`"${x.palabra}"`), `${etiqueta}: el impostor ve la palabra`).toBe(false);
      }
      for (const c of v.misComodines) if ((CON_OBJETIVO as string[]).includes(c)) expect(v.misObjetivos[c]?.length, `${etiqueta}: ${c} sin a quién`).toBeGreaterThan(0);
    }
  }
}

/** Lugar coherente: 1 + cuántos tienen estrictamente más (empates, mismo lugar). */
function revisarFinal(e: EstadoPartida, etiqueta: string) {
  expect(e.fase, etiqueta).toBe("terminada");
  const r = resultados(e);
  expect(r.length).toBe(e.cfg.jugadores.length);
  const grupo = porGrupos(e) ? new Map(puntosPorEquipo(e).flatMap(g => g.jugadores.map(j => [j, g.puntos] as const))) : null;
  const valor = (id: string) => grupo?.get(id) ?? e.puntos[id] ?? 0;
  for (const x of r) {
    expect(x.puntos).toBe(e.puntos[x.jugador] ?? 0);
    expect(Number.isFinite(x.xp) && x.xp >= 0, `${etiqueta}: XP rara`).toBe(true);
    if (e.motor === "confesion") { expect(x.lugar).toBe(e.cfg.jugadores.length); continue; }
    const arriba = r.filter(o => valor(o.jugador) > valor(x.jugador)).length;
    expect(x.lugar, `${etiqueta}: lugar de ${x.jugador} (${valor(x.jugador)})`).toBe(arriba + 1);
  }
  // Ordenado de mejor a peor.
  for (let i = 1; i < r.length; i++) expect(valor(r[i - 1]!.jugador)).toBeGreaterThanOrEqual(valor(r[i]!.jugador));
}

/** Usa un comodín al azar de alguien que pueda (apunta antes si es dirigido). */
function usarComodin(e: EstadoPartida, az: Azar): EstadoPartida {
  const js = az.mezclar(e.cfg.jugadores.map(x => x.id));
  for (const j of js) {
    const lista = comodinesUsables(e, j);
    if (!lista.length) continue;
    const c = az.elegir(lista);
    if (CON_OBJETIVO.includes(c)) e = juega(e, { tipo: "apuntar", jugador: j, a: az.elegir(objetivosComodin(e, j, c)) });
    const n = juega(e, { tipo: "usar-carta", jugador: j, carta: c, cuenta: true });
    expect(n, `comodín ${c} de ${j} ofrecido pero rechazado (${e.juegoId})`).not.toBe(e);
    if (n.efectos?.caminos) return juega(n, { tipo: "camino", jugador: j, i: az.entero(2) as 0 | 1 });
    return n;
  }
  return e;
}

/** Juega una partida completa. Devuelve el estado final y cuántas cartas se repitieron. */
function partida(juego: string, n: number, semilla: number, op: OpcionesPartida, caos: Caos) {
  const az = crearAzar(semilla * 7 + 3);
  const a = armarArranque(gente(n), juego, 5, 2, semilla, op);
  expect(a, `${juego} con ${n}: no arranca`).not.toBeNull();
  let e: EstadoPartida = { ...crearPartida(def(juego), a!.cfg, a!.semilla, CONTENIDO, a!.rondas), control: "j0" };
  const etiqueta = `${juego}/${n}/${semilla}`;
  const cartas: string[] = [];
  let pasos = 0, ronda = 0;
  while (e.fase !== "terminada") {
    if (++pasos > 400) throw new Error(`${etiqueta}: la partida se trabó en la ronda ${e.ronda} (${e.fase})`);
    revisar(e, etiqueta);
    if (enCarga(e)) { e = juega(e, { tipo: "comenzar" }); continue; }
    if (e.naveEtapa === "papeles") {
      for (const j of e.cfg.jugadores) e = juega(e, { tipo: "visto", jugador: j.id });
      e = juega(e, { tipo: "discutir" });
      continue;
    }
    if (e.fase === "revelada") {
      // Al ver el resultado también se pueden usar comodines de castigo.
      if (caos.comodines && az.siguiente() < caos.comodines) e = usarComodin(e, az);
      const antes = e;
      e = juega(e, { tipo: "siguiente" });
      expect(e, `${etiqueta}: «siguiente» no avanzó`).not.toBe(antes);
      continue;
    }
    if (e.ronda !== ronda) {
      ronda = e.ronda;
      if (e.carta?.id) cartas.push(e.carta.id);
      if (caos.terminarEn && e.ronda === caos.terminarEn) { e = juega(e, { tipo: "terminar" }); break; }
      if (az.siguiente() < caos.saltos) { e = juega(e, { tipo: "saltar" }); continue; }
      if (az.siguiente() < 0.3) e = juega(e, { tipo: "ruleta" });
    }
    if (az.siguiente() < caos.pausas) {
      const p = juega(e, { tipo: "pausar" });
      expect(p.pausada).toBe(true);
      // En pausa nadie contesta.
      const quien = quienesContestan(p)[0];
      if (quien) { const r = respuesta(p, quien, crearAzar(1)); if (r) expect(juega(p, r).respuestas).toEqual(p.respuestas); }
      e = juega(p, { tipo: "reanudar" });
    }
    if (caos.comodines && az.siguiente() < caos.comodines) e = usarComodin(e, az);
    // Se acaba el tiempo del turno o el anfitrión elige esperar.
    if (az.siguiente() < caos.saltos) e = juega(e, { tipo: "tiempo" });
    if (az.siguiente() < caos.ausentes) e = juega(e, { tipo: "esperar" });
    if (conVerdadReto(e) && e.fase === "contestando" && e.vr?.fuente === "app") expect(e.carta, `${etiqueta}: Verdad o reto pidió carta de la app y no salió`).toBeDefined();
    if (e.fase !== "contestando") continue;
    // El anfitrión decide las parejas que no se pusieron de acuerdo.
    for (const p of parejasPorDecidir(e)) e = juega(e, { tipo: "contestar", jugador: anfitrionDe(e), valor: { decide: p, coinciden: az.siguiente() < 0.5 } });
    // Juego físico: el administrador da puntos y usa herramientas antes de terminar la ronda.
    if (e.motor === "fisico") {
      const adm = adminFisico(e);
      for (let t = 0; t < 3; t++) e = juega(e, { tipo: "contestar", jugador: adm, valor: { puntos: { jugador: az.elegir(e.cfg.jugadores).id, delta: az.elegir([1, 2, -1, 3]) } } });
      e = juega(e, { tipo: "contestar", jugador: adm, valor: { herramienta: az.elegir(["dados", "ruleta", "carta", "orden", "palabra", "pregunta"]) } });
      e = juega(e, { tipo: "contestar", jugador: adm, valor: { herramienta: "cronometro", segundos: 30 } });
      e = juega(e, { tipo: "contestar", jugador: adm, valor: { otro: true } });
      e = juega(e, { tipo: "contestar", jugador: adm, valor: { mostrar: true } });
      for (const j of e.cfg.jugadores) e = juega(e, { tipo: "contestar", jugador: j.id, valor: { reloj: 1000 + az.entero(9000) } });
    }
    const esperados = quienesContestan(e).filter(j => !(j in e.respuestas));
    // Alguien no contesta: el anfitrión sigue sin él (si ya contestó otro).
    const falta = esperados.length > 1 && az.siguiente() < caos.ausentes ? az.elegir(esperados) : undefined;
    let avanzo = false;
    for (const j of esperados) {
      if (j === falta) continue;
      const r = respuesta(e, j, az);
      if (!r) continue;
      const n2 = juega(e, r);
      if (n2 !== e) avanzo = true;
      e = n2;
    }
    if (e.fase !== "contestando") continue;
    const reloj = relojLogico(e);
    if (reloj.listos) { const n2 = juega(e, { tipo: "revelar" }); expect(n2.fase, `${etiqueta}: todos contestaron y no se reveló`).toBe("revelada"); e = n2; continue; }
    if (falta) {
      const n2 = juega(e, { tipo: "seguir-sin" });
      if (n2 !== e) { e = n2; continue; }
    }
    if (!avanzo) {
      // Nadie pudo contestar: el anfitrión salta (la salida que tiene en la app).
      const n2 = juega(e, { tipo: "saltar" });
      expect(n2, `${etiqueta}: atorada en la ronda ${e.ronda}, esperados ${JSON.stringify(quienesContestan(e))}`).not.toBe(e);
      e = n2;
    }
  }
  revisarFinal(e, etiqueta);
  return { e, cartas };
}

const NIVELES: EjesPartida[] = [{ temperatura: 1, voltaje: 1 }, { temperatura: 2, voltaje: 2 }, { temperatura: 3, voltaje: 3 }];
const ESCENARIOS = [undefined, "alverca", "fogata", "parque"] as const;

function opcionesPara(juego: string, n: number, i: number): OpcionesPartida {
  const ejes = NIVELES[i % 3]!;
  const modos = MODALIDADES_JUEGO[juego]!;
  const op: OpcionesPartida = { explicar: true, ejes: { ...ejes, drunk: i % 2 === 0 }, escenario: ESCENARIOS[i % 4] as OpcionesPartida["escenario"] };
  const quiere = modos[i % modos.length]!;
  if (quiere === "parejas" && n >= 4 && n % 2 === 0) op.modalidad = "parejas";
  else if (quiere === "equipos" && n >= 4) { op.modalidad = "equipos"; op.grupos = Object.fromEntries(gente(n).map((g, x) => [g.id, x % 2 ? "a" : "b"])); }
  else if (quiere === "sexos") { op.modalidad = "sexos"; op.grupos = Object.fromEntries(gente(n).map((g, x) => [g.id, x % 2 ? "ellas" : "ellos"])); }
  else if (modos.includes("individual")) op.modalidad = "individual";
  else op.modalidad = "parejas";
  if (juego === "verdad-reto") { op.herramienta = (["orden", "ruleta", "reloj", "dados", "poker"] as const)[i % 5]; if (i % 2) op.temporizador = 30; }
  if (juego === "impostor") op.impostor = { cantidad: 1 + (i % 3), tema: null, nave: true, papeles: i % 2 === 0, votos: i % 2 ? "secretos" : "visibles", revelar: i % 3 !== 0, pista: true, castigo: true };
  if (juego === "mas-probable") op.votoSecreto = i % 2 === 0;
  if (juego === "que-prefieres") op.minoriaBebe = i % 2 === 1;
  return op;
}

/** El juego se puede configurar con `n` personas (igual que el candado del configurador). */
function sePuede(juego: string, n: number) {
  const d = def(juego);
  if (n < d.minJugadores || n > d.maxJugadores) return false;
  return MODALIDADES_JUEGO[juego]!.some(m => m !== "parejas" || (n >= 4 && n % 2 === 0));
}

describe("partidas completas de cada juego activo", () => {
  for (const juego of ACTIVOS) {
    for (const n of [2, 4, 8]) {
      it.runIf(sePuede(juego, n))(`${juego} con ${n}`, () => {
        for (let i = 0; i < 6; i++) {
          const op = opcionesPara(juego, n, i);
          partida(juego, n, 100 + i * 37 + n, op, { comodines: 0.5, pausas: 0.2, saltos: 0.08, ausentes: 0.15 });
          partida(juego, n, 900 + i, op, { comodines: 0, pausas: 0, saltos: 0, ausentes: 0 });
          partida(juego, n, 5000 + i, op, { comodines: 0.3, pausas: 0.1, saltos: 0, ausentes: 0.1, terminarEn: 2 });
          partida(juego, n, 7000 + i, { ...op, comodines: false }, { comodines: 0, pausas: 0, saltos: 0.2, ausentes: 0.3 });
        }
      });
    }
  }

  it("con Temperatura + Voltaje no se repite carta en la partida mientras haya cartas nuevas", () => {
    for (const juego of ["verdad-reto", "yo-nunca", "mas-probable", "que-prefieres", "lista", "bienvenida", "reto-lugar"]) {
      const d = def(juego);
      const op: OpcionesPartida = { ejes: { temperatura: 1, voltaje: 1, drunk: false } };
      const a = armarArranque(gente(4), juego, 10, 2, 11, op)!;
      const { cartas } = partida(juego, 4, 11, { ...op }, { comodines: 0, pausas: 0, saltos: 0, ausentes: 0 });
      const mazos = (d.mazo ?? "").split("+");
      const pool = cartasPermitidas(a.cfg, CONTENIDO.cartas, mazos).length;
      if (juego !== "verdad-reto" && pool >= a.rondas) expect(new Set(cartas).size, `${juego}: carta repetida`).toBe(cartas.length);
    }
  });

  it("cada juego de cartas tiene carta en cada ronda con cada nivel y escenario", () => {
    const conCarta = ACTIVOS.filter(j => !["impostor", "verdad-reto", "dados-hot", "fisico", "conoces"].includes(j));
    const faltan: string[] = [];
    for (const juego of conCarta) for (const ejes of NIVELES) for (const escenario of ESCENARIOS) for (const drunk of [false, true]) {
      const a = armarArranque(gente(4), juego, 8, 2, 3, { ejes: { ...ejes, drunk }, ...(escenario ? { escenario } : {}) });
      if (!a) continue;
      let e = crearPartida(def(juego), a.cfg, a.semilla, CONTENIDO, a.rondas);
      for (let r = 0; r < a.rondas && e.fase !== "terminada"; r++) {
        if (!e.carta) { faltan.push(`${juego} T${ejes.temperatura}V${ejes.voltaje} ${escenario ?? "-"} drunk=${drunk} ronda ${e.ronda}`); break; }
        e = juega(juega(e, { tipo: "saltar" }), { tipo: "siguiente" });
      }
    }
    expect(faltan).toEqual([]);
  });
});

describe("arreglos de la auditoría", () => {
  it("parejas elegidas por el anfitrión: la pareja del motor es la elegida, no la del orden de llegada", () => {
    // Llegaron j0, j1, j2, j3 (por llegada serían j0-j1 y j2-j3); el anfitrión armó j0 con j2 y j1 con j3.
    const grupos = { j0: "p1", j2: "p1", j1: "p2", j3: "p2" };
    const a = armarArranque(gente(4), "conoces", 3, 2, 5, { modalidad: "parejas", grupos })!;
    const pareja = Object.fromEntries(a.cfg.jugadores.map(j => [j.id, j.parejaDe]));
    expect(pareja).toEqual({ j0: "j2", j2: "j0", j1: "j3", j3: "j1" });
    let e = crearPartida(def("conoces"), a.cfg, a.semilla, CONTENIDO, a.rondas);
    // Cada quien contesta sobre su pareja elegida.
    expect((e.privado.j0 as { pareja: string }).pareja).toBe("j2");
    for (const j of ["j0", "j1", "j2", "j3"]) e = juega(e, { tipo: "contestar", jugador: j, valor: "Tacos" });
    e = juega(e, { tipo: "contestar", jugador: "j0", valor: "si" });
    e = juega(e, { tipo: "contestar", jugador: "j2", valor: "si" });
    e = juega(e, { tipo: "contestar", jugador: "j1", valor: "no" });
    e = juega(e, { tipo: "contestar", jugador: "j3", valor: "no" });
    e = juega(e, { tipo: "revelar" });
    expect(e.puntos).toEqual({ j0: 2, j2: 2, j1: 0, j3: 0 });
    expect(puntosPorEquipo(e).map(g => [g.equipo, g.puntos])).toEqual([["p1", 4], ["p2", 0]]);
    // Sin parejas elegidas sigue siendo por orden de llegada.
    const b = armarArranque(gente(4), "conoces", 3, 2, 5, { modalidad: "parejas" })!;
    expect(b.cfg.jugadores.map(j => j.parejaDe)).toEqual(["j1", "j0", "j3", "j2"]);
  });

  it("Reto del lugar: marca el anfitrión aunque no sea el primero de la lista", () => {
    const a = armarArranque(gente(3), "reto-lugar", 3, 2, 5, {})!;
    let e: EstadoPartida = { ...crearPartida(def("reto-lugar"), a.cfg, a.semilla, CONTENIDO, a.rondas), control: "j2" };
    expect(quienesContestan(e)).toEqual(["j2"]);
    expect(juega(e, { tipo: "contestar", jugador: "j0", valor: "j1" }).respuestas).toEqual({});
    e = juega(juega(e, { tipo: "contestar", jugador: "j2", valor: "j1" }), { tipo: "revelar" });
    expect(e.puntos.j1).toBe(3);
    // Si el anfitrión no está en la partida, como antes: el primero de la lista.
    expect(quienesContestan({ ...e, fase: "contestando", control: "tv" })).toEqual(["j0"]);
  });
});
