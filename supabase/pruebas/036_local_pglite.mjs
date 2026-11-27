// Prueba LOCAL de la migración 036 (tienda) en PGlite (Postgres en WASM). No toca la base remota.
// Uso: en una carpeta temporal FUERA del proyecto: npm i @electric-sql/pglite@0.2.17
//      y desde esa carpeta: node <repo>/supabase/pruebas/036_local_pglite.mjs <repo>/supabase/migrations
// Resultado 2026-11-19: 18 pasan, 0 fallan.
// Aplica stubs mínimos de 001–020 (perfiles, eventos, partidas, administradores, tienda vieja), luego 033, 034 y 036.
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

console.log("Pruebas:");
await prueba("catálogo: 5 sobres y 2 comodines a la venta", async () => {
  await como(A);
  igual((await db.query("select id, precio from public.sobres_tienda order by precio")).rows.map(r => [r.id, r.precio]), [["basico", 50], ["accesorios", 120], ["comodines", 150], ["mixto", 180], ["epico", 200]]);
  igual((await db.query("select id from public.comodines_tienda order by id")).rows.map(r => r.id), ["cambio", "turno"]);
});
await prueba("bienvenida: 150 monedas una sola vez", async () => {
  await como(A); igual(await monedas(), 150); igual(await monedas(), 150);
});
await prueba("sin monedas no abre (B nunca entró a la tienda)", async () => {
  await como(B); await falla("select public.abrir_sobre('basico', $1)", [pedido()], "saldo insuficiente");
});
await prueba("abrir básico: cobra 50, da 2 piezas nuevas con origen «sobre» y sube la racha", async () => {
  await como(A);
  const r = await abrir("basico");
  igual(r.cartas.length, 2); igual(r.monedas, 100); igual(await monedas(), 100);
  cierto(r.cartas.every(c => c.tipo === "pieza"), "no son piezas");
  await admin();
  igual((await uno(`select count(*)::int n from public.piezas_jugador where jugador = '${A}' and origen = 'sobre'`)).n, 2);
  const racha = await uno(`select sin_epica, sin_legendaria from public.rachas_sobres where jugador = '${A}'`);
  igual(racha.sin_epica, r.cartas.some(c => c.rareza !== "rara") ? 0 : 1);
  igual(r.racha.sinEpica, racha.sin_epica);
});
await prueba("reintento con el mismo pedido: devuelve lo mismo y no cobra", async () => {
  await como(A); const p = pedido();
  const r1 = await abrir("basico", p), r2 = await abrir("basico", p);
  igual(r2.cartas, r1.cartas); igual(r2.repetido, true); igual(await monedas(), 50);
});
await prueba("la mejor carta va al final y marca la luz", async () => {
  await admin(); await db.query(`insert into public.movimientos_monedas (jugador, cantidad, motivo) values ('${A}', 400, 'prueba')`);
  await como(A); const r = await abrir("epico");
  const ult = r.cartas.at(-1); igual(r.mejor, ult.rareza);
  cierto(r.cartas.some(c => c.rareza !== "rara"), "el épico no trajo épica");
});
await prueba("garantía: a los 8 sin épica, sale épica o mejor y la racha vuelve a 0", async () => {
  await admin(); await db.query(`update public.rachas_sobres set sin_epica = 7 where jugador = '${A}'`);
  await como(A); const r = await abrir("basico");
  cierto(r.cartas.some(c => c.rareza !== "rara"), "no salió épica"); igual(r.racha.sinEpica, 0);
});
await prueba("garantía: a los 25 sin legendaria, sale legendaria", async () => {
  await admin(); await db.query(`update public.rachas_sobres set sin_legendaria = 24 where jugador = '${A}'`);
  await como(A); const r = await abrir("basico");
  cierto(r.cartas.some(c => c.rareza === "legendaria"), "no salió legendaria"); igual(r.racha.sinLegendaria, 0);
});
await prueba("accesorios solo trae cascos, detalles, cuello y objetos", async () => {
  await admin(); await db.query(`insert into public.movimientos_monedas (jugador, cantidad, motivo) values ('${C}', 1000, 'prueba')`);
  await como(C);
  for (let i = 0; i < 4; i++) {
    const r = await abrir("accesorios");
    for (const c of r.cartas) cierto(/^(HELM_|FACE_01[2-5]|DETAIL_|NECK_|CAPE_|ACC_)/.test(c.id), "pieza fuera de sección: " + c.id);
  }
});
await prueba("comodines: 3 por sobre; con 9 de cada uno se cambian por 10 monedas", async () => {
  await como(C); const antes = await monedas();
  const r = await abrir("comodines");
  igual(r.cartas.filter(c => c.tipo === "comodin").length, 3);
  await admin(); igual((await uno(`select sum(cantidad)::int n from public.comodines_jugador where jugador = '${C}'`)).n, 3);
  await db.query(`insert into public.comodines_jugador values ('${C}', 'turno', 9), ('${C}', 'cambio', 9) on conflict (jugador, comodin) do update set cantidad = 9`);
  await como(C); const r2 = await abrir("comodines");
  cierto(r2.cartas.every(c => c.tipo === "monedas" && c.cantidad === 10), "no se cambiaron por monedas");
  igual(await monedas(), antes - 150 - 150 + 30);
});
await prueba("nunca repite: con básicos se completa la colección y luego «ya tienes todo»", async () => {
  await admin(); await db.query(`insert into public.movimientos_monedas (jugador, cantidad, motivo) values ('${D}', 5000, 'prueba')`);
  await como(D); let vueltas = 0;
  for (;;) { try { await abrir("basico"); vueltas++; } catch (e) { cierto(e.message.includes("ya tienes todo"), e.message); break; } if (vueltas > 60) throw new Error("no termina"); }
  await admin();
  const t = await uno(`select count(*)::int n, count(distinct pieza)::int d from public.piezas_jugador where jugador = '${D}'`);
  igual([t.n, t.d], [70, 70]);
  await como(D); const r = await abrir("comodines"); igual(r.cartas.length, 3); // el de comodines sí se vende
});
await prueba("monedas por juego en sala: 10 + 8/5 por lugar con 4 jugadores", async () => {
  await como(A);
  const antes = {}; for (const u of [B, C, D]) { await admin(); antes[u] = (await uno(`select privado.monedas_de('${u}') m`)).m; }
  await como(A);
  await db.query("select public.terminar_partida_sala($1, 'impostor', 4, $2)", [P1, JSON.stringify([
    { jugador: B, rondas: 3, retos: 0, lugar: 1 }, { jugador: C, rondas: 3, retos: 0, lugar: 2 }, { jugador: D, rondas: 3, retos: 0, lugar: 3 }])]);
  await admin();
  const ahora = {}; for (const u of [B, C, D]) ahora[u] = (await uno(`select privado.monedas_de('${u}') m`)).m;
  igual([ahora[B] - antes[B], ahora[C] - antes[C], ahora[D] - antes[D]], [18, 15, 10]);
});
await prueba("tope de 300 monedas al día por juegos", async () => {
  await admin();
  for (let i = 0; i < 20; i++) await db.query(`select privado.dar_monedas_partida('${B}', 1, 4, null, 'impostor')`);
  igual((await uno(`select sum(cantidad)::int n from public.movimientos_monedas where jugador = '${B}' and motivo like 'partida:%'`)).n, 300);
});
await prueba("un solo aparato (registrar_partida) también da monedas", async () => {
  await admin(); const antes = (await uno(`select privado.monedas_de('${A}') m`)).m;
  await como(A); await db.query("select public.registrar_partida('impostor', 2, 0, 1, 2)");
  await admin(); igual((await uno(`select privado.monedas_de('${A}') m`)).m - antes, 18);
});
await prueba("RLS: B no ve monedas, aperturas ni comodines de otros y no puede escribirlas", async () => {
  await como(B);
  igual((await uno(`select count(*)::int n from public.movimientos_monedas where jugador <> '${B}'`)).n, 0);
  igual((await uno(`select count(*)::int n from public.aperturas where jugador <> '${B}'`)).n, 0);
  igual((await uno(`select count(*)::int n from public.comodines_jugador where jugador <> '${B}'`)).n, 0);
  await falla(`insert into public.movimientos_monedas (jugador, cantidad, motivo) values ('${B}', 9999, 'trampa')`, [], "permission denied");
  await falla(`insert into public.comodines_jugador values ('${B}', 'turno', 9)`, [], "permission denied");
  await falla(`update public.rachas_sobres set sin_epica = 7`, [], "permission denied");
  await falla("select privado.dar_monedas_partida($1, 1, 4, null, 'impostor')", [B], "permission denied");
});
await prueba("admin_dar_monedas: solo administradores", async () => {
  await como(B); await falla("select public.admin_dar_monedas($1, 500)", [B], "sin permiso");
  await como(A); const r = await uno("select public.admin_dar_monedas($1, 25) m", [B]); cierto(r.m > 0, "no dio");
});
await prueba("anónimo no abre sobres ni ve el estado", async () => {
  await anon();
  await falla("select public.abrir_sobre('basico', $1)", [pedido()], "permission denied");
  await falla("select * from public.estado_tienda()", [], "permission denied");
});
await prueba("la tienda vieja quedó apagada", async () => {
  await como(A); await falla("select public.comprar_sobre('bronce')", [], "permission denied");
});

console.log(`\n${ok} pasan, ${mal} fallan`);
if (process.argv.includes("--reposicion")) {
  await admin();
  await db.exec(readFileSync(join(MIG, "050_reposicion_comodines.sql"), "utf8"));
  const reponer = async (carta, ped = pedido()) => (await uno("select public.reponer_comodin($1, $2) r", [carta, ped])).r;

  await prueba("050: descubre en sobre, conserva el cero y repone sin duplicar el cobro", async () => {
    await admin();
    await db.query("delete from public.comodines_jugador where jugador = $1 and comodin = 'turno'", [B]);
    await db.query("insert into public.movimientos_monedas(jugador,cantidad,motivo) values ($1,300,'prueba-reposicion')", [B]);
    await como(B);
    await falla("select public.reponer_comodin($1,$2)", ["turno", pedido()], "descubre");
    await admin();
    await db.query("insert into public.comodines_jugador values ($1,'turno',0)", [B]);
    await como(B);
    const saldo = await monedas(), id = pedido();
    igual(await reponer("turno", id), { monedas: saldo - 65, cantidad: 1 });
    igual(await reponer("turno", id), { monedas: saldo - 65, cantidad: 1 });
    await falla("select public.reponer_comodin($1,$2)", ["turno", pedido()], "copias");
    await falla("select public.reponer_comodin($1,$2)", ["cambio", id], "pedido inválido");
    igual(await monedas(), saldo - 65);
  });

  await prueba("050: anónimo sin permiso y precio de Cambio distinto", async () => {
    await anon();
    await falla("select public.reponer_comodin($1,$2)", ["cambio", pedido()], "permission denied");
    await como(B);
    igual((await uno("select precio_reposicion from public.comodines_tienda where id = 'cambio'")).precio_reposicion, 75);
  });
}

if (process.argv.includes("--personajes")) {
  await admin();
  await db.exec(`create function public.puedo_ver_personajes() returns boolean
    language sql stable as $$ select auth.uid() in ('${A}', '${B}') $$;`);
  await db.exec(readFileSync(join(MIG, "051_tienda_personajes.sql"), "utf8"));
  const comprarPj = async (modo, objetivo, precio, id = pedido()) =>
    (await uno("select public.comprar_personajes($1,$2,$3,$4) r", [modo, objetivo, precio, id])).r;
  const estadoPj = async () => (await uno("select public.estado_personajes_tienda() r")).r;

  await prueba("051: solo sortea personajes de la saga, sin duplicados y cobra una vez", async () => {
    await admin();
    await db.query("insert into public.movimientos_monedas(jugador,cantidad,motivo) values ($1,1800,'prueba-personajes')", [A]);
    await como(A);
    const saldo = await monedas(), id = pedido();
    const { catalogo } = await estadoPj();
    const idsDc = new Set(catalogo.filter(x => x.saga === "dc").map(x => x.id));
    const primero = await comprarPj("sobre", "dc", 240, id);
    igual(primero.monedas, saldo - 240);
    igual(new Set(primero.cartas.map(x => x.id)).size, 3);
    cierto(primero.cartas.every(c => idsDc.has(c.id)), "todos de DC");
    igual(await comprarPj("sobre", "dc", 240, id), primero);
    const segundo = await comprarPj("sobre", "dc", 240);
    cierto(segundo.cartas.every(c => !primero.cartas.some(x => x.id === c.id)), "ninguna carta repetida");
  });

  await prueba("051: el precio directo distingue legendarios y Bigfig", async () => {
    await como(A);
    const saldo = await monedas();
    await falla("select public.comprar_personajes($1,$2,$3,$4)", ["carta","hulkbuster",520,pedido()], "precio cambió");
    const compra = await comprarPj("carta", "hulkbuster", 560);
    igual(compra.cartas, [{ id: "hulkbuster", tipo: "personaje", rareza: "legendaria" }]);
    igual(compra.monedas, saldo - 560);
    await falla("select public.comprar_personajes($1,$2,$3,$4)", ["carta","hulkbuster",560,pedido()], "disponibles");
  });

  await prueba("051: saga con una carta cobra 80, inventario por cuenta y acceso registrado", async () => {
    await admin();
    await db.query("insert into public.movimientos_monedas(jugador,cantidad,motivo) values ($1,300,'prueba-personajes')", [B]);
    await como(B);
    igual((await estadoPj()).personajes, []);
    await falla("select public.comprar_personajes($1,$2,$3,$4)", ["sobre","harry-potter",240,pedido()], "precio cambió");
    igual((await comprarPj("sobre", "harry-potter", 80)).cartas.map(c => c.id), ["voldemort"]);
    await como(C);
    igual(await estadoPj(), null);
    await falla("select public.comprar_personajes($1,$2,$3,$4)", ["sobre","marvel",240,pedido()], "sin acceso");
  });
}

if (process.argv.includes("--premios")) {
  // Requiere --reposicion y --personajes antes (050 y 051).
  await admin();
  await db.exec(`create function public.nivel_por_xp(p_xp int) returns int language plpgsql immutable set search_path = '' as $$
    declare n int := 1; resto int := greatest(p_xp, 0);
    begin while resto >= 100 + 20 * (n - 1) loop resto := resto - (100 + 20 * (n - 1)); n := n + 1; end loop; return n; end $$;`);
  const fig = pj => JSON.stringify({ version: 2, extensiones: { v3: { origen: { tipo: "catalogo", personaje: pj, version: "base", revision: 1 } } } });
  await db.query("delete from public.figuras_jugador where jugador in ($1,$2,$3)", [A, B, C]);
  await db.query("insert into public.figuras_jugador (jugador, capsula, figura, activa) values ($1,1,$2,true),($1,2,$3,false),($1,3,$4,false),($5,1,$6,true),($7,1,$8,true)",
    [A, fig("wolverine"), fig("ciclope"), fig("tormenta"), C, fig("thanos"), B, fig("hulkbuster")]);
  await db.exec(readFileSync(join(MIG, "052_comodines_y_premios_personajes.sql"), "utf8"));
  const premios = async () => (await db.query("select * from public.reclamar_premios_nivel()")).rows;
  const xp = async (j, n) => { await admin(); await db.query("insert into public.movimientos_xp (jugador, tipo, xp, motivo) values ($1,'ganada',$2,'prueba')", [j, n]); };

  await prueba("052: los 18 comodines a la venta con precio de reposición", async () => {
    await como(A);
    const filas = (await db.query("select id, precio_reposicion from public.comodines_tienda")).rows;
    igual(filas.length, 18);
    cierto(filas.every(f => f.precio_reposicion > 50), "todos con precio");
  });

  await prueba("052: el sobre de comodines ya saca de los 18", async () => {
    await admin();
    await db.query("insert into public.movimientos_monedas(jugador,cantidad,motivo) values ($1,6000,'prueba')", [D]);
    await db.query("delete from public.comodines_jugador where jugador = $1", [D]);
    await como(D);
    const vistos = new Set();
    for (let i = 0; i < 30; i++) for (const c of (await abrir("comodines")).cartas) if (c.tipo === "comodin") vistos.add(c.id);
    cierto(vistos.size > 2, "salieron " + [...vistos].join(","));
  });

  await prueba("052: quien ya usaba un personaje en venta lo conserva (regalo)", async () => {
    await admin();
    igual((await db.query("select jugador, personaje, origen from privado.personajes_comprados where origen = 'regalo' order by personaje")).rows
      .map(r => [r.jugador, r.personaje]), [[B, "hulkbuster"], [C, "thanos"]]);
  });

  await prueba("052: premios por nivel, uno por nivel, sin repetir y sin cobrar", async () => {
    await xp(A, 100 + 120 + 140 + 160); // nivel 5
    await como(A);
    const saldo = await monedas();
    const r = await premios();
    igual(r.map(x => x.nivel), [2, 3, 4, 5]);
    igual(new Set(r.map(x => x.personaje)).size, 4);
    igual(await premios(), []);
    igual(await monedas(), saldo);
    const dueño = (await db.query("select public.estado_personajes_tienda() e")).rows[0].e.personajes;
    cierto(r.every(x => dueño.includes(x.personaje)), "quedan en su álbum");
  });

  await prueba("052: la mayoría sale del grupo que más usa (X-Men)", async () => {
    await admin();
    await db.exec("select setseed(0.42)");
    await xp(A, 180 + 200 + 220 + 240 + 260 + 280 + 300 + 320 + 340); // nivel 14
    await como(A);
    await premios();
    await admin();
    const ya = (await db.query("select g.grupo from privado.premios_nivel p join privado.grupo_personaje g on g.id = p.personaje where p.jugador = $1", [A])).rows;
    const xmen = ya.filter(x => x.grupo === "x-men").length;
    igual(ya.length, 13);
    cierto(xmen >= 6, `X-Men ${xmen} de 13`);
    console.log("    X-Men:", xmen, "de 13");
  });

  await prueba("052: sin acceso a personajes o sin sesión no hay premios", async () => {
    await xp(C, 1000);
    await como(C);
    igual(await premios(), []);
    await anon();
    await falla("select * from public.reclamar_premios_nivel()", [], "permission denied");
    await como(B);
    await falla("select * from privado.premios_nivel", [], "permission denied");
  });
}

process.exit(mal ? 1 : 0);
