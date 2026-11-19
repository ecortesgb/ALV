-- 036 · Tienda: monedas, sobres que se tiran en el servidor, comodines por cuenta y garantía (Maestro v1.48 y v1.49).
-- APLICADA 2026-11-19 con autorización de Elías («Sí, aplícala»). Antes: prueba local en PGlite 18/18
-- (supabase/pruebas/036_local_pglite.mjs) y prueba remota en transacción deshecha (036_remota_prueba.sql, sin fallas).
-- Después: asesor de 26 a 28 avisos RPC (3 nuevas a propósito, comprar_sobre vieja ya no aparece).
-- 1) public.movimientos_monedas: cada suma o gasto de monedas. Cada quien lee lo suyo; solo escriben funciones de aquí.
-- 2) Catálogo: public.sobres_tienda y public.comodines_tienda (los lee cualquier cuenta). Igual que src/content/tienda.ts
--    (src/content/tienda036.test.ts compara los dos).
-- 3) Lo del jugador: comodines_jugador (tope 9 por tipo), rachas_sobres (garantía) y aperturas (historial y reintentos).
-- 4) estado_tienda(): saldo, racha y comodines; la primera vez regala 150 monedas de bienvenida.
-- 5) abrir_sobre(p_sobre, p_pedido): cobra, tira en el servidor y entrega. Igual que src/engine/sobresTienda.ts.
-- 6) Monedas por juego terminado: terminar_partida_sala (sala) y registrar_partida (un solo aparato).
--    10 por jugar + 8/5/3 por lugar con la regla de podio de la XP; tope de 300 al día. Tomar no da monedas.
-- 7) admin_dar_monedas para pruebas (solo administradores).
-- 8) Se apaga la tienda vieja (004/005): sin permiso de ejecutar comprar_sobre. No se borra ninguna tabla (027 sigue bloqueada).

-- 1) Monedas
create table public.movimientos_monedas (
  id       bigint generated always as identity primary key,
  jugador  uuid not null references public.perfiles (id) on delete cascade,
  cantidad int  not null check (cantidad <> 0 and cantidad between -100000 and 100000),
  motivo   text not null check (char_length(motivo) between 1 and 60),
  partida  uuid,
  creado   timestamptz not null default now()
);
create index movimientos_monedas_jugador on public.movimientos_monedas (jugador, creado);
create unique index movimientos_monedas_bienvenida on public.movimientos_monedas (jugador) where motivo = 'bienvenida';
alter table public.movimientos_monedas enable row level security;
revoke all on public.movimientos_monedas from public, anon, authenticated;
grant select on public.movimientos_monedas to authenticated;
create policy movimientos_monedas_leer on public.movimientos_monedas for select to authenticated using (jugador = (select auth.uid()));

create function privado.monedas_de(p_jugador uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(m.cantidad), 0)::int from public.movimientos_monedas m where m.jugador = p_jugador;
$$;
revoke execute on function privado.monedas_de(uuid) from public, anon, authenticated;

-- Monedas de un juego terminado (las llaman las dos rutas que dan XP). Devuelve cuántas dio.
create function privado.dar_monedas_partida(p_jugador uuid, p_lugar int, p_jugadores int, p_partida uuid, p_juego text) returns int
language plpgsql security definer set search_path = '' as $$
declare v_m int; v_hoy int;
begin
  v_m := 10 + case when p_lugar <= (case when p_jugadores >= 6 then 3 when p_jugadores >= 4 then 2 else 1 end)
                   then (array[8, 5, 3])[p_lugar] else 0 end;
  perform pg_advisory_xact_lock(hashtext('monedas:' || p_jugador::text));
  select coalesce(sum(m.cantidad), 0) into v_hoy from public.movimientos_monedas m
    where m.jugador = p_jugador and m.motivo like 'partida:%' and m.creado >= date_trunc('day', now());
  v_m := least(v_m, greatest(0, 300 - v_hoy));
  if v_m <= 0 then return 0; end if;
  insert into public.movimientos_monedas (jugador, cantidad, motivo, partida) values (p_jugador, v_m, left('partida:' || p_juego, 60), p_partida);
  return v_m;
end $$;
revoke execute on function privado.dar_monedas_partida(uuid, int, int, uuid, text) from public, anon, authenticated;

-- 2) Catálogo
create table public.sobres_tienda (
  id        text primary key check (id in ('basico', 'accesorios', 'comodines', 'mixto', 'epico')),
  precio    int  not null check (precio between 1 and 100000),
  piezas    int  not null check (piezas between 0 and 6),
  comodines int  not null check (comodines between 0 and 6),
  pesos     jsonb not null check (jsonb_typeof(pesos) = 'object'),
  secciones text[],
  minimo    text check (minimo in ('rara', 'epica', 'legendaria')),
  activo    boolean not null default true,
  check (piezas + comodines between 1 and 6)
);
alter table public.sobres_tienda enable row level security;
revoke all on public.sobres_tienda from public, anon, authenticated;
grant select on public.sobres_tienda to authenticated;
create policy sobres_tienda_leer on public.sobres_tienda for select to authenticated using (activo);

create table public.comodines_tienda (
  id       text primary key check (id ~ '^[a-z-]+$' and char_length(id) <= 30),
  especial boolean not null default false,
  activo   boolean not null default true
);
alter table public.comodines_tienda enable row level security;
revoke all on public.comodines_tienda from public, anon, authenticated;
grant select on public.comodines_tienda to authenticated;
create policy comodines_tienda_leer on public.comodines_tienda for select to authenticated using (activo);

-- Valores aprobados en v1.49 (iguales a src/content/tienda.ts).
insert into public.sobres_tienda (id, precio, piezas, comodines, pesos, secciones, minimo) values
  ('basico', 50, 2, 0, '{"rara": 88, "epica": 11, "legendaria": 1}', null, null),
  ('accesorios', 120, 3, 0, '{"rara": 65, "epica": 28, "legendaria": 7}', array['casco', 'detalle', 'cuello', 'objeto'], null),
  ('comodines', 150, 0, 3, '{"rara": 0, "epica": 0, "legendaria": 0}', null, null),
  ('mixto', 180, 2, 2, '{"rara": 60, "epica": 32, "legendaria": 8}', null, null),
  ('epico', 200, 3, 0, '{"rara": 40, "epica": 45, "legendaria": 15}', null, 'epica');
insert into public.comodines_tienda (id, especial) values ('turno', false), ('cambio', false);

-- Sección de una pieza (igual que seccionDe en src/content/tienda.ts).
create function privado.seccion_pieza(p_id text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_id like 'MOM\_%' then 'momentos'
    when p_id like 'HAIR\_%' then 'pelo'
    when p_id like 'HELM\_%' or p_id ~ '^FACE_01[2-5]$' then 'casco'
    when p_id like 'FACE\_%' then 'rostro'
    when p_id like 'DETAIL\_%' then 'detalle'
    when p_id like 'NECK\_%' or p_id like 'CAPE\_%' then 'cuello'
    when p_id like 'PRINT\_%' then 'torso'
    else 'objeto' end;
$$;
revoke execute on function privado.seccion_pieza(text) from public, anon, authenticated;

-- 3) Lo del jugador
create table public.comodines_jugador (
  jugador  uuid not null references public.perfiles (id) on delete cascade,
  comodin  text not null references public.comodines_tienda (id) on delete cascade,
  cantidad int  not null check (cantidad between 0 and 9),
  primary key (jugador, comodin)
);
alter table public.comodines_jugador enable row level security;
revoke all on public.comodines_jugador from public, anon, authenticated;
grant select on public.comodines_jugador to authenticated;
create policy comodines_jugador_leer on public.comodines_jugador for select to authenticated using (jugador = (select auth.uid()));

create table public.rachas_sobres (
  jugador        uuid primary key references public.perfiles (id) on delete cascade,
  sin_epica      int not null default 0 check (sin_epica >= 0),
  sin_legendaria int not null default 0 check (sin_legendaria >= 0)
);
alter table public.rachas_sobres enable row level security;
revoke all on public.rachas_sobres from public, anon, authenticated;
grant select on public.rachas_sobres to authenticated;
create policy rachas_sobres_leer on public.rachas_sobres for select to authenticated using (jugador = (select auth.uid()));

create table public.aperturas (
  id      bigint generated always as identity primary key,
  jugador uuid not null references public.perfiles (id) on delete cascade,
  sobre   text not null references public.sobres_tienda (id),
  pedido  uuid not null,
  precio  int  not null,
  cartas  jsonb not null,
  creado  timestamptz not null default now(),
  unique (jugador, pedido)
);
alter table public.aperturas enable row level security;
revoke all on public.aperturas from public, anon, authenticated;
grant select on public.aperturas to authenticated;
create policy aperturas_leer on public.aperturas for select to authenticated using (jugador = (select auth.uid()));

-- Las piezas también llegan de sobres.
alter table public.piezas_jugador drop constraint if exists piezas_jugador_origen_check;
alter table public.piezas_jugador add constraint piezas_jugador_origen_check check (origen in ('xp', 'reto', 'regalo', 'sobre', 'monedas', 'nivel'));

-- 4) Estado de la tienda (y regalo de bienvenida la primera vez)
create function public.estado_tienda() returns table (monedas int, sin_epica int, sin_legendaria int, comodines jsonb)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  insert into public.movimientos_monedas (jugador, cantidad, motivo) values (v_uid, 150, 'bienvenida')
    on conflict (jugador) where motivo = 'bienvenida' do nothing;
  return query select
    privado.monedas_de(v_uid),
    coalesce((select r.sin_epica from public.rachas_sobres r where r.jugador = v_uid), 0),
    coalesce((select r.sin_legendaria from public.rachas_sobres r where r.jugador = v_uid), 0),
    coalesce((select jsonb_object_agg(c.comodin, c.cantidad) from public.comodines_jugador c where c.jugador = v_uid), '{}'::jsonb);
end $$;
revoke execute on function public.estado_tienda() from public, anon;
grant execute on function public.estado_tienda() to authenticated;

-- 5) Abrir un sobre. p_pedido lo genera el aparato: si se reintenta el mismo pedido, devuelve lo mismo sin cobrar otra vez.
create function public.abrir_sobre(p_sobre text, p_pedido uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_s public.sobres_tienda;
  v_orden text[] := array['rara', 'epica', 'legendaria'];
  v_previa jsonb; v_saldo int; v_sin_e int := 0; v_sin_l int := 0;
  v_total numeric; v_tiro numeric; v_pedida text; v_r text; v_mejor int := 0; v_n int; v_k int;
  v_elegida text; v_piezas jsonb := '[]'; v_extras jsonb := '[]'; v_com text; v_cant int; v_extra_monedas int := 0;
  i int;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_pedido is null then raise exception 'pedido no válido'; end if;
  perform pg_advisory_xact_lock(hashtext('monedas:' || v_uid::text));
  select a.cartas into v_previa from public.aperturas a where a.jugador = v_uid and a.pedido = p_pedido;
  if found then return v_previa || jsonb_build_object('monedas', privado.monedas_de(v_uid), 'repetido', true); end if;

  select * into v_s from public.sobres_tienda s where s.id = p_sobre and s.activo;
  if not found then raise exception 'sobre no válido'; end if;
  v_saldo := privado.monedas_de(v_uid);
  if v_saldo < v_s.precio then raise exception 'saldo insuficiente'; end if;
  select r.sin_epica, r.sin_legendaria into v_sin_e, v_sin_l from public.rachas_sobres r where r.jugador = v_uid;
  v_sin_e := coalesce(v_sin_e, 0); v_sin_l := coalesce(v_sin_l, 0);

  -- Piezas que todavía no tiene y que este sobre puede traer.
  create temp table if not exists _pool (id text primary key, rareza text) on commit drop;
  delete from pg_temp._pool where true;
  insert into pg_temp._pool
    select f.id, f.rareza from public.piezas_figura f
    where f.activo and (v_s.secciones is null or privado.seccion_pieza(f.id) = any (v_s.secciones))
      and not exists (select 1 from public.piezas_jugador j where j.jugador = v_uid and j.pieza = f.id);
  if v_s.piezas > 0 and not exists (select 1 from pg_temp._pool) then raise exception 'ya tienes todo'; end if;

  v_total := (select sum(greatest(0, (v_s.pesos ->> r)::numeric)) from unnest(v_orden) r);
  for i in 1 .. v_s.piezas loop
    select count(*) into v_n from pg_temp._pool;
    exit when v_n = 0;
    v_tiro := random() * v_total; v_pedida := 'legendaria';
    foreach v_r in array v_orden loop
      v_tiro := v_tiro - greatest(0, (v_s.pesos ->> v_r)::numeric);
      if v_tiro < 0 then v_pedida := v_r; exit; end if;
    end loop;
    -- En la última pieza: mínimo del sobre y garantía (si todavía no salió algo así de bueno).
    if i = v_s.piezas or v_n = 1 then
      if v_s.minimo is not null and array_position(v_orden, v_pedida) < array_position(v_orden, v_s.minimo) and v_mejor < array_position(v_orden, v_s.minimo) then v_pedida := v_s.minimo; end if;
      if v_sin_e + 1 >= 8 and array_position(v_orden, v_pedida) < 2 and v_mejor < 2 then v_pedida := 'epica'; end if;
      if v_sin_l + 1 >= 25 and v_mejor < 3 then v_pedida := 'legendaria'; end if;
    end if;
    -- Primero la pedida; si no queda, hacia arriba y luego hacia abajo.
    v_elegida := null;
    v_k := array_position(v_orden, v_pedida);
    foreach v_r in array (v_orden[v_k:3] || (select coalesce(array_agg(x order by o desc), '{}') from unnest(v_orden[1:v_k - 1]) with ordinality t(x, o))) loop
      select p.id into v_elegida from pg_temp._pool p where p.rareza = v_r order by random() limit 1;
      exit when v_elegida is not null;
    end loop;
    exit when v_elegida is null;
    delete from pg_temp._pool p where p.id = v_elegida;
    insert into public.piezas_jugador (jugador, pieza, origen) values (v_uid, v_elegida, 'sobre') on conflict do nothing;
    v_piezas := v_piezas || jsonb_build_array(jsonb_build_object('tipo', 'pieza', 'id', v_elegida, 'rareza', v_r));
    v_mejor := greatest(v_mejor, array_position(v_orden, v_r));
  end loop;

  if v_s.piezas > 0 then
    insert into public.rachas_sobres (jugador, sin_epica, sin_legendaria)
      values (v_uid, case when v_mejor >= 2 then 0 else v_sin_e + 1 end, case when v_mejor = 3 then 0 else v_sin_l + 1 end)
      on conflict (jugador) do update set sin_epica = excluded.sin_epica, sin_legendaria = excluded.sin_legendaria;
  end if;

  for i in 1 .. v_s.comodines loop
    select c.id into v_com from public.comodines_tienda c where c.activo order by random() limit 1;
    exit when v_com is null;
    select coalesce((select j.cantidad from public.comodines_jugador j where j.jugador = v_uid and j.comodin = v_com), 0) into v_cant;
    if v_cant >= 9 then
      v_extras := v_extras || jsonb_build_array(jsonb_build_object('tipo', 'monedas', 'cantidad', 10, 'comodin', v_com));
      v_extra_monedas := v_extra_monedas + 10;
    else
      insert into public.comodines_jugador (jugador, comodin, cantidad) values (v_uid, v_com, 1)
        on conflict (jugador, comodin) do update set cantidad = public.comodines_jugador.cantidad + 1;
      v_extras := v_extras || jsonb_build_array(jsonb_build_object('tipo', 'comodin', 'id', v_com, 'especial', false));
    end if;
  end loop;

  insert into public.movimientos_monedas (jugador, cantidad, motivo) values (v_uid, -v_s.precio, 'sobre:' || v_s.id);
  if v_extra_monedas > 0 then
    insert into public.movimientos_monedas (jugador, cantidad, motivo) values (v_uid, v_extra_monedas, 'sobre:comodines-llenos');
  end if;

  -- La mejor carta va al final: primero comodines y monedas, luego piezas de menor a mayor rareza.
  v_previa := jsonb_build_object(
    'cartas', v_extras || coalesce((select jsonb_agg(x order by array_position(v_orden, x ->> 'rareza'))
                                    from jsonb_array_elements(v_piezas) x), '[]'::jsonb),
    'mejor', case when v_mejor > 0 then v_orden[v_mejor] else 'rara' end,
    'racha', jsonb_build_object(
      'sinEpica', case when v_s.piezas = 0 then v_sin_e when v_mejor >= 2 then 0 else v_sin_e + 1 end,
      'sinLegendaria', case when v_s.piezas = 0 then v_sin_l when v_mejor = 3 then 0 else v_sin_l + 1 end));
  insert into public.aperturas (jugador, sobre, pedido, precio, cartas) values (v_uid, v_s.id, p_pedido, v_s.precio, v_previa);
  return v_previa || jsonb_build_object('monedas', privado.monedas_de(v_uid));
end $$;
revoke execute on function public.abrir_sobre(text, uuid) from public, anon;
grant execute on function public.abrir_sobre(text, uuid) to authenticated;

-- 6) Monedas por juego: las dos rutas que dan XP (cuerpos iguales a 008 y 034, más la línea de monedas).
create or replace function public.terminar_partida_sala(p_partida uuid, p_juego text, p_jugadores int, p_resultados jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_evento uuid; r jsonb; v_j uuid; v_rondas int; v_retos int; v_lugar int; v_xp int; v_hoy int;
  v_juegos text[] := array['bienvenida', 'verdad-reto', 'conoces', 'mimica', 'prohibida', 'impostor', 'reto-lugar',
                           'lista', 'reloj', 'yo-nunca', 'mas-probable', 'que-prefieres', 'ruleta', 'dados-hot'];
begin
  if (select auth.uid()) is null then raise exception 'sin sesión'; end if;
  select p.evento into v_evento from public.partidas p where p.id = p_partida and p.terminada is null;
  if v_evento is null then raise exception 'partida no válida'; end if;
  if not privado.es_anfitrion(v_evento) then raise exception 'sin permiso'; end if;
  if p_juego is null or not (p_juego = any (v_juegos)) then raise exception 'juego no válido'; end if;
  if p_jugadores is null or p_jugadores not between 2 and 8 then raise exception 'jugadores no válidos'; end if;
  if jsonb_typeof(p_resultados) <> 'array' or jsonb_array_length(p_resultados) > 8 then raise exception 'resultados no válidos'; end if;

  update public.partidas set terminada = now() where id = p_partida;

  for r in select value from jsonb_array_elements(p_resultados) loop
    begin
      v_j := (r ->> 'jugador')::uuid;
      v_rondas := (r ->> 'rondas')::int; v_retos := (r ->> 'retos')::int; v_lugar := (r ->> 'lugar')::int;
    exception when others then continue;
    end;
    if not exists (select 1 from public.miembros_evento m where m.evento = v_evento and m.jugador = v_j) then continue; end if;
    if v_rondas is null or v_rondas not between 0 and 40 then continue; end if;
    if v_lugar is null or v_lugar not between 1 and p_jugadores then continue; end if;
    if v_retos is null or v_retos < 0 or v_retos > ceil(v_rondas::numeric / p_jugadores) then continue; end if;
    v_xp := privado.xp_de_partida(v_rondas, v_retos, v_lugar, p_jugadores);
    if v_xp <= 0 then continue; end if;
    -- Monedas (036): aunque la XP del día ya esté en su tope.
    perform privado.dar_monedas_partida(v_j, v_lugar, p_jugadores, p_partida, p_juego);
    perform pg_advisory_xact_lock(hashtext('xp:' || v_j::text));
    select coalesce(sum(m.xp), 0) into v_hoy from public.movimientos_xp m
      where m.jugador = v_j and m.tipo = 'ganada' and m.creado >= date_trunc('day', now());
    v_xp := least(v_xp, greatest(0, 600 - v_hoy));
    if v_xp <= 0 then continue; end if;
    insert into public.movimientos_xp (jugador, tipo, xp, evento, partida, xp_de_evento, motivo)
      values (v_j, 'ganada', v_xp, v_evento, p_partida, v_xp, 'partida:' || p_juego);
  end loop;
end $$;
revoke execute on function public.terminar_partida_sala(uuid, text, int, jsonb) from public, anon;
grant execute on function public.terminar_partida_sala(uuid, text, int, jsonb) to authenticated;

create or replace function public.registrar_partida(p_juego text, p_rondas int, p_retos int, p_lugar int, p_jugadores int, p_evento uuid default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_juegos text[] := array['bienvenida', 'verdad-reto', 'conoces', 'mimica', 'prohibida', 'impostor', 'reto-lugar',
                           'lista', 'reloj', 'yo-nunca', 'mas-probable', 'que-prefieres', 'ruleta', 'dados-hot'];
  v_xp int; v_hoy int; v_ultima timestamptz;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if p_juego is null or not (p_juego = any (v_juegos)) then raise exception 'juego no válido'; end if;
  if p_jugadores is null or p_jugadores not between 2 and 8 then raise exception 'jugadores no válidos'; end if;
  if p_rondas is null or p_rondas not between 0 and 40 then raise exception 'rondas no válidas'; end if;
  if p_lugar is null or p_lugar not between 1 and p_jugadores then raise exception 'lugar no válido'; end if;
  if p_retos is null or p_retos < 0 or p_retos > ceil(p_rondas::numeric / p_jugadores) then raise exception 'retos no válidos'; end if;
  if p_evento is not null then
    if not privado.es_miembro(p_evento) then raise exception 'sin permiso'; end if;
    if exists (select 1 from public.eventos e where e.id = p_evento and e.cerrado) then raise exception 'evento cerrado'; end if;
  end if;

  v_xp := privado.xp_de_partida(p_rondas, p_retos, p_lugar, p_jugadores);
  if v_xp <= 0 then return 0; end if;

  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select max(m.creado) into v_ultima from public.movimientos_xp m
    where m.jugador = v_uid and m.tipo = 'ganada' and m.motivo like 'partida:%';
  if v_ultima is not null and v_ultima > now() - interval '60 seconds' then raise exception 'muy pronto'; end if;
  select coalesce(sum(m.xp), 0) into v_hoy from public.movimientos_xp m
    where m.jugador = v_uid and m.tipo = 'ganada' and m.creado >= date_trunc('day', now());
  if v_hoy + v_xp > 600 then raise exception 'tope diario alcanzado'; end if;

  insert into public.movimientos_xp (jugador, tipo, xp, evento, xp_de_evento, motivo)
    values (v_uid, 'ganada', v_xp, p_evento, case when p_evento is null then 0 else v_xp end, 'partida:' || p_juego);
  -- Monedas (036)
  perform privado.dar_monedas_partida(v_uid, p_lugar, p_jugadores, null, p_juego);
  return v_xp;
end $$;
revoke execute on function public.registrar_partida(text, int, int, int, int, uuid) from public, anon;
grant execute on function public.registrar_partida(text, int, int, int, int, uuid) to authenticated;

-- 7) Monedas a mano (solo administradores, para pruebas)
create function public.admin_dar_monedas(p_jugador uuid, p_cantidad int) returns int
language plpgsql security definer set search_path = '' as $$
begin
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  if p_cantidad is null or p_cantidad = 0 or p_cantidad not between -5000 and 5000 then raise exception 'cantidad no válida'; end if;
  if not exists (select 1 from public.perfiles where id = p_jugador) then raise exception 'jugador no existe'; end if;
  perform pg_advisory_xact_lock(hashtext('monedas:' || p_jugador::text));
  if p_cantidad < 0 and privado.monedas_de(p_jugador) + p_cantidad < 0 then raise exception 'no tiene tantas monedas'; end if;
  insert into public.movimientos_monedas (jugador, cantidad, motivo) values (p_jugador, p_cantidad, 'admin');
  return privado.monedas_de(p_jugador);
end $$;
revoke execute on function public.admin_dar_monedas(uuid, int) from public, anon;
grant execute on function public.admin_dar_monedas(uuid, int) to authenticated;

-- 8) La tienda vieja (004/005) deja de vender. Las tablas se quedan (la limpieza es la 027, bloqueada).
revoke execute on function public.comprar_sobre(text) from public, anon, authenticated;
