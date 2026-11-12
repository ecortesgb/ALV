-- ALV · Correcciones encontradas en la prueba de punta a punta (13 de noviembre).
-- 1) Sin evento abierto, la "XP del evento" contaba la XP que no tiene evento (null = null). Ahora es 0.
-- 2) comprar_sobre: la API exige WHERE en cada DELETE; la limpieza de candidatos no lo tenía.

create or replace function privado.saldos_de(p_jugador uuid, p_evento uuid default null)
returns table (acumulada int, disponible int, del_evento int, evento uuid)
language sql stable security definer set search_path = '' as $$
  with ev as (
    select coalesce(p_evento, (
      select e.id from public.eventos e join public.miembros_evento m on m.evento = e.id
      where m.jugador = p_jugador and not e.cerrado order by e.inicia desc limit 1)) as id
  ), abierto as (
    select ev.id from ev join public.eventos e on e.id = ev.id where not e.cerrado
  )
  select
    coalesce(sum(x.xp) filter (where x.tipo = 'ganada'), 0)::int,
    coalesce(sum(case when x.tipo = 'ganada' then x.xp else -x.xp end), 0)::int,
    greatest(0, coalesce(sum(case
      when (select id from abierto) is null or x.evento is distinct from (select id from abierto) then 0
      when x.tipo = 'ganada' then x.xp
      when x.tipo = 'carta' then -x.xp
      else -x.xp_de_evento end), 0))::int,
    (select id from abierto)
  from public.movimientos_xp x where x.jugador = p_jugador;
$$;

create or replace function public.comprar_sobre(p_sobre text) returns table (articulo text, rareza text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_sobre public.sobres; s record; v_nivel int; v_de_evento int;
  v_orden text[] := array['comun', 'rara', 'epica', 'legendaria'];
  v_total numeric; v_tiro numeric; v_pedida text; v_idx int; v_r text; v_elegido text; i int; k int;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select * into v_sobre from public.sobres x where x.id = p_sobre and x.activo;
  if not found then raise exception 'sobre no válido'; end if;
  select * into s from privado.saldos_de(v_uid);
  v_nivel := public.nivel_por_xp(s.acumulada);
  if v_nivel < v_sobre.nivel_min then raise exception 'nivel insuficiente'; end if;
  if s.disponible < v_sobre.precio then raise exception 'saldo insuficiente'; end if;

  create temp table if not exists _candidatos (id text primary key, rareza text) on commit drop;
  delete from pg_temp._candidatos where true;
  insert into pg_temp._candidatos
    select a.id, privado.rareza_de(a.precio) from public.articulos_tienda a
    where a.tipo = 'accesorio' and a.activo and a.nivel_min <= v_nivel
      and not exists (select 1 from public.inventario inv where inv.jugador = v_uid and inv.articulo = a.id);
  if not exists (select 1 from pg_temp._candidatos) then raise exception 'ya tienes todo'; end if;

  v_total := (select sum((v_sobre.pesos ->> r)::numeric) from unnest(v_orden) r);
  for i in 1 .. v_sobre.cartas loop
    exit when not exists (select 1 from pg_temp._candidatos);
    v_tiro := random() * v_total; v_pedida := 'comun';
    foreach v_r in array v_orden loop
      v_tiro := v_tiro - (v_sobre.pesos ->> v_r)::numeric;
      if v_tiro < 0 then v_pedida := v_r; exit; end if;
    end loop;
    -- Primero la rareza tirada; si no hay, hacia arriba y luego hacia abajo.
    v_idx := array_position(v_orden, v_pedida); v_elegido := null;
    for k in 0 .. 3 loop
      v_r := case when v_idx + k <= 4 then v_orden[v_idx + k] else v_orden[v_idx - (v_idx + k - 4)] end;
      select c.id into v_elegido from pg_temp._candidatos c where c.rareza = v_r order by random() limit 1;
      exit when v_elegido is not null;
    end loop;
    exit when v_elegido is null;
    delete from pg_temp._candidatos c where c.id = v_elegido;
    insert into public.inventario (jugador, articulo) values (v_uid, v_elegido);
    articulo := v_elegido; rareza := v_r; return next;
  end loop;

  v_de_evento := greatest(0, v_sobre.precio - (s.disponible - s.del_evento));
  insert into public.movimientos_xp (jugador, tipo, xp, evento, xp_de_evento, motivo)
    values (v_uid, 'accesorio', v_sobre.precio, s.evento, v_de_evento, 'sobre-' || v_sobre.id);
end $$;
