-- ALV · Ayudantes internos fuera del esquema público (que la API no los exponga).
-- Las políticas siguen funcionando: apuntan a la función, no a su nombre.
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

alter function public.es_miembro(uuid) set schema privado;
alter function public.es_anfitrion(uuid) set schema privado;
alter function public.comparten_evento(uuid) set schema privado;
alter function public.saldos_de(uuid, uuid) set schema privado;

create or replace function public.mis_saldos() returns table (acumulada int, disponible int, del_evento int, evento uuid, nivel int)
language sql stable security definer set search_path = '' as $$
  select s.acumulada, s.disponible, s.del_evento, s.evento, public.nivel_por_xp(s.acumulada)
  from privado.saldos_de((select auth.uid())) s;
$$;

create or replace function public.comprar_accesorio(p_articulo text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_art public.articulos_tienda; s record; v_de_evento int;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select * into v_art from public.articulos_tienda a where a.id = p_articulo and a.tipo = 'accesorio' and a.activo;
  if not found then raise exception 'artículo no válido'; end if;
  if exists (select 1 from public.inventario i where i.jugador = v_uid and i.articulo = p_articulo) then raise exception 'ya lo tienes'; end if;
  select * into s from privado.saldos_de(v_uid);
  if public.nivel_por_xp(s.acumulada) < v_art.nivel_min then raise exception 'nivel insuficiente'; end if;
  if s.disponible < v_art.precio then raise exception 'saldo insuficiente'; end if;
  v_de_evento := greatest(0, v_art.precio - (s.disponible - s.del_evento));
  if v_art.precio > 0 then
    insert into public.movimientos_xp (jugador, tipo, xp, evento, xp_de_evento, motivo)
      values (v_uid, 'accesorio', v_art.precio, s.evento, v_de_evento, v_art.id);
  end if;
  insert into public.inventario (jugador, articulo) values (v_uid, v_art.id);
end $$;

create or replace function public.comprar_carta(p_partida uuid, p_carta text) returns int
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_evento uuid; v_compradas int; v_precio int; s record;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('xp:' || v_uid::text));
  select p.evento into v_evento from public.partidas p join public.eventos e on e.id = p.evento
    where p.id = p_partida and p.terminada is null and not e.cerrado;
  if v_evento is null then raise exception 'partida o evento cerrado'; end if;
  if not privado.es_miembro(v_evento) then raise exception 'sin permiso'; end if;
  if not exists (select 1 from public.articulos_tienda a where a.id = p_carta and a.tipo = 'carta' and a.activo) then
    raise exception 'carta no válida'; end if;
  select count(*) into v_compradas from public.movimientos_xp x where x.jugador = v_uid and x.tipo = 'carta' and x.partida = p_partida;
  if v_compradas >= 3 then raise exception 'tope de cartas en esta partida'; end if;
  v_precio := (array[40, 60, 80])[v_compradas + 1];
  select * into s from privado.saldos_de(v_uid, v_evento);
  if s.del_evento < v_precio then raise exception 'saldo del evento insuficiente'; end if;
  insert into public.movimientos_xp (jugador, tipo, xp, evento, partida, motivo)
    values (v_uid, 'carta', v_precio, v_evento, p_partida, p_carta);
  return v_precio;
end $$;
