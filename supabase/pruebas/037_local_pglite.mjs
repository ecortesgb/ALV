// Prueba LOCAL de la migración 037 (todas las piezas libres) en PGlite (Postgres en WASM). No toca la base remota.
// Uso: en una carpeta temporal FUERA del proyecto: npm i @electric-sql/pglite@0.2.17
//      y desde esa carpeta: node <repo>/supabase/pruebas/037_local_pglite.mjs <repo>/supabase/migrations
// Mismos stubs que la prueba de la 036; aplica 033, 034 y 036, comprueba el bloqueo, aplica 037 y comprueba que todo es libre.
// Resultado 2026-11-19: 10 pasan, 0 fallan.
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
const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b", C = "00000000-0000-0000-0000-00000000000c", D = "00000000-0000-0000-0000-00000000000d";
const EV = "00000000-0000-0000-0000-0000000000e1", P1 = "00000000-0000-0000-0000-0000000000f1", P2 = "00000000-0000-0000-0000-0000000000f2";
const como = async uid => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`); };
const anon = async () => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`); };
const admin = async () => { await db.exec("reset role;"); };
const uno = async (sql, p = []) => (await db.query(sql, p)).rows[0];
let n = 0; const pedido = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const abrir = async (sobre, ped = pedido()) => (await uno("select public.abrir_sobre($1, $2) r", [sobre, ped])).r;
const monedas = async () => (await uno("select monedas from public.estado_tienda()")).monedas;

await db.exec(`
create role anon; create role authenticated;
create schema auth; create schema privado;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
create table public.perfiles (id uuid primary key);
create table public.movimientos_xp (
  id bigint generated always as identity primary key, jugador uuid not null references public.perfiles (id),
  tipo text not null constraint movimientos_xp_tipo_check check (tipo in ('ganada', 'accesorio', 'carta', 'quitada')),
  xp int not null check (xp > 0), evento uuid, partida uuid, xp_de_evento int not null default 0, motivo text not null, creado timestamptz default now());
create function privado.saldos_de(p_jugador uuid, p_evento uuid default null) returns table (acumulada int, disponible int, del_evento int, evento uuid)
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(x.xp) filter (where x.tipo = 'ganada'), 0)::int, coalesce(sum(case when x.tipo = 'ganada' then x.xp else -x.xp end), 0)::int, 0, null::uuid
  from public.movimientos_xp x where x.jugador = p_jugador $$;
create table public.figuras_jugador (jugador uuid not null references public.perfiles (id), capsula smallint not null, nombre text not null default '',
  figura jsonb not null, activa boolean not null default false, actualizado timestamptz default now(), primary key (jugador, capsula));
create table public.eventos (id uuid primary key, cerrado boolean not null default false);
create table public.miembros_evento (evento uuid references public.eventos (id), jugador uuid references public.perfiles (id), primary key (evento, jugador));
create table public.partidas (id uuid primary key, evento uuid references public.eventos (id), terminada timestamptz);
create function privado.es_anfitrion(p uuid) returns boolean language sql stable security definer set search_path = '' as $$ select (select auth.uid()) = '${A}'::uuid $$;
create function privado.es_miembro(p uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists (select 1 from public.miembros_evento m where m.evento = p and m.jugador = (select auth.uid())) $$;
create table privado.administradores (jugador uuid primary key);
create function public.soy_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists (select 1 from privado.administradores where jugador = auth.uid()) $$;
grant execute on function public.soy_admin() to authenticated;
create function public.comprar_sobre(p_sobre text) returns void language sql as $$ select $$;
grant execute on function public.comprar_sobre(text) to authenticated;
insert into public.perfiles values ('${A}'), ('${B}'), ('${C}'), ('${D}');
insert into privado.administradores values ('${A}');
insert into public.eventos values ('${EV}');
insert into public.miembros_evento values ('${EV}', '${A}'), ('${EV}', '${B}'), ('${EV}', '${C}'), ('${EV}', '${D}');
insert into public.partidas values ('${P1}', '${EV}', null), ('${P2}', '${EV}', null);
`);
for (const f of ["033_piezas_rareza_y_retos.sql", "034_xp_nunca_cero.sql", "036_tienda_monedas_y_sobres.sql"]) {
  console.log("Aplicando", f);
  await db.exec(readFileSync(join(MIG, f), "utf8"));
}
await db.exec("grant usage on schema privado to authenticated;"); // en Supabase ya existe

const FIG = (est) => JSON.stringify({ version: 2, identidad: { rostro: "FACE_001", detalles: [] }, ropa: { torso: { estampado: est } }, accesorios: {}, momentos: {} });
const guardar = (uid, cap, est) => db.query("insert into public.figuras_jugador (jugador, capsula, figura) values ($1, $2, $3::jsonb) on conflict (jugador, capsula) do update set figura = excluded.figura", [uid, cap, FIG(est)]);
const xpDisp = async uid => (await uno("select disponible from privado.saldos_de($1)", [uid])).disponible;

console.log("Antes de la 037:");
await prueba("el guardián bloquea una pieza legendaria que B no tiene", async () => {
  await admin(); await falla("insert into public.figuras_jugador (jugador, capsula, figura) values ($1, 1, $2::jsonb)", [B, FIG("PRINT_004")], "pieza bloqueada");
});
await admin();
const antes = await uno("select count(*)::int total, count(*) filter (where activo)::int activas from public.piezas_figura");
const tenidas = (await uno("select count(*)::int n from public.piezas_jugador")).n;
await db.query("insert into public.movimientos_xp (jugador, tipo, xp, motivo) values ($1, 'ganada', 1000, 'prueba')", [C]);

console.log("Aplicando 037_piezas_libres.sql");
await db.exec(readFileSync(join(MIG, "037_piezas_libres.sql"), "utf8"));

console.log("Pruebas:");
await prueba("ninguna pieza se borró; todas quedaron inactivas", async () => {
  await admin();
  const d = await uno("select count(*)::int total, count(*) filter (where activo)::int activas from public.piezas_figura");
  igual(d.total, antes.total, "total"); cierto(antes.activas > 0, "antes había activas"); igual(d.activas, 0, "activas");
  igual((await uno("select count(*)::int n from public.piezas_jugador")).n, tenidas, "piezas_jugador");
});
await prueba("el guardián ya deja guardar la pieza legendaria", async () => {
  await admin(); await guardar(B, 1, "PRINT_004");
  igual((await uno("select figura #>> '{ropa,torso,estampado}' e from public.figuras_jugador where jugador = $1 and capsula = 1", [B])).e, "PRINT_004");
});
await prueba("también al actualizar la figura (update)", async () => {
  await admin(); await db.query("update public.figuras_jugador set figura = $2::jsonb where jugador = $1 and capsula = 1", [B, FIG("PRINT_021")]);
});
await prueba("desbloquear una pieza ya no cobra XP: «pieza no válida»", async () => {
  await como(C); const x0 = await (async () => { await admin(); return xpDisp(C); })();
  await como(C); await falla("select public.desbloquear_pieza('PRINT_004')", [], "pieza no válida");
  await admin(); igual(await xpDisp(C), x0, "XP");
});
await prueba("los sobres de piezas quedan pausados y no cobran", async () => {
  await como(A); const m0 = await monedas();
  for (const s of ["basico", "accesorios", "mixto", "epico"]) await falla("select public.abrir_sobre($1, $2)", [s, pedido()], "sobre no válido");
  igual(await monedas(), m0, "monedas");
  await admin(); igual((await db.query("select id from public.sobres_tienda where activo order by id")).rows.map(r => r.id), ["comodines"]);
});
await prueba("el sobre de comodines sigue a la venta", async () => {
  await como(A); const r = await abrir("comodines");
  igual(r.cartas.length, 3, "cartas"); cierto(r.cartas.every(c => c.tipo === "comodin" || c.tipo === "monedas"), "solo comodines");
});
await prueba("la app puede leer qué piezas siguen activas (ninguna)", async () => {
  await como(B); igual((await db.query("select id from public.piezas_figura where activo")).rows.length, 0);
  cierto((await db.query("select id from public.piezas_figura")).rows.length === antes.total, "lee el catálogo");
});
await prueba("anónimo sigue sin leer el catálogo de piezas", async () => {
  await anon(); await falla("select id from public.piezas_figura", [], "permission denied");
});
await prueba("se puede volver a bloquear una pieza (reversible)", async () => {
  await admin(); await db.exec("update public.piezas_figura set activo = true where id = 'PRINT_022'");
  await falla("insert into public.figuras_jugador (jugador, capsula, figura) values ($1, 2, $2::jsonb)", [D, FIG("PRINT_022")], "pieza bloqueada");
  await db.exec("update public.piezas_figura set activo = false where id = 'PRINT_022'");
  await guardar(D, 2, "PRINT_022");
});

console.log(`\n${ok} pasan, ${mal} fallan`);
process.exit(mal ? 1 : 0);
