-- 013 · Corrige la 012: los saldos reales se calculan en privado.saldos_de (la que usan mis_saldos y las compras).
-- 1) privado.saldos_de: la XP quitada por un administrador resta de la XP total. Lo demás queda igual que antes.
-- 2) public.saldos_de (copia vieja, sin uso) vuelve a quedar como estaba en la 001.
-- 3) admin_jugadores y admin_ajustar_xp usan privado.saldos_de.

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
    greatest(0, coalesce(sum(x.xp) filter (where x.tipo = 'ganada'), 0) - coalesce(sum(x.xp) filter (where x.tipo = 'quitada'), 0))::int,
    coalesce(sum(case when x.tipo = 'ganada' then x.xp else -x.xp end), 0)::int,
    greatest(0, coalesce(sum(case
      when (select id from abierto) is null or x.evento is distinct from (select id from abierto) then 0
      when x.tipo = 'ganada' then x.xp
      when x.tipo = 'carta' then -x.xp
      else -x.xp_de_evento end), 0))::int,
    (select id from abierto)
  from public.movimientos_xp x where x.jugador = p_jugador;
$$;

create or replace function public.saldos_de(p_jugador uuid, p_evento uuid default null)
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
      when x.evento is distinct from (select id from abierto) then 0
      when x.tipo = 'ganada' then x.xp
      when x.tipo = 'carta' then -x.xp
      else -x.xp_de_evento end), 0))::int,
    (select id from abierto)
  from public.movimientos_xp x where x.jugador = p_jugador;
$$;
revoke execute on function public.saldos_de(uuid, uuid) from public, anon, authenticated;

create or replace function public.admin_jugadores()
returns table (id uuid, nombre text, acumulada int, disponible int, del_evento int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  return query
    select p.id, p.nombre, s.acumulada, s.disponible, s.del_evento
    from public.perfiles p cross join lateral privado.saldos_de(p.id) s
    order by s.acumulada desc, p.nombre;
end;
$$;

create or replace function public.admin_ajustar_xp(p_jugador uuid, p_xp int, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ev uuid; v_disp int; v_del int; v_cant int;
  v_motivo text := left(regexp_replace(trim(coalesce(p_motivo, '')), '\s+', ' ', 'g'), 50);
begin
  if not public.soy_admin() then raise exception 'sin permiso'; end if;
  if p_xp is null or p_xp = 0 or p_xp not between -1000 and 1000 then raise exception 'xp no válida'; end if;
  if not exists (select 1 from public.perfiles where id = p_jugador) then raise exception 'jugador no existe'; end if;
  if v_motivo = '' then v_motivo := 'ajuste'; end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || p_jugador::text));
  select s.evento, s.disponible, s.del_evento into v_ev, v_disp, v_del from privado.saldos_de(p_jugador) s;

  if p_xp > 0 then
    insert into public.movimientos_xp (jugador, tipo, xp, evento, xp_de_evento, motivo)
      values (p_jugador, 'ganada', p_xp, v_ev, case when v_ev is null then 0 else p_xp end, 'admin:' || v_motivo);
  else
    v_cant := least(-p_xp, greatest(v_disp, 0));
    if v_cant = 0 then raise exception 'no tiene xp para quitar'; end if;
    insert into public.movimientos_xp (jugador, tipo, xp, evento, xp_de_evento, motivo)
      values (p_jugador, 'quitada', v_cant, v_ev, least(v_cant, greatest(coalesce(v_del, 0), 0)), 'admin:' || v_motivo);
  end if;
end;
$$;
