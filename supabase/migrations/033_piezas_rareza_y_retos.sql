-- 033 · Piezas del personalizador con rareza: se desbloquean con XP o con retos (Maestro v1.42, decisión de Elías 2026-11-17).
-- APLICADA 2026-11-18 con autorización de Elías. Antes se probó en la base remota en transacción deshecha con usuarios
-- simulados (supabase/pruebas/033_remota_prueba.sql, sin fallas) y el asesor solo sumó los 2 avisos esperados de RPC.
-- 1) public.piezas_figura: piezas bloqueables (las comunes no están: son libres). Lo lee cualquier cuenta.
-- 2) public.piezas_jugador: lo que cada jugador tiene. Cada quien lee lo suyo; solo escriben las funciones de abajo.
-- 3) public.retos_figura / public.retos_jugador: retos (uno diario que rota y de combinación) y quién los reclamó.
-- 4) movimientos_xp: nuevo tipo 'pieza' (gasto de XP; no baja el nivel).
-- 5) desbloquear_pieza(p_pieza) y reclamar_reto(p_reto, p_capsula): el servidor valida sesión, saldo, figura y reto.
-- 6) Guardián en figuras_jugador: no se guarda una figura con piezas bloqueadas que el jugador no tiene.
-- 7) Regalo: cada jugador se queda con las piezas que ya usan sus figuras guardadas (nadie pierde nada).
-- El catálogo y los retos salen de src/content/rarezas.ts con `node tools/generar-piezas-sql.mjs` (bloque «generado»);
-- src/app/retos.test.ts y supabase/pruebas/033_coincide.test.ts comprueban que coincidan.

-- 1) Catálogo de piezas bloqueables
create table public.piezas_figura (
  id      text primary key check (id ~ '^[A-Z]+_[A-Za-z0-9_]+$' and char_length(id) <= 40),
  rareza  text not null check (rareza in ('rara', 'epica', 'legendaria')),
  precio  int  not null check (precio between 1 and 100000),
  activo  boolean not null default true
);
alter table public.piezas_figura enable row level security;
revoke all on public.piezas_figura from public, anon, authenticated;
grant select on public.piezas_figura to authenticated;
create policy piezas_figura_leer on public.piezas_figura for select to authenticated using (true);

-- 2) Lo que cada jugador tiene
create table public.piezas_jugador (
  jugador uuid not null references public.perfiles (id) on delete cascade,
  pieza   text not null references public.piezas_figura (id) on delete cascade,
  origen  text not null check (origen in ('xp', 'reto', 'regalo')),
  creado  timestamptz not null default now(),
  primary key (jugador, pieza)
);
alter table public.piezas_jugador enable row level security;
revoke all on public.piezas_jugador from public, anon, authenticated;
grant select on public.piezas_jugador to authenticated;
create policy piezas_jugador_leer on public.piezas_jugador for select to authenticated using (jugador = (select auth.uid()));

-- 3) Retos
create table public.retos_figura (
  id        text primary key check (id ~ '^[a-z0-9-]+$' and char_length(id) <= 40),
  tipo      text not null check (tipo in ('diario', 'combinacion')),
  orden     int  not null check (orden >= 0),
  nombre    text not null check (char_length(nombre) between 1 and 40),
  condicion jsonb not null check (jsonb_typeof(condicion) = 'object'),
  premio    text not null references public.piezas_figura (id),
  activo    boolean not null default true
);
alter table public.retos_figura enable row level security;
revoke all on public.retos_figura from public, anon, authenticated;
grant select on public.retos_figura to authenticated;
create policy retos_figura_leer on public.retos_figura for select to authenticated using (true);

create table public.retos_jugador (
  jugador uuid not null references public.perfiles (id) on delete cascade,
  reto    text not null references public.retos_figura (id) on delete cascade,
  dia     date not null,            -- combinación: siempre 2000-01-01 (una sola vez)
  premio  text,                     -- la pieza que ganó; null si ya la tenía y recibió XP
  xp      int  not null default 0 check (xp >= 0),
  creado  timestamptz not null default now(),
  primary key (jugador, reto, dia)
);
alter table public.retos_jugador enable row level security;
revoke all on public.retos_jugador from public, anon, authenticated;
grant select on public.retos_jugador to authenticated;
create policy retos_jugador_leer on public.retos_jugador for select to authenticated using (jugador = (select auth.uid()));

-- >>> generado (no editar a mano: node tools/generar-piezas-sql.mjs)
insert into public.piezas_figura (id, rareza, precio) values
  ('ACC_002', 'rara', 100),
  ('ACC_003', 'rara', 100),
  ('ACC_004', 'legendaria', 500),
  ('ACC_005', 'epica', 250),
  ('ACC_006', 'epica', 250),
  ('ACC_007', 'rara', 100),
  ('ACC_008', 'rara', 100),
  ('ACC_012', 'rara', 100),
  ('CAPE_001', 'rara', 100),
  ('DETAIL_004', 'rara', 100),
  ('DETAIL_010', 'rara', 100),
  ('FACE_007', 'rara', 100),
  ('FACE_009', 'rara', 100),
  ('FACE_012', 'legendaria', 500),
  ('FACE_013', 'legendaria', 500),
  ('FACE_014', 'legendaria', 500),
  ('FACE_015', 'legendaria', 500),
  ('HAIR_010', 'rara', 100),
  ('HAIR_013', 'rara', 100),
  ('HAIR_016', 'rara', 100),
  ('HAIR_017', 'epica', 250),
  ('HAIR_021', 'rara', 100),
  ('HAIR_022', 'epica', 250),
  ('HELM_005', 'rara', 100),
  ('HELM_006', 'rara', 100),
  ('HELM_007', 'rara', 100),
  ('HELM_009', 'epica', 250),
  ('HELM_010', 'rara', 100),
  ('HELM_011', 'epica', 250),
  ('HELM_012', 'legendaria', 500),
  ('HELM_013', 'epica', 250),
  ('HELM_014', 'rara', 100),
  ('HELM_015', 'legendaria', 500),
  ('MOM_arana', 'legendaria', 500),
  ('MOM_escudo', 'rara', 100),
  ('MOM_fuego', 'epica', 250),
  ('MOM_fuerza', 'rara', 100),
  ('MOM_hielo', 'epica', 250),
  ('MOM_laser', 'legendaria', 500),
  ('MOM_magia', 'epica', 250),
  ('MOM_sigilo', 'legendaria', 500),
  ('MOM_trueno', 'epica', 250),
  ('MOM_velocidad', 'rara', 100),
  ('MOM_vuelo', 'epica', 250),
  ('NECK_001', 'rara', 100),
  ('NECK_003', 'rara', 100),
  ('NECK_004', 'epica', 250),
  ('NECK_006', 'epica', 250),
  ('NECK_007', 'epica', 250),
  ('NECK_008', 'rara', 100),
  ('NECK_010', 'rara', 100),
  ('PRINT_001', 'legendaria', 500),
  ('PRINT_002', 'legendaria', 500),
  ('PRINT_003', 'epica', 250),
  ('PRINT_004', 'legendaria', 500),
  ('PRINT_005', 'epica', 250),
  ('PRINT_006', 'epica', 250),
  ('PRINT_007', 'epica', 250),
  ('PRINT_008', 'epica', 250),
  ('PRINT_009', 'epica', 250),
  ('PRINT_011', 'epica', 250),
  ('PRINT_013', 'rara', 100),
  ('PRINT_014', 'rara', 100),
  ('PRINT_015', 'rara', 100),
  ('PRINT_016', 'rara', 100),
  ('PRINT_017', 'rara', 100),
  ('PRINT_018', 'rara', 100),
  ('PRINT_021', 'legendaria', 500),
  ('PRINT_022', 'legendaria', 500),
  ('PRINT_023', 'epica', 250);

insert into public.retos_figura (id, tipo, orden, nombre, condicion, premio) values
  ('dia-rojo-verde', 'diario', 0, 'Navidad adelantada', '{"colores":[["#c91a09","#720e0f","#c8102e","#b3121b"],["#4b9f4a","#237841","#184632","#5d9b3a"]]}'::jsonb, 'NECK_010'),
  ('dia-negro', 'diario', 1, 'De negro', '{"torso":["#1b2a34","#0b0f24","#2a2a2a","#111111"],"piernas":["#1b2a34","#0b0f24","#2a2a2a","#111111"]}'::jsonb, 'HELM_007'),
  ('dia-gorra', 'diario', 2, 'Gorra puesta', '{"alguna":[["HELM_001","HELM_002","HELM_003","HELM_004","HELM_008"]]}'::jsonb, 'CAPE_001'),
  ('dia-barba-lentes', 'diario', 3, 'Intelectual', '{"alguna":[["DETAIL_001","DETAIL_002","DETAIL_003"],["DETAIL_005","DETAIL_006","DETAIL_007"]]}'::jsonb, 'DETAIL_004'),
  ('dia-dos-manos', 'diario', 4, 'Manos llenas', '{"dosObjetos":true}'::jsonb, 'ACC_002'),
  ('dia-azul', 'diario', 5, 'Azul total', '{"torso":["#0055bf","#0a3463","#5a93db","#1d4fa8","#1d3f8f"],"piernas":["#0055bf","#0a3463","#5a93db","#1d4fa8","#1d3f8f"]}'::jsonb, 'HAIR_021'),
  ('dia-sudadera-mochila', 'diario', 6, 'Día de escuela', '{"todas":["PRINT_020","NECK_002"]}'::jsonb, 'MOM_velocidad'),
  ('combo-chef', 'combinacion', 0, 'Chef completo', '{"todas":["PRINT_014","HELM_004","ACC_011"]}'::jsonb, 'MOM_fuego'),
  ('combo-astronauta', 'combinacion', 0, 'Astronauta', '{"todas":["HELM_013","NECK_001"]}'::jsonb, 'MOM_vuelo'),
  ('combo-caballero', 'combinacion', 0, 'Caballero', '{"todas":["HELM_009","ACC_002"],"alguna":[["ACC_003","ACC_005","ACC_006"]]}'::jsonb, 'NECK_004'),
  ('combo-pirata', 'combinacion', 0, 'Al abordaje', '{"todas":["PRINT_018","DETAIL_010"]}'::jsonb, 'ACC_007'),
  ('combo-mago', 'combinacion', 0, 'Aprendiz de mago', '{"todas":["HELM_005","ACC_001"]}'::jsonb, 'MOM_magia'),
  ('combo-policia', 'combinacion', 0, 'De guardia', '{"todas":["PRINT_015","HELM_001"]}'::jsonb, 'ACC_012');
-- <<< generado

-- 4) Nuevo tipo de gasto de XP
alter table public.movimientos_xp drop constraint movimientos_xp_tipo_check;
alter table public.movimientos_xp add constraint movimientos_xp_tipo_check check (tipo in ('ganada', 'accesorio', 'carta', 'quitada', 'pieza'));

-- Ayudantes (privados): qué piezas y colores lleva una figura, y si cumple un reto. Igual que src/app/retos.ts.
create function privado.ids_de_figura(f jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct x) filter (where x is not null), '{}') from (
    select v #>> '{}' as x from jsonb_path_query(f, 'lax $.**.id') v where jsonb_typeof(v) = 'string'
    union all select f #>> '{identidad,rostro}'
    union all select f #>> '{ropa,torso,estampado}'
    union all select d from jsonb_array_elements_text(case when jsonb_typeof(f #> '{identidad,detalles}') = 'array' then f #> '{identidad,detalles}' else '[]'::jsonb end) d
    union all select 'MOM_' || (f #>> '{momentos,paquete}')
  ) t;
$$;

create function privado.colores_de_figura(f jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct lower(x)) filter (where x ~* '^#[0-9a-f]{6}$'), '{}') from (
    select v #>> '{}' as x from jsonb_path_query(f, 'lax $.**.color') v where jsonb_typeof(v) = 'string'
    union all select f #>> '{identidad,piel}'
    union all select f #>> '{ropa,brazos}'
    union all select f #>> '{ropa,guantes}'
    union all select f #>> '{ropa,piernas,botas}'
    union all select c from jsonb_array_elements_text(case when jsonb_typeof(f #> '{ropa,torso,colores}') = 'array' then f #> '{ropa,torso,colores}' else '[]'::jsonb end) c
  ) t;
$$;

create function privado.cumple_reto(f jsonb, c jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  ids text[] := privado.ids_de_figura(f);
  col text[] := privado.colores_de_figura(f);
  g jsonb;
begin
  if c ? 'todas' and not (array(select jsonb_array_elements_text(c -> 'todas')) <@ ids) then return false; end if;
  if c ? 'alguna' then
    for g in select x from jsonb_array_elements(c -> 'alguna') x loop
      if not (array(select jsonb_array_elements_text(g)) && ids) then return false; end if;
    end loop;
  end if;
  if c ? 'colores' then
    for g in select x from jsonb_array_elements(c -> 'colores') x loop
      if not (array(select lower(y) from jsonb_array_elements_text(g) y) && col) then return false; end if;
    end loop;
  end if;
  if c ? 'torso' and not coalesce(lower(f #>> '{ropa,torso,color}') = any (array(select lower(y) from jsonb_array_elements_text(c -> 'torso') y)), false) then return false; end if;
  if c ? 'piernas' and not coalesce(lower(f #>> '{ropa,piernas,color}') = any (array(select lower(y) from jsonb_array_elements_text(c -> 'piernas') y)), false) then return false; end if;
  if coalesce((c ->> 'dosObjetos')::boolean, false)
     and not coalesce(jsonb_typeof(f #> '{accesorios,mano_der}') = 'object' and jsonb_typeof(f #> '{accesorios,mano_izq}') = 'object', false) then return false; end if;
  return true;
end;
$$;

-- El reto diario de una fecha: rota por orden (igual que retoDelDia en src/content/rarezas.ts).
create function privado.reto_del_dia(p_dia date) returns text
language sql stable set search_path = '' as $$
  select r.id from public.retos_figura r where r.tipo = 'diario' and r.activo order by r.orden
  offset ((p_dia - date '1970-01-01') % greatest(1, (select count(*) from public.retos_figura x where x.tipo = 'diario' and x.activo))) limit 1;
$$;

revoke execute on function privado.ids_de_figura(jsonb), privado.colores_de_figura(jsonb), privado.cumple_reto(jsonb, jsonb), privado.reto_del_dia(date)
  from public, anon, authenticated;

-- 5) Desbloquear con XP
create function public.desbloquear_pieza(p_pieza text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_p public.piezas_figura;
  s record;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select * into v_p from public.piezas_figura x where x.id = p_pieza and x.activo;
  if not found then raise exception 'pieza no válida'; end if;
  if exists (select 1 from public.piezas_jugador j where j.jugador = v_uid and j.pieza = p_pieza) then raise exception 'ya la tienes'; end if;
  select * into s from privado.saldos_de(v_uid);
  if s.disponible < v_p.precio then raise exception 'saldo insuficiente'; end if;
  insert into public.movimientos_xp (jugador, tipo, xp, motivo) values (v_uid, 'pieza', v_p.precio, left('Pieza ' || p_pieza, 60));
  insert into public.piezas_jugador (jugador, pieza, origen) values (v_uid, p_pieza, 'xp');
end;
$$;

-- Reclamar un reto con la figura guardada en una cápsula
create function public.reclamar_reto(p_reto text, p_capsula smallint) returns table (pieza text, xp int)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_r public.retos_figura;
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
  v_dia date;
  v_f jsonb;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select * into v_r from public.retos_figura x where x.id = p_reto and x.activo;
  if not found then raise exception 'reto no válido'; end if;
  if v_r.tipo = 'diario' and privado.reto_del_dia(v_hoy) is distinct from p_reto then raise exception 'no es el reto de hoy'; end if;
  v_dia := case when v_r.tipo = 'diario' then v_hoy else date '2000-01-01' end;
  if exists (select 1 from public.retos_jugador j where j.jugador = v_uid and j.reto = p_reto and j.dia = v_dia) then raise exception 'ya lo reclamaste'; end if;
  select fj.figura into v_f from public.figuras_jugador fj where fj.jugador = v_uid and fj.capsula = p_capsula;
  if not found then raise exception 'cápsula vacía'; end if;
  if not privado.cumple_reto(v_f, v_r.condicion) then raise exception 'la figura no cumple el reto'; end if;
  if exists (select 1 from public.piezas_jugador j where j.jugador = v_uid and j.pieza = v_r.premio) then
    insert into public.movimientos_xp (jugador, tipo, xp, motivo) values (v_uid, 'ganada', 40, left('Reto ' || v_r.nombre, 60));
    insert into public.retos_jugador (jugador, reto, dia, premio, xp) values (v_uid, p_reto, v_dia, null, 40);
    return query select null::text, 40;
  else
    insert into public.piezas_jugador (jugador, pieza, origen) values (v_uid, v_r.premio, 'reto');
    insert into public.retos_jugador (jugador, reto, dia, premio, xp) values (v_uid, p_reto, v_dia, v_r.premio, 0);
    return query select v_r.premio, 0;
  end if;
end;
$$;

revoke execute on function public.desbloquear_pieza(text), public.reclamar_reto(text, smallint) from public, anon;
grant execute on function public.desbloquear_pieza(text), public.reclamar_reto(text, smallint) to authenticated;

-- 7) Regalo: las piezas bloqueadas que ya usan las figuras guardadas son de su dueño (antes del guardián)
insert into public.piezas_jugador (jugador, pieza, origen)
  select distinct fj.jugador, i.id, 'regalo'
  from public.figuras_jugador fj
  cross join lateral unnest(privado.ids_de_figura(fj.figura)) as i(id)
  join public.piezas_figura p on p.id = i.id
on conflict do nothing;

-- 6) Guardián: no se guarda una figura con piezas bloqueadas que el jugador no tiene
create function privado.validar_piezas_figura() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from unnest(privado.ids_de_figura(new.figura)) as i(id)
    join public.piezas_figura p on p.id = i.id and p.activo
    where not exists (select 1 from public.piezas_jugador j where j.jugador = new.jugador and j.pieza = i.id)
  ) then
    raise exception 'pieza bloqueada';
  end if;
  return new;
end;
$$;
revoke execute on function privado.validar_piezas_figura() from public, anon, authenticated;
create trigger figuras_jugador_piezas before insert or update of figura on public.figuras_jugador
  for each row execute function privado.validar_piezas_figura();
