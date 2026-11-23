// Prueba LOCAL de la migración 040 (resultados por jugador, copas y ranking) en PGlite. No toca la base remota.
// Uso: en una carpeta temporal FUERA del proyecto: npm i @electric-sql/pglite@0.2.17
//      y desde esa carpeta: node <repo>/supabase/pruebas/040_local_pglite.mjs <repo>/supabase/migrations
// Resultado 2026-11-23: 23 pasan, 0 fallan.
// Stubs mínimos de las tablas y funciones que la 040 usa; las reglas que se prueban son las de Maestro v1.54 (14.3).
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const req = createRequire(join(process.cwd(), "x.js"));
const { PGlite } = await import(pathToFileURL(req.resolve("@electric-sql/pglite")).href);
const MIG = process.argv[2];
const db = new PGlite();
let ok = 0, mal = 0;
const prueba = async (nombre, fn) => { try { await fn(); ok++; console.log("  ✓", nombre); } catch (e) { mal++; console.log("  ✗", nombre, "→", e.message); } };
const igual = (a, b, m = "") => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} esperaba ${JSON.stringify(b)} y fue ${JSON.stringify(a)}`); };
const cierto = (v, m) => { if (!v) throw new Error(m); };
const falla = async (sql, params, texto) => { try { await db.query(sql, params); } catch (e) { if (!e.message.includes(texto)) throw new Error("otro error: " + e.message); return; } throw new Error("no falló: " + texto); };
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const A = id(0xa), B = id(0xb), C = id(0xc), D = id(0xd), E = id(0xe), G = id(0x99);
const EV = id(0xe1), EV2 = id(0xe2);
const como = async uid => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`); };
const anon = async () => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`); };
const admin = async () => { await db.exec("reset role;"); };
const filas = async (sql, p = []) => (await db.query(sql, p)).rows;
const uno = async (sql, p = []) => (await filas(sql, p))[0];

await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema privado;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
create table public.perfiles (id uuid primary key, nombre text not null, invitado boolean not null default false);
create table public.eventos (id uuid primary key, anfitrion uuid, coanfitrion uuid, cerrado boolean not null default false);
create table public.miembros_evento (evento uuid references public.eventos (id), jugador uuid references public.perfiles (id), primary key (evento, jugador));
create table public.partidas (id uuid primary key, evento uuid references public.eventos (id), juego text, terminada timestamptz);
create table public.acciones (id text primary key, partida uuid, jugador uuid, tipo text, datos jsonb, n bigint generated always as identity);
create table public.movimientos_xp (id bigint generated always as identity primary key, jugador uuid, tipo text, xp int, evento uuid, partida uuid,
  xp_de_evento int not null default 0, motivo text, creado timestamptz default now());
create table public.monedas_log (jugador uuid, lugar int);
create table public.preferencias_cuenta (jugador uuid primary key references public.perfiles (id), datos jsonb not null default '{}', actualizado timestamptz);
create table public.figuras_jugador (jugador uuid, capsula smallint, figura jsonb, activa boolean);
create function privado.es_anfitrion(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.eventos e where e.id = p and (select auth.uid()) in (e.anfitrion, e.coanfitrion)) $$;
create function privado.es_miembro(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros_evento m where m.evento = p and m.jugador = (select auth.uid())) $$;
create function privado.xp_de_partida(r int, t int, l int, j int) returns int language sql immutable as $$ select case when r > 0 then 20 + r else 0 end $$;
create function privado.dar_monedas_partida(p_jugador uuid, p_lugar int, p_jugadores int, p_partida uuid, p_juego text) returns int
  language sql security definer set search_path = '' as $$ insert into public.monedas_log values (p_jugador, p_lugar) returning 1 $$;
create function public.nivel_por_xp(x int) returns int language sql immutable as $$ select 1 + x / 100 $$;
create function privado.saldos_de(p_jugador uuid, p_evento uuid default null) returns table (acumulada int) language sql stable security definer set search_path = '' as $$
  select coalesce(sum(x.xp), 0)::int from public.movimientos_xp x where x.jugador = p_jugador $$;
insert into public.perfiles values ('${A}', 'Ana', false), ('${B}', 'Beto', false), ('${C}', 'Cata', false), ('${D}', 'Dani', false),
  ('${E}', 'Eva', false), ('${G}', 'Invitado', true);
insert into public.eventos values ('${EV}', '${A}', null), ('${EV2}', '${E}', null);
insert into public.miembros_evento values ('${EV}', '${A}'), ('${EV}', '${B}'), ('${EV}', '${C}'), ('${EV}', '${D}'), ('${EV}', '${G}'), ('${EV2}', '${E}');
`);
console.log("Aplicando 040_resultados_partida.sql");
await db.exec(readFileSync(join(MIG, "040_resultados_partida.sql"), "utf8"));
await db.exec("grant usage on schema privado to authenticated;"); // en Supabase ya existe

let np = 0;
/** Crea una partida con su arranque y la termina como el anfitrión. puntos: { id: n }. */
async function jugar(juego, puntos, { rondas = 5, plan = 5, cfg = {}, temprano = false, sinPuntos = false, datos = {}, evento = EV, quien = A } = {}) {
  const p = id(0x1000 + ++np);
  await admin();
  await db.query("insert into public.partidas values ($1, $2, $3, null)", [p, evento, juego]);
  const anf = (await uno("select anfitrion from public.eventos where id = $1", [evento])).anfitrion;
  await db.query("insert into public.acciones (id, partida, jugador, tipo, datos) values ($1, $2, $3, 'control', $4)",
    [`arranque-${p}`, p, anf, { que: "arranque", rondas: plan, cfg }]);
  if (temprano) await db.query("insert into public.acciones (id, partida, jugador, tipo, datos) values ($1, $2, $3, 'control', $4)", [`t-${p}`, p, anf, { que: "terminar" }]);
  // Lugar como lo calcula el motor (para la XP), por si la prueba quita los puntos.
  const ids = Object.keys(puntos), orden = [...ids].sort((x, y) => puntos[y] - puntos[x]);
  const res = ids.map(j => ({ jugador: j, rondas, retos: 0, lugar: orden.findIndex(o => puntos[o] === puntos[j]) + 1,
    ...(sinPuntos ? {} : { puntos: puntos[j] }), ...(datos[j] ? { datos: datos[j] } : {}) }));
  await como(quien);
  await db.query("select public.terminar_partida_sala($1, $2, $3, $4)", [p, juego, ids.length, JSON.stringify(res)]);
  await admin();
  return p;
}
const de = async p => Object.fromEntries((await filas("select * from public.resultados_partida where partida = $1", [p])).map(r => [r.jugador, r]));

console.log("Pruebas:");
await prueba("individual 4: lugares 1, 2, 2, 4; Puntos ALV 3, 2, 2, 0 (con 4 puntúan dos lugares); MVP Ana", async () => {
  const r = await de(await jugar("que-prefieres", { [A]: 5, [B]: 3, [C]: 3, [D]: 1 }));
  igual([A, B, C, D].map(j => r[j].lugar), [1, 2, 2, 4]); igual([A, B, C, D].map(j => r[j].puntos_alv), [3, 2, 2, 0]);
  igual([A, B, C, D].map(j => r[j].mvp), [true, false, false, false]); igual(r[A].unidades, 4); igual(r[A].cuenta, true);
});
await prueba("empate en 1.º: 1, 1, 3, 4 → 3, 3, 0, 0 y MVP compartido", async () => {
  const r = await de(await jugar("que-prefieres", { [A]: 5, [B]: 5, [C]: 2, [D]: 1 }));
  igual([A, B, C, D].map(j => r[j].lugar), [1, 1, 3, 4]); igual([A, B, C, D].map(j => r[j].puntos_alv), [3, 3, 0, 0]);
  igual([A, B].map(j => r[j].mvp), [true, true]);
});
await prueba("pocos: 3 jugadores, solo el 1.º puntúa", async () => {
  const r = await de(await jugar("que-prefieres", { [A]: 1, [B]: 4, [C]: 2 }));
  igual([A, B, C].map(j => r[j].puntos_alv), [0, 3, 0]);
});
await prueba("parejas: 2 unidades, la ganadora entera gana 3; MVP el de más puntos de la ganadora", async () => {
  const cfg = { modalidad: "parejas", jugadores: [{ id: A, equipo: "p1" }, { id: B, equipo: "p1" }, { id: C, equipo: "p2" }, { id: D, equipo: "p2" }] };
  const r = await de(await jugar("yo-nunca", { [A]: 2, [B]: 4, [C]: 5, [D]: 0 }, { cfg }));
  igual([A, B, C, D].map(j => r[j].lugar), [1, 1, 2, 2]); igual([A, B, C, D].map(j => r[j].puntos_alv), [3, 3, 0, 0]);
  igual([A, B, C, D].map(j => r[j].mvp), [false, true, false, false], "MVP"); igual(r[A].unidades, 2);
  igual(r[A].grupo, [A, B].sort().join("+")); igual(r[A].puntos_grupo, 6);
});
await prueba("invitado: juega y ocupa lugar pero no tiene fila", async () => {
  const p = await jugar("que-prefieres", { [A]: 1, [B]: 2, [C]: 3, [G]: 9 });
  const r = await de(p);
  cierto(!r[G], "el invitado tiene fila"); igual(r[C].lugar, 2); igual(r[C].puntos_alv, 2); igual(r[C].unidades, 4);
});
await prueba("terminada antes de tiempo con 2 de 10 rondas: filas sí, Puntos ALV no", async () => {
  const r = await de(await jugar("que-prefieres", { [A]: 5, [B]: 1 }, { rondas: 2, plan: 10, temprano: true }));
  igual(r[A].cuenta, false); igual(r[A].puntos_alv, 0); igual(r[A].rondas_plan, 10);
});
await prueba("terminada antes de tiempo con 5 de 10: cuenta", async () => {
  const r = await de(await jugar("que-prefieres", { [A]: 5, [B]: 1 }, { rondas: 5, plan: 10, temprano: true }));
  igual(r[A].cuenta, true); igual(r[A].puntos_alv, 3);
});
await prueba("acabó sola con pocas rondas (El impostor): cuenta", async () => {
  const r = await de(await jugar("impostor", { [A]: 2, [B]: 0, [C]: 0 }, { rondas: 1, plan: 4 }));
  igual(r[A].cuenta, true); igual(r[A].puntos_alv, 3);
});
await prueba("Bienvenida no cuenta", async () => {
  const r = await de(await jugar("bienvenida", { [A]: 5, [B]: 1 }));
  igual(r[A].cuenta, false); igual(r[A].puntos_alv, 0);
});
await prueba("una sola cuenta registrada (con un invitado) no cuenta", async () => {
  const r = await de(await jugar("que-prefieres", { [A]: 5, [G]: 1 }));
  igual(r[A].cuenta, false);
});
await prueba("aparato viejo sin puntos: usa el lugar que mandó y no hay MVP", async () => {
  const r = await de(await jugar("que-prefieres", { [A]: 1, [B]: 9, [C]: 4, [D]: 0 }, { sinPuntos: true }));
  igual([A, B, C, D].map(j => r[j].lugar), [3, 1, 2, 4]); igual(r[B].puntos_alv, 3); igual(r[B].mvp, false); igual(r[B].puntos, null);
});
await prueba("bebidas solo con Drunk; herramienta de Verdad o reto guardada", async () => {
  const datos = { [A]: { tomo: 3, impostor: true, raro: "x" }, [B]: { tomo: 1 } };
  const sin = await de(await jugar("verdad-reto", { [A]: 1, [B]: 2 }, { datos, cfg: { verdadReto: { herramienta: "dados" } } }));
  igual(sin[A].datos, { impostor: true, herramienta: "dados" });
  const con = await de(await jugar("verdad-reto", { [A]: 1, [B]: 2 }, { datos, cfg: { drunk: true } }));
  igual(con[A].datos, { tomo: 3, drunk: true, impostor: true });
});
await prueba("la XP y las monedas se dan igual que antes (una fila por jugador, 20 + rondas)", async () => {
  const p = await jugar("que-prefieres", { [A]: 5, [B]: 3, [C]: 3, [D]: 1 }, { rondas: 6 });
  const xp = await filas("select jugador, xp from public.movimientos_xp where partida = $1 order by jugador", [p]);
  igual(xp.map(x => x.xp), [26, 26, 26, 26]);
});
await prueba("solo el anfitrión termina; 'fisico' se acepta", async () => {
  await admin(); const p = id(0x9001);
  await db.query("insert into public.partidas values ($1, $2, 'fisico', null)", [p, EV]);
  await como(B); await falla("select public.terminar_partida_sala($1, 'fisico', 2, '[]')", [p], "sin permiso");
  await como(A); await db.query("select public.terminar_partida_sala($1, 'fisico', 2, '[]')", [p]);
});
await prueba("RLS: Beto solo lee sus propias filas", async () => {
  await como(B);
  const r = await filas("select distinct jugador from public.resultados_partida");
  igual(r.map(x => x.jugador), [B]);
  await anon(); await falla("select * from public.resultados_partida", [], "permission denied");
});
await prueba("copas: guarda ganadores, termina la partida y no da XP", async () => {
  await admin(); const p = id(0x9100);
  await db.query("insert into public.partidas values ($1, $2, 'copas', null)", [p, EV]);
  const antes = (await uno("select count(*)::int n from public.movimientos_xp")).n;
  await como(B); await falla("select public.guardar_copas($1, '{}')", [p], "sin permiso");
  await como(A);
  const n = (await uno("select public.guardar_copas($1, $2) n", [p, { individual: [{ id: A, lugar: 1, puntos: 20 }, { id: E, lugar: 2, puntos: 9 }],
    parejas: [{ nombre: "Los dos", jugadores: [A, B], puntos: 12 }] }])).n;
  igual(n, 3, "Eva no es de la sala");
  await admin();
  cierto((await uno("select terminada from public.partidas where id = $1", [p])).terminada, "no se terminó");
  igual((await uno("select count(*)::int n from public.movimientos_xp")).n, antes);
  await como(E); igual((await filas("select * from public.copas_noche")).length, 0, "Eva lee copas ajenas");
});
await prueba("ranking amigos: Ana ve a los de su sala con sus totales, sin invitados", async () => {
  await como(A);
  const r = await filas("select * from public.ranking_jugadores('amigos')");
  igual(r.map(x => x.nombre).sort(), ["Ana", "Beto", "Cata", "Dani"]);
  const ana = r.find(x => x.id === A);
  cierto(ana.puntos_alv > 0 && ana.victorias > 0 && ana.partidas > 0, "totales vacíos");
  cierto(r[0].posicion === 1, "sin posición");
});
await prueba("ranking amigos: Eva (otra sala) solo se ve a sí misma; en global ve a todos", async () => {
  await como(E);
  igual((await filas("select nombre from public.ranking_jugadores('amigos')")).map(x => x.nombre), ["Eva"]);
  igual((await filas("select nombre from public.ranking_jugadores('global')")).length, 5);
});
await prueba("privacidad: Beto se quita del Global; Eva ya no lo ve, Ana sí (amigos)", async () => {
  await como(B); await db.query("select public.fijar_ranking_global(false)");
  await como(E); cierto(!(await filas("select nombre from public.ranking_jugadores('global')")).some(x => x.nombre === "Beto"), "Eva ve a Beto");
  await como(A); cierto((await filas("select nombre from public.ranking_jugadores('amigos')")).some(x => x.nombre === "Beto"), "Ana no ve a Beto");
  await como(B); cierto((await filas("select nombre from public.ranking_jugadores('global')")).some(x => x.nombre === "Beto"), "Beto no se ve");
  await db.query("select public.fijar_ranking_global(true)");
});
await prueba("racha y victorias por categoría", async () => {
  await como(A);
  const a = (await filas("select * from public.ranking_jugadores('amigos')")).find(x => x.id === A);
  cierto(a.racha >= 1, "sin racha"); cierto(a.victorias_deduccion >= 1, "sin victoria de deducción (impostor)");
});
await prueba("temporada: lo de otro mes no cuenta", async () => {
  await admin(); await db.query(`update public.resultados_partida set creada = now() - interval '400 days' where jugador = '${C}'`);
  await como(A);
  const c = (await filas("select * from public.ranking_jugadores('amigos', true)")).find(x => x.id === C);
  igual(c.puntos_alv, 0); igual(c.partidas, 0);
  const c2 = (await filas("select * from public.ranking_jugadores('amigos', false)")).find(x => x.id === C);
  cierto(c2.partidas > 0, "sin temporada también lo quitó");
});
await prueba("ranking de parejas: Ana + Beto con su victoria", async () => {
  await como(A);
  const r = await filas("select * from public.ranking_grupos('parejas', 'amigos')");
  const ab = r.find(x => JSON.stringify(x.integrantes) === JSON.stringify([A, B].sort()));
  cierto(ab, "no está la pareja"); igual(ab.victorias, 1); igual(ab.puntos_alv, 3); igual(ab.porcentaje, 100);
});
await prueba("filtros y anónimo", async () => {
  await como(A); await falla("select * from public.ranking_jugadores('todos')", [], "filtro no válido");
  await falla("select * from public.ranking_grupos('sexos', 'amigos')", [], "modalidad no válida");
  await anon(); await falla("select * from public.ranking_jugadores('global')", [], "permission denied");
});

console.log(`\n${ok} pasan, ${mal} fallan`);
process.exit(mal ? 1 : 0);
