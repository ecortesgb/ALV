// Prueba LOCAL de la 046 (corte de figuras a v3) y de su reversión en PGlite (Postgres en WASM). No toca la base remota.
// Uso: en una carpeta temporal FUERA del proyecto con @electric-sql/pglite instalado:
//      node <repo>/supabase/pruebas/046_local_pglite.mjs <repo>/supabase
// Aplica stubs mínimos (perfiles, movimientos_xp, saldos, comparten_evento, sobres) y luego 015, 016, 033 y 037 reales;
// siembra figuras v2, aplica pendientes/046_figuras_v3_NO_APLICAR.sql, prueba, y aplica la reversión.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const req = createRequire(join(process.cwd(), "x.js"));
let mod;
try { mod = req.resolve("@electric-sql/pglite"); } catch { mod = join(process.cwd(), "node_modules/@electric-sql/pglite/dist/index.js"); }
const { PGlite } = await import(pathToFileURL(mod).href);
const RAIZ = process.argv[2];
const db = new PGlite();
let ok = 0, mal = 0;
const prueba = async (nombre, fn) => { try { await fn(); ok++; console.log("  ✓", nombre); } catch (e) { mal++; console.log("  ✗", nombre, "→", e.message); } };
const igual = (a, b, m = "") => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} esperaba ${JSON.stringify(b)} y fue ${JSON.stringify(a)}`); };
const falla = async (sql, params, texto) => { try { await db.query(sql, params); } catch (e) { if (!e.message.includes(texto)) throw new Error("otro error: " + e.message); return; } throw new Error("no falló: " + texto); };
const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b", C = "00000000-0000-0000-0000-00000000000c";
const como = async uid => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`); };
const anon = async () => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`); };
const admin = async () => { await db.exec("reset role;"); };
const uno = async (sql, p = []) => (await db.query(sql, p)).rows[0];
const filas = async (sql, p = []) => (await db.query(sql, p)).rows;
const aplicar = async f => { console.log("Aplicando", f); await db.exec(readFileSync(join(RAIZ, f), "utf8")); };

const v3 = (extra = {}) => ({ version: 3, familia: "minifig", origen: { tipo: "catalogo", personaje: "iron-man", version: "base", revision: 1 }, piezas: {},
  momentos: { paquete: null, espera: "respirar", victoria: "salto-puno", derrota: "cabeza-baja", punto: "puno-arriba" }, extensiones: {}, ...extra });
const poner = (uid, capsula, figura) => db.query("insert into public.figuras_jugador (jugador, capsula, nombre, figura) values ($1, $2, 'x', $3)", [uid, capsula, JSON.stringify(figura)]);

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
language sql stable security definer set search_path = '' as $$ select 0, 1000, 0, null::uuid $$;
-- B y A comparten sala; C no comparte con nadie.
create function privado.comparten_evento(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) in ('${A}'::uuid, '${B}'::uuid) and p in ('${A}'::uuid, '${B}'::uuid) $$;
grant usage on schema privado to authenticated;
grant execute on function privado.comparten_evento(uuid) to authenticated;
create table public.sobres_tienda (id text primary key, piezas int not null default 0, activo boolean not null default true);
insert into public.perfiles values ('${A}'), ('${B}'), ('${C}');
`);
for (const f of ["migrations/015_figuras_jugador.sql", "migrations/016_figuras_upsert.sql", "migrations/033_piezas_rareza_y_retos.sql", "migrations/037_piezas_libres.sql"]) await aplicar(f);

// Estado de producción simulado: figuras v2 (A con dos cápsulas, la 2 activa; B con una).
await admin();
await db.query(`insert into public.figuras_jugador (jugador, capsula, nombre, figura, activa) values
  ($1, 1, 'Uno', '{"version":2,"cabello":"a"}', false), ($1, 2, 'Dos', '{"version":2,"cabello":"b"}', true), ($2, 1, 'Beto', '{"version":2}', true)`, [A, B]);
const retosAntes = (await filas("select id from public.retos_figura where activo order by id")).map(r => r.id);
const v2Antes = await filas("select jugador, capsula, nombre, figura, activa from public.figuras_jugador order by jugador, capsula");

console.log("Antes del corte:");
await prueba("la tabla de hoy rechaza v3 (CHECK version = 2)", async () => { await como(C); await falla("insert into public.figuras_jugador (jugador, capsula, figura) values ($1, 1, $2)", [C, JSON.stringify(v3())], "figuras_jugador_figura_check"); });

await admin();
await aplicar("pendientes/046_figuras_v3_NO_APLICAR.sql");

console.log("Después del corte:");
await prueba("respaldo dentro de la base con las 3 figuras v2 y su activa; tabla vacía", async () => {
  await admin();
  igual(await filas("select jugador, capsula, nombre, figura, activa from privado.figuras_jugador_v2 order by jugador, capsula"), v2Antes);
  igual((await uno("select count(*)::int n from public.figuras_jugador")).n, 0);
});
await prueba("retos de figura desactivados y anotados", async () => {
  await admin();
  igual((await uno("select count(*)::int n from public.retos_figura where activo")).n, 0);
  igual((await filas("select id from privado.retos_figura_corte_v3 order by id")).map(r => r.id), retosAntes);
  if (!retosAntes.length) throw new Error("no había retos activos que probar");
});
await prueba("una v2 ya no entra", async () => { await como(A); await falla("insert into public.figuras_jugador (jugador, capsula, figura) values ($1, 1, '{\"version\":2}')", [A], "figuras_jugador_figura_v3"); });
await prueba("una v3 del catálogo y una «creada» sí entran (RLS: cada quien la suya)", async () => {
  await como(A); await poner(A, 1, v3()); await poner(A, 2, v3({ origen: { tipo: "creado" } }));
  igual((await uno("select count(*)::int n from public.figuras_jugador where jugador = $1", [A])).n, 2);
});
const rotas = {
  "sin familia": (() => { const f = v3(); delete f.familia; return f; })(),
  "sin momentos": (() => { const f = v3(); delete f.momentos; return f; })(),
  "sin extensiones": (() => { const f = v3(); delete f.extensiones; return f; })(),
  "version en texto": v3({ version: "3" }),
  "familia con ../": v3({ familia: "../x" }),
  "catálogo sin personaje": v3({ origen: { tipo: "catalogo", version: "base", revision: 1 } }),
  "revisión en texto": v3({ origen: { tipo: "catalogo", personaje: "iron-man", version: "base", revision: "1" } }),
  "revisión con decimales": v3({ origen: { tipo: "catalogo", personaje: "iron-man", version: "base", revision: 1.5 } }),
  "origen desconocido": v3({ origen: { tipo: "otro" } }),
  "piezas como lista": v3({ piezas: [] }),
  "más de 8 KB": v3({ extensiones: { relleno: "x".repeat(9000) } }),
};
for (const [nombre, f] of Object.entries(rotas)) {
  await prueba(`v3 rota no entra: ${nombre}`, async () => { await como(C); await falla("insert into public.figuras_jugador (jugador, capsula, figura) values ($1, 3, $2)", [C, JSON.stringify(f)], "figuras_jugador_figura_v3"); });
}
await prueba("RLS: B no escribe por A; C no ve las de A; B (comparte sala) sí; anon nada", async () => {
  await como(B); await falla("insert into public.figuras_jugador (jugador, capsula, figura) values ($1, 3, $2)", [A, JSON.stringify(v3())], "row-level security");
  await como(C); igual((await uno("select count(*)::int n from public.figuras_jugador where jugador = $1", [A])).n, 0);
  await como(B); igual((await uno("select count(*)::int n from public.figuras_jugador where jugador = $1", [A])).n, 2);
  await anon(); await falla("select * from public.figuras_jugador", [], "permission denied");
});
await prueba("activar_capsula sigue igual (y no activa una vacía)", async () => {
  await como(A); await db.query("select public.activar_capsula(2::smallint)");
  igual((await filas("select capsula from public.figuras_jugador where jugador = $1 and activa", [A])).map(r => r.capsula), [2]);
  await falla("select public.activar_capsula(3::smallint)", [], "esa cápsula está vacía");
});
await prueba("retos: reclamar responde «reto no válido»", async () => {
  await como(A); await falla("select * from public.reclamar_reto($1, 1::smallint)", [retosAntes[0]], "reto no válido");
});
await prueba("el guardián v2 no mira figuras v3 (aunque traigan un «id» de pieza bloqueada activa)", async () => {
  await admin(); const p = (await uno("select id from public.piezas_figura limit 1")).id;
  await db.query("update public.piezas_figura set activo = true where id = $1", [p]);
  await como(C); await poner(C, 1, v3({ extensiones: { alv: { x: { id: p } } } }));
  await admin(); await db.query("update public.piezas_figura set activo = false where id = $1", [p]);
});
await prueba("los respaldos de privado no se leen desde la app", async () => {
  await como(A); await falla("select * from privado.figuras_jugador_v2", [], "permission denied");
  await anon(); await falla("select * from privado.retos_figura_corte_v3", [], "permission denied");
});

await admin();
const v3Antes = (await uno("select count(*)::int n from public.figuras_jugador")).n;
await aplicar("pendientes/046_figuras_v3_reversion.sql");

console.log("Después de la reversión:");
await prueba("las v3 quedan retiradas en privado y las v2 vuelven con su activa", async () => {
  await admin();
  igual((await uno("select count(*)::int n from privado.figuras_jugador_v3_retiradas")).n, v3Antes);
  igual(await filas("select jugador, capsula, nombre, figura, activa from public.figuras_jugador order by jugador, capsula"), v2Antes);
});
await prueba("vuelve el CHECK v2: v3 no entra, v2 sí (caché local vieja con v3 no puede subir)", async () => {
  await como(C); await falla("insert into public.figuras_jugador (jugador, capsula, figura) values ($1, 1, $2)", [C, JSON.stringify(v3())], "figuras_jugador_figura_check");
  await poner(C, 1, { version: 2 });
});
await prueba("los retos que estaban activos vuelven a estarlo", async () => {
  await admin(); igual((await filas("select id from public.retos_figura where activo order by id")).map(r => r.id), retosAntes);
});
await prueba("vuelve el guardián de la 033 (bloquea una pieza activa que no tienes)", async () => {
  await admin(); const p = (await uno("select id from public.piezas_figura limit 1")).id;
  await db.query("update public.piezas_figura set activo = true where id = $1", [p]);
  await como(B); await falla("update public.figuras_jugador set figura = $2 where jugador = $1 and capsula = 1", [B, JSON.stringify({ version: 2, x: { id: p } })], "pieza bloqueada");
  await admin(); await db.query("update public.piezas_figura set activo = false where id = $1", [p]);
});
await prueba("se reabren las escrituras (permisos de la 015 y 016)", async () => {
  await como(B); await poner(B, 2, { version: 2 }); await db.query("update public.figuras_jugador set nombre = 'n' where jugador = $1 and capsula = 2", [B]);
  await db.query("delete from public.figuras_jugador where jugador = $1 and capsula = 2", [B]);
});

console.log(`\n${ok} pasan, ${mal} fallan`);
process.exit(mal ? 1 : 0);
