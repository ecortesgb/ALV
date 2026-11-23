// Prueba LOCAL de la migración 043 (etapa 2) en PGlite, sobre 040, 042 y 041. No toca la base remota.
// Uso: en una carpeta temporal FUERA del proyecto: npm i @electric-sql/pglite@0.2.17
//      y desde esa carpeta: node <repo>/supabase/pruebas/043_local_pglite.mjs <repo>/supabase/migrations
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
for (const f of ["040_resultados_partida.sql", "042_logros.sql", "041_torneos.sql", "043_logros_etapa2.sql"]) { console.log("Aplicando", f); await db.exec(readFileSync(join(MIG, f), "utf8")); }
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
await prueba("catálogo: 27 logros; los ocultos no se ven en la tabla y salen sin nombre en el progreso", async () => {
  await admin(); igual((await uno("select count(*)::int n from public.logros")).n, 27);
  await como(A); igual((await uno("select count(*)::int n from public.logros")).n, 22);
  const p = await filas("select clave, nombre, pista from public.mi_progreso_logros() where oculto");
  igual(p.length, 5); cierto(p.every(x => x.nombre === null && x.pista), "oculto con nombre o sin pista");
});
await prueba("remontada: gana después de ir en último lugar (oculto) y se revela", async () => {
  await jugar("que-prefieres", { [A]: 1, [B]: 5, [C]: 3 }, { datos: { [B]: { peorLugar: 3 } } });
  await admin(); cierto((await logrosDe(B)).includes("remontada"), "no se dio");
  await como(B); const r = await uno("select nombre, descripcion from public.mi_progreso_logros() where clave = 'remontada'");
  igual(r.nombre, "¿Y tú qué haces aquí?");
});
await prueba("intocable: 3 victorias siendo impostor; sospechoso: votos en 5 partidas sin serlo", async () => {
  for (let i = 0; i < 3; i++) await jugar("impostor", { [C]: 4, [A]: 0, [B]: 0 }, { datos: { [C]: { impostor: true }, [A]: { votosRecibidos: 2 } } });
  await admin(); cierto((await logrosDe(C)).includes("intocable"), "intocable no");
  cierto(!(await logrosDe(A)).includes("sospechoso"), "sospechoso antes de tiempo");
  for (let i = 0; i < 2; i++) await jugar("impostor", { [C]: 4, [A]: 0, [B]: 0 }, { datos: { [A]: { votosRecibidos: 1 } } });
  await admin(); cierto((await logrosDe(A)).includes("sospechoso"), "sospechoso no");
});
await prueba("objetivos: avance, no se cobra antes, se cobra una vez con su XP y cuenta para Constante", async () => {
  await como(D);
  await falla("select public.reclamar_objetivo('dia-victoria')", [], "todavía no se cumple");
  await jugar("que-prefieres", { [D]: 9, [A]: 0 });
  await como(D);
  const o = await filas("select clave, va, meta, reclamado from public.mis_objetivos()");
  igual(o.find(x => x.clave === "dia-victoria").va, 1);
  igual((await uno("select public.reclamar_objetivo('dia-victoria') x")).x, 100);
  await falla("select public.reclamar_objetivo('dia-victoria')", [], "ya reclamado");
  cierto((await filas("select * from public.mis_objetivos() where clave = 'dia-victoria'"))[0].reclamado, "no marcó");
  await admin(); igual((await uno(`select count(*)::int n from public.movimientos_xp where jugador = '${D}' and motivo = 'objetivo:dia-victoria'`)).n, 1);
  await falla("select public.reclamar_objetivo('inventado')", [], "objetivo no válido");
});
await prueba("objetivos: el tope de 600 al día recorta la XP", async () => {
  await admin(); await db.query(`insert into public.movimientos_xp (jugador, tipo, xp, motivo) values ('${D}', 'ganada', 590, 'prueba')`);
  await jugar("que-prefieres", { [D]: 9, [A]: 0 }); await jugar("que-prefieres", { [D]: 9, [A]: 0 });
  await como(D); igual((await uno("select public.reclamar_objetivo('dia-partidas') x")).x, 0);
});
await prueba("votos de la noche: vota, cambia su voto, no por sí mismo, conteo sin decir quién votó", async () => {
  await como(A); await db.query("select public.votar_noche($1, 'divertido', $2)", [EV, B]);
  await db.query("select public.votar_noche($1, 'divertido', $2)", [EV, C]);
  await falla("select public.votar_noche($1, 'divertido', $2)", [EV, A], "voto no válido");
  await falla("select public.votar_noche($1, 'raro', $2)", [EV, B], "categoría no válida");
  await falla("select public.votar_noche($1, 'divertido', $2)", [EV, G], "voto no válido");
  await como(B); await db.query("select public.votar_noche($1, 'divertido', $2)", [EV, C]);
  await como(A);
  const v = await filas("select categoria, votado, votos, mi_voto from public.votos_de_la_noche($1) where categoria = 'divertido'", [EV]);
  igual(v.map(x => [x.votado, x.votos]), [[C, 2]]); igual(v[0].mi_voto, C);
  await como(E); await falla("select public.votar_noche($1, 'divertido', $2)", [EV, B], "sin permiso");
  await falla("select * from public.votos_de_la_noche($1)", [EV], "sin permiso");
  await como(E); await falla("select * from public.votos_noche", [], "permission denied");
});
await prueba("votación cerrada 24 h después de cerrar la sala", async () => {
  await admin(); await db.query("update public.eventos set cerrado = true, cerrado_en = now() - interval '25 hours' where id = $1", [EV]);
  await como(A); await falla("select public.votar_noche($1, 'alma', $2)", [EV, B], "votación cerrada");
  await admin(); await db.query("update public.eventos set cerrado = false, cerrado_en = null where id = $1", [EV]);
});
await prueba("ranking de reconocimientos", async () => {
  await como(A); const r = await filas("select nombre, votos from public.ranking_reconocimientos('amigos', 'divertido')");
  igual(r[0].nombre, "Cata"); igual(r[0].votos, 2);
});
await prueba("título en uso: solo ganados, uno a la vez, sale en el ranking", async () => {
  await como(B);
  await falla("select public.usar_titulo('veterano')", [], "logro no ganado");
  await db.query("select public.usar_titulo('remontada')");
  await db.query("select public.usar_titulo('primeros-pasos')");
  await admin(); igual((await uno(`select count(*)::int n from public.logros_jugador where jugador = '${B}' and en_uso`)).n, 1);
  await como(A); const b = (await filas("select id, titulo, rareza_titulo from public.ranking_jugadores('amigos')")).find(x => x.id === B);
  igual(b.titulo, "Primeros pasos"); igual(b.rareza_titulo, "comun");
  await como(B); await db.query("select public.usar_titulo(null)");
  await admin(); igual((await uno(`select count(*)::int n from public.logros_jugador where jugador = '${B}' and en_uso`)).n, 0);
});
await prueba("identidad de grupos: solo integrantes; sale en el ranking de parejas", async () => {
  const cfg = { modalidad: "parejas", jugadores: [{ id: A, equipo: "p1" }, { id: B, equipo: "p1" }, { id: C, equipo: "p2" }, { id: D, equipo: "p2" }] };
  await jugar("yo-nunca", { [A]: 3, [B]: 3, [C]: 1, [D]: 0 }, { cfg });
  const g = [A, B].sort().join("+");
  await como(C); await falla("select public.nombrar_grupo($1, 'Los reyes', '#ff0000', '👑')", [g], "sin permiso");
  await como(A); await falla("select public.nombrar_grupo($1, 'X', '#ff0000')", [g], "nombre no válido");
  await falla("select public.nombrar_grupo($1, 'Los reyes', 'rojo')", [g], "color no válido");
  await db.query("select public.nombrar_grupo($1, 'Los reyes', '#FF0000', '👑')", [g]);
  const r = (await filas("select grupo, nombre_grupo, color, emoji from public.ranking_grupos('parejas', 'amigos')")).find(x => x.grupo === g);
  igual([r.nombre_grupo, r.color, r.emoji], ["Los reyes", "#ff0000", "👑"]);
  const m = await filas("select grupo, nombre from public.mis_grupos()");
  cierto(m.some(x => x.grupo === g && x.nombre === "Los reyes"), "mis_grupos sin nombre");
});
await prueba("anónimo sin permiso", async () => {
  await anon();
  await falla("select * from public.mis_objetivos()", [], "permission denied");
  await falla("select public.votar_noche($1, 'alma', $2)", [EV, B], "permission denied");
  await falla("select * from public.ranking_reconocimientos('global')", [], "permission denied");
});

console.log(`\n${ok} pasan, ${mal} fallan`);
process.exit(mal ? 1 : 0);
