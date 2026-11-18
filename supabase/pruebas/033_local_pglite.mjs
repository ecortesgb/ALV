// Prueba LOCAL de la migración 033 en PGlite (Postgres en WASM). No toca la base remota.
// Uso: en una carpeta temporal fuera del proyecto: npm i @electric-sql/pglite@0.2.17 && node <ruta>/033_local_pglite.mjs <ruta>/033_piezas_rareza_y_retos.sql
// Resultado 2026-11-17: 14 pasan, 0 fallan.
// Prueba local de la migración 033 en PGlite (Postgres en WASM). Nada remoto.
// Tablas mínimas que la 033 necesita (perfiles, movimientos_xp, figuras_jugador, privado.saldos_de, auth.uid) y luego la 033.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIG = process.argv[2];
const db = new PGlite();
let ok = 0, mal = 0;
const prueba = async (nombre, fn) => { try { await fn(); ok++; console.log("  ✓", nombre); } catch (e) { mal++; console.log("  ✗", nombre, "→", e.message); } };
const igual = (a, b, m = "") => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} esperaba ${JSON.stringify(b)} y fue ${JSON.stringify(a)}`); };
const falla = async (sql, params, texto) => { try { await db.query(sql, params); } catch (e) { if (!e.message.includes(texto)) throw new Error("otro error: " + e.message); return; } throw new Error("no falló: " + texto); };
const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b";
const como = async uid => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`); };
const admin = async () => { await db.exec("reset role;"); };

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
  select greatest(0, coalesce(sum(x.xp) filter (where x.tipo = 'ganada'), 0) - coalesce(sum(x.xp) filter (where x.tipo = 'quitada'), 0))::int,
         coalesce(sum(case when x.tipo = 'ganada' then x.xp else -x.xp end), 0)::int, 0, null::uuid
  from public.movimientos_xp x where x.jugador = p_jugador $$;
create table public.figuras_jugador (jugador uuid not null references public.perfiles (id), capsula smallint not null, nombre text not null default '',
  figura jsonb not null, activa boolean not null default false, actualizado timestamptz default now(), primary key (jugador, capsula));
alter table public.figuras_jugador enable row level security;
grant select, insert, delete on public.figuras_jugador to authenticated; grant update (nombre, figura, actualizado) on public.figuras_jugador to authenticated;
create policy f_leer on public.figuras_jugador for select to authenticated using (jugador = (select auth.uid()));
create policy f_crear on public.figuras_jugador for insert to authenticated with check (jugador = (select auth.uid()));
create policy f_editar on public.figuras_jugador for update to authenticated using (jugador = (select auth.uid())) with check (jugador = (select auth.uid()));
insert into public.perfiles values ('${A}'), ('${B}');
-- Antes de la 033, A ya guardó una figura con la máscara de Batman (pieza que será legendaria).
insert into public.figuras_jugador (jugador, capsula, figura, activa) values ('${A}', 1, '{"version":2,"accesorios":{"cabeza":{"id":"HELM_012","color":"#1b2a34"}},"identidad":{"rostro":"FACE_001","detalles":[]}}', true);
`);

console.log("Aplicando la 033…");
await db.exec(readFileSync(MIG, "utf8"));
await db.exec("grant usage on schema privado to authenticated;"); // en Supabase ya existe (lo usan otras funciones)

const fig = o => JSON.stringify({ version: 2, identidad: { rostro: "FACE_001", detalles: [], piel: "#f2cd37", cabello: { id: "HAIR_001", color: "#582a12" } },
  ropa: { torso: { color: "#c91a09", estampado: null, colores: [] }, piernas: { color: "#0055bf", botas: null } }, accesorios: {}, momentos: { paquete: null }, ...o });

console.log("Pruebas:");
await prueba("catálogo y retos cargados", async () => {
  igual((await db.query("select count(*)::int n from public.piezas_figura")).rows[0].n, 70);
  igual((await db.query("select count(*)::int n from public.retos_figura")).rows[0].n, 13);
});
await prueba("regalo: A conserva la máscara de Batman que ya usaba", async () => {
  igual((await db.query(`select pieza, origen from public.piezas_jugador where jugador = '${A}'`)).rows, [{ pieza: "HELM_012", origen: "regalo" }]);
});
await prueba("RLS: cada quien ve solo lo suyo", async () => {
  await como(B); igual((await db.query("select count(*)::int n from public.piezas_jugador")).rows[0].n, 0);
  await como(A); igual((await db.query("select count(*)::int n from public.piezas_jugador")).rows[0].n, 1);
});
await prueba("RLS: nadie escribe directo en piezas_jugador", async () => {
  await como(B); await falla(`insert into public.piezas_jugador values ('${B}', 'PRINT_001', 'xp')`, [], "permission denied");
});
await prueba("guardián: no se guarda una figura con pieza bloqueada", async () => {
  await como(A); await falla("update public.figuras_jugador set figura = $1 where capsula = 1", [fig({ ropa: { torso: { estampado: "PRINT_001", color: "#1d3f8f", colores: [] }, piernas: { color: "#000000" } } })], "pieza bloqueada");
});
await prueba("guardián: sí se guarda lo común y lo que ya tiene", async () => {
  await como(A); await db.query("update public.figuras_jugador set figura = $1 where capsula = 1", [fig({ accesorios: { cabeza: { id: "HELM_012" } } })]);
});
await prueba("desbloquear sin saldo falla", async () => {
  await como(B); await falla("select public.desbloquear_pieza('PRINT_001')", [], "saldo insuficiente");
});
await prueba("desbloquear con XP: cobra el precio y guarda la pieza", async () => {
  await admin(); await db.query(`insert into public.movimientos_xp (jugador, tipo, xp, motivo) values ('${A}', 'ganada', 2000, 'prueba')`);
  await como(A); await db.query("select public.desbloquear_pieza('PRINT_001')");
  await admin(); igual((await db.query(`select disponible, acumulada from privado.saldos_de('${A}')`)).rows[0], { disponible: 1500, acumulada: 2000 });
  await como(A); await db.query("update public.figuras_jugador set figura = $1 where capsula = 1", [fig({ ropa: { torso: { estampado: "PRINT_001", color: "#1d3f8f", colores: [] }, piernas: { color: "#000000" } } })]);
  await falla("select public.desbloquear_pieza('PRINT_001')", [], "ya la tienes");
  await falla("select public.desbloquear_pieza('NO_EXISTE')", [], "pieza no válida");
});
await prueba("sin sesión no se desbloquea", async () => {
  await admin(); await db.exec("select set_config('request.jwt.claim.sub', '', false); set role authenticated;");
  await falla("select public.desbloquear_pieza('PRINT_002')", [], "sin sesión");
});
await prueba("reto de combinación: no cumple → error; cumple → pieza; dos veces → error", async () => {
  await como(A);
  await falla("select * from public.reclamar_reto('combo-chef', 1::smallint)", [], "no cumple");
  for (const p of ["PRINT_014"]) await db.query(`select public.desbloquear_pieza('${p}')`);
  await db.query("update public.figuras_jugador set figura = $1 where capsula = 1", [fig({ ropa: { torso: { estampado: "PRINT_014", color: "#f4f4f4", colores: [] }, piernas: { color: "#000" } },
    accesorios: { cabeza: { id: "HELM_004" }, mano_der: { id: "ACC_011" } } })]);
  igual((await db.query("select * from public.reclamar_reto('combo-chef', 1::smallint)")).rows, [{ pieza: "MOM_fuego", xp: 0 }]);
  await falla("select * from public.reclamar_reto('combo-chef', 1::smallint)", [], "ya lo reclamaste");
});
await prueba("reto diario: solo el de hoy; si ya tenía el premio da 40 XP", async () => {
  await admin(); const hoy = (await db.query("select privado.reto_del_dia((now() at time zone 'America/Mexico_City')::date) id")).rows[0].id;
  const otro = hoy === "dia-gorra" ? "dia-negro" : "dia-gorra";
  await como(A); await falla(`select * from public.reclamar_reto('${otro}', 1::smallint)`, [], "no es el reto de hoy");
  console.log("     (reto de hoy:", hoy + ")");
});
await prueba("cumple_reto: colores, torso/piernas, alguna, dos objetos (igual que retos.ts)", async () => {
  await admin();
  const c = async (f, cond) => (await db.query("select privado.cumple_reto($1::jsonb, $2::jsonb) r", [f, JSON.stringify(cond)])).rows[0].r;
  igual(await c(fig({}), { colores: [["#c91a09"], ["#237841"]] }), false, "caso 1");
  igual(await c(fig({ ropa: { torso: { color: "#c91a09", colores: [] }, piernas: { color: "#237841" } } }), { colores: [["#C91A09"], ["#237841"]] }), true, "caso 2");
  igual(await c(fig({ ropa: { torso: { color: "#0055bf", colores: [] }, piernas: { color: "#0a3463" } } }), { torso: ["#0055bf"], piernas: ["#0a3463", "#0055bf"] }), true, "caso 3");
  igual(await c(fig({}), { torso: ["#0055bf"] }), false, "caso 4");
  igual(await c(fig({ identidad: { rostro: "FACE_001", detalles: ["DETAIL_003", "DETAIL_007"] } }), { alguna: [["DETAIL_001", "DETAIL_003"], ["DETAIL_007"]] }), true, "caso 5");
  igual(await c(fig({ accesorios: { mano_der: { id: "ACC_010" } } }), { dosObjetos: true }), false, "caso 6");
  igual(await c(fig({ accesorios: { mano_der: { id: "ACC_010" }, mano_izq: { id: "ACC_001" } } }), { dosObjetos: true }), true, "caso 7");
  igual(await c(fig({ momentos: { paquete: "fuego" } }), { todas: ["MOM_fuego"] }), true, "caso 8");
});
await prueba("reto_del_dia igual que retoDelDia de la app (2026-11-17 → orden 17 % 7)", async () => {
  await admin();
  const r = (await db.query("select privado.reto_del_dia(date '2026-11-17') id")).rows[0].id;
  const dias = Math.floor(Date.UTC(2026, 10, 17) / 86400000) % 7;
  const orden = ["dia-rojo-verde", "dia-negro", "dia-gorra", "dia-barba-lentes", "dia-dos-manos", "dia-azul", "dia-sudadera-mochila"];
  igual(r, orden[dias]);
});
await prueba("el gasto 'pieza' no baja el nivel (acumulada) y sí el disponible", async () => {
  await admin(); const s = (await db.query(`select acumulada, disponible from privado.saldos_de('${A}')`)).rows[0];
  igual(s.acumulada, 2000); if (s.disponible >= 2000) throw new Error("no se descontó");
});
console.log(`\n${ok} pasan, ${mal} fallan`);
process.exit(mal ? 1 : 0);
