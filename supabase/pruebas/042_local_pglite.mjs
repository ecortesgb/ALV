// Prueba LOCAL de la migración 042 (logros) en PGlite, sobre la 040. No toca la base remota.
// Resultado 2026-11-23: 14 pasan, 0 fallan.
// Uso: en una carpeta temporal FUERA del proyecto: npm i @electric-sql/pglite@0.2.17
//      y desde esa carpeta: node <repo>/supabase/pruebas/042_local_pglite.mjs <repo>/supabase/migrations
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
for (const f of ["040_resultados_partida.sql", "042_logros.sql"]) { console.log("Aplicando", f); await db.exec(readFileSync(join(MIG, f), "utf8")); }
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
const logrosDe = async uid => (await filas("select logro from public.logros_jugador where jugador = $1 order by logro", [uid])).map(r => r.logro);
await prueba("catálogo: 18 logros visibles; nadie tiene logros al empezar", async () => {
  await como(A);
  igual((await uno("select count(*)::int n from public.logros")).n, 18);
  igual(await logrosDe(A), []);
});
await prueba("primera partida ganada: Primeros pasos y Primera sangre a Ana; Beto solo Primeros pasos", async () => {
  await jugar("que-prefieres", { [A]: 5, [B]: 1 });
  await admin();
  igual(await logrosDe(A), ["primera-victoria", "primeros-pasos"]);
  igual(await logrosDe(B), ["primeros-pasos"]);
});
await prueba("los logros no dan XP: la XP de la partida es la misma", async () => {
  const p = await jugar("que-prefieres", { [A]: 5, [B]: 1 }, { rondas: 4 });
  igual((await filas("select xp from public.movimientos_xp where partida = $1", [p])).map(r => r.xp), [24, 24]);
  igual((await uno("select count(*)::int n from public.movimientos_xp where motivo like 'logro%'")).n, 0);
});
await prueba("Detective: 5 votos al impostor sumados entre partidas", async () => {
  await jugar("impostor", { [A]: 1, [B]: 0, [C]: 0 }, { datos: { [B]: { votoImpostor: 3 } } });
  await admin(); cierto(!(await logrosDe(B)).includes("detective"), "antes de tiempo");
  await jugar("impostor", { [A]: 1, [B]: 0, [C]: 0 }, { datos: { [B]: { votoImpostor: 2 } } });
  await admin(); cierto((await logrosDe(B)).includes("detective"), "no llegó");
});
await prueba("Cara de póker: ganar siendo impostor", async () => {
  await jugar("impostor", { [C]: 4, [A]: 0, [B]: 0 }, { datos: { [C]: { impostor: true } } });
  await admin(); cierto((await logrosDe(C)).includes("cara-de-poker"), "no se dio");
});
await prueba("Imparable: 5 victorias seguidas", async () => {
  for (let i = 0; i < 4; i++) await jugar("que-prefieres", { [D]: 9, [A]: 0 });
  await admin(); cierto(!(await logrosDe(D)).includes("imparable"), "con 4 ya se dio");
  await jugar("que-prefieres", { [D]: 9, [A]: 0 });
  await admin(); cierto((await logrosDe(D)).includes("imparable"), "con 5 no se dio");
});
await prueba("Campeón de la noche al guardar copas", async () => {
  await admin(); const p = id(0x9200);
  await db.query("insert into public.partidas values ($1, $2, 'copas', null)", [p, EV]);
  await como(A); await db.query("select public.guardar_copas($1, $2)", [p, { individual: [{ id: C, lugar: 1, puntos: 30 }] }]);
  await admin(); cierto((await logrosDe(C)).includes("campeon-noche"), "no se dio");
});
await prueba("invitado: nunca recibe logros", async () => {
  await admin(); await db.query("select privado.revisar_logros($1)", [G]);
  igual(await logrosDe(G), []);
});
await prueba("mi_progreso_logros: avance real y tope en la meta", async () => {
  await como(B);
  const r = await filas("select clave, va, meta, ganado from public.mi_progreso_logros()");
  igual(r.length, 18);
  const det = r.find(x => x.clave === "detective"); igual(det.va, 5); cierto(det.ganado, "sin fecha");
  const vet = r.find(x => x.clave === "veterano"); cierto(vet.va < 100 && !vet.ganado, "veterano mal");
});
await prueba("mis_logros_nuevos: entrega una vez y luego nada", async () => {
  await como(C);
  const a = await filas("select clave from public.mis_logros_nuevos()");
  cierto(a.some(x => x.clave === "campeon-noche"), "no trae campeón");
  igual((await filas("select clave from public.mis_logros_nuevos()")).length, 0);
});
await prueba("RLS: Beto no ve logros de Ana; no puede escribir", async () => {
  await como(B);
  igual((await filas("select distinct jugador from public.logros_jugador")).map(r => r.jugador), [B]);
  await falla(`insert into public.logros_jugador (jugador, logro) values ('${B}', 'veterano')`, [], "permission denied");
});
await prueba("destacar: hasta 3, solo ganados", async () => {
  await como(A);
  await falla("select public.destacar_logro('veterano', true)", [], "logro no ganado");
  const ganados = await logrosDe(A);
  cierto(ganados.length >= 2, "pocos logros");
  igual((await uno("select public.destacar_logro($1, true) n", [ganados[0]])).n, 1);
  igual((await uno("select public.destacar_logro($1, false) n", [ganados[0]])).n, 0);
});
await prueba("TV: recientes de la sala solo para miembros", async () => {
  await como(A);
  cierto((await filas("select * from public.logros_recientes_sala($1)", [EV])).length > 0, "sin recientes");
  await como(E); await falla("select * from public.logros_recientes_sala($1)", [EV], "sin permiso");
});
await prueba("anónimo sin permiso", async () => {
  await anon();
  await falla("select * from public.mi_progreso_logros()", [], "permission denied");
  await falla("select * from public.logros", [], "permission denied");
});

console.log(`
${ok} pasan, ${mal} fallan`);
process.exit(mal ? 1 : 0);
