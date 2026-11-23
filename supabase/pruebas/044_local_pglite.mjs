// Prueba LOCAL de la migración 044 (temporadas, Salón de la Fama y récords) en PGlite, sobre 040–043. No toca la base remota.
// Uso: en una carpeta temporal FUERA del proyecto: npm i @electric-sql/pglite@0.2.17
//      y desde esa carpeta: node <repo>/supabase/pruebas/044_local_pglite.mjs <repo>/supabase/migrations
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
create table public.eventos (id uuid primary key, anfitrion uuid, coanfitrion uuid, cerrado boolean not null default false, cerrado_en timestamptz);
create table public.miembros_evento (evento uuid references public.eventos (id), jugador uuid references public.perfiles (id), primary key (evento, jugador));
create table public.partidas (id uuid primary key, evento uuid references public.eventos (id), juego text, terminada timestamptz);
create table public.acciones (id text primary key, partida uuid, jugador uuid, tipo text, datos jsonb, n bigint generated always as identity);
create table public.movimientos_xp (id bigint generated always as identity primary key, jugador uuid, tipo text, xp int, evento uuid, partida uuid,
  xp_de_evento int not null default 0, motivo text, creado timestamptz default now());
create table public.monedas_log (jugador uuid, lugar int);
create table public.preferencias_cuenta (jugador uuid primary key references public.perfiles (id), datos jsonb not null default '{}', actualizado timestamptz);
create table privado.administradores (jugador uuid primary key);
create function public.soy_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists (select 1 from privado.administradores where jugador = auth.uid()) $$;
grant execute on function public.soy_admin() to authenticated;
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
insert into privado.administradores values ('${A}');
insert into public.eventos values ('${EV}', '${A}', null), ('${EV2}', '${E}', null);
insert into public.miembros_evento values ('${EV}', '${A}'), ('${EV}', '${B}'), ('${EV}', '${C}'), ('${EV}', '${D}'), ('${EV}', '${G}'), ('${EV2}', '${E}');
`);
for (const f of ["040_resultados_partida.sql", "042_logros.sql", "041_torneos.sql", "043_logros_etapa2.sql", "044_temporadas_salon_records.sql"]) { console.log("Aplicando", f); await db.exec(readFileSync(join(MIG, f), "utf8")); }
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
const mesPasado = "date_trunc('month', now() at time zone 'America/Mexico_City') - interval '10 days'";
await prueba("sin meses cerrados no hay temporada en el Salón", async () => {
  await jugar("que-prefieres", { [A]: 1, [B]: 5, [C]: 3 });
  await como(A); igual((await filas("select * from public.salon_de_la_fama() where tipo = 'temporada'")).length, 0);
});
await prueba("al pasar el mes se cierra: top 3, mejor pareja y logro Campeón de temporada", async () => {
  await jugar("que-prefieres", { [A]: 1, [B]: 5, [C]: 3 });
  const cfg = { modalidad: "parejas", jugadores: [{ id: A, equipo: "p1" }, { id: B, equipo: "p1" }, { id: C, equipo: "p2" }, { id: D, equipo: "p2" }] };
  await jugar("yo-nunca", { [A]: 3, [B]: 3, [C]: 1, [D]: 0 }, { cfg });
  await admin(); await db.query(`update public.resultados_partida set creada = (${mesPasado}) at time zone 'America/Mexico_City'`);
  await como(C);
  const s = await filas("select tipo, posicion, nombres, valor from public.salon_de_la_fama() order by tipo, posicion");
  const t = s.filter(x => x.tipo === "temporada");
  igual(t[0].nombres, ["Beto"]); igual(t[0].posicion, 1);
  cierto(s.some(x => x.tipo === "pareja" && x.nombres.includes("Ana") && x.nombres.includes("Beto")), "sin pareja");
  await admin(); igual((await filas(`select 1 from public.logros_jugador where jugador = '${B}' and logro = 'campeon-temporada'`)).length, 1);
});
await prueba("la foto no cambia y no se duplica al leer otra vez", async () => {
  await admin(); const antes = (await uno("select count(*)::int n from public.salon_fama")).n;
  await db.query(`insert into public.resultados_partida select partida, '${C}', evento, juego, modalidad, null, 99, null, 1, 3, true, 3, true, 5, 5, 0, '{}', creada
    from public.resultados_partida where jugador = '${A}' limit 1 on conflict do nothing`);
  await como(A); await db.query("select * from public.salon_de_la_fama()");
  await admin(); igual((await uno("select count(*)::int n from public.salon_fama")).n, antes);
  igual((await uno("select count(*)::int n from public.temporadas")).n, 1);
});
await prueba("récords con datos reales; fiestero solo con Drunk y se puede ocultar", async () => {
  await jugar("verdad-reto", { [A]: 1, [D]: 0 }, { cfg: { drunk: true }, datos: { [D]: { tomo: 4 } } });
  await jugar("verdad-reto", { [A]: 1, [B]: 0 }, { datos: { [B]: { tomo: 9 } } });
  await como(A);
  const r = Object.fromEntries((await filas("select clave, nombre, valor, mio from public.records('amigos')")).map(x => [x.clave, x]));
  igual(r.fiestero.nombre, "Dani"); igual(r.fiestero.valor, 4);
  cierto(r["rey-del-caos"].valor >= 3, "rey del caos");
  cierto(r.sobreviviente.valor > 0 && r.desafortunado.valor > 0, "faltan récords");
  await como(D); await db.query("select public.fijar_ocultar_bebidas(true)");
  await como(A); cierto(!(await filas("select clave from public.records('amigos')")).some(x => x.clave === "fiestero"), "fiestero no se ocultó");
  await falla("select * from public.records('todos')", [], "filtro no válido");
});
await prueba("cuenta borrada: el Salón dice «Jugador retirado»", async () => {
  await admin();
  await db.query(`delete from public.resultados_partida where jugador = '${B}'`); await db.query(`delete from public.logros_jugador where jugador = '${B}'`);
  await db.query(`delete from public.objetivos_jugador where jugador = '${B}'`); await db.query(`delete from public.votos_noche where votante = '${B}' or votado = '${B}'`);
  await db.query(`delete from public.preferencias_cuenta where jugador = '${B}'`); await db.query(`delete from public.miembros_evento where jugador = '${B}'`);
  await db.query(`delete from public.perfiles where id = '${B}'`);
  await como(A);
  const s = await filas("select tipo, nombres, retirados from public.salon_de_la_fama() where tipo in ('temporada', 'pareja') order by tipo, posicion");
  igual(s.find(x => x.tipo === "temporada").nombres, ["Jugador retirado"]);
  cierto(s.find(x => x.tipo === "pareja").nombres.includes("Jugador retirado"), "pareja sin retirado");
});
await prueba("sin lectura directa; anónimo sin permiso", async () => {
  await como(A); await falla("select * from public.salon_fama", [], "permission denied"); await falla("select * from public.temporadas", [], "permission denied");
  await anon(); await falla("select * from public.salon_de_la_fama()", [], "permission denied"); await falla("select * from public.records('global')", [], "permission denied");
});

console.log(`
${ok} pasan, ${mal} fallan`);
process.exit(mal ? 1 : 0);
